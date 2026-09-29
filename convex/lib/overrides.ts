import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { SchemeSettings } from "./settings";

// Per-agent commission overrides. Everything that books or previews commission
// resolves rates through here, so an agent on a special agreement sees and is
// paid the same number. No row, an inactive row, or an empty field all mean
// "follow global".

export type CommissionOverride = Doc<"commissionOverrides">;

const PLAN_KEYS = [
  "y1Percent",
  "y2Percent",
  "y3Percent",
  "y4PlusPercent",
  "oneTimePercent",
] as const;

const L2_KEYS = ["basePercent", "decayM7_18", "decayM19_30", "decayM31_42"] as const;

export async function findOverride(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CommissionOverride | null> {
  return await ctx.db
    .query("commissionOverrides")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** The override in force for an agent, or null when they follow global. */
export async function activeOverride(
  ctx: QueryCtx,
  userId: Id<"users"> | undefined,
): Promise<CommissionOverride | null> {
  if (!userId) return null;
  const row = await findOverride(ctx, userId);
  return row?.active ? row : null;
}

/** The plan with this agent's percentages swapped in. */
export function applyPlanOverride(
  plan: Doc<"productPlans">,
  override: CommissionOverride | null,
): Doc<"productPlans"> {
  const entry = override?.plans.find((p) => p.planId === plan._id);
  if (!entry) return plan;
  const rated = { ...plan };
  for (const key of PLAN_KEYS) {
    const value = entry[key];
    if (value !== undefined) rated[key] = value;
  }
  return rated;
}

/** Settings with this L2's fee and decay swapped in. `startMonth` stays global. */
export function applyL2Override(
  settings: SchemeSettings,
  override: CommissionOverride | null,
): SchemeSettings {
  if (!override?.l2) return settings;
  const l2 = { ...settings.l2 };
  for (const key of L2_KEYS) {
    const value = override.l2[key];
    if (value !== undefined) l2[key] = value;
  }
  return { ...settings, l2 };
}

export function renewalIncentivePercentFor(
  settings: SchemeSettings,
  override: CommissionOverride | null,
): number {
  return override?.renewalIncentivePercent ?? settings.renewalIncentivePercent;
}

export async function planForAgent(
  ctx: QueryCtx,
  userId: Id<"users"> | undefined,
  plan: Doc<"productPlans">,
): Promise<Doc<"productPlans">> {
  return applyPlanOverride(plan, await activeOverride(ctx, userId));
}

export async function settingsForL2(
  ctx: QueryCtx,
  l2Id: Id<"users">,
  settings: SchemeSettings,
): Promise<SchemeSettings> {
  return applyL2Override(settings, await activeOverride(ctx, l2Id));
}
