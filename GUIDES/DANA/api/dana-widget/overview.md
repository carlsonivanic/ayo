# DANA Widget

DANA Widget is a DANA solution that streamlines the payment process for merchants and users. This solution offers two key functionalities:

1. **DANA Widget Binding**: Users can securely link their DANA accounts to a merchant's platform, enabling seamless transactions.
2. **DANA Widget Non Binding**: User chooses DANA as a payment method on their transaction by inputing their phone number.

This integration allows customers to browse, select items, and complete DANA payments all within the merchant's platform, enhancing user experience and conversion rates.

## DANA Widget Binding

User make a payment and bind the DANA's account into merchant's platform.

### Mandatory APIs

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Deeplink Binding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/deeplink-binding.md) | POST | Used to redirect user's to DANA App in order to initiate account binding process, allowing them to register or login directly within the DANA App |
| 2 | [Apply Token](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-token.md) | POST | Used to finalized account binding process by exchanging the authCode into accessToken that can be used as user authorization |
| 3 | [Apply OTT](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-ott.md) | POST | Used to get one time token that will be used as authorization parameter upon redirecting to DANA |
| 4 | [Direct Debit Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) | POST | Used to initiate payment from merchant's platform to DANA |

Merchants must select either [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) or [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) API from below to validate transaction status.

### Available Optional APIs

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Account Unbinding](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/account-unbinding.md) | POST | Used to reverses the account binding process by revoking the accessToken and refreshToken |
| 2 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) | Webhook | Used to notify payment status and information from DANA to merchant's platform |
| 3 | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) | POST | Used to inquiry payment status and information from merchant's platform to DANA |
| 4 | [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) | POST | Used to cancel the order from merchant's platform to DANA |
| 5 | [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) | POST | Used to refund the order from merchant's platform to DANA |
| 6 | [Balance Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) | POST | Used to query user's DANA account balance via merchant |
| 7 | [Transaction History](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-history.md) | POST | Used to query user's DANA transaction history list via merchant |
| 8 | [Transaction Detail](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-detail.md) | POST | Used to query user's DANA transaction history detail via merchant |
| 9 | [Query User Profile](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-user-profile.md) | POST | Used to obtain the user's profile information including DANA balance (unit in IDR), masked DANA phone number, KYC status or OTT |
| 10 | [Unbind Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/unbind-notify.md) | POST | Used to inform merchant the result of unbind DANA account from the DANA App |

### Settlement

