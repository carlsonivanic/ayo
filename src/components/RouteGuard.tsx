import { ReactNode } from "react";
import { useRouter } from "next/router";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";

/** Pages anyone may reach without being signed in. */
const PUBLIC_PATHS = ["/welcome", "/login", "/daftar", "/app/login"];

function isAgentPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <FullScreen>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </FullScreen>
  );
}

/**
 * Authenticated, but the account has no profile in *either* app (neither admin
 * nor salesperson) — e.g. a brand-new sign-up awaiting approval.
 */
function PendingScreen() {
  const { signOut } = useAuthActions();
  return (
    <FullScreen>
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Akses menunggu persetujuan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun kamu sudah masuk, tetapi belum punya peran di sistem ini. Hubungi
          admin untuk diberikan akses.
        </p>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
      </div>
    </FullScreen>
  );
}

/**
 * Resolves which app the signed-in user belongs to and only renders the page
 * once that's confirmed. This keeps a salesperson's browser from ever firing an
 * admin-only query (which throws "akun admin diperlukan") and vice-versa — the
 * wrong-section page is never mounted; we redirect to the right app instead.
 */
function Gate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const agentRoute = isAgentPath(router.pathname);
  const admin = useQuery(api.admins.me);
  const agent = useQuery(api.agentAuth.me);

  // Wait until we know who this user is in both apps.
  if (admin === undefined || agent === undefined) return <Spinner />;

  const isAdmin = admin !== null;
  const isAgent = agent !== null;

  if (agentRoute) {
    if (isAgent) return <>{children}</>;
    if (isAdmin) {
      if (typeof window !== "undefined") router.replace("/");
      return <Spinner />;
    }
  } else {
    if (isAdmin) return <>{children}</>;
    if (isAgent) {
      if (typeof window !== "undefined") router.replace("/app");
      return <Spinner />;
    }
  }

  return <PendingScreen />;
}

function RedirectToWelcome() {
  const router = useRouter();
  if (typeof window !== "undefined") router.replace("/welcome");
  return <Spinner />;
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Login / public pages render without any auth gating.
  if (PUBLIC_PATHS.includes(router.pathname)) return <>{children}</>;

  return (
    <>
      <AuthLoading>
        <Spinner />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToWelcome />
      </Unauthenticated>
      <Authenticated>
        <Gate>{children}</Gate>
      </Authenticated>
    </>
  );
}
