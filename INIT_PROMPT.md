# AYO — Project Initialization Prompt

> **Usage:** Paste this entire document as the first message to Claude Code (or your AI coding assistant) when starting a new session on the AYO repository. It gives the AI full context to make correct architectural and business-logic decisions without re-explanation.

---

## System Prompt

You are the lead engineer on **Project AYO** — the Sell More Subscription Platform (SMSP). This is the commercial backend and multi-channel frontend system for Sell More, a minimal Android/PWA POS app targeting Indonesian MSME merchants.

### The one thing you must never get wrong

`agentId` on a license record is **immutable** after first activation. No code path may update it. This is the foundation of the entire commission and ownership system. Violation silently breaks residual calculations in ways that are very hard to audit. In Convex there is no DB-level trigger — this invariant is enforced **inside the mutation layer** and must never be bypassed by writing to the table directly from anywhere else.

---

## Project Identity

| Field | Value |
|---|---|
| Project name | AYO (Amat Yakin Oke) |
| Product | Sell More POS + SMSP backend |
| Company | Otter.id, backed by Accurate.id |
| Repository | https://github.com/darwintjoe/ayo |
| PRD | v1.3 — in `/docs/PRD_v1.3.html` |
| Phase | Phase 1 — Wave 1 (up to 50K users, 200–300 agents) |
| Language context | Indonesia — all user-facing strings in Bahasa Indonesia |

### Relationship to Sell More POS (Selmo)

AYO and the Sell More POS are **two separate codebases that ship together**:

- **Sell More POS (Selmo)** — offline-first POS app (Next.js + React + IndexedDB, PWA + Play Store TWA). It stores all operational data locally and only contacts AYO at lifecycle events.
- **AYO** — manages sales/agent network + commissions, and **generates the subscription codes** (`SM-XXXX-XXXX-XXXXX`) that the POS redeems on activation/renewal.

The boundary between them is **thin and stateless**: the POS exchanges a code for a signed license payload over HTTP, then goes back offline. Keep that boundary as a small set of public HTTP endpoints.

---

## Architecture

### Core principle
Sell More POS runs entirely offline (Android/PWA, local IndexedDB, Google Drive backup). COGS ≈ zero. AYO is contacted **only** at: install, activation, renewal, and backup-auth. Everything else happens offline.

### System components

```
Sell More POS (Android/PWA, offline-first)
    ↕ Public HTTP endpoints (stateless, called only at lifecycle events)
AYO Backend (Convex — functions + scheduled jobs)
    ├── License Engine        (HMAC-SHA256 signed payload)
    ├── Agent Network Engine  (hierarchy, status, tenure clock)
    ├── Commission Engine     (L1 residual + L2/L3 override)
    ├── Promotions Engine     (promo codes, discount rules)
    ├── Code Generator        (subscription codes, gift cards)
    └── Messaging Module      (in-app notification bell Phase 1, WhatsApp Phase 2)

Frontend channels:
    Agent App (PWA, L1 agents, Android 8+ installable)
    Coordinator Portal (web, L2/L3, desktop-first)
    Admin Console (web, internal, role-based)
```

### Tech stack decisions (locked)

| Layer | Choice |
|---|---|
| Backend / DB | **Convex** — reactive backend-as-a-service. Schema, queries, mutations, actions, HTTP endpoints, and cron jobs all live in the `convex/` directory in TypeScript. Single source of truth for data + business logic. |
| Money values | Stored as **`v.int64()`** (BigInt, IDR integer) — never floats. |
| POS-facing API | Convex **HTTP actions** (`convex/http.ts`) — stateless REST for the Android/PWA POS. |
| Agent App API | Convex **queries/mutations** called via the Convex React client (reactive, live-updating). |
| Scheduled work | Convex **cron jobs** (`convex/crons.ts`) calling internal mutations/actions. |
| Agent App | React PWA — offline-tolerant, queues actions when offline |
| Portal & Admin | React (Convex React client) |
| Maps | OpenStreetMap + Leaflet (not Google Maps) |
| Payments | QRIS via Midtrans or Xendit (configurable) — handled in Convex actions |
| Disbursement | Midtrans Iris or Xendit Disbursement |
| WhatsApp | **Phase 1: skipped.** In-app notification bell only. Phase 2: Twilio / Wati / Zoko. |
| Push | Firebase Cloud Messaging |
| Auth (agents) | **Phase 1: username + password.** Phone OTP deferred to Phase 2. |
| Auth (admin) | **Phase 1: strong password** (min 16 chars, enforced). 2FA deferred to Phase 2. Role-based: super_admin / finance_admin / ops_admin. |
| License signing | HMAC-SHA256 (secret in Convex environment variables, not in the database) |
| SMS (OTP) | **Phase 1: skipped.** Phase 2 addition. |

