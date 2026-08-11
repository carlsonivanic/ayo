import { v } from "convex/values";
import { QueryCtx, query } from "../_generated/server";
import { requireAdmin } from "../lib/authz";
import { addMonths, monthsBetween, periodEnd, periodStart } from "../lib/period";
import { getSettings } from "../lib/settings";

// §24 reports. Every one of these is admin-only and reads the ledger for a single
// period, so the numbers always tie back to individual lines.

async function periodEarnings(ctx: QueryCtx, period: string) {
  return await ctx.db
    .query("earningLines")
    .withIndex("by_period", (q) => q.eq("period", period))
    .collect();
}

export const profitLoss = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const start = periodStart(args.period);
    const end = periodEnd(args.period);

    const paid = await ctx.db
      .query("paymentLinks")
      .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", end))
      .collect();
    const revenue = paid
      .filter((l) => !l.refundedAt)
      .reduce((sum, l) => sum + l.amount, 0);

    const lines = await periodEarnings(ctx, args.period);
    const sum = (type: string) =>
      lines
        .filter((l) => l.type === type && l.status === "CONFIRMED" && !l.settledToCompany)
        .reduce((s, l) => s + l.amount, 0);

    const l2Lines = await ctx.db
      .query("l2EarningLines")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    const l2Commission = l2Lines.reduce((s, l) => s + l.l2Fee, 0);

    const newSales = sum("NEW_SALES");
    const recurring = sum("RECURRING");
    const renewalIncentive = sum("RENEWAL_INCENTIVE");
    const jaminan = sum("JAMINAN");
    const adjustment = sum("ADJUSTMENT");

    return {
      period: args.period,
      revenue,
      newSales,
      recurring,
      renewalIncentive,
      l2Commission,
      jaminan,
      adjustment,
      netProfit:
        revenue - newSales - recurring - renewalIncentive - l2Commission - jaminan - adjustment,
    };
  },
});

export const liability = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const scheduled = await ctx.db
      .query("payoutLines")
      .withIndex("by_status", (q) => q.eq("status", "SCHEDULED"))
      .take(1000);
    const states = await ctx.db.query("l1States").take(1000);
    const frozen = await ctx.db
      .query("earningLines")
      .withIndex("by_frozen", (q) => q.eq("frozen", true))
      .take(1000);
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_status", (q) => q.eq("status", "POOLED"))
      .take(1000);
    const giftPending = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_status", (q) => q.eq("status", "GIFT_LINK_ACTIVE"))
      .take(1000);

    const l1Unpaid = scheduled
      .filter((l) => l.role === "L1")
      .reduce((s, l) => s + l.payable, 0);
    const l2Unpaid = scheduled
      .filter((l) => l.role === "L2")
      .reduce((s, l) => s + l.payable, 0);
    const held = states.reduce((s, r) => s + r.heldBalance, 0);
    const frozenOwner = frozen
      .filter((l) => !l.settledToCompany)
      .reduce((s, l) => s + l.amount, 0);
    const unactivatedSeats = [...seats, ...giftPending];
    const seatObligation = unactivatedSeats.reduce((s, r) => s + r.unitValue, 0);

    return {
      l1Unpaid,
      l1Held: held,
      l1FrozenOwner: frozenOwner,
      l2Unpaid,
      seatCount: unactivatedSeats.length,
      seatObligation,
      total: l1Unpaid + held + frozenOwner + l2Unpaid,
    };
  },
});

export const commissionLedger = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lines = await periodEarnings(ctx, args.period);
    return await Promise.all(
      lines
        .sort((a, b) => b.date - a.date)
        .slice(0, 500)
        .map(async (l) => ({
          id: l._id,
          date: l.date,
          agent: (await ctx.db.get("users", l.l1Id))?.name ?? "",
          type: l.type,
          amount: l.amount,
          status: l.status,
          frozen: l.frozen ?? false,
          store: l.merchantId
            ? ((await ctx.db.get("merchants", l.merchantId))?.storeName ?? "")
            : "",
        })),
    );
  },
});

export const l2Commission = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lines = await ctx.db
      .query("l2EarningLines")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    return await Promise.all(
      lines.map(async (l) => ({
        id: l._id,
        l2: (await ctx.db.get("users", l.l2Id))?.name ?? "",
        l1: (await ctx.db.get("users", l.l1Id))?.name ?? "",
        tenureMonth: l.l1TenureMonth,
        stage: l.stage,
        l1Gross: l.l1Gross,
        effectiveFeePercent: l.effectiveFeePercent,
        l2Fee: l.l2Fee,
      })),
    );
  },
});

