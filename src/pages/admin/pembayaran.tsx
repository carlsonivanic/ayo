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

type Tab = "pembayaran" | "kode";

export default function PembayaranPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const [tab, setTab] = useState<Tab>("pembayaran");
  const [period, setPeriod] = useState(currentPeriod());
  const payments = useQuery(
    api.admin.payments.list,
    tab === "pembayaran" ? { period } : "skip",
  );
  const expired = useQuery(api.admin.payments.expiredCodes, tab === "kode" ? {} : "skip");
  const refund = useMutation(api.admin.ops.processManualRefundException);
  const reissue = useMutation(api.admin.ops.reissueExpiredCode);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const active = payments?.find((p) => p.id === selected);

  return (
    <AppShell title="Pembayaran">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "pembayaran", label: "Pembayaran" },
          { value: "kode", label: "Kode kedaluwarsa" },
        ]}
      />

      {tab === "pembayaran" && (
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
                  valueSub={payment.refunded ? <Pill tone="warn">Refund</Pill> : undefined}
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

      <Sheet open={!!active} onClose={() => setSelected(null)} title={active?.planName ?? ""}>
        {active && (
          <div className="space-y-5">
            <div>
              <p className="eyebrow">{active.sellerName}</p>
              <p className="num mt-1 text-[26px] font-semibold">{fmt(active.amount)}</p>
              <p className="mt-1 text-[13px] text-ink-mute">{dateTime(active.paidAt)}</p>
            </div>

            {active.codes.length > 0 && (
              <div className="space-y-2">
                <p className="eyebrow">Kode</p>
                {active.codes.map((code) => (
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

            {!active.refunded && (
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
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await refund({
                        paymentLinkId: active.id as Id<"paymentLinks">,
                        reason,
                      });
                      toast("Refund dicatat");
                      setSelected(null);
                      setReason("");
                    } catch (err) {
                      toast(errorMessage(err), "warn");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Catat refund
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}
