/**
 * Read-only financial reports. All money is BigInt serialized as decimal
 * strings; the client formats via `formatIDR`.
 *
 * Every query takes the same filter shape so the UI can apply one filter strip
 * across all tabs: `{ from?, to?, regionId? }`.
 *   - from/to bound by `licenses.activatedAt` (the moment revenue is recognized)
 *   - regionId filters by `licenses.regionId`
 *
 * Note on `.collect()` use: these are admin-only reports over bounded historical
 * data, not user-facing hot paths. The guideline to prefer `.take()` applies to
 * queries that grow unboundedly with user activity; revenue reports are scoped
 * to time windows and gated behind admin auth.
 */
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admins";

type Filter = {
  from?: number;
  to?: number;
  regionId?: Id<"regions">;
};

const filterArgs = {
  from: v.optional(v.number()),
  to: v.optional(v.number()),
  regionId: v.optional(v.id("regions")),
};

function inFilter(activatedAt: number, regionId: Id<"regions">, f: Filter): boolean {
  if (f.from !== undefined && activatedAt < f.from) return false;
  if (f.to !== undefined && activatedAt > f.to) return false;
  if (f.regionId && regionId !== f.regionId) return false;
  return true;
}

/**
 * Core query: the filtered set of activations (revenue events). Returns each
 * license with its price, tier, channel (resolved from its code), agent, region.
 * Channel comes from the originating subscriptionCode; self-serve licenses have
 * no code link in edge cases and default to "self_serve".
 */
type ActivationRow = {
  licenseId: Id<"licenses">;
  activatedAt: number;
  priceIDR: string;
  tier: string;
  channel: "agent" | "retail" | "self_serve";
  agentId: Id<"agents"> | null;
  agentName: string | null;
  regionId: Id<"regions">;
};

/**
 * Shared loader for all revenue queries. Reads licenses + resolves channel (from
 * the originating code) and agent name. Filtered by time window + region.
 */
async function loadActivations(
  ctx: QueryCtx,
  f: Filter,
): Promise<ActivationRow[]> {
  const licenses = await ctx.db.query("licenses").collect();
  const out: ActivationRow[] = [];
  for (const lic of licenses) {
    if (!inFilter(lic.activatedAt, lic.regionId, f)) continue;
    const price = lic.priceIDR ?? 0n;
    let channel: "agent" | "retail" | "self_serve" = "self_serve";
    if (lic.codeId) {
      const code = await ctx.db.get(lic.codeId);
      if (code) channel = code.channel;
    }
    let agentName: string | null = null;
    if (lic.agentId) {
      const a = await ctx.db.get(lic.agentId);
      if (a) agentName = a.name;
    }
    out.push({
      licenseId: lic._id,
      activatedAt: lic.activatedAt,
      priceIDR: price.toString(),
      tier: lic.tier,
      channel,
      agentId: lic.agentId ?? null,
      agentName,
      regionId: lic.regionId,
    });
  }
  out.sort((a, b) => b.activatedAt - a.activatedAt);
  return out;
}

export const activations = query({
  args: filterArgs,
  handler: async (ctx, f: Filter) => {
    await requireAdmin(ctx);
    return await loadActivations(ctx, f);
  },
});

/** Revenue grouped by subscription-code channel: agent / retail / self_serve. */
export const revenueByChannel = query({
  args: filterArgs,
  handler: async (ctx, f: Filter) => {
    await requireAdmin(ctx);
    const rows = await loadActivations(ctx, f);
    const byChannel = new Map<string, bigint>();
    for (const r of rows) {
      byChannel.set(r.channel, (byChannel.get(r.channel) ?? 0n) + BigInt(r.priceIDR));
    }
    return {
      total: rows.reduce((s, r) => s + BigInt(r.priceIDR), 0n).toString(),
      buckets: [...byChannel.entries()].map(([channel, amount]) => ({
        channel,
        amount: amount.toString(),
      })),
    };
  },
});

