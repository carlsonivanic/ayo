import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { L1Performance } from "@/components/L1Performance";
import { Loading } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function AnggotaTim() {
  return (
    <Guard role="L2">
      <Body />
    </Guard>
  );
}

function Body() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? (router.query.id as Id<"users">) : null;
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.performance.member, id ? { l1Id: id, now } : "skip");

  return (
    <AppShell title={data?.name ?? "Anggota"} back="/l2/tim">
      {!data ? (
        <Loading rows={5} />
      ) : (
        <L1Performance data={data} />
      )}
    </AppShell>
  );
}
