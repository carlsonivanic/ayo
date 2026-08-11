import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

// §5.2 authorization guards. Identity always comes from the session, never from
// a client-supplied id (P9).

export type Viewer = Doc<"users">;
export type Role = NonNullable<Doc<"users">["role"]>;

export function fail(code: string, message?: string): never {
  throw new ConvexError({ code, message: message ?? code });
}

export async function getViewer(ctx: QueryCtx): Promise<Viewer | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get("users", userId as Id<"users">);
}

/** Authenticated and not suspended. PENDING is allowed through (A-3 / §5.2). */
export async function requireViewer(ctx: QueryCtx): Promise<Viewer> {
  const user = await getViewer(ctx);
  if (!user) fail("UNAUTHENTICATED", "Silakan masuk kembali.");
  if (user.status === "SUSPENDED") fail("SUSPENDED", "Akun ditangguhkan.");
  return user;
}

export async function requireActive(ctx: QueryCtx): Promise<Viewer> {
  const user = await requireViewer(ctx);
  if (user.status !== "ACTIVE") fail("NOT_ACTIVE", "Akun belum aktif.");
  return user;
}

export async function requireRole(ctx: QueryCtx, roles: Role[]): Promise<Viewer> {
  const user = await requireActive(ctx);
  if (!user.role || !roles.includes(user.role)) fail("FORBIDDEN", "Tidak diizinkan.");
  return user;
}

export const requireAdmin = (ctx: QueryCtx) => requireRole(ctx, ["ADMIN"]);
export const requireL1 = (ctx: QueryCtx) => requireRole(ctx, ["L1"]);
export const requireL2 = (ctx: QueryCtx) => requireRole(ctx, ["L2"]);

/** L1 or Admin acting on L1 data. */
export const requireL1OrAdmin = (ctx: QueryCtx) => requireRole(ctx, ["L1", "ADMIN"]);

/** §4 SDK/device domain — shared secret, never a user session (P10). */
export function requireApiKey(req: Request): void {
  const expected = process.env.AYO_SDK_API_KEY ?? process.env.POS_CLIENT_KEY;
  if (!expected) return; // gate disabled until a key is configured
  const provided =
    req.headers.get("X-AYO-API-KEY") ?? req.headers.get("X-Sellmore-Client");
  if (provided !== expected) fail("UNAUTHORIZED", "API key tidak valid.");
}

/** Sliding-window counter for OTP and device endpoints (§15.6). */
export async function rateLimit(
  ctx: MutationCtx,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }
  if (now - row.windowStart > windowMs) {
    await ctx.db.patch("rateLimits", row._id, { count: 1, windowStart: now });
    return;
  }
  if (row.count >= limit) fail("RATE_LIMITED", "Terlalu banyak percobaan.");
  await ctx.db.patch("rateLimits", row._id, { count: row.count + 1 });
}
