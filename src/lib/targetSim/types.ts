/**
 * Target-planning simulator types (v3).
 *
 * Major changes vs v2:
 *   - Sales follow a 3-PHASE GROWTH RAMP (slow start → exponential → stable),
 *     not a flat per-month count. See GrowthRamp + salesAtMonth.
 *   - Per-level AGENT CHURN shrinks downline counts over time (L2/L3/Admin).
 *   - Monthly income is split into NEW-acquisition vs RECURRING components.
 *   - All business constants (prices, rates, decay, churn/growth defaults) live
 *     in a single editable SimConfig, persisted in localStorage — no hardcoded
 *     values; the /simulator/settings page edits this object.
 *
 * All money is BigInt IDR. Commission math mirrors convex/lib/commission.ts.
 */

/** The four paying product tiers. (daily/weekly are self-serve, no commission.) */
export type Tier = "monthly" | "annual" | "lifetime_solo" | "lifetime_duo";

/** Product mix — relative weights per tier, normalized to sum to 1 at use. */
export interface Mix {
  monthly: number;
  annual: number;
  lifetime_solo: number;
  lifetime_duo: number;
}

/** Per-tier prices in IDR. */
export interface Prices {
  monthly: number;
  annual: number;
  lifetime_solo: number;
  lifetime_duo: number;
}

/** L1 commission configuration.
 *  Residuals are % of price, given EXPLICITLY per year — mirrors seed.ts:
 *    l1_monthly_commission_y1/y2/y3_pct = 40/30/20 (monthly sub recurs 3 years)
 *    l1_annual_commission_y1/y2_pct   = 30/20  (annual sub expires after Y2)
 *  Lifetime pays a flat one-time closing fee, no recurring residual.
 *
 *  The year switch is by CUSTOMER TENURE (age of each cohort), not calendar
 *  month — a sale made at month 20 is still in its Y1 at month 20 and only
 *  drops to Y2 once it ages past 12 months. Annual drops to 0 after month 24. */
export interface L1Rates {
  monthlyPctY1: number;
  monthlyPctY2: number;
  monthlyPctY3: number;
  annualPctY1: number;
  annualPctY2: number;
  lifetimeSoloCommission: number; // flat IDR, one-time
  lifetimeDuoCommission: number; // flat IDR, one-time
}

/** Legacy — kept so stored configs still parse. The engine no longer reads this;
 *  year-switching is driven by the explicit Y1/Y2/Y3 percentages in L1Rates. */
export interface ResidualDecay {
  y2: number;
  y3: number;
}

/**
 * 3-phase sales growth ramp. `salesAtMonth(target, growth, M)`:
 *   Phase 1 (M ≤ rampMonths): linear ramp from ~0 up to `target`.
 *   Phase 2 (rampMonths < M ≤ 12): `target` compounded monthly at
 *     growthY1MonthlyPct — the "exponential" year-1 growth after the slow start.
 *   Phase 3 (M > 12): continues compounding from the month-12 value at the
 *     slower growthY2PlusMonthlyPct.
 *
 * All growth percentages are MONTHLY (smoother for a monthly model).
 */
export interface GrowthRamp {
  rampMonths: number; // length of phase 1 (slow start)
  growthY1MonthlyPct: number; // phase 2 monthly compounding %
  growthY2PlusMonthlyPct: number; // phase 3 monthly compounding %
}

/** Override configuration for an upline (L2 or L3). */
export interface OverrideConfig {
  /** % of the downline's L1 commission paid to the upline. seed: l2=15, l3=10. */
  ratePct: number;
  /** KPI health multiplier, 0..100. seed active = 100. */
  kpiMultiplier: number;
}

/**
 * The editable global config. All business constants live here; plans reference
 * it rather than carrying their own copies. Persisted in localStorage so a
 * recruiter's edits on /simulator/settings flow to every level view. Defaults
 * mirror convex/seed.ts PARAMS.
 */
