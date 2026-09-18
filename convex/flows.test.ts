/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { DEFAULT_PLANS } from "./plans";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { periodOf, shiftPeriod } from "./lib/period";

const modules = import.meta.glob("./**/*.ts");

// A structurally valid static QRIS (CRC checked) so createPaymentLink can run.
const TEST_QRIS =
  "00020101021126400014ID.CO.QRIS.WWW01189360000910000000015204581253033605802ID5908AYO TEST6007JAKARTA63045904";

type Ctx = Awaited<ReturnType<typeof setup>>;

async function setup() {
  const t = convexTest(schema, modules);

  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("schemeSettings", {
      ...DEFAULT_SETTINGS,
      qris: {
        enabled: true,
        staticPayload: TEST_QRIS,
        merchantName: "AYO TEST",
        // Off in tests so the amounts stay exactly the spec's figures.
        uniqueAmountEnabled: false,
        uniqueAmountMax: 999,
        proofRequired: true,
      },
      updatedAt: Date.now(),
    });
    for (const plan of DEFAULT_PLANS) await ctx.db.insert("productPlans", plan);

    const now = Date.now();
    const l2Id = await ctx.db.insert("users", {
      name: "Koordinator",
      email: "l2@test",
      role: "L2",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
    });
    const sellerId = await ctx.db.insert("users", {
      name: "Penjual",
      email: "seller@test",
      role: "L1",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
      assignedL2Id: l2Id,
      recruitedByL2Id: l2Id,
    });
    const otherId = await ctx.db.insert("users", {
      name: "Penjual Lain",
      email: "other@test",
      role: "L1",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
    });
    await ctx.db.insert("payoutProfiles", {
      userId: sellerId,
      bankName: "BCA",
      accountNumber: "123",
      accountName: "Penjual",
      completed: true,
    });

    const monthly = await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", "MONTHLY"))
      .unique();
    const duo = await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", "LIFETIME_DUO"))
      .unique();

    return { l2Id, sellerId, otherId, monthlyId: monthly!._id, duoId: duo!._id };
  });

  return { t, ...ids };
}

const asUser = (c: Ctx, userId: Id<"users">) => c.t.withIdentity({ subject: userId });

/** Stand-in for the receipt photo an L1 uploads. */
async function storeProof(c: Ctx) {
  return await c.t.run(async (ctx) =>
    ctx.storage.store(new Blob(["bukti"], { type: "image/png" })),
  );
}

/** Create a link as an L1, settle it with a receipt, and return the code. */
async function sellSubscription(c: Ctx, sellerId: Id<"users">) {
  const link = await asUser(c, sellerId).mutation(api.sell.createPaymentLink, {
    planId: c.monthlyId,
  });
  const result = await asUser(c, sellerId).mutation(api.payments.submitPaymentProof, {
    linkId: link.linkId,
    storageId: await storeProof(c),
  });
  if (!result.ok) throw new Error(result.reason);
  return { token: link.token, code: result.code!, linkId: result.linkId };
}

describe("subscription sell flow (§4 / §7.1)", () => {
  test("payment generates one unused code and a pending earning", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);

    await c.t.run(async (ctx) => {
      const row = await ctx.db
        .query("subscriptionCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      expect(row?.status).toBe("UNUSED");

      const earnings = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.sellerId))
        .collect();
      expect(earnings).toHaveLength(1);
      expect(earnings[0].status).toBe("PENDING");
      expect(earnings[0].amount).toBe(35_000);
    });
  });

  test("a link can only be settled once", async () => {
    const c = await setup();
    const { linkId } = await sellSubscription(c, c.sellerId);
    await expect(
      asUser(c, c.sellerId).mutation(api.payments.submitPaymentProof, {
        linkId,
        storageId: await storeProof(c),
      }),
    ).rejects.toThrow();

    await c.t.run(async (ctx) => {
      const codes = await ctx.db.query("subscriptionCodes").collect();
      expect(codes).toHaveLength(1);
    });
  });

  test("tenure starts at the first successful payment", async () => {
    const c = await setup();
    await sellSubscription(c, c.sellerId);
    await c.t.run(async (ctx) => {
      const seller = await ctx.db.get("users", c.sellerId);
      expect(seller?.firstPaymentAt).toBeTypeOf("number");
    });
  });
});

