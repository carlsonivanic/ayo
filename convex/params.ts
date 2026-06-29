import { QueryCtx, MutationCtx, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./admins";

/**
 * Effective value for key+region: region-specific override wins, else global
 * default, taking the latest row with effectiveAt <= now. Mirrors INIT_PROMPT
 * §"Parameter Service". Never read parameter values from application constants.
 */
export async function getParam(
  ctx: QueryCtx | MutationCtx,
  key: string,
  regionId?: Id<"regions">,
): Promise<string | undefined> {
  const now = Date.now();

  if (regionId) {
    const regional = await ctx.db
      .query("systemParameters")
      .withIndex("by_key_region", (q) =>
        q.eq("key", key).eq("regionId", regionId),
      )
      .order("desc")
      .filter((q) => q.lte(q.field("effectiveAt"), now))
      .first();
    if (regional) return regional.value;
  }

  const global = await ctx.db
    .query("systemParameters")
    .withIndex("by_key_region", (q) => q.eq("key", key).eq("regionId", undefined))
    .order("desc")
    .filter((q) => q.lte(q.field("effectiveAt"), now))
    .first();
  return global?.value;
}

export async function getParamNumber(
  ctx: QueryCtx | MutationCtx,
  key: string,
  regionId?: Id<"regions">,
): Promise<number | undefined> {
  const raw = await getParam(ctx, key, regionId);
  if (raw === undefined) return undefined;
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

export type PricedTier = "daily" | "weekly" | "monthly" | "annual" | "lifetime";

/**
 * The systemParameters key holding the list price for a tier. Lifetime splits
 * into solo/duo; the other tiers map directly to `price_<tier>`.
 */
export function tierPriceKey(
  tier: PricedTier,
  lifetimeKind?: "solo" | "duo",
): string {
  if (tier === "lifetime") {
    return lifetimeKind === "duo" ? "price_lifetime_duo" : "price_lifetime_solo";
  }
  return `price_${tier}`;
}

/**
 * Effective list price (IDR, BigInt) for a tier at issuance time. Falls back to
 * 0 when no parameter is configured — a missing price should never throw and
 * silently corrupt a sale; it surfaces as Rp 0 in history instead.
 */
export async function getTierPriceIDR(
  ctx: QueryCtx | MutationCtx,
  tier: PricedTier,
  lifetimeKind?: "solo" | "duo",
  regionId?: Id<"regions">,
): Promise<bigint> {
  const n = await getParamNumber(ctx, tierPriceKey(tier, lifetimeKind), regionId);
  return BigInt(Math.round(n ?? 0));
}

/**
 * Duration in days for a given tier. Daily uses the creditDays system (returns
 * 1 credit per activation); lifetime returns undefined (no expiry). Monthly and
 * annual fall back to 30/365 if params are absent.
 */
export async function getTierDurationDays(
  ctx: QueryCtx | MutationCtx,
  tier: PricedTier,
  regionId?: Id<"regions">,
): Promise<number | undefined> {
  switch (tier) {
    case "daily":
      return 1;
    case "weekly":
      return (await getParamNumber(ctx, "duration_weekly_days", regionId)) ?? 7;
    case "monthly":
      return (await getParamNumber(ctx, "duration_monthly_days", regionId)) ?? 30;
    case "annual":
      return (await getParamNumber(ctx, "duration_annual_days", regionId)) ?? 365;
    case "lifetime":
      return undefined;
  }
}

/**
 * Current effective list prices for every sellable tier — the single source the
 * code-generation UI renders, so prices are never hardcoded in the frontend.
 */
export const tierPrices = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const num = (key: string) => getParamNumber(ctx, key);
    return {
      daily: (await num("price_daily")) ?? 0,
      weekly: (await num("price_weekly")) ?? 0,
      monthly: (await num("price_monthly")) ?? 0,
      annual: (await num("price_annual")) ?? 0,
      lifetime_solo: (await num("price_lifetime_solo")) ?? 0,
      lifetime_duo: (await num("price_lifetime_duo")) ?? 0,
    };
  },
});

/**
 * Set a global parameter value (super_admin / finance_admin). Because the
 * registry is append-only and temporal, this INSERTS a new row rather than
 * mutating history: the new value becomes effective at `effectiveAt` (default
 * now). Pass a future timestamp to schedule a change ahead of time; the
 * effective-value reads above pick it up automatically once that time passes.
 */
export const setParam = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    effectiveAt: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { key, value, effectiveAt, note }) => {
    const admin = await requireAdmin(ctx, ["super_admin", "finance_admin"]);
    const trimmedKey = key.trim();
    if (!trimmedKey) throw new Error("Key tidak boleh kosong.");
    if (value.trim() === "") throw new Error("Nilai tidak boleh kosong.");
    await ctx.db.insert("systemParameters", {
      key: trimmedKey,
      value: value.trim(),
      effectiveAt: effectiveAt ?? Date.now(),
      createdBy: admin._id,
      note: note?.trim() || undefined,
    });
  },
});

/** List the current effective value of every global parameter (Settings screen). */
export const listEffective = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const all = await ctx.db.query("systemParameters").collect();
    // group by key, keep latest global effectiveAt <= now
    const latest = new Map<string, { value: string; effectiveAt: number; note?: string }>();
    for (const row of all) {
      if (row.regionId) continue; // global only on this screen (MVP)
      if (row.effectiveAt > now) continue;
      const cur = latest.get(row.key);
      if (!cur || row.effectiveAt > cur.effectiveAt) {
        latest.set(row.key, {
          value: row.value,
          effectiveAt: row.effectiveAt,
          note: row.note,
        });
      }
    }
    return [...latest.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.key.localeCompare(b.key));
  },
});
