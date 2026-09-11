# Disbursement Settlement File

The settlement file report is used by merchants or payment processing partners such as Banks. The settlement file gives merchants and Banks detailed information about each transaction that affects funds settlement to their accounts.

## For Settlement Disbursement to Bank Account

There are a few cases that might occur during the transactions, described as follows:

| Name | Description |
| --- | --- |
| Success | Transactions with successful status refer to the disbursements that have received a notification from the Bank indicating a success. Successful transactions will add the transaction fees (charge amount) to the settlement |
| Pending | Transactions with pending status refer to those with cases in which the disbursement has not received a notification from the Bank for more than one day (usually never occur for more than one day). In such cases, the settlement will display the same record but has not been charged with transaction fees |
| Refund | Refund transactions refer to those that were initially pending. In this context, a pending transaction takes place, but the disbursement returns a result notification from the Bank indicating a failure. Subsequently, since it has not been charged with a transaction fee, both the fund amount and the paid total amount are subtracted. For refund transaction, the following fields are stated as negative values: `FUND_AMOUNT`, `PAID_TOTAL_AMOUNT`. |
| Reversal | Reversal transactions refer to those initially marked as successful. In this context, a successful transaction takes place, but the disbursement returns a result notification from the Bank indicating a failure. Subsequently, both the charge amount and fund amount are subtracted. For reversal transaction, the following fields are stated as negative values: `FUND_AMOUNT`, `CHARGE_AMOUNT`, `FEE`, `VAT`, `PAID_TOTAL_AMOUNT`. |

## Specification

The following table is a specification of this settlement file report:

