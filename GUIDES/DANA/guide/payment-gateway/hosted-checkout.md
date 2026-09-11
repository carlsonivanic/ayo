# Gapura Hosted Checkout

Document Version [1.2.1](#document-changelog)

Gapura Hosted Checkout is a payment page hosted by DANA that can receive payment from your customers. This service returns a checkout page URL which you can integrate into your payment flow. DANA will then create and process the transaction and notify you when it is completed.

## Before you start integration

Before you begin your registration, you need to register your business in order to get your test credentials. After you have created your test account, make sure you have done the following steps:

* Finish your company registration and select Gapura Hosted Checkout as your payment solution.

* Setup your webhooks and redirect URLs to receive payment outcomes and redirect users after payment.

* Obtain your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials).

## User Experience

**Fully Hosted by DANA**

Simply redirect customers to a DANA hosted cashier page.

![Fully Hosted by DANA](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/gapura-payment-gateway/UX-1.png)

**Many Payment Methods**

Customers can pay using most Indonesian payment methods.

![Many Payment Methods](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/gapura-payment-gateway/UX-2.png)

**Instant Payment Result**

Merchants and customers instantly receive payment result.

![Instant Payment Result](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/gapura-payment-gateway/UX-3.png)

## Process Flow

The general flow of payment using the Gapura Hosted Checkout is as follows:

For edge cases and other scenarios, see [Payment Gateway API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/overview.md).

![Gapura Hosted Checkout Mobile](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/gapura-payment-gateway/sequence-gapura-hosted-checkout.png)

1. The user browses the merchant's website or app and proceeds to checkout after selecting a product.
2. The merchant system generates an order internally, preparing it for payment processing.
3. The merchant's backend sends a request to DANA's [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md), passing the necessary order details.
4. Upon receiving the request, DANA processes and stores the order details in its system.
5. After successfully creating the order, DANA responds with a **`webRedirectUrl`** for the checkout page.
6. The merchant uses the returned URL to prepare a redirection to DANA's hosted checkout page.
7. The user is redirected to the DANA-hosted checkout page where the payment can be made.
8. Available payment methods are displayed.
9. The user chooses one of the supported payment methods provided by DANA and follows the instructions on the DANA checkout page to complete the payment.
10. DANA Hosted Checkout page receives the payment details and sends it to DANA API.
11. DANA processes the payment.
12. DANA shows payment result screen to user.
13. DANA sends a payment notification to the merchant's system via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md), updating the payment status of the order.
14. DANA redirects to the merchant URL that was already set when calling [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md).

## Integration Demo Video

To simplify the integration process, watch our step-by-step demo video that walks you through the complete setup and implementation of Gapura Hosted Checkout.

[Watch DANA Merchant Integration on YouTube](https://www.youtube.com/watch?v=JikuzV6tnWM&t=1s)

### Step 1: Library Installation

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management. Follow the guide below to install our library:

For full SDK package details, see [Libraries](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md).

### Node.js

**Requirements**
* Node.js version 18 or later
* Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials) from the merchant portal.

**Installation**
Install using npm or visit our [GitHub repo](https://github.com/dana-id/dana-node).

```bash
npm install dana-node
```

**Set up the env**
```javascript
# Required Credentials
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
X_DEBUG                                 # Enable debug mode if set to 'true'. Debug mode will show
                                        # the reason of failed request in additionalInfo.debugMessage in response.
```
Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

### Python

**Requirements**
* Python 3.9.1+
* Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials) from the merchant portal.

**Installation**
Install using pip or visit our [GitHub repo](https://github.com/dana-id/dana-python).

```bash
pip install dana-python
```

**Set up the env**
```javascript
# Required Credentials
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
X_DEBUG                                 # Enable debug mode if set to 'true'. Debug mode will show
                                        # the reason of failed request in additionalInfo.debugMessage in response.
```
Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

**Import Package**
```python
import dana.payment_gateway.v1
```

### Go

**Requirements**
* **go.mod**
* **go.sum file**
* Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials) from the merchant portal.

**Installation:** install the library or visit our [GitHub repo](https://github.com/dana-id/dana-go).

```bash
go get github.com/dana-id/dana-go
```

**Set up the env**
```javascript
# Required Credentials
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
X_DEBUG                                 # Enable debug mode if set to 'true'. Debug mode will show
                                        # the reason of failed request in additionalInfo.debugMessage in response.
```
Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

**Import Package**
```go
import (
	payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)
```

### PHP

**Requirements**
* PHP 7.4+, compatible with PHP 8.0.
* Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials) from the merchant portal.

