import { QueryCtx, MutationCtx, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

/**
 * Salesperson (agent) identity for the Agent Portal. The Password auth provider
 * is shared with the Admin Console — what distinguishes an agent from an admin
 * is which profile table the auth user is linked to. A user is one OR the other,
 * never both: `getCurrentAdmin` resolves against `adminProfiles`, this resolves
 * against `agents.authUserId`.
 */
export async function getCurrentAgent(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"agents"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("agents")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", userId))
    .unique();
}

/** Throw unless the current user is a registered salesperson. */
export async function requireAgent(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"agents">> {
  const agent = await getCurrentAgent(ctx);
  if (!agent) throw new Error("Tidak diizinkan: akun salesperson diperlukan.");
  return agent;
}

/** Current agent profile for the signed-in user (for the portal shell). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getCurrentAgent(ctx);
    if (!agent) return null;
    const region = await ctx.db.get(agent.regionId);
    return {
      _id: agent._id,
      name: agent.name,
      phone: agent.phone,
      level: agent.level,
      status: agent.status,
      regionCode: region?.code ?? "—",
      regionName: region?.name ?? "—",
    };
  },
});
