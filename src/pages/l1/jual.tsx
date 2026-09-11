import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { QrisCode } from "@/components/Qris";
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
  linkId: Id<"paymentLinks">;
  token: string;
  amount: number;
  qrisAmount: number;
  qrisPayload: string;
  kind: "SUBSCRIPTION" | "LIFETIME";
  expiresAt: number;
  planName: string;
  instructions: string | null;
};

const MAX_PROOF_BYTES = 8 * 1024 * 1024;

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
                {busy === plan.id ? "Membuat…" : "Tagih"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {created && <Checkout created={created} onClose={() => setCreated(null)} />}
    </div>
  );
}

/**
 * Settlement is manual: the buyer scans, the L1 uploads the receipt, and the
 * code appears. The unique amount is what ties this sale to one line in the
 * bank statement, so it is the number shown largest.
 */
function Checkout({ created, onClose }: { created: Created; onClose: () => void }) {
  const detail = useQuery(api.sell.linkDetail, { linkId: created.linkId });
  const uploadUrl = useMutation(api.payments.generateProofUploadUrl);
  const submitProof = useMutation(api.payments.submitPaymentProof);
  const createSeatLink = useMutation(api.sell.createSeatLink);
  const fmt = useMoney();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const paid = detail?.status === "PAID";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const code = detail?.codes[0]?.code ?? null;

  async function upload(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast("Bukti harus gambar atau PDF", "warn");
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      toast("Ukuran bukti maksimal 8 MB", "warn");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Gagal mengunggah bukti.");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const result = await submitProof({ linkId: created.linkId, storageId });
      if (!result.ok) {
        toast(result.reason, "warn");
        return;
      }
      toast("Bukti terkirim");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const message = code
    ? `Kode aktivasi SellMore Anda: ${code}\n\nMasukkan di aplikasi SellMore. Berlaku 7 hari.`
    : `Halo! Silakan scan QRIS untuk ${created.planName} SellMore, nominal Rp ${created.qrisAmount.toLocaleString("id-ID")}.`;

  return (
    <Sheet
      open
      onClose={onClose}
      title={paid ? "Pembayaran tercatat" : created.planName}
      footer={
        paid ? (
          <a href={whatsappUrl(message)} target="_blank" rel="noreferrer">
            <Button block>
              <MessageCircle className="h-[18px] w-[18px]" />
              Kirim ke pembeli
            </Button>
          </a>
        ) : (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button block disabled={uploading} onClick={() => fileInput.current?.click()}>
              <Upload className="h-[18px] w-[18px]" />
              {uploading ? "Mengunggah…" : "Upload bukti bayar"}
            </Button>
          </>
        )
      }
    >
      {!paid && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="eyebrow">Minta pembeli transfer persis</p>
            <p className="num mt-1 text-[30px] font-semibold leading-none">
              {created.qrisAmount.toLocaleString("id-ID")}
            </p>
            {created.qrisAmount !== created.amount && (
              <p className="mt-1 text-[12px] text-ink-mute">
                Harga {fmt(created.amount)} + kode unik untuk pencocokan
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <QrisCode payload={created.qrisPayload} />
          </div>

          <p className="text-center text-[13px] text-ink-mute">
            Berlaku {countdown(created.expiresAt)}. Kode aktivasi muncul setelah bukti
            bayar diunggah.
          </p>

          {created.instructions && (
            <p className="rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px] text-ink-soft">
              {created.instructions}
            </p>
          )}
        </div>
      )}

      {paid && detail && (
        <div className="space-y-4">
          {code && (
            <button
              onClick={async () => {
                if (await copy(code)) toast("Kode disalin");
              }}
              className="flex w-full items-center gap-3 rounded border border-line px-3 py-3 text-left"
            >
              <span className="num flex-1 text-[18px] font-semibold tracking-[0.04em]">
                {code}
              </span>
              <Copy className="h-4 w-4 shrink-0 text-ink-mute" />
            </button>
          )}

          {detail.seats.map((seat) => (
            <div
              key={seat.id}
              className="flex items-center justify-between gap-3 rounded border border-line px-3 py-3"
            >
              <span className="text-[14px]">Kursi {seat.seatIndex}</span>
              {seat.token ? (
                <button
                  onClick={async () => {
                    if (await copy(`${origin}/kursi/${seat.token}`)) toast("Tautan disalin");
                  }}
                  className="text-[13px] font-semibold underline underline-offset-4"
                >
                  Salin tautan
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await createSeatLink({ seatId: seat.id });
                    } catch (err) {
                      toast(errorMessage(err), "warn");
                    }
                  }}
                  className="text-[13px] font-semibold underline underline-offset-4"
                >
                  Buat tautan
                </button>
              )}
            </div>
          ))}

          <p className="text-[13px] text-ink-mute">
            Komisi masuk hitungan payout setelah admin memverifikasi bukti bayar.
          </p>
        </div>
      )}
    </Sheet>
  );
}
