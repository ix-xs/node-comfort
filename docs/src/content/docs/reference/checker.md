---
title: "nc.checker"
description: "Type checks and validators. Every `isX` accepts anything and never throws, and most of them are type guards: inside `if (nc.isString(value))`, your editor knows `value` is a string, in JavaScript too."
sidebar:
  label: "checker"
  order: 3
---

```js
const { checker } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const checker = require("@ix-xs/node-comfort/checker");
```

These functions are also at the top level: `nc.isArray()` is `nc.checker.isArray()`.

This page lists everything `nc.checker` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/checker/).

```js
if (nc.isEmail(body.email) && nc.isPort(body.port)) connect(body);
nc.assert(user, "User not found");
```

## isArray

```ts
isArray(value: unknown): value is any[]
```

Is it an array?

```js
nc.isArray([1, 2]);        // true
nc.isArray({ length: 0 }); // false
```

## isNumber

```ts
isNumber(value: unknown): value is number
```

Is it a number? `NaN` is rejected, `Infinity` passes (see `isFinite`).

```js
nc.isNumber(42);   // true
nc.isNumber(NaN);  // false
nc.isNumber("42"); // false, use isNumeric for strings
```

## isFinite

```ts
isFinite(value: unknown): value is number
```

Is it a finite number? Unlike the global `isFinite`, strings are rejected.

```js
nc.isFinite(42);       // true
nc.isFinite(Infinity); // false
nc.isFinite("42");     // false
```

## isInteger

```ts
isInteger(value: unknown): value is number
```

Is it an integer?

```js
nc.isInteger(4);   // true
nc.isInteger(4.5); // false
```

## isSafeInteger

```ts
isSafeInteger(value: unknown): value is number
```

Is it an integer JavaScript can represent exactly (up to 2^53 - 1)?

```js
nc.isSafeInteger(2 ** 53 - 1); // true
nc.isSafeInteger(2 ** 53);     // false
```

## isFloat

```ts
isFloat(value: unknown): value is number
```

Is it a finite number with a decimal part?

```js
nc.isFloat(4.2); // true
nc.isFloat(4);   // false
```

## isPositive

```ts
isPositive(value: unknown): value is number
```

Is it a number greater than zero?

```js
nc.isPositive(3); // true
nc.isPositive(0); // false
```

## isNegative

```ts
isNegative(value: unknown): value is number
```

Is it a number lower than zero?

```js
nc.isNegative(-3); // true
nc.isNegative(0);  // false
```

## isBoolean

```ts
isBoolean(value: unknown): value is boolean
```

Is it `true` or `false`? Truthy and falsy values don't count.

```js
nc.isBoolean(false); // true
nc.isBoolean(0);     // false
```

## isString

```ts
isString(value: unknown): value is string
```

Is it a string?

```js
nc.isString("hello");             // true
nc.isString(new String("hello")); // false
```

## isSymbol

```ts
isSymbol(value: unknown): value is symbol
```

Is it a symbol?

## isBigInt

```ts
isBigInt(value: unknown): value is bigint
```

Is it a bigint?

```js
nc.isBigInt(10n); // true
nc.isBigInt(10);  // false
```

## isUndefined

```ts
isUndefined(value: unknown): value is undefined
```

Is it `undefined`?

## isNull

```ts
isNull(value: unknown): value is null
```

Is it `null`?

## isNil

```ts
isNil(value: unknown): value is null | undefined
```

Is it `null` or `undefined`?

```js
nc.isNil(undefined); // true
nc.isNil(0);         // false
```

## isDefined

```ts
isDefined<T>(value: T): value is NonNullable<T>
```

Is it anything but `null` or `undefined`? Pass it to `filter()` to drop
missing values and keep the right type.

```js
const ids = [1, null, 2, undefined].filter(nc.isDefined); // number[]
```

## isPrimitive

```ts
isPrimitive(value: unknown): value is Primitive
```

Is it a primitive (string, number, boolean, symbol, bigint, `null` or `undefined`)?

## isFunction

```ts
isFunction(value: unknown): value is (...args: any[]) => any
```

Is it callable? Classes, async and generator functions count.

## isAsyncFunction

```ts
isAsyncFunction(value: unknown): value is (...args: any[]) => Promise<any>
```

Was it declared with `async`? A function that merely returns a promise
doesn't count.

```js
nc.isAsyncFunction(async () => {});         // true
nc.isAsyncFunction(() => Promise.resolve()); // false
```

## isGeneratorFunction

```ts
isGeneratorFunction(value: unknown): value is (...args: any[]) => Generator<unknown, any, any>
```

Is it a generator function (`function*`)?

## isGenerator

