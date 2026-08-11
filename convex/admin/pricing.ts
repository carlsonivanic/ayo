import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { notifyAdmins } from "../lib/notify";

// §20 pricing. Commission stays percentage-based, so a price change carries the
// commission with it (§20.3). Price changes are scheduled, never immediate.

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const plans = await ctx.db.query("productPlans").collect();
    const scheduled = await ctx.db
      .query("scheduledPriceChanges")
      .withIndex("by_status_effective", (q) => q.eq("status", "SCHEDULED"))
      .collect();
    return plans
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => {
        const change = scheduled.find((s) => s.planId === p._id);
        return {
          id: p._id,
          key: p.key,
          name: p.name,
          price: p.price,
          renewalPrice: p.renewalPrice ?? null,
          priceUnit: p.priceUnit,
          category: p.category,
          commissionType: p.commissionType,
          y1Percent: p.y1Percent,
          y2Percent: p.y2Percent,
          y3Percent: p.y3Percent,
          y4PlusPercent: p.y4PlusPercent,
          oneTimePercent: p.oneTimePercent,
          seatCount: p.seatCount,
          active: p.active,
          scheduled: change
            ? {
                id: change._id,
                newPrice: change.newPrice,
                effectiveDate: change.effectiveDate,
                applyMode: change.applyMode,
              }
            : null,
        };
      });
  },
});

export const schedulePriceChange = mutation({
  args: {
    planId: v.id("productPlans"),
    newPrice: v.number(),
    effectiveDate: v.number(),
    applyMode: v.union(v.literal("NEW_SALES_ONLY"), v.literal("ALL_USERS")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const plan = await ctx.db.get("productPlans", args.planId);
    if (!plan) fail("NOT_FOUND", "Paket tidak ditemukan.");
    if (args.newPrice <= 0) fail("INVALID_PRICE", "Harga harus lebih dari 0.");
    if (args.effectiveDate <= Date.now()) {
      fail("INVALID_DATE", "Tanggal berlaku harus di masa depan.");
    }

    // One pending change per plan (§11.1) — a new one supersedes the old.
    const existing = await ctx.db
      .query("scheduledPriceChanges")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();
    for (const row of existing) {
      if (row.status === "SCHEDULED") {
        await ctx.db.patch("scheduledPriceChanges", row._id, { status: "SUPERSEDED" });
      }
    }

    const id = await ctx.db.insert("scheduledPriceChanges", {
      planId: plan._id,
      oldPrice: plan.price,
      newPrice: args.newPrice,
      effectiveDate: args.effectiveDate,
      applyMode: args.applyMode,
      status: "SCHEDULED",
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "SCHEDULE_PRICE_CHANGE",
      object: `plan:${plan._id}`,
      oldValue: plan.price,
      newValue: {
        price: args.newPrice,
        effectiveDate: args.effectiveDate,
        applyMode: args.applyMode,
      },
    });
    await notifyAdmins(
      ctx,
      "PRICING_SCHEDULED",
      "Perubahan harga dijadwalkan",
      `${plan.name} → ${args.newPrice}`,
      "/admin/harga",
    );
    return { id };
  },
});

export const cancelPriceChange = mutation({
  args: { changeId: v.id("scheduledPriceChanges") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const change = await ctx.db.get("scheduledPriceChanges", args.changeId);
    if (!change || change.status !== "SCHEDULED") fail("NOT_FOUND", "Jadwal tidak ditemukan.");
    await ctx.db.patch("scheduledPriceChanges", change._id, { status: "SUPERSEDED" });
    await audit(ctx, {
      adminId: admin._id,
      action: "CANCEL_PRICE_CHANGE",
      object: `plan:${change.planId}`,
      oldValue: change.newPrice,
      newValue: "cancelled",
    });
    return null;
  },
});

/** §20.3 — commission percentages are configurable per plan. */
export const updateCommission = mutation({
  args: {
    planId: v.id("productPlans"),
    y1Percent: v.optional(v.number()),
    y2Percent: v.optional(v.number()),
    y3Percent: v.optional(v.number()),
    y4PlusPercent: v.optional(v.number()),
    oneTimePercent: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const { planId, ...rest } = args;
    const plan = await ctx.db.get("productPlans", planId);
    if (!plan) fail("NOT_FOUND", "Paket tidak ditemukan.");
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) return null;
    await ctx.db.patch("productPlans", plan._id, patch);
    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_PLAN_COMMISSION",
      object: `plan:${plan._id}`,
      oldValue: {
        y1: plan.y1Percent,
        y2: plan.y2Percent,
        y3: plan.y3Percent,
        y4: plan.y4PlusPercent,
        oneTime: plan.oneTimePercent,
        active: plan.active,
      },
      newValue: patch,
    });
    return null;
  },
});

/** §11.2 daily cron. */
export const applyScheduledPriceChanges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("scheduledPriceChanges")
      .withIndex("by_status_effective", (q) =>
        q.eq("status", "SCHEDULED").lte("effectiveDate", now),
      )
      .take(50);

    for (const change of due) {
      const plan = await ctx.db.get("productPlans", change.planId);
      if (!plan) continue;
      await ctx.db.patch("productPlans", plan._id, {
        price: change.newPrice,
        // NEW_SALES_ONLY keeps the pre-change price for renewals (Edge 13).
        renewalPrice:
          change.applyMode === "NEW_SALES_ONLY" ? change.oldPrice : undefined,
      });
      await ctx.db.patch("scheduledPriceChanges", change._id, { status: "APPLIED" });
      await notifyAdmins(
        ctx,
        "PRICING_APPLIED",
        "Harga diperbarui",
        `${plan.name} sekarang ${change.newPrice}.`,
        "/admin/harga",
      );
    }
    return null;
  },
});
