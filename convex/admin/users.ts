import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { assertMobileFree, normalizeMobile } from "../lib/mobile";
import { notify } from "../lib/notify";
import { hasSpecialCommission } from "../lib/overrides";
import { tenureMonthAt } from "../lib/period";

// §19 admin user management. Every mutation derives the admin from the session
// and writes an audit entry (§32).

const roleArg = v.union(v.literal("L1"), v.literal("L2"), v.literal("ADMIN"));

function shape(user: Doc<"users">, l2: Doc<"users"> | null, now: number) {
  return {
    id: user._id,
    name: user.name ?? "",
    email: user.email ?? "",
    mobile: user.mobile ?? "",
    role: user.role ?? null,
    status: user.status ?? "PENDING",
    registeredAt: user.registeredAt ?? user._creationTime,
    approvedAt: user.approvedAt ?? null,
    firstPaymentAt: user.firstPaymentAt ?? null,
    tenureMonth: tenureMonthAt(user.firstPaymentAt, now),
    recruitmentSource: user.recruitmentSource ?? null,
    assignedL2: l2 ? { id: l2._id, name: l2.name ?? "" } : null,
    payoutFrequency: user.payoutFrequency ?? null,
    suspendReason: user.suspendReason ?? null,
  };
}

export const list = query({
  args: {
    role: v.optional(roleArg),
    status: v.optional(
      v.union(v.literal("PENDING"), v.literal("ACTIVE"), v.literal("SUSPENDED")),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();

    let users: Doc<"users">[];
    if (args.role && args.status) {
      users = await ctx.db
        .query("users")
        .withIndex("by_role_status", (q) =>
          q.eq("role", args.role!).eq("status", args.status!),
        )
        .take(500);
    } else if (args.role) {
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .take(500);
    } else if (args.status) {
      users = await ctx.db
        .query("users")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(500);
    } else {
      users = await ctx.db.query("users").take(500);
    }

    const term = args.search?.trim().toLowerCase();
    const filtered = term
      ? users.filter(
          (u) =>
            (u.name ?? "").toLowerCase().includes(term) ||
            (u.email ?? "").toLowerCase().includes(term) ||
            (u.mobile ?? "").includes(term),
        )
      : users;

    return Promise.all(
      filtered
        .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0))
        .map(async (u) => ({
          ...shape(u, u.assignedL2Id ? await ctx.db.get("users", u.assignedL2Id) : null, now),
          specialCommission: await hasSpecialCommission(ctx, u._id),
        })),
    );
  },
});

export const pendingRegistrations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("registrationRequests")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .take(100);
    return rows.map((r) => ({
      id: r._id,
      userId: r.userId ?? null,
      name: r.name,
      email: r.email,
      mobile: r.mobile ?? "",
      intendedRole: r.intendedRole,
      createdAt: r.createdAt,
    }));
  },
});

export const l2Options = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_role_status", (q) => q.eq("role", "L2").eq("status", "ACTIVE"))
      .take(200);
    return rows.map((u) => ({ id: u._id, name: u.name ?? u.email ?? "" }));
  },
});

export const approveRegistration = mutation({
  args: {
    requestId: v.id("registrationRequests"),
    role: roleArg,
    assignedL2Id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const req = await ctx.db.get("registrationRequests", args.requestId);
    if (!req || req.status !== "PENDING") fail("NOT_FOUND", "Pendaftaran tidak ditemukan.");
    if (!req.userId) fail("INVALID_STATE", "Pendaftaran tidak punya akun.");

    if (args.assignedL2Id) {
      const l2 = await ctx.db.get("users", args.assignedL2Id);
      if (!l2 || l2.role !== "L2") fail("INVALID_L2", "L2 tidak valid.");
    }

    const now = Date.now();
    await ctx.db.patch("users", req.userId, {
      role: args.role,
      status: "ACTIVE",
      approvedAt: now,
      assignedL2Id: args.role === "L1" ? args.assignedL2Id : undefined,
    });
    await ctx.db.patch("registrationRequests", req._id, {
      status: "APPROVED",
      decidedAt: now,
      decidedBy: admin._id,
    });
    await notify(
      ctx,
      req.userId,
      "REGISTRATION_APPROVED",
      "Akun aktif",
      "Pendaftaran Anda disetujui.",
      "/",
    );
    await audit(ctx, {
      adminId: admin._id,
      action: "APPROVE_REGISTRATION",
      object: `user:${req.userId}`,
      oldValue: "PENDING",
      newValue: { status: "ACTIVE", role: args.role, assignedL2Id: args.assignedL2Id },
    });
    return null;
  },
});