```ts
isGenerator(value: unknown): value is Generator<unknown, any, any>
```

Is it a generator object, the result of calling a `function*`?

## isClass

```ts
isClass(value: unknown): value is new (...args: any[]) => any
```

Is it a `class` rather than a plain function?

```js
nc.isClass(class User {});  // true
nc.isClass(function () {}); // false
```

## isObject

```ts
isObject(value: unknown): value is object
```

Is it an object, and not `null`? Arrays, dates and class instances count;
use `isPlainObject` for `{}` literals only.

## isPlainObject

```ts
isPlainObject(value: unknown): value is Record<string, unknown>
```

Is it a plain object, made with `{}`, `new Object()` or
`Object.create(null)`? Arrays, dates, maps and class instances are rejected.

```js
nc.isPlainObject({ a: 1 });   // true
nc.isPlainObject(new Date()); // false
```

## isPromise

```ts
isPromise(value: unknown): value is PromiseLike<any>
```

Can it be awaited like a promise (anything with a `then` method)?

## isRegExp

```ts
isRegExp(value: unknown): value is RegExp
```

Is it a regular expression?

## isDate

```ts
isDate(value: unknown): value is Date
```

Is it a `Date`, valid or not? Use `isValidDate` to reject `Invalid Date`.

## isValidDate

```ts
isValidDate(value: unknown): value is Date
```

Is it a `Date` holding a real point in time?

```js
nc.isValidDate(new Date());       // true
nc.isValidDate(new Date("nope")); // false
```

## isMap

```ts
isMap(value: unknown): value is Map<unknown, unknown>
```

Is it a `Map`?

## isSet

```ts
isSet(value: unknown): value is Set<unknown>
```

Is it a `Set`?

## isWeakMap

```ts
isWeakMap(value: unknown): value is WeakMap<object, unknown>
```

Is it a `WeakMap`?

## isWeakSet

```ts
isWeakSet(value: unknown): value is WeakSet<object>
```

Is it a `WeakSet`?

## isIterable

```ts
isIterable(value: unknown): value is Iterable<unknown>
```

Does it work with `for...of`? Strings, arrays, maps, sets and generators do.

## isAsyncIterable

```ts
isAsyncIterable(value: unknown): value is AsyncIterable<unknown>
```

Does it work with `for await...of`, like streams and async generators?

## isBuffer

```ts
isBuffer(value: unknown): value is Buffer<ArrayBufferLike>
```

Is it a Node.js `Buffer`?

## isTypedArray

```ts
isTypedArray(value: unknown): value is AnyTypedArray
```

Is it a typed array (`Uint8Array`, `Float64Array`...)? Buffers count.

## isError

```ts
isError(value: unknown): value is Error
```

Is it an `Error`, including subclasses and errors from other realms?

## isEmpty

```ts
isEmpty(value: unknown): boolean
```

Is it empty? `null`, `undefined`, `""`, `[]`, `{}` and empty maps and sets
are. Numbers, booleans, functions, dates, regular expressions and errors
never are.

```js
nc.isEmpty({});  // true
nc.isEmpty(0);   // false
nc.isEmpty(" "); // false, see isBlank
```

## isBlank

```ts
isBlank(value: unknown): boolean
```

Is it `null`, `undefined`, or a string with nothing but whitespace?

```js
nc.isBlank("  \n"); // true
nc.isBlank(" a ");  // false
```

## isArrayOf

```ts
isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[]
```

Is it an array where every item passes `guard`?

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `guard` | `(item: unknown) => item is ``T` | Checked against every item, like `nc.isString`. |

```js
if (nc.isArrayOf(input, nc.isString)) input.join(", "); // input: string[]
```

## isOneOf

```ts
isOneOf<L extends readonly unknown[]>(value: unknown, allowed: L): value is L[number]
```

Is it one of the allowed values? With a constant list, the value gets the
matching literal type.

```js
const ROLES = ["admin", "user"] as const;
if (nc.isOneOf(input, ROLES)) input; // "admin" | "user"
```

## isEmail

```ts
isEmail(value: unknown): value is string
```

Does it look like an email address? The rules are practical rather than
the full RFC: one `@`, no stray dots, a real top-level domain.
International addresses are accepted.

```js
nc.isEmail("jose@exemple.fr");     // true
nc.isEmail("john..doe@example.com"); // false
nc.isEmail("john@localhost");       // false
```

## isURL

```ts
isURL(value: unknown, options?: IsURLOptions): value is string
```

Is it an absolute URL with an allowed protocol (http and https by default)?

```js
nc.isURL("https://example.com/a?b=1");                 // true
nc.isURL("ftp://example.com", { protocols: ["ftp:"] }); // true
nc.isURL("http://localhost:3000", { requireTld: true }); // false
```

