# DANA Widget Non Binding

## Redirect Payment to DANA App

Currently, users are redirected to the DANA Web View page to complete payment. This flow will be migrated to redirect users to the **DANA App** as the **primary payment experience**. The rollout will be gradual.
- **Timeline**
- Before 31 July 2026: DANA Web View flow is still supported
- By 31 July 2026 and onwards: the Web View solution will no longer be maintained. Merchants are encouraged to migrate before 31 July 2026.
- **Flow**

After the order is created, the user is redirected to the DANA App to complete the payment. If the DANA App is not available, the user is redirected to the DANA Web View page.
- **What should merchant do?**
- In the [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), set **supportDeepLinkCheckoutUrl** as a **mandatory** field and always set its value to `true`.
- Able to open DANA redirect URLs (universal links) to enable handoff to the DANA App.
- Prefer opening the redirect URL via the OS/native browser. If the merchant uses an in-app WebView with domain allowlisting, the merchant must whitelist or allowlist the following domains: `https://link.dana.id`, `https://m.dana.id`, `https://danaid.link`, and `danaid://`.
- If the merchant uses WebView, ensure outbound redirection to external apps is not blocked. Refer to [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md) if you encounter this issue.
- **Detail**

For detail information can refer to here: [Deeplink Binding and Payment](https://dashboard.dana.id/api-docs-v2/llms/guide/dana-widget/deeplink-binding-and-payment.md).

**DANA Widget Non Binding** integrates DANA as a payment method in your platform without account binding. Users simply select DANA, get redirected to the DANA App, and complete payments using their DANA account.

## Before you start
You will need to register your business in our [Merchant Portal](http://dashboard.dana.id) to obtain your testing credentials. After you have created your test account, make sure you have done the following:

- Finish your company registration and select **Integrated Payment** as your payment solution.
- Setup your webhooks & redirect URLs to receive payment outcomes & redirect user after payment.
- Obtain your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) from the merchant portal.

## User Experience

## Mobile

![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/dana-widget/UX-non-binding-1.png)

**Pay with DANA**
User selects DANA as their payment method.

![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/dana-widget/UX-non-binding-2.png)

**Payment Details**
User reviews transaction details and completes payment in the DANA App.

![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/dana-widget/UX-non-binding-3.png)

**Payment Result**
User instantly receive payment result.

## Process Flow

The general flow of payment using the DANA Widget Non Binding is as follows:

Visit the DANA Widget [API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/overview.md) for edge cases and other scenarios.

![DANA Widget Binding](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/dana-widget/sequence-widget-non-binding.png)

Detailed flow explanation

1. The user browses the merchant's website or app and proceeds to checkout after selecting a product and selects DANA as a payment method.
2. The merchant system generates an order internally, preparing it for payment processing.
3. The merchant's backend sends a request to DANA's [Direct Debit Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md), passing the necessary order details.
4. After successfully creating the order, DANA responds with a ``webRedirectUrl`` for the checkout page and order information.
5. Open DANA App.
6. If the user's session is valid, DANA will show the DANA's cashier page.
7. If there is no session, DANA will require the user to login/register.
8. After successful authorization, DANA redirects the user to the DANA's cashier page.
9. DANA display payment details to user and available payment method.
10. The user chooses one of the supported payment methods provided by DANA and follows the instructions on the DANA checkout page to complete the payment.
11. DANA App receives the payment details and sends it to DANA Server.
12. DANA processes the payment.
13. DANA shows payment result screen to user.
14. DANA redirects back the UI page to URL Link that merchant set when hitting Direct Debit Payment API. with the format URL: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``.
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`
15. If merchant add urlParams.type = `NOTIFICATION`, DANA will send a payment notification to the merchant's system via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md), updating the payment status of the order.

## NodeJS

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

#### Requirements

- Node.js version 18 or later
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

#### Installation

Install using npm or visit our [Github](https://github.com/dana-id/dana-node)

[GitHub](https://github.com/dana-id/dana-node)

**Install the API Library using npm**

```javascript
      npm install dana-node@latest --save
```

#### Set up the env

**Required Credentials**

```javascript
      PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key
      ORIGIN                                 # Your application's origin URL
      X_PARTNER_ID                           # clientId provided during onboarding
      ENV                                    # DANA's environment either 'sandbox' or 'production'
```

#### Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library

**Initialize the library**

```javascript

      const danaClient = new Dana({
          partnerId: "YOUR_PARTNER_ID", // process.env.X_PARTNER_ID
          privateKey: "YOUR_PRIVATE_KEY", // process.env.X_PRIVATE_KEY
          origin: "YOUR_ORIGIN", // process.env.ORIGIN
          env: "sandbox", // process.env.DANA_ENV or process.env.ENV or "sandbox" or "production"
      });
      const { WidgetApi } = danaClient;
```

## Step 3 : Use the Direct Debit Payment API to get a hosted checkout URL

Use the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a POST request to the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md):

**Direct Debit Payment API**

```javascript

      // .. initialize client with authentication

      const request: WidgetPaymentRequest = {
          // Fill in required fields here, refer to Direct Debit Payment API Detail
      };

      const response: WidgetPaymentResponse = await WidgetApi.widgetPayment(request);
```
If successful, the response will include the URL for the DANA's payment page. For example:

**Sample response from Direct Debit Payment API**

```json
      Content-Type: application/json
      X-TIMESTAMP: 2020-12-23T08:31:11+07:00
      {
        "responseCode": "2005400", // Refer to response code list
        "responseMessage": "Successful", // Refer to response code list
        "referenceNo": "2020102977770000000009", // Transaction identifier on DANA system
        "partnerReferenceNo": "2020102900000000000001", // Transaction identifier on partner system
        "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&...",
        "additionalInfo":{}
      }
```

## Optional Query Order Status, Cancel Order, Refund Order, and Balance Inquiry

There are additional APIs available to enhance your integration process:

-  [**Query Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

**Sample Query Payment API**

```javascript

      const danaClient = new Dana({
          // .. initialize client with authentication
      });
      const { WidgetApi } = danaClient;

      const request: QueryPaymentRequest = {
          // Fill in required fields here, refer to Query Payment API Detail
      };

      const response: QueryPaymentResponse = await WidgetApi.queryPayment(request);
```

-  [**Cancel Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) - For unpaid orders or those paid within 24 hours, a full refund returns to the customer's original payment source.

**Sample Cancel Order API**

```javascript

      const danaClient = new Dana({
        // .. initialize client with authentication
      });
      const { WidgetApi } = danaClient;

      const request: CancelOrderRequest = {
          // Fill in required fields here, refer to Cancel Order API Detail
      };

      const response: CancelOrderResponse = await WidgetApi.cancelOrder(request);
```

-  [**Refund Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

**Sample Refund Order API**

```javascript

      const danaClient = new Dana({
        // .. initialize client with authentication
      });
      const { WidgetApi } = danaClient;

      const request: RefundOrderRequest = {
          // Fill in required fields here, refer to Refund Order API Detail
      };

      const response: RefundOrderResponse = await WidgetApi.refundOrder(request);
```

-  [**Balance Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) - Implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

**Sample Balance Inquiry API**

```javascript

      const danaClient = new Dana({
          // .. initialize client with authentication
      });
      const { WidgetApi } = danaClient;

      const request: BalanceInquiryRequest = {
          // Fill in required fields here, refer to Balance Inquiry API Detail
      };

      const response: BalanceInquiryResponse = await WidgetApi.balanceInquiry(request);
```

## Step 4 : Receive Payment Outcome

After a successful payment:
1. **Notification**: The user will be redirected to your specified Redirect URL, which you can configure using the ``urlParams`` parameter in the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) request, the redirection URL has a format like: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`

2. **[Optional] Finish Notify**: In case you add ``urlParams.type = NOTIFICATION``, DANA will send payment notifications to your Notification URL via the [**Finish Notify API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: ``/v1.0/debit/notify``.

### Construction

**Construction**

```javascript
      new WebhookParser(publicKey?: string, publicKeyPath?: string)
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string. This is used if publicKeyPath is not provided or is empty |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the publicKey string |

Notes: One of ``publicKey`` or ``publicKeyPath`` must be provided.

### Method

**Method**

```bash
      parseWebhook(httpMethod: string, relativePathUrl: string, headers: { [key: string]: string }, body: string): FinishNotifyRequest
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request e.g., POST |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g /v1.0/debit/notify |
| headers | map[string]string | A map containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |

- **Returns:** A pointer to a ``FinishNotifyRequest``struct containing the parsed and verified webhook data, or an error if parsing or signature verification fails.
- **Raises:** ``ValueError`` if signature verification fails or the payload is invalid.

### Security Notes

- Always use the official public key provided by DANA for webhook verification.
- Reject any webhook requests that fail signature verification or have malformed payloads.
- Never trust webhook data unless it passes verification.

**Webhook Finish Notify**

```javascript

      async function handleDanaWebhook(req: AnyRequestType, res: AnyResponseType) {
          // Retrieve the DANA public key from environment variables or a secure configuration.
          // Option 1: Public key as a string
          const danaPublicKeyString: string | undefined = process.env.DANA_WEBHOOK_PUBLIC_KEY_STRING;
          // Option 2: Path to the public key file (recommended for production)
          const danaPublicKeyPath: string | undefined = process.env.DANA_WEBHOOK_PUBLIC_KEY_PATH;

          if (!danaPublicKeyString && !danaPublicKeyPath) {
              console.error('DANA webhook public key not configured.');
              res.status(500).send('Webhook processor configuration error.'); // Or appropriate error handling
              return;
          }

          const httpMethod: string = req.method!; // e.g., "POST"
          const relativePathUrl: string = req.path!; // e.g., "/v1.0/debit/notify". Ensure this is the path DANA signs.

          const headers: Record<string, string> = req.headers as Record<string, string>;

          let requestBodyString: string;
          if (typeof req.body === 'string') {
              requestBodyString = req.body;
          } else if (req.body && typeof req.body === 'object') {
              requestBodyString = JSON.stringify(req.body);
          } else {
              console.error('Request body is not a string or a parseable object.');
              res.status(400).send('Invalid request body format.');
              return;
          }

          // Initialize WebhookParser.
          const parser = new WebhookParser(danaPublicKeyString, danaPublicKeyPath);

          try {
              // Verify the signature and parse the webhook payload
              const finishNotify = parser.parseWebhook(
                  httpMethod,
                  relativePathUrl,
                  headers,
                  requestBodyString
              );

              console.log('Webhook verified successfully:');
              console.log('Original Partner Reference No:', finishNotify.originalPartnerReferenceNo);
              // TODO: Process the finishNotify object (e.g., update order status in your database)

              res.status(200).send('Webhook received and verified.');
          } catch (error: any) { // Catching as 'any' to access error.message
              console.error('Webhook verification failed:', error.message);
              // Respond with an error status. DANA might retry if it receives an error.
              res.status(400).send(`Webhook verification failed: ${error.message}`);
          }
      }
```
For detailed example, please refer to the following resource: [Example Webhook](https://github.com/dana-id/dana-node/blob/main/docs/widget/v1/Apis/WidgetApi.md#webhookparser).

### Example of a successful payment webhook payload:

**Example of a successful Finish Notify:**

```json
      Content-type: application/json
      X-TIMESTAMP: 2020-12-23T07:44:16+07:00
      {
        "responseCode": "2005600",
        "responseMessage": "Successful"
      }
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
**Example Usage**

```javascript

      const ipg = EnvInfoSourcePlatformEnum.Ipg;
```
The following enums are available in the Library DANA Widget Non Binding:
1. AcquirementStatusEnum
2. ActorTypeEnum
3. GrantTypeEnum
4. OrderTerminalTypeEnum
5. PayMethodEnum
6. PayOptionEnum
7. PromoTypeEnum
8. ResourceTypeEnum
9. ResultStatusEnum
10. ServiceScenarioEnum
11. ServiceTypeEnum
12. SourcePlatformEnum
13. TerminalTypeEnum
14. TypeEnum

## Step 5 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*
>

[GitHub](https://github.com/dana-id/uat-script)

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 6 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:

-
**Generate production keys**
Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

-
**Complete your UAT testing checklist**
Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

-
**Fill out your Production Submission form**
Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

-
**Obtain production credentials**
Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

-
**Configure the production environment**
Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

-
**Test using production credentials**
Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

-
**Receive live payments**
After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

## Python

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

#### Requirements

- Python 3.9.1+
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

#### Installation

Install using pip or visit our [Github](https://github.com/dana-id/dana-python)

[GitHub](https://github.com/dana-id/dana-python)

**Install the API Library using pip**

```python
      pip install dana-python
```

#### Set up the env

**Required Credentials**

```python
      PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key
      ORIGIN                                 # Your application's origin URL
      X_PARTNER_ID                           # clientId provided during onboarding
      ENV                                    # DANA's environment either 'sandbox' or 'production'
```

#### Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)

#### Import Package

**Import Package**

```python

```

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library

**Initialize the library**

```python

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env

      configuration = SnapConfiguration(
          api_key=AuthSettings(
              PRIVATE_KEY=os.environ.get("PRIVATE_KEY"), # obtained from Merchant Portal
              ORIGIN=os.environ.get("ORIGIN"), # Origin domain
              X_PARTNER_ID=os.environ.get("X_PARTNER_ID"), # known as clientId
              ENV=Env.SANDBOX # environment either 'sandbox' or 'production'
          )
      )
```

## Step 3 : Use the Direct Debit Payment API to get a hosted checkout URL

Use the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a POST request to the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md):

**Direct Debit Payment API**

```javascript

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
      from dana.widget.v1 import WidgetApi
      from dana.widget.v1.models.WidgetPaymentRequest import WidgetPaymentRequest
      from dana.api_client import ApiClient
      from dana.rest import ApiException
      from pprint import pprint

      # configuration and ApiClient object can be used for multiple operations
      # They should be singleton through the application lifecycle
      configuration = SnapConfiguration(
          // .. initialize client with authentication
          )
      )

      with ApiClient(configuration) as api_client:
          api_instance = WidgetApi(api_client)
          widget_payment_request = WidgetPaymentRequest(
          # Fill in required fields here, refer to Direct Debit Payment API Detail.
          )

          try:
              api_response = api_instance.widget_payment(widget_payment_request)
              print("The response of WidgetApi->widget_payment:\n")
              pprint(api_response)
          except Exception as e:
              print("Exception when calling WidgetApi->widget_payment: %s\n" % e)
      // .. initialize client with authentication

      const request: WidgetPaymentRequest = {
          // Fill in required fields here, refer to Direct Debit Payment API Detail
      };

      const response: WidgetPaymentResponse = await WidgetApi.widgetPayment(request);
```
If successful, the response will include the URL for the DANA's payment page. For example:

**Sample response from Direct Debit Payment API**

```json
      Content-Type: application/json
      X-TIMESTAMP: 2020-12-23T08:31:11+07:00
      {
        "responseCode": "2005400", // Refer to response code list
        "responseMessage": "Successful", // Refer to response code list
        "referenceNo": "2020102977770000000009", // Transaction identifier on DANA system
        "partnerReferenceNo": "2020102900000000000001", // Transaction identifier on partner system
        "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&...",
        "additionalInfo":{}
      }
```

## Optional Query Order Status, Cancel Order, Refund Order, and Balance Inquiry

There are additional APIs available to enhance your integration process:

-  [**Query Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

**Sample Query Payment API**

```python

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
      from dana.widget.v1 import WidgetApi
      from dana.widget.v1.models.QueryPaymentRequest import QueryPaymentRequest
      from dana.api_client import ApiClient
      from dana.rest import ApiException
      from pprint import pprint

      # configuration and ApiClient object can be used for multiple operations
      # They should be singleton through the application lifecycle
      configuration = SnapConfiguration(
          // .. initialize client with authentication
          )
      )

      with ApiClient(configuration) as api_client:
          api_instance = WidgetApi(api_client)
          query_payment_request = QueryPaymentRequest(
          # Fill in required fields here, refer to Query Payment API Detail.
          )

          try:
              api_response = api_instance.query_payment(query_payment_request)
              print("The response of WidgetApi->query_payment:\n")
              pprint(api_response)
          except Exception as e:
              print("Exception when calling WidgetApi->query_payment: %s\n" % e)
```

-  [**Cancel Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) - For unpaid orders or those paid within 24 hours, a full refund returns to the customer's original payment source.

**Sample Cancel Order API**

```python

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
      from dana.widget.v1 import WidgetApi
      from dana.widget.v1.models.CancelOrderRequest import CancelOrderRequest
      from dana.api_client import ApiClient
      from dana.rest import ApiException
      from pprint import pprint

      # configuration and ApiClient object can be used for multiple operations
      # They should be singleton through the application lifecycle
      configuration = SnapConfiguration(
          // .. initialize client with authentication
          )
      )

      with ApiClient(configuration) as api_client:
          api_instance = WidgetApi(api_client)
          cancel_order_request = CancelOrderRequest(
          # Fill in required fields here, refer to Cancel Order API Detail.
          )

          try:
              api_response = api_instance.cancel_order(cancel_order_request)
              print("The response of WidgetApi->cancel_order:\n")
              pprint(api_response)
          except Exception as e:
              print("Exception when calling WidgetApi->cancel_order: %s\n" % e)
