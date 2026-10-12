---
title: "Identifiants"
description: "`nc.id` génère des identifiants uniques, des tokens et des codes courts. Ceux qui sont aléatoires proviennent du générateur sécurisé de `node:crypto`."
sidebar:
  order: 6
---

```js
const { id } = require("@ix-xs/node-comfort");

id.uuidv7();         // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
id.nano();           // "V1StGXR8_Z5jdHi6B-myT"
id.prefixed("user"); // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.token(32);        // 64 caractères hexadécimaux
id.code();           // "K7QF9X"
```

## Lequel choisir ?

| Votre besoin | À utiliser | Ressemble à |
| --- | --- | --- |
| Une clé primaire de base de données | `uuidv7()` ou `ulid()` | `0190a5c4-7c1e-7b2a-...`, `01HQ3Z8K9V3N5W7Y2XJ4T6R8PB` |
| Un identifiant aléatoire standard | `uuid()` | `3f2504e0-4f89-41d3-9a0c-...` |
| Le même identifiant pour la même entrée | `uuidv5()` | `cfbff0d1-9375-5685-968c-...` |
| Un identifiant court pour les URL | `nano()` | `V1StGXR8_Z5jdHi6B-myT` |
| Un identifiant qui dit ce qu'il désigne | `prefixed()` | `user_7Hq2mXc0LrT9aZ4bWk1PdE8s` |
| Une clé d'API, un identifiant de session ou un lien de réinitialisation | `token()` | `ebc914257945f25247d468c6cd26dbed...` |
| Un code que des personnes lisent ou saisissent | `code()` | `K7QF9X` |
| Un identifiant à la MongoDB | `objectId()` | `65f2a9c47b1e4d0c9a3f2b10` |
| Des identifiants à la Discord ou Twitter | `snowflake()` | `1215361932810932224` |

## Identifiants ordonnés dans le temps

`uuidv7()` et `ulid()` commencent par un horodatage : ils se trient donc par date de création. Les index de base de données restent compacts et les insertions restent rapides, ce qui en fait de meilleures clés primaires que les UUID aléatoires. Les identifiants produits par un même processus sont toujours croissants, même au sein d'une même milliseconde.

```js
const orderId = id.uuidv7();
id.timestamp(orderId); // le moment de sa création
```

`objectId()` donne 24 caractères hexadécimaux qui commencent par l'heure en secondes, comme les identifiants de MongoDB. `ulid()` et `objectId()` peuvent aussi encoder un instant de votre choix, ce qui est utile pour attribuer des identifiants à des lignes qui existent déjà :

```js
id.objectId();                    // "65f2a9c47b1e4d0c9a3f2b10"
id.ulid(Date.UTC(2024, 0, 1));    // "01HK153X00..." suivi de 16 caractères aléatoires
id.timestamp(id.objectId(new Date("2024-01-01"))); // 2024-01-01T00:00:00.000Z
```

L'instant est une `Date` ou un horodatage en millisecondes. S'il est négatif, fractionnaire ou invalide, une `RangeError` est levée. `timestamp()` lit un UUID v7, un ULID ou un ObjectId, et renvoie `undefined` pour tout le reste.

## Identifiants préfixés

```js
id.prefixed("user");    // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.prefixed("inv", 12); // "inv_Q0f8ZrT1bK4m"
```

Le préfixe est suivi de `_` et de 24 lettres et chiffres aléatoires, ou d'autant que vous en demandez. Un coup d'œil à une ligne de log ou à un ticket de support suffit pour savoir quel genre de chose l'identifiant désigne.

## Identifiants tirés d'un nom

`uuidv5()` n'est pas aléatoire : le même nom dans le même espace de noms donne toujours le même identifiant. Utilisez-la pour obtenir un identifiant stable à partir de quelque chose que vous avez déjà, comme une URL ou une adresse e-mail, sans stocker de table de correspondance.

```js
id.uuidv5("example.com", "dns");           // "cfbff0d1-9375-5685-968c-48ce8b15ae17", à chaque fois
id.uuidv5("https://example.com/a", "url"); // "6639460f-3425-5329-8097-a58f06127860"

const APP = "4af0209b-7fe4-57ba-b068-3b47d0855d11"; // n'importe quel UUID à vous
id.uuidv5("ada@example.com", APP);         // "60819758-1ff0-51f4-a91a-0d828ccb30ae"
```

L'espace de noms est `"dns"`, `"url"`, `"oid"`, `"x500"` ou un UUID. Toute autre valeur lève une `TypeError`. Quiconque connaît le nom et l'espace de noms peut calculer l'identifiant : ce n'est donc pas un secret.

## Tokens

```js
id.token();                // 32 octets, en hexadécimal
id.token(16, "base64url"); // plus court et utilisable dans une URL
id.token(16, "base58");    // pas de caractères qui se ressemblent
```

## Codes courts

`code()` écarte les caractères faciles à confondre (`0` et `O`, `1`, `I` et `L`) :

```js
id.code();                // "K7QF9X", pour des invitations ou des bons de réduction
id.code(6, "0123456789"); // "402917", un code numérique
```

La distribution est uniforme : aucun caractère n'est plus probable qu'un autre.

## Votre propre alphabet

```js
const orderNumber = id.customAlphabet("0123456789ABCDEF", 12);
orderNumber(); // "4F1A09C2BB7E"
```

## Snowflakes

```js
id.snowflake();                         // utilise l'époque de Discord par défaut
id.snowflake({ epoch: 1288834974657 }); // l'époque de Twitter

id.parseSnowflake("175928847299117063");
// { date: 2016-04-30T11:18:25.796Z, timestamp: 1462015105796, workerId: 1, processId: 0, increment: 7 }
```

Un Snowflake est une chaîne, car il ne tient pas dans un nombre JavaScript. `parseSnowflake()` prend une chaîne de chiffres ou un bigint, et lève une `TypeError` pour tout le reste.

## Séquences

`seq()` donne des identifiants lisibles et croissants pour chaque préfixe, au sein du processus en cours. Pratique dans les logs et les tests ; non uniques d'un processus à l'autre.

```js
id.seq("job"); // "job-1"
id.seq("job"); // "job-2"
```
