import { useRouter } from "next/router";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { Loader2 } from "lucide-react";

/**
 * Legacy salesperson login. Login is now unified at /login — this route is
 * kept only so old links and bookmarks don't 404. Always redirects to /login
 * (or to the right app once authenticated, via RouteGuard).
 */
function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function RedirectToLogin() {
  const router = useRouter();
  if (typeof window !== "undefined") router.replace("/login");
  return <FullScreenSpinner />;
}

function RedirectSignedIn() {
  const router = useRouter();
  // "/" lets RouteGuard bounce agents to "/app" and admins stay on "/".
  if (typeof window !== "undefined") router.replace("/");
  return <FullScreenSpinner />;
}

export default function AppLoginPage() {
  return (
    <>
      <AuthLoading>
        <FullScreenSpinner />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToLogin />
      </Unauthenticated>
      <Authenticated>
        <RedirectSignedIn />
      </Authenticated>
    </>
  );
}
