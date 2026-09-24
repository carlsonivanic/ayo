import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading, Pill } from "@/components/ui/Feedback";
import { Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

// Recharts measures the DOM, so the chart is client-only.
const YearChart = dynamic(() => import("@/components/YearChart"), {
  ssr: false,
  loading: () => <div className="h-[132px]" />,
});

export default function L1Home() {
  return (
    <Guard role="L1">
      <AppShell title="Beranda">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.dashboard.l1, { now });
  const outlook = useQuery(api.projection.l1, { now });
  const fmt = useMoney();

  if (!data) return <Loading rows={4} />;

  const warmthTone =
    data.warmth.state === "WARM" ? "good" : data.warmth.state === "COLD" ? "warn" : "accent";

  return (
    <div className="space-y-5">
      {/* One closing changes the whole year — so the year is what you see first. */}
      <Card className="overflow-hidden">
        <div className="px-4 pb-2 pt-4">
          <p className="eyebrow">Proyeksi {outlook?.year ?? new Date(now).getFullYear()}</p>
          <p className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em]">
            {fmt(outlook?.yearTotal ?? 0)}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-mute">
            {fmt(outlook?.realisedTotal ?? 0)} masuk · {fmt(outlook?.projectedTotal ?? 0)} menyusul
          </p>
        </div>
        {outlook && (
          <div className="px-2 pb-2">
            <YearChart data={outlook.months} format={fmt} />
          </div>
        )}
        <Row
          label="Nilai pelanggan aktif"
          sub={`${outlook?.activeCustomers ?? 0} pelanggan · sisa komisi sampai ${Math.round((outlook?.windowMonths ?? 36) / 12)} tahun`}
          value={fmt(outlook?.portfolioValue ?? 0)}
          tone="good"
        />
      </Card>

      {/* Target still governs warmth and the guarantee — it just is not the story. */}
      <Card className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Target bulan ke-{data.tenureMonth}</p>
          <div className="flex items-center gap-2">
            {data.warmth.active && data.warmth.state && (
              <Pill tone={warmthTone}>{data.warmth.state}</Pill>
            )}
            <span className="num text-[13px] font-semibold">
              {data.activations}
              <span className="text-ink-faint">/{data.target}</span>
            </span>
          </div>
        </div>
        <div className="mt-2.5">
          <Ticks
            value={data.activations}
            target={data.target}
            threshold={data.warmth.active ? data.warmth.threshold : undefined}
            tone={data.activations >= data.target ? "good" : "ink"}
            size="sm"
          />
        </div>
      </Card>

      {data.guarantee && (
        <Card className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Jaminan income</p>
            <div className="num text-[15px] font-semibold text-good">
              {data.guarantee.projected > 0 ? `+${fmt(data.guarantee.projected)}` : "0"}
            </div>
          </div>
          <div className="mt-2.5">
            <Ticks
              value={Math.min(data.activations, data.guarantee.minActivations)}
              target={data.guarantee.minActivations}
              tone={data.activations >= data.guarantee.minActivations ? "good" : "accent"}
              size="sm"
            />
          </div>
          <p className="mt-2 text-[13px] text-ink-mute">
            Minimum {data.guarantee.minActivations} pelanggan baru, 3 bulan pertama.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat label={`Penghasilan ${periodLabel(data.period)}`} value={fmt(data.gross)} />
          <Stat label="Pending" value={fmt(data.pending)} tone="warn" />
        </div>
        <Row
          label="Held balance"
          sub="Tidak hangus. Capai 5+ pelanggan baru untuk merilis."
          value={fmt(data.heldBalance)}
          tone={data.heldBalance > 0 ? "warn" : "mute"}
        />
        {data.nextPayout ? (
          <Row
            href="/l1/penghasilan?tab=payout"
            label={`Payout ${periodLabel(data.nextPayout.period)}`}
            sub={date(data.nextPayout.payoutDate)}
            value={fmt(data.nextPayout.payable)}
            valueSub={data.nextPayout.status === "PAID" ? "Dibayar" : "Dijadwalkan"}
          />
        ) : (
          <Row label="Payout" sub="Belum ada payout terjadwal" value="—" tone="mute" />
        )}
      </Card>

      <div>
        <SectionTitle
          action={
            <Link
              href="/l1/pelanggan"
              className="flex items-center gap-1 text-[13px] font-semibold text-ink-soft"
            >
              Lihat <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Pelanggan
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-3 divide-x divide-line">
            <Stat label="Aktif" value={data.customers.active} />
            <Stat
              label="≤7 hari"
              value={data.customers.expiringSoon}
              tone={data.customers.expiringSoon > 0 ? "warn" : "default"}
            />
            <Stat label="Lifetime" value={data.customers.lifetime} />
          </div>
        </Card>
      </div>

      <Link
        href="/l1/jual"
        className="press flex items-center justify-between rounded-lg bg-ink px-4 py-4 text-white"
      >
        <span className="text-[15px] font-semibold">Buat tautan pembayaran</span>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
