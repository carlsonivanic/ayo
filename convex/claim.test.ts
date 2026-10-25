/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { DEFAULT_PLANS } from "./plans";
import { DEFAULT_SETTINGS } from "./lib/settings";

const modules = import.meta.glob("./**/*.ts");

const DAY = 24 * 60 * 60 * 1000;
const OLD = "DEV-OLD";
const NEW = "DEV-NEW";
const APPLOCATOR = "https://applocator.test";

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  process.env.LICENSE_PRIVATE_KEY_JWK = JSON.stringify(
    await crypto.subtle.exportKey("jwk", pair.privateKey),
  );
});

beforeEach(() => {
  process.env.APPLOCATOR_URL = APPLOCATOR;
  process.env.APPLOCATOR_LICENSE_READ_KEY = "read-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Applocator answers with this response; every call is recorded. */
function stubApplocator(respond: () => Response | Promise<Response>) {
  const calls: { url: string; auth: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        auth: new Headers(init?.headers).get("Authorization"),
      });
      return await respond();
    }),
  );
  return calls;
}

const lastSeen = (ms: number) => () =>
  new Response(JSON.stringify({ last_seen: new Date(ms).toISOString() }), { status: 200 });

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("schemeSettings", { ...DEFAULT_SETTINGS, updatedAt: Date.now() });
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
    const planId = async (key: string) =>
      (await ctx.db
        .query("productPlans")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique())!._id;
    return {
      ownerId,
      yearlyId: await planId("YEARLY"),
      lifetimeId: await planId("LIFETIME_SINGLE"),
    };
  });
  return { t, ...ids };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

async function seedMerchant(
  c: Ctx,
  storeId: string,
  extra: Partial<Doc<"merchants">> = {},
) {
  const now = Date.now();
  return await c.t.run(async (ctx) =>
    ctx.db.insert("merchants", {
      sellMoreStoreId: storeId,
      ownerL1Id: c.ownerId,
      firstPaymentAt: now - 90 * DAY,
      firstActivatedAt: now - 90 * DAY,
      currentPlanId: c.yearlyId,
      subscriptionStatus: "SUBSCRIBED",
      currentExpiryAt: now + 200 * DAY,
      lastSeenAt: now,
      pingerDeviceId: "00001A",
      ...extra,
    }),
  );
}