describe("code redemption (§7.3)", () => {
  test("first activation confirms the earning and counts an acquisition", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);

    const result = await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code,
      storeId: "STORE-1",
      storeName: "Warung Satu",
    });
    expect(result.ok && result.redemptionType).toBe("FIRST_ACTIVATION");

    await c.t.run(async (ctx) => {
      const earnings = await ctx.db.query("earningLines").collect();
      expect(earnings[0].status).toBe("CONFIRMED");
      expect(earnings[0].type).toBe("NEW_SALES");

      const acquisitions = await ctx.db.query("acquisitions").collect();
      expect(acquisitions).toHaveLength(1);

      const merchant = await ctx.db
        .query("merchants")
        .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", "STORE-1"))
        .unique();
      expect(merchant?.ownerL1Id).toBe(c.sellerId);
      expect(merchant?.subscriptionStatus).toBe("SUBSCRIBED");
    });
  });

  test("a used code cannot be used again", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, { code, storeId: "STORE-1" });
    const second = await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code,
      storeId: "STORE-2",
    });
    expect(second).toEqual({ ok: false, error: "code_used" });
  });

  test("another L1's renewal code pays the owner Y and the seller 2%", async () => {
    const c = await setup();
    const first = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code: first.code,
      storeId: "STORE-1",
    });

    const renewal = await sellSubscription(c, c.otherId);
    const result = await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code: renewal.code,
      storeId: "STORE-1",
    });
    expect(result.ok && result.redemptionType).toBe("RENEWAL");

    await c.t.run(async (ctx) => {
      const owner = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.sellerId))
        .collect();
      const recurring = owner.find((l) => l.type === "RECURRING");
      expect(recurring?.amount).toBe(35_000); // Y1
      expect(recurring?.status).toBe("CONFIRMED");

      const seller = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.otherId))
        .collect();
      expect(seller[0].type).toBe("RENEWAL_INCENTIVE");
      expect(seller[0].amount).toBe(1_400);

      // Ownership does not move, and a renewal is never an acquisition.
      const merchant = await ctx.db
        .query("merchants")
        .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", "STORE-1"))
        .unique();
      expect(merchant?.ownerL1Id).toBe(c.sellerId);
      expect(await ctx.db.query("acquisitions").collect()).toHaveLength(1);
    });
  });

  test("self renewal pays the owner immediately with no incentive", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, { code, storeId: "STORE-1" });

    const result = await c.t.mutation(internal.sdk.reportSelfRenewal, {
      storeId: "STORE-1",
      planKey: "MONTHLY",
    });
    expect(result.ok).toBe(true);

    await c.t.run(async (ctx) => {
      const lines = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.sellerId))
        .collect();
      expect(lines.filter((l) => l.type === "RECURRING")).toHaveLength(1);
      expect(lines.filter((l) => l.type === "RENEWAL_INCENTIVE")).toHaveLength(0);
    });
  });

  test("an expired unused code keeps the earning but never the acquisition (§6.2)", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);

    await c.t.run(async (ctx) => {
      const row = await ctx.db
        .query("subscriptionCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      await ctx.db.patch("subscriptionCodes", row!._id, { expiresAt: Date.now() - 1000 });
    });
    await c.t.mutation(internal.maintenance.expireUnusedCodes, {});

    await c.t.run(async (ctx) => {
      const lines = await ctx.db.query("earningLines").collect();
      expect(lines[0].status).toBe("CONFIRMED");
      expect(await ctx.db.query("acquisitions").collect()).toHaveLength(0);
    });
  });
});

