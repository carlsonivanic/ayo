import { useAuthActions } from "@convex-dev/auth/react";
import { Wordmark } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";

export default function DitangguhkanPage() {
  const { signOut } = useAuthActions();
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pt-[20vh]">
      <Wordmark />
      <h1 className="mt-10 text-[28px] font-semibold tracking-[-0.03em]">Akun ditangguhkan</h1>
      <p className="mt-2 text-[15px] text-ink-mute">
        Hubungi admin untuk mengaktifkan kembali akun Anda.
      </p>
      <Button variant="quiet" className="mt-8" onClick={() => void signOut()}>
        Keluar
      </Button>
    </main>
  );
}
