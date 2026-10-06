import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation, mutation } from "./_generated/server";
import { fail, rateLimit, requireL1 } from "./lib/authz";
import { generateCodeString } from "./lib/codegen";
import { insertEarning } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { notify, notifyAdmins } from "./lib/notify";
import { planForAgent } from "./lib/overrides";
import { addDays } from "./lib/period";
import { getSettings } from "./lib/settings";
import { onLifetimePaid } from "./seats";

// §7.1 / P6 — the single idempotent entry point for money coming in. Called by
// the gateway webhook and, while settlement is manual, by the L1 uploading the
// buyer's QRIS transfer receipt.
//
// Manual settlement releases the code immediately so the L1 is never blocked,
// and books the commission FROZEN. Frozen lines are excluded from month-end
// gross and from every payout run, so an unverified payment can never pay out.
// An admin verifying the transfer unfreezes them; rejecting reverses them.

async function newCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCodeString();
    const clash = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", candidate))
      .unique();
    if (!clash) return candidate;
  }
  fail("CODE_GENERATION_FAILED", "Gagal membuat kode.");
}

/** §10 — tenure starts at the first successful payment, and the L2 hears about it. */
async function markFirstPayment(ctx: MutationCtx, l1Id: Id<"users">, at: number) {
  const l1 = await ctx.db.get("users", l1Id);
  if (!l1 || l1.firstPaymentAt) return;
  await ctx.db.patch("users", l1._id, { firstPaymentAt: at });
  if (l1.assignedL2Id) {
    await notify(
      ctx,
      l1.assignedL2Id,
      "L1_FIRST_PAYMENT",
      "Penjualan pertama",
      `${l1.name ?? "L1"} mencatat pembayaran pertama.`,
      "/l2/tim",
    );
  }
}

export type PaymentResult =
  | { ok: true; code?: string; linkId: Id<"paymentLinks"> }
  | { ok: false; reason: string };

export async function settle(
  ctx: MutationCtx,
  link: Doc<"paymentLinks">,
  opts: {
    gatewayRef?: string;
    idempotencyKey?: string;
    buyerStoreId?: string;
    buyerStoreName?: string;
    /** PENDING = a human still has to confirm the money arrived. */
    verification?: "PENDING" | "VERIFIED";
    proofStorageId?: Id<"_storage">;
    proofUploadedBy?: Id<"users">;
    proofSource?: "L1" | "BUYER";
    proofNote?: string;
  },
): Promise<PaymentResult> {
  const now = Date.now();
  const provisional = opts.verification === "PENDING";

  if (link.status === "PAID") {
    // Replayed webhook — the first delivery already did the work (P6).
    return { ok: true, linkId: link._id };
  }
  if (link.status !== "SHARED") return { ok: false, reason: "LINK_NOT_OPEN" };
  if (link.expiresAt < now) {
    await ctx.db.patch("paymentLinks", link._id, { status: "EXPIRED" });
    return { ok: false, reason: "LINK_EXPIRED" };
  }

  const plan = await ctx.db.get("productPlans", link.planId);
  if (!plan) return { ok: false, reason: "PLAN_MISSING" };

  await ctx.db.patch("paymentLinks", link._id, {
    status: "PAID",
    paidAt: now,
    gatewayRef: opts.gatewayRef,
    idempotencyKey: opts.idempotencyKey,
    buyerSellMoreStoreId: opts.buyerStoreId ?? link.buyerSellMoreStoreId,
    verification: opts.verification,
    proofStorageId: opts.proofStorageId,
    proofUploadedAt: opts.proofStorageId ? now : undefined,
    proofUploadedBy: opts.proofUploadedBy,
    proofSource: opts.proofSource,
    proofNote: opts.proofNote,
  });

  if (link.l1Id) await markFirstPayment(ctx, link.l1Id, now);

  let code: string | undefined;

  if (plan.category === "SUBSCRIPTION") {
    const settings = await getSettings(ctx);
    code = await newCode(ctx);
    const codeId = await ctx.db.insert("subscriptionCodes", {
      code,
      paymentLinkId: link._id,
      l1Id: link.l1Id,
      planId: plan._id,
      status: "UNUSED",
      generatedAt: now,
      expiresAt: addDays(now, settings.codeExpiryDays),
      priceAtIssue: link.amount,
    });

    // P2 — provisional PENDING earning to the seller at Y1, resolved on redemption.
    if (link.l1Id) {
      const rated = await planForAgent(ctx, link.l1Id, plan);
      await insertEarning(ctx, {
        l1Id: link.l1Id,
        date: now,
        type: "NEW_SALES",
        amount: pctOf(link.amount, rated.y1Percent),
        status: "PENDING",
        planId: plan._id,
        sourceCodeId: codeId,
        sourceLinkId: link._id,
        frozen: provisional || undefined,
      });
      await notify(
        ctx,
        link.l1Id,
        "LINK_PAID",
        "Pembayaran diterima",
        `${plan.name} — ${link.amount}.`,
        "/l1/kode",
      );
      await notify(
        ctx,
        link.l1Id,
        "CODE_GENERATED",
        "Kode siap dikirim",
        code,
        "/l1/kode",
      );
    }
  } else {
    await onLifetimePaid(
      ctx,
      { ...link, status: "PAID" },
      plan,
      opts.buyerStoreId,
      opts.buyerStoreName,
      provisional,
    );
  }

  if (provisional) {
    await notifyAdmins(
      ctx,
      "PROOF_UPLOADED",
      "Bukti bayar menunggu verifikasi",
      `${plan.name} — ${link.qrisAmount ?? link.amount}.`,
      "/admin/pembayaran",
    );
  } else {
    await notifyAdmins(
      ctx,
      "PAYMENT_SUCCESS",
      "Pembayaran berhasil",
      `${plan.name} — ${link.amount}.`,
      "/admin/laporan",
    );
  }

  return { ok: true, code, linkId: link._id };
}

