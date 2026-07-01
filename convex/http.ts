import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { signLicenseToken } from "./lib/licenseToken";

const http = httpRouter();

// Convex Auth routes (sign-in / token refresh / etc.).
auth.addHttpRoutes(http);

// ---------------------------------------------------------------------------
// POS-facing API surface (Sellmore ↔ AYO).
//
// The POS is a cross-origin browser app, so every response carries CORS headers
// and each route answers the preflight OPTIONS. An optional shared client key
// (X-Sellmore-Client, checked against POS_CLIENT_KEY when configured) provides a
// light gate; the short code itself remains the real secret, and redemption is
// additionally rate-limited per device in the mutation layer.
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sellmore-Client",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS }));

/** Reject when POS_CLIENT_KEY is configured and the request key doesn't match. */
function clientKeyRejected(req: Request): boolean {
  const expected = process.env.POS_CLIENT_KEY;
  if (!expected) return false; // gate disabled
  return req.headers.get("X-Sellmore-Client") !== expected;
}

// Map the mutation's thrown reasons to a stable { error } code + HTTP status.
function redeemErrorResponse(message: string): Response {
  const m = message.toLowerCase();
  if (m.includes("not found"))
    return json({ error: "invalid_code", message: "Kode tidak ditemukan." }, 404);
  if (m.includes("already used"))
    return json({ error: "code_used", message: "Kode sudah dipakai." }, 409);
  if (m.includes("revoked"))
    return json({ error: "code_revoked", message: "Kode dibatalkan." }, 409);
  if (m.includes("expired"))
    return json({ error: "code_expired", message: "Kode kedaluwarsa." }, 409);
  if (m.includes("immutable"))
    return json(
      { error: "device_bound", message: "Perangkat sudah terikat ke agen lain." },
      409,
    );
  if (m.includes("too many"))
    return json({ error: "rate_limited", message: "Terlalu banyak percobaan." }, 429);
  return json({ error: "activation_failed", message: "Aktivasi gagal." }, 400);
}

/** Shared handler for activate + renew (renewal reuses the same redeem path). */
const redeemHandler = httpAction(async (ctx, req) => {
  if (clientKeyRejected(req)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: {
    code?: unknown;
    deviceId?: unknown;
    merchantName?: unknown;
    merchantLocation?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request", message: "Body JSON tidak valid." }, 400);
  }

  const code = typeof body.code === "string" ? body.code : "";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!code || !deviceId) {
    return json(
      { error: "bad_request", message: "code dan deviceId wajib diisi." },
      400,
    );
  }

  try {
    const result = await ctx.runMutation(internal.licenses.redeemByCode, {
      code,
      deviceId,
      merchantName:
        typeof body.merchantName === "string" ? body.merchantName : undefined,
      merchantLocation:
        typeof body.merchantLocation === "string"
          ? body.merchantLocation
          : undefined,
    });
    const token = await signLicenseToken(
      result.effectiveActiveUntil,
      result.agentId ?? undefined,
    );
    return json({
      token,
      tier: result.tier,
      activeUntil: new Date(result.effectiveActiveUntil).toISOString(),
    });
  } catch (err) {
    return redeemErrorResponse(
      err instanceof Error ? err.message : "activation_failed",
    );
  }
});

/** Online re-check of a device's current license status. */
const validateHandler = httpAction(async (ctx, req) => {
  if (clientKeyRejected(req)) {
    return json({ error: "unauthorized" }, 401);
  }
  let body: { deviceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!deviceId) return json({ error: "bad_request" }, 400);

  const status = await ctx.runQuery(internal.licenses.statusByDevice, {
    deviceId,
  });
  if (!status) return json({ status: "none" });
  return json({
    status: status.status,
    tier: status.tier,
    expiresAt: status.expiresAt ? new Date(status.expiresAt).toISOString() : null,
    creditDays: status.creditDays,
  });
});

for (const path of ["/api/v1/activate", "/api/v1/renew"]) {
  http.route({ path, method: "OPTIONS", handler: preflight });
  http.route({ path, method: "POST", handler: redeemHandler });
}
http.route({ path: "/api/v1/validate", method: "OPTIONS", handler: preflight });
http.route({ path: "/api/v1/validate", method: "POST", handler: validateHandler });

// Not yet implemented (later milestones): keep the contract visible.
const notImplemented = httpAction(async () => json(
  { error: "not_implemented", message: "Endpoint belum diaktifkan." },
  501,
));
http.route({ path: "/api/v1/backup-auth", method: "POST", handler: notImplemented });
http.route({ path: "/api/v1/report-event", method: "POST", handler: notImplemented });
http.route({ path: "/api/v1/promos", method: "GET", handler: notImplemented });

export default http;
