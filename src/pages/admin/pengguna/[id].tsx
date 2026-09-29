import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CommissionOverride } from "@/components/CommissionOverride";
import { L1Performance, TeamMemberRow } from "@/components/L1Performance";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { currentPeriod, date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

export default function AdminUserDetail() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? (router.query.id as Id<"users">) : null;
  const user = useQuery(api.admin.users.detail, id ? { userId: id } : "skip");
  const l2Options = useQuery(api.admin.users.l2Options);
  const setStatus = useMutation(api.admin.users.setStatus);
  const updateUser = useMutation(api.admin.users.updateUser);
  const assignL2 = useMutation(api.admin.users.assignL2);
  const releaseHeld = useMutation(api.admin.ops.manualHeldRelease);
  const createAdjustment = useMutation(api.admin.ops.createAdjustment);
  const toast = useToast();
  const fmt = useMoney();

  const [sheet, setSheet] = useState<"edit" | "suspend" | "held" | "adjust" | null>(null);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"performa" | "pengaturan">("performa");

  if (!user) {
    return (
      <AppShell title="Pengguna" back="/admin/pengguna">
        <Loading rows={5} />
      </AppShell>
    );
  }

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast(message);
      setSheet(null);
      setReason("");
      setAmount("");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={user.name || user.email} back="/admin/pengguna">
      <div className="space-y-5">
        <Card>
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
            <div>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
                {user.name || "—"}
              </h2>
              <p className="mt-1 text-[13px] text-ink-mute">{user.email}</p>
            </div>
            <Pill
              tone={
                user.status === "ACTIVE" ? "good" : user.status === "SUSPENDED" ? "warn" : "accent"
              }
            >
              {user.status}
            </Pill>
          </div>
          <div className="mt-2 border-t border-line">
            <Row label="Peran" value={user.role ?? "—"} />
            <Row label="Nomor HP" value={user.mobile || "—"} />
            <Row label="Terdaftar" value={date(user.registeredAt)} />
            {user.role === "L1" && (
              <>
                <Row label="Bulan ke" value={user.tenureMonth || "—"} />
                <Row label="Held balance" value={fmt(user.heldBalance)} tone="warn" />
                <Row
                  label="Bulan <5 berturut"
                  value={user.consecutiveSub5Months}
                  tone={user.consecutiveSub5Months >= 3 ? "warn" : "default"}
                />
              </>
            )}
          </div>
        </Card>

        {(user.role === "L1" || user.role === "L2") && (
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "performa", label: "Performa" },
              { value: "pengaturan", label: "Pengaturan" },
            ]}
          />
        )}

        {tab === "performa" && user.role === "L1" && <L1Section userId={user.id} />}
        {tab === "performa" && user.role === "L2" && <L2Section userId={user.id} />}

        {(tab === "pengaturan" || (user.role !== "L1" && user.role !== "L2")) && (
          <>
            {user.role === "L1" && (
              <div>
                <SectionTitle>Koordinator</SectionTitle>
                <Card className="p-4">
                  <Field label="L2" hint="Komisi ke depan mengikuti L2 baru; kredit rekrutmen tetap.">
                    <Select
                      value={user.assignedL2?.id ?? ""}
                      onChange={(e) =>
                        void run(
                          () =>
                            assignL2({
                              l1Id: user.id,
                              l2Id: e.target.value ? (e.target.value as Id<"users">) : undefined,
                            }),
                          "Koordinator diperbarui",
                        )
                      }
                    >
                      <option value="">Tanpa L2</option>
                      {(l2Options ?? []).map((l2) => (
                        <option key={l2.id} value={l2.id}>
                          {l2.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </Card>
              </div>
            )}

            {(user.role === "L1" || user.role === "L2") && (
              <CommissionOverride userId={user.id} role={user.role} />
            )}

            {user.payoutProfile && (
              <div>
                <SectionTitle>Rekening</SectionTitle>
                <Card>
                  <Row label={user.payoutProfile.bankName} value={user.payoutProfile.accountNumber} />
                  <Row label="Atas nama" value={user.payoutProfile.accountName} />
                </Card>
              </div>
            )}

            {user.summaries.length > 0 && (
              <div>
                <SectionTitle>Riwayat bulanan</SectionTitle>
                <Card>
                  {user.summaries.map((summary) => (
                    <Row
                      key={summary.period}
                      label={periodLabel(summary.period)}
                      sub={`${summary.activations} akuisisi${summary.warmthState ? ` · ${summary.warmthState}` : ""}`}
                      value={fmt(summary.gross)}
                      valueSub={
                        summary.heldAmount > 0
                          ? `held ${fmt(summary.heldAmount)}`
                          : summary.jaminan > 0
                            ? `jaminan ${fmt(summary.jaminan)}`
                            : undefined
                      }
                    />
                  ))}
                </Card>
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="quiet"
                block
                onClick={() => {
                  setForm({ name: user.name, email: user.email, mobile: user.mobile });
                  setSheet("edit");
                }}
              >
                Ubah data
              </Button>
              {user.role === "L1" && (
                <Button variant="quiet" block onClick={() => setSheet("held")}>
                  Rilis held money manual
                </Button>
              )}
              {user.role !== "ADMIN" && (
                <Button variant="quiet" block onClick={() => setSheet("adjust")}>
                  Buat penyesuaian
                </Button>
              )}
              {user.status === "ACTIVE" ? (
                <Button variant="danger" block onClick={() => setSheet("suspend")}>
                  Tangguhkan akun
                </Button>
              ) : user.status === "SUSPENDED" ? (
                <Button
                  variant="quiet"
                  block
                  onClick={() =>
                    void run(() => setStatus({ userId: user.id, status: "ACTIVE" }), "Akun aktif")
                  }
                >
                  Aktifkan kembali
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <Sheet
        open={sheet === "edit"}
        onClose={() => setSheet(null)}
        title="Ubah data"
        footer={
          <Button
            block
            disabled={busy || !form.name.trim() || !form.email.trim()}
            onClick={() =>
              void run(() => updateUser({ userId: user.id, ...form }), "Data diperbarui")
            }
          >
            Simpan
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Nama">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field
            label="Email"
            hint={
              form.email.trim().toLowerCase() !== user.email
                ? "Login berikutnya pakai email baru."
                : undefined
            }
          >
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Nomor HP">
            <Input
              type="tel"
              inputMode="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "suspend"}
        onClose={() => setSheet(null)}
        title="Tangguhkan akun"
        footer={
          <Button
            variant="danger"
            block
            disabled={busy || !reason.trim()}
            onClick={() =>
              void run(
                () => setStatus({ userId: user.id, status: "SUSPENDED", reason }),
                "Akun ditangguhkan",
              )
            }
          >
            Tangguhkan
          </Button>
        }
      >
        <Field label="Alasan" hint="Tercatat di audit log.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Sheet>

      <Sheet
        open={sheet === "held"}
        onClose={() => setSheet(null)}
        title="Rilis held money"
        footer={
          <Button
            block
            disabled={busy || !reason.trim()}
            onClick={() =>
              void run(
                () =>
                  releaseHeld({
                    l1Id: user.id,
                    amount: amount ? Number(amount) : undefined,
                    reason,
                  }),
                "Held money dirilis",
              )
            }
          >
            Rilis
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Jumlah" hint={`Kosongkan untuk merilis semua (${fmt(user.heldBalance)}).`}>
            <Input
              inputMode="numeric"
              className="num"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Alasan">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "adjust"}
        onClose={() => setSheet(null)}
        title="Penyesuaian"
        footer={
          <Button
            block
            disabled={busy || !reason.trim() || !amount}
            onClick={() =>
              void run(
                () =>
                  createAdjustment({
                    userId: user.id,
                    period: currentPeriod(),
                    type: "MANUAL",
                    amount: Number(amount),
                    reason,
                  }),
                "Penyesuaian dibuat",
              )
            }
          >
            Simpan
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Jumlah" hint="Boleh negatif.">
            <Input
              inputMode="numeric"
              className="num"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))}
            />
          </Field>
          <Field label="Alasan">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </AppShell>
  );
}

function L1Section({ userId }: { userId: Id<"users"> }) {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.performance.adminMember, { l1Id: userId, now });
  if (data === undefined) return <Loading rows={4} />;
  if (data === null) return null;
  return <L1Performance data={data} />;
}

function L2Section({ userId }: { userId: Id<"users"> }) {
  const now = useMemo(() => Date.now(), []);
  const team = useQuery(api.performance.adminTeam, { l2Id: userId, now });
  const fmt = useMoney();
  if (!team) return <Loading rows={4} />;
  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat
            label="Pelanggan baru"
            value={team.totals.activations}
            sub={`sisa ${team.daysLeft} hari`}
          />
          <Stat label="Omzet tim" value={fmt(team.totals.gross)} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-line">
          <Stat
            label="Diam ≥7 hari"
            value={team.totals.idle}
            tone={team.totals.idle > 0 ? "warn" : "default"}
          />
          <Stat
            label="Berisiko COLD"
            value={team.totals.atRisk}
            tone={team.totals.atRisk > 0 ? "warn" : "default"}
          />
        </div>
      </Card>
      <div>
        <SectionTitle>{`Tim (${team.members.length})`}</SectionTitle>
        <Card>
          {team.members.length === 0 ? (
            <Row label="Belum ada L1" tone="mute" />
          ) : (
            team.members.map((m) => (
              <TeamMemberRow
                key={m.id}
                member={m}
                special={m.specialCommission}
                href={`/admin/pengguna/${m.id}`}
              />
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
