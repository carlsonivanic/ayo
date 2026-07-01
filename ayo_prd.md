# AYO Platform PRD

**Amat Yakin Oke · Agent Network · Licensing · Commission · Notifications**

| Field | Value |
|---|---|
| Version | 1.4 — AYO rename · Phase 1 auth · Notification model |
| Product | AYO Platform (Amat Yakin Oke) — fka SMSP |
| Prepared By | Darwin Tjoe — Founder, Accurate.id |
| Audience | Development Team · Technical Architects |
| Repository | github.com/darwintjoe/ayo |
| Date | June 2026 |

---

## Section 01 — Product Overview

### Purpose

**AYO** (Amat Yakin Oke) is the commercial backend and multi-channel frontend system managing the full commercial lifecycle of the Sell More POS application. It operates independently from the Sell More app and communicates via a lightweight API. The project lives at `github.com/darwintjoe/ayo`.

AYO handles subscription licensing, agent network management, commission calculation, promotional pricing, gift card code generation, and in-platform notifications — enabling Sell More to scale to tens of millions of users without adding operational overhead.

> **Zero-COGS Architecture Principle**
> The Sell More app runs entirely locally. AYO is contacted only at install, activation, renewal, and backup. Any subscription revenue — at any price point — is almost entirely profit, enabling agent commission structures impossible for cloud-based competitors.

### System Components

| Component | Description | Users |
|---|---|---|
| Agent Mobile App | PWA for field agents — code generation, merchant list, earnings dashboard, daily workflow | L1 Field Agents |
| Coordinator Portal | Web portal for Area Coordinators — team management, activity monitoring, area performance | L2 Coordinators |
| Regional Dashboard | Executive view for Regional Masters — KPIs, coordinator oversight, bonus tracking | L3 Regional Masters |
| Admin Console | Full system control — pricing, promotions, agent management, all reporting, configuration | Sell More Admin |
| Faceless API / SDK | Lightweight REST API embedded in Sell More app for license validation, activation, backup | Sell More App |
| Notification & Messaging Module | In-platform notification bell (Phase 1) + in-app messaging for hierarchical team communication (Phase 2). WhatsApp Business API fallback deferred to Phase 2. | All Levels |

---

## Section 02 — Pricing Architecture

### Subscription Tiers

All prices configurable in Admin Console. Daily and Weekly are presented separately as a cashflow-segment entry point — never mixed with subscription tiers in the same UI view.

| Tier | Price | Notes | Agent Commission |
|---|---|---|---|
| Daily | Rp 4,000 | per day used | None — self-serve |
| Weekly | Rp 28,000 | 7 days (daily × 7) | None — self-serve |
| Monthly | Rp 69,000 | per month — price anchor | 40%→30%→20% residual (Y1/Y2/Y3) |
| **Annual** ★ TARGET | **Rp 499,000** | **per year — saves 40% vs monthly** | **Rp 150K (Y1) + Rp 100K (Y2 renewal)** |
| Lifetime Solo | Rp 1,499,000 | one-time · forever · decoy | Rp 500,000 flat (2 tranches) |
| Lifetime Duo | Rp 1,999,000 | 2 codes · 24–48h expiry | Rp 700,000 flat (2 tranches) |

> **Ariely Decoy Principle — UI Presentation Order**
> Monthly (anchor) → Annual (target — "obvious value, saves 40%") → Lifetime Solo (decoy — makes Annual look rational) → Lifetime Duo (irresistible — always below Rp 2,000,000). Annual must win. It generates the highest company LTV.

### Promotions Engine

| Promotion Type | Description | Example |
|---|---|---|
| Percentage Discount | Reduce price by X% for defined period | Ramadan: 20% off Annual |
| Fixed Amount Discount | Reduce price by fixed Rp amount | First 1,000 users: Rp 100K off Lifetime |
| Extended Duration | Add bonus days/months to subscription | Buy Annual, get 2 months free |
| Bundled Tier Upgrade | Purchase lower tier, receive higher tier pricing | Harbolnas: monthly billed at annual rate |
| Geographic Pricing | Different base price by province or city tier | Eastern Indonesia price adjustment |
| Agent-Exclusive Promo | Code valid only via agent network | Launch quarter agent push bonus |
| Referral Promo | Discount triggered when referred by existing user | Refer a friend: both get 1 month free |
| Duo Promo Variant | Adjust duo bundle price temporarily | Launch event: Duo at Rp 1,799K |
| Trial Extension | Extend 7-day trial for specific campaigns | BRI partnership: 14-day trial |

- Each promotion defines: start/end date, max redemptions, eligible tiers, eligible channels, geographic scope
- Promotions stackable or mutually exclusive — configurable per promotion
- L2+ agents can create limited promos within admin-defined bounds (e.g. max 10%, valid 7 days, own territory)
- Real-time performance dashboard: redemptions, revenue impact, conversion lift

### Gift Card / Prepaid Code Generation

| Parameter | Requirement |
|---|---|
| Code Format | `SM-XXXX-XXXX-XXXXX` — alphanumeric, case-insensitive. Exclude O, 0, I, 1, l |
| Code Types | Single-use license \| Multi-use promo \| Time-limited (expires unused) |
| Batch Generation | 10 to 100,000 codes per batch, exported as CSV or print-ready PDF |
| Embedded Metadata | Tier, duration/type, generated date, expiry date, agent ID, region |
| Validation | Server-validated on first use only. All subsequent operation fully offline. |
| Duo Code Pairing | Linked pair with shared 24–48h activation window. Code 2 held until second merchant identified. |
| Physical Voucher Export | PDF formatted for print-ready scratch card with barcode + QR per code |
| Distribution Tracking | Every code traceable to batch, agent, date, activation status in Admin Console |
| Retail Channel Codes | Separate type for Indomaret/Alfamart with retail margin metadata embedded |

