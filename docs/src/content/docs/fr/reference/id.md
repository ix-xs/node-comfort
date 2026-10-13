---
title: "nc.id"
description: "Identifiants uniques : UUID v4, v5 et v7, ULID, ObjectId, identifiants façon nanoid, Snowflakes, tokens et codes courts. Les identifiants aléatoires utilisent le générateur sécurisé de `node:crypto`, sans biais."
sidebar:
  label: "id"
  order: 12
---

```js
const { id } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const id = require("@ix-xs/node-comfort/id");
```

Cette page liste tout ce que contient `nc.id`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/id/).

```js
id.uuidv7();         // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", trié par date de création
id.nano();           // "V1StGXR8_Z5jdHi6B-myT"
id.prefixed("user"); // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.code();           // "K7QF9X"
id.token(32);        // pour les clés d'API et les liens de réinitialisation
```

## uuid

```ts
uuid(): string
```

Un UUID aléatoire (version 4). Pour des identifiants qui se trient par date, voir `uuidv7()`.

```js
id.uuid(); // "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
```

## uuidv5

```ts
uuidv5(name: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, namespace: UUIDNamespace): string
```

Un UUID v5 : le même nom dans le même espace de noms donne toujours le même identifiant. Utilisez-le pour dériver un identifiant stable de quelque chose que vous avez déjà, comme une URL ou un e-mail, sans stocker de correspondance.

