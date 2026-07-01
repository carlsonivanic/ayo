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

    return await Promise.all(
      licenses.map(async (l) => {
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
        // The code the merchant redeemed — lets the agent trace a device back to
        // the exact SM-XXXX code they sold.
        const redeemedCode = l.codeId
          ? (await ctx.db.get(l.codeId))?.code ?? null
          : null;
        return {
          _id: l._id,
          deviceId: l.deviceId,
          merchantName: l.merchantName ?? null,
          merchantLocation: l.merchantLocation ?? null,
          code: redeemedCode,
          tier: l.tier,
          display,
          status: l.status,
          activatedAt: l.activatedAt,
          expiresAt: l.expiresAt ?? null,
          daysRemaining,
          priceIDR: l.priceIDR !== undefined ? l.priceIDR.toString() : null,
        };
      }),
    );
  },
});
