import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, query } from "./_generated/server";
import { requireL1 } from "./lib/authz";
import { periodOf } from "./lib/period";

// §38.4 national leaderboard, current month only.
//
// Ranked on verified new sales — the same basis as the dashboard chart, so the
// two numbers on one screen can never disagree. Nothing is stored: the rank is
// a single indexed read of this month's ledger, and it resets by itself when
// the calendar month changes.

function initials(name: string | undefined | null): string | null {
  if (!name) return null;
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

async function l2Initials(
  ctx: QueryCtx,
  l1s: Doc<"users">[],
): Promise<Map<Id<"users">, string | null>> {
  const ids = [
    ...new Set(l1s.map((l1) => l1.assignedL2Id).filter((id): id is Id<"users"> => !!id)),
  ];
  const out = new Map<Id<"users">, string | null>();
  for (const id of ids) {
    const l2 = await ctx.db.get("users", id);
    out.set(id, initials(l2?.name));
  }
  return out;
}

export const month = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const me = await requireL1(ctx);
    const period = periodOf(args.now);

    const lines = await ctx.db
      .query("earningLines")
      .withIndex("by_period", (q) => q.eq("period", period))
      .collect();

    const sold = new Map<Id<"users">, number>();
    for (const line of lines) {
      if (line.type !== "NEW_SALES") continue;
      if (line.status !== "CONFIRMED" || line.frozen || line.settledToCompany) continue;
      sold.set(line.l1Id, (sold.get(line.l1Id) ?? 0) + 1);
    }

    const agents = await ctx.db
      .query("users")
      .withIndex("by_role_status", (q) => q.eq("role", "L1").eq("status", "ACTIVE"))
      .collect();
    const suffixes = await l2Initials(ctx, agents);

    const sorted = agents
      .map((agent) => ({
        userId: agent._id,
        name: agent.name ?? "",
        l2: agent.assignedL2Id ? (suffixes.get(agent.assignedL2Id) ?? null) : null,
        sold: sold.get(agent._id) ?? 0,
      }))
      .sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name, "id"));

    // Ties share a rank; the next one skips. Ten rows still means ten people.
    let lastSold = -1;
    let lastRank = 0;
    const ranked = sorted.map((row, index) => {
      const rank = row.sold === lastSold ? lastRank : index + 1;
      lastSold = row.sold;
      lastRank = rank;
      return { ...row, rank };
    });

    const strip = (row: (typeof ranked)[number]) => ({
      rank: row.rank,
      name: row.name,
      l2: row.l2,
      sold: row.sold,
      isMe: row.userId === me._id,
    });

    const selfRow = ranked.find((row) => row.userId === me._id) ?? null;

    return {
      period,
      totalAgents: ranked.length,
      top10: ranked.slice(0, 10).map(strip),
      self: selfRow ? strip(selfRow) : null,
      selfInTop10: ranked.slice(0, 10).some((row) => row.userId === me._id),
    };
  },
});
