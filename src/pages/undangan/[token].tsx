import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { Splash } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

// §5.3 — an invited L1 lands active under the inviting L2, no approval queue.

export default function UndanganPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const info = useQuery(api.registration.inviteInfo, token ? { token } : "skip");
  const register = useMutation(api.registration.registerViaInvite);

  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ token, ...form, mobile: form.mobile || undefined });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token || info === undefined) return <Splash />;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-[14vh]">
      <Wordmark />

      {/* `done` first: the invite flips to USED on success, so inviteInfo goes
          invalid the moment registration works. */}
      {done ? (
        <>
          <h1 className="mt-10 text-[28px] font-semibold tracking-[-0.03em]">Akun aktif</h1>
          <p className="mt-2 text-[15px] text-ink-mute">
            Masuk dengan email Anda untuk mulai berjualan.
          </p>
          <Link href="/masuk" className="mt-6">
            <Button block>Masuk</Button>
          </Link>
        </>
      ) : !info.valid && !busy ? (
        <>
          <h1 className="mt-10 text-[28px] font-semibold tracking-[-0.03em]">
            Undangan tidak berlaku
          </h1>
          <p className="mt-2 text-[15px] text-ink-mute">
            Minta tautan baru dari koordinator Anda.
          </p>
        </>
      ) : (
        <form onSubmit={submit} className="mt-8">
          <p className="eyebrow">Undangan dari</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">{info.l2Name}</h1>
          <div className="mt-6 space-y-4">
            <Field label="Nama">
              <Input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                inputMode="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Nomor HP" hint="Opsional" error={error}>
              <Input
                inputMode="tel"
                placeholder="0811…"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </Field>
          </div>
          <Button type="submit" block className="mt-6" disabled={busy}>
            {busy ? "Membuat…" : "Buat akun"}
          </Button>
        </form>
      )}
    </main>
  );
}