---

> **Phase 1 Auth Simplifications**
> - **Agent App:** Username + password login. No SMS OTP. No external provider dependency.
> - **Admin Console:** Strong password (minimum 16 characters, enforced at signup). No 2FA.
> - **WhatsApp Business API:** Not used. All agent notifications delivered as in-app records (notification bell in Agent App). No external messaging cost or dependency.
> - **Upgrade path:** OTP and 2FA are Phase 2 additions. The auth module must be built with an abstraction layer so the login flow can be swapped without touching business logic.

> **Why Convex (not Postgres):** end-to-end TypeScript with shared types across backend and all React frontends; transactional mutations that let us enforce the immutable-`agentId` invariant and append-only ledger in one place; first-class cron scheduling that maps directly to the KPI / tenure-clock / payout jobs; reactive queries that give agent and admin dashboards live updates for free. There is no data-residency constraint on this project.

---

## Data Model — Convex Schema (`convex/schema.ts`)

Convex tables replace the SQL tables. Key conversions:
- SQL `UUID` foreign keys → `v.id("<table>")`.
- `TIMESTAMPTZ` → `v.number()` (epoch milliseconds). Row insertion time is also available for free as `_creationTime`.
- `BIGINT` IDR money → `v.int64()`.
- Enums → `v.union(v.literal(...))`.
- `NULL`-able columns → `v.optional(...)`.
- Indexes are declared with `.index(name, [fields])` and queried with `.withIndex(...)`.

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // system_parameters — ALL business values live here.
  // Always read the row with the latest effectiveAt <= now() for a given key+region.
  // Never read parameter values from application code constants.
  systemParameters: defineTable({
    key: v.string(),
    value: v.string(),
    regionId: v.optional(v.id("regions")), // undefined = global default
    effectiveAt: v.number(),
    createdBy: v.id("admins"),
    note: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_key_region", ["key", "regionId"])
    .index("by_key_region_effective", ["key", "regionId", "effectiveAt"]),

  agents: defineTable({
    phone: v.string(), // enforce uniqueness in the mutation layer
    name: v.string(),
    level: v.number(), // 1=L1, 2=L2, 3=L3
    status: v.union(
      v.literal("probation"),
      v.literal("active"),
      v.literal("dormant"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
    regionId: v.id("regions"),
    referrerId: v.optional(v.id("agents")), // required at registration
    enrolledAt: v.number(),
    feePaidAt: v.optional(v.number()),      // undefined = fee not yet paid
    escrowAmount: v.int64(),                // IDR
    escrowReleasedAt: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
  })
    .index("by_phone", ["phone"])
    .index("by_region", ["regionId"])
    .index("by_referrer", ["referrerId"])
    .index("by_status", ["status"]),

  // agent_team_memberships — THE tenure clock table.
  agentTeamMemberships: defineTable({
    l1AgentId: v.id("agents"),
    l2AgentId: v.id("agents"),
    enrolledAt: v.number(),
    graduatedAt: v.optional(v.number()), // undefined means still in coaching
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
    .index("by_open", ["graduatedAt"]), // query ungraduated memberships
  // CRITICAL: When calculating L2 override on a merchant, the override is ONLY valid if
  //   merchant.activatedAt < membership.graduatedAt OR membership.graduatedAt is undefined
  //   AND merchant.agentId === l1AgentId

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
    expiresAt: v.optional(v.number()), // undefined = lifetime
    creditDays: v.number(),            // for daily/weekly
    gracePeriodDays: v.number(),       // default 3
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    regionId: v.id("regions"),
    codeId: v.optional(v.id("subscriptionCodes")),
  })
    .index("by_device", ["deviceId"])
    .index("by_agent", ["agentId"])
    .index("by_code", ["codeId"]),

  subscriptionCodes: defineTable({
    code: v.string(), // format: SM-XXXX-XXXX-XXXXX — enforce uniqueness in mutation layer
    tier: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("lifetime"),
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
    duoPairId: v.optional(v.id("subscriptionCodes")), // Lifetime Duo
    duoExpiresAt: v.optional(v.number()),             // 24-48h window for duo pair
    regionId: v.id("regions"),
    activatedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_agent", ["agentId"])
    .index("by_batch", ["batchId"])
    .index("by_status", ["status"]),

  // commission_ledger — APPEND-ONLY. Never update amount/type after settlement;
  // corrections are written as new reversing entries.
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
    periodStart: v.optional(v.string()), // ISO date
    periodEnd: v.optional(v.string()),
    multiplierPct: v.optional(v.number()), // L2/L3 status multiplier applied
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

  // agent_kpi_snapshots — written at end of each KPI period (quarter for L2, semester for L3).
  agentKpiSnapshots: defineTable({
    agentId: v.id("agents"),
    periodType: v.union(v.literal("quarter"), v.literal("semester")),
    periodStart: v.string(), // ISO date
    periodEnd: v.string(),
    axis1Pct: v.optional(v.number()),  // team health % (L2/L3)
    axis1Pass: v.optional(v.boolean()),
    axis2Events: v.optional(v.number()), // development events (L2/L3)
    axis2Pass: v.optional(v.boolean()),
    activations: v.optional(v.number()), // new activations (L1)
    statusBefore: v.optional(v.string()),
    statusAfter: v.optional(v.string()),
    multiplierPct: v.optional(v.number()), // resulting override multiplier
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_period", ["agentId", "periodStart"]),

  regions: defineTable({
    name: v.string(),
    code: v.string(),
  }).index("by_code", ["code"]),

  admins: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("finance_admin"),
      v.literal("ops_admin"),
    ),
  }).index("by_username", ["username"]),

  notifications: defineTable({
    agentId: v.id("agents"),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
  }).index("by_agent", ["agentId"]),
});
```

### Enforcing the immutable `agentId` (replaces the SQL trigger)

There is no database trigger in Convex. Enforce the invariant in **every** mutation that can touch a license, and never call `ctx.db.patch` on `agentId` elsewhere:

```ts
// convex/licenses.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateLicense = mutation({
  args: { licenseId: v.id("licenses"), patch: v.any() /* narrow this in real code */ },
  handler: async (ctx, { licenseId, patch }) => {
    const existing = await ctx.db.get(licenseId);
    if (!existing) throw new Error("license not found");

    if (
      "agentId" in patch &&
      existing.agentId != null &&
      patch.agentId !== existing.agentId
    ) {
      throw new Error("agentId is immutable after first activation");
    }
    await ctx.db.patch(licenseId, patch);
  },
});
```

Make this the **only** write path for licenses. Code review rule: a raw `ctx.db.patch(<license>, { agentId })` outside the first activation is a defect.

---

## API Surface (Phase 1)

### POS-facing — Convex HTTP actions (`convex/http.ts`)

The Android/PWA POS calls stateless HTTP endpoints. Use `httpRouter` + `httpAction`.

```
POST /api/v1/activate         Validates code, activates license, returns signed payload
POST /api/v1/validate         First-run: returns trial config and available tiers
POST /api/v1/renew            Self-serve renewal via QRIS
POST /api/v1/backup-auth      Issues short-lived JWT for Google Drive backup
POST /api/v1/report-event     Fire-and-forget milestone events (day 3, day 7, day 30)
GET  /api/v1/promos           Returns active promos for this device and region
```

```ts
// convex/http.ts (shape)
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();
http.route({
  path: "/api/v1/activate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const payload = await ctx.runMutation(internal.licenses.activate, body);
    return Response.json(payload);
  }),
});
export default http;
```

### Agent App — Convex queries/mutations (called via Convex React client)

These are reactive; the dashboard updates live. No hand-rolled REST needed.

```
mutation agents.verify          Username/password login → agent profile + session (Phase 1; OTP in Phase 2)
mutation codes.generate         Generates subscription code after payment confirmation
query    agents.merchants       Paginated list of agent's merchants with status
query    agents.earnings        Commission breakdown by period and tier
query    agents.dashboard       Home dashboard aggregates
```

### License payload structure (returned by `/activate`)

```json
{
  "licenseId": "id",
  "deviceId": "string",
  "tier": "monthly|annual|lifetime|daily|weekly",
  "activatedAt": 0,
  "expiresAt": 0,
  "creditDays": 0,
  "gracePeriodDays": 3,
  "agentId": "id|null",
  "signature": "HMAC-SHA256 of payload excluding this field"
}
```

---

## Parameter Service & Commission Calculation — Implementation Rules

```ts
// ALWAYS read rates from systemParameters, never from constants.
// Region-specific override takes precedence over global default.

