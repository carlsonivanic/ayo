/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { DEFAULT_PLANS } from "./plans";
import { DEFAULT_SETTINGS } from "./lib/settings";

const modules = import.meta.glob("./**/*.ts");

const TEST_QRIS =
  "00020101021126400014ID.CO.QRIS.WWW01189360000910000000015204581253033605802ID5908AYO TEST6007JAKARTA63045904";

const STORE = "STORE-SELF";
const IP = "10.0.0.1";

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("schemeSettings", {
      ...DEFAULT_SETTINGS,
      qris: {
        enabled: true,
        staticPayload: TEST_QRIS,
        merchantName: "AYO TEST",
        uniqueAmountEnabled: false,
        uniqueAmountMax: 999,
        proofRequired: true,
      },
      updatedAt: Date.now(),
    });
    for (const plan of DEFAULT_PLANS) await ctx.db.insert("productPlans", plan);
    const now = Date.now();
    const ownerId = await ctx.db.insert("users", {
      name: "Owner",
      email: "owner@test",
      role: "L1",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
    });
    const adminId = await ctx.db.insert("users", {
      name: "Admin",
      email: "admin@test",
      role: "ADMIN",
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
    });
    await ctx.db.insert("payoutProfiles", {
      userId: ownerId,
      bankName: "BCA",
      accountNumber: "1",
      accountName: "Owner",
      completed: true,
    });
    const monthly = await ctx.db
      .query("productPlans")
      .withIndex("by_key", (q) => q.eq("key", "MONTHLY"))
      .unique();
    return { ownerId, adminId, monthlyId: monthly!._id };
  });
  return { t, ...ids };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

const proof = (c: Ctx) =>
  c.t.run(async (ctx) => ctx.storage.store(new Blob(["bukti"], { type: "image/png" })));

/** The owner sells the first monthly code and the store activates it. */
async function activateViaOwner(c: Ctx) {
  const as = c.t.withIdentity({ subject: c.ownerId });
  const link = await as.mutation(api.sell.createPaymentLink, { planId: c.monthlyId });
  const paid = await as.mutation(api.payments.submitPaymentProof, {
    linkId: link.linkId,
    storageId: await proof(c),
  });
  if (!paid.ok) throw new Error(paid.reason);
  await c.t.mutation(internal.sdk.redeemSubscriptionCode, { code: paid.code!, storeId: STORE });
}

async function selfRenew(c: Ctx, planKey: string) {
  const created = await c.t.mutation(internal.selfRenew.createLink, {
    storeId: STORE,
    planKey,
    ip: IP,
  });
  if (!created.ok) throw new Error(created.error);
  const submitted = await c.t.mutation(internal.selfRenew.submitProof, {
    storeId: STORE,
    token: created.link.token,
    storageId: await proof(c),
    ip: IP,
  });
  if (!submitted.ok) throw new Error(submitted.error);
  const redeemed = await c.t.mutation(internal.sdk.redeemSubscriptionCode, {
    code: submitted.code,
    storeId: STORE,
  });
  if (!redeemed.ok) throw new Error(redeemed.error);
  return { token: created.link.token, code: submitted.code, expiresAt: redeemed.expiresAt };
}

const merchant = (c: Ctx) =>
  c.t.run(async (ctx) =>
    ctx.db
      .query("merchants")
      .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", STORE))
      .unique(),
  );

