import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { countdown } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { copy, errorMessage, whatsappUrl } from "@/lib/utils";

export default function JualPage() {
  return (
    <Guard role="L1">
      <AppShell title="Jual">
        <Body />
      </AppShell>
    </Guard>
  );
}

type Created = {
  token: string;
  amount: number;
  kind: "SUBSCRIPTION" | "LIFETIME";
  expiresAt: number;
  planName: string;
  payoutProfileCompleted: boolean;
};

function Body() {
  const plans = useQuery(api.plans.listSellable);
  const me = useQuery(api.users.me);
  const createLink = useMutation(api.sell.createPaymentLink);
  const fmt = useMoney();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function create(planId: Id<"productPlans">, planName: string) {
    setBusy(planId);
    try {
      const result = await createLink({ planId });
      setCreated({ ...result, planName });
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(null);
    }
  }

  if (!plans) return <Loading rows={4} />;

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = created
    ? `${origin}/${created.kind === "LIFETIME" ? "lifetime" : "bayar"}/${created.token}`
    : "";
  const message = created
    ? created.kind === "LIFETIME"
      ? `Halo! Ini tautan untuk ${created.planName} SellMore. Buka lewat aplikasi SellMore ya:\n${url}`
      : `Halo! Ini tautan pembayaran SellMore ${created.planName}:\n${url}\n\nBerlaku 24 jam.`
    : "";

  return (
    <div className="space-y-4">
      {me && !me.payoutProfileCompleted && (
        <Link href="/profil" className="press block">
          <Card className="flex items-center justify-between gap-3 border-accent bg-accent-soft p-4">
            <span className="text-[14px] font-medium text-accent-ink">
              Lengkapi rekening agar payout bisa dibayar
            </span>
            <span className="text-[13px] font-semibold underline underline-offset-4">Isi</span>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-semibold">{plan.name}</h2>
                  {plan.category === "LIFETIME" && (
                    <Pill tone="ink">{plan.seatCount} kursi</Pill>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-ink-mute">
                  Komisi {plan.commissionPercent}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="num text-[20px] font-semibold leading-none">
                  {fmt(plan.price)}
                </div>
                <div className="mt-1 text-[12px] text-ink-mute">/{plan.priceUnit}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line bg-black/[0.015] px-4 py-3">
              <div className="text-[13px] text-ink-soft">
                Komisi Anda{" "}
                <span className="num font-semibold text-good">{fmt(plan.commission)}</span>
              </div>
              <Button
                size="sm"
                onClick={() => void create(plan.id, plan.name)}
                disabled={busy !== null}
              >
                {busy === plan.id ? "Membuat…" : "Buat tautan"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Sheet
        open={!!created}
        onClose={() => setCreated(null)}
        title="Tautan siap"
        footer={
          <a href={whatsappUrl(message)} target="_blank" rel="noreferrer">
            <Button block>
              <MessageCircle className="h-[18px] w-[18px]" />
              Kirim lewat WhatsApp
            </Button>
          </a>
        }
      >
        {created && (
          <div className="space-y-4">
            <div>
              <p className="eyebrow">{created.planName}</p>
              <p className="num mt-1 text-[26px] font-semibold">{fmt(created.amount)}</p>
              <p className="mt-1 text-[13px] text-ink-mute">
                Berlaku {countdown(created.expiresAt)} · sekali pakai
              </p>
            </div>

            <button
              onClick={async () => {
                if (await copy(url)) toast("Tautan disalin");
              }}
              className="flex w-full items-center gap-3 rounded border border-line px-3 py-3 text-left"
            >
              <span className="num flex-1 truncate text-[13px] text-ink-soft">{url}</span>
              <Copy className="h-4 w-4 shrink-0 text-ink-mute" />
            </button>

            {created.kind === "LIFETIME" && (
              <p className="text-[13px] text-ink-mute">
                Tautan lifetime hanya bisa dibuka lewat aplikasi SellMore, dan hanya untuk toko
                yang belum berlangganan.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
