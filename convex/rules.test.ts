import { describe, expect, test } from "vitest";
import {
  jaminanFor,
  l2EffectivePercent,
  l2StageFor,
  recurringCommission,
  renewalIncentive,
  warmthFor,
  yearBucket,
} from "./lib/commission";
import { pctOf } from "./lib/money";
import { addMonths, monthsBetween, periodOf, tenureMonthAt, weekStart } from "./lib/period";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { DEFAULT_PLANS } from "./plans";
import { normalizeMobile } from "./lib/mobile";
import { Doc } from "./_generated/dataModel";

const S = DEFAULT_SETTINGS;
const plan = (key: string) =>
  ({ ...DEFAULT_PLANS.find((p) => p.key === key)! }) as unknown as Doc<"productPlans">;

const jakarta = (y: number, m: number, d: number) =>
  Date.UTC(y, m - 1, d, 5, 0) - 0; // midday Jakarta, exact hour is irrelevant here

// §2.1 — the commission table in the spec, reproduced exactly.
describe("commission table (§2.1)", () => {
  test.each([
    ["Monthly Y1", 70_000, 50, 35_000],
    ["Monthly Y2", 70_000, 40, 28_000],
    ["Monthly Y3", 70_000, 30, 21_000],
    ["Yearly Y1", 600_000, 50, 300_000],
    ["Yearly Y2", 600_000, 40, 240_000],
    ["Yearly Y3", 600_000, 30, 180_000],
    ["Lifetime single", 1_500_000, 33.33, 500_000],
    ["Lifetime duo", 2_000_000, 35, 700_000],
    ["Monthly renewal incentive", 70_000, 2, 1_400],
    ["Yearly renewal incentive", 600_000, 2, 12_000],
  ])("%s", (_label, price, percent, expected) => {
    expect(pctOf(price, percent)).toBe(expected);
  });
});

// §14.7 — the worked example for merchant MA, first payment 8 Aug 2026.
describe("ownership window (§14.2 / §14.7)", () => {
  const first = jakarta(2026, 8, 8);

  test.each([
    ["first payment", jakarta(2026, 8, 8), "Y1"],
    ["self renew Sep 2026", jakarta(2026, 9, 7), "Y1"],
    ["month 13", jakarta(2027, 9, 7), "Y2"],
    ["Feb 2028", jakarta(2028, 2, 1), "Y2"],
    ["Feb 2029", jakarta(2029, 2, 1), "Y3"],
    ["after window", jakarta(2030, 2, 1), "Y4+"],
  ])("%s", (_label, at, expected) => {
    expect(yearBucket(first, at, 36)).toBe(expected);
  });

  test("owner earns nothing after the window", () => {
    const result = recurringCommission(plan("MONTHLY"), first, jakarta(2030, 2, 1), 70_000, 36);
    expect(result.amount).toBe(0);
  });

  test("renewal incentive is 2% regardless of year", () => {
    expect(renewalIncentive(600_000, S.renewalIncentivePercent)).toBe(12_000);
  });
});

// §7.3 — guarantee examples.
describe("jaminan (§7.3)", () => {
  test.each([
    [2_200_000, 8, 800_000],
    [2_200_000, 7, 0],
    [3_100_000, 9, 0],
    [2_900_000, 10, 100_000],
  ])("gross %i with %i activations", (gross, activations, expected) => {
    expect(jaminanFor(2, activations, gross, S)).toBe(expected);
  });

  test("does not apply after the guarantee months", () => {
    expect(jaminanFor(4, 10, 0, S)).toBe(0);
  });
});

// §8 warmth and §9 held.
describe("warmth (§8)", () => {
  test("inactive during the first three months", () => {
    const result = warmthFor(2, 1, 0, S);
    expect(result.state).toBeUndefined();
    expect(result.heldPercent).toBe(0);
  });

  test("five activations is Warm and releases held", () => {
    const result = warmthFor(6, 5, 2, S);
    expect(result.state).toBe("WARM");
    expect(result.heldPercent).toBe(0);
    expect(result.consecutiveSub5Months).toBe(0);
    expect(result.releasesHeld).toBe(true);
  });

  test("under five is Cool at 20% held", () => {
    const result = warmthFor(6, 4, 0, S);
    expect(result.state).toBe("COOL");
    expect(result.heldPercent).toBe(20);
  });

  test("three consecutive short months is Cold at 50% held", () => {
    const result = warmthFor(8, 1, 2, S);
    expect(result.state).toBe("COLD");
    expect(result.heldPercent).toBe(50);
  });

  test("held examples from §8.3", () => {
    expect(pctOf(2_000_000, warmthFor(6, 5, 0, S).heldPercent)).toBe(0);
    expect(pctOf(2_000_000, warmthFor(6, 4, 0, S).heldPercent)).toBe(400_000);
    expect(pctOf(2_000_000, warmthFor(6, 4, 2, S).heldPercent)).toBe(1_000_000);
  });
});

// §16.5 — L2 decay examples on 4.000.000 of L1 gross.
describe("L2 fee (§16)", () => {
  test.each([
    [4, "PROBATION", 0],
    [8, "ACTIVE_FEE", 400_000],
    [20, "DECAY_1", 264_000],
    [32, "DECAY_2", 132_000],
    [43, "MATURE", 0],
  ])("month %i", (tenure, stage, expected) => {
    expect(l2StageFor(tenure, S)).toBe(stage);
    expect(pctOf(4_000_000, l2EffectivePercent(tenure, S))).toBe(expected);
  });
});

describe("calendar (§10.1 / §15.5)", () => {
  test("the first payment month is month 1", () => {
    const first = jakarta(2026, 1, 31);
    expect(tenureMonthAt(first, first)).toBe(1);
    expect(tenureMonthAt(first, jakarta(2026, 2, 1))).toBe(2);
  });

  test("cross-month example from §6.1", () => {
    // Paid 31 Jan, code used 1 Feb: earning in January, acquisition in February.
    expect(periodOf(jakarta(2026, 1, 31))).toBe("2026-01");
    expect(periodOf(jakarta(2026, 2, 1))).toBe("2026-02");
  });

  test("months between counts calendar months", () => {
    expect(monthsBetween(jakarta(2026, 1, 31), jakarta(2026, 2, 1))).toBe(1);
  });

  test("adding months clamps the day", () => {
    expect(periodOf(addMonths(jakarta(2026, 1, 31), 1))).toBe("2026-02");
  });

  test("weeks start on Monday", () => {
    // 8 Aug 2026 is a Saturday; its week starts Monday 3 Aug.
    const start = weekStart(jakarta(2026, 8, 8));
    expect(new Date(start + 7 * 3600_000).getUTCDate()).toBe(3);
  });
});

describe("mobile normalization (§6.3)", () => {
  test.each([
    ["0811 1234 5678", "+6281112345678"],
    ["0811-1234-5678", "+6281112345678"],
    ["+6281112345678", "+6281112345678"],
    ["6281112345678", "+6281112345678"],
  ])("%s", (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected);
  });

  test("empty stays empty", () => {
    expect(normalizeMobile("")).toBeUndefined();
    expect(normalizeMobile(undefined)).toBeUndefined();
  });

  test("rejects nonsense", () => {
    expect(() => normalizeMobile("abc")).toThrow();
    expect(() => normalizeMobile("0811")).toThrow();
  });
});
