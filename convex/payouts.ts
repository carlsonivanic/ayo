import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx, internalMutation, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { fail, requireActive, requireAdmin } from "./lib/authz";
import { notify } from "./lib/notify";
import { findPayoutProfile, isPayoutReady } from "./lib/payoutProfile";
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
// Lines are calculated automatically by the crons, but nothing moves money:
// the admin transfers each payable to the agent's DANA wallet by hand and marks
// the line PAID.
//
// Every commission line remembers the payout that carried it (payoutLineId).
// A run pays every CONFIRMED, unfrozen line earned before the period end that
// no payout has carried yet — so a sale activated or verified after its week's
// run is picked up by the next run instead of being skipped forever.
// Monthly accruals (jaminan, held, release), L2 fees and adjustments are
// likewise consumed exactly once by the first run after they exist.

const GROSS_TYPES = new Set(["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"]);

export function isPayableEarning(l: Doc<"earningLines">): boolean {
  return (
    l.status === "CONFIRMED" &&
    GROSS_TYPES.has(l.type) &&
    !l.frozen &&
    !l.settledToCompany &&
    l.payoutLineId === undefined
  );
}

/** Commission lines not yet carried by any payout (all statuses). */
async function unpaidEarnings(ctx: QueryCtx, l1Id: Id<"users">) {
  return await ctx.db
    .query("earningLines")
    .withIndex("by_l1_payout", (q) => q.eq("l1Id", l1Id).eq("payoutLineId", undefined))
    .collect();
}

/** Monthly accruals that have closed but not yet been paid out. */
async function openAccruals(ctx: QueryCtx, l1Id: Id<"users">) {
  const summaries = await ctx.db
    .query("monthlyL1Summaries")
    .withIndex("by_l1_settled", (q) => q.eq("l1Id", l1Id).eq("settled", false))
    .collect();
  const heldRecords = await ctx.db
    .query("heldRecords")
    .withIndex("by_l1_settled", (q) => q.eq("l1Id", l1Id).eq("settled", false))
    .collect();
  return {
    summaries,
    heldRecords,
    jaminan: summaries.reduce((s, r) => s + r.jaminan, 0),
    held: summaries.reduce((s, r) => s + r.heldAmount, 0),
    released: summaries.reduce((s, r) => s + r.releasedAmount, 0),
  };
}

async function openL2Fees(ctx: QueryCtx, l2Id: Id<"users">) {
  const rows = await ctx.db
    .query("monthlyL2Summaries")
    .withIndex("by_l2_settled", (q) => q.eq("l2Id", l2Id).eq("settled", false))
    .collect();
  return { rows, total: rows.reduce((s, r) => s + r.totalFee, 0) };
}

async function openAdjustments(ctx: QueryCtx, userId: Id<"users">) {
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

/** What a run right now would pay this agent for work before `before`. */
async function owed(ctx: QueryCtx, user: Doc<"users">, before: number) {
  const adjustments = await openAdjustments(ctx, user._id);
  if (user.role === "L2") {
    const fees = await openL2Fees(ctx, user._id);
    return {
      earnings: [] as Doc<"earningLines">[],
      gross: fees.total,
      l2Fees: fees.rows,
      accruals: null,
      jaminan: 0,
      held: 0,
      releasedHeld: 0,
      adjustments,
    };
  }
  const earnings = (await unpaidEarnings(ctx, user._id)).filter(
    (l) => l.date < before && isPayableEarning(l),
  );
  const accruals = await openAccruals(ctx, user._id);
  return {
    earnings,
    gross: earnings.reduce((s, l) => s + l.amount, 0),
    l2Fees: [] as Doc<"monthlyL2Summaries">[],
    accruals,
    jaminan: accruals.jaminan,
    held: accruals.held,
    releasedHeld: accruals.released,
    adjustments,
  };
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
  },
): Promise<boolean> {
  const existing = await ctx.db
    .query("payoutLines")
    .withIndex("by_user_period", (q) =>
      q.eq("userId", args.user._id).eq("period", args.period),
    )
    .unique();
  if (existing) return false;

  const o = await owed(ctx, args.user, args.periodEnd);
  const adjustment = o.adjustments.total;
  // §9.4 — nothing happened, so no payout line.
  if (
    o.gross === 0 &&
    o.jaminan === 0 &&
    o.held === 0 &&
    o.releasedHeld === 0 &&
    adjustment === 0
  ) {
    return false;
  }
  const payable = o.gross + o.jaminan - o.held + o.releasedHeld + adjustment;

  // Created whatever the agent's DANA status — the admin must always see what
  // is owed. It just cannot be marked paid until the number is filled.
  const payoutId = await ctx.db.insert("payoutLines", {
    userId: args.user._id,
    role: args.role,
    period: args.period,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    frequency: args.frequency,
    payoutDate: args.payoutDate,
    gross: o.gross,
    jaminan: o.jaminan,
    held: o.held,
    releasedHeld: o.releasedHeld,
    adjustment,
    payable,
    status: "SCHEDULED",
  });
  for (const l of o.earnings) {
    await ctx.db.patch("earningLines", l._id, { payoutLineId: payoutId });
  }
  for (const r of o.l2Fees) {
    await ctx.db.patch("monthlyL2Summaries", r._id, { settled: true });
  }
  if (o.accruals) {
    for (const r of o.accruals.summaries) {
      await ctx.db.patch("monthlyL1Summaries", r._id, { settled: true });
    }
    for (const r of o.accruals.heldRecords) {
      await ctx.db.patch("heldRecords", r._id, { settled: true });
    }
  }
  for (const row of o.adjustments.rows) {
    await ctx.db.patch("adjustments", row._id, { consumedByPayoutId: payoutId });
  }
  if (!isPayoutReady(await findPayoutProfile(ctx, args.user._id))) {
    await notify(
      ctx,
      args.user._id,
      "PAYOUT_PROFILE_REQUIRED",
      "Lengkapi nomor DANA",
      "Payout tertahan sampai nomor DANA diisi.",
      "/profil",
    );
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
    const ok = await createPayout(ctx, {
      user: l1,
      role: "L1",
      period,
      periodStart: start,
      periodEnd: end,
      frequency: "WEEKLY",
      payoutDate,
    });
    if (ok) created++;
  }
  return { period, created };
}

