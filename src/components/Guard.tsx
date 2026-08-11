import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { api } from "@/convex/_generated/api";

// §5.6 — one query decides where a session belongs.

export const HOME: Record<string, string> = {
  L1: "/l1",
  L2: "/l2",
  ADMIN: "/admin",
};

export function useMe() {
  return useQuery(api.users.me);
}

export function Guard({
  role,
  children,
}: {
  role?: "L1" | "L2" | "ADMIN";
  children: ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void router.replace("/masuk");
      return;
    }
    if (me === undefined) return;
    if (me === null) {
      void router.replace("/masuk");
      return;
    }
    if (me.status === "SUSPENDED") {
      void router.replace("/ditangguhkan");
      return;
    }
    if (me.status !== "ACTIVE" || !me.role) {
      void router.replace("/menunggu");
      return;
    }
    if (role && me.role !== role) {
      void router.replace(HOME[me.role] ?? "/masuk");
    }
  }, [isLoading, isAuthenticated, me, role, router]);

  if (isLoading || me === undefined || !me || me.status !== "ACTIVE" || (role && me.role !== role)) {
    return <Splash />;
  }
  return <>{children}</>;
}

export function Splash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold tracking-[-0.04em] text-ink">AYO</span>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
      </div>
    </div>
  );
}
