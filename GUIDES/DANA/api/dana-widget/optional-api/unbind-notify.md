# Unbind Notify

```http
POST {Provided-by-merchant}
```

## API Specification

| Item | Value |
| --- | --- |
| Expected Timeout | `8 second` |
| SNAP Service Code | `65` |
| Accept | `application/json` |
| Content-Type | `application/json` |

## Request Headers

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `version` | String | Variable, 8 max | Mandatory | - | API version. As per the respective API reference |
| 2 | `function` | String | Variable, 128 max | Mandatory | - | According to specifications defined by each business domain; Value: `dana.oauth.unbind.notify` |
| 3 | `clientId` | String | Variable, 36 max | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | `reqTime` | String | Fixed, 25 max | Mandatory | - | Request time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 5 | `reqMsgId` | String | Variable, 64 max | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |

## Request Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `unbindAccessToken` | Array of String | Variable, 64 max | Mandatory | - | The token value of unbound token |
| 2 | `unbindTime` | String | Fixed, 25 max | Mandatory | - | The time of unbind, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |

## Request Sample

### JSON

```json
{
"request": {
"head": {
"function": "dana.oauth.unbind.notify",
"clientId": "2022081517392631023617",
"version": "2.0",
"reqTime": "2022-09-07T08:07:31+07:00",
"reqMsgId": "d713d735-1082-4367-a245-c9b22d83212c"
},
"body": {
"unbindAccessToken": [
"zzzPoOxVUdlUXAIznZdud8iPpJGqU5sqbayj8000",
"EKtL9r7TBwsO3VjF1B2nUI67TTXPlQOQ5vDc7600"
],
"unbindTime": "2022-09-13T15:27:16+07:00"
},
"signature": "fvqBXl3ywwACYRZTNu0o/HIhle2hyL56Mex/7Gtgw+IzgZsj2cgje4hGGrA1INd9agOPTYY44WUIb6TXCyZfIYV7KPVE2ME9BzKA3yIM4Jj6tCC2Doa9KCbEUjBUORO1aEQftLooOdeP83EjcCRPBSif6uwff7rlrYsG0JfokYXkzyKFMIgHCZym0O6zYTHSaI564+VhYQXJpXcbHKa9d7UOuK3QczpIAbdoswLgSEZi31eRrDoqcZY6QTk4DYeb9T8JCdpxnPBzy66bc4wwPh2OAB7Is6MLCEO+7qyF375hImJPHQ5SfEOoX2kZgOIggaGDYNahqT0UkdYSbX6333=="
}
}
```

## Response Headers

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `version` | String | Variable, 8 max | Mandatory | - | API version. As per the respective API reference |
| 2 | `function` | String | Variable, 128 max | Mandatory | - | According to specifications defined by each business domain; Value: `dana.oauth.unbind.notify` |
| 3 | `clientId` | String | Variable, 36 max | Mandatory | - | Client identifier which provided by DANA and used to identify partner and application system |
| 4 | `respTime` | String | Fixed, 25 max | Mandatory | - | Response time, in format YYYY-MM-DDTHH:mm:ss+07:00. Time must be in GMT+7 (Jakarta time) |
| 5 | `reqMsgId` | String | Variable, 64 max | Mandatory | - | Identify an unique system request. Each request will be assigned with a unique identifier (UUID) |

## Response Body

| No | Field | Type | Length | Required | Condition | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `resultInfo` | JSON Object | Variable, 0 max | Mandatory | - | Define the detail of result information |

## Response Sample

### JSON

```json
{
"response": {
"head": {
"function": "dana.oauth.unbind.notify",
"clientId": "2022081517392631023617",
"respTime": "2022-09-07T08:07:31+07:00",
"version": "2.0",
"reqMsgId": "d713d735-1082-4367-a245-c9b22d83212c"
},
"body": {
"resultInfo": {
"resultStatus": "S",
"resultCodeId": "00000000",
"resultCode": "SUCCESS",
"resultMsg": "success"
}
},
"signature": "fvqBXl3ywwACYRZTNu0o/HIhle2hyL56Mex/7Gtgw+IzgZsj2cgje4hGGrA1INd9agOPTYY44WUIb6TXCyZfIYV7KPVE2ME9BzKA3yIM4Jj6tCC2Doa9KCbEUjBUORO1aEQftLooOdeP83EjcCRPBSif6uwff7rlrYsG0JfokYXkzyKFMIgHCZym0O6zYTHSaI564+VhYQXJpXcbHKa9d7UOuK3QczpIAbdoswLgSEZi31eRrDoqcZY6QTk4DYeb9T8JCdpxnPBzy66bc4wwPh2OAB7Is6MLCEO+7qyF375hImJPHQ5SfEOoX2kZgOIggaGDYNahqT0UkdYSbX6333=="
}
}
```

## Response Codes

| No | Result Status | Result Code ID | Result Code | Result Message | Partner Action |
| --- | --- | --- | --- | --- | --- |
| 1 | `S` | `00000000` | `SUCCESS` | success | Mark Unbind Notify process as Success |
| 2 | `F` | `00000019` | `PROCESS_FAIL` | process fail | Mark Unbind Notify process as Failed. Retry request periodically |
| 3 | `F` | `00000900` | `SYSTEM_ERROR` | system error | Mark Unbind Notify process as Failed. Retry request periodically |
