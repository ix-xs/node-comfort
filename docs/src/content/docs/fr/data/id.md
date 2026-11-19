---
title: "Identifiants"
description: "`nc.id` : UUID, ULID, identifiants courts, jetons, codes lisibles et Snowflakes. Les identifiants aléatoires viennent du générateur sûr de `node:crypto`."
---

```js
const { id } = require("@ix-xs/node-comfort");
```

## Choisir un identifiant

| Vous voulez | Fonction | Ressemble à |
| --- | --- | --- |
| Une clé primaire de base de données | `uuidv7()`, `ulid()` | `0190a5c4-7c1e-7b2a-...`, `01HK153X000A1CBFR48GYHVDA0` |
| Un identifiant aléatoire standard | `uuid()` | `474cc4cf-5e81-41cc-9301-...` |
| Le même identifiant pour la même entrée | `uuidv5(name, namespace)` | `cfbff0d1-9375-5685-968c-...` |
| Un identifiant court pour une URL | `nano(size?, alphabet?)` | `V1StGXR8_Z5jdHi6B-myT` |
| Un identifiant qui dit à quoi il renvoie | `prefixed(prefix, size?)` | `user_7Hq2mXc0LrT9aZ4bWk1PdE8s` |
| Une clé d'API, un identifiant de session, un lien de réinitialisation | `token(bytes?, encoding?)` | 64 caractères hexadécimaux |
| Un code qu'une personne lit ou tape | `code(length?, alphabet?)` | `K7QF9X` |
| Un identifiant à la MongoDB | `objectId(time?)` | `65f2a9c47b1e4d0c9a3f2b10` |
| Un identifiant à la Discord ou Twitter | `snowflake(options?)` | `1572925810812174336` |
| Un compteur lisible, dans un processus | `seq(prefix?)` | `job-1` |

## Identifiants ordonnés dans le temps

`uuidv7()`, `ulid()` et `objectId()` commencent par un horodatage : ils se trient par date de création, ce qui garde les index de base de données compacts. Les identifiants d'un même processus croissent toujours, même dans la même milliseconde.

```js
id.ulid(Date.UTC(2024, 0, 1));                     // "01HK153X00" puis 16 caractères aléatoires
id.timestamp(id.objectId(new Date("2024-01-01"))); // 2024-01-01T00:00:00.000Z
id.timestamp("abc");                               // undefined
```

| Fonction | Rôle |
| --- | --- |
| `ulid(time?)`, `objectId(time?)` | Encodent `time` (une `Date` ou des millisecondes) au lieu de maintenant. Un temps négatif, fractionnaire ou invalide lève une `RangeError` |
| `timestamp(value)` | La `Date` contenue dans un UUID v7, un ULID ou un ObjectId ; `undefined` pour tout le reste |

## Identifiants tirés d'un nom

`uuidv5` n'est pas aléatoire : le même nom dans le même espace de noms donne toujours le même identifiant. Quiconque connaît les deux peut le calculer.

```js
id.uuidv5("example.com", "dns");           // "cfbff0d1-9375-5685-968c-48ce8b15ae17"
id.uuidv5("https://example.com/a", "url"); // "6639460f-3425-5329-8097-a58f06127860"

const APP = "4af0209b-7fe4-57ba-b068-3b47d0855d11";
id.uuidv5("ada@example.com", APP);         // "60819758-1ff0-51f4-a91a-0d828ccb30ae"
```

L'espace de noms est `"dns"`, `"url"`, `"oid"`, `"x500"` ou un UUID ; toute autre valeur lève une `TypeError`.

## Jetons et codes

```js
id.token();                         // 32 octets, 64 caractères hexadécimaux
id.token(16, "base64url");          // "mZjcRZNGGLCQjfbTOpKPdQ"
id.prefixed("inv", 12);             // "inv_uQ9m8NGrIhTh"
id.code();                          // "K7QF9X"
id.code(6, "0123456789");           // "235733"

const orderNumber = id.customAlphabet("0123456789ABCDEF", 12);
orderNumber();                      // "4F1A09C2BB7E"
```

| Fonction | Valeurs par défaut |
| --- | --- |
| `token(bytes, encoding)` | 32 octets, `"hex"`. Encodages : `"hex"`, `"base64"`, `"base64url"`, `"base58"`, `"base32"` |
| `nano(size, alphabet)` | 21 caractères parmi les lettres, les chiffres, `_` et `-` |
| `customAlphabet(alphabet, size)` | Renvoie un générateur ; de 2 à 256 caractères, taille 21 |
| `prefixed(prefix, size)` | `prefix`, `_`, puis 24 lettres et chiffres |
| `code(length, alphabet)` | 6 caractères, sans les sosies `0`, `O`, `1`, `I`, `L` |

Chaque caractère de l'alphabet a la même probabilité.

## Snowflakes

```js
id.snowflake();                         // l'époque de Discord
id.snowflake({ epoch: 1288834974657 }); // l'époque de Twitter

id.parseSnowflake("175928847299117063");
// { date: 2016-04-30T11:18:25.796Z, timestamp: 1462015105796, workerId: 1, processId: 0, increment: 7 }
```

| Option | Par défaut |
| --- | --- |
| `epoch` | `1420070400000` (2015-01-01, Discord) |
| `workerId` | `0` (de 0 à 31) |
| `processId` | `process.pid % 32` |

Un Snowflake est une chaîne : il ne tient pas dans un nombre JavaScript. `parseSnowflake` prend une chaîne de chiffres ou un bigint, avec l'`epoch` utilisée pour le créer, et lève une `TypeError` pour tout le reste.

## Séquences

```js
id.seq("job"); // "job-1"
id.seq("job"); // "job-2"
```

Un compteur par préfixe, dans le processus courant seulement : pour les journaux et les tests, pas pour des identifiants uniques.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `id.hash()` | `nc.crypto.hash()` |
| `id.hmac()` | `nc.crypto.hmac()` |
| `id.safeEqual()` | `nc.crypto.safeEqual()` |