async function runMonthlyL1(ctx: MutationCtx, at: number, periodArg?: string) {
  const settings = await getSettings(ctx);
  const period = periodArg ?? shiftPeriod(periodOf(at), -1);

  const l1s = await ctx.db
    .query("users")
    .withIndex("by_role_status", (q) => q.eq("role", "L1").eq("status", "ACTIVE"))
    .collect();

  let created = 0;
  for (const l1 of l1s) {
    const frequency = l1.payoutFrequency ?? settings.payout.l1DefaultFrequency;
    if (frequency !== "MONTHLY") continue;
    const ok = await createPayout(ctx, {
      user: l1,
      role: "L1",
      period,
      periodStart: periodStart(period),
      periodEnd: periodEnd(period),
      frequency: "MONTHLY",
      payoutDate: at,
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
    // Pays every closed, unsettled month — month end closes on the 8th, after
    // the 5th's run, so a month's fee lands in the following month's run.
    const ok = await createPayout(ctx, {
      user: l2,
      role: "L2",
      period,
      periodStart: periodStart(period),
      periodEnd: periodEnd(period),
      frequency: "MONTHLY",
      payoutDate: at,
    });
    if (ok) created++;
  }
  return { period, created };
}

/**
 * One-off: link commission lines already covered by payouts created before
 * payoutLineId existed, so the new engine doesn't pay them twice.
 * `npx convex run payouts:backfillPayoutLinks`
 */
export const backfillPayoutLinks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let linked = 0;
    const payouts = await ctx.db.query("payoutLines").collect();
    for (const p of payouts) {
      if (p.role !== "L1") continue;
      const lines = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_date", (q) =>
          q.eq("l1Id", p.userId).gte("date", p.periodStart).lt("date", p.periodEnd),
        )
        .collect();
      for (const l of lines) {
        if (!isPayableEarning(l) || l._creationTime > p._creationTime) continue;
        await ctx.db.patch("earningLines", l._id, { payoutLineId: p._id });
        linked++;
      }
    }
    return { linked };
  },
});

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

async function settle(
  ctx: MutationCtx,
  adminId: Id<"users">,
  line: Doc<"payoutLines">,
  status: "PAID" | "FAILED",
  note?: string,
) {
  if (line.status !== "SCHEDULED") fail("INVALID_STATE", "Payout sudah diproses.");
  if (status === "PAID" && !isPayoutReady(await findPayoutProfile(ctx, line.userId))) {
    fail("NO_DANA", "Nomor DANA belum diisi.");
  }
  await ctx.db.patch("payoutLines", line._id, {
    status,
    paidAt: status === "PAID" ? Date.now() : undefined,
    paidBy: status === "PAID" ? adminId : undefined,
    paidNote: status === "PAID" ? note : undefined,
    failedReason: status === "FAILED" ? note : undefined,
  });
  await notify(
    ctx,
    line.userId,
    status === "PAID" ? "PAYOUT_PAID" : "PAYOUT_FAILED",
    status === "PAID" ? "Payout dibayar" : "Payout gagal",
    `${line.period} — ${line.payable}.`,
    line.role === "L2" ? "/l2/payout" : "/l1/payout",
  );
  await audit(ctx, {
    adminId,
    action: "MARK_PAYOUT",
    object: `payout:${line._id}`,
    oldValue: "SCHEDULED",
    newValue: status,
    reason: note,
  });
}

