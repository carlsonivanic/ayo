/**
 * DEV/TEST ONLY — authentication bypass.
 *
 * When the `TEST_BYPASS` environment variable is set to "true" on the Convex
 * deployment, every caller is treated as a single, stable super_admin (and
 * agent) — no sign-in required. This exists purely to make manual and
 * automated testing of the admin console frictionless.
 *
 * Safety:
 *   - The flag is read from the server environment (`process.env.TEST_BYPASS`),
 *     NOT from the client, so it cannot be toggled by a request — only by an
 *     operator with access to the deployment's env config.
 *   - It defaults to OFF. A prod deploy that never sets `TEST_BYPASS=true` is
 *     completely unaffected.
 *   - `seedProd` (the prod bootstrap) never sets this var.
 *
 * The bypass persists REAL rows (a real `users` document, real
 * `adminProfiles`, real `agents`, real `regions`) so every foreign key is a
 * valid Convex ID — no fake sentinel strings that would crash `db.get` or fail
 * `v.id()` validation. Rows are created lazily on first use and found via a
 * sentinel `email` / `phone` so repeated runs reuse the same row.
 *
 * Enable locally:
 *   npx convex env set TEST_BYPASS true
 * Disable:
 *   npx convex env set TEST_BYPASS false   (or remove it)
 */
import { QueryCtx, MutationCtx, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { defaultRegionId } from "./regions";

/** Sentinel email/phone that mark the bypass identities. Never a real login —
 *  the bypass user has no credential account, so it cannot be signed into. */
const TEST_EMAIL = "test-bypass@local";
const TEST_PHONE = "00000000000";

/** Type guard: true when `ctx` can write (MutationCtx), false for QueryCtx. */
function canWrite(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
  return (ctx as MutationCtx).db.insert !== undefined;
}

/** True only when the server-side TEST_BYPASS env var is literally "true". */
export function isTestBypassEnabled(_ctx?: QueryCtx | MutationCtx): boolean {
  return process.env.TEST_BYPASS === "true";
}

/**
 * Returns the persisted super_admin profile for the bypass user, creating it
 * (and its backing `users` row) lazily on first call. Returns null when the
 * bypass is disabled.
 *
 * Works in both query and mutation contexts. In a query context before the row
 * exists, we cannot insert — so we create the backing rows via a different
 * path: callers that need a guaranteed-real id should call from a mutation.
 * In practice the first mutation (e.g. navigating to a page that writes) will
 * materialize the rows; read-only pages handle a transient null gracefully by
 * falling through to the normal "not signed in" path.
 */
export async function testBypassAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"adminProfiles"> | null> {
  if (!isTestBypassEnabled()) return null;

  // Fast path: profile already exists.
  const existing = await findTestAdmin(ctx);
  if (existing) return existing;

  // Need to create it — only possible from a mutation context.
  if (!canWrite(ctx)) return null;
  const userId = await ensureTestUser(ctx);
  const regionId = await defaultRegionId(ctx);
  void regionId; // reserved for future agent-row needs
  const id = await ctx.db.insert("adminProfiles", {
    authUserId: userId,
    name: "Test Super Admin (bypass)",
    role: "super_admin",
  });
  return await ctx.db.get(id);
}

/** Same pattern for the agent identity path. */
export async function testBypassAgent(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"agents"> | null> {
  if (!isTestBypassEnabled()) return null;

  const existing = await findTestAgent(ctx);
  if (existing) return existing;

  if (!canWrite(ctx)) return null;
  const userId = await ensureTestUser(ctx);
  const regionId = await defaultRegionId(ctx);
  const id = await ctx.db.insert("agents", {
    authUserId: userId,
    name: "Test Agent (bypass)",
    phone: TEST_PHONE,
    level: 1,
    status: "active",
    regionId,
    escrowAmount: 0n,
    enrolledAt: Date.now(),
  });
  return await ctx.db.get(id);
}

/** Find the existing bypass admin profile via the `users` email index. */
async function findTestAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"adminProfiles"> | null> {
  const user = await findTestUser(ctx);
  if (!user) return null;
  return await ctx.db
    .query("adminProfiles")
    .withIndex("by_user", (q) => q.eq("authUserId", user._id))
    .unique();
}

/** Find the existing bypass agent via the `users` email index. */
async function findTestAgent(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"agents"> | null> {
  const user = await findTestUser(ctx);
  if (!user) return null;
  return await ctx.db
    .query("agents")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", user._id))
    .unique();
}

/** Find the backing bypass `users` row by its sentinel email. */
async function findTestUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", TEST_EMAIL))
    .unique();
}

/**
 * Find-or-create the backing `users` row for the bypass identity. Mutation
 * context required (caller has already checked canWrite). Idempotent via the
 * email index.
 */
async function ensureTestUser(ctx: MutationCtx): Promise<Id<"users">> {
  const existing = await findTestUser(ctx);
  if (existing) return existing._id;
  return await ctx.db.insert("users", {
    email: TEST_EMAIL,
    name: "Test Bypass User",
  });
}

/**
 * One-shot bootstrap: materialize the real bypass rows (users + adminProfiles +
 * agents) and delete any stale rows left by earlier broken versions of the
 * bypass that wrote invalid sentinel ids (e.g. "test-bypass-user"). Safe to
 * run repeatedly — idempotent via the email index lookups.
 *
 * Run via:  npx convex run testBypass:bootstrapTestBypass
 */
export const bootstrapTestBypass = mutation({
  args: {},
  handler: async (ctx) => {
    if (!isTestBypassEnabled()) {
      throw new Error("TEST_BYPASS is not enabled on the deployment.");
    }

    // 1) Sweep stale bypass rows with invalid (non-Convex) ids from older
    //    broken deploys. A real Convex id is a 22+ char base32-ish string;
    //    anything starting with "test-bypass-" is garbage to delete.
    for (const table of ["adminProfiles", "agents"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) {
        if (typeof r._id === "string" && r._id.startsWith("test-bypass-")) {
          await ctx.db.delete(r._id);
        }
      }
    }

    // 2) Ensure the real bypass rows exist.
    await testBypassAdmin(ctx);
    await testBypassAgent(ctx);

    return { ok: true };
  },
});
