import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { QueryCtx, mutation, query } from "../_generated/server";
import { audit } from "../lib/audit";
import { fail, requireAdmin } from "../lib/authz";
import { insertEarning } from "../lib/ledger";
import { notify } from "../lib/notify";
import { periodEnd, periodOf, periodStart } from "../lib/period";

// Payment-level view: where a refund exception is raised (§10.4) and, while
// settlement is manual, where every QRIS transfer is confirmed or rejected.

async function shapePayment(ctx: QueryCtx, link: Doc<"paymentLinks">) {
  const plan = await ctx.db.get("productPlans", link.planId);
  const seller = link.l1Id ? await ctx.db.get("users", link.l1Id) : null;
  const codes = await ctx.db
    .query("subscriptionCodes")
    .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
    .collect();
  const seats = await ctx.db
    .query("lifetimeSeats")
    .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
    .collect();

  return {
    id: link._id,
    planName: plan?.name ?? "—",
    planKey: plan?.key ?? "",
    kind: link.kind,
    amount: link.amount,
    qrisAmount: link.qrisAmount ?? link.amount,
    paidAt: link.paidAt ?? link.createdAt,
    createdAt: link.createdAt,
    sellerId: link.l1Id ?? null,
    sellerName: seller?.name ?? "Tanpa agen",
    refunded: !!link.refundedAt,
    verification: link.verification ?? null,
    verifiedAt: link.verifiedAt ?? null,
    rejectedAt: link.rejectedAt ?? null,
    rejectionReason: link.rejectionReason ?? null,
    proofNote: link.proofNote ?? null,
    proofUploadedAt: link.proofUploadedAt ?? null,
    proofUrl: link.proofStorageId ? await ctx.storage.getUrl(link.proofStorageId) : null,
    codes: codes.map((c) => ({
      id: c._id,
      code: c.code,
      status: c.status,
      storeName: c.storeName ?? null,
      usedAt: c.usedAt ?? null,
    })),
    seats: seats.map((s) => ({ id: s._id, seatIndex: s.seatIndex, status: s.status })),
  };
}

/** Full sales history for a period: who sold what, for how much, proof, code. */
export const list = query({
  args: { period: v.string(), sellerId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const start = periodStart(args.period);
    const end = periodEnd(args.period);
    const paid = await ctx.db
      .query("paymentLinks")
      .withIndex("by_paidAt", (q) => q.gte("paidAt", start).lt("paidAt", end))
      .order("desc")
      .take(300);

    const filtered = args.sellerId
      ? paid.filter((l) => l.l1Id === args.sellerId)
      : paid;
    return await Promise.all(filtered.map((link) => shapePayment(ctx, link)));
  },
});

/** The review queue — oldest first, because those buyers waited longest. */
export const awaitingVerification = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const links = await ctx.db
      .query("paymentLinks")
      .withIndex("by_verification", (q) => q.eq("verification", "PENDING"))
      .order("asc")
      .take(100);
    return await Promise.all(links.map((link) => shapePayment(ctx, link)));
  },
});

/** Expired codes waiting for a possible reissue (§5.5). */
export const expiredCodes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_expiry_status", (q) => q.eq("status", "EXPIRED"))
      .order("desc")
      .take(100);
    return await Promise.all(
      codes.map(async (c) => ({
        id: c._id,
        code: c.code,
        sellerName: c.l1Id ? ((await ctx.db.get("users", c.l1Id))?.name ?? "") : "—",
        expiresAt: c.expiresAt,
        reissued: !!c.replacementCodeId,
      })),
    );
  },
});

/**
 * The transfer landed. Everything the payment produced becomes payable.
 *
 * Commission was booked frozen at upload, so this is the step that lets it
 * reach a payout run.
 */
