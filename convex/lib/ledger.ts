import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { YLabel } from "./commission";
import { periodOf } from "./period";

// Shared writers for the append-only ledger (P1/P2/P3). Anything that moves
// money or counts an acquisition goes through here so the invariants live in one
// place.

export async function insertEarning(
  ctx: MutationCtx,
  args: {
    l1Id: Id<"users">;
    date: number;
    type: Doc<"earningLines">["type"];
    amount: number;
    status: Doc<"earningLines">["status"];
    planId?: Id<"productPlans">;
    merchantId?: Id<"merchants">;
    sourceCodeId?: Id<"subscriptionCodes">;
    frozen?: boolean;
    note?: string;
  },
): Promise<Id<"earningLines">> {
  return await ctx.db.insert("earningLines", {
    l1Id: args.l1Id,
    date: args.date,
    period: periodOf(args.date),
    type: args.type,
    planId: args.planId,
    amount: args.amount,
    merchantId: args.merchantId,
    status: args.status,
    sourceCodeId: args.sourceCodeId,
    frozen: args.frozen,
    note: args.note,
  });
}

/** §6 — first-time activations only. Renewals never reach this function. */
export async function recordAcquisition(
  ctx: MutationCtx,
  args: {
    l1Id: Id<"users">;
    merchantId: Id<"merchants">;
    date: number;
    sourceType: "CODE" | "SEAT";
    sourceId: string;
  },
): Promise<void> {
  await ctx.db.insert("acquisitions", {
    l1Id: args.l1Id,
    merchantId: args.merchantId,
    period: periodOf(args.date),
    date: args.date,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
  });
}

/** §38.1 / §24.10 — per-merchant history that survives archival. */
export async function recordMerchantPayment(
  ctx: MutationCtx,
  args: {
    merchantId: Id<"merchants">;
    recipientL1Id?: Id<"users">;
    date: number;
    type: Doc<"merchantEarningHistory">["type"];
    amount: number;
    paymentAmount: number;
    planId: Id<"productPlans">;
    method: "CODE" | "SELF";
    yLabel: YLabel | "—";
  },
): Promise<void> {
  await ctx.db.insert("merchantEarningHistory", {
    merchantId: args.merchantId,
    recipientL1Id: args.recipientL1Id,
    date: args.date,
    period: periodOf(args.date),
    type: args.type,
    amount: args.amount,
    paymentAmount: args.paymentAmount,
    planId: args.planId,
    method: args.method,
    yLabel: args.yLabel,
  });
}

export async function ensureL1State(
  ctx: MutationCtx,
  l1Id: Id<"users">,
): Promise<Doc<"l1States">> {
  const existing = await ctx.db
    .query("l1States")
    .withIndex("by_l1", (q) => q.eq("l1Id", l1Id))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("l1States", {
    l1Id,
    consecutiveSub5Months: 0,
    heldBalance: 0,
  });
  return (await ctx.db.get("l1States", id))!;
}
