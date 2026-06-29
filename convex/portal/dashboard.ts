import { query } from "../_generated/server";
import { requireAgent } from "../agentAuth";
import { getParamNumber } from "../params";
import { pctOf } from "../lib/money";

const QUARTER_MS = 1000 * 60 * 60 * 24 * 91;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Agent Portal home dashboard (PRD §4A "Home Dashboard"). Everything is scoped
 * to the signed-in agent — no agentId is accepted from the client.
 */
export const homeSummary = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);

    const now = Date.now();
    const todayStart = startOfToday();
    const quarterStart = now - QUARTER_MS;
    const monthStart = startOfMonth();

    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();

    const activeMerchants = licenses.filter((l) => l.status === "active").length;
    const todayActivations = licenses.filter(
      (l) => l.activatedAt >= todayStart,
    ).length;
    const quarterActivations = licenses.filter(
      (l) => l.activatedAt >= quarterStart,
    ).length;

    const ledger = await ctx.db
      .query("commissionLedger")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();

    const commissionThisMonth = ledger
      .filter((e) => e.status !== "reversed" && e._creationTime >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0n);

    // Residual projection: estimated monthly income from the existing active
    // monthly base with zero new sales (annual/lifetime carry no monthly residual).
    const monthlyResidualPct =
      (await getParamNumber(ctx, "l1_monthly_commission_y1_pct", agent.regionId)) ??
      40;
    let residualProjection = 0n;
    for (const l of licenses) {
      if (l.status !== "active" || l.tier !== "monthly") continue;
      if (l.priceIDR === undefined) continue;
      residualProjection += pctOf(l.priceIDR, monthlyResidualPct);
    }

    const minActivations =
      (await getParamNumber(ctx, "l1_active_min_activations", agent.regionId)) ?? 3;

    return {
      name: agent.name,
      status: agent.status,
      level: agent.level,
      escrowAmount: agent.escrowAmount.toString(),
      activeMerchants,
      todayActivations,
      quarterActivations,
      minActivations,
      commissionThisMonth: commissionThisMonth.toString(),
      residualProjection: residualProjection.toString(),
    };
  },
});