export const adjustmentsReport = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("adjustments")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    return await Promise.all(
      rows.map(async (r) => ({
        id: r._id,
        user: (await ctx.db.get("users", r.userId))?.name ?? "",
        role: r.role,
        type: r.type,
        amount: r.amount,
        reason: r.reason,
        createdAt: r.createdAt,
        consumed: !!r.consumedByPayoutId,
      })),
    );
  },
});

export const heldReport = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("heldRecords")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    return await Promise.all(
      rows.map(async (r) => ({
        id: r._id,
        agent: (await ctx.db.get("users", r.l1Id))?.name ?? "",
        gross: r.gross,
        heldPercent: r.heldPercent,
        heldAmount: r.heldAmount,
        releasedAmount: r.releasedAmount,
        status: r.status,
      })),
    );
  },
});

export const jaminanReport = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("monthlyL1Summaries")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    return await Promise.all(
      rows
        .filter((r) => r.jaminan > 0)
        .map(async (r) => ({
          agent: (await ctx.db.get("users", r.l1Id))?.name ?? "",
          tenureMonth: r.tenureMonth,
          activations: r.activationCount,
          gross: r.gross,
          jaminan: r.jaminan,
        })),
    );
  },
});

export const acquisitionReport = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("acquisitions")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    const renewals = (
      await ctx.db
        .query("earningLines")
        .withIndex("by_period", (q) => q.eq("period", args.period))
        .collect()
    ).filter((l) => l.type === "RENEWAL_INCENTIVE").length;

    const byAgent = new Map<string, number>();
    for (const row of rows) {
      const agent = (await ctx.db.get("users", row.l1Id))?.name ?? "";
      byAgent.set(agent, (byAgent.get(agent) ?? 0) + 1);
    }
    return {
      total: rows.length,
      renewalRedemptions: renewals, // informational only (§24.7)
      byAgent: [...byAgent.entries()].map(([agent, count]) => ({ agent, count })),
    };
  },
});

export const productSales = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const start = periodStart(args.period);
    const end = periodEnd(args.period);
    const paid = await ctx.db
      .query("paymentLinks")
      .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", end))
      .collect();

    const byPlan = new Map<string, { count: number; revenue: number }>();
    for (const link of paid) {
      if (link.refundedAt) continue;
      const plan = await ctx.db.get("productPlans", link.planId);
      const key = plan?.name ?? "—";
      const entry = byPlan.get(key) ?? { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += link.amount;
      byPlan.set(key, entry);
    }
    return [...byPlan.entries()].map(([plan, v2]) => ({ plan, ...v2 }));
  },
});

export const payoutReport = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("payoutLines")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .collect();
    return await Promise.all(
      rows.map(async (r) => ({
        agent: (await ctx.db.get("users", r.userId))?.name ?? "",
        role: r.role,
        frequency: r.frequency,
        gross: r.gross,
        jaminan: r.jaminan,
        held: r.held,
        releasedHeld: r.releasedHeld,
        adjustment: r.adjustment,
        payable: r.payable,
        status: r.status,
      })),
    );
  },
});

export const merchantReport = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    const merchants = await ctx.db.query("merchants").take(1000);
    return await Promise.all(
      merchants.map(async (m) => {
        const owner = m.ownerL1Id ? await ctx.db.get("users", m.ownerL1Id) : null;
        const plan = m.currentPlanId ? await ctx.db.get("productPlans", m.currentPlanId) : null;
        const history = await ctx.db
          .query("merchantEarningHistory")
          .withIndex("by_merchant", (q) => q.eq("merchantId", m._id))
          .collect();
        const elapsed = monthsBetween(m.firstPaymentAt, args.now);
        const last = history.sort((a, b) => b.date - a.date)[0];
        return {
          store: m.storeName ?? m.sellMoreStoreId,
          owner: owner?.name ?? "—",
          plan: plan?.name ?? "—",
          status: m.subscriptionStatus,
          firstPaymentAt: m.firstPaymentAt,
          tenureMonths: elapsed,
          windowRemaining: Math.max(0, settings.ownershipWindowMonths - elapsed),
          windowEndsAt: addMonths(m.firstPaymentAt, settings.ownershipWindowMonths),
          expiryAt: m.currentExpiryAt ?? null,
          totalOwnerEarning: history
            .filter((h) => h.recipientL1Id === m.ownerL1Id)
            .reduce((s, h) => s + h.amount, 0),
          lastRenewalMethod: last?.method ?? "—",
        };
      }),
    );
  },
});