**Installation:** install using Composer or visit our [GitHub repo](https://github.com/dana-id/dana-php).

1. Using Composer, add the following code to `composer.json`:

```json
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

Run `composer install`.

2. Manual Installation: download the files and include `autoload.php`.

```php
<?php
      require_once('/path/to/DanaPhp/vendor/autoload.php');
```

**Set up the env**
```javascript
# Required Credentials
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
X_DEBUG                                 # Enable debug mode if set to 'true'. Debug mode will show
                                        # the reason of failed request in additionalInfo.debugMessage in response.
```
Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

**Import Package**
```php
use Dana\PaymentGateway\v1
```

### Java

**Requirements**
* JDK 1.8 or later.
* Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-testing-credentials) from the merchant portal.

**Installation**
Get our SDK from [GitHub](https://github.com/dana-id/dana-java).

1. Add the following dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>id.dana</groupId>
    <artifactId>dana-java</artifactId>
    <version>2.1.3</version>
</dependency>
```
2. Run `mvn clean install`.

**Set up the env**
```javascript
PRIVATE_KEY or PRIVATE_KEY_PATH        # Private key string (PRIVATE_KEY) or path to private key file (PRIVATE_KEY_PATH)
ORIGIN                                 # Your application's origin URL
X_PARTNER_ID                           # Client ID provided at onboarding
ENV or DANA_ENV                        # DANA's environment either 'sandbox' or 'production'
```

Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

### Step 2: Initialize the library

Follow the guide below to initialize the library

#### Node.js

```javascript
import { Dana } from 'dana-node';

const danaClient = new Dana({
    partnerId: "YOUR_PARTNER_ID", // process.env.X_PARTNER_ID
    privateKey: "YOUR_PRIVATE_KEY", // process.env.X_PRIVATE_KEY
    origin: "YOUR_ORIGIN", // process.env.ORIGIN
    env: "sandbox", // process.env.DANA_ENV or process.env.ENV or "sandbox" or "production"
    debugMode: "true", // process.env.X_DEBUG
});
const { paymentGatewayApi } = danaClient;
```

#### Python

```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env

configuration = SnapConfiguration(
    api_key=AuthSettings(
        PRIVATE_KEY=os.environ.get("PRIVATE_KEY"), # or you can set PRIVATE_KEY_PATH 
        ORIGIN=os.environ.get("ORIGIN"),
        X_PARTNER_ID=os.environ.get("X_PARTNER_ID"),
        DANA_ENV=os.environ.get("DANA_ENV"), # or you can set ENV
        X_DEBUG=os.environ.get("X_DEBUG"), # enable debug mode (showing reason of failed request in additionalInfo.debugMessage in response)
    )
)
```

#### Go

```go
package main

import (
	"context"
	"fmt"
	"os"
	dana "github.com/dana-id/dana-go"
	"github.com/dana-id/dana-go/config"
	payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)

func main() {
	
	// Configuring api client
	// Api client should be singleton, can reuse the apiClient for multiple requests in various operations
	configuration := config.NewConfiguration()
	configuration.APIKey = &config.APIKey{
		// ENV:          config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production. Can use DANA_ENV instead
		DANA_ENV:     config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production
		X_PARTNER_ID: os.Getenv("X_PARTNER_ID"),
		PRIVATE_KEY:  os.Getenv("PRIVATE_KEY"), // Can provide the private key directly as a string or via a file path (PRIVATE_KEY_PATH). If both added, we will prioritize the path
		ORIGIN:       os.Getenv("ORIGIN"),
		// PRIVATE_KEY_PATH: os.Getenv("PRIVATE_KEY_PATH"),
		// X_DEBUG: os.Getenv("X_DEBUG"), // Optional, can be set to "true" to enable debug mode (showing reason of failed request in additionalInfo.debugMessage in response)
	}
	apiClient := dana.NewAPIClient(configuration)
}
```

#### PHP

```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\PaymentGateway\v1\Api\PaymentGatewayApi;

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
// Set to 'true' to enable debug mode
// Debug mode will show reason of failed request in additionalInfo.debugMessage in response
// $configuration->setApiKey('X_DEBUG', getenv('X_DEBUG'));

$apiInstance = new PaymentGatewayApi(
    null, // this also can be set to custom http client which implements `GuzzleHttp\ClientInterface`
    $configuration
);
```

#### Java

```java
import id.dana.invoker.Dana;
import id.dana.invoker.model.DanaConfig;

import id.dana.util.ConfigUtil;

public class Example {
    public static void main(String[] args) {
        DanaConfig.Builder danaConfigBuilder = new DanaConfig.Builder();
        danaConfigBuilder
            .partnerId("YOUR_PARTNER_ID")
            .privateKey("YOUR_PRIVATE_KEY")
            .origin("YOUR_ORIGIN");
            .env("SANDBOX"); // or "PRODUCTION"

        DanaConfig.getInstance(danaConfigBuilder);

        Dana danaClient = Dana.getInstance();
    }
}
```

Refer to the [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide if you are not using our library.

### Step 3: Use the Create Order API to get a hosted checkout URL

Use the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md) to create new payment requests which will then return the Checkout URL of the hosted payment page.

To create a new order, make a `POST` request to the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md):