export const rejectRegistration = mutation({
  args: { requestId: v.id("registrationRequests"), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const req = await ctx.db.get("registrationRequests", args.requestId);
    if (!req || req.status !== "PENDING") fail("NOT_FOUND", "Pendaftaran tidak ditemukan.");
    const reason = args.reason.trim();
    if (!reason) fail("REASON_REQUIRED", "Alasan wajib diisi.");

    await ctx.db.patch("registrationRequests", req._id, {
      status: "REJECTED",
      decidedAt: Date.now(),
      decidedBy: admin._id,
      reason,
    });
    if (req.userId) {
      await ctx.db.patch("users", req.userId, { role: undefined });
    }
    await audit(ctx, {
      adminId: admin._id,
      action: "REJECT_REGISTRATION",
      object: `registrationRequest:${req._id}`,
      newValue: "REJECTED",
      reason,
    });
    return null;
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: roleArg,
    mobile: v.optional(v.string()),
    assignedL2Id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL", "Email tidak valid.");
    const name = args.name.trim();
    if (name.length < 2) fail("INVALID_NAME", "Nama terlalu pendek.");

    const clash = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (clash) fail("EMAIL_TAKEN", "Email sudah terdaftar.");
    const mobile = normalizeMobile(args.mobile);
    await assertMobileFree(ctx, mobile);

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name,
      email,
      mobile,
      role: args.role,
      status: "ACTIVE",
      registeredAt: now,
      approvedAt: now,
      recruitmentSource: "ADMIN_CREATE",
      assignedL2Id: args.role === "L1" ? args.assignedL2Id : undefined,
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "CREATE_USER",
      object: `user:${userId}`,
      newValue: { name, email, role: args.role, assignedL2Id: args.assignedL2Id },
    });
    return { userId };
  },
});

export const setStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("ACTIVE"), v.literal("SUSPENDED")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) fail("NOT_FOUND", "Pengguna tidak ditemukan.");
    if (args.status === "SUSPENDED" && !args.reason?.trim()) {
      fail("REASON_REQUIRED", "Alasan wajib diisi.");
    }
    await ctx.db.patch("users", user._id, {
      status: args.status,
      suspendReason: args.status === "SUSPENDED" ? args.reason?.trim() : undefined,
    });
    await audit(ctx, {
      adminId: admin._id,
      action: args.status === "SUSPENDED" ? "SUSPEND_USER" : "REACTIVATE_USER",
      object: `user:${user._id}`,
      oldValue: user.status ?? "",
      newValue: args.status,
      reason: args.reason?.trim(),
    });
    return null;
  },
});

