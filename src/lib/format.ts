// §29 money display: value only, no symbol, no currency code, locale separator.
// Rounded is the default; Decimal is an admin setting.

export type MoneyMode = "ROUNDED" | "DECIMAL";

export function money(value: number | null | undefined, mode: MoneyMode = "ROUNDED"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: mode === "DECIMAL" ? 2 : 0,
    maximumFractionDigits: mode === "DECIMAL" ? 2 : 0,
  }).format(mode === "DECIMAL" ? value : Math.round(value));
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function date(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateShort(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dateShort(ms)} ${hh}:${mm}`;
}

/** "3 hari lagi" / "berakhir hari ini" / "lewat 2 hari" */
export function countdown(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return "—";
  const days = Math.round((ms - now) / 86400000);
  if (days === 0) return "hari ini";
  if (days > 0) return `${days} hari lagi`;
  return `lewat ${Math.abs(days)} hari`;
}

export function periodLabel(period: string): string {
  if (period.includes("W")) return period.replace("-W", " minggu ");
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function currentPeriod(now = Date.now()): string {
  const d = new Date(now + 7 * 3600000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function percent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
