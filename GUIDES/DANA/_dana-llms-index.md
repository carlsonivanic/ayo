# DANA Merchant Portal API Documentation

> Curated LLM entry point for DANA Merchant Portal API documentation. Use these Markdown files to understand onboarding, authentication, sandbox testing, Gapura Payment Gateway integration, Disbursement, Merchant Management, API behavior, and settlement reporting.

## Start Here

- [DANA Enterprise Overview](https://dashboard.dana.id/api-docs-v2/llms/guide/overview.md): High-level overview of DANA Enterprise solutions, including Gapura Payment Gateway, Integrated Payment, Disbursement, and Merchant Management.
- [Getting Started](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/getting-started-onboarding.md): Steps to create a DANA Enterprise account, complete business information, and access the onboarding dashboard.
- [Business Verification Overview](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/business-verification-overview.md): Business document verification, required documents, upload flow, and validation steps.
- [Integration Overview](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/integration-overview.md): Developer dashboard, webhook setup, credentials, and integration preparation.

## Developer Tools

- [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md): Asymmetric signature authentication, public/private key usage, credential setup, and SNAP request signing.
- [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md): DANA API client libraries and self-testing tools for Go, Node.js, Java, PHP, and Python.
- [Sandbox Tools](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/sandbox-tools.md): Sandbox helper tools for transaction simulation and integration testing.
- [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md): UAT scenario checklist and testing flow before going live.

## Recommended Integration Paths

Use [DANA libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) to integrate faster and reduce manual work for request signing, request formatting, and response parsing.

| Goal | Use This When | Primary Docs | API References |
| --- | --- | --- | --- |
| Custom Checkout with SDK | Merchant builds their own checkout page, consults available payment methods, and creates orders through DANA APIs. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Gapura Custom Checkout Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/custom-checkout.md) | [Consult Pay](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/consult-pay.md), [Create Order - Custom Checkout](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md), [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md) |
| Hosted Checkout with SDK | Merchant redirects users to a DANA-hosted checkout page and receives payment notification after completion. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Gapura Hosted Checkout Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/hosted-checkout.md) | [Create Order - Hosted Checkout](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md), [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md) |
| DANA Widget Binding with SDK | Merchant links a user's DANA account to the merchant platform, exchanges authCode for accessToken, then creates DANA Widget payments. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [DANA Widget Binding Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/widget-binding.md), [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md) | [Deeplink Binding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/deeplink-binding.md), [Apply Token](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-token.md), [Apply OTT](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-ott.md), [Direct Debit Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) |
| DANA Widget Non Binding with SDK | Merchant lets users pay with DANA without account binding, redirecting users to DANA App or Web View to complete payment. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [DANA Widget Non Binding Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/widget-non-binding.md), [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md) | [Direct Debit Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) |
| DANA Widget post-payment operations | Merchant needs to check DANA Widget payment status, cancel an order, or refund a DANA Widget payment after order creation. | [DANA Widget API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/overview.md) | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md), [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md), [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) |
| DANA Widget account and transaction inquiry | Merchant needs to unbind a user's DANA account, query user profile data, check balance, or retrieve DANA transaction history and details. | [DANA Widget API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/overview.md), [DANA Widget Binding Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/widget-binding.md) | [Account Unbinding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/account-unbinding.md), [Query User Profile](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-user-profile.md), [Balance Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md), [Transaction History](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-history.md), [Transaction Detail](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-detail.md), [Unbind Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/unbind-notify.md) |
| Disbursement to DANA Balance with SDK | Merchant transfers funds from a merchant disbursement account to a user's DANA balance, validates the user's DANA account, and checks top up status when needed. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Disbursement to Balance Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-balance.md), [Disbursement API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md) | [Check Disbursement Account](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md), [Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md), [Customer Top Up](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md), [Customer Top Up Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) |
| Disbursement to Bank with SDK | Merchant transfers funds from a merchant disbursement account to a user's bank account, validates beneficiary bank details, receives transfer notifications, and checks transfer status when needed. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Disbursement to Bank Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-bank.md), [Disbursement API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md) | [Check Disbursement Account](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md), [Transfer to Bank Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-account-inquiry.md), [Transfer to Bank](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/transfer-to-bank.md), [Transfer to Bank Notify](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-notify.md), [Transfer to Bank Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-inquiry-status.md) |
| Merchant Management Shop with SDK | Merchant manages store or outlet information under a division, including creating, updating, querying, listing, and retrieving user asset card data when needed. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Shop Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/shop.md), [Merchant Management API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/overview.md) | [Create Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-shop.md), [Update Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-shop.md), [Query Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-shop.md), [Get Shop List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-shop-list.md), [Query Multiple Shops](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-multiple-shops.md), [Query Asset Card List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) |
| Merchant Management Division with SDK | Merchant manages sub-merchant or division information, including creating, updating, querying, listing, and retrieving user asset card data when needed. | [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md), [Authentication Asymmetric SNAP](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md), [Division Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/division.md), [Merchant Management API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/overview.md) | [Create Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-division.md), [Update Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-division.md), [Query Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-division.md), [Get Division List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-division-list.md), [Query Asset Card List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) |