## isUUID

```ts
isUUID(value: unknown, options?: IsUUIDOptions): value is string
```

Is it a UUID?

```js
nc.isUUID(nc.id.uuid());           // true
nc.isUUID(id, { version: 7 });     // only v7
```

## isJSON

```ts
isJSON(value: unknown): value is string
```

Is it a string of valid JSON?

```js
nc.isJSON('{"a":1}'); // true
nc.isJSON("{a:1}");   // false
```

## isNumeric

```ts
isNumeric(value: unknown): value is string | number
```

Is it a finite number, or a string that is exactly one (spaces around are fine)?

```js
nc.isNumeric("4.2e3"); // true
nc.isNumeric(" 12 ");  // true
nc.isNumeric("12px");  // false
```

## isIP

```ts
isIP(value: unknown, version?: 4 | 6): value is string
```

Is it an IP address?

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `version?` | `4\|6` | Only accept IPv4 or IPv6. |

```js
nc.isIP("192.168.0.1"); // true
nc.isIP("::1");         // true
nc.isIP("::1", 4);      // false
```

## isIPv4

```ts
isIPv4(value: unknown): value is string
```

Is it an IPv4 address, like `192.168.0.1`?

## isIPv6

```ts
isIPv6(value: unknown): value is string
```

Is it an IPv6 address, like `::1`?

## isPort

```ts
isPort(value: unknown): boolean
```

Is it a valid port (0 to 65535), as a number or a numeric string?

```js
nc.isPort("8080"); // true
nc.isPort(70000);  // false
```

## isHex

```ts
isHex(value: unknown): value is string
```

Is it a hexadecimal string? A `0x` prefix is allowed.

## isHexColor

```ts
isHexColor(value: unknown): value is string
```

Is it a CSS hex color (`#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`)?

```js
nc.isHexColor("#f80"); // true
nc.isHexColor("f80");  // false, the # is required
```

## isBase64

```ts
isBase64(value: unknown, options?: IsBase64Options): value is string
```

Is it valid Base64?

```js
nc.isBase64("aGVsbG8=");                   // true
nc.isBase64("aGVsbG8", { urlSafe: true }); // true
```

## isSemver

```ts
isSemver(value: unknown): value is string
```

Is it a semantic version? A leading `v` is fine.

```js
nc.isSemver("v2.0.0-rc.1"); // true
nc.isSemver("1.2");         // false
```

## isISODate

```ts
isISODate(value: unknown): value is string
```

Is it an ISO 8601 date or date-time, and a real calendar date?

```js
nc.isISODate("2024-02-29T10:00:00Z"); // true
nc.isISODate("2023-02-29");           // false, not a leap year
```

## isSlug

```ts
isSlug(value: unknown): value is string
```

Is it a URL slug like `my-first-post`? See `nc.str.slugify()` to make one.

## isAlpha

```ts
isAlpha(value: unknown): value is string
```

Is it made only of letters, in any alphabet?

```js
nc.isAlpha("Élodie"); // true
nc.isAlpha("abc1");   // false
```

## isAlphanumeric

```ts
isAlphanumeric(value: unknown): value is string
```

Is it made only of letters and digits, in any alphabet?

## isCreditCard

```ts
isCreditCard(value: unknown): value is string
```

Could it be a card number? Checks the length and the Luhn checksum;
spaces and dashes are ignored.

```js
nc.isCreditCard("4242 4242 4242 4242"); // true
```

## isJWT

```ts
isJWT(value: unknown): value is string
```

Does it look like a JSON Web Token? The signature is not verified; use
`nc.crypto.verifyJWT()` for that.

## isHostname

```ts
isHostname(value: unknown, options?: IsHostnameOptions): value is string
```

Is it a host name, like `example.com`, `api.internal` or `localhost`?
International names are accepted. IP addresses aren't: see `isIP`.

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

Is it a MAC address? Accepts `aa:bb:cc:dd:ee:ff`, `aa-bb-cc-dd-ee-ff` and
`aabb.ccdd.eeff`.

```js
nc.isMACAddress("00:1B:44:11:3A:B7"); // true
nc.isMACAddress("00:1B:44:11:3A");    // false
```

## isIBAN

```ts
isIBAN(value: unknown): value is string
```

Is it a valid IBAN? Checks the format and the checksum, spaces allowed.

```js
nc.isIBAN("FR76 3000 6000 0112 3456 7890 189"); // true
nc.isIBAN("FR76 3000 6000 0112 3456 7890 180"); // false, wrong checksum
```

## isE164

```ts
isE164(value: unknown): value is string
```