async function claim(c: Ctx, body: Record<string, unknown>) {
  const res = await c.t.fetch("/api/v1/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const claimOld = (c: Ctx) =>
  claim(c, { claimStoreId: OLD, claimantStoreId: NEW, claimantPingerDeviceId: "00002B" });

const byStore = (c: Ctx, storeId: string) =>
  c.t.run(async (ctx) =>
    ctx.db
      .query("merchants")
      .withIndex("by_store_id", (q) => q.eq("sellMoreStoreId", storeId))
      .unique(),
  );

const allMerchants = (c: Ctx) => c.t.run(async (ctx) => ctx.db.query("merchants").collect());

describe("licence claim", () => {
  test("stale device: row moves, identity fields copied, owner and expiry unchanged", async () => {
    const c = await setup();
    const id = await seedMerchant(c, OLD);
    const before = (await byStore(c, OLD))!;
    const calls = stubApplocator(lastSeen(Date.now() - 6 * DAY));

    const { status, body } = await claimOld(c);
    expect(status).toBe(200);
    expect(body.status).toBe("claimed");
    expect(body.tier).toBe("annual");
    expect(typeof body.token).toBe("string");
    expect(String(body.token).startsWith("SM1.")).toBe(true);
    expect(body.expiresAt).toBe(new Date(before.currentExpiryAt!).toISOString());

    expect(calls).toEqual([
      { url: `${APPLOCATOR}/last-seen?device_id=00001A`, auth: "Bearer read-key" },
    ]);

    expect(await byStore(c, OLD)).toBeNull();
    const after = (await byStore(c, NEW))!;
    expect(after._id).toBe(id);
    expect(after.claimedFrom).toBe(OLD);
    expect(after.claimedAt).toBeGreaterThan(0);
    expect(after.pingerDeviceId).toBe("00002B");
    expect(after.ownerL1Id).toBe(before.ownerL1Id);
    expect(after.currentExpiryAt).toBe(before.currentExpiryAt);
    expect(after.currentPlanId).toBe(before.currentPlanId);
    expect(after.firstActivatedAt).toBe(before.firstActivatedAt);
    expect(after.firstPaymentAt).toBe(before.firstPaymentAt);
    expect(after.subscriptionStatus).toBe("SUBSCRIBED");

    const lines = await c.t.run(async (ctx) => ctx.db.query("earningLines").collect());
    expect(lines).toHaveLength(0);
  });

  test("claimant without a pinger id leaves the moved row without one", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    stubApplocator(lastSeen(Date.now() - 6 * DAY));
    const { body } = await claim(c, { claimStoreId: OLD, claimantStoreId: NEW });
    expect(body.status).toBe("claimed");
    expect((await byStore(c, NEW))!.pingerDeviceId).toBeUndefined();
  });

  test("fresh device stays put", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    const seen = Date.now() - 4 * DAY;
    stubApplocator(lastSeen(seen));
    const { body } = await claimOld(c);
    expect(body).toEqual({
      status: "still_active",
      reason: "device_online",
      lastSeenAt: new Date(seen).toISOString(),
    });
    expect(await byStore(c, OLD)).not.toBeNull();
    expect(await byStore(c, NEW)).toBeNull();
  });

  test("unknown device is not proof of absence", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    stubApplocator(() => new Response("not found", { status: 404 }));
    const { body } = await claimOld(c);
    expect(body).toEqual({ status: "still_active", reason: "unknown_device", lastSeenAt: null });
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test.each([
    ["5xx", () => new Response("boom", { status: 503 })],
    ["bad body", () => new Response(JSON.stringify({ nope: 1 }), { status: 200 })],
    ["unparseable date", () => new Response(JSON.stringify({ last_seen: "soon" }), { status: 200 })],
    [
      "network error",
      () => {
        throw new Error("offline");
      },
    ],
  ])("liveness unavailable (%s) stays put", async (_label, respond) => {
    const c = await setup();
    await seedMerchant(c, OLD);
    stubApplocator(respond);
    const { body } = await claimOld(c);
    expect(body).toEqual({
      status: "still_active",
      reason: "liveness_unavailable",
      lastSeenAt: null,
    });
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("missing Applocator config fails closed without calling out", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    delete process.env.APPLOCATOR_LICENSE_READ_KEY;
    const calls = stubApplocator(lastSeen(Date.now() - 60 * DAY));
    const { body } = await claimOld(c);
    expect(body.reason).toBe("liveness_unavailable");
    expect(calls).toHaveLength(0);
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("legacy row idle for 30 days moves without Applocator", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, { pingerDeviceId: undefined, lastSeenAt: Date.now() - 31 * DAY });
    const calls = stubApplocator(lastSeen(Date.now()));
    const { body } = await claimOld(c);
    expect(body.status).toBe("claimed");
    expect(calls).toHaveLength(0);
    expect(await byStore(c, NEW)).not.toBeNull();
  });

  test("legacy row seen within 30 days stays put", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, { pingerDeviceId: undefined, lastSeenAt: Date.now() - 10 * DAY });
    const { body } = await claimOld(c);
    expect(body).toEqual({ status: "still_active", reason: "legacy_recent", lastSeenAt: null });
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("legacy row activated recently stays put even with no lastSeenAt", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, {
      pingerDeviceId: undefined,
      lastSeenAt: undefined,
      firstActivatedAt: Date.now() - 2 * DAY,
    });
    const { body } = await claimOld(c);
    expect(body.reason).toBe("legacy_recent");
  });

  test("expired row is not moved", async () => {
    const c = await setup();
    const expiry = Date.now() - DAY;
    await seedMerchant(c, OLD, { currentExpiryAt: expiry });
    const calls = stubApplocator(lastSeen(Date.now() - 60 * DAY));
    const { body } = await claimOld(c);
    expect(body).toEqual({ status: "expired", expiresAt: new Date(expiry).toISOString() });
    expect(calls).toHaveLength(0);
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("churned row is not moved", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, { subscriptionStatus: "CHURNED" });
    const { body } = await claimOld(c);
    expect(body.status).toBe("expired");
  });

  test("claimant with an active row gets its own licence back, nothing moves", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    await seedMerchant(c, NEW, { pingerDeviceId: "00002B" });
    const calls = stubApplocator(lastSeen(Date.now() - 60 * DAY));
    const { body } = await claimOld(c);
    expect(body.status).toBe("already_claimed");
    expect(typeof body.token).toBe("string");
    expect(body.tier).toBe("annual");
    expect(calls).toHaveLength(0);
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("claimant with a lapsed row gets no token", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    await seedMerchant(c, NEW, { currentExpiryAt: Date.now() - DAY });
    const { body } = await claimOld(c);
    expect(body).toEqual({ status: "already_claimed", token: null, tier: null });
    expect(await byStore(c, OLD)).not.toBeNull();
  });

  test("unknown old store", async () => {
    const c = await setup();
    const { body } = await claimOld(c);
    expect(body).toEqual({ status: "not_found" });
  });

  test("second claim for the same old store: only one move", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    stubApplocator(lastSeen(Date.now() - 6 * DAY));
    expect((await claimOld(c)).body.status).toBe("claimed");
    const second = await claim(c, { claimStoreId: OLD, claimantStoreId: "DEV-THIRD" });
    expect(second.body).toEqual({ status: "not_found" });
    const rows = await allMerchants(c);
    expect(rows.map((m) => m.sellMoreStoreId)).toEqual([NEW]);
  });

  test("the move re-reads: a row already moved is not moved again", async () => {
    const c = await setup();
    await seedMerchant(c, OLD);
    const first = await c.t.mutation(internal.sdk.claimMove, {
      claimStoreId: OLD,
      claimantStoreId: NEW,
    });
    expect(first.kind).toBe("claimed");
    const second = await c.t.mutation(internal.sdk.claimMove, {
      claimStoreId: OLD,
      claimantStoreId: "DEV-THIRD",
    });
    expect(second.kind).toBe("not_found");
    expect((await allMerchants(c)).map((m) => m.sellMoreStoreId)).toEqual([NEW]);
  });

  test("lifetime row moves with a lifetime token", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, {
      subscriptionStatus: "LIFETIME",
      currentPlanId: c.lifetimeId,
      currentExpiryAt: undefined,
      lifetimeActivatedAt: Date.now() - 90 * DAY,
    });
    stubApplocator(lastSeen(Date.now() - 6 * DAY));
    const { body } = await claimOld(c);
    expect(body.status).toBe("claimed");
    expect(body.tier).toBe("lifetime");
    expect(Date.parse(String(body.expiresAt))).toBeGreaterThan(Date.now() + 50 * 365 * DAY);
    const after = (await byStore(c, NEW))!;
    expect(after.subscriptionStatus).toBe("LIFETIME");
    expect(after.lifetimeActivatedAt).toBeDefined();
  });

  test("bad body is a 400", async () => {
    const c = await setup();
    expect((await claim(c, { claimStoreId: OLD })).status).toBe(400);
  });
});

