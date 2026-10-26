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
import { whatsappUrl } from "@/lib/utils";

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

const STATUS: Record<
  string,
  { label: string; tone: "good" | "warn" | "neutral" | "ink" }
> = {
  AKTIF: { label: "Aktif", tone: "good" },
  SEGERA: { label: "Segera berakhir", tone: "warn" },
  KEDALUWARSA: { label: "Kedaluwarsa", tone: "neutral" },
  LIFETIME: { label: "Lifetime", tone: "ink" },
};

function Body() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? (router.query.id as Id<"merchants">) : null;
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.customers.detail, id ? { merchantId: id, now } : "skip");
  const fmt = useMoney();

  const title = data?.customerName ?? data?.storeName ?? "Pelanggan";
  const status = data ? (STATUS[data.customerStatus] ?? STATUS.KEDALUWARSA) : null;

  return (
    <AppShell title={title} back="/l1/pelanggan">
      {!data ? (
        <Loading rows={5} />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex items-start justify-between gap-3 px-4 pb-1 pt-4">
              <div className="min-w-0">
                <h2 className="truncate text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
                <p className="mt-1 text-[13px] text-ink-mute">
                  {data.customerName ? `${data.storeName} · ` : ""}
                  {data.planName}
                  {data.location ? ` · ${data.location}` : ""}
                </p>
              </div>
              {status && <Pill tone={status.tone}>{status.label}</Pill>}
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
            <Row
              label="Pembayaran"
              value={
                <Pill tone={data.paymentState === "TERVERIFIKASI" ? "good" : "accent"}>
                  {data.paymentState === "TERVERIFIKASI" ? "Terverifikasi" : "Menunggu"}
                </Pill>
              }
            />
            {data.customerPhone && (
              <Row
                label="WhatsApp"
                value={
                  <a
                    href={whatsappUrl(
                      `Halo ${data.customerName ?? data.storeName},`,
                      data.customerPhone,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {data.customerPhone}
                  </a>
                }
              />
            )}
            <Row label="Pembayaran pertama" value={date(data.firstPaymentAt)} />
            {data.customerStatus !== "LIFETIME" && (
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
                    sub={`${date(payment.date)} · ${
                      payment.method === "SELF" ? "mandiri" : "kode"
                    } · ${payment.yLabel}${payment.code ? ` · ${payment.code}` : ""}`}
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
