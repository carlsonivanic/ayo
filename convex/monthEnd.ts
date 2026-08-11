import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation, mutation } from "./_generated/server";
import { audit } from "./lib/audit";
import { requireAdmin } from "./lib/authz";
import { jaminanFor, l2EffectivePercent, l2StageFor, warmthFor } from "./lib/commission";
import { ensureL1State, insertEarning } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { notify } from "./lib/notify";
import { periodOf, periodStart, shiftPeriod, tenureMonthAt } from "./lib/period";
import { getSettings } from "./lib/settings";

// §8 month-end close. Runs on the 8th for the previous month, by which time every
// code from that month is either USED or EXPIRED, so nothing is still PENDING.
// One idempotent job per L1 keeps each transaction small (§8.2).

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

export const closePreviousMonth = internalMutation({
  args: { period: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const period = args.period ?? shiftPeriod(periodOf(Date.now()), -1);
    const l1s = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "L1"))
      .collect();
    for (const l1 of l1s) {
      if (!l1.firstPaymentAt) continue;
      await ctx.scheduler.runAfter(0, internal.monthEnd.processL1Month, {
        l1Id: l1._id,
        period,
      });
    }
    return { period, scheduled: l1s.length };
  },
});

export const processL1Month = internalMutation({
  args: { l1Id: v.id("users"), period: v.string() },
  handler: async (ctx, args) => {
    await closeL1Month(ctx, args.l1Id, args.period);
    return null;
  },
});

export async function closeL1Month(
  ctx: MutationCtx,
  l1Id: Id<"users">,
  period: string,
): Promise<void> {
  const existing = await ctx.db
    .query("monthlyL1Summaries")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", period))
    .unique();
  if (existing) return; // §8.2 idempotent

  const l1 = await ctx.db.get("users", l1Id);
  if (!l1 || !l1.firstPaymentAt) return;

  const settings = await getSettings(ctx);
  const atPeriod = periodStart(period);
  const tenureMonth = tenureMonthAt(l1.firstPaymentAt, atPeriod);
  if (tenureMonth < 1) return; // period predates the agent's first payment

  const lines = await ctx.db
    .query("earningLines")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", period))
    .collect();

  // §8.3 — gross is CONFIRMED only; frozen owner commission is a liability, not
  // income, until an admin resolves it (§14.6).
  const gross = lines
    .filter(
      (l) =>
        l.status === "CONFIRMED" &&
        GROSS_TYPES.has(l.type) &&
        !l.frozen &&
        !l.settledToCompany,
    )
    .reduce((sum, l) => sum + l.amount, 0);

  const acquisitions = await ctx.db
    .query("acquisitions")
    .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id).eq("period", period))
    .collect();
  const activationCount = acquisitions.length;

  // §7 guarantee — separate from gross, added to total income.
  const jaminan = jaminanFor(tenureMonth, activationCount, gross, settings);
  if (jaminan > 0) {
    await insertEarning(ctx, {
      l1Id,
      date: atPeriod,
      type: "JAMINAN",
      amount: jaminan,
      status: "CONFIRMED",
      note: period,
    });
    await notify(
      ctx,
      l1Id,
      "JAMINAN_ACHIEVED",
      "Jaminan tercapai",
      `${period} — top-up ${jaminan}.`,
      "/l1/penghasilan",
    );
  }

  const state = await ensureL1State(ctx, l1Id);
  const warmth = warmthFor(
    tenureMonth,
    activationCount,
    state.consecutiveSub5Months,
    settings,
  );
  const heldAmount = pctOf(gross, warmth.heldPercent);
  const releasedAmount = warmth.releasesHeld ? state.heldBalance : 0;

  if (heldAmount > 0 || releasedAmount > 0) {
    await ctx.db.insert("heldRecords", {
      l1Id,
      period,
      gross,
      heldPercent: warmth.heldPercent,
      heldAmount,
      releasedAmount,
      releasedAt: releasedAmount > 0 ? Date.now() : undefined,
      status: releasedAmount > 0 && heldAmount === 0 ? "RELEASED" : "HELD",
      settled: false,
    });
  }
  if (releasedAmount > 0) {
    await notify(
      ctx,
      l1Id,
      "HELD_RELEASED",
      "Held money dirilis",
      `${releasedAmount} masuk payout berikutnya.`,
      "/l1/payout",
    );
  }

  await ctx.db.patch("l1States", state._id, {
    consecutiveSub5Months: warmth.consecutiveSub5Months,
    heldBalance: state.heldBalance - releasedAmount + heldAmount,
    lastWarmthState: warmth.state,
  });

  // §16 L2 override on this L1's realized income.
  let l2FeeBase = 0;
  if (l1.assignedL2Id && tenureMonth >= settings.l2.startMonth) {
    l2FeeBase = settings.l2.includeJaminan ? gross + jaminan : gross;
    const effectivePercent = l2EffectivePercent(tenureMonth, settings);
    const l2Fee = pctOf(l2FeeBase, effectivePercent);
    if (l2Fee > 0) {
      await ctx.db.insert("l2EarningLines", {
        l2Id: l1.assignedL2Id,
        l1Id,
        period,
        l1TenureMonth: tenureMonth,
        stage: l2StageFor(tenureMonth, settings),
        l1Gross: l2FeeBase,
        effectiveFeePercent: effectivePercent,
        l2Fee,
      });
      const summary = await ctx.db
        .query("monthlyL2Summaries")
        .withIndex("by_l2_period", (q) =>
          q.eq("l2Id", l1.assignedL2Id!).eq("period", period),
        )
        .unique();
      if (summary) {
        await ctx.db.patch("monthlyL2Summaries", summary._id, {
          totalFee: summary.totalFee + l2Fee,
        });
      } else {
        await ctx.db.insert("monthlyL2Summaries", {
          l2Id: l1.assignedL2Id,
          period,
          totalFee: l2Fee,
          settled: false,
        });
      }
    }
  }

  await ctx.db.insert("monthlyL1Summaries", {
    l1Id,
    period,
    tenureMonth,
    activationCount,
    gross,
    jaminan,
    warmthState: warmth.state,
    heldPercent: warmth.heldPercent,
    heldAmount,
    releasedAmount,
    l2FeeBase,
    settled: false,
    closedAt: Date.now(),
  });
}

/** Admin-triggered close, for catching up a period or re-running after a fix. */
export const runMonthEnd = mutation({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const l1s = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "L1"))
      .collect();
    let processed = 0;
    for (const l1 of l1s) {
      if (!l1.firstPaymentAt) continue;
      await closeL1Month(ctx, l1._id, args.period);
      processed++;
    }
    await audit(ctx, {
      adminId: admin._id,
      action: "RUN_MONTH_END",
      object: `period:${args.period}`,
      newValue: { processed },
    });
    return { processed };
  },
});
