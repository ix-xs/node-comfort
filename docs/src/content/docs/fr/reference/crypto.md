---
title: "nc.crypto"
description: "La cryptographie sans les pièges, construite sur `node:crypto` : hashes, HMAC, hachage de mots de passe (scrypt), chiffrement (AES-256-GCM), JWT, codes à deux facteurs (TOTP) et valeurs aléatoires sûres."
sidebar:
  label: "crypto"
  order: 23
---

```js
const { crypto } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const crypto = require("@ix-xs/node-comfort/crypto");
```

Cette page liste tout ce que contient `nc.crypto`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/crypto/).

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

Calcule le hash de données, en SHA-256 et en hexadécimal par défaut.

| Paramètre | Type | Description |
| --- | --- | --- |
| `data` | `string \| ``Buffer`` \| ``Uint8Array` | Les chaînes sont lues en UTF-8. |
| `options?` | [`HashOptions`](#hashoptions) |  |

```js
crypto.hash("hello");
crypto.hash("hello", { algorithm: "sha512", encoding: "base64url" });
```

## hmac

```ts
hmac(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Une signature HMAC : un hash calculé avec un secret comme clé. C'est la façon habituelle de signer et de vérifier les webhooks.

```js
const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET);
crypto.safeEqual(signature, req.headers["x-signature"]);
```

## verifyHmac

```ts
verifyHmac(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, signature: unknown, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): boolean
```

Vérifie, en temps constant, une signature HMAC que vous avez reçue. Un préfixe `sha256=`, comme en envoient GitHub et d'autres, est ignoré.

| Paramètre | Type | Description |
| --- | --- | --- |
| `data` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `signature` | `unknown` | Ce que l'expéditeur a calculé. Tout ce qui n'est pas une chaîne identique donne `false`. |
| `secret` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `options?` | [`HashOptions`](#hashoptions) | Doit correspondre à ce que l'expéditeur a utilisé. |

```js
// une route de webhook Express : signez le corps brut, pas le JSON analysé
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}
```

## safeEqual

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compare deux secrets en temps constant : la comparaison ne peut donc rien laisser fuiter par sa durée, pas même leurs longueurs. Utilisez-la à la place de `===` pour les tokens, les signatures et les clés d'API. Une valeur absente (`undefined`, `null`) n'est jamais égale à quoi que ce soit.

```js
if (!crypto.safeEqual(providedKey, process.env.API_KEY)) throw new Error("Forbidden");
```

## hashPassword

```ts
hashPassword(password: string, options?: HashPasswordOptions): Promise<string>
```

Calcule le hash d'un mot de passe avec scrypt et un sel aléatoire. Le résultat enregistre ses propres paramètres : vous pouvez donc augmenter le coût plus tard sans casser les anciens hashes.

**Lève** `RangeError` : Si les paramètres sont hors limites, par exemple un coût qui demande plus de 1 Gio de mémoire.

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", store this
```

## verifyPassword

```ts
verifyPassword(password: string, stored: string): Promise<boolean>
```

Vérifie un mot de passe par rapport à un hash stocké, en temps constant. Un mauvais mot de passe ou un hash corrompu donne `false`, jamais une erreur.

```js
if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

## needsRehash

```ts
needsRehash(stored: string, options?: HashPasswordOptions): boolean
```

Ce hash a-t-il été créé avec des paramètres plus faibles que les vôtres ? Si oui, recalculez le hash du mot de passe juste après une connexion réussie.

| Paramètre | Type | Description |
| --- | --- | --- |
| `stored` | `string` |  |
| `options?` | [`HashPasswordOptions`](#hashpasswordoptions) | Les paramètres que vous utilisez aujourd'hui. |

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
  user.hash = await crypto.hashPassword(input, { cost: 16 });
}
```

## generateKey

```ts
generateKey(): string
```

Une clé aléatoire de 256 bits pour `encrypt()`, sous forme de texte que vous pouvez placer dans une variable d'environnement.

## encrypt

```ts
encrypt(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: EncryptOptions): string
```

Chiffre des données avec AES-256-GCM, qui détecte aussi les altérations. Chaque appel utilise un sel et un nonce nouveaux : un même texte n'est donc jamais chiffré deux fois de la même façon.

Utilisez une clé issue de `generateKey()` ou un autre long secret aléatoire, pas un mot de passe saisi par quelqu'un : il serait facile à trouver par force brute.

**Renvoie** `string` : Une chaîne compacte, adaptée aux URL.

```js
const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const card = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
```

## decrypt

