import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { findOverride } from "../lib/overrides";
import { getSettings } from "../lib/settings";

// Per-agent commission agreements. Changes apply to lines booked from now on;
// nothing already in the ledger is recalculated.

const percent = v.optional(v.number());

const planRates = v.object({
  planId: v.id("productPlans"),
  y1Percent: percent,
  y2Percent: percent,
  y3Percent: percent,
  y4PlusPercent: percent,
  oneTimePercent: percent,
});

const l2Rates = v.object({
  basePercent: percent,
  decayM7_18: percent,
  decayM19_30: percent,
  decayM31_42: percent,
});

/** The agent's override next to the global values it replaces. */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const settings = await getSettings(ctx);
    const override = await findOverride(ctx, args.userId);
    const plans = await ctx.db.query("productPlans").collect();
    return {
      override: override
        ? {
            active: override.active,
            plans: override.plans,
            renewalIncentivePercent: override.renewalIncentivePercent ?? null,
            l2: override.l2 ?? null,
            note: override.note ?? "",
            updatedAt: override.updatedAt,
          }
        : null,
      global: {
        plans: plans
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((p) => ({
            id: p._id,
            name: p.name,
            commissionType: p.commissionType,
            y1Percent: p.y1Percent,
            y2Percent: p.y2Percent,
            y3Percent: p.y3Percent,
            y4PlusPercent: p.y4PlusPercent,
            oneTimePercent: p.oneTimePercent,
          })),
        renewalIncentivePercent: settings.renewalIncentivePercent,
        l2: {
          basePercent: settings.l2.basePercent,
          decayM7_18: settings.l2.decayM7_18,
          decayM19_30: settings.l2.decayM19_30,
          decayM31_42: settings.l2.decayM31_42,
        },
      },
    };
  },
});

export const save = mutation({
  args: {
    userId: v.id("users"),
    active: v.boolean(),
    plans: v.array(planRates),
    renewalIncentivePercent: percent,
    l2: v.optional(l2Rates),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user || (user.role !== "L1" && user.role !== "L2")) {
      fail("NOT_FOUND", "Agen tidak ditemukan.");
    }

    const values = [
      args.renewalIncentivePercent,
      ...args.plans.flatMap((p) => [
        p.y1Percent,
        p.y2Percent,
        p.y3Percent,
        p.y4PlusPercent,
        p.oneTimePercent,
      ]),
      ...(args.l2 ? Object.values(args.l2) : []),
    ];
    if (values.some((n) => n !== undefined && (!Number.isFinite(n) || n < 0 || n > 100))) {
      fail("INVALID_RANGE", "Persentase harus 0–100.");
    }

    // Rows with no rate set carry nothing; keep the document to what differs.
    const plans = args.plans.filter((p) =>
      [p.y1Percent, p.y2Percent, p.y3Percent, p.y4PlusPercent, p.oneTimePercent].some(
        (n) => n !== undefined,
      ),
    );
    const l2 =
      args.l2 && Object.values(args.l2).some((n) => n !== undefined) ? args.l2 : undefined;
    const note = args.note?.trim() || undefined;

    const next = {
      active: args.active,
      plans,
      renewalIncentivePercent: args.renewalIncentivePercent,
      l2,
      note,
      updatedAt: Date.now(),
      updatedBy: admin._id,
    };

    const existing = await findOverride(ctx, args.userId);
    if (existing) {
      await ctx.db.patch("commissionOverrides", existing._id, next);
    } else {
      await ctx.db.insert("commissionOverrides", { userId: args.userId, ...next });
    }

    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_COMMISSION_OVERRIDE",
      object: `user:${args.userId}`,
      oldValue: existing
        ? {
            active: existing.active,
            plans: existing.plans,
            renewalIncentivePercent: existing.renewalIncentivePercent,
            l2: existing.l2,
            note: existing.note,
          }
        : undefined,
      newValue: { active: args.active, plans, renewalIncentivePercent: args.renewalIncentivePercent, l2, note },
    });
    return null;
  },
});
