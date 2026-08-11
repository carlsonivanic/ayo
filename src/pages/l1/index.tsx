import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading, Pill } from "@/components/ui/Feedback";
import { TickCaption, Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

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
  const fmt = useMoney();

  if (!data) return <Loading rows={4} />;

  const warmthTone =
    data.warmth.state === "WARM" ? "good" : data.warmth.state === "COLD" ? "warn" : "accent";

  return (
    <div className="space-y-5">
      {/* The month, counted in customers — the unit every AYO rule uses. */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Target akuisisi</p>
            <p className="mt-1 text-[13px] text-ink-mute">Bulan ke-{data.tenureMonth}</p>
          </div>
          {data.warmth.active && data.warmth.state && (
            <Pill tone={warmthTone}>{data.warmth.state}</Pill>
          )}
        </div>
        <div className="mt-4">
          <Ticks
            value={data.activations}
            target={data.target}
            threshold={data.warmth.active ? data.warmth.threshold : undefined}
            tone={data.activations >= data.target ? "good" : "ink"}
          />
          <TickCaption
            value={data.activations}
            target={data.target}
            suffix={
              data.warmth.active && data.activations < data.warmth.threshold
                ? `${data.warmth.threshold - data.activations} lagi untuk Warm`
                : undefined
            }
          />
        </div>
      </Card>

      {data.guarantee && (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Jaminan income</p>
              <p className="mt-1 text-[13px] text-ink-mute">
                Berlaku 3 bulan pertama. Minimum {data.guarantee.minActivations} pelanggan baru.
              </p>
            </div>
            <div className="num shrink-0 text-right text-[18px] font-semibold text-good">
              {data.guarantee.projected > 0 ? `+${fmt(data.guarantee.projected)}` : "0"}
            </div>
          </div>
          <div className="mt-4">
            <Ticks
              value={Math.min(data.activations, data.guarantee.minActivations)}
              target={data.guarantee.minActivations}
              tone={data.activations >= data.guarantee.minActivations ? "good" : "accent"}
            />
          </div>
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
