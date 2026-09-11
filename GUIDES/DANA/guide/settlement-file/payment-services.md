# Overview

The settlement file report is used by merchants or payment processing partners such as Banks. The settlement file gives merchants and Banks detailed information about each transaction that affects funds settlement to their accounts.

# Specification

The following table is a specification of this settlement file report:

| **File Name** | MERCHANT_SETTLEMENT_MID_UNIT_UNIT NAME_YYYYMMDD.csv(YYYYMMDD refer to the transaction date) |
| --- | --- |
| **File Format** | .csv |
| **Function** | This settlement is used to show all recorded payment services based on a certain time |
| **Settlement Cut Off** | 00.00.00 |
| **Delimiter** | Semicolon |
| **Related Service** | Gapura Payment Gateway; DANA Widget|

# File Generation

The following sections are the details on how the file is generated:

1. Merchant can choose when the settlement file will be generated and get the payout.
T+X where X >= 1

2. Merchant can choose what kind of settlement file unit will be used.

  - MERCHANT
  - DIVISION/REGION
  - SHOP

3. DANA will deliver the settlement file and payout based on the agreed #1 and #2.

# Additional Information

Highlight for [Gapura Payment Gateway](https://dashboard.dana.id/api-docs-v2/llms/api/payment-gateway/overview.md) Scenario: TXN_TYPE ACQUIRING_ORDER with PAY_METHOD ADJUSTMENT is the process of crediting the merchant's account. This only applies when DANA cannot do a refund process in the Gapura Payment Gateway business scenario.

# File Content

The following table is a list of the content of this settlement file report:

| No | **Field** | **Type** | **Length** | **Required** | **Condition** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SETTLEMENT_TXN_ID` | String | Variable, 64 max | Mandatory | - | Settlement file’s batch number |
| 2 | `TXN_ID` | String | Variable, 64 max | Mandatory | - | Transaction identifier based on `TXN_TYPE`, with these rules:<br />- `ACQUIRING_ORDER`: `acquirementId`<br />- `VOUCHER_DEDUCTION`: `acquirementId`<br />- `CAPTURE`: `captureId`<br />- `REFUND`: `refundId`<br />- `CANCEL`: `acquirementId` |
| 3 | `TXN_TYPE` | String | Variable, 32 max | Mandatory | - | Transaction type, which has values:<br />- `ACQUIRING_ORDER`<br />- `VOUCHER_DEDUCTION`<br />- `CAPTURE`<br />- `REFUND`<br />- `CANCEL` |
| 4 | `ACQUIREMENT_ID` | String | Variable, 64 max | Mandatory | - | `acquirementId` or it is called `referenceNo` from the API response |
| 5 | `MID` | String | Variable, 64 max | Mandatory | - | Merchant identifier assigned by DANA |
| 6 | `SETTLE_DATE` | Datetime | Fixed, 25 max | Mandatory | - | The date when the money should be settled, in format `YYYY-MM-DDTHH:mm:ss+07:00`. Time must be in GMT+7 Jakarta time |
| 7 | `MERCHANT_NAME` | String | Variable, 128 max | Mandatory | - | Merchant official name |
| 8 | `TXN_AMOUNT` | Long | Variable, 18 max | Mandatory | - | Transaction amount in cent, with these rules:<br />- `ACQUIRING_ORDER` = transaction amount<br />- `VOUCHER_DEDUCTION` = voucher amount<br />- `CAPTURE` = capture amount<br />- `REFUND` = refund amount<br />- `CANCEL` = cancel amount |
| 9 | `TXN_CURRENCY` | String | Variable, 3 max | Mandatory | - | 3-letter currency code, typically IDR |
| 10 | `TXN_DATE` | Datetime | Fixed, 25 max | Mandatory | - | Datetime with timezone, in format `YYYY-MM-DDTHH:mm:ss+07:00`. Time must be in GMT+7 Jakarta time and with these rules:<br />- `ACQUIRING_ORDER` = acquire success date time<br />- `VOUCHER_DEDUCTION` = acquire success date time<br />- `CAPTURE` = capture success date time<br />- `REFUND` = refund success date time<br />- `CANCEL` = cancel success date time |
| 11 | `ORIGINAL_TXN_ID` | String | Variable, 64 max | Conditional | `Y := TXN_TYPE == REFUND or CANCEL` | Original transaction identifier, with these rules:<br />- `REFUND` = when refund is specific to acquiring order, the value is `acquirementId`; and when refund is specific to capture, the value is `captureId`<br />- `CANCEL` = `acquirementId` |
| 12 | `ORIGINAL_TXN_DATE` | Datetime | Fixed, 25 max | Conditional | `Y := TXN_TYPE == REFUND or CANCEL` | Original transaction date, in format `YYYY-MM-DDTHH:mm:ss+07:00`. Time must be in GMT+7 Jakarta time and with these rules:<br />- `REFUND` = when refund is specific to acquiring order, the value is acquire success date; and when refund is specific to capture, the value is capture success date<br />- `CANCEL` = acquire success date |
| 13 | `MERCHANT_COMMISSION_EDIK` | String | Variable, 18 max | Mandatory | - | Charged fee to the merchant, in cent |
| 14 | `SERVICE_TAX_EDIK` | String | Variable, 18 max | Mandatory | - | Tax of the charged fee paid by the merchant, in cent |
| 15 | `WITHHOLDING_TAX_EDIK` | String | Variable, 18 max | Mandatory | - | Withholding tax |
| 16 | `MERCHANT_COMMISSION_ASR` | String | Variable, 18 max | Mandatory | - | Charged fee to the merchant, in cent |
| 17 | `SERVICE_TAX_ASR` | String | Variable, 18 max | Mandatory | - | Tax of the charged fee paid by the merchant, in cent |
| 18 | `WITHHOLDING_TAX_ASR` | String | Variable, 18 max | Mandatory | - | Withholding tax |

# Example CSV Settlement File Report

The following table is a sample of this settlement file report:

| **File Name** | `MERCHANT_SETTLEMENT_216620000005573112345_REGION_JAKARTA_20200128.csv` (`20200128` refer to the transaction date) |

File Content

```
SETTLEMENT_TXN_ID;TXN_ID;TXN_TYPE;ACQUIREMENT_ID;MID;SETTLE_DATE;MERCHANT_NAME;TXN_AMOUNT;TXN_CURRENCY;TXN_DATE;ORIGINAL_TXN_ID;ORIGINAL_TXN_DATE;MERCHANT_COMMISSION_EDIK;SERVICE_TAX_EDIK;WITHHOLDING_TAX_EDIK;MERCHANT_COMMISSION_ASR;SERVICE_TAX_ASR;WITHHOLDING_TAX_ASR;SETTLE_AMOUNT;MERCHANT_TRANS_ID;MERCHANT_REQUEST_ID;PAY_METHOD;MERCHANT_CUST_ID;SETTLE_UNIT_TYPE;SETTLE_UNIT_VALUE;SHOP_ID;BUYER_MOBILE_NO;DIVISION_ID;PRODUCT_TYPE
20211214111213810400166007016111327;20211213111212800100166217756347323;ACQUIRING_ORDER;20211213111212800100166217756347323;216620000005573112345;2021-12-14T10:58:08+07:00;Sambal Pak Bayu;6600000;IDR;2021-12-13T10:58:08+07:00;;2021-12-13T10:00:01+07:00;41976;4198;0;0;0;0;6553826;GP791478099968220288;;BALANCE;;;;10790;;;MPM (Kode QR Penjual)
20211214111213810400166007016111327;20211213111212800100166217756347323;VOUCHER_DEDUCTION;20211213111212800100166217756347323;216620000005573112345;2021-12-14T10:58:08+07:00;Sambal Pak Bayu;2000000;IDR;2021-12-13T10:58:08+07:00;;2021-12-13T10:00:01+07:00;0;0;0;0;0;0;2000000;GP791478099968220288;;COUPON_DEALS;;;;10790;;;MPM (Kode QR Penjual)
20211214111213810400166007016111327;20211213111212800100166217756347323;ACQUIRING_ORDER;20211213111212800100166217756347323;216620000005573112345;2021-12-14T10:58:08+07:00;Sambal Pak Bayu;2000000;IDR;2021-12-13T10:58:08+07:00;;2021-12-13T10:00:01+07:00;0;0;0;0;0;0;2000000;GP791478099968220288;;COUPON_DEALS;;;;10790;;;MPM (Kode QR Penjual)
20211214111213810400166008516089937;20211213111212800100166381655722251;ACQUIRING_ORDER;;216620000005573112345;2021-12-14T00:02:49+07:00;Sambal Pak Bayu;45000;IDR;2021-12-13T00:02:49+07:00;;2021-12-13T23:44:40+07:00;0;0;0;0;0;0;0;BL21173R7KTIINV;;REBATE;3978211;DEFAULT;DEFAULT;;;;Auto Debit
20211214111213810400166008516089937;20211213111212801300166384744796198;REFUND;;216620000005573112345;2021-12-14T00:02:53+07:00;Sambal Pak Bayu;45000;IDR;2021-12-13T00:02:53+07:00;20211213111212800100166381655722251;2021-12-13T23:44:40+07:00;0;0;0;0;0;0;0;BL21173R7KTIINV;f89103f9-427e-4dba-8ade-e158049309c8;REBATE;3978211;DEFAULT;DEFAULT;;;;Auto Debit
20211214111213810400166008516089937;20211212111212800110166738354425938;ACQUIRING_ORDER;;216620000005573112345;2021-12-14T23:09:38+07:00;Sambal Pak Bayu;50000;IDR;2021-12-12T23:09:38+07:00;;2021-12-12T23:04:38+07:00;500;50;0;0;0;0;49450;BL21173R4AFKINV;;BALANCE;548061827;DEFAULT;DEFAULT;;;;Online Cashier
20211214111213810400166008516089937;20211212111212800110166738354425938;CANCEL;;216620000005573112345;2021-12-14T23:09:38+07:00;Sambal Pak Bayu;50000;IDR;2021-12-12T23:09:38+07:00;20211212111212800110166738354425938;2021-12-12T23:04:38+07:00;500;50;0;0;0;0;49450;BL21173R4AFKINV;;BALANCE;548061827;DEFAULT;DEFAULT;;;;Online Cashier
20211214111213810400166008516089937;20211213111212800110166442454401805;ACQUIRING_ORDER;;216620000005573112345;2021-12-14T00:00:21+07:00;Sambal Pak Bayu;1014000;IDR;2021-12-13T00:00:21+07:00;;2021-12-13T23:55:00+07:00;10140;1014;0;0;0;0;1002846;BL21173R7ENOINV;;BALANCE;34847407;DEFAULT;DEFAULT;;;;Online Cashier
20211214111213810400166008516089937;20211213111212801300166988445615496;REFUND;;216620000005573112345;2021-12-14T00:00:26+07:00;Sambal Pak Bayu;1014000;IDR;2021-12-13T00:00:26+07:00;20211213111212800110166442454401805;2021-12-13T23:57:08+07:00;0;0;0;0;0;0;1014000;BL21173R7ENOINV;ded25302-33bc-49c0-9564-24a1302ba793;BALANCE;34847407;DEFAULT;DEFAULT;;;;Online Cashier
20220211111213810400166003417174859;20220210111212801800166418504527898;CAPTURE;20220210111212800100166410960423200;216620000005573112345;2022-02-11T06:31:54+07:00;Sambal Pak Bayu;4312000;IDR;2022-02-10T06:31:54+07:00;;2022-02-10T06:22:54+07:00;21560;2156;0;0;0;0;4288284;43690613-6281281749288-20220209225420-1;f5e4730a-d2b1-416f-88ac-f87d9dfc262e;BALANCE;;;;;;;Auth Capture
20231012111213810400166002126971912;20231011111212800100166975862922599;ACQUIRING_ORDER;20231011111212800100166975862922599;216620000646227614331;2022-02-11T06:31:54+07:00;Sambal Pak Bayu;2103200;IDR;2023-10-11T18:59:39+07:00;;;0;0;0;0;0;0;2103200;12010220231011011002173068496285;;ADJUSTMENT;;DEFAULT;DEFAULT;;;;Direct Agreement Pay
```

File Attachment
[Example] (https://a.m.dana.id/merchant-portal/api-docs/csv/MERCHANT_SETTLEMENT_216620000005573112345_REGION_JAKARTA_20200128.csv)