/**
 * Default parameter values for the simulator.
 *
 * Business values (tier prices, L1 rates, override rates) are mirrored EXACTLY
 * from `convex/seed.ts` (PARAMS constant, lines 10-105) so a projection lines
 * up with what the real Convex commission engine (`convex/lib/commission.ts`)
 * would produce for the same activations.
 *
 * Operational assumptions reflect the user's spec:
 *   - Month 0 recruits = 5, ramping to Month 23 (= UI "Month 24") = 30
 *   - Probation failure: Month 0 = 50% → Month 23 = 20%
 *   - Customer acquisition KPI: Month 1 = 0..5 → Month 24 = 5..20
 *   - 5 L1 → 1 L2; L2 roster cap 20. 5 L2 → 1 L3; L3 roster cap 20.
 */
import type { SimParams } from "./types";

export const DEFAULT_PARAMS: SimParams = {
  monthsTotal: 24,

  // Recruitment ramp: 5 (UI "Month 1") → 30 (UI "Month 24").
  recruitStart: 5,
  recruitEnd: 30,

  probationWindow: 3,

  // Probation failure: 50% → 20%.
  failStart: 50,
  failEnd: 20,

  // Acquisition KPI ramp: min 0 → 5, max 5 → 20.
  acqMinStart: 0,
  acqMinEnd: 5,
  acqMaxStart: 5,
  acqMaxEnd: 20,

  // Product mix — realistic weighted (monthly-heavy), per user choice.
  // Monthly 55% / Annual 25% / Lifetime Solo 12% / Lifetime Duo 8%.
  mixMonthly: 55,
  mixAnnual: 25,
  mixLifetimeSolo: 12,
  mixLifetimeDuo: 8,

  // Hierarchy spawning (user spec).
  l2SpawnRatio: 5,
  l2RosterCap: 20,
  l3SpawnRatio: 5,
  l3RosterCap: 20,

  // Tier prices — mirror seed.ts PARAMS.
  priceMonthly: 69_000,
  priceAnnual: 499_000,
  priceLifetimeSolo: 1_499_000,
  priceLifetimeDuo: 1_999_000,

  // L1 commission rates (Y1 only — the engine doesn't branch on year yet).
  l1MonthlyPct: 40,
  l1AnnualPct: 30,
  l1LifetimeSoloCommission: 500_000,
  l1LifetimeDuoCommission: 700_000,

  // Override rates + upline KPI multipliers.
  // Multipliers default to 100 (matches today's engine — agentKpiSnapshots is
  // unwired, so all uplines earn at full until a snapshot says otherwise).
  l2OverrideRate: 15,
  l2KpiMultiplier: 100,
  l3OverrideRate: 10,
  l3KpiMultiplier: 100,

  seed: 42,
};
