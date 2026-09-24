import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

// One year of commission, month by month. Confirmed money is solid; money that
// is only expected — a renewal still to come, a sale whose code has not been
// redeemed yet — is the same colour at low opacity. Same money, not yet real.
// One hue only, because a second colour would imply a second kind of income.
//
// The two halves stack, so the month in progress shows what has landed and what
// is still in flight in one bar rather than vanishing between them.

const INK = "#10312B";
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export type YearPoint = {
  month: number;
  realised: number;
  projected: number;
};

export default function YearChart({
  data,
  format,
}: {
  data: YearPoint[];
  format: (value: number) => string;
}) {
  const rows = data.map((d) => ({ ...d, total: d.realised + d.projected }));
  const empty = rows.every((r) => r.total === 0);

  return (
    <div className="h-[132px] w-full">
      {empty ? (
        <div className="flex h-full items-center justify-center text-[13px] text-ink-faint">
          Grafik muncul setelah closing pertama
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 10, fill: "#9AAAA5" }}
              tickFormatter={(m: number) => MONTHS[m - 1]}
            />
            <Tooltip
              cursor={{ fill: "rgba(16,49,43,0.05)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as YearPoint & { total: number };
                return (
                  <div className="rounded border border-line bg-surface px-3 py-2 shadow-lift">
                    <div className="text-[12px] font-semibold">{FULL[row.month - 1]}</div>
                    <div className="num mt-0.5 text-[13px] font-semibold">
                      {format(row.total)}
                    </div>
                    {row.realised > 0 && row.projected > 0 ? (
                      <div className="mt-0.5 text-[11px] text-ink-mute">
                        {format(row.realised)} masuk · {format(row.projected)} menyusul
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[11px] text-ink-mute">
                        {row.projected > 0 ? "Proyeksi" : "Realisasi"}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="realised"
              stackId="year"
              fill={INK}
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Bar
              dataKey="projected"
              stackId="year"
              fill={INK}
              fillOpacity={0.22}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