---

## Section 03 — Agent Network Management

> **All parameters in this section are admin-editable**
> Every threshold, percentage, amount, and duration listed here is a named system parameter stored in the Admin Console parameter registry (Section 3.7). No values are hardcoded. Regional overrides and lifecycle-phase adjustments are supported for all parameters. Changes are future-dated and audit-logged.

### 3.1 Agent Hierarchy

| Level | Title | Manages | Scope | Roster Cap | Promotion Gate |
|---|---|---|---|---|---|
| L1 | Field Agent | Direct merchant activations | Kecamatan / City | — | Open enrollment. 3-month probation. Commitment fee `l1_commitment_fee`. |
| L2 | Area Coordinator | 10–15 Field Agents (soft cap) | City / Kabupaten | `l2_roster_soft_cap` (default: 15) | `l2_promo_min_months_l1` Active months + `l2_promo_min_activations` cumulative + `l2_promo_min_recruits` agents recruited |
| L3 | Regional Master | 5–8 Area Coordinators (soft cap) | Province / Region | `l3_roster_soft_cap` (default: 8) | `l3_promo_min_months_l2` Active L2 months + `l3_promo_min_l2s_built` L2s developed + `l3_promo_min_active_merchants` active merchants in network |

> **Roster caps are soft — not hard blocks**
> At cap: system shows "At Capacity" badge in dashboard. L2/L3 cannot accept new recruits until a slot opens (graduation, voluntary exit, or admin override). Admin can override per agent with justification log. Suspended subordinates count in roster for `l2_suspended_denominator_quarters` quarters, then auto-removed.

### 3.2 L1 Field Agent — Enrollment & Status Engine

#### Enrollment Flow

1. Agent registers via Agent App: name, phone, ID card photo, region selection
2. OTP phone verification
3. Auto-approved on valid referrer code. Every agent must register with a referrer code from an existing agent, coordinator, or regional master.
4. On approval: **Probation** status. Access to Agent Code Generator App granted. Residual earnings held in escrow.
5. Month `l1_probation_months` (default: 3): system prompts commitment fee payment of `l1_commitment_fee` (default: Rp 100,000)
6. On fee payment: **Active** status. Escrow released. Merchandise dispatched (T-shirt, mug, pouch).
7. Fee waived if agent closes `l1_fee_waiver_extra_activations` (default: 3) activations above minimum in final probation month
8. Escrow forfeited if fee not paid within `l1_escrow_forfeiture_days` (default: 30) days after probation ends

#### L1 Status Table — Quarterly KPI

Status is evaluated at the end of each quarter. All thresholds are admin-configurable parameters.

| Status | Condition | Residual | Notes |
|---|---|---|---|
| **Probation** | Month 1–`l1_probation_months`, any activity. Escrow active. | 100% | Pay `l1_commitment_fee` → Active |
| **Active** | ≥ `l1_active_min_activations` (default: 3) new activations/quarter + fee paid | 100% | Full residual. Eligible for all bonuses. |
| **Dormant** | `l1_dormant_min_activations`–`l1_active_min_activations`−1 (default: 1–2) activations/quarter | `l1_dormant_residual_pct` (50%) | Warning at week `l1_dormant_warning_week`. Recovery: hit Active threshold next quarter. |
| **Inactive** | 0 activations for 1 quarter | `l1_inactive_residual_pct` (25%) | Severe penalty. Recovery: ≥ `l1_active_min_activations` next quarter → 100%. |
| **Suspended** | 0 activations for 2 consecutive quarters. Title retained. | 0% | Override paused. Personal residuals intact. Merchant ownership retained unless Suspended for `l1_ownership_transfer_quarters` full quarter(s). |

> **Exit Behavior Protection**
> Lifetime conversions of existing monthly users do NOT count toward quarterly activation minimum. Prevents agents converting their book before leaving. Max `l1_lifetime_conversion_cap_pct` (default: 20%) of active monthly user base may be converted to lifetime per quarter per agent.

### 3.3 L2 Area Coordinator — Two-Axis KPI & Status

L2 status is evaluated **quarterly**. Both axes must be independently assessed. All thresholds are parameters.

**Axis 1 — Team Health · Quarterly**
≥ `l2_kpi_health_pct` (default: **60%**) of L1 roster at Active or Dormant status at quarter-end. Percentage (not absolute count) — scale-neutral across all roster sizes. Suspended L1s count in denominator for `l2_suspended_denominator_quarters` quarters then auto-removed.

**Axis 2 — Development · Quarterly**
≥ `l2_kpi_dev_min` (default: **1**) qualifying development event per quarter.
Qualifying events: New L1 who completed probation this quarter **— OR —** existing Dormant L1 restored to Active.

#### L2 Status Multipliers (Override Rate × Multiplier)

| Status | Multiplier | Condition |
|---|---|---|
| Active | `l2_multiplier_active` (100%) | Both axes met |
| Coasting | `l2_multiplier_coasting` (75%) | Team healthy, no development event |
| Developing | `l2_multiplier_developing` (60%) | Axis 2 met, team health degrading |
| Dormant | `l2_multiplier_dormant` (30%) | Both axes missed — 1 quarter |
| Suspended | `l2_multiplier_suspended` (0%) | Both axes missed — 2 consecutive quarters |

> **Recovery is instant — no reapplication required**
> Meet both axes in the following quarter → override multiplier immediately restored to 100%. No demotion from L2 title — ever, unless voluntary. Suspension freezes the override stream only. Personal residuals from L1-era activations are unaffected by any L2 status change.

#### L2 Promotion Gate — One-Time Only, Then Irrelevant to KPI