// Helper: get the effective value for key+region (region override wins, else global).
async function getParam(ctx, key, regionId) {
  const now = Date.now();

  // Region-specific candidate (latest effectiveAt <= now)
  const regional = regionId
    ? await ctx.db
        .query("systemParameters")
        .withIndex("by_key_region", (q) => q.eq("key", key).eq("regionId", regionId))
        .order("desc")
        .filter((q) => q.lte(q.field("effectiveAt"), now))
        .first()
    : null;
  if (regional) return regional.value;

  // Global default (regionId undefined)
  const global = await ctx.db
    .query("systemParameters")
    .withIndex("by_key_region", (q) => q.eq("key", key).eq("regionId", undefined))
    .order("desc")
    .filter((q) => q.lte(q.field("effectiveAt"), now))
    .first();
  return global?.value;
}

// L1 residual commission:
// - Monthly Y1: price × l1_monthly_commission_y1_pct / 100
// - Monthly Y2: price × l1_monthly_commission_y2_pct / 100
// - Monthly Y3+: price × l1_monthly_commission_y3_pct / 100
// - Annual Y1 closing: price × l1_annual_commission_y1_pct / 100
// - Annual Y2 renewal: price × l1_annual_commission_y2_pct / 100
// - Lifetime Solo: l1_lifetime_solo_commission (flat, 2 tranches)
// - Lifetime Duo: l1_lifetime_duo_commission (flat, 2 tranches)

