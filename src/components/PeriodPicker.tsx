import { currentPeriod, periodLabel, shiftPeriod } from "@/lib/format";

export function PeriodPicker({
  value,
  onChange,
  months = 12,
}: {
  value: string;
  onChange: (period: string) => void;
  months?: number;
}) {
  const base = currentPeriod();
  const options = Array.from({ length: months }, (_, i) => shiftPeriod(base, -i));
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-line bg-surface px-2 py-1.5 text-[13px] font-medium"
      aria-label="Periode"
    >
      {options.map((period) => (
        <option key={period} value={period}>
          {periodLabel(period)}
        </option>
      ))}
    </select>
  );
}