```

-  [**Refund Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

**Sample Refund Order API**

```python

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
      from dana.widget.v1 import WidgetApi
      from dana.widget.v1.models.RefundOrderRequest import RefundOrderRequest
      from dana.api_client import ApiClient
      from dana.rest import ApiException
      from pprint import pprint

      # configuration and ApiClient object can be used for multiple operations
      # They should be singleton through the application lifecycle
      configuration = SnapConfiguration(
          // .. initialize client with authentication
          )
      )

      with ApiClient(configuration) as api_client:
          api_instance = WidgetApi(api_client)
          refund_order_request = RefundOrderRequest(
          # Fill in required fields here, refer to Refund Order API Detail.
          )

          try:
              api_response = api_instance.refund_order(refund_order_request)
              print("The response of WidgetApi->refund_order:\n")
              pprint(api_response)
          except Exception as e:
              print("Exception when calling WidgetApi->refund_order: %s\n" % e)
```

-  [**Balance Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) - Implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

**Sample Balance Inquiry API**

```python

      from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
      from dana.widget.v1 import WidgetApi
      from dana.widget.v1.models.BalanceInquiryRequest import BalanceInquiryRequest
      from dana.api_client import ApiClient
      from dana.rest import ApiException
      from pprint import pprint

      # configuration and ApiClient object can be used for multiple operations
      # They should be singleton through the application lifecycle
      configuration = SnapConfiguration(
          // .. initialize client with authentication
          )
      )

      with ApiClient(configuration) as api_client:
          api_instance = WidgetApi(api_client)
          balance_inquiry_request = BalanceInquiryRequest(
          # Fill in required fields here, refer to Balance Inquiry API Detail.
          )

          try:
              api_response = api_instance.balance_inquiry(balance_inquiry_request)
              print("The response of WidgetApi->balance_inquiry:\n")
              pprint(api_response)
          except Exception as e:
              print("Exception when calling WidgetApi->balance_inquiry: %s\n" % e)
