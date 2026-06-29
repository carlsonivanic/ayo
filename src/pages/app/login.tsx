import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch {
      setError("Email atau kata sandi salah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AYO
          </div>
          <CardTitle>Portal Salesperson</CardTitle>
          <CardDescription>
            Masuk untuk membuat kode, kelola merchant, dan lihat komisi kamu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Masuk
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-medium text-primary underline">
              Daftar di sini
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/welcome" className="underline">
              ← Pilihan masuk lain
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AppLoginPage() {
  const router = useRouter();
  return (
    <>
      <Authenticated>
        <Redirect router={router} />
      </Authenticated>
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
    </>
  );
}

function Redirect({ router }: { router: ReturnType<typeof useRouter> }) {
  if (typeof window !== "undefined") router.replace("/app");
  return null;
}