const linkOf = (c: Ctx, token: string) =>
  c.t.run(async (ctx) =>
    ctx.db
      .query("paymentLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique(),
  );

describe("self renewal from SellMore", () => {
  test("offer lists only plans at or above the current one, at AYO's renewal price", async () => {
    const c = await setup();
    await activateViaOwner(c);
    await c.t.run(async (ctx) => {
      const yearly = await ctx.db
        .query("productPlans")
        .withIndex("by_key", (q) => q.eq("key", "YEARLY"))
        .unique();
      await ctx.db.patch("productPlans", yearly!._id, { renewalPrice: 550_000 });
    });

    const offer = await c.t.query(internal.selfRenew.offer, { storeId: STORE });
    if (!offer.ok) throw new Error(offer.error);
    expect(offer.plans.map((p) => p.key)).toEqual(["MONTHLY", "YEARLY"]);
    expect(offer.plans.find((p) => p.key === "YEARLY")?.amount).toBe(550_000);

    await selfRenew(c, "YEARLY");
    const after = await c.t.query(internal.selfRenew.offer, { storeId: STORE });
    if (!after.ok) throw new Error(after.error);
    expect(after.plans.map((p) => p.key)).toEqual(["YEARLY"]);
  });

  test("a downgrade is refused", async () => {
    const c = await setup();
    await activateViaOwner(c);
    await selfRenew(c, "YEARLY");
    const result = await c.t.mutation(internal.selfRenew.createLink, {
      storeId: STORE,
      planKey: "MONTHLY",
      ip: IP,
    });
    expect(result).toEqual({ ok: false, error: "plan_not_allowed" });
  });

  test("an unknown store cannot self renew", async () => {
    const c = await setup();
    const result = await c.t.mutation(internal.selfRenew.createLink, {
      storeId: "NOPE",
      planKey: "MONTHLY",
      ip: IP,
    });
    expect(result).toEqual({ ok: false, error: "unknown_merchant" });
  });

  test("reopening returns the same open link for the same plan", async () => {
    const c = await setup();
    await activateViaOwner(c);
    const a = await c.t.mutation(internal.selfRenew.createLink, { storeId: STORE, planKey: "MONTHLY", ip: IP });
    const b = await c.t.mutation(internal.selfRenew.createLink, { storeId: STORE, planKey: "MONTHLY", ip: IP });
    if (!a.ok || !b.ok) throw new Error("create failed");
    expect(b.link.token).toBe(a.link.token);
  });

  test("a token is bound to its store", async () => {
    const c = await setup();
    await activateViaOwner(c);
    const created = await c.t.mutation(internal.selfRenew.createLink, {
      storeId: STORE,
      planKey: "MONTHLY",
      ip: IP,
    });
    if (!created.ok) throw new Error(created.error);
    const result = await c.t.mutation(internal.selfRenew.submitProof, {
      storeId: "OTHER-STORE",
      token: created.link.token,
      storageId: await proof(c),
      ip: IP,
    });
    expect(result).toEqual({ ok: false, error: "invalid_link" });
  });

  test("the code stacks on the current period and pays the owner, frozen until verified", async () => {
    const c = await setup();
    await activateViaOwner(c);
    const before = (await merchant(c))!.currentExpiryAt!;
    const { token, expiresAt } = await selfRenew(c, "MONTHLY");
    expect(expiresAt).toBeGreaterThan(before);

    const recurring = await c.t.run(async (ctx) =>
      (await ctx.db.query("earningLines").collect()).find((l) => l.type === "RECURRING"),
    );
    expect(recurring?.l1Id).toBe(c.ownerId);
    expect(recurring?.frozen).toBe(true);

    const link = (await linkOf(c, token))!;
    await c.t
      .withIdentity({ subject: c.adminId })
      .mutation(api.admin.payments.verifyPayment, { linkId: link._id });
    const after = await c.t.run(async (ctx) => ctx.db.get("earningLines", recurring!._id));
    expect(after?.frozen).toBeUndefined();
  });

  test("rejecting the receipt takes the period back", async () => {
    const c = await setup();
    await activateViaOwner(c);
    const before = (await merchant(c))!;
    const { token } = await selfRenew(c, "YEARLY");

    const link = (await linkOf(c, token))!;
    const result = await c.t
      .withIdentity({ subject: c.adminId })
      .mutation(api.admin.payments.rejectPayment, { linkId: link._id, reason: "Bukti palsu" });
    expect(result.revoked).toBe(1);

    const after = (await merchant(c))!;
    expect(after.currentExpiryAt).toBe(before.currentExpiryAt);
    expect(after.currentPlanId).toBe(before.currentPlanId);
  });

  test("proof uploads are rate limited per store", async () => {
    const c = await setup();
    await activateViaOwner(c);
    const created = await c.t.mutation(internal.selfRenew.createLink, {
      storeId: STORE,
      planKey: "MONTHLY",
      ip: IP,
    });
    if (!created.ok) throw new Error(created.error);
    let last: { ok: boolean; error?: string } = { ok: true };
    for (let i = 0; i < 6; i++) {
      last = await c.t.mutation(internal.selfRenew.submitProof, {
        storeId: STORE,
        token: "wrong-token",
        storageId: await proof(c),
        ip: IP,
      });
    }
    expect(last).toEqual({ ok: false, error: "rate_limited" });
  });
});