| Field | Value |
| --- | --- |
| Title | [Payment Service Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file a proof of fund transfer, for more details please visit this link |

### Process Flow

The general flow of payment using a DANA Widget Binding is as follows:

#### Binding

![DANA Widget Binding process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/dana-widget/sequence-widget-binding-v2.png)

1. User begins DANA account binding with the merchant platform.
2. Merchant calls **Deeplink Binding** to generate the binding URL by providing redirectUrl, with seamlessData as an optional parameter.
3. DANA returns the generated binding URL to the merchant.
4. Merchant opens the binding URL returned by DANA.
5. DANA redirects the user to the DANA App to continue the binding process.
6. If merchant **provides** `seamlessData` parameter, the **Seamless Binding** process will be used and DANA will check if the user's phone number inside the `seamlessData` matches with then account that is logged into their DANA app. If they match, DANA will direct to agreement page.
7. If the `seamlessData` user's phone number is different from the logged in account, DANA will require the user to log out of their current phone number and login or register using the `seamlessData` phone number.
8. After successful authorization, DANA redirects the user to the agreement page.
9. When merchant does not provide `seamlessData`, the **Normal Binding** process will be used and DANA will show the phone number input screen.
10. User enters phone number and do login or register.
11. After successful authorization, DANA redirects the user to the agreement page.
12. User makes an agreement to continue the process.
13. DANA returns the result of binding process to DANA Server.
14. DANA Server redirects the user to the merchant's redirectUrl along with authCode.
15. The redirect URL with authCode is opened on the merchant side.
16. Merchant exchanges the `authCode` for an accessToken by calling Apply Token API.
17. DANA returns the `accessToken` and `refreshToken` that are valid for each user.
18. The merchant stores `accessToken` and `refreshToken`.

#### Payment

![DANA Widget Binding payment process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-widget-binding-payment.png)

1. The user browses the merchant's website or app and proceeds to checkout after selecting a product.
2. The merchant system generates an order internally, preparing it for payment processing.
3. The merchant's backend sends a request to DANA's [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), passing the necessary order details.
4. After successfully creating the order, DANA responds with a `webRedirectUrl` for the checkout page and order information.
5. In order to access the DANA Web page, merchant needs the OTT. To obtain the OTT, merchant needs to apply for it by calling DANA's [Apply OTT API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/apply-ott.md) using the accessToken.
6. DANA returns the OTT.
7. Merchant appends the OTT from DANA into the `webRedirectUrl` that was obtained from Direct Debit Payment's response.
8. Merchant redirects the user to DANA Checkout page.
9. DANA displays payment details to user and available payment methods.
10. The user chooses one of the supported payment methods provided by DANA and follows the instructions on the DANA checkout page to complete the payment.
11. DANA Web page receives the payment details and sends them to DANA API.
12. DANA processes the payment.
13. DANA shows payment result screen to user.
14. DANA redirects the user back to the URL that the merchant specified when calling the [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md). The redirect URL follows this format: `https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx`.
    - merchant redirect URL: set on `urlParams.url`
    - originalReferenceNo: Original transaction identifier on DANA system
    - originalPartnerReferenceNo: Original transaction identifier on partner system
    - merchantId: Merchant identifier that is unique per each merchant
    - status: Payment transaction in DANA side
    - Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`
15. If merchant adds urlParams.type = `NOTIFICATION`, DANA will send a payment notification to the merchant's system via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md), updating the payment status of the order.

#### Optional Inquiry Transaction

![Query Payment process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-query-payment.png)

1. Merchant performs additional verification through [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) to confirm transaction status.
2. DANA checks the payment transaction status.
3. DANA provides authoritative payment status with complete transaction details.
4. Merchant presents detailed transaction result.

#### Optional Cancel Transaction

![Cancel Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-cancel-order.png)

##### Scenario 1: System Error

1. User create order and make a payment.
2. Trouble in merchant system.
3. Merchant hits [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) to cancel the transaction.
4. DANA sends response of cancel order.
5. Merchant displays notification of cancel order to user.

##### Already Paid within 24 hours

1. User already created order and made a payment.
2. Successfully ordered.
3. User decides to cancel the order.
4. Merchant hits [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) to cancel the transaction.
5. DANA sends response of cancel order.
6. Merchant displays notification of cancel order to user.

#### Optional Refund Transaction

![Refund Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-refund-order.png)

1. User already created order and made a payment.
2. Successfully ordered.
3. User complaints and decides to refund the order.
4. Merchant hits [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) to refund the transaction.
5. DANA generates refund process and send the result to merchant.
6. Merchant displays refund transaction result to the user.

#### Optional Account Unbinding

![Account Unbinding process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-account-unbinding.png)

1. User initiates account unbinding request.
2. Merchant validates the unbinding request for security.
3. Merchant hits the [Account Unbinding API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/account-unbinding.md) to revoke access tokens.
4. DANA processes the validation and verifies the request.
5. DANA sends confirmation of successful unbinding to merchant.
6. Merchant displays unbinding confirmation to user.

#### Optional Balance Inquiry

![Balance Inquiry process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-balance-inquiry.png)

We highly recommend you implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

1. User requests balance information.
2. Merchant calls [Balance Inquiry API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) to fetch data from DANA.
3. DANA processes the request and returns balance information.
4. Merchant displays balance to user.

#### Optional Transaction History

![Transaction History process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-transaction-history.png)

1. User requests transaction history.
2. Merchant calls [Transaction History API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-history.md) to fetch data from DANA.
3. DANA returns transaction data.
4. Merchant displays transaction history to user.

#### Optional Transaction Detail

![Transaction Detail process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-transaction-detail.png)

1. User requests transaction details.
2. Merchant calls [Transaction Detail API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/transaction-detail.md) to fetch data from DANA.
3. DANA returns comprehensive transaction details.
4. Merchant displays the transaction information to the user.

#### Optional Query User Profile

![Query User Profile process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-query-user-profile.png)

1. User wants to check their DANA profile on merchant side.
2. Merchant calls [Query User Profile API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-user-profile.md) to fetch data from DANA.
3. DANA processes the request and sends the result of query user profile information to merchant.
4. Merchant displays user information to user.

#### Optional Unbind Notify

![Unbind Notify process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-unbind-notify-new.png)

1. User request to unbind their account via DANA App or merchant App.
2. DANA process the unbind request.
3. DANA send the result of unbind process either success or failed by calling [Unbind Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/unbind-notify.md).
4. Merchant return confirmation whether unbind information has been received or not.
5. Show result or status of unbind account to user.

## DANA Widget Non Binding

User make a payment using the DANA's account in merchant's platform.

### Redirect Payment to DANA App

Currently, users are redirected to the DANA Web View page to complete payment. This flow will be migrated to redirect users to the **DANA App** as the **primary payment experience**. The rollout will be gradual.

**Timeline**

- Before 31 July 2026: DANA Web View flow is still supported.
- By 31 July 2026 and onwards: the Web View solution will no longer be maintained. Merchants are encouraged to migrate before 31 July 2026.

**Flow**

After the order is created, the user is redirected to the DANA App to complete the payment. If the DANA App is not available, the user is redirected to the DANA Web View page.

**What should merchant do?**

- In the [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), set **supportDeepLinkCheckoutUrl** as a **mandatory** field and always set its value to `true`.
- Able to open DANA redirect URLs (universal links) to enable handoff to the DANA App.
- Prefer opening the redirect URL via the OS/native browser. If the merchant uses an in-app WebView with domain allowlisting, the merchant must whitelist or allowlist the following domains: `https://link.dana.id`, `https://m.dana.id`, `https://danaid.link`, and `danaid://`.
- If the merchant uses WebView, ensure outbound redirection to external apps is not blocked. Refer to [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md) if you encounter this issue.

**Detail**

For detail information can refer to here: [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md).

### Mandatory APIs

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Direct Debit Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) | POST | Used to initiate payment from merchant's platform to DANA |

