---
title: "nc.checker"
description: "Vérifications de type et validateurs. Chaque `isX` accepte n'importe quelle valeur et ne lève jamais d'erreur, et la plupart sont des gardes de type : à l'intérieur de `if (nc.isString(value))`, votre éditeur sait que `value` est une chaîne, en JavaScript aussi."
sidebar:
  label: "checker"
  order: 3
---

```js
const { checker } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const checker = require("@ix-xs/node-comfort/checker");
```

Ces fonctions existent aussi à la racine : `nc.isArray()` équivaut à `nc.checker.isArray()`.

Cette page liste tout ce que contient `nc.checker`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/checker/).

```js
if (nc.isEmail(body.email) && nc.isPort(body.port)) connect(body);
nc.assert(user, "User not found");
```

## isArray

```ts
isArray(value: unknown): value is any[]
```

Est-ce un tableau ?

```js
nc.isArray([1, 2]);        // true
nc.isArray({ length: 0 }); // false
```

## isNumber

```ts
isNumber(value: unknown): value is number
```

Est-ce un nombre ? `NaN` est rejeté, `Infinity` est accepté (voir `isFinite`).

```js
nc.isNumber(42);   // true
nc.isNumber(NaN);  // false
nc.isNumber("42"); // false, use isNumeric for strings
```

## isFinite

```ts
isFinite(value: unknown): value is number
```

Est-ce un nombre fini ? Contrairement à la fonction globale `isFinite`, les chaînes sont rejetées.

```js
nc.isFinite(42);       // true
nc.isFinite(Infinity); // false
nc.isFinite("42");     // false
```

## isInteger

```ts
isInteger(value: unknown): value is number
```

Est-ce un entier ?

```js
nc.isInteger(4);   // true
nc.isInteger(4.5); // false
```

## isSafeInteger

```ts
isSafeInteger(value: unknown): value is number
```

