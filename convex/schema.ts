import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// AYO — sales & coordination app for SellMore POS.
// Source of truth: GUIDES/AYO Consolidated Reference.txt (functional spec v2.0)
// and GUIDES/AYO Backend Stack 1.3.1.txt (§6 data model).
//
// Money is stored as plain integer IDR (never formatted, never a float with
// cents). Display formatting lives in the client (§29).
// Periods are "YYYY-MM" in Asia/Jakarta (§15.5).

export const role = v.union(v.literal("L1"), v.literal("L2"), v.literal("ADMIN"));
export const userStatus = v.union(
  v.literal("PENDING"),
  v.literal("ACTIVE"),
  v.literal("SUSPENDED"),
);
export const recruitmentSource = v.union(
  v.literal("L2_INVITE"),
  v.literal("PUBLIC"),
  v.literal("ADMIN_CREATE"),
);
export const payoutFrequency = v.union(v.literal("WEEKLY"), v.literal("MONTHLY"));
export const merchantState = v.union(
  v.literal("SUBSCRIBED"),
  v.literal("CHURNED"),
  v.literal("LIFETIME"),
);
export const productCategory = v.union(
  v.literal("SUBSCRIPTION"),
  v.literal("LIFETIME"),
);
// Manual QRIS review state. The code is released on upload; an admin confirms
// the transfer afterwards, and a rejection reverses everything it produced.
export const paymentVerification = v.union(
  v.literal("PENDING"),
  v.literal("VERIFIED"),
  v.literal("REJECTED"),
);
export const earningType = v.union(
  v.literal("NEW_SALES"),
  v.literal("RECURRING"),
  v.literal("RENEWAL_INCENTIVE"),
  v.literal("JAMINAN"),
  v.literal("ADJUSTMENT"),
);
export const earningStatus = v.union(v.literal("PENDING"), v.literal("CONFIRMED"));
export const warmthState = v.union(
  v.literal("WARM"),
  v.literal("COOL"),
  v.literal("COLD"),
);
export const l2Stage = v.union(
  v.literal("PROBATION"),
  v.literal("ACTIVE_FEE"),
  v.literal("DECAY_1"),
  v.literal("DECAY_2"),
  v.literal("MATURE"),
);
export const payoutStatus = v.union(
  v.literal("SCHEDULED"),
  v.literal("PAID"),
  v.literal("FAILED"),
);