All three criteria must be met simultaneously. System auto-flags eligibility. Nomination from existing L2 or Admin required.

| Criteria | Threshold | Default |
|---|---|---|
| Months at Active L1 status | `l2_promo_min_months_l1` | 6 months (probation excluded) |
| Cumulative merchant activations as L1 | `l2_promo_min_activations` | 50 — one-time gate only |
| L1 agents personally recruited who completed probation | `l2_promo_min_recruits` | 3 |

After promotion: all L1-era history is irrelevant. L2 KPI is measured entirely on the two-axis system above.

### 3.4 L3 Regional Master — Two-Axis KPI & Status

L3 status is evaluated **semi-annually** (every 6 months) — not quarterly. Developing an L1 into an L2 takes a minimum of 6 months; quarterly measurement would create unsustainable promotion pressure.

**Axis 1 — Team Health · Semi-Annual**
≥ `l3_kpi_health_pct` (default: **60%**) of L2 roster at Active or *Coasting* status at period-end. Coasting is acceptable — not all L2s develop simultaneously. Suspended L2s count in denominator for 1 semi-annual period then auto-removed.

**Axis 2 — Development · Semi-Annual**
≥ `l3_kpi_dev_min` (default: **1**) qualifying development event per semi-annual period.
Qualifying events: New L2 promoted within region **— OR —** existing Dormant/Developing L2 restored to Active.

#### L3 Status Multipliers (same structure as L2, semi-annual measurement)

| Status | Multiplier | Condition |
|---|---|---|
| Active | `l3_multiplier_active` (100%) | Both axes met |
| Coasting | `l3_multiplier_coasting` (75%) | Region healthy, no new L2 developed |
| Developing | `l3_multiplier_developing` (60%) | Axis 2 met, L2 roster degrading |
| Dormant | `l3_multiplier_dormant` (30%) | Both axes missed — 1 semi-annual period |
| Suspended | `l3_multiplier_suspended` (0%) | Both axes missed — 2 consecutive semi-annual periods (= 12 months) |

#### L3 Promotion Gate — One-Time Only

Admin-nominated only. No peer nomination at L3. System auto-flags when all criteria met.

| Criteria | Threshold | Default |
|---|---|---|
| Months at Active L2 status | `l3_promo_min_months_l2` | 12 months |
| L2 coordinators developed from own L1 network | `l3_promo_min_l2s_built` | 3 |
| Active merchants in network at nomination | `l3_promo_min_active_merchants` | 1,000 |

### 3.5 Tenure Clock — The Graduation Mechanic

Every L1 agent who joins an L2's team starts a coaching tenure clock. When the clock expires, the L1 **graduates** — exits the L2's team and operates independently under company coordination. This is a designed outcome, known by both parties from day one.

```
Day 1 ──────────── Year 1 ─── Year 2 ─── Year 3 ─── Year N-1 (Warning) ─── Year N (Graduation) ─── Year N+1
[Override active — all new merchant activations generate L2 override]          [Post-graduation]
```

| Event | L1 Outcome | L2 Outcome |
|---|---|---|
| Clock starts (L1 joins team) | Enters L2 team. L2 becomes coordinator. | Override begins on all merchants this L1 activates from this point. |
| Warning (`l1_l2_graduation_warning_months` before graduation) | Notified graduation approaching. Default: 12 months before. | Dashboard alert: "Plan recruitment to replace this agent's contribution." |
| Graduation (Year `l1_l2_tenure_years`) | Exits L2 team. Remains active L1 under company coordination. All personal residuals intact. | Keeps override on all pre-graduation merchants **forever**. No override on post-graduation new acquisitions. |
| Post-graduation L1 sales | Earns full L1 commission on new merchants. No L2 in chain. | No override on new acquisitions. Historical override stream continues indefinitely. |
| L1 promoted before clock expires | New L2 role. Clock resets under L3. | Receives `l2_promo_bonus_per_l1_promoted` (default: Rp 1,500,000) one-time. No ongoing override on new L2's team. |
| Graduated L1 re-recruited by new L2 | Fresh 5-year clock starts. New merchant acquisitions generate override for new L2. | Original L2's historical override on pre-graduation merchants: unaffected. |

The same mechanic applies one level up: L2 agents under an L3 have their own `l2_l3_tenure_years` clock. After graduation, L3 retains override on the L2's pre-graduation merchant base; new acquisitions by the L2's team post-graduation generate no L3 override.

> **Cohort decay — why L2/L3 can never fully coast**
> An L2 who stops recruiting will see override income decline cohort by cohort as agents graduate. An L2 who recruits 2–3 new L1s per year maintains a rolling portfolio. The system makes projected override income visible in the L2 dashboard: "Projected override in 12 months if no new recruitment: Rp X."

### 3.6 Commission Calculation Engine

#### Field Agent — L1

| Item | Rate |
|---|---|
| Monthly Y1 (per user/mo) | `l1_monthly_commission_y1_pct` × price — Default: 40% = Rp 27,600 |
| Monthly Y2 | `l1_monthly_commission_y2_pct` × price — Default: 30% = Rp 20,700 |
| Monthly Y3 | `l1_monthly_commission_y3_pct` × price — Default: 20% = Rp 13,800 |
| Annual Y1 at close | `l1_annual_commission_y1_pct` × price — Default: 30% = Rp 150,000 |
| Annual Y2 renewal | `l1_annual_commission_y2_pct` × price — Default: 20% = Rp 100,000 |
| Lifetime Solo (flat, 2 tranches) | `l1_lifetime_solo_commission` — Default: Rp 500,000 (Rp 300K close + Rp 200K day-60) |
| Lifetime Duo (flat, 2 tranches) | `l1_lifetime_duo_commission` — Default: Rp 700,000 |

