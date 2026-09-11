# AYO

Sales and coordination app for SellMore POS. L1 field agents sell subscriptions
and lifetime seats, L2 coordinators earn an override on their L1s, admins run
pricing, payouts and reports.

Specification: `GUIDES/AYO Consolidated Reference.txt` (functional, v2.0) and
`GUIDES/AYO Backend Stack 1.3.1.txt` (backend). Section references throughout the
code point at those two files.

## Stack

- Convex — database, functions, crons, HTTP endpoints
- Convex Auth — email OTP, delivered through Resend
- Next.js (pages router) + Tailwind — mobile-first PWA for all three roles

## Run

```bash
npm install
npx convex dev          # backend, watches convex/
npm run dev             # frontend on :3000
```

First deployment:

```bash
npx convex run seed:bootstrap '{"email":"you@example.com","name":"Your Name"}'
npx convex run seed:demo      # optional demo agents, merchants and history
```

`seed:bootstrap` creates the plans, the default scheme settings and the first
admin. Sign in at `/masuk` with that email.

## Environment

Set on the Convex deployment (`npx convex env set NAME value`):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | OTP email delivery. Without it the code is logged and readable via `AYO_DEV_OTP_ECHO`. |
| `OTP_EMAIL_FROM` | Sender for OTP mail. |
| `AYO_DEV_OTP_ECHO` | `true` shows the OTP on the login screen. Development only. |
| `AYO_TRUST_DEVICE_PAYMENTS` | `true` re-enables the SDK routes that settle on the POS's word alone (`/sdk/self-renew`, `/sdk/lifetime/pay`). Off by default — they have no proof of payment. |
| `PAYMENT_WEBHOOK_SECRET` | HMAC-SHA256 secret for `/webhooks/payment`. |
| `AYO_SDK_API_KEY` | Shared secret for the SellMore device endpoints. Falls back to `POS_CLIENT_KEY`. |
| `LICENSE_PRIVATE_KEY_JWK` | ECDSA P-256 key that signs the offline licence token the POS verifies. |

Frontend: `NEXT_PUBLIC_CONVEX_URL`, and optionally
`NEXT_PUBLIC_SELLMORE_INSTALL_URL` for the lifetime fallback page.

## SellMore integration

The existing POS contract is unchanged — a short `SM-XXXX-XXXX-XXXXX` code is
redeemed online and answered with a signed `SM1.<payload>.<signature>` token that
the POS verifies offline.

```
POST /api/v1/activate   { code, deviceId, merchantName?, merchantLocation? }
POST /api/v1/renew      same shape
POST /api/v1/validate   { deviceId }
```

The full SDK surface (§39.3) lives alongside it:

```
POST /sdk/merchant-state    { storeId }
POST /sdk/path-lock         { storeId }              pre-payment lifetime gate
POST /sdk/redeem            { code, storeId }
POST /sdk/self-renew        { storeId, planKey }
POST /sdk/lifetime/pay      { token, storeId }
POST /sdk/seat/activate     { seatToken, storeId }
POST /sdk/seat/regenerate   { storeId }
POST /sdk/seats             { storeId }
```

All of them require `X-AYO-API-KEY` (or the legacy `X-Sellmore-Client`) when a
key is configured. `deviceId` and `storeId` are the same identifier.

## Payment — manual QRIS (interim)

There is no gateway yet. An admin pastes the merchant's **static QRIS** once at
`/admin/qris`; every payment link injects its own amount into a copy of it
(EMVCo tag 54, tag 01 flipped to dynamic, CRC16 recomputed — `convex/lib/qris.ts`).

```
L1 taps Tagih  →  dynamic QRIS shown on the L1's phone
buyer scans and transfers the exact amount
L1 uploads the receipt  →  code (or seats) released immediately
admin reviews at /admin/pembayaran  →  Verified or Rejected
```

The amount carries a small random suffix (150.000 → 150.347) so one line in the
bank statement maps to exactly one link. Turn it off in the QRIS settings if the
merchant account cannot take odd amounts.

Commission is booked **frozen** at upload. Frozen lines are excluded from
month-end gross and from every payout run, so an unverified payment can never
pay out. Verifying unfreezes them; rejecting expires unused codes, voids ungifted
seats, and reverses anything already released with a negative ledger line.

Known limits while this is in place:

- A receipt image is not proof. The unique amount is what makes the bank
  statement the real check.
- Verifying a payment **after** its month has been closed leaves the commission
  out of that close — re-run `/admin/tutup-bulan` for the period.
- QRIS MDR (~0,7%) is not modelled; reports show the gross price.
- A static QRIS account may cap per-transaction or monthly volume. Check the
  cap against the Lifetime prices before selling.

## Money and periods

Amounts are integer rupiah everywhere; the display format (rounded or decimal,
no currency symbol) is an admin setting applied in the client. Percentages are
rounded to the nearest 100 IDR, which is what reproduces every figure quoted in
the spec — including Lifetime Single, where 33,33% of 1.500.000 is stated as
500.000.

Periods are `YYYY-MM` in Asia/Jakarta. Crons run in UTC, timed to land in the
early Jakarta morning.

## Scheduled work

| Job | When |
|---|---|
| Apply scheduled price changes | daily |
| Mark churned merchants, expire links, codes, seat links | daily |
| Churn notifications (7 days out, window ended) | daily |
| Month-end close | 8th, for the previous month |
| L1 weekly payouts | Wednesday |
| L1 monthly and L2 payouts | 5th |

Admins can re-run the month-end close and the payout runs by hand from
`/admin/tutup-bulan` and `/admin/payout`; both are idempotent per period.

## Tests

```bash
npm test        # commission rules and end-to-end flows
npm run typecheck
```

`convex/rules.test.ts` checks the pure rules against every worked example in the
spec. `convex/flows.test.ts` drives the real mutations: sell, redeem, renew,
path-lock, seats, month-end and payout.

## Decisions taken

The backend spec leaves six items open. Implemented defaults:

- **DI-1** held is released at month-end close, not the moment the fifth customer lands.
- **DI-2** weekly payouts pay as they go; monthly accruals (jaminan, held, release) are trued up once by the first run after the close.
- **DI-5** the `NEW_SALES_ONLY` price lock applies to self-renewal, where identity is known before payment.
- **DI-6** line-level commission history is kept; nothing is archived yet.
- **MD-1** a mobile number starting `62` gets a `+` prepended.
- **MD-2** non-Indonesian numbers are accepted as plausible E.164.