```

## Step 4 : Receive Payment Outcome

After a successful payment:
1. **Notification**: The user will be redirected to your specified Redirect URL, which you can configure using the ``urlParams`` parameter in the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) request, the redirection URL has a format like: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`

2. **[Optional] Finish Notify**: In case you add ``urlParams.type = NOTIFICATION``, DANA will send payment notifications to your Notification URL via the [**Finish Notify API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: ``/v1.0/debit/notify``.

### Construction

**Construction**

```javascript
      WebhookParser(public_key: str = None, public_key_path: str = None)
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request e.g., POST |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g /v1.0/debit/notify |
| headers | map[string]string | A map containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |

### Method

**Method**

```bash
      parse_webhook(http_method: str, relative_path_url: str, headers: dict, body: str) -> FinishNotify
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request e.g., POST |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g /v1.0/debit/notify |
| headers | map[string]string | A map containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |

- **Returns:** `FinishNotifyRequest` model with parsed data
- **Raises:** ``ValueError`` if signature verification fails or the payload is invalid.

### Security Notes

- Always use the official public key provided by DANA for webhook verification.
- Reject any webhook requests that fail signature verification or have malformed payloads.
- Never trust webhook data unless it passes verification.

**Webhook Finish Notify**

```python

      from dana.webhook import WebhookParser

      # You can provide the DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH
      # The parser will prioritize DANA_PUBLIC_KEY_PATH if both are provided.

      http_method = "POST"
      relative_path_url = "/v1.0/debit/notify"
      headers = {
          "X-SIGNATURE": "<signature-from-header>",
          "X-TIMESTAMP": "<timestamp-from-header>"
      }
      body = '{"original_partner_reference_no": "123...", ...}'  # Raw JSON string from request body

      parser = WebhookParser(public_key_path=os.getenv("DANA_PUBLIC_KEY_PATH"))

      try:
          finish_notify = parser.parse_webhook(
              http_method=http_method,
              relative_path_url=relative_path_url,
              headers=headers,
              body=body
          )
          print(finish_notify.original_partner_reference_no)
      except ValueError as e:
          print(f"Webhook verification failed: {e}")
```
For detailed example, please refer to the following resource: [Example Webhook](https://github.com/dana-id/dana-node/blob/main/docs/widget/v1/Apis/WidgetApi.md#webhookparser).

### Example of a successful payment webhook payload:

**Example of a successful Finish Notify:**

```json
      Content-type: application/json
      X-TIMESTAMP: 2020-12-23T07:44:16+07:00
      {
        "responseCode": "2005600",
        "responseMessage": "Successful"
      }
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
**Example Usage**

```javascript
      from dana.widget.v1.enum import *

      # Example of using enum
      enum_value = ServiceType.PARKING
```

The following enums are available in the Library DANA Widget:
1. ServiceType
2. ServiceScenario
3. PromoType
4. AcquirementStatus
5. Mode
6. ResourceType
7. ResultStatus
8. SourcePlatform
9. TerminalType
10. OrderTerminalType
11. PayMethod
12. PayOption
13. Type

## Step 5 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*
>

[GitHub](https://github.com/dana-id/uat-script)

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 6 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:

-
**Generate production keys**
Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

-
**Complete your UAT testing checklist**
Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

-
**Fill out your Production Submission form**
Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

-
**Obtain production credentials**
Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

-
**Configure the production environment**
Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

-
**Test using production credentials**
Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

-
**Receive live payments**
After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

## Go

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

#### Requirements

- go.mod
- go.sum file
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

#### Installation

Install or visit our [Github](https://github.com/dana-id/dana-go)

[GitHub](https://github.com/dana-id/dana-go)

**Install the API Library**

```go
      go get github.com/dana-id/dana-go/v2
```

#### Set up the env

**Required Credentials**

```javascript
      PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key
      ORIGIN                                 # Your application's origin URL
      X_PARTNER_ID                           # clientId provided during onboarding
      ENV                                    # DANA's environment either 'sandbox' or 'production'
```

#### Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)

#### Import Package

**Import Package**

```javascript

        widget "github.com/dana-id/dana-go/widget/v1"
      )
```

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library

**Initialize the library**

```go
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        configuration := config.NewConfiguration()
        // Set API keys
        configuration.APIKey = &config.APIKey{
          ENV:          config.ENV_SANDBOX, // environment either 'sandbox' or 'production'
          X_PARTNER_ID: os.Getenv("X_PARTNER_ID"), // known as clientId
          PRIVATE_KEY:  os.Getenv("PRIVATE_KEY"), // obtained from Merchant Portal
          ORIGIN:       os.Getenv("ORIGIN"), // Origin domain
          // PRIVATE_KEY_PATH: os.Getenv("PRIVATE_KEY_PATH"),
        }
        apiClient := dana.NewAPIClient(configuration)
      }
