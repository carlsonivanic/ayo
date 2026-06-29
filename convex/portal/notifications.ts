import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAgent } from "../agentAuth";

/**
 * In-platform notification bell (PRD §6, Phase 1). System-generated alerts for
 * the signed-in agent, newest first, with an unread count for the bell badge.
 */
export const myNotifications = query({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(100);
    const unreadCount = rows.filter((n) => n.readAt === undefined).length;
    return {
      unreadCount,
      items: rows.map((n) => ({
        _id: n._id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        readAt: n.readAt ?? null,
        createdAt: n._creationTime,
      })),
    };
  },
});

/** Mark a single notification read (must belong to the signed-in agent). */
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const agent = await requireAgent(ctx);
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.agentId !== agent._id)
      throw new Error("Notifikasi tidak ditemukan.");
    if (notif.readAt === undefined)
      await ctx.db.patch(notificationId, { readAt: Date.now() });
  },
});

/** Mark all of the signed-in agent's notifications read. */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const agent = await requireAgent(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(200);
    const now = Date.now();
    for (const n of unread) {
      if (n.readAt === undefined) await ctx.db.patch(n._id, { readAt: now });
    }
  },
});