#### Area Coordinator — L2

| Item | Rate |
|---|---|
| Override on L1 residual | `l2_override_rate` × multiplier — Default: 15% |
| Override applies to | Residual ONLY — never first-month ★ |
| Area bonus | Rp `l2_bonus_area_amount`/mo if merchants > `l2_bonus_area_threshold` — Default: Rp 500,000 / 200 merchants |
| Growth bonus | Rp `l2_bonus_growth_amount`/mo if net growth ≥ `l2_bonus_growth_pct` QoQ — Default: Rp 300,000 / 10% |
| Promotion bonus (per L1→L2) | `l2_promo_bonus_per_l1_promoted` — Default: Rp 1,500,000 one-time |
| Own activations | Full L1 rate — not affected by L2 status |
| Est. income at scale | Rp 8–12 jt/mo |

#### Regional Master — L3

| Item | Rate |
|---|---|
| Override on L2 override earnings | `l3_override_rate` × multiplier — Default: 10% |
| Override applies to | L2 override ONLY — not L1 direct ★ |
| Regional bonus | Rp `l3_bonus_region_amount`/mo if merchants > `l3_bonus_region_threshold` — Default: Rp 2,000,000 / 2,000 merchants |
| Annual milestone | Rp `l3_bonus_annual_amount` if merchants > `l3_bonus_annual_threshold` — Default: Rp 10,000,000 / 5,000 merchants |
| Growth bonus | Rp `l3_bonus_growth_amount`/mo if net growth ≥ `l3_bonus_growth_pct` semi-annual — Default: Rp 1,000,000 / 10% |
| Promotion bonus (per L2→L3) | `l3_promo_bonus_per_l2_promoted` — Default: Rp 3,000,000 one-time |
| Est. income at scale | Rp 15–20 jt/mo |

> **Override Rule — Critical Design Constraint**
> Upper-tier overrides apply to **residual commission only** — never to first-month or closing commission. This prevents rewarding ghost activations up the chain. Override only flows while the L1 is within their tenure clock and generating new merchant acquisitions that are within the coaching period.

#### Payout Requirements

- **Cycle:** Weekly (Friday) via GoPay/OVO/DANA, or monthly via bank transfer — agent's choice at enrollment
- **Minimum threshold:** `payout_minimum_threshold` (default: Rp 50,000) — held until reached
- **Statement:** Itemized PDF commission statement via WhatsApp every payout cycle
- **Tax:** PPh 21 withholding auto-calculated for commission above `pph21_threshold` (default: Rp 4,500,000)/month
- **Disputes:** `payout_dispute_window_days` (default: 7)-day dispute window via in-app messaging after each payout

### 3.7 Parameter Registry

All parameters below are editable in Admin Console → Settings → Agent Parameters. Changes are future-dated, audit-logged, and support regional overrides.

#### Tenure Clock Parameters

| Parameter | Default | Description |
|---|---|---|
| `l1_l2_tenure_years` | 5 | Years of L1 coaching tenure under L2. After this, L1 graduates. Override on existing merchants continues; new acquisitions excluded. |
| `l2_l3_tenure_years` | 5 | Years of L2 coaching tenure under L3. Same mechanic, one level up. Separately configurable. |
| `l1_l2_graduation_warning_months` | 12 | Months before graduation that system alerts L2 and L1. |
| `l2_l3_graduation_warning_months` | 12 | Same warning mechanic for L2 graduating from L3 team. |
| `tenure_clock_applies_to_existing` | false | Whether clock applies retroactively to L1s already in teams at rule launch. Recommended false for Wave 1 — apply to new enrollments only. |

#### L1 — Enrollment & Status Parameters

| Parameter | Default | Description |
|---|---|---|
| `l1_probation_months` | 3 | Duration of probation period in months |
| `l1_commitment_fee` | Rp 100,000 | One-time fee at end of probation. Unlocks Active status. |
| `l1_fee_waiver_extra_activations` | 3 | Extra activations above minimum in final probation month to waive fee |
| `l1_escrow_forfeiture_days` | 30 | Days after probation end before escrowed earnings are forfeited if fee unpaid |
| `l1_active_min_activations` | 3 | Minimum new activations per quarter to maintain Active status |
| `l1_dormant_min_activations` | 1 | Minimum activations per quarter to be classified as Dormant (not Inactive) |
| `l1_dormant_warning_week` | 10 | Week of quarter at which Dormant warning is sent to agent |
| `l1_dormant_residual_pct` | 50 | Residual percentage paid to Dormant agents |
| `l1_inactive_residual_pct` | 25 | Residual percentage paid to Inactive agents |
| `l1_lifetime_conversion_cap_pct` | 20 | Max percentage of active monthly user base convertible to lifetime per agent per quarter (anti-exit gaming) |
| `l1_ownership_transfer_quarters` | 1 | Quarters at Suspended status before merchant ownership becomes transferable |
| `finder_fee_amount` | Rp 15,000–20,000 | One-time fee paid to agent who renews another agent's merchant. Does not transfer ownership. |

#### L1 — Commission Parameters

| Parameter | Default | Description |
|---|---|---|
| `l1_monthly_commission_y1_pct` | 40 | Monthly tier residual percentage, Year 1 |
| `l1_monthly_commission_y2_pct` | 30 | Monthly tier residual percentage, Year 2 |
| `l1_monthly_commission_y3_pct` | 20 | Monthly tier residual percentage, Year 3+ |
| `l1_annual_commission_y1_pct` | 30 | Annual tier commission percentage at closing, Year 1 |
| `l1_annual_commission_y2_pct` | 20 | Annual tier commission percentage at renewal, Year 2 |
| `l1_lifetime_solo_commission` | Rp 500,000 | Flat commission for Lifetime Solo. 2 tranches: Rp 300,000 at closing + Rp 200,000 if still active at day 60. |
| `l1_lifetime_duo_commission` | Rp 700,000 | Flat commission for Lifetime Duo. Same 2-tranche structure. |