export const verifyPayment = mutation({
  args: { linkId: v.id("paymentLinks"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const link = await ctx.db.get("paymentLinks", args.linkId);
    if (!link) fail("NOT_FOUND", "Pembayaran tidak ditemukan.");
    if (link.verification !== "PENDING") {
      fail("INVALID_STATE", "Pembayaran ini tidak menunggu verifikasi.");
    }

    await ctx.db.patch("paymentLinks", link._id, {
      verification: "VERIFIED",
      verifiedAt: Date.now(),
      verifiedBy: admin._id,
    });

    const lines = await ctx.db
      .query("earningLines")
      .withIndex("by_link", (q) => q.eq("sourceLinkId", link._id))
      .collect();
    for (const line of lines) {
      if (line.frozen) await ctx.db.patch("earningLines", line._id, { frozen: undefined });
    }

    if (link.l1Id) {
      await notify(
        ctx,
        link.l1Id,
        "PAYMENT_VERIFIED",
        "Pembayaran terverifikasi",
        "Komisi Anda sudah masuk hitungan payout.",
        "/l1/penghasilan",
      );
    }
    await audit(ctx, {
      adminId: admin._id,
      action: "VERIFY_PAYMENT",
      object: `paymentLink:${link._id}`,
      newValue: { unfrozenLines: lines.filter((l) => l.frozen).length },
      reason: args.note,
    });
    return { unfrozen: lines.filter((l) => l.frozen).length };
  },
});

/**
 * The transfer never landed, or the receipt was not genuine.
 *
 * Unredeemed codes die, ungifted seats are voided, and commission is undone:
 * lines still frozen simply stay unpayable, while anything already released is
 * reversed with a negative line, because the ledger is append-only (P1).
 *
 * A code that was already redeemed leaves a live merchant behind — that is
 * reported back so the admin can deal with the merchant separately.
 */
export const rejectPayment = mutation({
  args: { linkId: v.id("paymentLinks"), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = args.reason.trim();
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan wajib diisi.");

    const link = await ctx.db.get("paymentLinks", args.linkId);
    if (!link) fail("NOT_FOUND", "Pembayaran tidak ditemukan.");
    if (link.verification !== "PENDING" && link.verification !== "VERIFIED") {
      fail("INVALID_STATE", "Pembayaran ini tidak bisa ditolak.");
    }

    const now = Date.now();
    await ctx.db.patch("paymentLinks", link._id, {
      verification: "REJECTED",
      rejectedAt: now,
      rejectionReason: reason,
      verifiedBy: admin._id,
    });

    const codes = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
      .collect();
    let redeemed = 0;
    for (const code of codes) {
      if (code.status === "UNUSED") {
        await ctx.db.patch("subscriptionCodes", code._id, { status: "EXPIRED" });
      } else if (code.status === "USED") {
        redeemed++;
      }
    }

    const seats = await ctx.db
      .query("lifetimeSeats")
      .withIndex("by_payment_link", (q) => q.eq("paymentLinkId", link._id))
      .collect();
    let activatedSeats = 0;
    for (const seat of seats) {
      if (seat.status === "ACTIVATED") {
        activatedSeats++;
        continue;
      }
      await ctx.db.patch("lifetimeSeats", seat._id, {
        status: "VOID",
        activationLinkToken: undefined,
        linkExpiresAt: undefined,
      });
    }

    const lines = await ctx.db
      .query("earningLines")
      .withIndex("by_link", (q) => q.eq("sourceLinkId", link._id))
      .collect();
    let reversed = 0;
    for (const line of lines) {
      if (line.frozen) {
        // Never became payable — annotate and leave it frozen forever.
        await ctx.db.patch("earningLines", line._id, {
          note: `Bukti bayar ditolak: ${reason}`,
        });
        continue;
      }
      if (line.amount === 0) continue;
      await insertEarning(ctx, {
        l1Id: line.l1Id,
        date: now,
        type: "ADJUSTMENT",
        amount: -line.amount,
        status: "CONFIRMED",
        planId: line.planId,
        merchantId: line.merchantId,
        sourceLinkId: link._id,
        note: `Pembalikan bukti bayar ditolak: ${reason}`,
      });
      reversed++;
    }

    if (link.l1Id) {
      if (reversed > 0) {
        await ctx.db.insert("adjustments", {
          userId: link.l1Id,
          role: "L1",
          period: periodOf(now),
          type: "REFUND_REVERSAL",
          amount: 0,
          reason,
          createdBy: admin._id,
          createdAt: now,
        });
      }
      await notify(
        ctx,
        link.l1Id,
        "PAYMENT_REJECTED",
        "Bukti bayar ditolak",
        reason,
        "/l1/kode",
      );
    }

    await audit(ctx, {
      adminId: admin._id,
      action: "REJECT_PAYMENT",
      object: `paymentLink:${link._id}`,
      newValue: { reversed, redeemedCodes: redeemed, activatedSeats },
      reason,
    });
    return { reversed, redeemedCodes: redeemed, activatedSeats };
  },
});
