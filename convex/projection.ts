import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";
import { requireL1, requireL2 } from "./lib/authz";
import { valueSchedule, remainingValue } from "./lib/ltv";
import { round100 } from "./lib/money";
import {
  addMonths,
  monthsBetween,
  parts,
  periodOf,
  shiftPeriod,
  tenureMonthAt,
} from "./lib/period";
import { getSettings } from "./lib/settings";

// The forward-looking half of the home screen. Everything here is a projection
// off the existing book — no ledger row is created, and a month that has
// already happened is always read from the ledger rather than modelled.

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

/** Months of one calendar year as period keys. */
function yearPeriods(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function countsToGross(line: Doc<"earningLines">): boolean {
  return (
    line.status === "CONFIRMED" &&
    GROSS_TYPES.has(line.type) &&
    !line.frozen &&
    !line.settledToCompany
  );
}

async function linesFor(ctx: QueryCtx, l1Id: Doc<"users">["_id"], period: string) {
  return await ctx.db
    .query("earningLines")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", period))
    .collect();
}

/**
 * L1 home — "where does this year land if I keep going".
 *
 * Realised months come from the ledger. Future months are the renewals already
 * on the book plus a run rate for new sales, so the first closing of a new
 * agent's career immediately moves the whole year.
 */
export const l1 = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const settings = await getSettings(ctx);
    const window = settings.ownershipWindowMonths;
    const year = parts(args.now).year;
    const current = periodOf(args.now);
    const periods = yearPeriods(year);
    const currentIndex = periods.indexOf(current);

    // --- realised ---------------------------------------------------------
    const realised = new Array(12).fill(0) as number[];
    const newSalesByPeriod = new Map<string, number>();
    // A sale made today is PENDING until the buyer redeems the code, then
    // CONFIRMED-but-frozen until an admin clears the receipt. Neither state
    // counts as gross, and with manual QRIS settlement that is where nearly
    // every fresh sale sits — so without this the month in progress reads as
    // zero for days after a closing, which is the opposite of the point.
    let inFlightNow = 0;
    for (let i = 0; i <= (currentIndex < 0 ? 11 : currentIndex); i++) {
      const lines = await linesFor(ctx, l1._id, periods[i]);
      realised[i] = lines.filter(countsToGross).reduce((sum, l) => sum + l.amount, 0);
      if (i === currentIndex) {
        inFlightNow = lines
          .filter(
            (l) =>
              !l.settledToCompany &&
              GROSS_TYPES.has(l.type) &&
              (l.status === "PENDING" || l.frozen),
          )
          .reduce((sum, l) => sum + l.amount, 0);
      }
      // Frozen sales still count towards the run rate: they were closed, and
      // whether an admin has looked at the receipt yet says nothing about how
      // fast this agent sells.
      newSalesByPeriod.set(
        periods[i],
        lines
          .filter((l) => l.type === "NEW_SALES" && !l.settledToCompany)
          .reduce((sum, l) => sum + l.amount, 0),
      );
    }

    // --- the book ---------------------------------------------------------
    const merchants = await ctx.db
      .query("merchants")
      .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1._id))
      .collect();

    const projected = new Array(12).fill(0) as number[];
    let portfolioValue = 0;

    for (const merchant of merchants) {
      if (merchant.subscriptionStatus !== "SUBSCRIBED") continue;
      if (!merchant.currentPlanId) continue;
      const plan = await ctx.db.get("productPlans", merchant.currentPlanId);
      if (!plan) continue;
      const elapsed = monthsBetween(merchant.firstPaymentAt, args.now);
      portfolioValue += remainingValue(plan, window, elapsed);

      for (const entry of valueSchedule(plan, window)) {
        if (entry.monthOffset <= elapsed) continue;
        const at = addMonths(merchant.firstPaymentAt, entry.monthOffset);
        const index = periods.indexOf(periodOf(at));
        if (index > (currentIndex < 0 ? -1 : currentIndex)) projected[index] += entry.amount;
      }
    }

    // --- run rate ---------------------------------------------------------
    // Averaged over however many months the agent has actually been selling,
    // capped at three. One closing in month one is a real run rate.
    const tenureMonth = tenureMonthAt(l1.firstPaymentAt, args.now);
    const monthsCounted = Math.max(1, Math.min(3, tenureMonth || 1));
    let runRateTotal = 0;
    for (let back = 0; back < monthsCounted; back++) {
      const period = shiftPeriod(current, -back);
      if (newSalesByPeriod.has(period)) {
        runRateTotal += newSalesByPeriod.get(period)!;
        continue;
      }
      const lines = await linesFor(ctx, l1._id, period);
      runRateTotal += lines
        .filter((l) => l.type === "NEW_SALES" && !l.settledToCompany)
        .reduce((sum, l) => sum + l.amount, 0);
    }
    // Every rupiah figure in AYO is rounded to 100 (§29) — an average must
    // not be the one place that shows 4.120.001.
    const runRate = round100(runRateTotal / monthsCounted);

    const months = periods.map((period, i) => {
      const future = currentIndex >= 0 && i > currentIndex;
      const current = i === currentIndex;
      return {
        period,
        month: i + 1,
        realised: realised[i],
        // Future months carry both halves so the tooltip can split them.
        recurring: future ? projected[i] : 0,
        newSales: future ? runRate : 0,
        projected: future ? projected[i] + runRate : current ? inFlightNow : 0,
      };
    });

    const realisedTotal = realised.reduce((a, b) => a + b, 0);
    const projectedTotal = months.reduce((sum, m) => sum + m.projected, 0);

    return {
      year,
      currentMonth: currentIndex + 1,
      months,
      realisedTotal,
      projectedTotal,
      yearTotal: realisedTotal + projectedTotal,
      runRate,
      inFlightNow,
      portfolioValue,
      activeCustomers: merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED").length,
      windowMonths: window,
    };
  },
});

