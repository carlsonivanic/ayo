import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { currentPeriod, date, percent, shiftPeriod } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { downloadCsv } from "@/lib/utils";

type Tab = "l1" | "l2" | "held" | "jaminan" | "penyesuaian";

export default function KomisiPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

const TYPE_LABEL: Record<string, string> = {
  NEW_SALES: "Penjualan baru",
  RECURRING: "Perpanjangan",
  RENEWAL_INCENTIVE: "Insentif 2%",
  JAMINAN: "Jaminan",
  ADJUSTMENT: "Penyesuaian",
};

function Body() {
  const [tab, setTab] = useState<Tab>("l1");
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(), -1));
  const fmt = useMoney();

  const ledger = useQuery(api.admin.reports.commissionLedger, tab === "l1" ? { period } : "skip");
  const l2 = useQuery(api.admin.reports.l2Commission, tab === "l2" ? { period } : "skip");
  const held = useQuery(api.admin.reports.heldReport, tab === "held" ? { period } : "skip");
  const jaminan = useQuery(api.admin.reports.jaminanReport, tab === "jaminan" ? { period } : "skip");
  const adjustments = useQuery(
    api.admin.reports.adjustmentsReport,
    tab === "penyesuaian" ? { period } : "skip",
  );

  function exportCurrent() {
    if (tab === "l1" && ledger) {
      downloadCsv(
        `komisi-l1-${period}.csv`,
        [
          { key: "date", label: "Tanggal" },
          { key: "agent", label: "Agen" },
          { key: "type", label: "Jenis" },
          { key: "store", label: "Toko" },
          { key: "amount", label: "Jumlah" },
          { key: "status", label: "Status" },
        ],
        ledger.map((l) => ({ ...l, date: date(l.date) })),
      );
    }
    if (tab === "l2" && l2) {
      downloadCsv(
        `komisi-l2-${period}.csv`,
        [
          { key: "l2", label: "L2" },
          { key: "l1", label: "L1" },
          { key: "tenureMonth", label: "Bulan ke" },
          { key: "stage", label: "Tahap" },
          { key: "l1Gross", label: "Gross L1" },
          { key: "effectiveFeePercent", label: "Fee %" },
          { key: "l2Fee", label: "Fee L2" },
        ],
        l2,
      );
    }
  }

  return (
    <AppShell
      title="Komisi"
      action={
        <button
          onClick={exportCurrent}
          aria-label="Unduh CSV"
          className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
        >
          <Download className="h-5 w-5" />
        </button>
      }
    >
      <div className="mb-4 flex justify-end">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "l1", label: "L1" },
          { value: "l2", label: "L2" },
          { value: "held", label: "Held" },
          { value: "jaminan", label: "Jaminan" },
          { value: "penyesuaian", label: "Penyesuaian" },
        ]}
      />

      {tab === "l1" &&
        (!ledger ? (
          <Loading rows={6} />
        ) : ledger.length === 0 ? (
          <Empty title="Tidak ada komisi di periode ini." />
        ) : (
          <Card>
            {ledger.map((line) => (
              <Row
                key={line.id}
                label={line.agent}
                sub={`${TYPE_LABEL[line.type] ?? line.type}${line.store ? ` · ${line.store}` : ""} · ${date(line.date)}`}
                value={fmt(line.amount)}
                valueSub={
                  line.status === "PENDING" ? (
                    <Pill tone="accent">Pending</Pill>
                  ) : line.frozen ? (
                    <Pill tone="warn">Beku</Pill>
                  ) : undefined
                }
              />
            ))}
          </Card>
        ))}

      {tab === "l2" &&
        (!l2 ? (
          <Loading rows={6} />
        ) : l2.length === 0 ? (
          <Empty title="Belum ada fee L2 di periode ini." />
        ) : (
          <Card>
            {l2.map((line) => (
              <Row
                key={line.id}
                label={`${line.l2} ← ${line.l1}`}
                sub={`Bulan ke-${line.tenureMonth} · ${line.stage} · ${percent(line.effectiveFeePercent)} dari ${fmt(line.l1Gross)}`}
                value={fmt(line.l2Fee)}
              />
            ))}
          </Card>
        ))}

      {tab === "held" &&
        (!held ? (
          <Loading rows={5} />
        ) : held.length === 0 ? (
          <Empty title="Tidak ada held di periode ini." />
        ) : (
          <Card>
            {held.map((row) => (
              <Row
                key={row.id}
                label={row.agent}
                sub={`${row.heldPercent}% dari ${fmt(row.gross)}`}
                value={fmt(row.heldAmount)}
                valueSub={
                  row.releasedAmount > 0 ? `dirilis ${fmt(row.releasedAmount)}` : undefined
                }
                tone="warn"
              />
            ))}
          </Card>
        ))}

      {tab === "jaminan" &&
        (!jaminan ? (
          <Loading rows={4} />
        ) : jaminan.length === 0 ? (
          <Empty title="Tidak ada jaminan di periode ini." />
        ) : (
          <Card>
            {jaminan.map((row, index) => (
              <Row
                key={index}
                label={row.agent}
                sub={`Bulan ke-${row.tenureMonth} · ${row.activations} akuisisi · gross ${fmt(row.gross)}`}
                value={fmt(row.jaminan)}
                tone="good"
              />
            ))}
          </Card>
        ))}

      {tab === "penyesuaian" &&
        (!adjustments ? (
          <Loading rows={4} />
        ) : adjustments.length === 0 ? (
          <Empty title="Tidak ada penyesuaian." />
        ) : (
          <Card>
            {adjustments.map((row) => (
              <Row
                key={row.id}
                label={row.user}
                sub={`${row.type} · ${row.reason}`}
                value={fmt(row.amount)}
                valueSub={row.consumed ? "sudah dibayar" : "menunggu payout"}
                tone={row.amount < 0 ? "warn" : "good"}
              />
            ))}
          </Card>
        ))}
    </AppShell>
  );
}