## API Basics

- [API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/overview.md): REST API behavior, base URLs, sandbox and production endpoints, and general API conventions.
- [API Status](https://dashboard.dana.id/api-docs-v2/llms/api/api-status.md): DANA Sandbox API status monitoring, uptime, maintenance windows, and live status page.

## Gapura Payment Gateway Overview

- [Gapura Payment Gateway Overview](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/overview.md): Gapura solution overview, Hosted Checkout and Custom Checkout scenarios, process flows, required APIs, optional APIs, and settlement reference.

## Gapura Solution Guides

- [Gapura Custom Checkout Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/custom-checkout.md): Integration guide for merchants that build their own checkout page and use DANA payment APIs directly.
- [Gapura Hosted Checkout Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/hosted-checkout.md): Integration guide for merchants that redirect users to a DANA-hosted checkout page.

## Gapura Payment Gateway APIs

- [Consult Pay](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/consult-pay.md): Consult available payment methods or payment channels before creating an order for Custom Checkout.
- [Create Order - Custom Checkout](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md): Create a Payment Gateway order for Custom Checkout flows, including idempotency, pay options, URL params, and additional info.
- [Create Order - Hosted Checkout](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md): Create a Payment Gateway order for Hosted Checkout flows and receive a checkout redirect URL.
- [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md): Webhook notification from DANA to merchant systems for payment status and transaction information.

## Gapura Optional APIs

- [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/query-payment.md): Query payment status and transaction details from merchant systems to DANA.
- [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md): Cancel an existing Payment Gateway order from the merchant platform.
- [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/refund-order.md): Refund a Payment Gateway order, including refund amount, partner refund number, and refund response handling.

## DANA Widget Overview

- [DANA Widget API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/overview.md): DANA Widget Binding and Non Binding solution overview, API lists, deeplink behavior, process flows, optional APIs, and settlement reference.

## DANA Widget Solution Guides

- [DANA Widget Binding Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/widget-binding.md): Integration guide for binding a user's DANA account to a merchant platform and using bound-account payment flows.
- [DANA Widget Non Binding Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/widget-non-binding.md): Integration guide for DANA payments without account binding.
- [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md): Deeplink and universal-link guidance for redirecting users to the DANA App for binding and payment.

## DANA Widget Mandatory APIs

- [Deeplink Binding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/deeplink-binding.md): Generate a binding URL to redirect users to the DANA App and initiate account binding.
- [Apply Token](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-token.md): Exchange authCode for accessToken and refreshToken after successful binding.
- [Apply OTT](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-ott.md): Convert a user's accessToken into a one-time token for DANA Widget checkout redirection.
- [Direct Debit Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md): Initiate DANA Widget payment and receive checkout redirect information.
- [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md): Webhook notification from DANA to merchant systems for DANA Widget payment status and transaction information.

## DANA Widget Optional APIs

- [Account Unbinding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/account-unbinding.md): Revoke accessToken and refreshToken to remove a user's bound DANA account.
- [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md): Query DANA Widget payment status and transaction details.
- [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md): Cancel a DANA Widget order from the merchant platform.
- [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md): Refund a completed DANA Widget order.
- [Balance Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md): Query a user's DANA account balance through the merchant platform.
- [Transaction History](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-history.md): Query a user's DANA transaction history list through the merchant platform.
- [Transaction Detail](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-detail.md): Query detailed information for a DANA transaction.
- [Query User Profile](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-user-profile.md): Obtain user profile information such as masked phone number, KYC status, DANA balance, or OTT.
- [Unbind Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/unbind-notify.md): Receive notification when a user unbinds a DANA account from the DANA App.

## Disbursement Overview

- [Disbursement API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md): Disbursement to Balance and Disbursement to Bank Account solution overview, API lists, process flows, optional APIs, and settlement reference.

## Disbursement Solution Guides

- [Disbursement to Balance Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-balance.md): Integration guide for transferring funds to a user's DANA balance, including account validation, customer top up, status inquiry, SDK setup, and testing flow.
- [Disbursement to Bank Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-bank.md): Integration guide for transferring funds to a user's bank account, including bank account inquiry, transfer execution, notifications, status inquiry, SDK setup, and testing flow.

## Disbursement Mandatory APIs

- [Customer Top Up](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md): Trigger top up request from merchant to DANA for Disbursement to Balance.
- [Transfer to Bank](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/transfer-to-bank.md): Trigger transfer to bank request via DANA for Disbursement to Bank Account.

## Disbursement Optional APIs

- [Check Disbursement Account](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md): Check merchant disbursement account balance before processing top up or bank transfer.
- [Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md): Inquire DANA account information before Customer Top Up.
- [Customer Top Up Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md): Inquire the latest Customer Top Up transaction status.
- [Beneficiary Bank Code List](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/beneficiary-bank-code-list.md): Reference list of beneficiary bank codes for Disbursement to Bank Account.
- [Transfer to Bank Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-account-inquiry.md): Inquire and validate beneficiary bank account details before Transfer to Bank.
- [Transfer to Bank Notify](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-notify.md): Webhook notification from DANA to merchant systems for Transfer to Bank status and information.
- [Transfer to Bank Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-inquiry-status.md): Inquire the latest Transfer to Bank transaction status.

## Merchant Management Overview

- [Merchant Management API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/overview.md): Merchant Management solution overview for shops and divisions, API lists, process flows, and optional APIs.

## Merchant Management Solution Guides

- [Shop Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/shop.md): Integration guide for managing a merchant's store or outlet, including create, update, query, asset card list, SDK setup, and testing flow.
- [Division Guide](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/division.md): Integration guide for managing a merchant division or sub-merchant, including create, update, query, asset card list, SDK setup, and testing flow.

## Merchant Management Mandatory APIs

- [Create Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-shop.md): Create a new shop under a merchant structure.
- [Create Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-division.md): Create a new division or sub-merchant under a merchant structure.

## Merchant Management Optional APIs

- [Update Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-shop.md): Update existing shop information.
- [Query Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-shop.md): Retrieve shop information.
- [Get Shop List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-shop-list.md): Obtain a list of shops.
- [Query Multiple Shops](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-multiple-shops.md): Retrieve information for multiple shops.
- [Update Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-division.md): Update existing division information.
- [Query Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-division.md): Retrieve division information.
- [Get Division List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-division-list.md): Obtain a list of divisions.
- [Query Asset Card List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md): Retrieve a user's available asset card list.

## Settlement

- [Payment Services Settlement File](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md): Settlement file specification, file generation, download flow, and field-level settlement report details for payment services.
- [Disbursement Settlement File](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/disbursement.md): Settlement file specification, transaction status behavior, file format, and CSV examples for Disbursement to Balance and Disbursement to Bank Account.
