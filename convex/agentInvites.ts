import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admins";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Admin-initiated salesperson creation (ops/super admin). Instead of setting a
 * password on the new user's behalf, this generates a one-time invite link:
 * the admin fills in the profile, the invitee opens the link and chooses their
 * own password. No email is sent by the platform — the admin copies the link
 * from the admin panel and shares it out of band (same trust model already
 * used for admin-console accounts in admins.invite).
 */
export const createInvite = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    level: v.number(),
    regionId: v.id("regions"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, ["ops_admin", "super_admin"]);

    const name = args.name.trim();
    const phone = args.phone.trim();
    const email = args.email.trim().toLowerCase();
    if (name.length < 2) throw new Error("Nama wajib diisi.");
    if (phone.length < 6) throw new Error("Nomor HP tidak valid.");
    if (!email.includes("@")) throw new Error("Email tidak valid.");
    if (![1, 2, 3].includes(args.level)) throw new Error("Level tidak valid.");

    const existingPhone = await ctx.db
      .query("agents")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existingPhone) throw new Error("Nomor HP sudah terdaftar.");

    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("Wilayah tidak ditemukan.");

    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("agentInvites", {
      token,
      name,
      phone,
      email,
      level: args.level,
      regionId: args.regionId,
      createdBy: admin._id,
      expiresAt: Date.now() + INVITE_TTL_MS,
    });
    return { token };
  },
});

/** Pending (not yet redeemed) invites, newest first — for the User Management panel. */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx, ["ops_admin", "super_admin"]);
    const now = Date.now();
    const invites = await ctx.db.query("agentInvites").collect();
    return invites
      .filter((i) => !i.usedAt)
      .map((i) => ({
        _id: i._id,
        name: i.name,
        email: i.email,
        level: i.level,
        token: i.token,
        expiresAt: i.expiresAt,
        expired: i.expiresAt < now,
        createdAt: i._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Revoke a not-yet-redeemed invite (ops/super admin). */
export const revokeInvite = mutation({
  args: { inviteId: v.id("agentInvites") },
  handler: async (ctx, { inviteId }) => {
    await requireAdmin(ctx, ["ops_admin", "super_admin"]);
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Undangan tidak ditemukan.");
    if (invite.usedAt) throw new Error("Undangan sudah dipakai.");
    await ctx.db.delete(inviteId);
  },
});

/** Public — no auth required. Lets the invite-acceptance page show who/what before signup. */
export const getInvitePreview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("agentInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!invite) return { status: "not_found" as const };
    if (invite.usedAt) return { status: "used" as const };
    if (invite.expiresAt < Date.now()) return { status: "expired" as const };
    return { status: "valid" as const, name: invite.name, email: invite.email };
  },
});

/** Internal: full invite row for the accept action (needs usedAt/expiresAt/_id). */
export const getInviteForAccept = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("agentInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
  },
});

/**
 * Internal: re-validate and redeem the invite in one transaction (closes the
 * race between the accept action's checks and the actual insert), linking the
 * freshly created auth user to a new, immediately-active `agents` row.
 */
export const redeemInvite = internalMutation({
  args: { inviteId: v.id("agentInvites"), authUserId: v.id("users") },
  handler: async (ctx, { inviteId, authUserId }) => {
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Undangan tidak ditemukan.");
    if (invite.usedAt) throw new Error("Undangan sudah dipakai.");
    if (invite.expiresAt < Date.now())
      throw new Error("Undangan sudah kedaluwarsa.");

    const existingPhone = await ctx.db
      .query("agents")
      .withIndex("by_phone", (q) => q.eq("phone", invite.phone))
      .first();
    if (existingPhone) throw new Error("Nomor HP sudah terdaftar.");

    const agentId = await ctx.db.insert("agents", {
      authUserId,
      name: invite.name,
      phone: invite.phone,
      level: invite.level,
      status: "active",
      regionId: invite.regionId,
      enrolledAt: Date.now(),
      feePaidAt: Date.now(),
      escrowAmount: 0n,
    });

    await ctx.db.patch(inviteId, { usedAt: Date.now(), agentId });

    await ctx.db.insert("notifications", {
      agentId,
      kind: "status_change",
      title: "Akun dibuat",
      body: "Akun kamu dibuat oleh admin dan langsung Aktif. Selamat bergabung!",
    });

    return agentId;
  },
});

/**
 * Public: the invitee sets their own password to activate the account the
 * admin created for them. Runs as an action because `createAccount` (password
 * hashing) needs an action context; the agent row is written via `redeemInvite`.
 */
export const acceptInvite = action({
  args: { token: v.string(), password: v.string() },
  handler: async (ctx, { token, password }): Promise<{ ok: true }> => {
    if (password.length < 8)
      throw new Error("Kata sandi minimal 8 karakter.");

    const invite = await ctx.runQuery(
      internal.agentInvites.getInviteForAccept,
      { token },
    );
    if (!invite) throw new Error("Tautan undangan tidak valid.");
    if (invite.usedAt) throw new Error("Tautan undangan sudah dipakai.");
    if (invite.expiresAt < Date.now())
      throw new Error("Tautan undangan sudah kedaluwarsa.");

    let user;
    try {
      ({ user } = await createAccount(ctx, {
        provider: "password",
        account: { id: invite.email, secret: password },
        profile: { email: invite.email },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists"))
        throw new Error(`Email ${invite.email} sudah terdaftar.`);
      throw err;
    }

    try {
      await ctx.runMutation(internal.agentInvites.redeemInvite, {
        inviteId: invite._id,
        authUserId: user._id,
      });
    } catch (err) {
      await ctx.runMutation(internal.registration.rollbackUser, {
        userId: user._id,
      });
      throw err;
    }

    return { ok: true };
  },
});
