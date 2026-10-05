import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, internalMutation, internalQuery } from "./_generated/server";
import { fail, rateLimit } from "./lib/authz";
import { convertQRIS, qrisFrameInfo } from "./lib/qris";
import { getSettings } from "./lib/settings";
import { randomToken } from "./lib/tokens";
import { settle, PaymentResult } from "./payments";
import { uniquePaymentAmount } from "./sell";

// Self renewal from inside SellMore. The merchant pays the company QRIS and
// uploads the receipt; the code is released straight away, exactly like the
// buyer-side flow, and an admin confirms the transfer later.
//
// The link carries no l1Id: the code is not sold by anyone. Commission still
// reaches the merchant's owner through the renewal path in sdk.ts, which looks
// the owner up by store id.
//
// The device key is public, so the store id is a claim, not a credential.
// Every entry point is rate limited per store and per IP.

const CREATE_LIMIT = 10;
const PROOF_LIMIT = 5;
const IP_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

const OPEN_LINK_STATUS = "SHARED" as const;

async function merchantByStore(ctx: QueryCtx, storeId: string) {
  return await ctx.db
    .query("merchants")
    .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", storeId))
    .unique();
}

/** What a merchant pays to renew: the locked renewal price when one is set. */
function renewalAmount(plan: Doc<"productPlans">): number {
  return plan.renewalPrice ?? plan.price;
}

/**
 * Plans a merchant may renew onto. Subscriptions only — lifetime goes through
 * its own seat flow — and never a shorter period than the current one.
 */
async function renewablePlans(ctx: QueryCtx, merchant: Doc<"merchants">) {
  const current = merchant.currentPlanId
    ? await ctx.db.get("productPlans", merchant.currentPlanId)
    : null;
  const floor = current?.category === "SUBSCRIPTION" ? current.durationMonths : 0;
  const plans = await ctx.db
    .query("productPlans")
    .withIndex("by_active", (q) => q.eq("active", true))
    .collect();
  return plans
    .filter((p) => p.category === "SUBSCRIPTION" && p.durationMonths >= floor)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function openSelfRenewLink(ctx: QueryCtx, storeId: string) {
  const link = await ctx.db
    .query("paymentLinks")
    .withIndex("by_store_source", (q) =>
      q
        .eq("buyerSellMoreStoreId", storeId)
        .eq("source", "SELF_RENEW")
        .eq("status", OPEN_LINK_STATUS),
    )
    .first();
  return link && link.expiresAt > Date.now() ? link : null;
}

function shapeLink(link: Doc<"paymentLinks">, plan: Doc<"productPlans">) {
  const payload = link.qrisPayload ?? "";
  return {
    token: link.token,
    planKey: plan.key,
    planName: plan.name,
    amount: link.amount,
    qrisAmount: link.qrisAmount ?? link.amount,
    qrisPayload: payload,
    merchant: payload ? qrisFrameInfo(payload) : null,
    expiresAt: link.expiresAt,
  };
}

type Failure = { ok: false; error: string };

async function limit(ctx: MutationCtx, key: string, max: number): Promise<Failure | null> {
  try {
    await rateLimit(ctx, key, max, WINDOW_MS);
    return null;
  } catch {
    return { ok: false, error: "rate_limited" };
  }
}

// --- offer -------------------------------------------------------------------

export const offer = internalQuery({
  args: { storeId: v.string() },
  handler: async (ctx, args) => {
    const merchant = await merchantByStore(ctx, args.storeId);
    if (!merchant) return { ok: false as const, error: "unknown_merchant" };
    if (merchant.subscriptionStatus === "LIFETIME") {
      return { ok: false as const, error: "path_locked" };
    }
    const settings = await getSettings(ctx);
    if (!settings.qris?.enabled || !settings.qris.staticPayload) {
      return { ok: false as const, error: "qris_not_configured" };
    }

    const current = merchant.currentPlanId
      ? await ctx.db.get("productPlans", merchant.currentPlanId)
      : null;
    const plans = await renewablePlans(ctx, merchant);
    const open = await openSelfRenewLink(ctx, args.storeId);
    const openPlan = open ? await ctx.db.get("productPlans", open.planId) : null;

    return {
      ok: true as const,
      currentPlanKey: current?.key ?? null,
      expiresAt: merchant.currentExpiryAt ?? null,
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        amount: renewalAmount(p),
        durationMonths: p.durationMonths,
      })),
      openLink: open && openPlan ? shapeLink(open, openPlan) : null,
      instructions: settings.qris.instructions ?? null,
    };
  },
});

