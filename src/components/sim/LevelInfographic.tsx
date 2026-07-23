/**
 * Single-screen recruitment infographic for one level (L1/L2/L3/Admin) — v3.
 *
 * What's new vs v2:
 *   - Reads prices/rates/decay from the shared SimConfig (editable on
 *     /simulator/settings), so admin price edits flow here live.
 *   - Driver slider sets the STEADY-STATE target; actual sales follow the
 *     3-phase growth ramp (slow start → exponential Y1 → stable after).
 *   - Product mix edited with the MixEditor stack-bar (always sums to 100%).
 *   - Per-level agent-churn sliders shrink downline counts over time.
 *   - Income chart is SPLIT into new-acquisition vs recurring (stacked area).
 *
 * One screen, minimal scroll: min-h-[100dvh] flex column; chart flexes.
 */
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  ChevronRight,
  Save,
  Share2,
  SlidersHorizontal,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatIDR } from "@/lib/format";
import {
  CHURN_MIN,
  CHURN_MAX,
  AGENT_CHURN_MIN,
  AGENT_CHURN_MAX,
  defaultL1Plan,
  defaultL2Plan,
  defaultL3Plan,
  defaultAdminPlan,
} from "@/lib/targetSim/defaults";
import { useSimConfig } from "@/lib/targetSim/config";
import {
  projectL1,
  projectL2,
  projectL3,
  projectAdmin,
  solveL1,
  solveL2,
  solveL3,
} from "@/lib/targetSim/engine";
import type {
  L1Plan,
  L2Plan,
  L3Plan,
  AdminPlan,
  Mix,
  GrowthRamp,
  TargetResult,
} from "@/lib/targetSim/types";
import { MixEditor } from "./MixEditor";

export type Level = "l1" | "l2" | "l3" | "admin";

type Theme = {
  label: string;
  hook: string;
  gradient: string;
  newColor: string; // new-acquisition series
  recurColor: string; // recurring series
};

const THEMES: Record<Level, Theme> = {
  l1: {
    label: "L1 · Agen",
    hook: "Jualan langsung. Komisi residual mengalir tiap bulan.",
    gradient: "from-emerald-500 to-teal-600",
    newColor: "#0ea5e9", // sky — "baru"
    recurColor: "#10b981", // emerald — "recurring"
  },
  l2: {
    label: "L2 · Koordinator",
    hook: "Bangun tim agen. Override dari setiap penjualan mereka.",
    gradient: "from-amber-500 to-orange-600",
    newColor: "#0ea5e9",
    recurColor: "#f59e0b",
  },
  l3: {
    label: "L3 · Regional",
    hook: "Pimpin koordinator. Penghasilan dari seluruh wilayahmu.",
    gradient: "from-violet-500 to-purple-600",
    newColor: "#0ea5e9",
    recurColor: "#8b5cf6",
  },
  admin: {
    label: "Admin · Platform",
    hook: "Lihat pendapatan bersih seluruh jaringan.",
    gradient: "from-blue-500 to-indigo-600",
    newColor: "#0ea5e9",
    recurColor: "#3b82f6",
  },
};

const toMillions = (b: bigint) => Number(b) / 1_000_000;

/** Format a BigInt IDR amount in THOUSANDS (no currency symbol) — e.g.
 *  1_500_000 → "1.500". Easier to scan a dense table without the "Rp " prefix
 *  and trailing zeros. Grouping uses id-ID (dot separator). */
const toThousands = (b: bigint | number): string => {
  const n = typeof b === "bigint" ? Number(b) : b;
  if (!Number.isFinite(n)) return "0";
  return Math.round(n / 1000).toLocaleString("id-ID");
};