#### Python

```python
from dana.payment_gateway.v1.models.create_order_by_redirect_request import CreateOrderByRedirectRequest
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.payment_gateway.v1 import PaymentGatewayApi
from dana.payment_gateway.v1.models.CreateOrderRequest import CreateOrderRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    // .. initialize client with authentication
)

with ApiClient(configuration) as api_client:
    api_instance = PaymentGatewayApi(api_client)
    create_order_request = CreateOrderByRedirectRequest(
    # Fill in required fields here, refer to Create Order API Detail.
    )

    try:
        api_response = api_instance.create_order(create_order_request)
        print("The response of PaymentGatewayApi->create_order:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentGatewayApi->create_order: %s\n" % e)
```

#### Node.js

```javascript
import { Dana } from 'dana-node-api-client';

const danaClient = new Dana({
    partnerId: "clientId", // known as clientId
    privateKey: "YOUR_PRIVATE_KEY", // obtained from Merchant Portal
    origin: "ORIGIN", // Origin domain
});
const { PaymentGatewayApi } = danaClient;

const request: CreateOrderRequest = {
    // Fill in required fields here. See: https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md
};

const response: CreateOrderResponse = await PaymentGatewayApi.createOrder(request);
```

#### Go

```go
package main

import (
	"context"
	"fmt"
	"os"
	dana "github.com/dana-id/dana-go"
	"github.com/dana-id/dana-go/config"
	payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)

func main() {
	// Define request struct directly (example)
	request := payment_gateway.CreateOrderRequest{
		// Fill in required fields here, e.g.:
		// Field1: "value1",
		// Field2: "value2",
		// Fill in required fields here. See: https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md
	}

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
	_, r, err := apiClient.PaymentGatewayAPI.CreateOrder(context.Background()).CreateOrderRequest(request).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PaymentGatewayAPI.CreateOrder``: %v\\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\\n", r)
	}
	// response from `CreateOrder`: CreateOrderResponse
	fmt.Fprintf(os.Stdout, "Response from `PaymentGatewayAPI.CreateOrder`: %v\\n", r.Body)
}

```

#### PHP

```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\PaymentGateway\v1\Api\PaymentGatewayApi;
use Dana\PaymentGateway\v1\Model\CreateOrderRequest;

// ... define authentication

$createOrderRequest = CreateOrderRequest();

try {
    $result = $apiInstance->createOrder($createOrderRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PaymentGatewayApi->createOrder: ', $e->getMessage(), PHP_EOL;
}
```

#### Java

```java
import id.dana.invoker.Dana;
import id.dana.paymentgateway.v1.api.PaymentGatewayApi;
import id.dana.paymentgateway.v1.model.CreateOrderRequest;
import id.dana.paymentgateway.v1.model.CreateOrderResponse;

public class Example {
    public static void main(String[] args) {
        PaymentGatewayApi api = Dana.getInstance().getPaymentGatewayApi();

        CreateOrderRequest createOrderRequest = new CreateOrderRequest();

        try {
            CreateOrderResponse response = api.createOrder(createOrderRequest);
            System.out.println(response);
        } catch (DanaException e) {
            e.printStackTrace();
        }
    }
}
```


Important: When sending the request parameters, set `additionalInfo.order.scenario` to `REDIRECT`.

If successful, the response will include the URL for the hosted payment page. For example:

Sample response from Create Order API

```json
Content-Type: application/json
X-TIMESTAMP: 2024-12-23T09:10:11+07:00
{
  "responseCode": "2005400",
  "responseMessage": "Successful",
  "referenceNo": "2020102977770000000009",
  "partnerReferenceNo": "2020102900000000000001",
  "webRedirectUrl": "https://pjsp.com/universal?bizNo=REF993883&..."
}
```

Redirect the merchant to the `webRedirectUrl` in the response. The merchant will proceed to the hosted checkout page and complete payment on the order.

If you want to simulate payments in the sandbox environment, contact our Merchant Services team to access our sandbox simulation tools.

