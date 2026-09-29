import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireL2 } from "./lib/authz";
import { l2EffectivePercent, l2StageFor } from "./lib/commission";
import { periodEnd, periodOf, periodStart, shiftPeriod, tenureMonthAt } from "./lib/period";
import { settingsForL2 } from "./lib/overrides";
import { getSettings } from "./lib/settings";

// §16-§18 — the L2 view of the L1s they coordinate. Read-only: an L2 never
// changes pricing, payouts or ownership.

export const roster = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const settings = await settingsForL2(ctx, l2._id, await getSettings(ctx));
    const period = periodOf(args.now);
    const lastClosed = shiftPeriod(period, -1);

    const team = await ctx.db
      .query("users")
      .withIndex("by_l2", (q) => q.eq("assignedL2Id", l2._id))
      .collect();

    return await Promise.all(
      team.map(async (l1) => {
        const tenureMonth = tenureMonthAt(l1.firstPaymentAt, args.now);
        const acquisitions = await ctx.db
          .query("acquisitions")
          .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
          .collect();
        const summary = await ctx.db
          .query("monthlyL1Summaries")
          .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", lastClosed))
          .unique();
        const fee = await ctx.db
          .query("l2EarningLines")
          .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", lastClosed))
          .unique();

        return {
          id: l1._id,
          name: l1.name ?? "",
          status: l1.status ?? "PENDING",
          tenureMonth,
          stage: l2StageFor(tenureMonth, settings),
          effectivePercent: l2EffectivePercent(tenureMonth, settings),
          activationsThisMonth: acquisitions.length,
          lastClosedGross: summary?.gross ?? 0,
          lastClosedWarmth: summary?.warmthState ?? null,
          myFee: fee?.l2Fee ?? 0,
          recruitedByMe: l1.recruitedByL2Id === l2._id,
        };
      }),
    );
  },
});

/** §17 recruitment: only invited L1s count, at the moment they become active. */
export const recruitment = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const settings = await getSettings(ctx);
    const period = periodOf(args.now);
    const start = periodStart(period);
    const end = periodEnd(period);

    const recruited = await ctx.db
      .query("users")
      .withIndex("by_recruiter", (q) => q.eq("recruitedByL2Id", l2._id))
      .collect();

    const counted = recruited.filter(
      (u) =>
        u.status === "ACTIVE" &&
        (!settings.recruitment.countOnlyInvited || u.recruitmentSource === "L2_INVITE") &&
        (u.approvedAt ?? 0) >= start &&
        (u.approvedAt ?? 0) < end,
    );

    return {
      period,
      count: counted.length,
      target: settings.recruitment.target,
      invitees: recruited
        .sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0))
        .slice(0, 50)
        .map((u) => ({
          id: u._id,
          name: u.name ?? "",
          status: u.status ?? "PENDING",
          approvedAt: u.approvedAt ?? null,
          countedThisMonth: counted.some((c) => c._id === u._id),
        })),
    };
  },
});

/** §18.2 — the L2's own fee lines for a period. */
export const feeLines = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const lines = await ctx.db
      .query("l2EarningLines")
      .withIndex("by_l2_period", (q) => q.eq("l2Id", l2._id).eq("period", args.period))
      .collect();
    return await Promise.all(
      lines.map(async (l) => ({
        id: l._id,
        l1Name: (await ctx.db.get("users", l.l1Id))?.name ?? "",
        tenureMonth: l.l1TenureMonth,
        stage: l.stage,
        l1Gross: l.l1Gross,
        effectiveFeePercent: l.effectiveFeePercent,
        l2Fee: l.l2Fee,
      })),
    );
  },
});
