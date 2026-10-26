import {
  Area,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { periodLabel } from "@/lib/format";

// Two readings of the same month: how many units went out (stacked bars, left
// axis, one shade per package) and what they paid (stacked area, right axis, one
// colour per earning type). Verified money only, so a bar and an area always
// describe the same sales.

export type MixBucket = {
  key: string;
  units: Record<string, number>;
  commission: Record<string, number>;
};

const PLAN_ORDER = ["MONTHLY", "YEARLY", "LIFETIME_SINGLE", "LIFETIME_DUO"] as const;
const PLAN_OPACITY = [1, 0.62, 0.4, 0.22];
const PLAN_FALLBACK: Record<string, string> = {
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
  LIFETIME_SINGLE: "Lifetime",
  LIFETIME_DUO: "Lifetime Duo",
};

const TYPE_ORDER = ["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"] as const;
const TYPE_COLOR: Record<string, string> = {
  NEW_SALES: "#F2B705",
  RECURRING: "#17795E",
  RENEWAL_INCENTIVE: "#B4460F",
};
const TYPE_LABEL: Record<string, string> = {
  NEW_SALES: "Penjualan baru",
  RECURRING: "Komisi berulang",
  RENEWAL_INCENTIVE: "Insentif perpanjangan",
};

const INK = "#10312B";
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function shortLabel(key: string, range: "30d" | "12m"): string {
  if (range === "30d") {
    const [, month, day] = key.split("-");
    return `${Number(day)}/${Number(month)}`;
  }
  return MONTHS_SHORT[Number(key.split("-")[1]) - 1];
}

function longLabel(key: string, range: "30d" | "12m"): string {
  if (range === "30d") {
    const [year, month, day] = key.split("-");
    return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1]} ${year}`;
  }
  return periodLabel(key);
}

function compact(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 1000) return String(value);
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function SalesMixChart({
  buckets,
  plans,
  range,
  onRangeChange,
  unitTotal,
  commissionTotal,
  format,
}: {
  buckets: MixBucket[];
  plans: { key: string; name: string }[];
  range: "30d" | "12m";
  onRangeChange: (range: "30d" | "12m") => void;
  unitTotal: number;
  commissionTotal: number;
  format: (value: number) => string;
}) {
  const names = new Map(plans.map((plan) => [plan.key, plan.name]));
  const rows = buckets.map((bucket) => {
    const row: Record<string, number | string> = { key: bucket.key };
    for (const key of PLAN_ORDER) row[key] = bucket.units[key] ?? 0;
    for (const key of TYPE_ORDER) row[key] = bucket.commission[key] ?? 0;
    return row;
  });
  const empty = unitTotal === 0 && commissionTotal === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="eyebrow">Penjualan</div>
          <p className="mt-1 text-[15px] font-semibold">
            <span className="num">{unitTotal}</span> unit ·{" "}
            <span className="num">{format(commissionTotal)}</span> komisi
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded bg-black/[0.04] p-0.5">
          {(["30d", "12m"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRangeChange(option)}
              className={cn(
                "rounded px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                range === option
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {option === "30d" ? "30 hari" : "12 bulan"}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="flex h-[190px] items-center justify-center px-4 text-center text-[13px] text-ink-mute">
          Grafik muncul setelah penjualan pertama terverifikasi.
        </div>
      ) : (
        <div className={cn("px-2 pt-3", range === "30d" && "overflow-x-auto")}>
          <div
            className="h-[190px]"
            style={range === "30d" ? { minWidth: "45rem" } : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <XAxis
                  dataKey="key"
                  tickLine={false}
                  axisLine={false}
                  interval={range === "30d" ? 3 : 0}
                  tick={{ fontSize: 10, fill: "#9AAAA5" }}
                  tickFormatter={(key: string) => shortLabel(key, range)}
                />
                <YAxis
                  yAxisId="units"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={26}
                  tick={{ fontSize: 10, fill: "#9AAAA5" }}
                />
                <YAxis
                  yAxisId="money"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 10, fill: "#9AAAA5" }}
                  tickFormatter={compact}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16,49,43,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as Record<string, number | string>;
                    const key = String(row.key);
                    return (
                      <div className="rounded border border-line bg-surface px-3 py-2 shadow-lift">
                        <div className="text-[12px] font-semibold">{longLabel(key, range)}</div>
                        <div className="mt-1 space-y-0.5">
                          {PLAN_ORDER.map((plan, index) => {
                            const value = Number(row[plan] ?? 0);
                            if (!value) return null;
                            return (
                              <div key={plan} className="flex items-center gap-2 text-[12px]">
                                <span
                                  className="h-2 w-2 rounded-sm"
                                  style={{ backgroundColor: INK, opacity: PLAN_OPACITY[index] }}
                                />
                                <span className="text-ink-mute">{names.get(plan) ?? PLAN_FALLBACK[plan]}</span>
                                <span className="num ml-auto font-semibold">{value}</span>
                              </div>
                            );
                          })}
                          {TYPE_ORDER.map((type) => {
                            const value = Number(row[type] ?? 0);
                            if (!value) return null;
                            return (
                              <div key={type} className="flex items-center gap-2 text-[12px]">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: TYPE_COLOR[type] }}
                                />
                                <span className="text-ink-mute">{TYPE_LABEL[type]}</span>
                                <span className="num ml-auto font-semibold">{format(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                {PLAN_ORDER.map((plan, index) => (
                  <Bar
                    key={plan}
                    yAxisId="units"
                    dataKey={plan}
                    stackId="units"
                    fill={INK}
                    fillOpacity={PLAN_OPACITY[index]}
                    maxBarSize={22}
                    isAnimationActive={false}
                  />
                ))}
                {TYPE_ORDER.map((type) => (
                  <Area
                    key={type}
                    yAxisId="money"
                    dataKey={type}
                    stackId="money"
                    type="monotone"
                    stroke={TYPE_COLOR[type]}
                    fill={TYPE_COLOR[type]}
                    fillOpacity={0.18}
                    strokeWidth={1.4}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-4 py-3">
        {PLAN_ORDER.map((plan, index) => (
          <span key={plan} className="flex items-center gap-1.5 text-[11px] text-ink-mute">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: INK, opacity: PLAN_OPACITY[index] }}
            />
            {names.get(plan) ?? PLAN_FALLBACK[plan]}
          </span>
        ))}
        {TYPE_ORDER.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-ink-mute">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
            {TYPE_LABEL[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
