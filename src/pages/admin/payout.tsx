import { useMutation, useQuery } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { downloadCsv, errorMessage } from "@/lib/utils";

type Tab = "SCHEDULED" | "PAID" | "FAILED";

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
  const lines = useQuery(api.payouts.adminList, { status: tab, role });
  const runPayouts = useMutation(api.payouts.runPayouts);
  const markPaid = useMutation(api.payouts.markPaid);
  const toast = useToast();
  const fmt = useMoney();

  const [selected, setSelected] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = lines?.find((l) => l.id === selected);
  const total = lines?.reduce((sum, l) => sum + l.payable, 0) ?? 0;

  return (
    <AppShell
      title="Payout"
      action={
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
                { key: "bank", label: "Rekening" },
                { key: "accountName", label: "Atas nama" },
              ],
              lines,
            )
          }
          className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
        >
          <Download className="h-5 w-5" />
        </button>
      }
    >
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
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
              onClick={() => setRole(option)}
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
      ) : (
        <Card>
          {lines.map((line) => (
            <Row
              key={line.id}
              label={line.userName}
              sub={`${line.role} · ${periodLabel(line.period)} · ${date(line.payoutDate)}`}
              value={fmt(line.payable)}
              valueSub={line.bank ?? "rekening kosong"}
              onClick={() => setSelected(line.id)}
            />
          ))}
          <Row label="Total" value={fmt(total)} />
        </Card>
      )}

      <Sheet
        open={!!active}
        onClose={() => setSelected(null)}
        title={active?.userName ?? ""}
        footer={
          active?.status === "SCHEDULED" ? (
            <div className="flex gap-2">
              <Button
                block
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await markPaid({ payoutId: active.id as Id<"payoutLines">, status: "PAID" });
                    toast("Ditandai dibayar");
                    setSelected(null);
                  } catch (err) {
                    toast(errorMessage(err), "warn");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Tandai dibayar
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await markPaid({
                      payoutId: active.id as Id<"payoutLines">,
                      status: "FAILED",
                      reason: "Transfer gagal",
                    });
                    toast("Ditandai gagal");
                    setSelected(null);
                  } catch (err) {
                    toast(errorMessage(err), "warn");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Gagal
              </Button>
            </div>
          ) : undefined
        }
      >
        {active && (
          <div className="space-y-4">
            <div>
              <p className="eyebrow">{periodLabel(active.period)}</p>
              <p className="num mt-1 text-[28px] font-semibold">{fmt(active.payable)}</p>
            </div>
            <dl className="space-y-1.5 text-[14px]">
              <Line label="Gross" value={fmt(active.gross)} />
              <Line label="Jaminan" value={fmt(active.jaminan)} />
              <Line label="Held" value={`-${fmt(active.held)}`} />
              <Line label="Held dirilis" value={fmt(active.releasedHeld)} />
              <Line label="Penyesuaian" value={fmt(active.adjustment)} />
            </dl>
            <div className="rounded border border-line p-3 text-[14px]">
              <p className="font-medium">{active.bank ?? "Rekening belum diisi"}</p>
              {active.accountName && (
                <p className="mt-0.5 text-ink-mute">{active.accountName}</p>
              )}
            </div>
            <Pill
              tone={
                active.status === "PAID" ? "good" : active.status === "FAILED" ? "warn" : "accent"
              }
            >
              {active.status}
            </Pill>
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

function Line({ label, value }: { label: string; value: string }) {
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
          Payout berjalan otomatis sesuai jadwal. Gunakan ini untuk menjalankan ulang periode.
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
