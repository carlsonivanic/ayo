import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, query } from "./_generated/server";
import { fail } from "./lib/authz";
import { insertEarning, recordAcquisition, recordMerchantPayment } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { notify, notifyAdmins } from "./lib/notify";
import { addDays } from "./lib/period";
import { getSettings } from "./lib/settings";
import { randomToken } from "./lib/tokens";

// §2.2 / §15.6 — unified seats. Lifetime never uses codes: one mechanism covers
// Single (1 seat) and Duo (2 seats), and a blocked seat always returns to the
// buyer's pool rather than being refunded.

/** Called from the payment path once a lifetime purchase settles. */
export async function onLifetimePaid(
  ctx: MutationCtx,
  link: Doc<"paymentLinks">,
  plan: Doc<"productPlans">,
  buyerStoreId: string | undefined,
  buyerStoreName: string | undefined,
): Promise<{ seatIds: Id<"lifetimeSeats">[] }> {
  const now = Date.now();
  const seatCount = Math.max(1, plan.seatCount);
  const unitValue = Math.round(link.amount / seatCount);

  // §2.2 — the full one-time commission is recognised at payment, CONFIRMED.
  if (link.l1Id) {
    const commission = pctOf(link.amount, plan.oneTimePercent);
    await insertEarning(ctx, {
      l1Id: link.l1Id,
      date: now,
      type: "NEW_SALES",
      amount: commission,
      status: "CONFIRMED",
      planId: plan._id,
    });
    await notify(
      ctx,
      link.l1Id,
      "LIFETIME_PAID",
      "Lifetime terjual",
      `${plan.name} — komisi ${commission}.`,
      "/l1/penghasilan",
    );
  }

  const seatIds: Id<"lifetimeSeats">[] = [];
  for (let i = 0; i < seatCount; i++) {
    seatIds.push(
      await ctx.db.insert("lifetimeSeats", {
        paymentLinkId: link._id,
        buyerSellMoreStoreId: buyerStoreId,
        sellerL1Id: link.l1Id,
        planId: plan._id,
        seatIndex: i + 1,
        status: "POOLED",
        regenerationCount: 0,
        unitValue,
      }),
    );
  }

  // Single Lifetime is seamless: the seat is assigned to the buyer at payment.
  if (seatCount === 1 && buyerStoreId) {
    const seat = await ctx.db.get("lifetimeSeats", seatIds[0]);
    if (seat) await activateSeat(ctx, seat, buyerStoreId, buyerStoreName);
  }

  return { seatIds };
}

/**
 * §15.3 L3 — re-verify PROSPECT at activation. A non-prospect never consumes the
 * seat: it goes back to the pool, re-giftable, with no refund.
 */
export async function activateSeat(
  ctx: MutationCtx,
  seat: Doc<"lifetimeSeats">,
  storeId: string,
  storeName: string | undefined,
): Promise<{ activated: boolean; reason?: string }> {
  if (seat.status === "ACTIVATED") return { activated: false, reason: "SEAT_USED" };

  const existing = await ctx.db
    .query("merchants")
    .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", storeId))
    .unique();

  if (existing) {
    await ctx.db.patch("lifetimeSeats", seat._id, {
      status: "POOLED",
      activationLinkToken: undefined,
      linkExpiresAt: undefined,
    });
    if (seat.sellerL1Id) {
      await notify(
        ctx,
        seat.sellerL1Id,
        "SEAT_BLOCKED",
        "Kursi dikembalikan",
        "Penerima sudah berlangganan. Kursi kembali ke pool.",
        "/l1/kode",
      );
    }
    await notifyAdmins(
      ctx,
      "PATH_LOCK_BLOCK",
      "Aktivasi lifetime diblokir",
      `Toko ${storeName ?? storeId} bukan prospect.`,
      "/admin/merchant",
    );
    return { activated: false, reason: "NOT_PROSPECT" };
  }

  const now = Date.now();
  const plan = await ctx.db.get("productPlans", seat.planId);
  const merchantId = await ctx.db.insert("merchants", {
    sellMoreStoreId: storeId,
    storeName,
    ownerL1Id: seat.sellerL1Id,
    firstPaymentAt: now,
    firstActivatedAt: now,
    currentPlanId: seat.planId,
    subscriptionStatus: "LIFETIME",
    lifetimeActivatedAt: now,
  });

  await ctx.db.patch("lifetimeSeats", seat._id, {
    status: "ACTIVATED",
    assignedToMerchantId: merchantId,
    buyerMerchantId: seat.buyerMerchantId ?? merchantId,
    activatedAt: now,
    activationLinkToken: undefined,
    linkExpiresAt: undefined,
  });

  if (seat.sellerL1Id) {
    await recordAcquisition(ctx, {
      l1Id: seat.sellerL1Id,
      merchantId,
      date: now,
      sourceType: "SEAT",
      sourceId: seat._id,
    });
    await recordMerchantPayment(ctx, {
      merchantId,
      recipientL1Id: seat.sellerL1Id,
      date: now,
      type: "NEW_SALES",
      amount: 0, // commission was recognised in full at payment (§2.2)
      paymentAmount: seat.unitValue,
      planId: seat.planId,
      method: "SELF",
      yLabel: "—",
    });
    await notify(
      ctx,
      seat.sellerL1Id,
      "SEAT_ACTIVATED",
      "Kursi diaktifkan",
      `${storeName ?? storeId} aktif dengan ${plan?.name ?? "Lifetime"}.`,
      "/l1/pelanggan",
    );
  }
  return { activated: true };
}

/** §15.6 — buyer generates a giftable link for a pooled seat. */
export async function issueSeatLink(
  ctx: MutationCtx,
  seat: Doc<"lifetimeSeats">,
): Promise<{ token: string; expiresAt: number }> {
  if (seat.status === "ACTIVATED") fail("SEAT_USED", "Kursi sudah dipakai.");
  const settings = await getSettings(ctx);
  const token = randomToken(24);
  const expiresAt = addDays(Date.now(), settings.seatLinkExpiryDays);
  await ctx.db.patch("lifetimeSeats", seat._id, {
    status: "GIFT_LINK_ACTIVE",
    activationLinkToken: token,
    linkGeneratedAt: Date.now(),
    linkExpiresAt: expiresAt,
    regenerationCount: seat.regenerationCount + 1,
  });
  return { token, expiresAt };
}

/** Public landing for a gift link — the web fallback when SellMore is absent. */
export const publicSeatLink = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const seat = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_token", (q) => q.eq("activationLinkToken", args.token))
      .unique();
    if (!seat) return null;
    const plan = await ctx.db.get("productPlans", seat.planId);
    const expired = !!seat.linkExpiresAt && seat.linkExpiresAt < Date.now();
    return {
      planName: plan?.name ?? "Lifetime",
      status: seat.status,
      expired,
      expiresAt: seat.linkExpiresAt ?? null,
    };
  },
});
