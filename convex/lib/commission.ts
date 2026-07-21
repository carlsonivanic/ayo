/**
 * Commission engine — pure compute core.
 *
 * Single source of truth for "what does this license activation pay out". No DB
 * writes here: callers (activation hook, backfill) insert the returned entries.
 * All money is BigInt IDR via `pctOf` — never floats.
 *
 * Design (see AYO PRD + INIT_PROMPT):
 *   - L1 (seller) earns either a flat closing fee (lifetime tiers) or a residual
 *     percentage (monthly/annual). Daily/weekly are self-serve-only and excluded.
 *   - L2 (the seller's upline leader, if any) earns an override = a % of the L1
 *     commission, multiplied by the L2's own KPI status multiplier.
 *   - L3 (the L2's upline regional, if any) earns an override the same way.
 *   - Seller status reduces the L1 cut (and therefore the overrides that derive
 *     from it): dormant 50%, inactive 25%, suspended 0%. Probation earns full.
 *
 * All entries are written `pending` (accrual model: due immediately, settled only
 * when a payout run stamps them). `multiplierPct` is recorded on every entry for
 * audit so reports can re-derive the hold/reduction later.
 */
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { getParamNumber } from "../params";
import { pctOf } from "./money";

/** The shape of a commissionLedger row we intend to insert. */
export type NewLedgerEntry = {
  agentId: Id<"agents">;
  licenseId: Id<"licenses">;
  type:
    | "l1_residual"
    | "l1_closing"
    | "l2_override"
    | "l3_override";
  amount: bigint;
  periodStart: string;
  periodEnd: string;
  multiplierPct: number;
  status: "pending";
};

/** Resolved upline of the selling L1, walked from `referrerId`. */
export type Upline = {
  l1: Doc<"agents">;
  l2: Doc<"agents"> | null;
  l3: Doc<"agents"> | null;
};

const MAX_HOPS = 3;

/**
 * Walk the `referrerId` chain from the seller up to 3 hops, returning the L1
 * (seller), L2 (immediate qualified upline), and L3 (regional upline).
 *
 * Guards:
 *   - Cycle detection (visited set) — a malformed chain never loops forever.
 *   - Level gating: a hop only qualifies as an upline if its level is strictly
 *     higher than the previous qualified node. Peer/self referrals (L1→L1) are
 *     skipped — they earn nothing but do not break the walk.
 *   - Missing referrer short-circuits to "no further upline".
 */
