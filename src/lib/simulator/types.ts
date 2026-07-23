/**
 * Type definitions for the 2-year operation simulator.
 *
 * The simulator is pure (in-memory, no DB writes). Its parameter set mirrors
 * the business values in `convex/seed.ts` (PARAMS) so a projection lines up
 * with what the real Convex commission engine would produce for the same
 * activations. All money is BigInt IDR — never floats.
 */

/** The four paying product tiers a customer acquisition can draw from.
 *  (daily/weekly are self-serve tiers that earn no commission — excluded.) */
export type Tier = "monthly" | "annual" | "lifetime_solo" | "lifetime_duo";

/** Complete set of sliders / inputs that drive a projection. Every field is
 *  something the operator can tweak in the UI. Grouped only for readability;
 *  the engine treats it as a flat bag of values. */
export interface SimParams {
  /** Number of calendar months to project. Default 24 (2 years). */
  monthsTotal: number;

  /** Recruitment ramp — how many NEW L1 agents enroll per month.
   *  `recruitStart` is month 1, `recruitEnd` is the final month. */
  recruitStart: number;
  recruitEnd: number;

  /** Probation window (months). A fresh L1 sits in probation for this long
   *  before either becoming active or being removed. Default 3. */
  probationWindow: number;

  /** Probability an L1 FAILS probation, ramped over the simulation.
   *  Values are percentages 0..100. Month 1 uses failStart, final month uses
   *  failEnd. Failure fate is decided at recruitment (deterministic per seed). */
  failStart: number;
  failEnd: number;

  /** Per-active-L1 customer acquisition KPI range, ramped over the simulation.
   *  Each active L1 draws randInt(acqMin, acqMax) new customers per month.
   *  acqMinStart..acqMinEnd and acqMaxStart..acqMaxEnd ramp independently. */
  acqMinStart: number;
  acqMinEnd: number;
  acqMaxStart: number;
  acqMaxEnd: number;

  /** Product mix — share of acquisitions drawn from each tier. The engine
   *  normalizes these to sum to 1 (so they're "relative weights", not strict
   *  percentages — the operator doesn't have to fight to make them sum to 100). */
  mixMonthly: number;
  mixAnnual: number;
  mixLifetimeSolo: number;
  mixLifetimeDuo: number;

  /** Hierarchy spawning rules.
   *  - `l2SpawnRatio`: every Nth active L1 triggers spawning a new L2 leader.
   *    (User spec: "5x L1 → born 1x L2".)
   *  - `l2RosterCap`: max L1s a single L2 may lead before a new L2 is spawned.
   *    (User spec: "L2 leader allowed to have max 20 L1 agent".)
   *  - `l3SpawnRatio` / `l3RosterCap`: same shape, L2→L3.
   *    (User spec: "5x L2 → born 1x L3", "max 20 L2 leader".) */
  l2SpawnRatio: number;
  l2RosterCap: number;
  l3SpawnRatio: number;
  l3RosterCap: number;

  /** Tier prices in IDR (mirrors `price_*` params). */
  priceMonthly: number;
  priceAnnual: number;
  priceLifetimeSolo: number;
  priceLifetimeDuo: number;

  /** L1 commission rates — Y1 only (the engine doesn't read Y2/Y3 yet).
   *  Monthly/annual are percentages of price; lifetime solo/duo are flat IDR. */
  l1MonthlyPct: number;
  l1AnnualPct: number;
  l1LifetimeSoloCommission: number;
  l1LifetimeDuoCommission: number;

  /** Override rates (percentages of the L1 amount) and upline KPI multipliers
   *  (0..100). Mirrors `l2_override_rate` / `l3_override_rate` and the
   *  `agentKpiSnapshots.multiplierPct` the engine reads. */
  l2OverrideRate: number;
  l2KpiMultiplier: number;
  l3OverrideRate: number;
  l3KpiMultiplier: number;

  /** PRNG seed. Same seed + same params → identical projection. */
  seed: number;
}

/** One calendar month of aggregate time-series output. BigInt money. */
export interface MonthlySeries {
  month: number; // 1..monthsTotal
  recruits: number; // new L1s enrolled this month
  failed: number; // L1s removed from probation this month (failed)
  activated: number; // L1s that PASSED probation this month
  activeL1: number; // active L1 count at end of month
  activeL2: number;
  activeL3: number;
  newCustomers: number; // total acquisitions this month
  revenue: bigint; // gross IDR from this month's acquisitions
  l1Pool: bigint; // L1 commission earned this month
  l2Pool: bigint; // L2 override earned this month
  l3Pool: bigint; // L3 override earned this month
}

/** A per-agent rollup. Used for the "top earners" tables in the UI. */
export interface AgentRollup {
  id: number;
  level: 1 | 2 | 3;
  enrolledMonth: number;
  /** Customers acquired (L1) or downline agents led (L2/L3). */
  downlineOrCustomers: number;
  totalIncome: bigint;
}

/** Final result returned by `runSimulation`. */
export interface SimResult {
  months: MonthlySeries[];
  totals: {
    recruited: number;
    passed: number;
    failed: number;
    finalActiveL1: number;
    finalL2: number;
    finalL3: number;
    totalCustomers: number;
    revenue: bigint;
    l1Pool: bigint;
    l2Pool: bigint;
    l3Pool: bigint;
    /** All-in commission liability = L1 + L2 + L3 pools. */
    commissionLiability: bigint;
  };
  topL2: AgentRollup[];
  topL3: AgentRollup[];
}