```ts
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options: DecryptOptions & { output: "buffer"; }): Buffer<ArrayBufferLike>
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: DecryptOptions): string
```

Déchiffre ce que `encrypt()` a produit. Lève une erreur de code `ERR_DECRYPT` si le secret est faux ou si les données ont été modifiées.

```js
const text = crypto.decrypt(box, SECRET);
const bytes = crypto.decrypt(box, SECRET, { output: "buffer" });
```

## signJWT

```ts
signJWT(payload: Record<string, unknown>, secret: JWTKey, options?: SignJWTOptions): string
```

Crée un JSON Web Token signé. `iat` est ajouté pour vous.

Avec un secret, le token est signé avec HMAC. Avec une clé privée, il est signé avec cette clé, et quiconque détient la clé publique peut le vérifier sans pouvoir émettre de tokens.

| Paramètre | Type | Description |
| --- | --- | --- |
| `payload` | `Record``<string, unknown>` |  |
| `secret` | [`JWTKey`](#jwtkey) | Pour les algorithmes HS, au moins 32 octets aléatoires. Sinon, une clé privée. |
| `options?` | [`SignJWTOptions`](#signjwtoptions) |  |

**Lève** `TypeError` : Si la clé est inutilisable ou ne convient pas à l'algorithme.

```js
const token = crypto.signJWT({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
  expiresIn: "15m",
  issuer: "api.example.com",
});

// paire de clés : le service d'authentification signe, tous les autres services vérifient
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");
const signed = crypto.signJWT({ sub: "42" }, privateKey, { expiresIn: "15m" });
crypto.verifyJWT(signed, publicKey);
```

## decodeJWT

```ts
decodeJWT<P = Record<string, unknown>>(token: string): DecodedJWT<P>
```

Lit un JWT sans le vérifier. Suffisant pour de l'affichage ; appelez `verifyJWT()` avant de vous fier à quoi que ce soit dedans.

**Lève** `JWTError` : Avec le code `ERR_JWT_MALFORMED` si le token est illisible.

```js
crypto.decodeJWT(token).payload.exp;
```

## verifyJWT

```ts
verifyJWT<P = Record<string, unknown>>(token: string, secret: JWTKey, options?: VerifyJWTOptions): P & JWTClaims
```

Vérifie un JWT : algorithme, signature, expiration et les claims que vous exigez. Renvoie le payload, ou lève une `JWTError` dont le `code` indique ce qui ne va pas.

Les algorithmes acceptés découlent de la clé que vous passez : un token signé avec HMAC n'est donc jamais accepté là où une clé publique est attendue.

| Paramètre | Type | Description |
| --- | --- | --- |
| `token` | `string` |  |
| `secret` | [`JWTKey`](#jwtkey) | Le secret partagé, ou la clé publique pour les tokens RS, PS, ES et EdDSA. |
| `options?` | [`VerifyJWTOptions`](#verifyjwtoptions) |  |

**Lève** `JWTError`

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

Crée une paire de clés pour signer des JWT : la clé privée signe, la clé publique vérifie. Les deux sont fournies en texte PEM, prêtes pour une variable d'environnement ou un fichier.

`"EdDSA"` (Ed25519) est le plus rapide, avec les clés et les signatures les plus courtes. `"ES256"` est le plus largement pris en charge après RSA. Choisissez `"RS256"` quand l'autre partie le demande.

| Paramètre | Type | Description |
| --- | --- | --- |
| `algorithm?` | `Exclude``<`[`JWTAlgorithm`](#jwtalgorithm)`, "``HS256``" \| "``HS384``" \| "``HS512``">` | L'algorithme JWT auquel les clés sont destinées. Par défaut : `"EdDSA"`. |
| `options?` | `{ modulusLength?: number }` | Taille de la clé RSA en bits. Par défaut : `2048`. |

```js
const { publicKey, privateKey } = await crypto.generateKeyPair();
const token = crypto.signJWT({ sub: "42" }, privateKey);
crypto.verifyJWT(token, publicKey);
```

## totpSecret

```ts
totpSecret(bytes?: number): string
```

Un nouveau secret à deux facteurs, au format Base32 attendu par les applications d'authentification. Stockez-le chiffré.

| Paramètre | Type | Description |
| --- | --- | --- |
| `bytes?` | `number` | Par défaut : `20`. |

```js
user.totpSecret = crypto.totpSecret();
```

## totp

```ts
totp(secret: string, options?: TOTPOptions): string
```

Le code à 6 chiffres en cours pour un secret à deux facteurs, tel que l'affichent les applications d'authentification.

```js
crypto.totp(user.totpSecret); // "492039"
```

## verifyTOTP

```ts
verifyTOTP(token: string, secret: string, options?: VerifyTOTPOptions): boolean
```

Vérifie un code saisi par un utilisateur. Les codes des périodes voisines sont aussi acceptés, pour tolérer les décalages d'horloge.

| Paramètre | Type | Description |
| --- | --- | --- |
| `token` | `string` | Les espaces sont ignorés. |
| `secret` | `string` |  |
| `options?` | [`VerifyTOTPOptions`](#verifytotpoptions) |  |

```js
if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

## totpURI

```ts
totpURI(secret: string, options: TOTPURIOptions): string
```

Le lien `otpauth://` à afficher sous forme de QR code quand un utilisateur active la 2FA.

```js
const uri = crypto.totpURI(user.totpSecret, { label: user.email, issuer: "My App" });
```

## randomBytes

```ts
randomBytes(size: number): Buffer<ArrayBufferLike>
```

Des octets aléatoires sûrs.

## randomInt

```ts
randomInt(min: number, max: number): number
```

Un entier aléatoire sûr de `min` à `max`, bornes incluses, sans biais. Pour tout ce qui doit être équitable ou imprévisible.

```js
crypto.randomInt(1, 6);       // un lancer de dé équitable
crypto.randomInt(0, 999_999); // un code à 6 chiffres
```

## toBase64

```ts
toBase64(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: { urlSafe?: boolean; } | undefined): string
```

Encode en Base64, ou en Base64 adapté aux URL.

```js
crypto.toBase64("héllo");                  // "aMOpbGxv"
crypto.toBase64("héllo", { urlSafe: true });
```

## fromBase64

```ts
fromBase64(text: string, options: { output: "buffer"; }): Buffer<ArrayBufferLike>
fromBase64(text: string, options?: { output?: "utf8"; } | undefined): string
```

Décode du Base64 ou du Base64 adapté aux URL.

```js
crypto.fromBase64("aMOpbGxv");                     // "héllo"
crypto.fromBase64("aMOpbGxv", { output: "buffer" }); // <Buffer 68 c3 a9 6c 6c 6f>
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { DecodedJWT } from "@ix-xs/node-comfort"`.

### DecodedJWT

Un JWT décodé.

| Propriété | Type | Description |
| --- | --- | --- |
| `header` | `{ [key: string]: unknown; alg: string; typ?: string; }` |  |
| `payload` | `P`` & `[`JWTClaims`](#jwtclaims) |  |
| `signature` | `string` | Base64URL. |

### DecryptOptions

Options de `decrypt()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `associatedData?` | `string \| ``Buffer``<``ArrayBufferLike``>` | La valeur donnée à `encrypt()`, s'il y en a une. |
| `output?` | `"buffer" \| "utf8"` | Pour obtenir une chaîne ou un `Buffer`. Par défaut : `"utf8"`. |

### DigestEncoding

Encodages texte pour les empreintes.

```ts
type DigestEncoding = "hex" | "base64" | "base64url"
```

### EncryptOptions

Options de `encrypt()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `associatedData?` | `string \| ``Buffer``<``ArrayBufferLike``>` | Des données authentifiées mais non chiffrées, comme un identifiant d'utilisateur. Passez la même valeur à `decrypt()`. |

### HashOptions

Options de `hash()` et `hmac()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `algorithm?` | `(string & {}) \| "sha256" \| "sha384" \| "sha512" \| "sha1" \| "md5" \| "sha3-256" \| "sha3-512"` | Tout algorithme pris en charge par OpenSSL. Par défaut : `"sha256"`. |
| `encoding?` | [`DigestEncoding`](#digestencoding) | Par défaut : `"hex"`. |

### HashPasswordOptions

Options de `hashPassword()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `cost?` | `number` | Facteur de travail, en puissance de deux ; chaque +1 double le temps. Par défaut : `15`. |
| `blockSize?` | `number` | Le `r` de scrypt. Par défaut : `8`. |
| `parallelization?` | `number` | Le `p` de scrypt. Par défaut : `1`. |
| `saltLength?` | `number` | En octets. Par défaut : `16`. |
| `keyLength?` | `number` | En octets. Par défaut : `32`. |

### JWTAlgorithm

Algorithmes JWT pris en charge. HS signe et vérifie avec un seul secret partagé. RS, PS, ES et EdDSA signent avec une clé privée et vérifient avec la clé publique : les services qui ne font que vérifier des tokens ne détiennent donc jamais la clé de signature.

```ts
type JWTAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | "ES256" | "ES384" | "ES512" | "EdDSA"
```

### JWTClaims

Claims JWT standard.

| Propriété | Type | Description |
| --- | --- | --- |
| `iss?` | `string` | Émetteur. |
| `sub?` | `string` | Sujet, en général l'identifiant de l'utilisateur. |
| `aud?` | `string \| string[]` | Audience. |
| `exp?` | `number` | Expiration, en secondes Unix. |
| `nbf?` | `number` | Début de validité, en secondes Unix. |
| `iat?` | `number` | Date d'émission, en secondes Unix. |
| `jti?` | `string` | Identifiant unique du token. |

### JWTKey

Une clé pour `signJWT()` et `verifyJWT()`. Pour les algorithmes HS, c'est un secret partagé. Pour les autres, c'est une paire de clés : une chaîne PEM, un `KeyObject` ou un JWK, privée pour signer et publique pour vérifier.

```ts
type JWTKey = string | Buffer | Uint8Array | KeyObject | JsonWebKey
```

### KeyPair

Une paire de clés en PEM, telle que la crée `generateKeyPair()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `publicKey` | `string` | Diffusez celle-ci : elle ne fait que vérifier les signatures. |
| `privateKey` | `string` | Gardez celle-ci secrète : elle signe. |

### SignJWTOptions

Options de `signJWT()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `algorithm?` | [`JWTAlgorithm`](#jwtalgorithm) | Par défaut : ce qui convient à la clé, c'est-à-dire `"HS256"` pour un secret, `"RS256"` pour une clé RSA, `"ES256"` pour une clé P-256, `"EdDSA"` pour une clé Ed25519. |
| `expiresIn?` | `string \| number` | Durée de vie en secondes, ou sous forme de durée comme `"15m"`. Définit `exp`. |
| `notBefore?` | `string \| number` | Délai avant que le token soit valide. Définit `nbf`. |
| `issuer?` | `string` | Définit `iss`. |
| `subject?` | `string` | Définit `sub`. |
| `audience?` | `string \| string[]` | Définit `aud`. |
| `jwtId?` | `string` | Définit `jti`, pratique pour les listes de révocation. |
| `noTimestamp?` | `boolean` | N'ajoute pas `iat`. |
| `header?` | `Record``<string, unknown>` | Champs d'en-tête supplémentaires, comme `{ kid: "2024-key" }`. |

### TOTPOptions

Options de `totp()` et `verifyTOTP()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `digits?` | `number` | Par défaut : `6`. |
| `period?` | `number` | Durée de validité d'un code, en secondes. Par défaut : `30`. |
| `algorithm?` | `"``SHA1``" \| "``SHA256``" \| "``SHA512``"` | Par défaut : `"SHA1"`, ce qu'attendent les applications d'authentification. |
| `time?` | `number \| ``Date` | Calcule le code pour cet instant. Par défaut : maintenant. |

### TOTPURIOptions

Options de `totpURI()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `label` | `string` | Le compte affiché dans l'application, en général l'adresse e-mail. |
| `issuer?` | `string` | Le nom de votre application. |
| `digits?` | `number` | Par défaut : `6`. |
| `period?` | `number` | Par défaut : `30`. |
| `algorithm?` | `"``SHA1``" \| "``SHA256``" \| "``SHA512``"` | Par défaut : `"SHA1"`. |

### VerifyJWTOptions

Options de `verifyJWT()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `algorithms?` | [`JWTAlgorithm`](#jwtalgorithm)`[]` | Algorithmes acceptés. Par défaut : ceux qui conviennent à la clé, de sorte qu'un token ne peut pas en choisir un plus faible. |
| `issuer?` | `string \| string[]` | Émetteur exigé. |
| `audience?` | `string \| string[]` | Audience exigée ; une seule correspondance suffit. |
| `subject?` | `string` | Sujet exigé. |
| `clockTolerance?` | `number` | Secondes de tolérance pour `exp` et `nbf` quand les horloges des serveurs diffèrent. |
| `maxAge?` | `string \| number` | Refuse les tokens émis depuis plus longtemps que cette durée. |
| `ignoreExpiration?` | `boolean` | Ne vérifie pas `exp`. |
| `now?` | `number \| ``Date` | L'heure qu'il est. Par défaut : maintenant. Pratique dans les tests. |

### VerifyTOTPOptions

Options de `verifyTOTP()`. `window` est le nombre de périodes acceptées avant et après maintenant (par défaut : `1`).

```ts
type VerifyTOTPOptions = TOTPOptions & { window?: number; }
```
