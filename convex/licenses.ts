import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getParamNumber, getTierDurationDays, getTierPriceIDR } from "./params";

/**
 * The ONLY write path that may touch licenses.agentId.
 *
 * INVARIANT: agentId is immutable after first activation. There is no DB trigger
 * in Convex — this guard is the enforcement point. A raw ctx.db.patch(license,
 * { agentId }) anywhere else is a defect.
 */
export const updateLicense = internalMutation({
  args: {
    licenseId: v.id("licenses"),
    patch: v.object({
      agentId: v.optional(v.id("agents")),
      status: v.optional(
        v.union(v.literal("active"), v.literal("expired"), v.literal("revoked")),
      ),
      expiresAt: v.optional(v.number()),
      creditDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { licenseId, patch }) => {
    const existing = await ctx.db.get(licenseId);
    if (!existing) throw new Error("license not found");

    if (
      "agentId" in patch &&
      existing.agentId != null &&
      patch.agentId !== existing.agentId
    ) {
      throw new Error("agentId is immutable after first activation");
    }
    await ctx.db.patch(licenseId, patch);
  },
});

/**
 * Activate a device on a code. Sets agentId for the first (and only) time.
 * Internal in Phase 1 — exposed to the POS HTTP surface in a later milestone.
 */
export const activate = internalMutation({
  args: {
    deviceId: v.string(),
    codeId: v.id("subscriptionCodes"),
  },
  handler: async (ctx, { deviceId, codeId }) => {
    const code = await ctx.db.get(codeId);
    if (!code) throw new Error("code not found");
    if (code.status !== "unused") throw new Error("code is not redeemable");

    const existing = await ctx.db
      .query("licenses")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .first();

    // Guard the invariant even on the activation path: a device that already has
    // a license tied to a different agent cannot be re-bound.
    if (existing && existing.agentId != null && existing.agentId !== code.agentId) {
      throw new Error("agentId is immutable after first activation");
    }

    const now = Date.now();
    // History keeps the price the buyer paid: prefer the snapshot locked in when
    // the code was issued; fall back to the currently effective tier price for
    // codes minted before snapshots existed.
    const priceIDR =
      code.priceIDR ??
      (await getTierPriceIDR(ctx, code.tier, code.lifetimeKind, code.regionId));

    const durationDays = await getTierDurationDays(ctx, code.tier, code.regionId);
    const gracePeriodDays =
      (await getParamNumber(ctx, "grace_period_days", code.regionId)) ?? 3;

    // daily/weekly: accumulate credit days; monthly/annual: set a calendar expiry.
    const isCredit = code.tier === "daily" || code.tier === "weekly";
    const expiresAt =
      !isCredit && durationDays !== undefined
        ? now + durationDays * 86400000
        : undefined;

    const licenseId =
      existing?._id ??
      (await ctx.db.insert("licenses", {
        deviceId,
        agentId: code.agentId,
        tier: code.tier,
        activatedAt: now,
        creditDays: 0,
        gracePeriodDays,
        status: "active",
        regionId: code.regionId,
        codeId,
        priceIDR,
        expiresAt,
      }));

    // For daily/weekly, extend the existing credit balance.
    if (isCredit && durationDays !== undefined) {
      const current = existing?.creditDays ?? 0;
      await ctx.db.patch(licenseId, { creditDays: current + durationDays });
    } else if (existing && expiresAt !== undefined) {
      // Renewal: push expiry forward from the later of now or current expiry.
      const base = existing.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
      await ctx.db.patch(licenseId, { expiresAt: base + durationDays! * 86400000 });
    }

    await ctx.db.patch(codeId, { status: "active", activatedAt: now });
    return { licenseId, agentId: code.agentId ?? null };
  },
});
