import { useQuery } from "convex/react";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { countdown, date, dateShort } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export default function TindakLanjut() {
  return (
    <Guard role="L1">
      <AppShell title="Tindak lanjut" back="/l1">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.performance.followUps, { now });
  const fmt = useMoney();

  if (!data) return <Loading rows={5} />;
  if (!data.links.length && !data.expiring.length && !data.churned.length) {
    return <Empty title="Tidak ada yang perlu dikejar." />;
  }

  return (
    <div className="space-y-5">
      {data.links.length > 0 && (
        <div>
          <SectionTitle>Link belum dibayar</SectionTitle>
          <Card>
            {data.links.map((l) => (
              <Row
                key={l.id}
                label={l.planName}
                sub={
                  l.viewCount > 0
                    ? `Dibuka ${l.viewCount}× · terakhir ${dateShort(l.lastViewedAt)}`
                    : "Belum dibuka"
                }
                value={fmt(l.amount)}
                valueSub={`habis ${countdown(l.expiresAt, now)}`}
                tone={l.viewCount > 0 ? "warn" : "mute"}
              />
            ))}
          </Card>
        </div>
      )}

      {data.expiring.length > 0 && (
        <div>
          <SectionTitle>Segera habis</SectionTitle>
          <Card>
            {data.expiring.map((m) => (
              <Row
                key={m.id}
                href={`/l1/pelanggan/${m.id}`}
                label={m.storeName}
                sub={date(m.expiryAt)}
                value={countdown(m.expiryAt, now)}
                tone="warn"
              />
            ))}
          </Card>
        </div>
      )}

      {data.churned.length > 0 && (
        <div>
          <SectionTitle>Tidak aktif</SectionTitle>
          <Card>
            {data.churned.map((m) => (
              <Row
                key={m.id}
                href={`/l1/pelanggan/${m.id}`}
                label={m.storeName}
                sub={`Berakhir ${date(m.expiryAt)}`}
              />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
