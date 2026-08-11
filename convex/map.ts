import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./lib/authz";

// §26 — admin-only in the MVP. L1/L2 map access and the filters stay off until
// Applocator exposes them.

export const adminMap = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const merchants = await ctx.db.query("merchants").take(1000);
    return merchants
      .filter((m) => m.lat !== undefined && m.lng !== undefined)
      .map((m) => ({
        id: m._id,
        storeName: m.storeName ?? m.sellMoreStoreId,
        lat: m.lat!,
        lng: m.lng!,
        active:
          m.subscriptionStatus === "LIFETIME" ||
          (m.subscriptionStatus === "SUBSCRIBED" &&
            (m.currentExpiryAt ?? 0) > args.now),
      }));
  },
});
