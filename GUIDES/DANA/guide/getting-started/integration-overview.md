# Integration Overview

Some online solutions provided by DANA requires you to integrate with our systems and APIs. We have provided tools and guides to help you integrate your online businesses to DANA's payment ecosystem. Below are the general steps required to integrate with DANA.

## Access your developer dashboard

You can access your developer dashboard and begin the integration process by clicking the Start Integration button.

![Developer Integration](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview-developer-dashboard.png)

_Start your integration process by clicking the Start Integration button_

## Setup your Initial Webhook Address

Before starting integration, you will need to initialize your webhook settings by providing several webhook endpoint URLs. Read the links provided in each field to learn more about the associated webhook APIs.

![Setup Initial Webhook Address](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview/initial-webhook-address.png)

_Initialize your webhook endpoint URLs. You can change these settings later_

## Access your Developer Credentials

After initializing your webhook settings, you can access your developer credentials from the dashboard. These credentials are essential for authenticating your integration with DANA's APIs.

Make sure to securely store these credentials. You'll use these credentials to authenticate all API requests during both testing and production phases.

![Access your Developer Credentials](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview-dev-credentials.png)

_Access your developer credentials from the dashboard_

## Complete your Integration Checklist

### Complete Testing Scenarios

The system will automatically track the testing progress when merchant performs testing using sandbox credentials. For more details, go to [Scenario Testing](https://dashboard.dana.id/api-docs-v2/llms/guide/scenario-testing.md).

1. Go to [Integration Checklist](https://dashboard.dana.id/sandbox/golive).
2. Complete all required testing scenarios for your selected products.
3. Ensure each product selected shows **All scenarios completed**.
4. If needed, click **Change Product Selection** to update the selected products.

![Complete Testing Scenarios](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview/complete-testing-scenario.svg)

_Complete Testing Scenarios_

### Sign the UAT Sign-Off Report

**Information:** To proceed with UAT sign off, make sure you have completed your Business Information and Legal Document. Visit our [Business Verification Overview](https://dashboard.dana.id/api-docs-v2/llms/guide/getting-started/business-verification-overview.md) page for information.

The system will generate a UAT Sign-Off Report based on the completed test logs and send it to the registered IT representative's email address for signing.

1. Check the **Sign your UAT Sign-Off Report document** section.
2. Enter the **IT Representative Email, IT Representative Name,** and **IT Representative Title**.
3. Once all required information is valid, click **Send UAT Document**.

![Sign the UAT Sign-Off Report](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview/uat-sign-off-complete.svg)

_Sign your UAT Sign-Off Report Document_

### Complete Devsite Test Setup

The devsite testing is required for merchants to comply with SNAP standards from Bank Indonesia.

#### Use My ASPI Account

![Use My ASPI Account](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview/use-aspi-account-1.png)

_Devsite Test Setup - Use My ASPI Account_

1. Enter the ASPI account email and password.
2. Click **Submit** to continue. This process takes 2 - 3 minutes.
3. When the status shows:
4. **"Uji Devsite in Progress"**, wait as the Uji Devsite is being run. It might take up to 2 hours.
5. **"Completed"**, download the report by clicking the Download Report button.

#### Create an Account via DANA

![Create an Account via DANA](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/getting-started/integration-overview/create-dana-account-1.png)

_Devsite Test Setup - Create an Account via DANA_

1. Enter the email address that will be used for ASPI account registration and click **Submit** to send the registration request.
2. When the status shows:
3. **"Waiting Email Confirmation"**, check the registered email address and follow the confirmation instructions.
4. **"Waiting Activation"**, wait as the account is being activated. It might take up to 6 hours.
5. **"Uji Devsite in Progress"**, wait as the Uji Devsite is being run. It might take up to 2 hours.
6. **"Completed"**, download the report by clicking the Download Report button.

## Apply for Production

Once you've successfully tested your integration in the sandbox environment, you're ready to apply for production credentials. This allows you to process real transactions through DANA's payment system.

1. **Production Key**

Generate production keys through the [Signature Document](https://dashboard.dana.id/api-docs-v2/llms/guide/authentication/authentication-asymmetric.md) page.

2. **Production Endpoint Setup**

Configure the production endpoint URLs, including the Notify and Redirect URL, that will be used in the Production environment. These URLs will be whitelisted by our system as part of production setup.

After submission, our team will review your application and integration setup. You'll receive your production credentials once the review is complete and approved.
