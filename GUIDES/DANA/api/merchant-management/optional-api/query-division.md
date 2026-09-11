# Query Division

```http
POST /dana/merchant/division/queryDivision.htm
```

This API is used to obtain information of division. For the easiest integration, use DANA's Libraries to implement  [Division](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/division.md).

## API Specification

| Field | Value |
| --- | --- |
| Expected Timeout | 3 second |
| SNAP Service Code |  |
| Accept | application/json |
| Content Type | application/json |

---
## Request Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.queryDivision` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | merchantId | String | Fixed, 21 | Conditional | Y:= divisionIdType is `EXTERNAL_ID` | Merchant identifier |
| 2 | divisionId | String | Variable, 64 | Mandatory | - | Division identifier or external identifier. The length is depend on divisionIdType: `INNER_ID`: 21 max`EXTERNAL_ID`: 64 max |
| 3 | divisionIdType | String | Variable, 11 | Mandatory | - | Division identifier type, refer to divisionIdType |

### Request Body Enum Details

#### divisionIdType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | REGION | REGION | String | Division type is region |
| 2 | SUBMERCHANT | SUBMERCHANT | String | Division type is sub merchant |

## Request Sample

### JSON

```json
{
  "request": {
      "head": {
          "version": "2.0",
          "function": "dana.merchant.division.queryDivision",
          "clientId": "2014000014442",
          "clientSecret": "2014000014442",
          "reqTime": "2001-07-04T12:08:56+05:30",
          "reqMsgId": "1234567asdfasdf1123fda",
          "reserve": "{}"
      },
      "body": {
          "merchantId": "211xxxxxxxxxxxxxxx044",
          "divisionId": "211xxxxxxxxxxxxxxx044",
          "divisionIdType": "EXTERNAL_ID"
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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.queryDivision` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | respTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
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
| 2 | divisionResourceInfo | JSON Object | Variable, 0 | Conditional | Y:= Successfully processed | Define the detail of division resource information, refer to divisionResourceInfo |
| 2.1 | divisionResourceInfo.merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 2.2 | divisionResourceInfo.parentRoleType | String | Variable, 17 | Mandatory | - | Type of parent role, refer to parentRoleType |
| 2.3 | divisionResourceInfo.divisionName | String | Variable, 256 | Mandatory | - | Division name |
| 2.4 | divisionResourceInfo.contactAddress | JSON Object | Variable, 0 | Mandatory | - | Contact address, refer to addressInfo |
| 2.4.1 | divisionResourceInfo.contactAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 2.4.2 | divisionResourceInfo.contactAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 2.4.3 | divisionResourceInfo.contactAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 2.4.4 | divisionResourceInfo.contactAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 2.4.5 | divisionResourceInfo.contactAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 2.4.6 | divisionResourceInfo.contactAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 2.4.7 | divisionResourceInfo.contactAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 2.5 | divisionResourceInfo.divisionType | String | Variable, 11 | Mandatory | - | Division type, refer to divisionType |
| 2.6 | divisionResourceInfo.externalDivisionId | String | Variable, 64 | Mandatory | - | External division identifier |
| 2.7 | divisionResourceInfo.logoUrlMap | Array of String | Variable, 0 | Conditional | Y:= Data is exists | Logo URL, the map keys are: `LOGO``PC_LOGO``MOBILE_LOGO` |
| 2.8 | divisionResourceInfo.extInfo | Array of String | Variable, 0 | Conditional | Y:= Data is exists | Extend info, the map keys are: `LOGO``PC_LOGO``MOBILE_LOGO` |
| 2.9 | divisionResourceInfo.mccCodes | Array of String | Variable, 64 | Conditional | Y:= Data is exists | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to Merchant Category Code |
| 2.10 | divisionResourceInfo.divisionId | String | Fixed, 21 | Mandatory | - | Division identifier |
| 2.11 | divisionResourceInfo.parentDivisionId | String | Variable, 64 | Optional | - | Parent division identifier. The length depend on parentRoleType: `MERCHANT`: 21 max`DIVISION`: 21 max`EXTERNAL_DIVISION`: 64 max |
| 2.12 | divisionResourceInfo.pgDivisionFlag | String | Variable, 5 | Optional | - | Flag if division is type PG. The possible values are `true` or `false` |

### Response Body Enum Details

#### divisionResourceInfo.parentRoleType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT | MERCHANT | String | Parent role type is merchant |
| 2 | DIVISION | DIVISION | String | Parent role type is division |
| 3 | EXTERNAL_DIVISION | EXTERNAL_DIVISION | String | Parent role type is external division |

#### divisionResourceInfo.divisionType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | REGION | REGION | String | Division type is region |
| 2 | SUBMERCHANT | SUBMERCHANT | String | Division type is sub merchant |

### Response Body Notes

- `logoUrlMap`: The logo's value is the string which is the image's data encoded with base64 and image type must PNG format.

## Response Sample

### JSON

```json
{
  "response": {
      "head": {
          "version":"2.0",
          "function":"dana.merchant.division.queryDivision",
          "clientId":"211020000000000000044",
          "clientSecret": "2014000014442",
          "respTime":"2001-07-04T12:08:56+05:30",
          "reqMsgId":"1234567asdfasdf1123fda",
          "reserve":"{}"
      },
      "body": {
          "resultInfo": {
              "resultCodeId": "00000000",
              "resultCode": "SUCCESS",
              "resultMsg": "SUCCESS",
              "resultStatus": "S"
          },
          "divisionResourceInfo": {
              "divisionId": "211xxxxxxxxxxxxxxx044",
              "merchantId": "211xxxxxxxxxxxxxxx044",
              "parentRoleType": "MERCHANT",
              "contactAddress": {
                  "country": "indonesia",
                  "province": "province",
                  "city": "city",
                  "area": "area",
                  "address1": "address1",
                  "address2": "address2",
                  "postcode": "zipcode"
              },
              "divisionDescription": "description",
              "divisionType": "REGION",
              "divisionName": "Division-21",
              "externalDivisionId": "35205452Division",
              "pgDivisionFlag": "true"
          }
      }
  },
"signature": "signature string"
}
```

---

## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Query Division process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Query Division process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Query Division process as Failed. Retry request periodically |
