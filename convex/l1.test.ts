/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { DEFAULT_PLANS } from "./plans";
import { fromParts, periodOf, weekStart } from "./lib/period";

const modules = import.meta.glob("./**/*.ts");

// Wednesday 14 Oct 2026, midday Jakarta. Monday of that week is the 12th.
const NOW = fromParts(2026, 10, 14, 12);
const MONDAY = fromParts(2026, 10, 12, 9);
const PERIOD = periodOf(NOW);

type Ctx = Awaited<ReturnType<typeof setup>>;

async function setup() {
  const t = convexTest(schema, modules);

  const ids = await t.run(async (ctx) => {
    for (const plan of DEFAULT_PLANS) await ctx.db.insert("productPlans", plan);

    const l2Id = await ctx.db.insert("users", {
      name: "Rina Kartika",
      email: "l2@test",
      role: "L2",
      status: "ACTIVE",
      registeredAt: NOW,
      approvedAt: NOW,
    });
    const makeL1 = (name: string, email: string, assigned = true) =>
      ctx.db.insert("users", {
        name,
        email,
        role: "L1" as const,
        status: "ACTIVE" as const,
        registeredAt: NOW,
        approvedAt: NOW,
        ...(assigned ? { assignedL2Id: l2Id } : {}),
      });

    const aId = await makeL1("Budi Santoso", "a@test");
    const bId = await makeL1("Sari Dewi", "b@test");
    const cId = await makeL1("Andi Pratama", "c@test", false);

    const plans = await ctx.db.query("productPlans").collect();
    const monthly = plans.find((p) => p.key === "MONTHLY")!;
    const yearly = plans.find((p) => p.key === "YEARLY")!;

    return { l2Id, aId, bId, cId, monthlyId: monthly._id, yearlyId: yearly._id };
  });

  return { t, ...ids };
}

function line(
  ctx: Ctx,
  l1Id: Id<"users">,
  args: {
    planId: Id<"productPlans">;
    type: "NEW_SALES" | "RECURRING" | "RENEWAL_INCENTIVE";
    amount: number;
    date: number;
    status?: "CONFIRMED" | "PENDING";
    frozen?: boolean;
    merchantId?: Id<"merchants">;
    sourceCodeId?: Id<"subscriptionCodes">;
    payoutLineId?: Id<"payoutLines">;
  },
) {
  return ctx.t.run(async (db) =>
    db.db.insert("earningLines", {
      l1Id,
      date: args.date,
      period: periodOf(args.date),
      type: args.type,
      planId: args.planId,
      amount: args.amount,
      status: args.status ?? "CONFIRMED",
      frozen: args.frozen,
      merchantId: args.merchantId,
      sourceCodeId: args.sourceCodeId,
      payoutLineId: args.payoutLineId,
    }),
  );
}

const asUser = (c: Ctx, userId: Id<"users">) => c.t.withIdentity({ subject: userId });

describe("dashboard mix (§38 charts)", () => {
  test("counts verified sales only, split by plan and earning type", async () => {
    const c = await setup();
    await line(c, c.aId, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: MONDAY });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: NOW,
      status: "PENDING",
    });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: NOW,
      frozen: true,
    });
    await line(c, c.aId, { planId: c.yearlyId, type: "RECURRING", amount: 240_000, date: NOW });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "RENEWAL_INCENTIVE",
      amount: 1_400,
      date: NOW,
    });

    const data = await asUser(c, c.aId).query(api.l1Analytics.mix, { now: NOW, range: "12m" });
    const october = data.buckets.find((b) => b.key === PERIOD)!;

    // One confirmed monthly sale; the pending and frozen ones are not drawn.
    expect(october.units.MONTHLY).toBe(1);
    expect(october.units.YEARLY).toBe(0);
    expect(october.commission.NEW_SALES).toBe(35_000);
    expect(october.commission.RECURRING).toBe(240_000);
    expect(october.commission.RENEWAL_INCENTIVE).toBe(1_400);
    expect(data.buckets).toHaveLength(12);
    expect(data.unitTotal).toBe(1);
    expect(data.commissionTotal).toBe(276_400);
  });

  test("30-day view buckets by Jakarta day", async () => {
    const c = await setup();
    await line(c, c.aId, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: MONDAY });
    await line(c, c.aId, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: NOW });

    const data = await asUser(c, c.aId).query(api.l1Analytics.mix, { now: NOW, range: "30d" });
    expect(data.buckets).toHaveLength(30);
    expect(data.buckets[data.buckets.length - 1].units.MONTHLY).toBe(1);
    const monday = data.buckets.find((b) => b.key === "2026-10-12")!;
    expect(monday.units.MONTHLY).toBe(1);
    expect(data.unitTotal).toBe(2);
  });
});

