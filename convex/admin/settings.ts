import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { convertQRIS, summarizeQRIS, validateQRIS } from "../lib/qris";
import { ensureSettings, getSettings } from "../lib/settings";

// §21 scheme settings — every business constant is admin-configurable, and every
// change is audited old → new (§21, §32, Edge 18).

const guarantee = v.object({
  enable: v.boolean(),
  months: v.number(),
  target: v.number(),
  minActivations: v.number(),
  topUp: v.number(),
});

const warmth = v.object({
  startAfterMonth: v.number(),
  warmThreshold: v.number(),
  warmPayout: v.number(),
  warmHeld: v.number(),
  coolPayout: v.number(),
  coolHeld: v.number(),
  coldPayout: v.number(),
  coldHeld: v.number(),
  coldConsecutive: v.number(),
  releaseThreshold: v.number(),
});

const l1Target = v.object({
  m1_3: v.number(),
  m4_6: v.number(),
  m7_9: v.number(),
  m10_11: v.number(),
  m12Plus: v.number(),
});

const l2 = v.object({
  basePercent: v.number(),
  startMonth: v.number(),
  includeJaminan: v.boolean(),
  decayM7_18: v.number(),
  decayM19_30: v.number(),
  decayM31_42: v.number(),
});

const recruitment = v.object({
  target: v.number(),
  countOnlyInvited: v.boolean(),
});

const payout = v.object({
  l1DefaultFrequency: v.union(v.literal("WEEKLY"), v.literal("MONTHLY")),
  l1WeeklyPayDay: v.number(),
  l1MonthlyPayDay: v.number(),
  l2MonthlyPayDay: v.number(),
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await getSettings(ctx);
  },
});

export const update = mutation({
  args: {
    guarantee: v.optional(guarantee),
    warmth: v.optional(warmth),
    l1Target: v.optional(l1Target),
    l2: v.optional(l2),
    recruitment: v.optional(recruitment),
    payout: v.optional(payout),
    moneyDisplay: v.optional(v.union(v.literal("ROUNDED"), v.literal("DECIMAL"))),
    renewalIncentivePercent: v.optional(v.number()),
    ownershipWindowMonths: v.optional(v.number()),
    allowDirectLifetimePurchase: v.optional(v.boolean()),
    allowDirectSubscriptionPurchase: v.optional(v.boolean()),
    seatLinkExpiryDays: v.optional(v.number()),
    codeExpiryDays: v.optional(v.number()),
    paymentLinkExpiryHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const current = await ensureSettings(ctx);

    const patch = Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) return null;

    const before = Object.fromEntries(
      Object.keys(patch).map((key) => [key, (current as Record<string, unknown>)[key]]),
    );

    await ctx.db.patch("schemeSettings", current._id, {
      ...patch,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_SCHEME_SETTINGS",
      object: "schemeSettings",
      oldValue: before,
      newValue: patch,
    });
    return null;
  },
});

// --- manual QRIS settlement -------------------------------------------------

/**
 * The merchant's own static QRIS, stored once and reused for every sale.
 *
 * It is validated at paste time — CRC and required tags — and test-converted
 * with a sample amount, because a payload that fails here would produce a QR
 * no bank app accepts, and the L1 would only find out at the counter.
 */
export const saveQris = mutation({
  args: {
    staticPayload: v.string(),
    enabled: v.boolean(),
    uniqueAmountEnabled: v.boolean(),
    uniqueAmountMax: v.number(),
    instructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const payload = args.staticPayload.trim();

    const check = validateQRIS(payload);
    if (!check.valid) fail("QRIS_INVALID", check.error);
    try {
      convertQRIS(payload, 10_000);
    } catch {
      fail("QRIS_INVALID", "Payload tidak bisa dijadikan QRIS dinamis.");
    }
    if (args.uniqueAmountMax < 1 || args.uniqueAmountMax > 99_999) {
      fail("INVALID_RANGE", "Batas nominal unik harus 1–99.999.");
    }

    const summary = summarizeQRIS(payload);
    const current = await ensureSettings(ctx);
    await ctx.db.patch("schemeSettings", current._id, {
      qris: {
        enabled: args.enabled,
        staticPayload: payload,
        merchantName: summary.merchantName,
        uniqueAmountEnabled: args.uniqueAmountEnabled,
        uniqueAmountMax: args.uniqueAmountMax,
        proofRequired: true,
        instructions: args.instructions,
      },
      updatedAt: Date.now(),
    });

    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_QRIS_SETTINGS",
      object: "schemeSettings.qris",
      // The payload is a payment credential — log the merchant, not the string.
      oldValue: { merchantName: current.qris?.merchantName, enabled: current.qris?.enabled },
      newValue: { merchantName: summary.merchantName, enabled: args.enabled },
    });
    return { merchantName: summary.merchantName, merchantCity: summary.merchantCity };
  },
});

/** Admin preview: what the buyer's QR will actually encode. */
export const qrisStatus = query({
  args: { sampleAmount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const qris = (await getSettings(ctx)).qris;
    if (!qris?.staticPayload) return null;
    let sample: string | null = null;
    try {
      sample = convertQRIS(qris.staticPayload, args.sampleAmount ?? 10_000);
    } catch {
      sample = null;
    }
    return {
      enabled: qris.enabled,
      merchantName: qris.merchantName ?? "",
      uniqueAmountEnabled: qris.uniqueAmountEnabled,
      uniqueAmountMax: qris.uniqueAmountMax,
      instructions: qris.instructions ?? "",
      staticPayload: qris.staticPayload,
      samplePayload: sample,
    };
  },
});
