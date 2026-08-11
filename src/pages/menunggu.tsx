import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Wordmark } from "@/components/AppShell";
import { HOME, Splash, useMe } from "@/components/Guard";
import { Button } from "@/components/ui/Button";

export default function MenungguPage() {
  const me = useMe();
  const router = useRouter();
  const { signOut } = useAuthActions();

  useEffect(() => {
    if (me === null) void router.replace("/masuk");
    if (me && me.status === "ACTIVE" && me.role) void router.replace(HOME[me.role]);
    if (me && me.status === "SUSPENDED") void router.replace("/ditangguhkan");
  }, [me, router]);

  if (me === undefined || !me) return <Splash />;

  const rejected = me.registrationStatus === "REJECTED";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pt-[20vh]">
      <Wordmark />
      <h1 className="mt-10 text-[28px] font-semibold tracking-[-0.03em]">
        {rejected ? "Pendaftaran ditolak" : "Menunggu persetujuan"}
      </h1>
      <p className="mt-2 text-[15px] text-ink-mute">
        {rejected
          ? (me.registrationReason ?? "Hubungi admin untuk detailnya.")
          : "Admin akan mengaktifkan akun Anda. Halaman ini akan berubah sendiri."}
      </p>
      <Button variant="quiet" className="mt-8" onClick={() => void signOut()}>
        Keluar
      </Button>
    </main>
  );
}
