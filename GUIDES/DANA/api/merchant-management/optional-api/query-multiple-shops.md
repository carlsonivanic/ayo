# Query Multiple Shops

```http
POST /dana/merchant/shop/getShopListMulti.htm
```

This API is used to obtain information of multiple shop information. For the easiest integration, use DANA's Libraries to implement  [Shop](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/shop.md).

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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain Value: `dana.merchant.shop.getShopListMulti` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | shopIdInfoList | Array of JSON Object | Variable, 0 | Mandatory | - | List of merchant and external shop identifier, refer to shopIdInfo |
| 1.1 | shopIdInfoList[].merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 1.2 | shopIdInfoList[].externalShopId | String | Variable, 64 | Mandatory | - | External shop identifier |
| 2 | pageNum | String | Variable, 0 | Optional | - | Page number |
| 3 | pageSize | String | Variable, 0 | Optional | - | Page size |

## Request Sample

### JSON

```json
{
  "request": {
    "head": {
"version": "2.0",
"function": "dana.merchant.shop.getShopListMulti",
"clientId": "2014000014442",
"clientSecret": "2014000014442",
"reqTime": "2001-07-04T12:08:56+07:00",
"reqMsgId": "1234567asdfasdf1123fda",
"reserve": "{}"
    },
    "body": {
"shopIdInfoList": [
  {
    "merchantId": "216620000000000000000",
    "externalShopId": "2018000554980"
  },
  {
    "merchantId": "216620000000000000000",
    "externalShopId": "2018000554990"
  }
],
"pageNum": "1",
"pageSize": "10"
    }
  },
  "signature":"signature"
}
```

---

## Response Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain Value: `dana.merchant.shop.getShopListMulti` |
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
| 1.1 | resultInfo.resultStatus | String | Fixed, 1 | Mandatory | - | Result status, refer to result code list ResultStatus The status of the request can be: - `S`: Success - `F`: Failure - `U`: Unknown Can be added if these 3 statuses are insufficient for business requirements |
| 1.2 | resultInfo.resultCodeId | String | Variable, 16 | Mandatory | - | Result code identifier, refer to result code list ResultCodeId |
| 1.3 | resultInfo.resultCode | String | Variable, 64 | Mandatory | - | Result code string, refer to ResultCode |
| 1.4 | resultInfo.resultMsg | String | Variable, 256 | Optional | - | Result message, refer to result code list ResultMsg |
| 2 | shopResourceInfoList | Array of JSON Object | Variable, 0 | Conditional | Y:= Successfully processed | Define the detail of shop resource information, refer to shopResourceInfo |
| 2.1 | shopResourceInfoList[].shopId | String | Fixed, 21 | Mandatory | - | Shop identifier |
| 2.2 | shopResourceInfoList[].merchantId | String | Fixed, 21 | Conditional | Y:= Successfully processed | Merchant identifier |
| 2.3 | shopResourceInfoList[].parentDivisionId | String | Variable, 0 | Optional | - | Parent division identifier. The length depend on parentRoleType: - `MERCHANT:` 21 max - `DIVISION:` 21 max - `EXTERNAL_DIVISION`:64 max |
| 2.4 | shopResourceInfoList[].parentRoleType | String | Variable, 17 | Optional | - | Type of parent role, refer to parentRoleType |
| 2.5 | shopResourceInfoList[].shopDesc | String | Variable, 1024 | Optional | - | Shop description |
| 2.6 | shopResourceInfoList[].mainName | String | Variable, 256 | Mandatory | - | Shop name |
| 2.7 | shopResourceInfoList[].sizeType | String | Variable, 4 | Mandatory | - | Size type, refer to sizeType |
| 2.8 | shopResourceInfoList[].shopAddress | JSON Object | Variable, 0 | Optional | - | Shop address, refer to addressInfo |
| 2.8.1 | shopResourceInfoList[].shopAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 2.8.2 | shopResourceInfoList[].shopAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 2.8.3 | shopResourceInfoList[].shopAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 2.8.4 | shopResourceInfoList[].shopAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 2.8.5 | shopResourceInfoList[].shopAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 2.8.6 | shopResourceInfoList[].shopAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 2.8.7 | shopResourceInfoList[].shopAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 2.9 | shopResourceInfoList[].externalShopId | String | Variable, 64 | Optional | - | External shop identifier |
| 2.10 | shopResourceInfoList[].logoUrlMap | Array of String | Variable, 0 | Optional | - | Logo URL, the map keys are: - `LOGO` - `PC_LOGO` - `MOBILE_LOGO` |
| 2.11 | shopResourceInfoList[].extInfo | Array of String | Variable, 0 | Optional | - | Extend info, the map keys are: - `LOGO` - `PC_LOGO` - `MOBILE_LOGO` |
| 2.12 | shopResourceInfoList[].mccCodes | Array of String | Variable, 64 | Optional | - | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to MCC |
| 2.13 | shopResourceInfoList[].ln | String | Variable, 10 | Optional | - | Longitude of shop's location |
| 2.14 | shopResourceInfoList[].lat | String | Variable, 10 | Optional | - | Latitude of shop's location |
| 2.15 | shopResourceInfoList[].taxNo | String | Fixed, 15 | Optional | - | Tax number (NPWP) |
| 2.16 | shopResourceInfoList[].brandName | String | Variable, 256 | Optional | - | Brand name on legal name or tax name |
| 2.17 | shopResourceInfoList[].taxAddress | JSON Object | Variable, 0 | Optional | - | Tax address, refer to addressInfo |
| 2.17.1 | shopResourceInfoList[].taxAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 2.17.2 | shopResourceInfoList[].taxAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 2.17.3 | shopResourceInfoList[].taxAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 2.17.4 | shopResourceInfoList[].taxAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 2.17.5 | shopResourceInfoList[].taxAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 2.17.6 | shopResourceInfoList[].taxAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 2.17.7 | shopResourceInfoList[].taxAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 3 | count | String | Variable, 0 | Optional | - | Number of selected data |
| 4 | pageNum | String | Variable, 0 | Optional | - | Page number |
| 5 | pageSize | String | Variable, 0 | Optional | - | Page size |
| 6 | hasNext | String | Variable, 5 | Optional | - | Determine whether the data is on the last page or not. The possible values are `true` or `false` |

