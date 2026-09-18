import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Copy, MessageCircle, Upload } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { Splash } from "@/components/Guard";
import { QrisFrame } from "@/components/Qris";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { countdown, money } from "@/lib/format";
import { copy, errorMessage, whatsappUrl } from "@/lib/utils";

// Merchant-facing checkout. The token is the capability — no login, ever.
//
// One URL covers the whole purchase: the QRIS while it is unpaid, the receipt
// upload, and from then on the activation code. Buyers close tabs, lose chats
// and come back an hour later, so this page must never become a dead end after
// the money has moved.

const MAX_PROOF_BYTES = 8 * 1024 * 1024;

const SELLMORE_URL =
  process.env.NEXT_PUBLIC_SELLMORE_APP_URL ?? "https://app.sellmore.id";

export default function BayarPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const link = useQuery(api.sell.publicLink, token ? { token } : "skip");
  const markViewed = useMutation(api.sell.markLinkViewed);

  // Tell the agent their link was opened — once per visit, never who by.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!token || seen.current === token) return;
    seen.current = token;
    void markViewed({ token }).catch(() => {});
  }, [token, markViewed]);

  if (!token || link === undefined) return <Splash />;

  if (link && link.kind === "LIFETIME" && link.status === "SHARED") {
    void router.replace(`/lifetime/${token}`);
    return <Splash />;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 flex justify-center">
        <Wordmark />
      </div>

      {link === null ? (
        <Notice title="Tautan tidak ditemukan" body="Minta tautan baru ke penjual Anda." />
      ) : link.status === "PAID" ? (
        <Paid link={link} />
      ) : link.open ? (
        <Checkout link={link} token={token} />
      ) : (
        <Notice
          title="Tautan sudah kedaluwarsa"
          body="Minta tautan baru ke penjual Anda."
          seller={link.sellerName}
          sellerPhone={link.sellerPhone}
        />
      )}
    </main>
  );
}

type Link = NonNullable<FunctionReturnType<typeof api.sell.publicLink>>;

function Notice({
  title,
  body,
  seller,
  sellerPhone,
}: {
  title: string;
  body: string;
  seller?: string | null;
  sellerPhone?: string | null;
}) {
  return (
    <Card className="p-6 text-center">
      <p className="text-[16px] font-semibold">{title}</p>
      <p className="mt-1 text-[14px] text-ink-mute">{body}</p>
      {seller && (
        <p className="mt-4 text-[13px] text-ink-mute">
          Penjual: {seller}
          {sellerPhone ? ` · ${sellerPhone}` : ""}
        </p>
      )}
    </Card>
  );
}

/** Unpaid: the QRIS, then the receipt. Both on one screen, in that order. */
function Checkout({ link, token }: { link: Link; token: string }) {
  const uploadUrl = useMutation(api.payments.generateBuyerProofUploadUrl);
  const submitProof = useMutation(api.payments.submitBuyerProof);
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      const url = await uploadUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Gagal mengunggah bukti.");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const result = await submitProof({ token, storageId });
      if (!result.ok) toast(result.reason, "warn");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="eyebrow">SellMore · {link.planName}</p>
        <p className="mt-1 text-[13px] text-ink-mute">
          Berlaku {countdown(link.expiresAt)}
        </p>
      </div>

      {link.qrisPayload ? (
        <div className="space-y-3">
          <div className="flex justify-center">
            <QrisFrame
              payload={link.qrisPayload}
              merchantName={link.merchant?.merchantName}
              nmid={link.merchant?.nmid}
            />
          </div>
          {/* The exact rupiah is what ties this transfer to this link. */}
          <div className="text-center">
            <p className="eyebrow">Transfer persis</p>
            <p className="num mt-1 text-[32px] font-semibold leading-none tracking-[-0.02em]">
              {money(link.qrisAmount)}
            </p>
            <p className="mt-1.5 text-[13px] text-ink-mute">
              {link.qrisAmount !== link.amount
                ? `Harga ${money(link.amount)} + kode unik untuk pencocokan`
                : "Pindai dengan aplikasi bank atau e-wallet"}
            </p>
          </div>
        </div>
      ) : (
        <Notice title="QRIS belum tersedia" body="Hubungi penjual Anda." />
      )}

      <Card className="p-4">
        <p className="text-[14px] font-semibold">Sudah transfer?</p>
        <p className="mt-1 text-[13px] text-ink-mute">
          Unggah bukti transfer — kode aktivasi langsung muncul di halaman ini.
        </p>
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
        <div className="mt-3">
          <Button block disabled={uploading} onClick={() => fileInput.current?.click()}>
            <Upload className="h-[18px] w-[18px]" />
            {uploading ? "Mengunggah…" : "Unggah bukti transfer"}
          </Button>
        </div>
      </Card>

      {link.instructions && (
        <p className="rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px] text-ink-soft">
          {link.instructions}
        </p>
      )}

      {link.sellerName && (
        <p className="text-center text-[13px] text-ink-mute">
          Penjual: {link.sellerName}
          {link.sellerPhone ? ` · ${link.sellerPhone}` : ""}
        </p>
      )}
    </div>
  );
}

