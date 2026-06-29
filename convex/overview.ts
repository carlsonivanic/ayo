import { query } from "./_generated/server";
import { requireAdmin } from "./admins";
import { getParamNumber } from "./params";

const DAY = 86400000;

/** System Overview KPIs (PRD §4C). Reactive — updates live. */
export const kpis = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const licenses = await ctx.db.query("licenses").collect();
    const activeSubscribers = licenses.filter((l) => l.status === "active").length;
    const activationsToday = licenses.filter(
      (l) => l.activatedAt >= startOfDay.getTime(),
    ).length;
    const activationsMTD = licenses.filter(
      (l) => l.activatedAt >= monthStart.getTime(),
    ).length;

    const agents = await ctx.db.query("agents").collect();
    const activeAgents = agents.filter((a) => a.status === "active").length;

    // Rough MRR proxy: active monthly+annual licenses × tier price. Prefer the
    // price snapshot captured at activation so MRR reflects what buyers actually
    // paid; fall back to the current tier price for pre-snapshot licenses.
    const monthlyPrice =
      (await getParamNumber(ctx, "price_monthly")) ?? 69000;
    const annualPrice = (await getParamNumber(ctx, "price_annual")) ?? 499000;
    let mrr = 0n;
    for (const l of licenses) {
      if (l.status !== "active") continue;
      if (l.tier === "monthly") {
        mrr += l.priceIDR ?? BigInt(monthlyPrice);
      } else if (l.tier === "annual") {
        const annual = l.priceIDR ?? BigInt(annualPrice);
        mrr += annual / 12n;
      }
    }

    const codes = await ctx.db.query("subscriptionCodes").collect();
    const unusedCodes = codes.filter((c) => c.status === "unused").length;

    return {
      activeSubscribers,
      activationsToday,
      activationsMTD,
      activeAgents,
      totalAgents: agents.length,
      mrrIDR: mrr.toString(),
      unusedCodes,
      expiringSoon: licenses.filter(
        (l) =>
          l.status === "active" &&
          l.expiresAt !== undefined &&
          l.expiresAt - now < 7 * DAY,
      ).length,
    };
  },
});
