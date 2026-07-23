import { internalMutation, internalQuery, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getParamNumber, getTierDurationDays, getTierPriceIDR } from "./params";
import { resolveUpline, computeCommissionEntries } from "./lib/commission";

/**
 * Idempotently write the commission entries for a freshly-activated license.
 * Skips silently if the license already has ledger rows (re-activation, retry,
 * or a backfill that already covered it). Never throws on missing agent.
 */
async function writeCommissionOnActivation(
  ctx: MutationCtx,
  args: {
    licenseId: Id<"licenses">;
    agentId: Id<"agents"> | null;
    tier: "daily" | "weekly" | "monthly" | "annual" | "lifetime";
    priceIDR: bigint;
    regionId: Id<"regions">;
    activatedAt: number;
    lifetimeKind?: "solo" | "duo";
  },
): Promise<void> {
  if (args.agentId === null) return; // self-serve, no seller to pay

  // Idempotency: if any ledger row already references this license, do nothing.
  const existing = await ctx.db
    .query("commissionLedger")
    .withIndex("by_license", (q) => q.eq("licenseId", args.licenseId))
    .first();
  if (existing) return;

  const upline = await resolveUpline(ctx, args.agentId);
  const entries = await computeCommissionEntries(ctx, upline, {
    licenseId: args.licenseId,
    tier: args.tier,
    priceIDR: args.priceIDR,
    regionId: args.regionId,
    activatedAt: args.activatedAt,
    lifetimeKind: args.lifetimeKind,
  });
  for (const e of entries) {
    await ctx.db.insert("commissionLedger", e);
  }
}

// ~100 years out — the token payload Sellmore verifies is purely calendar-based
// (it has no "lifetime" concept), so a lifetime license is expressed as a
// far-future expiry that will comfortably outlive any device.
const LIFETIME_HORIZON_MS = 100 * 365 * 86400000;

// Per-device brute-force guard on the public redeem endpoint. Reuses the
// sliding-window rateLimitCounters table (see registration.ts).
const REDEEM_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const REDEEM_MAX_PER_WINDOW = 15;

async function checkRedeemRateLimit(ctx: MutationCtx, deviceId: string) {
  const key = `redeem:${deviceId}`;
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimitCounters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!existing) {
    await ctx.db.insert("rateLimitCounters", { key, count: 1, windowStart: now });
    return;
  }
  if (now - existing.windowStart > REDEEM_WINDOW_MS) {
    await ctx.db.patch(existing._id, { count: 1, windowStart: now });
    return;
  }
  if (existing.count >= REDEEM_MAX_PER_WINDOW) {
    throw new Error("too many attempts");
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

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
 * Shared activation core. Redeems `codeId` onto `deviceId`, creating or renewing
 * the license, and returns everything the POS needs to mint an offline token.
 *
 * `effectiveActiveUntil` collapses AYO's three duration models into the single
 * calendar timestamp Sellmore understands:
 *   - monthly/annual → the calendar expiry
 *   - daily/weekly    → now + the accumulated credit-day balance
 *   - lifetime        → a far-future horizon
 */
async function activateCore(
  ctx: MutationCtx,
  deviceId: string,
  codeId: Id<"subscriptionCodes">,
  merchant?: { name?: string; location?: string },
): Promise<{
  licenseId: Id<"licenses">;
  agentId: Id<"agents"> | null;
  tier: "daily" | "weekly" | "monthly" | "annual" | "lifetime";
  effectiveActiveUntil: number;
}> {
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

  // Merchant identity: set on first activation, refresh on renewal if the POS
  // sends a (non-empty) newer value. Never blanks an existing value.
  const merchantPatch: { merchantName?: string; merchantLocation?: string } = {};
  if (merchant?.name?.trim()) merchantPatch.merchantName = merchant.name.trim();
  if (merchant?.location?.trim())
    merchantPatch.merchantLocation = merchant.location.trim();

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
      ...merchantPatch,
    }));

  if (existing) {
    // Renewals reactivate a lapsed license and refresh the redeeming code link
    // and merchant info; the agent binding is left untouched (immutable).
    await ctx.db.patch(licenseId, {
      status: "active",
      codeId,
      ...merchantPatch,
    });
  }

  // For daily/weekly, extend the existing credit balance.
  let creditDays = existing?.creditDays ?? 0;
  let finalExpiresAt = existing?.expiresAt ?? expiresAt;
  if (isCredit && durationDays !== undefined) {
    creditDays += durationDays;
    await ctx.db.patch(licenseId, { creditDays });
  } else if (existing && expiresAt !== undefined) {
    // Renewal: push expiry forward from the later of now or current expiry.
    const base =
      existing.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
    finalExpiresAt = base + durationDays! * 86400000;
    await ctx.db.patch(licenseId, { expiresAt: finalExpiresAt });
  }

  await ctx.db.patch(codeId, { status: "active", activatedAt: now });

  // Commission accrues on first activation only (not renewals). The
  // idempotency guard inside makes this safe even if activation is retried.
  if (!existing) {
    await writeCommissionOnActivation(ctx, {
      licenseId,
      agentId: code.agentId ?? null,
      tier: code.tier,
      priceIDR,
      regionId: code.regionId,
      activatedAt: now,
      lifetimeKind: code.lifetimeKind,
    });
  }

  // Collapse to a single calendar "active until" for the POS token.
  let effectiveActiveUntil: number;
  if (code.tier === "lifetime") {
    effectiveActiveUntil = now + LIFETIME_HORIZON_MS;
  } else if (isCredit) {
    effectiveActiveUntil = now + creditDays * 86400000;
  } else {
    effectiveActiveUntil = finalExpiresAt ?? now;
  }

  return {
    licenseId,
    agentId: code.agentId ?? null,
    tier: code.tier,
    effectiveActiveUntil,
  };
}

