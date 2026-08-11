import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// §12 cron schedule. Times are UTC; business periods are Asia/Jakarta (§15.5),
// so each job runs in the early Jakarta morning of the intended day.

const crons = cronJobs();

crons.cron(
  "apply price changes",
  "5 0 * * *",
  internal.admin.pricing.applyScheduledPriceChanges,
  {},
);
crons.cron("mark churned merchants", "15 0 * * *", internal.maintenance.markChurnedMerchants, {});
crons.cron("expire payment links", "20 0 * * *", internal.payments.expirePaymentLinks, {});
crons.cron("expire codes", "30 0 * * *", internal.maintenance.expireUnusedCodes, {});
crons.cron("expire seat links", "45 0 * * *", internal.maintenance.expireSeatLinks, {});
crons.cron(
  "notify expiring customers",
  "0 1 * * *",
  internal.maintenance.notifyExpiringCustomers,
  {},
);
crons.cron("notify window ended", "15 1 * * *", internal.maintenance.notifyWindowEnded, {});

// §8.1 — the 8th, once every prior-month code has settled.
crons.cron("month end close", "0 1 8 * *", internal.monthEnd.closePreviousMonth, {});

crons.cron("weekly L1 payouts", "0 2 * * 3", internal.payouts.runWeeklyL1Payouts, {});
crons.cron("monthly L1 payouts", "0 2 5 * *", internal.payouts.runMonthlyL1Payouts, {});
crons.cron("L2 payouts", "0 3 5 * *", internal.payouts.runL2Payouts, {});

export default crons;
