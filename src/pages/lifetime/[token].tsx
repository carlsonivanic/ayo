import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { Wordmark } from "@/components/AppShell";
import { Splash } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/convex/_generated/api";
import { money } from "@/lib/format";

// §4.5 — lifetime is bought inside SellMore, never in a plain browser. This page
// is the fallback that gets the buyer into the app.

export default function LifetimePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const link = useQuery(api.sell.publicLink, token ? { token } : "skip");

  if (!token || link === undefined) return <Splash />;

  const deepLink = `sellmore://lifetime/${token}`;
  const storeUrl =
    process.env.NEXT_PUBLIC_SELLMORE_INSTALL_URL ?? "https://sellmore.id";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-6 flex justify-center">
        <Wordmark />
      </div>

      {link === null ? (
        <Card className="p-6 text-center">
          <p className="text-[16px] font-semibold">Tautan tidak ditemukan</p>
        </Card>
      ) : link.status !== "SHARED" ? (
        <Card className="p-6 text-center">
          <p className="text-[16px] font-semibold">
            {link.status === "PAID" ? "Sudah dibayar" : "Tautan sudah tidak berlaku"}
          </p>
          <p className="mt-1 text-[14px] text-ink-mute">
            {link.status === "PAID"
              ? "Buka SellMore untuk mengaktifkan kursi Anda."
              : "Minta tautan baru ke penjual Anda."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 pb-5 pt-6 text-center">
            <p className="eyebrow">SellMore · {link.planName}</p>
            <p className="num mt-2 text-[38px] font-semibold leading-none tracking-[-0.02em]">
              {money(link.amount)}
            </p>
            <p className="mt-2 text-[13px] text-ink-mute">
              {link.seatCount} kursi · sekali bayar, selamanya
            </p>
          </div>
          <div className="space-y-3 border-t border-line px-5 py-5">
            <a href={deepLink}>
              <Button block>Buka di SellMore</Button>
            </a>
            <a href={storeUrl} target="_blank" rel="noreferrer">
              <Button block variant="quiet">
                Belum punya SellMore
              </Button>
            </a>
            <p className="text-center text-[12px] text-ink-faint">
              Pembelian lifetime hanya bisa lewat aplikasi SellMore.
            </p>
          </div>
        </Card>
      )}
    </main>
  );
}
