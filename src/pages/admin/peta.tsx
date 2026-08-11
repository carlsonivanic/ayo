import { useQuery } from "convex/react";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";

// §26.1 — admin only in the MVP, and only for merchants Applocator has located.

export default function PetaPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Peta">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const points = useQuery(api.map.adminMap, { now });

  if (!points) return <Loading rows={4} />;
  if (points.length === 0) {
    return <Empty title="Belum ada lokasi merchant dari Applocator." />;
  }

  return (
    <Card>
      {points.map((point) => (
        <Row
          key={point.id}
          label={
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${point.active ? "bg-good" : "bg-line-strong"}`}
              />
              {point.storeName}
            </span>
          }
          sub={`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
          value={
            <a
              href={`https://maps.google.com/?q=${point.lat},${point.lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] font-semibold underline underline-offset-4"
            >
              Buka peta
            </a>
          }
        />
      ))}
    </Card>
  );
}
