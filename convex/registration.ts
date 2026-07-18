import {
  action,
  internalMutation,
  internalQuery,
  MutationCtx,
} from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 30;
const RATE_LIMIT_KEY = "agent_registration";

async function checkRateLimit(ctx: MutationCtx) {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimitCounters")
    .withIndex("by_key", (q) => q.eq("key", RATE_LIMIT_KEY))
    .unique();

  if (!existing) {
    await ctx.db.insert("rateLimitCounters", {
      key: RATE_LIMIT_KEY,
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (now - existing.windowStart > WINDOW_MS) {
    await ctx.db.patch(existing._id, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= MAX_PER_WINDOW) {
    throw new Error(
      "Terlalu banyak pendaftaran dalam waktu singkat. Coba lagi nanti.",
    );
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/** Internal: is this phone already registered? (pre-check before account creation) */
export const phoneTaken = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    return existing !== null;
  },
});

/**
 * Internal: rate-limit, validate, resolve referrer, and insert the agent row
 * linked to the freshly created auth user. Runs as a single transaction so the
 * phone-uniqueness re-check and insert can't race.
 */
export const attachAgent = internalMutation({
  args: {
    authUserId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    regionId: v.id("regions"),
    referrerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkRateLimit(ctx);

    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("Wilayah tidak ditemukan.");

    const existing = await ctx.db
      .query("agents")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (existing) throw new Error("Nomor HP sudah terdaftar.");

    let referrerId: Id<"agents"> | undefined;
    if (args.referrerPhone) {
      const referrer = await ctx.db
        .query("agents")
        .withIndex("by_phone", (q) => q.eq("phone", args.referrerPhone!))
        .unique();
      if (!referrer) throw new Error("Kode referral tidak ditemukan.");
      referrerId = referrer._id;
    }

    return await ctx.db.insert("agents", {
      authUserId: args.authUserId,
      name: args.name,
      phone: args.phone,
      level: 1,
      status: "probation",
      regionId: args.regionId,
      referrerId,
      enrolledAt: Date.now(),
      escrowAmount: 0n,
    });
  },
});

/**
 * Internal: undo a half-finished registration — delete the auth user and its
 * credential accounts when the agent row could not be created (e.g. phone taken
 * after the account was already provisioned).
 */
export const rollbackUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);
    await ctx.db.delete(userId);
  },
});

/**
 * Self-serve salesperson registration. Creates an email+password auth account
 * (so the agent can sign in to the portal) and a probation `agents` row pending
 * admin approval. Honeypot + timing + rate-limit guard against bots.
 *
 * Runs as an action because `createAccount` (password hashing) needs an action
 * context; the agent row is written via the `attachAgent` internal mutation.
 */
export const registerAgent = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.string(),
    // Free-text geo hint (typically a city) captured client-side from an IP
    // geo lookup. The backend resolves (finds-or-creates) the region via
    // `regions.ensureRegion`; empty/invalid → default region. Registration
    // must never fail solely because geo-lookup did.
    geoHint: v.optional(v.string()),
    referrerPhone: v.optional(v.string()),
    // Honeypot: must be empty.
    hp: v.string(),
    // Milliseconds since page load when the form was submitted.
    elapsed: v.number(),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    // Honeypot / timing — silently succeed so bots don't learn they were blocked.
    if (args.hp !== "") return { ok: true };
    if (args.elapsed < 3000) return { ok: true };

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const phone = args.phone.replace(/\s+/g, "").trim();
    const referrerPhone = args.referrerPhone?.replace(/\s+/g, "").trim() || undefined;

    if (name.length < 2) throw new Error("Nama minimal 2 karakter.");
    if (!email.includes("@")) throw new Error("Email tidak valid.");
    if (args.password.length < 8)
      throw new Error("Kata sandi minimal 8 karakter.");
    if (!/^[0-9]{8,15}$/.test(phone)) throw new Error("Nomor HP tidak valid.");

    // Cheap pre-check before provisioning an account.
    const taken: boolean = await ctx.runQuery(internal.registration.phoneTaken, {
      phone,
    });
    if (taken) throw new Error("Nomor HP sudah terdaftar.");

    // Resolve the region from the client's geo hint (find-or-create). Done
    // before account provisioning so a geo failure can't orphan an auth user.
    const regionId = await ctx.runMutation(internal.regions.ensureRegion, {
      hint: args.geoHint,
    });

    // Provision the auth account (validates email uniqueness, hashes password).
    let user;
    try {
      ({ user } = await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: args.password },
        profile: { email },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists"))
        throw new Error(`Email ${email} sudah terdaftar.`);
      throw err;
    }

    // Link the agent row. On failure, roll back the orphaned auth user.
    try {
      await ctx.runMutation(internal.registration.attachAgent, {
        authUserId: user._id,
        name,
        phone,
        regionId,
        referrerPhone,
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