export function LevelInfographic({
  level,
  onBack,
}: {
  level: Level;
  onBack: () => void;
}) {
  const theme = THEMES[level];
  const { config } = useSimConfig();
  // Engine-config slice (prices/rates/decay) shared by all projections.
  const engineCfg = useMemo(
    () => ({ prices: config.prices, l1Rates: config.l1Rates }),
    [config],
  );

  // Per-level plan state, seeded from the (possibly customized) config defaults.
  const [plan1, setPlan1] = useState<L1Plan>(() => defaultL1Plan(config));
  const [plan2, setPlan2] = useState<L2Plan>(() => defaultL2Plan(config));
  const [plan3, setPlan3] = useState<L3Plan>(() => defaultL3Plan(config));
  const [planA, setPlanA] = useState<AdminPlan>(() => defaultAdminPlan(config));

  const [name, setName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<number>(0);
  const [shared, setShared] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const { result, reverseText, reversePerTier } = useMemo(() => {
    if (level === "l1") {
      const res = projectL1(plan1, engineCfg);
      const sol = solveL1(BigInt(Math.max(0, Math.round(reverseTarget))), plan1, engineCfg);
      return {
        result: res,
        reverseText: sol.feasible ? `Butuh ${sol.required} jualan/bulan (steady)` : "Atur bauran agar komisi > 0",
        reversePerTier: sol.perTier,
      };
    }
    if (level === "l2") {
      const res = projectL2(plan2, engineCfg);
      const sol = solveL2(BigInt(Math.max(0, Math.round(reverseTarget))), plan2, engineCfg);
      return {
        result: res,
        reverseText: sol.feasible ? `Butuh ${sol.required} agen L1 di downline` : "Atur bauran & rate agar override > 0",
        reversePerTier: undefined,
      };
    }
    if (level === "l3") {
      const res = projectL3(plan3, engineCfg);
      const sol = solveL3(BigInt(Math.max(0, Math.round(reverseTarget))), plan3, engineCfg);
      return {
        result: res,
        reverseText: sol.feasible ? `Butuh ${sol.required} koordinator L2` : "Atur bauran & rate agar override > 0",
        reversePerTier: undefined,
      };
    }
    const res = projectAdmin(planA, engineCfg);
    return { result: res, reverseText: "Geser jumlah agen di atas", reversePerTier: undefined };
  }, [level, plan1, plan2, plan3, planA, reverseTarget, engineCfg]);

  const chart = result.months.map((m) => ({
    month: m.month,
    baru: toMillions(m.newIncome),
    recurring: toMillions(m.recurringIncome),
    pelanggan: m.newCustomers,
  }));

  // Active plan's mix + churn (for the controls), level-routed.
  const activeMix: Mix =
    level === "l1" ? plan1.mix : level === "l2" ? plan2.mix : level === "l3" ? plan3.mix : planA.mix;
  const activeChurn =
    level === "l1" ? plan1.churnPct : level === "l2" ? plan2.churnPct : level === "l3" ? plan3.churnPct : planA.churnPct;
  const activeGrowth: GrowthRamp =
    level === "l1" ? plan1.growth : level === "l2" ? plan2.growth : level === "l3" ? plan3.growth : planA.growth;

  const setMix = (m: Mix) => {
    if (level === "l1") setPlan1((p) => ({ ...p, mix: m }));
    if (level === "l2") setPlan2((p) => ({ ...p, mix: m }));
    if (level === "l3") setPlan3((p) => ({ ...p, mix: m }));
    if (level === "admin") setPlanA((p) => ({ ...p, mix: m }));
  };
  const setChurn = (v: number) => {
    if (level === "l1") setPlan1((p) => ({ ...p, churnPct: v }));
    if (level === "l2") setPlan2((p) => ({ ...p, churnPct: v }));
    if (level === "l3") setPlan3((p) => ({ ...p, churnPct: v }));
    if (level === "admin") setPlanA((p) => ({ ...p, churnPct: v }));
  };
  const setGrowth = (g: GrowthRamp) => {
    if (level === "l1") setPlan1((p) => ({ ...p, growth: g }));
    if (level === "l2") setPlan2((p) => ({ ...p, growth: g }));
    if (level === "l3") setPlan3((p) => ({ ...p, growth: g }));
    if (level === "admin") setPlanA((p) => ({ ...p, growth: g }));
  };

  // Primary driver (steady-state target) per level.
  const driver = useMemo(() => {
    if (level === "l1")
      return {
        label: "Target jualan stabil / bulan",
        value: plan1.salesTarget,
        min: 0,
        max: 100,
        suffix: "unit",
        set: (v: number) => setPlan1((p) => ({ ...p, salesTarget: v })),
      };
    if (level === "l2")
      return {
        label: "Downline L1 aktif",
        value: plan2.downlineL1,
        min: 0,
        max: 100,
        suffix: "agen",
        set: (v: number) => setPlan2((p) => ({ ...p, downlineL1: v })),
      };
    if (level === "l3")
      return {
        label: "Downline L2",
        value: plan3.downlineL2,
        min: 0,
        max: 50,
        suffix: "kordinator",
        set: (v: number) => setPlan3((p) => ({ ...p, downlineL2: v })),
      };
    return {
      label: "Jumlah agen L1",
      value: planA.agents,
      min: 1,
      max: 5000,
      suffix: "agen",
      set: (v: number) => setPlanA((p) => ({ ...p, agents: v })),
    };
  }, [level, plan1.salesTarget, plan2.downlineL1, plan3.downlineL2, planA.agents]);

  const onShare = async () => {
    const summary = `${theme.label} · ${name || "Tanpa nama"}\n`
      + `Pendapatan Tahun 1: ${formatIDR(result.year1)}\n`
      + `  (baru ${formatIDR(result.year1Breakdown.newIncome)} · recurring ${formatIDR(result.year1Breakdown.recurringIncome)})\n`
      + `Rata-rata/bulan: ${formatIDR(result.avgMonthly)}\n`
      + `Total 3 tahun: ${formatIDR(result.total)}\n`
      + `(Churn ${activeChurn}%/thn) — via AYO Simulator`;
    try {
      await navigator.clipboard?.writeText(summary);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  };

  const onSave = () => {
    const key = `ayo:targetSim:${level}:${Date.now()}`;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          id: key,
          name: name.trim() || "Tanpa nama",
          level,
          createdAt: Date.now(),
          year1: Number(result.year1),
          breakdown: {
            newIncome: Number(result.year1Breakdown.newIncome),
            recurring: Number(result.year1Breakdown.recurringIncome),
          },
        }),
      );
    } catch {
      /* ignore quota errors */
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted/20">
      {/* TOP BAR */}
      <header className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <span className={`rounded-full bg-gradient-to-r ${theme.gradient} px-2.5 py-0.5 text-xs font-semibold text-white`}>
          {theme.label}
        </span>
        <button
          onClick={() => setTableOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Lihat tabel detail"
        >
          <TableIcon className="h-3.5 w-3.5" /> Detail
        </button>
      </header>

      {/* HERO */}
      <section className={`mx-4 rounded-2xl bg-gradient-to-br ${theme.gradient} p-5 text-white shadow-lg`}>
        <div className="text-xs font-medium uppercase tracking-wide opacity-80">
          {level === "admin" ? "Pendapatan Bersih / Tahun" : "Potensi Penghasilan / Tahun"}
        </div>
        <div className="mt-1 text-4xl font-bold leading-tight tabular-nums sm:text-5xl">
          {formatIDR(result.year1)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium opacity-90">
          <span>Baru: {formatIDR(result.year1Breakdown.newIncome)}</span>
          <span>·</span>
          <span>Recurring: {formatIDR(result.year1Breakdown.recurringIncome)}</span>
        </div>
        <p className="mt-3 text-xs leading-relaxed opacity-85">{theme.hook}</p>
      </section>

      {/* STAT CHIPS */}
      <section className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <Chip label="Bulan ini" value={formatIDR(result.months[0]?.income ?? 0n)} />
        <Chip label="Rata-rata/bln" value={formatIDR(result.avgMonthly)} />
        <Chip label="Total 3 thn" value={formatIDR(result.total)} />
      </section>

      {/* SPLIT INCOME CHART — new (base) + recurring (on top) + customer line */}
      <section className="mx-4 mt-3 flex-1 rounded-2xl border bg-background p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Proyeksi 3 tahun
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: theme.newColor }} />Baru</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: theme.recurColor }} />Recurring</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#ec4899" }} />Pelanggan</span>
          </div>
        </div>
        <div className="h-36 w-full sm:h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 4, right: -12, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.newColor} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={theme.newColor} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="recurGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.recurColor} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={theme.recurColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(m) => (m % 12 === 0 ? `Thn ${m / 12}` : "")} />
              <YAxis yAxisId="idr" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}jt`} />
              <YAxis yAxisId="cust" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.82)",
                  backdropFilter: "blur(2px)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v, name) => {
                  if (name === "pelanggan") return [`${v} pelanggan`, "Pelanggan baru"];
                  return [formatIDR(Number(v) * 1_000_000), name === "recurring" ? "Recurring" : "Baru"];
                }}
                labelFormatter={(m) => `Bulan ${m}`}
              />
              {/* New (base), recurring stacked on top — so recurring sits above new. */}
              <Area yAxisId="idr" type="monotone" dataKey="baru" stackId="1" stroke={theme.newColor} strokeWidth={1.5} fill="url(#newGrad)" />
              <Area yAxisId="idr" type="monotone" dataKey="recurring" stackId="1" stroke={theme.recurColor} strokeWidth={1.5} fill="url(#recurGrad)" />
              {/* New-customer acquisition count, on the right axis. */}
              <Line yAxisId="cust" type="monotone" dataKey="pelanggan" stroke="#ec4899" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="mx-4 mt-3 space-y-3 rounded-2xl border bg-background p-4">
        <input
          className="h-8 w-full rounded-md border bg-transparent px-2 text-sm"
          placeholder="Nama kamu (cth: Budi)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <SliderRow
          label={driver.label}
          value={driver.value}
          min={driver.min}
          max={driver.max}
          suffix={driver.suffix}
          onChange={driver.set}
        />

        <SliderRow
          label="Churn pelanggan / tahun"
          hint={`${CHURN_MIN}–${CHURN_MAX}%`}
          value={activeChurn}
          min={CHURN_MIN}
          max={CHURN_MAX}
          suffix="%"
          onChange={setChurn}
        />

        {/* Per-level agent churn (L2/L3/Admin only — L1 has no downline). */}
        {level === "l2" && (
          <SliderRow
            label="Churn agen L1 / tahun"
            hint={`${AGENT_CHURN_MIN}–${AGENT_CHURN_MAX}%`}
            value={plan2.l1ChurnPct}
            min={AGENT_CHURN_MIN}
            max={AGENT_CHURN_MAX}
            suffix="%"
            onChange={(v) => setPlan2((p) => ({ ...p, l1ChurnPct: v }))}
          />
        )}
        {level === "l3" && (
          <>
            <SliderRow label="Churn L1 / tahun" value={plan3.l1ChurnPct} min={AGENT_CHURN_MIN} max={AGENT_CHURN_MAX} suffix="%" onChange={(v) => setPlan3((p) => ({ ...p, l1ChurnPct: v }))} />
            <SliderRow label="Churn L2 / tahun" value={plan3.l2ChurnPct} min={AGENT_CHURN_MIN} max={AGENT_CHURN_MAX} suffix="%" onChange={(v) => setPlan3((p) => ({ ...p, l2ChurnPct: v }))} />
          </>
        )}
        {level === "admin" && (
          <>
            <SliderRow label="Churn L1 / tahun" value={planA.l1ChurnPct} min={AGENT_CHURN_MIN} max={AGENT_CHURN_MAX} suffix="%" onChange={(v) => setPlanA((p) => ({ ...p, l1ChurnPct: v }))} />
            <SliderRow label="Churn L2 / tahun" value={planA.l2ChurnPct} min={AGENT_CHURN_MIN} max={AGENT_CHURN_MAX} suffix="%" onChange={(v) => setPlanA((p) => ({ ...p, l2ChurnPct: v }))} />
            <SliderRow label="Churn L3 / tahun" value={planA.l3ChurnPct} min={AGENT_CHURN_MIN} max={AGENT_CHURN_MAX} suffix="%" onChange={(v) => setPlanA((p) => ({ ...p, l3ChurnPct: v }))} />
          </>
        )}

        {/* Reverse calc */}
        <div className="flex items-center gap-2 border-t pt-3">
          <span className="whitespace-nowrap text-xs text-muted-foreground">Saya ingin</span>
          <div className="flex flex-1 items-center gap-1">
            <span className="text-xs">Rp</span>
            <Input
              type="number"
              className="h-8 flex-1 px-2 py-0 text-sm tabular-nums"
              min={0}
              step={1_000_000}
              value={reverseTarget}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) setReverseTarget(n);
              }}
              placeholder="0"
            />
            <span className="whitespace-nowrap text-xs text-muted-foreground">/thn</span>
          </div>
        </div>
        <p className="-mt-1 text-xs font-medium tabular-nums" style={{ color: theme.recurColor }}>
          → {reverseTarget > 0 ? reverseText : "ketik target di atas"}
        </p>
        {reverseTarget > 0 && reversePerTier && (
          <div className="-mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 pl-2 text-[11px] text-muted-foreground">
            <span>Bulanan: <strong className="text-foreground">{reversePerTier.monthly}/bln</strong></span>
            <span>Tahunan: <strong className="text-foreground">{reversePerTier.annual}/bln</strong></span>
            <span>LT Solo: <strong className="text-foreground">{reversePerTier.lifetime_solo}/bln</strong></span>
            <span>LT Duo: <strong className="text-foreground">{reversePerTier.lifetime_duo}/bln</strong></span>
          </div>
        )}

        {/* Mix editor (always visible — core to the pitch). */}
        <div className="border-t pt-3">
          <MixEditor mix={activeMix} onChange={setMix} />
        </div>

        {/* Advanced: growth + per-level downline/rate knobs. */}
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {showAdvanced ? "Sembunyikan fase pertumbuhan & rate" : "Fase pertumbuhan & rate lanjutan"}
          <ChevronRight className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Fase pertumbuhan jualan
            </div>
            <SliderRow label="Ramp awal (bln)" hint="fase 1" value={activeGrowth.rampMonths} min={0} max={6} suffix="bln" onChange={(v) => setGrowth({ ...activeGrowth, rampMonths: v })} />
            <SliderRow label="Pertumbuhan Y1 / bln" hint="fase 2" value={activeGrowth.growthY1MonthlyPct} min={0} max={25} suffix="%" onChange={(v) => setGrowth({ ...activeGrowth, growthY1MonthlyPct: v })} />
            <SliderRow label="Pertumbuhan Y2+ / bln" hint="fase 3" value={activeGrowth.growthY2PlusMonthlyPct} min={0} max={10} suffix="%" onChange={(v) => setGrowth({ ...activeGrowth, growthY2PlusMonthlyPct: v })} />

            {level === "l2" && (
              <>
                <div className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Downline & rate</div>
                <SliderRow label="Jualan/L1 (bln)" value={plan2.avgSalesPerL1} min={0} max={50} suffix="unit" onChange={(v) => setPlan2((p) => ({ ...p, avgSalesPerL1: v }))} />
                <SliderRow label="Override L2" value={plan2.override.ratePct} min={0} max={50} suffix="%" onChange={(v) => setPlan2((p) => ({ ...p, override: { ...p.override, ratePct: v } }))} />
              </>
            )}
            {level === "l3" && (
              <>
                <div className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Downline & rate</div>
                <SliderRow label="L1 per L2" value={plan3.avgL1PerL2} min={0} max={50} suffix="agen" onChange={(v) => setPlan3((p) => ({ ...p, avgL1PerL2: v }))} />
                <SliderRow label="Jualan/L1 (bln)" value={plan3.avgSalesPerL1} min={0} max={50} suffix="unit" onChange={(v) => setPlan3((p) => ({ ...p, avgSalesPerL1: v }))} />
                <SliderRow label="Override L3" value={plan3.override.ratePct} min={0} max={50} suffix="%" onChange={(v) => setPlan3((p) => ({ ...p, override: { ...p.override, ratePct: v } }))} />
              </>
            )}
            {level === "admin" && (
              <>
                <div className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Rate komisi</div>
                <SliderRow label="Jualan/agen (bln)" value={planA.avgSalesPerAgent} min={0} max={50} suffix="unit" onChange={(v) => setPlanA((p) => ({ ...p, avgSalesPerAgent: v }))} />
                <SliderRow label="Override L2" value={planA.l2Override.ratePct} min={0} max={50} suffix="%" onChange={(v) => setPlanA((p) => ({ ...p, l2Override: { ...p.l2Override, ratePct: v } }))} />
                <SliderRow label="Override L3" value={planA.l3Override.ratePct} min={0} max={50} suffix="%" onChange={(v) => setPlanA((p) => ({ ...p, l3Override: { ...p.l3Override, ratePct: v } }))} />
              </>
            )}
          </div>
        )}
      </section>

      {/* ACTIONS */}
      <section className="mx-4 my-3 flex gap-2">
        <Button onClick={onSave} className="flex-1">
          <Save className="h-4 w-4" /> Simpan
        </Button>
        <Button variant="outline" onClick={onShare} className="flex-1">
          <Share2 className="h-4 w-4" /> {shared ? "Tersalin!" : "Bagikan"}
        </Button>
      </section>

      {/* FULL-SCREEN TABLE — source data the infographic is calculated from. */}
      <Sheet open={tableOpen} onOpenChange={setTableOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-none"
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b p-4 text-left">
            <div>
              <SheetTitle className="text-base">Rincian perhitungan</SheetTitle>
              <SheetDescription className="text-xs">
                {theme.label} · angka di balik grafik · semua nilai ribuan IDR
              </SheetDescription>
            </div>
          </SheetHeader>
          <DataTable result={result} level={level} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * The source-data table: per-month breakdown. Columns (in order):
 *   Bln | Pelanggan | Nilai Jual | Komisi Baru | Recurring | Total Income
 *
 *  - Pelanggan: new-customer acquisition count (moved next to month — it's the
 *    driver of everything else, so it reads first).
 *  - Nilai Jual: gross END-USER sales value of this month's new acquisitions.
 *  - Komisi Baru / Recurring / Total Income: the agent's commission split.
 *
 * All money in THOUSANDS of IDR (no "Rp"). The table is auto-sized so each
 * column fits its content. Per-year totals sit INLINE in the "Tahun N" sub-header
 * row (no separate total rows), with a final Grand Total row.
 */
function DataTable({
  result,
  level,
}: {
  result: TargetResult;
  level: Level;
}) {
  const rows = result.months;
  const yearOf = (m: number) => Math.ceil(m / 12);

  // Per-year totals (sales value, new income, recurring, customers).
  const breakdowns = [result.year1Breakdown, result.year2Breakdown, result.year3Breakdown];
  const yearTotals = [0, 1, 2].map((y) => {
    const ms = rows.filter((m) => yearOf(m.month) === y + 1);
    return {
      salesValue: ms.reduce((acc, m) => acc + m.salesValue, 0n),
      newIncome: breakdowns[y].newIncome,
      recurring: breakdowns[y].recurringIncome,
      total: breakdowns[y].total,
      customers: ms.reduce((acc, m) => acc + m.newCustomers, 0),
    };
  });
  const grand = {
    salesValue: yearTotals.reduce((a, y) => a + y.salesValue, 0n),
    newIncome: yearTotals.reduce((a, y) => a + y.newIncome, 0n),
    recurring: yearTotals.reduce((a, y) => a + y.recurring, 0n),
    total: result.total,
    customers: yearTotals.reduce((a, y) => a + y.customers, 0),
  };

  return (
    <div className="flex-1 overflow-auto">
      <Table className="w-full">
        <THead className="sticky top-0 z-10 bg-background">
          <TR>
            <TH className="h-9 whitespace-nowrap px-2 text-left text-[10px]">Bln</TH>
            <TH className="h-9 whitespace-nowrap px-2 text-right text-[10px]">Pelanggan</TH>
            <TH className="h-9 whitespace-nowrap px-2 text-right text-[10px]">Nilai Jual</TH>
            <TH className="h-9 whitespace-nowrap px-2 text-right text-[10px]">Komisi Baru</TH>
            <TH className="h-9 whitespace-nowrap px-2 text-right text-[10px]">Recurring</TH>
            <TH className="h-9 whitespace-nowrap px-2 text-right text-[10px]">Total Income</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((m, i) => {
            const showYearHeader = i === 0 || yearOf(rows[i - 1].month) !== yearOf(m.month);
            const yIdx = yearOf(m.month) - 1;
            return (
              <FragmentYear key={m.month} show={showYearHeader} year={yearOf(m.month)} totals={yearTotals[yIdx]}>
                <TR className="text-[11px] hover:bg-muted/40">
                  <TD className="whitespace-nowrap px-2 py-1 tabular-nums">{m.month}</TD>
                  <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{m.newCustomers}</TD>
                  <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums text-muted-foreground">{toThousands(m.salesValue)}</TD>
                  <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(m.newIncome)}</TD>
                  <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(m.recurringIncome)}</TD>
                  <TD className="whitespace-nowrap px-2 py-1 text-right font-semibold tabular-nums">{toThousands(m.income)}</TD>
                </TR>
              </FragmentYear>
            );
          })}
          {/* Grand total row */}
          <TR className="border-t-2 text-[11px] font-bold">
            <TD className="whitespace-nowrap px-2 py-1.5" colSpan={2}>Grand Total</TD>
            <TD className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-muted-foreground">{toThousands(grand.salesValue)}</TD>
            <TD className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{toThousands(grand.newIncome)}</TD>
            <TD className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{toThousands(grand.recurring)}</TD>
            <TD className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{toThousands(grand.total)}</TD>
          </TR>
        </TBody>
      </Table>
      <p className="px-3 py-3 text-[10px] leading-relaxed text-muted-foreground">
        Semua nilai dalam <strong>ribuan IDR</strong> (1.500 = Rp 1.500.000).{" "}
        <strong>Nilai Jual</strong> = harga end-user dari akuisisi baru (sebelum
        komisi). <strong>Total Income</strong> = Komisi Baru + Recurring.{" "}
        {level === "admin"
          ? "Admin: pendapatan bersih platform setelah pool L1+L2+L3."
          : "Subjek: komisi/override agen."}{" "}
        Asumsi: rate Y1/Y2/Y3 + churn pelanggan + churn agen.
      </p>
    </div>
  );
}

/** Wraps a row, optionally rendering a "Tahun N" sub-header with inline totals
 *  above it. The totals sit in the same columns (right-aligned) so they read as
 *  a summary row, not a separate block. */
function FragmentYear({
  show,
  year,
  totals,
  children,
}: {
  show: boolean;
  year: number;
  totals: { salesValue: bigint; newIncome: bigint; recurring: bigint; total: bigint; customers: number };
  children: React.ReactNode;
}) {
  return (
    <>
      {show && (
        <TR className="sticky top-9 z-10 bg-muted/70 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <TD className="whitespace-nowrap px-2 py-1" colSpan={2}>Tahun {year}</TD>
          <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(totals.salesValue)}</TD>
          <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(totals.newIncome)}</TD>
          <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(totals.recurring)}</TD>
          <TD className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{toThousands(totals.total)}</TD>
        </TR>
      )}
      {children}
    </>
  );
}

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold tabular-nums">{value}</div>
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
