import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Full systemParameters defaults (PRD §3). Includes Phase 2/3 keys so the
// parameter set is consistent from day one — Phase 1 only WIRES a subset.
const PARAMS: Record<string, string> = {
  // Pricing (IDR)
  price_daily: "4000",
  price_weekly: "28000",
  price_monthly: "69000",
  price_annual: "499000",
  price_lifetime_solo: "1499000",
  price_lifetime_duo: "1999000",
  // L1 — enrollment & status
  l1_probation_months: "3",
  l1_commitment_fee: "100000",
  l1_fee_waiver_extra_activations: "3",
  l1_escrow_forfeiture_days: "30",
  l1_active_min_activations: "3",
  l1_dormant_min_activations: "1",
  l1_dormant_warning_week: "10",
  l1_dormant_residual_pct: "50",
  l1_inactive_residual_pct: "25",
  l1_lifetime_conversion_cap_pct: "20",
  l1_ownership_transfer_quarters: "1",
  finder_fee_amount: "20000",
  // L1 — commission
  l1_monthly_commission_y1_pct: "40",
  l1_monthly_commission_y2_pct: "30",
  l1_monthly_commission_y3_pct: "20",
  l1_annual_commission_y1_pct: "30",
  l1_annual_commission_y2_pct: "20",
  l1_lifetime_solo_commission: "500000",
  l1_lifetime_duo_commission: "700000",
  // L2 — gate
  l2_promo_min_months_l1: "6",
  l2_promo_min_activations: "50",
  l2_promo_min_recruits: "3",
  // L2 — KPI & roster
  l2_kpi_period: "quarterly",
  l2_kpi_health_pct: "60",
  l2_kpi_dev_min: "1",
  l2_roster_soft_cap: "15",
  l2_roster_warning_threshold: "13",
  l2_suspended_denominator_quarters: "1",
  // L2 — status multipliers
  l2_multiplier_active: "100",
  l2_multiplier_coasting: "75",
  l2_multiplier_developing: "60",
  l2_multiplier_dormant: "30",
  l2_multiplier_suspended: "0",
  // L2 — income
  l2_override_rate: "15",
  l2_bonus_area_threshold: "200",
  l2_bonus_area_amount: "500000",
  l2_bonus_growth_pct: "10",
  l2_bonus_growth_amount: "300000",
  l2_promo_bonus_per_l1_promoted: "1500000",
  // L3 — gate
  l3_promo_min_months_l2: "12",
  l3_promo_min_l2s_built: "3",
  l3_promo_min_active_merchants: "1000",
  // L3 — KPI & roster
  l3_kpi_period: "semi-annual",
  l3_kpi_health_pct: "60",
  l3_kpi_dev_min: "1",
  l3_roster_soft_cap: "8",
  l3_roster_warning_threshold: "7",
  // L3 — status multipliers
  l3_multiplier_active: "100",
  l3_multiplier_coasting: "75",
  l3_multiplier_developing: "60",
  l3_multiplier_dormant: "30",
  l3_multiplier_suspended: "0",
  // L3 — income
  l3_override_rate: "10",
  l3_bonus_region_threshold: "2000",
  l3_bonus_region_amount: "2000000",
  l3_bonus_annual_threshold: "5000",
  l3_bonus_annual_amount: "10000000",
  l3_bonus_growth_pct: "10",
  l3_bonus_growth_amount: "1000000",
  l3_promo_bonus_per_l2_promoted: "3000000",
  // Tenure clock
  l1_l2_tenure_years: "3",
  l1_l2_graduation_warning_months: "12",
  l2_l3_graduation_warning_months: "12",
  tenure_clock_applies_to_existing: "false",
  // Shared payout
  payout_minimum_threshold: "50000",
  pph21_threshold: "4500000",
  payout_dispute_window_days: "7",
  // Platform / code lifecycle
  code_unused_expiry_days: "90",
  lifetime_duo_window_hours: "48",
  grace_period_days: "3",
  // Subscription durations (days)
  duration_weekly_days: "7",
  duration_monthly_days: "30",
  duration_annual_days: "365",
};

const DAY = 86400000;

/** Snapshot price (IDR BigInt) for a tier, mirroring params.tierPriceKey. */
function seedTierPrice(
  tier: "daily" | "weekly" | "monthly" | "annual" | "lifetime",
  lifetimeKind?: "solo" | "duo",
): bigint {
  const key =
    tier === "lifetime"
      ? lifetimeKind === "duo"
        ? "price_lifetime_duo"
        : "price_lifetime_solo"
      : `price_${tier}`;
  return BigInt(PARAMS[key] ?? "0");
}

/**
 * Dev-only: grant an admin role to an already-signed-up Convex Auth user.
 * Run AFTER creating the account on the login screen, e.g.
 *   npx convex run seed:grantAdmin '{"email":"you@ayo.id","role":"super_admin","name":"You"}'
 */
