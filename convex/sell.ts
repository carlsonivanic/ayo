import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, mutation, query } from "./_generated/server";
import { fail, requireActive, requireL1 } from "./lib/authz";
import { pctOf } from "./lib/money";
import { convertQRIS, qrisFrameInfo } from "./lib/qris";
import { notify } from "./lib/notify";
import { planForAgent } from "./lib/overrides";
import { getSettings } from "./lib/settings";
import { randomToken } from "./lib/tokens";
import { issueSeatLink } from "./seats";

// §4 sell flow. The L1 never enters merchant data — a link is created, shared on
// WhatsApp, and everything else resolves from the payment and the redemption.

async function ensureProfileComplete(ctx: MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("payoutProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return profile?.completed ?? false;
}

/**
 * A payment amount that belongs to exactly one open link.
 *
 * Manual QRIS gives us no reference field, so the amount itself is the
 * reference: a small random suffix on the price lets an admin tie one line in
 * the bank mutasi to one link. Collisions are only checked against links that
 * are still open, which is the only window where two could be confused.
 */
async function uniquePaymentAmount(
  ctx: MutationCtx,
  base: number,
  max: number,
): Promise<number> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const suffix = 1 + Math.floor(Math.random() * max);
    const candidate = base + suffix;
    const clash = await ctx.db
      .query("paymentLinks")
      .withIndex("by_qris_amount", (q) =>
        q.eq("qrisAmount", candidate).eq("status", "SHARED"),
      )
      .first();
    if (!clash) return candidate;
  }
  return base; // give up on uniqueness rather than block the sale
}

export const createPaymentLink = mutation({
  args: { planId: v.id("productPlans") },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const plan = await ctx.db.get("productPlans", args.planId);
    if (!plan || !plan.active) fail("NOT_FOUND", "Paket tidak tersedia.");
    const settings = await getSettings(ctx);

    const qris = settings.qris;
    if (!qris?.enabled || !qris.staticPayload) {
      fail("QRIS_NOT_CONFIGURED", "QRIS pembayaran belum disiapkan admin.");
    }

    const qrisAmount = qris.uniqueAmountEnabled
      ? await uniquePaymentAmount(ctx, plan.price, Math.max(1, qris.uniqueAmountMax))
      : plan.price;

    let qrisPayload: string;
    try {
      qrisPayload = convertQRIS(qris.staticPayload, qrisAmount);
    } catch {
      fail("QRIS_INVALID", "Payload QRIS admin tidak valid.");
    }

    const now = Date.now();
    const expiresAt = now + settings.paymentLinkExpiryHours * 60 * 60 * 1000;
    const token = randomToken(20);
    const linkId = await ctx.db.insert("paymentLinks", {
      l1Id: l1._id,
      planId: plan._id,
      kind: plan.category,
      amount: plan.price,
      token,
      status: "SHARED",
      createdAt: now,
      expiresAt,
      qrisPayload,
      qrisAmount,
    });
    return {
      linkId,
      token,
      amount: plan.price,
      qrisAmount,
      qrisPayload,
      kind: plan.category,
      expiresAt,
      merchant: qrisFrameInfo(qrisPayload),
      instructions: qris.instructions ?? null,
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
    qrisAmount: link.qrisAmount ?? link.amount,
    status: link.status,
    verification: link.verification ?? null,
    rejectionReason: link.rejectionReason ?? null,
    proofUploadedAt: link.proofUploadedAt ?? null,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    paidAt: link.paidAt ?? null,
    proofSource: link.proofSource ?? null,
    firstViewedAt: link.firstViewedAt ?? null,
    lastViewedAt: link.lastViewedAt ?? null,
    viewCount: link.viewCount ?? 0,
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
      links.map(async (link) => {
        const codes = await ctx.db
          .query("subscriptionCodes")
          .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
          .collect();
        return {
          ...shapeLink(link, await ctx.db.get("productPlans", link.planId)),
          code: codes[0]?.code ?? null,
          codeStatus: codes[0]?.status ?? null,
        };
      }),
    );
  },
});

