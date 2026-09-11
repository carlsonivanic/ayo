# Check Disbursement Account

```http
POST dana/merchant/queryMerchantResource.htm
```

This API is used to check merchant's account balance for disbursement account. For the easiest integration, use DANA's Libraries to implement  [Disbursement to Balance](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-balance.md) or [Disbursement to Bank](https://dashboard.dana.id/api-docs-v2/llms/guide/disbursement/disbursement-to-bank.md) .

## API Specification

| Field | Value |
| --- | --- |
| Expected Timeout | 8 second |
| SNAP Service Code | - |
| Accept | application/json |
| Content Type | application/json |

---
## Request Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.queryMerchantResource` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | requestMerchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 2 | merchantResourceInfoList | Array of String | Variable, 0 | Mandatory | - | Merchant resource information for request.Refer to MerchantResourceEnum for the possible values |

### Request Body Enum Details

#### merchantResourceInfoList
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT_AVAILABLE_BALANCE | MERCHANT_AVAILABLE_BALANCE | String | Query the available balance that can be used by merchant |
| 2 | MERCHANT_TOTAL_BALANCE | MERCHANT_TOTAL_BALANCE | String | Query the total balance, which combine the Merchant Payable Account and the Merchant Settlement Account |
| 3 | MERCHANT_DEPOSIT_BALANCE | MERCHANT_DEPOSIT_BALANCE | String | Query the deposit balance that can be used by merchant for disbursement solution |

## Request Sample

### JSON

```json
{
    "request": {
        "head": {
            "version": "2.0",
            "function": "dana.merchant.queryMerchantResource",
            "clientId": "201xxxx",
            "clientSecret": "201xxx",
            "reqTime": "2019-09-18T10:21:53+07:00",
            "reqMsgId": "1234567asdfasdf1123fda",
            "reserve": "{}"
        },
        "body": {
            "requestMerchantId": "216xxxxxxxxxxxxxx",
            "merchantResourceInfoList": [
                "MERCHANT_DEPOSIT_BALANCE"
            ]
        }
    },
    "signature": "signature string"
}
```

---

## Response Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.queryMerchantResource` |
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
| 1.1 | resultInfo.resultStatus | String | Fixed, 1 | Mandatory | - | Result status, refer to result code list ResultStatusThe status of the request can be:`S`: Success`F`: Failure`U`: UnknownCan be added if these 3 statuses are insufficient for business requirements |
| 1.2 | resultInfo.resultCodeId | String | Variable, 16 | Mandatory | - | Result code identifier, refer to result code list ResultCodeId |
| 1.3 | resultInfo.resultCode | String | Variable, 64 | Mandatory | - | Result code string, refer to ResultCode |
| 1.4 | resultInfo.resultMsg | String | Variable, 256 | Optional | - | Result message, refer to result code list ResultMsg |
| 2 | merchantResourceInformations | Array of JSON Object | Variable, 0 | Conditional | Y:= Successfully processed | Define the detail of merchant resource information |
| 2.1 | merchantResourceInformations[].resourceType | String | Variable, 0 | Mandatory | - | The type of returned resource |
| 2.2 | merchantResourceInformations[].value | String | Variable, 0 | Conditional | Y:= Value is exist | Value on resource type. Contains two sub-fields:`amount`: Value of amount. Need to provide the amount in the smallest common currency unit. For most, this is the amount in cents (or pence, or similarly named unit). For example: To create a charge for $1.00, set amount=100 (100 cents)`currency`: Currency |

### Response Body Enum Details

#### merchantResourceInformations[].resourceType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT_AVAILABLE_BALANCE | MERCHANT_AVAILABLE_BALANCE | String | Query the available balance that can be used by merchant |
| 2 | MERCHANT_TOTAL_BALANCE | MERCHANT_TOTAL_BALANCE | String | Query the total balance, which combine the Merchant Payable Account and the Merchant Settlement Account |
| 3 | MERCHANT_DEPOSIT_BALANCE | MERCHANT_DEPOSIT_BALANCE | String | Query the deposit balance that can be used by merchant for disbursement solution |

## Response Sample

### JSON

```json
{
  "response":{
"head":{
  "version":"2.0",
  "function":"dana.merchant.queryMerchantResource",
  "clientId":"201xxxx",
  "clientSecret":"201xxx",
  "reqTime":"2019-09-18T10:21:53+07:00",
  "reqMsgId":"1234567asdfasdf1123fda",
  "reserve":"{}"
},
"body":{
  "resultInfo":{
      "resultStatus":"S",
      "resultCodeId":"00000000",
      "resultCode":"SUCCESS",
      "resultMsg":"success"
  },
  "merchantResourceInformations":[
      {
        "resourceType":"MERCHANT_DEPOSIT_BALANCE",
        "value":"{\"amount\":\"0\",\"currency\":\"IDR\"}"
      }
  ]
}
  },
  "signature":"signature string"
}
```

---

## Response Codes

| No | Response Code | Response Message | Remarks | Partner Action |
| --- | --- | --- | --- | --- |
| 1 |  |  |  | Mark Check Disbursement Account process as Success |
| 2 |  |  |  | Mark Check Disbursement Account process as Failed. Retry request with proper parameter |
| 3 |  |  |  | Mark Check Disbursement Account process as Failed. Retry request periodically |
| 4 |  |  |  | Mark Check Disbursement Account process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
