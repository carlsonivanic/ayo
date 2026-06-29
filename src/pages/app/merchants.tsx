import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIER_LABEL, MERCHANT_DISPLAY, formatDate } from "@/lib/format";

export default function MerchantsPage() {
  const me = useQuery(api.agentAuth.me);
  const merchants = useQuery(
    api.portal.merchants.myMerchants,
    me ? {} : "skip",
  );

  return (
    <AgentLayout title="Merchant" subtitle="Pelanggan yang kamu aktivasi.">
      {merchants === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada merchant. Buat kode pertama kamu untuk memulai.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {merchants.map((m) => {
            const d = MERCHANT_DISPLAY[m.display] ?? {
              label: m.display,
              tone: "slate" as const,
            };
            return (
              <Card key={m._id}>
                <CardContent className="flex items-center justify-between py-3.5">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {m.deviceId}
                    </div>
                    <div className="mt-0.5 text-sm font-medium">
                      {TIER_LABEL[m.tier] ?? m.tier}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Aktif sejak {formatDate(m.activatedAt)}
                      {m.daysRemaining !== null &&
                        ` · ${m.daysRemaining > 0 ? `${m.daysRemaining} hari lagi` : "berakhir"}`}
                    </div>
                  </div>
                  <Badge tone={d.tone}>{d.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AgentLayout>
  );
}
