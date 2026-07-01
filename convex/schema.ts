import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// AYO — Sell More Subscription Platform schema.
// Money values are stored as v.int64() (BigInt IDR), never floats.
// licenses.agentId is IMMUTABLE after first activation — enforced in the mutation layer.
export default defineSchema({
  // Convex Auth component tables (users, authAccounts, authSessions, ...).
  ...authTables,

  // adminProfiles — links a Convex Auth user to an internal admin role.
  // Replaces INIT_PROMPT's hand-rolled `admins` table (Convex Auth owns credentials).
  adminProfiles: defineTable({
    authUserId: v.id("users"),
    name: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("finance_admin"),
      v.literal("ops_admin"),
    ),
  }).index("by_user", ["authUserId"]),

  // system_parameters — ALL business values live here.
  // Always read the row with the latest effectiveAt <= now() for a given key+region.
  systemParameters: defineTable({
    key: v.string(),
    value: v.string(),
    regionId: v.optional(v.id("regions")), // undefined = global default
    effectiveAt: v.number(),
    createdBy: v.optional(v.id("adminProfiles")),
    note: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_key_region", ["key", "regionId"])
    .index("by_key_region_effective", ["key", "regionId", "effectiveAt"]),

  agents: defineTable({
    phone: v.string(), // enforce uniqueness in the mutation layer
    name: v.string(),
    // Links the salesperson to a Convex Auth user so they can sign in to the
    // Agent Portal. Optional: agents created before the portal (or by admins
    // without credentials) have no login. Set once at registration.
    authUserId: v.optional(v.id("users")),
    level: v.number(), // 1=L1, 2=L2, 3=L3
    status: v.union(
      v.literal("probation"),
      v.literal("active"),
      v.literal("dormant"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
    regionId: v.id("regions"),
    referrerId: v.optional(v.id("agents")),
    enrolledAt: v.number(),
    feePaidAt: v.optional(v.number()),
    escrowAmount: v.int64(),
    escrowReleasedAt: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_phone", ["phone"])
    .index("by_auth_user", ["authUserId"])
    .index("by_region", ["regionId"])
    .index("by_referrer", ["referrerId"])
    .index("by_status", ["status"])
    .index("by_level", ["level"]),

  // agent_team_memberships — THE tenure clock table.
  agentTeamMemberships: defineTable({
    l1AgentId: v.id("agents"),
    l2AgentId: v.id("agents"),
    enrolledAt: v.number(),
    graduatedAt: v.optional(v.number()),
    graduationType: v.optional(
      v.union(
        v.literal("natural"),
        v.literal("promoted"),
        v.literal("voluntary_exit"),
      ),
    ),
  })
    .index("by_l1", ["l1AgentId"])
    .index("by_l2", ["l2AgentId"])
    .index("by_l1_l2", ["l1AgentId", "l2AgentId"])
    .index("by_open", ["graduatedAt"]),

  licenses: defineTable({
    deviceId: v.string(),
    agentId: v.optional(v.id("agents")), // undefined = self-serve. IMMUTABLE after first set.
    tier: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("lifetime"),
    ),
    activatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    creditDays: v.number(),
    gracePeriodDays: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    regionId: v.id("regions"),
    codeId: v.optional(v.id("subscriptionCodes")),
    // Price snapshot (IDR) captured at activation — the price the buyer actually
    // paid. Optional for rows created before pricing snapshots existed.
    priceIDR: v.optional(v.int64()),
    // Merchant identity captured from the POS at activation (the Sellmore
    // business profile: name + location). Lets salespeople see WHO redeemed a
    // code, not just an opaque deviceId. Optional for rows created before this.
    merchantName: v.optional(v.string()),
    merchantLocation: v.optional(v.string()),
  })
    .index("by_device", ["deviceId"])
    .index("by_agent", ["agentId"])
    .index("by_code", ["codeId"])
    .index("by_status", ["status"]),

  subscriptionCodes: defineTable({
    code: v.string(), // SM-XXXX-XXXX-XXXXX — enforce uniqueness in mutation layer
    tier: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("lifetime"),
    ),
    lifetimeKind: v.optional(
      v.union(v.literal("solo"), v.literal("duo")),
    ),
    agentId: v.optional(v.id("agents")),
    batchId: v.optional(v.string()),
    channel: v.union(
      v.literal("agent"),
      v.literal("retail"),
      v.literal("self_serve"),
    ),
    status: v.union(
      v.literal("unused"),
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    expiresUnusedAt: v.optional(v.number()),
    duoPairId: v.optional(v.id("subscriptionCodes")),
    duoExpiresAt: v.optional(v.number()),
    regionId: v.id("regions"),
    activatedAt: v.optional(v.number()),
    revokedReason: v.optional(v.string()),
    createdBy: v.optional(v.id("adminProfiles")),
    // Price snapshot (IDR) locked in when the code was issued (sold). Read from
    // systemParameters at generation time so later price changes never rewrite
    // history. For a Lifetime Duo pair the bundle price is split evenly across
    // the two codes. Optional for rows created before pricing snapshots existed.
    priceIDR: v.optional(v.int64()),
  })
    .index("by_code", ["code"])
    .index("by_agent", ["agentId"])
    .index("by_batch", ["batchId"])
    .index("by_status", ["status"]),

  // commission_ledger — APPEND-ONLY. Corrections are new reversing entries.
  commissionLedger: defineTable({
    agentId: v.id("agents"),
    licenseId: v.optional(v.id("licenses")),
    type: v.union(
      v.literal("l1_residual"),
      v.literal("l1_closing"),
      v.literal("l2_override"),
      v.literal("l3_override"),
      v.literal("area_bonus"),
      v.literal("growth_bonus"),
      v.literal("promo_bonus"),
      v.literal("finder_fee"),
      v.literal("escrow_release"),
    ),
    amount: v.int64(), // IDR, positive = credit
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    multiplierPct: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("settled"),
      v.literal("disputed"),
      v.literal("reversed"),
    ),
    payoutId: v.optional(v.string()),
  })
    .index("by_agent", ["agentId"])
    .index("by_license", ["licenseId"])
    .index("by_status", ["status"])
    .index("by_agent_status", ["agentId", "status"]),

  agentKpiSnapshots: defineTable({
    agentId: v.id("agents"),
    periodType: v.union(v.literal("quarter"), v.literal("semester")),
    periodStart: v.string(),
    periodEnd: v.string(),
    axis1Pct: v.optional(v.number()),
    axis1Pass: v.optional(v.boolean()),
    axis2Events: v.optional(v.number()),
    axis2Pass: v.optional(v.boolean()),
    activations: v.optional(v.number()),
    statusBefore: v.optional(v.string()),
    statusAfter: v.optional(v.string()),
    multiplierPct: v.optional(v.number()),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_period", ["agentId", "periodStart"]),

  regions: defineTable({
    name: v.string(),
    code: v.string(),
  }).index("by_code", ["code"]),

  notifications: defineTable({
    agentId: v.id("agents"),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
  }).index("by_agent", ["agentId"]),

  // Sliding-window rate limit counters. One row per key.
  rateLimitCounters: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});
