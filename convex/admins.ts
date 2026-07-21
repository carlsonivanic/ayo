import {
  QueryCtx,
  MutationCtx,
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  getAuthUserId,
  createAccount,
  modifyAccountCredentials,
  invalidateSessions,
} from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export type AdminRole = "super_admin" | "finance_admin" | "ops_admin";

const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("finance_admin"),
  v.literal("ops_admin"),
);

/**
 * Resolve the admin profile for the currently authenticated user.
 * Returns null when not signed in or not yet granted an admin role.
 */
export async function getCurrentAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"adminProfiles"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("adminProfiles")
    .withIndex("by_user", (q) => q.eq("authUserId", userId))
    .unique();
}

/** Throw unless the current user is an admin with one of the allowed roles. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  roles?: AdminRole[],
): Promise<Doc<"adminProfiles">> {
  const admin = await getCurrentAdmin(ctx);
  if (!admin) throw new Error("Tidak diizinkan: akun admin diperlukan.");
  if (roles && !roles.includes(admin.role)) {
    throw new Error(`Tidak diizinkan: butuh peran ${roles.join(" / ")}.`);
  }
  return admin;
}

/** Current admin profile for the signed-in user (for the UI shell). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentAdmin(ctx);
    if (!admin) return null;
    return { _id: admin._id, name: admin.name, role: admin.role };
  },
});

/** All admin-console users with their login email (super_admin only). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx, ["super_admin"]);
    const profiles = await ctx.db.query("adminProfiles").collect();
    return Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.authUserId);
        return {
          _id: p._id,
          name: p.name,
          role: p.role,
          email: user?.email ?? "—",
          createdAt: p._creationTime,
        };
      }),
    );
  },
});

/**
 * Provision a new admin-console user (super_admin only). Self-serve signup is
 * disabled, so this is the only way admins are created: the super admin sets an
 * initial password and shares it; the new admin can change it later.
 *
 * Runs as an action because `createAccount` (which hashes the password) needs
 * an action context; the admin-profile row is written via `attachProfile`.
 *
 * The initial password enforces the same ≥8-char minimum used across the app
 * (agent self-registration, invite redemption, password resets).
 */
export const invite = action({
  args: {
    email: v.string(),
    name: v.string(),
    role: roleValidator,
    password: v.string(),
  },
  handler: async (ctx, { email, name, role, password }): Promise<{ userId: Id<"users"> }> => {
    const me = await ctx.runQuery(api.admins.me);
    if (!me || me.role !== "super_admin")
      throw new Error("Tidak diizinkan: butuh peran super_admin.");

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) throw new Error("Email tidak valid.");
    if (password.length < 8)
      throw new Error("Kata sandi awal minimal 8 karakter.");

    let user;
    try {
      ({ user } = await createAccount(ctx, {
        provider: "password",
        account: { id: normalized, secret: password },
        profile: { email: normalized },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists"))
        throw new Error(`Email ${normalized} sudah terdaftar.`);
      throw err;
    }

    await ctx.runMutation(internal.admins.attachProfile, {
      authUserId: user._id,
      name: name.trim(),
      role,
    });
    return { userId: user._id };
  },
});

/** Internal: attach an admin profile to a freshly created auth user. */
export const attachProfile = internalMutation({
  args: {
    authUserId: v.id("users"),
    name: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, { authUserId, name, role }) => {
    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { name, role });
      return existing._id;
    }
    return await ctx.db.insert("adminProfiles", { authUserId, name, role });
  },
});

/**
 * Edit an admin's profile (super_admin only): name always, role too. A super
 * admin may edit their own name but cannot change their own role (same guard
 * as `setRole` — prevents locking the last super admin out).
 */
export const update = mutation({
  args: {
    adminProfileId: v.id("adminProfiles"),
    name: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, { adminProfileId, name, role }) => {
    const self = await requireAdmin(ctx, ["super_admin"]);
    const target = await ctx.db.get(adminProfileId);
    if (!target) throw new Error("Admin tidak ditemukan.");

    const trimmed = name.trim();
    if (trimmed.length < 2) throw new Error("Nama minimal 2 karakter.");

    if (self._id === adminProfileId && target.role !== role) {
      throw new Error("Tidak bisa mengubah peran akun sendiri.");
    }
    await ctx.db.patch(adminProfileId, { name: trimmed, role });
  },
});

/** Internal: resolve a Convex Auth user id by login email. */
export const getUserIdByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    return user?._id ?? null;
  },
});

/**
 * Reset an admin's password (super_admin only). The admin sets a new password
 * directly and shares it out of band (same trust model as `invite`). After the
 * change, all of the target's existing sessions are invalidated so they must
 * sign in again with the new password.
 *
 * Runs as an action because `modifyAccountCredentials` (password hashing) needs
 * an action context; the user id is resolved via `getUserIdByEmail`.
 */
export const resetPassword = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const me = await ctx.runQuery(api.admins.me);
    if (!me || me.role !== "super_admin")
      throw new Error("Tidak diizinkan: butuh peran super_admin.");

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) throw new Error("Email tidak valid.");
    if (password.length < 8)
      throw new Error("Kata sandi minimal 8 karakter.");

    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.admins.getUserIdByEmail,
      { email: normalized },
    );
    if (!userId) throw new Error("Pengguna tidak ditemukan.");

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: normalized, secret: password },
    });
    // Force relogin on every device the target is currently signed in on.
    await invalidateSessions(ctx, { userId });
  },
});

/**
 * Change an existing admin's role (super_admin only). A super admin cannot
 * change their own role — that would risk locking the last super admin out.
 */
export const setRole = mutation({
  args: { adminProfileId: v.id("adminProfiles"), role: roleValidator },
  handler: async (ctx, { adminProfileId, role }) => {
    const self = await requireAdmin(ctx, ["super_admin"]);
    if (self._id === adminProfileId)
      throw new Error("Tidak bisa mengubah peran akun sendiri.");
    const target = await ctx.db.get(adminProfileId);
    if (!target) throw new Error("Admin tidak ditemukan.");
    await ctx.db.patch(adminProfileId, { role });
  },
});

/**
 * Remove an admin completely (super_admin only): deletes the admin profile AND
 * the underlying Convex Auth user, its credential accounts, and all active
 * sessions/refresh tokens. After this the person can no longer sign in at all.
 * A super admin cannot remove their own account.
 */
export const remove = mutation({
  args: { adminProfileId: v.id("adminProfiles") },
  handler: async (ctx, { adminProfileId }) => {
    const self = await requireAdmin(ctx, ["super_admin"]);
    if (self._id === adminProfileId)
      throw new Error("Tidak bisa menghapus akun sendiri.");
    const target = await ctx.db.get(adminProfileId);
    if (!target) throw new Error("Admin tidak ditemukan.");

    const userId = target.authUserId;

    // 1) Profile (removes admin-console access).
    await ctx.db.delete(adminProfileId);

    // 2) Sessions + their refresh tokens (revokes any live login).
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const t of tokens) await ctx.db.delete(t._id);
      await ctx.db.delete(session._id);
    }

    // 3) Credential accounts (removes the password they sign in with).
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) await ctx.db.delete(account._id);

    // 4) The auth user itself.
    await ctx.db.delete(userId);
  },
});
