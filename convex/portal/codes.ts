import { query, mutation, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { requireAgent } from "../agentAuth";
import { generateCodeString } from "../lib/codegen";
import { getParamNumber, getTierPriceIDR } from "../params";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Live list prices for the tiers a salesperson may sell, in the agent's region.
 * Ordered for the UI per the PRD Ariely decoy sequence (Monthly → Annual →
 * Lifetime Solo → Lifetime Duo). Returned as BigInt strings (IDR).
 */
export const sellableTierPrices = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);
    const r = agent.regionId;
    return {
      monthly: (await getTierPriceIDR(ctx, "monthly", undefined, r)).toString(),
      annual: (await getTierPriceIDR(ctx, "annual", undefined, r)).toString(),
      lifetime_solo: (
        await getTierPriceIDR(ctx, "lifetime", "solo", r)
      ).toString(),
      lifetime_duo: (
        await getTierPriceIDR(ctx, "lifetime", "duo", r)
      ).toString(),
    };
  },
});

// Tiers a salesperson may sell (PRD §4A). Daily/Weekly are self-serve only.
const agentTierValidator = v.union(
  v.literal("monthly"),
  v.literal("annual"),
  v.literal("lifetime"),
);

/** Insert a unique agent-channel code, retrying on the rare collision. */
async function insertUniqueAgentCode(
  ctx: MutationCtx,
  fields: {
    tier: "monthly" | "annual" | "lifetime";
    lifetimeKind?: "solo" | "duo";
    agentId: Id<"agents">;
    regionId: Id<"regions">;
    expiresUnusedAt?: number;
    duoExpiresAt?: number;
    priceIDR?: bigint;
  },
): Promise<Id<"subscriptionCodes">> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCodeString();
    const clash = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (clash) continue;
    return await ctx.db.insert("subscriptionCodes", {
      code,
      status: "unused",
      channel: "agent",
      ...fields,
    });
  }
  throw new Error("Gagal membuat kode unik, coba lagi.");
}

/**
 * Salesperson generates a subscription code for a merchant they just sold to
 * (PRD §4A "Generate Subscription Code"). Code is attributed to the agent and
 * the agent's own region. Phase 1: payment is confirmed manually by the agent
 * (cash/QRIS done out-of-band) — no gateway call. Commission is written on
 * activation, not here.
 */
export const myGenerateCode = mutation({
  args: {
    tier: agentTierValidator,
    lifetimeKind: v.optional(v.union(v.literal("solo"), v.literal("duo"))),
    paymentConfirmed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const agent = await requireAgent(ctx);
    if (agent.status === "suspended")
      throw new Error("Akun disuspend — tidak bisa membuat kode.");
    if (!args.paymentConfirmed)
      throw new Error("Konfirmasi pembayaran terlebih dahulu.");

    const regionId = agent.regionId;
    const unusedDays =
      (await getParamNumber(ctx, "code_unused_expiry_days", regionId)) ?? 90;
    const expiresUnusedAt = Date.now() + unusedDays * 86400000;

    // Lifetime Duo: a linked pair sharing a 24–48h pairing window.
    if (args.tier === "lifetime" && args.lifetimeKind === "duo") {
      const duoWindowHours =
        (await getParamNumber(ctx, "lifetime_duo_window_hours", regionId)) ?? 48;
      const duoExpiresAt = Date.now() + duoWindowHours * 3600000;
      const duoTotal = await getTierPriceIDR(ctx, "lifetime", "duo", regionId);
      const firstHalf = duoTotal / 2n;
      const secondHalf = duoTotal - firstHalf;
      const base = { agentId: agent._id, regionId, expiresUnusedAt, duoExpiresAt };
      const first = await insertUniqueAgentCode(ctx, {
        ...base,
        tier: "lifetime",
        lifetimeKind: "duo",
        priceIDR: firstHalf,
      });
      const second = await insertUniqueAgentCode(ctx, {
        ...base,
        tier: "lifetime",
        lifetimeKind: "duo",
        priceIDR: secondHalf,
      });
      await ctx.db.patch(first, { duoPairId: second });
      await ctx.db.patch(second, { duoPairId: first });
      const a = await ctx.db.get(first);
      const b = await ctx.db.get(second);
      return { codes: [a!.code, b!.code], duoExpiresAt };
    }

    const lifetimeKind =
      args.tier === "lifetime" ? args.lifetimeKind ?? "solo" : undefined;
    const priceIDR = await getTierPriceIDR(
      ctx,
      args.tier,
      lifetimeKind,
      regionId,
    );
    const id = await insertUniqueAgentCode(ctx, {
      tier: args.tier,
      lifetimeKind,
      agentId: agent._id,
      regionId,
      expiresUnusedAt,
      priceIDR,
    });
    const doc = await ctx.db.get(id);
    return { codes: [doc!.code] };
  },
});

/** The signed-in agent's own codes, most recent first. */
export const myCodes = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);
    const codes: Doc<"subscriptionCodes">[] = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(100);
    return codes.map((c) => ({
      _id: c._id,
      code: c.code,
      tier: c.tier,
      lifetimeKind: c.lifetimeKind,
      status: c.status,
      priceIDR: c.priceIDR !== undefined ? c.priceIDR.toString() : null,
      duoExpiresAt: c.duoExpiresAt,
      expiresUnusedAt: c.expiresUnusedAt,
      activatedAt: c.activatedAt,
      revokedReason: c.revokedReason,
      createdAt: c._creationTime,
    }));
  },
});
