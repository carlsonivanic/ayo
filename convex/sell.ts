import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { fail, requireActive, requireL1 } from "./lib/authz";
import { pctOf } from "./lib/money";
import { getSettings } from "./lib/settings";
import { randomToken } from "./lib/tokens";

// §4 sell flow. The L1 never enters merchant data — a link is created, shared on
// WhatsApp, and everything else resolves from the payment and the redemption.

async function ensureProfileComplete(ctx: MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("payoutProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return profile?.completed ?? false;
}

export const createPaymentLink = mutation({
  args: { planId: v.id("productPlans") },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const plan = await ctx.db.get("productPlans", args.planId);
    if (!plan || !plan.active) fail("NOT_FOUND", "Paket tidak tersedia.");
    const settings = await getSettings(ctx);

    const now = Date.now();
    const token = randomToken(20);
    const linkId = await ctx.db.insert("paymentLinks", {
      l1Id: l1._id,
      planId: plan._id,
      kind: plan.category,
      amount: plan.price,
      token,
      status: "SHARED",
      createdAt: now,
      expiresAt: now + settings.paymentLinkExpiryHours * 60 * 60 * 1000,
    });
    return {
      linkId,
      token,
      amount: plan.price,
      kind: plan.category,
      expiresAt: now + settings.paymentLinkExpiryHours * 60 * 60 * 1000,
      payoutProfileCompleted: await ensureProfileComplete(ctx, l1._id),
    };
  },
});

function shapeLink(link: Doc<"paymentLinks">, plan: Doc<"productPlans"> | null) {
  return {
    id: link._id,
    token: link.token,
    planName: plan?.name ?? "",
    planKey: plan?.key ?? "",
    kind: link.kind,
    amount: link.amount,
    status: link.status,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    paidAt: link.paidAt ?? null,
  };
}

export const myLinks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const links = await ctx.db
      .query("paymentLinks")
      .withIndex("by_l1_created", (q) => q.eq("l1Id", l1._id))
      .order("desc")
      .take(args.limit ?? 30);
    return Promise.all(
      links.map(async (l) => shapeLink(l, await ctx.db.get("productPlans", l.planId))),
    );
  },
});

/** Public checkout view — no session, the token is the capability. */
export const publicLink = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link) return null;
    const plan = await ctx.db.get("productPlans", link.planId);
    const seller = link.l1Id ? await ctx.db.get("users", link.l1Id) : null;
    return {
      token: link.token,
      planName: plan?.name ?? "",
      planKey: plan?.key ?? "",
      priceUnit: plan?.priceUnit ?? "",
      seatCount: plan?.seatCount ?? 0,
      kind: link.kind,
      amount: link.amount,
      status: link.status,
      expiresAt: link.expiresAt,
      sellerName: seller?.name ?? null,
      paymentMode: process.env.AYO_PAYMENT_MODE ?? "SIMULATED",
    };
  },
});

/** L1 view of the codes they generated (§5). */
export const myCodes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_l1_generated", (q) => q.eq("l1Id", l1._id))
      .order("desc")
      .take(args.limit ?? 50);
    return Promise.all(
      codes.map(async (c) => {
        const plan = await ctx.db.get("productPlans", c.planId);
        return {
          id: c._id,
          code: c.code,
          planName: plan?.name ?? "",
          status: c.status,
          generatedAt: c.generatedAt,
          expiresAt: c.expiresAt,
          usedAt: c.usedAt ?? null,
          storeName: c.storeName ?? null,
          redemptionType: c.redemptionType ?? null,
        };
      }),
    );
  },
});

/** §2.2 seats the L1 sold, so they can follow up on unactivated ones. */
export const mySeats = query({
  args: {},
  handler: async (ctx) => {
    const l1 = await requireL1(ctx);
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_seller", (q) => q.eq("sellerL1Id", l1._id))
      .order("desc")
      .take(100);
    return Promise.all(
      seats.map(async (s) => {
        const plan = await ctx.db.get("productPlans", s.planId);
        const merchant = s.assignedToMerchantId
          ? await ctx.db.get("merchants", s.assignedToMerchantId)
          : null;
        return {
          id: s._id,
          planName: plan?.name ?? "",
          seatIndex: s.seatIndex,
          status: s.status,
          linkExpiresAt: s.linkExpiresAt ?? null,
          activatedAt: s.activatedAt ?? null,
          storeName: merchant?.storeName ?? null,
        };
      }),
    );
  },
});

/** Commission preview used by the sell screen. */
export const commissionPreview = query({
  args: { planId: v.id("productPlans") },
  handler: async (ctx, args) => {
    await requireActive(ctx);
    const plan = await ctx.db.get("productPlans", args.planId);
    if (!plan) return null;
    return {
      amount:
        plan.commissionType === "ONE_TIME"
          ? pctOf(plan.price, plan.oneTimePercent)
          : pctOf(plan.price, plan.y1Percent),
      percent:
        plan.commissionType === "ONE_TIME" ? plan.oneTimePercent : plan.y1Percent,
    };
  },
});
