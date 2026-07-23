/**
 * Pure simulation core. No React, no Convex, no DOM — just (params, seed) →
 * result. Safe to call from a Web Worker if the projection ever gets heavy.
 *
 * The commission math mirrors `convex/lib/commission.ts` (computeCommissionEntries)
 * and `convex/lib/money.ts` (pctOf) so a projection matches what the real
 * engine would write to commissionLedger for the same activations. All money
 * stays in BigInt IDR.
 */
import type {
  SimParams,
  SimResult,
  MonthlySeries,
  AgentRollup,
  Tier,
} from "./types";
import {
  mulberry32,
  randInt,
  chance,
  pickWeightedIndex,
  lerp,
  type Rng,
} from "./prng";

/** BigInt-safe percentage, floored — identical to convex/lib/money.ts:pctOf. */
function pctOf(amount: bigint, pct: number): bigint {
  return (amount * BigInt(Math.round(pct * 100))) / 10000n;
}

/** A simulated agent (any level). Mutable working state used by the engine. */
interface SimAgent {
  id: number;
  level: 1 | 2 | 3;
  enrolledMonth: number;
  status: "probation" | "active";
  /** Decided at recruitment: will this L1 pass probation? */
  willPass: boolean;
  /** The L2 (level-2 agent) leading this L1, if any. L2/L3 have no leader. */
  l2LeaderId: number | null;
  /** The L3 leading the L2 that leads this L1 (resolved for override payout). */
  l3LeaderId: number | null;
  /** Counters for the rollup tables. */
  customers: number; // L1 only
  downline: number; // L2/L3 only
  totalIncome: bigint;
}

/** Ramp a scalar from start (month 1) to end (final month). */
function ramp(start: number, end: number, month: number, monthsTotal: number): number {
  const t = monthsTotal <= 1 ? 0 : (month - 1) / (monthsTotal - 1);
  return lerp(start, end, t);
}

/**
 * Pick a tier for a single acquisition using the (relative) mix weights.
 * Returns null only if all mix weights are zero (degenerate input).
 */
function pickTier(rng: Rng, p: SimParams): Tier | null {
  const idx = pickWeightedIndex(rng, [
    p.mixMonthly,
    p.mixAnnual,
    p.mixLifetimeSolo,
    p.mixLifetimeDuo,
  ]);
  if (idx < 0) return null;
  return (["monthly", "annual", "lifetime_solo", "lifetime_duo"] as Tier[])[idx];
}

/** L1 commission for one acquisition — mirrors computeCommissionEntries step 1
 *  (lifetime → flat; monthly/annual → pctOf(price, pct)). Returns 0n for any
 *  tier the real engine would not pay (none here, since daily/weekly excluded). */
function l1CommissionForTier(tier: Tier, p: SimParams): bigint {
  switch (tier) {
    case "monthly":
      return pctOf(BigInt(p.priceMonthly), p.l1MonthlyPct);
    case "annual":
      return pctOf(BigInt(p.priceAnnual), p.l1AnnualPct);
    case "lifetime_solo":
      return BigInt(p.l1LifetimeSoloCommission);
    case "lifetime_duo":
      return BigInt(p.l1LifetimeDuoCommission);
  }
}

/** Gross revenue (price paid by the merchant) for one acquisition of `tier`. */
function revenueForTier(tier: Tier, p: SimParams): bigint {
  switch (tier) {
    case "monthly":
      return BigInt(p.priceMonthly);
    case "annual":
      return BigInt(p.priceAnnual);
    case "lifetime_solo":
      return BigInt(p.priceLifetimeSolo);
    case "lifetime_duo":
      return BigInt(p.priceLifetimeDuo);
  }
}

/**
 * Run the full 2-year (or `params.monthsTotal`) projection.
 *
 * Monthly loop:
 *   1. Spawn new L1s per the recruitment ramp; assign each a willPass fate
 *      (probability = failure rate ramped to this month) and a seat under an
 *      L2 leader. L2s are spawned structurally when the spawn ratio is crossed
 *      or an L2 hits its roster cap. L3s likewise.
 *   2. Resolve probation for L1s whose window elapsed this month: pass → active,
 *      fail → removed.
 *   3. Each active L1 acquires randInt(acqMin, acqMax) customers; each draws a
 *      tier from the weighted mix.
 *   4. For each acquisition, compute L1 commission + L2/L3 overrides and
 *      accumulate per-agent and per-month.
 */
