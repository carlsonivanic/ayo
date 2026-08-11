import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// §28 — in-app notifications only in the MVP. Every trigger listed in §14 of the
// backend spec funnels through here.

export async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  type: string,
  title: string,
  message: string,
  href?: string,
): Promise<void> {
  await ctx.db.insert("notifications", {
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: Date.now(),
    href,
  });
}

export async function notifyAdmins(
  ctx: MutationCtx,
  type: string,
  title: string,
  message: string,
  href?: string,
): Promise<void> {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role_status", (q) => q.eq("role", "ADMIN").eq("status", "ACTIVE"))
    .take(50);
  for (const admin of admins) {
    await notify(ctx, admin._id, type, title, message, href);
  }
}
