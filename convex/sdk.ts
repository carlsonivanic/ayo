import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation, internalQuery } from "./_generated/server";
import { recurringCommission, renewalIncentive, yearBucket } from "./lib/commission";
import { insertEarning, recordAcquisition, recordMerchantPayment } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { notify, notifyAdmins } from "./lib/notify";
import { activeOverride, planForAgent, renewalIncentivePercentFor } from "./lib/overrides";
import { addMonths } from "./lib/period";
import { getSettings } from "./lib/settings";
import { activateSeat, issueSeatLink, onLifetimePaid } from "./seats";

// §39 / §13 — the SellMore-embedded face of AYO. This is the only place merchant
// identity is known, so attribution, path-lock and renewal routing all resolve
// here. Every function is internal; convex/http.ts is the authenticated edge.

type Failure = { ok: false; error: string };

/**
 * Two SDK routes settle money on the device's word alone: the POS says the
 * buyer paid and AYO books the commission. That is safe only behind a real
 * gateway. While settlement is manual they stay off unless an operator opts
 * in explicitly, and sales go through the L1's QRIS + receipt flow instead.
 */
function deviceSettlementDisabled(): boolean {
  return (process.env.AYO_TRUST_DEVICE_PAYMENTS ?? "false").toLowerCase() !== "true";
}

async function merchantByStore(ctx: MutationCtx, storeId: string) {
  return await ctx.db
    .query("merchants")
    .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", storeId))
    .unique();
}

/** §14.5 — early renewal extends the current period; a churned return starts fresh. */
function nextExpiry(
  merchant: Doc<"merchants"> | null,
  plan: Doc<"productPlans">,
  at: number,
): number {
  const base =
    merchant?.currentExpiryAt && merchant.currentExpiryAt > at
      ? merchant.currentExpiryAt
      : at;
  return addMonths(base, plan.durationMonths);
}

// --- state ------------------------------------------------------------------

export const merchantState = internalQuery({
  args: { storeId: v.string() },
  handler: async (ctx, args) => {
    const merchant = await ctx.db
      .query("merchants")
      .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", args.storeId))
      .unique();
    if (!merchant) {
      // §39.2 — no row means PROSPECT. We never materialise one just to look.
      return { state: "PROSPECT" as const, expiresAt: null, planKey: null };
    }
    const plan = merchant.currentPlanId
      ? await ctx.db.get("productPlans", merchant.currentPlanId)
      : null;
    return {
      state: merchant.subscriptionStatus,
      expiresAt: merchant.currentExpiryAt ?? null,
      planKey: plan?.key ?? null,
      storeName: merchant.storeName ?? null,
    };
  },
});

/** §15.3 L2 — pre-payment gate. Creates no rows. */
export const pathLockCheck = internalMutation({
  args: { storeId: v.string(), storeName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const merchant = await merchantByStore(ctx, args.storeId);
    if (!merchant) return { allowed: true as const, state: "PROSPECT" as const };
    await notifyAdmins(
      ctx,
      "PATH_LOCK_BLOCK",
      "Percobaan beli lifetime diblokir",
      `${merchant.storeName ?? args.storeId} berstatus ${merchant.subscriptionStatus}.`,
      "/admin/merchant",
    );
    return { allowed: false as const, state: merchant.subscriptionStatus };
  },
});

// --- subscription redemption (§7.3) ----------------------------------------

