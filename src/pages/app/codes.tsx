import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CodeStatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  TIER_LABEL,
  CODE_STATUS,
  formatIDR,
  formatDateTime,
  daysUntil,
} from "@/lib/format";
import { Copy, Check, Clock, AlertTriangle } from "lucide-react";

type StatusFilter = "all" | "unused" | "active" | "expired" | "revoked";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "unused", label: "Belum dipakai" },
  { key: "active", label: "Aktif" },
  { key: "expired", label: "Kedaluwarsa" },
  { key: "revoked", label: "Dicabut" },
];

export default function CodesHistoryPage() {
  const me = useQuery(api.agentAuth.me);
  const codes = useQuery(api.portal.codes.myCodes, me ? {} : "skip");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: codes?.length ?? 0 };
    for (const code of codes ?? []) c[code.status] = (c[code.status] ?? 0) + 1;
    return c;
  }, [codes]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? codes ?? []
        : (codes ?? []).filter((c) => c.status === filter),
    [codes, filter],
  );

  return (
    <AgentLayout
      title="Riwayat Kode"
      subtitle="Semua kode yang pernah kamu buat."
    >
      {/* Status filter chips */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {codes === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filter === "all"
              ? "Belum ada kode. Buat kode pertama kamu untuk memulai."
              : `Tidak ada kode dengan status "${CODE_STATUS[filter]?.label ?? filter}".`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <CodeRow key={c._id} code={c} />
          ))}
        </div>
      )}
    </AgentLayout>
  );
}

type CodeItem = FunctionReturnType<typeof api.portal.codes.myCodes>[number];

function CodeRow({ code }: { code: CodeItem }) {
  const [copied, setCopied] = useState(false);

  const tierLabel = TIER_LABEL[code.tier] ?? code.tier;
  const kindSuffix =
    code.tier === "lifetime" && code.lifetimeKind
      ? code.lifetimeKind === "duo"
        ? " · Duo"
        : " · Solo"
      : "";

  // Days left before an unused code self-expires (PRD code_unused_expiry_days).
  const unusedDaysLeft =
    code.status === "unused" ? daysUntil(code.expiresUnusedAt) : null;
  // Duo pairing window still open?
  const duoDaysLeft =
    code.status === "unused" && code.duoExpiresAt
      ? daysUntil(code.duoExpiresAt)
      : null;

  return (
    <Card>
      <CardContent className="space-y-2.5 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {tierLabel}
              <span className="text-muted-foreground">{kindSuffix}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Dibuat {formatDateTime(code.createdAt)}
            </div>
          </div>
          <CodeStatusBadge status={code.status} />
        </div>

        {/* Copyable code */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(code.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 font-mono text-sm hover:bg-accent"
        >
          {code.code}
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 opacity-50" />
          )}
        </button>

        {/* Detail rows */}
        <div className="space-y-1 text-xs">
          {code.priceIDR && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga</span>
              <span className="font-medium">{formatIDR(code.priceIDR)}</span>
            </div>
          )}

          {code.status === "active" && code.activatedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diaktivasi</span>
              <span className="font-medium text-emerald-700">
                {formatDateTime(code.activatedAt)}
              </span>
            </div>
          )}

          {code.status === "revoked" && code.revokedReason && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Alasan dicabut</span>
              <span className="text-right font-medium text-rose-700">
                {code.revokedReason}
              </span>
            </div>
          )}
        </div>

        {/* Expiry warnings for codes still waiting to be used */}
        {duoDaysLeft !== null && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              duoDaysLeft <= 1 ? "text-rose-600" : "text-amber-600",
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Jendela pasangan Duo berakhir {formatDateTime(code.duoExpiresAt)}
          </p>
        )}
        {duoDaysLeft === null && unusedDaysLeft !== null && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              unusedDaysLeft <= 7 ? "text-amber-600" : "text-muted-foreground",
            )}
          >
            {unusedDaysLeft <= 7 ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 shrink-0" />
            )}
            {unusedDaysLeft > 0
              ? `Kedaluwarsa dalam ${unusedDaysLeft} hari jika belum diaktivasi`
              : "Sudah melewati batas aktivasi"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
