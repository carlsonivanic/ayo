import { useMutation, useQuery } from "convex/react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { dateTime } from "@/lib/format";

export default function NotifikasiPage() {
  return (
    <Guard>
      <AppShell title="Notifikasi" back="/">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const list = useQuery(api.notifications.list, {});
  const announcements = useQuery(api.announcements.list);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  if (!list) return <Loading rows={5} />;

  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {announcements && announcements.length > 0 && (
        <div>
          <SectionTitle>Pengumuman</SectionTitle>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-semibold">{a.title}</h3>
                  <span className="shrink-0 text-[12px] text-ink-faint">
                    {dateTime(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[14px] text-ink-soft">{a.message}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle
          action={
            unread > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => void markAllRead()}>
                Tandai dibaca
              </Button>
            ) : undefined
          }
        >
          Terbaru
        </SectionTitle>
        {list.length === 0 ? (
          <Empty title="Belum ada notifikasi." />
        ) : (
          <Card>
            {list.map((n) => (
              <Row
                key={n.id}
                label={
                  <span className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    {n.title}
                  </span>
                }
                sub={n.message}
                valueSub={dateTime(n.createdAt)}
                onClick={() => {
                  void markRead({ notificationId: n.id });
                  if (n.href) window.location.href = n.href;
                }}
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