describe("pinger id on the POS surface", () => {
  test("activate stores it, renew overwrites it, renew without one keeps it", async () => {
    const c = await setup();
    const codes = await c.t.run(async (ctx) => {
      const now = Date.now();
      const make = (code: string) =>
        ctx.db.insert("subscriptionCodes", {
          code,
          planId: c.yearlyId,
          status: "UNUSED",
          generatedAt: now,
          expiresAt: now + 30 * DAY,
          priceAtIssue: 500_000,
        });
      await make("SM-AAAA-AAAA-AAAAA");
      await make("SM-BBBB-BBBB-BBBBB");
      await make("SM-CCCC-CCCC-CCCCC");
      return ["SM-AAAA-AAAA-AAAAA", "SM-BBBB-BBBB-BBBBB", "SM-CCCC-CCCC-CCCCC"];
    });
    const redeem = (path: string, body: Record<string, unknown>) =>
      c.t.fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    const activated = await redeem("/api/v1/activate", {
      code: codes[0],
      deviceId: OLD,
      pingerDeviceId: "00001A",
    });
    expect(activated.status).toBe(200);
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00001A");

    await redeem("/api/v1/renew", { code: codes[1], deviceId: OLD, pingerDeviceId: "00009Z" });
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00009Z");

    await redeem("/api/v1/renew", { code: codes[2], deviceId: OLD });
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00009Z");
  });

  test("validate stores a new id and a missing one never clears it", async () => {
    const c = await setup();
    await seedMerchant(c, OLD, { pingerDeviceId: undefined });
    const validate = (body: Record<string, unknown>) =>
      c.t.fetch("/api/v1/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    expect((await validate({ deviceId: OLD, pingerDeviceId: "00001A" })).status).toBe(200);
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00001A");
    await validate({ deviceId: OLD });
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00001A");
    await validate({ deviceId: OLD, pingerDeviceId: "00003C" });
    expect((await byStore(c, OLD))!.pingerDeviceId).toBe("00003C");
  });
});