export const grantAdmin = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("finance_admin"),
      v.literal("ops_admin"),
    ),
    name: v.string(),
  },
  handler: async (ctx, { email, role, name }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (!user)
      throw new Error(
        `Tidak ada user dengan email ${email}. Buat akun dulu di halaman login.`,
      );
    const existing = await ctx.db
      .query("adminProfiles")
      .withIndex("by_user", (q) => q.eq("authUserId", user._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role, name });
      return { updated: existing._id };
    }
    const id = await ctx.db.insert("adminProfiles", {
      authUserId: user._id,
      role,
      name,
    });
    return { created: id };
  },
});

/**
 * Non-destructive parameter seed. Inserts every PARAMS key (prices + business
 * values) that is missing as a global row effective from epoch, and leaves any
 * existing rows — including manual price overrides — untouched. Safe to run on a
 * live deployment whose systemParameters table is empty or partially populated.
 */
export const seedParameters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("systemParameters").collect();
    const known = new Set(existing.filter((r) => !r.regionId).map((r) => r.key));
    const inserted: string[] = [];
    for (const [key, value] of Object.entries(PARAMS)) {
      if (known.has(key)) continue;
      await ctx.db.insert("systemParameters", { key, value, effectiveAt: 0 });
      inserted.push(key);
    }
    return { inserted, skipped: known.size, total: Object.keys(PARAMS).length };
  },
});

