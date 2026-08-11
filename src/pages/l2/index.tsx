import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, Stat } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Feedback";
import { TickCaption, Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

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
  const fmt = useMoney();

  if (!data) return <Loading rows={4} />;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="eyebrow">Rekrutmen bulan ini</p>
        <div className="mt-4">
          <Ticks
            value={data.recruitment.count}
            target={data.recruitment.target}
            tone={data.recruitment.count >= data.recruitment.target ? "good" : "ink"}
          />
          <TickCaption
            value={data.recruitment.count}
            target={data.recruitment.target}
            suffix="L1 baru dari undangan Anda"
          />
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat label="Tim aktif" value={data.teamSize} />
          <Stat
            label={`Fee ${periodLabel(data.lastClosedPeriod)}`}
            value={fmt(data.lastClosedFee)}
            sub={`${data.earningTeam} L1 menghasilkan fee`}
          />
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
