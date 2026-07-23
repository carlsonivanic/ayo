/**
 * Default plans, config, and shared business constants for the target simulator.
 *
 * All business values (prices/rates/decay) are mirrored EXACTLY from
 * convex/seed.ts PARAMS so projections line up with the real engine. These are
 * the DEFAULTS; the /simulator/settings page edits them and persists to
 * localStorage via config.ts. Keep in sync if seed.ts changes.
 */
import type {
  Prices,
  L1Rates,
  ResidualDecay,
  OverrideConfig,
  Mix,
  GrowthRamp,
  SimConfig,
  L1Plan,
  L2Plan,
  L3Plan,
  AdminPlan,
} from "./types";

/** Tier prices (IDR) — mirrors seed.ts price_*. */
export const DEFAULT_PRICES: Prices = {
  monthly: 69_000,
  annual: 499_000,
  lifetime_solo: 1_499_000,
  lifetime_duo: 1_999_000,
};

/** L1 commission rates — mirrors seed.ts l1_*_commission_*_pct.
 *  Monthly residual recurs 3 years (40/30/20). Annual expires after Y2 (30/20).
 *  Lifetime is a flat one-time closing fee. */
export const DEFAULT_L1_RATES: L1Rates = {
  monthlyPctY1: 40,
  monthlyPctY2: 30,
  monthlyPctY3: 20,
  annualPctY1: 30,
  annualPctY2: 20,
  lifetimeSoloCommission: 500_000,
  lifetimeDuoCommission: 700_000,
};

/** Legacy decay defaults — kept for stored-config parse compat; engine ignores. */
export const DEFAULT_DECAY: ResidualDecay = {
  y2: 30 / 40,
  y3: 20 / 30,
};

/** L2 / L3 override + KPI (seed: 15% / 10%, active multiplier 100). */
export const DEFAULT_L2_OVERRIDE: OverrideConfig = { ratePct: 15, kpiMultiplier: 100 };
export const DEFAULT_L3_OVERRIDE: OverrideConfig = { ratePct: 10, kpiMultiplier: 100 };

/** Default product mix (monthly-heavy), mirrors the ops simulator. */
export const DEFAULT_MIX: Mix = {
  monthly: 55,
  annual: 25,
  lifetime_solo: 12,
  lifetime_duo: 8,
};

/**
 * Default 3-phase growth ramp.
 *   - rampMonths 3: first 3 months are a slow start.
 *   - growthY1MonthlyPct 8: months 4–12 compound ~8%/mo (an agent ramping up).
 *   - growthY2PlusMonthlyPct 2: after Y1, slower ~2%/mo stable growth.
 */
export const DEFAULT_GROWTH: GrowthRamp = {
  rampMonths: 3,
  growthY1MonthlyPct: 8,
  growthY2PlusMonthlyPct: 2,
};

/** Churn slider bounds + default. */
export const CHURN_MIN = 20;
export const CHURN_MAX = 50;
export const CHURN_DEFAULT = 30;

/** Agent-churn bounds + default (downline attrition is typically lower than
 *  end-subscriber churn). */
export const AGENT_CHURN_MIN = 5;
export const AGENT_CHURN_MAX = 40;
export const AGENT_CHURN_DEFAULT = 15;

export const MONTHS_TOTAL_DEFAULT = 36;

/**
 * The default editable config. Mirrors seed.ts. The settings page persists a
 * modified copy; plans read prices/rates/decay from whatever config is loaded.
 */
export const DEFAULT_SIM_CONFIG: SimConfig = {
  prices: { ...DEFAULT_PRICES },
  l1Rates: { ...DEFAULT_L1_RATES },
  decay: { ...DEFAULT_DECAY },
  churnDefault: CHURN_DEFAULT,
  agentChurnDefault: AGENT_CHURN_DEFAULT,
  growthDefault: { ...DEFAULT_GROWTH },
};

export function defaultL1Plan(config: SimConfig): L1Plan {
  return {
    level: 1,
    salesTarget: 10,
    growth: { ...config.growthDefault },
    mix: { ...DEFAULT_MIX },
    churnPct: config.churnDefault,
    monthsTotal: MONTHS_TOTAL_DEFAULT,
  };
}

export function defaultL2Plan(config: SimConfig): L2Plan {
  return {
    level: 2,
    downlineL1: 10,
    avgSalesPerL1: 8,
    growth: { ...config.growthDefault },
    mix: { ...DEFAULT_MIX },
    churnPct: config.churnDefault,
    l1ChurnPct: config.agentChurnDefault,
    override: { ...DEFAULT_L2_OVERRIDE },
    monthsTotal: MONTHS_TOTAL_DEFAULT,
  };
}

export function defaultL3Plan(config: SimConfig): L3Plan {
  return {
    level: 3,
    downlineL2: 5,
    avgL1PerL2: 10,
    avgSalesPerL1: 8,
    growth: { ...config.growthDefault },
    mix: { ...DEFAULT_MIX },
    churnPct: config.churnDefault,
    l1ChurnPct: config.agentChurnDefault,
    l2ChurnPct: config.agentChurnDefault,
    l2Override: { ...DEFAULT_L2_OVERRIDE },
    override: { ...DEFAULT_L3_OVERRIDE },
    monthsTotal: MONTHS_TOTAL_DEFAULT,
  };
}

export function defaultAdminPlan(config: SimConfig): AdminPlan {
  return {
    level: "admin",
    agents: 100,
    avgSalesPerAgent: 8,
    growth: { ...config.growthDefault },
    mix: { ...DEFAULT_MIX },
    churnPct: config.churnDefault,
    l1ChurnPct: config.agentChurnDefault,
    l2ChurnPct: config.agentChurnDefault,
    l3ChurnPct: config.agentChurnDefault,
    l2Override: { ...DEFAULT_L2_OVERRIDE },
    l3Override: { ...DEFAULT_L3_OVERRIDE },
    monthsTotal: MONTHS_TOTAL_DEFAULT,
  };
}