Est-ce un entier que JavaScript peut représenter exactement (jusqu'à 2^53 - 1) ?

```js
nc.isSafeInteger(2 ** 53 - 1); // true
nc.isSafeInteger(2 ** 53);     // false
```

## isFloat

```ts
isFloat(value: unknown): value is number
```

Est-ce un nombre fini avec une partie décimale ?

```js
nc.isFloat(4.2); // true
nc.isFloat(4);   // false
```

## isPositive

```ts
isPositive(value: unknown): value is number
```

Est-ce un nombre supérieur à zéro ?

```js
nc.isPositive(3); // true
nc.isPositive(0); // false
```

## isNegative

```ts
isNegative(value: unknown): value is number
```

Est-ce un nombre inférieur à zéro ?

```js
nc.isNegative(-3); // true
nc.isNegative(0);  // false
```

## isBoolean

```ts
isBoolean(value: unknown): value is boolean
```

Est-ce `true` ou `false` ? Les valeurs truthy et falsy ne comptent pas.

```js
nc.isBoolean(false); // true
nc.isBoolean(0);     // false
```

## isString

```ts
isString(value: unknown): value is string
```

Est-ce une chaîne ?

```js
nc.isString("hello");             // true
nc.isString(new String("hello")); // false
```

## isSymbol

```ts
isSymbol(value: unknown): value is symbol
```

Est-ce un symbole ?

## isBigInt

```ts
isBigInt(value: unknown): value is bigint
```

Est-ce un bigint ?

```js
nc.isBigInt(10n); // true
nc.isBigInt(10);  // false
```

## isUndefined

```ts
isUndefined(value: unknown): value is undefined
```

Est-ce `undefined` ?

## isNull

```ts
isNull(value: unknown): value is null
```

Est-ce `null` ?

## isNil

```ts
isNil(value: unknown): value is null | undefined
```

Est-ce `null` ou `undefined` ?

```js
nc.isNil(undefined); // true
nc.isNil(0);         // false
```

## isDefined

```ts
isDefined<T>(value: T): value is NonNullable<T>
```

Est-ce autre chose que `null` ou `undefined` ? Passez-la à `filter()` pour écarter les valeurs manquantes et garder le bon type.

```js
const ids = [1, null, 2, undefined].filter(nc.isDefined); // number[]
```

## isPrimitive

```ts
isPrimitive(value: unknown): value is Primitive
```

Est-ce une primitive (chaîne, nombre, booléen, symbole, bigint, `null` ou `undefined`) ?

## isFunction

```ts
isFunction(value: unknown): value is (...args: any[]) => any
```

Peut-on l'appeler ? Les classes, les fonctions async et les fonctions génératrices comptent.

## isAsyncFunction

```ts
isAsyncFunction(value: unknown): value is (...args: any[]) => Promise<any>
```

A-t-elle été déclarée avec `async` ? Une fonction qui se contente de renvoyer une promesse ne compte pas.

```js
nc.isAsyncFunction(async () => {});         // true
nc.isAsyncFunction(() => Promise.resolve()); // false
```

## isGeneratorFunction

```ts
isGeneratorFunction(value: unknown): value is (...args: any[]) => Generator<unknown, any, any>
```

Est-ce une fonction génératrice (`function*`) ?

## isGenerator

```ts
isGenerator(value: unknown): value is Generator<unknown, any, any>
```

Est-ce un objet générateur, le résultat de l'appel d'une `function*` ?

## isClass

```ts
isClass(value: unknown): value is new (...args: any[]) => any
```

Est-ce une `class` plutôt qu'une fonction ordinaire ?

```js
nc.isClass(class User {});  // true
nc.isClass(function () {}); // false
```

## isObject

```ts
isObject(value: unknown): value is object
```

Est-ce un objet, et non `null` ? Les tableaux, les dates et les instances de classe comptent ; utilisez `isPlainObject` pour n'accepter que les littéraux `{}`.

## isPlainObject

```ts
isPlainObject(value: unknown): value is Record<string, unknown>
```

Est-ce un objet simple, créé avec `{}`, `new Object()` ou `Object.create(null)` ? Les tableaux, les dates, les maps et les instances de classe sont rejetés.

```js
nc.isPlainObject({ a: 1 });   // true
nc.isPlainObject(new Date()); // false
```

## isPromise

```ts
isPromise(value: unknown): value is PromiseLike<any>
```

Peut-on l'attendre comme une promesse (tout ce qui possède une méthode `then`) ?

## isRegExp

```ts
isRegExp(value: unknown): value is RegExp
```

Est-ce une expression régulière ?

## isDate

```ts
isDate(value: unknown): value is Date
```

Est-ce une `Date`, valide ou non ? Utilisez `isValidDate` pour rejeter `Invalid Date`.

## isValidDate

```ts
isValidDate(value: unknown): value is Date
```

Est-ce une `Date` qui représente un instant réel ?

```js
nc.isValidDate(new Date());       // true
nc.isValidDate(new Date("nope")); // false
```

## isMap

```ts
isMap(value: unknown): value is Map<unknown, unknown>
```

Est-ce une `Map` ?

## isSet

```ts
isSet(value: unknown): value is Set<unknown>
```

Est-ce un `Set` ?

## isWeakMap

```ts
isWeakMap(value: unknown): value is WeakMap<object, unknown>
```

Est-ce une `WeakMap` ?

## isWeakSet

```ts
isWeakSet(value: unknown): value is WeakSet<object>
```

Est-ce un `WeakSet` ?

## isIterable

```ts
isIterable(value: unknown): value is Iterable<unknown>
```

Est-ce utilisable avec `for...of` ? C'est le cas des chaînes, des tableaux, des maps, des sets et des générateurs.

## isAsyncIterable

```ts
isAsyncIterable(value: unknown): value is AsyncIterable<unknown>
```

Est-ce utilisable avec `for await...of`, comme les streams et les générateurs asynchrones ?

## isBuffer

```ts
isBuffer(value: unknown): value is Buffer<ArrayBufferLike>
```

Est-ce un `Buffer` Node.js ?

## isTypedArray

```ts
isTypedArray(value: unknown): value is AnyTypedArray
```

Est-ce un tableau typé (`Uint8Array`, `Float64Array`...) ? Les buffers comptent.

## isError

```ts
isError(value: unknown): value is Error
```

Est-ce une `Error`, y compris les sous-classes et les erreurs venant d'autres realms ?

## isEmpty

```ts
isEmpty(value: unknown): boolean
```

Est-ce vide ? `null`, `undefined`, `""`, `[]`, `{}` ainsi que les maps et les sets vides le sont. Les nombres, les booléens, les fonctions, les dates, les expressions régulières et les erreurs ne le sont jamais.

```js
nc.isEmpty({});  // true
nc.isEmpty(0);   // false
nc.isEmpty(" "); // false, see isBlank
```

## isBlank

```ts
isBlank(value: unknown): boolean
```

Est-ce `null`, `undefined`, ou une chaîne qui ne contient que des espaces ?

```js
nc.isBlank("  \n"); // true
nc.isBlank(" a ");  // false
```

## isArrayOf

```ts
isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[]
```

Est-ce un tableau dont chaque élément passe `guard` ?

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `guard` | `(item: unknown) => item is ``T` | Appliqué à chaque élément, comme `nc.isString`. |

```js
if (nc.isArrayOf(input, nc.isString)) input.join(", "); // input: string[]
```

## isOneOf

```ts
isOneOf<L extends readonly unknown[]>(value: unknown, allowed: L): value is L[number]
```

Est-ce l'une des valeurs autorisées ? Avec une liste constante, la valeur reçoit le type littéral correspondant.

```js
const ROLES = ["admin", "user"] as const;
if (nc.isOneOf(input, ROLES)) input; // "admin" | "user"
```

## isEmail

```ts
isEmail(value: unknown): value is string
```

Cela ressemble-t-il à une adresse e-mail ? Les règles sont pragmatiques plutôt que conformes à toute la RFC : un seul `@`, pas de point mal placé, un vrai domaine de premier niveau. Les adresses internationales sont acceptées.

```js
nc.isEmail("jose@exemple.fr");     // true
nc.isEmail("john..doe@example.com"); // false
nc.isEmail("john@localhost");       // false
```

## isURL

```ts
isURL(value: unknown, options?: IsURLOptions): value is string
```

Est-ce une URL absolue avec un protocole autorisé (http et https par défaut) ?

```js
nc.isURL("https://example.com/a?b=1");                 // true
nc.isURL("ftp://example.com", { protocols: ["ftp:"] }); // true
nc.isURL("http://localhost:3000", { requireTld: true }); // false
```

## isUUID

```ts
isUUID(value: unknown, options?: IsUUIDOptions): value is string
```

Est-ce un UUID ?

```js
nc.isUUID(nc.id.uuid());           // true
nc.isUUID(id, { version: 7 });     // only v7
```

## isJSON

```ts
isJSON(value: unknown): value is string
```

Est-ce une chaîne contenant du JSON valide ?

```js
nc.isJSON('{"a":1}'); // true
nc.isJSON("{a:1}");   // false
```

## isNumeric

```ts
isNumeric(value: unknown): value is string | number
```

Est-ce un nombre fini, ou une chaîne qui en représente exactement un (les espaces autour sont acceptés) ?

```js
nc.isNumeric("4.2e3"); // true
nc.isNumeric(" 12 ");  // true
nc.isNumeric("12px");  // false
```

## isIP

```ts
isIP(value: unknown, version?: 4 | 6): value is string
```

Est-ce une adresse IP ?

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `version?` | `4\|6` | Accepte uniquement IPv4 ou IPv6. |

```js
nc.isIP("192.168.0.1"); // true
nc.isIP("::1");         // true
nc.isIP("::1", 4);      // false
```

## isIPv4

```ts
isIPv4(value: unknown): value is string
```

Est-ce une adresse IPv4, comme `192.168.0.1` ?

## isIPv6

```ts
isIPv6(value: unknown): value is string
```

Est-ce une adresse IPv6, comme `::1` ?

## isPort

```ts
isPort(value: unknown): boolean
```

Est-ce un port valide (0 à 65535), sous forme de nombre ou de chaîne numérique ?

```js
nc.isPort("8080"); // true
nc.isPort(70000);  // false
```

## isHex

```ts
isHex(value: unknown): value is string
```

Est-ce une chaîne hexadécimale ? Un préfixe `0x` est autorisé.

## isHexColor

```ts
isHexColor(value: unknown): value is string
```

Est-ce une couleur hexadécimale CSS (`#rgb`, `#rgba`, `#rrggbb` ou `#rrggbbaa`) ?

```js
nc.isHexColor("#f80"); // true
nc.isHexColor("f80");  // false, the # is required
```

## isBase64

```ts
isBase64(value: unknown, options?: IsBase64Options): value is string
```

Est-ce du Base64 valide ?

```js
nc.isBase64("aGVsbG8=");                   // true
nc.isBase64("aGVsbG8", { urlSafe: true }); // true
```

## isSemver

```ts
isSemver(value: unknown): value is string
```

Est-ce une version sémantique ? Un `v` initial est accepté.

```js
nc.isSemver("v2.0.0-rc.1"); // true
nc.isSemver("1.2");         // false
```

## isISODate

```ts
isISODate(value: unknown): value is string
```

Est-ce une date ou une date et heure ISO 8601, et une date réelle du calendrier ?

```js
nc.isISODate("2024-02-29T10:00:00Z"); // true
nc.isISODate("2023-02-29");           // false, not a leap year
```

## isSlug

```ts
isSlug(value: unknown): value is string
```

Est-ce un slug d'URL comme `my-first-post` ? Voir `nc.str.slugify()` pour en créer un.

## isAlpha

```ts
isAlpha(value: unknown): value is string
```

Est-ce composé uniquement de lettres, quel que soit l'alphabet ?

```js
nc.isAlpha("Élodie"); // true
nc.isAlpha("abc1");   // false
```

## isAlphanumeric

```ts
isAlphanumeric(value: unknown): value is string
```

Est-ce composé uniquement de lettres et de chiffres, quel que soit l'alphabet ?

## isCreditCard

```ts
isCreditCard(value: unknown): value is string
```

Cela pourrait-il être un numéro de carte ? Vérifie la longueur et la somme de contrôle de Luhn ; les espaces et les tirets sont ignorés.

```js
nc.isCreditCard("4242 4242 4242 4242"); // true
```

## isJWT

```ts
isJWT(value: unknown): value is string
```

Cela ressemble-t-il à un JSON Web Token ? La signature n'est pas vérifiée ; utilisez `nc.crypto.verifyJWT()` pour cela.

## isHostname

```ts
isHostname(value: unknown, options?: IsHostnameOptions): value is string
```

Est-ce un nom d'hôte, comme `example.com`, `api.internal` ou `localhost` ? Les noms internationaux sont acceptés. Les adresses IP ne le sont pas : voir `isIP`.

```js
nc.isHostname("api.example.com");                    // true
nc.isHostname("localhost");                          // true
nc.isHostname("localhost", { requireTld: true });    // false
nc.isHostname("-bad-.com");                          // false
```

## isMACAddress

```ts
isMACAddress(value: unknown): value is string
```

Est-ce une adresse MAC ? Accepte `aa:bb:cc:dd:ee:ff`, `aa-bb-cc-dd-ee-ff` et `aabb.ccdd.eeff`.

```js
nc.isMACAddress("00:1B:44:11:3A:B7"); // true
nc.isMACAddress("00:1B:44:11:3A");    // false
```

## isIBAN

```ts
isIBAN(value: unknown): value is string
```

Est-ce un IBAN valide ? Vérifie le format et la somme de contrôle, espaces autorisés.

```js
nc.isIBAN("FR76 3000 6000 0112 3456 7890 189"); // true
nc.isIBAN("FR76 3000 6000 0112 3456 7890 180"); // false, wrong checksum
```

## isE164

```ts
isE164(value: unknown): value is string
```

Est-ce un numéro de téléphone au format international E.164 : un `+`, puis 7 à 15 chiffres, sans espace ? C'est ce qu'attendent les API de SMS et de téléphonie.

```js
nc.isE164("+33612345678"); // true
nc.isE164("06 12 34 56 78"); // false
```

## isObjectId

```ts
isObjectId(value: unknown): value is string
```

Est-ce un ObjectId MongoDB, 24 caractères hexadécimaux ?

```js
nc.isObjectId("507f1f77bcf86cd799439011"); // true
```

## isULID

```ts
isULID(value: unknown): value is string
```

Est-ce un ULID, comme ceux que produit `nc.id.ulid()` ?

```js
nc.isULID(nc.id.ulid()); // true
```

## isDataURL

```ts
isDataURL(value: unknown): value is string
```

Est-ce une URL `data:`, comme une image intégrée ?

```js
nc.isDataURL("data:image/png;base64,iVBORw0KGgo="); // true
nc.isDataURL("data:,Hello");                         // true
```

## isMimeType

```ts
isMimeType(value: unknown): value is string
```

Est-ce un type de média, comme `application/json` ou `text/html; charset=utf-8` ?

```js
nc.isMimeType("image/svg+xml"); // true
nc.isMimeType("json");          // false
```

## isTimeZone

```ts
isTimeZone(value: unknown): value is string
```

Est-ce un fuseau horaire connu de Node.js, comme `"Europe/Paris"` ou `"UTC"` ?

```js
nc.isTimeZone("America/New_York"); // true
nc.isTimeZone("Mars/Olympus");     // false
```

## isLocale

```ts
isLocale(value: unknown): value is string
```

Est-ce une locale bien formée, comme `"fr"`, `"en-GB"` ou `"zh-Hant-TW"` ?

```js
nc.isLocale("pt-BR"); // true
nc.isLocale("en_US"); // false, use a dash
```

## isCron

```ts
isCron(value: unknown): value is string
```

Est-ce une expression cron que `nc.time.cron()` comprend ?

```js
nc.isCron("0 9 * * 1-5"); // true
nc.isCron("@daily");      // true
nc.isCron("61 * * * *");  // false
```

## isASCII

```ts
isASCII(value: unknown): value is string
```

Est-ce composé uniquement de caractères ASCII ?

```js
nc.isASCII("hello"); // true
nc.isASCII("héllo"); // false
```

## assert

```ts
assert(condition: unknown, message?: string | (() => string) | undefined): asserts condition
```

Lève une `AssertionError` si `condition` est falsy. Ensuite, TypeScript sait que la condition est vraie.

| Paramètre | Type | Description |
| --- | --- | --- |
| `condition` | `unknown` |  |
| `message?` | `string \| (() => string)` | Un message, ou une fonction qui le construit. Par défaut : `"Assertion failed"`. |

**Lève** `AssertionError`

```js
const user = users.find((u) => u.id === id);
nc.assert(user, `User ${id} not found`);
user.name; // pas de "possibly undefined" ici
```

## assertType

```ts
assertType<T>(value: unknown, guard: (value: unknown) => value is T, message?: string | (() => string) | undefined): asserts value is T
```

Lève une `AssertionError` sauf si `value` passe `guard`. Ensuite, `value` a le type vérifié par la garde.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `guard` | `(value: unknown) => value is ``T` | Une vérification comme `nc.isString`. |
| `message?` | `string \| (() => string)` |  |

**Lève** `AssertionError`

```js
nc.assertType(config.port, nc.isInteger, "port must be an integer");
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { AnyTypedArray } from "@ix-xs/node-comfort"`.

### AnyTypedArray

N'importe quel tableau typé natif.

```ts
type AnyTypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array
```

### IsBase64Options

Options de `isBase64()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `urlSafe?` | `boolean` | Attend l'alphabet compatible avec les URL (`-` et `_`), remplissage facultatif. |

### IsHostnameOptions

Options de `isHostname()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `requireTld?` | `boolean` | Exige un domaine comme `example.com`, ce qui rejette `localhost`. |

### IsURLOptions

Options de `isURL()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `protocols?` | `string[]` | Protocoles acceptés, deux-points compris. Par défaut : `["http:", "https:"]`. |
| `requireTld?` | `boolean` | Exige un domaine comme `example.com`, ce qui rejette `localhost` et les adresses IP seules. |

### IsUUIDOptions

Options de `isUUID()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `version?` | `4 \| 6 \| 1 \| 2 \| 3 \| 5 \| 7 \| 8` | Accepte uniquement cette version. Sinon, les versions 1 à 8 passent, ainsi que les UUID nil et max. |

### Primitive

N'importe quelle valeur primitive.

```ts
type Primitive = string | number | boolean | symbol | bigint | null | undefined
```
