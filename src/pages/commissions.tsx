import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AgentStatusBadge } from "@/components/StatusBadge";
import { formatIDR, LEVEL_LABEL } from "@/lib/format";

export default function CommissionsPage() {
  const data = useQuery(api.commissions.payoutSummary);

  return (
    <Layout
      title="Komisi"
      subtitle="Ringkasan ledger L1 per agen (read-only, append-only)."
    >
      {data === undefined ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-xs text-muted-foreground">
              Ambang payout minimum: {formatIDR(data.thresholdIDR)}
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Agen</TH>
                  <TH>Level</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Settled</TH>
                  <TH className="text-right">Pending</TH>
                  <TH className="text-right">Total payable</TH>
                  <TH>Payout</TH>
                </TR>
              </THead>
              <TBody>
                {data.rows.map((r) => (
                  <TR key={r.agentId}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-muted-foreground">
                      {LEVEL_LABEL[r.level] ?? r.level}
                    </TD>
                    <TD>
                      <AgentStatusBadge status={r.status} />
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatIDR(r.settled)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatIDR(r.pending)}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatIDR(r.payable)}
                    </TD>
                    <TD>
                      <Badge tone={r.payoutReady ? "green" : "slate"}>
                        {r.payoutReady ? "Siap" : "Di bawah ambang"}
                      </Badge>
                    </TD>
                  </TR>
                ))}
                {data.rows.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                      Belum ada entri komisi.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
