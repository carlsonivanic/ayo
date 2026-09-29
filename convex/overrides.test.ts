import { describe, expect, test } from "vitest";
import { l2EffectivePercent, recurringCommission } from "./lib/commission";
import {
  applyL2Override,
  applyPlanOverride,
  CommissionOverride,
  renewalIncentivePercentFor,
} from "./lib/overrides";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { DEFAULT_PLANS } from "./plans";
import { Doc, Id } from "./_generated/dataModel";

const S = DEFAULT_SETTINGS;
const plan = (key: string) =>
  ({
    ...DEFAULT_PLANS.find((p) => p.key === key)!,
    _id: key as Id<"productPlans">,
  }) as unknown as Doc<"productPlans">;

const override = (fields: Partial<CommissionOverride>) =>
  ({ active: true, plans: [], ...fields }) as CommissionOverride;

describe("commission overrides", () => {
  test("no override follows global", () => {
    const monthly = plan("MONTHLY");
    expect(applyPlanOverride(monthly, null)).toBe(monthly);
    expect(applyL2Override(S, null)).toBe(S);
    expect(renewalIncentivePercentFor(S, null)).toBe(S.renewalIncentivePercent);
  });

  test("only the fields set are replaced, only on that plan", () => {
    const monthly = plan("MONTHLY");
    const o = override({
      plans: [{ planId: monthly._id, y1Percent: 60 }],
    });
    const rated = applyPlanOverride(monthly, o);
    expect(rated.y1Percent).toBe(60);
    expect(rated.y2Percent).toBe(monthly.y2Percent);
    expect(applyPlanOverride(plan("YEARLY"), o)).toEqual(plan("YEARLY"));
    // the stored plan is not mutated
    expect(monthly.y1Percent).toBe(50);
  });

  test("recurring commission uses the owner's Y rate", () => {
    const monthly = plan("MONTHLY");
    const rated = applyPlanOverride(
      monthly,
      override({ plans: [{ planId: monthly._id, y2Percent: 45 }] }),
    );
    const first = Date.UTC(2030, 0, 1);
    const inY2 = Date.UTC(2031, 1, 1);
    expect(recurringCommission(rated, first, inY2, 70_000).amount).toBe(31_500);
  });

  test("L2 base and decay replaced, start month stays global", () => {
    const o = override({ l2: { basePercent: 12, decayM19_30: 50 } });
    const s = applyL2Override(S, o);
    expect(s.l2.startMonth).toBe(S.l2.startMonth);
    expect(l2EffectivePercent(10, s)).toBe(12);
    expect(l2EffectivePercent(20, s)).toBe(6);
    expect(l2EffectivePercent(35, s)).toBe(Math.round(12 * S.l2.decayM31_42) / 100);
    expect(S.l2.basePercent).toBe(10);
  });

  test("renewal incentive override", () => {
    expect(renewalIncentivePercentFor(S, override({ renewalIncentivePercent: 3 }))).toBe(3);
  });
});
