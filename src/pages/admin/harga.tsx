import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Card";
import { Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

export default function HargaPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Harga">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const plans = useQuery(api.admin.pricing.overview);
  const schedule = useMutation(api.admin.pricing.schedulePriceChange);
  const cancel = useMutation(api.admin.pricing.cancelPriceChange);
  const updateCommission = useMutation(api.admin.pricing.updateCommission);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [effective, setEffective] = useState("");
  const [mode, setMode] = useState<"NEW_SALES_ONLY" | "ALL_USERS">("ALL_USERS");
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const active = plans?.find((p) => p.id === selected);

  return (
    <>
      {!plans ? (
        <Loading rows={4} />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] font-semibold">{plan.name}</h2>
                    {!plan.active && <Pill>Nonaktif</Pill>}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-mute">
                    {plan.commissionType === "ONE_TIME"
                      ? `Sekali ${plan.oneTimePercent}%`
                      : `Y1 ${plan.y1Percent}% · Y2 ${plan.y2Percent}% · Y3 ${plan.y3Percent}% · Y4+ ${plan.y4PlusPercent}%`}
                  </p>
                  {plan.renewalPrice !== null && (
                    <p className="mt-1 text-[13px] text-ink-mute">
                      Harga perpanjangan lama {fmt(plan.renewalPrice)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-[20px] font-semibold leading-none">
                    {fmt(plan.price)}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-mute">/{plan.priceUnit}</div>
                </div>
              </div>

              {plan.scheduled && (
                <div className="flex items-center justify-between gap-3 border-t border-line bg-accent-soft px-4 py-2.5">
                  <span className="text-[13px] text-accent-ink">
                    Jadi <span className="num">{fmt(plan.scheduled.newPrice)}</span> pada{" "}
                    {date(plan.scheduled.effectiveDate)} ·{" "}
                    {plan.scheduled.applyMode === "ALL_USERS" ? "semua" : "penjualan baru"}
                  </span>
                  <button
                    onClick={async () => {
                      await cancel({
                        changeId: plan.scheduled!.id as Id<"scheduledPriceChanges">,
                      });
                      toast("Jadwal dibatalkan");
                    }}
                    className="text-[13px] font-semibold underline underline-offset-4"
                  >
                    Batal
                  </button>
                </div>
              )}

              <div className="flex justify-end border-t border-line bg-black/[0.015] px-4 py-2.5">
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setSelected(plan.id);
                    setPrice(String(plan.price));
                    setPercents({
                      y1: String(plan.y1Percent),
                      y2: String(plan.y2Percent),
                      y3: String(plan.y3Percent),
                      y4: String(plan.y4PlusPercent),
                      one: String(plan.oneTimePercent),
                    });
                  }}
                >
                  Ubah
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!active} onClose={() => setSelected(null)} title={active?.name ?? ""}>
        {active && (
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="eyebrow">Jadwalkan harga baru</p>
              <Field label="Harga">
                <Input
                  inputMode="numeric"
                  className="num"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="Berlaku mulai">
                <Input
                  type="date"
                  value={effective}
                  onChange={(e) => setEffective(e.target.value)}
                />
              </Field>
              <Field label="Cakupan">
                <Select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="ALL_USERS">Semua pengguna termasuk yang ada</option>
                  <option value="NEW_SALES_ONLY">Penjualan baru saja</option>
                </Select>
              </Field>
              <Button
                block
                disabled={busy || !price || !effective}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await schedule({
                      planId: active.id as Id<"productPlans">,
                      newPrice: Number(price),
                      effectiveDate: new Date(`${effective}T00:00:00+07:00`).getTime(),
                      applyMode: mode,
                    });
                    toast("Perubahan harga dijadwalkan");
                    setSelected(null);
                  } catch (err) {
                    toast(errorMessage(err), "warn");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Jadwalkan
              </Button>
            </div>

            <div className="space-y-4 border-t border-line pt-5">
              <p className="eyebrow">Persentase komisi</p>
              {active.commissionType === "ONE_TIME" ? (
                <Field label="Sekali bayar %">
                  <Input
                    className="num"
                    value={percents.one ?? ""}
                    onChange={(e) => setPercents({ ...percents, one: e.target.value })}
                  />
                </Field>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(["y1", "y2", "y3", "y4"] as const).map((key) => (
                    <Field key={key} label={key.toUpperCase()}>
                      <Input
                        className="num"
                        value={percents[key] ?? ""}
                        onChange={(e) => setPercents({ ...percents, [key]: e.target.value })}
                      />
                    </Field>
                  ))}
                </div>
              )}
              <Button
                variant="quiet"
                block
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await updateCommission({
                      planId: active.id as Id<"productPlans">,
                      y1Percent: Number(percents.y1),
                      y2Percent: Number(percents.y2),
                      y3Percent: Number(percents.y3),
                      y4PlusPercent: Number(percents.y4),
                      oneTimePercent: Number(percents.one),
                    });
                    toast("Komisi diperbarui");
                  } catch (err) {
                    toast(errorMessage(err), "warn");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Simpan komisi
              </Button>
              <Row
                label={active.active ? "Nonaktifkan paket" : "Aktifkan paket"}
                value={
                  <button
                    onClick={async () => {
                      await updateCommission({
                        planId: active.id as Id<"productPlans">,
                        active: !active.active,
                      });
                      toast("Status paket diperbarui");
                    }}
                    className="text-[13px] font-semibold underline underline-offset-4"
                  >
                    {active.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                }
              />
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
