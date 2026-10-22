import { useRouter } from "next/router";
import { useEffect } from "react";
import { Splash } from "@/components/Guard";

// Lifetime now pays on the same QRIS checkout as subscriptions. Old shared
// links land here, so forward them.

export default function LifetimePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";

  useEffect(() => {
    if (token) void router.replace(`/bayar/${token}`);
  }, [token, router]);

  return <Splash />;
}
