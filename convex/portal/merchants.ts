import { query } from "../_generated/server";
import { requireAgent } from "../agentAuth";

const DAY = 86400000;
const EXPIRING_SOON_DAYS = 7;

/**
 * Merchants the signed-in agent activated (PRD §4A "My Merchants"). Status is
 * derived for the UI: active / expiring soon / lapsed.
 */
export const myMerchants = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);
    const now = Date.now();

    const licenses = await ctx.db
      .query("licenses")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(200);

    return licenses.map((l) => {
      const daysRemaining =
        l.expiresAt !== undefined
          ? Math.ceil((l.expiresAt - now) / DAY)
          : null; // lifetime
      let display: "active" | "expiring" | "lapsed";
      if (l.status !== "active") {
        display = "lapsed";
      } else if (
        daysRemaining !== null &&
        daysRemaining <= EXPIRING_SOON_DAYS
      ) {
        display = "expiring";
      } else {
        display = "active";
      }
      return {
        _id: l._id,
        deviceId: l.deviceId,
        tier: l.tier,
        display,
        status: l.status,
        activatedAt: l.activatedAt,
        expiresAt: l.expiresAt ?? null,
        daysRemaining,
        priceIDR: l.priceIDR !== undefined ? l.priceIDR.toString() : null,
      };
    });
  },
});
