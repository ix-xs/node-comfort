---
title: "Crypto"
description: "`nc.crypto` couvre les tâches de sécurité qu'ont la plupart des applications, avec des réglages par défaut sûrs, en s'appuyant sur `node:crypto`."
sidebar:
  order: 6
---

```js
const { crypto } = require("@ix-xs/node-comfort");

const stored = await crypto.hashPassword(password);
await crypto.verifyPassword(password, stored); // true
```

## Mots de passe

`hashPassword` utilise scrypt, volontairement lent et gourmand en mémoire, avec un sel aléatoire :

```js
const stored = await crypto.hashPassword(password);
// "$scrypt$ln=15,r=8,p=1$4xY...$kq9...", stockez cette chaîne

if (!(await crypto.verifyPassword(input, user.passwordHash))) throw new Error("Invalid credentials");
```

`verifyPassword` compare en temps constant et renvoie `false` pour un mot de passe erroné ou un hash abîmé. Un hash qui demande plus de travail que permis (plus de 1 Gio de mémoire, par exemple) lève une `RangeError` à la place, sans faire ce travail : ce n'est pas un mauvais mot de passe, mais un hash à remplacer.

La chaîne stockée conserve ses réglages. Quand vous augmentez le coût par la suite, les anciens hashs se vérifient toujours, et `needsRehash` vous indique lesquels mettre à niveau après une connexion réussie :

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { cost: 16 })) {
  user.hash = await crypto.hashPassword(input, { cost: 16 });
}
```

Avec Node.js 24.7 ou plus récent, vous pouvez aussi hacher avec Argon2id, l'algorithme que recommande l'OWASP :

```js
const stored = await crypto.hashPassword(password, { algorithm: "argon2id" });
// "$argon2id$v=19$m=19456,t=2,p=1$Zm9v...$YmFy..."
```

Le hash est une chaîne PHC standard : les autres bibliothèques Argon2 savent la lire, et `verifyPassword` lit les hashs produits ailleurs. Sur un Node.js plus ancien, hacher ou vérifier un hash Argon2 lève une `NodeComfortError` avec le code `ERR_ARGON2_UNAVAILABLE`. C'est un problème de déploiement, pas un mauvais mot de passe : il n'est donc pas caché derrière `false`.

Pour faire passer vos utilisateurs de scrypt à Argon2id, indiquez à `needsRehash` l'algorithme que vous utilisez désormais. Chaque utilisateur passe au nouveau hash à sa prochaine connexion :

```js
if (await crypto.verifyPassword(input, user.hash) && crypto.needsRehash(user.hash, { algorithm: "argon2id" })) {
  user.hash = await crypto.hashPassword(input, { algorithm: "argon2id" });
}
```

## Chiffrement

`encrypt` utilise AES-256-GCM, qui détecte aussi les altérations. Chaque appel utilise un nouveau sel et un nouveau nonce : le même texte n'est donc jamais chiffré deux fois de la même façon.

```js
const key = crypto.generateKey(); // stockez-la dans une variable d'environnement

const box = crypto.encrypt(JSON.stringify(card), process.env.ENCRYPTION_KEY);
const copy = JSON.parse(crypto.decrypt(box, process.env.ENCRYPTION_KEY)); // la même carte
```

Utilisez une clé issue de `generateKey()` ou un autre long secret aléatoire. Un mot de passe saisi par quelqu'un serait trop facile à deviner.

`decrypt` lève une `NodeComfortError` avec le code `ERR_DECRYPT` quand la clé est mauvaise, quand les données ont été modifiées, et quand le texte ne vient pas du tout de `encrypt` :

```js
try {
  return crypto.decrypt(box, process.env.ENCRYPTION_KEY);
} catch (error) {
  if (error.code === "ERR_DECRYPT") return null;
  throw error;
}
```

`associatedData` lie un texte chiffré à un contexte, comme un identifiant d'utilisateur, sans le chiffrer. La même valeur est exigée pour déchiffrer.

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

`verifyJWT` vérifie l'algorithme, la signature, `exp`, `nbf` et les claims que vous demandez (`issuer`, `audience`, `subject`, `maxAge`). `decodeJWT` lit un token sans le vérifier, ce qui convient pour l'affichage, mais pour rien d'autre.

Un secret `HS*` doit faire au moins 32 octets (RFC 7518) : un secret plus court peut être deviné à partir d'un seul token. Un secret plus court lève une `TypeError`, à la signature comme à la vérification. Générez-en un une fois pour toutes et gardez-le dans une variable d'environnement :

```js
crypto.generateKey(); // 32 octets aléatoires en Base64URL, parfait pour JWT_SECRET
```

Tout ce qui ressemble à une clé publique ou privée (du texte PEM, même avec un BOM ou du texte avant son en-tête, ou des octets DER) est refusé comme secret. Sinon, quiconque possède votre clé publique pourrait signer des tokens.

Deux vérifications de plus sont là quand vous en avez besoin. `typ` exige un en-tête `typ`, comme `"at+jwt"` pour les jetons d'accès OAuth : un token fait pour un autre usage est refusé. Un token dont l'en-tête `crit` liste des extensions est refusé, sauf si vous les listez dans `crit`, comme l'exige la RFC 7515 :

```js
const claims = crypto.verifyJWT(token, process.env.JWT_SECRET, {
  typ: "at+jwt",
  clockTolerance: "30s", // des secondes, ou une durée
});
```

## Paires de clés

Avec un secret partagé, tout service capable de vérifier un token peut aussi en émettre un. Avec une paire de clés, la clé privée signe et la clé publique ne fait que vérifier :

```js
// une seule fois, puis stockez les deux clés
const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");

