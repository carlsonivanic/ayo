import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";
import { requireL1 } from "./lib/authz";
import { yPercent, yearBucket } from "./lib/commission";
import { pctOf } from "./lib/money";
import {
  addMonths,
  periodEnd,
  periodOf,
  periodStart,
  shiftPeriod,
} from "./lib/period";
import { getSettings } from "./lib/settings";

// §12 earning display: earning is GROSS (held is not deducted here — that is the
// payout page's job), and Jaminan is shown separately, not folded into gross.

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

type Bucket = {
  newSales: number;
  recurring: number;
  renewalIncentive: number;
  adjustment: number;
  jaminan: number;
  gross: number;
  total: number;
};

function emptyBucket(): Bucket {
  return {
    newSales: 0,
    recurring: 0,
    renewalIncentive: 0,
    adjustment: 0,
    jaminan: 0,
    gross: 0,
    total: 0,
  };
}

function addLine(bucket: Bucket, line: Doc<"earningLines">) {
  if (line.status !== "CONFIRMED" || line.frozen || line.settledToCompany) return;
  switch (line.type) {
    case "NEW_SALES":
      bucket.newSales += line.amount;
      break;
    case "RECURRING":
      bucket.recurring += line.amount;
      break;
    case "RENEWAL_INCENTIVE":
      bucket.renewalIncentive += line.amount;
      break;
    case "JAMINAN":
      bucket.jaminan += line.amount;
      break;
    case "ADJUSTMENT":
      bucket.adjustment += line.amount;
      break;
  }
  if (GROSS_TYPES.has(line.type) || line.type === "ADJUSTMENT") {
    bucket.gross += line.amount;
  }
  bucket.total = bucket.gross + bucket.jaminan;
}

async function linesInRange(
  ctx: QueryCtx,
  l1Id: Doc<"users">["_id"],
  from: number,
  to: number,
) {
  return await ctx.db
    .query("earningLines")
    .withIndex("by_l1_date", (q) => q.eq("l1Id", l1Id).gte("date", from).lt("date", to))
    .collect();
}

export const summary = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const nowPeriod = periodOf(args.now);
    const lastPeriod = shiftPeriod(nowPeriod, -1);
    const yearStart = periodStart(`${nowPeriod.split("-")[0]}-01`);

    const summaries = await ctx.db
      .query("monthlyL1Summaries")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id))
      .collect();
    const closed = new Set(summaries.map((s) => s.period));

    // All-time uses closed-month rollups plus whatever is still open (VT-1).
    const allTime = emptyBucket();
    for (const s of summaries) {
      allTime.gross += s.gross;
      allTime.jaminan += s.jaminan;
    }
    const openPeriods: string[] = [];
    if (l1.firstPaymentAt) {
      let cursor = periodOf(l1.firstPaymentAt);
      for (let i = 0; i < 36 && cursor <= nowPeriod; i++) {
        if (!closed.has(cursor)) openPeriods.push(cursor);
        cursor = shiftPeriod(cursor, 1);
      }
    }
    for (const period of openPeriods) {
      const lines = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
        .collect();
      const bucket = emptyBucket();
      for (const line of lines) addLine(bucket, line);
      allTime.gross += bucket.gross;
      allTime.jaminan += bucket.jaminan;
    }
    allTime.total = allTime.gross + allTime.jaminan;

    const thisMonth = emptyBucket();
    for (const line of await linesInRange(
      ctx,
      l1._id,
      periodStart(nowPeriod),
      periodEnd(nowPeriod),
    )) {
      addLine(thisMonth, line);
    }

    const lastMonth = emptyBucket();
    for (const line of await linesInRange(
      ctx,
      l1._id,
      periodStart(lastPeriod),
      periodEnd(lastPeriod),
    )) {
      addLine(lastMonth, line);
    }

    const ytd = emptyBucket();
    for (const line of await linesInRange(ctx, l1._id, yearStart, args.now + 1)) {
      addLine(ytd, line);
    }

    const pendingLines = await linesInRange(
      ctx,
      l1._id,
      periodStart(shiftPeriod(nowPeriod, -2)),
      args.now + 1,
    );
    const pending = pendingLines
      .filter((l) => l.status === "PENDING")
      .reduce((sum, l) => sum + l.amount, 0);

    return { allTime, ytd, thisMonth, lastMonth, pending };
  },
});

export const recent = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const lines = await ctx.db
      .query("earningLines")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", args.period))
      .order("desc")
      .take(200);
    return Promise.all(
      lines.map(async (l) => {
        const merchant = l.merchantId ? await ctx.db.get("merchants", l.merchantId) : null;
        const plan = l.planId ? await ctx.db.get("productPlans", l.planId) : null;
        return {
          id: l._id,
          date: l.date,
          type: l.type,
          amount: l.amount,
          status: l.status,
          frozen: l.frozen ?? false,
          storeName: merchant?.storeName ?? null,
          planName: plan?.name ?? null,
          note: l.note ?? null,
        };
      }),
    );
  },
});

/**
 * §13 projection — active recurring only, no churn, no future new sales, no
 * renewal incentive. The horizon is the remainder of each merchant's 36-month
 * ownership window.
 */
export const projection = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const settings = await getSettings(ctx);
    const merchants = await ctx.db
      .query("merchants")
      .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1._id))
      .collect();

    let total = 0;
    let counted = 0;
    const byYear: Record<string, number> = { Y1: 0, Y2: 0, Y3: 0 };
    const next12: number[] = Array(12).fill(0);

    for (const merchant of merchants) {
      if (merchant.subscriptionStatus !== "SUBSCRIBED") continue;
      if (!merchant.currentPlanId || !merchant.currentExpiryAt) continue;
      const plan = await ctx.db.get("productPlans", merchant.currentPlanId);
      if (!plan || plan.category !== "SUBSCRIPTION" || plan.durationMonths === 0) continue;

      const windowEnd = addMonths(
        merchant.firstPaymentAt,
        settings.ownershipWindowMonths,
      );
      let at = merchant.currentExpiryAt;
      let steps = 0;
      let merchantTotal = 0;
      while (at < windowEnd && steps < 40) {
        const label = yearBucket(
          merchant.firstPaymentAt,
          at,
          settings.ownershipWindowMonths,
        );
        const amount = pctOf(plan.price, yPercent(plan, label));
        if (amount > 0) {
          merchantTotal += amount;
          byYear[label] = (byYear[label] ?? 0) + amount;
          const monthOffset = Math.floor((at - args.now) / (30 * 24 * 3600 * 1000));
          if (monthOffset >= 0 && monthOffset < 12) next12[monthOffset] += amount;
        }
        at = addMonths(at, plan.durationMonths);
        steps++;
      }
      if (merchantTotal > 0) counted++;
      total += merchantTotal;
    }

    return { total, merchants: counted, byYear, next12 };
  },
});
