// Money is integer rupiah end to end (§29 / §15.4).
//
// Percentage results are rounded half-up to the nearest 100 IDR. This is what
// reproduces every figure in the spec, including the Lifetime Single case where
// 1.500.000 x 33,33% is quoted as 500.000 (exact math gives 499.950).

export function round100(value: number): number {
  return Math.round(value / 100) * 100;
}

/** `percent` is expressed in percent units (50 = 50%). */
export function pctOf(amount: number, percent: number): number {
  return round100((amount * percent) / 100);
}

export function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}
