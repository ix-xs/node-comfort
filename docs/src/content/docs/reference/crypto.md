---
title: "nc.crypto"
description: "Crypto without the footguns, built on `node:crypto`: hashes, HMAC, password hashing (scrypt), encryption (AES-256-GCM), JWT, two-factor codes (TOTP) and secure random values."
sidebar:
  label: "crypto"
  order: 23
---

```js
const { crypto } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const crypto = require("@ix-xs/node-comfort/crypto");
```

This page lists everything `nc.crypto` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/crypto/).

```js
const stored = await crypto.hashPassword("hunter2");
await crypto.verifyPassword("hunter2", stored); // true

const token = crypto.signJWT({ sub: user.id }, SECRET, { expiresIn: "1h" });
const claims = crypto.verifyJWT(token, SECRET);
```

## hash

```ts
hash(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Hashes data, SHA-256 in hex by default.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `string \| ``Buffer`` \| ``Uint8Array` | Strings are read as UTF-8. |
| `options?` | [`HashOptions`](#hashoptions) |  |

```js
crypto.hash("hello");
crypto.hash("hello", { algorithm: "sha512", encoding: "base64url" });
```

## hmac

```ts
hmac(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

An HMAC signature: a hash keyed with a secret. The usual way to sign and
check webhooks.

```js
const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET);
crypto.safeEqual(signature, req.headers["x-signature"]);
```

## verifyHmac

```ts
verifyHmac(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, signature: unknown, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): boolean
```

Checks an HMAC signature you received, in constant time. A leading
`sha256=`, as GitHub and others send, is ignored.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `signature` | `unknown` | What the sender computed. Anything but a matching string gives `false`. |
| `secret` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `options?` | [`HashOptions`](#hashoptions) | Must match what the sender used. |

```js
// an Express webhook route: sign the raw body, not the parsed JSON
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}
```

## safeEqual

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compares two secrets in constant time, so the comparison can't leak
anything through timing, not even their lengths. Use it instead of `===`
for tokens, signatures and API keys. A missing value (`undefined`, `null`)
never equals anything.

```js
if (!crypto.safeEqual(providedKey, process.env.API_KEY)) throw new Error("Forbidden");
```

## hashPassword

```ts
hashPassword(password: string, options?: HashPasswordOptions): Promise<string>
```

Hashes a password with scrypt and a random salt. The result records its
own settings, so you can raise the cost later without breaking old
hashes.

**Throws** `RangeError`: If the settings are out of bounds, like a cost that needs more than 1 GiB of memory.

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", store this
```

## verifyPassword

```ts
verifyPassword(password: string, stored: string): Promise<boolean>
```

Checks a password against a stored hash, in constant time. A wrong
password or a broken hash gives `false`, never an error.

```js
if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

## needsRehash

```ts
needsRehash(stored: string, options?: HashPasswordOptions): boolean
```

Was this hash made with weaker settings than yours? If so, re-hash the
password right after a successful login.

| Parameter | Type | Description |
| --- | --- | --- |
| `stored` | `string` |  |
| `options?` | [`HashPasswordOptions`](#hashpasswordoptions) | The settings you use today. |

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
  user.hash = await crypto.hashPassword(input, { cost: 16 });
}
```

## generateKey

```ts
generateKey(): string
```

A random 256-bit key for `encrypt()`, as text you can put in an
environment variable.

## encrypt

```ts
encrypt(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: EncryptOptions): string
```

Encrypts data with AES-256-GCM, which also detects tampering. Every call
uses a fresh salt and nonce, so the same text never encrypts the same way
twice.

Use a key from `generateKey()` or another long random secret, not a
password someone typed: that would be easy to brute-force.

**Returns** `string`: A compact, URL-safe string.

```js
const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const card = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
```

## decrypt

```ts
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options: DecryptOptions & { output: "buffer"; }): Buffer<ArrayBufferLike>
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: DecryptOptions): string
```

Decrypts what `encrypt()` produced. Throws an error with code
`ERR_DECRYPT` if the secret is wrong or the data was changed.

```js
const text = crypto.decrypt(box, SECRET);
const bytes = crypto.decrypt(box, SECRET, { output: "buffer" });
```

## signJWT

```ts
signJWT(payload: Record<string, unknown>, secret: JWTKey, options?: SignJWTOptions): string
```

Creates a signed JSON Web Token. `iat` is added for you.

With a secret, the token is signed with HMAC. With a private key, it's
signed with that key, and anyone holding the public key can verify it
without being able to issue tokens.

| Parameter | Type | Description |
| --- | --- | --- |
| `payload` | `Record``<string, unknown>` |  |
| `secret` | [`JWTKey`](#jwtkey) | For HS algorithms, at least 32 random bytes. Otherwise a private key. |
| `options?` | [`SignJWTOptions`](#signjwtoptions) |  |

**Throws** `TypeError`: If the key can't be used, or doesn't fit the algorithm.

```js
const token = crypto.signJWT({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
  expiresIn: "15m",
  issuer: "api.example.com",
});

