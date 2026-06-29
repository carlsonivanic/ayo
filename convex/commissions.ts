import { query } from "./_generated/server";
import { v } from "convex/values";
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
