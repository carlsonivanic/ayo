import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireRole } from "./lib/authz";
import { DAY_MS, fromParts } from "./lib/period";

// Daily sales: paid payment links on one Jakarta day. The L1 sees their own,
// the L2 their team's, the admin everything (with each L1's L2).

export const daily = query({
  args: { day: v.string() }, // YYYY-MM-DD, Jakarta
  handler: async (ctx, args) => {
    const viewer = await requireRole(ctx, ["L1", "L2", "ADMIN"]);
    const [y, m, d] = args.day.split("-").map(Number);
    const start = fromParts(y, m, d);

    const paid = (
      await ctx.db
        .query("paymentLinks")
        .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", start + DAY_MS))
        .collect()
    ).filter((l) => l.status === "PAID" && l.verification !== "REJECTED" && !l.refundedAt);

    let scope: Set<Id<"users">> | null = null;
    if (viewer.role === "L1") scope = new Set([viewer._id]);
    if (viewer.role === "L2") {
      const team = await ctx.db
        .query("users")
        .withIndex("by_l2", (q) => q.eq("assignedL2Id", viewer._id))
        .collect();
      scope = new Set(team.map((u) => u._id));
    }
    const links = scope ? paid.filter((l) => l.l1Id && scope.has(l.l1Id)) : paid;

    const names = new Map<string, string>();
    const l2Of = new Map<string, Id<"users"> | undefined>();
    const nameOf = async (id: Id<"users">) => {
      if (!names.has(id)) {
        const user = await ctx.db.get("users", id);
        names.set(id, user?.name ?? user?.email ?? "—");
        l2Of.set(id, user?.assignedL2Id);
      }
      return names.get(id)!;
    };
    const plans = new Map<string, string>();

    const items = [];
    const perL1 = new Map<
      string,
      { l1Id: Id<"users"> | null; name: string; l2Name: string | null; count: number; amount: number }
    >();
    for (const link of links) {
      if (!plans.has(link.planId)) {
        plans.set(link.planId, (await ctx.db.get("productPlans", link.planId))?.name ?? "—");
      }
      const merchant = link.buyerMerchantId
        ? await ctx.db.get("merchants", link.buyerMerchantId)
        : null;
      const l1Name = link.l1Id ? await nameOf(link.l1Id) : "Langsung";
      let l2Name: string | null = null;
      if (viewer.role === "ADMIN" && link.l1Id) {
        const l2Id = l2Of.get(link.l1Id);
        l2Name = l2Id ? await nameOf(l2Id) : null;
      }
      items.push({
        id: link._id,
        paidAt: link.paidAt!,
        amount: link.amount,
        planName: plans.get(link.planId)!,
        storeName: merchant?.storeName ?? link.buyerSellMoreStoreId ?? null,
        l1Name,
        pending: link.verification === "PENDING",
      });
      const key = link.l1Id ?? "direct";
      const row = perL1.get(key) ?? {
        l1Id: link.l1Id ?? null,
        name: l1Name,
        l2Name,
        count: 0,
        amount: 0,
      };
      row.count += 1;
      row.amount += link.amount;
      perL1.set(key, row);
    }

    items.sort((a, b) => b.paidAt - a.paidAt);
    return {
      count: items.length,
      amount: items.reduce((sum, i) => sum + i.amount, 0),
      perL1: [...perL1.values()].sort((a, b) => b.amount - a.amount),
      items,
    };
  },
});