Merchants must select either [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) or [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) API from below to validate transaction status.

### Available Optional APIs

| No | API Name | Method | Description |
| --- | --- | --- | --- |
| 1 | [Finish Notify](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md) | Webhook | Used to notify payment status and information from DANA to merchant's platform |
| 2 | [Query Payment](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) | POST | Used to inquiry payment status and information from merchant's platform to DANA |
| 3 | [Cancel Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) | POST | Used to cancel the order from merchant's platform to DANA |
| 4 | [Refund Order](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) | POST | Used to refund the order from merchant's platform to DANA |

### Settlement

| Field | Value |
| --- | --- |
| Title | [Payment Service Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/payment-services.md) |
| Description | This service generates a daily settlement file a proof of fund transfer, for more details please visit this link |

### Process Flow

The general flow of payment using a DANA Widget Non Binding is as follows:

#### Successful Transaction

![DANA Widget Non Binding successful transaction process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-widget-non-binding.png)

1. The user browses the merchant's website or app and proceeds to checkout after selecting a product and selects DANA as a payment method.
2. The merchant system generates an order internally, preparing it for payment processing.
3. The merchant's backend sends a request to DANA's [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), passing the necessary order details.
4. After successfully creating the order, DANA responds with a `webRedirectUrl` for the checkout page and order information.
5. Open DANA App.
6. If the user's session is valid, DANA will show the DANA's cashier page.
7. If there is no session, DANA will require the user to login/register.
8. After successful authorization, DANA redirects the user to the DANA's cashier page.
9. DANA display payment details to user and available payment method.
10. The user chooses one of the supported payment methods provided by DANA and follows the instructions on the DANA checkout page to complete the payment.
11. DANA App receives the payment details and sends it to DANA Server.
12. DANA processes the payment.
13. DANA shows payment result screen to user.
14. DANA redirects back the UI page to URL Link that merchant set when hitting Direct Debit Payment API. with the format URL: `https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx`.
    - merchant redirect URL: set on `urlParams.url`
    - originalReferenceNo: Original transaction identifier on DANA system
    - originalPartnerReferenceNo: Original transaction identifier on partner system
    - merchantId: Merchant identifier that is unique per each merchant
    - status: Payment transaction in DANA side
    - Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`
15. If merchant add urlParams.type = `NOTIFICATION`, DANA will send a payment notification to the merchant's system via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md), updating the payment status of the order.

#### Optional Inquiry Transaction

![Query Payment process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-query-payment.png)

1. Merchant performs additional verification through [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) to confirm transaction status.
2. DANA checks the payment transaction status.
3. DANA provides authoritative payment status with complete transaction details.
4. Merchant presents detailed transaction result.

#### Optional Cancel Transaction

![Cancel Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-cancel-order.png)

##### Scenario 1: System Error

1. User create order and make a payment.
2. Trouble in merchant system.
3. Merchant hits [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) to cancel the transaction.
4. DANA sends response of cancel order.
5. Merchant displays notification of cancel order to user.

##### Already Paid within 24 hours

1. User already created order and made a payment.
2. Successfully ordered.
3. User decides to cancel the order.
4. Merchant hits [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) to cancel the transaction.
5. DANA sends response of cancel order.
6. Merchant displays notification of cancel order to user.

#### Optional Refund Transaction

![Refund Order process flow](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/dana-widget/sequence-refund-order.png)

1. User already created order and made a payment.
2. Successfully ordered.
3. User complaints and decides to refund the order.
4. Merchant hits [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) to refund the transaction.
5. DANA generates refund process and send the result to merchant.
6. Merchant displays refund transaction result to the user.