describe("lifetime path lock and seats (§15)", () => {
  test("a subscribed store is blocked before payment", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, { code, storeId: "STORE-1" });

    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.duoId,
    });
    const result = await c.t.mutation(internal.sdk.payLifetimeLink, {
      token: link.token,
      storeId: "STORE-1",
    });
    expect(result).toEqual({ ok: false, error: "path_locked" });

    await c.t.run(async (ctx) => {
      const seats = await ctx.db.query("lifetimeSeats").collect();
      expect(seats).toHaveLength(0);
    });
  });

  test("duo pays full commission at payment and creates two pooled seats", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.duoId,
    });
    const result = await c.t.mutation(internal.sdk.payLifetimeLink, {
      token: link.token,
      storeId: "BUYER-1",
    });
    expect(result.ok && result.seats).toBe(2);

    await c.t.run(async (ctx) => {
      const lines = await ctx.db.query("earningLines").collect();
      expect(lines[0].amount).toBe(700_000);
      expect(lines[0].status).toBe("CONFIRMED");
      const seats = await ctx.db.query("lifetimeSeats").collect();
      expect(seats.map((s) => s.status)).toEqual(["POOLED", "POOLED"]);
    });
  });

  test("a seat given to a non-prospect returns to the pool", async () => {
    const c = await setup();
    const subscription = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code: subscription.code,
      storeId: "STORE-1",
    });

    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.duoId,
    });
    await c.t.mutation(internal.sdk.payLifetimeLink, {
      token: link.token,
      storeId: "BUYER-1",
    });
    const gift = await c.t.mutation(internal.sdk.regenerateSeatLink, { storeId: "BUYER-1" });
    if (!gift.ok) throw new Error(gift.error);

    const blocked = await c.t.mutation(internal.sdk.activateSeatByToken, {
      seatToken: gift.token,
      storeId: "STORE-1",
    });
    expect(blocked.ok).toBe(false);

    await c.t.run(async (ctx) => {
      const seats = await ctx.db.query("lifetimeSeats").collect();
      expect(seats.some((s) => s.status === "POOLED")).toBe(true);
      expect(seats.some((s) => s.status === "ACTIVATED")).toBe(false);
    });
  });

  test("a prospect activating a seat is an acquisition", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.duoId,
    });
    await c.t.mutation(internal.sdk.payLifetimeLink, { token: link.token, storeId: "BUYER-1" });
    const gift = await c.t.mutation(internal.sdk.regenerateSeatLink, { storeId: "BUYER-1" });
    if (!gift.ok) throw new Error(gift.error);

    const result = await c.t.mutation(internal.sdk.activateSeatByToken, {
      seatToken: gift.token,
      storeId: "GIFT-1",
      storeName: "Warung Hadiah",
    });
    expect(result.ok).toBe(true);

    await c.t.run(async (ctx) => {
      expect(await ctx.db.query("acquisitions").collect()).toHaveLength(1);
      const merchant = await ctx.db
        .query("merchants")
        .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", "GIFT-1"))
        .unique();
      expect(merchant?.subscriptionStatus).toBe("LIFETIME");
    });
  });
});

describe("month end and payout (§8 / §11)", () => {
  test("held is withheld and released once five customers land", async () => {
    const c = await setup();
    const period = shiftPeriod(periodOf(Date.now()), -1);

    // An L1 well past the guarantee months with a single sale: Cool, 20% held.
    await c.t.run(async (ctx) => {
      const start = Date.now() - 200 * 24 * 3600_000;
      await ctx.db.patch("users", c.sellerId, { firstPaymentAt: start });
      const merchantId = await ctx.db.insert("merchants", {
        sellMoreStoreId: "M1",
        ownerL1Id: c.sellerId,
        firstPaymentAt: start,
        firstActivatedAt: start,
        subscriptionStatus: "SUBSCRIBED",
      });
      await ctx.db.insert("earningLines", {
        l1Id: c.sellerId,
        date: Date.now() - 40 * 24 * 3600_000,
        period,
        type: "NEW_SALES",
        amount: 1_000_000,
        status: "CONFIRMED",
        merchantId,
      });
      await ctx.db.insert("acquisitions", {
        l1Id: c.sellerId,
        merchantId,
        period,
        date: Date.now() - 40 * 24 * 3600_000,
        sourceType: "CODE",
        sourceId: "seed",
      });
    });

    await asUser(c, await adminId(c)).mutation(api.monthEnd.runMonthEnd, { period });

    await c.t.run(async (ctx) => {
      const summary = await ctx.db
        .query("monthlyL1Summaries")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.sellerId).eq("period", period))
        .unique();
      expect(summary?.warmthState).toBe("COOL");
      expect(summary?.heldAmount).toBe(200_000);

      const state = await ctx.db
        .query("l1States")
        .withIndex("by_l1", (q) => q.eq("l1Id", c.sellerId))
        .unique();
      expect(state?.heldBalance).toBe(200_000);
    });
  });

  test("payout applies the §11.4 formula and only pays confirmed earnings", async () => {
    const c = await setup();
    const admin = await adminId(c);

    await c.t.run(async (ctx) => {
      await ctx.db.patch("users", c.sellerId, {
        firstPaymentAt: Date.now() - 60 * 24 * 3600_000,
        payoutFrequency: "MONTHLY",
      });
      const period = shiftPeriod(periodOf(Date.now()), -1);
      const date = Date.now() - 40 * 24 * 3600_000;
      await ctx.db.insert("earningLines", {
        l1Id: c.sellerId,
        date,
        period,
        type: "NEW_SALES",
        amount: 2_450_000,
        status: "CONFIRMED",
      });
      await ctx.db.insert("earningLines", {
        l1Id: c.sellerId,
        date,
        period,
        type: "NEW_SALES",
        amount: 999_999,
        status: "PENDING",
      });
      await ctx.db.insert("monthlyL1Summaries", {
        l1Id: c.sellerId,
        period,
        tenureMonth: 4,
        activationCount: 3,
        gross: 2_450_000,
        jaminan: 0,
        warmthState: "COOL",
        heldPercent: 20,
        heldAmount: 350_000,
        releasedAmount: 0,
        l2FeeBase: 2_450_000,
        settled: false,
        closedAt: Date.now(),
      });
    });

    const result = await asUser(c, admin).mutation(api.payouts.runPayouts, {
      scope: "L1_MONTHLY",
    });
    expect(result.created).toBe(1);

    await c.t.run(async (ctx) => {
      const line = await ctx.db
        .query("payoutLines")
        .withIndex("by_status", (q) => q.eq("status", "SCHEDULED"))
        .unique();
      expect(line?.gross).toBe(2_450_000); // pending excluded
      expect(line?.held).toBe(350_000);
      expect(line?.payable).toBe(2_100_000);
    });
  });
});

