import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { countdown } from "@/lib/format";

// §38.2 — aggregate per L1, read-only drill-down. No ownership actions here.

export default function TeamCustomersPage() {
  return (
    <Guard role="L2">
      <Body />
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const team = useQuery(api.customers.teamCustomers);
  const [selected, setSelected] = useState<{ id: Id<"users">; name: string } | null>(null);
  const detail = useQuery(
    api.customers.teamCustomerDetail,
    selected ? { l1Id: selected.id, now } : "skip",
  );

  if (selected) {
    return (
      <AppShell title={selected.name} back="/l2/pelanggan">
        <div onClick={() => undefined}>
          {!detail ? (
            <Loading rows={5} />
          ) : detail.length === 0 ? (
            <Empty title="Belum ada pelanggan." />
          ) : (
            <Card>
              {detail.map((row) => (
                <Row
                  key={row.id}
                  label={row.storeName}
                  sub={`${row.planName} · ${row.yLabel}`}
                  valueSub={
                    <Pill
                      tone={
                        row.status === "SUBSCRIBED"
                          ? "good"
                          : row.status === "LIFETIME"
                            ? "ink"
                            : "warn"
                      }
                    >
                      {row.status === "SUBSCRIBED"
                        ? "Aktif"
                        : row.status === "LIFETIME"
                          ? "Lifetime"
                          : "Berhenti"}
                    </Pill>
                  }
                  value={row.status === "LIFETIME" ? "—" : countdown(row.expiryAt, now)}
                />
              ))}
            </Card>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pelanggan">
      <SectionTitle>Per agen</SectionTitle>
      {!team ? (
        <Loading rows={4} />
      ) : team.length === 0 ? (
        <Empty title="Belum ada L1 di tim Anda." />
      ) : (
        <Card>
          {team.map((row) => (
            <Row
              key={row.l1Id}
              label={row.l1Name}
              sub={`${row.active} aktif · ${row.lifetime} lifetime · ${row.churned} berhenti`}
              value={row.total}
              onClick={() => setSelected({ id: row.l1Id, name: row.l1Name })}
            />
          ))}
        </Card>
      )}
    </AppShell>
  );
}