/** Revenue grouped by region. */
export const revenueByRegion = query({
  args: filterArgs,
  handler: async (ctx, f: Filter) => {
    await requireAdmin(ctx);
    const rows = await loadActivations(ctx, f);
    const regions = await ctx.db.query("regions").collect();
    const regionName = new Map<string, string>();
    for (const r of regions) regionName.set(r._id, r.name);

    const byRegion = new Map<string, bigint>();
    for (const r of rows) {
      byRegion.set(r.regionId, (byRegion.get(r.regionId) ?? 0n) + BigInt(r.priceIDR));
    }
    return {
      total: rows.reduce((s, r) => s + BigInt(r.priceIDR), 0n).toString(),
      buckets: [...byRegion.entries()].map(([regionId, amount]) => ({
        regionId: regionId as Id<"regions">,
        regionName: regionName.get(regionId) ?? "—",
        amount: amount.toString(),
      })),
    };
  },
});

/** Revenue grouped by tier. */
export const revenueByTier = query({
  args: filterArgs,
  handler: async (ctx, f: Filter) => {
    await requireAdmin(ctx);
    const rows = await loadActivations(ctx, f);
    const byTier = new Map<string, bigint>();
    for (const r of rows) {
      byTier.set(r.tier, (byTier.get(r.tier) ?? 0n) + BigInt(r.priceIDR));
    }
    return {
      total: rows.reduce((s, r) => s + BigInt(r.priceIDR), 0n).toString(),
      buckets: [...byTier.entries()].map(([tier, amount]) => ({
        tier,
        amount: amount.toString(),
      })),
    };
  },
});

/** Top agents by revenue brought in. */
export const revenueByAgent = query({
  args: filterArgs,
  handler: async (ctx, f: Filter) => {
    await requireAdmin(ctx);
    const rows = await loadActivations(ctx, f);
    const agents = await ctx.db.query("agents").collect();
    const meta = new Map<string, { name: string; level: number; status: string; regionId: Id<"regions"> }>();
    for (const a of agents) {
      meta.set(a._id, { name: a.name, level: a.level, status: a.status, regionId: a.regionId });
    }

    const byAgent = new Map<string, { total: bigint; count: number }>();
    for (const r of rows) {
      if (!r.agentId) continue; // self-serve excluded from "by agent"
      const cur = byAgent.get(r.agentId) ?? { total: 0n, count: 0 };
      cur.total += BigInt(r.priceIDR);
      cur.count += 1;
      byAgent.set(r.agentId, cur);
    }

    return {
      total: [...byAgent.values()].reduce((s, v) => s + v.total, 0n).toString(),
      rows: [...byAgent.entries()]
        .map(([agentId, agg]) => {
          const m = meta.get(agentId);
          return {
            agentId: agentId as Id<"agents">,
            name: m?.name ?? "—",
            level: m?.level ?? 0,
            status: m?.status ?? "—",
            regionId: m?.regionId,
            total: agg.total.toString(),
            activations: agg.count,
          };
        })
        .sort((a, b) => Number(BigInt(b.total) - BigInt(a.total))),
    };
  },
});

export type LiabilityRow = {
  agentId: Id<"agents">;
  name: string;
  level: number;
  status: string;
  l1Residual: string;
  l1Closing: string;
  l2Override: string;
  l3Override: string;
  total: string;
  lastPayoutAt: number | null;
};

/**
 * Commission liability: how much is currently owed but not yet paid (status
 * `pending`). Split per agent by commission type. Powers the "know in advance"
 * tab. Forward-looking number for the operator.
 */
