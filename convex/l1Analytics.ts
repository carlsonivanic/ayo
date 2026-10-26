import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireL1 } from "./lib/authz";
import { DAY_MS, formatDate, fromParts, parts, periodOf, shiftPeriod } from "./lib/period";

// §38 dashboard charts. Two series on one screen:
//   bars  = how many units sold, per package
//   area  = what those sales paid the agent, per earning type
//
// Only verified money counts. A sale whose receipt is still waiting for an
// admin (PENDING) or that is frozen is not drawn — the chart must never claim
// more than the payout ledger would pay.

const PLAN_KEYS = ["MONTHLY", "YEARLY", "LIFETIME_SINGLE", "LIFETIME_DUO"] as const;
const TYPES = ["NEW_SALES", "RECURRING", "RENEWAL_INCENTIVE"] as const;

type PlanKey = (typeof PLAN_KEYS)[number];
type EarningType = (typeof TYPES)[number];

type Bucket = {
  key: string;
  units: Record<PlanKey, number>;
  commission: Record<EarningType, number>;
};

function emptyBucket(key: string): Bucket {
  return {
    key,
    units: { MONTHLY: 0, YEARLY: 0, LIFETIME_SINGLE: 0, LIFETIME_DUO: 0 },
    commission: { NEW_SALES: 0, RECURRING: 0, RENEWAL_INCENTIVE: 0 },
  };
}

/** Verified = what a payout would actually carry (§11.8). */
function verified(line: Doc<"earningLines">): boolean {
  return line.status === "CONFIRMED" && !line.frozen && !line.settledToCompany;
}

export const mix = query({
  args: {
    now: v.number(),
    range: v.union(v.literal("30d"), v.literal("12m")),
  },
  handler: async (ctx, args) => {
    const l1 = await requireL1(ctx);
    const plans = await ctx.db.query("productPlans").collect();
    const byPlan = new Map<string, PlanKey>();
    for (const plan of plans) {
      if ((PLAN_KEYS as readonly string[]).includes(plan.key)) {
        byPlan.set(plan._id, plan.key as PlanKey);
      }
    }

    let buckets: Bucket[];
    let lines: Doc<"earningLines">[];

    if (args.range === "30d") {
      const today = parts(args.now);
      const start = fromParts(today.year, today.month, today.day);
      const from = start - 29 * DAY_MS;
      const to = start + DAY_MS;

      buckets = Array.from({ length: 30 }, (_, i) => emptyBucket(formatDate(from + i * DAY_MS)));
      const index = new Map(buckets.map((b) => [b.key, b]));
      lines = await ctx.db
        .query("earningLines")
        .withIndex("by_l1_date", (q) => q.eq("l1Id", l1._id).gte("date", from).lt("date", to))
        .collect();
      // A line's date is the event time; the bucket is its Jakarta day.
      for (const line of lines) {
        if (!verified(line)) continue;
        const bucket = index.get(formatDate(line.date));
        if (!bucket) continue;
        add(bucket, line, byPlan);
      }
    } else {
      const current = periodOf(args.now);
      const periods = Array.from({ length: 12 }, (_, i) => shiftPeriod(current, i - 11));
      buckets = periods.map((period) => emptyBucket(period));
      const index = new Map(buckets.map((b) => [b.key, b]));
      lines = [];
      for (const period of periods) {
        const rows = await ctx.db
          .query("earningLines")
          .withIndex("by_l1_period", (q) => q.eq("l1Id", l1._id).eq("period", period))
          .collect();
        lines.push(...rows);
        const bucket = index.get(period)!;
        for (const line of rows) {
          if (!verified(line)) continue;
          add(bucket, line, byPlan);
        }
      }
    }

    const unitTotal = buckets.reduce(
      (sum, b) => sum + PLAN_KEYS.reduce((s, key) => s + b.units[key], 0),
      0,
    );
    const commissionTotal = buckets.reduce(
      (sum, b) => sum + TYPES.reduce((s, key) => s + b.commission[key], 0),
      0,
    );

    return {
      range: args.range,
      buckets,
      unitTotal,
      commissionTotal,
      plans: plans
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({ key: p.key, name: p.name })),
    };
  },
});

function add(
  bucket: Bucket,
  line: Doc<"earningLines">,
  byPlan: Map<string, PlanKey>,
) {
  if (line.type === "NEW_SALES" && line.planId) {
    const key = byPlan.get(line.planId);
    if (key) bucket.units[key] += 1;
  }
  if ((TYPES as readonly string[]).includes(line.type)) {
    bucket.commission[line.type as EarningType] += line.amount;
  }
}
