import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export default function PelangganDetail() {
  return (
    <Guard role="L1">
      <Body />
    </Guard>
  );
}

const TYPE_LABEL: Record<string, string> = {
  NEW_SALES: "Penjualan baru",
  RECURRING: "Perpanjangan",
  RENEWAL_INCENTIVE: "Insentif 2%",
  JAMINAN: "Jaminan",
  ADJUSTMENT: "Penyesuaian",
};

function Body() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? (router.query.id as Id<"merchants">) : null;
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.customers.detail, id ? { merchantId: id, now } : "skip");
  const fmt = useMoney();

  return (
    <AppShell title={data?.storeName ?? "Pelanggan"} back="/l1/pelanggan">
      {!data ? (
        <Loading rows={5} />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex items-start justify-between gap-3 px-4 pb-1 pt-4">
              <div>
                <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{data.storeName}</h2>
                <p className="mt-1 text-[13px] text-ink-mute">
                  {data.planName}
                  {data.location ? ` · ${data.location}` : ""}
                </p>
              </div>
              <Pill
                tone={
                  data.status === "SUBSCRIBED"
                    ? "good"
                    : data.status === "LIFETIME"
                      ? "ink"
                      : "warn"
                }
              >
                {data.status === "SUBSCRIBED"
                  ? "Aktif"
                  : data.status === "LIFETIME"
                    ? "Lifetime"
                    : "Berhenti"}
              </Pill>
            </div>
            <div className="mt-3 grid grid-cols-2 divide-x divide-line border-t border-line">
              <Stat label="Total komisi saya" value={fmt(data.totalEarned)} tone="good" />
              <Stat
                label="Tahun komisi"
                value={data.yLabel}
                sub={`${data.monthsRemaining} bulan tersisa`}
              />
            </div>
          </Card>

          <Card>
            <Row label="Pembayaran pertama" value={date(data.firstPaymentAt)} />
            {data.status !== "LIFETIME" && (
              <Row label="Berakhir" value={date(data.expiryAt)} />
            )}
            <Row
              label="Masa kepemilikan"
              sub="Owner dapat komisi perpanjangan selama 36 bulan sejak pembayaran pertama."
              value={date(data.windowEndsAt)}
            />
          </Card>

          <div>
            <SectionTitle>Riwayat</SectionTitle>
            {data.payments.length === 0 ? (
              <Empty title="Belum ada pembayaran tercatat." />
            ) : (
              <Card>
                {data.payments.map((payment, index) => (
                  <Row
                    key={index}
                    label={TYPE_LABEL[payment.type] ?? payment.type}
                    sub={`${date(payment.date)} · ${payment.method === "SELF" ? "mandiri" : "kode"} · ${payment.yLabel}`}
                    value={fmt(payment.myCommission)}
                    valueSub={fmt(payment.paymentAmount)}
                    tone={payment.myCommission > 0 ? "good" : "mute"}
                  />
                ))}
              </Card>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