describe("weekly card (§11.2)", () => {
  test("covers Monday–Sunday of the current week only", async () => {
    const c = await setup();
    const sunday = fromParts(2026, 10, 18, 20);
    const lastSunday = fromParts(2026, 10, 11, 20);

    await line(c, c.aId, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: MONDAY });
    await line(c, c.aId, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: sunday });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: lastSunday,
    });

    const week = await asUser(c, c.aId).query(api.earnings.week, { now: NOW });
    expect(week.weekStart).toBe(weekStart(NOW));
    expect(week.count).toBe(2);
    expect(week.amount).toBe(70_000);
  });
});

describe("leaderboard (§38.4)", () => {
  test("ranks verified sales, ties share a rank, L2 initials are the suffix", async () => {
    const c = await setup();
    for (const l1 of [c.aId, c.bId]) {
      await line(c, l1, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: NOW });
      await line(c, l1, { planId: c.monthlyId, type: "NEW_SALES", amount: 35_000, date: MONDAY });
    }
    // Pending does not count — Andi stays on zero.
    await line(c, c.cId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: NOW,
      status: "PENDING",
    });

    const board = await asUser(c, c.aId).query(api.leaderboard.month, { now: NOW });
    expect(board.totalAgents).toBe(3);
    expect(board.top10.map((r) => [r.name, r.sold, r.rank])).toEqual([
      ["Budi Santoso", 2, 1],
      ["Sari Dewi", 2, 1],
      ["Andi Pratama", 0, 3],
    ]);
    expect(board.top10[0].l2).toBe("RK");
    expect(board.top10[2].l2).toBeNull();
    expect(board.self?.name).toBe("Budi Santoso");
    expect(board.selfInTop10).toBe(true);
  });

  test("still reports the caller when they are outside the top ten", async () => {
    const c = await setup();
    // Ten agents with more sales than the caller.
    for (let i = 0; i < 10; i++) {
      const id = await c.t.run(async (ctx) =>
        ctx.db.insert("users", {
          name: `Agen ${i}`,
          email: `agen${i}@test`,
          role: "L1" as const,
          status: "ACTIVE" as const,
          registeredAt: NOW,
          approvedAt: NOW,
        }),
      );
      for (let s = 0; s < 2; s++) {
        await line(c, id, {
          planId: c.monthlyId,
          type: "NEW_SALES",
          amount: 35_000,
          date: NOW,
        });
      }
    }

    const board = await asUser(c, c.cId).query(api.leaderboard.month, { now: NOW });
    expect(board.top10).toHaveLength(10);
    expect(board.self?.name).toBe("Andi Pratama");
    // Ten agents tied on 2 sales share rank 1, so the next rank is 11.
    expect(board.self?.rank).toBe(11);
    expect(board.selfInTop10).toBe(false);
  });
});

