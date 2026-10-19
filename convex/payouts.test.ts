/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { periodOf, shiftPeriod } from "./lib/period";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("schemeSettings", { ...DEFAULT_SETTINGS, updatedAt: Date.now() });
    const now = Date.now();
    const base = { status: "ACTIVE" as const, registeredAt: now, approvedAt: now };
    const adminId = await ctx.db.insert("users", {
      ...base,
      name: "Admin",
      email: "admin@test",
      role: "ADMIN",
    });
    const sellerId = await ctx.db.insert("users", {
      ...base,
      name: "Penjual",
      email: "seller@test",
      role: "L1",
      payoutFrequency: "MONTHLY",
      firstPaymentAt: now - 60 * 24 * 3600_000,
    });
    await ctx.db.insert("earningLines", {
      l1Id: sellerId,
      date: now - 40 * 24 * 3600_000,
      period: shiftPeriod(periodOf(now), -1),
      type: "NEW_SALES",
      amount: 500_000,
      status: "CONFIRMED",
    });
    return { adminId, sellerId };
  });
  return { t, ...ids };
}

type Ctx = Awaited<ReturnType<typeof setup>>;
const as = (c: Ctx, id: Id<"users">) => c.t.withIdentity({ subject: id });

async function onlyLine(c: Ctx) {
  return await c.t.run(async (ctx) => (await ctx.db.query("payoutLines").collect())[0]);
}

describe("DANA payout profile", () => {
  test("bank is always DANA and the number is normalized", async () => {
    const c = await setup();
    await as(c, c.sellerId).mutation(api.users.savePayoutProfile, {
      accountNumber: "+62 812-3456-7890",
      accountName: "Penjual",
    });
    const profile = await as(c, c.sellerId).query(api.users.getPayoutProfile, {});
    expect(profile).toMatchObject({
      bankName: "DANA",
      accountNumber: "081234567890",
      completed: true,
    });
  });

  test("rejects a number that is not a DANA phone number", async () => {
    const c = await setup();
    await expect(
      as(c, c.sellerId).mutation(api.users.savePayoutProfile, {
        accountNumber: "1234567",
        accountName: "Penjual",
      }),
    ).rejects.toThrow();
  });

  test("a legacy bank account no longer counts as complete", async () => {
    const c = await setup();
    await c.t.run(async (ctx) => {
      await ctx.db.insert("payoutProfiles", {
        userId: c.sellerId,
        bankName: "BCA",
        accountNumber: "123",
        accountName: "Penjual",
        completed: true,
      });
    });
    const profile = await as(c, c.sellerId).query(api.users.getPayoutProfile, {});
    expect(profile?.completed).toBe(false);
    expect(profile?.accountNumber).toBe("");
  });
});

describe("manual payout tracking", () => {
  test("a missing DANA number holds the payout instead of dropping it", async () => {
    const c = await setup();
    const result = await as(c, c.adminId).mutation(api.payouts.runPayouts, {
      scope: "L1_MONTHLY",
    });
    expect(result.created).toBe(1);
    const line = await onlyLine(c);
    expect(line.payable).toBe(500_000);

    const missing = await as(c, c.adminId).query(api.payouts.missingProfiles, {});
    expect(missing).toEqual([
      expect.objectContaining({ userId: c.sellerId, owed: 500_000 }),
    ]);

    await expect(
      as(c, c.adminId).mutation(api.payouts.markPaid, { payoutId: line._id, status: "PAID" }),
    ).rejects.toThrow(/DANA/);

    await as(c, c.adminId).mutation(api.admin.users.editPayoutProfile, {
      userId: c.sellerId,
      accountNumber: "081234567890",
      accountName: "Penjual",
    });
    await as(c, c.adminId).mutation(api.payouts.markPaidMany, {
      payoutIds: [line._id],
      note: "DANA-REF-1",
    });
    const paid = await onlyLine(c);
    expect(paid.status).toBe("PAID");
    expect(paid.paidNote).toBe("DANA-REF-1");
    expect(paid.paidBy).toBe(c.adminId);

    const summary = await as(c, c.adminId).query(api.payouts.summary, {});
    expect(summary.paidThisWeek).toEqual({ count: 1, total: 500_000 });
    expect(summary.due.count).toBe(0);
  });

  test("a mistaken PAID can be reopened", async () => {
    const c = await setup();
    await as(c, c.sellerId).mutation(api.users.savePayoutProfile, {
      accountNumber: "081234567890",
      accountName: "Penjual",
    });
    await as(c, c.adminId).mutation(api.payouts.runPayouts, { scope: "L1_MONTHLY" });
    const line = await onlyLine(c);
    const listed = await as(c, c.adminId).query(api.payouts.adminList, { status: "SCHEDULED" });
    expect(listed[0]).toMatchObject({ ready: true, accountNumber: "081234567890" });

    await as(c, c.adminId).mutation(api.payouts.markPaid, { payoutId: line._id, status: "PAID" });
    await as(c, c.adminId).mutation(api.payouts.reopen, { payoutId: line._id });
    const reopened = await onlyLine(c);
    expect(reopened.status).toBe("SCHEDULED");
    expect(reopened.paidAt).toBeUndefined();
  });
});