| Name | Description |
| --- | --- |
| File Name | MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_MID_YYYYMMDD.csv (YYYYMMDD refer to the transaction date) |
| File Format | .csv |
| File Generation | T+1 of each transaction date |
| Function | This settlement is used to show all recorded disbursement transactions based on a certain time |
| Settlement Cut Off | 00.00.00 |
| Delimiter | Comma |
| Related API | [Disbursement](https://dashboard.dana.id/api-docs-v2/llms/api/disbursement/overview.md) |

## File Format

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `REQUEST_ID` | String | Variable, 64 | Mandatory | - | Partner unique request identifier |
| 2 | `FUND_AMOUNT` | Long | Variable, 32 | Mandatory | - | Original transaction amount |
| 3 | `FUND_AMOUNT_CURRENCY` | String | Variable, 3 | Mandatory | - | Original transaction currency |
| 4 | `CHARGE_AMOUNT` | Long | Variable, 32 | Mandatory | - | Total charge amount (MDR includes taxes) |
| 5 | `FEE` | Long | Variable, 32 | Mandatory | - | Base MDR fee amount |
| 6 | `WHT` | Long | Variable, 32 | Mandatory | - | Withholding tax amount |
| 7 | `VAT` | Long | Variable, 32 | Mandatory | - | Value-added tax amount |
| 8 | `PAID_TOTAL_AMOUNT` | Long | Variable, 5 | Mandatory | - | The transaction paid total amount (including MDR) |
| 9 | `PAYER_ROLE_ID` | String | Variable, 64 | Mandatory | - | Payer identifier (merchant) |
| 10 | `DEPOSIT_ACCOUNT_NO` | String | Variable, 16 | Mandatory | - | Deposit account number |
| 11 | `MERCHANT_NAME` | String | Variable, 64 | Mandatory | - | Merchant name |
| 12 | `TRANSACTION_DATE` | Datetime | Fixed, 17 | Mandatory | - | Transaction date time, in format YYYYMMDD HH:MM:SS |
| 13 | `SOURCE` | String | Variable, 64 | Mandatory | - | Merchant name |
| 14 | `REPORT_DATE` | Datetime | Fixed, 8 | Mandatory | - | Settlement report date, in format YYYYMMDD |
| 15 | `BENEFICIARY_BANK_ACCOUNT` | Datetime | Variable, 32 | Conditional | Y:= Disbursement to Bank Account | Beneficiary Bank account number |
| 16 | `BENEFICIARY_BANK_NAME` | Datetime | Variable, 25 | Conditional | Y:= Disbursement to Bank Account | Beneficiary Bank name |

## Example CSV File Format

### To DANA Balance

| Name | Description |
| --- | --- |
| File Name | MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv (20210429 refer to the transaction date) |
| Example File | [Download Example File](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Balance/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv) |

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,6000.0,IDR,550.0,500.0,0.0,50.0,6550.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429
AQYAABgYdI8hQkGRs5ItKuotCw0C,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429
AQYAAHqKNZZZZElXkkurodWBvsUC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429
```

### To Bank Account

| Name | Description |
| --- | --- |
| File Name | MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv (20210429 refer to the transaction date) |
| Example File | [Download Example File - Success Transaction](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Bank%20Account%20-%20Success%20Transaction/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv)<br />[Download Example File - Pending Transaction](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Bank%20Account%20-%20Pending%20Transaction/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv)<br />[Download Example File - Refund Transaction](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Bank%20Account%20-%20Refund%20Transaction/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv)<br />[Download Example File - Reversal Transaction](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Bank%20Account%20-%20Reversal%20Transaction/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv) |

#### Success Transaction

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE,BENEFICIARY_BANK_ACCOUNT,BENEFICIARY_BANK_NAME
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,6000.0,IDR,550.0,500.0,0.0,50.0,6550.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429,,
AQYAABgYdI8hQkGRs5ItKuotCw0C,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429,****5678,BANK SYARIAH INDONESIA
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429,,
AQYAAHqKNZZZZElXkkurodWBvsUC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429,****3456,BCA
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429,****7890,Mandiri
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429,****1234,Mandiri
```

#### Pending Transaction

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE,BENEFICIARY_BANK_ACCOUNT,BENEFICIARY_BANK_NAME
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,6000.0,IDR,0.0,0.0,0.0,0.0,6000.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429,,
AQYAABgYdI8hQkGRs5ItKuotCw0C,2000.0,IDR,0.0,0.0,0.0,0.0,2000.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429,****5678,BANK SYARIAH INDONESIA
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,2000.0,IDR,0.0,0.0,0.0,0.0,2000.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429,,
AQYAAHqKNZZZZElXkkurodWBvsUC,4000.0,IDR,0.0,0.0,0.0,0.0,4000.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429,****3456,BCA
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,4000.0,IDR,0.0,0.0,0.0,0.0,4000.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429,****7890,Mandiri
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,2000.0,IDR,0.0,0.0,0.0,0.0,2000.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429,****1234,Mandiri
```

#### Refund Transaction

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE,BENEFICIARY_BANK_ACCOUNT,BENEFICIARY_BANK_NAME
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,-6000.0,IDR,0.0,0.0,0.0,0.0,-6000.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429,,
AQYAABgYdI8hQkGRs5ItKuotCw0C,-2000.0,IDR,0.0,0.0,0.0,0.0,-2000.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429,****5678,BANK SYARIAH INDONESIA
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,-2000.0,IDR,0.0,0.0,0.0,0.0,-2000.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429,,
AQYAAHqKNZZZZElXkkurodWBvsUC,-4000.0,IDR,0.0,0.0,0.0,0.0,-4000.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429,****3456,BCA
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,-4000.0,IDR,0.0,0.0,0.0,0.0,-4000.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429,****7890,Mandiri
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,-2000.0,IDR,0.0,0.0,0.0,0.0,-2000.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429,****1234,Mandiri
```

#### Reversal Transaction

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE,BENEFICIARY_BANK_ACCOUNT,BENEFICIARY_BANK_NAME
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,-6000.0,IDR,-550.0,-500.0,0.0,-50.0,-6550.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429,,
AQYAABgYdI8hQkGRs5ItKuotCw0C,-2000.0,IDR,-550.0,-500.0,0.0,-50.0,-2550.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429,****5678,BANK SYARIAH INDONESIA
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,-2000.0,IDR,-550.0,-500.0,0.0,-50.0,-2550.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429,,
AQYAAHqKNZZZZElXkkurodWBvsUC,-4000.0,IDR,-550.0,-500.0,0.0,-50.0,-4550.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429,****3456,BCA
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,-4000.0,IDR,-550.0,-500.0,0.0,-50,-4550.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429,****7890,Mandiri
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,-2000.0,IDR,-550.0,-500.0,0.0,-50.0,-2550.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429,****1234,Mandiri
```

### To Bank and Balance

| Name | Description |
| --- | --- |
| File Name | MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv (20210429 refer to the transaction date) |
| Example File | [Download Example File](https://a.m.dana.id/merchant-portal/api-docs/csv/Disbursement%20to%20Balance%20and%20Bank%20Account/MERCHANT_DANA_DISBURSEMENT_SETTLEMENT_REPORT_216620000180483821815_20210429.csv) |

```csv
REQUEST_ID,FUND_AMOUNT,FUND_AMOUNT_CURRENCY,CHARGE_AMOUNT,FEE,WHT,VAT,PAID_TOTAL_AMOUNT,PAYER_ROLE_ID,DEPOSIT_ACCOUNT_NO,MERCHANT_NAME,TRANSACTION_DATE,SOURCE,REPORT_DATE,BENEFICIARY_BANK_ACCOUNT,BENEFICIARY_BANK_NAME
AQYAAIdZuL1sUk9Sttx3o33xzpdwC,6000.0,IDR,550.0,500.0,0.0,50.0,6550.0,216620000180483821815,20070000016604140817,Helo,20210429 08:31:11,Helo,20210429,,
AQYAABgYdI8hQkGRs5ItKuotCw0C,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 16:12:39,Helo,20210429,****5678,BANK SYARIAH INDONESIA
AQYAAGW4Fa9ScLEDchMnCifB6QQQC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 04:23:32,Helo,20210429,,
AQYAAHqKNZZZZElXkkurodWBvsUC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 01:48:48,Helo,20210429,****3456,BCA
AQYAAPYv2fY99SUGKkUA39S0TE6wgC,4000.0,IDR,550.0,500.0,0.0,50.0,4550.0,216620000180483821815,20070000016604140817,Helo,20210428 09:53:28,Helo,20210429,****7890,Mandiri
AQYAAAS9PfR29ScUznjpvdBd99DbSkC,2000.0,IDR,550.0,500.0,0.0,50.0,2550.0,216620000180483821815,20070000016604140817,Helo,20210428 02:28:05,Helo,20210429,****1234,Mandiri
```
