# Query User Profile

```http
POST /dana/member/query/queryUserProfile.htm
```

## API Specification

| Item | Value |
| --- | --- |
| Expected Timeout | `8 second` |
| SNAP Service Code | `-` |
| Accept | `application/json` |
| Content-Type | `application/json` |

## Request Headers

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `version` | String | Variable, 8 max | Mandatory | - | API version. As per the respective API reference |
| 2 | `function` | String | Variable, 128 max | Mandatory | - | According to specifications defined by each business domain. Value: `dana.member.query.queryUserProfile` |
| 3 | `clientId` | String | Variable, 36 max | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | `clientSecret` | String | Variable, 64 max | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | `reqTime` | String | Fixed, 25 max | Mandatory | - | Request time, in format YYYY-MM-DDTHH:MM:SS+07:00. Time must be in GMT+7 (Jakarta time) |
| 6 | `reqMsgId` | String | Variable, 64 max | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | `accessToken` | String | Variable, 512 max | Mandatory | - | Contains customer token, which has been obtained from binding process |
| 8 | `reserve` | String | Variable, 256 max | Optional | - | Reserved for future implementation (Key/Value) |

## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `userResources` | Array of String | Variable, 0 max | Mandatory | - | The resource type list that the merchant wants to get from DANA. Refer to UserResourceEnum for the detail of value. **Notes:** If merchant want to fetch `USER_KYC` resource, make sure when doing binding to include `MINI_DANA` in scopes parameter and UserResourceEnum depends on the merchant's resource scope during the onboarding process. If the resource doesn't exist, the ResultCode will return `RESOURCE_NOT_DEFINED` |

### Request Body Enum Details

#### userResources

| No | Name | Type | Remarks |
| --- | --- | --- | --- |
| 1 | `BALANCE` | String | Query balance of user in DANA |
| 2 | `TOPUP_URL` | String | Obtain the top up URL for merchant to redirect |
| 3 | `TRANSACTION_URL` | String | Obtain the transaction URL for merchant to redirect |
| 4 | `OTT` | String | Obtain the OTT of URLs including TOPUP/TRANSACTION/CASHIER/CHECKOUT_URL |
| 5 | `MASK_DANA_ID` | String | The masked identifier from DANA side |
| 6 | `USER_KYC` | String | KYC level. - 00 = KYC level 0 - 02 = KYC level 2 |
| 7 | `LOGIN_ID` | String | Login identifier of the user, currently it's only set to phone number |
| 8 | `CLEAR_TEXT_DANA_ID` | String | The unmasked identifier from DANA side |
| 9 | `NICKNAME` | String | Nickname of the user in DANA |
| 10 | `FULLNAME` | String | Full name of the user in DANA |
| 11 | `KTP_NUMBER` | String | KTP number of the user in DANA |
| 12 | `KTP_PHOTO_DATA` | String | KTP photo binary data in base64 of the user in DANA |
| 13 | `SELFIE_PHOTO_DATA` | String | Selfie photo binary data in base64 of the user in DANA |
| 14 | `AVATAR_URL` | String | Location of avatar photo of the user in DANA |
| 15 | `MASKED_FULLNAME` | String | Masked full name of the user in DANA |

## Request Sample

### JSON

```json
{
"request": {
"head": {
"version": "2.0",
"function": "dana.member.query.queryUserProfile",
"clientId": "2014000014442",
"clientSecret": "2014000014442",
"reqTime": "2001-07-04T12:08:56+07:00",
"reqMsgId": "1234567asdfasdf1123fda",
"accessToken": "xxxxx",
"reserve": "{}"
},
"body": {
"userResources": ["BALANCE", "TOPUP_URL", "OTT"]
}
},
"signature": "signature string"
       }
```

## Response Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `version` | String | Variable, 8 max | Mandatory | - | API version. As per the respective API reference |
| 2 | `function` | String | Variable, 128 max | Mandatory | - | According to specifications defined by each business domain. Value: `dana.member.query.queryUserProfile` |
| 3 | `clientId` | String | Variable, 36 max | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | `clientSecret` | String | Variable, 64 max | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | `respTime` | String | Fixed, 25 max | Mandatory | - | Response time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 6 | `reqMsgId` | String | Variable, 64 max | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | `accessToken` | String | Variable, 512 max | Mandatory | - | Contains customer token, which has been obtained from binding process |
| 8 | `reserve` | String | Variable, 256 max | Optional | - | Reserved for future implementation (Key/Value) |