export default defineSchema({
  // --- Convex Auth component tables; `users` is extended below. -------------
  ...authTables,

  // §3.4 / §6.1 users. Auth owns name/email/phone; AYO owns the rest.
  // tenureMonth is DERIVED from firstPaymentAt (§10.1) and never stored.
  users: defineTable({
    // auth-owned
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // AYO-owned
    role: v.optional(role),
    status: v.optional(userStatus),
    mobile: v.optional(v.string()), // normalized E.164, unique when present (§6.3)
    registeredAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    firstPaymentAt: v.optional(v.number()),
    assignedL2Id: v.optional(v.id("users")),
    recruitedByL2Id: v.optional(v.id("users")),
    recruitmentSource: v.optional(recruitmentSource),
    payoutFrequency: v.optional(payoutFrequency),
    suspendReason: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_role_status", ["role", "status"])
    .index("by_l2", ["assignedL2Id"])
    .index("by_recruiter", ["recruitedByL2Id"])
    .index("by_mobile", ["mobile"]),

  // §5.3 L2 invite links.
  invites: defineTable({
    l2Id: v.id("users"),
    token: v.string(),
    status: v.union(v.literal("ACTIVE"), v.literal("USED"), v.literal("REVOKED")),
    createdAt: v.number(),
    usedAt: v.optional(v.number()),
    usedByUserId: v.optional(v.id("users")),
    note: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_l2", ["l2Id"]),

  // §3.2 public registration queue.
  registrationRequests: defineTable({
    email: v.string(),
    name: v.string(),
    mobile: v.optional(v.string()),
    intendedRole: v.union(v.literal("L1"), v.literal("L2")),
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
    ),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
    decidedBy: v.optional(v.id("users")),
    reason: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // §3.5 payout profile.
  payoutProfiles: defineTable({
    userId: v.id("users"),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    completed: v.boolean(),
  }).index("by_user", ["userId"]),

  // §37 / C1. PROSPECT = absence of a row.
  merchants: defineTable({
    sellMoreStoreId: v.string(),
    storeName: v.optional(v.string()),
    ownerL1Id: v.optional(v.id("users")), // null = ownerless, permanently (§15.5)
    firstPaymentAt: v.number(),
    firstActivatedAt: v.number(),
    currentPlanId: v.optional(v.id("productPlans")),
    subscriptionStatus: merchantState,
    currentExpiryAt: v.optional(v.number()),
    lifetimeActivatedAt: v.optional(v.number()),
    // Applocator/POS extras (§26.2 map, §38.1 list)
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_store_id", ["sellMoreStoreId"])
    .index("by_owner", ["ownerL1Id"])
    .index("by_status", ["subscriptionStatus"])
    .index("by_expiry", ["currentExpiryAt"]),

  // §2 pricing. Commission is percentage-based (§20.3).
  productPlans: defineTable({
    key: v.string(), // MONTHLY | YEARLY | LIFETIME_SINGLE | LIFETIME_DUO
    name: v.string(),
    price: v.number(),
    renewalPrice: v.optional(v.number()), // §20.2 NEW_SALES_ONLY price lock
    priceUnit: v.string(), // "month" | "year" | "once"
    durationMonths: v.number(), // 1 | 12 | 0 for lifetime
    category: productCategory,
    commissionType: v.union(v.literal("RECURRING_Y"), v.literal("ONE_TIME")),
    y1Percent: v.number(),
    y2Percent: v.number(),
    y3Percent: v.number(),
    y4PlusPercent: v.number(),
    oneTimePercent: v.number(),
    seatCount: v.number(),
    active: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_active", ["active"]),

  // Per-agent special agreements. An absent field follows the global value
  // (plan percentages for L1, scheme settings for L2). Only lines booked after
  // a change read it; booked amounts never move.
  commissionOverrides: defineTable({
    userId: v.id("users"),
    active: v.boolean(),
    plans: v.array(
      v.object({
        planId: v.id("productPlans"),
        y1Percent: v.optional(v.number()),
        y2Percent: v.optional(v.number()),
        y3Percent: v.optional(v.number()),
        y4PlusPercent: v.optional(v.number()),
        oneTimePercent: v.optional(v.number()),
      }),
    ),
    renewalIncentivePercent: v.optional(v.number()),
    l2: v.optional(
      v.object({
        basePercent: v.optional(v.number()),
        decayM7_18: v.optional(v.number()),
        decayM19_30: v.optional(v.number()),
        decayM31_42: v.optional(v.number()),
      }),
    ),
    note: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_user", ["userId"]),

  // §4.1-4.4 payment links (subscription) and §4.5 lifetime deep links.
  paymentLinks: defineTable({
    l1Id: v.optional(v.id("users")), // absent = direct purchase (§15.4)
    planId: v.id("productPlans"),
    kind: productCategory,
    amount: v.number(),
    token: v.string(), // public URL token
    status: v.union(
      v.literal("SHARED"),
      v.literal("PAID"),
      v.literal("FAILED"),
      v.literal("EXPIRED"),
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    paidAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
    buyerSellMoreStoreId: v.optional(v.string()),
    buyerMerchantId: v.optional(v.id("merchants")),
    gatewayRef: v.optional(v.string()),
    refundedAt: v.optional(v.number()),

    // Manual QRIS settlement (§13 interim, until a gateway is wired up).
    // `qrisPayload` is the dynamic payload rendered for the buyer; `qrisAmount`
    // is what they actually transfer — `amount` plus a per-link unique suffix
    // so an admin can match one payment to exactly one link in the mutasi.
    qrisPayload: v.optional(v.string()),
    qrisAmount: v.optional(v.number()),
    proofStorageId: v.optional(v.id("_storage")),
    proofUploadedAt: v.optional(v.number()),
    proofUploadedBy: v.optional(v.id("users")), // absent when the buyer uploaded
    proofSource: v.optional(v.union(v.literal("L1"), v.literal("BUYER"))),
    proofNote: v.optional(v.string()),
    // Whether the buyer has ever opened the shared link. The L1 chases a link
    // that was never opened differently from one that was opened and dropped.
    firstViewedAt: v.optional(v.number()),
    lastViewedAt: v.optional(v.number()),
    viewCount: v.optional(v.number()),
    // Absent on gateway-settled links; present whenever a human must review.
    verification: v.optional(paymentVerification),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // The merchant renewed from inside SellMore with no agent in between.
    // The store is known up front, so the link is bound to it.
    source: v.optional(v.literal("SELF_RENEW")),
  })
    .index("by_token", ["token"])
    .index("by_l1", ["l1Id"])
    .index("by_l1_created", ["l1Id", "createdAt"])
    .index("by_status_expiry", ["status", "expiresAt"])
    .index("by_paidAt", ["paidAt"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_verification", ["verification", "proofUploadedAt"])
    .index("by_qris_amount", ["qrisAmount", "status"])
    .index("by_store_source", ["buyerSellMoreStoreId", "source", "status"]),

  // §5 codes — subscription products only.
  subscriptionCodes: defineTable({
    code: v.string(), // SM-XXXX-XXXX-XXXXX
    paymentLinkId: v.optional(v.id("paymentLinks")),
    l1Id: v.optional(v.id("users")),
    planId: v.id("productPlans"),
    status: v.union(v.literal("UNUSED"), v.literal("USED"), v.literal("EXPIRED")),
    generatedAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    storeName: v.optional(v.string()),
    merchantId: v.optional(v.id("merchants")),
    originalCodeId: v.optional(v.id("subscriptionCodes")),
    replacementCodeId: v.optional(v.id("subscriptionCodes")),
    redemptionType: v.optional(
      v.union(v.literal("FIRST_ACTIVATION"), v.literal("RENEWAL")),
    ),
    priceAtIssue: v.number(),
    // Merchant period before and after a renewal, so a rejected self-renew
    // payment can hand back exactly what it gave.
    previousExpiryAt: v.optional(v.number()),
    previousPlanId: v.optional(v.id("productPlans")),
    resultExpiryAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_expiry_status", ["status", "expiresAt"])
    .index("by_l1", ["l1Id"])
    .index("by_l1_generated", ["l1Id", "generatedAt"])
    .index("by_payment_link", ["paymentLinkId"])
    .index("by_usedAt", ["usedAt"]),

  // §2.2 / §15.6 unified seats.
  lifetimeSeats: defineTable({
    paymentLinkId: v.id("paymentLinks"),
    buyerSellMoreStoreId: v.optional(v.string()),
    buyerMerchantId: v.optional(v.id("merchants")),
    sellerL1Id: v.optional(v.id("users")),
    planId: v.id("productPlans"),
    seatIndex: v.number(),
    status: v.union(
      v.literal("POOLED"),
      v.literal("GIFT_LINK_ACTIVE"),
      v.literal("ACTIVATED"),
      v.literal("VOID"), // payment proof rejected — seat can never be gifted
    ),
    assignedToMerchantId: v.optional(v.id("merchants")),
    activationLinkToken: v.optional(v.string()),
    linkGeneratedAt: v.optional(v.number()),
    linkExpiresAt: v.optional(v.number()),
    activatedAt: v.optional(v.number()),
    regenerationCount: v.number(),
    unitValue: v.number(), // §24.3 unactivated seat obligation
  })
    .index("by_token", ["activationLinkToken"])
    .index("by_status", ["status"])
    .index("by_buyer_store_id", ["buyerSellMoreStoreId"])
    .index("by_payment_link", ["paymentLinkId"])
    .index("by_seller", ["sellerL1Id"])
    .index("by_link_expiry", ["status", "linkExpiresAt"]),

  // §6 / P2 append-only earning ledger.
  earningLines: defineTable({
    l1Id: v.id("users"),
    date: v.number(),
    period: v.string(), // YYYY-MM
    type: earningType,
    planId: v.optional(v.id("productPlans")),
    amount: v.number(),
    merchantId: v.optional(v.id("merchants")),
    status: earningStatus,
    sourceCodeId: v.optional(v.id("subscriptionCodes")),
    // Set when the line came from one payment, so an admin verifying or
    // rejecting that payment can find everything it produced.
    sourceLinkId: v.optional(v.id("paymentLinks")),
    frozen: v.optional(v.boolean()), // §14.6 owner suspended, or payment unverified
    settledToCompany: v.optional(v.boolean()),
    note: v.optional(v.string()),
  })
    .index("by_l1_period", ["l1Id", "period"])
    .index("by_l1_date", ["l1Id", "date"])
    .index("by_period", ["period"])
    .index("by_code", ["sourceCodeId"])
    .index("by_link", ["sourceLinkId"])
    .index("by_frozen", ["frozen"])
    .index("by_merchant", ["merchantId"]),

  // P3 acquisitions are first-class (first-time activations only).
  acquisitions: defineTable({
    l1Id: v.id("users"),
    merchantId: v.id("merchants"),
    period: v.string(),
    date: v.number(),
    sourceType: v.union(v.literal("CODE"), v.literal("SEAT")),
    sourceId: v.string(),
  })
    .index("by_l1_period", ["l1Id", "period"])
    .index("by_period", ["period"])
    .index("by_merchant", ["merchantId"]),

  // §8.1 cold streak + §9 held balance.
  l1States: defineTable({
    l1Id: v.id("users"),
    consecutiveSub5Months: v.number(),
    heldBalance: v.number(),
    lastWarmthState: v.optional(warmthState),
  }).index("by_l1", ["l1Id"]),

  monthlyL1Summaries: defineTable({
    l1Id: v.id("users"),
    period: v.string(),
    tenureMonth: v.number(),
    activationCount: v.number(),
    gross: v.number(),
    jaminan: v.number(),
    warmthState: v.optional(warmthState),
    heldPercent: v.number(),
    heldAmount: v.number(),
    releasedAmount: v.number(),
    l2FeeBase: v.number(),
    settled: v.boolean(),
    closedAt: v.number(),
  })
    .index("by_l1_period", ["l1Id", "period"])
    .index("by_period", ["period"])
    .index("by_l1_settled", ["l1Id", "settled"]),

  monthlyL2Summaries: defineTable({
    l2Id: v.id("users"),
    period: v.string(),
    totalFee: v.number(),
    settled: v.boolean(),
  }).index("by_l2_period", ["l2Id", "period"]),

  // §38.1 / §24.10 long-lived per-merchant history (exempt from archival).
  merchantEarningHistory: defineTable({
    merchantId: v.id("merchants"),
    recipientL1Id: v.optional(v.id("users")),
    date: v.number(),
    period: v.string(),
    type: earningType,
    amount: v.number(),
    paymentAmount: v.number(),
    planId: v.id("productPlans"),
    method: v.union(v.literal("CODE"), v.literal("SELF")),
    yLabel: v.string(), // Y1 | Y2 | Y3 | Y4+
  })
    .index("by_merchant", ["merchantId"])
    .index("by_merchant_date", ["merchantId", "date"])
    .index("by_recipient", ["recipientL1Id"]),

  heldRecords: defineTable({
    l1Id: v.id("users"),
    period: v.string(),
    gross: v.number(),
    heldPercent: v.number(),
    heldAmount: v.number(),
    releasedAmount: v.number(),
    releasedAt: v.optional(v.number()),
    status: v.union(v.literal("HELD"), v.literal("RELEASED")),
    settled: v.boolean(),
    note: v.optional(v.string()),
  })
    .index("by_l1_period", ["l1Id", "period"])
    .index("by_period", ["period"])
    .index("by_l1_settled", ["l1Id", "settled"]),

  l2EarningLines: defineTable({
    l2Id: v.id("users"),
    l1Id: v.id("users"),
    period: v.string(),
    l1TenureMonth: v.number(),
    stage: l2Stage,
    l1Gross: v.number(),
    effectiveFeePercent: v.number(),
    l2Fee: v.number(),
  })
    .index("by_l2_period", ["l2Id", "period"])
    .index("by_period", ["period"])
    .index("by_l1_period", ["l1Id", "period"]),

  payoutLines: defineTable({
    userId: v.id("users"),
    role: role,
    period: v.string(), // YYYY-MM or YYYY-Www
    periodStart: v.number(),
    periodEnd: v.number(),
    frequency: payoutFrequency,
    payoutDate: v.number(),
    gross: v.number(),
    jaminan: v.number(),
    held: v.number(),
    releasedHeld: v.number(),
    adjustment: v.number(),
    payable: v.number(),
    status: payoutStatus,
    paidAt: v.optional(v.number()),
    failedReason: v.optional(v.string()),
  })
    .index("by_user_period", ["userId", "period"])
    .index("by_user_date", ["userId", "payoutDate"])
    .index("by_status", ["status"])
    .index("by_period", ["period"])
    .index("by_role_status", ["role", "status"]),

  // §22.4 manual adjustments.
  adjustments: defineTable({
    userId: v.id("users"),
    role: role,
    period: v.string(),
    type: v.string(),
    amount: v.number(), // signed
    reason: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    consumedByPayoutId: v.optional(v.id("payoutLines")),
  })
    .index("by_user", ["userId"])
    .index("by_user_period", ["userId", "period"])
    .index("by_period", ["period"]),

  // §20 pricing scheduler.
  scheduledPriceChanges: defineTable({
    planId: v.id("productPlans"),
    oldPrice: v.number(),
    newPrice: v.number(),
    effectiveDate: v.number(),
    applyMode: v.union(
      v.literal("NEW_SALES_ONLY"),
      v.literal("ALL_USERS"),
    ),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("APPLIED"),
      v.literal("SUPERSEDED"),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_status_effective", ["status", "effectiveDate"])
    .index("by_plan", ["planId"]),

  // §21 single-document configuration.
  schemeSettings: defineTable({
    singleton: v.literal("GLOBAL"),
    guarantee: v.object({
      enable: v.boolean(),
      months: v.number(),
      target: v.number(),
      minActivations: v.number(),
      topUp: v.number(),
    }),
    warmth: v.object({
      startAfterMonth: v.number(),
      warmThreshold: v.number(),
      warmPayout: v.number(),
      warmHeld: v.number(),
      coolPayout: v.number(),
      coolHeld: v.number(),
      coldPayout: v.number(),
      coldHeld: v.number(),
      coldConsecutive: v.number(),
      releaseThreshold: v.number(),
    }),
    l1Target: v.object({
      m1_3: v.number(),
      m4_6: v.number(),
      m7_9: v.number(),
      m10_11: v.number(),
      m12Plus: v.number(),
    }),
    l2: v.object({
      basePercent: v.number(),
      startMonth: v.number(),
      includeJaminan: v.boolean(),
      decayM7_18: v.number(),
      decayM19_30: v.number(),
      decayM31_42: v.number(),
    }),
    recruitment: v.object({
      target: v.number(),
      countOnlyInvited: v.boolean(),
    }),
    payout: v.object({
      l1DefaultFrequency: payoutFrequency,
      l1WeeklyPayDay: v.number(), // 3 = Wednesday
      l1MonthlyPayDay: v.number(), // 5
      l2MonthlyPayDay: v.number(), // 5
    }),
    // Manual QRIS settlement. `staticPayload` is the merchant's own static
    // QRIS; every payment link injects its own amount into a copy of it.
    qris: v.optional(
      v.object({
        enabled: v.boolean(),
        staticPayload: v.optional(v.string()),
        merchantName: v.optional(v.string()),
        uniqueAmountEnabled: v.boolean(),
        uniqueAmountMax: v.number(), // random 1..max rupiah added to the price
        proofRequired: v.boolean(),
        instructions: v.optional(v.string()),
      }),
    ),
    moneyDisplay: v.union(v.literal("ROUNDED"), v.literal("DECIMAL")),
    renewalIncentivePercent: v.number(),
    ownershipWindowMonths: v.number(),
    allowDirectLifetimePurchase: v.boolean(),
    allowDirectSubscriptionPurchase: v.boolean(),
    seatLinkExpiryDays: v.number(),
    codeExpiryDays: v.number(),
    paymentLinkExpiryHours: v.number(),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),

  discordSettings: defineTable({
    singleton: v.literal("GLOBAL"),
    webhookUrl: v.optional(v.string()),
    inviteUrl: v.optional(v.string()),
    enabled: v.boolean(),
    lastTestAt: v.optional(v.number()),
    lastTestOk: v.optional(v.boolean()),
  }).index("by_singleton", ["singleton"]),

  // §32 audit log.
  auditLogEntries: defineTable({
    timestamp: v.number(),
    adminId: v.id("users"),
    action: v.string(),
    object: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    reason: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_admin", ["adminId"])
    .index("by_action", ["action"]),

  announcements: defineTable({
    title: v.string(),
    message: v.string(),
    audience: v.union(v.literal("ALL"), v.literal("L1"), v.literal("L2")),
    sendToDiscord: v.boolean(),
    discordStatus: v.optional(
      v.union(v.literal("SENT"), v.literal("FAILED"), v.literal("SKIPPED")),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  // §28 in-app notifications.
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    href: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"]),

  // Sliding-window counters for OTP + SDK abuse control (§15.6).
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),

  // Dev-only OTP echo when no email provider is configured (§5.1 fallback).
  otpDeliveries: defineTable({
    email: v.string(),
    code: v.string(),
    createdAt: v.number(),
    delivered: v.boolean(),
  }).index("by_email", ["email"]),
});
