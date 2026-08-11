import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { fail, requireActive, requireAdmin, requireRole, requireViewer } from "./lib/authz";
import { notify } from "./lib/notify";

// §27.2 announcements. Admin and L2 can publish; Discord delivery is best-effort
// and never blocks the in-app announcement (Edge 19).

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireViewer(ctx);
    const rows = await ctx.db.query("announcements").order("desc").take(30);
    return rows
      .filter((a) => a.audience === "ALL" || a.audience === user.role)
      .map((a) => ({
        id: a._id,
        title: a.title,
        message: a.message,
        audience: a.audience,
        createdAt: a.createdAt,
        discordStatus: a.discordStatus ?? null,
      }));
  },
});

export const create = internalMutation({
  args: {
    title: v.string(),
    message: v.string(),
    audience: v.union(v.literal("ALL"), v.literal("L1"), v.literal("L2")),
    sendToDiscord: v.boolean(),
    createdBy: v.id("users"),
    scopeToTeamOfL2: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("announcements", {
      title: args.title,
      message: args.message,
      audience: args.audience,
      sendToDiscord: args.sendToDiscord,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    const recipients = args.scopeToTeamOfL2
      ? await ctx.db
          .query("users")
          .withIndex("by_l2", (q) => q.eq("assignedL2Id", args.scopeToTeamOfL2!))
          .collect()
      : await ctx.db
          .query("users")
          .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
          .take(1000);

    for (const user of recipients) {
      if (args.audience !== "ALL" && user.role !== args.audience) continue;
      if (user.status !== "ACTIVE") continue;
      await notify(ctx, user._id, "ANNOUNCEMENT", args.title, args.message);
    }
    return id;
  },
});

export const setDiscordStatus = internalMutation({
  args: {
    announcementId: v.id("announcements"),
    status: v.union(v.literal("SENT"), v.literal("FAILED"), v.literal("SKIPPED")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch("announcements", args.announcementId, {
      discordStatus: args.status,
    });
    return null;
  },
});

export const webhookUrl = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("discordSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
      .unique();
    return settings?.enabled ? (settings.webhookUrl ?? null) : null;
  },
});

/** Publishing is an action because Discord delivery is a network call. */
export const publish = action({
  args: {
    title: v.string(),
    message: v.string(),
    audience: v.union(v.literal("ALL"), v.literal("L1"), v.literal("L2")),
    sendToDiscord: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ id: Id<"announcements">; discord: string }> => {
    const author = await ctx.runQuery(internal.announcements.author, {});
    const id: Id<"announcements"> = await ctx.runMutation(internal.announcements.create, {
      title: args.title.trim(),
      message: args.message.trim(),
      audience: author.role === "L2" ? "L1" : args.audience,
      sendToDiscord: args.sendToDiscord,
      createdBy: author.id,
      scopeToTeamOfL2: author.role === "L2" ? author.id : undefined,
    });

    let status: "SENT" | "FAILED" | "SKIPPED" = "SKIPPED";
    if (args.sendToDiscord) {
      const url = await ctx.runQuery(internal.announcements.webhookUrl, {});
      if (!url) status = "FAILED";
      else {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: `**${args.title}**\n${args.message}` }),
          });
          status = res.ok ? "SENT" : "FAILED";
        } catch {
          status = "FAILED";
        }
      }
    }
    await ctx.runMutation(internal.announcements.setDiscordStatus, {
      announcementId: id,
      status,
    });
    return { id, discord: status };
  },
});

export const author = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, ["ADMIN", "L2"]);
    return { id: user._id, role: user.role! };
  },
});

// --- Discord configuration (§27.3) -----------------------------------------

export const discordSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActive(ctx);
    const settings = await ctx.db
      .query("discordSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
      .unique();
    if (user.role !== "ADMIN") {
      return { inviteUrl: settings?.inviteUrl ?? null, webhookUrl: null, enabled: false, lastTestOk: null };
    }
    return {
      inviteUrl: settings?.inviteUrl ?? null,
      webhookUrl: settings?.webhookUrl ?? null,
      enabled: settings?.enabled ?? false,
      lastTestOk: settings?.lastTestOk ?? null,
    };
  },
});

export const saveDiscordSettings = mutation({
  args: {
    webhookUrl: v.optional(v.string()),
    inviteUrl: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("discordSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
      .unique();
    const doc = {
      singleton: "GLOBAL" as const,
      webhookUrl: args.webhookUrl?.trim() || undefined,
      inviteUrl: args.inviteUrl?.trim() || undefined,
      enabled: args.enabled,
      lastTestAt: existing?.lastTestAt,
      lastTestOk: existing?.lastTestOk,
    };
    if (existing) await ctx.db.replace("discordSettings", existing._id, doc);
    else await ctx.db.insert("discordSettings", doc);
    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_DISCORD_SETTINGS",
      object: "discordSettings",
      newValue: { enabled: args.enabled, hasWebhook: !!doc.webhookUrl },
    });
    return null;
  },
});

export const recordWebhookTest = internalMutation({
  args: { ok: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("discordSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "GLOBAL"))
      .unique();
    if (!existing) return null;
    await ctx.db.patch("discordSettings", existing._id, {
      lastTestAt: Date.now(),
      lastTestOk: args.ok,
    });
    return null;
  },
});

export const testDiscordWebhook = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const caller = await ctx.runQuery(internal.announcements.author, {});
    if (caller.role !== "ADMIN") throw new Error("FORBIDDEN");
    const url = await ctx.runQuery(internal.announcements.webhookUrl, {});
    if (!url) {
      await ctx.runMutation(internal.announcements.recordWebhookTest, { ok: false });
      return { ok: false };
    }
    let ok = false;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "AYO webhook test." }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    await ctx.runMutation(internal.announcements.recordWebhookTest, { ok });
    return { ok };
  },
});

export const deleteAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get("announcements", args.announcementId);
    if (!row) fail("NOT_FOUND", "Tidak ditemukan.");
    await ctx.db.delete("announcements", row._id);
    await audit(ctx, {
      adminId: admin._id,
      action: "DELETE_ANNOUNCEMENT",
      object: `announcement:${row._id}`,
      oldValue: row.title,
    });
    return null;
  },
});
