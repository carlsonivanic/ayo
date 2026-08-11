import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

export default function MerchantPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const [search, setSearch] = useState("");
  const merchants = useQuery(api.customers.adminMerchants, {
    now,
    search: search || undefined,
  });
  const l1Options = useQuery(api.admin.users.list, { role: "L1", status: "ACTIVE" });
  const reassign = useMutation(api.admin.ops.reassignMerchantOwnership);
  const resolveFrozen = useMutation(api.admin.ops.resolveFrozenOwnerCommission);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const active = merchants?.find((m) => m.id === selected);

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast(message);
      setSelected(null);
      setReason("");
      setOwnerId("");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Merchant">
      <Input
        placeholder="Cari toko atau owner"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {!merchants ? (
        <Loading rows={6} />
      ) : merchants.length === 0 ? (
        <Empty title="Belum ada merchant." />
      ) : (
        <Card>
          {merchants.map((merchant) => (
            <Row
              key={merchant.id}
              label={merchant.storeName}
              sub={`${merchant.ownerName ?? "Tanpa owner"} · ${merchant.planName} · ${merchant.yLabel}`}
              value={fmt(merchant.totalOwnerEarning)}
              valueSub={
                merchant.frozenAmount > 0 ? (
                  <Pill tone="warn">Beku</Pill>
                ) : (
                  <Pill
                    tone={
                      merchant.status === "SUBSCRIBED"
                        ? "good"
                        : merchant.status === "LIFETIME"
                          ? "ink"
                          : "neutral"
                    }
                  >
                    {merchant.status === "SUBSCRIBED"
                      ? "Aktif"
                      : merchant.status === "LIFETIME"
                        ? "Lifetime"
                        : "Berhenti"}
                  </Pill>
                )
              }
              onClick={() => {
                setSelected(merchant.id);
                setOwnerId(merchant.ownerId ?? "");
              }}
            />
          ))}
        </Card>
      )}

      <Sheet open={!!active} onClose={() => setSelected(null)} title={active?.storeName ?? ""}>
        {active && (
          <div className="space-y-5">
            <dl className="space-y-1.5 text-[14px]">
              <Line label="Store ID" value={active.storeId} />
              <Line label="Pembayaran pertama" value={date(active.firstPaymentAt)} />
              <Line label="Berakhir" value={date(active.expiryAt)} />
              <Line label="Sisa masa komisi" value={`${active.monthsRemaining} bulan`} />
              <Line label="Total komisi owner" value={fmt(active.totalOwnerEarning)} />
              {active.frozenAmount > 0 && (
                <Line label="Komisi beku" value={fmt(active.frozenAmount)} />
              )}
            </dl>

            <div className="space-y-3 border-t border-line pt-4">
              <Field
                label="Owner"
                hint="Kepemilikan hanya berpindah lewat keputusan admin."
              >
                <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">Tanpa owner</option>
                  {(l1Options ?? []).map((l1) => (
                    <option key={l1.id} value={l1.id}>
                      {l1.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Alasan">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button
                block
                disabled={busy || !reason.trim()}
                onClick={() =>
                  void run(
                    () =>
                      reassign({
                        merchantId: active.id as Id<"merchants">,
                        newOwnerL1Id: ownerId ? (ownerId as Id<"users">) : undefined,
                        reason,
                      }),
                    "Kepemilikan diperbarui",
                  )
                }
              >
                Pindahkan kepemilikan
              </Button>

              {active.frozenAmount > 0 && (
                <div className="space-y-2 border-t border-line pt-4">
                  <Button
                    block
                    variant="quiet"
                    disabled={busy || !reason.trim() || !ownerId}
                    onClick={() =>
                      void run(
                        () =>
                          resolveFrozen({
                            merchantId: active.id as Id<"merchants">,
                            resolution: "REASSIGN",
                            newOwnerL1Id: ownerId as Id<"users">,
                            reason,
                          }),
                        "Komisi beku dialihkan",
                      )
                    }
                  >
                    Alihkan komisi beku ke owner baru
                  </Button>
                  <Button
                    block
                    variant="quiet"
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      void run(
                        () =>
                          resolveFrozen({
                            merchantId: active.id as Id<"merchants">,
                            resolution: "SETTLE_TO_COMPANY",
                            reason,
                          }),
                        "Komisi beku diselesaikan",
                      )
                    }
                  >
                    Selesaikan ke perusahaan
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="num text-right">{value}</dd>
    </div>
  );
}
