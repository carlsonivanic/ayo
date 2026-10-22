import { MutationCtx } from "../_generated/server";
import { fail } from "./authz";
import { generateCodeString } from "./codegen";

/** A fresh SM- code, unique across subscription codes and lifetime seats. */
export async function newActivationCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCodeString();
    const sub = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", candidate))
      .unique();
    const seat = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_code", (q) => q.eq("code", candidate))
      .unique();
    if (!sub && !seat) return candidate;
  }
  fail("CODE_GENERATION_FAILED", "Gagal membuat kode.");
}