// --- create ------------------------------------------------------------------

export const createLink = internalMutation({
  args: { storeId: v.string(), planKey: v.string(), ip: v.string() },
  handler: async (ctx, args) => {
    const limited =
      (await limit(ctx, `selfrenew:create:store:${args.storeId}`, CREATE_LIMIT)) ??
      (await limit(ctx, `selfrenew:ip:${args.ip}`, IP_LIMIT));
    if (limited) return limited;

    const merchant = await merchantByStore(ctx, args.storeId);
    if (!merchant) return { ok: false as const, error: "unknown_merchant" };
    if (merchant.subscriptionStatus === "LIFETIME") {
      return { ok: false as const, error: "path_locked" };
    }

    const plans = await renewablePlans(ctx, merchant);
    const plan = plans.find((p) => p.key === args.planKey);
    if (!plan) return { ok: false as const, error: "plan_not_allowed" };

    // One open link per store. Same plan → hand the same QRIS back, so a
    // merchant who reopens the screen never pays two different amounts.
    const open = await openSelfRenewLink(ctx, args.storeId);
    if (open) {
      if (open.planId === plan._id) return { ok: true as const, link: shapeLink(open, plan) };
      await ctx.db.patch("paymentLinks", open._id, { status: "EXPIRED" });
    }

    const settings = await getSettings(ctx);
    const qris = settings.qris;
    if (!qris?.enabled || !qris.staticPayload) {
      return { ok: false as const, error: "qris_not_configured" };
    }

    const amount = renewalAmount(plan);
    const qrisAmount = qris.uniqueAmountEnabled
      ? await uniquePaymentAmount(ctx, amount, Math.max(1, qris.uniqueAmountMax))
      : amount;
    let qrisPayload: string;
    try {
      qrisPayload = convertQRIS(qris.staticPayload, qrisAmount);
    } catch {
      return { ok: false as const, error: "qris_not_configured" };
    }

    const now = Date.now();
    const linkId = await ctx.db.insert("paymentLinks", {
      planId: plan._id,
      kind: plan.category,
      amount,
      token: randomToken(20),
      status: OPEN_LINK_STATUS,
      createdAt: now,
      expiresAt: now + settings.paymentLinkExpiryHours * 60 * 60 * 1000,
      qrisPayload,
      qrisAmount,
      buyerSellMoreStoreId: args.storeId,
      buyerMerchantId: merchant._id,
      source: "SELF_RENEW",
    });
    const link = (await ctx.db.get("paymentLinks", linkId))!;
    return { ok: true as const, link: shapeLink(link, plan) };
  },
});

// --- proof -------------------------------------------------------------------

/**
 * The receipt is already in storage (the HTTP action stored it). Settle the
 * link and hand the code back. On any failure the caller deletes the blob.
 */
export const submitProof = internalMutation({
  args: {
    storeId: v.string(),
    token: v.string(),
    storageId: v.id("_storage"),
    ip: v.string(),
  },
  handler: async (ctx, args): Promise<Failure | { ok: true; code: string }> => {
    const limited =
      (await limit(ctx, `selfrenew:proof:store:${args.storeId}`, PROOF_LIMIT)) ??
      (await limit(ctx, `selfrenew:ip:${args.ip}`, IP_LIMIT));
    if (limited) return limited;

    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    // A token from another store is treated as not found — never confirm it exists.
    if (!link || link.source !== "SELF_RENEW" || link.buyerSellMoreStoreId !== args.storeId) {
      return { ok: false, error: "invalid_link" };
    }
    if (link.status === "PAID") return { ok: false, error: "already_paid" };
    if (link.status !== OPEN_LINK_STATUS) return { ok: false, error: "link_closed" };

    const result: PaymentResult = await settle(ctx, link, {
      verification: "PENDING",
      proofStorageId: args.storageId,
      proofSource: "BUYER",
      proofNote: "Self-renew dari SellMore",
      idempotencyKey: `MANUAL-${link._id}`,
    });
    if (!result.ok) {
      return { ok: false, error: result.reason === "LINK_EXPIRED" ? "link_expired" : "link_closed" };
    }
    if (!result.code) fail("CODE_GENERATION_FAILED", "Gagal membuat kode.");

    return { ok: true, code: result.code };
  },
});
