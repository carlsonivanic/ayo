import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admins";
import { Doc } from "./_generated/dataModel";

const statusValidator = v.union(
  v.literal("probation"),
  v.literal("active"),
  v.literal("dormant"),
  v.literal("inactive"),
  v.literal("suspended"),
);

const QUARTER_MS = 1000 * 60 * 60 * 24 * 91;

async function summarize(
  ctx: QueryCtx,
  agent: Doc<"agents">,
  regionsById: Map<string, Doc<"regions">>,
) {
  const since = Date.now() - QUARTER_MS;

  const licenses = await ctx.db
    .query("licenses")
    .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
    .collect();
  const activeMerchants = licenses.filter((l) => l.status === "active").length;
  const activationsThisQuarter = licenses.filter(
    (l) => l.activatedAt >= since,
  ).length;

  const ledger = await ctx.db
    .query("commissionLedger")
    .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
    .collect();
  const commissionTotal = ledger
    .filter((e) => e.status !== "reversed")
    .reduce((sum, e) => sum + e.amount, 0n);

  return {
    _id: agent._id,
    name: agent.name,
    phone: agent.phone,
    level: agent.level,
    status: agent.status,
    regionId: agent.regionId,
    regionCode: regionsById.get(agent.regionId)?.code ?? "—",
    enrolledAt: agent.enrolledAt,
    lastActiveAt: agent.lastActiveAt,
    feePaidAt: agent.feePaidAt,
    escrowAmount: agent.escrowAmount.toString(),
    activeMerchants,
    activationsThisQuarter,
    commissionTotal: commissionTotal.toString(),
  };
}

/** Monitoring table: agents with per-agent activation/commission rollups. */
export const listAgents = query({
  args: {
    regionId: v.optional(v.id("regions")),
    level: v.optional(v.number()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let agents: Doc<"agents">[];
    if (args.status) {
      agents = await ctx.db
        .query("agents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.regionId) {
      agents = await ctx.db
        .query("agents")
        .withIndex("by_region", (q) => q.eq("regionId", args.regionId!))
        .collect();
    } else {
      agents = await ctx.db.query("agents").collect();
    }

    if (args.regionId)
      agents = agents.filter((a) => a.regionId === args.regionId);
    if (args.level !== undefined)
      agents = agents.filter((a) => a.level === args.level);
    if (args.status) agents = agents.filter((a) => a.status === args.status);

    const regions = await ctx.db.query("regions").collect();
    const regionsById = new Map(regions.map((r) => [r._id, r]));

    const rows = await Promise.all(
      agents.map((a) => summarize(ctx, a, regionsById)),
    );
    return rows.sort((a, b) => b.activationsThisQuarter - a.activationsThisQuarter);
  },
});

/** Agents awaiting first approval (probation, fee not yet paid). */
export const approvalQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const probation = await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", "probation"))
      .collect();
    const regions = await ctx.db.query("regions").collect();
    const regionsById = new Map(regions.map((r) => [r._id, r]));
    return probation.map((a) => ({
      _id: a._id,
      name: a.name,
      phone: a.phone,
      regionCode: regionsById.get(a.regionId)?.code ?? "—",
      enrolledAt: a.enrolledAt,
    }));
  },
});

export const agentDetail = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    await requireAdmin(ctx);
    const agent = await ctx.db.get(agentId);
    if (!agent) return null;
    const regions = await ctx.db.query("regions").collect();
    const regionsById = new Map(regions.map((r) => [r._id, r]));
    const summary = await summarize(ctx, agent, regionsById);

    const referrer = agent.referrerId
      ? await ctx.db.get(agent.referrerId)
      : null;
    const ledger = await ctx.db
      .query("commissionLedger")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .collect();

    return {
      ...summary,
      referrerName: referrer?.name ?? null,
      ledger: ledger
        .sort((a, b) => b._creationTime - a._creationTime)
        .map((e) => ({
          _id: e._id,
          type: e.type,
          amount: e.amount.toString(),
          status: e.status,
          periodStart: e.periodStart,
          periodEnd: e.periodEnd,
          createdAt: e._creationTime,
        })),
    };
  },
});

/** Manually add a new salesperson (ops/super). MVP: goes straight to active. */
export const createAgent = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    level: v.number(),
    regionId: v.id("regions"),
    referrerId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, ["ops_admin", "super_admin"]);

    const name = args.name.trim();
    const phone = args.phone.trim();
    if (name.length < 2) throw new Error("Nama wajib diisi.");
    if (phone.length < 6) throw new Error("Nomor HP tidak valid.");
    if (![1, 2, 3].includes(args.level)) throw new Error("Level tidak valid.");

    const existing = await ctx.db
      .query("agents")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) throw new Error("Nomor HP sudah terdaftar.");

    const region = await ctx.db.get(args.regionId);
    if (!region) throw new Error("Wilayah tidak ditemukan.");

    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name,
      phone,
      level: args.level,
      status: "active",
      regionId: args.regionId,
      referrerId: args.referrerId,
      enrolledAt: now,
      feePaidAt: now,
      escrowAmount: 0n,
    });

    await ctx.db.insert("notifications", {
      agentId,
      kind: "status_change",
      title: "Akun dibuat",
      body: "Akun kamu telah dibuat admin dan langsung Aktif. Kamu bisa mulai membuat kode.",
    });

    return agentId;
  },
});

/** Approve a probation agent → active (ops/super). */
export const approveAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    await requireAdmin(ctx, ["ops_admin", "super_admin"]);
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("agent not found");
    await ctx.db.patch(agentId, { status: "active", feePaidAt: Date.now() });
    await ctx.db.insert("notifications", {
      agentId,
      kind: "status_change",
      title: "Akun disetujui",
      body: "Selamat! Status kamu kini Aktif. Kamu bisa mulai membuat kode.",
    });
  },
});

/** Manual status override with mandatory reason (ops/super). */
export const overrideStatus = mutation({
  args: {
    agentId: v.id("agents"),
    status: statusValidator,
    reason: v.string(),
  },
  handler: async (ctx, { agentId, status, reason }) => {
    await requireAdmin(ctx, ["ops_admin", "super_admin"]);
    if (reason.trim().length < 3)
      throw new Error("Alasan override wajib diisi.");
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("agent not found");

    const patch: Partial<Doc<"agents">> = { status };
    if (status === "suspended") patch.suspendedAt = Date.now();
    await ctx.db.patch(agentId, patch);

    await ctx.db.insert("notifications", {
      agentId,
      kind: "status_override",
      title: "Status diperbarui admin",
      body: `Status diubah menjadi "${status}". Alasan: ${reason}`,
    });
  },
});
