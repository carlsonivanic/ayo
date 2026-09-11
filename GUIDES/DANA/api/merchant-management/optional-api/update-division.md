# Update Division

```http
POST /dana/merchant/division/updateDivision.htm
```

This API is used to update the division information. For the easiest integration, use DANA's Libraries to implement  [Division](https://dashboard.dana.id/api-docs-v2/llms/guide/merchant-management/division.md).

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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.updateDivision` |
| 3 | clientId | String | Variable, 36 | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | clientSecret | String | Variable, 64 | Mandatory | - | As a secret key of client. Assigned client secret during registration |
| 5 | reqTime | String | Fixed, 25 | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00.Time must be in GMT+7 (Jakarta time) |
| 6 | reqMsgId | String | Variable, 64 | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |
| 7 | reserve | String | Variable, 256 | Optional | - | Reserved for future implementation (Key/Value) |

---
## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | merchantId | String | Fixed, 21 | Mandatory | - | Merchant identifier |
| 2 | divisionId | String | Fixed, 21 | Conditional | Y:= divisionIdType is `INNER_ID` | Division identifier |
| 3 | divisionName | String | Variable, 256 | Mandatory | - | Division name |
| 4 | divisionAddress | JSON Object | Variable, 0 | Mandatory | - | Division address, refer to addressInfo |
| 4.1 | divisionAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 4.2 | divisionAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 4.3 | divisionAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 4.4 | divisionAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 4.5 | divisionAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 4.6 | divisionAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 4.7 | divisionAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 5 | divisionDescription | String | Variable, 1024 | Optional | - | Division description |
| 6 | divisionType | String | Variable, 11 | Mandatory | - | Division type, refer to divisionType |
| 7 | divisionIdType | String | Variable, 11 | Mandatory | - | Division identifier type, refer to divisionIdType |
| 8 | externalDivisionId | String | Variable, 64 | Conditional | Y:= divisionIdType is `EXTERNAL_ID` | External division identifier |
| 9 | newExternalDivisionId | String | Variable, 64 | Mandatory | - | New external division identifier |
| 10 | logoUrlMap | Array of String | Variable, 0 | Optional | - | Logo URL, the map keys are: `LOGO``PC_LOGO``MOBILE_LOGO` |
| 11 | mccCodes | Array of String | Variable, 64 | Mandatory | - | Merchant category code, used to identify the type of business in which a merchant is engaged, refer to Merchant Category Code |
| 12 | extInfo | String | Variable, 64 | Mandatory | - | Extend information |
| 13 | apiVersion | String | Variable, 8 | Conditional | Y:= Need to add new attributes | API version. As per the respective API reference |
| 14 | businessDocs | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Business document, refer to businessDoc |
| 14.1 | businessDocs[].docType | String | Variable, 8 | Mandatory | - | Business document type, refer to ownerIdType |
| 14.2 | businessDocs[].docId | String | Variable, 16 | Mandatory | - | Business document identifier number. The length depend on docType: `KTP`: 16`SIM`: 12-14`Passport`: 8`NIB`: >= 13`SIUP`: Free text |
| 14.3 | businessDocs[].docFile | String (base64) | Variable, 0 | Mandatory | - | Business document file in base64 String, accepted file extensions: PDF, GIF, PNG |
| 15 | businessEntity | String | Variable, 12 | Conditional | Y:= apiVersion > 2 | Business entity, refer to businessEntity |
| 16 | businessEndDate | String | Variable, 10 | Conditional | Y:= apiVersion > 2 | Business end date, in format YYYY-MM-DD |
| 17 | ownerName | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner name, refer to userName |
| 17.1 | ownerName.firstName | String | Variable, 64 | Mandatory | - | First name |
| 17.2 | ownerName.lastName | String | Variable, 64 | Mandatory | - | Last name |
| 18 | ownerPhoneNumber | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner phone number, refer to mobileNoInfo |
| 18.1 | ownerPhoneNumber.mobileId | String | Variable, 32 | Mandatory | - | Mobile identifier |
| 18.2 | ownerPhoneNumber.mobileNo | String | Variable, 32 | Mandatory | - | Mobile phone number |
| 18.3 | ownerPhoneNumber.verified | String | Variable, 5 | Mandatory | - | Flag for verified mobile, the possible values are true or false |
| 19 | ownerIdType | String | Variable, 8 | Conditional | Y:= apiVersion > 2 | Owner identifier type, refer to ownerIdType |
| 20 | ownerIdNo | String | Variable, 16 | Conditional | Y:= apiVersion > 2 | Owner identifier number. The length depend on ownerIdType: `KTP`: 16`SIM`: 12-14`Passport`: 8`NIB`: >= 13`SIUP`: Free text |
| 21 | ownerAddress | JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Owner address, refer to addressInfo |
| 21.1 | ownerAddress.country | String | Variable, 64 | Mandatory | - | Country name |
| 21.2 | ownerAddress.province | String | Variable, 64 | Mandatory | - | Province name |
| 21.3 | ownerAddress.city | String | Variable, 64 | Mandatory | - | City name |
| 21.4 | ownerAddress.area | String | Variable, 64 | Mandatory | - | Area name |
| 21.5 | ownerAddress.address1 | String | Variable, 256 | Mandatory | - | Information of address 1 |
| 21.6 | ownerAddress.address2 | String | Variable, 256 | Mandatory | - | Information of address 2 |
| 21.7 | ownerAddress.postcode | String | Fixed, 5 | Mandatory | - | Postcode |
| 22 | directorPics | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Director as a PIC of sub merchant, refer to businessPic |
| 22.1 | directorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 22.2 | directorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 23 | nonDirectorPics | Array of JSON Object | Variable, 0 | Conditional | Y:= apiVersion > 2 | Non director which become an PIC of sub merchant, refer to businessPic |
| 23.1 | nonDirectorPics[].picName | String | Variable, 64 | Mandatory | - | Business PIC name |
| 23.2 | nonDirectorPics[].picPosition | String | Variable, 64 | Mandatory | - | Business PIC position |
| 24 | sizeType | String | Variable, 4 | Conditional | Y:= apiVersion > 2 | Size type, refer to sizeType |
| 25 | pgDivisionFlag | String | Variable, 5 | Optional | - | Flag if division is type PG. The possible values are `true` or `false` |

### Request Body Enum Details

#### divisionType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | REGION | REGION | String | Division type is region |
| 2 | SUBMERCHANT | SUBMERCHANT | String | Division type is sub merchant |

#### divisionIdType
| No | Pay Method | Name | Type | Remarks |
| --- | --- | --- | --- | --- |
| 1 | INNER_ID | INNER_ID | String | Division identifier is generated by DANA |
| 2 | EXTERNAL_ID | EXTERNAL_ID | String | Division identifier is provided by merchant |

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
- `businessDocs`: BusinessEntity `individu` can only use businessDoc.docType `KTP` and `SIM` Other BusinessEntity can only use `SIUP` and `NIB`

## Request Sample

### JSON

```json
{
  "request": {
      "head": {
          "version": "2.0",
          "function": "dana.merchant.division.updateDivision",
          "clientId": "2014000014442",
          "clientSecret": "2014000014442",
          "reqTime": "2001-07-04T12:08:56+05:30",
          "reqMsgId": "1234567asdfasdf1123fda",
          "reserve": "{}"
      },
      "body": {
          "merchantId": "21662xxx383",
          "divisionId": "21665xxx385",
          "divisionName": "divisionName",
          "divisionAddress": {
              "country": "country",
              "province": "province",
              "city": "city",
              "area": "area",
              "address1": "address1",
              "address2": "address2",
              "postcode": "zipcode"
          },
          "divisionDescription": "description",
          "divisionType": "REGION",
          "divisionIdType": "INNER_ID",
          "externalDivisionId": "35205452Division",
          "newExternalDivisionId": "35205452Division",
          "logoUrlMap": {
              "PC_LOGO": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          },
          "mccCodes": [
              "90075",
              "90040"
          ],
          "extInfo": {
              "key": "value"
          },
          "apiVersion": "3",
          "businessDocs": {
              "docId": "777xxxxxxxxxx111",
              "docType": "KTP",
              "docUrl": "https://www.test.com"
          },
          "businessEntity": "individu",
          "businessEndDate": "2021-05-26",
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
          "directorPics": [{
              "picName": "John",
              "picPosition": "CTO"
          }],
          "nonDirectorPics": [{
              "picName": "Ethan",
              "picPosition": "CEO"
          }],
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
| 2 | function | String | Variable, 128 | Mandatory | - | According to specifications defined by each business domain.Value: `dana.merchant.division.updateDivision` |
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
  "response": {
"head": {
    "version":"2.0",
    "function":"dana.merchant.division.updateDivision",
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
    }
 }
    },
  "signature": "string"
}
```

---

## Response Codes

| No | ResultStatus | ResultCodeId | ResultCode | ResultMsg | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | `success` | Mark Update Division process as Success |
| 2 | `F` | `00000004` | `PARAM_ILLEGAL` | `parameter illegal` | Mark Update Division process as Failed. Retry request with proper parameter |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | `system error` | Mark Update Division process as Failed. Retry request periodically |
| 4 | `F` | `12015980` | `DIVISION_NOT_EXIST` | `division not exist` | Mark Update Division process as Failed. Retry request with proper parameter |
| 5 | `F` | `12015984` | `DIVISION_NOT_AVAILABLE` | `division not available for update` | Mark Update Division process as Failed. Retry request with proper parameter or can contact to DANA to check division configuration |
