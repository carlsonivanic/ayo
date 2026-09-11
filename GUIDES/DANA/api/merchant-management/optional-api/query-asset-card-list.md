# Query Asset Card List

```http
POST /dana/member/asset/queryAssetCardList.htm
```

This API is used to get the available asset card list that user has

## API Specification

| Field | Value |
| --- | --- |
| Expected Timeout | 3 seconds |
| SNAP Service Code | - |
| Accept | application/json |
| Content Type | application/json |

---
## Request Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain Value: `dana.member.asset.queryAssetCardList` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | memberId | String | Fixed, 21 | Mandatory | - | User identifier or merchant identifier |
| 2 | bindingId | String | Fixed, 32 | Optional | - | Asset card bind identifier |
| 3 | enableOnly | String | Variable, 5 | Optional | - | Flag to determinate user's card status. The possible values are `true` and `false` |
| 4 | contactBizTypeList | Array of string | Variable, 0 | Optional | - | Contact biz type list, refer to ContactBizTypeEnum |
| 5 | assetTypeList | Array of string | Variable, 0 | Optional | - | Asset type list, refer to AssetCardTypeEnum |

### Request Body Enum Details

#### contactBizTypeList
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | TRANSFER_HIS | TRANSFER_HIS | String | History of transfer transaction |
| 2 | DIRECT_TRANSFER | DIRECT_TRANSFER | String | Transfer from virtual bank card |
| 3 | GENERAL_CARD | GENERAL_CARD | String | Bank card used for general purpose |
| 4 | DIRECTPAY_CARD | DIRECTPAY_CARD | String | Bank card used for direct payment |
| 5 | PAYMENT_CARD | PAYMENT_CARD | String | Bank card for payment card |
| 6 | CASHOUT_CARD | CASHOUT_CARD | String | Bank card used for cashout |
| 7 | IMPS_ACCOUNT | IMPS_ACCOUNT | String | Bank card used for BCA |
| 8 | INVESTMENT_ACCOUNT | INVESTMENT_ACCOUNT | String | Investment account |

#### assetTypeList
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | CHECKING_ACCOUNT | CHECKING_ACCOUNT | String | Checking account |
| 2 | SAVINGS_ACCOUNT | SAVINGS_ACCOUNT | String | User's savings account |
| 3 | LOAN_ACCOUNT | LOAN_ACCOUNT | String | User's loan account |
| 4 | IMPS_ACCOUNT | IMPS_ACCOUNT | String | Immediate payment service account |
| 5 | DEBIT_CARD | DEBIT_CARD | String | User's debit card |
| 6 | CREDIT_CARD | CREDIT_CARD | String | User's credit card |
| 7 | SECURED_CREDIT_CARD | SECURED_CREDIT_CARD | String | Secured credit card |
| 8 | VA_ACCOUNT | VA_ACCOUNT | String | Virtual account |
| 9 | OTC_ACCOUNT | OTC_ACCOUNT | String | On the counter account |
| 10 | REFUND_ACCOUNT | REFUND_ACCOUNT | String | User's refund account |
| 11 | CREDIT_ACCOUNT | CREDIT_ACCOUNT | String | User's credit account |
| 12 | LOAN | LOAN | String | User's loan account paylater |
| 13 | MUTUAL_FUNDS_ACCOUNT | MUTUAL_FUNDS_ACCOUNT | String | User's mutual fund account |
| 14 | INVESTMENT | INVESTMENT | String | User's investment account |

### Request Body Notes

- `enableOnly`: Will be `true` if user's card was active

## Request Sample

### JSON

```json
{
    "request": {
      "head": {
        "version": "2.0",
        "function": "dana.member.asset.queryAssetCardList",
        "clientId": "305XSM22SG0ASM05",
        "clientSecret": "5f2ef097c0f9464a80e4f0f9c9be85a0",
        "reqTime": "2001-07-04T12:08:56+07:00",
        "reqMsgId": "1234567asdfasdf1123fda",
        "reserve": "{}"
      },
      "body": {
        "memberId": "216610000000000000000",
        "bindingId": "120300002008840365888",
        "enableOnly": "true",
        "contactBizTypeList": ["GENERAL_CARD", "PAYMENT_CARD", "CASHOUT_CARD"],
        "assetTypeList": ["VA_ACCOUNT"]
      }
    },
    "signature":"signature string"
}
```