| Paramètre | Type | Description |
| --- | --- | --- |
| `name` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `namespace` | [`UUIDNamespace`](#uuidnamespace) | `"dns"`, `"url"`, `"oid"`, `"x500"` ou un UUID. |

```js
id.uuidv5("example.com", "dns");          // "cfbff0d1-9375-5685-968c-48ce8b15ae17", à chaque fois
id.uuidv5("https://example.com/a", "url");
id.uuidv5("ada@example.com", MY_APP_NAMESPACE); // n'importe quel UUID sert d'espace de noms
```

## uuidv7

```ts
uuidv7(): string
```

Un UUID v7 : il commence par un horodatage, donc les identifiants se trient par date de création. Les index de base de données restent ainsi compacts, ce qui en fait d'excellentes clés primaires. Les identifiants d'un même processus augmentent toujours, même au sein d'une milliseconde, et même si l'horloge du système recule.

```js
id.uuidv7();               // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
id.timestamp(id.uuidv7()); // date de sa création
```

## ulid

```ts
ulid(time?: number | Date): string
```

Un ULID : 26 caractères compatibles avec les URL, qui se trient par date de création. Les identifiants créés dans la même milliseconde augmentent quand même.

| Paramètre | Type | Description |
| --- | --- | --- |
| `time?` | `number \| ``Date` | L'instant à encoder. Par défaut : maintenant. |

**Lève** `RangeError` : Si l'instant n'est pas un horodatage valide.

```js
id.ulid();                     // "01HQ3Z8K9V3N5W7Y2XJ4T6R8PB"
id.ulid(Date.UTC(2024, 0, 1)); // pour un instant donné
```

## objectId

```ts
objectId(time?: number | Date): string
```

Un ObjectId façon MongoDB : 24 caractères hexadécimaux qui commencent par l'heure, en secondes, et augmentent au sein du processus.

| Paramètre | Type | Description |
| --- | --- | --- |
| `time?` | `number \| ``Date` | L'instant à encoder. Par défaut : maintenant. |

**Lève** `RangeError` : Si l'instant n'est pas un horodatage valide.

```js
id.objectId();                           // "65f2a9c47b1e4d0c9a3f2b10"
id.timestamp(id.objectId());             // date de sa création, à la seconde près
id.objectId(new Date("2024-01-01"));     // pour un instant donné
```

## nano

```ts
nano(size?: number, alphabet?: string): string
```

Un identifiant aléatoire court et compatible avec les URL, comme `nanoid`. Avec 21 caractères, les collisions sont aussi improbables qu'avec un UUID.

| Paramètre | Type | Description |
| --- | --- | --- |
| `size?` | `number` | Par défaut : `21`. |
| `alphabet?` | `string` | De 2 à 256 caractères. Par défaut : les lettres, les chiffres, `_` et `-`. |

```js
id.nano();                      // "V1StGXR8_Z5jdHi6B-myT"
id.nano(10);                    // "IRFa-VaY2b"
id.nano(8, "0123456789abcdef"); // "4f90d13a"
```

## customAlphabet

```ts
customAlphabet(alphabet: string, size?: number): (size?: number) => string
```

Crée un générateur d'identifiants avec votre propre alphabet et votre propre longueur.

| Paramètre | Type | Description |
| --- | --- | --- |
| `alphabet` | `string` |  |
| `size?` | `number` | Par défaut : `21`. |

```js
const orderId = id.customAlphabet("0123456789ABCDEF", 12);
orderId(); // "4F1A09C2BB7E"
```

## prefixed

```ts
prefixed(prefix: string, size?: number): string
```

Un identifiant aléatoire avec un préfixe qui dit ce qu'il identifie, comme les `cus_...` et `sub_...` de Stripe. Un coup d'œil à une ligne de log ou à un ticket de support vous dit vers quel genre de chose pointe l'identifiant.

| Paramètre | Type | Description |
| --- | --- | --- |
| `prefix` | `string` |  |
| `size?` | `number` | Nombre de caractères aléatoires après le préfixe (lettres et chiffres). Par défaut : `24`. |

```js
id.prefixed("user");      // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.prefixed("inv", 12);   // "inv_Q0f8ZrT1bK4m"
```

## token

```ts
token(bytes?: number, encoding?: TokenEncoding): string
```

Un token aléatoire pour les clés d'API, les identifiants de session, les liens de réinitialisation...

| Paramètre | Type | Description |
| --- | --- | --- |
| `bytes?` | `number` | Quantité d'aléa, en octets. Par défaut : `32`. |
| `encoding?` | [`TokenEncoding`](#tokenencoding) | Par défaut : `"hex"`. |

```js
id.token();                // 64 caractères hexadécimaux
id.token(16, "base64url"); // 22 caractères compatibles avec les URL
id.token(16, "base58");    // sans caractères qui se ressemblent
```

## code

```ts
code(length?: number, alphabet?: string): string
```

Un code court, facile à lire à voix haute et à saisir : pas de confusion `0/O` ni `1/I/L`. Pour les invitations, les coupons et les codes de vérification.

| Paramètre | Type | Description |
| --- | --- | --- |
| `length?` | `number` | Par défaut : `6`. |
| `alphabet?` | `string` | Par défaut : `"ABCDEFGHJKMNPQRSTUVWXYZ23456789"`. |

```js
id.code();                // "K7QF9X"
id.code(4, "0123456789"); // "3920"
```

## snowflake

```ts
snowflake(options?: SnowflakeOptions): string
```

Un identifiant Snowflake, le format 64 bits utilisé par Discord et Twitter. Renvoyé sous forme de chaîne car il ne tient pas dans un nombre JavaScript.

**Lève** `RangeError` : Si l'époque est dans le futur.

```js
id.snowflake(); // "1215361932810932224"
```

## parseSnowflake

```ts
parseSnowflake(id: string | bigint, options?: SnowflakeOptions): ParsedSnowflake
```

Décode un Snowflake. Avec l'époque par défaut, il lit les identifiants Discord.

| Paramètre | Type | Description |
| --- | --- | --- |
| `id` | `string \| bigint` |  |
| `options?` | [`SnowflakeOptions`](#snowflakeoptions) | Utilisez l'époque avec laquelle il a été créé. |

**Lève** `TypeError` : Si l'identifiant n'est ni une chaîne de chiffres ni un bigint.

```js
id.parseSnowflake("175928847299117063").date; // 2016-04-30T11:18:25.796Z
```

## timestamp

```ts
timestamp(value: string): Date | undefined
```

Date de création d'un UUID v7, d'un ULID ou d'un ObjectId.

```js
id.timestamp(id.ulid());     // maintenant
id.timestamp(id.objectId()); // maintenant, à la seconde près
id.timestamp(id.uuid());     // undefined, la v4 ne contient pas de date
```

## seq

```ts
seq(prefix?: string): string
```

Des identifiants séquentiels lisibles comme `"user-1"`, `"user-2"`, comptés par préfixe. Uniques seulement au sein du processus en cours ; pratiques dans les logs et les tests.

| Paramètre | Type | Description |
| --- | --- | --- |
| `prefix?` | `string` | Par défaut : `""`. |

```js
id.seq("user"); // "user-1"
id.seq("user"); // "user-2"
```

## hash

:::caution[Obsolète]
Utilisez `nc.crypto.hash()`. Cet alias disparaît en 3.0.
:::

```ts
hash(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Calcule le hash d'une valeur.

## hmac

:::caution[Obsolète]
Utilisez `nc.crypto.hmac()`. Cet alias disparaît en 3.0.
:::

```ts
hmac(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Signe une valeur avec HMAC.

## safeEqual

:::caution[Obsolète]
Utilisez `nc.crypto.safeEqual()`. Cet alias disparaît en 3.0.
:::

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compare deux secrets en temps constant.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { ParsedSnowflake } from "@ix-xs/node-comfort"`.

### ParsedSnowflake

Un Snowflake décodé.

| Propriété | Type | Description |
| --- | --- | --- |
| `date` | `Date` | Date de sa création. |
| `timestamp` | `number` | Date de sa création, en ms. |
| `workerId` | `number` |  |
| `processId` | `number` |  |
| `increment` | `number` | Numéro de séquence au sein de la milliseconde, de 0 à 4095. |

### SnowflakeOptions

Options de `snowflake()` et `parseSnowflake()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `epoch?` | `number` | Début du temps, en ms. Par défaut : celui de Discord (2015-01-01). Twitter utilise `1288834974657`. |
| `workerId?` | `number` | De 0 à 31. Par défaut : `0`. |
| `processId?` | `number` | De 0 à 31. Par défaut : `process.pid % 32`. |

### TokenEncoding

Encodages pour `token()`.

```ts
type TokenEncoding = "hex" | "base64" | "base64url" | "base58" | "base32"
```

### UUIDNamespace

Un espace de noms pour `uuidv5()` : l'un des quatre standards, ou n'importe quel UUID à vous.

```ts
type UUIDNamespace = "dns" | "url" | "oid" | "x500" | (string & {})
```