export function runSimulation(params: SimParams): SimResult {
  const rng = mulberry32(params.seed >>> 0);
  const p = params;
  const months: MonthlySeries[] = [];

  // All agents ever spawned (including removed/failed ones). Kept so the L2/L3
  // rollups can reference leaders even after their downline churns.
  const agents: SimAgent[] = [];
  let nextId = 1;

  // Leaders currently accepting downline. `null` means "no leader yet — the
  // next spawn ratio crossing will create one".
  let currentL2: SimAgent | null = null;
  let currentL3: SimAgent | null = null;
  // Cumulative count of L1s (and L2s) RECRUITED since sim start — used by the
  // spawn-ratio rule. We deliberately count recruitment, not passed-probation,
  // so "5 L1 → 1 L2" fires deterministically at recruitment time (not 3 months
  // late), and a high failure rate doesn't collapse everyone under one leader.
  let recruitedL1SinceStart = 0;
  let spawnedL2SinceStart = 0;

  // Pending probations: {agent, enrollMonth}. Resolved when the window elapses.
  const pending: { agent: SimAgent }[] = [];

  const totals = {
    recruited: 0,
    passed: 0,
    failed: 0,
    finalActiveL1: 0,
    finalL2: 0,
    finalL3: 0,
    totalCustomers: 0,
    revenue: 0n,
    l1Pool: 0n,
    l2Pool: 0n,
    l3Pool: 0n,
    commissionLiability: 0n,
  };

  for (let m = 1; m <= p.monthsTotal; m++) {
    const series: MonthlySeries = {
      month: m,
      recruits: 0,
      failed: 0,
      activated: 0,
      activeL1: 0,
      activeL2: 0,
      activeL3: 0,
      newCustomers: 0,
      revenue: 0n,
      l1Pool: 0n,
      l2Pool: 0n,
      l3Pool: 0n,
    };

    // --- 1. Recruitment -----------------------------------------------------
    const recruits = Math.max(
      0,
      Math.round(ramp(p.recruitStart, p.recruitEnd, m, p.monthsTotal)),
    );
    const failRate = ramp(p.failStart, p.failEnd, m, p.monthsTotal);

    for (let i = 0; i < recruits; i++) {
      recruitedL1SinceStart++;
      // Ensure an L2 seat exists. The spawn ratio fires deterministically on
      // every l2SpawnRatio-th L1 recruited (so "5 L1 → 1 L2" holds regardless
      // of the failure rate), OR when the current L2's roster is full. The
      // roster counts ASSIGNMENTS — a failed L1 still occupied the leader's
      // seat during probation, so we don't decrement on failure.
      const needNewL2 =
        currentL2 === null ||
        currentL2.downline >= p.l2RosterCap ||
        recruitedL1SinceStart % p.l2SpawnRatio === 0;
      if (needNewL2) {
        spawnedL2SinceStart++;
        // L3 spawn mirrors the L2 rule, one level up.
        const needNewL3 =
          currentL3 === null ||
          currentL3.downline >= p.l3RosterCap ||
          spawnedL2SinceStart % p.l3SpawnRatio === 0;
        if (needNewL3) {
          currentL3 = {
            id: nextId++,
            level: 3,
            enrolledMonth: m,
            status: "active",
            willPass: true,
            l2LeaderId: null,
            l3LeaderId: null,
            customers: 0,
            downline: 0,
            totalIncome: 0n,
          };
          agents.push(currentL3);
        }
        currentL2 = {
          id: nextId++,
          level: 2,
          enrolledMonth: m,
          status: "active",
          willPass: true,
          l2LeaderId: null,
          l3LeaderId: currentL3?.id ?? null,
          customers: 0,
          downline: 0,
          totalIncome: 0n,
        };
        if (currentL3) currentL3.downline++;
        agents.push(currentL2);
      }

      const l1: SimAgent = {
        id: nextId++,
        level: 1,
        enrolledMonth: m,
        status: "probation",
        willPass: chance(rng, 100 - failRate), // pass with prob (100 - failRate)
        l2LeaderId: currentL2?.id ?? null,
        l3LeaderId: currentL3?.id ?? null,
        customers: 0,
        downline: 0,
        totalIncome: 0n,
      };
      if (currentL2) currentL2.downline++;
      agents.push(l1);
      pending.push({ agent: l1 });
      series.recruits++;
      totals.recruited++;
    }

    // --- 2. Resolve probation for L1s whose window elapsed this month -------
    // An L1 enrolled at month e exits probation at e + probationWindow. A
    // passing L1 becomes active (and starts acquiring customers); a failing
    // L1 is marked inactive. We DO NOT touch the leader's downline counter
    // here — the seat was held during probation (see comment above).
    for (let i = pending.length - 1; i >= 0; i--) {
      const entry = pending[i];
      if (m - entry.agent.enrolledMonth + 1 < p.probationWindow) continue;
      if (entry.agent.willPass) {
        entry.agent.status = "active";
        series.activated++;
        totals.passed++;
      } else {
        entry.agent.status = "active"; // mark non-pending so it stops counting
        series.failed++;
        totals.failed++;
      }
      pending.splice(i, 1);
    }

    // --- 3 + 4. Active L1s acquire customers; commission accrues -----------
    const acqMin = Math.max(
      0,
      Math.round(ramp(p.acqMinStart, p.acqMinEnd, m, p.monthsTotal)),
    );
    const acqMax = Math.max(
      acqMin,
      Math.round(ramp(p.acqMaxStart, p.acqMaxEnd, m, p.monthsTotal)),
    );

    let activeL1Count = 0;
    for (const a of agents) {
      if (a.level !== 1 || a.status !== "active" || !a.willPass) continue;
      // Only L1s that have passed probation acquire customers.
      if (m - a.enrolledMonth + 1 < p.probationWindow) continue;
      activeL1Count++;

      const n = randInt(rng, acqMin, acqMax);
      for (let k = 0; k < n; k++) {
        const tier = pickTier(rng, p);
        if (!tier) continue;
        const price = revenueForTier(tier, p);
        const l1Amt = l1CommissionForTier(tier, p);

        series.newCustomers++;
        series.revenue += price;
        a.customers++;
        a.totalIncome += l1Amt;
        series.l1Pool += l1Amt;

        if (a.l2LeaderId !== null) {
          const l2 = agents.find((x) => x.id === a.l2LeaderId);
          if (l2) {
            const l2Amt =
              (pctOf(l1Amt, p.l2OverrideRate) * BigInt(p.l2KpiMultiplier)) /
              100n;
            l2.totalIncome += l2Amt;
            series.l2Pool += l2Amt;
          }
        }
        if (a.l3LeaderId !== null) {
          const l3 = agents.find((x) => x.id === a.l3LeaderId);
          if (l3) {
            const l3Amt =
              (pctOf(l1Amt, p.l3OverrideRate) * BigInt(p.l3KpiMultiplier)) /
              100n;
            l3.totalIncome += l3Amt;
            series.l3Pool += l3Amt;
          }
        }
      }
    }

    series.activeL1 = activeL1Count;
    series.activeL2 = agents.filter(
      (a) => a.level === 2 && a.status === "active",
    ).length;
    series.activeL3 = agents.filter(
      (a) => a.level === 3 && a.status === "active",
    ).length;

    totals.totalCustomers += series.newCustomers;
    totals.revenue += series.revenue;
    totals.l1Pool += series.l1Pool;
    totals.l2Pool += series.l2Pool;
    totals.l3Pool += series.l3Pool;

    months.push(series);
  }

  totals.finalActiveL1 =
    months.length > 0 ? months[months.length - 1].activeL1 : 0;
  totals.finalL2 = months.length > 0 ? months[months.length - 1].activeL2 : 0;
  totals.finalL3 = months.length > 0 ? months[months.length - 1].activeL3 : 0;
  totals.commissionLiability = totals.l1Pool + totals.l2Pool + totals.l3Pool;

  const toRollup = (a: SimAgent): AgentRollup => ({
    id: a.id,
    level: a.level,
    enrolledMonth: a.enrolledMonth,
    downlineOrCustomers: a.level === 1 ? a.customers : a.downline,
    totalIncome: a.totalIncome,
  });

  const topL2 = agents
    .filter((a) => a.level === 2)
    .map(toRollup)
    .sort((a, b) => (b.totalIncome > a.totalIncome ? 1 : -1))
    .slice(0, 10);
  const topL3 = agents
    .filter((a) => a.level === 3)
    .map(toRollup)
    .sort((a, b) => (b.totalIncome > a.totalIncome ? 1 : -1))
    .slice(0, 10);

  return { months, totals, topL2, topL3 };
}
