# Scenario Testing (UAT Testing)

UAT testing ensures your integration works correctly before going live.

Run predefined scenarios in Merchant Portal to validate your API and verify expected results.

### Before You Start

- Merchant Portal account is created
- Sandbox webhook is registered
- Sandbox credentials are ready

### Run UAT Testing

1. Go to Integration Checklist 

On this page, you’ll see what to complete before going live: ![Integration Checklist](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/scenario-testing/integration-checklist-2.png)

2. Run all required scenarios
3. Ensure all are Passed

### How it works

- Run scenarios using sandbox credentials
- Results are validated automatically
- Status updates in Merchant Portal

**Mandatory scenarios → Must be completed to pass UAT.**

Expand each API to see available scenarios and their status.
![Mandatory Scenario](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/scenario-testing/mandatory-scenario.png)

**Additional scenarios → Used for additional validation (not required to proceed).**

If you decide to use any of the additional APIs, you will need to complete every testing scenarios relating to that API.
![Additional Scenario](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/scenario-testing/additional-scenario.png)

**All required scenarios passed → UAT complete**

You can now proceed to Production Submission.
![UAT Complete](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/guide/scenario-testing/uat-complete.png)

### Automated Testing Script

To speed up your integration, we have provided an automated test suite. It takes under 15 minutes to run your integration against our test scenarios. 

Currently the following programming languages are supported:

* Python

* Golang

* Node

* PHP

### Support

Need help? contact our [Merchant Support Team] (https://www.dana.id/business/contact-us) or join our [Discord server](https://s.dana.id/dana-discord-dev)