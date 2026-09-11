# DANA API Documentation (local mirror)

125 pages mirrored from `https://dashboard.dana.id/api-docs-v2/llms/*.md` on 2026-08-27.
Paths here match the upstream path, so `api/disbursement/customer-top-up.md` is
`https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md`.

`_dana-llms-index.md` is DANA's own curated index, kept verbatim.

Re-fetch a single page:

```bash
firecrawl scrape "https://dashboard.dana.id/api-docs-v2/llms/<path>.md" -o "GUIDES/DANA/<path>.md"
```

The upstream rate limit is ~225 req/min; bulk re-fetches need backoff.

## MCP server

DANA runs a remote MCP server. `guide/integration-mcp.md`:

```json
{
  "mcpServers": {
    "DANA-MCP-INTEGRATION": {
      "command": "npx",
      "args": ["mcp-remote", "https://dana-mcp.dana.id/sse"]
    }
  }
}
```

Useful for generating signing code. This mirror stays the source of truth for
behaviour — the MCP is remote and can go down.

## What AYO actually needs

AYO takes money for subscription codes and pays commission to L1/L2 agents.
It does **not** process payments on behalf of SellMore merchants.

| Purpose | Product | Start here |
|---|---|---|
| Take payment for a code | Gapura Payment Gateway, Hosted Checkout | `guide/payment-gateway/hosted-checkout.md` |
| Pay an agent | Disbursement to Balance | `guide/disbursement/disbursement-to-balance.md` |
| Sign every request | SNAP asymmetric | `guide/authentication/authentication-asymmetric.md` |
| Node SDK | `dana-node` | `guide/getting-started/libraries.md` |
| UAT before go-live | — | `guide/scenario-testing.md`, `guide/getting-started/go-live-preparation.md` |

### Money in — Gapura Hosted Checkout

| Step | Doc |
|---|---|
| Create order, get checkout URL | `api/payment-gateway/create-order-hosted.md` |
| DANA calls back on payment | `api/payment-gateway/finish-notify.md` |
| Reconcile a stuck order | `api/payment-gateway/optional-api/query-payment.md` |
| Cancel / refund | `api/payment-gateway/optional-api/cancel-order.md`, `refund-order.md` |
| Daily settlement CSV | `guide/settlement-file/payment-services.md` |

`finish-notify` replaces the simulated `/webhooks/payment` handler in
`convex/http.ts`. Settlement is T+X to the registered bank account; X >= 1 and
is chosen by the merchant.

### Money out — Disbursement to Balance

| Step | Doc |
|---|---|
| Check MDA balance before paying | `api/disbursement/optional-api/check-disbursement-account.md` |
| Validate the agent's DANA account | `api/disbursement/optional-api/account-inquiry.md` |
| Send the money | `api/disbursement/customer-top-up.md` |
| Resolve a timeout | `api/disbursement/optional-api/customer-top-up-inquiry-status.md` |
| Daily settlement CSV | `guide/settlement-file/disbursement.md` |

Funds come from the Merchant Disbursement Account (MDA), which is separate from
Gapura settlement. Top it up through the Virtual Account shown in Merchant
Portal; in sandbox, DANA tops it up on request.

Recipient is identified by DANA-registered phone number. `users.mobile` in
`convex/schema.ts` is already normalised E.164, so no new field is needed for
this path. `payoutProfiles` (bank name / account number) is only needed if
transfer-to-bank is added later — DANA wants a bank code there, not a name, see
`api/disbursement/beneficiary-bank-code-list.md`.

Timeouts on top-up are retried, max 5 times, and must be treated as pending
rather than failed until inquiry-status says otherwise.

### Credentials

Set on the Convex deployment, never in the repo:

| Variable | Meaning |
|---|---|
| `X_PARTNER_ID` | clientId issued at onboarding |
| `CLIENT_SECRET` | issued at registration |
| `PRIVATE_KEY` | merchant RSA-2048 private key, PKCS8 |
| `DANA_PUBLIC_KEY` | verifies DANA's webhook signature |
| `ORIGIN` | AYO's public origin |
| `DANA_ENV` | `sandbox` or `production` |

Convex runs Web Crypto, which covers RSASSA-PKCS1-v1_5 signing — the same
approach `convex/lib/licenseToken.ts` already uses for ECDSA licence tokens. The
`dana-node` SDK assumes Node crypto and filesystem key paths, so the signing
helper is likely to be hand-written against
`guide/authentication/authentication-asymmetric.md`.

## Also mirrored, not currently in scope

- `api/subscription/*` — DANA-native recurring payments. Relevant only if
  SellMore self-renewal should become an automatic charge instead of a
  merchant-initiated one.
- `api/virtual-account/*` — VA as a payment method. Note the MDA top-up VA is a
  Merchant Portal feature, not this API.
- `api/dana-widget/*` — in-app DANA payments with account binding.
- `api/qris-acquirer/*`, `api/otc/*`, `api/digital-goods/*`, `api/remittance/*`,
  `api/merchant-management/*` — not applicable to AYO.
