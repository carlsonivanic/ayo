import { date, money, periodLabel } from "@/lib/format";

// One PDF per payout card. It prints exactly what was stored on the payout row
// and the lines it carried — never a recalculation. If the ledger and this
// document disagree, the ledger is wrong.

export type PayoutSummary = {
  period: string;
  frequency: "WEEKLY" | "MONTHLY";
  payoutDate: number;
  status: string;
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

export type PayoutLine = {
  date: number;
  type: string;
  amount: number;
  code: string | null;
  customerName: string | null;
  planName: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  NEW_SALES: "Penjualan baru",
  RECURRING: "Berulang",
  RENEWAL_INCENTIVE: "Insentif",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Dijadwalkan",
  PAID: "Dibayar",
  FAILED: "Gagal",
};

function periodText(row: PayoutSummary): string {
  return periodLabel(row.period);
}

export async function downloadPayoutPdf(
  row: PayoutSummary,
  lines: PayoutLine[],
  agentName: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const left = 16;
  const right = 194;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AYO", left, y);
  doc.setFontSize(12);
  doc.text("Bukti payout komisi", left, (y += 7));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 8;
  doc.text(agentName, left, y);
  doc.text(
    `${row.frequency === "WEEKLY" ? "Mingguan" : "Bulanan"} · ${periodText(row)}`,
    left,
    (y += 5),
  );
  doc.text(
    `Tanggal payout ${date(row.payoutDate)} · ${STATUS_LABEL[row.status] ?? row.status}`,
    left,
    (y += 5),
  );

  y += 9;
  doc.setDrawColor(220);
  doc.line(left, y, right, y);
  y += 7;

  const summary: [string, number, boolean][] = [
    [`Penjualan baru (${row.acquisitions})`, row.newSales, false],
    ["Komisi berulang", row.recurring, false],
    ["Insentif perpanjangan", row.renewal, false],
    ["Subtotal", row.subtotal, true],
    ["Jaminan", row.jaminan, false],
    ["Ditahan", row.held > 0 ? -row.held : 0, false],
    ["Jaminan dilepas", row.releasedHeld, false],
    ["Penyesuaian", row.adjustment, false],
  ];

  for (const [label, value, bold] of summary) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, left, y);
    doc.text(money(value), right, y, { align: "right" });
    y += 5.5;
  }

  y += 2;
  doc.setDrawColor(16, 49, 43);
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Dibayar", left, y);
  doc.text(money(row.payable), right, y, { align: "right" });

  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Rincian", left, y);
  y += 5;

  const columns = [
    { label: "Tanggal", x: left },
    { label: "Pelanggan", x: left + 24 },
    { label: "Kode", x: left + 78 },
    { label: "Paket", x: left + 112 },
    { label: "Jenis", x: left + 138 },
  ];

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    for (const column of columns) doc.text(column.label, column.x, y);
    doc.text("Jumlah", right, y, { align: "right" });
    y += 2;
    doc.setDrawColor(230);
    doc.setLineWidth(0.2);
    doc.line(left, y, right, y);
    y += 4;
  };

  header();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      y = 20;
      header();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    doc.text(date(line.date), columns[0].x, y);
    doc.text(doc.splitTextToSize(line.customerName ?? "—", 50)[0] ?? "—", columns[1].x, y);
    doc.text(line.code ?? "—", columns[2].x, y);
    doc.text(doc.splitTextToSize(line.planName ?? "—", 24)[0] ?? "—", columns[3].x, y);
    doc.text(TYPE_LABEL[line.type] ?? line.type, columns[4].x, y);
    doc.text(money(line.amount), right, y, { align: "right" });
    y += 4.6;
  }

  if (lines.length === 0) {
    doc.setTextColor(140);
    doc.text("Tidak ada rincian tersimpan untuk payout ini.", left, y);
    doc.setTextColor(0);
  }

  y += 10;
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    "Dokumen ini dicetak dari data payout yang tersimpan. Tidak ada perhitungan ulang.",
    left,
    y,
  );

  doc.save(`payout-${row.period}-${date(row.payoutDate).replace(/\s/g, "-")}.pdf`);
}