// L2 override:
// Step 1: Get L1 residual for this period
// Step 2: Check tenure clock — is this merchant within L1's coaching window?
//   Query agentTeamMemberships by_l1_l2; override valid only if
//   graduatedAt is undefined OR merchant.activatedAt < graduatedAt
// Step 3: Get L2 status multiplier for this KPI period
//   Query agentKpiSnapshots by_agent_period for the snapshot covering this payout date
// Step 4: override = l1_residual × l2_override_rate × multiplier_pct / 10000

// L3 override:
// Same chain — L3 earns on L2's override (not L1's residual directly)
// Same tenure clock check applies (L2's graduation from L3's team)
```

Do all money math with `BigInt` (`v.int64()` values), not floats.

---

## Agent Status Evaluation — Scheduled Jobs (`convex/crons.ts`)

Use Convex cron jobs that invoke internal mutations/actions.

```ts
// convex/crons.ts (shape)
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.cron("L1 quarterly status", "0 0 1 1,4,7,10 *", internal.kpi.runL1Status, {});
crons.cron("L2 quarterly status", "0 0 1 1,4,7,10 *", internal.kpi.runL2Status, {});
crons.cron("L3 semiannual status", "0 0 1 1,7 *",     internal.kpi.runL3Status, {});
crons.daily("tenure clock", { hourUTC: 0, minuteUTC: 0 }, internal.tenure.sweep, {});
export default crons;
```

```
L1 Status Job:   end of each calendar quarter (Jan 1, Apr 1, Jul 1, Oct 1)
L2 Status Job:   end of each calendar quarter
L3 Status Job:   end of each semi-annual period (Jan 1, Jul 1)

All status jobs:
  1. Snapshot KPI data into agentKpiSnapshots
  2. Calculate new status based on axis pass/fail
  3. Patch agents.status
  4. Apply new multiplier to subsequent commissionLedger entries
  5. Write an in-app notification record for affected agents (WhatsApp deferred to Phase 2)
  6. Notify relevant L2/L3 coordinators of team changes

