import { useMutation } from "convex/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Wordmark } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

// §3.2 public registration — the account exists immediately, an admin approves it.

export default function DaftarPage() {
  const register = useMutation(api.registration.registerPublic);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", role: "L1" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        name: form.name,
        email: form.email,
        mobile: form.mobile || undefined,
        intendedRole: form.role as "L1" | "L2",
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pt-[18vh]">
        <Wordmark />
        <h1 className="mt-10 text-[28px] font-semibold tracking-[-0.03em]">Terkirim</h1>
        <p className="mt-2 text-[15px] text-ink-mute">
          Admin akan meninjau pendaftaran Anda. Masuk dengan email yang sama untuk melihat
          statusnya.
        </p>
        <Link href="/masuk" className="mt-6">
          <Button block>Ke halaman masuk</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6 pb-10 pt-[12vh]">
      <Wordmark />
      <form onSubmit={submit} className="mt-8">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Daftar</h1>
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
          <Field label="Nomor HP" hint="Opsional">
            <Input
              inputMode="tel"
              placeholder="0811…"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </Field>
          <Field label="Peran" error={error}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="L1">L1 — agen lapangan</option>
              <option value="L2">L2 — koordinator</option>
            </Select>
          </Field>
        </div>
        <Button type="submit" block className="mt-6" disabled={busy}>
          {busy ? "Mengirim…" : "Kirim pendaftaran"}
        </Button>
        <p className="mt-6 text-[14px] text-ink-mute">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-ink underline underline-offset-4">
            Masuk
          </Link>
        </p>
      </form>
    </main>
  );
}