export const markPaid = mutation({
  args: {
    payoutId: v.id("payoutLines"),
    status: v.union(v.literal("PAID"), v.literal("FAILED")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const line = await ctx.db.get("payoutLines", args.payoutId);
    if (!line) fail("NOT_FOUND", "Payout tidak ditemukan.");
    await settle(ctx, admin._id, line, args.status, args.reason?.trim() || undefined);
    return null;
  },
});

/** Bulk "Tandai dibayar" after a batch of DANA transfers. All or nothing. */
export const markPaidMany = mutation({
  args: { payoutIds: v.array(v.id("payoutLines")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    for (const id of args.payoutIds) {
      const line = await ctx.db.get("payoutLines", id);
      if (!line) fail("NOT_FOUND", "Payout tidak ditemukan.");
      await settle(ctx, admin._id, line, "PAID", args.note?.trim() || undefined);
    }
    return { count: args.payoutIds.length };
  },
});

/** Undo a mistaken PAID / FAILED, or retry a failed transfer. */
export const reopen = mutation({
  args: { payoutId: v.id("payoutLines") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const line = await ctx.db.get("payoutLines", args.payoutId);
    if (!line) fail("NOT_FOUND", "Payout tidak ditemukan.");
    if (line.status === "SCHEDULED") fail("INVALID_STATE", "Payout belum diproses.");
    await ctx.db.patch("payoutLines", line._id, {
      status: "SCHEDULED",
      paidAt: undefined,
      paidBy: undefined,
      paidNote: undefined,
      failedReason: undefined,
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "REOPEN_PAYOUT",
      object: `payout:${line._id}`,
      oldValue: line.status,
      newValue: "SCHEDULED",
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
    const profile = await findPayoutProfile(ctx, user._id);
    return {
      heldBalance: state?.heldBalance ?? 0,
      profileCompleted: isPayoutReady(profile),
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
        const profile = await findPayoutProfile(ctx, l.userId);
        const ready = isPayoutReady(profile);
        return {
          id: l._id,
          userId: l.userId,
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
          paidAt: l.paidAt ?? null,
          note: l.paidNote ?? l.failedReason ?? null,
          ready,
          bankName: profile?.bankName ?? null,
          accountNumber: profile?.accountNumber ?? null,
          accountName: profile?.accountName ?? null,
        };
      }),
    );
  },
});

/** Active agents whose payouts are blocked on a missing / non-DANA account. */
export const missingProfiles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const out = [];
    for (const role of ["L1", "L2"] as const) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_role_status", (q) => q.eq("role", role).eq("status", "ACTIVE"))
        .collect();
      for (const user of users) {
        if (isPayoutReady(await findPayoutProfile(ctx, user._id))) continue;
        const scheduled = await ctx.db
          .query("payoutLines")
          .withIndex("by_user_date", (q) => q.eq("userId", user._id))
          .collect();
        out.push({
          userId: user._id,
          name: user.name ?? "",
          role,
          mobile: user.mobile ?? null,
          owed: scheduled
            .filter((l) => l.status === "SCHEDULED")
            .reduce((sum, l) => sum + l.payable, 0),
        });
      }
    }
    return out.sort((a, b) => b.owed - a.owed);
  },
});

/** Header figures for the admin payout page: what to transfer this week. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const thisWeek = weekStart(now);
    const nextWeek = thisWeek + 7 * DAY_MS;
    const scheduled = await ctx.db
      .query("payoutLines")
      .withIndex("by_status", (q) => q.eq("status", "SCHEDULED"))
      .collect();
    const due = scheduled.filter((l) => l.payoutDate < nextWeek);
    const later = scheduled.filter((l) => l.payoutDate >= nextWeek);
    const paid = await ctx.db
      .query("payoutLines")
      .withIndex("by_status_paid", (q) => q.eq("status", "PAID").gte("paidAt", thisWeek))
      .collect();
    const sum = (rows: Doc<"payoutLines">[]) => rows.reduce((s, l) => s + l.payable, 0);
    const open = { count: 0, total: 0 };
    const waiting = { count: 0, total: 0 };
    for (const user of await agents(ctx)) {
      const b = await openBalance(ctx, user, now);
      if (b.unscheduled) {
        open.count++;
        open.total += b.unscheduled;
      }
      if (b.waiting) {
        waiting.count++;
        waiting.total += b.waiting;
      }
    }
    return {
      unscheduled: open,
      waiting,
      weekStart: thisWeek,
      weekEnd: nextWeek,
      due: {
        count: due.length,
        total: sum(due),
        overdue: due.filter((l) => l.payoutDate < thisWeek).length,
      },
      later: { count: later.length, total: sum(later) },
      paidThisWeek: { count: paid.length, total: sum(paid) },
    };
  },
});

// --- per-agent tracking ------------------------------------------------------

/** Owed but not yet in a payout, and earned but not yet payable. */
async function openBalance(ctx: QueryCtx, user: Doc<"users">, now: number) {
  const o = await owed(ctx, user, now);
  const waiting =
    user.role === "L1"
      ? (await unpaidEarnings(ctx, user._id))
          .filter((l) => GROSS_TYPES.has(l.type) && (l.status === "PENDING" || l.frozen))
          .reduce((s, l) => s + l.amount, 0)
      : 0;
  return {
    unscheduled: o.gross + o.jaminan - o.held + o.releasedHeld + o.adjustments.total,
    waiting,
  };
}

