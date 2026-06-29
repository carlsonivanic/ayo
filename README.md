# AYO — Admin Console (Phase 1 MVP)

Commercial backend + admin dashboard for the Sell More POS (Selmo). Convex backend
+ Next.js (Pages Router) admin console. See `INIT_PROMPT.md` and `ayo_prd.html`.

## Stack
- **Backend/DB:** Convex (`convex/`) — schema, queries, mutations, HTTP routes.
- **Auth:** `@convex-dev/auth` Password provider (email + password ≥16 chars).
- **Frontend:** Next.js 15 Pages Router + Tailwind + shadcn-style UI (`src/`).
- Money is `v.int64()` (BigInt IDR). `licenses.agentId` is immutable after first
  activation (enforced in `convex/licenses.ts`).

## First-time setup

```bash
npm install
npx convex dev            # provisions a local deployment, writes .env.local
```

Provision Convex Auth keys (one-time, per deployment) — generate an RS256 keypair
and set `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` (http://localhost:3000) via
`npx convex env set`. (Already done for the current local deployment.)

Seed parameters + demo data:

```bash
npx convex run seed:run
```

## Run

```bash
npx convex dev            # terminal 1 — backend (keep running)
npm run dev               # terminal 2 — http://localhost:3000
```

## Create the first admin

1. Open `/login`, click **Daftar**, create an account (password ≥16 chars).
2. You'll see "Akses menunggu persetujuan" — grant yourself a role:

```bash
npx convex run seed:grantAdmin '{"email":"you@ayo.id","role":"super_admin","name":"You"}'
```

Roles: `super_admin` (all + Parameter screen), `ops_admin` (agents + generate codes),
`finance_admin` (commissions + revoke codes).

## Screens
- `/` Ringkasan — live KPIs.
- `/agents` Salesperson — monitoring table, approval queue, status override.
- `/codes` Kode Langganan — generate (incl. Lifetime Duo pair) + revoke.
- `/commissions` Komisi — read-only L1 payout summary.
- `/settings` Parameter — system parameter registry (super_admin).

## Not in Phase 1 (per INIT_PROMPT)
L2/L3 portal & override calc, messaging, retail gift-card batches, the POS-facing
`/api/v1/*` engine (routes scaffolded in `convex/http.ts`, return 501).
