import { describe, expect, test } from "vitest";
import { calculateCRC16, convertQRIS, parseTLV, summarizeQRIS, validateQRIS } from "./lib/qris";

// A structurally valid static QRIS, CRC included.
const STATIC =
  "00020101021126400014ID.CO.QRIS.WWW01189360000910000000015204581253033605802ID5908AYO TEST6007JAKARTA63045904";

const tagValue = (payload: string, tag: string) =>
  parseTLV(payload).find((el) => el.tag === tag)?.value;

describe("QRIS static → dynamic", () => {
  test("the reference payload validates", () => {
    expect(validateQRIS(STATIC)).toEqual({ valid: true });
    expect(summarizeQRIS(STATIC)).toMatchObject({
      merchantName: "AYO TEST",
      merchantCity: "JAKARTA",
      method: "static",
      amount: null,
    });
  });

  test("conversion injects the amount, flips to dynamic and re-checksums", () => {
    const dynamic = convertQRIS(STATIC, 150_347);
    expect(tagValue(dynamic, "01")).toBe("12");
    expect(tagValue(dynamic, "54")).toBe("150347");
    expect(validateQRIS(dynamic)).toEqual({ valid: true });
    expect(summarizeQRIS(dynamic).method).toBe("dynamic");
  });

  test("the amount sits before the country code, where issuers put it", () => {
    const tags = parseTLV(convertQRIS(STATIC, 50_000)).map((el) => el.tag);
    expect(tags.indexOf("54")).toBeLessThan(tags.indexOf("58"));
  });

  test("re-converting replaces the amount instead of duplicating the tag", () => {
    const twice = convertQRIS(convertQRIS(STATIC, 50_000), 75_000);
    expect(parseTLV(twice).filter((el) => el.tag === "54")).toHaveLength(1);
    expect(tagValue(twice, "54")).toBe("75000");
    expect(validateQRIS(twice)).toEqual({ valid: true });
  });

  test("merchant identity survives conversion", () => {
    const dynamic = convertQRIS(STATIC, 25_000);
    expect(tagValue(dynamic, "26")).toBe(tagValue(STATIC, "26"));
    expect(tagValue(dynamic, "59")).toBe("AYO TEST");
  });

  test("a tampered payload fails the checksum", () => {
    const tampered = STATIC.replace("AYO TEST", "AYO TEXT");
    expect(validateQRIS(tampered).valid).toBe(false);
  });

  test("missing required tags are rejected", () => {
    const body = "000201010211520458125303360" + "6304";
    expect(validateQRIS(body + calculateCRC16(body)).valid).toBe(false);
  });

  test("a non-positive amount is refused", () => {
    expect(() => convertQRIS(STATIC, 0)).toThrow();
    expect(() => convertQRIS(STATIC, 1.5)).toThrow();
  });
});
