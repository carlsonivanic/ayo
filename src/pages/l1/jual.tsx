import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle, QrCode, Send, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { QrisFrame } from "@/components/Qris";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { countdown, money } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { SalesHistory } from "@/pages/penjualan";
import { Tabs } from "@/components/ui/Tabs";
import { copy, errorMessage, whatsappUrl } from "@/lib/utils";

export default function JualPage() {
  return (
    <Guard role="L1">
      <AppShell title="Jual">
        <JualTabs />
      </AppShell>
    </Guard>
  );
}

function JualTabs() {
  const [tab, setTab] = useState<"jual" | "riwayat">("jual");
  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "jual", label: "Jual" },
          { value: "riwayat", label: "Riwayat penjualan" },
        ]}
      />
      {tab === "jual" ? <Body /> : <SalesHistory />}
    </>
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
  merchant: { merchantName: string; merchantCity: string; nmid: string | null };
  instructions: string | null;
  customerName: string;
  customerPhone: string;
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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const ready =
    customerName.trim().length >= 2 && customerPhone.replace(/\D/g, "").length >= 8;

  async function create(planId: Id<"productPlans">, planName: string) {
    if (!ready) {
      toast("Isi nama dan nomor WhatsApp pelanggan dulu", "warn");
      return;
    }
    setBusy(planId);
    try {
      const result = await createLink({
        planId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });
      setCreated({
        ...result,
        planName,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
      });

      // The agent almost always sends the link on WhatsApp right away. Opening
      // it here saves a tap; if the browser blocks the popup, the sheet's own
      // WhatsApp button is the fallback.
      const payUrl = `${window.location.origin}/bayar/${result.token}`;
      const text =
        `Pembayaran SellMore ${planName} — ${money(result.qrisAmount)}\n` +
        `Scan QRIS dan unggah bukti transfer di tautan ini, kode aktivasi langsung muncul:\n${payUrl}`;
      window.open(whatsappUrl(text, customerPhone.trim()), "_blank", "noopener");
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
              Isi nomor DANA agar payout bisa dibayar
            </span>
            <span className="text-[13px] font-semibold underline underline-offset-4">Isi</span>
          </Card>
        </Link>
      )}

      <Card className="space-y-3 p-4">
        <div>
          <p className="eyebrow">Pelanggan</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            Nama dan nomor dipakai untuk mengirim tautan pembayaran lewat WhatsApp.
          </p>
        </div>
        <Field label="Nama pelanggan">
          <Input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Contoh: Budi Santoso"
            autoComplete="name"
          />
        </Field>
        <Field label="Nomor WhatsApp" hint="Contoh: 0812 3456 7890">
          <Input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="08…"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      </Card>

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
              {/* A renewal plan pays for years — the first month alone undersells it. */}
              <div className="min-w-0 text-[13px] text-ink-soft">
                <span className="num font-semibold text-good">{fmt(plan.commission)}</span>{" "}
                sekarang
                {plan.lifetimeValue > plan.commission && (
                  <>
                    {" · "}
                    <span className="num font-semibold">{fmt(plan.lifetimeValue)}</span> total
                  </>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => void create(plan.id, plan.name)}
                disabled={busy !== null || !ready}
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

type Mode = "qris" | "link";

/**
 * Two ways to collect: hold the phone out, or send the link.
 *
 * Settlement is manual either way. When the agent is face to face they upload
 * the receipt themselves; when the link is sent, the buyer does it and the code
 * lands on their own screen without the agent in the loop.
 */
function Checkout({ created, onClose }: { created: Created; onClose: () => void }) {
  const detail = useQuery(api.sell.linkDetail, { linkId: created.linkId });
  const uploadUrl = useMutation(api.payments.generateProofUploadUrl);
  const submitProof = useMutation(api.payments.submitPaymentProof);
  const fmt = useMoney();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<Mode>("qris");

  const paid = detail?.status === "PAID";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const lifetime = created.kind === "LIFETIME";
  const codes = lifetime
    ? (detail?.seats ?? []).flatMap((s) => (s.code && s.status !== "VOID" ? [s.code] : []))
    : (detail?.codes ?? []).slice(0, 1).map((c) => c.code);
  const payUrl = `${origin}/bayar/${created.token}`;

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

  const shareMessage =
    `Pembayaran SellMore ${created.planName} — ${money(created.qrisAmount)}\n` +
    `Scan QRIS dan unggah bukti transfer di tautan ini, kode aktivasi langsung muncul:\n${payUrl}`;

  const codeMessage =
    codes.length > 0
      ? `Kode aktivasi SellMore Anda:\n${codes.join("\n")}\n\nMasukkan di aplikasi SellMore. ${
          lifetime ? "Satu kode untuk satu toko." : "Berlaku 7 hari."
        }`
      : shareMessage;

  return (
    <Sheet
      open
      onClose={onClose}
      title={paid ? "Pembayaran tercatat" : created.planName}
      footer={
        paid ? (
          <a
            href={whatsappUrl(codeMessage, created.customerPhone)}
            target="_blank"
            rel="noreferrer"
          >
            <Button block>
              <MessageCircle className="h-[18px] w-[18px]" />
              Kirim kode ke pembeli
            </Button>
          </a>
        ) : mode === "qris" ? (
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
        ) : (
          <a
            href={whatsappUrl(shareMessage, created.customerPhone)}
            target="_blank"
            rel="noreferrer"
          >
            <Button block>
              <MessageCircle className="h-[18px] w-[18px]" />
              Kirim lewat WhatsApp
            </Button>
          </a>
        )
      }
    >
      <div className="mb-4 rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px]">
        <span className="text-ink-mute">Untuk</span>{" "}
        <span className="font-semibold">{created.customerName}</span>
        <span className="text-ink-faint"> · </span>
        <span className="num">{created.customerPhone}</span>
      </div>

      {!paid && (
        <div className="space-y-4">
          <Segmented value={mode} onChange={setMode} />

          {mode === "qris" ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <QrisFrame
                  payload={created.qrisPayload}
                  merchantName={created.merchant.merchantName}
                  nmid={created.merchant.nmid}
                />
              </div>
              <div className="text-center">
                <p className="eyebrow">Minta pembeli transfer persis</p>
                <p className="num mt-1 text-[30px] font-semibold leading-none">
                  {fmt(created.qrisAmount)}
                </p>
                <p className="mt-1.5 text-[13px] text-ink-mute">
                  {created.qrisAmount !== created.amount
                    ? `Harga ${fmt(created.amount)} + kode unik untuk pencocokan`
                    : `Berlaku ${countdown(created.expiresAt)}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-mute">
                Pembeli buka tautan ini, scan QRIS, unggah bukti transfer — kode aktivasi
                muncul sendiri di layar mereka. Anda bisa pantau di tab Tautan.
              </p>
              <button
                onClick={async () => {
                  if (await copy(payUrl)) toast("Tautan disalin");
                }}
                className="flex w-full items-center gap-3 rounded border border-line px-3 py-3 text-left"
              >
                <span className="num min-w-0 flex-1 truncate text-[13px]">{payUrl}</span>
                <Copy className="h-4 w-4 shrink-0 text-ink-mute" />
              </button>
              <p className="text-[13px] text-ink-mute">
                Berlaku {countdown(created.expiresAt)}.
              </p>
            </div>
          )}

          {created.instructions && (
            <p className="rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px] text-ink-soft">
              {created.instructions}
            </p>
          )}

          {mode === "qris" && (
            <a
              href={whatsappUrl(shareMessage, created.customerPhone)}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Button variant="quiet" block>
                <MessageCircle className="h-[18px] w-[18px]" />
                Kirim tautan lewat WhatsApp
              </Button>
            </a>
          )}
        </div>
      )}

      {paid && detail && (
        <div className="space-y-4">
          {codes.map((code) => (
            <button
              key={code}
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
          ))}

          <p className="text-[13px] text-ink-mute">
            Komisi masuk hitungan payout setelah admin memverifikasi bukti bayar.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function Segmented({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) {
  const options: { value: Mode; label: string; icon: typeof QrCode }[] = [
    { value: "qris", label: "Tunjukkan QRIS", icon: QrCode },
    { value: "link", label: "Kirim tautan", icon: Send },
  ];
  return (
    <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold transition ${
              active ? "bg-surface text-ink shadow-sm" : "text-ink-mute"
            }`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