export interface SimConfig {
  prices: Prices;
  l1Rates: L1Rates;
  decay: ResidualDecay;
  /** Default product churn (%) when a new plan is created. */
  churnDefault: number;
  /** Default agent-churn (%) per level for new plans. */
  agentChurnDefault: number;
  /** Default 3-phase growth for new plans. */
  growthDefault: GrowthRamp;
}

/**
 * L1 target plan. `salesTarget` is the steady-state monthly sales the agent
 * aims for; the actual per-month sales follows the growth ramp from there.
 */
export interface L1Plan {
  level: 1;
  salesTarget: number; // steady-state monthly sales (reached after ramp)
  growth: GrowthRamp;
  mix: Mix;
  churnPct: number; // product (subscriber) churn, %/yr
  monthsTotal: number;
}

/** L2 target plan — override income from a downline of L1s. */
export interface L2Plan {
  level: 2;
  downlineL1: number; // initial active L1 agents in downline
  avgSalesPerL1: number; // steady-state sales/month per L1
  growth: GrowthRamp; // per-L1 sales growth over time
  mix: Mix;
  churnPct: number; // product churn
  l1ChurnPct: number; // downline L1 agent churn, %/yr
  override: OverrideConfig;
  monthsTotal: number;
}

/** L3 target plan — override income from a downline of L2s. */
export interface L3Plan {
  level: 3;
  downlineL2: number; // initial L2 leaders in downline
  avgL1PerL2: number;
  avgSalesPerL1: number;
  growth: GrowthRamp;
  mix: Mix;
  churnPct: number; // product churn
  l1ChurnPct: number; // L1 agent churn
  l2ChurnPct: number; // L2 leader churn
  l2Override: OverrideConfig;
  override: OverrideConfig; // the L3's own override
  monthsTotal: number;
}

/** Admin financial projection plan — platform-level P&L. */
export interface AdminPlan {
  level: "admin";
  agents: number; // initial total active L1 agents
  avgSalesPerAgent: number;
  growth: GrowthRamp;
  mix: Mix;
  churnPct: number; // product churn
  l1ChurnPct: number; // L1 agent churn
  l2ChurnPct: number;
  l3ChurnPct: number;
  l2Override: OverrideConfig;
  l3Override: OverrideConfig;
  monthsTotal: number;
}

export type AnyPlan = L1Plan | L2Plan | L3Plan | AdminPlan;

/** One month of projected income, split into new vs recurring. BigInt IDR. */
export interface MonthlyPoint {
  month: number;
  /** Income from this month's OWN new acquisitions: closing fees + the new
   *  cohorts' first-month residual contribution. */
  newIncome: bigint;
  /** Residual income carried from PRIOR months' cohorts (the recurring book). */
  recurringIncome: bigint;
  /** newIncome + recurringIncome. */
  income: bigint;
  /** Count of NEW customers acquired this month (drives the acquisition line). */
  newCustomers: number;
  /** Gross END-USER sales value of this month's new acquisitions (price paid by
   *  merchants), before any commission. = newCustomers × weighted avg price.
   *  Distinct from commission income — it's the full transaction value. */
  salesValue: bigint;
  /** Admin only: this month's gross revenue. */
  gross?: bigint;
  l1Pool?: bigint;
  l2Pool?: bigint;
  l3Pool?: bigint;
}

/** Per-year breakdown of new vs recurring income. */
export interface YearBreakdown {
  total: bigint;
  newIncome: bigint;
  recurringIncome: bigint;
}

/** Result of a forward projection. */
export interface TargetResult {
  months: MonthlyPoint[];
  year1: bigint;
  year2: bigint;
  year3: bigint;
  avgMonthly: bigint;
  finalMonthly: bigint;
  total: bigint;
  /** Split breakdowns (for the chart totals + the new-vs-recurring legend). */
  year1Breakdown: YearBreakdown;
  year2Breakdown: YearBreakdown;
  year3Breakdown: YearBreakdown;
}

/** Reverse-calc output: how many sales / downline needed to hit a target. */
export interface ReverseSolution {
  feasible: boolean;
  required: number;
  perTier?: Record<Tier, number>;
  producedAnnual: bigint;
}
