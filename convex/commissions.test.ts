/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const BASE_PARAMS: Record<string, string> = {
  price_monthly: "69000",
  price_annual: "499000",
  price_lifetime_solo: "1499000",
  price_lifetime_duo: "1999000",
  l1_monthly_commission_y1_pct: "40",
  l1_annual_commission_y1_pct: "30",
  l1_lifetime_solo_commission: "500000",
  l1_lifetime_duo_commission: "700000",
  l1_dormant_residual_pct: "50",
  l1_inactive_residual_pct: "25",
  l2_override_rate: "15",
  l3_override_rate: "10",
  payout_minimum_threshold: "50000",
  grace_period_days: "3",
  duration_monthly_days: "30",
  duration_annual_days: "365",
};

/** Seed params + a region; returns the regionId. */
async function setupBase(t: Awaited<ReturnType<typeof convexTest>>): Promise<Id<"regions">> {
  for (const [key, value] of Object.entries(BASE_PARAMS)) {
    await t.mutation(internal.testHelpers.seedParam, { key, value });
  }
  return await t.mutation(internal.regions.ensureRegion, { hint: "Jakarta" });
}

async function makeAgent(
  t: Awaited<ReturnType<typeof convexTest>>,
  args: {
    regionId: Id<"regions">;
    level: number;
    status?: "probation" | "active" | "dormant" | "inactive" | "suspended";
    referrerId?: Id<"agents">;
  },
): Promise<Id<"agents">> {
  return await t.mutation(internal.testHelpers.insertAgent, {
    regionId: args.regionId,
    level: args.level,
    status: args.status ?? "active",
    referrerId: args.referrerId,
    name: `Agent-${Math.random().toString(36).slice(2, 8)}`,
    phone: `08${Math.floor(1e11 + Math.random() * 8e11)}`,
  });
}

type Tier = "daily" | "weekly" | "monthly" | "annual" | "lifetime";

async function activate(
  t: Awaited<ReturnType<typeof convexTest>>,
  args: {
    regionId: Id<"regions">;
    agentId: Id<"agents">;
    tier: Tier;
    priceIDR: string;
    lifetimeKind?: "solo" | "duo";
    deviceId: string;
  },
): Promise<{ licenseId: Id<"licenses"> }> {
  const codeId = await t.mutation(internal.testHelpers.insertCode, {
    regionId: args.regionId,
    agentId: args.agentId,
    tier: args.tier,
    priceIDR: args.priceIDR,
    lifetimeKind: args.lifetimeKind,
  });
  return await t.mutation(internal.licenses.activate, {
    deviceId: args.deviceId,
    codeId,
  });
}

async function ledgerFor(
  t: Awaited<ReturnType<typeof convexTest>>,
  licenseId: Id<"licenses">,
) {
  return await t.query(internal.testHelpers.ledgerByLicense, { licenseId });
}

test("L1 monthly activation → 1 l1_residual entry at 40%", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "active" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "d1",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1);
  expect(entries[0].type).toBe("l1_residual");
  expect(BigInt(entries[0].amount)).toBe(27600n); // 69000 * 40%
  expect(entries[0].status).toBe("pending");
  expect(entries[0].multiplierPct).toBe(100);
});

test("L1 lifetime solo → 1 l1_closing entry at flat 500k", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "active" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "lifetime", lifetimeKind: "solo",
    priceIDR: "1499000", deviceId: "d2",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1);
  expect(entries[0].type).toBe("l1_closing");
  expect(BigInt(entries[0].amount)).toBe(500000n);
});

test("L1 with L2 upline → 2 entries (l1_residual + l2_override)", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l2 = await makeAgent(t, { regionId, level: 2, status: "active" });
  const l1 = await makeAgent(t, {
    regionId, level: 1, status: "active", referrerId: l2,
  });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "d3",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(2);
  const l2Entry = entries.find((e) => e.type === "l2_override");
  expect(l2Entry).toBeDefined();
  expect(l2Entry!.agentId).toBe(l2);
  expect(BigInt(l2Entry!.amount)).toBe(4140n); // 27600 * 15%
});

