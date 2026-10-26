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

type CustomerStatus = "AKTIF" | "SEGERA" | "KEDALUWARSA" | "LIFETIME";
type PaymentState = "TERVERIFIKASI" | "MENUNGGU";

/** Seven days is the same threshold the summary cards have always used. */
function customerStatus(merchant: Doc<"merchants">, now: number): CustomerStatus {
  if (merchant.subscriptionStatus === "LIFETIME") return "LIFETIME";
  if (merchant.subscriptionStatus !== "SUBSCRIBED") return "KEDALUWARSA";
  const expiry = merchant.currentExpiryAt;
  if (expiry !== undefined) {
    if (expiry < now) return "KEDALUWARSA";
    if (expiry - now <= 7 * DAY_MS) return "SEGERA";
  }
  return "AKTIF";
}

/** The latest ledger line decides whether the money is verified or waiting. */
async function paymentState(
  ctx: QueryCtx,
  merchantId: Id<"merchants">,
): Promise<PaymentState> {
  const lines = await ctx.db
    .query("earningLines")
    .withIndex("by_merchant", (q) => q.eq("merchantId", merchantId))
    .collect();
  const latest = lines.sort((a, b) => b.date - a.date)[0];
  if (!latest) return "MENUNGGU";
  const verified =
    latest.status === "CONFIRMED" && !latest.frozen && !latest.settledToCompany;
  return verified ? "TERVERIFIKASI" : "MENUNGGU";
}

type Contact = { name?: string; phone?: string; at: number };

/**
 * Buyer identity captured at sell time lives on the link, not the merchant —
 * a merchant row only exists after redemption. Keep the newest contact per
 * merchant so a renamed buyer shows the name the agent last used.
 */
async function contactsFor(
  ctx: QueryCtx,
  l1Id: Id<"users">,
): Promise<Map<Id<"merchants">, Contact>> {
  const links = await ctx.db
    .query("paymentLinks")
    .withIndex("by_l1", (q) => q.eq("l1Id", l1Id))
    .order("desc")
    .take(500);
  const map = new Map<Id<"merchants">, Contact>();
  for (const link of links) {
    if (!link.buyerMerchantId) continue;
    if (!link.customerName && !link.customerPhone) continue;
    const at = link.paidAt ?? link.createdAt;
    const previous = map.get(link.buyerMerchantId);
    if (!previous || at > previous.at) {
      map.set(link.buyerMerchantId, {
        name: link.customerName ?? previous?.name,
        phone: link.customerPhone ?? previous?.phone,
        at,
      });
    }
  }
  return map;
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

/**
 * §38 table view: real customers plus the links an L1 has named but not yet
 * sold ("calon"). One row shape so the table can sort all five columns without
 * knowing which source a row came from.
 */
export const table = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const merchants = await ownedBy(ctx, l1._id);
    const planNames = new Map<string, string>();
    for (const plan of await ctx.db.query("productPlans").collect()) {
      planNames.set(plan._id, plan.name);
    }
    const contacts = await contactsFor(ctx, l1._id);

    const customers = await Promise.all(
      merchants.map(async (merchant) => {
        const contact = contacts.get(merchant._id);
        const storeName = merchant.storeName ?? merchant.sellMoreStoreId;
        return {
          kind: "customer" as const,
          id: merchant._id as string,
          merchantId: merchant._id,
          token: null,
          name: contact?.name?.trim() || storeName,
          storeName,
          registeredAt: merchant.firstActivatedAt,
          status: customerStatus(merchant, args.now),
          planName: merchant.currentPlanId
            ? (planNames.get(merchant.currentPlanId) ?? "—")
            : "—",
          paymentState: await paymentState(ctx, merchant._id),
          phone: contact?.phone ?? null,
          expiresAt: merchant.currentExpiryAt ?? null,
        };
      }),
    );

    const links = await ctx.db
      .query("paymentLinks")
      .withIndex("by_l1", (q) => q.eq("l1Id", l1._id))
      .order("desc")
      .take(500);
    const leads = links
      .filter(
        (link) =>
          link.status === "SHARED" &&
          link.expiresAt > args.now &&
          !!link.customerName?.trim() &&
          !link.buyerMerchantId,
      )
      .map((link) => ({
        kind: "calon" as const,
        id: link.token as string,
        merchantId: null,
        token: link.token,
        name: link.customerName!.trim(),
        storeName: null,
        registeredAt: link.createdAt,
        status: "CALON" as const,
        planName: planNames.get(link.planId) ?? "—",
        paymentState: "MENUNGGU" as const,
        phone: link.customerPhone ?? null,
        expiresAt: link.expiresAt,
      }));

    return [...customers, ...leads];
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

    // The code that activated each event lives on the ledger, not on the
    // history row, so join by day + type and hand the table the code it needs.
    const ledger = await ctx.db
      .query("earningLines")
      .withIndex("by_merchant", (q) => q.eq("merchantId", merchant._id))
      .collect();
    const codeByKey = new Map<string, string>();
    for (const line of ledger) {
      if (!line.sourceCodeId) continue;
      const code = await ctx.db.get("subscriptionCodes", line.sourceCodeId);
      if (code) codeByKey.set(`${line.date}:${line.type}`, code.code);
    }

    const contacts = await contactsFor(ctx, l1._id);
    const contact = contacts.get(merchant._id);

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
          code: codeByKey.get(`${h.date}:${h.type}`) ?? null,
        })),
    );

    return {
      id: merchant._id,
      storeName: merchant.storeName ?? merchant.sellMoreStoreId,
      customerName: contact?.name?.trim() || null,
      customerPhone: contact?.phone ?? null,
      location: merchant.location ?? null,
      planName: plan?.name ?? "—",
      status: merchant.subscriptionStatus,
      customerStatus: customerStatus(merchant, args.now),
      paymentState: await paymentState(ctx, merchant._id),
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
