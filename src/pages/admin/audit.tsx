import { useQuery } from "convex/react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card } from "@/components/ui/Card";
import { Empty, Loading } from "@/components/ui/Feedback";
import { Select } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { dateTime } from "@/lib/format";

export default function AuditPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Audit">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const [action, setAction] = useState("");
  const actions = useQuery(api.admin.audit.actions);
  const entries = useQuery(api.admin.audit.list, { action: action || undefined });

  return (
    <div className="space-y-4">
      <Select value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="">Semua tindakan</option>
        {(actions ?? []).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>

      {!entries ? (
        <Loading rows={6} />
      ) : entries.length === 0 ? (
        <Empty title="Belum ada aktivitas tercatat." />
      ) : (
        <Card className="divide-y divide-line">
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-semibold">{entry.action}</span>
                <span className="shrink-0 text-[12px] text-ink-faint">
                  {dateTime(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-mute">
                {entry.admin} · {entry.object}
              </p>
              {(entry.oldValue || entry.newValue) && (
                <p className="num mt-1.5 break-all text-[12px] text-ink-soft">
                  {entry.oldValue ?? "—"} → {entry.newValue ?? "—"}
                </p>
              )}
              {entry.reason && (
                <p className="mt-1.5 text-[13px] text-ink-soft">“{entry.reason}”</p>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