---

## Response Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain Value: `dana.member.asset.queryAssetCardList` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | respTime | String | Fixed, 25 | Mandatory | - | Response time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Response Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | resultInfo | JSON Object | Variable, 0 | Mandatory | - | Define the detail of result information |
| 1.1 | resultInfo.resultStatus | String | Fixed, 1 | Mandatory | - | Result status, refer to result code list ResultStatusThe status of the request can be: - `S`: Success - `F`: Failure - `U`: Unknown Can be added if these 3 statuses are insufficient for business requirements |
| 1.2 | resultInfo.resultCodeId | String | Variable, 16 | Mandatory | - | Result code identifier, refer to result code list ResultCodeId |
| 1.3 | resultInfo.resultCode | String | Variable, 64 | Mandatory | - | Result code string, refer to ResultCode |
| 1.4 | resultInfo.resultMsg | String | Variable, 256 | Optional | - | Result message, refer to result code list ResultMsg |
| 2 | assetCardList | Array of JSON Object | Variable, 0 | Optional | - | Define the detail of asset card list |
| 2.1 | assetCardList[].contactBizType | String | Variable, 20 | Mandatory | - | Contact biz type, refer to ContactBizTypeEnum |
| 2.2 | assetCardList[].cardIndexNo | String | Variable, 20 | Mandatory | - | Card index number |
| 2.3 | assetCardList[].cardNoLength | String | Fixed, 2 | Mandatory | - | Card number length based on card index number |
| 2.4 | assetCardList[].maskedCardNo | String | Variable, 256 | Mandatory | - | Card number |
| 2.5 | assetCardList[].assetType | String | Variable, 20 | Mandatory | - | Asset Type, refer to AssetCardTypeEnum |
| 2.6 | assetCardList[].holderName | JSON Object | Variable, 0 | Mandatory | - | Holder name |
| 2.6.1 | assetCardList[].holderName.firstName | String | Variable, 64 | Mandatory | - | First name |
| 2.6.2 | assetCardList[].holderName.lastName | String | Variable, 64 | Mandatory | - | Last name |
| 2.7 | assetCardList[].instLogoUrl | String | Variable, 0 | Optional | - | Institution logo URL |
| 2.8 | assetCardList[].instId | String | Variable, 32 | Mandatory | - | Institution identifier |
| 2.9 | assetCardList[].instOfficialName | String | Variable, 32 | Mandatory | - | Institution official name based on instId |
| 2.10 | assetCardList[].expiryYear | String | Fixed, 4 | Mandatory | - | Expiry year on some cards, such as debit card, credit card or virtual account |
| 2.11 | assetCardList[].expiryMonth | String | Fixed, 2 | Mandatory | - | Expiry month on some cards, such as debit card, credit card or virtual account |
| 2.12 | assetCardList[].verified | String | Variable, 5 | Mandatory | - | Flag to determine whether user's card is verified or not. The possible values are true or false |
| 2.13 | assetCardList[].bindingId | String | Fixed, 21 | Optional | - | Asset card bind identifier |
| 2.14 | assetCardList[].defaultAsset | String | Variable, 5 | Optional | - | Asset which used as a default payment for user.The possible values are true or false |
| 2.15 | assetCardList[].enableStatus | String | Variable, 5 | Optional | - | Flag to determine whether status is enabled or not.The possible values are true or false |
| 2.16 | assetCardList[].directDebit | String | Variable, 5 | Optional | - | Flag to determine whether payment with direct debit.The possible values are true or false |

### Response Body Enum Details