describe("payout history (§11)", () => {
  test("groups carried lines by type and exposes code and buyer", async () => {
    const c = await setup();

    const { payoutId, merchantId, codeId, linkId } = await c.t.run(async (ctx) => {
      const merchantId = await ctx.db.insert("merchants", {
        sellMoreStoreId: "SM-1",
        storeName: "Warung Bu Sari",
        ownerL1Id: c.aId,
        firstPaymentAt: MONDAY,
        firstActivatedAt: MONDAY,
        subscriptionStatus: "SUBSCRIBED",
      });
      const linkId = await ctx.db.insert("paymentLinks", {
        l1Id: c.aId,
        planId: c.monthlyId,
        kind: "SUBSCRIPTION",
        amount: 70_000,
        token: "tok-1",
        status: "PAID",
        createdAt: MONDAY,
        expiresAt: MONDAY + 86_400_000,
        paidAt: MONDAY,
        buyerMerchantId: merchantId,
        customerName: "Sari Pelanggan",
        customerPhone: "+628123456789",
      });
      const codeId = await ctx.db.insert("subscriptionCodes", {
        code: "SM-TEST-CODE",
        l1Id: c.aId,
        planId: c.monthlyId,
        status: "USED",
        generatedAt: MONDAY,
        expiresAt: MONDAY + 604_800_000,
        priceAtIssue: 70_000,
        merchantId,
        usedAt: MONDAY,
      });
      const payoutId = await ctx.db.insert("payoutLines", {
        userId: c.aId,
        role: "L1",
        period: "2026-W41",
        periodStart: MONDAY - 7 * 86_400_000,
        periodEnd: MONDAY,
        frequency: "WEEKLY",
        payoutDate: NOW,
        gross: 98_000,
        jaminan: 0,
        held: 0,
        releasedHeld: 0,
        adjustment: 0,
        payable: 98_000,
        status: "PAID",
      });
      return { payoutId, merchantId, codeId, linkId };
    });

    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: MONDAY,
      merchantId,
      sourceCodeId: codeId,
      payoutLineId: payoutId,
    });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "NEW_SALES",
      amount: 35_000,
      date: MONDAY,
      merchantId,
      payoutLineId: payoutId,
    });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "RECURRING",
      amount: 28_000,
      date: MONDAY,
      merchantId,
      payoutLineId: payoutId,
    });
    await line(c, c.aId, {
      planId: c.monthlyId,
      type: "RENEWAL_INCENTIVE",
      amount: 1_400,
      date: MONDAY,
      merchantId,
      payoutLineId: payoutId,
    });

    const history = await asUser(c, c.aId).query(api.payouts.history, {
      frequency: "WEEKLY",
      limit: 10,
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      acquisitions: 2,
      newSales: 70_000,
      recurring: 28_000,
      renewal: 1_400,
      subtotal: 99_400,
      payable: 98_000,
      status: "PAID",
    });

    const detail = await asUser(c, c.aId).query(api.payouts.historyDetail, {
      lineId: payoutId,
    });
    expect(detail).toHaveLength(4);
    const coded = detail.find((d) => d.type === "NEW_SALES" && d.code);
    expect(coded?.code).toBe("SM-TEST-CODE");
    expect(detail.every((d) => d.customerName === "Sari Pelanggan")).toBe(true);
    expect(linkId).toBeTruthy();
  });

  test("refuses another agent's payout", async () => {
    const c = await setup();
    const payoutId = await c.t.run(async (ctx) =>
      ctx.db.insert("payoutLines", {
        userId: c.bId,
        role: "L1" as const,
        period: "2026-W41",
        periodStart: MONDAY - 7 * 86_400_000,
        periodEnd: MONDAY,
        frequency: "WEEKLY" as const,
        payoutDate: NOW,
        gross: 0,
        jaminan: 0,
        held: 0,
        releasedHeld: 0,
        adjustment: 0,
        payable: 0,
        status: "SCHEDULED" as const,
      }),
    );

    await expect(
      asUser(c, c.aId).query(api.payouts.historyDetail, { lineId: payoutId }),
    ).rejects.toThrow();
  });
});

describe("customer table (§38)", () => {
  test("merges named links as calon and keeps the buyer name", async () => {
    const c = await setup();

    await c.t.run(async (ctx) => {
      const merchantId = await ctx.db.insert("merchants", {
        sellMoreStoreId: "SM-2",
        storeName: "Toko Lama",
        ownerL1Id: c.aId,
        firstPaymentAt: MONDAY,
        firstActivatedAt: MONDAY,
        currentExpiryAt: NOW + 3 * 86_400_000,
        subscriptionStatus: "SUBSCRIBED",
      });
      await ctx.db.insert("paymentLinks", {
        l1Id: c.aId,
        planId: c.monthlyId,
        kind: "SUBSCRIPTION",
        amount: 70_000,
        token: "tok-customer",
        status: "PAID",
        createdAt: MONDAY,
        expiresAt: MONDAY + 86_400_000,
        paidAt: MONDAY,
        buyerMerchantId: merchantId,
        customerName: "Pelanggan Setia",
        customerPhone: "+628111111111",
      });
      await ctx.db.insert("paymentLinks", {
        l1Id: c.aId,
        planId: c.monthlyId,
        kind: "SUBSCRIPTION",
        amount: 70_000,
        token: "tok-calon",
        status: "SHARED",
        createdAt: NOW,
        expiresAt: NOW + 86_400_000,
        customerName: "Calon Baru",
        customerPhone: "+628222222222",
      });
    });

    const rows = await asUser(c, c.aId).query(api.customers.table, { now: NOW });
    expect(rows).toHaveLength(2);

    const customer = rows.find((r) => r.kind === "customer")!;
    expect(customer.name).toBe("Pelanggan Setia");
    expect(customer.status).toBe("SEGERA");
    expect(customer.registeredAt).toBe(MONDAY);
    expect(customer.paymentState).toBe("MENUNGGU");

    const lead = rows.find((r) => r.kind === "calon")!;
    expect(lead.name).toBe("Calon Baru");
    expect(lead.status).toBe("CALON");
    expect(lead.token).toBe("tok-calon");
  });
});

describe("settings for L1 (§34)", () => {
  test("exposes the L1 scheme and nothing about L2 or QRIS", async () => {
    const c = await setup();
    const settings = await asUser(c, c.aId).query(api.settings.forL1, {});
    expect(settings.plans.length).toBeGreaterThan(0);
    expect(settings.renewalIncentivePercent).toBe(2);
    expect(settings.ownershipWindowMonths).toBe(36);
    expect("l2" in settings).toBe(false);
    expect("qris" in settings).toBe(false);
  });
});
