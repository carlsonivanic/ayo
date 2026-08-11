import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { Wordmark } from "@/components/AppShell";
import { Splash } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/convex/_generated/api";
import { date } from "@/lib/format";

// §15.6 — a gifted seat is activated inside SellMore, where identity and the
// path-lock check live. This page hands the recipient over to the app.

export default function KursiPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const seat = useQuery(api.seats.publicSeatLink, token ? { token } : "skip");

  if (!token || seat === undefined) return <Splash />;

  const deepLink = `sellmore://seat/${token}`;
  const storeUrl = process.env.NEXT_PUBLIC_SELLMORE_INSTALL_URL ?? "https://sellmore.id";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-6 flex justify-center">
        <Wordmark />
      </div>

      {seat === null || seat.status === "ACTIVATED" ? (
        <Card className="p-6 text-center">
          <p className="text-[16px] font-semibold">Kursi tidak tersedia</p>
          <p className="mt-1 text-[14px] text-ink-mute">
            Kursi ini sudah dipakai atau tautannya tidak berlaku.
          </p>
        </Card>
      ) : seat.expired ? (
        <Card className="p-6 text-center">
          <p className="text-[16px] font-semibold">Tautan kedaluwarsa</p>
          <p className="mt-1 text-[14px] text-ink-mute">
            Nilai kursi tidak hilang. Minta tautan baru dari pemberi hadiah.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 pb-5 pt-6 text-center">
            <p className="eyebrow">Hadiah kursi</p>
            <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">{seat.planName}</p>
            <p className="mt-2 text-[13px] text-ink-mute">
              Berlaku sampai {date(seat.expiresAt)}
            </p>
          </div>
          <div className="space-y-3 border-t border-line px-5 py-5">
            <a href={deepLink}>
              <Button block>Aktifkan di SellMore</Button>
            </a>
            <a href={storeUrl} target="_blank" rel="noreferrer">
              <Button block variant="quiet">
                Belum punya SellMore
              </Button>
            </a>
            <p className="text-center text-[12px] text-ink-faint">
              Hanya untuk toko yang belum berlangganan.
            </p>
          </div>
        </Card>
      )}
    </main>
  );
}
