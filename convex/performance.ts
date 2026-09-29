import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";
import { fail, requireL1, requireL2 } from "./lib/authz";
import { l1Target } from "./lib/commission";
import { DAY_MS, periodEnd, periodOf, periodStart, shiftPeriod, tenureMonthAt } from "./lib/period";
import { SchemeSettings as Settings, getSettings } from "./lib/settings";

// Sales performance of one L1: what an L2 coaches on, and what an L1 chases.

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);
const TREND_MONTHS = 6;

async function grossFor(ctx: QueryCtx, l1Id: Id<"users">, period: string) {
  const lines = await ctx.db
    .query("earningLines")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", period))
    .collect();
  return lines
    .filter(
      (l) => l.status === "CONFIRMED" && GROSS_TYPES.has(l.type) && !l.frozen && !l.settledToCompany,
    )
    .reduce((sum, l) => sum + l.amount, 0);
}

async function lastActivationAt(ctx: QueryCtx, l1Id: Id<"users">, period: string) {
  // Look back up to a year; older than that reads the same as "never".
  for (let i = 0; i < 12; i++) {
    const rows = await ctx.db
      .query("acquisitions")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", shiftPeriod(period, -i)))
      .collect();
    if (rows.length) return Math.max(...rows.map((r) => r.date));
  }
  return null;
}

/** Links still open to the buyer, split by whether they ever opened them. */
function openLinks(links: Doc<"paymentLinks">[], now: number) {
  return links.filter((l) => l.status === "SHARED" && l.expiresAt > now);
}

/** One-row snapshot for the team list. */
async function snapshot(ctx: QueryCtx, l1: Doc<"users">, now: number, settings: Settings) {
  const period = periodOf(now);
  const tenureMonth = tenureMonthAt(l1.firstPaymentAt, now);
  const acquisitions = await ctx.db
    .query("acquisitions")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
    .collect();
  const last = await lastActivationAt(ctx, l1._id, period);
  const state = await ctx.db
    .query("l1States")
    .withIndex("by_l1", (q) => q.eq("l1Id", l1._id))
    .unique();
  return {
    tenureMonth,
    activations: acquisitions.length,
    target: l1Target(tenureMonth, settings),
    warmThreshold: settings.warmth.warmThreshold,
    gross: await grossFor(ctx, l1._id, period),
    daysSinceLastSale: last === null ? null : Math.floor((now - last) / DAY_MS),
    coldStreak: state?.consecutiveSub5Months ?? 0,
    heldBalance: state?.heldBalance ?? 0,
  };
}

async function detail(ctx: QueryCtx, l1: Doc<"users">, now: number, settings: Settings) {
  const period = periodOf(now);
  const base = await snapshot(ctx, l1, now, settings);

  const links = await ctx.db
    .query("paymentLinks")
    .withIndex("by_l1_created", (q) =>
      q.eq("l1Id", l1._id).gte("createdAt", periodStart(period)).lt("createdAt", periodEnd(period)),
    )
    .collect();
  const open = openLinks(links, now);

  const merchants = await ctx.db
    .query("merchants")
    .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1._id))
    .collect();
  const subscribed = merchants.filter((m) => m.subscriptionStatus === "SUBSCRIBED");

  const trend = [];
  for (let i = TREND_MONTHS - 1; i >= 1; i--) {
    const p = shiftPeriod(period, -i);
    const s = await ctx.db
      .query("monthlyL1Summaries")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", p))
      .unique();
    trend.push({
      period: p,
      activations: s?.activationCount ?? 0,
      gross: s?.gross ?? 0,
      warmth: s?.warmthState ?? null,
    });
  }
  trend.push({ period, activations: base.activations, gross: base.gross, warmth: null });

  return {
    ...base,
    name: l1.name ?? "",
    period,
    daysLeft: Math.ceil((periodEnd(period) - now) / DAY_MS),
    funnel: {
      created: links.length,
      opened: links.filter((l) => (l.viewCount ?? 0) > 0).length,
      paid: links.filter((l) => l.status === "PAID").length,
    },
    pendingLinks: {
      unopened: open.filter((l) => !l.viewCount).length,
      openedUnpaid: open.filter((l) => (l.viewCount ?? 0) > 0).length,
    },
    customers: {
      active: subscribed.length,
      expiring30: subscribed.filter(
        (m) => m.currentExpiryAt !== undefined && m.currentExpiryAt - now <= 30 * DAY_MS,
      ).length,
      churned: merchants.filter((m) => m.subscriptionStatus === "CHURNED").length,
      lifetime: merchants.filter((m) => m.subscriptionStatus === "LIFETIME").length,
    },
    trend,
  };
}