#### L2 — Promotion Gate Parameters

| Parameter | Default | Description |
|---|---|---|
| `l2_promo_min_months_l1` | 6 | Minimum months at Active L1 status before L2 eligibility (probation excluded) |
| `l2_promo_min_activations` | 50 | Cumulative merchant activations as L1. One-time gate only — irrelevant after promotion. |
| `l2_promo_min_recruits` | 3 | L1 agents personally recruited who reached Active status |

#### L2 — KPI & Roster Parameters

| Parameter | Default | Description |
|---|---|---|
| `l2_kpi_period` | Quarterly | Measurement period for L2 KPI axes |
| `l2_kpi_health_pct` | 60 | Axis 1: minimum % of L1 roster at Active or Dormant status |
| `l2_kpi_dev_min` | 1 | Axis 2: minimum qualifying development events per quarter |
| `l2_roster_soft_cap` | 15 | L1 agents per L2 before "At Capacity" badge. Not a hard block. |
| `l2_roster_warning_threshold` | 13 | L1 count at which "Roster Warning" badge appears in dashboard |
| `l2_suspended_denominator_quarters` | 1 | Quarters a Suspended L1 remains in team health denominator before auto-removal |

#### L2 — Status Multipliers

| Parameter | Default | Description |
|---|---|---|
| `l2_multiplier_active` | 100 | Override multiplier % — both axes met |
| `l2_multiplier_coasting` | 75 | Override multiplier % — team healthy, no development event |
| `l2_multiplier_developing` | 60 | Override multiplier % — developing, but team health degrading |
| `l2_multiplier_dormant` | 30 | Override multiplier % — both axes missed 1 quarter |
| `l2_multiplier_suspended` | 0 | Override multiplier % — both axes missed 2 consecutive quarters |

#### L2 — Income Parameters

| Parameter | Default | Description |
|---|---|---|
| `l2_override_rate` | 15 | Override percentage on L1 residual commission (before status multiplier) |
| `l2_bonus_area_threshold` | 200 | Active merchant count in area to trigger monthly area bonus |
| `l2_bonus_area_amount` | Rp 500,000 | Monthly area bonus amount |
| `l2_bonus_growth_pct` | 10 | QoQ net active merchant growth rate to trigger growth bonus. Adjust per region maturity and product phase. |
| `l2_bonus_growth_amount` | Rp 300,000 | Monthly growth bonus amount |
| `l2_promo_bonus_per_l1_promoted` | Rp 1,500,000 | One-time bonus when a recruited L1 achieves L2 promotion. Monitor: if organic L2 promotions are rare, increase this amount. |

#### L3 — Promotion Gate Parameters

| Parameter | Default | Description |
|---|---|---|
| `l3_promo_min_months_l2` | 12 | Minimum months at Active L2 status before L3 eligibility |
| `l3_promo_min_l2s_built` | 3 | L2 coordinators developed from within this person's network |
| `l3_promo_min_active_merchants` | 1000 | Active merchants across all L1s in network at time of nomination |

#### L3 — KPI & Roster Parameters

| Parameter | Default | Description |
|---|---|---|
| `l3_kpi_period` | Semi-annual | Measurement period for L3 KPI axes (longer than L2 to match L2 development timeline) |
| `l3_kpi_health_pct` | 60 | Axis 1: minimum % of L2 roster at Active or Coasting status |
| `l3_kpi_dev_min` | 1 | Axis 2: qualifying development events per semi-annual period |
| `l3_roster_soft_cap` | 8 | L2 coordinators per L3 before "At Capacity" badge |
| `l3_roster_warning_threshold` | 7 | L2 count at which "Roster Warning" appears |

#### L3 — Status Multipliers

| Parameter | Default | Description |
|---|---|---|
| `l3_multiplier_active` | 100 | Override multiplier % — both axes met |
| `l3_multiplier_coasting` | 75 | Override multiplier % — region healthy, no new L2 developed |
| `l3_multiplier_developing` | 60 | Override multiplier % — developing, L2 roster degrading |
| `l3_multiplier_dormant` | 30 | Override multiplier % — both axes missed 1 semi-annual period |
| `l3_multiplier_suspended` | 0 | Override multiplier % — both axes missed 2 consecutive semi-annual periods |

#### L3 — Income Parameters

| Parameter | Default | Description |
|---|---|---|
| `l3_override_rate` | 10 | Override percentage on L2 override earnings (before status multiplier) |
| `l3_bonus_region_threshold` | 2000 | Active merchants to trigger monthly regional bonus |
| `l3_bonus_region_amount` | Rp 2,000,000 | Monthly regional bonus amount |
| `l3_bonus_annual_threshold` | 5000 | Active merchants for one-time annual milestone bonus |
| `l3_bonus_annual_amount` | Rp 10,000,000 | One-time annual milestone bonus |
| `l3_bonus_growth_pct` | 10 | Semi-annual net growth rate for growth bonus. Adjust per region and lifecycle phase. |
| `l3_bonus_growth_amount` | Rp 1,000,000 | Monthly growth bonus amount during qualifying periods |
| `l3_promo_bonus_per_l2_promoted` | Rp 3,000,000 | One-time bonus when a developed L2 achieves L3 promotion |

#### Shared Payout Parameters

| Parameter | Default | Description |
|---|---|---|
| `payout_minimum_threshold` | Rp 50,000 | Minimum payout balance before disbursement is triggered |
| `pph21_threshold` | Rp 4,500,000 | Monthly commission threshold above which PPh 21 withholding is auto-calculated |
| `payout_dispute_window_days` | 7 | Days after payout during which agent may raise a dispute |

