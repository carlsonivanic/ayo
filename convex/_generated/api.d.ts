/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admins from "../admins.js";
import type * as agentAuth from "../agentAuth.js";
import type * as agentInvites from "../agentInvites.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as codes from "../codes.js";
import type * as commissions from "../commissions.js";
import type * as http from "../http.js";
import type * as lib_codegen from "../lib/codegen.js";
import type * as lib_licenseToken from "../lib/licenseToken.js";
import type * as lib_money from "../lib/money.js";
import type * as licenses from "../licenses.js";
import type * as overview from "../overview.js";
import type * as params from "../params.js";
import type * as portal_codes from "../portal/codes.js";
import type * as portal_dashboard from "../portal/dashboard.js";
import type * as portal_earnings from "../portal/earnings.js";
import type * as portal_merchants from "../portal/merchants.js";
import type * as portal_notifications from "../portal/notifications.js";
import type * as regions from "../regions.js";
import type * as registration from "../registration.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admins: typeof admins;
  agentAuth: typeof agentAuth;
  agentInvites: typeof agentInvites;
  agents: typeof agents;
  auth: typeof auth;
  codes: typeof codes;
  commissions: typeof commissions;
  http: typeof http;
  "lib/codegen": typeof lib_codegen;
  "lib/licenseToken": typeof lib_licenseToken;
  "lib/money": typeof lib_money;
  licenses: typeof licenses;
  overview: typeof overview;
  params: typeof params;
  "portal/codes": typeof portal_codes;
  "portal/dashboard": typeof portal_dashboard;
  "portal/earnings": typeof portal_earnings;
  "portal/merchants": typeof portal_merchants;
  "portal/notifications": typeof portal_notifications;
  regions: typeof regions;
  registration: typeof registration;
  seed: typeof seed;
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
