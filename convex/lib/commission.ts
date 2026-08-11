import { Doc } from "../_generated/dataModel";
import { pctOf } from "./money";
import { monthsBetween } from "./period";
import { SchemeSettings } from "./settings";

// Pure commission rules (§2, §7, §8, §10, §14, §16). No database access here so
// the same functions are used by the engine, the queries and the tests.

export type YLabel = "Y1" | "Y2" | "Y3" | "Y4+";

/**
 * §14.2 — the merchant's ownership year at a given PAYMENT date, measured from
 * the merchant's first successful payment. Pauses and churn do not stop the clock.
 */
export function yearBucket(
  merchantFirstPaymentAt: number,
  paymentDate: number,
  windowMonths = 36,
): YLabel {
  const elapsed = monthsBetween(merchantFirstPaymentAt, paymentDate);
  if (elapsed >= windowMonths) return "Y4+";
  if (elapsed >= 24) return "Y3";
  if (elapsed >= 12) return "Y2";
  return "Y1";
}

export function yPercent(plan: Doc<"productPlans">, label: YLabel): number {
  switch (label) {
    case "Y1":
      return plan.y1Percent;
    case "Y2":
      return plan.y2Percent;
    case "Y3":
      return plan.y3Percent;
    default:
      return plan.y4PlusPercent;
  }
}

/** Owner recurring commission for a renewal payment. */
export function recurringCommission(
  plan: Doc<"productPlans">,
  merchantFirstPaymentAt: number,
  paymentDate: number,
  price: number,
  windowMonths = 36,
): { amount: number; label: YLabel; percent: number } {
  const label = yearBucket(merchantFirstPaymentAt, paymentDate, windowMonths);
  const percent = yPercent(plan, label);
  return { amount: pctOf(price, percent), label, percent };
}

/** §2.3 renewal incentive — one-time 2% to the L1 who sold the renewal code. */
export function renewalIncentive(price: number, percent: number): number {
  return pctOf(price, percent);
}

// --- L2 (§16) --------------------------------------------------------------

export type L2Stage = Doc<"l2EarningLines">["stage"];

export function l2StageFor(tenureMonth: number, s: SchemeSettings): L2Stage {
  if (tenureMonth < s.l2.startMonth) return "PROBATION";
  if (tenureMonth <= 18) return "ACTIVE_FEE";
  if (tenureMonth <= 30) return "DECAY_1";
  if (tenureMonth <= 42) return "DECAY_2";
  return "MATURE";
}

/** Effective L2 fee percentage for an L1 at a given tenure month. */
export function l2EffectivePercent(tenureMonth: number, s: SchemeSettings): number {
  const stage = l2StageFor(tenureMonth, s);
  const decay =
    stage === "ACTIVE_FEE"
      ? s.l2.decayM7_18
      : stage === "DECAY_1"
        ? s.l2.decayM19_30
        : stage === "DECAY_2"
          ? s.l2.decayM31_42
          : 0;
  // 10% x 66% = 6,6% — keep one decimal, which is what the spec quotes.
  return Math.round(s.l2.basePercent * decay) / 100;
}

// --- L1 month-end (§7, §8, §10) -------------------------------------------

export function l1Target(tenureMonth: number, s: SchemeSettings): number {
  if (tenureMonth <= 3) return s.l1Target.m1_3;
  if (tenureMonth <= 6) return s.l1Target.m4_6;
  if (tenureMonth <= 9) return s.l1Target.m7_9;
  if (tenureMonth <= 11) return s.l1Target.m10_11;
  return s.l1Target.m12Plus;
}

/** §7.2 guarantee (Jaminan Income). */
export function jaminanFor(
  tenureMonth: number,
  activations: number,
  gross: number,
  s: SchemeSettings,
): number {
  if (!s.guarantee.enable) return 0;
  if (tenureMonth < 1 || tenureMonth > s.guarantee.months) return 0;
  if (activations < s.guarantee.minActivations) return 0;
  if (gross >= s.guarantee.topUp) return 0;
  return s.guarantee.topUp - gross;
}

export type WarmthOutcome = {
  state: Doc<"monthlyL1Summaries">["warmthState"];
  heldPercent: number;
  consecutiveSub5Months: number;
  releasesHeld: boolean;
};

/**
 * §8 warmth. Inactive during the guarantee months, so neither the state nor the
 * cold streak advances before `startAfterMonth` is passed (FIX-3).
 */
export function warmthFor(
  tenureMonth: number,
  activations: number,
  consecutiveSub5Months: number,
  s: SchemeSettings,
): WarmthOutcome {
  if (tenureMonth <= s.warmth.startAfterMonth) {
    return {
      state: undefined,
      heldPercent: 0,
      consecutiveSub5Months,
      releasesHeld: activations >= s.warmth.releaseThreshold,
    };
  }
  if (activations >= s.warmth.warmThreshold) {
    return {
      state: "WARM",
      heldPercent: s.warmth.warmHeld,
      consecutiveSub5Months: 0,
      releasesHeld: true,
    };
  }
  const streak = consecutiveSub5Months + 1;
  const cold = streak >= s.warmth.coldConsecutive;
  return {
    state: cold ? "COLD" : "COOL",
    heldPercent: cold ? s.warmth.coldHeld : s.warmth.coolHeld,
    consecutiveSub5Months: streak,
    releasesHeld: false,
  };
}