async function teamOf(ctx: QueryCtx, l2Id: Id<"users">) {
  return await ctx.db
    .query("users")
    .withIndex("by_l2", (q) => q.eq("assignedL2Id", l2Id))
    .collect();
}

/** L2 — team totals plus one row per L1. */
export const team = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const settings = await getSettings(ctx);
    const members = await Promise.all(
      (await teamOf(ctx, l2._id)).map(async (l1) => ({
        id: l1._id,
        name: l1.name ?? "",
        ...(await snapshot(ctx, l1, args.now, settings)),
      })),
    );
    const period = periodOf(args.now);
    return {
      daysLeft: Math.ceil((periodEnd(period) - args.now) / DAY_MS),
      totals: {
        activations: members.reduce((s, m) => s + m.activations, 0),
        gross: members.reduce((s, m) => s + m.gross, 0),
        idle: members.filter((m) => m.daysSinceLastSale === null || m.daysSinceLastSale >= 7).length,
        atRisk: members.filter((m) => m.activations < m.warmThreshold && m.coldStreak >= 1).length,
      },
      members: members.sort((a, b) => b.activations - a.activations || b.gross - a.gross),
    };
  },
});

/** L2 — drill-down into one L1 of their own team. */
export const member = query({
  args: { l1Id: v.id("users"), now: v.number() },
  handler: async (ctx, args) => {
    const l2 = await requireL2(ctx);
    const l1 = await ctx.db.get("users", args.l1Id);
    if (!l1 || l1.assignedL2Id !== l2._id) fail("FORBIDDEN", "Bukan tim Anda.");
    return await detail(ctx, l1, args.now, await getSettings(ctx));
  },
});

/** L1 — who to chase today. */
export const followUps = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const links = await ctx.db
      .query("paymentLinks")
      .withIndex("by_l1_created", (q) =>
        q.eq("l1Id", l1._id).gte("createdAt", args.now - 30 * DAY_MS),
      )
      .order("desc")
      .take(100);
    const open = await Promise.all(
      openLinks(links, args.now).map(async (l) => ({
        id: l._id,
        planName: (await ctx.db.get("productPlans", l.planId))?.name ?? "—",
        amount: l.amount,
        createdAt: l.createdAt,
        expiresAt: l.expiresAt,
        viewCount: l.viewCount ?? 0,
        lastViewedAt: l.lastViewedAt ?? null,
      })),
    );

    const merchants = await ctx.db
      .query("merchants")
      .withIndex("by_owner", (q) => q.eq("ownerL1Id", l1._id))
      .collect();
    const shape = (m: Doc<"merchants">) => ({
      id: m._id,
      storeName: m.storeName ?? m.sellMoreStoreId,
      expiryAt: m.currentExpiryAt ?? null,
    });
    const byExpiry = (a: { expiryAt: number | null }, b: { expiryAt: number | null }) =>
      (a.expiryAt ?? 0) - (b.expiryAt ?? 0);

    return {
      links: open,
      expiring: merchants
        .filter(
          (m) =>
            m.subscriptionStatus === "SUBSCRIBED" &&
            m.currentExpiryAt !== undefined &&
            m.currentExpiryAt - args.now <= 30 * DAY_MS,
        )
        .map(shape)
        .sort(byExpiry),
      churned: merchants
        .filter((m) => m.subscriptionStatus === "CHURNED")
        .map(shape)
        .sort((a, b) => byExpiry(b, a))
        .slice(0, 20),
    };
  },
});
