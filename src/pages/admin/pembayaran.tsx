import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { currentPeriod, date, dateTime } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

type Tab = "verifikasi" | "riwayat" | "selfrenew" | "kode";

const VERIFICATION_PILL = {
  PENDING: { tone: "warn", label: "Menunggu" },
  VERIFIED: { tone: "good", label: "Terverifikasi" },
  REJECTED: { tone: "warn", label: "Ditolak" },
} as const;

export default function PembayaranPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const [tab, setTab] = useState<Tab>("verifikasi");
  const [period, setPeriod] = useState(currentPeriod());
  const queue = useQuery(
    api.admin.payments.awaitingVerification,
    tab === "verifikasi" ? {} : "skip",
  );
  const payments = useQuery(
    api.admin.payments.list,
    tab === "riwayat" || tab === "selfrenew" ? { period } : "skip",
  );
  const expired = useQuery(api.admin.payments.expiredCodes, tab === "kode" ? {} : "skip");
  const reissue = useMutation(api.admin.ops.reissueExpiredCode);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const active = [...(queue ?? []), ...(payments ?? [])].find((p) => p.id === selected);
  const selfRenewals = payments?.filter((p) => p.selfRenew);

  return (
    <AppShell title="Pembayaran">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "verifikasi", label: `Verifikasi${queue?.length ? ` (${queue.length})` : ""}` },
          { value: "riwayat", label: "Riwayat" },
          { value: "selfrenew", label: "Self-renew" },
          { value: "kode", label: "Kode kedaluwarsa" },
        ]}
      />

      {tab === "verifikasi" &&
        (!queue ? (
          <Loading rows={5} />
        ) : queue.length === 0 ? (
          <Empty title="Tidak ada bukti bayar yang menunggu." />
        ) : (
          <Card>
            {queue.map((payment) => (
              <Row
                key={payment.id}
                label={payment.planName}
                sub={`${payment.selfRenew ? `Self-renew · ${payment.storeName ?? "—"}` : payment.sellerName} · ${dateTime(payment.proofUploadedAt)}`}
                value={fmt(payment.qrisAmount)}
                valueSub={<Pill tone="warn">Menunggu</Pill>}
                onClick={() => setSelected(payment.id)}
              />
            ))}
          </Card>
        ))}

      {tab === "riwayat" && (
        <>
          <div className="mb-4 flex justify-end">
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
          {!payments ? (
            <Loading rows={5} />
          ) : payments.length === 0 ? (
            <Empty title="Belum ada pembayaran di periode ini." />
          ) : (
            <Card>
              {payments.map((payment) => (
                <Row
                  key={payment.id}
                  label={payment.planName}
                  sub={`${payment.sellerName} · ${dateTime(payment.paidAt)}`}
                  value={fmt(payment.amount)}
                  valueSub={
                    payment.refunded ? (
                      <Pill tone="warn">Refund</Pill>
                    ) : payment.verification ? (
                      <Pill tone={VERIFICATION_PILL[payment.verification].tone}>
                        {VERIFICATION_PILL[payment.verification].label}
                      </Pill>
                    ) : undefined
                  }
                  onClick={() => setSelected(payment.id)}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {tab === "selfrenew" && (
        <>
          <div className="mb-4 flex justify-end">
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
          {!selfRenewals ? (
            <Loading rows={5} />
          ) : selfRenewals.length === 0 ? (
            <Empty title="Belum ada self-renew di periode ini." />
          ) : (
            <Card>
              {selfRenewals.map((payment) => (
                <Row
                  key={payment.id}
                  label={payment.storeName ?? "—"}
                  sub={`${payment.planName} · ${dateTime(payment.paidAt)}`}
                  value={fmt(payment.qrisAmount)}
                  valueSub={
                    payment.verification ? (
                      <Pill tone={VERIFICATION_PILL[payment.verification].tone}>
                        {VERIFICATION_PILL[payment.verification].label}
                      </Pill>
                    ) : undefined
                  }
                  onClick={() => setSelected(payment.id)}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {tab === "kode" &&
        (!expired ? (
          <Loading rows={5} />
        ) : expired.length === 0 ? (
          <Empty title="Tidak ada kode kedaluwarsa." />
        ) : (
          <Card>
            {expired.map((code) => (
              <Row
                key={code.id}
                label={<span className="num tracking-[0.06em]">{code.code}</span>}
                sub={`${code.sellerName} · ${date(code.expiresAt)}`}
                value={
                  code.reissued ? (
                    <Pill tone="neutral">Sudah diganti</Pill>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const result = await reissue({
                            codeId: code.id as Id<"subscriptionCodes">,
                            reason: "Kode kedaluwarsa sebelum dipakai",
                          });
                          toast(`Kode pengganti ${result.code}`);
                        } catch (err) {
                          toast(errorMessage(err), "warn");
                        }
                      }}
                      className="text-[13px] font-semibold underline underline-offset-4"
                    >
                      Terbitkan ulang
                    </button>
                  )
                }
              />
            ))}
          </Card>
        ))}

      {active && <Detail payment={active} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

type Payment = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.payments.list>>
>[number];

function Detail({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const verify = useMutation(api.admin.payments.verifyPayment);
  const reject = useMutation(api.admin.payments.rejectPayment);
  const refund = useMutation(api.admin.ops.processManualRefundException);
  const toast = useToast();
  const fmt = useMoney();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = payment.verification === "PENDING";

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast(done);
      onClose();
      setReason("");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={payment.planName}>
      <div className="space-y-5">
        <div>
          <p className="eyebrow">
            {payment.selfRenew ? `Self-renew · ${payment.storeName ?? "—"}` : payment.sellerName}
          </p>
          <p className="num mt-1 text-[26px] font-semibold">{fmt(payment.amount)}</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            Ditransfer {fmt(payment.qrisAmount)} · {dateTime(payment.paidAt)}
          </p>
        </div>

        {payment.proofUrl && (
          <div>
            <p className="eyebrow mb-2">Bukti bayar</p>
            <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="press block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.proofUrl}
                alt="Bukti bayar"
                className="max-h-80 w-full rounded border border-line object-contain"
              />
            </a>
            {payment.proofNote && (
              <p className="mt-2 text-[13px] text-ink-soft">{payment.proofNote}</p>
            )}
          </div>
        )}

        {payment.codes.length > 0 && (
          <div className="space-y-2">
            <p className="eyebrow">Kode</p>
            {payment.codes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between rounded border border-line px-3 py-2"
              >
                <span className="num text-[14px] tracking-[0.06em]">{code.code}</span>
                <span className="text-[13px] text-ink-mute">
                  {code.storeName ?? code.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {payment.seats.length > 0 && (
          <div className="space-y-2">
            <p className="eyebrow">Kursi</p>
            {payment.seats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center justify-between rounded border border-line px-3 py-2"
              >
                <span className="text-[14px]">Kursi {seat.seatIndex}</span>
                <span className="text-[13px] text-ink-mute">{seat.status}</span>
              </div>
            ))}
          </div>
        )}

        {payment.rejectionReason && (
          <p className="rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px] text-ink-soft">
            Ditolak: {payment.rejectionReason}
          </p>
        )}

        {pending && (
          <div className="space-y-3 border-t border-line pt-4">
            <Button
              block
              disabled={busy}
              onClick={() =>
                void run(
                  () => verify({ linkId: payment.id as Id<"paymentLinks"> }),
                  "Pembayaran terverifikasi",
                )
              }
            >
              Dana diterima
            </Button>
            <Field
              label="Alasan tolak"
              hint={
                payment.selfRenew
                  ? "Kode dimatikan, komisi dibatalkan, dan masa aktif toko dicabut."
                  : "Kode dimatikan dan komisi dibatalkan."
              }
            >
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              variant="danger"
              block
              disabled={busy || reason.trim().length < 4}
              onClick={() =>
                void run(
                  () =>
                    reject({ linkId: payment.id as Id<"paymentLinks">, reason }),
                  "Bukti bayar ditolak",
                )
              }
            >
              Tolak bukti
            </Button>
          </div>
        )}

        {!pending && !payment.refunded && (
          <div className="space-y-3 border-t border-line pt-4">
            <Field
              label="Alasan refund"
              hint="Refund adalah pengecualian manual. Komisi dibalik dengan baris baru."
            >
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              variant="danger"
              block
              disabled={busy || !reason.trim()}
              onClick={() =>
                void run(
                  () =>
                    refund({
                      paymentLinkId: payment.id as Id<"paymentLinks">,
                      reason,
                    }),
                  "Refund dicatat",
                )
              }
            >
              Catat refund
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
