import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { HOME } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

// §3.1 — email OTP only. Two steps, one field each.

export default function MasukPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const [requestedAt, setRequestedAt] = useState(0);
  const echo = useQuery(
    api.otp.devEcho,
    step === "code" ? { email, now: requestedAt } : "skip",
  );

  useEffect(() => {
    if (isAuthenticated && me) {
      void router.replace(
        me.status === "SUSPENDED"
          ? "/ditangguhkan"
          : me.status !== "ACTIVE" || !me.role
            ? "/menunggu"
            : (HOME[me.role] ?? "/"),
      );
    }
  }, [isAuthenticated, me, router]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("email-otp", { email: email.trim().toLowerCase() });
      setRequestedAt(Date.now());
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 60);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("email-otp", { email: email.trim().toLowerCase(), code: code.trim() });
    } catch {
      setError("Kode salah atau sudah kedaluwarsa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-[18vh]">
      <Wordmark />

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Masuk</h1>
          <div className="mt-6">
            <Field label="Email" error={error}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
              />
            </Field>
          </div>
          <Button type="submit" block className="mt-5" disabled={busy || !email}>
            {busy ? "Mengirim…" : "Kirim kode"}
          </Button>
          <p className="mt-6 text-[14px] text-ink-mute">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-semibold text-ink underline underline-offset-4">
              Daftar
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-10">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Cek email</h1>
          <p className="mt-2 text-[14px] text-ink-mute">
            Kode 6 digit dikirim ke <span className="text-ink">{email}</span>.
          </p>
          <div className="mt-6">
            <Field label="Kode" error={error}>
              <Input
                ref={codeRef}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="num h-14 text-center text-[26px] tracking-[0.4em]"
                placeholder="000000"
              />
            </Field>
          </div>
          <Button type="submit" block className="mt-5" disabled={busy || code.length < 6}>
            {busy ? "Memeriksa…" : "Masuk"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="mt-5 text-[14px] text-ink-mute underline underline-offset-4"
          >
            Ganti email
          </button>

          {echo && (
            <p className="mt-8 rounded border border-dashed border-line-strong px-3 py-2 text-[13px] text-ink-mute">
              Mode pengembangan — kode: <span className="num text-ink">{echo.code}</span>
            </p>
          )}
        </form>
      )}
    </main>
  );
}
