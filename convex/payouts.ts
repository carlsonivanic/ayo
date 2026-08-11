import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { fail, requireActive, requireAdmin } from "./lib/authz";
import { notify } from "./lib/notify";
import {
  DAY_MS,
  nextWeekday,
  periodEnd,
  periodOf,
  periodStart,
  shiftPeriod,
  weekPeriod,
  weekStart,
} from "./lib/period";
import { getSettings } from "./lib/settings";

// §11 / §18 payout engine.
// Payable = Gross + Jaminan - Held + Released held +/- Adjustment (§11.4), and
// only CONFIRMED earnings ever reach a payout (§11.8 / P8).
//
// DI-2 is implemented as pay-as-you-go with a monthly true-up: a weekly run pays
// that week's confirmed gross, and the monthly accruals (jaminan, held, release)
// are consumed exactly once by the first run after the month is closed.

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

async function confirmedGross(
  ctx: MutationCtx,
  l1Id: Id<"users">,
  from: number,
  to: number,
): Promise<number> {
  const lines = await ctx.db
    .query("earningLines")
    .withIndex("by_l1_date", (q) => q.eq("l1Id", l1Id).gte("date", from).lt("date", to))
    .collect();
  return lines
    .filter(
      (l) =>
        l.status === "CONFIRMED" &&
        GROSS_TYPES.has(l.type) &&
        !l.frozen &&
        !l.settledToCompany,
    )
    .reduce((sum, l) => sum + l.amount, 0);
}

/** Monthly accruals that have closed but not yet been paid out. */
async function consumeAccruals(ctx: MutationCtx, l1Id: Id<"users">) {
  const summaries = await ctx.db
    .query("monthlyL1Summaries")
    .withIndex("by_l1_settled", (q) => q.eq("l1Id", l1Id).eq("settled", false))
    .collect();
  let jaminan = 0;
  let held = 0;
  let released = 0;
  for (const s of summaries) {
    jaminan += s.jaminan;
    held += s.heldAmount;
    released += s.releasedAmount;
    await ctx.db.patch("monthlyL1Summaries", s._id, { settled: true });
  }
  const heldRecords = await ctx.db
    .query("heldRecords")
    .withIndex("by_l1_settled", (q) => q.eq("l1Id", l1Id).eq("settled", false))
    .collect();
  for (const r of heldRecords) {
    await ctx.db.patch("heldRecords", r._id, { settled: true });
  }
  return { jaminan, held, released };
}