/** Seed parameters + regions + demo agents/codes/licenses/ledger. Idempotent. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Clear demo/business tables (never touches users/adminProfiles).
    for (const table of [
      "systemParameters",
      "regions",
      "agents",
      "licenses",
      "subscriptionCodes",
      "commissionLedger",
      "agentTeamMemberships",
      "notifications",
      "agentKpiSnapshots",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }

    // Parameters (global, effective from epoch).
    for (const [key, value] of Object.entries(PARAMS)) {
      await ctx.db.insert("systemParameters", { key, value, effectiveAt: 0 });
    }

    // Regions
    const regionDefs = [
      { name: "DKI Jakarta", code: "JKT" },
      { name: "Surabaya", code: "SBY" },
      { name: "Bandung", code: "BDG" },
    ];
    const regions: Id<"regions">[] = [];
    for (const r of regionDefs) regions.push(await ctx.db.insert("regions", r));
    const [JKT, SBY, BDG] = regions;

    const now = Date.now();

    // Agents — mix of levels and statuses across regions.
    const agentDefs: {
      name: string;
      phone: string;
      level: number;
      status: "probation" | "active" | "dormant" | "inactive" | "suspended";
      region: Id<"regions">;
      enrolledDaysAgo: number;
      feePaid?: boolean;
      escrow?: number;
      lastActiveDaysAgo?: number;
    }[] = [
      { name: "Budi Santoso", phone: "081200000001", level: 2, status: "active", region: JKT, enrolledDaysAgo: 540, feePaid: true, lastActiveDaysAgo: 1 },
      { name: "Siti Rahayu", phone: "081200000002", level: 2, status: "active", region: SBY, enrolledDaysAgo: 480, feePaid: true, lastActiveDaysAgo: 2 },
      { name: "Agus Wijaya", phone: "081200000003", level: 3, status: "active", region: JKT, enrolledDaysAgo: 720, feePaid: true, lastActiveDaysAgo: 3 },
      { name: "Dewi Lestari", phone: "081200000004", level: 1, status: "active", region: JKT, enrolledDaysAgo: 220, feePaid: true, lastActiveDaysAgo: 1 },
      { name: "Eko Prasetyo", phone: "081200000005", level: 1, status: "active", region: SBY, enrolledDaysAgo: 200, feePaid: true, lastActiveDaysAgo: 4 },
      { name: "Fitri Handayani", phone: "081200000006", level: 1, status: "dormant", region: BDG, enrolledDaysAgo: 300, feePaid: true, lastActiveDaysAgo: 40 },
      { name: "Gunawan Saputra", phone: "081200000007", level: 1, status: "active", region: BDG, enrolledDaysAgo: 150, feePaid: true, lastActiveDaysAgo: 2 },
      { name: "Hesti Kurnia", phone: "081200000008", level: 1, status: "probation", region: JKT, enrolledDaysAgo: 20, escrow: 180000 },
      { name: "Indra Permana", phone: "081200000009", level: 1, status: "probation", region: SBY, enrolledDaysAgo: 12, escrow: 90000 },
      { name: "Joko Susilo", phone: "081200000010", level: 1, status: "inactive", region: BDG, enrolledDaysAgo: 410, feePaid: true, lastActiveDaysAgo: 120 },
      { name: "Kartika Sari", phone: "081200000011", level: 1, status: "active", region: JKT, enrolledDaysAgo: 95, feePaid: true, lastActiveDaysAgo: 1 },
      { name: "Lukman Hakim", phone: "081200000012", level: 1, status: "suspended", region: SBY, enrolledDaysAgo: 260, feePaid: true, lastActiveDaysAgo: 70 },
      { name: "Maya Anggraini", phone: "081200000013", level: 1, status: "active", region: BDG, enrolledDaysAgo: 70, feePaid: true, lastActiveDaysAgo: 3 },
      { name: "Nanda Pratama", phone: "081200000014", level: 1, status: "dormant", region: JKT, enrolledDaysAgo: 180, feePaid: true, lastActiveDaysAgo: 35 },
      { name: "Oka Mahendra", phone: "081200000015", level: 1, status: "probation", region: BDG, enrolledDaysAgo: 5, escrow: 30000 },
    ];

    const agentIds: Id<"agents">[] = [];
    for (const a of agentDefs) {
      const id = await ctx.db.insert("agents", {
        name: a.name,
        phone: a.phone,
        level: a.level,
        status: a.status,
        regionId: a.region,
        enrolledAt: now - a.enrolledDaysAgo * DAY,
        feePaidAt: a.feePaid ? now - (a.enrolledDaysAgo - 90) * DAY : undefined,
        escrowAmount: BigInt(a.escrow ?? 0),
        lastActiveAt:
          a.lastActiveDaysAgo !== undefined
            ? now - a.lastActiveDaysAgo * DAY
            : undefined,
        suspendedAt: a.status === "suspended" ? now - 70 * DAY : undefined,
      });
      agentIds.push(id);
    }

    // Licenses (merchants) — distributed across L1 agents.
    const tierPool: ("monthly" | "annual" | "lifetime")[] = [
      "monthly",
      "monthly",
      "monthly",
      "annual",
      "lifetime",
    ];
    let licCounter = 0;
    const l1Agents = agentDefs
      .map((a, i) => ({ ...a, id: agentIds[i] }))
      .filter((a) => a.level === 1 && a.status !== "probation");
    for (const a of l1Agents) {
      const count =
        a.status === "active" ? 6 : a.status === "dormant" ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const tier = tierPool[(licCounter + i) % tierPool.length];
        const activatedAt = now - ((i * 13) % 85) * DAY;
        await ctx.db.insert("licenses", {
          deviceId: `dev-${a.phone}-${i}`,
          agentId: a.id,
          tier,
          activatedAt,
          expiresAt:
            tier === "lifetime"
              ? undefined
              : activatedAt + (tier === "annual" ? 365 : 30) * DAY,
          creditDays: 0,
          gracePeriodDays: 3,
          status: "active",
          regionId: a.region,
          priceIDR: seedTierPrice(tier),
        });
      }
      licCounter += count;
    }

    // Commission ledger — L1 residuals/closings for agents with merchants.
    const typePool: ("l1_residual" | "l1_closing")[] = [
      "l1_residual",
      "l1_closing",
    ];
    for (const a of l1Agents) {
      const entries = a.status === "active" ? 5 : a.status === "dormant" ? 2 : 1;
      for (let i = 0; i < entries; i++) {
        await ctx.db.insert("commissionLedger", {
          agentId: a.id,
          type: typePool[i % 2],
          amount: BigInt([27600, 150000, 20700, 13800, 100000][i % 5]),
          status: i === 0 ? "pending" : "settled",
        });
      }
    }

    // Subscription codes — mixed statuses + a retail batch.
    const codeRows = [
      { tier: "monthly" as const, channel: "agent" as const, status: "unused" as const, agent: agentIds[3], region: JKT },
      { tier: "annual" as const, channel: "agent" as const, status: "active" as const, agent: agentIds[4], region: SBY },
      { tier: "lifetime" as const, lifetimeKind: "solo" as const, channel: "agent" as const, status: "unused" as const, agent: agentIds[0], region: JKT },
      { tier: "monthly" as const, channel: "self_serve" as const, status: "expired" as const, region: BDG },
      { tier: "weekly" as const, channel: "self_serve" as const, status: "unused" as const, region: JKT },
      { tier: "monthly" as const, channel: "retail" as const, status: "unused" as const, region: SBY, batch: "RETAIL-2026-06" },
      { tier: "monthly" as const, channel: "retail" as const, status: "unused" as const, region: SBY, batch: "RETAIL-2026-06" },
      { tier: "annual" as const, channel: "retail" as const, status: "revoked" as const, region: SBY, batch: "RETAIL-2026-06", reason: "Cetak ganda" },
    ];
    let codeSeq = 1000;
    for (const c of codeRows) {
      const block = (codeSeq++).toString().padStart(5, "0");
      await ctx.db.insert("subscriptionCodes", {
        code: `SM-DEMO-${block.slice(0, 4)}-${block}`,
        tier: c.tier,
        lifetimeKind: "lifetimeKind" in c ? c.lifetimeKind : undefined,
        channel: c.channel,
        status: c.status,
        agentId: "agent" in c ? c.agent : undefined,
        batchId: "batch" in c ? c.batch : undefined,
        regionId: c.region,
        expiresUnusedAt: now + 90 * DAY,
        revokedReason: "reason" in c ? c.reason : undefined,
        activatedAt: c.status === "active" ? now - 10 * DAY : undefined,
        priceIDR: seedTierPrice(
          c.tier,
          "lifetimeKind" in c ? c.lifetimeKind : undefined,
        ),
      });
    }

    return {
      parameters: Object.keys(PARAMS).length,
      regions: regions.length,
      agents: agentIds.length,
    };
  },
});
