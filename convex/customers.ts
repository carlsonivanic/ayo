import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";
import { fail, requireAdmin, requireL1, requireL2 } from "./lib/authz";
import { yearBucket } from "./lib/commission";
import { DAY_MS, addMonths, monthsBetween } from "./lib/period";
import { getSettings } from "./lib/settings";

// §38 My Customers. The L1 sees only their own merchants, the L2 sees aggregates
// per L1 with read-only drill-down, the admin sees everything.

async function ownedBy(ctx: QueryCtx, l1Id: Id<"users">) {
  return await ctx.db
    .query("merchants")
    .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1Id))
    .collect();
}

async function earnedFrom(ctx: QueryCtx, merchantId: Id<"merchants">, l1Id: Id<"users">) {
  const history = await ctx.db
    .query("merchantEarningHistory")
    .withIndex("by_merchant", (q) => q.eq("merchantId", merchantId))
    .collect();
  return {
    history,
    total: history
      .filter((h) => h.recipientL1Id === l1Id)
      .reduce((sum, h) => sum + h.amount, 0),
  };
}

function tenurePosition(merchant: Doc<"merchants">, now: number, windowMonths: number) {
  const elapsed = monthsBetween(merchant.firstPaymentAt, now);
  return {
    monthsElapsed: elapsed,
    monthsRemaining: Math.max(0, windowMonths - elapsed),
    yLabel: yearBucket(merchant.firstPaymentAt, now, windowMonths),
  };
}

export const summary = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const merchants = await ownedBy(ctx, l1._id);
    return {
      active: merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED").length,
      expiringSoon: merchants.filter(
        (m) =>
          m.subscriptionStatus === "SUBSCRIBED" &&
          m.currentExpiryAt !== undefined &&
          m.currentExpiryAt - args.now <= 7 * DAY_MS,
      ).length,
      churned: merchants.filter((m) => m.subscriptionStatus === "CHURNED").length,
      lifetime: merchants.filter((m) => m.subscriptionStatus === "LIFETIME").length,
    };
  },
});

export const list = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const settings = await getSettings(ctx);
    const merchants = await ownedBy(ctx, l1._id);

    const rows = await Promise.all(
      merchants.map(async (m) => {
        const plan = m.currentPlanId ? await ctx.db.get("productPlans", m.currentPlanId) : null;
        const { history, total } = await earnedFrom(ctx, m._id, l1._id);
        const last = history.sort((a, b) => b.date - a.date)[0];
        return {
          id: m._id,
          storeName: m.storeName ?? m.sellMoreStoreId,
          planName: plan?.name ?? "—",
          status: m.subscriptionStatus,
          expiryAt: m.currentExpiryAt ?? null,
          myEarned: total,
          lastRenewalMethod: last?.method ?? null,
          ...tenurePosition(m, args.now, settings.ownershipWindowMonths),
        };
      }),
    );

    // §38.1 — nearest expiry first, so the follow-up list is the default view.
    return rows.sort((a, b) => (a.expiryAt ?? Infinity) - (b.expiryAt ?? Infinity));
  },
});

export const detail = query({
  args: { merchantId: v.id("merchants"), now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const merchant = await ctx.db.get("merchants", args.merchantId);
    if (!merchant || merchant.ownerL1Id !== l1._id) fail("FORBIDDEN", "Bukan pelanggan Anda.");
    const settings = await getSettings(ctx);
    const plan = merchant.currentPlanId
      ? await ctx.db.get("productPlans", merchant.currentPlanId)
      : null;
    const { history } = await earnedFrom(ctx, merchant._id, l1._id);

    const payments = await Promise.all(
      history
        .sort((a, b) => b.date - a.date)
        .map(async (h) => ({
          date: h.date,
          type: h.type,
          method: h.method,
          paymentAmount: h.paymentAmount,
          myCommission: h.recipientL1Id === l1._id ? h.amount : 0,
          yLabel: h.yLabel,
          planName: (await ctx.db.get("productPlans", h.planId))?.name ?? "",
        })),
    );

    return {
      id: merchant._id,
      storeName: merchant.storeName ?? merchant.sellMoreStoreId,
      location: merchant.location ?? null,
      planName: plan?.name ?? "—",
      status: merchant.subscriptionStatus,
      firstPaymentAt: merchant.firstPaymentAt,
      expiryAt: merchant.currentExpiryAt ?? null,
      windowEndsAt: addMonths(merchant.firstPaymentAt, settings.ownershipWindowMonths),
      ...tenurePosition(merchant, args.now, settings.ownershipWindowMonths),
      totalEarned: payments.reduce((sum, p) => sum + p.myCommission, 0),
      payments,
    };
  },
});

