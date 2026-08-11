import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin, requireL1, requireL2 } from "./lib/authz";
import { jaminanFor, l1Target, l2EffectivePercent, l2StageFor } from "./lib/commission";
import { DAY_MS, periodEnd, periodOf, periodStart, shiftPeriod, tenureMonthAt } from "./lib/period";
import { getSettings } from "./lib/settings";

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

/** L1 home — one screen answering "where am I this month". */
export const l1 = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const settings = await getSettings(ctx);
    const period = periodOf(args.now);
    const tenureMonth = tenureMonthAt(l1.firstPaymentAt, args.now);

    const lines = await ctx.db
      .query("earningLines")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
      .collect();
    const gross = lines
      .filter(
        (l) =>
          l.status === "CONFIRMED" &&
          GROSS_TYPES.has(l.type) &&
          !l.frozen &&
          !l.settledToCompany,
      )
      .reduce((sum, l) => sum + l.amount, 0);
    const pending = lines
      .filter((l) => l.status === "PENDING")
      .reduce((sum, l) => sum + l.amount, 0);

    const acquisitions = await ctx.db
      .query("acquisitions")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
      .collect();
    const activations = acquisitions.length;

    const state = await ctx.db
      .query("l1States")
      .withIndex("by_l1", (q) => q.eq("l1Id", l1._id))
      .unique();

    const merchants = await ctx.db
      .query("merchants")
      .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1._id))
      .collect();

    const nextPayout = await ctx.db
      .query("payoutLines")
      .withIndex("by_user_date", (q) => q.eq("userId", l1._id))
      .order("desc")
      .first();

    const guaranteeActive =
      settings.guarantee.enable && tenureMonth >= 1 && tenureMonth <= settings.guarantee.months;

    return {
      tenureMonth,
      period,
      activations,
      target: l1Target(tenureMonth, settings),
      gross,
      pending,
      heldBalance: state?.heldBalance ?? 0,
      warmth: {
        active: tenureMonth > settings.warmth.startAfterMonth,
        state:
          tenureMonth > settings.warmth.startAfterMonth
            ? activations >= settings.warmth.warmThreshold
              ? "WARM"
              : (state?.consecutiveSub5Months ?? 0) + 1 >= settings.warmth.coldConsecutive
                ? "COLD"
                : "COOL"
            : null,
        threshold: settings.warmth.warmThreshold,
      },
      guarantee: guaranteeActive
        ? {
            minActivations: settings.guarantee.minActivations,
            topUp: settings.guarantee.topUp,
            projected: jaminanFor(tenureMonth, activations, gross, settings),
          }
        : null,
      customers: {
        active: merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED").length,
        expiringSoon: merchants.filter(
          (m) =>
            m.subscriptionStatus === "SUBSCRIBED" &&
            m.currentExpiryAt !== undefined &&
            m.currentExpiryAt - args.now <= 7 * DAY_MS,
        ).length,
        lifetime: merchants.filter((m) => m.subscriptionStatus === "LIFETIME").length,
      },
      nextPayout: nextPayout
        ? {
            period: nextPayout.period,
            payable: nextPayout.payable,
            status: nextPayout.status,
            payoutDate: nextPayout.payoutDate,
          }
        : null,
    };
  },
});

/** L2 home — team size, recruitment progress, last closed fee. */
export const l2 = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const settings = await getSettings(ctx);
    const period = periodOf(args.now);
    const lastClosed = shiftPeriod(period, -1);

    const team = await ctx.db
      .query("users")
      .withIndex("by_l2", (q) => q.eq("assignedL2Id", l2._id))
      .collect();

    const recruited = await ctx.db
      .query("users")
      .withIndex("by_recruiter", (q) => q.eq("recruitedByL2Id", l2._id))
      .collect();
    const monthStart = periodStart(period);
    const monthEnd = periodEnd(period);
    const recruitedThisMonth = recruited.filter(
      (u) =>
        u.status === "ACTIVE" &&
        u.recruitmentSource === "L2_INVITE" &&
        (u.approvedAt ?? 0) >= monthStart &&
        (u.approvedAt ?? 0) < monthEnd,
    ).length;

    const feeLines = await ctx.db
      .query("l2EarningLines")
      .withIndex("by_l2_period", (q) => q.eq("l2Id", l2._id).eq("period", lastClosed))
      .collect();

    const nextPayout = await ctx.db
      .query("payoutLines")
      .withIndex("by_user_date", (q) => q.eq("userId", l2._id))
      .order("desc")
      .first();

    return {
      period,
      teamSize: team.filter((u) => u.status === "ACTIVE").length,
      pendingTeam: team.filter((u) => u.status === "PENDING").length,
      recruitment: { count: recruitedThisMonth, target: settings.recruitment.target },
      lastClosedPeriod: lastClosed,
      lastClosedFee: feeLines.reduce((sum, l) => sum + l.l2Fee, 0),
      earningTeam: feeLines.length,
      nextPayout: nextPayout
        ? {
            period: nextPayout.period,
            payable: nextPayout.payable,
            status: nextPayout.status,
            payoutDate: nextPayout.payoutDate,
          }
        : null,
    };
  },
});

/** Admin home — the operational queue plus the money that is owed. */
export const admin = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const period = periodOf(args.now);
    const start = periodStart(period);
    const end = periodEnd(period);

    const pendingRegistrations = (
      await ctx.db
        .query("registrationRequests")
        .withIndex("by_status", (q) => q.eq("status", "PENDING"))
        .take(100)
    ).length;

    const paidLinks = await ctx.db
      .query("paymentLinks")
      .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", end))
      .collect();
    const revenue = paidLinks
      .filter((l) => !l.refundedAt)
      .reduce((sum, l) => sum + l.amount, 0);

    const scheduled = await ctx.db
      .query("payoutLines")
      .withIndex("by_status", (q) => q.eq("status", "SCHEDULED"))
      .take(500);

    const states = await ctx.db.query("l1States").take(500);
    const merchants = await ctx.db.query("merchants").take(1000);
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_status", (q) => q.eq("status", "POOLED"))
      .take(500);

    return {
      period,
      pendingRegistrations,
      revenue,
      sales: paidLinks.length,
      merchants: {
        total: merchants.length,
        active: merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED").length,
        lifetime: merchants.filter((m) => m.subscriptionStatus === "LIFETIME").length,
        churned: merchants.filter((m) => m.subscriptionStatus === "CHURNED").length,
      },
      liability: {
        unpaidPayouts: scheduled.reduce((sum, l) => sum + l.payable, 0),
        held: states.reduce((sum, s) => sum + s.heldBalance, 0),
        unactivatedSeats: seats.reduce((sum, s) => sum + s.unitValue, 0),
      },
      scheduledPayouts: scheduled.length,
    };
  },
});

/** §16 — what the L2 fee looks like for one L1 right now. */
export const l2FeePreview = query({
  args: { tenureMonth: v.number() },
  handler: async (ctx, args) => {
    await requireL2(ctx);
    const settings = await getSettings(ctx);
    return {
      stage: l2StageFor(args.tenureMonth, settings),
      percent: l2EffectivePercent(args.tenureMonth, settings),
    };
  },
});