/** §19.2 — future commission follows the new L2; recruitment credit does not move. */
export const assignL2 = mutation({
  args: { l1Id: v.id("users"), l2Id: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const l1 = await ctx.db.get("users", args.l1Id);
    if (!l1 || l1.role !== "L1") fail("NOT_FOUND", "L1 tidak ditemukan.");
    if (args.l2Id) {
      const l2 = await ctx.db.get("users", args.l2Id);
      if (!l2 || l2.role !== "L2") fail("INVALID_L2", "L2 tidak valid.");
    }
    await ctx.db.patch("users", l1._id, { assignedL2Id: args.l2Id });
    await audit(ctx, {
      adminId: admin._id,
      action: "ASSIGN_L1_TO_L2",
      object: `user:${l1._id}`,
      oldValue: l1.assignedL2Id ?? "none",
      newValue: args.l2Id ?? "none",
    });
    return null;
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    mobile: v.optional(v.string()),
    payoutFrequency: v.optional(
      v.union(v.literal("WEEKLY"), v.literal("MONTHLY")),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) fail("NOT_FOUND", "Pengguna tidak ditemukan.");
    const patch: Partial<Doc<"users">> = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2) fail("INVALID_NAME", "Nama terlalu pendek.");
      patch.name = name;
    }
    const email = args.email?.trim().toLowerCase();
    const emailChanged = email !== undefined && email !== (user.email ?? "");
    if (emailChanged) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL", "Email tidak valid.");
      const clash = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (clash && clash._id !== user._id) fail("EMAIL_TAKEN", "Email sudah terdaftar.");
      patch.email = email;
      patch.emailVerificationTime = undefined;
    }
    if (args.mobile !== undefined) {
      const mobile = normalizeMobile(args.mobile);
      await assertMobileFree(ctx, mobile, user._id);
      patch.mobile = mobile;
    }
    if (args.payoutFrequency) patch.payoutFrequency = args.payoutFrequency;
    await ctx.db.patch("users", user._id, patch);
    if (emailChanged) {
      // Login is keyed on the auth account, not users.email. Drop the old link
      // so the old address can no longer sign in; the next OTP to the new
      // address re-links through createOrUpdateUser.
      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", user._id).eq("provider", "email-otp"),
        )
        .collect();
      for (const account of accounts) {
        const codes = await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id))
          .collect();
        for (const code of codes) await ctx.db.delete("authVerificationCodes", code._id);
        await ctx.db.delete("authAccounts", account._id);
      }
    }
    await audit(ctx, {
      adminId: admin._id,
      action: "UPDATE_USER",
      object: `user:${user._id}`,
      oldValue: { name: user.name, email: user.email, mobile: user.mobile },
      newValue: patch,
    });
    return null;
  },
});

/** §19.1 — admin may complete a payout profile on the agent's behalf. */
export const editPayoutProfile = mutation({
  args: {
    userId: v.id("users"),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) fail("NOT_FOUND", "Pengguna tidak ditemukan.");
    const existing = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const doc = {
      userId: user._id,
      bankName: args.bankName.trim(),
      accountNumber: args.accountNumber.trim(),
      accountName: args.accountName.trim(),
      completed: true,
    };
    if (existing) await ctx.db.replace("payoutProfiles", existing._id, doc);
    else await ctx.db.insert("payoutProfiles", doc);
    await audit(ctx, {
      adminId: admin._id,
      action: "EDIT_PAYOUT_PROFILE",
      object: `user:${user._id}`,
      oldValue: existing ? { bank: existing.bankName, acc: existing.accountNumber } : "none",
      newValue: { bank: doc.bankName, acc: doc.accountNumber },
    });
    return null;
  },
});

export const detail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;
    const now = Date.now();
    const l2 = user.assignedL2Id ? await ctx.db.get("users", user.assignedL2Id) : null;
    const profile = await ctx.db
      .query("payoutProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const state = await ctx.db
      .query("l1States")
      .withIndex("by_l1", (q) => q.eq("l1Id", user._id))
      .unique();
    const summaries = await ctx.db
      .query("monthlyL1Summaries")
      .withIndex("by_l1_period", (q) => q.eq("l1Id", user._id))
      .order("desc")
      .take(12);
    return {
      ...shape(user, l2, now),
      payoutProfile: profile
        ? {
            bankName: profile.bankName,
            accountNumber: profile.accountNumber,
            accountName: profile.accountName,
          }
        : null,
      heldBalance: state?.heldBalance ?? 0,
      consecutiveSub5Months: state?.consecutiveSub5Months ?? 0,
      summaries: summaries.map((s) => ({
        period: s.period,
        tenureMonth: s.tenureMonth,
        activations: s.activationCount,
        gross: s.gross,
        jaminan: s.jaminan,
        warmthState: s.warmthState ?? null,
        heldAmount: s.heldAmount,
        releasedAmount: s.releasedAmount,
      })),
    };
  },
});
