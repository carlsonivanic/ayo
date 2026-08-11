import { useConvexAuth } from "convex/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { HOME, Splash, useMe } from "@/components/Guard";

export default function IndexPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void router.replace("/masuk");
      return;
    }
    if (me === undefined) return;
    if (!me) {
      void router.replace("/masuk");
      return;
    }
    if (me.status === "SUSPENDED") void router.replace("/ditangguhkan");
    else if (me.status !== "ACTIVE" || !me.role) void router.replace("/menunggu");
    else void router.replace(HOME[me.role]);
  }, [isLoading, isAuthenticated, me, router]);

  return <Splash />;
}
