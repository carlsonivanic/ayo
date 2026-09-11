# QRIS (Acquirer)

Quick Response Code Indonesian Standard (QRIS) Acquirer is a DANA solution that enables merchants to accept QRIS payments.

This solution supports two transaction modes:

1. **Merchant Presented Mode (MPM)**: Merchant displays a QRIS code generated through DANA. User scans the code using their payment application and completes the payment. DANA processes the transaction and returns the payment status to the merchant.
2. **Customer Presented Mode (CPM)**: User presents a QR code and the merchant scans it. DANA acts as the acquirer by validating the QR, processing the transaction, and returning the payment status to the merchant.

## QRIS MPM (Acquirer)

### Available APIs for QRIS MPM (Acquirer) Solution

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Generate QRIS](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/generate-qris.md) | POST | Used to create a QRIS that can be displayed to the user for payment |
| 2 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/finish-notify.md) | POST | Used to notify payment status and information from DANA to merchant's platform |
| 3 | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/query-payment.md) | POST | Used to inquiry payment status and information from merchant's platform to DANA |
| 4 | [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/cancel-order.md) | POST | Used to cancel the order from merchant's platform to DANA |
| 5 | [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/refund-order.md) | POST | Used to refund the order from merchant's platform to DANA |

### Settlement

| Field | Value |
| --- | --- |
| Title | [Payment Service Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file a proof of fund transfer, for more details please visit this link |

### Process Flow

The general flow of payment using a QRIS MPM (Acquirer) is as follows:

#### Generate QRIS dan Payment Transaction

![Generate QRIS dan Payment Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/mpm-generate-QRIS-dan-payment-transaction.png)

1. User initiates a payment request using QRIS at the merchant's page.
2. Merchant sends a request to DANA via the [Generate QRIS API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/generate-qris.md) to create a dynamic QRIS code for the transaction.
3. DANA system generates a unique QRIS code based on the transaction details provided by the merchant.
4. DANA returns the generated QRIS code as a string value in `QRContent()`.
5. Merchant displays the QRIS code based on the received `QRContent()`.
6. User scans the displayed QR code using a payment application.
7. User reviews the payment details and confirms the transaction in the payment app.
8. The payment app sends the payment request to DANA.
- If the payment app is **DANA**, the transaction is processed internally.
- If the payment app is **another QRIS-supported wallet**, the wallet sends the payment request to DANA as the QRIS Acquirer.
9. DANA validates the QRIS data, checks the transaction details, and processes the payment.
10. DANA sends the payment result back to the payment application.
11. The payment application displays the payment result to the user.
12. If the merchant has implemented the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/finish-notify.md), DANA proactively sends a notification to the merchant containing the payment status and transaction details.
13. Merchant can also actively query the payment status by calling the [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/query-payment.md) to retrieve real time transaction information from DANA.
14. DANA returns the comprehensive payment status response to the merchant.

#### Cancel Transaction

![Cancel Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/mpm-cancel-transaction.png)

1. User creates an order and completes the payment transaction (refer to the Generate QRIS and Payment).
2. Merchant system encounters an error or technical issue that prevents order fulfillment.
3. Merchant calls the [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/cancel-order.md) to void the transaction and initiate cancellation in DANA's system.
4. DANA processes the cancellation request and returns the cancel order result status to the merchant.
5. Merchant displays a cancellation confirmation notification to inform the user that their order has been successfully cancelled.

#### Refund Transaction

![Refund Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/mpm-refund-transaction.png)

1. User submits a refund request to the merchant for a completed transaction.
2. Merchant calls the [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/refund-order.md) to initiate the refund transaction with DANA, providing the original transaction details and refund amount.
3. DANA processes the refund request, validates the transaction, transfers the funds back to the user's account, and returns the refund status result to the merchant.
4. Merchant displays a notification to the user confirming that the refund has been processed successfully.

#### API Flow

![API Flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/mpm-API-flow.png)

The figure above illustrates the integration schema between the merchant and DANA to minimize manual processes and prevent fund loss. This process may occur when the system or network experiences an error, which might originate from the merchant, DANA, or the buyer.

## QRIS CPM (Acquirer)

### Available APIs for QRIS CPM (Acquirer) Solution

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [CPM Payment](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/cpm-payment.md) | POST | Used to submit a scanned user QR code to process the payment and receive the transaction result |
| 2 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/finish-notify.md) | POST | Used to notify payment status and information from DANA to merchant's platform |
| 3 | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/query-payment.md) | POST | Used to inquiry payment status and information from merchant's platform to DANA |
| 4 | [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/cancel-order.md) | POST | Used to cancel the order from merchant's platform to DANA |
| 5 | [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/refund-order.md) | POST | Used to refund the order from merchant's platform to DANA |

### Settlement

| Field | Value |
| --- | --- |
| Title | [Payment Service Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file a proof of fund transfer, for more details please visit this link |

### Process Flow

The general flow of payment using a QRIS CPM (Acquirer) is as follows:

#### Payment Transaction

![Payment Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/cpm-payment-transaction.png)

1. User scans their QRIS code at the merchant's QRIS scanning device to initiate the payment process.
2. Merchant system sends a request to DANA by calling the [CPM Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/cpm-payment.md), including the scanned QRIS data and transaction details.
3. DANA receives the payment request, creates a new order in the system, and initiates the payment processing workflow.
4. DANA validates the transaction, processes the payment, and returns the payment result status to the merchant system.
5. If the merchant has implemented the Finish Notify, DANA proactively sends a notification to the merchant about the final payment status via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/finish-notify.md).
6. If the payment status is still in progress or the merchant experiences a timeout, the merchant system sends a [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/query-payment.md) request to DANA to retrieve the latest payment status.
7. DANA processes the query request and returns the current payment status information to the merchant.
8. If no final payment result is received within the specified timeout period, merchant calls the [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/cancel-order.md) to void the transaction and initiate cancellation in DANA's system.
9. DANA processes the cancellation request and returns the cancel order result status to the merchant.
10. Merchant system receives the final payment or cancellation result and displays the appropriate payment outcome to the user through their interface.

#### Refund Transaction

![Refund Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/cpm-refund-transaction.png)

1. User submits a refund request to the merchant for a completed transaction.
2. Merchant calls the [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/qris-acquirer/optional-api/refund-order.md) to initiate the refund transaction with DANA, providing the original transaction details and refund amount.
3. DANA processes the refund request, validates the transaction, transfers the funds back to the user's account, and returns the refund status result to the merchant.
4. Merchant displays a notification to the user confirming that the refund has been processed successfully.

#### API Flow

![API Flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/qris-acquirer/cpm-API-fow.png)

The figure illustrate the integration schema between the merchant and DANA to minimize the manual process and prevent a fund loss. The process may occur when the system or network is an error, and it might come from a merchant or DANA, or buyer.
