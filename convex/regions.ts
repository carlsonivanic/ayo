import { query } from "./_generated/server";
import { requireAdmin } from "./admins";

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