async function consumeAdjustments(ctx: MutationCtx, userId: Id<"users">) {
  const all = await ctx.db
    .query("adjustments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const rows = all.filter((r) => r.consumedByPayoutId === undefined);
  return {
    total: rows.reduce((sum, r) => sum + r.amount, 0),
    rows,
  };
}

async function profileComplete(ctx: MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("payoutProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return profile?.completed ?? false;
}

async function createPayout(
  ctx: MutationCtx,
  args: {
    user: Doc<"users">;
    role: Doc<"payoutLines">["role"];
    period: string;
    periodStart: number;
    periodEnd: number;
    frequency: Doc<"payoutLines">["frequency"];
    payoutDate: number;
    gross: number;
    jaminan: number;
    held: number;
    releasedHeld: number;
  },
): Promise<boolean> {
  const existing = await ctx.db
    .query("payoutLines")
    .withIndex("by_user_period", (q) =>
      q.eq("userId", args.user._id).eq("period", args.period),
    )
    .unique();
  if (existing) return false;

  const adjustments = await consumeAdjustments(ctx, args.user._id);
  const payable =
    args.gross + args.jaminan - args.held + args.releasedHeld + adjustments.total;

  // §9.4 — nothing happened, so no payout line.
  if (
    args.gross === 0 &&
    args.jaminan === 0 &&
    args.held === 0 &&
    args.releasedHeld === 0 &&
    adjustments.total === 0
  ) {
    return false;
  }

  if (!(await profileComplete(ctx, args.user._id))) {
    await notify(
      ctx,
      args.user._id,
      "PAYOUT_PROFILE_REQUIRED",
      "Lengkapi rekening",
      "Payout tertahan sampai data rekening lengkap.",
      "/profil",
    );
    return false;
  }

  const payoutId = await ctx.db.insert("payoutLines", {
    userId: args.user._id,
    role: args.role,
    period: args.period,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    frequency: args.frequency,
    payoutDate: args.payoutDate,
    gross: args.gross,
    jaminan: args.jaminan,
    held: args.held,
    releasedHeld: args.releasedHeld,
    adjustment: adjustments.total,
    payable,
    status: "SCHEDULED",
  });
  for (const row of adjustments.rows) {
    await ctx.db.patch("adjustments", row._id, { consumedByPayoutId: payoutId });
  }
  await notify(
    ctx,
    args.user._id,
    "PAYOUT_SCHEDULED",
    "Payout dijadwalkan",
    `${args.period} — ${payable}.`,
    args.role === "L2" ? "/l2/payout" : "/l1/payout",
  );
  return true;
}

// --- runs -------------------------------------------------------------------

async function runWeekly(ctx: MutationCtx, at: number) {
  const settings = await getSettings(ctx);
  const start = weekStart(at) - 7 * DAY_MS; // the week that just ended
  const end = start + 7 * DAY_MS;
  const period = weekPeriod(start);
  const payoutDate = nextWeekday(at - DAY_MS, settings.payout.l1WeeklyPayDay);

  const l1s = await ctx.db
    .query("users")
    .withIndex("by_role_status", (q) => q.eq("role", "L1").eq("status", "ACTIVE"))
    .collect();

  let created = 0;
  for (const l1 of l1s) {
    const frequency = l1.payoutFrequency ?? settings.payout.l1DefaultFrequency;
    if (frequency !== "WEEKLY") continue;
    const gross = await confirmedGross(ctx, l1._id, start, end);
    const accruals = await consumeAccruals(ctx, l1._id);
    const ok = await createPayout(ctx, {
      user: l1,
      role: "L1",
      period,
      periodStart: start,
      periodEnd: end,
      frequency: "WEEKLY",
      payoutDate,
      gross,
      jaminan: accruals.jaminan,
      held: accruals.held,
      releasedHeld: accruals.released,
    });
    if (ok) created++;
  }
  return { period, created };
}

async function runMonthlyL1(ctx: MutationCtx, at: number, periodArg?: string) {
  const settings = await getSettings(ctx);
  const period = periodArg ?? shiftPeriod(periodOf(at), -1);
  const start = periodStart(period);
  const end = periodEnd(period);
  const payoutDate = at;

  const l1s = await ctx.db
    .query("users")
    .withIndex("by_role_status", (q) => q.eq("role", "L1").eq("status", "ACTIVE"))
    .collect();

  let created = 0;
  for (const l1 of l1s) {
    const frequency = l1.payoutFrequency ?? settings.payout.l1DefaultFrequency;
    if (frequency !== "MONTHLY") continue;
    const gross = await confirmedGross(ctx, l1._id, start, end);
    const accruals = await consumeAccruals(ctx, l1._id);
    const ok = await createPayout(ctx, {
      user: l1,
      role: "L1",
      period,
      periodStart: start,
      periodEnd: end,
      frequency: "MONTHLY",
      payoutDate,
      gross,
      jaminan: accruals.jaminan,
      held: accruals.held,
      releasedHeld: accruals.released,
    });
    if (ok) created++;
  }
  return { period, created };
}

async function runMonthlyL2(ctx: MutationCtx, at: number, periodArg?: string) {
  const period = periodArg ?? shiftPeriod(periodOf(at), -1);
  const l2s = await ctx.db
    .query("users")
    .withIndex("by_role_status", (q) => q.eq("role", "L2").eq("status", "ACTIVE"))
    .collect();

  let created = 0;
  for (const l2 of l2s) {
    const summary = await ctx.db
      .query("monthlyL2Summaries")
      .withIndex("by_l2_period", (q) => q.eq("l2Id", l2._id).eq("period", period))
      .unique();
    const gross = summary?.totalFee ?? 0;
    const ok = await createPayout(ctx, {
      user: l2,
      role: "L2",
      period,
      periodStart: periodStart(period),
      periodEnd: periodEnd(period),
      frequency: "MONTHLY",
      payoutDate: at,
      gross,
      jaminan: 0,
      held: 0,
      releasedHeld: 0,
    });
    if (ok) {
      created++;
      if (summary) {
        await ctx.db.patch("monthlyL2Summaries", summary._id, { settled: true });
      }
    }
  }
  return { period, created };
}

export const runWeeklyL1Payouts = internalMutation({
  args: {},
  handler: async (ctx) => await runWeekly(ctx, Date.now()),
});

export const runMonthlyL1Payouts = internalMutation({
  args: { period: v.optional(v.string()) },
  handler: async (ctx, args) => await runMonthlyL1(ctx, Date.now(), args.period),
});

export const runL2Payouts = internalMutation({
  args: { period: v.optional(v.string()) },
  handler: async (ctx, args) => await runMonthlyL2(ctx, Date.now(), args.period),
});

/** Admin-triggered run for a specific period (§23). */
export const runPayouts = mutation({
  args: {
    scope: v.union(v.literal("L1_WEEKLY"), v.literal("L1_MONTHLY"), v.literal("L2")),
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const result =
      args.scope === "L1_WEEKLY"
        ? await runWeekly(ctx, now)
        : args.scope === "L1_MONTHLY"
          ? await runMonthlyL1(ctx, now, args.period)
          : await runMonthlyL2(ctx, now, args.period);
    await audit(ctx, {
      adminId: admin._id,
      action: "RUN_PAYOUTS",
      object: args.scope,
      newValue: result,
    });
    return result;
  },
});

export const markPaid = mutation({
  args: { payoutId: v.id("payoutLines"), status: v.union(v.literal("PAID"), v.literal("FAILED")), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const line = await ctx.db.get("payoutLines", args.payoutId);
    if (!line) fail("NOT_FOUND", "Payout tidak ditemukan.");
    if (line.status !== "SCHEDULED") fail("INVALID_STATE", "Payout sudah diproses.");
    await ctx.db.patch("payoutLines", line._id, {
      status: args.status,
      paidAt: args.status === "PAID" ? Date.now() : undefined,
      failedReason: args.status === "FAILED" ? args.reason : undefined,
    });
    await notify(
      ctx,
      line.userId,
      args.status === "PAID" ? "PAYOUT_PAID" : "PAYOUT_FAILED",
      args.status === "PAID" ? "Payout dibayar" : "Payout gagal",
      `${line.period} — ${line.payable}.`,
      line.role === "L2" ? "/l2/payout" : "/l1/payout",
    );
    await audit(ctx, {
      adminId: admin._id,
      action: "MARK_PAYOUT",
      object: `payout:${line._id}`,
      oldValue: "SCHEDULED",
      newValue: args.status,
      reason: args.reason,
    });
    return null;
  },
});

// --- reads ------------------------------------------------------------------

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActive(ctx);
    const lines = await ctx.db
      .query("payoutLines")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(24);
    const state = await ctx.db
      .query("l1States")
      .withIndex("by_l1", (q) => q.eq("l1Id", user._id))
      .unique();
    const profile = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return {
      heldBalance: state?.heldBalance ?? 0,
      profileCompleted: profile?.completed ?? false,
      lines: lines.map((l) => ({
        id: l._id,
        period: l.period,
        frequency: l.frequency,
        payoutDate: l.payoutDate,
        gross: l.gross,
        jaminan: l.jaminan,
        held: l.held,
        releasedHeld: l.releasedHeld,
        adjustment: l.adjustment,
        payable: l.payable,
        status: l.status,
      })),
    };
  },
});

