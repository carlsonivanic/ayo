import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth routes (sign-in / token refresh / etc.).
auth.addHttpRoutes(http);

// POS-facing API surface (INIT_PROMPT §"API Surface").
// Phase 1 MVP scaffolds the router shape; the license/activation engine is wired
// in a later milestone. These return 501 so the contract is visible but explicit.
const notImplemented = httpAction(async () => {
  return Response.json(
    { error: "not_implemented", message: "Endpoint belum diaktifkan (Phase 1 MVP)." },
    { status: 501 },
  );
});

for (const path of [
  "/api/v1/activate",
  "/api/v1/validate",
  "/api/v1/renew",
  "/api/v1/backup-auth",
  "/api/v1/report-event",
]) {
  http.route({ path, method: "POST", handler: notImplemented });
}
http.route({ path: "/api/v1/promos", method: "GET", handler: notImplemented });

export default http;
