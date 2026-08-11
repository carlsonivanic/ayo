import { fail } from "./authz";
import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// §6.3 — mobile numbers are stored normalized to E.164 and are unique when
// present. Informational only in the MVP; login stays email OTP.
// MD-1 default: "62..." gets a "+" prepended. MD-2 default: accept international.

const ACCEPT_INTERNATIONAL = true; // MD-2 default

export function normalizeMobile(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  const cleaned = input.replace(/[\s-]/g, "");
  if (cleaned === "") return undefined;

  let e164: string;
  if (cleaned.startsWith("0")) e164 = `+62${cleaned.slice(1)}`;
  else if (cleaned.startsWith("+62")) e164 = cleaned;
  else if (cleaned.startsWith("62")) e164 = `+${cleaned}`;
  else if (cleaned.startsWith("+")) e164 = cleaned;
  else fail("INVALID_MOBILE", "Nomor tidak valid.");

  if (!/^\+\d+$/.test(e164)) fail("INVALID_MOBILE", "Nomor tidak valid.");

  if (e164.startsWith("+62")) {
    if (!/^\+62\d{8,12}$/.test(e164)) fail("INVALID_MOBILE", "Nomor tidak valid.");
    return e164;
  }
  if (!ACCEPT_INTERNATIONAL) fail("INVALID_MOBILE", "Hanya nomor Indonesia.");
  if (!/^\+\d{7,15}$/.test(e164)) fail("INVALID_MOBILE", "Nomor tidak valid.");
  return e164;
}

/** Convex has no unique index — enforce at every write path. */
export async function assertMobileFree(
  ctx: MutationCtx,
  mobile: string | undefined,
  exceptUserId?: Id<"users">,
): Promise<void> {
  if (!mobile) return;
  const clash = await ctx.db
    .query("users")
    .withIndex("by_mobile", (q) => q.eq("mobile", mobile))
    .first();
  if (clash && clash._id !== exceptUserId) {
    fail("MOBILE_TAKEN", "Nomor sudah dipakai.");
  }
}