async function adminId(c: Ctx): Promise<Id<"users">> {
  return await c.t.run(async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "ADMIN"))
      .first();
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert("users", {
      name: "Admin",
      email: "admin@test",
      role: "ADMIN",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
    });
  });
}

describe("manual QRIS settlement", () => {
  async function adminOf(c: Ctx) {
    return await c.t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Admin",
        email: "admin@test",
        role: "ADMIN" as const,
        status: "ACTIVE" as const,
        registeredAt: Date.now(),
        approvedAt: Date.now(),
      }),
    );
  }

  const linesOf = (c: Ctx, l1Id: Id<"users">) =>
    c.t.run(async (ctx) =>
      ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", l1Id))
        .collect(),
    );

  test("the link carries a dynamic QRIS for its own amount", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });
    expect(link.qrisAmount).toBe(link.amount);
    expect(link.qrisPayload).toContain(String(link.amount));
  });

  test("uploading a receipt releases the code but freezes the commission", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);
    expect(code).toMatch(/^SM-/);

    const lines = await linesOf(c, c.sellerId);
    expect(lines).toHaveLength(1);
    expect(lines[0].frozen).toBe(true);
  });

  test("a frozen commission cannot reach a payout", async () => {
    const c = await setup();
    const { code } = await sellSubscription(c, c.sellerId);
    await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
      code,
      storeId: "STORE-FROZEN",
    });

    const lines = await linesOf(c, c.sellerId);
    expect(lines[0].status).toBe("CONFIRMED"); // redemption resolved it...
    expect(lines[0].frozen).toBe(true); // ...but the money is still unverified
  });

  test("verifying unfreezes every line the payment produced", async () => {
    const c = await setup();
    const { linkId } = await sellSubscription(c, c.sellerId);
    const adminId = await adminOf(c);

    await asUser(c, adminId).mutation(api.admin.payments.verifyPayment, { linkId });

    const lines = await linesOf(c, c.sellerId);
    expect(lines[0].frozen).toBeUndefined();
    await c.t.run(async (ctx) => {
      const link = await ctx.db.get("paymentLinks", linkId);
      expect(link?.verification).toBe("VERIFIED");
    });
  });

  test("rejecting kills the unused code and leaves the commission unpayable", async () => {
    const c = await setup();
    const { linkId, code } = await sellSubscription(c, c.sellerId);
    const adminId = await adminOf(c);

    const result = await asUser(c, adminId).mutation(api.admin.payments.rejectPayment, {
      linkId,
      reason: "Dana tidak masuk",
    });
    expect(result.redeemedCodes).toBe(0);

    await c.t.run(async (ctx) => {
      const row = await ctx.db
        .query("subscriptionCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      expect(row?.status).toBe("EXPIRED");
    });

    const lines = await linesOf(c, c.sellerId);
    expect(lines).toHaveLength(1); // nothing reversed — it never became payable
    expect(lines[0].frozen).toBe(true);
  });

  test("rejecting after verification reverses the released commission", async () => {
    const c = await setup();
    const { linkId } = await sellSubscription(c, c.sellerId);
    const adminId = await adminOf(c);

    await asUser(c, adminId).mutation(api.admin.payments.verifyPayment, { linkId });
    const result = await asUser(c, adminId).mutation(api.admin.payments.rejectPayment, {
      linkId,
      reason: "Bukti dipalsukan",
    });
    expect(result.reversed).toBe(1);

    const lines = await linesOf(c, c.sellerId);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(0);
  });

  test("a rejected lifetime payment voids its seats", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.duoId,
    });
    await asUser(c, c.sellerId).mutation(api.payments.submitPaymentProof, {
      linkId: link.linkId,
      storageId: await storeProof(c),
    });
    const adminId = await adminOf(c);

    await asUser(c, adminId).mutation(api.admin.payments.rejectPayment, {
      linkId: link.linkId,
      reason: "Dana tidak masuk",
    });

    await c.t.run(async (ctx) => {
      const seats = await ctx.db.query("lifetimeSeats").collect();
      expect(seats).toHaveLength(2);
      expect(seats.every((s) => s.status === "VOID")).toBe(true);
    });
  });

  test("only the L1 who owns the link can settle it", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });
    await expect(
      asUser(c, c.otherId).mutation(api.payments.submitPaymentProof, {
        linkId: link.linkId,
        storageId: await storeProof(c),
      }),
    ).rejects.toThrow();
  });
});