// le service d'authentification signe
const token = crypto.signJWT({ sub: String(user.id) }, process.env.JWT_PRIVATE_KEY, { expiresIn: "15m" });

// tous les autres services vérifient
const claims = crypto.verifyJWT(token, process.env.JWT_PUBLIC_KEY);
```

`generateKeyPair()` renvoie les deux clés sous forme de texte PEM. Sans argument, il crée des clés `"EdDSA"` (Ed25519), les plus rapides, avec les signatures les plus courtes. `"ES256"` est plus largement pris en charge, et `"RS256"` est là pour les cas où l'autre partie le demande. Outre le texte PEM, `signJWT` et `verifyJWT` acceptent un `KeyObject` ou un JWK.

L'algorithme découle de la clé : `HS256` pour un secret, `RS256` pour une clé RSA, `ES256` pour une clé P-256, `EdDSA` pour une clé Ed25519. Pour en utiliser un autre compatible avec la clé, comme `PS256` avec une clé RSA, passez `algorithm` à `signJWT`.

`verifyJWT` n'accepte que les algorithmes compatibles avec la clé qu'il a reçue. Un token signé avec HMAC est refusé là où une clé publique est attendue, avec le code `ERR_JWT_ALGORITHM`.

Un problème avec le token lève une `JWTError`. Un problème avec la clé est une erreur dans le code, et lève une `TypeError` : un secret absent ou de moins de 32 octets, une clé illisible, une clé publique passée à `signJWT`.

## Authentification à deux facteurs

```js
// Quand l'utilisateur active la 2FA
user.totpSecret = crypto.totpSecret();
const uri = crypto.totpURI(user.totpSecret, { label: user.email, issuer: "My App" });
// affichez `uri` sous forme de QR code

// À la connexion
if (!crypto.verifyTOTP(req.body.code, user.totpSecret)) throw new Error("Invalid code");
```

Les codes fonctionnent avec Google Authenticator, 1Password, Authy et les autres. Les codes des périodes de 30 secondes voisines sont acceptés pour compenser la dérive des horloges.

Un secret doit faire au moins 10 octets (16 caractères Base32), pour que les anciens secrets de 80 bits continuent de fonctionner, et un secret plus court lève une `TypeError`. Créez les nouveaux avec `totpSecret()` : 20 octets par défaut, 16 au minimum. L'option `window`, le nombre de périodes voisines acceptées, va de 0 à 10.

Seul, `verifyTOTP` accepte à nouveau le même code jusqu'à son expiration : un code aperçu par-dessus l'épaule de quelqu'un fonctionne encore pendant une minute. Pour l'éviter, utilisez `totpStep()`, qui donne le pas de temps d'un code valide, et enregistrez ce pas avec l'utilisateur. Passez-le comme `after` la fois suivante : les codes de ce pas ou d'un pas antérieur sont refusés.

```js
const step = crypto.totpStep(req.body.code, user.totpSecret, { after: user.totpLastStep });
if (step === undefined) throw new Error("Invalid code");
user.totpLastStep = step; // enregistrez-le avec l'utilisateur
```

`verifyTOTP` accepte aussi `after`, si vous conservez le pas autrement.

## Signatures de webhooks

```js
// vérifiez le corps brut, pas le JSON analysé
if (!crypto.verifyHmac(req.rawBody, req.headers["x-hub-signature-256"], process.env.WEBHOOK_SECRET)) {
  return res.status(401).end();
}
```

`verifyHmac` calcule le HMAC du corps et le compare, en temps constant, à la signature que vous avez reçue. Un préfixe `sha256=`, comme en envoie GitHub, est ignoré. Un en-tête absent donne `false`.

Pour signer ce que vous envoyez, `hmac` produit la signature :

```js
const signature = crypto.hmac(rawBody, process.env.WEBHOOK_SECRET); // sha256, hex
```

Si l'autre partie utilise un autre algorithme ou un autre encodage, passez les mêmes options aux deux : `{ algorithm: "sha512", encoding: "base64" }`.

## Comparer des secrets

```js
if (!crypto.safeEqual(req.headers["x-api-key"], process.env.API_KEY)) throw new Error("Forbidden");
```

Comparez toujours les secrets avec `safeEqual` plutôt qu'avec `===` : il prend le même temps quelle que soit l'entrée et ne laisse donc rien fuiter. Une valeur absente (`undefined` ou `null`) ou vide (`""`) n'est jamais égale à quoi que ce soit, pas même à une autre valeur absente ou vide : une `API_KEY` non définie ne peut donc pas correspondre à un en-tête vide.

## Hashs et valeurs aléatoires

```js
crypto.hash("hello");                                    // sha256, hex
crypto.hash(data, { algorithm: "sha512", encoding: "base64url" });
crypto.randomInt(1, 6);                                  // un lancer de dé équitable
crypto.randomBytes(16);
crypto.toBase64("héllo", { urlSafe: true });
crypto.fromBase64("aMOpbGxv");                           // "héllo"
```

`hash` et `hmac` lèvent une `TypeError` pour `null`, `undefined` et les objets simples, et `hmac` aussi pour un secret vide. Une variable jamais définie est refusée au lieu d'être hachée comme le texte `"undefined"`.

Toutes les fonctions sont listées dans la [référence](/reference/crypto/).
