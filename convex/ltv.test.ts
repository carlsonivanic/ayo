import { describe, expect, test } from "vitest";
import { Doc } from "./_generated/dataModel";
import { planLifetimeValue, remainingValue, valueSchedule } from "./lib/ltv";
import { qrisNmid } from "./lib/qris";
import { DEFAULT_PLANS } from "./plans";

// The projection numbers a sales agent is shown. They must be derivable by hand
// from the plan table, because an agent who cannot reproduce the figure on the
// back of a receipt will not believe it.

const WINDOW = 36;

const plan = (key: string) =>
  ({ ...DEFAULT_PLANS.find((p) => p.key === key)! }) as Doc<"productPlans">;

describe("lifetime value of one customer", () => {
  test("monthly — 36 payments across three Y-buckets", () => {
    const monthly = plan("MONTHLY");
    // 70.000 at 50% / 40% / 30%, twelve months each.
    expect(planLifetimeValue(monthly, WINDOW)).toBe(12 * 35_000 + 12 * 28_000 + 12 * 21_000);
    expect(valueSchedule(monthly, WINDOW)).toHaveLength(36);
  });

  test("yearly — one payment per bucket", () => {
    expect(planLifetimeValue(plan("YEARLY"), WINDOW)).toBe(300_000 + 240_000 + 180_000);
  });

  test("lifetime — the one-time commission, rounded the way the spec quotes it", () => {
    expect(planLifetimeValue(plan("LIFETIME_SINGLE"), WINDOW)).toBe(500_000);
  });

  test("the ownership window decides where the schedule stops", () => {
    const monthly = plan("MONTHLY");
    expect(valueSchedule(monthly, 24)).toHaveLength(24);
    expect(planLifetimeValue(monthly, 24)).toBe(12 * 35_000 + 12 * 28_000);
  });
});

describe("what is left on an existing customer", () => {
  test("payments already made are excluded", () => {
    const monthly = plan("MONTHLY");
    // Month 13 onwards: ten more Y2 months, then twelve Y3 months.
    expect(remainingValue(monthly, WINDOW, 13)).toBe(10 * 28_000 + 12 * 21_000);
  });

  test("a customer past the ownership window is worth nothing further", () => {
    expect(remainingValue(plan("MONTHLY"), WINDOW, 40)).toBe(0);
    expect(remainingValue(plan("LIFETIME_SINGLE"), WINDOW, 1)).toBe(0);
  });
});

/** TLV writer, so a test payload is never hand-counted. */
const tlv = (tag: string, value: string) =>
  `${tag}${String(value.length).padStart(2, "0")}${value}`;

describe("NMID", () => {
  test("read from the domestic central repository template", () => {
    const payload =
      tlv("00", "01") +
      tlv("01", "11") +
      tlv("26", tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "936000091000000001")) +
      tlv("51", tlv("00", "ID.CO.QRIS.WWW") + tlv("02", "ID1020012345678") + tlv("03", "UMI")) +
      tlv("52", "5812") +
      tlv("53", "360") +
      tlv("58", "ID") +
      tlv("59", "AYO TEST") +
      tlv("60", "JAKARTA") +
      "6304ABCD";
    expect(qrisNmid(payload)).toBe("ID1020012345678");
  });

  test("falls back to the acquirer template when tag 51 is absent", () => {
    const payload =
      tlv("00", "01") +
      tlv("26", tlv("00", "ID.CO.QRIS.WWW") + tlv("02", "ID1020099999999")) +
      tlv("59", "AYO TEST") +
      "6304ABCD";
    expect(qrisNmid(payload)).toBe("ID1020099999999");
  });

  test("absent when the payload carries no merchant id", () => {
    expect(qrisNmid("00020101021153033605802ID5908AYO TEST6007JAKARTA6304ABCD")).toBeNull();
  });
});
