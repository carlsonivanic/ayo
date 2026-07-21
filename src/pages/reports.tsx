import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/ui/kpi";
import { AgentStatusBadge } from "@/components/StatusBadge";
import {
  formatIDR,
  formatDate,
  formatDateTime,
  LEVEL_LABEL,
  AGENT_STATUS,
  TIER_LABEL,
} from "@/lib/format";
import {
  Wallet,
  Store,
  Globe,
  Users,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

type Tab = "revenue" | "liability" | "payout" | "holds";

const TABS: { id: Tab; label: string }[] = [
  { id: "revenue", label: "Sumber Pendapatan" },
  { id: "liability", label: "Liabilitas Komisi" },
  { id: "payout", label: "Payout Run" },
  { id: "holds", label: "Tahan & Retain" },
];

const CHANNEL_LABEL: Record<string, string> = {
  agent: "Agen",
  retail: "Retail",
  self_serve: "Self-Serve",
};

export default function ReportsPage() {
  const router = useRouter();
  const tab = (router.query.tab as Tab) || "revenue";
  const [regionId, setRegionId] = useState<Id<"regions"> | undefined>(undefined);

  const regions = useQuery(api.regions.list);

  const setTab = (t: Tab) => {
    router.replace({ pathname: "/reports", query: { tab: t } }, undefined, {
      shallow: true,
    });
  };

  return (
    <Layout
      title="Laporan Keuangan"
      subtitle="Pendapatan, komisi, payout, dan dana tertahan."
    >
      {/* Filter strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Wilayah:</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={regionId ?? ""}
            onChange={(e) =>
              setRegionId(
                e.target.value ? (e.target.value as Id<"regions">) : undefined,
              )
            }
          >
            <option value="">Semua</option>
            {regions?.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tab === "revenue" && <RevenueTab regionId={regionId} />}
      {tab === "liability" && <LiabilityTab regionId={regionId} />}
      {tab === "payout" && <PayoutTab regionId={regionId} />}
      {tab === "holds" && <HoldsTab />}
    </Layout>
  );
}

/* ──────────────────────────── Tab 1: Revenue ──────────────────────────── */

function RevenueTab({ regionId }: { regionId?: Id<"regions"> }) {
  const byChannel = useQuery(api.reports.revenueByChannel, { regionId });
  const byRegion = useQuery(api.reports.revenueByRegion, { regionId });
  const byTier = useQuery(api.reports.revenueByTier, { regionId });
  const byAgent = useQuery(api.reports.revenueByAgent, { regionId });

  if (
    !byChannel ||
    !byRegion ||
    !byTier ||
    !byAgent
  ) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  const agentBucket = byChannel.buckets.find((b) => b.channel === "agent");
  const retailBucket = byChannel.buckets.find((b) => b.channel === "retail");
  const selfServeBucket = byChannel.buckets.find(
    (b) => b.channel === "self_serve",
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total pendapatan"
          value={formatIDR(byChannel.total)}
          icon={Wallet}
        />
        <Kpi
          label="Channel Agen"
          value={formatIDR(agentBucket?.amount ?? "0")}
          icon={Users}
        />
        <Kpi
          label="Channel Retail"
          value={formatIDR(retailBucket?.amount ?? "0")}
          icon={Store}
        />
        <Kpi
          label="Channel Self-Serve"
          value={formatIDR(selfServeBucket?.amount ?? "0")}
          icon={Globe}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Per Channel</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BucketTable rows={byChannel.buckets.map((b) => ({ label: CHANNEL_LABEL[b.channel] ?? b.channel, amount: b.amount, pct: pct(b.amount, byChannel.total) }))} total={byChannel.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Per Tier</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BucketTable rows={byTier.buckets.map((b) => ({ label: TIER_LABEL[b.tier] ?? b.tier, amount: b.amount, pct: pct(b.amount, byTier.total) }))} total={byTier.total} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per Wilayah</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <BucketTable rows={byRegion.buckets.map((b) => ({ label: b.regionName, amount: b.amount, pct: pct(b.amount, byRegion.total) }))} total={byRegion.total} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Agen (berdasarkan revenue)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Agen</TH>
                <TH>Level</TH>
                <TH>Status</TH>
                <TH className="text-right">Aktivasi</TH>
                <TH className="text-right">Revenue</TH>
              </TR>
            </THead>
            <TBody>
              {byAgent.rows.slice(0, 10).map((r) => (
                <TR key={r.agentId}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD className="text-muted-foreground">
                    {LEVEL_LABEL[r.level] ?? r.level}
                  </TD>
                  <TD>
                    <AgentStatusBadge status={r.status} />
                  </TD>
                  <TD className="text-right tabular-nums">{r.activations}</TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatIDR(r.total)}
                  </TD>
                </TR>
              ))}
              {byAgent.rows.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada aktivasi pada filter ini.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function pct(amount: string, total: string): string {
  const a = Number(amount);
  const t = Number(total);
  if (!t) return "0%";
  return `${((a / t) * 100).toFixed(1)}%`;
}

function BucketTable({
  rows,
  total,
}: {
  rows: { label: string; amount: string; pct: string }[];
  total: string;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Kategori</TH>
          <TH className="text-right">Jumlah</TH>
          <TH className="text-right">%</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((r, i) => (
          <TR key={i}>
            <TD className="font-medium">{r.label}</TD>
            <TD className="text-right tabular-nums">{formatIDR(r.amount)}</TD>
            <TD className="text-right text-muted-foreground tabular-nums">
              {r.pct}
            </TD>
          </TR>
        ))}
        {rows.length === 0 && (
          <TR>
            <TD colSpan={3} className="py-6 text-center text-muted-foreground">
              Tidak ada data.
            </TD>
          </TR>
        )}
        <TR className="border-t-2">
          <TD className="font-semibold">Total</TD>
          <TD className="text-right font-semibold tabular-nums">
            {formatIDR(total)}
          </TD>
          <TD />
        </TR>
      </TBody>
    </Table>
  );
}

/* ────────────────────────── Tab 2: Liability ─────────────────────────── */

function LiabilityTab({ regionId }: { regionId?: Id<"regions"> }) {
  const data = useQuery(api.reports.commissionLiability, { regionId });
  if (!data) return <p className="text-sm text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total liabilitas (belum dibayar)"
          value={formatIDR(data.totals.total)}
          icon={Wallet}
          hint="Semua entri berstatus pending"
        />
        <Kpi
          label="L1 (residual + closing)"
          value={formatIDR(
            (BigInt(data.totals.l1Residual) + BigInt(data.totals.l1Closing)).toString(),
          )}
          icon={Users}
        />
        <Kpi
          label="L2 Override"
          value={formatIDR(data.totals.l2Override)}
          icon={ChevronRight}
        />
        <Kpi
          label="L3 Override"
          value={formatIDR(data.totals.l3Override)}
          icon={ChevronRight}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Komisi tertunggak per agen (akan jatuh tempo)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Agen</TH>
                <TH>Level</TH>
                <TH>Status</TH>
                <TH className="text-right">L1 Residual</TH>
                <TH className="text-right">L1 Closing</TH>
                <TH className="text-right">L2 Override</TH>
                <TH className="text-right">L3 Override</TH>
                <TH className="text-right">Total</TH>
                <TH>Payout terakhir</TH>
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
                    {formatIDR(r.l1Residual)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatIDR(r.l1Closing)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatIDR(r.l2Override)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatIDR(r.l3Override)}
                  </TD>
                  <TD className="text-right font-semibold tabular-nums">
                    {formatIDR(r.total)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(r.lastPayoutAt ?? undefined)}
                  </TD>
                </TR>
              ))}
              {data.rows.length === 0 && (
                <TR>
                  <TD colSpan={9} className="py-8 text-center text-muted-foreground">
                    Tidak ada komisi tertunggak.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Tab 3: Payout ───────────────────────────── */

function PayoutTab({ regionId }: { regionId?: Id<"regions"> }) {
  const [periodKind, setPeriodKind] = useState<"weekly" | "monthly">("weekly");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<{
    results: { agentId: string; payoutId: string; total: string; entryCount: number }[];
    totalPaid: string;
    runAt: number;
  } | null>(null);

  const preview = useQuery(api.commissions.previewPayout, { periodKind });
  const history = useQuery(api.commissions.payoutHistory, { limit: 20 });
  const runPayout = useMutation(api.commissions.runPayout);

  // filter preview by region (preview already includes all agents; UI filter)
  const filteredRows = (preview?.rows ?? []).filter(
    (r) => !regionId || r.regionId === regionId,
  );

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEligible = () => {
    setSelected(
      new Set(
        filteredRows
          .filter((r) => !r.belowThreshold && !r.alreadyPaidThisCycle)
          .map((r) => r.agentId),
      ),
    );
  };

  const clearSelection = () => setSelected(new Set());

  const confirmRun = async () => {
    if (selected.size === 0) return;
    const result = await runPayout({
      agentIds: [...selected] as Id<"agents">[],
      periodKind,
    });
    setLastRun(result);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border p-1">
          {(["weekly", "monthly"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setPeriodKind(k);
                setSelected(new Set());
              }}
              className={`rounded px-3 py-1 text-xs font-medium ${
                periodKind === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {k === "weekly" ? "Mingguan" : "Bulanan"}
            </button>
          ))}
        </div>
        {preview && (
          <span className="text-xs text-muted-foreground">
            Siklus {preview.prefix} · ambang {formatIDR(preview.thresholdIDR)}
          </span>
        )}
      </div>

      {lastRun && (
        <Card>
          <CardContent className="border-b-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Payout {lastRun.results.length} agen · total {formatIDR(lastRun.totalPaid)} ·{" "}
              {formatDateTime(lastRun.runAt)}
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {lastRun.results.map((r) => (
                <li key={r.payoutId} className="flex items-center justify-between">
                  <span className="font-mono">{r.payoutId}</span>
                  <span className="tabular-nums">
                    {formatIDR(r.total)} ({r.entryCount} entri)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Preview payout · {filteredRows.length} agen · total{" "}
            {formatIDR(
              filteredRows
                .filter((r) => selected.has(r.agentId))
                .reduce((s, r) => s + BigInt(r.pendingTotal), 0n)
                .toString(),
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAllEligible}>
              Pilih semua ≥ ambang
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Bersihkan
            </Button>
            <Button
              size="sm"
              onClick={confirmRun}
              disabled={selected.size === 0}
            >
              Konfirmasi payout ({selected.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!preview ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Memuat…
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-8" />
                  <TH>Agen</TH>
                  <TH>Level</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Pending</TH>
                  <TH className="text-right">Entri</TH>
                  <TH>Catatan</TH>
                </TR>
              </THead>
              <TBody>
                {filteredRows.map((r) => (
                  <TR key={r.agentId}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={selected.has(r.agentId)}
                        onChange={() => toggle(r.agentId)}
                        disabled={r.alreadyPaidThisCycle}
                        className="h-4 w-4 rounded border-input"
                      />
                    </TD>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-muted-foreground">
                      {LEVEL_LABEL[r.level] ?? r.level}
                    </TD>
                    <TD>
                      <AgentStatusBadge status={r.status} />
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatIDR(r.pendingTotal)}
                    </TD>
                    <TD className="text-right tabular-nums">{r.entryCount}</TD>
                    <TD>
                      <div className="flex gap-1">
                        {r.alreadyPaidThisCycle && (
                          <Badge tone="blue">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Sudah dibayar siklus ini
                          </Badge>
                        )}
                        {!r.alreadyPaidThisCycle && r.belowThreshold && (
                          <Badge tone="amber">Di bawah ambang</Badge>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
                {filteredRows.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                      Tidak ada komisi pending pada periode ini.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Riwayat payout</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Payout ID</TH>
                <TH className="text-right">Agen</TH>
                <TH className="text-right">Entri</TH>
                <TH className="text-right">Total</TH>
                <TH>Tanggal</TH>
              </TR>
            </THead>
            <TBody>
              {(history ?? []).map((h) => (
                <TR key={h.payoutId}>
                  <TD className="font-mono text-xs">{h.payoutId}</TD>
                  <TD className="text-right tabular-nums">{h.agentCount}</TD>
                  <TD className="text-right tabular-nums">{h.entryCount}</TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatIDR(h.total)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(h.lastAt)}
                  </TD>
                </TR>
              ))}
              {history && history.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-6 text-center text-muted-foreground">
                    Belum ada payout.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Tab 4: Holds ────────────────────────────── */

function HoldsTab() {
  const data = useQuery(api.reports.holdsAndRetains);
  if (!data) return <p className="text-sm text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Kpi
          label="Total ditahan di escrow"
          value={formatIDR(
            data.escrowHolds
              .reduce((s, r) => s + BigInt(r.escrowAmount), 0n)
              .toString(),
          )}
          icon={Lock}
          hint={`${data.escrowHolds.length} agen`}
        />
        <Kpi
          label="Agen dengan komisi tertahan (status)"
          value={String(data.statusHeld.length)}
          icon={AlertTriangle}
          hint="Dorman / Nonaktif / Disuspend dengan saldo pending"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Escrow tertahan (commitment fee)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Agen</TH>
                <TH>Level</TH>
                <TH>Status</TH>
                <TH className="text-right">Escrow</TH>
                <TH>Daftar</TH>
                <TH>Fee dibayar</TH>
              </TR>
            </THead>
            <TBody>
              {data.escrowHolds.map((r) => (
                <TR key={r.agentId}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD className="text-muted-foreground">
                    {LEVEL_LABEL[r.level] ?? r.level}
                  </TD>
                  <TD>
                    <AgentStatusBadge status={r.status} />
                  </TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatIDR(r.escrowAmount)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(r.enrolledAt)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(r.feePaidAt ?? undefined)}
                  </TD>
                </TR>
              ))}
              {data.escrowHolds.length === 0 && (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada escrow tertahan.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Komisi tertahan karena status agen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Agen</TH>
                <TH>Status</TH>
                <TH className="text-right">Saldo pending</TH>
                <TH className="text-right">Entri</TH>
                <TH className="text-right">Multiplier minimum</TH>
              </TR>
            </THead>
            <TBody>
              {data.statusHeld.map((r) => (
                <TR key={r.agentId}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD>
                    <Badge tone={AGENT_STATUS[r.status]?.tone ?? "slate"}>
                      {AGENT_STATUS[r.status]?.label ?? r.status}
                    </Badge>
                  </TD>
                  <TD className="text-right font-medium tabular-nums">
                    {formatIDR(r.pendingTotal)}
                  </TD>
                  <TD className="text-right tabular-nums">{r.entryCount}</TD>
                  <TD className="text-right tabular-nums">
                    {r.minMultiplierPct}%
                  </TD>
                </TR>
              ))}
              {data.statusHeld.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                    Tidak ada komisi tertahan karena status.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