/**
 * Public checkout view — no session, the token is the capability.
 *
 * The same token answers the buyer's question at every stage: before payment it
 * is the QRIS, after payment it is the activation code. Nothing here is gated
 * on the link still being open, because a buyer who closed the tab after paying
 * must be able to come back to it (§4.4).
 */
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
    const settings = await getSettings(ctx);

    const open = link.status === "SHARED" && link.expiresAt > Date.now();

    const codes =
      link.status === "PAID"
        ? await ctx.db
            .query("subscriptionCodes")
            .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
            .collect()
        : [];
    const seats =
      link.status === "PAID"
        ? await ctx.db
            .query("lifetimeSeats")
            .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
            .collect()
        : [];

    return {
      token: link.token,
      planName: plan?.name ?? "",
      planKey: plan?.key ?? "",
      priceUnit: plan?.priceUnit ?? "",
      seatCount: plan?.seatCount ?? 0,
      kind: link.kind,
      amount: link.amount,
      qrisAmount: link.qrisAmount ?? link.amount,
      qrisPayload: open ? (link.qrisPayload ?? null) : null,
      status: link.status,
      open,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      paidAt: link.paidAt ?? null,
      sellerName: seller?.name ?? null,
      sellerPhone: seller?.mobile ?? seller?.phone ?? null,
      instructions: settings.qris?.instructions ?? null,
      proofRequired: settings.qris?.proofRequired ?? true,
      // Identity printed around the QR, exactly as on a physical QRIS stand.
      merchant: link.qrisPayload ? qrisFrameInfo(link.qrisPayload) : null,
      proof: link.proofUploadedAt
        ? {
            uploadedAt: link.proofUploadedAt,
            verification: link.verification ?? null,
            rejectionReason: link.rejectionReason ?? null,
          }
        : null,
      codes: codes.map((c) => ({
        code: c.code,
        status: c.status,
        expiresAt: c.expiresAt,
      })),
      seats: seats.map((s) => ({
        seatIndex: s.seatIndex,
        token: s.activationLinkToken ?? null,
        status: s.status,
      })),
    };
  },
});

/**
 * "Sudah dibuka pembeli" on the L1's tracking list. Fired once per page open;
 * it is deliberately unauthenticated, so it records only that the token was
 * fetched — never who fetched it.
 */
export const markLinkViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link) return null;
    const now = Date.now();
    await ctx.db.patch("paymentLinks", link._id, {
      firstViewedAt: link.firstViewedAt ?? now,
      lastViewedAt: now,
      viewCount: (link.viewCount ?? 0) + 1,
    });
    if (link.l1Id && !link.firstViewedAt) {
      const plan = await ctx.db.get("productPlans", link.planId);
      await notify(
        ctx,
        link.l1Id,
        "LINK_VIEWED",
        "Tautan dibuka pembeli",
        `${plan?.name ?? "Tautan"} — pembeli sedang melihat QRIS.`,
        "/l1/kode?tab=tautan",
      );
    }
    return null;
  },
});

/** The QRIS screen the L1 holds up while the buyer scans. */
export const linkDetail = query({
  args: { linkId: v.id("paymentLinks") },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const link = await ctx.db.get("paymentLinks", args.linkId);
    if (!link || link.l1Id !== l1._id) return null;
    const plan = await ctx.db.get("productPlans", link.planId);

    // The code is only worth showing once the payment has been recorded.
    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
      .collect();
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
      .collect();

    return {
      ...shapeLink(link, plan),
      qrisPayload: link.status === "SHARED" ? (link.qrisPayload ?? null) : null,
      merchant: link.qrisPayload ? qrisFrameInfo(link.qrisPayload) : null,
      proofUploaded: !!link.proofStorageId,
      codes: codes.map((c) => ({ id: c._id, code: c.code, status: c.status })),
      seats: seats.map((s) => ({
        id: s._id,
        seatIndex: s.seatIndex,
        status: s.status,
        token: s.activationLinkToken ?? null,
        expiresAt: s.linkExpiresAt ?? null,
      })),
    };
  },
});

/**
 * §15.6 — a pooled seat becomes a shareable activation link. The POS can do
 * this itself; with manual settlement the L1 needs it too, because they are
 * standing in front of the buyer when the transfer lands.
 */
export const createSeatLink = mutation({
  args: { seatId: v.id("lifetimeSeats") },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const seat = await ctx.db.get("lifetimeSeats", args.seatId);
    if (!seat || seat.sellerL1Id !== l1._id) fail("NOT_FOUND", "Kursi tidak ditemukan.");
    return await issueSeatLink(ctx, seat);
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
    const viewer = await requireActive(ctx);
    const stored = await ctx.db.get("productPlans", args.planId);
    if (!stored) return null;
    const plan = await planForAgent(ctx, viewer._id, stored);
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
