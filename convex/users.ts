import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, getViewer, requireActive, requireViewer } from "./lib/authz";
import { assertMobileFree, normalizeMobile } from "./lib/mobile";
import { tenureMonthAt } from "./lib/period";
import { getSettings } from "./lib/settings";

// §5.6 — the client asks `me` once and routes on the answer.

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;

    const settings = await getSettings(ctx);
    const profile = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    let registration = null;
    if (user.status === "PENDING") {
      registration = await ctx.db
        .query("registrationRequests")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
    }

    const l2 = user.assignedL2Id
      ? await ctx.db.get("users", user.assignedL2Id)
      : null;

    return {
      id: user._id,
      name: user.name ?? "",
      email: user.email ?? "",
      mobile: user.mobile ?? "",
      role: user.role ?? null,
      status: user.status ?? "PENDING",
      firstPaymentAt: user.firstPaymentAt ?? null,
      tenureMonth: tenureMonthAt(user.firstPaymentAt, Date.now()),
      payoutFrequency: user.payoutFrequency ?? settings.payout.l1DefaultFrequency,
      assignedL2: l2 ? { id: l2._id, name: l2.name ?? "" } : null,
      payoutProfileCompleted: profile?.completed ?? false,
      registrationStatus: registration?.status ?? null,
      registrationReason: registration?.reason ?? null,
      suspendReason: user.suspendReason ?? null,
      moneyDisplay: settings.moneyDisplay,
    };
  },
});

export const updateProfile = mutation({
  args: { name: v.string(), mobile: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const name = args.name.trim();
    if (name.length < 2) fail("INVALID_NAME", "Nama terlalu pendek.");
    const mobile = normalizeMobile(args.mobile);
    await assertMobileFree(ctx, mobile, user._id);
    await ctx.db.patch("users", user._id, { name, mobile });
    return null;
  },
});

export const getPayoutProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const profile = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return null;
    return {
      bankName: profile.bankName,
      accountNumber: profile.accountNumber,
      accountName: profile.accountName,
      completed: profile.completed,
    };
  },
});

export const savePayoutProfile = mutation({
  args: {
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireActive(ctx);
    const bankName = args.bankName.trim();
    const accountNumber = args.accountNumber.trim();
    const accountName = args.accountName.trim();
    if (!bankName || !accountNumber || !accountName) {
      fail("INCOMPLETE", "Lengkapi semua kolom.");
    }
    const existing = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const doc = {
      userId: user._id,
      bankName,
      accountNumber,
      accountName,
      completed: true,
    };
    if (existing) await ctx.db.replace("payoutProfiles", existing._id, doc);
    else await ctx.db.insert("payoutProfiles", doc);
    return null;
  },
});

/** §11.1 — an L1 may switch their own payout frequency. */
export const setPayoutFrequency = mutation({
  args: { frequency: v.union(v.literal("WEEKLY"), v.literal("MONTHLY")) },
  handler: async (ctx, args) => {
    const user = await requireActive(ctx);
    if (user.role !== "L1") fail("FORBIDDEN", "Hanya untuk L1.");
    await ctx.db.patch("users", user._id, { payoutFrequency: args.frequency });
    return null;
  },
});
