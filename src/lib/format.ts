// Display helpers. IDR amounts arrive from Convex as decimal strings (BigInt
// serialized) — parse via BigInt to stay exact, format with id-ID grouping.

export function formatIDR(value: string | number | bigint): string {
  let n: number;
  if (typeof value === "string") n = Number(value);
  else if (typeof value === "bigint") n = Number(value);
  else n = value;
  if (!Number.isFinite(n)) n = 0;
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatDate(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Days from now until `ms` (positive = future). Returns null if no value. */
export function daysUntil(ms?: number): number | null {
  if (!ms) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

export function relativeDays(ms?: number): string {
  if (!ms) return "—";
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}

export const LEVEL_LABEL: Record<number, string> = {
  1: "L1 · Agen",
  2: "L2 · Koordinator",
  3: "L3 · Regional",
};

export const AGENT_STATUS: Record<
  string,
  { label: string; tone: "green" | "amber" | "red" | "slate" }
> = {
  active: { label: "Aktif", tone: "green" },
  probation: { label: "Probation", tone: "amber" },
  dormant: { label: "Dorman", tone: "amber" },
  inactive: { label: "Nonaktif", tone: "red" },
  suspended: { label: "Disuspend", tone: "red" },
};

export const CODE_STATUS: Record<
  string,
  { label: string; tone: "green" | "amber" | "red" | "slate" }
> = {
  unused: { label: "Belum dipakai", tone: "slate" },
  active: { label: "Aktif", tone: "green" },
  expired: { label: "Kedaluwarsa", tone: "amber" },
  revoked: { label: "Dicabut", tone: "red" },
};

export const MERCHANT_DISPLAY: Record<
  string,
  { label: string; tone: "green" | "amber" | "red" | "slate" }
> = {
  active: { label: "Aktif", tone: "green" },
  expiring: { label: "Segera berakhir", tone: "amber" },
  lapsed: { label: "Berakhir", tone: "red" },
};

export const TIER_LABEL: Record<string, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  annual: "Tahunan",
  lifetime: "Seumur Hidup",
};

export const COMMISSION_TYPE_LABEL: Record<string, string> = {
  l1_residual: "Residual L1",
  l1_closing: "Closing L1",
  l2_override: "Override L2",
  l3_override: "Override L3",
  area_bonus: "Bonus Area",
  growth_bonus: "Bonus Growth",
  promo_bonus: "Bonus Promo",
  finder_fee: "Finder Fee",
  escrow_release: "Pelepasan Escrow",
};
