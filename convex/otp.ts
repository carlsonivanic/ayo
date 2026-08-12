import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Delivery log for the email OTP. Its only purpose beyond diagnostics is the
// no-email-provider fallback: when AYO_DEV_OTP_ECHO is on, the login screen can
// read back the last code so a fresh deployment is usable immediately.

export const record = internalMutation({
  args: { email: v.string(), code: v.string(), delivered: v.boolean() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("otpDeliveries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const doc = { email, code: args.code, createdAt: Date.now(), delivered: args.delivered };
    if (existing) await ctx.db.replace("otpDeliveries", existing._id, doc);
    else await ctx.db.insert("otpDeliveries", doc);
    return null;
  },
});

/**
 * Echo, off unless AYO_DEV_OTP_ECHO is explicitly enabled.
 *
 * While enabled this query hands the current sign-in code to anyone who knows a
 * registered email address, so it is an authentication bypass by design. Only
 * codes still inside the OTP's own ten-minute window are returned, which keeps
 * the exposure to the same window as the code itself.
 */
const OTP_TTL_MS = 10 * 60 * 1000;

export const devEcho = query({
  args: { email: v.string(), now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (process.env.AYO_DEV_OTP_ECHO !== "true") return null;
    const row = await ctx.db
      .query("otpDeliveries")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (!row) return null;
    if (args.now !== undefined && args.now - row.createdAt > OTP_TTL_MS) return null;
    return { code: row.code, createdAt: row.createdAt, delivered: row.delivered };
  },
});
