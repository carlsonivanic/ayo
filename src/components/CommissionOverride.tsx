import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input, Toggle } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { percent } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

const Y_KEYS = [
  ["y1Percent", "Y1"],
  ["y2Percent", "Y2"],
  ["y3Percent", "Y3"],
  ["y4PlusPercent", "Y4+"],
] as const;

const L2_KEYS = [
  ["basePercent", "Fee dasar %"],
  ["decayM7_18", "Decay M7-18 %"],
  ["decayM19_30", "Decay M19-30 %"],
  ["decayM31_42", "Decay M31-42 %"],
] as const;

type PlanKey = (typeof Y_KEYS)[number][0] | "oneTimePercent";
type L2Key = (typeof L2_KEYS)[number][0];

function planKeys(commissionType: string): readonly (readonly [PlanKey, string])[] {
  return commissionType === "ONE_TIME" ? [["oneTimePercent", "Sekali bayar"]] : Y_KEYS;
}

type Draft = {
  active: boolean;
  plans: Record<string, Partial<Record<PlanKey, string>>>;
  renewal: string;
  l2: Partial<Record<L2Key, string>>;
  note: string;
};

/** Empty input means "follow global"; anything else is a number. */
function parse(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return Number(value.replace(",", "."));
}

function text(value: number | null | undefined): string {
  return value === undefined || value === null ? "" : String(value);
}

export function CommissionOverride({
  userId,
  role,
}: {
  userId: Id<"users">;
  role: "L1" | "L2";
}) {
  const data = useQuery(api.admin.overrides.get, { userId });
  const save = useMutation(api.admin.overrides.save);
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const { override, global } = data;

  const lines: { label: string; value: string }[] = [];
  if (override) {
    if (role === "L1") {
      for (const entry of override.plans) {
        const plan = global.plans.find((p) => p.id === entry.planId);
        if (!plan) continue;
        for (const [key, label] of planKeys(plan.commissionType)) {
          const value = entry[key];
          if (value !== undefined) {
            lines.push({ label: `${plan.name} · ${label}`, value: `${percent(value)} (global ${percent(plan[key])})` });
          }
        }
      }
      if (override.renewalIncentivePercent !== null) {
        lines.push({
          label: "Insentif perpanjangan",
          value: `${percent(override.renewalIncentivePercent)} (global ${percent(global.renewalIncentivePercent)})`,
        });
      }
    } else if (override.l2) {
      for (const [key, label] of L2_KEYS) {
        const value = override.l2[key];
        if (value !== undefined) {
          lines.push({ label, value: `${percent(value)} (global ${percent(global.l2[key])})` });
        }
      }
    }
  }

  function open() {
    setDraft({
      active: override?.active ?? true,
      plans: Object.fromEntries(
        (override?.plans ?? []).map((entry) => [
          entry.planId,
          {
            y1Percent: text(entry.y1Percent),
            y2Percent: text(entry.y2Percent),
            y3Percent: text(entry.y3Percent),
            y4PlusPercent: text(entry.y4PlusPercent),
            oneTimePercent: text(entry.oneTimePercent),
          },
        ]),
      ),
      renewal: text(override?.renewalIncentivePercent),
      l2: {
        basePercent: text(override?.l2?.basePercent),
        decayM7_18: text(override?.l2?.decayM7_18),
        decayM19_30: text(override?.l2?.decayM19_30),
        decayM31_42: text(override?.l2?.decayM31_42),
      },
      note: override?.note ?? "",
    });
  }

  function setPlan(planId: string, key: PlanKey, value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      plans: { ...draft.plans, [planId]: { ...draft.plans[planId], [key]: value } },
    });
  }

  async function submit(next: Draft) {
    setBusy(true);
    try {
      await save({
        userId,
        active: next.active,
        plans:
          role === "L1"
            ? Object.entries(next.plans).map(([planId, rates]) => ({
                planId: planId as Id<"productPlans">,
                y1Percent: parse(rates.y1Percent),
                y2Percent: parse(rates.y2Percent),
                y3Percent: parse(rates.y3Percent),
                y4PlusPercent: parse(rates.y4PlusPercent),
                oneTimePercent: parse(rates.oneTimePercent),
              }))
            : [],
        renewalIncentivePercent: role === "L1" ? parse(next.renewal) : undefined,
        l2:
          role === "L2"
            ? {
                basePercent: parse(next.l2.basePercent),
                decayM7_18: parse(next.l2.decayM7_18),
                decayM19_30: parse(next.l2.decayM19_30),
                decayM31_42: parse(next.l2.decayM31_42),
              }
            : undefined,
        note: next.note,
      });
      toast("Komisi khusus disimpan");
      setDraft(null);
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  const invalid =
    !!draft &&
    [
      draft.renewal,
      ...Object.values(draft.plans).flatMap((rates) => Object.values(rates)),
      ...Object.values(draft.l2),
    ].some((value) => {
      const n = parse(value);
      return n !== undefined && (!Number.isFinite(n) || n < 0 || n > 100);
    });

  return (
    <div>
      <SectionTitle>Komisi khusus</SectionTitle>
      <Card>
        {lines.length === 0 ? (
          <Row label="Ikut global" tone="mute" onClick={open} />
        ) : (
          <>
            <Row
              label="Status"
              value={
                <Pill tone={override?.active ? "good" : "accent"}>
                  {override?.active ? "Aktif" : "Nonaktif"}
                </Pill>
              }
              onClick={open}
            />
            {lines.map((line) => (
              <Row
                key={line.label}
                label={line.label}
                value={line.value}
                tone={override?.active ? "default" : "mute"}
              />
            ))}
            {override?.note && <Row label="Catatan" value={override.note} tone="mute" />}
          </>
        )}
      </Card>

      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title="Komisi khusus"
        footer={
          <Button block disabled={busy || invalid} onClick={() => draft && void submit(draft)}>
            Simpan
          </Button>
        }
      >
        {draft && (
          <div className="space-y-5">
            <Toggle
              label="Aktif"
              checked={draft.active}
              onChange={(active) => setDraft({ ...draft, active })}
            />
            <p className="text-[13px] text-ink-mute">
              Kosong = ikut global. Berlaku untuk komisi berikutnya.
            </p>

            {role === "L1" ? (
              <>
                {global.plans.map((plan) => {
                  const rates = draft.plans[plan.id] ?? {};
                  const keys = planKeys(plan.commissionType);
                  return (
                    <div key={plan.id} className="space-y-3">
                      <p className="eyebrow">{plan.name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {keys.map(([key, label]) => (
                          <Field key={key} label={`${label} %`}>
                            <Input
                              className="num"
                              inputMode="decimal"
                              placeholder={String(plan[key])}
                              value={rates[key] ?? ""}
                              onChange={(e) => setPlan(plan.id, key, e.target.value)}
                            />
                          </Field>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <Field label="Insentif perpanjangan %">
                  <Input
                    className="num"
                    inputMode="decimal"
                    placeholder={String(global.renewalIncentivePercent)}
                    value={draft.renewal}
                    onChange={(e) => setDraft({ ...draft, renewal: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {L2_KEYS.map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      className="num"
                      inputMode="decimal"
                      placeholder={String(global.l2[key])}
                      value={draft.l2[key] ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, l2: { ...draft.l2, [key]: e.target.value } })
                      }
                    />
                  </Field>
                ))}
              </div>
            )}

            <Field label="Catatan" hint={invalid ? undefined : "Mis. nomor perjanjian."} error={invalid ? "Persentase harus 0–100." : null}>
              <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </Field>
          </div>
        )}
      </Sheet>
    </div>
  );
}