### [Optional] Query Order Status, Cancel Order, and Refund Order

There are additional APIs available to enhance your integration process:

1. [Query Payment API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/query-payment.md) - Use this API to inquire the latest status of a payment request.

#### Query Payment API - Python

```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.payment_gateway.v1 import PaymentGatewayApi
from dana.payment_gateway.v1.models.QueryPaymentRequest import QueryPaymentRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    // .. initialize client with authentication
)

with ApiClient(configuration) as api_client:
    api_instance = PaymentGatewayApi(api_client)
    query_payment_request = QueryPaymentRequest(
    # Fill in required fields here, refer to Query Payment API Detail.
    )

    try:
        api_response = api_instance.query_payment(query_payment_request)
        print("The response of PaymentGatewayApi->query_payment:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentGatewayApi->query_payment: %s\n" % e)
```

#### Query Payment API - Node.js

```javascript
import { Dana } from 'dana-node';

//initiate danaClient with authentication

const request: QueryPaymentRequest = {
    // Fill in required fields here, refer to Query Payment API Detail
};

const response: QueryPaymentResponse = await PaymentGatewayApi.queryPayment(request);
```

#### Query Payment API - Go

```go
package main

import (
  "context"
  "fmt"
  "os"
  dana "github.com/dana-id/dana-go"
  "github.com/dana-id/dana-go/config"
  payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)

func main() {
  // ... define authentication 

  request := payment_gateway.QueryPaymentRequest{
    // Fill in required fields here, refer to Query Payment API Detail
  }

_, r, err := apiClient.PaymentGatewayAPI.QueryPayment(context.Background()).QueryPaymentRequest(request).Execute()
if err != nil {
  fmt.Fprintf(os.Stderr, "Error when calling `PaymentGatewayAPI.QueryPayment``: %v\n", err)
  fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
}
// response from `QueryPayment`: QueryPaymentResponse
fmt.Fprintf(os.Stdout, "Response from `PaymentGatewayAPI.QueryPayment`: %v\n", r.Body)
}

```

#### Query Payment API - PHP

```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\PaymentGateway\v1\Api\PaymentGatewayApi;
use Dana\PaymentGateway\v1\Model\QueryPaymentRequest;

// ... define authentication

$queryPaymentRequest = QueryPaymentRequest();

