import { query } from "../_generated/server";
import { requireAgent } from "../agentAuth";
import { getParamNumber } from "../params";

/**
 * The signed-in agent's earnings (PRD §4A "Earnings"): commission broken down by
 * type, recent ledger entries, escrow balance, and payout readiness. Read-only —
 * the ledger is append-only and owned by the commission engine.
 */
export const myEarnings = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);

    const entries = await ctx.db
      .query("commissionLedger")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();

    const byType = new Map<string, bigint>();
    let settled = 0n;
    let pending = 0n;
    for (const e of entries) {
      if (e.status === "reversed") continue;
      byType.set(e.type, (byType.get(e.type) ?? 0n) + e.amount);
      if (e.status === "settled") settled += e.amount;
      else if (e.status === "pending") pending += e.amount;
    }
    const payable = settled + pending;

    const threshold =
      (await getParamNumber(ctx, "payout_minimum_threshold", agent.regionId)) ??
      50000;

    return {
      escrowAmount: agent.escrowAmount.toString(),
      settled: settled.toString(),
      pending: pending.toString(),
      payable: payable.toString(),
      thresholdIDR: Math.round(threshold),
      payoutReady: payable >= BigInt(Math.round(threshold)),
      byType: [...byType.entries()].map(([type, amount]) => ({
        type,
        amount: amount.toString(),
      })),
      entries: entries
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 100)
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
