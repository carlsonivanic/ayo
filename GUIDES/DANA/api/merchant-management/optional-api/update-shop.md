# Update Shop

```http
POST /dana/merchant/shop/updateShop.htm
```

This API is used to update the shop information. For the easiest integration, use DANA's Libraries to implement  [Shop](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/shop.md).

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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.shop.updateShop` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | shopId | String | Variable, 0 | Mandatory | - | Shop identifier. The length depend on shopIdType: ` INNER_ID `: 21 max ` EXTERNAL_ID`: 64 max |
| 2 | merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 3 | shopIdType | String | Variable, 11 | Mandatory | - | Shop identifier type, refer to shopIdType |
| 4 | mainName | String | Variable, 256 | Optional | - | Shop name |
| 5 | shopAddress | JSON Object | Variable, 0 | Mandatory | - | Shop address, refer to addressInfo |
| 5.1 | shopAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 5.2 | shopAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 5.3 | shopAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 5.4 | shopAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 5.5 | shopAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 5.6 | shopAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 5.7 | shopAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 5.8 | shopAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 6 | shopDesc | String | Variable, 1024 | Optional | - | Shop description |
| 7 | newExternalShopId | String | Variable, 64 | Optional | - | New external shop identifier |
| 8 | mccCodes | Array of String | Variable, 64 | Optional | - | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to [MCC] |
| 9 | logoUrlMap | Array of String | Variable, 0 | Optional | - | Logo URL, the map keys are: `LOGO` `PC_LOGO` `MOBILE_LOGO` |
| 10 | extInfo | String | Variable, 64 | Optional | - | Extend information |
| 11 | sizeType | String | Variable, 4 | Optional | - | Size type, refer to sizeType |
| 12 | ln | String | Variable, 10 | Optional | - | Longitude of shop's location |
| 13 | lat | String | Variable, 10 | Optional | - | Latitude of shop's location |
| 14 | loyalty | String | Variable, 5 | Optional | - | Flag for loyalty category. The possible value are `true` or `false` |
| 15 | ownerAddress | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner address, refer to addressInfo |
| 15.1 | ownerAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 15.2 | ownerAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 15.3 | ownerAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 15.4 | ownerAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 15.5 | ownerAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 15.6 | ownerAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 15.7 | ownerAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 15.8 | ownerAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 16 | ownerName | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner name, refer to userName |
| 16.1 | ownerName.firstName | String | Variable, 64 | Mandatory | - | First name |
| 16.2 | ownerName.lastName | String | Variable, 64 | Mandatory | - | Last name |
| 17 | ownerPhoneNumber | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner phone number, refer to mobileNoInfo |
| 17.1 | ownerPhoneNumber.mobileId | String | Variable, 32 | Mandatory | - | Mobile identifier |
| 17.2 | ownerPhoneNumber.mobileNo | String | Variable, 32 | Mandatory | - | Mobile phone number |
| 17.3 | ownerPhoneNumber.verified | String | Variable, 5 | Mandatory | - | Flag for verified mobile, the possible values are `true` or `false` |
| 18 | ownerIdType | String | Variable, 8 | Conditional | Y:= apiVersion > 2 | Owner identifier type, refer to ownerIdType |
| 19 | ownerIdNo | String | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner identifier number. The length depend on ownerIdType: `KTP`: 16 `SIM`: 12-14 `Passport`: 8 `NIB`: >= 13 `SIUP`: Free text |
| 20 | deviceNumber | String | Variable, 0 | Conditional | Y:= apiVersion > 2 | Device number |
| 21 | posNumber | String | Variable, 0 | Conditional | Y:= apiVersion > 2 | Pos number |
| 22 | apiVersion | String | Variable, 8 | Conditional | Y:= Need to add new attributes | API version. As per the respective API reference |
| 23 | businessEntity | String | Variable, 12 | Conditional | Y:= apiVersion > 2 | Business entity, refer to businessEntity |
| 24 | shopOwning | String | Variable, 12 | Conditional | Y:= apiVersion > 2 | Shop owning information, refer to shopOwning |
| 25 | shopBizType | String | Variable, 6 | Optional | - | Shop business type, refer to shopBizType |
| 26 | businessDocs | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Business document, refer to businessDoc. |
| 26.1 | businessDocs[].docType | String | Variable, 8 | Mandatory | - | Business document type, refer to |
| 26.2 | businessDocs[].docId | String | Variable, 0 | Mandatory | - | Business document identifier number. The length depend on docType: `KTP`: 16 `SIM`:12-14 `Passport`:8 `NIB`: >= 13 `SIUP`: Free text |
| 26.3 | businessDocs[].docFile | String (base64) | Variable, 0 | Mandatory | - | Business document file in base64 String, accepted file extensions: PDF, GIF, PNG |
| 27 | businessEndDate | String | Variable, 10 | Conditional | Y:= apiVersion > 2 | Business end date, in format YYYY-MM-dd |
| 28 | taxNo | String | Fixed, 16 | Optional | - | Tax number (NPWP) |
| 29 | taxAddress | JSON Object | Variable, 256 | Optional | - | Tax address, refer to addressInfo |
| 29.1 | taxAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 29.2 | taxAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 29.3 | taxAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 29.4 | taxAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 29.5 | taxAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 29.6 | taxAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 29.7 | taxAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 29.8 | taxAddress.subDistrict | String | Variable, 64 | Optional | - | Sub district |
| 30 | brandName | String | Variable, 256 | Optional | - | Brand name on legal name or tax name |
| 31 | directorPics | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Director as a PIC of shop, refer to businessPic |
| 31.1 | directorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 31.2 | directorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 32 | nonDirectorPics | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Non director which become an PIC of shop, refer to businessPic |
| 32.1 | nonDirectorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 32.2 | nonDirectorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |

### Request Body Enum Details

#### shopIdType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | INNER_ID | INNER_ID | String | Shop identifier is generated by DANA |
| 2 | EXTERNAL_ID | EXTERNAL_ID | String | Shop identifier is provided by merchant |

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
- `businessDocs`: BusinessEntity `individu` can only use businessDoc.docType `KTP` and `SIM` Other BusinessEntity can only use `SIUP` and `NIB`

## Request Sample

### JSON

```json
{
      "request":{
         "head":{
            "version":"2.0",
            "function":"dana.merchant.shop.updateShop",
            "clientId":"2014000014442",
            "clientSecret":"2014000014442",
            "reqTime":"2001-07-04T12:08:56+05:30",
            "reqMsgId":"1234567asdfasdf1123fda",
            "reserve":"{}"
         },
         "body":{
            "shopId":"216662222444445555123",
            "merchantId":"216622222444445555555",
            "shopIdType":"INNER_ID",
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
            "newExternalShopId":"shop1",
            "mccCodes":[
               "0783"
            ],
            "logoUrlMap":{
               "PC_LOGO":"base64ImageCodexxxxxxxxxxx"
            },
            "extInfo":{

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
            "apiVersion":"3",
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
            "businessEndDate":"2021-05-26",
            "taxNo":"123456789012345",
            "taxAddress":{
               "country":"Indonesia",
               "province":"DKI Jakarta",
               "city":"Jakarta",
               "area":"area",
               "address1":"address1",
               "address2":"address2",
               "postcode":"14123"
            },
            "brandName":"XXX",
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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.shop.updateShop` |
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

## Response Sample

### JSON

```json
{
   "response":{
"head":{
   "version":"2.0",
   "function":"dana.merchant.shop.updateShop",
   "clientId":"211020000000000000044",
   "clientSecret": "2014000014442",
   "respTime":"2022-03-22T14:45:43+07:00",
   "reqMsgId":"1234567asdfasdf1123fda",
   "reserve":"{}"
},
"body":{
   "resultInfo":{
      "resultStatus":"S",
      "resultCodeId":"00000000",
      "resultCode":"SUCCESS",
      "resultMsg":"success"
   }
}
   },
   "signature":"signature string"
}
```

---
## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Update Shop process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Update Shop process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Update Shop process as Failed. Retry request periodically |
| 4 | `F` | `00000004` | `SHOP_NOT_EXIST` | `shop not exist` | Mark Update Shop process as Failed. Retry request with proper parameter |
| 5 | `F` | `00000900` | `PARENT_ID_NOT_EXIST` | `parent id not exist` | Mark Update Shop process as Failed. Retry request with proper parameter or can contact to DANA to check parent division configuration |
