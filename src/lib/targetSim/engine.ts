/**
 * Pure target-simulator engine (v3). No React, no Convex, no DOM.
 *
 * Changes vs v2:
 *   - Per-month sales follow a 3-PHASE growth ramp (salesAtMonth), not a flat
 *     constant. This breaks the closed-form linearity, so reverse-calc is now a
 *     numeric binary search.
 *   - Monthly income is SPLIT into new-acquisition vs recurring.
 *   - Downline/agent counts shrink over time per per-level agent churn.
 *
 * All money stays in BigInt IDR. Commission math mirrors convex/lib/commission.ts.
 */
import type {
  L1Plan,
  L2Plan,
  L3Plan,
  AdminPlan,
  TargetResult,
  MonthlyPoint,
  YearBreakdown,
  ReverseSolution,
  Tier,
  Mix,
  Prices,
  L1Rates,
  GrowthRamp,
} from "./types";

/** BigInt-safe percentage, floored — identical to convex/lib/money.ts:pctOf. */
function pctOf(amount: bigint, pct: number): bigint {
  return (amount * BigInt(Math.round(pct * 100))) / 10000n;
}

/** Normalize a mix so weights sum to 1. Returns zeros if all zero. */
function normalizeMix(mix: Mix): Record<Tier, number> {
  const sum = mix.monthly + mix.annual + mix.lifetime_solo + mix.lifetime_duo;
  if (sum <= 0) return { monthly: 0, annual: 0, lifetime_solo: 0, lifetime_duo: 0 };
  return {
    monthly: mix.monthly / sum,
    annual: mix.annual / sum,
    lifetime_solo: mix.lifetime_solo / sum,
    lifetime_duo: mix.lifetime_duo / sum,
  };
}

/**
 * Per-month recurring residual (IDR, BigInt) for ONE active subscriber of `tier`
 * at cohort age `ageMonths` (1 = first month active). Picks the rate by TENURE:
 *   monthly: Y1 (1-12mo) → Y2 (13-24) → Y3 (25+). Sub recurs all 3 years.
 *   annual:  Y1 (1-12mo) → Y2 (13-24) → 0 (expires after Y2). Annual sub is a
 *            1-year payment; the yearly commission is amortized over 12 months.
 *   lifetime: 0 (closing only, no recurring).
 *
 * This replaces the old single-rate + decay-multiplier model. The rate is now
 * an explicit % per year, mirroring seed.ts (monthly 40/30/20, annual 30/20).
 */
function monthlyResidualForAge(
  tier: Tier,
  ageMonths: number,
  prices: Prices,
  rates: L1Rates,
): bigint {
  switch (tier) {
    case "monthly": {
      const pct = ageMonths <= 12 ? rates.monthlyPctY1
        : ageMonths <= 24 ? rates.monthlyPctY2
        : rates.monthlyPctY3;
      return pctOf(BigInt(prices.monthly), pct);
    }
    case "annual": {
      // Annual expires after Y2 — no residual in Y3.
      if (ageMonths > 24) return 0n;
      const pct = ageMonths <= 12 ? rates.annualPctY1 : rates.annualPctY2;
      return pctOf(BigInt(prices.annual), pct) / 12n;
    }
    case "lifetime_solo":
    case "lifetime_duo":
      return 0n;
  }
}

/** One-time closing commission (IDR, BigInt) for one sale of `tier`. */
function closingCommission(tier: Tier, rates: L1Rates): bigint {
  switch (tier) {
    case "monthly":
    case "annual":
      return 0n;
    case "lifetime_solo":
      return BigInt(rates.lifetimeSoloCommission);
    case "lifetime_duo":
      return BigInt(rates.lifetimeDuoCommission);
  }
}

const TIERS: Tier[] = ["monthly", "annual", "lifetime_solo", "lifetime_duo"];

/** Subscriber survival at age `ageMonths` given annual churn (%/yr). */
function survivalFactor(ageMonths: number, churnPct: number): number {
  const perYear = 1 - churnPct / 100;
  return Math.pow(perYear, ageMonths / 12);
}

/**
 * 3-PHASE sales count for month M, given a steady-state `target` and a ramp.
 *   Phase 1 (M ≤ rampMonths): linear ramp `target × M/(rampMonths+1)`.
 *   Phase 2 (rampMonths < M ≤ 12): `target` compounded monthly at
 *     growthY1MonthlyPct, starting from `target` at month (rampMonths+1).
 *   Phase 3 (M > 12): the month-12 value compounded at growthY2PlusMonthlyPct.
 * Rounded to the nearest integer (you can't sell fractional units).
 */