test("L1 with L2 + L3 upline → 3 entries", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l3 = await makeAgent(t, { regionId, level: 3, status: "active" });
  const l2 = await makeAgent(t, {
    regionId, level: 2, status: "active", referrerId: l3,
  });
  const l1 = await makeAgent(t, {
    regionId, level: 1, status: "active", referrerId: l2,
  });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "d4",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(3);
  const l3Entry = entries.find((e) => e.type === "l3_override");
  expect(l3Entry).toBeDefined();
  expect(l3Entry!.agentId).toBe(l3);
  expect(BigInt(l3Entry!.amount)).toBe(2760n); // 27600 * 10%
});

test("Peer referral (L1→L1→L2): L1 hop skipped, L2 still paid", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l2 = await makeAgent(t, { regionId, level: 2, status: "active" });
  const l1Mid = await makeAgent(t, {
    regionId, level: 1, status: "active", referrerId: l2,
  });
  const l1Seller = await makeAgent(t, {
    regionId, level: 1, status: "active", referrerId: l1Mid,
  });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1Seller, tier: "monthly", priceIDR: "69000", deviceId: "d5",
  });
  const entries = await ledgerFor(t, licenseId);
  // L1 seller + L2 override only; the L1 peer hop is skipped by the level guard.
  expect(entries.length).toBe(2);
  expect(entries.some((e) => e.agentId === l1Mid)).toBe(false);
  expect(entries.some((e) => e.agentId === l2 && e.type === "l2_override")).toBe(true);
});

test("Cycle in referrer chain does not loop forever", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const a = await makeAgent(t, { regionId, level: 1, status: "active" });
  const b = await makeAgent(t, {
    regionId, level: 1, status: "active", referrerId: a,
  });
  // Form a cycle: a.referrerId = b
  await t.mutation(internal.testHelpers.setReferrer, {
    agentId: a, referrerId: b,
  });
  const { licenseId } = await activate(t, {
    regionId, agentId: b, tier: "monthly", priceIDR: "69000", deviceId: "dcyc",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1); // just L1 residual; cycle detected
});

test("Suspended seller → no entries at all", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "suspended" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "dsusp",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(0);
});

test("Dormant seller → L1 residual at 50%", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "dormant" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "ddor",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1);
  expect(BigInt(entries[0].amount)).toBe(13800n); // 27600 * 50%
  expect(entries[0].multiplierPct).toBe(50);
});

test("Inactive seller → L1 residual at 25%", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "inactive" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "dina",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1);
  expect(BigInt(entries[0].amount)).toBe(6900n); // 27600 * 25%
  expect(entries[0].multiplierPct).toBe(25);
});

test("Probation seller earns FULL commission (escrow is the hold, not commission)", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "probation" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "dprob",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1);
  expect(BigInt(entries[0].amount)).toBe(27600n); // full, no reduction
  expect(entries[0].multiplierPct).toBe(100);
});

test("Daily tier → no L1 commission (self-serve tier)", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "active" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "daily", priceIDR: "4000", deviceId: "dday",
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(0);
});

test("Backfill is idempotent (run twice, no doubling)", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "active" });
  // License created WITHOUT the activation path (simulates a pre-engine row).
  const licenseId = await t.mutation(internal.testHelpers.insertLicenseDirect, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000",
  });

  const first = await t.mutation(internal.backfill.backfillCommissions, {});
  expect(first.written).toBeGreaterThan(0);

  const second = await t.mutation(internal.backfill.backfillCommissions, {});
  expect(second.written).toBe(0);
  expect(second.skippedAlready).toBeGreaterThan(0);

  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1); // exactly one, not two
});

test("Activation idempotency: re-activating does not double-write commission", async () => {
  const t = convexTest(schema, modules);
  const regionId = await setupBase(t);
  const l1 = await makeAgent(t, { regionId, level: 1, status: "active" });
  const { licenseId } = await activate(t, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000", deviceId: "didem",
  });
  // Re-activate by inserting another code for the same agent+device — should be
  // treated as a renewal (existing license), which doesn't re-trigger commission.
  const codeId2 = await t.mutation(internal.testHelpers.insertCode, {
    regionId, agentId: l1, tier: "monthly", priceIDR: "69000",
  });
  await t.mutation(internal.licenses.activate, {
    deviceId: "didem", codeId: codeId2,
  });
  const entries = await ledgerFor(t, licenseId);
  expect(entries.length).toBe(1); // still just the one from first activation
});
