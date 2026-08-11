import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/authz";
import { periodEnd, periodStart } from "../lib/period";

// Payment-level view: the only place a refund exception can be raised (§10.4).

export const list = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const start = periodStart(args.period);
    const end = periodEnd(args.period);
    const paid = await ctx.db
      .query("paymentLinks")
      .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", end))
      .order("desc")
      .take(300);

    return await Promise.all(
      paid.map(async (link) => {
        const plan = await ctx.db.get("productPlans", link.planId);
        const seller = link.l1Id ? await ctx.db.get("users", link.l1Id) : null;
        const codes = await ctx.db
          .query("subscriptionCodes")
          .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
          .collect();
        return {
          id: link._id,
          planName: plan?.name ?? "—",
          amount: link.amount,
          paidAt: link.paidAt ?? link.createdAt,
          sellerName: seller?.name ?? "Tanpa agen",
          refunded: !!link.refundedAt,
          codes: codes.map((c) => ({
            id: c._id,
            code: c.code,
            status: c.status,
            storeName: c.storeName ?? null,
          })),
        };
      }),
    );
  },
});

/** Expired codes waiting for a possible reissue (§5.5). */
export const expiredCodes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_expiry_status", (q) => q.eq("status", "EXPIRED"))
      .order("desc")
      .take(100);
    return await Promise.all(
      codes.map(async (c) => ({
        id: c._id,
        code: c.code,
        sellerName: c.l1Id ? ((await ctx.db.get("users", c.l1Id))?.name ?? "") : "—",
        expiresAt: c.expiresAt,
        reissued: !!c.replacementCodeId,
      })),
    );
  },
});
