import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { MutationCtx, internalMutation, query } from "./_generated/server";
import { requireActive } from "./lib/authz";
import { planLifetimeValue } from "./lib/ltv";
import { pctOf } from "./lib/money";
import { activeOverride, applyPlanOverride } from "./lib/overrides";
import { getSettings } from "./lib/settings";

// §2 product pricing. Commission is percentage-based so it follows price changes
// automatically (§20.3).

export const DEFAULT_PLANS: Omit<Doc<"productPlans">, "_id" | "_creationTime">[] = [
  {
    key: "MONTHLY",
    name: "Bulanan",
    price: 70_000,
    priceUnit: "bulan",
    durationMonths: 1,
    category: "SUBSCRIPTION",
    commissionType: "RECURRING_Y",
    y1Percent: 50,
    y2Percent: 40,
    y3Percent: 30,
    y4PlusPercent: 0,
    oneTimePercent: 0,
    seatCount: 0,
    active: true,
    sortOrder: 1,
  },
  {
    key: "YEARLY",
    name: "Tahunan",
    price: 600_000,
    priceUnit: "tahun",
    durationMonths: 12,
    category: "SUBSCRIPTION",
    commissionType: "RECURRING_Y",
    y1Percent: 50,
    y2Percent: 40,
    y3Percent: 30,
    y4PlusPercent: 0,
    oneTimePercent: 0,
    seatCount: 0,
    active: true,
    sortOrder: 2,
  },
  {
    key: "LIFETIME_SINGLE",
    name: "Lifetime",
    price: 1_500_000,
    priceUnit: "sekali",
    durationMonths: 0,
    category: "LIFETIME",
    commissionType: "ONE_TIME",
    y1Percent: 0,
    y2Percent: 0,
    y3Percent: 0,
    y4PlusPercent: 0,
    oneTimePercent: 33.33,
    seatCount: 1,
    active: true,
    sortOrder: 3,
  },
  {
    key: "LIFETIME_DUO",
    name: "Lifetime Duo",
    price: 2_000_000,
    priceUnit: "sekali",
    durationMonths: 0,
    category: "LIFETIME",
    commissionType: "ONE_TIME",
    y1Percent: 0,
    y2Percent: 0,
    y3Percent: 0,
    y4PlusPercent: 0,
    oneTimePercent: 35,
    seatCount: 2,
    active: true,
    sortOrder: 4,
  },
];

export async function ensurePlans(ctx: MutationCtx): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    const existing = await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", plan.key))
      .unique();
    if (!existing) await ctx.db.insert("productPlans", plan);
  }
}

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensurePlans(ctx);
    return null;
  },
});

/** Plans an agent can sell, with the commission they would earn today. */
export const listSellable = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireActive(ctx);
    const settings = await getSettings(ctx);
    const override = await activeOverride(ctx, viewer._id);
    const plans = await ctx.db
      .query("productPlans")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return plans
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stored) => applyPlanOverride(stored, override))
      .map((p) => ({
        id: p._id,
        key: p.key,
        name: p.name,
        price: p.price,
        priceUnit: p.priceUnit,
        category: p.category,
        seatCount: p.seatCount,
        commission:
          p.commissionType === "ONE_TIME"
            ? pctOf(p.price, p.oneTimePercent)
            : pctOf(p.price, p.y1Percent),
        commissionPercent:
          p.commissionType === "ONE_TIME" ? p.oneTimePercent : p.y1Percent,
        // What one customer on this plan pays the agent over the whole
        // ownership window — the number that makes a renewal plan look like
        // what it is, rather than like a smaller sale.
        lifetimeValue: planLifetimeValue(p, settings.ownershipWindowMonths),
      }));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireActive(ctx);
    const plans = await ctx.db.query("productPlans").collect();
    return plans.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const byId = query({
  args: { planId: v.id("productPlans") },
  handler: async (ctx, args) => {
    await requireActive(ctx);
    return await ctx.db.get("productPlans", args.planId);
  },
});
