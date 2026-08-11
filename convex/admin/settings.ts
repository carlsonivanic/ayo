import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { requireAdmin } from "../lib/authz";
import { ensureSettings, getSettings } from "../lib/settings";

// §21 scheme settings — every business constant is admin-configurable, and every
// change is audited old → new (§21, §32, Edge 18).

const guarantee = v.object({
  enable: v.boolean(),
  months: v.number(),
  target: v.number(),
  minActivations: v.number(),
  topUp: v.number(),
});

const warmth = v.object({
  startAfterMonth: v.number(),
  warmThreshold: v.number(),
  warmPayout: v.number(),
  warmHeld: v.number(),
  coolPayout: v.number(),
  coolHeld: v.number(),
  coldPayout: v.number(),
  coldHeld: v.number(),
  coldConsecutive: v.number(),
  releaseThreshold: v.number(),
});

const l1Target = v.object({
  m1_3: v.number(),
  m4_6: v.number(),
  m7_9: v.number(),
  m10_11: v.number(),
  m12Plus: v.number(),
});

const l2 = v.object({
  basePercent: v.number(),
  startMonth: v.number(),
  includeJaminan: v.boolean(),
  decayM7_18: v.number(),
  decayM19_30: v.number(),
  decayM31_42: v.number(),
});

const recruitment = v.object({
  target: v.number(),
  countOnlyInvited: v.boolean(),
});

const payout = v.object({
  l1DefaultFrequency: v.union(v.literal("WEEKLY"), v.literal("MONTHLY")),
  l1WeeklyPayDay: v.number(),
  l1MonthlyPayDay: v.number(),
  l2MonthlyPayDay: v.number(),
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await getSettings(ctx);
  },
});

export const update = mutation({
  args: {
    guarantee: v.optional(guarantee),
    warmth: v.optional(warmth),
    l1Target: v.optional(l1Target),
    l2: v.optional(l2),
    recruitment: v.optional(recruitment),
    payout: v.optional(payout),
    moneyDisplay: v.optional(v.union(v.literal("ROUNDED"), v.literal("DECIMAL"))),
    renewalIncentivePercent: v.optional(v.number()),
    ownershipWindowMonths: v.optional(v.number()),
    allowDirectLifetimePurchase: v.optional(v.boolean()),
    allowDirectSubscriptionPurchase: v.optional(v.boolean()),
    seatLinkExpiryDays: v.optional(v.number()),
    codeExpiryDays: v.optional(v.number()),
    paymentLinkExpiryHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const current = await ensureSettings(ctx);

    const patch = Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) return null;

    const before = Object.fromEntries(
      Object.keys(patch).map((key) => [key, (current as Record<string, unknown>)[key]]),
    );

    await ctx.db.patch("schemeSettings", current._id, {
      ...patch,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_SCHEME_SETTINGS",
      object: "schemeSettings",
      oldValue: before,
      newValue: patch,
    });
    return null;
  },
});
