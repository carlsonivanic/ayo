// Offline license-token signer.
//
// AYO's short SM-XXXX-XXXX-XXXXX code is the redeemable secret; after an online
// redeem we hand the POS a self-contained, offline-verifiable token in the exact
// format Sellmore already validates:
//
//   SM1.<base64url(payload)>.<base64url(signature)>
//
// Signed with ECDSA P-256 / SHA-256. The private key lives ONLY in the Convex
// env var LICENSE_PRIVATE_KEY_JWK; the POS ships the matching public key and
// never sees the private half. The payload shape and signing input MUST stay
// byte-for-byte compatible with Sellmore's decodeSubscriptionCode().

interface LicenseTokenPayload {
  v: 1;
  plan: "backup";
  activeUntil: string; // ISO8601 — the effective calendar expiry
  codeValidUntil: string; // ISO8601 — redeem window (already redeemed; set generously)
  issuedAt: string; // ISO8601
  nonce: string;
  resellerId?: string; // AYO agent id, for cross-reference on the POS side
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function importPrivateKey(): Promise<CryptoKey> {
  const raw = process.env.LICENSE_PRIVATE_KEY_JWK;
  if (!raw) {
    throw new Error(
      "LICENSE_PRIVATE_KEY_JWK is not configured on the Convex deployment",
    );
  }
  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(raw);
  } catch {
    throw new Error("LICENSE_PRIVATE_KEY_JWK is not valid JSON");
  }
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/**
 * Build and sign an offline license token for a redeemed code.
 *
 * @param activeUntilMs effective calendar expiry (ms since epoch)
 * @param resellerId    optional AYO agent id string for cross-reference
 */
export async function signLicenseToken(
  activeUntilMs: number,
  resellerId?: string,
): Promise<string> {
  const now = new Date();
  const payload: LicenseTokenPayload = {
    v: 1,
    plan: "backup",
    activeUntil: new Date(activeUntilMs).toISOString(),
    // The code has already been redeemed; the POS only re-checks this window on
    // (re)validation. Keep it comfortably beyond the active period.
    codeValidUntil: new Date(activeUntilMs + 365 * 86400000).toISOString(),
    issuedAt: now.toISOString(),
    nonce:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...(resellerId ? { resellerId } : {}),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const privateKey = await importPrivateKey();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(encodedPayload),
  );
  return `SM1.${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}