/**
 * L2 home — the same shape, but a team's fee is a percentage of what its L1s
 * earn, so the projection is a run rate off closed months rather than a model
 * of every merchant underneath.
 */
export const l2 = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const year = parts(args.now).year;
    const current = periodOf(args.now);
    const periods = yearPeriods(year);
    const currentIndex = periods.indexOf(current);
    const upTo = currentIndex < 0 ? 11 : currentIndex;

    const realised = new Array(12).fill(0) as number[];
    for (let i = 0; i <= upTo; i++) {
      const lines = await ctx.db
        .query("l2EarningLines")
        .withIndex("by_l2_period", (q) => q.eq("l2Id", l2._id).eq("period", periods[i]))
        .collect();
      realised[i] = lines.reduce((sum, l) => sum + l.l2Fee, 0);
    }

    // Fees close a month in arrears, so the last closed month is the newest
    // number that means anything — average the three before it.
    const closed = realised.slice(0, Math.max(0, upTo)).filter((v) => v > 0);
    const recent = closed.slice(-3);
    const runRate = recent.length
      ? round100(recent.reduce((a, b) => a + b, 0) / recent.length)
      : 0;

    const months = periods.map((period, i) => {
      const future = currentIndex >= 0 && i >= currentIndex;
      return {
        period,
        month: i + 1,
        realised: realised[i],
        projected: future ? Math.max(0, runRate - realised[i]) : 0,
      };
    });

    const lastClosed = shiftPeriod(current, -1);
    const lastLines = await ctx.db
      .query("l2EarningLines")
      .withIndex("by_l2_period", (q) => q.eq("l2Id", l2._id).eq("period", lastClosed))
      .collect();
    const contributors = await Promise.all(
      lastLines
        .sort((a, b) => b.l2Fee - a.l2Fee)
        .slice(0, 3)
        .map(async (line) => {
          const l1 = await ctx.db.get("users", line.l1Id);
          return {
            name: l1?.name ?? "L1",
            fee: line.l2Fee,
            gross: line.l1Gross,
            stage: line.stage,
          };
        }),
    );

    const realisedTotal = realised.reduce((a, b) => a + b, 0);
    const projectedTotal = months.reduce((sum, m) => sum + m.projected, 0);

    return {
      year,
      currentMonth: currentIndex + 1,
      months,
      realisedTotal,
      projectedTotal,
      yearTotal: realisedTotal + projectedTotal,
      runRate,
      lastClosedPeriod: lastClosed,
      contributors,
    };
  },
});
