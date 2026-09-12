# Crypto

`nc.crypto` covers the security tasks most apps have, with safe defaults, on top of `node:crypto`.

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
const card = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
```

Use a key from `generateKey()` or another long random secret. A password someone typed would be too easy to guess. `decrypt` throws if the key is wrong or the data was changed.

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

`verifyJWT` checks the algorithm, the signature, `exp`, `nbf`, and the claims you ask for (`issuer`, `audience`, `subject`, `maxAge`). HS256, HS384 and HS512 are supported. `decodeJWT` reads a token without checking it, which is fine for display but nothing more.

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

## Signing and comparing

```js
const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET);
if (!crypto.safeEqual(signature, req.headers["x-signature"])) throw new Error("Bad signature");
```

Always compare secrets with `safeEqual` rather than `===`: it takes the same time whatever the input, so it leaks nothing.

## Hashes and random values

```js
crypto.hash("hello");                                    // sha256, hex
crypto.hash(data, { algorithm: "sha512", encoding: "base64url" });
crypto.randomInt(1, 6);                                  // a fair dice roll
crypto.randomBytes(16);
crypto.toBase64("héllo", { urlSafe: true });
crypto.fromBase64("aMOpbGxv");                           // "héllo"
```