## Response Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `resultInfo` | JSON Object | Variable, 0 max | Mandatory | - | Define the detail of result information |
| 2 | `resultInfo.resultStatus` | String | Fixed, 1 max | Mandatory | - | Result status, refer to result code list ResultStatus The status of the request can be: - `S`: Success - `F`: Failure - `U`: Unknown Can be added if these 3 statuses are insufficient for business requirements |
| 3 | `resultInfo.resultCodeId` | String | Variable, 16 max | Mandatory | - | Result code identifier, refer to result code list ResultCodeId |
| 4 | `resultInfo.resultCode` | String | Variable, 64 max | Mandatory | - | Result code string, refer to ResultCode |
| 5 | `resultInfo.resultMsg` | String | Variable, 256 max | Optional | - | Result message, refer to result code list ResultMsg |
| 6 | `userResourceInfos` | Array of JSON Object | Variable, 0 max | Conditional | Y:= Successfully processed | The user's information from querying resource value |
| 7 | `userResourceInfos[].resourceType` | String | Variable, 0 max | Mandatory | - | The type of returned resource, refer to UserResourceEnum **Notes:** UserResourceEnum depends on the merchant's resource scope during the onboarding process. If the resource doesn't exist, the ResultCode will return `RESOURCE_NOT_DEFINED` |
| 8 | `userResourceInfos[].value` | String | Variable, 0 max | Conditional | Y:= Value is exist | Value on resource type |

### Response Body Enum Details

#### userResourceInfos[].resourceType

| No | Name | Type | Remarks |
| --- | --- | --- | --- |
| 1 | `BALANCE` | String | Query balance of user in DANA. Contains two sub-fields: - `amount`: Value of amount. Need to provide the amount in the smallest common currency unit. For most, this is the amount in cents (or pence, or similarly named unit). For example: To create a charge for $1.00, set amount=100 (100 cents) - `currency`: Currency |
| 2 | `TOPUP_URL` | String | Obtain the top up URL for merchant to redirect |
| 3 | `TRANSACTION_URL` | String | Obtain the transaction URL for merchant to redirect |
| 4 | `OTT` | String | Obtain the OTT of URLs including TOPUP/TRANSACTION/CASHIER/CHECKOUT_URL |
| 5 | `MASK_DANA_ID` | String | The masked identifier from DANA side |
| 6 | `USER_KYC` | String | KYC level. - 00 = KYC level 0 - 02 = KYC level 2 |
| 7 | `LOGIN_ID` | String | Login identifier of the user, currently it's only set to phone number |
| 8 | `CLEAR_TEXT_DANA_ID` | String | The unmasked identifier from DANA side |
| 9 | `NICKNAME` | String | Nickname of the user in DANA |
| 10 | `FULLNAME` | String | Full name of the user in DANA |
| 11 | `KTP_NUMBER` | String | KTP number of the user in DANA |
| 12 | `KTP_PHOTO_DATA` | String | KTP photo binary data in base64 of the user in DANA |
| 13 | `SELFIE_PHOTO_DATA` | String | Selfie photo binary data in base64 of the user in DANA |
| 14 | `AVATAR_URL` | String | Location of avatar photo of the user in DANA |
| 15 | `MASKED_FULLNAME` | String | Masked full name of the user in DANA |

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
"userResourceInfos":[
{"resourceType": "BALANCE",
"value": "{\"amount\":\"123\",\"currency\":\"IDR\"}"},
{"resourceType": "TOPUP_URL",
"value": "http://m.dana.xxx"},
{"resourceType": "OTT",
"value": "safsaerqwr"}
]
}
},
"signature":"signature string"
}
```

## Response Codes

| No | Result Status | Result Code ID | Result Code | Result Message | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | Success | Mark Query User Profile process as Success |
| 2 | `F` | `12002005` | `USER_NOT_EXIST` | User does not exist | Mark Query User Profile process as Failed. Retry request with proper parameter or can contact to DANA to check the user/account status |
| 3 | `F` | `12002006` | `USER_STATUS_ABNORMAL` | User status is not normal | Mark Query User Profile process as Failed. Retry request with proper parameter or can contact to DANA to check the user/account status |
| 4 | `F` | `12014201` | `TOKEN_FORBIDDEN_ACCESS_RESOURCES` | This accessToken can't access all apply resources | Mark Query User Profile process as Failed. Retry request with proper parameter |
| 5 | `F` | `12014202` | `RESOURCE_NOT_DEFINE` | Resource not define | Mark Query User Profile process as Failed. Retry request with proper parameter |
| 6 | `F` | `12014203` | `MERCHANT_NOT_EXIST` | Merchant not exist | Mark Query User Profile process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