### 3.8 Location & Activity Tracking

- Location logged **at code generation only** — event-based, not continuous
- Data retained 90 days, then anonymized to kecamatan level
- Admin: heatmap of activity density by kecamatan. L2: team's last-active locations, updated daily
- **Geographic density data NOT exposed to agents** — withheld until post-2M users to protect cold acquisition motivation (Phase 3)

---

## Section 04 — User Interface Specifications

### 4A — Agent Mobile App (PWA)

**Platform:** Progressive Web App, installable on Android 8+, 2GB RAM minimum. Offline-tolerant — core functions queue offline and sync on reconnection.

#### Home Dashboard
- Agent name, current status badge, today's activation count vs personal daily target
- Quarter activations vs minimum threshold — color-coded progress bar (green/amber/red)
- Estimated commission earned this month in real-time
- Residual income projection: estimated monthly income from existing base with zero new sales
- Quick actions: Generate Code | My Merchants | Notifications

#### Generate Subscription Code
- Step 1: Select tier (Monthly / Annual / Lifetime Solo / Lifetime Duo)
- Step 2: Optional merchant details (name, phone, business type)
- Step 3: Confirm payment (QRIS scan in-app or manual cash confirmation)
- Step 4: Code displayed with Copy button. Agent manually shares to merchant (clipboard copy). WhatsApp deep-link share button deferred to Phase 2.
- Duo flow: Code 1 displayed immediately. Prompt for second merchant phone before Code 2 released. Countdown timer shows 24/48h expiry.

#### My Merchants
- All activated merchants with status: Active (green) / Expiring soon (amber) / Lapsed (red)
- Tap merchant: tier, days remaining, commission earned, one-tap renewal reminder (creates in-app follow-up task). WhatsApp direct message shortcut deferred to Phase 2.

#### Earnings
- Commission breakdown by tier and period. Payout history. Escrow balance for probation agents.
- Passive income projection from current active user base

### 4B — Coordinator & Regional Portal (Web)

**Target:** L2 Area Coordinators and L3 Regional Masters. Desktop-first, responsive mobile view.

- Team summary cards: active users, activations MTD, agent counts by status, territory revenue MTD
- Agent performance table: name, status, activations this quarter, active merchants, commission, last activity
- Traffic light per agent: green = on track, amber = approaching dormant, red = at risk
- Geographic heatmap: activation density in territory. Underserved kecamatan highlighted (<5 active merchants).
- Agent last-known-location markers (event-based, daily update)
- Team broadcast messaging + direct messaging to individual agents
- Recommend agent for L2 promotion (submitted to Admin for approval)
- **L3 additional:** Coordinator performance table, regional progress toward 2K/5K user bonus thresholds, override earnings breakdown

### 4C — Admin Console (Web, Internal)

**Target:** Sell More internal team. Role-based access: super admin / finance admin / ops admin.

#### System Overview
- Real-time KPIs: total active subscribers, activations today/MTD/YTD, MRR, churn rate, active agents
- Geographic penetration map by kecamatan. Cohort retention curves by activation month.

#### Pricing Management
- Edit any tier price with effective date (future-dated changes supported)
- Tier visibility per channel. Decoy order: drag-and-drop display sequence. Commission rate editor with audit trail.

#### Agent Management
- Approval queue. Bulk status view with filters. Manual status override with reason logging.
- Promote L1→L2: set reporting L3, assign territory. Promote L2→L3: set regional boundary.
- Commission adjustment with mandatory reason + audit log. Agent location heatmap all regions.

#### Code & License Management
- All codes: unused / active / expired / revoked. Revoke any code with reason log.
- Batch generate gift card codes. Retail voucher inventory per distribution point.

#### Financial Reports
- Revenue by tier, channel, region, period. Commission payout summary and detail. PPh 21 report.
- Export: CSV, PDF, Excel for all reports.

---

## Section 05 — Faceless API / SDK

Integration layer between Sell More app and AYO backend. Called only at specific lifecycle events. App operates fully offline between API calls.

| Method | Endpoint | Description | Parameters |
|---|---|---|---|
| POST | `/activate` | User enters subscription code. Validates, marks used, returns encrypted license payload. | `code`, `device_id`, `install_timestamp` |
| POST | `/validate` | First-run on new device. Returns trial config and available self-serve tiers for this region. | `device_id`, `app_version`, `region` |
| POST | `/renew` | User completes self-serve QRIS payment. Returns new license payload and expiry date. | `device_id`, `payment_ref`, `tier_selected` |
| POST | `/backup-auth` | User initiates Google Drive backup. Issues short-lived JWT for Google API authorization. | `device_id`, `license_hash` |
| POST | `/report-event` | Fire-and-forget milestone events. Powers Day 3, Day 7, Day 30 retention notifications. | `device_id`, `event_type`, `event_timestamp` |
| GET | `/promos` | Called when app opens payment screen. Returns active promotions applicable to this device and region. | `device_id`, `region`, `current_tier` |
| POST | `/verify-agent` | Agent App login. Verifies OTP, returns agent profile, permissions, and auth token. | `phone`, `otp` |
| POST | `/generate-code` | Agent generates code after payment confirmation. Returns code(s) and QR image URL. | `auth_token`, `tier`, `quantity`, `payment_confirmed` |

### License Payload Structure

