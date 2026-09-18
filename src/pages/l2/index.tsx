import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Feedback";
import { Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

const YearChart = dynamic(() => import("@/components/YearChart"), {
  ssr: false,
  loading: () => <div className="h-[132px]" />,
});

export default function L2Home() {
  return (
    <Guard role="L2">
      <AppShell title="Beranda">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.dashboard.l2, { now });
  const outlook = useQuery(api.projection.l2, { now });
  const fmt = useMoney();

  if (!data) return <Loading rows={4} />;

  return (
    <div className="space-y-5">
      {/* An L2 earns from the team's whole year, not from this month's fee. */}
      <Card className="overflow-hidden">
        <div className="px-4 pb-2 pt-4">
          <p className="eyebrow">Proyeksi fee {outlook?.year ?? new Date(now).getFullYear()}</p>
          <p className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em]">
            {fmt(outlook?.yearTotal ?? 0)}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-mute">
            {fmt(outlook?.realisedTotal ?? 0)} masuk · {fmt(outlook?.projectedTotal ?? 0)} menyusul
          </p>
        </div>
        {outlook && (
          <div className="px-2 pb-2">
            <YearChart
              data={outlook.months}
              currentMonth={outlook.currentMonth}
              format={fmt}
            />
          </div>
        )}
        <Row
          label="Tim aktif"
          sub={`${data.earningTeam} L1 menghasilkan fee ${periodLabel(data.lastClosedPeriod)}`}
          value={data.teamSize}
          href="/l2/tim"
        />
      </Card>

      <Card className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Rekrutmen bulan ini</p>
          <span className="num text-[13px] font-semibold">
            {data.recruitment.count}
            <span className="text-ink-faint">/{data.recruitment.target}</span>
          </span>
        </div>
        <div className="mt-2.5">
          <Ticks
            value={data.recruitment.count}
            target={data.recruitment.target}
            tone={data.recruitment.count >= data.recruitment.target ? "good" : "ink"}
            size="sm"
          />
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat
            label={`Fee ${periodLabel(data.lastClosedPeriod)}`}
            value={fmt(data.lastClosedFee)}
          />
          <Stat label="Rata-rata / bulan" value={fmt(outlook?.runRate ?? 0)} />
        </div>
        {data.nextPayout ? (
          <Row
            href="/l2/penghasilan"
            label={`Payout ${periodLabel(data.nextPayout.period)}`}
            sub={date(data.nextPayout.payoutDate)}
            value={fmt(data.nextPayout.payable)}
            valueSub={data.nextPayout.status === "PAID" ? "Dibayar" : "Dijadwalkan"}
          />
        ) : (
          <Row label="Payout" sub="Belum ada payout terjadwal" value="—" tone="mute" />
        )}
        {data.pendingTeam > 0 && (
          <Row
            href="/l2/tim"
            label="Menunggu persetujuan admin"
            value={data.pendingTeam}
            tone="warn"
          />
        )}
      </Card>

      {outlook && outlook.contributors.length > 0 && (
        <div>
          <SectionTitle>Penyumbang terbesar</SectionTitle>
          <Card>
            {outlook.contributors.map((c) => (
              <Row
                key={c.name}
                label={c.name}
                sub={`Omzet komisi ${fmt(c.gross)}`}
                value={fmt(c.fee)}
                tone="good"
              />
            ))}
          </Card>
        </div>
      )}

      <Link
        href="/l2/undang"
        className="press flex items-center justify-between rounded-lg bg-ink px-4 py-4 text-white"
      >
        <span className="text-[15px] font-semibold">Undang L1 baru</span>
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
