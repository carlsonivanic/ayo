import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, requireViewer } from "./lib/authz";

// §28 — in-app only in the MVP.

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 50);
    return rows.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      href: n.href ?? null,
    }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .take(100);
    return rows.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireViewer(ctx);
    const row = await ctx.db.get("notifications", args.notificationId);
    if (!row || row.userId !== user._id) fail("NOT_FOUND", "Tidak ditemukan.");
    await ctx.db.patch("notifications", row._id, { read: true });
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .take(200);
    for (const row of rows) await ctx.db.patch("notifications", row._id, { read: true });
    return null;
  },
});