try {
    $result = $apiInstance->queryPayment($queryPaymentRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PaymentGatewayApi->queryPayment: ', $e->getMessage(), PHP_EOL;
}
```

#### Query Payment API - Java

```java
import id.dana.invoker.Dana;
import id.dana.paymentgateway.v1.api.PaymentGatewayApi;
import id.dana.paymentgateway.v1.model.QueryPaymentRequest;
import id.dana.paymentgateway.v1.model.QueryPaymentResponse;

public class Example {
    public static void main(String[] args) {
        PaymentGatewayApi api = Dana.getInstance().getPaymentGatewayApi();

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

2. [Cancel Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/cancel-order.md) - Cancel unpaid orders or paid orders within 24 hours. Cancellation can be initiated by users through the merchant platform or directly through DANA (for DANA Balance payments).

#### Cancel Order API - Python

```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.payment_gateway.v1 import PaymentGatewayApi
from dana.payment_gateway.v1.models.CancelOrderRequest import CancelOrderRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    // .. initialize client with authentication

)

with ApiClient(configuration) as api_client:
    api_instance = PaymentGatewayApi(api_client)
    cancel_order_request = CancelOrderRequest(
    # Fill in required fields here, refer to Cancel Order API Detail.
    )

    try:
        api_response = api_instance.cancel_order(cancel_order_request)
        print("The response of PaymentGatewayApi->cancel_order:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentGatewayApi->cancel_order: %s\n" % e)
```

#### Cancel Order API - Node.js

```javascript
import { Dana } from 'dana-node';

//initiate danaClient with authentication

const request: CancelOrderRequest = {
    // Fill in required fields here, refer to Cancel Order API Detail
};

const response: CancelOrderResponse = await PaymentGatewayApi.cancelOrder(request);
```

#### Cancel Order API - Go

```go
package main

import (
	"context"
	"fmt"
	"os"
	dana "github.com/dana-id/dana-go"
	"github.com/dana-id/dana-go/config"
	payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)

func main() {
  // ... define authentication 

  request := payment_gateway.CancelOrderRequest{
    // Fill in required fields here, refer to Cancel Order API Detail
  }

  _, r, err := apiClient.PaymentGatewayAPI.CancelOrder(context.Background()).CancelOrderRequest(request).Execute()
  if err != nil {
    fmt.Fprintf(os.Stderr, "Error when calling `PaymentGatewayAPI.CancelOrder``: %v\n", err)
    fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
  }
  // response from `CancelOrder`: CancelOrderResponse
  fmt.Fprintf(os.Stdout, "Response from `PaymentGatewayAPI.CancelOrder`: %v\n", r.Body)
}
```

#### Cancel Order API - PHP

```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\PaymentGateway\v1\Api\PaymentGatewayApi;
use Dana\PaymentGateway\v1\Model\CancelOrderRequest;

// ... define authentication

$cancelOrderRequest = CancelOrderRequest();

try {
    $result = $apiInstance->cancelOrder($cancelOrderRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PaymentGatewayApi->cancelOrder: ', $e->getMessage(), PHP_EOL;
}
```

#### Cancel Order API - Java

```java
import id.dana.invoker.Dana;
import id.dana.paymentgateway.v1.api.PaymentGatewayApi;
import id.dana.paymentgateway.v1.model.CancelOrderRequest;
import id.dana.paymentgateway.v1.model.CancelOrderResponse;

public class Example {
    public static void main(String[] args) {
        PaymentGatewayApi api = Dana.getInstance().getPaymentGatewayApi();

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

3. [Refund Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/optional-api/refund-order.md) - Process refunds for completed orders. You can trigger a refund request on behalf of the customer using this API, who will then process the refund through DANA.

#### Refund Order API - Python

```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.payment_gateway.v1 import PaymentGatewayApi
from dana.payment_gateway.v1.models.RefundOrderRequest import RefundOrderRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    // .. initialize client with authentication
)

with ApiClient(configuration) as api_client:
    api_instance = PaymentGatewayApi(api_client)
    refund_order_request = RefundOrderRequest(
    # Fill in required fields here, refer to Cancel Order API Detail.
    )

    try:
        api_response = api_instance.refund_order(refund_order_request)
        print("The response of PaymentGatewayApi->refund_order:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PaymentGatewayApi->refund_order: %s\n" % e)
```

#### Refund Order API - Node.js

```javascript
import { Dana } from 'dana-node';

//initiate danaClient with authentication

const request: RefundOrderRequest = {
    // Fill in required fields here, refer to Refund Order API Detail
};

const response: RefundOrderResponse = await PaymentGatewayApi.refundOrder(request);
```

#### Refund Order API - Go

```go
package main

import (
  "context"
  "fmt"
  "os"
  dana "github.com/dana-id/dana-go"
  "github.com/dana-id/dana-go/config"
  payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"
)

func main() {
  // ... define authentication 

  request := payment_gateway.RefundOrderRequest{
    // Fill in required fields here, refer to Refund Order API Detail
  }

 _, r, err := apiClient.PaymentGatewayAPI.RefundOrder(context.Background()).RefundOrderRequest(request).Execute()
if err != nil {
  fmt.Fprintf(os.Stderr, "Error when calling `PaymentGatewayAPI.RefundOrder``: %v\n", err)
  fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
}
// response from `RefundOrder`: RefundOrderResponse
fmt.Fprintf(os.Stdout, "Response from `PaymentGatewayAPI.RefundOrder`: %v\n", r.Body)
}
```

#### Refund Order API - PHP

```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\PaymentGateway\v1\Api\PaymentGatewayApi;
use Dana\PaymentGateway\v1\Model\RefundOrderRequest;

// ... define authentication

$refundOrderRequest = RefundOrderRequest();

try {
    $result = $apiInstance->refundOrder($refundOrderRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling PaymentGatewayApi->refundOrder: ', $e->getMessage(), PHP_EOL;
}
```

#### Refund Order API - Java

```java
import id.dana.invoker.Dana;
import id.dana.paymentgateway.v1.api.PaymentGatewayApi;
import id.dana.paymentgateway.v1.model.RefundOrderRequest;
import id.dana.paymentgateway.v1.model.RefundOrderResponse;

public class Example {
    public static void main(String[] args) {
        PaymentGatewayApi api = Dana.getInstance().getPaymentGatewayApi();

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

### Step 4: Receive Payment Outcome via Finish Notify API

After a successful payment:

1. The user will be redirected to your specified Redirect URL, which you can configure using the `urlParams` parameter in the [Create Order API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/create-order-hosted.md) request.

2. DANA will send payment notifications to your Notification URL via the [Finish Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/finish-notify.md). Configure your notification endpoint with the ASPI-mandated path format: `/v1.0/debit/notify`.

#### Webhook Parser - Python

**Construction**
```python
WebhookParser(public_key: str = None, public_key_path: str = None)
```
* **Request**
| Parameter | Type | Required | Remarks |
| --- | --- | --- | --- |
| public_key | string | Optional | The DANA gateway's public key as a PEM formatted string. This is used if `public_key_path` is not provided or is empty. Defaults to `None`. |
| public_key_path | string | Optional | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the `public_key` string. Defaults to `None`. |
**Method**
```python
parse_webhook(http_method: str, relative_path_url: str, headers: dict, body: str) -> FinishNotify
```
* **Request**
| Parameter | Type | Remarks |
| --- | --- | --- |
| http_method | string | HTTP method of the webhook request (e.g., `POST`) |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification (e.g., `/v1.0/debit/notify`) |
| headers | map[string]string | Dictionary containing at least `X-SIGNATURE` and `X-TIMESTAMP` |
| body | string | Raw JSON string of the webhook payload |
* **Returns:** `FinishNotifyRequest` model with parsed data.
* **Raises:** `ValueError` if signature verification fails or the payload is invalid.
**Security Notes**:
* Always use the official public key provided by DANA for webhook verification.
* Reject any webhook requests that fail signature verification or have malformed payloads.
* Never trust webhook data unless it passes verification.
```python
import os
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

#### Webhook Parser - Node.js

**Construction**
```typescript
new WebhookParser(publicKey?: string, publicKeyPath?: string)
```
### **Request**
| **Parameter** | **Type** | **Remarks** |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string. This is used if **`publicKeyPath`** is not provided or is empty |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the **`publicKey`** string |
Notes: One of **`publicKey`** or **`publicKeyPath`** must be provided.
**Method**
```typescript
parseWebhook(httpMethod: string, relativePathUrl: string, headers: { [key: string]: string }, body: string): FinishNotifyRequest
```
### **Request**
| **Parameter** | **Type** | **Remarks** |
| --- | --- | --- |
| http_method | string | The HTTP method of the incoming webhook request e.g., **`POST`** |
| relative_path_url | string | The relative URL path of the webhook endpoint that received the notification e.g **`/v1.0/debit/notify`** |
| headers | map[string]string | A map containing the HTTP request headers. This map must include X-SIGNATURE and X-TIMESTAMP headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body |
* **Returns:** A pointer to a **`FinishNotifyRequest`** struct containing the parsed and verified webhook data, or an error if parsing or signature verification fails.
* **Raises:** **`ValueError`** if signature verification fails or the payload is invalid.
### **Security Notes**
* Always use the official public key provided by DANA for webhook verification.
* Reject any webhook requests that fail signature verification or have malformed payloads.
* Never trust webhook data unless it passes verification.
```typescript
import { WebhookParser } from 'dana-node/dist/webhook'; // Adjust import path as needed

async function handleDanaWebhook(req: AnyRequestType, res: AnyResponseType) {
    // Retrieve the DANA public key from environment variables or a secure configuration.
    // Option 1: Public key as a string
    const danaPublicKeyString: string \| undefined = process.env.DANA_WEBHOOK_PUBLIC_KEY_STRING;
    // Option 2: Path to the public key file (recommended for production)
    const danaPublicKeyPath: string \| undefined = process.env.DANA_WEBHOOK_PUBLIC_KEY_PATH;

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
For a detailed example, see [Example Webhook](https://github.com/dana-id/dana-node/blob/main/docs/payment_gateway/v1/Apis/PaymentGatewayApi.md#webhook-verification).

#### Webhook Parser - Go

**Construction**
```go
func NewWebhookParser(publicKey *string, publicKeyPath *string) (*WebhookParser, error)
```
* Request
| **Parameter** | **Type** | **Remarks** |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string. This is used if **`publicKeyPath`** is not provided or is empty. |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the **`publicKey`** string. |
* **Returns:** A pointer to a `WebhookParser` instance and an error if the public key is invalid.
**Method**
```go
func (p *WebhookParser) ParseWebhook(httpMethod string, relativePathURL string, headers map[string]string, body string) (*webhook.FinishNotify, error)
```
* **Request**
| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request (e.g., `http.MethodPost`) |
| relativePathURL | string | The relative URL path of the webhook endpoint that received the notification (e.g., `/v1.0/debit/notify`). |
| headers | map[string]string | A map containing the HTTP request headers. This map must include `X-SIGNATURE` and `X-TIMESTAMP` headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body. |
* **Return:** A pointer to a **`model.FinishNotifyRequest`** struct containing the parsed and verified webhook data, or an error if parsing or signature verification fails.
**Security Notes:**
* Always use the official public key provided by DANA for webhook verification. Store and load it securely.
* The `ParseWebhook` method handles both JSON parsing and cryptographic signature verification. If it returns an error, the payload should not be trusted.
```go
package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
  "os"

  webhook "github.com/dana-id/dana-go/webhook"
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
For a detailed example, see [Example Webhook](https://github.com/dana-id/dana-go/blob/main/docs/PaymentGatewayAPI.md#webhookparser).

#### Webhook Parser - PHP

**Construction**
```php
public function __construct(?string $publicKey = null, ?string $publicKeyPath = null)
```
* Request
| Parameter | Type | Remarks |
| --- | --- | --- |
| publicKey | string | The DANA gateway's public key as a PEM formatted string |
| publicKeyPath | string | The file path to the DANA gateway's public key PEM file. If provided, this will be prioritized over the `publicKey` string |
* **Throws:** `\InvalidArgumentException` if neither publicKey nor publicKeyPath is provided or if the public key cannot be loaded
**Method**
```php
public function parseWebhook(string $httpMethod, string $relativePathURL, array $headers, string $body): \Dana\Webhook\v1\Model\FinishNotifyRequest
```
* **Request**
| Parameter | Type | Remarks |
| --- | --- | --- |
| httpMethod | string | The HTTP method of the incoming webhook request (e.g., `POST`) |
| relativePathURL | string | The relative URL path of the webhook endpoint that received the notification (e.g., `/v1.0/debit/notify`). |
| headers | array | An array containing the HTTP request headers. This map must include `X-SIGNATURE` and `X-TIMESTAMP` headers provided by DANA for signature verification |
| body | string | The raw JSON string payload from the webhook request body. |
* **Return:** An instance of `\Dana\Webhook\v1\Model\FinishNotifyRequest` containing the parsed and verified webhook data.
* **Throws:** `\InvalidArgumentException` if required parameters are missing or `\RuntimeException` if signature verification fails.
**Security Notes:**
* Always use the official public key provided by DANA for webhook verification. Store and load it securely.
* The `ParseWebhook` method handles both JSON parsing and cryptographic signature verification. If it returns an error, the payload should not be trusted. 
```php
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
For a detailed example, see [Example Webhook](https://github.com/dana-id/dana-php/blob/main/docs/PaymentGatewayAPI.md#webhookparser).

Example of a successful payment webhook payload:

```json
Content-type: application/json
X-TIMESTAMP: 2020-12-23T07:44:16+07:00
{
  "responseCode": "2005600",
  "responseMessage": "Successful"
}
```

### [Optional] Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.

#### Enum Example - Node.js

```typescript
import { ActorContextActorTypeEnum } from 'dana-node/payment_gateway/v1';

// Use the enum value
const actorType = ActorContextActorTypeEnum.User;
```
In this example the **ActorContext** is the parent model and **ActorType** is the enum name. In below list, the enums are listed in format of **{ParentModel}{EnumName}** (**Enum Field)**
The following enums are available in the Library Gapura Hosted Checkout:
- `ActorContextActorTypeEnum` (`actorType`)
- `ConsultPayPaymentInfoPayMethodEnum` (`payMethod`)
- `ConsultPayPaymentInfoPayOptionEnum` (`payOption`)
- `EnvInfoSourcePlatformEnum` (`sourcePlatform`)
- `EnvInfoTerminalTypeEnum` (`terminalType`)
- `EnvInfoOrderTerminalTypeEnum` (`orderTerminalType`)
- `OrderApiObjectScenarioEnum` (`scenario`)
- `OrderRedirectObjectScenarioEnum` (`scenario`)
- `PayOptionDetailPayMethodEnum` (`payMethod`)
- `PayOptionDetailPayOptionEnum` (`payOption`)
- `PayOptionInfoPayMethodEnum` (`payMethod`)
- `PayOptionInfoPayOptionEnum` (`payOption`)
- `RefundOptionBillPayMethodEnum` (`payMethod`)
- `RefundOrderRequestAdditionalInfoActorTypeEnum` (`actorType`)
- `StatusDetailAcquirementStatusEnum` (`acquirementStatus`)
- `UrlParamTypeEnum` (`type`)

#### Enum Example - Python

```python
from dana.payment_gateway.v1.enum import *

# Example of using enum
enum_value = PayMethod.BALANCE
```
The following enums are available in the Library Gapura Hosted Checkout:
- `PayMethod`
- `PayOption`
- `AcquirementStatus`
- `ActorType`
- `SourcePlatform`
- `TerminalType`
- `OrderTerminalType`
- `Type`

#### Enum Example - Go

```go
import payment_gateway "github.com/dana-id/dana-go/payment_gateway/v1"

value := string(payment_gateway.PAYMETHOD_BALANCE_)
```
The following enums are available in the Library Gapura Hosted Checkout:
- `AcquirementStatus`
- `ActorType`
- `OrderTerminalType`
- `PayMethod`
- `PayOption`
- `SourcePlatform`
- `TerminalType`
- `Type`

#### Enum Example - PHP

```php
// Importing an enum class
use Dana\PaymentGateway\v1\Enum\AcquirementStatus;

// Using enum constants
$model->setProperty(AcquirementStatus::INIT);

// Using enum values directly as strings
$model->setProperty('INIT');
```
The following enums are available in the Library Gapura Hosted Checkout:
- `AcquirementStatus`
- `ActorType`
- `OrderTerminalType`
- `PayMethod`
- `PayOption`
- `SourcePlatform`
- `TerminalType`
- `Type`

### Step 5: Test using our automated test suite

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](https://dashboard.dana.id/app) to safely conduct UAT testing on a list of mandatory testing scenarios.

For full testing requirements, see [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md).

To complete our mandatory testing requirements, follow these steps:

1. Access the Integration Checklist page in the [Merchant Portal](https://dashboard.dana.id/app).

2. Complete all mandatory testing scenarios listed in the checklist.

3. After all required tests have been passed, sign the UAT Sign-Off Report in the [Merchant Portal](https://dashboard.dana.id/app).

4. Complete the Devsite Testing through the [Merchant Portal](https://dashboard.dana.id/app) to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

To speed up your integration, we have provided an automated test suite. It takes under 15 minutes to run your integration against our test scenarios. Check out the [GitHub repo](https://github.com/dana-id/uat-script) for more instructions.

### Step 6: Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet Bank Indonesia's requirements. After completing sandbox testing, follow these steps to move to production:

1. **Generate production keys**  
   Create your production private and public keys by following [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-production-credentials).

2. **Confirm UAT testing logs**  
   Confirm that you have completed all testing scenarios from the [Merchant Portal](https://dashboard.dana.id/app).

3. **Fill out your Production Submission form**  
   Follow the instructions inside the [Merchant Portal](https://dashboard.dana.id/app) to apply for production credentials. We will process your application in 1-2 days.

4. **Obtain production credentials**  
   Once approved, you will receive your production credentials such as Merchant ID, Client ID known as `X-PARTNER-ID`, and Client Secret.

### Testing in production environment

1. **Configure production environment**  
   Switch your application settings from sandbox to production environment by updating the API endpoints and credentials.

2. **Test using production credentials**  
   Conduct the same testing scenarios as sandbox testing, using your production credentials.

3. **UAT production sign-off**  
   Once testing is complete, DANA will prepare the UAT Production Sign Off document in the [Merchant Portal](https://dashboard.dana.id/app). Both merchant and DANA representatives must sign this document to formally approve the integration.

4. **Receive live payments**  
   After receiving all approvals, your DANA integration will be activated and ready for live payments from your customers.

### Document Changelog

Version 1.2.1 - May 08, 2025

Affected API

* Create Order

* Finish Notify

Changes

* Added additional information section for all APIs

Version 1.2.0 - January 22, 2025

Affected API

* Create Order

Changes

* Updated Service Code
* Updated URL
* Updated Idempotent Key and Rules
* Updated Condition webRedirectUrl on Response section
* Updated Request and Response Sample
* Updated Response Code

Version 1.1.3 - November 22, 2024

Affected API

* Create Order

Changes

* Updated value of `REDIRECTION` to `REDIRECT` on ScenarioEnum
* Updated remarks for additionalInfo.order.scenario on Create Order API
* Updated Request Sample on Create Order API

Version 1.1.2 - October 07, 2024

Affected API

* Create Order
* Finish Notify

Changes

* Updated all words of "Plugin" to "Drop-in"

Version 1.1.1 - September 09, 2024

Affected API

* Create Order
* Finish Notify

Changes

* Updated Environment URL for Sandbox on Specification section for all APIs
* Updated Request Sample on URL Section for all APIs

Version 1.1.0 - August 15, 2024

Affected API

* Create Order
* Finish Notify

Changes

* Updated API name from 'Payment Redirect' to 'Create Order'.
* Added Environment URL on Specification section for all APIs.
* Added new programming language (Go, Java, JavaScript, Python, Ruby) on Request Sample for all APIs.

Version 1.0.0 - March 27, 2024

Affected API

* Create Order
* Finish Notify

Changes

* Initial Document
