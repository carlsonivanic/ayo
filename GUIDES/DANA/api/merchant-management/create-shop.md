# Create Shop

```http
POST /dana/merchant/shop/createShop.htm
```

This API is used to create a new shop. For the easiest integration, use DANA's Libraries to implement  [Shop](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/shop.md).

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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.shop.createShop` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | apiVersion | String | Variable, 8 | Mandatory | - | API version. As per the respective API reference. **Notes**: apiVersion > 2 |
| 2 | merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 3 | parentDivisionId | String | Variable, 0 | Conditional | Y:= parentRoleType value is `DIVISION` or `EXTERNAL_DIVISION` | Parent division identifier. The length depends on parentRoleType: `DIVISION`: 21 max; `EXTERNAL_DIVISION`: 64 max. |
| 4 | shopParentType | String | Variable, 17 | Mandatory | - | Type of shop parent, refer to parentRoleType |
| 5 | mainName | String | Variable, 256 | Mandatory | - | Shop name |
| 6 | shopAddress | JSON Object | Variable, 0 | Mandatory | - | Shop address, refer to addressInfo |
| 6.1 | shopAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 6.2 | shopAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 6.3 | shopAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 6.4 | shopAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 6.5 | shopAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 6.6 | shopAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 6.7 | shopAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 6.8 | shopAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 7 | shopDesc | String | Variable, 1024 | Optional | - | Shop description |
| 8 | externalShopId | String | Variable, 64 | Mandatory | - | External shop identifier |
| 9 | logoUrlMap | Array of String | Variable, 0 | Optional | - | Logo URL, the map keys are: `LOGO` `PC_LOGO` `MOBILE_LOGO` |
| 10 | extInfo | JSON Object | Variable, 0 | Mandatory | - | Extended information. For the details, refer to extInfo params |
| 10.1 | extInfo.PIC_EMAIL |  |  | Mandatory |  | Shop's PIC email address |
| 10.2 | extInfo.PIC_PHONENUMBER |  |  | Mandatory |  | Shop's PIC phone number |
| 10.3 | extInfo.SUBMITTER_EMAIL |  |  | Mandatory |  | Submitter email address |
| 10.4 | extInfo.GOODS_SOLD_TYPE |  |  | Mandatory |  | Type of the product business. The possible values are: `DIGITAL` `NON_DIGITAL` `SERVICES` |
| 10.5 | extInfo.USECASE |  |  | Mandatory |  | Use case of the available products. The possible values are: `QRIS_DIGITAL` `QRIS_NON_DIGITAL` `QRIS_SERVICE` `WIDGET_DIGITAL` `WIDGET_NON_DIGITAL` `WIDGET_SERVICE` `DISBURSE_REFUND` `DISBURSE_GAMIFICATION` `DISBURSE_MONEY_TRANSFER` |
| 10.6 | extInfo.USER_PROFILING |  |  | Mandatory |  | This param is used for merchants to inform DANA whether the target customers for their products are B2B or end user |
| 10.7 | extInfo.AVG_TICKET |  |  | Mandatory |  | Average daily transactions |
| 10.8 | extInfo.OMZET |  |  | Mandatory |  | Annual transaction revenue. The possible values are: `<2BIO`, `2BIO-5BIO`, `5BIO-10BIO`, `>10BIO`. |
| 10.9 | extInfo.EXT_URLS |  |  | Mandatory |  | Extension URL. This param is used to upload image for products sold |
| 11 | sizeType | String | Variable, 4 | Mandatory | - | Size type, refer to sizeType |
| 12 | ln | String | Variable, 10 | Optional | - | Longitude of shop's location |
| 13 | lat | String | Variable, 10 | Optional | - | Latitude of shop's location |
| 14 | loyalty | String | Variable, 5 | Optional | - | Flag for loyalty category. The possible value are `true` or `false` |
| 15 | ownerAddress | JSON Object | Variable, 0 | Mandatory | - | Owner address, refer to addressInfo |
| 15.1 | ownerAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 15.2 | ownerAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 15.3 | ownerAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 15.4 | ownerAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 15.5 | ownerAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 15.6 | ownerAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 15.7 | ownerAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 15.8 | ownerAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 16 | ownerName | JSON Object | Variable, 0 | Mandatory | - | Owner name, refer to userName |
| 16.1 | ownerName.firstName | String | Variable, 64 | Mandatory | - | First name |
| 16.2 | ownerName.lastName | String | Variable, 64 | Mandatory | - | Last name |
| 17 | ownerPhoneNumber | JSON Object | Variable, 0 | Mandatory | - | Owner phone number, refer to mobileNoInfo |
| 17.1 | ownerPhoneNumber.mobileId | String | Variable, 32 | Mandatory | - | Mobile identifier |
| 17.2 | ownerPhoneNumber.mobileNo | String | Variable, 32 | Mandatory | - | Mobile phone number |
| 17.3 | ownerPhoneNumber.verified | String | Variable, 5 | Mandatory | - | Flag for verified mobile, the possible values are `true` or `false` |
| 18 | ownerIdType | String | Variable, 8 | Mandatory | - | Owner identifier type, refer to ownerIdType |
| 19 | ownerIdNo | String | Variable, 0 | Mandatory | - | Owner identifier number. The length depend on ownerIdType: `KTP`: 16 `SIM`: 12-14 `Passport`: 8 `NIB`: >= 13 `SIUP`: Free text |
| 20 | deviceNumber | String | Variable, 0 | Mandatory | - | Device number |
| 21 | posNumber | String | Variable, 0 | Mandatory | - | Pos number |
| 22 | mccCodes | Array of String | Variable, 64 | Mandatory | - | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to MCC |
| 23 | businessEntity | String | Variable, 12 | Mandatory | - | Business entity, refer to businessEntity |
| 24 | shopOwning | String | Variable, 12 | Mandatory | - | Shop owning information, refer to shopOwning |
| 25 | shopBizType | String | Variable, 6 | Mandatory | - | Shop business type, refer to shopBizType |
| 26 | businessDocs | Array of JSON Object | Variable, 0 | Mandatory | - | Business document, refer to businessDoc. |
| 26.1 | businessDocs[].docType | String | Variable, 8 | Mandatory | - | Business document type, refer to ownerIdType |
| 26.2 | businessDocs[].docId | String | Variable, 0 | Mandatory | - | Business document identifier number. The length depend on docType: `KTP`: 16 `SIM`:12-14 `Passport`:8 `NIB`: >= 13 `SIUP`: Free text |
| 26.3 | businessDocs[].docFile | String (base64) | Variable, 0 | Mandatory | - | Business document file in base64 String, accepted file extensions: PDF, GIF, PNG |
| 27 | taxNo | String | Fixed, 16 | Mandatory | - | Tax number (NPWP) |
| 28 | taxAddress | JSON Object | Variable, 256 | Mandatory | - | Tax address, refer to addressInfo |
| 28.1 | taxAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 28.2 | taxAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 28.3 | taxAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 28.4 | taxAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 28.5 | taxAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 28.6 | taxAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 28.7 | taxAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 28.8 | taxAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 29 | brandName | String | Variable, 256 | Mandatory | - | Brand name on legal name or tax name |
| 30 | directorPics | Array of JSON Object | Variable, 0 | Mandatory | - | Director as a PIC of shop, refer to businessPic |
| 30.1 | directorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 30.2 | directorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 31 | nonDirectorPics | Array of JSON Object | Variable, 0 | Mandatory | - | Non director which become an PIC of shop, refer to businessPic |
| 31.1 | nonDirectorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 31.2 | nonDirectorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |

### Request Body Enum Details

#### shopParentType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | MERCHANT | MERCHANT | String | Parent role type is merchant |
| 2 | DIVISION | DIVISION | String | Parent role type is division |
| 3 | EXTERNAL_DIVISION | EXTERNAL_DIVISION | String | Parent role type is external division |

#### sizeType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | UMI | UMI | String | Usaha Mikro |
| 2 | UKE | UKE | String | Usaha Kecil |
| 3 | UME | UME | String | Usaha Menengah |
| 4 | UBE | UBE | String | Usaha Besar |
| 5 | URE | URE | String | Usaha Reguler |

#### ownerIdType
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

#### shopOwning
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | DIRECT OWNED | DIRECT OWNED | String | Shop is owned by direct owner |
| 2 | FRANCHISED | FRANCHISED | String | Shop is owned by franchise |

#### shopBizType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | OFFLINE | OFFLINE | String | Shop location is offline |
| 2 | ONLINE | ONLINE | String | Shop location is online |

#### businessDocs[].docType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | KTP | KTP | String | Use KTP as an owner identifier |
| 2 | SIM | SIM | String | Use SIM as an owner identifier |
| 3 | PASSPORT | PASSPORT | String | Use passport as an owner identifier |
| 4 | NIB | NIB | String | Use Nomor Induk Berusaha (NIB) as an owner identifier |
| 5 | SIUP | SIUP | String | Use Surat Izin Usaha Perdagangan (SIUP) as an owner identifier |

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
   "request":{
      "head":{
         "version":"2.0",
         "function":"dana.merchant.shop.createShop",
         "clientId":"2014000014442",
         "clientSecret":"2014000014442",
         "reqTime":"2022-03-22T14:45:43+07:00",
         "reqMsgId":"1234567asdfasdf1123fda",
         "reserve":"{}"
      },
      "body":{
         "apiVersion":"3",
         "merchantId":"216622222444445555555",
         "parentDivisionId":"216622222444445555555",
         "shopParentType":"MERCHANT",
         "mainName":"divisionName1",
         "shopAddress":{
            "country":"country",
            "province":"province",
            "city":"city",
            "area":"area",
            "address1":"address1",
            "address2":"address2",
            "postcode":"postcode",
            "subDistrict":"subDistrict"
         },
         "shopDesc":"description",
         "externalShopId":"shop1",
         "logoUrlMap":{
            "PC_LOGO":"base64ImageCodexxxxxxxxxxx"
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
         },
         "sizeType":"UMI",
         "ln":"106.84513",
         "lat":"-6.21462",
         "loyalty":"true",
         "ownerAddress":{
            "country":"country",
            "province":"province",
            "city":"city",
            "area":"area",
            "address1":"address1",
            "address2":"address2",
            "postcode":"postcode",
            "subDistrict":"subDistrict"
         },
         "ownerName":{
            "firstName":"Jane",
            "lastName":"Doe"
         },
         "ownerPhoneNumber":{
            "mobileNo":"62800000000",
            "mobileId":"mobileId",
            "verified":"true"
         },
         "ownerIdType":"KTP",
         "ownerIdNo":"3172010000000000",
         "deviceNumber":"0",
         "posNumber":"0",
         "mccCodes":[
            "0783"
         ],
         "businessEntity":"individu",
         "shopOwning":"DIRECT_OWNED",
         "shopBizType":"ONLINE",
         "businessDocs":[
         {
            "docType":"KTP",
            "docId":"3172010000000000",
            "docFile":"stringbase64value"
         }
         ],
         "taxNo": "123456789012345",
         "taxAddress": {
            "country": "Indonesia",
            "province": "DKI Jakarta",
            "city": "Jakarta",
            "area": "area",
            "address1": "address1",
            "address2": "address2",
            "postcode": "14123"
         },
         "brandName": "XXX",
         "directorPics":[
         {
            "picName":"Agus",
            "picPosition":"DIRECTOR_FINANCE"
         }
         ],
         "nonDirectorPics":[
         {
            "picName":"Budi",
            "picPosition":"OPERATION"
         }
         ]
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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.shop.createShop` |
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
| 2 | shopId | String | Fixed, 21 | Conditional | Y:= pgISV is `false` | Shop identifier |
| 3 | merchantApprovalProcessTicketId | String | Variable, 0 | Conditional | Y:= Applied to aggregator merchants that have multiple entities as shops | A unique identifier issued to the merchant upon submission |