export function salesAtMonth(target: number, growth: GrowthRamp, M: number): number {
  const ramp = Math.max(0, growth.rampMonths);
  const t = Math.max(0, target);
  if (t === 0) return 0;

  // Phase 1: linear ramp.
  if (M <= ramp) {
    return Math.round((t * M) / (ramp + 1));
  }
  // Phase 2: from `t` at (rampMonths+1), compound monthly to month 12.
  const y1Growth = 1 + growth.growthY1MonthlyPct / 100;
  const valueAt12 = t * Math.pow(y1Growth, Math.max(0, 12 - (ramp + 1)));
  if (M <= 12) {
    return Math.round(t * Math.pow(y1Growth, M - (ramp + 1)));
  }
  // Phase 3: from month-12 value, compound at the slower Y2+ rate.
  const y2Growth = 1 + growth.growthY2PlusMonthlyPct / 100;
  return Math.round(valueAt12 * Math.pow(y2Growth, M - 12));
}

/**
 * Per-month sales for the FULL projection. Convenience over salesAtMonth.
 */
export function salesSeries(target: number, growth: GrowthRamp, monthsTotal: number): number[] {
  const out: number[] = [];
  for (let M = 1; M <= monthsTotal; M++) out.push(salesAtMonth(target, growth, M));
  return out;
}

/**
 * Per-tier weights (normalized to sum 1) + per-tier one-time closing fee +
 * per-tier end-user price. Residual is NOT precomputed here because it varies
 * by cohort age (Y1/Y2/Y3) — the income loop calls monthlyResidualForAge per
 * cohort. Returned as per-tier maps keyed by Tier.
 */
function perTierAmounts(mix: Mix, rates: L1Rates, prices: Prices): {
  weights: Record<Tier, number>;
  closingPerTier: Record<Tier, bigint>;
  pricePerTier: Record<Tier, bigint>;
} {
  const weights = normalizeMix(mix);
  const closingPerTier: Record<Tier, bigint> = {
    monthly: 0n,
    annual: 0n,
    lifetime_solo: closingCommission("lifetime_solo", rates),
    lifetime_duo: closingCommission("lifetime_duo", rates),
  };
  const pricePerTier: Record<Tier, bigint> = {
    monthly: BigInt(prices.monthly),
    annual: BigInt(prices.annual),
    lifetime_solo: BigInt(prices.lifetime_solo),
    lifetime_duo: BigInt(prices.lifetime_duo),
  };
  return { weights, closingPerTier, pricePerTier };
}

/** Units of tier `t` sold in a month, given total sales and the mix weight. */
function unitsOfTier(totalSales: number, weight: number): number {
  return totalSales * weight;
}

/**
 * Compute the per-month { newIncome, recurringIncome, total, salesValue } series
 * for ONE L1 agent whose per-month sales follow `sales[]` (from salesSeries).
 *
 * Per-tier model (no averaging): each month's `sales[M]` units split across the
 * 4 tiers by mix weights. Each tier contributes:
 *   - closing fee (lifetime only), collected the month of sale → NEW income
 *   - first-month residual (monthly/annual Y1) → NEW income
 *   - residual from PRIOR cohorts, at their current tenure age → RECURRING
 *
 *   newIncome[M]       = Σ_tier units[M] × (closing_tier + residual_tier(age=1))
 *   recurringIncome[M] = Σ_{s<M} Σ_tier units[s] × residual_tier(age=M-s+1)
 *                                       × survival(age, churn)
 *   salesValue[M]      = Σ_tier units[M] × price_tier   (gross end-user value)
 *
 * The residual rate steps down as a cohort ages: monthly 40→30→20%, annual
 * 30→20→0 (expires after Y2). Per-L1; L2/L3/admin scale by downline + override.
 */
