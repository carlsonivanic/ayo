import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateShort } from "@/lib/format";
import { Pill } from "./ui/Feedback";

// One table for both real customers and "calon" (a link with a name on it that
// nobody has paid yet). Five columns, all sortable, because an agent checks this
// page for one of two reasons: who expires next, and who still owes money.

export type CustomerRow = {
  kind: "customer" | "calon";
  id: string;
  merchantId: string | null;
  token: string | null;
  name: string;
  storeName: string | null;
  registeredAt: number;
  status: "AKTIF" | "SEGERA" | "KEDALUWARSA" | "LIFETIME" | "CALON";
  planName: string;
  paymentState: "TERVERIFIKASI" | "MENUNGGU";
  phone: string | null;
  expiresAt: number | null;
};

type SortKey = "registeredAt" | "status" | "name" | "planName" | "paymentState";

const STATUS: Record<
  CustomerRow["status"],
  { label: string; tone: "good" | "warn" | "neutral" | "ink" | "accent"; order: number }
> = {
  AKTIF: { label: "Aktif", tone: "good", order: 0 },
  SEGERA: { label: "Segera berakhir", tone: "warn", order: 1 },
  KEDALUWARSA: { label: "Kedaluwarsa", tone: "neutral", order: 2 },
  LIFETIME: { label: "Lifetime", tone: "ink", order: 3 },
  CALON: { label: "Calon", tone: "accent", order: 4 },
};

const PAYMENT: Record<
  CustomerRow["paymentState"],
  { label: string; tone: "good" | "accent"; order: number }
> = {
  TERVERIFIKASI: { label: "Terverifikasi", tone: "good", order: 0 },
  MENUNGGU: { label: "Menunggu", tone: "accent", order: 1 },
};

function sortValue(row: CustomerRow, key: SortKey): number | string {
  switch (key) {
    case "registeredAt":
      return row.registeredAt;
    case "status":
      return STATUS[row.status].order;
    case "paymentState":
      return PAYMENT[row.paymentState].order;
    case "name":
      return row.name.toLowerCase();
    case "planName":
      return row.planName.toLowerCase();
  }
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "registeredAt", label: "Daftar" },
  { key: "status", label: "Status" },
  { key: "name", label: "Nama", className: "min-w-[10rem]" },
  { key: "planName", label: "Paket" },
  { key: "paymentState", label: "Pembayaran" },
];

export function CustomerTable({
  rows,
  compact = false,
  onSelect,
  emptyLabel = "Belum ada pelanggan.",
}: {
  rows: CustomerRow[];
  compact?: boolean;
  onSelect: (row: CustomerRow) => void;
  emptyLabel?: string;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "registeredAt",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = sortValue(a, sort.key);
      const right = sortValue(b, sort.key);
      const compared =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "id");
      return sort.dir === "asc" ? compared : -compared;
    });
    return copy;
  }, [rows, sort]);

  const shown = compact ? sorted.slice(0, 10) : sorted;

  const toggle = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "registeredAt" ? "desc" : "asc" },
    );

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[13px] text-ink-mute">{emptyLabel}</div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", compact && "max-h-[26rem] overflow-y-auto")}>
      <table className="w-full min-w-[32rem] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line">
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-faint"
                >
                  <button
                    type="button"
                    onClick={() => toggle(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-ink-soft",
                      active && "text-ink",
                    )}
                  >
                    {column.label}
                    {active &&
                      (sort.dir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const status = STATUS[row.status];
            const payment = PAYMENT[row.paymentState];
            return (
              <tr
                key={`${row.kind}:${row.id}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row);
                  }
                }}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-black/[0.02]"
              >
                <td className="num whitespace-nowrap px-3 py-2.5 text-ink-soft">
                  {dateShort(row.registeredAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Pill tone={status.tone}>{status.label}</Pill>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-medium">{row.name}</span>
                  {row.storeName && row.storeName !== row.name && (
                    <span className="block truncate text-[12px] text-ink-faint">
                      {row.storeName}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{row.planName}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Pill tone={payment.tone}>{payment.label}</Pill>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
