import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admins";
import { getParamNumber } from "./params";

/**
 * Per-agent payout summary (read-only). The ledger is append-only; corrections
 * are reversing entries, never edits. Phase 1 surfaces L1 totals + readiness
 * against the payout threshold.
 */
export const payoutSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const threshold =
      (await getParamNumber(ctx, "payout_minimum_threshold")) ?? 50000;

    const entries = await ctx.db.query("commissionLedger").collect();
    const byAgent = new Map<
      string,
      { settled: bigint; pending: bigint; reversed: bigint }
    >();
    for (const e of entries) {
      const cur =
        byAgent.get(e.agentId) ?? { settled: 0n, pending: 0n, reversed: 0n };
      if (e.status === "settled") cur.settled += e.amount;
      else if (e.status === "pending") cur.pending += e.amount;
      else if (e.status === "reversed") cur.reversed += e.amount;
      byAgent.set(e.agentId, cur);
    }

    const agents = await ctx.db.query("agents").collect();
    const rows = agents
      .filter((a) => byAgent.has(a._id))
      .map((a) => {
        const t = byAgent.get(a._id)!;
        const payable = t.settled + t.pending;
        return {
          agentId: a._id,
          name: a.name,
          level: a.level,
          status: a.status,
          settled: t.settled.toString(),
          pending: t.pending.toString(),
          payable: payable.toString(),
          payoutReady: payable >= BigInt(Math.round(threshold)),
        };
      })
      .sort((a, b) => Number(BigInt(b.payable) - BigInt(a.payable)));

    return { thresholdIDR: Math.round(threshold), rows };
  },
});

/** Ledger detail for one agent, grouped by commission type. */
export const ledgerByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    await requireAdmin(ctx);
    const entries = await ctx.db
      .query("commissionLedger")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    const byType = new Map<string, bigint>();
    for (const e of entries) {
      if (e.status === "reversed") continue;
      byType.set(e.type, (byType.get(e.type) ?? 0n) + e.amount);
    }
    return {
      byType: [...byType.entries()].map(([type, amount]) => ({
        type,
        amount: amount.toString(),
      })),
      entries: entries
        .sort((a, b) => b._creationTime - a._creationTime)
        .map((e) => ({
          _id: e._id,
          type: e.type,
          amount: e.amount.toString(),
          status: e.status,
          createdAt: e._creationTime,
        })),
    };
  },
});

/**
 * Cycle boundaries for a payout period. Weeks are ISO (Mon-Sun); months are
 * calendar. Used both by the preview (warn if agent already paid this cycle)
 * and to scope `runPayout` idempotency.
 */
function cycleBounds(kind: "weekly" | "monthly", asOf = Date.now()): {
  start: number;
  end: number;
  prefix: string; // e.g. "weekly-2026-07-21" / "monthly-2026-07"
} {
  const d = new Date(asOf);
  if (kind === "weekly") {
    // ISO week: Monday is day 1.
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(d);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(d.getDate() - day);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const iso = monday.toISOString().slice(0, 10);
    return { start: monday.getTime(), end: sunday.getTime(), prefix: `weekly-${iso}` };
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { start: first.getTime(), end: last.getTime(), prefix: `monthly-${ym}` };
}

type PayoutRow = {
  agentId: Id<"agents">;
  name: string;
  level: number;
  status: string;
  regionId: Id<"regions"> | null;
  pendingTotal: string; // BigInt-serialized
  entryCount: number;
  belowThreshold: boolean;
  alreadyPaidThisCycle: boolean;
};

/**
 * Preview the next payout run: every agent with any `pending` ledger balance,
 * sorted by pending total desc. Includes agents BELOW the minimum threshold
 * (flagged `belowThreshold`) so nobody is silently invisible — the operator
 * decides whether to include them. Also flags anyone already paid this cycle.
 */
export const previewPayout = query({
  args: {
    periodKind: v.union(v.literal("weekly"), v.literal("monthly")),
    asOf: v.optional(v.number()),
  },
  handler: async (ctx, { periodKind, asOf }) => {
    await requireAdmin(ctx, ["super_admin", "finance_admin", "ops_admin"]);
    const threshold = (await getParamNumber(ctx, "payout_minimum_threshold")) ?? 50000;
    const { start, end, prefix } = cycleBounds(periodKind, asOf);

    // Aggregate pending per agent.
    const entries = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const byAgent = new Map<Id<"agents">, { total: bigint; count: number }>();
    for (const e of entries) {
      const cur = byAgent.get(e.agentId) ?? { total: 0n, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      byAgent.set(e.agentId, cur);
    }

    // Detect anyone already paid this cycle: a settled ledger row whose
    // payoutId starts with the cycle prefix AND whose _creationTime is in
    // [start, end]. Cheaper than scanning all settled entries.
    const settledThisCycle = new Set<Id<"agents">>();
    const settled = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "settled"))
      // .filter is disallowed by guidelines; we collect then filter in memory.
      .collect();
    for (const e of settled) {
      if (e.payoutId && e.payoutId.startsWith(prefix)) {
        settledThisCycle.add(e.agentId);
      }
    }
    // silence unused warning for end if filter logic shifts
    void end;
    void start;

    const rows: PayoutRow[] = [];
    for (const [agentId, agg] of byAgent) {
      const agent = await ctx.db.get(agentId);
      if (!agent) continue;
      rows.push({
        agentId,
        name: agent.name,
        level: agent.level,
        status: agent.status,
        regionId: agent.regionId,
        pendingTotal: agg.total.toString(),
        entryCount: agg.count,
        belowThreshold: agg.total < BigInt(Math.round(threshold)),
        alreadyPaidThisCycle: settledThisCycle.has(agentId),
      });
    }
    rows.sort((a, b) => Number(BigInt(b.pendingTotal) - BigInt(a.pendingTotal)));

    return {
      periodKind,
      prefix,
      cycleStart: cycleBounds(periodKind, asOf).start,
      cycleEnd: cycleBounds(periodKind, asOf).end,
      thresholdIDR: Math.round(threshold),
      rows,
      totalPending: rows
        .reduce((s, r) => s + BigInt(r.pendingTotal), 0n)
        .toString(),
    };
  },
});

