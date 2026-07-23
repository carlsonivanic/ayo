import {
  query,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admins";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const regions = await ctx.db.query("regions").collect();
    return regions
      .map((r) => ({ _id: r._id, name: r.name, code: r.code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Public — no auth required. Used by the self-registration form. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const regions = await ctx.db.query("regions").collect();
    return regions
      .map((r) => ({ _id: r._id, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * The canonical fallback region. Prefers the seeded "JKT" (Jakarta) row, else
 * the first region by name. Used by `ensureRegion` when no hint is available
 * and by admin code-generation (where there is no end-user to geo-locate).
 */
export async function defaultRegionId(
  ctx: MutationCtx,
): Promise<Id<"regions">> {
  const jkt = await ctx.db
    .query("regions")
    .withIndex("by_code", (q) => q.eq("code", "JKT"))
    .unique();
  if (jkt) return jkt._id;
  const first = await ctx.db.query("regions").order("asc").first();
  if (first) return first._id;
  // No regions at all — create a single fallback so the schema's non-optional
  // regionId columns always have a valid target.
  return await ctx.db.insert("regions", { name: "Jakarta", code: "JKT" });
}

/**
 * Slugify a free-text hint (city/region from IP geo) into a stable `code`:
 * lowercase ASCII alphanumerics, accents stripped, whitespace → separator,
 * truncated to a short length. Non-alphanumeric (e.g. emoji) is dropped.
 */
function slugify(hint: string): string {
  return hint
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12)
    .trim();
}

/** Title-case a hint for the human-readable region `name`. */
function titleCase(hint: string): string {
  const clean = hint.replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  return clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Internal: find-or-create a region from a free-text hint (typically the city
 * returned by the client-side IP geo lookup). Idempotent: same hint always
 * resolves to the same region via the `by_code` index. On empty/invalid hint,
 * falls back to `defaultRegionId`. Never throws on bad input — registration
 * and invite redemption must not fail just because geo-lookup did.
 *
 * Only callable from other Convex functions (internal) — it is NOT exposed to
 * the client. It runs inside the already bot-defended `registerAgent` and
 * `acceptInvite` actions, so no separate rate limit is needed.
 */
export const ensureRegion = internalMutation({
  args: { hint: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"regions">> => {
    const hint = args.hint?.trim() ?? "";
    const code = slugify(hint);
    if (!code) return await defaultRegionId(ctx);

    const existing = await ctx.db
      .query("regions")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("regions", {
      name: titleCase(hint) || code.toUpperCase(),
      code,
    });
  },
});
