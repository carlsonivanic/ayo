import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  COMMISSION_TYPE_LABEL,
  formatIDR,
  formatDate,
} from "@/lib/format";

const LEDGER_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  settled: "green",
  pending: "amber",
  disputed: "red",
  reversed: "slate",
};

export default function EarningsPage() {
  const me = useQuery(api.agentAuth.me);
  const data = useQuery(api.portal.earnings.myEarnings, me ? {} : "skip");

  return (
    <AgentLayout title="Komisi" subtitle="Rincian penghasilan & pencairan.">
      {data === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Bisa dicairkan" value={formatIDR(data.payable)} />
            <Stat label="Sudah settled" value={formatIDR(data.settled)} />
            <Stat label="Pending" value={formatIDR(data.pending)} />
            <Stat label="Saldo escrow" value={formatIDR(data.escrowAmount)} />
          </div>

          <Card>
            <CardContent className="py-3 text-sm">
              {data.payoutReady ? (
                <span className="text-emerald-700">
                  Saldo kamu sudah melewati ambang pencairan{" "}
                  {formatIDR(data.thresholdIDR)}.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Pencairan dilakukan saat saldo mencapai{" "}
                  {formatIDR(data.thresholdIDR)}.
                </span>
              )}
            </CardContent>
          </Card>

          {data.byType.length > 0 && (
            <Card>
              <CardContent className="py-2">
                {data.byType.map((b) => (
                  <div
                    key={b.type}
                    className="flex items-center justify-between border-b py-2.5 text-sm last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {COMMISSION_TYPE_LABEL[b.type] ?? b.type}
                    </span>
                    <span className="font-medium">{formatIDR(b.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold">Riwayat</h2>
            {data.entries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada komisi tercatat.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.entries.map((e) => (
                  <Card key={e._id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium">
                          {COMMISSION_TYPE_LABEL[e.type] ?? e.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(e.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatIDR(e.amount)}
                        </span>
                        <Badge tone={LEDGER_TONE[e.status] ?? "slate"}>
                          {e.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AgentLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