/**
 * Activate a device on a code. Sets agentId for the first (and only) time.
 * Internal — kept for admin/seed callers that already hold a codeId.
 */
export const activate = internalMutation({
  args: {
    deviceId: v.string(),
    codeId: v.id("subscriptionCodes"),
  },
  handler: async (ctx, { deviceId, codeId }) => {
    const { licenseId, agentId } = await activateCore(ctx, deviceId, codeId);
    return { licenseId, agentId };
  },
});

/**
 * POS-facing redemption: look up a human code string (SM-XXXX-XXXX-XXXXX),
 * redeem it onto the device, capture the merchant identity, and return the data
 * the HTTP layer signs into an offline license token. Renewals reuse this path.
 */
export const redeemByCode = internalMutation({
  args: {
    code: v.string(),
    deviceId: v.string(),
    merchantName: v.optional(v.string()),
    merchantLocation: v.optional(v.string()),
  },
  handler: async (ctx, { code, deviceId, merchantName, merchantLocation }) => {
    await checkRedeemRateLimit(ctx, deviceId);
    const normalized = code.trim().toUpperCase();
    const doc = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .unique();
    if (!doc) throw new Error("code not found");

    // Give a precise reason for a non-redeemable code so the POS can message it.
    if (doc.status === "active")
      throw new Error("code already used");
    if (doc.status === "revoked") throw new Error("code revoked");
    if (doc.status === "expired") throw new Error("code expired");
    if (
      doc.expiresUnusedAt !== undefined &&
      doc.expiresUnusedAt < Date.now()
    ) {
      throw new Error("code expired");
    }

    return await activateCore(ctx, deviceId, doc._id, {
      name: merchantName,
      location: merchantLocation,
    });
  },
});

/**
 * Current license status for a device — the POS calls this online to re-check
 * (renewal reminders, revocation). Returns null when the device is unknown.
 */
export const statusByDevice = internalQuery({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const license = await ctx.db
      .query("licenses")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .first();
    if (!license) return null;
    return {
      tier: license.tier,
      status: license.status,
      expiresAt: license.expiresAt ?? null,
      creditDays: license.creditDays,
      merchantName: license.merchantName ?? null,
    };
  },
});