function l1IncomeSeries(
  sales: number[],
  mix: Mix,
  prices: Prices,
  rates: L1Rates,
  churnPct: number,
): { newIncome: bigint[]; recurringIncome: bigint[]; total: bigint[]; newCustomers: number[]; salesValue: bigint[] } {
  const { weights, closingPerTier, pricePerTier } = perTierAmounts(mix, rates, prices);
  const newIncome: bigint[] = [];
  const recurringIncome: bigint[] = [];
  const total: bigint[] = [];
  const newCustomers: number[] = [];
  const salesValue: bigint[] = [];

  for (let M = 1; M <= sales.length; M++) {
    const totalSalesM = Math.max(0, sales[M - 1]);

    // Per-tier unit counts this month (fractional is fine — we sell in mix).
    const unitsM: Record<Tier, number> = {
      monthly: unitsOfTier(totalSalesM, weights.monthly),
      annual: unitsOfTier(totalSalesM, weights.annual),
      lifetime_solo: unitsOfTier(totalSalesM, weights.lifetime_solo),
      lifetime_duo: unitsOfTier(totalSalesM, weights.lifetime_duo),
    };

    // NEW income: this month's closing fees + first-month (age=1) residual.
    let ni = 0n;
    let sv = 0n;
    for (const t of TIERS) {
      const u = BigInt(Math.round(unitsM[t] * 1e6)); // scale to preserve fraction
      ni += (u * (closingPerTier[t] + monthlyResidualForAge(t, 1, prices, rates))) / 1_000_000n;
      sv += (u * pricePerTier[t]) / 1_000_000n;
    }

    // RECURRING income: sum over PRIOR cohorts, each tier's residual at its
    // current tenure age, shrunk by survival (annual churn).
    let ri = 0n;
    for (let s = 1; s <= M - 1; s++) {
      const age = M - s + 1;
      const surv = survivalFactor(age, churnPct);
      const survBig = BigInt(Math.round(surv * 1e6));
      const totalSalesS = Math.max(0, sales[s - 1]);
      for (const t of TIERS) {
        const u = BigInt(Math.round(unitsOfTier(totalSalesS, weights[t]) * 1e6));
        const resid = monthlyResidualForAge(t, age, prices, rates);
        ri += (u * resid * survBig) / 1_000_000_000_000n;
      }
    }

    newIncome.push(ni);
    recurringIncome.push(ri);
    total.push(ni + ri);
    newCustomers.push(totalSalesM);
    salesValue.push(sv);
  }
  return { newIncome, recurringIncome, total, newCustomers, salesValue };
}

/** Roll per-month series (with new/recurring split) into a TargetResult. */
function rollup(
  total: bigint[],
  newInc: bigint[],
  recur: bigint[],
  newCust: number[],
  salesVal: bigint[],
  pools?: { l1?: bigint[]; l2?: bigint[]; l3?: bigint[]; gross?: bigint[] },
): TargetResult {
  const n = total.length;
  const months: MonthlyPoint[] = [];
  for (let i = 0; i < n; i++) {
    months.push({
      month: i + 1,
      newIncome: newInc[i],
      recurringIncome: recur[i],
      income: total[i],
      newCustomers: newCust[i] ?? 0,
      salesValue: salesVal[i] ?? 0n,
      gross: pools?.gross?.[i],
      l1Pool: pools?.l1?.[i],
      l2Pool: pools?.l2?.[i],
      l3Pool: pools?.l3?.[i],
    });
  }

  const sumR = (arr: bigint[], from: number, to: number) =>
    arr.slice(from, to).reduce((a, b) => a + b, 0n);

  const mkBreakdown = (from: number, to: number): YearBreakdown => {
    const ni = sumR(newInc, from, to);
    const ri = sumR(recur, from, to);
    return { newIncome: ni, recurringIncome: ri, total: ni + ri };
  };

  const year1B = mkBreakdown(0, Math.min(12, n));
  const year2B = mkBreakdown(12, Math.min(24, n));
  const year3B = mkBreakdown(24, n);
  const grand = year1B.total + year2B.total + year3B.total;
  const avgMonthly = n > 0 ? grand / BigInt(n) : 0n;
  const finalMonthly = n > 0 ? total[n - 1] : 0n;

  return {
    months,
    year1: year1B.total,
    year2: year2B.total,
    year3: year3B.total,
    avgMonthly,
    finalMonthly,
    total: grand,
    year1Breakdown: year1B,
    year2Breakdown: year2B,
    year3Breakdown: year3B,
  };
}

// ---------------------------------------------------------------------------
// Forward projections
// ---------------------------------------------------------------------------

