import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { ActionCtx, httpAction } from "./_generated/server";
import { auth } from "./auth";
import { signLicenseToken } from "./lib/licenseToken";

// Two authentication domains meet here (§4 / P10):
//   * SellMore device endpoints — shared secret in X-AYO-API-KEY.
//   * Payment gateway webhook  — HMAC signature over the raw body.
// The PWA never calls these routes; it uses the Convex client with a session.

const http = httpRouter();
auth.addHttpRoutes(http);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-AYO-API-KEY, X-Sellmore-Client, X-Signature",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const preflight = httpAction(
  async () => new Response(null, { status: 204, headers: CORS }),
);

/** Shared secret gate for every device endpoint. */
function apiKeyRejected(req: Request): boolean {
  const expected = process.env.AYO_SDK_API_KEY ?? process.env.POS_CLIENT_KEY;
  if (!expected) return false; // no key configured yet — gate disabled
  const provided =
    req.headers.get("X-AYO-API-KEY") ?? req.headers.get("X-Sellmore-Client");
  return provided !== expected;
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const ERROR_COPY: Record<string, { status: number; message: string }> = {
  invalid_code: { status: 404, message: "Kode tidak ditemukan." },
  code_used: { status: 409, message: "Kode sudah dipakai." },
  code_expired: { status: 409, message: "Kode kedaluwarsa." },
  path_locked: { status: 409, message: "Tidak tersedia untuk perangkat ini." },
  plan_missing: { status: 409, message: "Paket tidak tersedia." },
  unknown_merchant: { status: 404, message: "Toko belum terdaftar." },
  invalid_link: { status: 404, message: "Tautan tidak valid." },
  link_expired: { status: 409, message: "Tautan kedaluwarsa." },
  link_closed: { status: 409, message: "Tautan sudah tidak berlaku." },
  already_paid: { status: 409, message: "Pembayaran sudah tercatat." },
  invalid_seat: { status: 404, message: "Kursi tidak ditemukan." },
  seat_used: { status: 409, message: "Kursi sudah dipakai." },
  seat_link_expired: { status: 409, message: "Tautan kursi kedaluwarsa." },
  no_seat: { status: 404, message: "Tidak ada kursi tersedia." },
  settlement_manual: {
    status: 503,
    message: "Pembayaran lewat aplikasi belum aktif. Hubungi agen Anda.",
  },
  NOT_PROSPECT: { status: 409, message: "Toko sudah berlangganan." },
  rate_limited: { status: 429, message: "Terlalu banyak percobaan. Coba lagi nanti." },
  plan_not_allowed: { status: 409, message: "Paket tidak bisa dipilih." },
  qris_not_configured: { status: 503, message: "Pembayaran QRIS belum tersedia." },
  invalid_proof: { status: 400, message: "Bukti bayar harus berupa gambar maks. 5 MB." },
};

function errorResponse(code: string): Response {
  const copy = ERROR_COPY[code] ?? { status: 400, message: "Permintaan gagal." };
  return json({ error: code, message: copy.message }, copy.status);
}

const LIFETIME_HORIZON_MS = 100 * 365 * 24 * 60 * 60 * 1000;

function tierFor(planKey: string): string {
  if (planKey === "MONTHLY") return "monthly";
  if (planKey === "YEARLY") return "annual";
  return "lifetime";
}

// ---------------------------------------------------------------------------
// SellMore POS compatibility surface (unchanged contract).
// The POS types a short SM-XXXX code and receives a signed offline token.
// ---------------------------------------------------------------------------

const redeemHandler = httpAction(async (ctx, req) => {
  if (apiKeyRejected(req)) return json({ error: "unauthorized" }, 401);
  const body = await readJson(req);
  if (!body) return json({ error: "bad_request", message: "Body JSON tidak valid." }, 400);

  const code = str(body.code);
  const storeId = str(body.deviceId) ?? str(body.storeId);
  if (!code || !storeId) {
    return json(
      { error: "bad_request", message: "code dan deviceId wajib diisi." },
      400,
    );
  }

  const result = await ctx.runMutation(internal.sdk.redeemSubscriptionCode, {
    code,
    storeId,
    storeName: str(body.merchantName) ?? str(body.storeName),
    location: str(body.merchantLocation) ?? str(body.location),
  });
  if (!result.ok) return errorResponse(result.error);

  const activeUntil = result.lifetime
    ? Date.now() + LIFETIME_HORIZON_MS
    : (result.expiresAt ?? Date.now());
  const token = await signLicenseToken(activeUntil);
  return json({
    token,
    tier: tierFor(result.planKey),
    activeUntil: new Date(activeUntil).toISOString(),
    redemptionType: result.redemptionType,
  });
});

const validateHandler = httpAction(async (ctx, req) => {
  if (apiKeyRejected(req)) return json({ error: "unauthorized" }, 401);
  const body = await readJson(req);
  const storeId = body ? (str(body.deviceId) ?? str(body.storeId)) : undefined;
  if (!storeId) return json({ error: "bad_request" }, 400);

  const state = await ctx.runQuery(internal.sdk.merchantState, { storeId });
  if (state.state === "PROSPECT") return json({ status: "none", state: "PROSPECT" });
  const active =
    state.state === "LIFETIME" ||
    (state.expiresAt !== null && state.expiresAt > Date.now());
  return json({
    status: active ? "active" : "expired",
    state: state.state,
    tier: state.planKey ? tierFor(state.planKey) : null,
    expiresAt: state.expiresAt ? new Date(state.expiresAt).toISOString() : null,
    creditDays: 0,
  });
});

for (const path of ["/api/v1/activate", "/api/v1/renew"]) {
  http.route({ path, method: "OPTIONS", handler: preflight });
  http.route({ path, method: "POST", handler: redeemHandler });
}
http.route({ path: "/api/v1/validate", method: "OPTIONS", handler: preflight });
http.route({ path: "/api/v1/validate", method: "POST", handler: validateHandler });

// ---------------------------------------------------------------------------
// AYO SDK contract (§39.3).
// ---------------------------------------------------------------------------

const sdkRoute = (
  handler: (ctx: ActionCtx, body: Record<string, unknown>) => Promise<Response>,
) =>
  httpAction(async (ctx, req) => {
    if (apiKeyRejected(req)) return json({ error: "unauthorized" }, 401);
    const body = await readJson(req);
    if (!body) return json({ error: "bad_request" }, 400);
    return await handler(ctx, body);
  });

const routes: Record<string, ReturnType<typeof sdkRoute>> = {
  "/sdk/merchant-state": sdkRoute(async (ctx, body) => {
    const storeId = str(body.storeId);
    if (!storeId) return json({ error: "bad_request" }, 400);
    return json(await ctx.runQuery(internal.sdk.merchantState, { storeId }));
  }),

  "/sdk/path-lock": sdkRoute(async (ctx, body) => {
    const storeId = str(body.storeId);
    if (!storeId) return json({ error: "bad_request" }, 400);
    return json(
      await ctx.runMutation(internal.sdk.pathLockCheck, {
        storeId,
        storeName: str(body.storeName),
      }),
    );
  }),

  "/sdk/redeem": sdkRoute(async (ctx, body) => {
    const code = str(body.code);
    const storeId = str(body.storeId);
    if (!code || !storeId) return json({ error: "bad_request" }, 400);
    const result = await ctx.runMutation(internal.sdk.redeemSubscriptionCode, {
      code,
      storeId,
      storeName: str(body.storeName),
      location: str(body.location),
    });
    if (!result.ok) return errorResponse(result.error);
    return json(result);
  }),

  "/sdk/self-renew": sdkRoute(async (ctx, body) => {
    const storeId = str(body.storeId);
    const planKey = str(body.planKey);
    if (!storeId || !planKey) return json({ error: "bad_request" }, 400);
    const result = await ctx.runMutation(internal.sdk.reportSelfRenewal, {
      storeId,
      planKey,
      amountPaid: typeof body.amountPaid === "number" ? body.amountPaid : undefined,
    });
    if (!result.ok) return errorResponse(result.error);
    const token = await signLicenseToken(result.expiresAt);
    return json({ ...result, token });
  }),

  "/sdk/lifetime/pay": sdkRoute(async (ctx, body) => {
    const token = str(body.token);
    const storeId = str(body.storeId);
    if (!token || !storeId) return json({ error: "bad_request" }, 400);
    const result = await ctx.runMutation(internal.sdk.payLifetimeLink, {
      token,
      storeId,
      storeName: str(body.storeName),
    });
    if (!result.ok) return errorResponse(result.error);
    const licence = await signLicenseToken(Date.now() + LIFETIME_HORIZON_MS);
    return json({ ...result, token: result.activated ? licence : null });
  }),

  "/sdk/seat/activate": sdkRoute(async (ctx, body) => {
    const seatToken = str(body.seatToken);
    const storeId = str(body.storeId);
    if (!seatToken || !storeId) return json({ error: "bad_request" }, 400);
    const result = await ctx.runMutation(internal.sdk.activateSeatByToken, {
      seatToken,
      storeId,
      storeName: str(body.storeName),
    });
    if (!result.ok) return errorResponse(result.error);
    const licence = await signLicenseToken(Date.now() + LIFETIME_HORIZON_MS);
    return json({ ok: true, token: licence, tier: "lifetime" });
  }),

  "/sdk/seat/regenerate": sdkRoute(async (ctx, body) => {
    const storeId = str(body.storeId);
    if (!storeId) return json({ error: "bad_request" }, 400);
    const result = await ctx.runMutation(internal.sdk.regenerateSeatLink, { storeId });
    if (!result.ok) return errorResponse(result.error);
    return json(result);
  }),

  "/sdk/seats": sdkRoute(async (ctx, body) => {
    const storeId = str(body.storeId);
    if (!storeId) return json({ error: "bad_request" }, 400);
    return json({ seats: await ctx.runQuery(internal.sdk.seatPool, { storeId }) });
  }),
};

// ---------------------------------------------------------------------------
// Self renewal from inside SellMore (QRIS + receipt, no agent).
// ---------------------------------------------------------------------------

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

const selfRenewCreate = httpAction(async (ctx, req) => {
  if (apiKeyRejected(req)) return json({ error: "unauthorized" }, 401);
  const body = await readJson(req);
  const storeId = body ? str(body.storeId) : undefined;
  const planKey = body ? str(body.planKey) : undefined;
  if (!storeId || !planKey) return json({ error: "bad_request" }, 400);
  const result = await ctx.runMutation(internal.selfRenew.createLink, {
    storeId,
    planKey,
    ip: clientIp(req),
  });
  if (!result.ok) return errorResponse(result.error);
  return json(result.link);
});
http.route({ path: "/sdk/self-renew/create", method: "OPTIONS", handler: preflight });
http.route({ path: "/sdk/self-renew/create", method: "POST", handler: selfRenewCreate });

routes["/sdk/self-renew/offer"] = sdkRoute(async (ctx, body) => {
  const storeId = str(body.storeId);
  if (!storeId) return json({ error: "bad_request" }, 400);
  const result = await ctx.runQuery(internal.selfRenew.offer, { storeId });
  if (!result.ok) return errorResponse(result.error);
  return json(result);
});

// Not a JSON route: the receipt arrives as multipart/form-data.
const selfRenewProof = httpAction(async (ctx, req) => {
  if (apiKeyRejected(req)) return json({ error: "unauthorized" }, 401);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const storeId = str(form.get("storeId"));
  const token = str(form.get("token"));
  const file = form.get("file");
  if (!storeId || !token || !(file instanceof Blob)) return json({ error: "bad_request" }, 400);
  if (!file.type.startsWith("image/") || file.size === 0 || file.size > MAX_PROOF_BYTES) {
    return errorResponse("invalid_proof");
  }

  const storageId = await ctx.storage.store(file);
  const result = await ctx.runMutation(internal.selfRenew.submitProof, {
    storeId,
    token,
    storageId,
    ip: clientIp(req),
  });
  if (!result.ok) {
    await ctx.storage.delete(storageId);
    return errorResponse(result.error);
  }
  return json(result);
});
http.route({ path: "/sdk/self-renew/proof", method: "OPTIONS", handler: preflight });
http.route({ path: "/sdk/self-renew/proof", method: "POST", handler: selfRenewProof });

for (const [path, handler] of Object.entries(routes)) {
  http.route({ path, method: "OPTIONS", handler: preflight });
  http.route({ path, method: "POST", handler });
}

// ---------------------------------------------------------------------------
// Payment gateway webhook (§13). The gateway echoes the link token as its
// reference; the signature is an HMAC-SHA256 of the raw body.
// ---------------------------------------------------------------------------

async function signatureValid(raw: string, provided: string | null): Promise<boolean> {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !provided) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === provided.toLowerCase();
}

http.route({
  path: "/webhooks/payment",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    if (!(await signatureValid(raw, req.headers.get("X-Signature")))) {
      return json({ error: "invalid_signature" }, 401);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return json({ error: "bad_request" }, 400);
    }

    const token = str(body.reference) ?? str(body.external_id);
    const status = (str(body.status) ?? "").toUpperCase();
    if (!token) return json({ error: "bad_request" }, 400);

    if (status === "FAILED" || status === "EXPIRED") {
      await ctx.runMutation(internal.payments.failPaymentByToken, { token });
      return json({ received: true });
    }

    const result = await ctx.runMutation(internal.payments.processPaymentByToken, {
      token,
      gatewayRef: str(body.id),
      idempotencyKey: str(body.id),
      buyerStoreId: str(body.storeId),
    });
    // Always 200 on a verified delivery so the gateway stops retrying.
    return json({ received: true, ...result });
  }),
});

export default http;
