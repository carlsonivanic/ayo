/**
 * Simulator settings page — edit every business constant used by the simulator.
 *
 * All values (prices, L1 rates, override rates+KPI, decay, churn/growth
 * defaults) are persisted to localStorage via useSimConfig, so edits flow live
 * to every level infographic. No auth, no Convex — this is a recruitment tool
 * configured per-device by the recruiter/admin.
 *
 * Defaults mirror convex/seed.ts; Reset restores them.
 */
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatIDR } from "@/lib/format";
import { useSimConfig } from "@/lib/targetSim/config";
import { CHURN_MIN, CHURN_MAX, AGENT_CHURN_MIN, AGENT_CHURN_MAX } from "@/lib/targetSim/defaults";
import type { Prices, L1Rates, GrowthRamp } from "@/lib/targetSim/types";

export function SimConfigPage({ onBack }: { onBack: () => void }) {
  const { config, save, reset } = useSimConfig();

  const setPrices = (p: Partial<Prices>) =>
    save({ ...config, prices: { ...config.prices, ...p } });
  const setRates = (r: Partial<L1Rates>) =>
    save({ ...config, l1Rates: { ...config.l1Rates, ...r } });
  const setGrowth = (g: Partial<GrowthRamp>) =>
    save({ ...config, growthDefault: { ...config.growthDefault, ...g } });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-muted/20 px-4 py-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Reset default
        </Button>
      </header>

      <h1 className="mb-1 text-xl font-bold tracking-tight">Pengaturan Simulator</h1>
      <p className="mb-5 text-xs text-muted-foreground">
        Semua harga, rate komisi (Y1/Y2/Y3), dan asumsi churn/pertumbuhan.
        Perubahan langsung berlaku di seluruh tampilan simulator.
      </p>

      {/* Prices */}
      <Group title="Harga Produk (IDR)">
        <MoneyInput label="Bulanan" value={config.prices.monthly} onChange={(v) => setPrices({ monthly: v })} max={500_000} step={1000} />
        <MoneyInput label="Tahunan" value={config.prices.annual} onChange={(v) => setPrices({ annual: v })} max={2_000_000} step={1000} />
        <MoneyInput label="Lifetime Solo" value={config.prices.lifetime_solo} onChange={(v) => setPrices({ lifetime_solo: v })} max={5_000_000} step={10_000} />
        <MoneyInput label="Lifetime Duo" value={config.prices.lifetime_duo} onChange={(v) => setPrices({ lifetime_duo: v })} max={5_000_000} step={10_000} />
      </Group>

      {/* L1 residual rates — monthly recurs 3 years, annual expires after Y2.
          Each % slider shows the resulting IDR commission per active subscriber. */}
      <Group title="Komisi Residual L1 — Bulanan">
        <p className="-mt-1 mb-1 text-[10px] text-muted-foreground">
          Langganan bulanan berulang sampai 3 tahun. % dari harga bulanan
          ({formatIDR(config.prices.monthly)}).
        </p>
        <PctSliderWithIdr label="Tahun 1" value={config.l1Rates.monthlyPctY1} base={config.prices.monthly} onChange={(v) => setRates({ monthlyPctY1: v })} />
        <PctSliderWithIdr label="Tahun 2" value={config.l1Rates.monthlyPctY2} base={config.prices.monthly} onChange={(v) => setRates({ monthlyPctY2: v })} />
        <PctSliderWithIdr label="Tahun 3" value={config.l1Rates.monthlyPctY3} base={config.prices.monthly} onChange={(v) => setRates({ monthlyPctY3: v })} />
      </Group>

      <Group title="Komisi Residual L1 — Tahunan">
        <p className="-mt-1 mb-1 text-[10px] text-muted-foreground">
          Langganan tahunan berakhir setelah tahun ke-2. Komisi tahunan dibagi 12
          per bulan. Harga tahunan {formatIDR(config.prices.annual)}.
        </p>
        <PctSliderWithIdr label="Tahun 1 (/bln)" value={config.l1Rates.annualPctY1} base={Math.round(config.prices.annual / 12)} onChange={(v) => setRates({ annualPctY1: v })} />
        <PctSliderWithIdr label="Tahun 2 (/bln)" value={config.l1Rates.annualPctY2} base={Math.round(config.prices.annual / 12)} onChange={(v) => setRates({ annualPctY2: v })} />
      </Group>

      <Group title="Komisi Closing L1 — Lifetime">
        <p className="-mt-1 mb-1 text-[10px] text-muted-foreground">
          Komisi sekali bayar saat penjualan lifetime (tidak ada residual).
        </p>
        <MoneyInput label="Closing Lifetime Solo" value={config.l1Rates.lifetimeSoloCommission} onChange={(v) => setRates({ lifetimeSoloCommission: v })} max={2_000_000} step={10_000} />
        <MoneyInput label="Closing Lifetime Duo" value={config.l1Rates.lifetimeDuoCommission} onChange={(v) => setRates({ lifetimeDuoCommission: v })} max={2_000_000} step={10_000} />
      </Group>

      {/* Churn + growth defaults */}
      <Group title="Default Churn">
        <SliderRow
          label="Churn pelanggan default"
          hint={`${CHURN_MIN}–${CHURN_MAX}%`}
          value={config.churnDefault}
          min={CHURN_MIN}
          max={CHURN_MAX}
          suffix="%"
          onChange={(v) => save({ ...config, churnDefault: v })}
        />
        <SliderRow
          label="Churn agen default"
          hint={`${AGENT_CHURN_MIN}–${AGENT_CHURN_MAX}%`}
          value={config.agentChurnDefault}
          min={AGENT_CHURN_MIN}
          max={AGENT_CHURN_MAX}
          suffix="%"
          onChange={(v) => save({ ...config, agentChurnDefault: v })}
        />
      </Group>

      <Group title="Default Fase Pertumbuhan">
        <SliderRow label="Ramp awal (bln)" value={config.growthDefault.rampMonths} min={0} max={6} suffix="bln" onChange={(v) => setGrowth({ rampMonths: v })} />
        <SliderRow label="Pertumbuhan Y1 / bln" value={config.growthDefault.growthY1MonthlyPct} min={0} max={25} suffix="%" onChange={(v) => setGrowth({ growthY1MonthlyPct: v })} />
        <SliderRow label="Pertumbuhan Y2+ / bln" value={config.growthDefault.growthY2PlusMonthlyPct} min={0} max={10} suffix="%" onChange={(v) => setGrowth({ growthY2PlusMonthlyPct: v })} />
      </Group>

      <p className="mt-6 px-1 pb-4 text-center text-[11px] text-muted-foreground">
        Disimpan otomatis di perangkat ini. Reset mengembalikan nilai bawaan
        (mengikuti Parameter sistem AYO).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  step: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Input
          type="number"
          className="h-7 w-28 px-2 py-0 text-xs tabular-nums"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(n);
          }}
        />
      </div>
      <Slider value={[Math.min(max, Math.max(0, value))]} min={0} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      <p className="text-[10px] tabular-nums text-muted-foreground">{formatIDR(value)}</p>
    </div>
  );
}

/** A percentage slider that also shows the resulting IDR commission per active
 *  subscriber — e.g. monthly Y1 at 40% of Rp 69.000 → "Rp 27.600/bln". */
function PctSliderWithIdr({
  label,
  value,
  base,
  onChange,
}: {
  label: string;
  value: number;
  base: number;
  onChange: (n: number) => void;
}) {
  const idr = Math.round((base * value) / 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-semibold tabular-nums">{value}%</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            → {formatIDR(idr)}
          </span>
        </div>
      </div>
      <Slider value={[Math.min(100, Math.max(0, value))]} min={0} max={100} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  const clamped = Math.min(max, Math.max(min, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {label}
          {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
        </Label>
        <span className="text-xs font-semibold tabular-nums">
          {value} {suffix}
        </span>
      </div>
      <Slider value={[clamped]} min={min} max={max} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
