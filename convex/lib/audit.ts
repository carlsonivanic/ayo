import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";

// §32 — every admin action leaves a row. Values are stringified so the log is
// a stable, human-readable record independent of later schema changes.

export async function audit(
  ctx: MutationCtx,
  args: {
    adminId: Id<"users">;
    action: string;
    object: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
  },
): Promise<void> {
  await ctx.db.insert("auditLogEntries", {
    timestamp: Date.now(),
    adminId: args.adminId,
    action: args.action,
    object: args.object,
    oldValue: args.oldValue === undefined ? undefined : stringify(args.oldValue),
    newValue: args.newValue === undefined ? undefined : stringify(args.newValue),
    reason: args.reason,
  });
}

function stringify(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}
