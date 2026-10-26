import { query } from "./_generated/server";
import { requireL1 } from "./lib/authz";
import { activeOverride, applyPlanOverride, renewalIncentivePercentFor } from "./lib/overrides";
import { getSettings } from "./lib/settings";

// §34 read-only settings for an agent: only the variables that decide what this
// L1 earns and when they get paid. The L2 fee scheme, QRIS configuration and
// company purchase switches stay admin-only.

export const forL1 = query({
  args: {},
  handler: async (ctx) => {
    const l1 = await requireL1(ctx);
    const settings = await getSettings(ctx);
    const override = await activeOverride(ctx, l1._id);

    const plans = (await ctx.db.query("productPlans").withIndex("by_active", (q) => q.eq("active", true)).collect())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stored) => applyPlanOverride(stored, override))
      .map((plan) => ({
        id: plan._id,
        key: plan.key,
        name: plan.name,
        price: plan.price,
        priceUnit: plan.priceUnit,
        category: plan.category,
        durationMonths: plan.durationMonths,
        seatCount: plan.seatCount,
        commissionType: plan.commissionType,
        y1Percent: plan.y1Percent,
        y2Percent: plan.y2Percent,
        y3Percent: plan.y3Percent,
        y4PlusPercent: plan.y4PlusPercent,
        oneTimePercent: plan.oneTimePercent,
      }));

    return {
      plans,
      renewalIncentivePercent: renewalIncentivePercentFor(settings, override),
      l1Target: settings.l1Target,
      warmth: settings.warmth,
      guarantee: settings.guarantee,
      ownershipWindowMonths: settings.ownershipWindowMonths,
      payout: {
        defaultFrequency: settings.payout.l1DefaultFrequency,
        weeklyPayDay: settings.payout.l1WeeklyPayDay,
        monthlyPayDay: settings.payout.l1MonthlyPayDay,
      },
      myFrequency: l1.payoutFrequency ?? settings.payout.l1DefaultFrequency,
      codeExpiryDays: settings.codeExpiryDays,
      paymentLinkExpiryHours: settings.paymentLinkExpiryHours,
      seatLinkExpiryDays: settings.seatLinkExpiryDays,
      moneyDisplay: settings.moneyDisplay,
    };
  },
});