```

## Step 3 : Use the Direct Debit Payment API to get a hosted checkout URL

Use the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a POST request to the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md):

**Direct Debit Payment API**

```javascript
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        // ... define authentication
        request := widget.WidgetPaymentRequest{
          // Fill in required fields here, refer to Direct Debit Payment API Detail
        }
        _, r, err := apiClient.WidgetAPI.WidgetPayment(context.Background()).WidgetPaymentRequest(request).Execute()
        if err != nil {
          fmt.Fprintf(os.Stderr, "Error when calling `WidgetAPI.WidgetPayment``: %v\n", err)
          fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
        }
        // response from `WidgetPayment`: WidgetPaymentResponse
        fmt.Fprintf(os.Stdout, "Response from `WidgetAPI.WidgetPayment`: %v\n", r.Body)
      }
```
If successful, the response will include the URL for the DANA's payment page. For example:

**Sample response from Direct Debit Payment API**

```json
      Content-Type: application/json
      X-TIMESTAMP: 2020-12-23T08:31:11+07:00
      {
        "responseCode": "2005400", // Refer to response code list
        "responseMessage": "Successful", // Refer to response code list
        "referenceNo": "2020102977770000000009", // Transaction identifier on DANA system
        "partnerReferenceNo": "2020102900000000000001", // Transaction identifier on partner system
        "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&...",
        "additionalInfo":{}
      }
```

## Optional Query Order Status, Cancel Order, Refund Order, and Balance Inquiry

There are additional APIs available to enhance your integration process:

-  [**Query Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

**Sample Query Payment API**

```javascript
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        // ... define authentication
        request := widget.QueryPaymentRequest{
          // Fill in required fields here, refer to Query Payment API Detail,
        }
        _, r, err := apiClient.WidgetAPI.QueryPayment(context.Background()).QueryPaymentRequest(request).Execute()
        if err != nil {
          fmt.Fprintf(os.Stderr, "Error when calling `WidgetAPI.QueryPayment``: %v\n", err)
          fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
        }
        // response from `QueryPayment`: QueryPaymentResponse
        fmt.Fprintf(os.Stdout, "Response from `WidgetAPI.QueryPayment`: %v\n", r.Body)
      }
