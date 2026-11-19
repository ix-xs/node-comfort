---
title: "Crypto"
description: "`nc.crypto`: password hashing, encryption, JSON Web Tokens, two-factor codes, HMAC signatures and hashes, with safe defaults, on top of `node:crypto`."
---

```js
const { crypto } = require("@ix-xs/node-comfort");
```

## Passwords

`hashPassword` uses scrypt with a random salt. The stored string records its settings, so it verifies after a change of cost.

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$KENcz_5B...", store this string

if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

`verifyPassword` compares in constant time and returns `false` for a wrong password or a broken hash. A hash that asks for more work than allowed (over 1 GiB of memory) throws a `RangeError` without doing that work.

`needsRehash` says which hashes to upgrade after a successful login, to a higher cost or to another algorithm:

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { algorithm: "argon2id" })) {
  user.hash = await crypto.hashPassword(input, { algorithm: "argon2id" });
}
```

| `hashPassword` option | Default | |
| --- | --- | --- |
| `algorithm` | `"scrypt"` | `"argon2id"` needs Node.js 24.7 or later, to hash and to verify |
| `cost` | `15` | scrypt work factor as a power of two |
| `blockSize`, `parallelization` | `8`, `1` | scrypt `r` and `p` |
| `memory` | `19456` | Argon2id memory in KiB, at most 1 GiB |
| `passes`, `parallelism` | `2`, `1` | Argon2id `t` and `p` |
| `saltLength`, `keyLength` | `16`, `32` | In bytes |

Hashes are standard PHC strings: `verifyPassword` reads Argon2 hashes made elsewhere. On a Node.js older than 24.7, an Argon2id hash throws a `NodeComfortError` with the code `ERR_ARGON2_UNAVAILABLE`.

## Encryption

`encrypt` uses AES-256-GCM, which also detects tampering. Each call has a fresh salt and nonce.

```js
const key = crypto.generateKey(); // 32 random bytes as Base64URL, keep it in an environment variable

const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const copy = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
```

`decrypt` throws a `NodeComfortError` with the code `ERR_DECRYPT` for a wrong key, changed data, or text that `encrypt` did not produce.

| Option | Of | |
| --- | --- | --- |
| `associatedData` | `encrypt`, `decrypt` | Authenticated but not encrypted, like a user id. The same value is required to decrypt |
| `output` | `decrypt` | `"utf8"` (default) or `"buffer"` |

Use a key from `generateKey()` or another long random secret, never a password someone typed.

## JSON Web Tokens

```js
const token = crypto.signJWT({ sub: "42", role: "admin" }, process.env.JWT_SECRET, {
  expiresIn: "15m",
  issuer: "api.example.com",
});

try {
  const claims = crypto.verifyJWT(token, process.env.JWT_SECRET, { issuer: "api.example.com" });
} catch (error) {
  res.status(401).json({ error: error.code }); // "ERR_JWT_EXPIRED", "ERR_JWT_SIGNATURE"...
}
```

A number given to `expiresIn`, `notBefore`, `maxAge` or `clockTolerance` is in SECONDS, as in RFC 7519 (`expiresIn: 900` is 15 minutes). Prefer a duration text: `"15m"`, `"30s"`.

| `signJWT` option | Sets |
| --- | --- |
| `expiresIn`, `notBefore` | `exp`, `nbf` |
| `issuer`, `subject`, `audience`, `jwtId` | `iss`, `sub`, `aud`, `jti` |
| `noTimestamp` | No `iat` |
| `header` | Extra header fields, like `{ kid: "2024-key" }` |
| `algorithm` | Defaults to what fits the key |

| `verifyJWT` option | Checks |
| --- | --- |
| `issuer`, `audience`, `subject` | The claim; one audience match is enough |
| `maxAge` | Refuses tokens issued longer ago |
| `clockTolerance` | Slack for `exp` and `nbf` |
| `ignoreExpiration` | Skips `exp` |
| `algorithms` | Defaults to the ones that fit the key |
| `typ` | A required `typ` header, like `"at+jwt"` |
| `crit` | The header extensions your code understands (RFC 7515) |
| `now` | The current time, for tests |

`decodeJWT` reads a token without checking it: for display only.

An `HS*` secret must be at least 32 bytes (RFC 7518): a shorter one throws a `TypeError` when signing and when verifying. Anything that looks like a public or private key (PEM, DER) is refused as a secret.

| Error | `code` |
| --- | --- |
| `JWTError` | `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED` (with `expiredAt`), `ERR_JWT_NOT_BEFORE`, `ERR_JWT_CLAIM` |
| `TypeError` | A problem with the key: missing, too short, unreadable, a public key given to `signJWT` |

## Key pairs

The private key signs, the public key only verifies:

```js
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256"); // once, then store both

