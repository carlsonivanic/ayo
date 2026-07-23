import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";
import { lookupGeoHint } from "@/lib/geoRegion";
import { BuildIdStamp } from "@/components/BuildIdStamp";

export default function DaftarPage() {
  const register = useAction(api.registration.registerAgent);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [referrerPhone, setReferrerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Region is auto-resolved from the user's IP geo location (silently). The
  // user never picks a wilayah — the backend find-or-creates one from this
  // hint, falling back to a default region on failure.
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [geoResolved, setGeoResolved] = useState(false);

  // Honeypot — hidden from real users, bots tend to fill it.
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Track when the page loaded to detect instant bot submissions.
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    lookupGeoHint(controller.signal)
      .then((hint) => {
        if (cancelled) return;
        setGeoHint(hint);
        setGeoResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setGeoResolved(true); // still allow submit; backend defaults region
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        phone,
        geoHint: geoHint ?? undefined,
        referrerPhone: referrerPhone.trim() || undefined,
        hp: honeypotRef.current?.value ?? "",
        elapsed: Date.now() - loadedAt.current,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-lg font-semibold">Pendaftaran diterima!</h2>
            <p className="text-sm text-muted-foreground">
              Akun kamu sedang menunggu persetujuan admin. Setelah disetujui,
              kamu bisa langsung masuk dengan email & kata sandi yang tadi
              didaftarkan.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-primary underline"
            >
              Ke halaman masuk
            </Link>
          </CardContent>
        </Card>
        <BuildIdStamp />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AYO
          </div>
          <CardTitle>Daftar Salesperson</CardTitle>
          <CardDescription>
            Isi form di bawah untuk bergabung. Admin akan meninjau dan
            mengaktifkan akun kamu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Honeypot — hidden from humans via CSS */}
            <div style={{ display: "none" }} aria-hidden="true">
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nama lengkap</Label>
              <Input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="kamu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Nomor HP</Label>
              <Input
                id="phone"
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referrer">
                Nomor HP referral{" "}
                <span className="text-muted-foreground font-normal">
                  (opsional)
                </span>
              </Label>
              <Input
                id="referrer"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={referrerPhone}
                onChange={(e) => setReferrerPhone(e.target.value)}
              />
            </div>

            {/* Auto-detected region status — informational only, not editable. */}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {geoResolved
                ? geoHint
                  ? `Wilayah terdeteksi: ${geoHint}`
                  : "Menggunakan wilayah default"
                : "Menentukan wilayah…"}
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Daftar Sekarang
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary underline">
              Masuk di sini
            </Link>
          </p>
        </CardContent>
      </Card>
      <BuildIdStamp />
    </div>
  );
}