export const commissionLiability = query({
  args: filterArgs,
  handler: async (ctx, _f: Filter) => {
    void _f; // filter reserved for future period scoping; liability is currently live
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    type Acc = {
      l1Residual: bigint;
      l1Closing: bigint;
      l2Override: bigint;
      l3Override: bigint;
      lastPayoutAt: number | null;
    };
    const byAgent = new Map<Id<"agents">, Acc>();

    for (const e of pending) {
      const cur = byAgent.get(e.agentId) ?? {
        l1Residual: 0n,
        l1Closing: 0n,
        l2Override: 0n,
        l3Override: 0n,
        lastPayoutAt: null,
      };
      switch (e.type) {
        case "l1_residual": cur.l1Residual += e.amount; break;
        case "l1_closing": cur.l1Closing += e.amount; break;
        case "l2_override": cur.l2Override += e.amount; break;
        case "l3_override": cur.l3Override += e.amount; break;
      }
      byAgent.set(e.agentId, cur);
    }

    // Also gather each agent's most recent settled payout time for context.
    const settled = await ctx.db
      .query("commissionLedger")
      .withIndex("by_status", (q) => q.eq("status", "settled"))
      .collect();
    const lastPaidAt = new Map<Id<"agents">, number>();
    for (const e of settled) {
      const cur = lastPaidAt.get(e.agentId) ?? 0;
      if (e._creationTime > cur) lastPaidAt.set(e.agentId, e._creationTime);
    }

    const rows: LiabilityRow[] = [];
    for (const [agentId, agg] of byAgent) {
      const agent = await ctx.db.get(agentId);
      if (!agent) continue;
      const total = agg.l1Residual + agg.l1Closing + agg.l2Override + agg.l3Override;
      rows.push({
        agentId,
        name: agent.name,
        level: agent.level,
        status: agent.status,
        l1Residual: agg.l1Residual.toString(),
        l1Closing: agg.l1Closing.toString(),
        l2Override: agg.l2Override.toString(),
        l3Override: agg.l3Override.toString(),
        total: total.toString(),
        lastPayoutAt: lastPaidAt.get(agentId) ?? null,
      });
    }
    rows.sort((a, b) => Number(BigInt(b.total) - BigInt(a.total)));

    const totals = rows.reduce(
      (s, r) => ({
        l1Residual: s.l1Residual + BigInt(r.l1Residual),
        l1Closing: s.l1Closing + BigInt(r.l1Closing),
        l2Override: s.l2Override + BigInt(r.l2Override),
        l3Override: s.l3Override + BigInt(r.l3Override),
        total: s.total + BigInt(r.total),
      }),
      { l1Residual: 0n, l1Closing: 0n, l2Override: 0n, l3Override: 0n, total: 0n },
    );

    return {
      rows,
      totals: {
        l1Residual: totals.l1Residual.toString(),
        l1Closing: totals.l1Closing.toString(),
        l2Override: totals.l2Override.toString(),
        l3Override: totals.l3Override.toString(),
        total: totals.total.toString(),
      },
    };
  },
});

/** Agents with money held — escrow balances and status-reduced commission. */
export const holdsAndRetains = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // 1) Escrow holds: any agent with escrowAmount > 0.
    const agents = await ctx.db.query("agents").collect();
    const escrowHolds = agents
      .filter((a) => a.escrowAmount > 0n)
      .map((a) => ({
        agentId: a._id,
        name: a.name,
        level: a.level,
        status: a.status,
        regionId: a.regionId,
        escrowAmount: a.escrowAmount.toString(),
        enrolledAt: a.enrolledAt,
        feePaidAt: a.feePaidAt ?? null,
      }))
      .sort((a, b) => Number(BigInt(b.escrowAmount) - BigInt(a.escrowAmount)));

    // 2) Status-reduced commission: agents currently dormant/inactive/suspended
    //    who have pending commission. The reduction is captured in each ledger
    //    entry's multiplierPct (we store the applied fraction there).
    const statusHeldAgents = agents.filter(
      (a) => a.status === "dormant" || a.status === "inactive" || a.status === "suspended",
    );
    const statusHeld: {
      agentId: Id<"agents">;
      name: string;
      status: string;
      pendingTotal: string;
      entryCount: number;
      minMultiplierPct: number; // most-restrictive multiplier applied
    }[] = [];
    for (const a of statusHeldAgents) {
      const entries = await ctx.db
        .query("commissionLedger")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentId", a._id).eq("status", "pending"),
        )
        .collect();
      if (entries.length === 0) continue;
      const total = entries.reduce((s, e) => s + e.amount, 0n);
      const minMult = entries.reduce((m, e) => Math.min(m, e.multiplierPct ?? 100), 100);
      statusHeld.push({
        agentId: a._id,
        name: a.name,
        status: a.status,
        pendingTotal: total.toString(),
        entryCount: entries.length,
        minMultiplierPct: minMult,
      });
    }

    return { escrowHolds, statusHeld };
  },
});
