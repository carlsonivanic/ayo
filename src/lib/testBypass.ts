/**
 * DEV/TEST ONLY — frontend counterpart to convex/testBypass.ts.
 *
 * The backend bypass is gated by the server-side `TEST_BYPASS` env var (not
 * readable by the client). The frontend needs its OWN signal so that:
 *   - RouteGuard treats the visitor as an authenticated super_admin (skipping
 *     the Convex Auth loading/redirect-to-login dance), and
 *   - a visible banner warns the operator the bypass is active.
 *
 * This client flag is `NEXT_PUBLIC_TEST_BYPASS` (inlined at build time). It is
 * cosmetic on its own — the real security boundary is the server-side
 * `TEST_BYPASS` env var that gates `getCurrentAdmin`/`getCurrentAgent`. A user
 * cannot gain access by setting this client flag; they can only stop seeing the
 * banner / the login redirect.
 *
 * Enable locally:  add `NEXT_PUBLIC_TEST_BYPASS=true` to `.env.local`
 *                  AND run  `npx convex env set TEST_BYPASS true`  (server side)
 * Both must be set for the bypass to actually work end-to-end.
 */

/** True when the client build was produced with NEXT_PUBLIC_TEST_BYPASS="true". */
export const TEST_BYPASS_ENABLED =
  process.env.NEXT_PUBLIC_TEST_BYPASS === "true";
