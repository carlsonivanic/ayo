import { v } from "convex/values";
import { MutationCtx, mutation, query } from "./_generated/server";
import { fail, rateLimit, requireL2 } from "./lib/authz";
import { assertMobileFree, normalizeMobile } from "./lib/mobile";
import { notify, notifyAdmins } from "./lib/notify";
import { randomToken } from "./lib/tokens";

// §3.2 — three registration paths, all active. Admin-create lives in admin/users.ts.

function cleanEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL", "Email tidak valid.");
  return email;
}

async function assertEmailFree(ctx: MutationCtx, email: string): Promise<void> {
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
  if (existing) fail("EMAIL_TAKEN", "Email sudah terdaftar.");
}

/** Public registration: creates a PENDING user plus an admin approval item. */
export const registerPublic = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    intendedRole: v.union(v.literal("L1"), v.literal("L2")),
    mobile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = cleanEmail(args.email);
    await rateLimit(ctx, `register:${email}`, 5, 60 * 60 * 1000);
    const name = args.name.trim();
    if (name.length < 2) fail("INVALID_NAME", "Nama terlalu pendek.");
    await assertEmailFree(ctx, email);
    const mobile = normalizeMobile(args.mobile);
    await assertMobileFree(ctx, mobile);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name,
      email,
      mobile,
      role: args.intendedRole,
      status: "PENDING",
      registeredAt: now,
      recruitmentSource: "PUBLIC",
    });
    await ctx.db.insert("registrationRequests", {
      email,
      name,
      mobile,
      intendedRole: args.intendedRole,
      status: "PENDING",
      createdAt: now,
      userId,
    });
    await notifyAdmins(
      ctx,
      "REGISTRATION_PENDING",
      "Pendaftaran baru",
      `${name} (${args.intendedRole}) menunggu persetujuan.`,
      "/admin/pengguna",
    );
    return null;
  },
});

export const inviteInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite) return { valid: false as const, reason: "NOT_FOUND" };
    if (invite.status !== "ACTIVE") return { valid: false as const, reason: invite.status };
    const l2 = await ctx.db.get("users", invite.l2Id);
    return { valid: true as const, l2Name: l2?.name ?? "" };
  },
});

/** L2 invite: the invitee lands active under the inviting L2 (§5.3). */
export const registerViaInvite = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    email: v.string(),
    mobile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite || invite.status !== "ACTIVE") {
      fail("INVITE_INVALID", "Undangan tidak berlaku.");
    }
    const email = cleanEmail(args.email);
    const name = args.name.trim();
    if (name.length < 2) fail("INVALID_NAME", "Nama terlalu pendek.");
    await assertEmailFree(ctx, email);
    const mobile = normalizeMobile(args.mobile);
    await assertMobileFree(ctx, mobile);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name,
      email,
      mobile,
      role: "L1",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
      assignedL2Id: invite.l2Id,
      recruitedByL2Id: invite.l2Id,
      recruitmentSource: "L2_INVITE",
    });
    await ctx.db.patch("invites", invite._id, {
      status: "USED",
      usedAt: now,
      usedByUserId: userId,
    });
    await notify(
      ctx,
      invite.l2Id,
      "INVITED_L1_REGISTERED",
      "L1 baru bergabung",
      `${name} mendaftar lewat undangan Anda.`,
      "/l2/tim",
    );
    return null;
  },
});

// --- L2 side ---------------------------------------------------------------

export const createInvite = mutation({
  args: { note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const token = randomToken(18);
    await ctx.db.insert("invites", {
      l2Id: l2._id,
      token,
      status: "ACTIVE",
      createdAt: Date.now(),
      note: args.note?.trim() || undefined,
    });
    return { token };
  },
});

export const myInvites = query({
  args: {},
  handler: async (ctx) => {
    const l2 = await requireL2(ctx);
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_l2", (q) => q.eq("l2Id", l2._id))
      .order("desc")
      .take(50);
    return Promise.all(
      invites.map(async (i) => ({
        id: i._id,
        token: i.token,
        status: i.status,
        createdAt: i.createdAt,
        note: i.note ?? null,
        usedBy: i.usedByUserId
          ? ((await ctx.db.get("users", i.usedByUserId))?.name ?? null)
          : null,
      })),
    );
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const invite = await ctx.db.get("invites", args.inviteId);
    if (!invite || invite.l2Id !== l2._id) fail("NOT_FOUND", "Undangan tidak ditemukan.");
    if (invite.status !== "ACTIVE") fail("INVALID_STATE", "Undangan sudah dipakai.");
    await ctx.db.patch("invites", invite._id, { status: "REVOKED" });
    return null;
  },
});