L2 status logic:
  axis1_pass = (active_or_dormant_l1_count / total_roster_count) >= l2_kpi_health_pct
  axis2_pass = qualifying_dev_events_this_quarter >= l2_kpi_dev_min
  new_status = {
    (true, true)   → 'active',      multiplier = l2_multiplier_active
    (true, false)  → 'coasting',    multiplier = l2_multiplier_coasting
    (false, true)  → 'developing',  multiplier = l2_multiplier_developing
    (false, false) → prev=dormant ? 'suspended' : 'dormant',
                     multiplier = prev=dormant ? l2_multiplier_suspended : l2_multiplier_dormant
  }

Tenure clock sweep (daily cron):
  Query agentTeamMemberships by_open (graduatedAt === undefined).
  For each, if enrolledAt + l1_l2_tenure_years is within the warning window → send notification.
  If past expiry → patch graduatedAt = Date.now().
```

---

## Phase 1 Build Order

Build in this sequence to have a testable system at each step:

1. **Convex schema** — define `convex/schema.ts`; create a seed mutation that inserts all `systemParameters` defaults
2. **Parameter service** — `getParam()` helper with region override support
3. **License engine** — HMAC sign/verify, payload structure (secret from Convex env var)
4. **`activate` mutation + `/api/v1/activate` HTTP action** — core of the whole system; enforces immutable `agentId`
5. **`validate` mutation + `/api/v1/validate`** — trial config, self-serve tiers
6. **Agent auth** — `agents.verify` username/password mutation, session token (Phase 1; phone OTP added Phase 2)
7. **Code generator** — `SM-XXXX-XXXX-XXXXX` format, duo pairing
8. **`codes.generate` mutation** — requires agent auth
9. **L1 commission calculator** — reads from parameters, appends to `commissionLedger`
10. **L1 status evaluation cron** — quarterly, with parameter-driven thresholds
11. **Agent App PWA** — code generation flow first, then dashboard (Convex React client, reactive)
12. **`renew` + `backup-auth` + `report-event` + `promos`** — complete the HTTP surface
13. **Admin Console** — agent approval, code management, parameter editor
14. **Payout engine** — weekly settlement action, e-wallet disbursement
15. **In-app notifications** — status changes, payout alerts, merchant expiry (WhatsApp deferred to Phase 2)

---

## What NOT to Build in Phase 1

Do not scaffold, stub, or create placeholder files for:
- L2/L3 Coordinator Portal (Phase 2)
- L2/L3 commission override calculation (Phase 2)
- In-app messaging (Phase 2)
- Retail gift card batch generation (Phase 2)
- L3 KPI evaluation (Phase 3)
- Aggregated data reporting (Phase 3)
- Geographic density data release (Phase 3)

Define the full `systemParameters` defaults (including Phase 2/3 ones) from day one so the parameter set is consistent. But don't wire up the code paths that use Phase 2/3 params yet.

---

## Non-Functional Requirements

```
API response time:    < 500ms p95 for /activate and /validate
Code generation:      < 2 seconds from payment confirmation to code display
Concurrent sessions:  50,000 simultaneous agent app sessions at peak
License integrity:    HMAC-SHA256 — prevents local tampering
API uptime:           99.5% monthly — app continues offline during downtime
Agent App uptime:     99.9% — agent revenue depends on code generation
Payments:             QRIS via licensed gateway (Midtrans or Xendit)
Tax:                  PPh 21 auto-calculated per DJP regulations (Phase 3)
Privacy:              UU PDP (Personal Data Protection Law) compliant
```

---

## Before You Write Any Commission Code, Check:

- [ ] Am I reading the rate from `systemParameters` (via `getParam`), not a constant?
- [ ] Is this a residual payment (eligible for override) or a closing/first-month (not eligible)?
- [ ] Have I checked the tenure clock — was this merchant activated before the L1 graduated?
- [ ] Am I applying the current KPI period's status multiplier, not last period's?
- [ ] Is `agentId` on the license still immutable after this operation (writing only through the guarded mutation)?
- [ ] Is the `commissionLedger` entry append-only and does it correctly identify the `type` field?
- [ ] Am I doing money math in `BigInt` (`v.int64()`), never floats?

---

*Project AYO — Amat Yakin Oke.*  
*Repository: https://github.com/darwintjoe/ayo*
