import { useConvex, useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, SectionTitle, Stat } from "@/components/ui/Card";
import { Loading, Pill, useToast } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { currentPeriod, date, dateShort, periodLabel } from "@/lib/format";
import { downloadPayoutPdf, type PayoutLine } from "@/lib/payoutPdf";
import { useMoney } from "@/lib/useMoney";
import { cn, errorMessage } from "@/lib/utils";

export default function PenghasilanPage() {
  return (
    <Guard role="L1">
      <AppShell title="Komisi">
        <Body />
      </AppShell>
    </Guard>
  );
}

type PayoutRow = {
  id: Id<"payoutLines">;
  period: string;
  frequency: "WEEKLY" | "MONTHLY";
  payoutDate: number;
  status: "SCHEDULED" | "PAID" | "FAILED";
  acquisitions: number;
  newSales: number;
  recurring: number;
  renewal: number;
  subtotal: number;
  jaminan: number;
  held: number;
  releasedHeld: number;
  adjustment: number;
  payable: number;
};

const STATUS = {
  PAID: { label: "Dibayar", tone: "good" },
  SCHEDULED: { label: "Dijadwalkan", tone: "accent" },
  FAILED: { label: "Gagal", tone: "warn" },
} as const;

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function Body() {
  const now = useMemo(() => Date.now(), []);
  const fmt = useMoney();
  const me = useQuery(api.users.me);
  const week = useQuery(api.earnings.week, { now });
  const summary = useQuery(api.earnings.summary, { now });
  const settings = useQuery(api.settings.forL1, {});
  const weekly = useQuery(api.payouts.history, { frequency: "WEEKLY", limit: 10 });
  const monthly = useQuery(api.payouts.history, { frequency: "MONTHLY", limit: 12 });

  const frequency = settings?.myFrequency ?? "WEEKLY";
  const latest = (frequency === "WEEKLY" ? weekly : monthly)?.find(
    (row) => row.status !== "FAILED",
  );

  if (!week || !summary || !weekly || !monthly) return <Loading rows={4} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Stat
            label="Minggu ini"
            value={fmt(week.amount)}
            sub={`${week.count} penjualan terverifikasi`}
          />
        </Card>
        <Card>
          <Stat
            label="Bulan ini"
            value={fmt(summary.thisMonth.gross)}
            sub={periodLabel(currentPeriod(now))}
          />
        </Card>
        <Card>
          <Stat
            label="Menunggu verifikasi"
            value={fmt(summary.pending)}
            tone={summary.pending > 0 ? "warn" : "default"}
            sub={
              me?.payoutProfileCompleted
                ? "Masuk payout setelah diverifikasi"
                : "Isi nomor DANA di Profil"
            }
          />
        </Card>
        <Card>
          <Stat
            label={latest?.status === "SCHEDULED" ? "Payout berikutnya" : "Payout terakhir"}
            value={latest ? fmt(latest.payable) : "—"}
            sub={
              latest
                ? `${date(latest.payoutDate)} · ${latest.frequency === "WEEKLY" ? "mingguan" : "bulanan"}`
                : "Belum ada payout"
            }
          />
        </Card>
      </div>

      <div>
        <SectionTitle helper="Payout mingguan dijalankan tiap Rabu untuk minggu sebelumnya.">
          Riwayat mingguan
        </SectionTitle>
        {weekly.length === 0 ? (
          <Card className="px-4 py-8 text-center text-[13px] text-ink-mute">
            Belum ada payout mingguan.
          </Card>
        ) : (
          <div className="space-y-3">
            {weekly.map((row) => (
              <PayoutCard
                key={row.id}
                row={row}
                agentName={me?.name ?? "Agen"}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle helper="Payout bulanan memakai frekuensi bulanan jika diaktifkan admin.">
          Riwayat bulanan
        </SectionTitle>
        {monthly.length === 0 ? (
          <Card className="px-4 py-8 text-center text-[13px] text-ink-mute">
            {frequency === "MONTHLY"
              ? "Belum ada payout bulanan."
              : "Belum ada payout bulanan. Payout Anda berjalan mingguan."}
          </Card>
        ) : (
          <div className="space-y-3">
            {monthly.map((row) => (
              <PayoutCard
                key={row.id}
                row={row}
                agentName={me?.name ?? "Agen"}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-ink-faint">
        Payout berikutnya:{" "}
        {frequency === "WEEKLY"
          ? `setiap ${DAYS[settings?.payout.weeklyPayDay ?? 3] ?? "Rabu"}`
          : `tanggal ${settings?.payout.monthlyPayDay ?? 5}`}
        . Semua angka berasal dari data payout yang tersimpan.
      </p>
    </div>
  );
}

function PayoutCard({
  row,
  agentName,
  fmt,
}: {
  row: PayoutRow;
  agentName: string;
  fmt: (value: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const convex = useConvex();
  const toast = useToast();
  const detail = useQuery(
    api.payouts.historyDetail,
    open ? { lineId: row.id } : "skip",
  );
  const status = STATUS[row.status];

  async function download() {
    setDownloading(true);
    try {
      const lines =
        detail ??
        (await convex.query(api.payouts.historyDetail, { lineId: row.id }));
      await downloadPayoutPdf(row, lines as PayoutLine[], agentName);
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">{periodLabel(row.period)}</div>
          <div className="mt-0.5 text-[13px] text-ink-mute">
            {date(row.payoutDate)} · {row.acquisitions} penjualan baru
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[18px] font-semibold">{fmt(row.payable)}</div>
          <div className="mt-1">
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-black/[0.015] px-4 py-2.5">
        <dl className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
          <div className="flex gap-1.5">
            <dt className="text-ink-mute">Penjualan</dt>
            <dd className="num font-semibold">{fmt(row.newSales)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-mute">Berulang</dt>
            <dd className="num font-semibold">{fmt(row.recurring)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-mute">Insentif</dt>
            <dd className="num font-semibold">{fmt(row.renewal)}</dd>
          </div>
        </dl>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading}
            aria-label="Unduh PDF payout"
            className="rounded p-2 text-ink-mute hover:bg-black/[0.04] disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Tutup rincian" : "Buka rincian"}
            className="rounded p-2 text-ink-mute hover:bg-black/[0.04]"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px]">
            <Breakdown label="Subtotal" value={fmt(row.subtotal)} />
            <Breakdown label="Jaminan" value={fmt(row.jaminan)} />
            <Breakdown label="Ditahan" value={row.held > 0 ? `-${fmt(row.held)}` : "0"} />
            <Breakdown label="Jaminan dilepas" value={fmt(row.releasedHeld)} />
            {row.adjustment !== 0 && (
              <Breakdown label="Penyesuaian" value={fmt(row.adjustment)} />
            )}
            <Breakdown label="Dibayar" value={fmt(row.payable)} bold />
          </dl>

          <div className="border-t border-line">
            {!detail ? (
              <Loading rows={2} />
            ) : detail.length === 0 ? (
              <p className="px-4 py-5 text-center text-[13px] text-ink-mute">
                Tidak ada rincian tersimpan.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {detail.map((line) => (
                  <li key={line.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">
                        {line.customerName ?? "—"}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-mute">
                        {dateShort(line.date)} · {line.planName ?? "—"}
                        {line.code ? ` · ${line.code}` : ""}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[13.5px] font-semibold">
                      {fmt(line.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Breakdown({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-mute">{label}</dt>
      <dd className={cn("num", bold && "font-semibold")}>{value}</dd>
    </div>
  );
}
