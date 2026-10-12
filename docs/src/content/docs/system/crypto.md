---
title: "Crypto"
description: "`nc.crypto` covers the security tasks most apps have, with safe defaults, on top of `node:crypto`."
sidebar:
  order: 6
---

```js
const { crypto } = require("@ix-xs/node-comfort");

const stored = await crypto.hashPassword(password);
await crypto.verifyPassword(password, stored); // true
```

## Passwords

`hashPassword` uses scrypt, which is slow and memory-hungry on purpose, with a random salt:

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", store this string

if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

`verifyPassword` compares in constant time and returns `false` for a wrong password or a broken hash; it doesn't throw.

The stored string records its settings. When you raise the cost later, old hashes still verify, and `needsRehash` tells you which ones to upgrade after a successful login:

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
  user.hash = await crypto.hashPassword(input, { cost: 16 });
}
```

## Encryption

`encrypt` uses AES-256-GCM, which also detects tampering. Each call uses a fresh salt and nonce, so the same text never encrypts the same way twice.

```js
const key = crypto.generateKey(); // store it in an environment variable

const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const copy = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY)); // the same card
```

Use a key from `generateKey()` or another long random secret. A password someone typed would be too easy to guess.

`decrypt` throws a `NodeComfortError` with the code `ERR_DECRYPT` when the key is wrong, when the data was changed, and when the text didn't come from `encrypt` at all:

```js
try {
  return crypto.decrypt(box, process.env.ENCRYPTION_KEY);
} catch (error) {
  if (error.code === "ERR_DECRYPT") return null;
  throw error;
}
```

`associatedData` binds a ciphertext to a context, like a user id, without encrypting it. The same value is required to decrypt.

## JSON Web Tokens

```js
const token = crypto.signJWT({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
  expiresIn: "15m",
  issuer: "api.example.com",
});

try {
  const claims = crypto.verifyJWT(token, process.env.JWT_SECRET, { issuer: "api.example.com" });
} catch (error) {
  res.status(401).json({ error: error.code }); // "ERR_JWT_EXPIRED", "ERR_JWT_SIGNATURE"...
}
```

`verifyJWT` checks the algorithm, the signature, `exp`, `nbf`, and the claims you ask for (`issuer`, `audience`, `subject`, `maxAge`). `decodeJWT` reads a token without checking it, which is fine for display but nothing more.

## Key pairs

With a shared secret, every service that can check a token can also issue one. With a key pair, the private key signs and the public key only verifies:

```js
// once, then store both keys
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");

// the auth service signs
const token = crypto.signJWT({ sub: String(user.id) }, process.env.JWT_PRIVATE_KEY, { expiresIn: "15m" });

// every other service verifies
const claims = crypto.verifyJWT(token, process.env.JWT_PUBLIC_KEY);
```

`generateKeyPair()` returns both keys as PEM text. Without an argument it makes `"EdDSA"` keys (Ed25519), the fastest, with the shortest signatures. `"ES256"` is more widely supported, and `"RS256"` is there for when the other side asks for it. Besides PEM text, `signJWT` and `verifyJWT` take a `KeyObject` or a JWK.

The algorithm follows from the key: `HS256` for a secret, `RS256` for an RSA key, `ES256` for a P-256 key, `EdDSA` for an Ed25519 key. To use another one that fits the key, like `PS256` with an RSA key, pass `algorithm` to `signJWT`.

`verifyJWT` only accepts the algorithms that fit the key it was given. A token signed with HMAC is refused where a public key is expected, with the code `ERR_JWT_ALGORITHM`.

A problem with the token throws a `JWTError`. A problem with the key is a mistake in the code, and throws a `TypeError`: a missing or empty secret, a key that can't be read, a public key given to `signJWT`.

## Two-factor authentication

```js
// When the user turns on 2FA
user.totpSecret = crypto.totpSecret();
const uri = crypto.totpURI(user.totpSecret, { label: user.email, issuer: "My App" });
// show `uri` as a QR code

// At login
if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

The codes work with Google Authenticator, 1Password, Authy and the rest. Codes from the neighbouring 30-second periods are accepted to cope with clock drift.

## Webhook signatures

```js
// sign the raw body, not the parsed JSON
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}
```

`verifyHmac` computes the HMAC of the body and compares it with the signature you received, in constant time. A leading `sha256=`, as GitHub sends, is ignored. A missing header gives `false`.

To sign what you send, `hmac` makes the signature:

```js
const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET); // sha256, hex
```

If the other side uses another algorithm or encoding, pass the same options to both: `{ algorithm: "sha512", encoding: "base64" }`.

## Comparing secrets

```js
if (!crypto.safeEqual(req.headers["x-api-key"], process.env.API_KEY)) throw new Error("Forbidden");
```

Always compare secrets with `safeEqual` rather than `===`: it takes the same time whatever the input, so it leaks nothing. A missing value (`undefined` or `null`) never equals anything, not even another missing value.

## Hashes and random values

```js
crypto.hash("hello");                                    // sha256, hex
crypto.hash(data, { algorithm: "sha512", encoding: "base64url" });
crypto.randomInt(1, 6);                                  // a fair dice roll
crypto.randomBytes(16);
crypto.toBase64("héllo", { urlSafe: true });
crypto.fromBase64("aMOpbGxv");                           // "héllo"
```

`hash` and `hmac` throw a `TypeError` for `null`, `undefined` and plain objects, and `hmac` for an empty secret too. A variable that was never set is refused instead of being hashed as the text `"undefined"`.

Every function is listed in the [reference](/reference/crypto/).
