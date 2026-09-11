# Disbursement

Disbursement involves transferring funds from a merchant to either a user's DANA balance or directly to a bank account. This solution offers two key functionalities:

1. **Disbursement to Balance**: Allow merchants to transfer funds to DANA user accounts. It automates the disbursement process with real time processing and eliminates manual handling. Through a single integration point, merchants can verify accounts, initiate top up, and monitor transaction status.
2. **Disbursement to Bank Account**: Allow merchants to request transfer funds via DANA directly to user's bank accounts. Provide secure, fast, and automated disbursements with minimal processing steps.

## Disbursement to Balance

Send funds to DANA users instantly, verify accounts, process payments, and track transactions.

### Available APIs for Disbursement to Balance Solution

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Check Disbursement Account | POST | Check merchant account balance to DANA | [Check Disbursement Account](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) |
| Account Inquiry | POST | Inquire account information from merchant to DANA | [Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/account-inquiry.md) |
| Customer Top Up | POST | Trigger top up request from merchant to DANA | [Customer Top Up](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/customer-top-up.md) |
| Customer Top Up Inquiry Status | POST | Inquire top up status from merchant to DANA | [Customer Top Up Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) |

Related guide: [Disbursement Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/disbursement.md) - The settlement file gives merchants and Banks detailed information about each transaction that affects funds settlement to their accounts.

### Process Flow

The general flow of top up using a Disbursement to Balance is as follows:

#### Successful Transaction

![Successful Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/disbursement/sequence-top-up-disbursement.png)

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

#### Customer Top Up Inquiry Status

![Customer Top Up Inquiry Status](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/disbursement/sequence-customer-top-up-inquiry-status.png)

1. After 5 times retry attempts of customer topup, merchant calls DANA's [Customer Top Up Inquiry Status API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/customer-top-up-inquiry-status.md) to determine the final transaction status.
2. DANA's queries the transaction to get the latest status and details of the specific top up transaction.
3. DANA returns the current transaction status to merchant, providing information about whether the customer top up was successfully processed, failed, or is still pending.

## Disbursement to Bank Account

Transfer funds via DANA to user's bank accounts with minimal processing steps.

### Available APIs for Disbursement to Bank Account Solution

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Check Disbursement Account | POST | Check merchant account balance to DANA | [Check Disbursement Account](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) |
| Transfer to Bank Account Inquiry | POST | Inquire bank account information via DANA | [Transfer to Bank Account Inquiry](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-account-inquiry.md) |
| Transfer to Bank | POST | Trigger transfer to bank request via DANA | [Transfer to Bank](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/transfer-to-bank.md) |
| Transfer to Bank Notify | Webhook | Webhook to notify merchant about transfer to bank status and information | [Transfer to Bank Notify](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-notify.md) |
| Transfer to Bank Inquiry Status | POST | Inquire the status transfer of to bank transactions to DANA | [Transfer to Bank Inquiry Status](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-inquiry-status.md) |

Related guide: [Disbursement Settlement File Specification](https://dashboard.dana.id/api-docs-v2/llms/guide/settlement-file/disbursement.md) - The settlement file gives merchants and Banks detailed information about each transaction that affects funds settlement to their accounts.

### Process Flow

The general flow of transfer using a Disbursement to Bank Account is as follows:

#### Successful Transaction

![Successful Transaction](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/disbursement/sequence-transfer-to-bank-account-inquiry.png)

1. Merchant calls DANA's [Check Disbursement Account API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/check-disbursement-account.md) to verify their current account balance before processing any bank transfers.
2. DANA processes the request and returns the merchant's current balance information, ensuring sufficient funds are available for the intended disbursement.
3. Merchant receives a transfer request from a user who wants to transfer funds to their bank account.
4. Merchant calls DANA's [Transfer to Bank Account Inquiry API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-account-inquiry.md) to validate the recipient's bank account details before initiating the transfer.
5. DANA forwards the account inquiry request to the destination bank to verify the account information and availability.
6. Bank processes the inquiry and returns the account validation results to DANA, confirming whether the account is valid and can receive transfers.
7. DANA returns the bank account inquiry results to merchant, providing confirmation of account validity and transfer eligibility.
8. Merchant calls DANA's [Transfer to Bank API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/transfer-to-bank.md) to initiate fund transfer to the validated bank account.
9. DANA processes the transfer request by validating the account information to bank and deducting the specified amount from the merchant's balance.
10. DANA sends the transfer request to the destination bank, initiating the fund transfer process.
11. Bank processes the transfer by crediting amount to the user's beneficiary bank account.
12. DANA returns transfer result to the merchant, confirming that the transfer request has been successfully submitted.
13. If merchant has enabled notifications (needNotify == `true`), DANA sends an additional status update indicating "Request in Progress (**2024300**)" to keep the merchant informed of the transfer processing status
14. Bank sends the final transfer status result to DANA, confirming whether the transfer was successfully completed or failed.
15. DANA calls merchant's [Transfer to Bank Notify API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-notify.md) webhook endpoint to deliver the final transfer result, providing complete transaction status and details.

#### Transfer to Bank Inquiry Status

![Transfer to Bank Inquiry Status](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/disbursement/sequence-transfer-to-bank-inquiry-status.png)

1. After retry of transfer to bank, merchant calls DANA's [Transfer to Bank Inquiry Status API](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/optional-api/transfer-to-bank-inquiry-status.md) to determine the final transaction status.
2. DANA's queries the transaction to get the latest status and details of the transfer.
3. DANA returns the current transfer status to the merchant, providing information about whether the customer top up was successfully processed, failed, or is still pending.
