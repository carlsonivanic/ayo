// Calendar math. Production periods are Asia/Jakarta (§15.5) — a fixed UTC+7
// offset with no DST, so plain arithmetic on a shifted timestamp is exact.

export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Civil (Jakarta) parts of a timestamp. */
export function parts(ms: number) {
  const d = new Date(ms + JAKARTA_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1, // 1-12
    day: d.getUTCDate(),
    weekday: d.getUTCDay(), // 0 = Sunday
    hour: d.getUTCHours(),
  };
}

/** Build a UTC timestamp from Jakarta civil parts. */
export function fromParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return Date.UTC(year, month - 1, day, hour, minute) - JAKARTA_OFFSET_MS;
}

/** "YYYY-MM" of a timestamp. */
export function periodOf(ms: number): string {
  const p = parts(ms);
  return `${p.year}-${pad(p.month)}`;
}

export function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split("-");
  return { year: Number(y), month: Number(m) };
}

export function periodStart(period: string): number {
  const { year, month } = parsePeriod(period);
  return fromParts(year, month, 1);
}

/** Exclusive end of a period. */
export function periodEnd(period: string): number {
  const { year, month } = parsePeriod(period);
  return month === 12 ? fromParts(year + 1, 1, 1) : fromParts(year, month + 1, 1);
}

export function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parsePeriod(period);
  const total = year * 12 + (month - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Whole calendar months between two instants (Jakarta months). */
export function monthsBetween(from: number, to: number): number {
  const a = parts(from);
  const b = parts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/**
 * Tenure month per §10.1: the month of the first payment is Month 1.
 * Returns 0 when the user has never been paid.
 */
export function tenureMonthAt(firstPaymentAt: number | undefined, at: number): number {
  if (!firstPaymentAt) return 0;
  return monthsBetween(firstPaymentAt, at) + 1;
}

/** Add calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(ms: number, months: number): number {
  const p = parts(ms);
  const total = p.year * 12 + (p.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(p.day, daysInMonth);
  return fromParts(year, month, day, p.hour);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

/** Monday 00:00 Jakarta of the week containing `ms` (§11.2). */
export function weekStart(ms: number): number {
  const p = parts(ms);
  const daysSinceMonday = (p.weekday + 6) % 7;
  return fromParts(p.year, p.month, p.day) - daysSinceMonday * DAY_MS;
}

/** ISO-ish weekly period key, e.g. "2026-W07". */
export function weekPeriod(ms: number): string {
  const start = weekStart(ms);
  const p = parts(start);
  const jan1 = fromParts(p.year, 1, 1);
  const week = Math.floor((start - weekStart(jan1)) / (7 * DAY_MS)) + 1;
  return `${p.year}-W${pad(week)}`;
}

/** Next occurrence of `weekday` (0=Sun) at 00:00 Jakarta, strictly after `ms`. */
export function nextWeekday(ms: number, weekday: number): number {
  const p = parts(ms);
  const today = fromParts(p.year, p.month, p.day);
  const delta = (weekday - p.weekday + 7) % 7 || 7;
  return today + delta * DAY_MS;
}

export function formatDate(ms: number): string {
  const p = parts(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
