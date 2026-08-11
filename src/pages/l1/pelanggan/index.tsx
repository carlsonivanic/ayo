import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, Stat } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { countdown } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export default function PelangganPage() {
  return (
    <Guard role="L1">
      <AppShell title="Pelanggan">
        <Body />
      </AppShell>
    </Guard>
  );
}

const STATUS = {
  SUBSCRIBED: { label: "Aktif", tone: "good" },
  CHURNED: { label: "Berhenti", tone: "warn" },
  LIFETIME: { label: "Lifetime", tone: "ink" },
} as const;

function Body() {
  const now = useMemo(() => Date.now(), []);
  const summary = useQuery(api.customers.summary, { now });
  const list = useQuery(api.customers.list, { now });
  const fmt = useMoney();
  const [search, setSearch] = useState("");

  if (!summary || !list) return <Loading rows={5} />;

  const filtered = search
    ? list.filter((row) => row.storeName.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-4 divide-x divide-line">
          <Stat label="Aktif" value={summary.active} />
          <Stat
            label="≤7 hari"
            value={summary.expiringSoon}
            tone={summary.expiringSoon > 0 ? "warn" : "default"}
          />
          <Stat label="Berhenti" value={summary.churned} />
          <Stat label="Lifetime" value={summary.lifetime} />
        </div>
      </Card>

      {list.length > 6 && (
        <Input
          placeholder="Cari toko"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <Empty title="Belum ada pelanggan. Kode yang dipakai akan muncul di sini." />
      ) : (
        <Card>
          {filtered.map((row) => (
            <Row
              key={row.id}
              href={`/l1/pelanggan/${row.id}`}
              label={row.storeName}
              sub={
                row.status === "LIFETIME"
                  ? `${row.planName} · ${row.yLabel}`
                  : `${row.planName} · ${countdown(row.expiryAt, now)}`
              }
              value={fmt(row.myEarned)}
              valueSub={<Pill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Pill>}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
