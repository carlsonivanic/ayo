import { useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { money } from "./format";

/** §29.4 — the display mode is an admin setting, so formatting is centralised. */
export function useMoney() {
  const me = useQuery(api.users.me);
  const mode = me?.moneyDisplay ?? "ROUNDED";
  return useCallback((value: number | null | undefined) => money(value, mode), [mode]);
}
