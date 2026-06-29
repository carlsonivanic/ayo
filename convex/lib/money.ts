// Money helpers. All IDR amounts are BigInt (v.int64()) — never floats.

/** Parse a systemParameters string value into a BigInt IDR amount. */
export function toIDR(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.round(value));
  // strip "Rp", thousands separators and whitespace
  const cleaned = value.replace(/[^0-9-]/g, "");
  return cleaned ? BigInt(cleaned) : 0n;
}

/** percentage of an IDR amount, rounded down, staying in BigInt. */
export function pctOf(amount: bigint, pct: number): bigint {
  return (amount * BigInt(Math.round(pct * 100))) / 10000n;
}