### Response Body Enum Details

#### shopResourceInfoList[].parentRoleType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT | MERCHANT | String | Parent role type is merchant |
| 2 | DIVISION | DIVISION | String | Parent role type is division |
| 3 | EXTERNAL_DIVISION | EXTERNAL_DIVISION | String | Parent role type is external division |

#### shopResourceInfoList[].sizeType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | UMI | UMI | String | Usaha Mikro |
| 2 | UKE | UKE | String | Usaha Kecil |
| 3 | UME | UME | String | Usaha Menengah |
| 4 | UBE | UBE | String | Usaha Besar |
| 5 | URE | URE | String | Usaha Reguler |

### Response Body Notes

- `logoUrlMap`: The logo's value is the string which is the image's data encoded with base64 and image type must PNG format.
- `hasNext`: Will be `false` if the data on the last page

## Response Sample

### JSON

```json
{
  "response": {
    "head": {
"version":"2.0",
"function":"dana.merchant.shop.getShopListMulti",
"clientId":"211020000000000000044",
"clientSecret": "2014000014442",
"respTime":"2001-07-04T12:08:56+05:30",
"reqMsgId":"1234567asdfasdf1123fda",
"reserve":"{}"
    },
    "body": {
"resultInfo": {
  "resultStatus": "S",
  "resultCodeId": "00000000",
  "resultCode": "SUCCESS",
  "resultMsg":"success"
},
"shopResourceInfoList": [
  {
    "merchantId": "216620000000000000000",
    "parentDivisionId": "216650000000000000000",
    "sizeType": "UBE",
    "taxNo": "123456789012345",
    "mainName": "divisionName1",
    "shopId": "216660000000000000000",
    "externalShopId": "2018000554980",
    "shopAddress": {
      "country": "Indonesia",
      "province": "Jawa Timur",
      "city": "Malang",
      "area": "Araya",
      "address1": "address1",
      "address2": "address2",
      "postcode": "65153"
    },
    "logoUrlMap": {
      "LOGO": "http://a.b.c",
      "PC_LOGO": "http://a.b.c",
      "MOBILE_LOGO": "http://a.b.c"
    },
    "extInfo": {
      "test": "test"
    },
    "mccCodes": [
      "341",
      "222"
    ],
    "taxAddress": {
      "country": "Indonesia",
      "province": "DKI Jakarta",
      "city": "Jakarta",
      "area": "area",
      "address1": "address1",
      "address2": "address2",
      "postcode": "14123"
    }
  },
  {
    "merchantId": "216620000000000000000",
    "parentDivisionId": "216650000000000000000",
    "sizeType": "UBE",
    "taxNo": "123456789012345",
    "mainName": "divisionName2",
    "shopId": "216660000000000000000",
    "externalShopId": "2018000554990"
  }
],
"count": "2",
"pageNum": "1",
"pageSize": "10",
"hasNext": "false"
    }
  },
  "signature": "no signature"
}
```

---

## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Query Multiple Shops process as <strong>Success</strong> |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Query Multiple Shops process as <strong>Failed</strong>. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Query Multiple Shops process as <strong>Failed</strong>. Retry request periodically |
