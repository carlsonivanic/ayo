import { Doc } from "../_generated/dataModel";
import { yPercent, type YLabel } from "./commission";
import { pctOf } from "./money";

// Lifetime value of one merchant, expressed as commission to the L1 who owns
// them (§14.2). AYO already pays recurring commission for a fixed ownership
// window, so "lifetime" is not open-ended: it is every payment that falls
// inside that window, priced at the Y-bucket the payment lands in.
//
// These are projections, not ledger entries. Nothing here writes, and nothing
// here is allowed to disagree with `recurringCommission` on a payment that
// actually happened — both read the same percentages off the same plan.

/** Y-bucket of a payment made `monthOffset` months after the first payment. */
function bucketAt(monthOffset: number, windowMonths: number): YLabel {
  if (monthOffset >= windowMonths) return "Y4+";
  if (monthOffset >= 24) return "Y3";
  if (monthOffset >= 12) return "Y2";
  return "Y1";
}

export type ValueSchedule = { monthOffset: number; amount: number }[];

/**
 * Every commission payment one merchant on this plan generates, from their
 * first payment to the end of the ownership window.
 *
 * A renewal is priced at `renewalPrice` when the plan locks one (§20.2), so a
 * price change on new sales never inflates the projection for existing
 * merchants.
 */
export function valueSchedule(
  plan: Doc<"productPlans">,
  windowMonths: number,
): ValueSchedule {
  if (plan.commissionType === "ONE_TIME" || plan.durationMonths <= 0) {
    return [{ monthOffset: 0, amount: pctOf(plan.price, plan.oneTimePercent) }];
  }
  const schedule: ValueSchedule = [];
  for (let offset = 0; offset < windowMonths; offset += plan.durationMonths) {
    const price = offset === 0 ? plan.price : (plan.renewalPrice ?? plan.price);
    const amount = pctOf(price, yPercent(plan, bucketAt(offset, windowMonths)));
    if (amount > 0) schedule.push({ monthOffset: offset, amount });
  }
  return schedule;
}

/** What one new customer on this plan is worth in total. */
export function planLifetimeValue(plan: Doc<"productPlans">, windowMonths: number): number {
  return valueSchedule(plan, windowMonths).reduce((sum, s) => sum + s.amount, 0);
}

/**
 * What is still to come from a merchant already on the books: the payments in
 * the schedule that have not happened yet. `monthsElapsed` is whole months
 * since their first payment.
 */
export function remainingValue(
  plan: Doc<"productPlans">,
  windowMonths: number,
  monthsElapsed: number,
): number {
  return valueSchedule(plan, windowMonths)
    .filter((s) => s.monthOffset > monthsElapsed)
    .reduce((sum, s) => sum + s.amount, 0);
}

/**
 * The future payments of one merchant, as absolute month offsets from now.
 * Used to place projected income on a calendar, not just total it.
 */
export function upcomingPayments(
  plan: Doc<"productPlans">,
  windowMonths: number,
  monthsElapsed: number,
): { monthsFromNow: number; amount: number }[] {
  return valueSchedule(plan, windowMonths)
    .filter((s) => s.monthOffset > monthsElapsed)
    .map((s) => ({ monthsFromNow: s.monthOffset - monthsElapsed, amount: s.amount }));
}
