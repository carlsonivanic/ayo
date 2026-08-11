import { internalMutation } from "./_generated/server";
import { notify, notifyAdmins } from "./lib/notify";
import { DAY_MS, addMonths } from "./lib/period";
import { getSettings } from "./lib/settings";

// §8.5 / §12 daily maintenance. Each job is bounded and safe to re-run.

/** §5.3 — an unused code dies after 7 days. The earning stays (§6.2). */
export const expireUnusedCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_expiry_status", (q) => q.eq("status", "UNUSED").lt("expiresAt", now))
      .take(200);

    for (const code of stale) {
      await ctx.db.patch("subscriptionCodes", code._id, { status: "EXPIRED" });
      // The provisional earning is confirmed to the seller — it was a real sale,
      // it simply never produced an acquisition (§6.2).
      const pending = await ctx.db
        .query("earningLines")
        .withIndex("by_code", (q) => q.eq("sourceCodeId", code._id))
        .collect();
      for (const line of pending) {
        if (line.status === "PENDING") {
          await ctx.db.patch("earningLines", line._id, { status: "CONFIRMED" });
        }
      }
      if (code.l1Id) {
        await notify(
          ctx,
          code.l1Id,
          "CODE_EXPIRED",
          "Kode kedaluwarsa",
          `${code.code} tidak dipakai.`,
          "/l1/kode",
        );
      }
    }
    if (stale.length > 0) {
      await notifyAdmins(
        ctx,
        "CODE_EXPIRED",
        "Kode kedaluwarsa",
        `${stale.length} kode kedaluwarsa hari ini.`,
        "/admin/laporan",
      );
    }
    return { expired: stale.length };
  },
});

/** §2.2 — the gift link expires after 30 days; the seat keeps its value. */
export const expireSeatLinks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stale = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_link_expiry", (q) =>
        q.eq("status", "GIFT_LINK_ACTIVE").lt("linkExpiresAt", now),
      )
      .take(200);

    for (const seat of stale) {
      await ctx.db.patch("lifetimeSeats", seat._id, {
        status: "POOLED",
        activationLinkToken: undefined,
        linkExpiresAt: undefined,
      });
    }
    if (stale.length > 0) {
      await notifyAdmins(
        ctx,
        "SEAT_LINK_EXPIRED",
        "Tautan kursi kedaluwarsa",
        `${stale.length} tautan kembali ke pool.`,
        "/admin/merchant",
      );
    }
    return { expired: stale.length };
  },
});

export const markChurnedMerchants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("merchants")
      .withIndex("by_expiry", (q) => q.lt("currentExpiryAt", now))
      .take(300);

    let churned = 0;
    for (const merchant of expired) {
      if (merchant.subscriptionStatus !== "SUBSCRIBED") continue;
      await ctx.db.patch("merchants", merchant._id, { subscriptionStatus: "CHURNED" });
      churned++;
      if (merchant.ownerL1Id) {
        await notify(
          ctx,
          merchant.ownerL1Id,
          "CUSTOMER_CHURNED",
          "Pelanggan berhenti",
          merchant.storeName ?? merchant.sellMoreStoreId,
          "/l1/pelanggan",
        );
      }
    }
    return { churned };
  },
});

/** §38.4 — churn prevention. Fires once, in the 24h window 7 days out. */
export const notifyExpiringCustomers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const from = now + 6 * DAY_MS;
    const to = now + 7 * DAY_MS;
    const soon = await ctx.db
      .query("merchants")
      .withIndex("by_expiry", (q) => q.gte("currentExpiryAt", from).lt("currentExpiryAt", to))
      .take(300);

    let notified = 0;
    for (const merchant of soon) {
      if (merchant.subscriptionStatus !== "SUBSCRIBED" || !merchant.ownerL1Id) continue;
      await notify(
        ctx,
        merchant.ownerL1Id,
        "CUSTOMER_EXPIRING",
        "Akan berakhir 7 hari lagi",
        merchant.storeName ?? merchant.sellMoreStoreId,
        "/l1/pelanggan",
      );
      notified++;
    }
    return { notified };
  },
});

/** §14.2 — the 36-month ownership window closes; recurring drops to zero. */
export const notifyWindowEnded = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    const now = Date.now();
    const merchants = await ctx.db.query("merchants").take(1000);

    let notified = 0;
    for (const merchant of merchants) {
      if (!merchant.ownerL1Id) continue;
      const windowEnd = addMonths(merchant.firstPaymentAt, settings.ownershipWindowMonths);
      if (windowEnd <= now && windowEnd > now - DAY_MS) {
        await notify(
          ctx,
          merchant.ownerL1Id,
          "WINDOW_ENDED",
          "Masa komisi berakhir",
          merchant.storeName ?? merchant.sellMoreStoreId,
          "/l1/pelanggan",
        );
        notified++;
      }
    }
    return { notified };
  },
});
