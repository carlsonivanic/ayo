/**
 * Internal helpers used ONLY by tests (see convex/commissions.test.ts). They
 * bypass admin auth so tests can set up data directly without going through the
 * admin-gated public mutations. Not imported anywhere except tests; the file is
 * auto-registered as Convex functions because it lives in convex/.
 *
 * Registered as `internal` to keep them off the public API surface.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const seedParam = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    await ctx.db.insert("systemParameters", { key, value, effectiveAt: 0 });
  },
});

export const insertAgent = internalMutation({
  args: {
    name: v.string(),
    phone: v.string(),
    level: v.number(),
    status: v.union(
      v.literal("probation"),
      v.literal("active"),
      v.literal("dormant"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
    regionId: v.id("regions"),
    referrerId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args): Promise<Id<"agents">> => {
    return await ctx.db.insert("agents", {
      name: args.name,
      phone: args.phone,
      level: args.level,
      status: args.status,
      regionId: args.regionId,
      referrerId: args.referrerId,
      enrolledAt: Date.now(),
      escrowAmount: 0n,
      suspendedAt: args.status === "suspended" ? Date.now() : undefined,
    });
  },
});

export const setReferrer = internalMutation({
  args: {
    agentId: v.id("agents"),
    referrerId: v.optional(v.id("agents")),
  },
  handler: async (ctx, { agentId, referrerId }) => {
    await ctx.db.patch(agentId, { referrerId });
  },
});

export const insertCode = internalMutation({
  args: {
    regionId: v.id("regions"),
    agentId: v.id("agents"),
    tier: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("lifetime"),
    ),
    priceIDR: v.string(),
    lifetimeKind: v.optional(v.union(v.literal("solo"), v.literal("duo"))),
  },
  handler: async (ctx, args): Promise<Id<"subscriptionCodes">> => {
    const code = `SM-TEST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return await ctx.db.insert("subscriptionCodes", {
      code,
      tier: args.tier,
      lifetimeKind: args.lifetimeKind,
      channel: "agent",
      status: "unused",
      agentId: args.agentId,
      regionId: args.regionId,
      priceIDR: BigInt(args.priceIDR),
    });
  },
});

/** Insert a license WITHOUT triggering the activation commission path. */
export const insertLicenseDirect = internalMutation({
  args: {
    regionId: v.id("regions"),
    agentId: v.id("agents"),
    tier: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("lifetime"),
    ),
    priceIDR: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"licenses">> => {
    return await ctx.db.insert("licenses", {
      deviceId: `dev-direct-${Math.random().toString(36).slice(2)}`,
      agentId: args.agentId,
      tier: args.tier,
      activatedAt: Date.now(),
      creditDays: 0,
      gracePeriodDays: 3,
      status: "active",
      regionId: args.regionId,
      priceIDR: BigInt(args.priceIDR),
    });
  },
});

export const ledgerByLicense = internalQuery({
  args: { licenseId: v.id("licenses") },
  handler: async (ctx, { licenseId }) => {
    const entries = await ctx.db
      .query("commissionLedger")
      .withIndex("by_license", (q) => q.eq("licenseId", licenseId))
      .collect();
    return entries.map((e) => ({
      _id: e._id,
      agentId: e.agentId,
      type: e.type,
      amount: e.amount.toString(),
      status: e.status,
      multiplierPct: e.multiplierPct,
    }));
  },
});