export const adminList = query({
  args: {
    role: v.optional(v.union(v.literal("L1"), v.literal("L2"))),
    status: v.optional(
      v.union(v.literal("SCHEDULED"), v.literal("PAID"), v.literal("FAILED")),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lines = args.role
      ? await ctx.db
          .query("payoutLines")
          .withIndex("by_role_status", (q) =>
            args.status
              ? q.eq("role", args.role!).eq("status", args.status)
              : q.eq("role", args.role!),
          )
          .order("desc")
          .take(300)
      : await ctx.db.query("payoutLines").order("desc").take(300);

    const filtered = args.role
      ? lines
      : lines.filter((l) => !args.status || l.status === args.status);

    return Promise.all(
      filtered.map(async (l) => {
        const user = await ctx.db.get("users", l.userId);
        const profile = await ctx.db
          .query("payoutProfiles")
          .withIndex("by_user", (q) => q.eq("userId", l.userId))
          .unique();
        return {
          id: l._id,
          userName: user?.name ?? "",
          role: l.role,
          period: l.period,
          frequency: l.frequency,
          payoutDate: l.payoutDate,
          gross: l.gross,
          jaminan: l.jaminan,
          held: l.held,
          releasedHeld: l.releasedHeld,
          adjustment: l.adjustment,
          payable: l.payable,
          status: l.status,
          bank: profile ? `${profile.bankName} ${profile.accountNumber}` : null,
          accountName: profile?.accountName ?? null,
        };
      }),
    );
  },
});
