# Create Division

```http
POST /dana/merchant/division/createDivision.htm
```

This API is used to create a new division. For the easiest integration, use DANA's Libraries to implement  [Division](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/division.md).

## API Specification

| Field | Value |
| --- | --- |
| Expected Timeout | 5 second |
| SNAP Service Code |  |
| Accept | application/json |
| Content Type | application/json |

---
## Request Head

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | version | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference |
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.createDivision` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | apiVersion | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference. **Notes:** apiVersion > 2 |
| 2 | merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 3 | parentDivisionId | String | Variable, 64 | Conditional | Y:= parentRoleType value is `DIVISION` or `EXTERNAL_DIVISION` | Parent division identifier. The length depends on parentRoleType: `DIVISION`: 21 max; `EXTERNAL_DIVISION`: 64 max. |
| 4 | parentRoleType | String | Variable, 17 | Mandatory | - | Type of parent role, refer to parentRoleType |
| 5 | divisionName | String | Variable, 256 | Mandatory | - | Division name |
| 6 | divisionAddress | JSON Object | Variable, 0 | Mandatory | - | Division address, refer to addressInfo |
| 6.1 | divisionAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 6.2 | divisionAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 6.3 | divisionAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 6.4 | divisionAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 6.5 | divisionAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 6.6 | divisionAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 6.7 | divisionAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 7 | divisionDescription | String | Variable, 1024 | Optional | - | Division description |
| 8 | divisionType | String | Variable, 11 | Mandatory | - | Division type, refer to divisionType |
| 9 | externalDivisionId | String | Variable, 64 | Mandatory | - | External division identifier |
| 10 | logoUrlMap | Array of String | Variable, 0 | Optional | - | Logo URL, the map keys are: `LOGO`, `PC_LOGO`, `MOBILE_LOGO`. |
| 11 | extInfo | JSON Object | Variable, 0 | Mandatory | - | Extended information. For the details, refer to extInfo params |
| 11.1 | extInfo.PIC_EMAIL |  |  | Mandatory |  | Shop's PIC email address |
| 11.2 | extInfo.PIC_PHONENUMBER |  |  | Mandatory |  | Shop's PIC phone number |
| 11.3 | extInfo.SUBMITTER_EMAIL |  |  | Mandatory |  | Submitter email address |
| 11.4 | extInfo.GOODS_SOLD_TYPE |  |  | Mandatory |  | Type of the product business. The possible values are: `DIGITAL` `NON_DIGITAL` `SERVICES` |
| 11.5 | extInfo.USECASE |  |  | Mandatory |  | Use case of the available products. The possible values are: `QRIS_DIGITAL`, `QRIS_NON_DIGITAL`, `QRIS_SERVICE`, `WIDGET_DIGITAL`, `WIDGET_NON_DIGITAL`, `WIDGET_SERVICE`, `DISBURSE_REFUND`, `DISBURSE_GAMIFICATION`, `DISBURSE_MONEY_TRANSFER`. |
| 11.6 | extInfo.USER_PROFILING |  |  | Mandatory |  | This param is used for merchants to inform DANA whether the target customers for their products are B2B or end user |
| 11.7 | extInfo.AVG_TICKET |  |  | Mandatory |  | Average daily transactions |
| 11.8 | extInfo.OMZET |  |  | Mandatory |  | Annual transaction revenue. The possible values are: `<2BIO`, `2BIO-5BIO`, `5BIO-10BIO`, `>10BIO`. |
| 11.9 | extInfo.EXT_URLS |  |  | Mandatory |  | Extension URL. This param is used to upload image for products sold |
| 11.10 | extInfo.BRAND_NAME |  |  | Mandatory |  | The brand's legal name |
| 12 | mccCodes | Array of String | Variable, 64 | Mandatory | - | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to Merchant Category Code |
| 13 | businessDocs | Array of JSON Object | Variable, 0 | Mandatory | - | Business document, refer to businessDoc |
| 13.1 | businessDocs[].docType | String | Variable, 8 | Mandatory | - | Business document type, refer to ownerIdType |
| 13.2 | businessDocs[].docId | String | Variable, 16 | Mandatory | - | Business document identifier number. The length depend on docType: `KTP`: 16`SIM`: 12-14`Passport`: 8`NIB`: >= 13`SIUP`: Free text |
| 13.3 | businessDocs[].docFile | String (base64) | Variable, 0 | Mandatory | - | Business document file in base64 String, accepted file extensions: PDF, GIF, PNG |
| 14 | businessEntity | String | Variable, 12 | Mandatory | - | Business entity, refer to businessEntity |
| 15 | ownerName | JSON Object | Variable, 0 | Mandatory | - | Owner name, refer to userName |
| 15.1 | ownerName.firstName | String | Variable, 64 | Mandatory | - | First name |
| 15.2 | ownerName.lastName | String | Variable, 64 | Mandatory | - | Last name |
| 16 | ownerPhoneNumber | JSON Object | Variable, 0 | Mandatory | - | Owner phone number, refer to mobileNoInfo |
| 16.1 | ownerPhoneNumber.mobileId | String | Variable, 32 | Mandatory | - | Mobile identifier |
| 16.2 | ownerPhoneNumber.mobileNo | String | Variable, 32 | Mandatory | - | Mobile phone number |
| 16.3 | ownerPhoneNumber.verified | String | Variable, 5 | Mandatory | - | Flag for verified mobile, the possible values are `true` or `false` |
| 17 | ownerIdType | String | Variable, 8 | Mandatory | - | Owner identifier type, refer to ownerIdType |
| 18 | ownerIdNo | String | Variable, 16 | Mandatory | - | Owner identifier number. The length depend on ownerIdType: `KTP`: 16`SIM`: 12-14`Passport`: 8`NIB`: >= 13`SIUP`: Free text |
| 19 | ownerAddress | JSON Object | Variable, 0 | Mandatory | - | Owner address, refer to addressInfo |
| 19.1 | ownerAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 19.2 | ownerAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 19.3 | ownerAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 19.4 | ownerAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 19.5 | ownerAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 19.6 | ownerAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 19.7 | ownerAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 20 | directorPics | Array of JSON Object | Variable, 0 | Mandatory | - | Director as a PIC of sub merchant, refer to businessPic |
| 20.1 | directorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 20.2 | directorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 21 | nonDirectorPics | Array of JSON Object | Variable, 0 | Mandatory | - | Non director which become an PIC of sub merchant, refer to businessPic |
| 21.1 | nonDirectorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 21.2 | nonDirectorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 22 | sizeType | String | Variable, 4 | Mandatory | - | Size type, refer to sizeType |
| 23 | pgDivisionFlag | String | Variable, 5 | Optional | - | Flag if division is type PG. The possible values are `true` or `false` |

### Request Body Enum Details

#### parentRoleType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT | MERCHANT | String | Parent role type is merchant |
| 2 | DIVISION | DIVISION | String | Parent role type is division |
| 3 | EXTERNAL_DIVISION | EXTERNAL_DIVISION | String | Parent role type is external division |

#### divisionType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | REGION | REGION | String | Division type is region |
| 2 | SUBMERCHANT | SUBMERCHANT | String | Division type is sub merchant |

#### businessDocs[].docType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | KTP | KTP | String | Use KTP as an owner identifier |
| 2 | SIM | SIM | String | Use SIM as an owner identifier |
| 3 | PASSPORT | PASSPORT | String | Use passport as an owner identifier |
| 4 | NIB | NIB | String | Use Nomor Induk Berusaha (NIB) as an owner identifier |
| 5 | SIUP | SIUP | String | Use Surat Izin Usaha Perdagangan (SIUP) as an owner identifier |

#### businessEntity
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | individu | individu | String | Business is individual |
| 2 | pt | pt | String | Business entity is Perseroan Terbatas (PT) |
| 3 | cv | cv | String | Business entity is Commanditaire Vennootschap/Persekutuan Komanditer (CV) |
| 4 | yayasan | yayasan | String | Business entity is foundation |
| 5 | usaha_dagang | usaha_dagang | String | Business entity is market |
| 6 | koperasi | koperasi | String | Business entity is Koperasi |

#### ownerIdType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | KTP | KTP | String | Use KTP as an owner identifier |
| 2 | SIM | SIM | String | Use SIM as an owner identifier |
| 3 | PASSPORT | PASSPORT | String | Use passport as an owner identifier |
| 4 | NIB | NIB | String | Use Nomor Induk Berusaha (NIB) as an owner identifier |
| 5 | SIUP | SIUP | String | Use Surat Izin Usaha Perdagangan (SIUP) as an owner identifier |

#### sizeType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | UMI | UMI | String | Usaha Mikro |
| 2 | UKE | UKE | String | Usaha Kecil |
| 3 | UME | UME | String | Usaha Menengah |
| 4 | UBE | UBE | String | Usaha Besar |
| 5 | URE | URE | String | Usaha Reguler |

### Request Body Notes

- `logoUrlMap`: The logo's value is the string which is the image's data encoded with base64 and image type must PNG format.
- `PIC_PHONENUMBER`: DANA will check the phone number format, contains: `^(62|\\+62|62-|0)?(?!0+)(?=8)(\\d{9,12})$`
- `PIC_EMAIL`: DANA will check the email format
- `SUBMITTER_EMAIL`: DANA will check the email format
- `businessDocs`: BusinessEntity `individu` can only use businessDoc.docType `KTP` and `SIM` Other BusinessEntity can only use `SIUP` and `NIB`

## Request Sample

### JSON

```json
{
    "request": {
      "head": {
        "version": "2.0",
        "function": "dana.merchant.division.createDivision",
        "clientId": "2014000014442",
        "clientSecret": "2014000014442",
        "reqTime": "2022-03-22T14:45:43+07:00",
        "reqMsgId": "1234567asdfasdf1123fda",
        "reserve": "{}"
      },
      "body": {
        "apiVersion": "3",
        "merchantId": "216622222444445555555",
        "parentDivisionId": "216622222444445555555",
        "parentRoleType": "MERCHANT",
        "divisionName": "divisionName1",
        "divisionAddress": {
          "country": "country",
          "province": "province",
          "city": "city",
          "area": "area",
          "address1": "address1",
          "address2": "address2",
          "postcode": "postcode"
        },
        "divisionDescription": "description",
        "divisionType": "REGION",
        "externalDivisionId": "division1",
        "logoUrlMap": {
          "PC_LOGO": "base64ImageCodexxxxxxxxxxx"
        },
        "extInfo": {
          "PIC_EMAIL": "myshop_pic@email.com",
          "PIC_PHONENUMBER": "62-81234567890",
          "SUBMITTER_EMAIL": "admin_merchant@email.com",
          "GOODS_SOLD_TYPE": "DIGITAL",
          "USECASE": "QRIS_DIGITAL",
          "USER_PROFILING": "B2B",
          "AVG_TICKET": "100000-500000",
          "OMZET": "5BIO-10BIO",
          "EXT_URLS": "https://www.instagram.com",
          "BRAND_NAME": "MY SHOP"
        },
        "mccCodes": ["0783"],
        "businessDocs": {
          "docId": "31xxxxxxxxxxxx00",
          "docType": "KTP",
          "docFile": "stringbase64value"
        },
        "businessEntity": "individu",
        "ownerName": {
          "firstName": "Udin",
          "lastName": "Sukiman"
        },
        "ownerPhoneNumber": {
          "mobileId": "12xxxxx23",
          "mobileNo": "62-xxxxxxxxx12",
          "verified": "true"
        },
        "ownerIdType": "KTP",
        "ownerIdNo": "31xxxxxxxxxxxx00",
        "ownerAddress": {
          "country": "Indonesia",
          "province": "DKI Jakarta",
          "city": "Kota Jakarta Selatan",
          "area": "Kebayoran Lama",
          "address1": "Jl. Kebayoran Lama 1 No. 2",
          "address2": "Jl. Kebayoran Lama 1 No. 3",
          "postcode": "14045",
          "subDistrict": "test"
        },
        "directorPics": [
        {
          "picName": "John",
          "picPosition": "CTO"
        }
        ],
        "nonDirectorPics": [
        {
          "picName": "Ethan",
          "picPosition": "CEO"
        }
        ],
        "sizeType": "URE",
        "pgDivisionFlag": "true"
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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.createDivision` |
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
| 1.1 | resultInfo.resultStatus | String | Fixed, 1 | Mandatory | - | Result status, refer to result code list. The status of the request can be: `S` for Success, `F` for Failure, or `U` for Unknown. Additional statuses can be added if these three are insufficient for business requirements. |
| 1.2 | resultInfo.resultCodeId | String | Variable, 16 | Mandatory | - | Result code identifier, refer to result code list ResultCodeId |
| 1.3 | resultInfo.resultCode | String | Variable, 64 | Mandatory | - | Result code string, refer to ResultCode |
| 1.4 | resultInfo.resultMsg | String | Variable, 256 | Optional | - | Result message, refer to result code list ResultMsg |
| 2 | divisionId | String | Fixed, 21 | Conditional | Y:= pgISV is `false` | Division identifier |
| 3 | merchantApprovalProcessTicketId | String | Variable, 0 | Conditional | Y:= Applied to aggregator merchants that have multiple entities as division | A unique identifier issued to the merchant upon submission |

### Response Body Notes

- `merchantApprovalProcessTicketId`: This ticket will be reviewed and approved by the DANA team. Once the approval process is completed, DANA will generate and provide the Division Identifier via email.

## Response Sample

### 1. Non Aggregator (Division)

```json
{
  "response": {
    "head": {
"version": "2.0",
"function": "dana.merchant.division.createDivision",
"clientId": "211020000000000000044",
"clientSecret": "2014000014442",
"respTime": "2022-03-22T14:45:43+07:00",
"reqMsgId": "1234567asdfasdf1123fda",
"reserve": "{}"
    },
    "body": {
"resultInfo": {
  "resultStatus": "S",
  "resultCodeId": "00000000",
  "resultCode": "SUCCESS",
  "resultMsg": "success"
},
"divisionId": "2166522222222222"
    }
  },
"signature": "signature string"
}
```

### 2. Aggregator

```json
{
  "response": {
    "head": {
"version": "2.0",
"function": "dana.merchant.division.createDivision",
"clientId": "211020000000000000044",
"clientSecret": "2014000014442",
"respTime": "2022-03-22T14:45:43+07:00",
"reqMsgId": "1234567asdfasdf1123fda",
"reserve": "{}"
    },
    "body": {
"resultInfo": {
  "resultStatus": "S",
  "resultCodeId": "00000000",
  "resultCode": "SUCCESS",
  "resultMsg": "success"
},
"merchantApprovalProcessTicketId": "53789407"
    }
  },
"signature": "signature string"
}
```

---

## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Create Division process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Create Division process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Create Division process as Failed. Retry request periodically |
| 4 | `F` | `12015201` | `MERCHANT_NOT_EXIST` | `merchant not exist` | Mark Create Division process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
| 5 | `F` | `12015202` | `MERCHANT_STATUS_ERROR` | `merchant status is not normal` | Mark Create Division process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
| 6 | `F` | `12015203` | `DIVISION_NOT_EXIST` | `parent division not exist` | Mark Create Division process as Failed. Retry request with proper parameter or can contact to DANA to check parent division configuration |
| 7 | `F` | `12015204` | `DIVISION_STATUS_ERROR` | `parent division status is not normal` | Mark Create Division process as Failed. Retry request with proper parameter or can contact to DANA to check parent division configuration |
| 8 | `F` | `12015205` | `PARENT_DIVISION_TYPE_ILLEGAL` | `parent division type is not correct` | Mark Create Division process as Failed. Retry request with proper parameter and refer to divisionType |
| 9 | `F` | `12015206` | `ROLE_HAS_EXIST` | `division has existed` | Mark Create Division process as Failed. Retry request with proper parameter |