| Field | Type | Description |
|---|---|---|
| `license_id` | UUID | Unique identifier for this license instance |
| `device_id` | String | Device fingerprint — not transferable without re-activation |
| `tier` | Enum | daily \| weekly \| monthly \| annual \| lifetime |
| `activated_at` | ISO8601 | Timestamp of activation |
| `expires_at` | ISO8601 \| null | Null for lifetime licenses |
| `credit_days` | Integer | Remaining days of credit (daily/weekly tiers) |
| `grace_period_days` | Integer | Days offline before cashier blocked (default: 3) |
| `signature` | HMAC-SHA256 | Server-signed hash to prevent local tampering |
| `agent_id` | UUID \| null | Agent who activated. Null for self-serve. |

> **License Enforcement on Expiry**
> On expiry: **Admin login remains fully functional. All reports accessible. Cashier login blocked only.** Owner sees their data and feels the value they are about to lose. Expiry message framing: "Your 847 transactions are saved — activate subscription to continue recording."

---

## Section 06 — In-Platform Messaging Module

**Phase 1:** In-platform notification bell delivering system-generated alerts to agents. No external messaging dependency. **Phase 2:** Full in-app messaging (direct messages, team broadcasts, voice notes). WhatsApp Business API fallback for agents inactive >24h added in Phase 2.

| Channel Type | Created By | Visible To | Use Case |
|---|---|---|---|
| Direct Message | Any agent to any within their hierarchy | Sender + recipient | Agent to coordinator: activation issue, merchant problem |
| Team Broadcast | L2 Coordinator | All L1s in their team | Promo announcement, target reminder, motivation |
| Regional Broadcast | L3 Regional Master | All L2s in region | Regional campaign, performance update |
| Admin Broadcast | Admin Console | All agents or filtered subset | Product updates, promo launch, policy changes |
| System Notifications | Platform (automated) | Target agent/coordinator | Status changes, payout alerts, code expiry warnings |

#### Core Features
- **Phase 2:** Text with emoji, image attachments, PDF attachments
- **Phase 3:** Voice messages (important for agents who prefer speaking over typing)
- Read receipts, quoted reply, message search within conversation
- Hierarchy enforcement: cross-hierarchy messaging blocked (L1 in Region A cannot message L1 in Region B)
- **Phase 2:** WhatsApp fallback — if agent has not opened app in 24h, message delivered to registered WhatsApp as plain text

#### Automated System Messages
- Commission payout notification with link to full PDF statement
- Status change: *"Status Anda berubah ke Dormant — butuh 2 aktivasi lagi bulan ini"*
- Code expiry: *"Kode duo yang Anda buat kedaluwarsa dalam 4 jam"*
- Merchant lapse alert: *"Pelanggan Anda [Warung Padang Bu Sari] berakhir 3 hari lagi"*

---

## Section 07 — Non-Functional Requirements

| Category | Metric | Requirement |
|---|---|---|
| Performance | API response time | <500ms activation and validation endpoints (p95) |
| Performance | Code generation | <2 seconds from payment confirmation to code display |
| Performance | Concurrent agents | 50,000 simultaneous agent app sessions at peak |
| Security | License integrity | HMAC-SHA256 signed payload — prevents local tampering |
| Security | Agent auth — Phase 1 | Username + password. JWT session token. No external provider dependency. |
| Security | Agent auth — Phase 2 | Phone OTP replaces password login. Optional PIN for repeat sessions. |
| Security | Admin Console — Phase 1 | IP whitelist + strong password (min 16 chars, enforced). Role-based access: super_admin / finance_admin / ops_admin. |
| Security | Admin Console — Phase 2 | 2FA added (TOTP). IP whitelist retained. |
| Availability | API uptime | 99.5% monthly — app continues offline during downtime |
| Availability | Agent App uptime | 99.9% — agent revenue depends on code generation |
| Scalability | Architecture | Stateless API servers, horizontal scaling, DB sharded by region |
| Compliance | Data residency | All data in Indonesian data centers (Kominfo compliance) |
| Compliance | Payments | QRIS via licensed gateway (Midtrans or Xendit) |
| Compliance | Tax | PPh 21 withholding auto-calculated per DJP regulations |
| Compliance | Privacy | UU PDP (Personal Data Protection Law) compliant |

---

## Section 08 — External Integration Dependencies

| Integration | Purpose | Provider Options | Phase |
|---|---|---|---|
| QRIS Payment Gateway | Self-serve subscription payment, agent code payment confirmation | Midtrans, Xendit, Doku | Phase 1 |
| Google Drive API | Issue backup tokens to authenticated Sell More app devices | Google Cloud | Phase 1 |
| GoPay / OVO / DANA | Agent commission payout disbursement | Midtrans Iris, Xendit Disbursement | Phase 1 |
| Maps / Geocoding | Agent location heatmap, kecamatan boundary display in dashboards | OpenStreetMap + Leaflet (primary). Google Maps optional. | Phase 1 |
| Firebase Cloud Messaging | In-app push notifications to Sell More POS app (Day 3/7/30 retention events). Agent App in-app notification bell. | Firebase Cloud Messaging | Phase 1 |
| Google Calendar API | Daily sales report calendar event for merchant admin accounts | Google Cloud | Phase 2 |
| WhatsApp Business API | Commission statements, status alerts, code delivery, merchant renewal reminders — WhatsApp fallback for inactive agents | Twilio, Wati, Zoko | Phase 2 |
| SMS Gateway | OTP delivery for agent authentication (replaces password login in Phase 2) | Twilio, Vonage, local Indonesian providers | Phase 2 |
| PPh 21 / DJP Integration | Automated tax withholding reporting per DJP regulations | DJP API or manual export | Phase 3 |

---

## Section 09 — Phased Delivery Roadmap

### Phase 1 — MVP: Wave 1 Launch
*200–300 agents · up to 50K users*

