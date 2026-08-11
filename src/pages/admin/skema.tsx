import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Loading, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select, Toggle } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

// §21 — every business constant, in one form. Changes take effect next period.

export default function SkemaPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Skema">
        <Body />
      </AppShell>
    </Guard>
  );
}

type Settings = NonNullable<ReturnType<typeof useSettings>>;
function useSettings() {
  return useQuery(api.admin.settings.get);
}

function Body() {
  const settings = useSettings();
  const update = useMutation(api.admin.settings.update);
  const toast = useToast();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!draft) return <Loading rows={6} />;

  const num = (value: string) => Number(value.replace(/[^\d.-]/g, "")) || 0;

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await update({
        guarantee: draft.guarantee,
        warmth: draft.warmth,
        l1Target: draft.l1Target,
        l2: draft.l2,
        recruitment: draft.recruitment,
        payout: draft.payout,
        moneyDisplay: draft.moneyDisplay,
        renewalIncentivePercent: draft.renewalIncentivePercent,
        ownershipWindowMonths: draft.ownershipWindowMonths,
        allowDirectLifetimePurchase: draft.allowDirectLifetimePurchase,
        allowDirectSubscriptionPurchase: draft.allowDirectSubscriptionPurchase,
        seatLinkExpiryDays: draft.seatLinkExpiryDays,
        codeExpiryDays: draft.codeExpiryDays,
        paymentLinkExpiryHours: draft.paymentLinkExpiryHours,
      });
      toast("Skema disimpan");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <SectionTitle>Jaminan income</SectionTitle>
        <Card className="space-y-4 p-4">
          <Toggle
            label="Aktif"
            checked={draft.guarantee.enable}
            onChange={(enable) =>
              setDraft({ ...draft, guarantee: { ...draft.guarantee, enable } })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Berlaku (bulan)">
              <Input
                className="num"
                value={draft.guarantee.months}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guarantee: { ...draft.guarantee, months: num(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Target bulanan">
              <Input
                className="num"
                value={draft.guarantee.target}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guarantee: { ...draft.guarantee, target: num(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Minimum aktivasi">
              <Input
                className="num"
                value={draft.guarantee.minActivations}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guarantee: { ...draft.guarantee, minActivations: num(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Top-up">
              <Input
                className="num"
                value={draft.guarantee.topUp}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    guarantee: { ...draft.guarantee, topUp: num(e.target.value) },
                  })
                }
              />
            </Field>
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle helper="Held money tidak hangus. Capai ambang rilis untuk mencairkan semua.">
          Warmth
        </SectionTitle>
        <Card className="grid grid-cols-2 gap-3 p-4">
          <Field label="Mulai setelah bulan">
            <Input
              className="num"
              value={draft.warmth.startAfterMonth}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: { ...draft.warmth, startAfterMonth: num(e.target.value) },
                })
              }
            />
          </Field>
          <Field label="Ambang Warm">
            <Input
              className="num"
              value={draft.warmth.warmThreshold}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: { ...draft.warmth, warmThreshold: num(e.target.value) },
                })
              }
            />
          </Field>
          <Field label="Cool held %">
            <Input
              className="num"
              value={draft.warmth.coolHeld}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: {
                    ...draft.warmth,
                    coolHeld: num(e.target.value),
                    coolPayout: 100 - num(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Cold held %">
            <Input
              className="num"
              value={draft.warmth.coldHeld}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: {
                    ...draft.warmth,
                    coldHeld: num(e.target.value),
                    coldPayout: 100 - num(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Cold setelah berapa bulan">
            <Input
              className="num"
              value={draft.warmth.coldConsecutive}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: { ...draft.warmth, coldConsecutive: num(e.target.value) },
                })
              }
            />
          </Field>
          <Field label="Ambang rilis held">
            <Input
              className="num"
              value={draft.warmth.releaseThreshold}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  warmth: { ...draft.warmth, releaseThreshold: num(e.target.value) },
                })
              }
            />
          </Field>
        </Card>
      </div>

      <div>
        <SectionTitle>Target L1</SectionTitle>
        <Card className="grid grid-cols-3 gap-3 p-4">
          {(
            [
              ["m1_3", "Bulan 1-3"],
              ["m4_6", "Bulan 4-6"],
              ["m7_9", "Bulan 7-9"],
              ["m10_11", "Bulan 10-11"],
              ["m12Plus", "Bulan 12+"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                className="num"
                value={draft.l1Target[key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    l1Target: { ...draft.l1Target, [key]: num(e.target.value) },
                  })
                }
              />
            </Field>
          ))}
        </Card>
      </div>

      <div>
        <SectionTitle>Komisi L2</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee dasar %">
              <Input
                className="num"
                value={draft.l2.basePercent}
                onChange={(e) =>
                  setDraft({ ...draft, l2: { ...draft.l2, basePercent: num(e.target.value) } })
                }
              />
            </Field>
            <Field label="Mulai bulan ke">
              <Input
                className="num"
                value={draft.l2.startMonth}
                onChange={(e) =>
                  setDraft({ ...draft, l2: { ...draft.l2, startMonth: num(e.target.value) } })
                }
              />
            </Field>
            <Field label="Decay M7-18 %">
              <Input
                className="num"
                value={draft.l2.decayM7_18}
                onChange={(e) =>
                  setDraft({ ...draft, l2: { ...draft.l2, decayM7_18: num(e.target.value) } })
                }
              />
            </Field>
            <Field label="Decay M19-30 %">
              <Input
                className="num"
                value={draft.l2.decayM19_30}
                onChange={(e) =>
                  setDraft({ ...draft, l2: { ...draft.l2, decayM19_30: num(e.target.value) } })
                }
              />
            </Field>
            <Field label="Decay M31-42 %">
              <Input
                className="num"
                value={draft.l2.decayM31_42}
                onChange={(e) =>
                  setDraft({ ...draft, l2: { ...draft.l2, decayM31_42: num(e.target.value) } })
                }
              />
            </Field>
          </div>
          <Toggle
            label="Masukkan jaminan ke dasar fee L2"
            checked={draft.l2.includeJaminan}
            onChange={(includeJaminan) =>
              setDraft({ ...draft, l2: { ...draft.l2, includeJaminan } })
            }
          />
        </Card>
      </div>

      <div>
        <SectionTitle>Rekrutmen &amp; payout</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target rekrutmen L2">
              <Input
                className="num"
                value={draft.recruitment.target}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    recruitment: { ...draft.recruitment, target: num(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Frekuensi payout L1 default">
              <Select
                value={draft.payout.l1DefaultFrequency}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    payout: {
                      ...draft.payout,
                      l1DefaultFrequency: e.target.value as "WEEKLY" | "MONTHLY",
                    },
                  })
                }
              >
                <option value="WEEKLY">Mingguan</option>
                <option value="MONTHLY">Bulanan</option>
              </Select>
            </Field>
          </div>
          <Toggle
            label="Hanya hitung L1 hasil undangan"
            checked={draft.recruitment.countOnlyInvited}
            onChange={(countOnlyInvited) =>
              setDraft({ ...draft, recruitment: { ...draft.recruitment, countOnlyInvited } })
            }
          />
        </Card>
      </div>

      <div>
        <SectionTitle>Kepemilikan &amp; masa berlaku</SectionTitle>
        <Card className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insentif perpanjangan %">
              <Input
                className="num"
                value={draft.renewalIncentivePercent}
                onChange={(e) =>
                  setDraft({ ...draft, renewalIncentivePercent: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Masa kepemilikan (bulan)">
              <Input
                className="num"
                value={draft.ownershipWindowMonths}
                onChange={(e) =>
                  setDraft({ ...draft, ownershipWindowMonths: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Kode kedaluwarsa (hari)">
              <Input
                className="num"
                value={draft.codeExpiryDays}
                onChange={(e) => setDraft({ ...draft, codeExpiryDays: num(e.target.value) })}
              />
            </Field>
            <Field label="Tautan kursi (hari)">
              <Input
                className="num"
                value={draft.seatLinkExpiryDays}
                onChange={(e) => setDraft({ ...draft, seatLinkExpiryDays: num(e.target.value) })}
              />
            </Field>
            <Field label="Tautan bayar (jam)">
              <Input
                className="num"
                value={draft.paymentLinkExpiryHours}
                onChange={(e) =>
                  setDraft({ ...draft, paymentLinkExpiryHours: num(e.target.value) })
                }
              />
            </Field>
            <Field label="Format angka">
              <Select
                value={draft.moneyDisplay}
                onChange={(e) =>
                  setDraft({ ...draft, moneyDisplay: e.target.value as "ROUNDED" | "DECIMAL" })
                }
              >
                <option value="ROUNDED">Bulat</option>
                <option value="DECIMAL">Desimal</option>
              </Select>
            </Field>
          </div>
          <Toggle
            label="Izinkan beli lifetime tanpa agen"
            checked={draft.allowDirectLifetimePurchase}
            onChange={(allowDirectLifetimePurchase) =>
              setDraft({ ...draft, allowDirectLifetimePurchase })
            }
          />
          <Toggle
            label="Izinkan langganan tanpa agen"
            checked={draft.allowDirectSubscriptionPurchase}
            onChange={(allowDirectSubscriptionPurchase) =>
              setDraft({ ...draft, allowDirectSubscriptionPurchase })
            }
          />
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+72px)] backdrop-blur lg:pb-3 lg:pl-60">
        <div className="mx-auto max-w-3xl">
          <Button block onClick={() => void save()} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan skema"}
          </Button>
        </div>
      </div>
    </div>
  );
}
