import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
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
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";

  const preview = useQuery(api.agentInvites.getInvitePreview, token ? { token } : "skip");
  const accept = useAction(api.agentInvites.acceptInvite);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setLoading(true);
    try {
      await accept({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="text-lg font-semibold">Akun aktif!</h2>
        <p className="text-sm text-muted-foreground">
          Kata sandi kamu sudah disimpan. Sekarang kamu bisa masuk ke Agent
          Portal.
        </p>
        <Link
          href="/app/login"
          className="inline-block text-sm font-medium text-primary underline"
        >
          Ke halaman masuk
        </Link>
      </Shell>
    );
  }

  if (preview === undefined) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </Shell>
    );
  }

  if (preview.status !== "valid") {
    const message =
      preview.status === "expired"
        ? "Tautan undangan ini sudah kedaluwarsa. Minta admin membuatkan yang baru."
        : preview.status === "used"
          ? "Tautan undangan ini sudah dipakai."
          : "Tautan undangan tidak ditemukan.";
    return (
      <Shell>
        <h2 className="text-lg font-semibold">Tautan tidak berlaku</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </Shell>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AYO
          </div>
          <CardTitle>Halo, {preview.name}</CardTitle>
          <CardDescription>
            Pilih kata sandi untuk akun {preview.email}. Setelah ini kamu bisa
            langsung masuk ke Agent Portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
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
              <Label htmlFor="confirmPassword">Ulangi kata sandi</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Aktifkan Akun
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-8 space-y-3">{children}</CardContent>
      </Card>
    </div>
  );
}
