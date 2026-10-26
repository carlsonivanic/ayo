import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CalonSheet } from "@/components/CalonSheet";
import { CustomerTable, type CustomerRow } from "@/components/CustomerTable";
import { Guard } from "@/components/Guard";
import { Card, Stat } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type Filter = "SEMUA" | "AKTIF" | "SEGERA" | "KEDALUWARSA" | "LIFETIME" | "CALON";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "SEMUA", label: "Semua" },
  { value: "AKTIF", label: "Aktif" },
  { value: "SEGERA", label: "Segera berakhir" },
  { value: "KEDALUWARSA", label: "Kedaluwarsa" },
  { value: "LIFETIME", label: "Lifetime" },
  { value: "CALON", label: "Calon" },
];

export default function PelangganPage() {
  return (
    <Guard role="L1">
      <AppShell title="Pelanggan">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const router = useRouter();
  const rows = useQuery(api.customers.table, { now });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [calon, setCalon] = useState<CustomerRow | null>(null);

  if (!rows) return <Loading rows={5} />;

  const count = (value: Filter) =>
    value === "SEMUA" ? rows.length : rows.filter((row) => row.status === value).length;

  const needle = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (filter !== "SEMUA" && row.status !== filter) return false;
    if (!needle) return true;
    return (
      row.name.toLowerCase().includes(needle) ||
      (row.storeName ?? "").toLowerCase().includes(needle) ||
      (row.phone ?? "").includes(needle)
    );
  });

  function open(row: CustomerRow) {
    if (row.kind === "calon") setCalon(row);
    else if (row.merchantId) void router.push(`/l1/pelanggan/${row.merchantId}`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-4 divide-x divide-line">
          <Stat label="Aktif" value={count("AKTIF")} />
          <Stat
            label="≤7 hari"
            value={count("SEGERA")}
            tone={count("SEGERA") > 0 ? "warn" : "default"}
          />
          <Stat label="Kedaluwarsa" value={count("KEDALUWARSA")} />
          <Stat label="Calon" value={count("CALON")} />
        </div>
      </Card>

      <Input
        placeholder="Cari nama, toko, atau nomor"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((option) => {
          const active = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-mute hover:text-ink-soft",
              )}
            >
              {option.label}
              <span className={cn("num ml-1.5", active ? "text-white/60" : "text-ink-faint")}>
                {count(option.value)}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CustomerTable
          rows={filtered}
          onSelect={open}
          emptyLabel={
            rows.length === 0
              ? "Belum ada pelanggan. Mulai dari tombol Jual."
              : "Tidak ada pelanggan yang cocok."
          }
        />
      </Card>

      <CalonSheet row={calon} onClose={() => setCalon(null)} />
    </div>
  );
}
