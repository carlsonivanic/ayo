/**
 * Seeded PRNG + helpers. Deterministic: the same seed produces the same draw
 * sequence, so a projection is reproducible (and a "re-roll" is just a new
 * seed). mulberry32 is fast, tiny, and good enough for a what-if simulator —
 * it is NOT cryptographically secure, which is fine here.
 */

/** Mulberry32 — returns a function producing a float in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** Integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max < min) [min, max] = [max, min];
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability `pct` (0..100). */
export function chance(rng: Rng, pct: number): boolean {
  return rng() * 100 < pct;
}

/**
 * Pick an index from a weighted distribution. Weights are relative (need not
 * sum to 1 or 100). Returns -1 if all weights are zero (caller's fallback).
 */
export function pickWeightedIndex(rng: Rng, weights: number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (r < w) return i;
    r -= w;
  }
  return weights.length - 1;
}

/** Linear interpolation: at t=0 returns `a`, at t=1 returns `b`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