Is it a phone number in the international E.164 format: a `+`, then 7 to
15 digits, no spaces? That's what SMS and telephony APIs expect.

```js
nc.isE164("+33612345678"); // true
nc.isE164("06 12 34 56 78"); // false
```

## isObjectId

```ts
isObjectId(value: unknown): value is string
```

Is it a MongoDB ObjectId, 24 hexadecimal characters?

```js
nc.isObjectId("507f1f77bcf86cd799439011"); // true
```

## isULID

```ts
isULID(value: unknown): value is string
```

Is it a ULID, like the ones `nc.id.ulid()` makes?

```js
nc.isULID(nc.id.ulid()); // true
```

## isDataURL

```ts
isDataURL(value: unknown): value is string
```

Is it a `data:` URL, like an inline image?

```js
nc.isDataURL("data:image/png;base64,iVBORw0KGgo="); // true
nc.isDataURL("data:,Hello");                         // true
```

## isMimeType

```ts
isMimeType(value: unknown): value is string
```

Is it a media type, like `application/json` or
`text/html; charset=utf-8`?

```js
nc.isMimeType("image/svg+xml"); // true
nc.isMimeType("json");          // false
```

## isTimeZone

```ts
isTimeZone(value: unknown): value is string
```

Is it a time zone Node.js knows, like `"Europe/Paris"` or `"UTC"`?

```js
nc.isTimeZone("America/New_York"); // true
nc.isTimeZone("Mars/Olympus");     // false
```

## isLocale

```ts
isLocale(value: unknown): value is string
```

Is it a well-formed locale, like `"fr"`, `"en-GB"` or `"zh-Hant-TW"`?

```js
nc.isLocale("pt-BR"); // true
nc.isLocale("en_US"); // false, use a dash
```

## isCron

```ts
isCron(value: unknown): value is string
```

Is it a cron expression `nc.time.cron()` understands?

```js
nc.isCron("0 9 * * 1-5"); // true
nc.isCron("@daily");      // true
nc.isCron("61 * * * *");  // false
```

## isASCII

```ts
isASCII(value: unknown): value is string
```

Is it made only of ASCII characters?

```js
nc.isASCII("hello"); // true
nc.isASCII("héllo"); // false
```

## assert

```ts
assert(condition: unknown, message?: string | (() => string) | undefined): asserts condition
```

Throws an `AssertionError` if `condition` is falsy. Afterwards, TypeScript
knows the condition holds.

| Parameter | Type | Description |
| --- | --- | --- |
| `condition` | `unknown` |  |
| `message?` | `string \| (() => string)` | A message, or a function that builds it. Defaults to `"Assertion failed"`. |

**Throws** `AssertionError`

```js
const user = users.find((u) => u.id === id);
nc.assert(user, `User ${id} not found`);
user.name; // no "possibly undefined" here
```

## assertType

```ts
assertType<T>(value: unknown, guard: (value: unknown) => value is T, message?: string | (() => string) | undefined): asserts value is T
```

Throws an `AssertionError` unless `value` passes `guard`. Afterwards,
`value` has the guarded type.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `guard` | `(value: unknown) => value is ``T` | A check like `nc.isString`. |
| `message?` | `string \| (() => string)` |  |

**Throws** `AssertionError`

```js
nc.assertType(config.port, nc.isInteger, "port must be an integer");
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { AnyTypedArray } from "@ix-xs/node-comfort"`.

### AnyTypedArray

Any built-in typed array.

```ts
type AnyTypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array
```

### IsBase64Options

Options for `isBase64()`.

| Property | Type | Description |
| --- | --- | --- |
| `urlSafe?` | `boolean` | Expect the URL-safe alphabet (`-` and `_`), padding optional. |

### IsHostnameOptions

Options for `isHostname()`.

| Property | Type | Description |
| --- | --- | --- |
| `requireTld?` | `boolean` | Require a domain like `example.com`, rejecting `localhost`. |

### IsURLOptions

Options for `isURL()`.

| Property | Type | Description |
| --- | --- | --- |
| `protocols?` | `string[]` | Accepted protocols, colon included. Defaults to `["http:", "https:"]`. |
| `requireTld?` | `boolean` | Require a domain like `example.com`, rejecting `localhost` and bare IPs. |

### IsUUIDOptions

Options for `isUUID()`.

| Property | Type | Description |
| --- | --- | --- |
| `version?` | `4 \| 6 \| 1 \| 2 \| 3 \| 5 \| 7 \| 8` | Only accept this version. Otherwise versions 1 to 8 pass, plus the nil and max UUIDs. |

### Primitive

Any primitive value.

```ts
type Primitive = string | number | boolean | symbol | bigint | null | undefined
```
