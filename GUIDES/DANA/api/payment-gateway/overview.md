# Gapura Payment Gateway

Gapura Payment Gateway is one of DANA's newest products. It provides payment solutions for merchants in one integration process and helps merchants accept, process, and send payments more securely than manual payment processing.

DANA offers two Gapura Payment Gateway solutions: a hosted checkout page and a custom API solution. Use the guides below to choose and integrate the solution that fits your payment flow.

## Scenario 1: Hosted Checkout Page

| Field | Value |
| --- | --- |
| Title | [Hosted Checkout Page](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/hosted-checkout.md) |
| Description | DANA provides a hosted checkout URL for payments. |

### API List

The following APIs are used for this scenario:

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Create Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md) | POST | Used by merchants to create an order on DANA's side. |
| 2 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md) | Webhook | Used to notify payment status and information from DANA to the merchant platform. |

### Settlement

The following settlement file is used for this scenario:

| Field | Value |
| --- | --- |
| Title | [Payment Gateway Settlement File](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file as proof of fund transfer. |

### Process Flow

#### Gapura Hosted Checkout

![Gapura Hosted Checkout process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/gapura-payment-gateway/sequence-gapura-hosted-checkout.png)

1. The user browses the merchant website or app and proceeds to checkout after selecting a product.
2. The merchant system generates an order internally, preparing it for payment processing.
3. The merchant backend sends a request to DANA's [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md), passing the necessary order details.
4. After receiving the request, DANA processes and stores the order details in its system.
5. After successfully creating the order, DANA responds with a `webRedirectUrl` for the checkout page.
6. The merchant uses the returned URL to prepare a redirection to DANA's hosted checkout page.
7. The user is redirected to the DANA-hosted checkout page where the payment can be made.
8. Available payment methods are displayed.
9. The user chooses one of the supported payment methods provided by DANA and follows the instructions on the DANA checkout page to complete the payment.
10. DANA Hosted Checkout receives the payment details and sends them to DANA API.
11. DANA processes the payment.
12. DANA shows the payment result screen to the user.
13. DANA sends a payment notification to the merchant system through the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md), updating the payment status of the order.
14. DANA redirects to the merchant URL that was already set when calling the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md).

## Scenario 2: Custom API Only

| Field | Value |
| --- | --- |
| Title | [Custom API Only](https://dashboard.dana.id/api-docs-v2/llms/guide/payment-gateway/custom-checkout.md) |
| Description | DANA provides access to DANA's core payment APIs. |

### API List

The following APIs are used for this scenario:

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Consult Pay](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/consult-pay.md) | POST | Used to consult the list of payment methods or payment channels that the user has and can use for certain transactions or orders. |
| 2 | [Create Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md) | POST | Used by merchants to create an order on DANA's side. |
| 3 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md) | Webhook | Used to notify payment status and information from DANA to the merchant platform. |
| 4 | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/query-payment.md) | POST | Used to inquire payment status and information from the merchant platform to DANA. |
| 5 | [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md) | POST | Used to cancel an order from the merchant platform to DANA. |
| 6 | [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/refund-order.md) | POST | Used to refund an order from the merchant platform to DANA. |

### Settlement

The following settlement file is used for this scenario:

| Field | Value |
| --- | --- |
| Title | [Payment Gateway Settlement File](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file as proof of fund transfer. |

### Process Flow

#### Successful Transaction

![Gapura Custom Checkout successful transaction process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/gapura-payment-gateway/sequence-gapura-custom-checkout.png)

1. The user browses the merchant website or app, adds items to cart, and initiates the checkout process.
2. The merchant queries DANA through the [Consult Pay API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/consult-pay.md) to retrieve the current list of supported payment options.
3. DANA returns the list of available payment methods with their details and requirements.
4. The merchant presents a payment interface showing all available DANA payment options in a user-friendly format.
5. The user reviews available payment methods and selects a preferred option, such as DANA Balance, virtual account, or QRIS.
6. The merchant system prepares transaction details, including amount, items, and user information.
7. The merchant sends a [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md) request to DANA API with complete order parameters.
8. DANA performs validation of order data and creates a transaction record.
9. DANA returns detailed order information, including payment instructions and transaction reference.
10. For virtual account and QRIS payments, the merchant displays the VA number or QRIS details with payment instructions.
11. The merchant shows the e-wallet app or web checkout page to the user.
12. The user follows payment method-specific steps to complete the transaction.
13. DANA sends a payment notification to the merchant system through the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md), updating the payment status of the order.
14. DANA redirects to the merchant URL that was already set when calling the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md).

#### Inquiry Transaction

![Query Payment process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/gapura-payment-gateway/sequence-query-payment.png)

1. The merchant performs additional verification through the [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/query-payment.md) to confirm transaction status.
2. DANA checks the payment transaction status.
3. DANA provides authoritative payment status with complete transaction details.
4. The merchant presents the detailed transaction result.

#### Cancel Transaction

![Cancel Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/gapura-payment-gateway/sequence-cancel-order.png)

##### Scenario 1: System Error

1. The user creates an order and makes a payment.
2. An issue occurs in the merchant system.
3. The merchant calls the [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md) to cancel the transaction.
4. DANA sends a cancel order response.
5. The merchant displays a cancel order notification to the user.

##### Scenario 2: Payment Method Change

1. The user decides to change payment method.
2. The merchant calls the [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md) to cancel the transaction.
3. DANA sends a cancel order response.
4. The merchant calls the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-custom.md) to DANA.
5. DANA sends a create order response.

##### Scenario 3: Already Paid

1. The user has already created an order and made a payment.
2. The order is successful.
3. The user decides to cancel the order.
4. The merchant calls the [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md) to cancel the transaction.
5. DANA sends a cancel order response.

#### Refund Transaction

![Refund Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/gapura-payment-gateway/sequence-refund-order.png)

1. The user has already created an order and made a payment.
2. The order is successful.
3. The user decides to cancel the order.
4. The merchant calls the [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/refund-order.md) to refund the transaction.
5. DANA generates the refund process and sends the result to the merchant.
