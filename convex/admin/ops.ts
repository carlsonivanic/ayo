import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { generateCodeString } from "../lib/codegen";
import { ensureL1State, insertEarning } from "../lib/ledger";
import { notify } from "../lib/notify";
import { addDays, periodOf } from "../lib/period";
import { getSettings } from "../lib/settings";

// §10.4 admin mutation catalog. Every one of these requires a reason and leaves
// an audit entry — they are the manual overrides on an otherwise automatic ledger.

function requireReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) fail("REASON_REQUIRED", "Alasan wajib diisi.");
  return trimmed;
}

/** §9.5 / Edge 6 — release held money outside the normal 5-customer rule. */
export const manualHeldRelease = mutation({
  args: {
    l1Id: v.id("users"),
    amount: v.optional(v.number()), // omitted = release everything
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const l1 = await ctx.db.get("users", args.l1Id);
    if (!l1) fail("NOT_FOUND", "L1 tidak ditemukan.");

    const state = await ensureL1State(ctx, l1._id);
    const amount = Math.min(args.amount ?? state.heldBalance, state.heldBalance);
    if (amount <= 0) fail("NOTHING_TO_RELEASE", "Tidak ada held money.");

    const period = periodOf(Date.now());
    await ctx.db.patch("l1States", state._id, {
      heldBalance: state.heldBalance - amount,
    });
    await ctx.db.insert("heldRecords", {
      l1Id: l1._id,
      period,
      gross: 0,
      heldPercent: 0,
      heldAmount: 0,
      releasedAmount: amount,
      releasedAt: Date.now(),
      status: "RELEASED",
      settled: true,
      note: reason,
    });
    // The release reaches the agent through the next payout's adjustment column.
    await ctx.db.insert("adjustments", {
      userId: l1._id,
      role: "L1",
      period,
      type: "HELD_RELEASE",
      amount,
      reason,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    await notify(
      ctx,
      l1._id,
      "HELD_RELEASED",
      "Held money dirilis",
      `${amount} masuk payout berikutnya.`,
      "/l1/payout",
    );
    await audit(ctx, {
      adminId: admin._id,
      action: "MANUAL_HELD_RELEASE",
      object: `user:${l1._id}`,
      oldValue: state.heldBalance,
      newValue: state.heldBalance - amount,
      reason,
    });
    return null;
  },
});

/** §14.1 — ownership only ever moves by admin decision, with a reason. */
export const reassignMerchantOwnership = mutation({
  args: {
    merchantId: v.id("merchants"),
    newOwnerL1Id: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const merchant = await ctx.db.get("merchants", args.merchantId);
    if (!merchant) fail("NOT_FOUND", "Merchant tidak ditemukan.");
    if (args.newOwnerL1Id) {
      const owner = await ctx.db.get("users", args.newOwnerL1Id);
      if (!owner || owner.role !== "L1") fail("INVALID_OWNER", "Owner harus L1.");
    }
    await ctx.db.patch("merchants", merchant._id, { ownerL1Id: args.newOwnerL1Id });
    await audit(ctx, {
      adminId: admin._id,
      action: "REASSIGN_MERCHANT_OWNERSHIP",
      object: `merchant:${merchant._id}`,
      oldValue: merchant.ownerL1Id ?? "none",
      newValue: args.newOwnerL1Id ?? "none",
      reason,
    });
    return null;
  },
});

/** §14.6 — frozen owner commission is a liability until this resolves it. */
export const resolveFrozenOwnerCommission = mutation({
  args: {
    merchantId: v.id("merchants"),
    resolution: v.union(v.literal("REASSIGN"), v.literal("SETTLE_TO_COMPANY")),
    newOwnerL1Id: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const merchant = await ctx.db.get("merchants", args.merchantId);
    if (!merchant) fail("NOT_FOUND", "Merchant tidak ditemukan.");

    const frozen = (
      await ctx.db
        .query("earningLines")
        .withIndex("by_merchant", (q) => q.eq("merchantId", merchant._id))
        .collect()
    ).filter((l) => l.frozen && !l.settledToCompany);

    if (args.resolution === "REASSIGN") {
      if (!args.newOwnerL1Id) fail("OWNER_REQUIRED", "Pilih owner baru.");
      const owner = await ctx.db.get("users", args.newOwnerL1Id);
      if (!owner || owner.role !== "L1") fail("INVALID_OWNER", "Owner harus L1.");
      for (const line of frozen) {
        await ctx.db.patch("earningLines", line._id, {
          l1Id: args.newOwnerL1Id,
          frozen: undefined,
        });
      }
      await ctx.db.patch("merchants", merchant._id, { ownerL1Id: args.newOwnerL1Id });
    } else {
      for (const line of frozen) {
        await ctx.db.patch("earningLines", line._id, {
          frozen: undefined,
          settledToCompany: true,
        });
      }
    }

    await audit(ctx, {
      adminId: admin._id,
      action: "RESOLVE_FROZEN_OWNER_COMMISSION",
      object: `merchant:${merchant._id}`,
      oldValue: { frozenLines: frozen.length },
      newValue: { resolution: args.resolution, newOwner: args.newOwnerL1Id ?? null },
      reason,
    });
    return { resolved: frozen.length };
  },
});

/** §3.6 / Edge 31 — there is no self-service refund; this is the exception path. */
export const processManualRefundException = mutation({
  args: { paymentLinkId: v.id("paymentLinks"), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const link = await ctx.db.get("paymentLinks", args.paymentLinkId);
    if (!link) fail("NOT_FOUND", "Pembayaran tidak ditemukan.");
    if (link.status !== "PAID") fail("INVALID_STATE", "Pembayaran belum lunas.");
    if (link.refundedAt) fail("ALREADY_REFUNDED", "Sudah direfund.");

    await ctx.db.patch("paymentLinks", link._id, { refundedAt: Date.now() });

    // Kill any code that has not been redeemed yet.
    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
      .collect();
    for (const code of codes) {
      if (code.status === "UNUSED") {
        await ctx.db.patch("subscriptionCodes", code._id, { status: "EXPIRED" });
      }
    }

    // Reverse the commission with a new line — the ledger is append-only (P1).
    let reversed = 0;
    for (const code of codes) {
      const lines = await ctx.db
        .query("earningLines")
        .withIndex("by_code", (q) => q.eq("sourceCodeId", code._id))
        .collect();
      for (const line of lines) {
        if (line.amount === 0) continue;
        await insertEarning(ctx, {
          l1Id: line.l1Id,
          date: Date.now(),
          type: "ADJUSTMENT",
          amount: -line.amount,
          status: "CONFIRMED",
          planId: line.planId,
          merchantId: line.merchantId,
          note: `Refund: ${reason}`,
        });
        reversed++;
      }
    }
    if (link.l1Id) {
      await ctx.db.insert("adjustments", {
        userId: link.l1Id,
        role: "L1",
        period: periodOf(Date.now()),
        type: "REFUND_REVERSAL",
        amount: 0,
        reason,
        createdBy: admin._id,
        createdAt: Date.now(),
      });
    }

    await audit(ctx, {
      adminId: admin._id,
      action: "MANUAL_REFUND_EXCEPTION",
      object: `paymentLink:${link._id}`,
      newValue: { reversedLines: reversed },
      reason,
    });
    return { reversed };
  },
});

/** §5.5 — only an EXPIRED code may be reissued, once, with no new commission. */
export const reissueExpiredCode = mutation({
  args: { codeId: v.id("subscriptionCodes"), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const code = await ctx.db.get("subscriptionCodes", args.codeId);
    if (!code) fail("NOT_FOUND", "Kode tidak ditemukan.");
    if (code.status !== "EXPIRED") fail("INVALID_STATE", "Hanya kode kedaluwarsa.");
    if (code.replacementCodeId) fail("ALREADY_REISSUED", "Sudah pernah diganti.");

    const settings = await getSettings(ctx);
    const now = Date.now();
    let value = generateCodeString();
    for (let i = 0; i < 8; i++) {
      const clash = await ctx.db
        .query("subscriptionCodes")
        .withIndex("by_code", (q) => q.eq("code", value))
        .unique();
      if (!clash) break;
      value = generateCodeString();
    }

    const replacementId = await ctx.db.insert("subscriptionCodes", {
      code: value,
      paymentLinkId: code.paymentLinkId,
      l1Id: code.l1Id,
      planId: code.planId,
      status: "UNUSED",
      generatedAt: code.generatedAt, // commission still follows the original payment
      expiresAt: addDays(now, settings.codeExpiryDays),
      originalCodeId: code._id,
      priceAtIssue: code.priceAtIssue,
    });
    await ctx.db.patch("subscriptionCodes", code._id, {
      replacementCodeId: replacementId,
    });
    if (code.l1Id) {
      await notify(
        ctx,
        code.l1Id,
        "CODE_REISSUED",
        "Kode pengganti",
        value,
        "/l1/kode",
      );
    }
    await audit(ctx, {
      adminId: admin._id,
      action: "REISSUE_CODE",
      object: `code:${code._id}`,
      oldValue: code.code,
      newValue: value,
      reason,
    });
    return { code: value };
  },
});

/** §22.4 — a manual adjustment that lands in the next payout. */
export const createAdjustment = mutation({
  args: {
    userId: v.id("users"),
    period: v.string(),
    type: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = requireReason(args.reason);
    const user = await ctx.db.get("users", args.userId);
    if (!user || !user.role || user.role === "ADMIN") {
      fail("NOT_FOUND", "Pengguna tidak valid.");
    }
    await ctx.db.insert("adjustments", {
      userId: user._id,
      role: user.role as "L1" | "L2",
      period: args.period,
      type: args.type.trim() || "MANUAL",
      amount: args.amount,
      reason,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      adminId: admin._id,
      action: "CREATE_ADJUSTMENT",
      object: `user:${user._id}`,
      newValue: { period: args.period, amount: args.amount, type: args.type },
      reason,
    });
    return null;
  },
});
