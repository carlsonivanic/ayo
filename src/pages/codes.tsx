import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type CodeRowData = FunctionReturnType<typeof api.codes.listCodes>[number];
type Tier = "daily" | "weekly" | "monthly" | "annual" | "lifetime";
type Channel = "agent" | "retail" | "self_serve";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CodeStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { TIER_LABEL, formatDate, formatIDR } from "@/lib/format";
import { Copy, Check } from "lucide-react";

// PRD decoy presentation order: Monthly → Annual → Lifetime Solo → Lifetime Duo.
// Prices are NOT hardcoded — `priceKey` indexes the live systemParameters values
// returned by api.params.tierPrices and the label is composed at render time.
type TierPrices = FunctionReturnType<typeof api.params.tierPrices>;
const TIER_META: { key: string; label: string; priceKey: keyof TierPrices; note?: string }[] = [
  { key: "monthly", label: "Bulanan", priceKey: "monthly" },
  { key: "annual", label: "Tahunan", priceKey: "annual", note: "hemat 40%" },
  { key: "lifetime_solo", label: "Lifetime Solo", priceKey: "lifetime_solo" },
  { key: "lifetime_duo", label: "Lifetime Duo", priceKey: "lifetime_duo", note: "2 kode" },
  { key: "weekly", label: "Mingguan", priceKey: "weekly" },
  { key: "daily", label: "Harian", priceKey: "daily" },
];

const CODE_STATUSES = ["unused", "active", "expired", "revoked"] as const;

export default function CodesPage() {
  const me = useQuery(api.admins.me);
  const canGenerate = me?.role === "ops_admin" || me?.role === "super_admin";
  const canRevoke = me?.role === "finance_admin" || me?.role === "super_admin";

  const [filter, setFilter] = useState<string>("");
  const codes = useQuery(api.codes.listCodes, {
    status: filter ? (filter as (typeof CODE_STATUSES)[number]) : undefined,
  });

  return (
    <Layout
      title="Kode Langganan"
      subtitle="Buat dan lacak kode SM-XXXX-XXXX-XXXXX yang ditebus di Sell More."
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[360px_1fr]">
        {canGenerate ? (
          <GenerateForm />
        ) : (
          <Card className="min-w-0">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Peran kamu tidak memiliki akses membuat kode. Hanya Ops/Super Admin.
            </CardContent>
          </Card>
        )}

        <Card className="min-w-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Semua kode</CardTitle>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-44"
            >
              <option value="">Semua status</option>
              {CODE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <p className="border-b px-3 py-1.5 text-xs text-muted-foreground sm:hidden">
              Geser ke kanan untuk melihat kolom lainnya →
            </p>
            <Table>
              <THead>
                <TR>
                  <TH>Kode</TH>
                  <TH>Tier</TH>
                  <TH>Harga</TH>
                  <TH>Kanal</TH>
                  <TH>Agen</TH>
                  <TH>Status</TH>
                  <TH>Dibuat</TH>
                  {canRevoke && <TH />}
                </TR>
              </THead>
              <TBody>
                {codes?.map((c) => (
                  <CodeRow key={c._id} c={c} canRevoke={canRevoke} />
                ))}
                {codes && codes.length === 0 && (
                  <TR>
                    <TD colSpan={8} className="py-8 text-center text-muted-foreground">
                      Belum ada kode.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function CodeRow({
  c,
  canRevoke,
}: {
  c: CodeRowData;
  canRevoke: boolean;
}) {
  const revoke = useMutation(api.codes.revokeCode);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(c.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function onRevoke() {
    const reason = window.prompt("Alasan mencabut kode ini?");
    if (!reason) return;
    try {
      await revoke({ codeId: c._id as Id<"subscriptionCodes">, reason });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mencabut kode.");
    }
  }

  return (
    <TR>
      <TD>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-primary"
        >
          {c.code}
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3 opacity-50" />
          )}
        </button>
      </TD>
      <TD>
        {TIER_LABEL[c.tier]}
        {c.lifetimeKind && (
          <Badge tone="blue" className="ml-1">
            {c.lifetimeKind}
          </Badge>
        )}
      </TD>
      <TD className="text-muted-foreground">
        {c.priceIDR !== null ? formatIDR(c.priceIDR) : "—"}
      </TD>
      <TD className="text-muted-foreground">{c.channel}</TD>
      <TD className="text-muted-foreground">{c.agentName ?? "—"}</TD>
      <TD>
        <CodeStatusBadge status={c.status} />
      </TD>
      <TD className="text-muted-foreground">{formatDate(c.createdAt)}</TD>
      {canRevoke && (
        <TD className="text-right">
          {c.status !== "revoked" && (
            <Button variant="ghost" size="sm" onClick={onRevoke}>
              Cabut
            </Button>
          )}
        </TD>
      )}
    </TR>
  );
}

function GenerateForm() {
  const regions = useQuery(api.regions.list);
  const agents = useQuery(api.agents.listAgents, {});
  const prices = useQuery(api.params.tierPrices);
  const generate = useMutation(api.codes.generateCode);

  const [tier, setTier] = useState("monthly");
  const [channel, setChannel] = useState("agent");
  const [regionId, setRegionId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [batchId, setBatchId] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!regionId) return setErr("Pilih wilayah.");
    setBusy(true);
    try {
      const isLifetime = tier.startsWith("lifetime");
      const res = await generate({
        tier: isLifetime ? "lifetime" : (tier as Tier),
        lifetimeKind: tier === "lifetime_duo" ? "duo" : tier === "lifetime_solo" ? "solo" : undefined,
        channel: channel as Channel,
        regionId: regionId as Id<"regions">,
        agentId: agentId ? (agentId as Id<"agents">) : undefined,
        quantity: Number(quantity) || 1,
        batchId: batchId.trim() || undefined,
      });
      setResult(res.codes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat kode.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "h-11 text-base sm:h-9 sm:text-sm";

  return (
    <Card className="min-w-0">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-base">Buat kode</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 sm:px-6">
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Tier">
            <Select
              className={fieldClass}
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              {TIER_META.map((t) => {
                const price = prices ? prices[t.priceKey] : undefined;
                const priceLabel =
                  price !== undefined ? ` — ${formatIDR(price)}` : "";
                const note = t.note ? ` (${t.note})` : "";
                return (
                  <option key={t.key} value={t.key}>
                    {t.label}
                    {priceLabel}
                    {note}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Kanal">
            <Select
              className={fieldClass}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="agent">Agen</option>
              <option value="retail">Retail</option>
              <option value="self_serve">Self-serve</option>
            </Select>
          </Field>
          <Field label="Wilayah">
            <Select
              className={fieldClass}
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
            >
              <option value="">Pilih wilayah…</option>
              {regions?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Agen (opsional)">
            <Select
              className={fieldClass}
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">— tanpa agen —</option>
              {agents?.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.regionCode})
                </option>
              ))}
            </Select>
          </Field>
          {tier !== "lifetime_duo" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah">
                <Input
                  className={fieldClass}
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <Field label="Batch (opsional)">
                <Input
                  className={fieldClass}
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="RETAIL-2026-06"
                />
              </Field>
            </div>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Membuat…" : "Buat kode"}
          </Button>
        </form>

        {result && (
          <div className="mt-4 space-y-2 rounded-md border bg-muted/40 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              Kode dibuat:
            </div>
            {result.map((code) => (
              <ResultCode key={code} code={code} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="flex w-full items-center justify-between rounded bg-background px-3 py-2 font-mono text-sm hover:bg-accent"
    >
      {code}
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
