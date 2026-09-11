import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { Wordmark } from "@/components/AppShell";
import { Splash } from "@/components/Guard";
import { QrisCode } from "@/components/Qris";
import { Card } from "@/components/ui/Card";
import { api } from "@/convex/_generated/api";
import { countdown, money } from "@/lib/format";

// Merchant-facing checkout. The token is the capability — no login.
// Settlement is manual: this page only shows the QRIS. The agent confirms the
// transfer and hands over the activation code.

export default function BayarPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const link = useQuery(api.sell.publicLink, token ? { token } : "skip");

  if (!token || link === undefined) return <Splash />;

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-6 py-12">
      {children}
    </main>
  );

  if (link === null) {
    return shell(
      <Card className="p-6 text-center">
        <p className="text-[16px] font-semibold">Tautan tidak ditemukan</p>
        <p className="mt-1 text-[14px] text-ink-mute">Minta tautan baru ke penjual Anda.</p>
      </Card>,
    );
  }

  if (link.status === "PAID") {
    return shell(
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-good-soft">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-good" fill="none" strokeWidth="2.2" stroke="currentColor">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Pembayaran berhasil</h1>
        <p className="mt-2 text-[15px] text-ink-mute">
          {link.kind === "LIFETIME"
            ? "Buka SellMore untuk mengaktifkan kursi Anda."
            : "Penjual akan mengirim kode aktivasi lewat WhatsApp."}
        </p>
      </div>,
    );
  }

  if (link.status !== "SHARED" || link.expiresAt < Date.now()) {
    return shell(
      <Card className="p-6 text-center">
        <p className="text-[16px] font-semibold">Tautan sudah kedaluwarsa</p>
        <p className="mt-1 text-[14px] text-ink-mute">Minta tautan baru ke penjual Anda.</p>
      </Card>,
    );
  }

  if (link.kind === "LIFETIME") {
    void router.replace(`/lifetime/${token}`);
    return <Splash />;
  }

  return shell(
    <>
      <div className="mb-6 flex justify-center">
        <Wordmark />
      </div>
      <Card className="overflow-hidden">
        <div className="px-5 pb-5 pt-6 text-center">
          <p className="eyebrow">SellMore · {link.planName}</p>
          <p className="num mt-2 text-[38px] font-semibold leading-none tracking-[-0.02em]">
            {money(link.amount)}
          </p>
          <p className="mt-2 text-[13px] text-ink-mute">
            per {link.priceUnit} · berlaku {countdown(link.expiresAt)}
          </p>
        </div>

        <div className="border-t border-line px-5 py-5">
          {link.qrisPayload ? (
            <div className="text-center">
              <div className="flex justify-center">
                <QrisCode payload={link.qrisPayload} size={200} />
              </div>
              <p className="mt-3 text-[13px] text-ink-mute">
                Pindai dengan aplikasi bank atau e-wallet Anda.
              </p>
              <p className="mt-1 text-[13px] text-ink-mute">
                Transfer persis{" "}
                <span className="num font-semibold text-ink">{money(link.qrisAmount)}</span>
              </p>
            </div>
          ) : (
            <p className="text-center text-[13px] text-ink-mute">
              QRIS belum tersedia. Hubungi penjual Anda.
            </p>
          )}
          {link.instructions && (
            <p className="mt-4 rounded border border-line bg-black/[0.015] px-3 py-2 text-[13px] text-ink-soft">
              {link.instructions}
            </p>
          )}
        </div>
      </Card>
      {link.sellerName && (
        <p className="mt-4 text-center text-[13px] text-ink-mute">Penjual: {link.sellerName}</p>
      )}
    </>,
  );
}