/** §38.2 — L2 sees aggregates per L1, read-only. */
export const teamCustomers = query({
  args: {},
  handler: async (ctx) => {
    const l2 = await requireL2(ctx);
    const team = await ctx.db
      .query("users")
      .withIndex("by_l2", (q) => q.eq("assignedL2Id", l2._id))
      .collect();

    return await Promise.all(
      team.map(async (l1) => {
        const merchants = await ownedBy(ctx, l1._id);
        return {
          l1Id: l1._id,
          l1Name: l1.name ?? "",
          total: merchants.length,
          active: merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED").length,
          churned: merchants.filter((m) => m.subscriptionStatus === "CHURNED").length,
          lifetime: merchants.filter((m) => m.subscriptionStatus === "LIFETIME").length,
        };
      }),
    );
  },
});

export const teamCustomerDetail = query({
  args: { l1Id: v.id("users"), now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const l1 = await ctx.db.get("users", args.l1Id);
    if (!l1 || l1.assignedL2Id !== l2._id) fail("FORBIDDEN", "Bukan tim Anda.");
    const settings = await getSettings(ctx);
    const merchants = await ownedBy(ctx, l1._id);
    return await Promise.all(
      merchants.map(async (m) => {
        const plan = m.currentPlanId ? await ctx.db.get("productPlans", m.currentPlanId) : null;
        return {
          id: m._id,
          storeName: m.storeName ?? m.sellMoreStoreId,
          planName: plan?.name ?? "—",
          status: m.subscriptionStatus,
          expiryAt: m.currentExpiryAt ?? null,
          ...tenurePosition(m, args.now, settings.ownershipWindowMonths),
        };
      }),
    );
  },
});

/** §38.3 — admin view with ownership context and frozen-commission flags. */
export const adminMerchants = query({
  args: { now: v.number(), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    const merchants = await ctx.db.query("merchants").take(500);
    const term = args.search?.trim().toLowerCase();

    const rows = await Promise.all(
      merchants.map(async (m) => {
        const owner = m.ownerL1Id ? await ctx.db.get("users", m.ownerL1Id) : null;
        const plan = m.currentPlanId ? await ctx.db.get("productPlans", m.currentPlanId) : null;
        const lines = await ctx.db
          .query("earningLines")
          .withIndex("by_merchant", (q) => q.eq("merchantId", m._id))
          .collect();
        return {
          id: m._id,
          storeName: m.storeName ?? m.sellMoreStoreId,
          storeId: m.sellMoreStoreId,
          ownerName: owner?.name ?? null,
          ownerId: owner?._id ?? null,
          ownerSuspended: owner?.status === "SUSPENDED",
          planName: plan?.name ?? "—",
          status: m.subscriptionStatus,
          firstPaymentAt: m.firstPaymentAt,
          expiryAt: m.currentExpiryAt ?? null,
          frozenAmount: lines
            .filter((l) => l.frozen && !l.settledToCompany)
            .reduce((sum, l) => sum + l.amount, 0),
          totalOwnerEarning: lines
            .filter((l) => !l.settledToCompany)
            .reduce((sum, l) => sum + l.amount, 0),
          ...tenurePosition(m, args.now, settings.ownershipWindowMonths),
        };
      }),
    );

    return term
      ? rows.filter(
          (r) =>
            r.storeName.toLowerCase().includes(term) ||
            r.storeId.toLowerCase().includes(term) ||
            (r.ownerName ?? "").toLowerCase().includes(term),
        )
      : rows;
  },
});
