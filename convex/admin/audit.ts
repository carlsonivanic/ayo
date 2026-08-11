import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/authz";

// §32 audit log.

export const list = query({
  args: { action: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.action
      ? await ctx.db
          .query("auditLogEntries")
          .withIndex("by_action", (q) => q.eq("action", args.action!))
          .order("desc")
          .take(args.limit ?? 100)
      : await ctx.db
          .query("auditLogEntries")
          .withIndex("by_timestamp")
          .order("desc")
          .take(args.limit ?? 100);

    return await Promise.all(
      rows.map(async (r) => ({
        id: r._id,
        timestamp: r.timestamp,
        admin: (await ctx.db.get("users", r.adminId))?.name ?? "",
        action: r.action,
        object: r.object,
        oldValue: r.oldValue ?? null,
        newValue: r.newValue ?? null,
        reason: r.reason ?? null,
      })),
    );
  },
});

export const actions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("auditLogEntries")
      .withIndex("by_timestamp")
      .order("desc")
      .take(500);
    return [...new Set(rows.map((r) => r.action))].sort();
  },
});