- Agent App: code generation, merchant list, earnings, username/password auth
- Admin Console: agent approval, code management, basic pricing config
- API/SDK: activate, validate, renew, backup-auth endpoints
- Commission Engine: L1 only, weekly payout via e-wallet
- All 6 pricing tiers + basic promo code support
- Notifications: in-app notification bell only. No external messaging provider.

### Phase 2 — Scale: Wave 2 Expansion
*5,000 agents · 2 million users*

- Coordinator & Regional Portal (L2/L3 dashboards)
- Commission Engine: L2/L3 override calculation
- Full promotion engine + agent-created promos
- Agent status automation + geographic reports
- In-app messaging: direct messages + team broadcast
- WhatsApp Business API integration (notifications + fallback)
- Phone OTP auth upgrade — replaces Phase 1 password login
- Admin Console: 2FA (TOTP) added
- Retail gift card batch generation for Indomaret/Alfamart

### Phase 3 — Ecosystem: Wave 3 Dominance
*10M+ users · full platform*

- Voice messages + file attachments in messaging
- Cohort analysis + LTV reporting in Admin
- Lifetime cap enforcement + PPh 21 automation
- Geographic pricing tiers + B2B/institutional pricing
- Aggregated data reporting layer (data product foundation)
- Geographic density data released to agent dashboards

---

## Section 10 — Open Items & Decisions Required

**✓ All 8 open items resolved — v1.1**

**✓1 Self-Serve: Monthly + Annual both available**
Both Monthly (Rp 69,000) and Annual (Rp 499,000) appear in self-serve channel. System automatically calculates and attributes residual commission to the original activating agent even when merchant self-renews. agent_id is immutable after first activation.

**✓2 Platform: PWA confirmed**
Agent App built as Progressive Web App. Installable on Android 8+, 2GB RAM minimum. Offline-tolerant with sync on reconnection.

**✓3 Agent Enrollment: Auto-approve with referrer link/code**
Open enrollment, auto-approved. Every agent receives a unique referral link/code. New agent registrations must include a referrer code — from an existing agent, coordinator, or regional master. Referrer is recorded for accountability and network tracing. No manual review queue.

**✓4 Chasm Bonus: Dropped entirely**
Verification is impractical and creates a policing overhead that outweighs the behavioral benefit. Early sprint bonuses will be handled through the Promotions Engine instead — activated by admin whenever needed, with full control over timing, duration, and amount.

**✓5 Territory Definition: Flexible, admin-defined**
No fixed geographic boundaries. Admin assigns territory per coordinator manually. Location tracking is for agent distribution visibility only — not for territory enforcement.

**✓6 Retail Voucher Logistics: Internal ops (Phase 2)**
Managed internally for now. No third-party distribution partner at launch. Revisit when voucher volume justifies dedicated logistics arrangement.

**✓7 Lifetime Sunset: Manual admin toggle, no advance notice required**
Admin announces and disables new lifetime sales manually when target threshold is reached. No automated notice or pipeline protection. Existing lifetime users honored permanently.

**→8 Geographic Density Data (Phase 3): Deferred**
Withheld from agents in Phase 1 and 2. Phase 3 release criteria to be defined closer to the time. Not blocking current development.

---

### ✓ Agent Payment Model — Confirmed: Model B (Full Price + Net Settlement)

Agents pay **full retail price** to Sell More per code generated. Commission paid out on weekly cycle via net settlement.

**Net settlement mechanics:** Agent payout = commissions earned − cash collected on behalf of company. QRIS payments go directly to Sell More; commission paid to agent on Friday. Cash payments collected by agent; agent remits net amount on payout day. Agents require zero float capital.

**Why Model B:** Enables merchant ownership tracking independently from code generation. Enables renewal protection (see below). Keeps commission structure adjustable without changing agent pricing. Makes L2/L3 override calculations unambiguous.

---

### ✓ Renewal Protection Rule — Confirmed

Every merchant is permanently linked to their original activating agent (agent_id, immutable). When a **different agent** generates a renewal code for that merchant:

- New agent receives a **one-time finder fee only** (Rp 15,000–20,000) — not commission ownership
- Original agent retains full residual commission stream uninterrupted
- Residual ownership transfers to new agent **only if** original agent has been Suspended for at least one full quarter (genuinely abandoned the merchant)
- Merchant can request formal agent transfer via Admin Console

**Dormant agents** (50% residual) retain ownership — they are still active. Only Suspended (0%) triggers transferability.

**Transaction type rules — KPI and override treatment:**

| Transaction Type | Counts for KPI | L2 Override Applies |
|---|---|---|
| New merchant activation | ✓ Yes | ✓ Yes (on residual) |
| Self-serve renewal (own merchant) | ✗ No | ✓ Yes (residual continues) |
| Finder fee renewal (other agent's merchant) | ✗ No | ✗ No |

---

## Document Control

| | |
|---|---|
| Next Review | After Phase 1 architecture review with development team |
| Change Log | v1.4 — June 2026 — Project renamed to AYO (Amat Yakin Oke). Phase 1 auth simplified: username/password replaces OTP; 2FA deferred to Phase 2; WhatsApp Business API deferred to Phase 2. In-app notification bell is Phase 1 delivery channel. Section 8 integrations table phased. Section 9 Phase 1/2 bullets updated. |
| | v1.3 — June 2026 — Full L2/L3 KPI schema + Tenure Clock + Parameter Registry. Removed Chasm Bonus. Fixed Annual Y1 commission to Rp 150,000. Two-axis status engine, multiplier tables, promotion gates, graduation rules, cohort decay model. All thresholds named parameters. |
| | v1.2 — Added finder fee KPI and override rules |
| Repository | github.com/darwintjoe/ayo |
| Distribution | Darwin Tjoe (Founder) · Development Lead · Technical Architect |
| Classification | Confidential — Accurate.id / Otter.id / Sell More |