/** Override income series for an upline, derived from a per-L1 base series. */
function overrideSeries(
  perL1: { newIncome: bigint[]; recurringIncome: bigint[]; total: bigint[]; newCustomers: number[]; salesValue: bigint[] },
  overrideRatePct: number,
  overrideKpi: number,
  /** downline count as a function of month (so it can shrink via agent churn). */
  downlineAtMonth: (M: number) => number,
): { newIncome: bigint[]; recurringIncome: bigint[]; total: bigint[]; newCustomers: number[]; salesValue: bigint[] } {
  const factor =
    (BigInt(Math.round(overrideRatePct * 1e4)) / 100n) *
    (BigInt(overrideKpi)) / 100n; // = ratePct% × kpi% / 10000 (applied as /10_000n)
  const scale = (amt: bigint, downline: number) =>
    (amt * BigInt(downline) * factor) / 10_000n;
  const n = perL1.total.length;
  const newIncome: bigint[] = [];
  const recurringIncome: bigint[] = [];
  const total: bigint[] = [];
  const newCustomers: number[] = [];
  const salesValue: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const M = i + 1;
    const d = downlineAtMonth(M);
    const ni = scale(perL1.newIncome[i], d);
    const ri = scale(perL1.recurringIncome[i], d);
    newIncome.push(ni);
    recurringIncome.push(ri);
    total.push(ni + ri);
    // Total acquisitions across the downline this month.
    newCustomers.push(perL1.newCustomers[i] * d);
    // Gross sales value across the downline (end-user price, not commission).
    salesValue.push(perL1.salesValue[i] * BigInt(d));
  }
  return { newIncome, recurringIncome, total, newCustomers, salesValue };
}

export function projectL1(plan: L1Plan, config: { prices: Prices; l1Rates: L1Rates }): TargetResult {
  const sales = salesSeries(plan.salesTarget, plan.growth, plan.monthsTotal);
  const s = l1IncomeSeries(sales, plan.mix, config.prices, config.l1Rates, plan.churnPct);
  return rollup(s.total, s.newIncome, s.recurringIncome, s.newCustomers, s.salesValue);
}

export function projectL2(plan: L2Plan, config: { prices: Prices; l1Rates: L1Rates }): TargetResult {
  const perL1Sales = salesSeries(plan.avgSalesPerL1, plan.growth, plan.monthsTotal);
  const perL1 = l1IncomeSeries(perL1Sales, plan.mix, config.prices, config.l1Rates, plan.churnPct);
  // Downline L1 count shrinks over time via agent churn.
  const downlineAtMonth = (M: number) =>
    Math.round(plan.downlineL1 * survivalFactor(M, plan.l1ChurnPct));
  const ov = overrideSeries(perL1, plan.override.ratePct, plan.override.kpiMultiplier, downlineAtMonth);
  return rollup(ov.total, ov.newIncome, ov.recurringIncome, ov.newCustomers, ov.salesValue);
}

export function projectL3(plan: L3Plan, config: { prices: Prices; l1Rates: L1Rates }): TargetResult {
  const perL1Sales = salesSeries(plan.avgSalesPerL1, plan.growth, plan.monthsTotal);
  const perL1 = l1IncomeSeries(perL1Sales, plan.mix, config.prices, config.l1Rates, plan.churnPct);
  // L3's downline L2 count shrinks; each surviving L2 still leads avgL1PerL2
  // agents (those L1s also churn via product churn inside perL1). The L3 override
  // derives from the L1 base across (surviving L2s × L1s per L2).
  const l2AtMonth = (M: number) =>
    Math.round(plan.downlineL2 * survivalFactor(M, plan.l2ChurnPct));
  const totalL1sAtMonth = (M: number) => l2AtMonth(M) * plan.avgL1PerL2;
  const ov = overrideSeries(perL1, plan.override.ratePct, plan.override.kpiMultiplier, totalL1sAtMonth);
  return rollup(ov.total, ov.newIncome, ov.recurringIncome, ov.newCustomers, ov.salesValue);
}