export const redeemSubscriptionCode = internalMutation({
  args: {
    code: v.string(),
    storeId: v.string(),
    storeName: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | Failure
    | {
        ok: true;
        redemptionType: "FIRST_ACTIVATION" | "RENEWAL";
        expiresAt: number | null;
        planKey: string;
        lifetime: boolean;
      }
  > => {
    const now = Date.now();
    const code = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .unique();
    if (!code) return { ok: false, error: "invalid_code" };
    if (code.status === "USED") return { ok: false, error: "code_used" };
    if (code.status === "EXPIRED") return { ok: false, error: "code_expired" };
    if (code.expiresAt < now) {
      await ctx.db.patch("subscriptionCodes", code._id, { status: "EXPIRED" });
      return { ok: false, error: "code_expired" };
    }

    const plan = await ctx.db.get("productPlans", code.planId);
    if (!plan) return { ok: false, error: "plan_missing" };

    const settings = await getSettings(ctx);
    const price = code.priceAtIssue;
    // §14.2 — the Y rate follows the PAYMENT date, which is when the code was issued.
    const paymentDate = code.generatedAt;
    const merchant = await merchantByStore(ctx, args.storeId);

    if (merchant?.subscriptionStatus === "LIFETIME") {
      return { ok: false, error: "path_locked" };
    }

    const pending = code.l1Id
      ? await ctx.db
          .query("earningLines")
          .withIndex("by_code", (q) => q.eq("sourceCodeId", code._id))
          .first()
      : null;

    if (!merchant) {
      // --- first-time activation ------------------------------------------
      const expiry = addMonths(now, plan.durationMonths);
      const merchantId = await ctx.db.insert("merchants", {
        sellMoreStoreId: args.storeId,
        storeName: args.storeName,
        location: args.location,
        ownerL1Id: code.l1Id, // §14.1 permanent from here on
        firstPaymentAt: paymentDate,
        firstActivatedAt: now,
        currentPlanId: plan._id,
        subscriptionStatus: "SUBSCRIBED",
        currentExpiryAt: expiry,
        lastSeenAt: now,
      });

      const amount = pctOf(price, (await planForAgent(ctx, code.l1Id, plan)).y1Percent);
      if (code.l1Id) {
        if (pending) {
          await ctx.db.patch("earningLines", pending._id, {
            status: "CONFIRMED",
            merchantId,
            type: "NEW_SALES",
            amount,
          });
        } else {
          await insertEarning(ctx, {
            l1Id: code.l1Id,
            date: paymentDate,
            type: "NEW_SALES",
            amount,
            status: "CONFIRMED",
            planId: plan._id,
            merchantId,
            sourceCodeId: code._id,
          });
        }
        await recordAcquisition(ctx, {
          l1Id: code.l1Id,
          merchantId,
          date: now,
          sourceType: "CODE",
          sourceId: code._id,
        });
        await recordMerchantPayment(ctx, {
          merchantId,
          recipientL1Id: code.l1Id,
          date: paymentDate,
          type: "NEW_SALES",
          amount,
          paymentAmount: price,
          planId: plan._id,
          method: "CODE",
          yLabel: "Y1",
        });
        await notify(
          ctx,
          code.l1Id,
          "CODE_USED",
          "Kode dipakai",
          `${args.storeName ?? args.storeId} aktif.`,
          "/l1/pelanggan",
        );
      }

      await ctx.db.patch("subscriptionCodes", code._id, {
        status: "USED",
        usedAt: now,
        storeName: args.storeName,
        merchantId,
        redemptionType: "FIRST_ACTIVATION",
      });
      return {
        ok: true,
        redemptionType: "FIRST_ACTIVATION",
        expiresAt: expiry,
        planKey: plan.key,
        lifetime: false,
      };
    }

    // --- renewal ----------------------------------------------------------
    const expiry = nextExpiry(merchant, plan, now);
    const owner = merchant.ownerL1Id
      ? await ctx.db.get("users", merchant.ownerL1Id)
      : null;
    // Y follows the owner's agreement; the code seller's only affects the incentive.
    const recurring = recurringCommission(
      await planForAgent(ctx, owner?._id, plan),
      merchant.firstPaymentAt,
      paymentDate,
      price,
      settings.ownershipWindowMonths,
    );

    // §14.3 — owner keeps Y, the seller of the code earns the 2% incentive.
    if (owner && recurring.amount > 0) {
      const frozen = owner.status === "SUSPENDED";
      await insertEarning(ctx, {
        l1Id: owner._id,
        date: paymentDate,
        type: "RECURRING",
        amount: recurring.amount,
        status: "CONFIRMED",
        planId: plan._id,
        merchantId: merchant._id,
        sourceCodeId: code._id,
        frozen: frozen || undefined,
      });
      if (frozen) {
        await notifyAdmins(
          ctx,
          "OWNER_COMMISSION_FROZEN",
          "Komisi owner dibekukan",
          `${merchant.storeName ?? merchant.sellMoreStoreId} — owner ditangguhkan.`,
          "/admin/merchant",
        );
      }
      await recordMerchantPayment(ctx, {
        merchantId: merchant._id,
        recipientL1Id: owner._id,
        date: paymentDate,
        type: "RECURRING",
        amount: recurring.amount,
        paymentAmount: price,
        planId: plan._id,
        method: "CODE",
        yLabel: recurring.label,
      });
    } else {
      await recordMerchantPayment(ctx, {
        merchantId: merchant._id,
        date: paymentDate,
        type: "RECURRING",
        amount: 0,
        paymentAmount: price,
        planId: plan._id,
        method: "CODE",
        yLabel: yearBucket(
          merchant.firstPaymentAt,
          paymentDate,
          settings.ownershipWindowMonths,
        ),
      });
    }

    if (code.l1Id) {
      const incentive = renewalIncentive(
        price,
        renewalIncentivePercentFor(settings, await activeOverride(ctx, code.l1Id)),
      );
      if (pending) {
        await ctx.db.patch("earningLines", pending._id, {
          status: "CONFIRMED",
          type: "RENEWAL_INCENTIVE",
          amount: incentive,
          merchantId: merchant._id,
        });
      } else {
        await insertEarning(ctx, {
          l1Id: code.l1Id,
          date: paymentDate,
          type: "RENEWAL_INCENTIVE",
          amount: incentive,
          status: "CONFIRMED",
          planId: plan._id,
          merchantId: merchant._id,
          sourceCodeId: code._id,
        });
      }
      await notify(
        ctx,
        code.l1Id,
        "RENEWAL_INCENTIVE",
        "Insentif perpanjangan",
        `${merchant.storeName ?? args.storeId} — ${incentive}.`,
        "/l1/penghasilan",
      );
    }

    await ctx.db.patch("merchants", merchant._id, {
      subscriptionStatus: "SUBSCRIBED",
      currentPlanId: plan._id,
      currentExpiryAt: expiry,
      storeName: args.storeName ?? merchant.storeName,
      lastSeenAt: now,
    });
    await ctx.db.patch("subscriptionCodes", code._id, {
      status: "USED",
      usedAt: now,
      storeName: args.storeName ?? merchant.storeName,
      merchantId: merchant._id,
      redemptionType: "RENEWAL",
    });

    return {
      ok: true,
      redemptionType: "RENEWAL",
      expiresAt: expiry,
      planKey: plan.key,
      lifetime: false,
    };
  },
});

// --- self renewal (§7.6) ----------------------------------------------------

export const reportSelfRenewal = internalMutation({
  args: {
    storeId: v.string(),
    planKey: v.string(),
    amountPaid: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Failure | { ok: true; expiresAt: number; planKey: string }> => {
    if (deviceSettlementDisabled()) return { ok: false, error: "settlement_manual" };
    const merchant = await merchantByStore(ctx, args.storeId);
    if (!merchant) return { ok: false, error: "unknown_merchant" };
    if (merchant.subscriptionStatus === "LIFETIME") {
      return { ok: false, error: "path_locked" };
    }
    const plan = await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", args.planKey))
      .unique();
    if (!plan || plan.category !== "SUBSCRIPTION") {
      return { ok: false, error: "plan_missing" };
    }

    const now = Date.now();
    const settings = await getSettings(ctx);
    // Edge 13 — under NEW_SALES_ONLY the pre-change price is kept for renewals.
    const price = args.amountPaid ?? plan.renewalPrice ?? plan.price;
    const expiry = nextExpiry(merchant, plan, now);
    const owner = merchant.ownerL1Id
      ? await ctx.db.get("users", merchant.ownerL1Id)
      : null;
    const recurring = recurringCommission(
      await planForAgent(ctx, owner?._id, plan),
      merchant.firstPaymentAt,
      now,
      price,
      settings.ownershipWindowMonths,
    );

    if (owner && recurring.amount > 0) {
      const frozen = owner.status === "SUSPENDED";
      await insertEarning(ctx, {
        l1Id: owner._id,
        date: now,
        type: "RECURRING",
        amount: recurring.amount,
        status: "CONFIRMED", // identity is known, so nothing stays pending
        planId: plan._id,
        merchantId: merchant._id,
        frozen: frozen || undefined,
      });
      if (frozen) {
        await notifyAdmins(
          ctx,
          "OWNER_COMMISSION_FROZEN",
          "Komisi owner dibekukan",
          `${merchant.storeName ?? merchant.sellMoreStoreId} — owner ditangguhkan.`,
          "/admin/merchant",
        );
      }
    }
    await recordMerchantPayment(ctx, {
      merchantId: merchant._id,
      recipientL1Id: owner?._id,
      date: now,
      type: "RECURRING",
      amount: owner ? recurring.amount : 0,
      paymentAmount: price,
      planId: plan._id,
      method: "SELF",
      yLabel: recurring.label,
    });

    await ctx.db.patch("merchants", merchant._id, {
      subscriptionStatus: "SUBSCRIBED",
      currentPlanId: plan._id,
      currentExpiryAt: expiry,
      lastSeenAt: now,
    });

    return { ok: true, expiresAt: expiry, planKey: plan.key };
  },
});

// --- lifetime (§7.2 / §7.4 / §7.5) -----------------------------------------

/** Buyer taps the deep link inside SellMore: bind identity, then pay. */
export const payLifetimeLink = internalMutation({
  args: {
    token: v.string(),
    storeId: v.string(),
    storeName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Failure | { ok: true; seats: number; activated: boolean }> => {
    if (deviceSettlementDisabled()) return { ok: false, error: "settlement_manual" };
    const link = await ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link || link.kind !== "LIFETIME") return { ok: false, error: "invalid_link" };
    if (link.status === "PAID") return { ok: false, error: "already_paid" };
    if (link.status !== "SHARED") return { ok: false, error: "link_closed" };
    if (link.expiresAt < Date.now()) {
      await ctx.db.patch("paymentLinks", link._id, { status: "EXPIRED" });
      return { ok: false, error: "link_expired" };
    }

    // §15.3 — path lock happens BEFORE payment; there are no refunds.
    const existing = await merchantByStore(ctx, args.storeId);
    if (existing) {
      await notifyAdmins(
        ctx,
        "PATH_LOCK_BLOCK",
        "Percobaan beli lifetime diblokir",
        `${existing.storeName ?? args.storeId} berstatus ${existing.subscriptionStatus}.`,
        "/admin/merchant",
      );
      return { ok: false, error: "path_locked" };
    }

    const plan = await ctx.db.get("productPlans", link.planId);
    if (!plan) return { ok: false, error: "plan_missing" };

    await ctx.db.patch("paymentLinks", link._id, {
      status: "PAID",
      paidAt: Date.now(),
      buyerSellMoreStoreId: args.storeId,
    });
    if (link.l1Id) {
      const l1 = await ctx.db.get("users", link.l1Id);
      if (l1 && !l1.firstPaymentAt) {
        await ctx.db.patch("users", l1._id, { firstPaymentAt: Date.now() });
      }
    }

    const paid = await ctx.db.get("paymentLinks", link._id);
    const result = await onLifetimePaid(ctx, paid!, plan, args.storeId, args.storeName);
    return {
      ok: true,
      seats: result.seatIds.length,
      activated: plan.seatCount === 1,
    };
  },
});

export const activateSeatByToken = internalMutation({
  args: {
    seatToken: v.string(),
    storeId: v.string(),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Failure | { ok: true }> => {
    const seat = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_token", (q) => q.eq("activationLinkToken", args.seatToken))
      .unique();
    if (!seat) return { ok: false, error: "invalid_seat" };
    if (seat.status === "ACTIVATED") return { ok: false, error: "seat_used" };
    if (seat.linkExpiresAt && seat.linkExpiresAt < Date.now()) {
      return { ok: false, error: "seat_link_expired" };
    }
    const result = await activateSeat(ctx, seat, args.storeId, args.storeName);
    if (!result.activated) return { ok: false, error: result.reason ?? "blocked" };
    return { ok: true };
  },
});

/** Buyer-only: mint (or re-mint) a 30-day gift link for one of their seats. */
export const regenerateSeatLink = internalMutation({
  args: { storeId: v.string(), seatId: v.optional(v.id("lifetimeSeats")) },
  handler: async (
    ctx,
    args,
  ): Promise<Failure | { ok: true; token: string; expiresAt: number }> => {
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_buyer_store_id", (q) => q.eq("buyerSellMoreStoreId", args.storeId))
      .collect();
    const seat = args.seatId
      ? seats.find((s) => s._id === args.seatId)
      : seats.find((s) => s.status !== "ACTIVATED");
    if (!seat) return { ok: false, error: "no_seat" };
    const { token, expiresAt } = await issueSeatLink(ctx, seat);
    return { ok: true, token, expiresAt };
  },
});

/** Seats the buyer still holds — drives the SellMore "gift a seat" screen. */
export const seatPool = internalQuery({
  args: { storeId: v.string() },
  handler: async (ctx, args) => {
    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_buyer_store_id", (q) => q.eq("buyerSellMoreStoreId", args.storeId))
      .collect();
    return seats.map((s) => ({
      id: s._id as Id<"lifetimeSeats">,
      seatIndex: s.seatIndex,
      status: s.status,
      token: s.activationLinkToken ?? null,
      expiresAt: s.linkExpiresAt ?? null,
    }));
  },
});