describe("carry-forward engine", () => {
  test("a sale confirmed after its week's run is paid by the next run, once", async () => {
    const c = await setup();
    const lateId = await c.t.run(async (ctx) =>
      ctx.db.insert("earningLines", {
        l1Id: c.sellerId,
        date: Date.now() - 50 * 24 * 3600_000,
        period: shiftPeriod(periodOf(Date.now()), -1),
        type: "NEW_SALES",
        amount: 200_000,
        status: "PENDING",
      }),
    );
    await c.t.run(async (ctx) => {
      await ctx.db.patch("users", c.sellerId, { payoutFrequency: "WEEKLY" });
    });
    await as(c, c.adminId).mutation(api.payouts.runPayouts, { scope: "L1_WEEKLY" });
    let lines = await c.t.run(async (ctx) => ctx.db.query("payoutLines").collect());
    expect(lines.map((l) => l.gross)).toEqual([500_000]);

    const weeks = await as(c, c.adminId).query(api.payouts.agentWeeks, { userId: c.sellerId });
    const waiting = weeks!.weeks.reduce((s, w) => s + w.WAITING, 0);
    expect(waiting).toBe(200_000);

    // Activated late, then the run for a later period picks it up.
    await c.t.run(async (ctx) => {
      await ctx.db.patch("earningLines", lateId, { status: "CONFIRMED" });
    });
    await c.t.run(async (ctx) => {
      await ctx.db.patch("users", c.sellerId, { payoutFrequency: "MONTHLY" });
    });
    await as(c, c.adminId).mutation(api.payouts.runPayouts, { scope: "L1_MONTHLY" });
    lines = await c.t.run(async (ctx) => ctx.db.query("payoutLines").collect());
    expect(lines.map((l) => l.gross).sort()).toEqual([200_000, 500_000]);

    const balances = await as(c, c.adminId).query(api.payouts.agentBalances, {});
    expect(balances[0]).toMatchObject({ unscheduled: 0, scheduled: 700_000, paid: 0 });
  });

  test("L2 fees closed after the run are paid by the next run", async () => {
    const c = await setup();
    const l2Id = await c.t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert("users", {
        name: "Koordinator",
        email: "l2@test",
        role: "L2",
        status: "ACTIVE",
        registeredAt: now,
        approvedAt: now,
      });
      await ctx.db.insert("monthlyL2Summaries", {
        l2Id: id,
        period: shiftPeriod(periodOf(now), -2),
        totalFee: 75_000,
        settled: false,
      });
      return id;
    });
    await as(c, c.adminId).mutation(api.payouts.runPayouts, { scope: "L2" });
    const line = await c.t.run(async (ctx) =>
      ctx.db
        .query("payoutLines")
        .withIndex("by_user_period", (q) => q.eq("userId", l2Id))
        .unique(),
    );
    expect(line?.payable).toBe(75_000);
  });
});
