import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { fail } from "./authz";

// Payouts are paid by hand to the agent's DANA wallet until a payment rail is
// integrated, so DANA is the only accepted bank and the account number is the
// DANA phone number.

export const PAYOUT_BANK = "DANA";

/** "0812 3456 7890" / "+62812…" / "62812…" → "081234567890". */
export function normalizeDana(input: string): string {
  let digits = input.replace(/[\s\-.()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  if (!/^08\d{7,11}$/.test(digits)) fail("INVALID_DANA", "Nomor DANA tidak valid.");
  return digits;
}

/** A profile only counts once it points at a DANA wallet. */
export function isPayoutReady(profile: Doc<"payoutProfiles"> | null): boolean {
  return !!profile && profile.completed && profile.bankName === PAYOUT_BANK;
}

export async function findPayoutProfile(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("payoutProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}