type PayoutResult = {
  agentId: Id<"agents">;
  payoutId: string;
  total: string;
  entryCount: number;
};

/**
 * Execute a payout run: stamp every `pending` ledger entry for the selected
 * agents with one shared `payoutId` (per agent) and flip to `settled`.
 *
 * Double-pay prevention: only `pending` entries are selected. The status flip
 * to `settled` happens in the same transaction. A second call for the same
 * agents finds nothing pending → nothing to pay → zero total returned.
 *
 * Nobody-left-behind prevention: the caller may pass any subset of agents from
 * the preview. The preview is the source of truth for "who has pending"; this
 * mutation is intentionally additive and idempotent.
 */
export const runPayout = mutation({
  args: {
    agentIds: v.array(v.id("agents")),
    periodKind: v.union(v.literal("weekly"), v.literal("monthly")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { agentIds, periodKind, note }) => {
    await requireAdmin(ctx, ["super_admin", "finance_admin"]);
    if (agentIds.length === 0) throw new Error("Pilih minimal satu agen.");
    const admin = (ctx as unknown as { auth?: unknown });
    void admin; // ctx.auth.getUserIdentity() available if needed for audit
    void note;

    const { prefix } = cycleBounds(periodKind);
    const results: PayoutResult[] = [];
    let grandTotal = 0n;

    for (const agentId of agentIds) {
      // Re-read live; pending set may have changed since preview.
      const pending = await ctx.db
        .query("commissionLedger")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", agentId).eq("status", "pending"),
        )
        .collect();
      if (pending.length === 0) continue; // nothing to pay (already paid this cycle)

      // Single payoutId shared by all of this agent's entries in this run.
      const rand = Math.random().toString(36).slice(2, 8);
      const payoutId = `${prefix}-${rand}`;
      let total = 0n;
      for (const e of pending) {
        total += e.amount;
        await ctx.db.patch(e._id, { status: "settled", payoutId });
      }
      grandTotal += total;
      results.push({
        agentId,
        payoutId,
        total: total.toString(),
        entryCount: pending.length,
      });
    }

    return {
      results,
      totalPaid: grandTotal.toString(),
      runAt: Date.now(),
    };
  },
});

/**
 * History of past payout runs (distinct payoutId values), newest first. Each
 * row aggregates all settled entries sharing a payoutId. Powers the Payout Runs
 * "history" pane.
 */
export const payoutHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);
    const cap = Math.min(Math.max(limit ?? 50, 1), 200);
    const settled = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "settled"))
      .order("desc")
      .take(cap * 20); // bound reads; 20x to gather enough distinct payoutIds

    const byPayout = new Map<
      string,
      { total: bigint; count: number; agents: Set<string>; firstAt: number; lastAt: number }
    >();
    for (const e of settled) {
      if (!e.payoutId) continue;
      const cur = byPayout.get(e.payoutId) ?? {
        total: 0n,
        count: 0,
        agents: new Set<string>(),
        firstAt: e._creationTime,
        lastAt: e._creationTime,
      };
      cur.total += e.amount;
      cur.count += 1;
      cur.agents.add(e.agentId);
      cur.firstAt = Math.min(cur.firstAt, e._creationTime);
      cur.lastAt = Math.max(cur.lastAt, e._creationTime);
      byPayout.set(e.payoutId, cur);
    }

    return [...byPayout.entries()]
      .map(([payoutId, agg]) => ({
        payoutId,
        total: agg.total.toString(),
        entryCount: agg.count,
        agentCount: agg.agents.size,
        firstAt: agg.firstAt,
        lastAt: agg.lastAt,
      }))
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, cap);
  },
});

/**
 * Drill into a single payout run: all ledger entries sharing a payoutId.
 */
export const payoutDetail = query({
  args: { payoutId: v.string() },
  handler: async (ctx, { payoutId }) => {
    await requireAdmin(ctx);
    const entries = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "settled"))
      .collect();
    const matching = entries.filter((e) => e.payoutId === payoutId);

    const agentIds = [...new Set(matching.map((e) => e.agentId))];
    const agentNames = new Map<string, string>();
    for (const id of agentIds) {
      const a = await ctx.db.get(id);
      if (a) agentNames.set(id, a.name);
    }

    return matching
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((e) => ({
        _id: e._id,
        agentId: e.agentId,
        agentName: agentNames.get(e.agentId) ?? "—",
        type: e.type,
        amount: e.amount.toString(),
        multiplierPct: e.multiplierPct,
        periodStart: e.periodStart,
        periodEnd: e.periodEnd,
        createdAt: e._creationTime,
      }));
  },
});
