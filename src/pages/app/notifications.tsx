import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { relativeDays } from "@/lib/format";

export default function NotificationsPage() {
  const me = useQuery(api.agentAuth.me);
  const data = useQuery(
    api.portal.notifications.myNotifications,
    me ? {} : "skip",
  );
  const markRead = useMutation(api.portal.notifications.markRead);
  const markAllRead = useMutation(api.portal.notifications.markAllRead);

  return (
    <AgentLayout
      title="Notifikasi"
      actions={
        data && data.unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
            Tandai semua dibaca
          </Button>
        ) : undefined
      }
    >
      {data === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.items.map((n) => {
            const unread = n.readAt === null;
            return (
              <Card
                key={n._id}
                className={cn(unread && "border-primary/40 bg-primary/5")}
                onClick={() =>
                  unread &&
                  markRead({ notificationId: n._id as Id<"notifications"> })
                }
              >
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{n.title}</div>
                    {unread && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {n.body}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {relativeDays(n.createdAt)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AgentLayout>
  );
}
