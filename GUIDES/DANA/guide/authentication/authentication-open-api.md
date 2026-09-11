# Authentication Open API

To ensure secure and reliable communication between your system and DANA's Open API, you need to use **Asymmetric Signature Authentication**. This method leverages cryptographic keys to verify the identity of the sender and protect data integrity during transactions.

## Overview

In the asymmetric signature scheme:

- **Private Key:** Used by you (the merchant) to digitally sign API requests.
- **Public Key:** Shared with DANA to verify the authenticity of your requests.

By signing your request data with your private key, you provide a secure proof that the request originates from an authorized source. This process is critical to meeting the regulatory standards.

## DANA Public Key

### Sandbox DANA Public Key

```txt
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnaKVGRbin4Wh4KN35OPh
ytJBjYTz7QZKSZjmHfiHxFmulfT87rta+IvGJ0rCBgg+1EtKk1hX8G5gPGJs1htJ
5jHa3/jCk9l+luzjnuT9UVlwJahvzmFw+IoDoM7hIPjsLtnIe04SgYo0tZBpEmkQ
vUGhmHPqYnUGSSMIpDLJDvbyr8gtwluja1SbRphgDCoYVXq+uUJ5HzPS049aaxTS
nfXh/qXuDoB9EzCrgppLDS2ubmk21+dr7WaO/3RFjnwx5ouv6w+iC1XOJKar3CTk
X6JV1OSST1C9sbPGzMHZ8AGB51BM0mok7davD/5irUk+f0C25OgzkwtxAt80dkDo
/QIDAQAB
-----END PUBLIC KEY-----
```

To obtain Production DANA Public Key, please contact the DANA integration team through our [Discord channel](https://s.dana.id/dana-discord-dev).

## Obtaining Testing Credentials

1. Visit [https://dashboard.dana.id/sandbox/](https://dashboard.dana.id/sandbox/).
2. You will receive the following credentials:
- URL API Sandbox
- Merchant ID
- Client ID
- Client Secret
- Public Key
- Private Key

## Obtaining Production Credentials

After successfully do the sandbox, the next process is going to production, you will need to generate your own keys for the production environment. You then submit your generated Public Key so DANA can verify your requests.

The following steps are used to generate the asymmetric key used in the signature process for **Production** environment.

### Create Private Key PKCS#1

```bash
openssl genrsa -out private_key.pem 2048
```

### Encode Private Key to PKCS#8

```bash
openssl pkcs8 -topk8 -in rsa_private_key.pem -out pkcs8_rsa_private_key.pem -nocrypt
```

### Generate Public Key

```bash
openssl rsa -in rsa_private_key.pem -out rsa_public_key.pem -pubout
```

## Using the Credential

You will receive two credentials: a **Private Key** and a **Public Key**.

The **Private Key** is used to authenticate and communicate securely with DANA. Keep this key confidential and do not share it.
The **Public Key** must be shared with DANA by uploading it through the **Merchant Portal** during form submission.
After successful submission, you will receive other credentials, including Merchant ID, Client ID, and Client Secret.

## Asymmetric Digital Signatures (signature)

DANA's Open APIs require a specific signature string to be generated for a field called `signature`. This signature will be validated by DANA using your public key to confirm the authenticity of the request.

### Transactional Token method

Used by most transactional APIs under the DANA API standard.

Before generate the signature, prepare the required data:

| Name | Description | Format Example |
| --- | --- | --- |
| HTTP BODY | Data from request body contains head and body | {"head":{"version":"2.0","function":"dana.member.query.queryUserProfile","clientId":"2014000014442","clientSecret":"2014000014442","reqTime":"2001-07-04T12:08:56+07:00","reqMsgId":"1234567asdfasdf1123fda","accessToken":"xxxxx","reserve":"{}"},"body":{"userResources":["BALANCE","TOPUP_URL","OTT"]}} |

The following steps are used to generate the asymmetric key used in the signature process for Production environment:

### Step 1: Compose the string to sign

Minify the request body like the following format:

```text
(<HTTP BODY>)
```

### Step 2: Result string to sign

Generate the signature by applying SHA-256 with RSA-2048 encryption (using PKCS#8 or PKCS#1 private key) to the string, then encode the result in Base64.

### Step 3: Add the Signature to the signature

Place the generated signature into your request header under the field `signature`.

```text
signature: iSkd8HPpdeeQSnq5lSRM46l8w/C4ZhNq7ordOv2dfDC0A0rGWxqz+9j864gcuVhu0tgTHJUuV9k5wsluig/sJ4W5Yy1EZPzbpeeUwFxSK0
```

## Validating Signatures

Here's a guideline for validating a digital signature in API requests. Follow these steps to ensure the authenticity and integrity of the request.

1. Get the Digital Signature.
The digital signature is included in the **HTTP header** under the key `signature`.

```text
signature: iSkd8HPpdeeQSnq5lSRM46l8w/C4ZhNq7ordOv2dfDC0A0rGWxqz+9j864gcuVhu0tgTHJUuV9k5wsluig/sJ4W5Yy1EZPzbpeeUwFxSK0
```

2. Decrypt the signature.
Decrypt the signature using public key which is pair with private key that used to generate the signature.

3. Verify the Signature.
- Use **SHA-256** hashing combined with **RSA-2048** encryption to verify the signature.
- Compare the signature from the `signature` header with the signature generated from the composed string using the public key of the API sender.

4. Consume the Request.
- If the verification is successful (the signature matches), proceed with processing the request.
- If the verification fails, reject the request.

## Code Example

Below are example codes that does all the authentication-related functions for each programming language:

| Programming Language | Sample Code |
| --- | --- |
| PHP | [https://www.jdoodle.com/ga/RN7hZw97sGEjKgDy6wvXSQ%3D%3D](https://www.jdoodle.com/ga/RN7hZw97sGEjKgDy6wvXSQ%3D%3D) |
| Java (jdk8) | [https://www.jdoodle.com/ga/W7kM1d0IOg%2BtGlmHMegbRw%3D%3D](https://www.jdoodle.com/ga/W7kM1d0IOg%2BtGlmHMegbRw%3D%3D) |