describe("buyer-side settlement on a shared link (§4.4)", () => {
  test("the buyer's own receipt releases the code on the link itself", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });

    const result = await c.t.mutation(api.payments.submitBuyerProof, {
      token: link.token,
      storageId: await storeProof(c),
    });
    expect(result.ok).toBe(true);

    // The link keeps serving the code — a buyer who closed the tab comes back.
    const view = await c.t.query(api.sell.publicLink, { token: link.token });
    expect(view?.status).toBe("PAID");
    expect(view?.codes[0]?.code).toBe(result.ok ? result.code : undefined);
    expect(view?.qrisPayload).toBeNull();

    await c.t.run(async (ctx) => {
      const row = await ctx.db
        .query("paymentLinks")
        .withIndex("by_token", (q) => q.eq("token", link.token))
        .unique();
      expect(row?.proofSource).toBe("BUYER");
      expect(row?.proofUploadedBy).toBeUndefined();
      expect(row?.verification).toBe("PENDING");

      // Unverified money never reaches a payout.
      const earnings = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_period", (q) => q.eq("l1Id", c.sellerId))
        .collect();
      expect(earnings[0].frozen).toBe(true);
    });
  });

  test("a link can only be settled once, whoever uploads", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });
    await c.t.mutation(api.payments.submitBuyerProof, {
      token: link.token,
      storageId: await storeProof(c),
    });
    await expect(
      c.t.mutation(api.payments.submitBuyerProof, {
        token: link.token,
        storageId: await storeProof(c),
      }),
    ).rejects.toThrow();
    await expect(
      asUser(c, c.sellerId).mutation(api.payments.submitPaymentProof, {
        linkId: link.linkId,
        storageId: await storeProof(c),
      }),
    ).rejects.toThrow();
  });

  test("an expired link cannot be paid by the buyer", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });
    await c.t.run(async (ctx) => {
      const row = await ctx.db
        .query("paymentLinks")
        .withIndex("by_token", (q) => q.eq("token", link.token))
        .unique();
      await ctx.db.patch("paymentLinks", row!._id, { expiresAt: Date.now() - 1 });
    });
    await expect(
      c.t.mutation(api.payments.submitBuyerProof, {
        token: link.token,
        storageId: await storeProof(c),
      }),
    ).rejects.toThrow();
  });

  test("opening the link is recorded once for the seller to chase", async () => {
    const c = await setup();
    const link = await asUser(c, c.sellerId).mutation(api.sell.createPaymentLink, {
      planId: c.monthlyId,
    });
    await c.t.mutation(api.sell.markLinkViewed, { token: link.token });
    await c.t.mutation(api.sell.markLinkViewed, { token: link.token });

    const links = await asUser(c, c.sellerId).query(api.sell.myLinks, {});
    expect(links[0].viewCount).toBe(2);
    expect(links[0].firstViewedAt).toBeTypeOf("number");
  });
});