export const processPaymentByToken = internalMutation({
  args: {
    token: v.string(),
    gatewayRef: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    buyerStoreId: v.optional(v.string()),
    buyerStoreName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentResult> => {
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link) return { ok: false, reason: "LINK_NOT_FOUND" };
    if (args.idempotencyKey) {
      const seen = await ctx.db
        .query("paymentLinks")
        .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", args.idempotencyKey))
        .first();
      if (seen && seen._id !== link._id) return { ok: false, reason: "DUPLICATE_KEY" };
    }
    // A gateway callback is authoritative — nothing for an admin to confirm.
    return await settle(ctx, link, { ...args, verification: "VERIFIED" });
  },
});

export const failPaymentByToken = internalMutation({
  args: { token: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link || link.status !== "SHARED") return null;
    await ctx.db.patch("paymentLinks", link._id, {
      status: "FAILED",
      failedAt: Date.now(),
    });
    if (link.l1Id) {
      await notify(
        ctx,
        link.l1Id,
        "LINK_FAILED",
        "Pembayaran gagal",
        "Buat tautan baru untuk mencoba lagi.",
        "/l1/kode",
      );
    }
    return null;
  },
});

/** Upload target for the transfer receipt. Storage ids are useless on their own. */
export const generateProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireL1(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Manual settlement: the L1 watched the buyer scan the QRIS and uploads the
 * receipt. The code is released now; an admin confirms the money separately.
 *
 * Only the L1 who owns the link can do this, only once, and only while the
 * link is still open — an expired link has to be recreated at current pricing.
 */
export const submitPaymentProof = mutation({
  args: {
    linkId: v.id("paymentLinks"),
    storageId: v.id("_storage"),
    note: v.optional(v.string()),
    storeId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentResult> => {
    const l1 = await requireL1(ctx);
    const link = await ctx.db.get("paymentLinks", args.linkId);
    if (!link) fail("NOT_FOUND", "Tautan tidak ditemukan.");
    if (link.l1Id !== l1._id) fail("FORBIDDEN", "Bukan tautan Anda.");
    if (link.status === "PAID") fail("ALREADY_PAID", "Bukti sudah dikirim.");
    if (link.status !== "SHARED") fail("LINK_CLOSED", "Tautan sudah tidak berlaku.");
    if (link.expiresAt < Date.now()) {
      await ctx.db.patch("paymentLinks", link._id, { status: "EXPIRED" });
      fail("LINK_EXPIRED", "Tautan kedaluwarsa. Buat tautan baru.");
    }

    return await settle(ctx, link, {
      verification: "PENDING",
      proofStorageId: args.storageId,
      proofUploadedBy: l1._id,
      proofSource: "L1",
      proofNote: args.note,
      buyerStoreId: args.storeId,
      idempotencyKey: `MANUAL-${link._id}`,
    });
  },
});

// --- buyer-side settlement (§4.4) -----------------------------------------
//
// The buyer pays on the shared link without ever logging in, so the token is
// the only credential. That is the same trust level the L1 path already
// carries: the code is released immediately and the commission is booked
// FROZEN until an admin has seen the receipt. What changes is the blast
// radius, so both entry points are rate limited per token.

const PROOF_ATTEMPT_LIMIT = 5;
const PROOF_WINDOW_MS = 60 * 60 * 1000;

/** The link a buyer may still pay on, or a failure the page can explain. */
async function openLinkByToken(ctx: MutationCtx, token: string) {
  const link = await ctx.db
    .query("paymentLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!link) fail("NOT_FOUND", "Tautan tidak ditemukan.");
  if (link.status === "PAID") fail("ALREADY_PAID", "Pembayaran sudah tercatat.");
  if (link.status !== "SHARED") fail("LINK_CLOSED", "Tautan sudah tidak berlaku.");
  if (link.expiresAt < Date.now()) {
    await ctx.db.patch("paymentLinks", link._id, { status: "EXPIRED" });
    fail("LINK_EXPIRED", "Tautan kedaluwarsa. Minta tautan baru ke penjual.");
  }
  return link;
}

export const generateBuyerProofUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await openLinkByToken(ctx, args.token);
    await rateLimit(ctx, `proof:${args.token}`, PROOF_ATTEMPT_LIMIT, PROOF_WINDOW_MS);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * The buyer uploads their own transfer receipt from the payment link. Same
 * settlement as the L1 path — the code appears on this page straight away and
 * the seller is told, so nobody has to be standing next to anybody.
 */
export const submitBuyerProof = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentResult> => {
    const link = await openLinkByToken(ctx, args.token);
    return await settle(ctx, link, {
      verification: "PENDING",
      proofStorageId: args.storageId,
      proofSource: "BUYER",
      proofNote: args.note,
      idempotencyKey: `MANUAL-${link._id}`,
    });
  },
});

/** Daily cron — §4.2 expired links can never be paid. */
export const expirePaymentLinks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("paymentLinks")
      .withIndex("by_status_expiry", (q) => q.eq("status", "SHARED").lt("expiresAt", now))
      .take(200);
    for (const link of stale) {
      await ctx.db.patch("paymentLinks", link._id, { status: "EXPIRED" });
    }
    return null;
  },
});