```

-  [**Cancel Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) - For unpaid orders or those paid within 24 hours, a full refund returns to the customer's original payment source.

**Sample Cancel Order API**

```javascript
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        // ... define authentication
        request := widget.CancelOrderRequest{
          // Fill in required fields here, refer to Cancel Order API Detail,
        }
        _, r, err := apiClient.WidgetAPI.CancelOrder(context.Background()).CancelOrderRequest(request).Execute()
        if err != nil {
          fmt.Fprintf(os.Stderr, "Error when calling `WidgetAPI.CancelOrder``: %v\n", err)
          fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
        }
        // response from `CancelOrder`: CancelOrderResponse
        fmt.Fprintf(os.Stdout, "Response from `WidgetAPI.CancelOrder`: %v\n", r.Body)
      }
```

-  [**Refund Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

**Sample Refund Order API**

```javascript
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        // ... define authentication
        request := widget.RefundOrderRequest{
          // Fill in required fields here, refer to Refund Order API Detail,
        }
        _, r, err := apiClient.WidgetAPI.RefundOrder(context.Background()).RefundOrderRequest(request).Execute()
        if err != nil {
          fmt.Fprintf(os.Stderr, "Error when calling `WidgetAPI.RefundOrder``: %v\n", err)
          fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
        }
        // response from `RefundOrder`: RefundOrderResponse
        fmt.Fprintf(os.Stdout, "Response from `WidgetAPI.RefundOrder`: %v\n", r.Body)
      }
```

-  [**Balance Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) - Implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

**Sample Balance Inquiry API**

```javascript
      package main

        "context"
        "fmt"
        "os"
        dana "github.com/dana-id/dana-go"
        "github.com/dana-id/dana-go/config"
        widget "github.com/dana-id/dana-go/widget/v1"
      )

      func main() {

        // ... define authentication
        request := widget.BalanceInquiryRequest{
          // Fill in required fields here, refer to Balance Inquiry API Detail,
        }
        _, r, err := apiClient.WidgetAPI.BalanceInquiry(context.Background()).BalanceInquiryRequest(request).Execute()
        if err != nil {
          fmt.Fprintf(os.Stderr, "Error when calling `WidgetAPI.BalanceInquiry``: %v\n", err)
          fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
        }
        // response from `BalanceInquiry`: BalanceInquiryResponse
        fmt.Fprintf(os.Stdout, "Response from `WidgetAPI.BalanceInquiry`: %v\n", r.Body)
      }
```

## Step 4 : Receive Payment Outcome

After a successful payment:
1. **Notification**: The user will be redirected to your specified Redirect URL, which you can configure using the ``urlParams`` parameter in the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) request, the redirection URL has a format like: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`

