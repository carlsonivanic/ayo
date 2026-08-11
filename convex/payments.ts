import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation, mutation } from "./_generated/server";
import { fail } from "./lib/authz";
import { generateCodeString } from "./lib/codegen";
import { insertEarning } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { notify, notifyAdmins } from "./lib/notify";
import { addDays } from "./lib/period";
import { getSettings } from "./lib/settings";
import { onLifetimePaid } from "./seats";

// §7.1 / P6 — the single idempotent entry point for money coming in. Called by
// the gateway webhook, by the SDK for in-app lifetime purchases, and by the
// simulated checkout when no gateway is configured.

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

async function settle(
  ctx: MutationCtx,
  link: Doc<"paymentLinks">,
  opts: {
    gatewayRef?: string;
    idempotencyKey?: string;
    buyerStoreId?: string;
    buyerStoreName?: string;
  },
): Promise<PaymentResult> {
  const now = Date.now();

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
      await insertEarning(ctx, {
        l1Id: link.l1Id,
        date: now,
        type: "NEW_SALES",
        amount: pctOf(link.amount, plan.y1Percent),
        status: "PENDING",
        planId: plan._id,
        sourceCodeId: codeId,
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
    await onLifetimePaid(ctx, { ...link, status: "PAID" }, plan, opts.buyerStoreId, opts.buyerStoreName);
  }

  await notifyAdmins(
    ctx,
    "PAYMENT_SUCCESS",
    "Pembayaran berhasil",
    `${plan.name} — ${link.amount}.`,
    "/admin/laporan",
  );

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
    return await settle(ctx, link, args);
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

/**
 * Checkout without a payment gateway. Enabled only while AYO_PAYMENT_MODE is
 * SIMULATED (the default for a fresh deployment); once a real gateway is
 * configured the webhook is the only way a link can become PAID.
 */
export const simulateCheckout = mutation({
  args: { token: v.string(), storeId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<PaymentResult> => {
    if ((process.env.AYO_PAYMENT_MODE ?? "SIMULATED") !== "SIMULATED") {
      fail("SIMULATION_DISABLED", "Pembayaran simulasi dimatikan.");
    }
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link) fail("NOT_FOUND", "Tautan tidak ditemukan.");
    return await settle(ctx, link, {
      gatewayRef: `SIM-${Date.now()}`,
      idempotencyKey: `SIM-${link._id}`,
      buyerStoreId: args.storeId,
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