export function projectAdmin(plan: AdminPlan, config: { prices: Prices; l1Rates: L1Rates }): TargetResult {
  const perAgentSales = salesSeries(plan.avgSalesPerAgent, plan.growth, plan.monthsTotal);
  const perAgentL1 = l1IncomeSeries(perAgentSales, plan.mix, config.prices, config.l1Rates, plan.churnPct);

  // Agent base shrinks over time.
  const agentsAtMonth = (M: number) =>
    Math.round(plan.agents * survivalFactor(M, plan.l1ChurnPct));

  const n = plan.monthsTotal;
  const l1Pool: bigint[] = [];
  const l2Pool: bigint[] = [];
  const l3Pool: bigint[] = [];
  const gross: bigint[] = [];
  const salesVal: bigint[] = [];
  const netNew: bigint[] = [];
  const netRecur: bigint[] = [];
  const netTotal: bigint[] = [];
  const newCust: number[] = [];

  const l2F = (BigInt(Math.round(plan.l2Override.ratePct * 1e4)) / 100n) * BigInt(plan.l2Override.kpiMultiplier) / 100n;
  const l3F = (BigInt(Math.round(plan.l3Override.ratePct * 1e4)) / 100n) * BigInt(plan.l3Override.kpiMultiplier) / 100n;

  for (let i = 0; i < n; i++) {
    const M = i + 1;
    const agents = agentsAtMonth(M);
    const l1 = perAgentL1.total[i] * BigInt(agents);
    const l2 = (l1 * l2F) / 10_000n;
    const l3 = (l1 * l3F) / 10_000n;
    // Gross end-user sales value: per-tier value (from perAgentL1.salesValue)
    // × agent count — the full transaction value before any commission.
    const g = perAgentL1.salesValue[i] * BigInt(agents);
    const nt = g - l1 - l2 - l3;
    // Split net by the same new/recurring ratio as the per-agent income — gives
    // an honest view of how much net is from new acquisition vs recurring book.
    const perAgentTotal = perAgentL1.total[i] || 1n;
    const newFrac = Number(perAgentL1.newIncome[i]) / Number(perAgentTotal);
    l1Pool.push(l1);
    l2Pool.push(l2);
    l3Pool.push(l3);
    gross.push(g);
    // Gross end-user sales value (same as gross for admin — the full
    // transaction value before commissions).
    salesVal.push(g);
    netTotal.push(nt);
    netNew.push(BigInt(Math.round(Number(nt) * newFrac)));
    netRecur.push(nt - BigInt(Math.round(Number(nt) * newFrac)));
    // Total platform acquisitions this month.
    newCust.push(Math.max(0, Math.round(perAgentSales[i] * agents)));
  }

  return rollup(netTotal, netNew, netRecur, newCust, salesVal, { l1: l1Pool, l2: l2Pool, l3: l3Pool, gross });
}

// ---------------------------------------------------------------------------
// Reverse calculations — numeric binary search (ramp breaks linearity)
// ---------------------------------------------------------------------------

/**
 * Generic binary search: find the smallest integer `x` (driver value, e.g.
 * salesTarget / downline count) such that project(year1) >= targetAnnual.
 * Returns the solution + the year1 income that x actually produces.
 */
function numericSolve(
  project: (x: number) => bigint,
  targetAnnual: bigint,
  maxIterations = 40,
): { required: number; producedAnnual: bigint; feasible: boolean } {
  if (targetAnnual <= 0n) return { required: 0, producedAnnual: 0n, feasible: true };
  // Expand the upper bound exponentially until year1 >= target.
  let lo = 0;
  let hi = 1;
  let produced = project(1);
  let iter = 0;
  while (produced < targetAnnual && iter < maxIterations) {
    hi *= 2;
    produced = project(hi);
    iter++;
    if (hi > 1_000_000) break; // safety valve
  }
  if (produced < targetAnnual) {
    return { required: hi, producedAnnual: produced, feasible: false };
  }
  // Binary search [lo, hi] for the smallest x meeting the target.
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const p = project(mid);
    if (p >= targetAnnual) {
      hi = mid;
      produced = p;
    } else {
      lo = mid + 1;
    }
  }
  produced = project(lo);
  return { required: lo, producedAnnual: produced, feasible: true };
}

export function solveL1(targetAnnual: bigint, plan: L1Plan, config: { prices: Prices; l1Rates: L1Rates }): ReverseSolution {
  const proj = (x: number) => projectL1({ ...plan, salesTarget: x }, config).year1;
  const res = numericSolve(proj, targetAnnual);
  if (!res.feasible) return { feasible: false, required: res.required, producedAnnual: res.producedAnnual };
  const w = normalizeMix(plan.mix);
  // Per-tier units at the STEADY-STATE target (reverse calc reports the steady
  // monthly mix, not the ramped early months — clearer for the prospect).
  const perTier: Record<Tier, number> = {
    monthly: Math.round(w.monthly * res.required),
    annual: Math.round(w.annual * res.required),
    lifetime_solo: Math.round(w.lifetime_solo * res.required),
    lifetime_duo: Math.round(w.lifetime_duo * res.required),
  };
  return { feasible: true, required: res.required, perTier, producedAnnual: res.producedAnnual };
}

export function solveL2(targetAnnual: bigint, plan: L2Plan, config: { prices: Prices; l1Rates: L1Rates }): ReverseSolution {
  const proj = (x: number) => projectL2({ ...plan, downlineL1: x }, config).year1;
  const res = numericSolve(proj, targetAnnual);
  return { feasible: res.feasible, required: res.required, producedAnnual: res.producedAnnual };
}

export function solveL3(targetAnnual: bigint, plan: L3Plan, config: { prices: Prices; l1Rates: L1Rates }): ReverseSolution {
  const proj = (x: number) => projectL3({ ...plan, downlineL2: x }, config).year1;
  const res = numericSolve(proj, targetAnnual);
  return { feasible: res.feasible, required: res.required, producedAnnual: res.producedAnnual };
}
