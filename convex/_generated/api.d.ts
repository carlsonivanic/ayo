/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_audit from "../admin/audit.js";
import type * as admin_ops from "../admin/ops.js";
import type * as admin_overrides from "../admin/overrides.js";
import type * as admin_payments from "../admin/payments.js";
import type * as admin_pricing from "../admin/pricing.js";
import type * as admin_reports from "../admin/reports.js";
import type * as admin_settings from "../admin/settings.js";
import type * as admin_users from "../admin/users.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as earnings from "../earnings.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_codegen from "../lib/codegen.js";
import type * as lib_commission from "../lib/commission.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_licenseToken from "../lib/licenseToken.js";
import type * as lib_ltv from "../lib/ltv.js";
import type * as lib_mobile from "../lib/mobile.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_overrides from "../lib/overrides.js";
import type * as lib_period from "../lib/period.js";
import type * as lib_qris from "../lib/qris.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_tokens from "../lib/tokens.js";
import type * as maintenance from "../maintenance.js";
import type * as map from "../map.js";
import type * as monthEnd from "../monthEnd.js";
import type * as notifications from "../notifications.js";
import type * as otp from "../otp.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as performance from "../performance.js";
import type * as plans from "../plans.js";
import type * as projection from "../projection.js";
import type * as registration from "../registration.js";
import type * as sdk from "../sdk.js";
import type * as seats from "../seats.js";
import type * as seed from "../seed.js";
import type * as sell from "../sell.js";
import type * as team from "../team.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/audit": typeof admin_audit;
  "admin/ops": typeof admin_ops;
  "admin/overrides": typeof admin_overrides;
  "admin/payments": typeof admin_payments;
  "admin/pricing": typeof admin_pricing;
  "admin/reports": typeof admin_reports;
  "admin/settings": typeof admin_settings;
  "admin/users": typeof admin_users;
  announcements: typeof announcements;
  auth: typeof auth;
  crons: typeof crons;
  customers: typeof customers;
  dashboard: typeof dashboard;
  earnings: typeof earnings;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/authz": typeof lib_authz;
  "lib/codegen": typeof lib_codegen;
  "lib/commission": typeof lib_commission;
  "lib/ledger": typeof lib_ledger;
  "lib/licenseToken": typeof lib_licenseToken;
  "lib/ltv": typeof lib_ltv;
  "lib/mobile": typeof lib_mobile;
  "lib/money": typeof lib_money;
  "lib/notify": typeof lib_notify;
  "lib/overrides": typeof lib_overrides;
  "lib/period": typeof lib_period;
  "lib/qris": typeof lib_qris;
  "lib/settings": typeof lib_settings;
  "lib/tokens": typeof lib_tokens;
  maintenance: typeof maintenance;
  map: typeof map;
  monthEnd: typeof monthEnd;
  notifications: typeof notifications;
  otp: typeof otp;
  payments: typeof payments;
  payouts: typeof payouts;
  performance: typeof performance;
  plans: typeof plans;
  projection: typeof projection;
  registration: typeof registration;
  sdk: typeof sdk;
  seats: typeof seats;
  seed: typeof seed;
  sell: typeof sell;
  team: typeof team;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
