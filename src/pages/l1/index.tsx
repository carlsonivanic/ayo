import { useQuery } from "convex/react";
import { ArrowRight, Image as ImageIcon, Ticket } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CalonSheet } from "@/components/CalonSheet";
import { CustomerTable, type CustomerRow } from "@/components/CustomerTable";
import { Guard } from "@/components/Guard";
import { Leaderboard } from "@/components/Leaderboard";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { useMoney } from "@/lib/useMoney";

// Recharts measures the DOM, so the chart is client-only.
const SalesMixChart = dynamic(
  () => import("@/components/SalesMixChart").then((m) => m.SalesMixChart),
  { ssr: false, loading: () => <div className="h-[260px]" /> },
);

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
  const router = useRouter();
  const fmt = useMoney();
  const [range, setRange] = useState<"30d" | "12m">("12m");
  const [calon, setCalon] = useState<CustomerRow | null>(null);

  const mix30 = useQuery(api.l1Analytics.mix, { now, range: "30d" });
  const mix12 = useQuery(api.l1Analytics.mix, { now, range: "12m" });
  const mix = range === "30d" ? mix30 : mix12;
  const customers = useQuery(api.customers.table, { now });
  const board = useQuery(api.leaderboard.month, { now });

  function open(row: CustomerRow) {
    if (row.kind === "calon") setCalon(row);
    else if (row.merchantId) void router.push(`/l1/pelanggan/${row.merchantId}`);
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        {mix ? (
          <SalesMixChart
            buckets={mix.buckets}
            plans={mix.plans}
            range={range}
            onRangeChange={setRange}
            unitTotal={mix.unitTotal}
            commissionTotal={mix.commissionTotal}
            format={fmt}
          />
        ) : (
          <Loading rows={4} />
        )}
      </Card>

      <div>
        <SectionTitle
          action={
            <Link
              href="/l1/pelanggan"
              className="flex items-center gap-1 text-[13px] font-semibold text-ink-soft"
            >
              Lihat semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Pelanggan
        </SectionTitle>
        <Card className="overflow-hidden">
          {customers ? (
            <CustomerTable
              rows={customers}
              compact
              onSelect={open}
              emptyLabel="Belum ada pelanggan. Mulai dari tombol Jual."
            />
          ) : (
            <Loading rows={4} />
          )}
        </Card>
      </div>

      <div>
        <SectionTitle>Peringkat</SectionTitle>
        {board ? (
          <Leaderboard data={board} />
        ) : (
          <Card>
            <Loading rows={3} />
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/l1/kode"
          className="press flex items-center gap-2 rounded border border-line bg-surface px-4 py-3 text-[14px] font-medium"
        >
          <Ticket className="h-4 w-4 text-ink-mute" />
          Kode saya
        </Link>
        <Link
          href="/banner"
          className="press flex items-center gap-2 rounded border border-line bg-surface px-4 py-3 text-[14px] font-medium"
        >
          <ImageIcon className="h-4 w-4 text-ink-mute" />
          Banner
        </Link>
      </div>

      <CalonSheet row={calon} onClose={() => setCalon(null)} />
    </div>
  );
}
