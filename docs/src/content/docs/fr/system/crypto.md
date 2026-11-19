---
title: "Crypto"
description: "`nc.crypto` : hachage de mots de passe, chiffrement, JSON Web Tokens, codes à deux facteurs, signatures HMAC et hashs, avec des réglages sûrs par défaut, au-dessus de `node:crypto`."
---

```js
const { crypto } = require("@ix-xs/node-comfort");
```

## Mots de passe

`hashPassword` utilise scrypt avec un sel aléatoire. La chaîne stockée garde ses réglages : elle se vérifie toujours après un changement de coût.

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$KENcz_5B...", la chaîne à stocker

if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

`verifyPassword` compare en temps constant et renvoie `false` pour un mauvais mot de passe ou un hash abîmé. Un hash qui demande plus de travail que permis (plus de 1 Gio de mémoire) lève une `RangeError` sans faire ce travail.

`needsRehash` indique quels hashs mettre à jour après une connexion réussie, vers un coût plus élevé ou un autre algorithme :

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { algorithm: "argon2id" })) {
  user.hash = await crypto.hashPassword(input, { algorithm: "argon2id" });
}
```

| Option de `hashPassword` | Par défaut | |
| --- | --- | --- |
| `algorithm` | `"scrypt"` | `"argon2id"` demande Node.js 24.7 ou plus récent, pour hacher comme pour vérifier |
| `cost` | `15` | Facteur de travail de scrypt, en puissance de deux |
| `blockSize`, `parallelization` | `8`, `1` | `r` et `p` de scrypt |
| `memory` | `19456` | Mémoire d'Argon2id en Kio, 1 Gio au plus |
| `passes`, `parallelism` | `2`, `1` | `t` et `p` d'Argon2id |
| `saltLength`, `keyLength` | `16`, `32` | En octets |

Les hashs sont des chaînes PHC standard : `verifyPassword` lit les hashs Argon2 produits ailleurs. Sur un Node.js antérieur à 24.7, un hash Argon2id lève une `NodeComfortError` de code `ERR_ARGON2_UNAVAILABLE`.

## Chiffrement

`encrypt` utilise AES-256-GCM, qui détecte aussi les modifications. Chaque appel a un sel et un nonce neufs.

```js
const key = crypto.generateKey(); // 32 octets aléatoires en Base64URL, à garder dans une variable d'environnement

const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const copy = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY));
```

`decrypt` lève une `NodeComfortError` de code `ERR_DECRYPT` pour une mauvaise clé, des données modifiées, ou un texte qui ne vient pas de `encrypt`.

| Option | De | |
| --- | --- | --- |
| `associatedData` | `encrypt`, `decrypt` | Authentifiée mais pas chiffrée, comme un identifiant d'utilisateur. La même valeur est exigée pour déchiffrer |
| `output` | `decrypt` | `"utf8"` (par défaut) ou `"buffer"` |

Utilisez une clé de `generateKey()` ou un autre long secret aléatoire, jamais un mot de passe tapé par quelqu'un.

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

Un nombre donné à `expiresIn`, `notBefore`, `maxAge` ou `clockTolerance` est en SECONDES, comme dans la RFC 7519 (`expiresIn: 900` vaut 15 minutes). Préférez une durée en texte : `"15m"`, `"30s"`.

| Option de `signJWT` | Remplit |
| --- | --- |
| `expiresIn`, `notBefore` | `exp`, `nbf` |
| `issuer`, `subject`, `audience`, `jwtId` | `iss`, `sub`, `aud`, `jti` |
| `noTimestamp` | Pas de `iat` |
| `header` | Des champs d'en-tête en plus, comme `{ kid: "2024-key" }` |
| `algorithm` | Par défaut, celui qui convient à la clé |

| Option de `verifyJWT` | Vérifie |
| --- | --- |
| `issuer`, `audience`, `subject` | La revendication ; une seule audience qui correspond suffit |
| `maxAge` | Refuse les jetons émis depuis plus longtemps |
| `clockTolerance` | Une marge pour `exp` et `nbf` |
| `ignoreExpiration` | Saute `exp` |
| `algorithms` | Par défaut, ceux qui conviennent à la clé |
| `typ` | Un en-tête `typ` exigé, comme `"at+jwt"` |
| `crit` | Les extensions d'en-tête que votre code comprend (RFC 7515) |
| `now` | L'heure actuelle, pour les tests |

`decodeJWT` lit un jeton sans le vérifier : pour l'affichage seulement.

Un secret `HS*` doit faire au moins 32 octets (RFC 7518) : un secret plus court lève une `TypeError` à la signature comme à la vérification. Tout ce qui ressemble à une clé publique ou privée (PEM, DER) est refusé comme secret.

| Erreur | `code` |
| --- | --- |
| `JWTError` | `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED` (avec `expiredAt`), `ERR_JWT_NOT_BEFORE`, `ERR_JWT_CLAIM` |
| `TypeError` | Un problème de clé : absente, trop courte, illisible, une clé publique donnée à `signJWT` |

## Paires de clés

La clé privée signe, la clé publique ne fait que vérifier :

```js
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256"); // une fois, puis stockez les deux