2. **[Optional] Finish Notify**: In case you add ``urlParams.type = NOTIFICATION``, DANA will send payment notifications to your Notification URL via the [**Finish Notify API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: ``/v1.0/debit/notify``.

### Construction

**Construction**

```go
      func NewWebhookParser(publicKey *string, publicKeyPath *string) (*WebhookParser, error)
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string. This is used if publicKeyPath is not provided or is empty |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the publicKey string |

- **Returns:** A pointer to a ``WebhookParser`` instance and an error if the public key is invalid.

### Method

**Method**

```go
    func (p *WebhookParser) ParseWebhook(httpMethod string, relativePathURL string, headers map[string]string, body string) (*model.FinishNotify, error)
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request e.g., http.MethodPost |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g /v1.0/debit/notify |
| headers | map[string]string | A map containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |

- **Return:** A pointer to a ``model.FinishNotifyRequest`` struct containing the parsed and verified webhook data, or an error if parsing or signature verification fails.

### Security Notes

- Always use the official public key provided by DANA for webhook verification. Store and load it securely.
- The ``ParseWebhook`` smethod handles both JSON parsing and cryptographic signature verification. If it returns an error, the payload should not be trusted.

**Webhook Finish Notify**

```go
    package main

      "bytes"
      "fmt"
      "io"
      "net/http"
      "os"

      webhook "github.com/dana-id/dana-go/webhook"
      widget "github.com/dana-id/dana-go/widget/v1"
    )

    // This function would be your actual webhook handler in a real application.
    func webhookNotificationHandler(req *http.Request) {
      // 1. Initialize the WebhookParser
      // You can provide the public key directly as a string or via a file path.
      // The parser will prioritize publicKeyPath if both are provided.

      // Option 1: Provide public key as a string
      // danaPublicKeyPEM := os.Getenv("DANA_PUBLIC_KEY")
      // parser, err := webhook.NewWebhookParser(&danaPublicKeyPEM, nil)

      // Option 2: Provide path to public key file
      danaPublicKeyPath := os.Getenv("DANA_PUBLIC_KEY_PATH") // e.g., "/path/to/your/dana_public_key.pem"
      parser, err := webhook.NewWebhookParser(nil, &danaPublicKeyPath)
      if err != nil {
        fmt.Printf("Error creating WebhookParser: %v\n", err)
        return
      }

      // 2. Extract data from the incoming HTTP Request
      httpMethod := req.Method
      relativePathUrl := "/v1.0/debit/notify"
      // relativePathUrl := req.URL.Path // This should match the path DANA sends the webhook to for example: /v1.0/debit/notify

      // Read the request body
      bodyBytes, err := io.ReadAll(req.Body)
      if err != nil {
        fmt.Printf("Error reading request body: %v\n", err)
        return
      }
      defer req.Body.Close() // Important to close the body
      webhookBodyStr := string(bodyBytes)

      // Log received data for debugging (optional)
      fmt.Printf("Received webhook: Method=%s, Path=%s, Headers=%v, Body=%s\n",
        httpMethod, relativePathUrl, req.Header, webhookBodyStr)

      // 3. Parse and verify the webhook
      parsedData, err := parser.ParseWebhook(
        httpMethod,
        relativePathUrl,
        req.Header,
        webhookBodyStr,
      )

      if err != nil {
        fmt.Printf("Webhook parsing/verification failed: %v\n", err)
        // IMPORTANT: If verification fails, do not trust the payload.
        return
      }

      // 4. Use the parsed data
      fmt.Printf("Webhook parsed successfully!\n")
      fmt.Printf("Original Partner Reference No: %s\n", parsedData.OriginalPartnerReferenceNo)
      fmt.Printf("Amount: %s %s\n", parsedData.Amount.Value, parsedData.Amount.Currency)
      fmt.Printf("Status: %s\n", parsedData.LatestTransactionStatus)
      // Access other fields from parsedData as needed
    }
```
For detailed example, please refer to the following resource: [Example Webhook](https://github.com/dana-id/dana-go/blob/main/docs/WidgetAPI.md#webhookparser).

### Example of a successful payment webhook payload:

**Example of a successful Finish Notify:**

```json
    Content-type: application/json
    X-TIMESTAMP: 2020-12-23T07:44:16+07:00
    {
      "responseCode": "2005600",
      "responseMessage": "Successful"
    }
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
**Example Usage**

```javascript

      ipg := string(widget.SOURCEPLATFORM_IPG_)
```
The following enums are available in the Library DANA Widget Non Binding:
1. acquirementStatus
2. actorType
3. orderTerminalType
4. payMethod
5. payOption
6. promoType
7. resourceType
8. resultStatus
9. serviceScenario
10. serviceType
11. sourcePlatform
12. terminalType
13. type

## Step 5 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*
>

[GitHub](https://github.com/dana-id/uat-script)

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 6 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:

-
**Generate production keys**
Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

-
**Complete your UAT testing checklist**
Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

-
**Fill out your Production Submission form**
Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

-
**Obtain production credentials**
Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

-
**Configure the production environment**
Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

-
**Test using production credentials**
Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

-
**Receive live payments**
After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

## PHP

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

#### Requirements

- PHP 7.4+, compatible with PHP 8.0.
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

#### Installation

Install using composer or visit our [Github](https://github.com/dana-id/dana-php)

[GitHub](https://github.com/dana-id/dana-php)

1. Using Composer
- Add the following code to `composer.json`
**Install the API Library using Composer**

```javascript
        {
          "repositories": [
            {
              "type": "vcs",
              "url": "https://github.com/dana-id/dana-php.git"
            }
          ],
          "require": {
            "danaid/dana-php": "^2.0"
          }
        }
```
- Run `composer install`

2. Manual Installation
**Download the files and include autoload.php**

```javascript
      <?php
      require_once('/path/to/DanaPhp/vendor/autoload.php');
```

#### Set up the env

**Required Credentials**

```javascript
      PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key
      ORIGIN                                 # Your application's origin URL
      X_PARTNER_ID                           # clientId provided during onboarding
      ENV                                    # DANA's environment either 'sandbox' or 'production'
```

#### Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)

#### Import Package

**Import Package**

```javascript
      use Dana\Widget\v1
```

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library

**Initialize the library**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;

      // Set up configuration with authentication settings
      $configuration = new Configuration();

      // The Configuration constructor automatically loads values from environment variables
      // Choose one of PRIVATE_KEY or PRIVATE_KEY_PATH to set, if you set both, PRIVATE_KEY will be ignored
      $configuration->setApiKey('PRIVATE_KEY', getenv('PRIVATE_KEY'));
      // $configuration->setApiKey('PRIVATE_KEY_PATH', getenv('PRIVATE_KEY_PATH'));
      $configuration->setApiKey('ORIGIN', getenv('ORIGIN'));
      $configuration->setApiKey('X_PARTNER_ID', getenv('X_PARTNER_ID'));
      $configuration->setApiKey('DANA_ENV', Env::SANDBOX);
      // Choose one of ENV or DANA_ENV to set, if you set both, ENV will be ignored
      // $configuration->setApiKey('ENV', Env::SANDBOX);
      $apiInstance = new WidgetApi(
          null, // this also can be set to custom http client which implements `GuzzleHttp\ClientInterface`
          $configuration
      );
```

## Step 3 : Use the Direct Debit Payment API to get a hosted checkout URL

Use the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a POST request to the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md):

**Direct Debit Payment API**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;
      use Dana\Widget\v1\Model\WidgetPaymentRequest;

      // ... define authentication

      $widgetPaymentRequest = WidgetPaymentRequest();

      try {
          $result = $apiInstance->widgetPayment($widgetPaymentRequest);
          print_r($result);
      } catch (Exception $e) {
          echo 'Exception when calling WidgetApi->widgetPayment: ', $e->getMessage(), PHP_EOL;
      }
```
If successful, the response will include the URL for the DANA's payment page. For example:

**Sample response from Direct Debit Payment API**

```json
      Content-Type: application/json
      X-TIMESTAMP: 2020-12-23T08:31:11+07:00
      {
        "responseCode": "2005400", // Refer to response code list
        "responseMessage": "Successful", // Refer to response code list
        "referenceNo": "2020102977770000000009", // Transaction identifier on DANA system
        "partnerReferenceNo": "2020102900000000000001", // Transaction identifier on partner system
        "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&...",
        "additionalInfo":{}
      }
```

## Optional Query Order Status, Cancel Order, Refund Order, and Balance Inquiry

There are additional APIs available to enhance your integration process:

-  [**Query Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

**Sample Query Payment API**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;
      use Dana\Widget\v1\Model\QueryPaymentRequest;

      // ... define authentication

      $queryPaymentRequest = QueryPaymentRequest();

      try {
          $result = $apiInstance->queryPayment($queryPaymentRequest);
          print_r($result);
      } catch (Exception $e) {
          echo 'Exception when calling WidgetApi->queryPayment: ', $e->getMessage(), PHP_EOL;
      }
```

-  [**Cancel Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) - For unpaid orders or those paid within 24 hours, a full refund returns to the customer's original payment source.

**Sample Cancel Order API**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;
      use Dana\Widget\v1\Model\CancelOrderRequest;

      // ... define authentication

      $cancelOrderRequest = CancelOrderRequest();

      try {
          $result = $apiInstance->cancelOrder($cancelOrderRequest);
          print_r($result);
      } catch (Exception $e) {
          echo 'Exception when calling WidgetApi->cancelOrder: ', $e->getMessage(), PHP_EOL;
      }
```

-  [**Refund Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

**Sample Refund Order API**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;
      use Dana\Widget\v1\Model\RefundOrderRequest;

      // ... define authentication

      $refundOrderRequest = RefundOrderRequest();

      try {
          $result = $apiInstance->refundOrder($refundOrderRequest);
          print_r($result);
      } catch (Exception $e) {
          echo 'Exception when calling WidgetApi->refundOrder: ', $e->getMessage(), PHP_EOL;
      }
```

-  [**Balance Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) - Implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

**Sample Balance Inquiry API**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Env;
      use Dana\Widget\v1\Api\WidgetApi;
      use Dana\Widget\v1\Model\BalanceInquiryRequest;

      // ... define authentication

      $balanceInquiryRequest = BalanceInquiryRequest();

      try {
          $result = $apiInstance->balanceInquiry($balanceInquiryRequest);
          print_r($result);
      } catch (Exception $e) {
          echo 'Exception when calling WidgetApi->balanceInquiry: ', $e->getMessage(), PHP_EOL;
      }
```

## Step 4 : Receive Payment Outcome

After a successful payment:
1. **Notification**: The user will be redirected to your specified Redirect URL, which you can configure using the ``urlParams`` parameter in the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) request, the redirection URL has a format like: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`

2. **[Optional] Finish Notify**: In case you add ``urlParams.type = NOTIFICATION``, DANA will send payment notifications to your Notification URL via the [**Finish Notify API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: ``/v1.0/debit/notify``.

### Construction

**Construction**

```javascript
      public function __construct(?string $publicKey = null, ?string $publicKeyPath = null)
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string. This is used if publicKeyPath is not provided or is empty |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the publicKey string |

- Throws: ``\InvalidArgumentException`` if neither publicKey nor publicKeyPath is provided or if the public key cannot be loaded

### Method

**Method**

```bash
      public function parseWebhook(string $httpMethod, string $relativePathURL, array $headers, string $body): \Dana\Webhook\v1\Model\FinishNotifyRequest
```

#### Request

| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request e.g., POST |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g /v1.0/debit/notify |
| headers | array | An array containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |

- **Returns:** An instance of \Dana\Webhook\v1\Model\FinishNotifyRequest containing the parsed and verified webhook data.
- **Throws:** ``\InvalidArgumentException`` if required parameters are missing or ``\RuntimeException`` if signature verification fails.

### Security Notes

- Always use the official public key provided by DANA for webhook verification. Store and load it securely.
- The ``parseWebhook`` method handles both JSON parsing and cryptographic signature verification. If it throws an exception, the payload should not be trusted.

**Webhook Finish Notify**

```javascript
      <?php
      use Dana\Configuration;
      use Dana\Webhook\WebhookParser;

      // Initialize the WebhookParser
      // You can provide the public key directly as a string or via a file path.
      // The parser will prioritize publicKeyPath if both are provided.

      // Option 1: Provide public key as a string
      $danaPublicKey = getenv('DANA_PUBLIC_KEY');
      $parser = new WebhookParser($danaPublicKey);

      // Option 2: Provide path to public key file
      // $danaPublicKeyPath = getenv('DANA_PUBLIC_KEY_PATH'); // e.g., "/path/to/your/dana_public_key.pem"
      // $parser = new WebhookParser(null, $danaPublicKeyPath);

      // Get the request data
      $httpMethod = $_SERVER['REQUEST_METHOD'];
      $relativePathUrl = '/v1.0/debit/notify'; // This should match the path DANA sends the webhook to

      // Get headers - getallheaders() is the standard way in PHP
      $headers = getallheaders();
      // For frameworks that don't support getallheaders(), you can use:
      // $headers = [];
      // foreach ($_SERVER as $name => $value) {
      //     if (substr($name, 0, 5) === 'HTTP_') {
      //         $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
      //     }
      // }

      // Get the raw request body as a JSON string
      $webhookBodyStr = file_get_contents('php://input');

      // If you need to access the decoded data before passing to the parser
      // (Not required for parseWebhook which expects the raw string)
      // $jsonData = json_decode($webhookBodyStr, true);
      // if (json_last_error() !== JSON_ERROR_NONE) {
      //     throw new \RuntimeException('Invalid JSON in webhook payload: ' . json_last_error_msg());
      // }
      // echo "Request data: " . print_r($jsonData, true);

      try {
          // Parse and verify the webhook
          $parsedData = $parser->parseWebhook(
              $httpMethod,
              $relativePathUrl,
              $headers,
              $webhookBodyStr
          );

          // If we reach here, the webhook was parsed and verified successfully
          echo "Webhook verified successfully!\n";
          echo "Original Partner Reference No: " . $parsedData->getOriginalPartnerReferenceNo() . "\n";
          echo "Amount: " . $parsedData->getAmount()->getValue() . " " . $parsedData->getAmount()->getCurrency() . "\n";
          echo "Status: " . $parsedData->getLatestTransactionStatus() . "\n";

          // Access additional information if available
          if ($parsedData->getAdditionalInfo() && $parsedData->getAdditionalInfo()->getPaymentInfo()) {
              $paymentInfo = $parsedData->getAdditionalInfo()->getPaymentInfo();
              $payOptions = $paymentInfo->getPayOptionInfos();

              foreach ($payOptions as $payOption) {
                  echo "Payment Method: " . $payOption->getPayMethod() . "\n";
                  if ($payOption->getPayOption()) {
                      echo "Payment Option: " . $payOption->getPayOption() . "\n";
                  }
              }
          }

      } catch (\Exception $e) {
          // If verification fails, do not trust the payload
          error_log("Webhook verification failed: " . $e->getMessage());

          // Respond with an error
          header('Content-Type: application/json');
          http_response_code(400);
          echo json_encode([
              'response_code' => '96',
              'response_message' => 'System Error'
          ]);
      }
```
For detailed example, please refer to the following resource: [Example Webhook](https://github.com/dana-id/dana-node/blob/main/docs/widget/v1/Apis/WidgetApi.md#webhook-verification).

### Example of a successful payment webhook payload:

**Example of a successful Finish Notify:**

```json
      Content-type: application/json
      X-TIMESTAMP: 2020-12-23T07:44:16+07:00
      {
        "responseCode": "2005600",
        "responseMessage": "Successful"
      }
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
**Example Usage**

```javascript
      // Importing an enum class
      use Dana\Widget\v1\Enum\TerminalType;

      // Using enum constants
      $model->setTerminalType(TerminalType::APP);

      // Using enum values directly as strings
      $model->setTerminalType('APP');
```
The following enums are available in the Library DANA Widget Non Binding:
1. ActorType
2. OrderTerminalType
3. PayMethod
4. PayOption
5. SourcePlatform
6. TerminalType
7. Type
8. AcquirementStatus
9. Mode
10. ServiceScenario
11. ServiceType

## Step 5 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*
>

[GitHub](https://github.com/dana-id/uat-script)

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 6 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:

-
**Generate production keys**
Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

-
**Complete your UAT testing checklist**
Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

-
**Fill out your Production Submission form**
Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

-
**Obtain production credentials**
Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

-
**Configure the production environment**
Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

-
**Test using production credentials**
Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

-
**Receive live payments**
After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

## Java

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

#### Requirements

- JDK 1.8 or later.
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

### Installation

Install using maven or visit our [Github](https://github.com/dana-id/dana-java)

[GitHub](https://github.com/dana-id/dana-java)

### Install the API Library using maven

1. Add the following dependency to your `pom.xml`
```javascript
      <dependency>
          <groupId>id.dana</groupId>
          <artifactId>dana-java</artifactId>
          <version>2.1.9</version>
      </dependency>
```
2. run `mvn clean install`

#### Set up the env

**Required Credentials**

```javascript
      PRIVATE_KEY or PRIVATE_KEY_PATH        # Private key string (PRIVATE_KEY) or path to private key file (PRIVATE_KEY_PATH)
      ORIGIN                                 # Your application's origin URL
      X_PARTNER_ID                           # Client ID provided at onboarding
      ENV or DANA_ENV                        # DANA's environment either 'sandbox' or 'production'
```

#### Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library

**Initialize the library**

```javascript

      public class Example {
          public static void main(String[] args) {
              DanaConfig.Builder danaConfigBuilder = new DanaConfig.Builder();
              danaConfigBuilder
                  .partnerId(ConfigUtil.getConfig("X_PARTNER_ID", ""))
                  .privateKey(ConfigUtil.getConfig("PRIVATE_KEY", ""))
                  .origin(ConfigUtil.getConfig("ORIGIN", ""));

              DanaConfig.getInstance(danaConfigBuilder);

              Dana danaClient = Dana.getInstance();
          }
      }
```

## Step 3 : Use the Direct Debit Payment API to get a hosted checkout URL

Use the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a POST request to the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md):

**Direct Debit Payment API**

```javascript

      public class Example {
          public static void main(String[] args) {
              WidgetApi api = Dana.getInstance().getWidgetApi();

              WidgetPaymentRequest widgetPaymentRequest = new WidgetPaymentRequest();

              try {
                  WidgetPaymentResponse response = api.widgetPayment(widgetPaymentRequest);
                  System.out.println(response);
              } catch (DanaException e) {
                  e.printStackTrace();
              }
          }
      }
```
If successful, the response will include the URL for the DANA's payment page. For example:

**Sample response from Direct Debit Payment API**

```json
      Content-Type: application/json
      X-TIMESTAMP: 2020-12-23T08:31:11+07:00
      {
        "responseCode": "2005400", // Refer to response code list
        "responseMessage": "Successful", // Refer to response code list
        "referenceNo": "2020102977770000000009", // Transaction identifier on DANA system
        "partnerReferenceNo": "2020102900000000000001", // Transaction identifier on partner system
        "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&...",
        "additionalInfo":{}
      }
```

## Optional Query Order Status, Cancel Order, Refund Order, and Balance Inquiry

There are additional APIs available to enhance your integration process:

-  [**Query Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

**Sample Query Payment API**

```javascript

      public class Example {
          public static void main(String[] args) {
              WidgetApi api = Dana.getInstance().getWidgetApi();

              QueryPaymentRequest queryPaymentRequest = new QueryPaymentRequest();

              try {
                  QueryPaymentResponse response = api.queryPayment(queryPaymentRequest);
                  System.out.println(response);
              } catch (DanaException e) {
                  e.printStackTrace();
              }
          }
      }
```

-  [**Cancel Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/cancel-order.md) - For unpaid orders or those paid within 24 hours, a full refund returns to the customer's original payment source.

**Sample Cancel Order API**

```javascript

      public class Example {
          public static void main(String[] args) {
              WidgetApi api = Dana.getInstance().getWidgetApi();

              CancelOrderRequest cancelOrderRequest = new CancelOrderRequest();

              try {
                  CancelOrderResponse response = api.cancelOrder(cancelOrderRequest);
                  System.out.println(response);
              } catch (DanaException e) {
                  e.printStackTrace();
              }
          }
      }
```

-  [**Refund Order API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

**Sample Refund Order API**

```javascript

      public class Example {
          public static void main(String[] args) {
              WidgetApi api = Dana.getInstance().getWidgetApi();

              RefundOrderRequest refundOrderRequest = new RefundOrderRequest();

              try {
                  RefundOrderResponse response = api.refundOrder(refundOrderRequest);
                  System.out.println(response);
              } catch (DanaException e) {
                  e.printStackTrace();
              }
          }
      }
```

-  [**Balance Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/optional-api/balance-inquiry.md) - Implement this API to verify the customer's balance before order creation. Disabling payment methods with insufficient funds will increase your order success rate.

**Sample Balance Inquiry API**

```javascript

      public class Example {
          public static void main(String[] args) {
              WidgetApi api = Dana.getInstance().getWidgetApi();

              BalanceInquiryRequest balanceInquiryRequest = new BalanceInquiryRequest();

              try {
                  BalanceInquiryResponse response = api.balanceInquiry(balanceInquiryRequest);
                  System.out.println(response);
              } catch (DanaException e) {
                  e.printStackTrace();
              }
          }
      }
```

## Step 4 : Receive Payment Outcome

After a successful payment:
1. **Notification**: The user will be redirected to your specified Redirect URL, which you can configure using the ``urlParams`` parameter in the [**Direct Debit Payment API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/direct-debit-payment.md) request, the redirection URL has a format like: ``https:xxx?originalReferenceNo=xxx&originalPartnerReferenceNo=xxx&merchantId=xxxx&status=xxx``
- merchant redirect URL: set on ``urlParams.url``
- originalReferenceNo: Original transaction identifier on DANA system
- originalPartnerReferenceNo: Original transaction identifier on partner system
- merchantId: Merchant identifier that is unique per each merchant
- status: Payment transaction in DANA side
- Example: `https://www.merchantUrl.com/result/?originalReferenceNo=20250613111212800100166070954004283&originalPartnerReferenceNo=8562466e47144b5f82c003b47ae3c474&merchantId=216620000020928274717&status=SUCCESS`

2. **[Optional] Finish Notify**: In case you add ``urlParams.type = NOTIFICATION``, DANA will send payment notifications to your Notification URL via the [**Finish Notify API**](https://dashboard.dana.id/api-docs-v2/llms/api/dana-widget/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: ``/v1.0/debit/notify``.

### Example of a successful payment webhook payload:

**Example of a successful Finish Notify:**

```json
      Content-type: application/json
      X-TIMESTAMP: 2020-12-23T07:44:16+07:00
      {
        "responseCode": "2005600",
        "responseMessage": "Successful"
      }
```

## Step 5 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*
>

[GitHub](https://github.com/dana-id/uat-script)

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 6 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:

-
**Generate production keys**
Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

-
**Complete your UAT testing checklist**
Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

-
**Fill out your Production Submission form**
Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

-
**Obtain production credentials**
Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

-
**Configure the production environment**
Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

-
**Test using production credentials**
Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

-
**Receive live payments**
After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)