#### assetCardList[].contactBizType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | TRANSFER_HIS | TRANSFER_HIS | String | History of transfer transaction |
| 2 | DIRECT_TRANSFER | DIRECT_TRANSFER | String | Transfer from virtual bank card |
| 3 | GENERAL_CARD | GENERAL_CARD | String | Bank card used for general purpose |
| 4 | DIRECTPAY_CARD | DIRECTPAY_CARD | String | Bank card used for direct payment |
| 5 | PAYMENT_CARD | PAYMENT_CARD | String | Bank card for payment card |
| 6 | CASHOUT_CARD | CASHOUT_CARD | String | Bank card used for cashout |
| 7 | IMPS_ACCOUNT | IMPS_ACCOUNT | String | Bank card used for BCA |
| 8 | INVESTMENT_ACCOUNT | INVESTMENT_ACCOUNT | String | Investment account |

#### assetCardList[].assetType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | CHECKING_ACCOUNT | CHECKING_ACCOUNT | String | Checking account |
| 2 | SAVINGS_ACCOUNT | SAVINGS_ACCOUNT | String | User's savings account |
| 3 | LOAN_ACCOUNT | LOAN_ACCOUNT | String | User's loan account |
| 4 | IMPS_ACCOUNT | IMPS_ACCOUNT | String | Immediate payment service account |
| 5 | DEBIT_CARD | DEBIT_CARD | String | User's debit card |
| 6 | CREDIT_CARD | CREDIT_CARD | String | User's credit card |
| 7 | SECURED_CREDIT_CARD | SECURED_CREDIT_CARD | String | Secured credit card |
| 8 | VA_ACCOUNT | VA_ACCOUNT | String | Virtual account |
| 9 | OTC_ACCOUNT | OTC_ACCOUNT | String | On the counter account |
| 10 | REFUND_ACCOUNT | REFUND_ACCOUNT | String | User's refund account |
| 11 | CREDIT_ACCOUNT | CREDIT_ACCOUNT | String | User's credit account |
| 12 | LOAN | LOAN | String | User's loan account paylater |
| 13 | MUTUAL_FUNDS_ACCOUNT | MUTUAL_FUNDS_ACCOUNT | String | User's mutual fund account |
| 14 | INVESTMENT | INVESTMENT | String | User's investment account |

### Response Body Notes

- `verified`: Will be true if status user was verified For **defaultAsset**: Will be true if user used default payment and will be false if user doesn't used the default payment For **enableStatus**: Will be true if enableOnly was true For **directDebit**: Will be true if user used direct debit as a payment

## Response Sample

### JSON

```json
{
    "response": {
    "head": {
      "version": "2.0",
      "function": "dana.member.asset.queryAssetCardList",
      "clientId": "2019052801270371642754",
      "clientSecret": "5f2ef097c0f9464a80e4f0f9c9be85a0",
      "respTime": "2023-10-26T08:27:06+07:00",
      "reqMsgId": "195b7b7a39554c03ee3b1c0e890d172f",
      "reserve": {}
    },
    "body": {
      "resultInfo": {
        "resultStatus": "S",
        "resultCodeId": "00000000",
        "resultCode": "SUCCESS",
        "resultMsg": "success"
      },
      "assetCardList": [
      {
        "contactBizType": "CASHOUT_CARD",
        "cardIndexNo": "29011540001590354",
        "cardNoLength": "17",
        "maskedCardNo": "29011540001590354",
        "assetType": "VA_ACCOUNT",
        "holderName": {
          "firstName": "Wahyu",
          "lastName": "Setiawan"
        },
        "instId": "BCAC1ID",
        "instOfficialName": "BCA BANK CENTRAL ASIA",
        "expiryYear": "9999",
        "expiryMonth": "12",
        "verified": "false",
        "bindingId": "120300002008840365547",
        "defaultAsset": "false",
        "enableStatus": "true",
        "directDebit": "false"
      }
      ]
}
    },
    "signature": "signature string"
}
```

---

## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Query Asset Card List process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Query Asset Card List process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Query Asset Card List process as Failed. Retry request periodically. If error is raising, can contact to DANA to check the process |
