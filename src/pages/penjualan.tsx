import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { dateTime } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

// Daily sales. One page for every role; the query scopes what each one sees.

export default function PenjualanPage() {
  return (
    <Guard>
      <AppShell title="Penjualan">
        <Body />
      </AppShell>
    </Guard>
  );
}

/** Jakarta "YYYY-MM-DD", shifted by whole days. */
function jakartaDay(ms: number) {
  return new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
}
function shiftDay(day: string, delta: number) {
  return jakartaDay(Date.parse(`${day}T00:00:00+07:00`) + delta * 86400000);
}

function Body() {
  const today = jakartaDay(Date.now());
  const [day, setDay] = useState(today);
  const me = useQuery(api.users.me);
  const data = useQuery(api.sales.daily, { day });
  const fmt = useMoney();
  const role = me?.role;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDay(shiftDay(day, -1))}
          aria-label="Hari sebelumnya"
          className="rounded border border-line bg-surface p-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => e.target.value && setDay(e.target.value)}
          className="flex-1 rounded border border-line bg-surface px-2 py-1.5 text-[14px] font-medium"
        />
        <button
          onClick={() => setDay(shiftDay(day, 1))}
          disabled={day >= today}
          aria-label="Hari berikutnya"
          className="rounded border border-line bg-surface p-1.5 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!data ? (
        <Loading rows={4} />
      ) : (
        <>
          <Card>
            <Row label="Penjualan" value={data.count} />
            <Row label="Total" value={fmt(data.amount)} />
          </Card>

          {role !== "L1" && data.perL1.length > 0 && (
            <section>
              <SectionTitle>Per agen</SectionTitle>
              <Card>
                {data.perL1.map((row) => (
                  <Row
                    key={row.l1Id ?? "direct"}
                    label={row.name}
                    sub={
                      role === "ADMIN" && row.l1Id
                        ? `L2: ${row.l2Name ?? "—"} · ${row.count} penjualan`
                        : `${row.count} penjualan`
                    }
                    value={fmt(row.amount)}
                  />
                ))}
              </Card>
            </section>
          )}

          <section>
            <SectionTitle>Transaksi</SectionTitle>
            {data.items.length === 0 ? (
              <Empty title="Belum ada penjualan." />
            ) : (
              <Card>
                {data.items.map((item) => (
                  <Row
                    key={item.id}
                    label={item.storeName ?? item.planName}
                    sub={[
                      dateTime(item.paidAt),
                      item.storeName ? item.planName : null,
                      role !== "L1" ? item.l1Name : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    value={fmt(item.amount)}
                    valueSub={item.pending ? <Pill tone="warn">Cek</Pill> : undefined}
                  />
                ))}
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
