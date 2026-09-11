# Disbursement to Balance

**Disbursement to Balance** enables merchants to transfer balance to users' DANA balance. This API lets you validate account details, topup, and check topup statuses. It offers a secure, automated disbursement process that reduces manual work and improves efficiency.

Disbursement is also available for transfer to Bank Account. Check our [Disbursement Overview](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md) for more details

## Before you start

You will need to register your business in our [Merchant Portal](http://dashboard.dana.id) to obtain your testing credentials. After you have created your test account, make sure you have done the following:

- Finish your company registration and select Disbursement to Balance as your payment solution.
- Merchant Disbursement Account (MDA) will be automatically created for you to store your balance. For sandbox testing, contact the DANA team to top up your account. In production, simply top up via the Virtual Account (VA) displayed in [Merchant Portal](http://dashboard.dana.id).
- Obtain your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) from the merchant portal.

## User Experience

Below is a sample of the user experience for users paying using Disbursement to Balance. The checkout page is available on mobile devices.
### Mobile
![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/disbursement/UX-top-up-page-1.png)
**Top Up Amount**
Merchant shows merchant page to user to input amount for top up transactions.
![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/disbursement/UX-notification-2.png)
**Notification from DANA**
User receive top up notification from DANA.
![User experience image](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/disbursement/UX-top-up-result-3.png)
**Top up result**
Merchant receive top up result.

## Process Flow

The general flow of payment using the Disbursement to Balance is as follows:

Visit the Disbursement [API Overview](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md) for edge cases and other scenarios.

![Disbursement to Balance](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/disbursement/sequence-top-up-disbursement.png)

1. Merchant calls DANA's [Check Disbursement Account API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify their current account balance before processing any disbursements.
2. DANA processes the request and returns the merchant's current balance information, enabling them to confirm sufficient funds are available for disbursements.
3. User initiates a top up request through the merchant by entering their DANA registered phone number, indicating their intention to add funds to their DANA account.
4. Merchant calls [Account Inquiry API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving funds.
5. DANA processes the account inquiry request by validating information about the user and the merchant to determine their eligibility for top-up by checking limits, payer and risk scope to returns the user's account information to the merchant.
6. Merchant displays the user to specify the desired top up amount they wish to add to their DANA account.
7. User provides the top up amount to the merchant, confirming the transaction details.
8. Merchant deducts the specified amount from the user's payment method or account balance within their platform.
9. Merchant calls [Customer Top Up API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md), sending the user's account details and the top up amount to initiate the disbursement.
10. DANA processes the disbursement by deducting the specified amount from merchant's balance and crediting the amount to the user's DANA account.
11. DANA returns a successful transaction result to merchant, confirming the top up has been completed.
12. Merchant notifies user that their DANA account top up was successful.
13. DANA sends a push notification directly to the user's mobile device, confirming the successful top up and updated account balance.

### Node.js

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

**Requirements**

- Node.js version 18 or later
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

**Installation**
Install using npm or visit our [Github](https://github.com/dana-id/dana-node)
```bash
npm install dana-node@latest --save
```

**Set up the env**
```text
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
CLIENT_SECRET                           # Assigned client secret during registration
```
**Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)**

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library
```javascript
import { Dana } from 'dana-node';

const danaClient = new Dana({
    partnerId: "YOUR_PARTNER_ID", // process.env.X_PARTNER_ID
    privateKey: "YOUR_PRIVATE_KEY", // process.env.X_PRIVATE_KEY
    origin: "YOUR_ORIGIN", // process.env.ORIGIN
    env: "sandbox", // process.env.DANA_ENV or process.env.ENV or "sandbox" or "production"
    clientSecret: "YOUR_CLIENT_SECRET", // process.env.X_CLIENT_SECRET
});
const { disbursementApi } = danaClient;
```

## Step 3 : Check Your Merchant Balance

Before processing transfer funds, call DANA's [**Check Disbursement Account API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify that your merchant deposit account has sufficient funds. DANA will return your current available balance so you can confirm you have enough money for the transfer amount. If your balance is insufficient, top up your account balance via the Virtual Account (VA) displayed in Merchant Portal.
```javascript
import { Dana } from 'dana-node';
import { QueryMerchantResourceRequest, QueryMerchantResourceResponse } from 'dana-node/merchant_management/v1';

const danaClient = new Dana({
    partnerId: "YOUR_PARTNER_ID", // process.env.X_PARTNER_ID
    privateKey: "YOUR_PRIVATE_KEY", // process.env.X_PRIVATE_KEY
    origin: "YOUR_ORIGIN", // process.env.ORIGIN
    env: "sandbox", // process.env.DANA_ENV or process.env.ENV or "sandbox" or "production"
});
const { merchantManagementApi } = danaClient;

const request: QueryMerchantResourceRequest = {
    // Define the request parameters for the API call here
};

const response: QueryMerchantResourceResponse = await merchantManagementApi.queryMerchantResource(request);
```

## Step 4 : Validate User's Account

When you want to top up transaction to user's DANA account, you should call DANA's [**Account Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving balance. You'll need to provide the amount, additionalInfo.fundType, customerNumber or customerName. DANA will process this inquiry and send the result to the merchant by providing the detail account information.
```javascript
import { Dana } from 'dana-node';
import { DanaAccountInquiryRequest, DanaAccountInquiryResponse } from 'dana-node/disbursement/v1';

// .. initialize client with authentication

const request: DanaAccountInquiryRequest = {
    // Fill in required fields here, refer to Account Inquiry API Detail
};

const response: DanaAccountInquiryResponse = await disbursementApi.danaAccountInquiry(request);
```

If `customerNumber` exists, then `Authorization-Customer` and `additionalInfo.accessToken` are not required

## Step 5 : Execute the Customer Top Up

First, you provide top up amount page to user. After user puts the top up amount, call DANA's [**Customer Top Up API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) to process the top up from merchant to the user's DANA balance, this process starting by merchant deducts user's account balance and requests of top up transaction to DANA. DANA will validate your request. After that, DANA deducts merchant's deposit balance and at the same time, DANA credits user's DANA Balance. You'll receive an response result of top up process as **success.**
```javascript
import { Dana } from 'dana-node';
import { TransferToDanaRequest, TransferToDanaResponse } from 'dana-node/disbursement/v1';

// .. initialize client with authentication

const request: TransferToDanaRequest = {
    // Fill in required fields here, refer to Customer Top Up API Detail
};

const response: TransferToDanaResponse = await disbursementApi.transferToDana(request);
```

## Step 6 : Check status manually

If you gets a response of **5003801**, timeout, or any unexpected responses after do retry for 5 times from Customer Top Up API, the transaction should be marked as pending. Merchant should query the transaction using [**Customer Top Up Inquiry Status API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to manually check the top up status and get the latest transaction status and information
```javascript
import { Dana } from 'dana-node';
import { TransferToDanaInquiryStatusRequest, TransferToDanaInquiryStatusResponse } from 'dana-node/disbursement/v1';

// .. initialize client with authentication

const request: TransferToDanaInquiryStatusRequest = {
    // Fill in required fields here, refer to Customer Top Up Inquiry Status API Detail
};

const response: TransferToDanaInquiryStatusResponse = await disbursementApi.transferToDanaInquiryStatus(request);
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.

In Node.js, enums are located within each model class rather than being centralized in a separate enum file. Each enum is named after its parent model.
```javascript
import { DanaAccountInquiryRequestAdditionalInfoChargeTargetEnum } from 'dana-node/disbursement/v1';

// Use the enum value
const chargeTarget = DanaAccountInquiryRequestAdditionalInfoChargeTargetEnum.Division;
```
In this example the DanaAccountInquiryRequestAdditionalInfo is the parent model and ChargeTarget is the enum name. In below list, the enums are listed in format of `(ParentModel)(EnumName) `(Enum Field).

The following enums are available in the Library Disbursement to Balance:
1. DanaAccountInquiryRequestAdditionalInfoChargeTargetEnum (chargeTarget)
2. TransferToDanaInquiryStatusResponseLatestTransactionStatusEnum (latestTransactionStatus)
3. TransferToDanaRequestAdditionalInfoChargeTargetEnum (chargeTarget)

## Step 7 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 8 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:
- **Generate production keys** Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

- **Complete your UAT testing checklist** Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

- **Fill out your Production Submission form** Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

- **Obtain production credentials** Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

- **Configure the production environment** Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

- **Test using production credentials** Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

- **Receive live payments** After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

### Python

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

**Requirements**

- Python 3.9.1+
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

**Installation**
Install using pip or visit our [Github](https://github.com/dana-id/dana-python)
```bash
pip install dana-python
```

**Set up the env**
```text
PRIVATE_KEY or PRIVATE_KEY_PATH         # Your private key
ORIGIN                                  # Your application's origin URL
X_PARTNER_ID                            # clientId provided during onboarding
ENV or DANA_ENV                         # DANA's environment either 'sandbox' or 'production'
DANA_PUBLIC_KEY or DANA_PUBLIC_KEY_PATH # DANA public key string for parsing webhook
CLIENT_SECRET                           # Assigned client secret during registration
```
**Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)**

**Import Package**
```python
import dana.disbursement.v1
```

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library
```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env

configuration = SnapConfiguration(
    api_key=AuthSettings(
        PRIVATE_KEY=os.environ.get("PRIVATE_KEY"), # or you can set PRIVATE_KEY_PATH 
        ORIGIN=os.environ.get("ORIGIN"),
        X_PARTNER_ID=os.environ.get("X_PARTNER_ID"),
        DANA_ENV=os.environ.get("DANA_ENV"), # or you can set ENV
        CLIENT_SECRET=os.environ.get("CLIENT_SECRET"),
    )
)
```

## Step 3 : Check Your Merchant Balance

Before processing transfer funds, call DANA's [**Check Disbursement Account API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify that your merchant deposit account has sufficient funds. DANA will return your current available balance so you can confirm you have enough money for the transfer amount. If your balance is insufficient, top up your account balance via the Virtual Account (VA) displayed in Merchant Portal.
```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.merchant_management.v1 import MerchantManagementApi
from dana.merchant_management.v1.models.QueryMerchantResourceRequest import QueryMerchantResourceRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    api_key=AuthSettings(
        PRIVATE_KEY=os.environ.get("PRIVATE_KEY"), # or you can set PRIVATE_KEY_PATH 
        ORIGIN=os.environ.get("ORIGIN"),
        X_PARTNER_ID=os.environ.get("X_PARTNER_ID"),
        DANA_ENV=os.environ.get("DANA_ENV"), # or you can set ENV
        CLIENT_SECRET=os.environ.get("CLIENT_SECRET"),
    )
)

# Configure API key authorization: CLIENT_SECRET
# For OPEN_API type, we use CLIENT_SECRET authentication
configuration = OpenApiConfiguration(
    api_key=OpenApiAuthSettings(
        CLIENT_SECRET=os.environ.get("CLIENT_SECRET"),
        CLIENT_ID=os.environ.get("CLIENT_ID"),
        DANA_ENV=os.environ.get("DANA_ENV"),
        ENV=os.environ.get("ENV")
    )
)

with ApiClient(configuration) as api_client:
    api_instance = MerchantManagementApi(api_client)
    query_merchant_resource_request = QueryMerchantResourceRequest()

    try:
        api_response = api_instance.query_merchant_resource(query_merchant_resource_request)
        print("The response of MerchantManagementApi->query_merchant_resource:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MerchantManagementApi->query_merchant_resource: %s\n" % e)
```

## Step 4 : Validate User's Account

When you want to top up transaction to user's DANA account, you should call DANA's [**Account Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving balance. You'll need to provide the amount, additionalInfo.fundType, customerNumber or customerName. DANA will process this inquiry and send the result to the merchant by providing the detail account information.
```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.disbursement.v1 import DisbursementApi
from dana.disbursement.v1.models.DanaAccountInquiryRequest import DanaAccountInquiryRequest
from dana.api_client import ApiClient
from dana.rest import ApiException
from pprint import pprint

# configuration and ApiClient object can be used for multiple operations
# They should be singleton through the application lifecycle
configuration = SnapConfiguration(
    // .. initialize client with authentication
    )

with ApiClient(configuration) as api_client:
    api_instance = DisbursementApi(api_client)
    dana_account_inquiry_request = DanaAccountInquiryRequest()

    try:
        api_response = api_instance.dana_account_inquiry(dana_account_inquiry_request)
        print("The response of DisbursementApi->dana_account_inquiry:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DisbursementApi->dana_account_inquiry: %s\n" % e)
```

If `customerNumber` exists, then `Authorization-Customer` and `additionalInfo.accessToken` are not required

## Step 5 : Execute the Customer Top Up

First, you provide top up amount page to user. After user puts the top up amount, call DANA's [**Customer Top Up API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) to process the top up from merchant to the user's DANA balance, this process starting by merchant deducts user's account balance and requests of top up transaction to DANA. DANA will validate your request. After that, DANA deducts merchant's deposit balance and at the same time, DANA credits user's DANA Balance. You'll receive an response result of top up process as **success.**
```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.disbursement.v1 import DisbursementApi
from dana.disbursement.v1.models.TransferToDanaRequest import TransferToDanaRequest
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
    api_instance = DisbursementApi(api_client)
    transfer_to_dana_request = TransferToDanaRequest()

    try:
        api_response = api_instance.transfer_to_dana(transfer_to_dana_request)
        print("The response of DisbursementApi->transfer_to_dana:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DisbursementApi->transfer_to_dana: %s\n" % e)
```

## Step 6 : Check status manually

If you gets a response of **5003801**, timeout, or any unexpected responses after do retry for 5 times from Customer Top Up API, the transaction should be marked as pending. Merchant should query the transaction using [**Customer Top Up Inquiry Status API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to manually check the top up status and get the latest transaction status and information
```python
import os
from dana.utils.snap_configuration import SnapConfiguration, AuthSettings, Env
from dana.disbursement.v1 import DisbursementApi
from dana.disbursement.v1.models.TransferToDanaInquiryStatusRequest import TransferToDanaInquiryStatusRequest
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
    api_instance = DisbursementApi(api_client)
    transfer_to_dana_inquiry_status_request = TransferToDanaInquiryStatusRequest()

    try:
        api_response = api_instance.transfer_to_dana_inquiry_status(transfer_to_dana_inquiry_status_request)
        print("The response of DisbursementApi->transfer_to_dana_inquiry_status:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling DisbursementApi->transfer_to_dana_inquiry_status: %s\n" % e)
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
```python
from dana.disbursement.v1.enum import *

# Example of using enum
enum_value = ChargeTarget.DIVISION
```

The following enums are available in the Library Disbursement:
1. ChargeTarget
2. LatestTransactionStatus

## Step 7 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 8 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:
- **Generate production keys** Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

- **Complete your UAT testing checklist** Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

- **Fill out your Production Submission form** Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

- **Obtain production credentials** Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

- **Configure the production environment** Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

- **Test using production credentials** Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

- **Receive live payments** After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

### Go

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

**Requirements**

- go.mod
- go.sum file
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

**Installation**
Install or visit our [Github](https://github.com/dana-id/dana-go)
```bash
go get github.com/dana-id/dana-go/v2
```

**Set up the env**
```text
PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key 
ORIGIN                                 # Your application's origin URL
X_PARTNER_ID                           # clientId provided during onboarding 
ENV                                    # DANA's environment either 'sandbox' or 'production'
```
**Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)**

**Import Package**
```go
import (
  disbursement "github.com/dana-id/dana-go/disbursement/v1"
)
```

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library
```go
package main

import (
    "context"
    "fmt"
    "os"
    dana "github.com/dana-id/dana-go"
    "github.com/dana-id/dana-go/config"
    disbursement "github.com/dana-id/dana-go/disbursement/v1"
)

func main() {
    
    // Configuring api client
    // Api client should be singleton, can reuse the apiClient for multiple requests in various operations
    configuration := config.NewConfiguration()
    configuration.APIKey = &config.APIKey{
        DANA_ENV:     config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production
        // ENV:          config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production. Can use DANA_ENV instead
        X_PARTNER_ID: os.Getenv("X_PARTNER_ID"),
        PRIVATE_KEY:  os.Getenv("PRIVATE_KEY"), // Can provide the private key directly as a string or via a file path (PRIVATE_KEY_PATH). If both added, we will prioritize the path
        ORIGIN:       os.Getenv("ORIGIN"),
        // PRIVATE_KEY_PATH: os.Getenv("PRIVATE_KEY_PATH"),
    }
    apiClient := dana.NewAPIClient(configuration)
```

## Step 3 : Check Your Merchant Balance

Before processing transfer funds, call DANA's [**Check Disbursement Account API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify that your merchant deposit account has sufficient funds. DANA will return your current available balance so you can confirm you have enough money for the transfer amount. If your balance is insufficient, top up your account balance via the Virtual Account (VA) displayed in Merchant Portal.
```go
package main

import (
  "context"
  "fmt"
  "os"
  dana "github.com/dana-id/dana-go"
  "github.com/dana-id/dana-go/config"
  merchant_management "github.com/dana-id/dana-go/merchant_management/v1"
)

func main() {
  // Define request struct directly (example)
  request := merchant_management.QueryMerchantResourceRequest{
    // Fill in required fields here, refer to Check Disbursement Account API Detail
  }

  configuration := config.NewConfiguration()
  // Set API keys
  configuration.APIKey = &config.APIKey{
    // ENV:          config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production. Can use DANA_ENV instead
    DANA_ENV:     config.ENV_SANDBOX, // use config.ENV_PRODUCTION for production
    X_PARTNER_ID: os.Getenv("X_PARTNER_ID"),
    PRIVATE_KEY:  os.Getenv("PRIVATE_KEY"),
    ORIGIN:       os.Getenv("ORIGIN"),
    // PRIVATE_KEY_PATH: os.Getenv("PRIVATE_KEY_PATH"),
  }
  apiClient := dana.NewAPIClient(configuration)
  _, r, err := apiClient.MerchantManagementAPI.QueryMerchantResource(context.Background()).QueryMerchantResourceRequest(request).Execute()
  if err != nil {
    fmt.Fprintf(os.Stderr, "Error when calling `MerchantManagementAPI.QueryMerchantResource``: %v\n", err)
    fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
  }
  // response from `QueryMerchantResource`: QueryMerchantResourceResponse
  fmt.Fprintf(os.Stdout, "Response from `MerchantManagementAPI.QueryMerchantResource`: %v\n", r.Body)
}
```

## Step 4 : Validate User's Account

When you want to top up transaction to user's DANA account, you should call DANA's [**Account Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving balance. You'll need to provide the amount, additionalInfo.fundType, customerNumber or customerName. DANA will process this inquiry and send the result to the merchant by providing the detail account information.
```go
package main

import (
    "context"
    "fmt"
    "os"
    dana "github.com/dana-id/dana-go"
    "github.com/dana-id/dana-go/config"
    disbursement "github.com/dana-id/dana-go/disbursement/v1"
)

func main() {

    // ... define authentication
    request := disbursement.DanaAccountInquiryRequest{
        // Fill in required fields here, refer to Account Inquiry API Detail
    }

    _, r, err := apiClient.DisbursementAPI.DanaAccountInquiry(context.Background()).DanaAccountInquiryRequest(request).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DisbursementAPI.DanaAccountInquiry`: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `DanaAccountInquiry`: DanaAccountInquiryResponse
    fmt.Fprintf(os.Stdout, "Response from `DisbursementAPI.DanaAccountInquiry`: %v\n", r.Body)
}
```

If `customerNumber` exists, then `Authorization-Customer` and `additionalInfo.accessToken` are not required

## Step 5 : Execute the Customer Top Up

First, you provide top up amount page to user. After user puts the top up amount, call DANA's [**Customer Top Up API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) to process the top up from merchant to the user's DANA balance, this process starting by merchant deducts user's account balance and requests of top up transaction to DANA. DANA will validate your request. After that, DANA deducts merchant's deposit balance and at the same time, DANA credits user's DANA Balance. You'll receive an response result of top up process as **success.**
```go
package main

import (
    "context"
    "fmt"
    "os"
    dana "github.com/dana-id/dana-go"
    "github.com/dana-id/dana-go/config"
    disbursement "github.com/dana-id/dana-go/disbursement/v1"
)

func main() {
    
    // ... define authentication 
    request := disbursement.TransferToDanaRequest{
        // Fill in required fields here, refer to Customer Top Up API Detail
    }

    _, r, err := apiClient.DisbursementAPI.TransferToDana(context.Background()).TransferToDanaRequest(request).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DisbursementAPI.TransferToDana`: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `TransferToDana`: TransferToDanaResponse
    fmt.Fprintf(os.Stdout, "Response from `DisbursementAPI.TransferToDana`: %v\n", r.Body)
}
```

## Step 6 : Check status manually

If you gets a response of **5003801**, timeout, or any unexpected responses after do retry for 5 times from Customer Top Up API, the transaction should be marked as pending. Merchant should query the transaction using [**Customer Top Up Inquiry Status API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to manually check the top up status and get the latest transaction status and information
```go
package main

import (
    "context"
    "fmt"
    "os"
    dana "github.com/dana-id/dana-go"
    "github.com/dana-id/dana-go/config"
    disbursement "github.com/dana-id/dana-go/disbursement/v1"
)

func main() {
    
    // ... define authentication 
    request := disbursement.TransferToDanaInquiryStatusRequest{
        // Fill in required fields here, refer to Customer Top Up Inquiry Status API Detail
    }

    _, r, err := apiClient.DisbursementAPI.TransferToDanaInquiryStatus(context.Background()).TransferToDanaInquiryStatusRequest(request).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `DisbursementAPI.TransferToDanaInquiryStatus`: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `TransferToDanaInquiryStatus`: TransferToDanaInquiryStatusResponse
    fmt.Fprintf(os.Stdout, "Response from `DisbursementAPI.TransferToDanaInquiryStatus`: %v\n", r.Body)
}
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
```go
import disbursement "github.com/dana-id/dana-go/disbursement/v1"

value := string(disbursement.CHARGETARGET_DIVISION_)
```

The following enums are available in the Library Disbursement:
1. ChargeTarget
2. LatestTransactionStatus

## Step 7 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 8 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:
- **Generate production keys** Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

- **Complete your UAT testing checklist** Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

- **Fill out your Production Submission form** Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

- **Obtain production credentials** Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

- **Configure the production environment** Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

- **Test using production credentials** Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

- **Receive live payments** After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

### PHP

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

**Requirements**

- PHP 7.4+, compatible with PHP 8.0.
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

**Installation**
Install using composer or visit our [Github](https://github.com/dana-id/dana-php)

1. Using Composer
- Add the following code to `composer.json`
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
- Run `composer install`

2. Manual Installation
```php
<?php
require_once('/path/to/DanaPhp/vendor/autoload.php');
```

**Set up the env**
```text
PRIVATE_KEY or PRIVATE_KEY_PATH        # Your private key 
ORIGIN                                 # Your application's origin URL
X_PARTNER_ID                           # clientId provided during onboarding 
ENV                                    # DANA's environment either 'sandbox' or 'production'
```
**Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)**

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library
```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\Disbursement\v1\Api\DisbursementApi;
use Dana\Disbursement\v1\Model\TransferToDanaRequest;

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

$apiInstance = new DisbursementApi(
    null, // this also can be set to custom http client which implements `GuzzleHttp\ClientInterface`
    $configuration
);
```

## Step 3 : Check Your Merchant Balance

Before processing transfer funds, call DANA's [**Check Disbursement Account API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify that your merchant deposit account has sufficient funds. DANA will return your current available balance so you can confirm you have enough money for the transfer amount. If your balance is insufficient, top up your account balance via the Virtual Account (VA) displayed in Merchant Portal.
```php
    <?php
use Dana\Configuration;
use Dana\Env;
use Dana\MerchantManagement\v1\Api\MerchantManagementApi;
use Dana\MerchantManagement\v1\Model\QueryMerchantResourceRequest;

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
$configuration->setApiKey('CLIENT_SECRET', getenv('CLIENT_SECRET'));

$apiInstance = new MerchantManagementApi(
    null, // this also can be set to custom http client which implements `GuzzleHttp\ClientInterface`
    $configuration
);
$queryMerchantResourceRequest = QueryMerchantResourceRequest();

try {
    $result = $apiInstance->queryMerchantResource($queryMerchantResourceRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling MerchantManagementApi->queryMerchantResource: ', $e->getMessage(), PHP_EOL;
}
```

## Step 4 : Validate User's Account

When you want to top up transaction to user's DANA account, you should call DANA's [**Account Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving balance. You'll need to provide the amount, additionalInfo.fundType, customerNumber or additionalInfo.accessToken. DANA will process this inquiry and send the result to the merchant by providing the detail account information.
```php
    <?php
use Dana\Configuration;
use Dana\Env;
use Dana\Disbursement\v1\Api\DisbursementApi;
use Dana\Disbursement\v1\Model\DanaAccountInquiryRequest;

// ... define authentication

$danaAccountInquiryRequest = DanaAccountInquiryRequest();

try {
    $result = $apiInstance->danaAccountInquiry($danaAccountInquiryRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling DisbursementApi->danaAccountInquiry: ', $e->getMessage(), PHP_EOL;
}
```

If `customerNumber` exists, then `Authorization-Customer` and `additionalInfo.accessToken` are not required

## Step 5 : Execute the Customer Top Up

First, you provide top up amount page to user. After user puts the top up amount, call DANA's [**Customer Top Up API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) to process the top up from merchant to the user's DANA balance, this process starting by merchant deducts user's account balance and requests of top up transaction to DANA. DANA will validate your request. After that, DANA deducts merchant's deposit balance and at the same time, DANA credits user's DANA Balance. You'll receive an response result of top up process as **success.**
```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\Disbursement\v1\Api\DisbursementApi;
use Dana\Disbursement\v1\Model\TransferToDanaRequest;

// ... define authentication

$transferToDanaRequest = TransferToDanaRequest();

try {
    $result = $apiInstance->transferToDana($transferToDanaRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling DisbursementApi->transferToDana: ', $e->getMessage(), PHP_EOL;
}
```

## Step 6 : Check status manually

If you gets a response of **5003801**, timeout, or any unexpected responses after do retry for 5 times from Customer Top Up API, the transaction should be marked as pending. Merchant should query the transaction using [**Customer Top Up Inquiry Status API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to manually check the top up status and get the latest transaction status and information
```php
<?php
use Dana\Configuration;
use Dana\Env;
use Dana\Disbursement\v1\Api\DisbursementApi;
use Dana\Disbursement\v1\Model\TransferToDanaInquiryStatusRequest;

// ... define authentication

$transferToDanaInquiryStatusRequest = TransferToDanaInquiryStatusRequest();

try {
    $result = $apiInstance->transferToDanaInquiryStatus($transferToDanaInquiryStatusRequest);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling DisbursementApi->transferToDanaInquiryStatus: ', $e->getMessage(), PHP_EOL;
}
```

## Additional Enum Configuration

The library provides several enums (enumerations) to represent a fixed set of constant values, ensuring consistency and reducing errors during integration.
```php
      // Importing an enum class
use Dana\Disbursement\v1\Enum\ChargeTarget;

// Using enum constants
$model->setProperty(ChargeTarget::DIVISION);

// Using enum values directly as strings
$model->setProperty('DIVISION');
```

The following enums are available in the Library Disbursement:
1. ChargeTarget
2. LatestTransactionStatus

## Step 7 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 8 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:
- **Generate production keys** Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

- **Complete your UAT testing checklist** Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

- **Fill out your Production Submission form** Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

- **Obtain production credentials** Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

- **Configure the production environment** Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

- **Test using production credentials** Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

- **Receive live payments** After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)

### Java

## Step 1 : Library Installation

Visit our [Libraries & Plugins](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/libraries.md) guide for detailed information on our SDK.

DANA provides server-side API libraries for several programming languages, available through common package managers, for easier installation and version management.
Follow the guide below to install our library:

**Requirements**

- JDK 1.8 or later.
- Your [testing credentials](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md#obtaining-your-credentials) from the merchant portal.

### Installation
Install using maven or visit our [Github](https://github.com/dana-id/dana-java)

### Install the API Library using maven
1. Add the following dependency to your ` pom.xml `
```xml
<dependency>
    <groupId>id.dana</groupId>
    <artifactId>dana-java</artifactId>
    <version>2.1.9</version>
</dependency>
```
2. run ` mvn clean install `

**Set up the env**
```text
PRIVATE_KEY or PRIVATE_KEY_PATH        # Private key string (PRIVATE_KEY) or path to private key file (PRIVATE_KEY_PATH)
ORIGIN                                 # Your application's origin URL
X_PARTNER_ID                           # Client ID provided at onboarding
ENV or DANA_ENV                        # DANA's environment either 'sandbox' or 'production'
CLIENT_SECRET                          # Client Secret provided at onboarding (required for Disbursement API)
```
**Obtaining merchant credentials: [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md)**

## Step 2 : Initialize the library

Visit our [Authentication](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) guide to learn about the authentication process when not using our Library.

Follow the guide below to initialize the library
```java
import id.dana.invoker.Dana;
import id.dana.invoker.model.DanaConfig;
import id.dana.util.ConfigUtil;

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

## Step 3 : Check Your Merchant Balance

Before processing transfer funds, call DANA's [**Check Disbursement Account API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify that your merchant deposit account has sufficient funds. DANA will return your current available balance so you can confirm you have enough money for the transfer amount. If your balance is insufficient, top up your account balance via the Virtual Account (VA) displayed in Merchant Portal.
```java
import id.dana.invoker.Dana;
import id.dana.merchantmanagement.v1.api.MerchantManagementApi;
import id.dana.merchantmanagement.v1.model.QueryMerchantResourceRequest;
import id.dana.merchantmanagement.v1.model.QueryMerchantResourceResponse;

public class Example {
    public static void main(String[] args) {
        MerchantManagementApi api = Dana.getInstance().getMerchantManagementApi();

        QueryMerchantResourceRequest queryMerchantResourceRequest = new QueryMerchantResourceRequest();

        try {
            QueryMerchantResourceResponse response = api.queryMerchantResource(queryMerchantResourceRequest);
            System.out.println(response);
        } catch (DanaException e) {
            e.printStackTrace();
        }
    }
}
```

## Step 4 : Validate User's Account

When you want to top up transaction to user's DANA account, you should call DANA's [**Account Inquiry API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) to verify the user's DANA account details and ensure the account is valid and active for receiving balance. You'll need to provide the amount, additionalInfo.fundType, customerNumber or additionalInfo.accessToken. DANA will process this inquiry and send the result to the merchant by providing the detail account information.
```java
import id.dana.invoker.Dana;
import id.dana.disbursement.v1.api.DisbursementApi;
import id.dana.disbursement.v1.model.DanaAccountInquiryRequest;
import id.dana.disbursement.v1.model.DanaAccountInquiryResponse;

public class Example {
    public static void main(String[] args) {
        DisbursementApi api = Dana.getInstance().getDisbursementApi();

        DanaAccountInquiryRequest danaAccountInquiryRequest = new DanaAccountInquiryRequest();

        try {
            DanaAccountInquiryResponse response = api.danaAccountInquiry(danaAccountInquiryRequest);
            System.out.println(response);
        } catch (DanaException e) {
            e.printStackTrace();
        }
    }
}
```

If `customerNumber` exists, then `Authorization-Customer` and `additionalInfo.accessToken` are not required

## Step 5 : Execute the Customer Top Up

First, you provide top up amount page to user. After user puts the top up amount, call DANA's [**Customer Top Up API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) to process the top up from merchant to the user's DANA balance, this process starting by merchant deducts user's account balance and requests of top up transaction to DANA. DANA will validate your request. After that, DANA deducts merchant's deposit balance and at the same time, DANA credits user's DANA Balance. You'll receive an response result of top up process as **success.**
```java
import id.dana.invoker.Dana;
import id.dana.disbursement.v1.api.DisbursementApi;
import id.dana.disbursement.v1.model.TransferToDanaRequest;
import id.dana.disbursement.v1.model.TransferToDanaResponse;

public class Example {
    public static void main(String[] args) {
        DisbursementApi api = Dana.getInstance().getDisbursementApi();

        TransferToDanaRequest transferToDanaRequest = new TransferToDanaRequest();

        try {
            TransferToDanaResponse response = api.transferToDana(transferToDanaRequest);
            System.out.println(response);
        } catch (DanaException e) {
            e.printStackTrace();
        }
    }
}
```

## Step 6 : Check status manually

If you gets a response of **5003801**, timeout, or any unexpected responses after do retry for 5 times from Customer Top Up API, the transaction should be marked as pending. Merchant should query the transaction using [**Customer Top Up Inquiry Status API**](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to manually check the top up status and get the latest transaction status and information
```java
import id.dana.invoker.Dana;
import id.dana.disbursement.v1.api.DisbursementApi;
import id.dana.disbursement.v1.model.TransferToDanaInquiryStatusRequest;
import id.dana.disbursement.v1.model.TransferToDanaInquiryStatusResponse;

public class Example {
    public static void main(String[] args) {
        DisbursementApi api = Dana.getInstance().getDisbursementApi();

        TransferToDanaInquiryStatusRequest transferToDanaInquiryStatusRequest = new TransferToDanaInquiryStatusRequest();

        try {
            TransferToDanaInquiryStatusResponse response = api.transferToDanaInquiryStatus(transferToDanaInquiryStatusRequest);
            System.out.println(response);
        } catch (DanaException e) {
            e.printStackTrace();
        }
    }
}
```
```php
      // Importing an enum class
use Dana\Disbursement\v1\Enum\ChargeTarget;

// Using enum constants
$model->setProperty(ChargeTarget::DIVISION);

// Using enum values directly as strings
$model->setProperty('DIVISION');
```

## Step 7 : Test using our automated test suite

Visit our [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md) guide for detailed information on testing requirements.

We are required by local regulators to ensure your integration works correctly across all critical use cases. Use our sandbox environment and [Merchant Portal](http://dashboard.dana.id) to safely conduct UAT testing on a list of mandatory testing scenarios.

To complete our mandatory testing requirements, follow these steps:

1. Access your Integration Checklist page inside the [Merchant Portal](http://dashboard.dana.id).
2. Complete all mandatory testing scenarios listed in the checklist.
3. After all required tests have been passed, sign the UAT Sign-Off Report in the Merchant Portal.
4. Complete the Devsite Testing through the Merchant Portal to ensure compliance with Bank Indonesia SNAP standards.

### UAT Testing Script

> *Use our specialized UAT testing suite to save days of debugging.*

To speed up your integration, we have provided an **automated test suite**. It takes **under 15 minutes** to run your integration against our test scenarios. Check out the [Github](https://github.com/dana-id/uat-script) repo for more instructions

## Step 8 : Submit testing documents & apply for production

As part of regulatory compliance, merchants are required to submit UAT testing documents to meet **Bank Indonesia**'s requirements. After completing sandbox testing, follow these steps to move to production:
- **Generate production keys** Create your production private and public keys, follow this instruction: [Authentication - Production Credential](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md).

- **Complete your UAT testing checklist** Confirm that you have completed all testing scenarios from our [Merchant Portal](https://www.dana.id/enterprise/en).

- **Fill out your Production Submission form** Follow the instructions inside our [Merchant Portal](https://www.dana.id/enterprise/en) to apply for production credentials. We will process your application in 1-2 days.

- **Obtain production credentials** Once approved, you will receive your production credentials such as: _Merchant ID_, _Client ID_ known as _X-PARTNER-ID_, and _Client Secret_.

**Testing in the Production Environment**

- **Configure the production environment** Update your application settings to switch from the sandbox environment to the production environment by using the correct production API endpoints and credentials.

- **Test using production credentials** Download the **Prod E2E Test Verification** template in the [Merchant Portal](http://dashboard.dana.id) and start production testing as instructed. Upload the test results through the [Merchant Portal](http://dashboard.dana.id).

- **Receive live payments** After receiving all approvals, your DANA integration will be activated and ready for receive live payments from your customers.

**Ready to submit testing documents?**
Access our merchant portal for detailed guide to start receiving live payments

[Open Merchant Portal](https://dashboard.dana.id/app)