export async function resolveUpline(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<Upline> {
  const l1 = await ctx.db.get(agentId);
  if (!l1) throw new Error("agent not found");

  let l2: Doc<"agents"> | null = null;
  let l3: Doc<"agents"> | null = null;
  const visited = new Set<string>([agentId]);

  let cursor: Id<"agents"> | undefined = l1.referrerId;
  let lastQualifiedLevel = l1.level;

  for (let hop = 0; hop < MAX_HOPS && cursor; hop++) {
    if (visited.has(cursor)) break; // cycle guard
    visited.add(cursor);
    const node = await ctx.db.get(cursor);
    if (!node) break;

    // L2 slot: the first hop whose level is at least 2 AND strictly above the
    // seller's level. (An L2 referring another L2 doesn't become that L2's L2.)
    if (!l2 && node.level >= 2 && node.level > lastQualifiedLevel) {
      l2 = node;
      lastQualifiedLevel = node.level;
    } else if (l2 && !l3 && node.level === 3 && node.level > lastQualifiedLevel) {
      // L3 slot: only level-3 nodes beyond the L2 qualify.
      l3 = node;
      lastQualifiedLevel = node.level;
      break; // can't go higher than L3
    }

    cursor = node.referrerId;
  }

  return { l1, l2, l3 };
}

/**
 * The seller's status multiplier on their OWN residual/closing commission.
 * Returns a fraction in [0,1]: 1 = full, 0.5 = dormant, 0.25 = inactive, 0 = suspended.
 * Probation and active earn full (1). Missing params fall back to sensible defaults.
 */
async function sellerStatusFraction(
  ctx: QueryCtx | MutationCtx,
  status: Doc<"agents">["status"],
  regionId: Id<"regions">,
): Promise<number> {
  switch (status) {
    case "suspended":
      return 0;
    case "inactive":
      return (await getParamNumber(ctx, "l1_inactive_residual_pct", regionId)) ?? 25;
    case "dormant":
      return (await getParamNumber(ctx, "l1_dormant_residual_pct", regionId)) ?? 50;
    case "probation":
    case "active":
    default:
      return 100;
  }
}

/**
 * An upline's (L2/L3) own KPI status multiplier, in [0,100]. Reads the most
 * recent `agentKpiSnapshots` row's `multiplierPct` if present; otherwise defaults
 * to 100 (treated as active until a snapshot exists). The KPI-evaluation job
 * that writes those snapshots is out of scope for this remake.
 */
export async function uplineMultiplier(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
): Promise<number> {
  const snap = await ctx.db
    .query("agentKpiSnapshots")
    .withIndex("by_agent", (q) => q.eq("agentId", agentId))
    .order("desc")
    .first();
  if (snap?.multiplierPct !== undefined && snap.multiplierPct >= 0) {
    return snap.multiplierPct;
  }
  return 100;
}

/** "YYYY-MM-DD" for the first day of the month containing `ms`. */
function monthStart(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "YYYY-MM-DD" for the last day of the month containing `ms`. */
function monthEnd(ms: number): string {
  const d = new Date(ms);
  // day 0 of next month = last day of this month
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** Inputs to `computeCommissionEntries` — minimal slices of the source docs. */
export type ComputeInput = {
  licenseId: Id<"licenses">;
  tier: "daily" | "weekly" | "monthly" | "annual" | "lifetime";
  priceIDR: bigint;
  regionId: Id<"regions">;
  activatedAt: number;
  lifetimeKind?: "solo" | "duo";
};

/**
 * Compute every commission ledger entry generated by a single license
 * activation. Pure: returns the entries, caller inserts. Returns an empty array
 * when the sale earns nothing (e.g. suspended seller, zero price, daily tier).
 *
 * Composition:
 *   l1Amount = (tierClosing? flat : pctOf(price, residualPct)) * sellerFraction
 *   l2Amount = pctOf(l1Amount, l2OverrideRate) * (l2Multiplier / 100)
 *   l3Amount = pctOf(l1Amount, l3OverrideRate) * (l3Multiplier / 100)
 */
export async function computeCommissionEntries(
  ctx: QueryCtx | MutationCtx,
  upline: Upline,
  sale: ComputeInput,
): Promise<NewLedgerEntry[]> {
  const entries: NewLedgerEntry[] = [];
  const periodStart = monthStart(sale.activatedAt);
  const periodEnd = monthEnd(sale.activatedAt);
  const { l1 } = upline;

  // 1) Determine the base L1 commission (before seller-status reduction).
  let type: "l1_residual" | "l1_closing";
  let baseAmount: bigint;
  if (sale.tier === "lifetime") {
    const flat =
      sale.lifetimeKind === "duo"
        ? ((await getParamNumber(ctx, "l1_lifetime_duo_commission", sale.regionId)) ?? 700000)
        : ((await getParamNumber(ctx, "l1_lifetime_solo_commission", sale.regionId)) ?? 500000);
    type = "l1_closing";
    baseAmount = BigInt(Math.round(flat));
  } else if (sale.tier === "monthly" || sale.tier === "annual") {
    const key =
      sale.tier === "monthly" ? "l1_monthly_commission_y1_pct" : "l1_annual_commission_y1_pct";
    const def = sale.tier === "monthly" ? 40 : 30;
    const pct = (await getParamNumber(ctx, key, sale.regionId)) ?? def;
    type = "l1_residual";
    baseAmount = pctOf(sale.priceIDR, pct);
  } else {
    // daily/weekly — no L1 commission (self-serve tiers).
    return entries;
  }

  // 2) Apply seller status fraction.
  const sellerPct = await sellerStatusFraction(ctx, l1.status, sale.regionId);
  const sellerMultiplier = Math.round(sellerPct); // 0..100
  const l1Amount = (baseAmount * BigInt(sellerMultiplier)) / 100n;

  // Seller earning nothing (suspended, or zero price) → no entries at all,
  // including overrides (overrides never pay on a zero-commission sale).
  if (l1Amount <= 0n) return entries;

  entries.push({
    agentId: l1._id,
    licenseId: sale.licenseId,
    type,
    amount: l1Amount,
    periodStart,
    periodEnd,
    multiplierPct: sellerMultiplier,
    status: "pending",
  });

  // 3) L2 override: only if L2 upline resolved.
  if (upline.l2) {
    const rate = (await getParamNumber(ctx, "l2_override_rate", sale.regionId)) ?? 15;
    const mult = await uplineMultiplier(ctx, upline.l2._id);
    if (mult > 0 && rate > 0) {
      const base = pctOf(l1Amount, rate);
      const amount = (base * BigInt(Math.round(mult))) / 100n;
      if (amount > 0n) {
        entries.push({
          agentId: upline.l2._id,
          licenseId: sale.licenseId,
          type: "l2_override",
          amount,
          periodStart,
          periodEnd,
          multiplierPct: Math.round(mult),
          status: "pending",
        });
      }
    }
  }

  // 4) L3 override: only if L3 upline resolved.
  if (upline.l3) {
    const rate = (await getParamNumber(ctx, "l3_override_rate", sale.regionId)) ?? 10;
    const mult = await uplineMultiplier(ctx, upline.l3._id);
    if (mult > 0 && rate > 0) {
      const base = pctOf(l1Amount, rate);
      const amount = (base * BigInt(Math.round(mult))) / 100n;
      if (amount > 0n) {
        entries.push({
          agentId: upline.l3._id,
          licenseId: sale.licenseId,
          type: "l3_override",
          amount,
          periodStart,
          periodEnd,
          multiplierPct: Math.round(mult),
          status: "pending",
        });
      }
    }
  }

  return entries;
}
