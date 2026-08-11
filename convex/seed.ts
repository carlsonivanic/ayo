import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx, internalMutation } from "./_generated/server";
import { insertEarning, recordAcquisition, recordMerchantPayment } from "./lib/ledger";
import { pctOf } from "./lib/money";
import { addMonths, periodOf, periodStart, shiftPeriod } from "./lib/period";
import { ensureSettings } from "./lib/settings";
import { ensurePlans } from "./plans";
import { closeL1Month } from "./monthEnd";

// Bootstrap and demo data.
//   npx convex run seed:bootstrap '{"email":"you@example.com","name":"Your Name"}'
//   npx convex run seed:demo

async function upsertUser(
  ctx: MutationCtx,
  args: {
    name: string;
    email: string;
    role: "L1" | "L2" | "ADMIN";
    assignedL2Id?: Id<"users">;
    recruitedByL2Id?: Id<"users">;
    firstPaymentAt?: number;
  },
): Promise<Id<"users">> {
  const email = args.email.toLowerCase();
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch("users", existing._id, {
      name: args.name,
      role: args.role,
      status: "ACTIVE",
      assignedL2Id: args.assignedL2Id,
      recruitedByL2Id: args.recruitedByL2Id,
      firstPaymentAt: args.firstPaymentAt ?? existing.firstPaymentAt,
    });
    return existing._id;
  }
  return await ctx.db.insert("users", {
    name: args.name,
    email,
    role: args.role,
    status: "ACTIVE",
    registeredAt: now,
    approvedAt: now,
    recruitmentSource: args.role === "ADMIN" ? "ADMIN_CREATE" : "L2_INVITE",
    assignedL2Id: args.assignedL2Id,
    recruitedByL2Id: args.recruitedByL2Id,
    firstPaymentAt: args.firstPaymentAt,
  });
}

async function ensurePayoutProfile(ctx: MutationCtx, userId: Id<"users">, name: string) {
  const existing = await ctx.db
    .query("payoutProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return;
  await ctx.db.insert("payoutProfiles", {
    userId,
    bankName: "BCA",
    accountNumber: String(1000000000 + Math.floor(Math.random() * 899999999)),
    accountName: name,
    completed: true,
  });
}

export const bootstrap = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ensureSettings(ctx);
    await ensurePlans(ctx);
    const adminId = await upsertUser(ctx, {
      name: args.name ?? "Admin",
      email: args.email,
      role: "ADMIN",
    });
    return { adminId };
  },
});

export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ensureSettings(ctx);
    await ensurePlans(ctx);

    const now = Date.now();
    const monthly = (await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", "MONTHLY"))
      .unique())!;
    const yearly = (await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", "YEARLY"))
      .unique())!;

    const l2Id = await upsertUser(ctx, {
      name: "Rina Kartika",
      email: "rina@ayo.test",
      role: "L2",
    });
    await ensurePayoutProfile(ctx, l2Id, "Rina Kartika");

    // Three L1s with different tenures, so warmth, guarantee and L2 decay are all
    // visible at once.
    const agents = [
      { name: "Budi Santoso", email: "budi@ayo.test", months: 9, perMonth: [7, 6, 5, 4] },
      { name: "Sari Dewi", email: "sari@ayo.test", months: 2, perMonth: [9, 8] },
      { name: "Andi Pratama", email: "andi@ayo.test", months: 14, perMonth: [3, 2, 4, 6] },
    ];

    for (const agent of agents) {
      const firstPaymentAt = addMonths(now, -(agent.months - 1));
      const l1Id = await upsertUser(ctx, {
        name: agent.name,
        email: agent.email,
        role: "L1",
        assignedL2Id: l2Id,
        recruitedByL2Id: l2Id,
        firstPaymentAt,
      });
      await ensurePayoutProfile(ctx, l1Id, agent.name);

      const already = await ctx.db
        .query("acquisitions")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id))
        .first();
      if (already) continue; // demo data already present

      const periods = agent.perMonth.map((_, i) =>
        shiftPeriod(periodOf(now), -(agent.perMonth.length - 1 - i)),
      );

      for (let p = 0; p < periods.length; p++) {
        const period = periods[p];
        const base = Math.max(periodStart(period), firstPaymentAt);
        for (let i = 0; i < agent.perMonth[p]; i++) {
          const plan = i % 4 === 0 ? yearly : monthly;
          const date = base + i * 36 * 60 * 60 * 1000;
          if (date > now) continue;
          const merchantId = await ctx.db.insert("merchants", {
            sellMoreStoreId: `DEMO-${agent.email.split("@")[0]}-${period}-${i}`,
            storeName: `Warung ${agent.name.split(" ")[0]} ${period.slice(5)}${i + 1}`,
            ownerL1Id: l1Id,
            firstPaymentAt: date,
            firstActivatedAt: date,
            currentPlanId: plan._id,
            subscriptionStatus: "SUBSCRIBED",
            currentExpiryAt: addMonths(date, plan.durationMonths),
          });
          const amount = pctOf(plan.price, plan.y1Percent);
          await insertEarning(ctx, {
            l1Id,
            date,
            type: "NEW_SALES",
            amount,
            status: "CONFIRMED",
            planId: plan._id,
            merchantId,
          });
          await recordAcquisition(ctx, {
            l1Id,
            merchantId,
            date,
            sourceType: "CODE",
            sourceId: `demo-${merchantId}`,
          });
          await recordMerchantPayment(ctx, {
            merchantId,
            recipientL1Id: l1Id,
            date,
            type: "NEW_SALES",
            amount,
            paymentAmount: plan.price,
            planId: plan._id,
            method: "CODE",
            yLabel: "Y1",
          });
        }
      }

      // Close every month except the current one, so summaries, held and L2 fees
      // exist to look at.
      for (const period of periods.slice(0, -1)) {
        await closeL1Month(ctx, l1Id, period);
      }
    }

    return { seeded: true };
  },
});