// key pair: the auth service signs, every other service verifies
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");
const signed = crypto.signJWT({ sub: "42" }, privateKey, { expiresIn: "15m" });
crypto.verifyJWT(signed, publicKey);
```

## decodeJWT

```ts
decodeJWT<P = Record<string, unknown>>(token: string): DecodedJWT<P>
```

Reads a JWT without checking it. Fine for display; call `verifyJWT()`
before trusting anything in it.

**Throws** `JWTError`: With code `ERR_JWT_MALFORMED` if the token can't be read.

```js
crypto.decodeJWT(token).payload.exp;
```

## verifyJWT

```ts
verifyJWT<P = Record<string, unknown>>(token: string, secret: JWTKey, options?: VerifyJWTOptions): P & JWTClaims
```

Verifies a JWT: algorithm, signature, expiry, and whichever claims you
require. Returns the payload, or throws a `JWTError` whose `code` says
what's wrong.

The accepted algorithms follow from the key you pass, so a token signed
with HMAC is never accepted where a public key is expected.

| Parameter | Type | Description |
| --- | --- | --- |
| `token` | `string` |  |
| `secret` | [`JWTKey`](#jwtkey) | The shared secret, or the public key for RS, PS, ES and EdDSA tokens. |
| `options?` | [`VerifyJWTOptions`](#verifyjwtoptions) |  |

**Throws** `JWTError`

```js
try {
  const { sub } = crypto.verifyJWT(token, process.env.JWT_SECRET, { issuer: "api.example.com" });
} catch (error) {
  res.status(401).json({ error: error.code }); // "ERR_JWT_EXPIRED"...
}
```

## generateKeyPair

```ts
generateKeyPair(algorithm?: "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | "ES256" | "ES384" | "ES512" | "EdDSA", options?: { modulusLength?: number; } | undefined): Promise<KeyPair>
```

Makes a pair of keys for signing JWTs: the private one signs, the public
one verifies. Both come as PEM text, ready for an environment variable or
a file.

`"EdDSA"` (Ed25519) is the fastest with the shortest keys and signatures.
`"ES256"` is the most widely supported after RSA. Pick `"RS256"` when the
other side asks for it.

| Parameter | Type | Description |
| --- | --- | --- |
| `algorithm?` | `Exclude``<`[`JWTAlgorithm`](#jwtalgorithm)`, "``HS256``" \| "``HS384``" \| "``HS512``">` | The JWT algorithm the keys are for. Defaults to `"EdDSA"`. |
| `options?` | `{ modulusLength?: number }` | RSA key size in bits. Defaults to `2048`. |

```js
const { publicKey, privateKey } = await crypto.generateKeyPair();
const token = crypto.signJWT({ sub: "42" }, privateKey);
crypto.verifyJWT(token, publicKey);
```

## totpSecret

```ts
totpSecret(bytes?: number): string
```

A new two-factor secret, in the Base32 format authenticator apps expect.
Store it encrypted.

| Parameter | Type | Description |
| --- | --- | --- |
| `bytes?` | `number` | Defaults to `20`. |

```js
user.totpSecret = crypto.totpSecret();
```

## totp

```ts
totp(secret: string, options?: TOTPOptions): string
```

The current 6-digit code for a two-factor secret, as shown by
authenticator apps.

```js
crypto.totp(user.totpSecret); // "492039"
```

## verifyTOTP

```ts
verifyTOTP(token: string, secret: string, options?: VerifyTOTPOptions): boolean
```

Checks a code typed by a user. Codes from the neighbouring periods are
accepted too, to cope with clock drift.

| Parameter | Type | Description |
| --- | --- | --- |
| `token` | `string` | Spaces are ignored. |
| `secret` | `string` |  |
| `options?` | [`VerifyTOTPOptions`](#verifytotpoptions) |  |

```js
if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

## totpURI

```ts
totpURI(secret: string, options: TOTPURIOptions): string
```

The `otpauth://` link to show as a QR code when a user turns on 2FA.

```js
const uri = crypto.totpURI(user.totpSecret, { label: user.email, issuer: "My App" });
```

## randomBytes

```ts
randomBytes(size: number): Buffer<ArrayBufferLike>
```

Secure random bytes.

## randomInt

```ts
randomInt(min: number, max: number): number
```

A secure random integer from `min` to `max`, both included, with no bias.
For anything that has to be fair or unpredictable.

```js
crypto.randomInt(1, 6);       // a fair dice roll
crypto.randomInt(0, 999_999); // a 6-digit code
```

## toBase64

```ts
toBase64(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: { urlSafe?: boolean; } | undefined): string
```

Encodes to Base64, or URL-safe Base64.

```js
crypto.toBase64("héllo");                  // "aMOpbGxv"
crypto.toBase64("héllo", { urlSafe: true });
```

## fromBase64

```ts
fromBase64(text: string, options: { output: "buffer"; }): Buffer<ArrayBufferLike>
fromBase64(text: string, options?: { output?: "utf8"; } | undefined): string
```

Decodes Base64 or URL-safe Base64.

```js
crypto.fromBase64("aMOpbGxv");                     // "héllo"
crypto.fromBase64("aMOpbGxv", { output: "buffer" }); // <Buffer 68 c3 a9 6c 6c 6f>
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { DecodedJWT } from "@ix-xs/node-comfort"`.

### DecodedJWT

A decoded JWT.

| Property | Type | Description |
| --- | --- | --- |
| `header` | `{ [key: string]: unknown; alg: string; typ?: string; }` |  |
| `payload` | `P`` & `[`JWTClaims`](#jwtclaims) |  |
| `signature` | `string` | Base64URL. |

### DecryptOptions

Options for `decrypt()`.

| Property | Type | Description |
| --- | --- | --- |
| `associatedData?` | `string \| ``Buffer``<``ArrayBufferLike``>` | The value given to `encrypt()`, if any. |
| `output?` | `"buffer" \| "utf8"` | Get a string or a `Buffer`. Defaults to `"utf8"`. |

### DigestEncoding

Text encodings for digests.

```ts
type DigestEncoding = "hex" | "base64" | "base64url"
```

### EncryptOptions

Options for `encrypt()`.

| Property | Type | Description |
| --- | --- | --- |
| `associatedData?` | `string \| ``Buffer``<``ArrayBufferLike``>` | Data that's authenticated but not encrypted, like a user id. Pass the same value to `decrypt()`. |

### HashOptions

Options for `hash()` and `hmac()`.

| Property | Type | Description |
| --- | --- | --- |
| `algorithm?` | `(string & {}) \| "sha256" \| "sha384" \| "sha512" \| "sha1" \| "md5" \| "sha3-256" \| "sha3-512"` | Any algorithm OpenSSL supports. Defaults to `"sha256"`. |
| `encoding?` | [`DigestEncoding`](#digestencoding) | Defaults to `"hex"`. |

### HashPasswordOptions

Options for `hashPassword()`.

| Property | Type | Description |
| --- | --- | --- |
| `cost?` | `number` | Work factor as a power of two; each +1 doubles the time. Defaults to `15`. |
| `blockSize?` | `number` | scrypt `r`. Defaults to `8`. |
| `parallelization?` | `number` | scrypt `p`. Defaults to `1`. |
| `saltLength?` | `number` | In bytes. Defaults to `16`. |
| `keyLength?` | `number` | In bytes. Defaults to `32`. |

### JWTAlgorithm

Supported JWT algorithms. HS signs and verifies with one shared secret.
RS, PS, ES and EdDSA sign with a private key and verify with the public
one, so services that only check tokens never hold the signing key.

```ts
type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | "ES256" | "ES384" | "ES512" | "EdDSA"
```

### JWTClaims

Standard JWT claims.

| Property | Type | Description |
| --- | --- | --- |
| `iss?` | `string` | Issuer. |
| `sub?` | `string` | Subject, usually the user id. |
| `aud?` | `string \| string[]` | Audience. |
| `exp?` | `number` | Expiry, in Unix seconds. |
| `nbf?` | `number` | Not valid before, in Unix seconds. |
| `iat?` | `number` | Issued at, in Unix seconds. |
| `jti?` | `string` | Unique token id. |

### JWTKey

A key for `signJWT()` and `verifyJWT()`. For the HS algorithms it's a
shared secret. For the others it's a key pair: a PEM string, a
`KeyObject` or a JWK, private to sign and public to verify.

```ts
type JWTKey = string | Buffer | Uint8Array | KeyObject | JsonWebKey
```

### KeyPair

A pair of keys in PEM, as made by `generateKeyPair()`.

| Property | Type | Description |
| --- | --- | --- |
| `publicKey` | `string` | Give this one away: it only checks signatures. |
| `privateKey` | `string` | Keep this one secret: it signs. |

### SignJWTOptions

Options for `signJWT()`.

| Property | Type | Description |
| --- | --- | --- |
| `algorithm?` | [`JWTAlgorithm`](#jwtalgorithm) | Defaults to what fits the key: `"HS256"` for a secret, `"RS256"` for an RSA key, `"ES256"` for a P-256 key, `"EdDSA"` for an Ed25519 key. |
| `expiresIn?` | `string \| number` | Lifetime in seconds or as a duration like `"15m"`. Sets `exp`. |
| `notBefore?` | `string \| number` | Delay before the token is valid. Sets `nbf`. |
| `issuer?` | `string` | Sets `iss`. |
| `subject?` | `string` | Sets `sub`. |
| `audience?` | `string \| string[]` | Sets `aud`. |
| `jwtId?` | `string` | Sets `jti`, handy for revocation lists. |
| `noTimestamp?` | `boolean` | Don't add `iat`. |
| `header?` | `Record``<string, unknown>` | Extra header fields, like `{ kid: "2024-key" }`. |

### TOTPOptions

Options for `totp()` and `verifyTOTP()`.

| Property | Type | Description |
| --- | --- | --- |
| `digits?` | `number` | Defaults to `6`. |
| `period?` | `number` | How long a code lasts, in seconds. Defaults to `30`. |
| `algorithm?` | `"``SHA1``" \| "``SHA256``" \| "``SHA512``"` | Defaults to `"SHA1"`, which is what authenticator apps expect. |
| `time?` | `number \| ``Date` | Compute the code for this moment. Defaults to now. |

### TOTPURIOptions

Options for `totpURI()`.

| Property | Type | Description |
| --- | --- | --- |
| `label` | `string` | The account shown in the app, usually the email. |
| `issuer?` | `string` | Your app's name. |
| `digits?` | `number` | Defaults to `6`. |
| `period?` | `number` | Defaults to `30`. |
| `algorithm?` | `"``SHA1``" \| "``SHA256``" \| "``SHA512``"` | Defaults to `"SHA1"`. |

### VerifyJWTOptions

Options for `verifyJWT()`.

| Property | Type | Description |
| --- | --- | --- |
| `algorithms?` | [`JWTAlgorithm`](#jwtalgorithm)`[]` | Accepted algorithms. Defaults to the ones that fit the key, so a token can't pick a weaker one. |
| `issuer?` | `string \| string[]` | Required issuer. |
| `audience?` | `string \| string[]` | Required audience; one match is enough. |
| `subject?` | `string` | Required subject. |
| `clockTolerance?` | `number` | Seconds of slack for `exp` and `nbf` when server clocks differ. |
| `maxAge?` | `string \| number` | Reject tokens issued longer ago than this. |
| `ignoreExpiration?` | `boolean` | Skip the `exp` check. |
| `now?` | `number \| ``Date` | What time it is. Defaults to now. Handy in tests. |

### VerifyTOTPOptions

Options for `verifyTOTP()`. `window` is how many periods before and after
now are accepted (defaults to `1`).

```ts
type VerifyTOTPOptions = TOTPOptions & { window?: number; }
```