const token = crypto.signJWT({ sub: "42" }, privateKey, { expiresIn: "15m" });
const claims = crypto.verifyJWT(token, publicKey);
```

| Clé | Algorithme par défaut |
| --- | --- |
| Un secret | `HS256` |
| RSA | `RS256` (`PS256` et les autres avec `algorithm`) |
| P-256 | `ES256` |
| Ed25519 | `EdDSA`, ce que `generateKeyPair()` produit sans argument |

Les clés sont du texte PEM, un `KeyObject` ou une JWK. `verifyJWT` n'accepte que les algorithmes qui conviennent à sa clé : un jeton HMAC vérifié avec une clé publique échoue avec `ERR_JWT_ALGORITHM`.

## Codes à deux facteurs

```js
user.totpSecret = crypto.totpSecret();
const uri = crypto.totpURI(user.totpSecret, { label: "ada@example.com", issuer: "My App" });
// "otpauth://totp/My%20App:ada%40example.com?secret=...&issuer=My%20App&algorithm=SHA1&digits=6&period=30"

if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

`verifyTOTP` accepte le même code jusqu'à son expiration. Pour refuser un code réutilisé, gardez le pas du dernier code accepté et passez-le comme `after` :

```js
const step = crypto.totpStep(req.body.code, user.totpSecret, { after: user.totpLastStep });
if (step === undefined) throw new Error("Invalid code");
user.totpLastStep = step;
```

| Option | Par défaut | |
| --- | --- | --- |
| `digits` | `6` | |
| `period` | `30` | En SECONDES |
| `algorithm` | `"SHA1"` | `"SHA256"`, `"SHA512"`, ou en minuscules. `totpURI` l'écrit en capitales |
| `window` | `1` | Périodes voisines acceptées, de `0` à `10` |
| `after` | | Le pas du dernier code accepté |
| `time` | maintenant | Une `Date` ou des millisecondes Unix |

| Fonction | Renvoie |
| --- | --- |
| `totpSecret(bytes = 20)` | Un secret en Base32. Un secret de moins de 10 octets lève une `TypeError` |
| `totp(secret, options)` | Le code actuel |
| `verifyTOTP(code, secret, options)` | `true` ou `false` |
| `totpStep(code, secret, options)` | Le pas de temps d'un code valide, ou `undefined` |
| `totpURI(secret, options)` | L'URI `otpauth://` à afficher en QR code |

## Signatures et comparaisons

```js
// le corps brut, pas le JSON analysé
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}

const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET); // sha256, en hexadécimal

if (!crypto.safeEqual(req.headers["x-api-key"], process.env.API_KEY)) throw new Error("Forbidden");
```

| Fonction | Fait |
| --- | --- |
| `hmac(data, secret, options)` | La signature, `sha256` en hexadécimal par défaut |
| `verifyHmac(data, signature, secret, options)` | Vérification en temps constant. Un préfixe `sha256=` est ignoré, une signature absente donne `false` |
| `safeEqual(a, b)` | Comparaison en temps constant. `undefined`, `null` et `""` ne sont égaux à rien, pas même entre eux |

`hmac` et `verifyHmac` prennent `{ algorithm, encoding }`, les mêmes des deux côtés.

## Hashs et valeurs aléatoires

```js
crypto.hash("hello"); // "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
crypto.hash(data, { algorithm: "sha512", encoding: "base64url" });
crypto.randomInt(1, 6);              // un lancer de dé équitable
crypto.toBase64("héllo");            // "aMOpbGxv"
crypto.fromBase64("aMOpbGxv");       // "héllo"
```

| Fonction | Fait |
| --- | --- |
| `hash(data, { algorithm, encoding })` | `sha256` en hexadécimal par défaut ; tout algorithme d'OpenSSL |
| `randomBytes(size)` | Un `Buffer` d'octets aléatoires sûrs |
| `randomInt(min, max)` | Un entier aléatoire sûr, bornes comprises |
| `generateKey()` | 32 octets aléatoires en Base64URL |
| `toBase64(data, { urlSafe })` | Base64, ou Base64 pour les URL |
| `fromBase64(text, { output })` | Lit les deux alphabets ; du texte, ou un `Buffer` avec `output: "buffer"` |

`hash` et `hmac` lèvent une `TypeError` pour `null`, `undefined` et les objets simples : une variable non définie n'est jamais hachée comme le texte `"undefined"`.