### Response Body Notes

- `merchantApprovalProcessTicketId`: A new shop cannot be created while the Division Identifier is still being created This ticket will be reviewed and approved by the DANA team. Once the approval process is completed, DANA will generate and provide the Shop Identifier via email

## Response Sample

### 1. Non Aggregator (Shop)

```json
{
   "response": {
     "head": {
 "version": "2.0",
 "function": "dana.merchant.shop.createShop",
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
 "shopId": "2166622222222222"
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
"function": "dana.merchant.shop.createShop",
"clientId": "2024090317008720291158",
"clientSecret": "2014000014442",
"respTime": "2025-12-16T11:07:26+07:00",
"reqMsgId": "CRS6940DB06EB0",
"reserve": "{}"
    },
    "body": {
"resultInfo": {
  "resultCodeId": "00000000",
  "resultCode": "SUCCESS",
  "resultMsg": "SUCCESS",
  "resultStatus": "S"
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
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Create Shop process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Create Shop process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Create Shop process as Failed. Retry request periodically |
| 4 | `F` | `12015201` | `MERCHANT_NOT_EXIST` | `merchant not exist` | Mark Create Shop process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
| 5 | `F` | `12015202` | `MERCHANT_STATUS_ERROR` | `merchant status is not normal` | Mark Create Shop process as Failed. Retry request with proper parameter or can contact to DANA to check merchant configuration |
| 6 | `F` | `12015203` | `DIVISION_NOT_EXIST` | `parent division not exist` | Mark Create Shop process as Failed. Retry request with proper parameter or can contact to DANA to check parent division configuration |
| 7 | `F` | `12015204` | `DIVISION_STATUS_ERROR` | `parent division status is not normal` | Mark Create Shop process as Failed. Retry request with proper parameter or can contact to DANA to check parent division configuration |
| 8 | `F` | `12015206` | `ROLE_HAS_EXIST` | `shop has existed` | Mark Create Shop process as Failed. Retry request with proper parameter |
