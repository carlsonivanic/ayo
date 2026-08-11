import { useQuery } from "convex/react";
import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { currentPeriod, date, shiftPeriod } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { downloadCsv } from "@/lib/utils";

type Tab = "pl" | "liabilitas" | "akuisisi" | "produk" | "merchant";

export default function LaporanPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const [tab, setTab] = useState<Tab>("pl");
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(now), -1));
  const fmt = useMoney();

  const pl = useQuery(api.admin.reports.profitLoss, tab === "pl" ? { period } : "skip");
  const liability = useQuery(api.admin.reports.liability, tab === "liabilitas" ? {} : "skip");
  const acquisition = useQuery(
    api.admin.reports.acquisitionReport,
    tab === "akuisisi" ? { period } : "skip",
  );
  const product = useQuery(api.admin.reports.productSales, tab === "produk" ? { period } : "skip");
  const merchants = useQuery(
    api.admin.reports.merchantReport,
    tab === "merchant" ? { now } : "skip",
  );

  return (
    <AppShell
      title="Laporan"
      action={
        <div className="flex">
          <button
            aria-label="Cetak"
            onClick={() => window.print()}
            className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            aria-label="Unduh CSV"
            onClick={() => {
              if (tab === "merchant" && merchants) {
                downloadCsv(
                  `merchant-${period}.csv`,
                  [
                    { key: "store", label: "Toko" },
                    { key: "owner", label: "Owner" },
                    { key: "plan", label: "Paket" },
                    { key: "status", label: "Status" },
                    { key: "firstPaymentAt", label: "Pembayaran pertama" },
                    { key: "tenureMonths", label: "Bulan berjalan" },
                    { key: "windowRemaining", label: "Sisa masa" },
                    { key: "totalOwnerEarning", label: "Komisi owner" },
                    { key: "lastRenewalMethod", label: "Perpanjangan terakhir" },
                  ],
                  merchants.map((m) => ({ ...m, firstPaymentAt: date(m.firstPaymentAt) })),
                );
              }
              if (tab === "produk" && product) {
                downloadCsv(
                  `produk-${period}.csv`,
                  [
                    { key: "plan", label: "Paket" },
                    { key: "count", label: "Transaksi" },
                    { key: "revenue", label: "Pendapatan" },
                  ],
                  product,
                );
              }
            }}
            className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="mb-4 flex justify-end no-print">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="no-print">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "pl", label: "Laba rugi" },
            { value: "liabilitas", label: "Liabilitas" },
            { value: "akuisisi", label: "Akuisisi" },
            { value: "produk", label: "Produk" },
            { value: "merchant", label: "Merchant" },
          ]}
        />
      </div>

      {tab === "pl" &&
        (!pl ? (
          <Loading rows={6} />
        ) : (
          <Card>
            <Row label="Pendapatan" value={fmt(pl.revenue)} />
            <Row label="Komisi penjualan baru" value={`-${fmt(pl.newSales)}`} tone="warn" />
            <Row label="Komisi perpanjangan" value={`-${fmt(pl.recurring)}`} tone="warn" />
            <Row label="Insentif perpanjangan" value={`-${fmt(pl.renewalIncentive)}`} tone="warn" />
            <Row label="Komisi L2" value={`-${fmt(pl.l2Commission)}`} tone="warn" />
            <Row label="Jaminan" value={`-${fmt(pl.jaminan)}`} tone="warn" />
            <Row
              label="Laba bersih"
              value={fmt(pl.netProfit)}
              tone={pl.netProfit >= 0 ? "good" : "warn"}
            />
          </Card>
        ))}

      {tab === "liabilitas" &&
        (!liability ? (
          <Loading rows={5} />
        ) : (
          <Card>
            <Row label="Payout L1 belum dibayar" value={fmt(liability.l1Unpaid)} />
            <Row label="Held money L1" value={fmt(liability.l1Held)} />
            <Row label="Komisi owner beku" value={fmt(liability.l1FrozenOwner)} />
            <Row label="Payout L2 belum dibayar" value={fmt(liability.l2Unpaid)} />
            <Row label="Total" value={fmt(liability.total)} />
            <Row
              label="Kursi belum aktif"
              sub={`${liability.seatCount} kursi · kewajiban terbuka, di luar total`}
              value={fmt(liability.seatObligation)}
              tone="mute"
            />
          </Card>
        ))}

      {tab === "akuisisi" &&
        (!acquisition ? (
          <Loading rows={4} />
        ) : (
          <>
            <Card className="mb-4">
              <Row label="Aktivasi pertama" value={acquisition.total} />
              <Row
                label="Perpanjangan"
                sub="Informasi saja — tidak dihitung sebagai akuisisi."
                value={acquisition.renewalRedemptions}
                tone="mute"
              />
            </Card>
            <SectionTitle>Per agen</SectionTitle>
            {acquisition.byAgent.length === 0 ? (
              <Empty title="Belum ada akuisisi." />
            ) : (
              <Card>
                {acquisition.byAgent.map((row) => (
                  <Row key={row.agent} label={row.agent} value={row.count} />
                ))}
              </Card>
            )}
          </>
        ))}

      {tab === "produk" &&
        (!product ? (
          <Loading rows={4} />
        ) : product.length === 0 ? (
          <Empty title="Belum ada penjualan." />
        ) : (
          <Card>
            {product.map((row) => (
              <Row
                key={row.plan}
                label={row.plan}
                sub={`${row.count} transaksi`}
                value={fmt(row.revenue)}
              />
            ))}
          </Card>
        ))}

      {tab === "merchant" &&
        (!merchants ? (
          <Loading rows={6} />
        ) : merchants.length === 0 ? (
          <Empty title="Belum ada merchant." />
        ) : (
          <Card>
            {merchants.map((row, index) => (
              <Row
                key={index}
                label={row.store}
                sub={`${row.owner} · ${row.plan} · sisa ${row.windowRemaining} bulan · ${row.lastRenewalMethod}`}
                value={fmt(row.totalOwnerEarning)}
                valueSub={date(row.expiryAt)}
              />
            ))}
          </Card>
        ))}
    </AppShell>
  );
}