async function agents(ctx: QueryCtx) {
  const out: Doc<"users">[] = [];
  for (const role of ["L1", "L2"] as const) {
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", role))
      .collect();
    out.push(...users.filter((u) => u.status !== "PENDING"));
  }
  return out;
}

const sumPayable = (rows: Doc<"payoutLines">[]) => rows.reduce((s, l) => s + l.payable, 0);

/** Every agent with what they're owed, scheduled and already paid. */
export const agentBalances = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const out = [];
    for (const user of await agents(ctx)) {
      const role = user.role as "L1" | "L2";
      const { unscheduled, waiting } = await openBalance(ctx, user, now);
      const payouts = await ctx.db
        .query("payoutLines")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .collect();
      const paid = payouts.filter((l) => l.status === "PAID");
      const scheduled = payouts.filter((l) => l.status !== "PAID");
      if (!unscheduled && !waiting && payouts.length === 0) continue;
      const profile = await findPayoutProfile(ctx, user._id);
      out.push({
        userId: user._id,
        name: user.name ?? "",
        role,
        ready: isPayoutReady(profile),
        accountNumber: isPayoutReady(profile) ? profile!.accountNumber : null,
        unscheduled,
        waiting,
        scheduled: sumPayable(scheduled),
        paid: sumPayable(paid),
        lastPaidAt: paid.reduce((m, l) => Math.max(m, l.paidAt ?? 0), 0) || null,
      });
    }
    return out.sort((a, b) => b.unscheduled + b.scheduled - (a.unscheduled + a.scheduled));
  },
});

type WeekState = "PAID" | "SCHEDULED" | "UNSCHEDULED" | "WAITING";

/** An agent's commission week by week, and which part of it is paid. */
export const agentWeeks = query({
  args: { userId: v.id("users"), weeks: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;
    const since = weekStart(Date.now()) - ((args.weeks ?? 12) - 1) * 7 * DAY_MS;

    const payouts = await ctx.db
      .query("payoutLines")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const status = new Map(payouts.map((p) => [p._id, p.status]));

    const lines =
      user.role === "L1"
        ? await ctx.db
            .query("earningLines")
            .withIndex("by_l1_date", (q) => q.eq("l1Id", user._id).gte("date", since))
            .collect()
        : [];
    const buckets = new Map<number, Record<WeekState, number>>();
    for (const l of lines) {
      if (!GROSS_TYPES.has(l.type) || l.settledToCompany) continue;
      const state: WeekState = l.payoutLineId
        ? status.get(l.payoutLineId) === "PAID"
          ? "PAID"
          : "SCHEDULED"
        : l.status === "PENDING" || l.frozen
          ? "WAITING"
          : "UNSCHEDULED";
      const key = weekStart(l.date);
      const b = buckets.get(key) ?? { PAID: 0, SCHEDULED: 0, UNSCHEDULED: 0, WAITING: 0 };
      b[state] += l.amount;
      buckets.set(key, b);
    }
    return {
      weeks: [...buckets.entries()]
        .sort(([a], [b]) => b - a)
        .map(([start, b]) => ({
          start,
          period: weekPeriod(start),
          total: b.PAID + b.SCHEDULED + b.UNSCHEDULED + b.WAITING,
          ...b,
        })),
      payouts: payouts.slice(0, 24).map((p) => ({
        id: p._id,
        period: p.period,
        payoutDate: p.payoutDate,
        payable: p.payable,
        status: p.status,
        paidAt: p.paidAt ?? null,
        note: p.paidNote ?? p.failedReason ?? null,
      })),
    };
  },
});
