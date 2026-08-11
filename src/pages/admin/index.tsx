import { useQuery } from "convex/react";
import Link from "next/link";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export default function AdminHome() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Beranda">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.dashboard.admin, { now });
  const fmt = useMoney();

  if (!data) return <Loading rows={5} />;

  return (
    <div className="space-y-5">
      {data.pendingRegistrations > 0 && (
        <Link href="/admin/pengguna?filter=pending" className="press block">
          <Card className="flex items-center justify-between gap-3 border-accent bg-accent-soft px-4 py-3.5">
            <span className="text-[15px] font-semibold text-accent-ink">
              {data.pendingRegistrations} pendaftaran menunggu
            </span>
            <span className="text-[13px] font-semibold underline underline-offset-4">Tinjau</span>
          </Card>
        </Link>
      )}

      <div>
        <SectionTitle>{periodLabel(data.period)}</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 divide-x divide-line">
            <Stat label="Pendapatan" value={fmt(data.revenue)} />
            <Stat label="Transaksi" value={data.sales} />
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle>Merchant</SectionTitle>
        <Card>
          <div className="grid grid-cols-4 divide-x divide-line">
            <Stat label="Total" value={data.merchants.total} />
            <Stat label="Aktif" value={data.merchants.active} />
            <Stat label="Lifetime" value={data.merchants.lifetime} />
            <Stat label="Berhenti" value={data.merchants.churned} />
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle>Kewajiban</SectionTitle>
        <Card>
          <Row
            href="/admin/payout"
            label="Payout terjadwal"
            sub={`${data.scheduledPayouts} baris`}
            value={fmt(data.liability.unpaidPayouts)}
          />
          <Row label="Held money" value={fmt(data.liability.held)} />
          <Row
            label="Kursi belum aktif"
            sub="Kewajiban terbuka, tanpa batas waktu."
            value={fmt(data.liability.unactivatedSeats)}
          />
        </Card>
      </div>
    </div>
  );
}
