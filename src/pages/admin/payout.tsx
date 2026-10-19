import { useMutation, useQuery } from "convex/react";
import { ClipboardList, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date, dateTime, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { copy, downloadCsv, errorMessage } from "@/lib/utils";

type Tab = "SCHEDULED" | "PAID" | "FAILED";
type Line = NonNullable<ReturnType<typeof useLines>>[number];

function useLines(status: Tab, role: "L1" | "L2" | undefined) {
  return useQuery(api.payouts.adminList, { status, role });
}

export default function AdminPayoutPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const [tab, setTab] = useState<Tab>("SCHEDULED");
  const [role, setRole] = useState<"L1" | "L2" | undefined>(undefined);
  const lines = useLines(tab, role);
  const summary = useQuery(api.payouts.summary);
  const missing = useQuery(api.payouts.missingProfiles);
  const runPayouts = useMutation(api.payouts.runPayouts);
  const markPaid = useMutation(api.payouts.markPaid);
  const markPaidMany = useMutation(api.payouts.markPaidMany);
  const reopen = useMutation(api.payouts.reopen);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [runOpen, setRunOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = lines?.find((l) => l.id === selected);
  const total = lines?.reduce((sum, l) => sum + l.payable, 0) ?? 0;
  const picked = lines?.filter((l) => checked.has(l.id)) ?? [];
  const groups = useMemo(() => groupByDate(lines ?? []), [lines]);

  async function act(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      toast(done);
      setSelected(null);
      setNote("");
      setChecked(new Set());
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  return (
    <AppShell
      title="Payout"
      action={
        <div className="flex">
          <button
            aria-label="Salin daftar"
            onClick={async () => {
              if (!lines?.length) return;
              const text = lines
                .map((l) => `${l.userName}\t${l.accountNumber ?? "-"}\t${Math.round(l.payable)}`)
                .join("\n");
              if (await copy(text)) toast("Daftar disalin");
            }}
            className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
          >
            <ClipboardList className="h-5 w-5" />
          </button>
          <button
            aria-label="Unduh CSV"
            onClick={() =>
              lines &&
              downloadCsv(
                `payout-${tab.toLowerCase()}.csv`,
                [
                  { key: "userName", label: "Nama" },
                  { key: "role", label: "Peran" },
                  { key: "period", label: "Periode" },
                  { key: "gross", label: "Gross" },
                  { key: "jaminan", label: "Jaminan" },
                  { key: "held", label: "Held" },
                  { key: "releasedHeld", label: "Held dirilis" },
                  { key: "adjustment", label: "Penyesuaian" },
                  { key: "payable", label: "Dibayar" },
                  { key: "bankName", label: "Bank" },
                  { key: "accountNumber", label: "Nomor" },
                  { key: "accountName", label: "Atas nama" },
                  { key: "note", label: "Catatan" },
                ],
                lines,
              )
            }
            className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      }
    >
      {summary && (
        <Card className="mb-5 grid grid-cols-2 sm:grid-cols-3">
          <Stat
            label="Bayar minggu ini"
            value={fmt(summary.due.total)}
            sub={
              summary.due.overdue
                ? `${summary.due.count} orang · ${summary.due.overdue} terlambat`
                : `${summary.due.count} orang`
            }
            tone={summary.due.overdue ? "warn" : "default"}
          />
          <Stat
            label="Sudah dibayar"
            value={fmt(summary.paidThisWeek.total)}
            sub={`${summary.paidThisWeek.count} orang`}
            tone="good"
          />
          <Stat
            label="Berikutnya"
            value={fmt(summary.later.total)}
            sub={`${summary.later.count} orang`}
          />
        </Card>
      )}

      <Tabs<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setChecked(new Set());
        }}
        options={[
          { value: "SCHEDULED", label: "Terjadwal" },
          { value: "PAID", label: "Dibayar" },
          { value: "FAILED", label: "Gagal" },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {([undefined, "L1", "L2"] as const).map((option) => (
            <button
              key={option ?? "all"}
              onClick={() => {
                setRole(option);
                setChecked(new Set());
              }}
              className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                role === option ? "bg-ink text-white" : "bg-black/[0.04] text-ink-soft"
              }`}
            >
              {option ?? "Semua"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="quiet" onClick={() => setRunOpen(true)}>
          Jalankan payout
        </Button>
      </div>

      {!lines ? (
        <Loading rows={5} />
      ) : lines.length === 0 ? (
        <Empty title="Tidak ada payout di status ini." />
      ) : tab === "SCHEDULED" ? (
        <div className="space-y-5">
          {groups.map((group) => {
            const ready = group.lines.filter((l) => l.ready);
            const allChecked = ready.length > 0 && ready.every((l) => checked.has(l.id));
            return (
              <div key={group.day}>
                <SectionTitle
                  action={
                    <span className="num text-[13px] text-ink-mute">
                      {group.lines.length} · {fmt(group.total)}
                    </span>
                  }
                >
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-ink"
                      checked={allChecked}
                      disabled={ready.length === 0}
                      onChange={() => {
                        const next = new Set(checked);
                        for (const l of ready) {
                          if (allChecked) next.delete(l.id);
                          else next.add(l.id);
                        }
                        setChecked(next);
                      }}
                    />
                    {date(group.day)}
                    {group.day < startOfToday() && <Pill tone="warn">Terlambat</Pill>}
                  </label>
                </SectionTitle>
                <Card>
                  {group.lines.map((line) => (
                    <PayoutRow
                      key={line.id}
                      line={line}
                      amount={fmt(line.payable)}
                      checked={checked.has(line.id)}
                      onCheck={() => toggle(line.id)}
                      onOpen={() => setSelected(line.id)}
                    />
                  ))}
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          {lines.map((line) => (
            <Row
              key={line.id}
              label={line.userName}
              sub={`${line.role} · ${periodLabel(line.period)}${line.note ? ` · ${line.note}` : ""}`}
              value={fmt(line.payable)}
              valueSub={tab === "PAID" ? dateTime(line.paidAt) : date(line.payoutDate)}
              onClick={() => setSelected(line.id)}
            />
          ))}
          <Row label="Total" value={fmt(total)} />
        </Card>
      )}

      {tab === "SCHEDULED" && missing && missing.length > 0 && (
        <div className="mt-6">
          <SectionTitle helper="Payout tertahan sampai nomor DANA diisi.">
            Belum isi DANA
          </SectionTitle>
          <Card>
            {missing.map((m) => (
              <Row
                key={m.userId}
                label={m.name}
                sub={`${m.role}${m.mobile ? ` · ${m.mobile}` : ""}`}
                value={m.owed ? fmt(m.owed) : undefined}
                tone="warn"
                href={`/admin/pengguna/${m.userId}`}
              />
            ))}
          </Card>
        </div>
      )}

      {picked.length > 0 && (
        <div className="sticky bottom-[84px] z-20 mt-4 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-lg bg-ink px-4 py-3 text-white shadow-lift">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] opacity-70">{picked.length} dipilih</p>
              <p className="num text-[17px] font-semibold">
                {fmt(picked.reduce((s, l) => s + l.payable, 0))}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setChecked(new Set())}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                act(
                  () =>
                    markPaidMany({
                      payoutIds: picked.map((l) => l.id as Id<"payoutLines">),
                    }),
                  `${picked.length} ditandai dibayar`,
                )
              }
            >
              Tandai dibayar
            </Button>
          </div>
        </div>
      )}

      <Sheet
        open={!!active}
        onClose={() => {
          setSelected(null);
          setNote("");
        }}
        title={active?.userName ?? ""}
        footer={
          !active ? undefined : active.status === "SCHEDULED" ? (
            <div className="flex gap-2">
              <Button
                block
                disabled={busy || !active.ready}
                onClick={() =>
                  act(
                    () =>
                      markPaid({
                        payoutId: active.id as Id<"payoutLines">,
                        status: "PAID",
                        reason: note,
                      }),
                    "Ditandai dibayar",
                  )
                }
              >
                Tandai dibayar
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      markPaid({
                        payoutId: active.id as Id<"payoutLines">,
                        status: "FAILED",
                        reason: note || "Transfer gagal",
                      }),
                    "Ditandai gagal",
                  )
                }
              >
                Gagal
              </Button>
            </div>
          ) : (
            <Button
              block
              variant="quiet"
              disabled={busy}
              onClick={() =>
                act(
                  () => reopen({ payoutId: active.id as Id<"payoutLines"> }),
                  "Dikembalikan ke terjadwal",
                )
              }
            >
              {active.status === "FAILED" ? "Coba bayar lagi" : "Batalkan tanda dibayar"}
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">
                  {active.role} · {periodLabel(active.period)}
                </p>
                <p className="num mt-1 text-[28px] font-semibold">{fmt(active.payable)}</p>
              </div>
              <Pill
                tone={
                  active.status === "PAID" ? "good" : active.status === "FAILED" ? "warn" : "accent"
                }
              >
                {active.status}
              </Pill>
            </div>
            <dl className="space-y-1.5 text-[14px]">
              <LineItem label="Gross" value={fmt(active.gross)} />
              <LineItem label="Jaminan" value={fmt(active.jaminan)} />
              <LineItem label="Held" value={`-${fmt(active.held)}`} />
              <LineItem label="Held dirilis" value={fmt(active.releasedHeld)} />
              <LineItem label="Penyesuaian" value={fmt(active.adjustment)} />
            </dl>
            <div className="space-y-2 rounded border border-line p-3 text-[14px]">
              {active.ready ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">DANA</span>
                    <CopyButton value={active.accountNumber!} label="nomor DANA" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">Jumlah</span>
                    <CopyButton
                      value={fmt(active.payable)}
                      text={String(Math.round(active.payable))}
                      label="jumlah"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-mute">Atas nama</span>
                    <span className="font-medium">{active.accountName}</span>
                  </div>
                </>
              ) : (
                <p className="text-warn">
                  Nomor DANA belum diisi.{" "}
                  <a className="underline" href={`/admin/pengguna/${active.userId}`}>
                    Isi sekarang
                  </a>
                </p>
              )}
            </div>
            {active.status === "SCHEDULED" ? (
              <Field label="Catatan" hint="Opsional — mis. ID transaksi DANA.">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            ) : (
              <dl className="space-y-1.5 text-[14px]">
                {active.paidAt && <LineItem label="Dibayar" value={dateTime(active.paidAt)} />}
                {active.note && <LineItem label="Catatan" value={active.note} />}
              </dl>
            )}
          </div>
        )}
      </Sheet>

      <RunSheet
        open={runOpen}
        onClose={() => setRunOpen(false)}
        onRun={async (scope) => {
          try {
            const result = await runPayouts({ scope });
            toast(`${result.created} payout dibuat`);
            setRunOpen(false);
          } catch (err) {
            toast(errorMessage(err), "warn");
          }
        }}
      />
    </AppShell>
  );
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupByDate(lines: Line[]) {
  const map = new Map<number, Line[]>();
  for (const line of lines) {
    const d = new Date(line.payoutDate);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    map.set(day, [...(map.get(day) ?? []), line]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, rows]) => ({
      day,
      lines: rows,
      total: rows.reduce((s, l) => s + l.payable, 0),
    }));
}

function PayoutRow({
  line,
  amount,
  checked,
  onCheck,
  onOpen,
}: {
  line: Line;
  amount: string;
  checked: boolean;
  onCheck: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <input
        type="checkbox"
        aria-label={`Pilih ${line.userName}`}
        className="h-4 w-4 shrink-0 accent-ink"
        checked={checked}
        disabled={!line.ready}
        onChange={onCheck}
      />
      <button type="button" onClick={onOpen} className="press min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] font-medium">{line.userName}</div>
        <div className="mt-0.5 truncate text-[13px] text-ink-mute">
          {line.role} · {periodLabel(line.period)}
        </div>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <CopyButton value={amount} text={String(Math.round(line.payable))} label="jumlah" />
        {line.ready ? (
          <CopyButton value={line.accountNumber!} label="nomor DANA" />
        ) : (
          <Pill tone="warn">DANA kosong</Pill>
        )}
      </div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function RunSheet({
  open,
  onClose,
  onRun,
}: {
  open: boolean;
  onClose: () => void;
  onRun: (scope: "L1_WEEKLY" | "L1_MONTHLY" | "L2") => Promise<void>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Jalankan payout">
      <div className="space-y-3">
        <p className="text-[14px] text-ink-mute">
          Daftar payout dibuat otomatis sesuai jadwal. Transfer tetap manual.
        </p>
        <Button block variant="quiet" onClick={() => void onRun("L1_WEEKLY")}>
          L1 mingguan
        </Button>
        <Button block variant="quiet" onClick={() => void onRun("L1_MONTHLY")}>
          L1 bulanan
        </Button>
        <Button block variant="quiet" onClick={() => void onRun("L2")}>
          L2 bulanan
        </Button>
      </div>
    </Sheet>
  );
}
