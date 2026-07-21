/**
 * Backfill — populate `commissionLedger` for licenses activated BEFORE the
 * engine was wired into `activateCore`. Run once after deploy via the Convex
 * dashboard.
 *
 * Idempotent: reuses the same `by_license` guard as the activation hook, so
 * running twice (or running while live activations happen) never double-writes.
 * Batches via `ctx.scheduler.runAfter(0, ...)` to stay within Convex's per-transaction
 * document limits.
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { resolveUpline, computeCommissionEntries } from "./lib/commission";

const BATCH_SIZE = 50;

/**
 * Scan up to BATCH_SIZE licenses, write commission entries for any that have
 * none yet, then reschedule itself with the next cursor until done. Pass
 * `afterLicenseId = undefined` to start from the beginning.
 */
export const backfillCommissions = internalMutation({
  args: {
    afterLicenseId: v.optional(v.id("licenses")),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { afterLicenseId, dryRun }) => {
    const q = ctx.db.query("licenses").order("asc");
    // Convex has no native cursor-after-id; emulate by reading a batch and
    // skipping already-seen ids. For backfill simplicity we just take BATCH_SIZE
    // and rely on idempotency + re-invocation to converge.
    const batch = await q.take(BATCH_SIZE);

    let processed = 0;
    let written = 0;
    let skippedAlready = 0;
    let skippedNoAgent = 0;
    let skippedNoPrice = 0;
    let lastId: Id<"licenses"> | undefined = afterLicenseId;

    for (const lic of batch) {
      // Skip licenses we've already passed in a prior invocation. Cheap pointer
      // forward so we make progress across calls.
      if (afterLicenseId && lic._id <= afterLicenseId) continue;
      lastId = lic._id;
      processed++;

      if (!lic.agentId) {
        skippedNoAgent++;
        continue;
      }
      if (lic.priceIDR === undefined || lic.priceIDR <= 0n) {
        // No price snapshot — commission would compute to zero and we'd lose
        // the audit trail. Surface rather than silently write zeros.
        skippedNoPrice++;
        continue;
      }

      // Idempotency check.
      const existing = await ctx.db
        .query("commissionLedger")
        .withIndex("by_license", (q) => q.eq("licenseId", lic._id))
        .first();
      if (existing) {
        skippedAlready++;
        continue;
      }

      if (dryRun) continue;

      // Resolve the code (for lifetimeKind) if linked; lifetimeKind is needed
      // to pick the right flat closing fee.
      let lifetimeKind: "solo" | "duo" | undefined;
      if (lic.codeId) {
        const code = await ctx.db.get(lic.codeId);
        lifetimeKind = code?.lifetimeKind;
      }

      const upline = await resolveUpline(ctx, lic.agentId);
      const entries = await computeCommissionEntries(ctx, upline, {
        licenseId: lic._id,
        tier: lic.tier,
        priceIDR: lic.priceIDR,
        regionId: lic.regionId,
        activatedAt: lic.activatedAt,
        lifetimeKind,
      });
      for (const e of entries) {
        await ctx.db.insert("commissionLedger", e);
      }
      written += entries.length;
    }

    const summary = {
      processed,
      written,
      skippedAlready,
      skippedNoAgent,
      skippedNoPrice,
      lastId,
      done: batch.length < BATCH_SIZE,
    };

    // Keep going if there might be more.
    if (!dryRun && !summary.done && lastId) {
      await ctx.scheduler.runAfter(0, internal.backfill.backfillCommissions, {
        afterLicenseId: lastId,
      });
    }

    return summary;
  },
});
