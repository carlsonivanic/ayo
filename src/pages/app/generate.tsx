import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/format";
import { Copy, Check, Loader2, Clock, Share2 } from "lucide-react";

type Prices = FunctionReturnType<typeof api.portal.codes.sellableTierPrices>;
type TierKey = "monthly" | "annual" | "lifetime_solo" | "lifetime_duo";

// PRD Ariely decoy order: Monthly (anchor) → Annual (target) → Lifetime Solo
// (decoy) → Lifetime Duo (irresistible).
const TIERS: { key: TierKey; label: string; priceKey: keyof Prices; note?: string }[] = [
  { key: "monthly", label: "Bulanan", priceKey: "monthly" },
  { key: "annual", label: "Tahunan", priceKey: "annual", note: "hemat 40%" },
  { key: "lifetime_solo", label: "Lifetime Solo", priceKey: "lifetime_solo", note: "seumur hidup" },
  { key: "lifetime_duo", label: "Lifetime Duo", priceKey: "lifetime_duo", note: "2 kode" },
];

export default function GeneratePage() {
  const me = useQuery(api.agentAuth.me);
  const prices = useQuery(
    api.portal.codes.sellableTierPrices,
    me ? {} : "skip",
  );
  const generate = useMutation(api.portal.codes.myGenerateCode);

  const [tier, setTier] = useState<TierKey>("annual");
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    codes: string[];
    duoExpiresAt?: number;
  } | null>(null);

  async function onGenerate() {
    setErr(null);
    setBusy(true);
    try {
      const res = await generate({
        tier: tier === "lifetime_solo" || tier === "lifetime_duo" ? "lifetime" : tier,
        lifetimeKind:
          tier === "lifetime_duo" ? "duo" : tier === "lifetime_solo" ? "solo" : undefined,
        paymentConfirmed: paid,
      });
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat kode.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setPaid(false);
  }

  return (
    <AgentLayout title="Buat Kode" subtitle="Pilih tier, konfirmasi pembayaran.">
      {result ? (
        <ResultView
          codes={result.codes}
          duoExpiresAt={result.duoExpiresAt}
          onDone={reset}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {TIERS.map((t) => {
              const price = prices ? prices[t.priceKey] : undefined;
              const selected = tier === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTier(t.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "bg-card hover:bg-accent",
                  )}
                >
                  <div>
                    <div className="font-medium">{t.label}</div>
                    {t.note && (
                      <div className="text-xs text-muted-foreground">{t.note}</div>
                    )}
                  </div>
                  <div className="text-right font-semibold">
                    {price !== undefined ? formatIDR(price) : "…"}
                  </div>
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="py-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                />
                <span>
                  Saya konfirmasi <strong>pembayaran sudah diterima</strong> dari
                  merchant (tunai atau QRIS).
                </span>
              </label>
            </CardContent>
          </Card>

          {tier === "lifetime_duo" && (
            <p className="text-xs text-muted-foreground">
              Lifetime Duo menghasilkan 2 kode dengan jendela aktivasi terbatas.
              Berikan kode kedua hanya setelah merchant kedua siap.
            </p>
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}

          <Button
            className="w-full"
            disabled={busy || !paid}
            onClick={onGenerate}
          >
            {busy && <Loader2 className="animate-spin" />}
            Buat Kode
          </Button>
        </div>
      )}
    </AgentLayout>
  );
}

function ResultView({
  codes,
  duoExpiresAt,
  onDone,
}: {
  codes: string[];
  duoExpiresAt?: number;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-300 bg-emerald-50">
        <CardContent className="py-3 text-sm text-emerald-800">
          Kode berhasil dibuat. Salin dan bagikan ke merchant.
        </CardContent>
      </Card>

      {codes.map((code, i) => (
        <CodeCard
          key={code}
          code={code}
          label={codes.length > 1 ? `Kode ${i + 1}` : undefined}
          held={codes.length > 1 && i === 1}
        />
      ))}

      {duoExpiresAt && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Jendela aktivasi berakhir{" "}
          {new Date(duoExpiresAt).toLocaleString("id-ID")}
        </p>
      )}

      <Button variant="outline" className="w-full" onClick={onDone}>
        Buat kode lain
      </Button>
    </div>
  );
}

function shareCodeWhatsApp(code: string) {
  const message = `Halo! Berikut kode aktivasi SellMore Anda:\n\n*${code}*\n\nGunakan kode ini di aplikasi SellMore untuk mengaktifkan langganan Anda.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

function CodeCard({
  code,
  label,
  held,
}: {
  code: string;
  label?: string;
  held?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        {label && (
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            {held && (
              <span className="text-[11px] text-amber-600">
                berikan setelah merchant kedua siap
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex w-full items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono text-base hover:bg-accent"
        >
          {code}
          {copied ? (
            <Check className="h-5 w-5 text-emerald-600" />
          ) : (
            <Copy className="h-5 w-5 opacity-50" />
          )}
        </button>
        <Button
          variant="outline"
          className="w-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
          onClick={() => shareCodeWhatsApp(code)}
        >
          <Share2 className="h-4 w-4" />
          Share via WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}
