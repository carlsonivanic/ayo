import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admins";
import { generateCodeString } from "./lib/codegen";
import { getParamNumber, getTierPriceIDR } from "./params";
import { Id } from "./_generated/dataModel";

const tierValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("annual"),
  v.literal("lifetime"),
);

const channelValidator = v.union(
  v.literal("agent"),
  v.literal("retail"),
  v.literal("self_serve"),
);

/** Insert a unique SM-XXXX-XXXX-XXXXX code, retrying on the rare collision. */
async function insertUniqueCode(
  ctx: MutationCtx,
  fields: {
    tier: "daily" | "weekly" | "monthly" | "annual" | "lifetime";
    lifetimeKind?: "solo" | "duo";
    channel: "agent" | "retail" | "self_serve";
    agentId?: Id<"agents">;
    batchId?: string;
    regionId: Id<"regions">;
    expiresUnusedAt?: number;
    duoExpiresAt?: number;
    priceIDR?: bigint;
    createdBy: Id<"adminProfiles">;
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
      ...fields,
    });
  }
  throw new Error("Gagal membuat kode unik, coba lagi.");
}

/**
 * Generate subscription code(s). Commission is NOT written here — it runs on
 * activation. Lifetime Duo creates a linked pair sharing a duoExpiresAt window.
 */
export const generateCode = mutation({
  args: {
    tier: tierValidator,
    lifetimeKind: v.optional(v.union(v.literal("solo"), v.literal("duo"))),
    channel: channelValidator,
    regionId: v.id("regions"),
    agentId: v.optional(v.id("agents")),
    quantity: v.optional(v.number()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, ["ops_admin", "super_admin"]);
    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("region not found");

    const unusedDays =
      (await getParamNumber(ctx, "code_unused_expiry_days", args.regionId)) ?? 90;
    const expiresUnusedAt = Date.now() + unusedDays * 86400000;

    const base = {
      channel: args.channel,
      agentId: args.agentId,
      batchId: args.batchId,
      regionId: args.regionId,
      expiresUnusedAt,
      createdBy: admin._id,
    };

    // Lifetime Duo: a linked pair with a 24–48h pairing window.
    if (args.tier === "lifetime" && args.lifetimeKind === "duo") {
      const duoWindowHours =
        (await getParamNumber(ctx, "lifetime_duo_window_hours", args.regionId)) ??
        48;
      const duoExpiresAt = Date.now() + duoWindowHours * 3600000;
      // Snapshot the bundle price now and split it evenly so summing priceIDR
      // across both codes equals the real transaction price (no double counting).
      const duoTotal = await getTierPriceIDR(
        ctx,
        "lifetime",
        "duo",
        args.regionId,
      );
      const firstHalf = duoTotal / 2n;
      const secondHalf = duoTotal - firstHalf; // keeps odd amounts exact
      const first = await insertUniqueCode(ctx, {
        ...base,
        tier: "lifetime",
        lifetimeKind: "duo",
        duoExpiresAt,
        priceIDR: firstHalf,
      });
      const second = await insertUniqueCode(ctx, {
        ...base,
        tier: "lifetime",
        lifetimeKind: "duo",
        duoExpiresAt,
        priceIDR: secondHalf,
      });
      await ctx.db.patch(first, { duoPairId: second });
      await ctx.db.patch(second, { duoPairId: first });
      const a = await ctx.db.get(first);
      const b = await ctx.db.get(second);
      return { codes: [a!.code, b!.code], duoExpiresAt };
    }

    const quantity = Math.max(1, Math.min(args.quantity ?? 1, 100));
    const lifetimeKind =
      args.tier === "lifetime" ? args.lifetimeKind ?? "solo" : undefined;
    // One price snapshot for the whole batch — every code in this run is sold at
    // the price effective right now.
    const priceIDR = await getTierPriceIDR(
      ctx,
      args.tier,
      lifetimeKind,
      args.regionId,
    );
    const codes: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const id = await insertUniqueCode(ctx, {
        ...base,
        tier: args.tier,
        lifetimeKind,
        priceIDR,
      });
      const doc = await ctx.db.get(id);
      codes.push(doc!.code);
    }
    return { codes };
  },
});

const codeStatusValidator = v.union(
  v.literal("unused"),
  v.literal("active"),
  v.literal("expired"),
  v.literal("revoked"),
);

export const listCodes = query({
  args: {
    status: v.optional(codeStatusValidator),
    batchId: v.optional(v.string()),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let codes;
    if (args.status) {
      codes = await ctx.db
        .query("subscriptionCodes")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    } else {
      codes = await ctx.db
        .query("subscriptionCodes")
        .order("desc")
        .take(200);
    }
    if (args.batchId) codes = codes.filter((c) => c.batchId === args.batchId);
    if (args.agentId) codes = codes.filter((c) => c.agentId === args.agentId);

    const agentIds = [...new Set(codes.map((c) => c.agentId).filter(Boolean))];
    const agents = await Promise.all(agentIds.map((id) => ctx.db.get(id!)));
    const agentName = new Map(
      agents.filter(Boolean).map((a) => [a!._id, a!.name]),
    );

    return codes.map((c) => ({
      _id: c._id,
      code: c.code,
      tier: c.tier,
      lifetimeKind: c.lifetimeKind,
      priceIDR: c.priceIDR !== undefined ? c.priceIDR.toString() : null,
      channel: c.channel,
      status: c.status,
      batchId: c.batchId,
      agentName: c.agentId ? agentName.get(c.agentId) ?? "—" : null,
      duoExpiresAt: c.duoExpiresAt,
      createdAt: c._creationTime,
      revokedReason: c.revokedReason,
    }));
  },
});

/** Revoke a code with a logged reason (finance/super). */
export const revokeCode = mutation({
  args: { codeId: v.id("subscriptionCodes"), reason: v.string() },
  handler: async (ctx, { codeId, reason }) => {
    await requireAdmin(ctx, ["finance_admin", "super_admin"]);
    if (reason.trim().length < 3)
      throw new Error("Alasan revoke wajib diisi.");
    const code = await ctx.db.get(codeId);
    if (!code) throw new Error("code not found");
    if (code.status === "revoked") return;
    await ctx.db.patch(codeId, { status: "revoked", revokedReason: reason });
  },
});
