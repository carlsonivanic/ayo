import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

// One year of commission, month by month. Realised months are solid; months
// that have not happened yet are the same colour at low opacity — same money,
// not yet real. One hue only, because a second colour would imply a second
// kind of income.

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
  currentMonth,
  format,
}: {
  data: YearPoint[];
  currentMonth: number;
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
                    <div className="mt-0.5 text-[11px] text-ink-mute">
                      {row.projected > 0 ? "Proyeksi" : "Realisasi"}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell
                  key={row.month}
                  fill={INK}
                  fillOpacity={row.month > currentMonth ? 0.22 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
