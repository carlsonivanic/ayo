import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

// §21 / §34 default configuration. The stored document is authoritative; these
// defaults are what a fresh deployment starts with and what reads fall back to
// before an admin has ever touched settings.

export type SchemeSettings = Omit<Doc<"schemeSettings">, "_id" | "_creationTime">;

export const DEFAULT_SETTINGS: SchemeSettings = {
  singleton: "GLOBAL",
  guarantee: {
    enable: true,
    months: 3,
    target: 10,
    minActivations: 8,
    topUp: 3_000_000,
  },
  warmth: {
    startAfterMonth: 3,
    warmThreshold: 5,
    warmPayout: 100,
    warmHeld: 0,
    coolPayout: 80,
    coolHeld: 20,
    coldPayout: 50,
    coldHeld: 50,
    coldConsecutive: 3,
    releaseThreshold: 5,
  },
  l1Target: { m1_3: 10, m4_6: 12, m7_9: 15, m10_11: 18, m12Plus: 20 },
  l2: {
    basePercent: 10,
    startMonth: 7,
    includeJaminan: false,
    decayM7_18: 100,
    decayM19_30: 66,
    decayM31_42: 33,
  },
  recruitment: { target: 3, countOnlyInvited: true },
  payout: {
    l1DefaultFrequency: "WEEKLY",
    l1WeeklyPayDay: 3, // Wednesday
    l1MonthlyPayDay: 5,
    l2MonthlyPayDay: 5,
  },
  qris: {
    enabled: false, // an admin must paste a static payload first
    uniqueAmountEnabled: true,
    uniqueAmountMax: 999,
    proofRequired: true,
  },
  moneyDisplay: "ROUNDED",
  renewalIncentivePercent: 2,
  ownershipWindowMonths: 36,
  allowDirectLifetimePurchase: false,
  allowDirectSubscriptionPurchase: false,
  seatLinkExpiryDays: 30,
  codeExpiryDays: 7,
  paymentLinkExpiryHours: 24,
  updatedAt: 0,
};

export async function getSettings(ctx: QueryCtx): Promise<SchemeSettings> {
  const doc = await ctx.db
    .query("schemeSettings")
    .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
    .unique();
  return doc ?? DEFAULT_SETTINGS;
}

/** Mutation-side read that materializes the document on first use. */
export async function ensureSettings(ctx: MutationCtx): Promise<Doc<"schemeSettings">> {
  const doc = await ctx.db
    .query("schemeSettings")
    .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
    .unique();
  if (doc) return doc;
  const id = await ctx.db.insert("schemeSettings", {
    ...DEFAULT_SETTINGS,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get("schemeSettings", id))!;
}