const token = crypto.signJWT({ sub: "42" }, privateKey, { expiresIn: "15m" });
const claims = crypto.verifyJWT(token, publicKey);
```

| Key | Algorithm by default |
| --- | --- |
| A secret | `HS256` |
| RSA | `RS256` (`PS256` and the others with `algorithm`) |
| P-256 | `ES256` |
| Ed25519 | `EdDSA`, what `generateKeyPair()` makes without an argument |

Keys are PEM text, a `KeyObject` or a JWK. `verifyJWT` only accepts the algorithms that fit its key: an HMAC token given a public key fails with `ERR_JWT_ALGORITHM`.

## Two-factor codes

```js
user.totpSecret = crypto.totpSecret();
const uri = crypto.totpURI(user.totpSecret, { label: "ada@example.com", issuer: "My App" });
// "otpauth://totp/My%20App:ada%40example.com?secret=...&issuer=My%20App&algorithm=SHA1&digits=6&period=30"

if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

`verifyTOTP` accepts the same code again until it expires. To refuse a reused code, keep the step of the last accepted one and pass it as `after`:

```js
const step = crypto.totpStep(req.body.code, user.totpSecret, { after: user.totpLastStep });
if (step === undefined) throw new Error("Invalid code");
user.totpLastStep = step;
```

| Option | Default | |
| --- | --- | --- |
| `digits` | `6` | |
| `period` | `30` | In SECONDS |
| `algorithm` | `"SHA1"` | `"SHA256"`, `"SHA512"`, or in lowercase. `totpURI` writes it in capitals |
| `window` | `1` | Neighbouring periods accepted, `0` to `10` |
| `after` | | The step of the last accepted code |
| `time` | now | A `Date` or Unix milliseconds |

| Function | Returns |
| --- | --- |
| `totpSecret(bytes = 20)` | A Base32 secret. A secret under 10 bytes throws a `TypeError` |
| `totp(secret, options)` | The current code |
| `verifyTOTP(code, secret, options)` | `true` or `false` |
| `totpStep(code, secret, options)` | The time step of a valid code, or `undefined` |
| `totpURI(secret, options)` | The `otpauth://` URI to show as a QR code |

## Signatures and comparisons

```js
// the raw body, not the parsed JSON
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}

const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET); // sha256, hex

if (!crypto.safeEqual(req.headers["x-api-key"], process.env.API_KEY)) throw new Error("Forbidden");
```

| Function | Does |
| --- | --- |
| `hmac(data, secret, options)` | The signature, `sha256` in hex by default |
| `verifyHmac(data, signature, secret, options)` | Constant-time check. A `sha256=` prefix is ignored, a missing signature gives `false` |
| `safeEqual(a, b)` | Constant-time comparison. `undefined`, `null` and `""` never equal anything, not even each other |

`hmac` and `verifyHmac` take `{ algorithm, encoding }`, the same on both sides.

## Hashes and random values

```js
crypto.hash("hello"); // "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
crypto.hash(data, { algorithm: "sha512", encoding: "base64url" });
crypto.randomInt(1, 6);              // a fair dice roll
crypto.toBase64("héllo");            // "aMOpbGxv"
crypto.fromBase64("aMOpbGxv");       // "héllo"
```

| Function | Does |
| --- | --- |
| `hash(data, { algorithm, encoding })` | `sha256` in hex by default; any OpenSSL algorithm |
| `randomBytes(size)` | A `Buffer` of secure random bytes |
| `randomInt(min, max)` | A secure random integer, both ends included |
| `generateKey()` | 32 random bytes as Base64URL |
| `toBase64(data, { urlSafe })` | Base64, or URL-safe Base64 |
| `fromBase64(text, { output })` | Reads both alphabets; text, or a `Buffer` with `output: "buffer"` |

`hash` and `hmac` throw a `TypeError` for `null`, `undefined` and plain objects, so an unset variable is never hashed as the text `"undefined"`.