/** Paid: the code, for as long as the buyer keeps the link. */
function Paid({ link }: { link: Link }) {
  const toast = useToast();
  const code = link.codes[0] ?? null;
  const deepLink = code ? `${SELLMORE_URL}/?code=${encodeURIComponent(code.code)}` : null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft">
          <Check className="h-7 w-7 text-good" strokeWidth={2.4} />
        </div>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">
          Pembayaran tercatat
        </h1>
        <p className="mt-1 text-[14px] text-ink-mute">
          {link.planName} · {money(link.amount)}
        </p>
      </div>

      {code ? (
        <Card className="overflow-hidden">
          <div className="px-4 pb-4 pt-5 text-center">
            <p className="eyebrow">Kode aktivasi</p>
            <p className="num mt-2 text-[24px] font-semibold tracking-[0.06em]">
              {code.code}
            </p>
            <p className="mt-2 text-[13px] text-ink-mute">
              Berlaku {countdown(code.expiresAt)}
            </p>
          </div>
          <div className="space-y-2 border-t border-line px-4 py-4">
            {deepLink && (
              <a href={deepLink}>
                <Button block>Buka di SellMore</Button>
              </a>
            )}
            <Button
              block
              variant="quiet"
              onClick={async () => {
                if (await copy(code.code)) toast("Kode disalin");
              }}
            >
              <Copy className="h-[18px] w-[18px]" />
              Salin kode
            </Button>
          </div>
        </Card>
      ) : link.kind === "LIFETIME" ? (
        <Card className="p-5 text-center">
          <p className="text-[15px] font-semibold">Buka SellMore untuk aktivasi</p>
          <p className="mt-1 text-[13px] text-ink-mute">
            {link.seats.length} kursi siap dipakai.
          </p>
        </Card>
      ) : null}

      {link.proof?.verification === "PENDING" && (
        <p className="text-center text-[13px] text-ink-mute">
          Bukti transfer sedang diperiksa. Kode di atas sudah bisa dipakai sekarang.
        </p>
      )}
      {link.proof?.verification === "REJECTED" && (
        <p className="rounded border border-warn/40 bg-warn-soft px-3 py-2 text-center text-[13px] text-warn">
          Bukti transfer ditolak. Hubungi penjual Anda.
          {link.proof.rejectionReason ? ` (${link.proof.rejectionReason})` : ""}
        </p>
      )}

      <p className="text-center text-[13px] text-ink-mute">
        Simpan tautan ini — kode bisa dibuka lagi kapan saja.
      </p>

      {link.sellerPhone && (
        <a
          href={whatsappUrl(`Halo ${link.sellerName ?? ""}, saya sudah bayar SellMore.`)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ink-soft underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" />
          Hubungi penjual
        </a>
      )}
    </div>
  );
}
