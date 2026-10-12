---
title: "nc.id"
description: "Unique ids: UUID v4, v5 and v7, ULID, ObjectId, nanoid-style ids, Snowflakes, tokens and short codes. Random ones use the secure generator of `node:crypto`, with no bias."
sidebar:
  label: "id"
  order: 12
---

```js
const { id } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const id = require("@ix-xs/node-comfort/id");
```

This page lists everything `nc.id` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/id/).

```js
id.uuidv7();         // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", sorts by creation time
id.nano();           // "V1StGXR8_Z5jdHi6B-myT"
id.prefixed("user"); // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.code();           // "K7QF9X"
id.token(32);        // for API keys and reset links
```

## uuid

```ts
uuid(): string
```

A random UUID (version 4). For ids that sort by date, see `uuidv7()`.

```js
id.uuid(); // "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
```

## uuidv5

```ts
uuidv5(name: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, namespace: UUIDNamespace): string
```

A UUID v5: the same name in the same namespace always gives the same id.
Use it to derive a stable id from something you already have, like a URL
or an email, without storing a mapping.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string \| ``Buffer`` \| ``Uint8Array` |  |
| `namespace` | [`UUIDNamespace`](#uuidnamespace) | `"dns"`, `"url"`, `"oid"`, `"x500"` or a UUID. |

```js
id.uuidv5("example.com", "dns");          // "cfbff0d1-9375-5685-968c-48ce8b15ae17", every time
id.uuidv5("https://example.com/a", "url");
id.uuidv5("ada@example.com", MY_APP_NAMESPACE); // any UUID works as a namespace
```

## uuidv7

```ts
uuidv7(): string
```

A UUID v7: it starts with a timestamp, so ids sort by creation time.
That keeps database indexes compact, which makes them great primary
keys. Ids from the same process always increase, even within a
millisecond, and even if the system clock steps back.

```js
id.uuidv7();               // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
id.timestamp(id.uuidv7()); // when it was created
```

## ulid

```ts
ulid(time?: number | Date): string
```

A ULID: 26 URL-safe characters that sort by creation time. Ids made in
the same millisecond still increase.

| Parameter | Type | Description |
| --- | --- | --- |
| `time?` | `number \| ``Date` | The moment to encode. Defaults to now. |

**Throws** `RangeError`: If the time is not a valid timestamp.

```js
id.ulid();                     // "01HQ3Z8K9V3N5W7Y2XJ4T6R8PB"
id.ulid(Date.UTC(2024, 0, 1)); // for a given time
```

## objectId

```ts
objectId(time?: number | Date): string
```

A MongoDB-style ObjectId: 24 hex characters that start with the time, in
seconds, and increase within the process.

| Parameter | Type | Description |
| --- | --- | --- |
| `time?` | `number \| ``Date` | The moment to encode. Defaults to now. |

**Throws** `RangeError`: If the time is not a valid timestamp.

```js
id.objectId();                           // "65f2a9c47b1e4d0c9a3f2b10"
id.timestamp(id.objectId());             // when it was created, to the second
id.objectId(new Date("2024-01-01"));     // for a given time
```

## nano

```ts
nano(size?: number, alphabet?: string): string
```

A short, URL-safe random id, like `nanoid`. At 21 characters, collisions
are as unlikely as with a UUID.

| Parameter | Type | Description |
| --- | --- | --- |
| `size?` | `number` | Defaults to `21`. |
| `alphabet?` | `string` | 2 to 256 characters. Defaults to letters, digits, `_` and `-`. |

```js
id.nano();                      // "V1StGXR8_Z5jdHi6B-myT"
id.nano(10);                    // "IRFa-VaY2b"
id.nano(8, "0123456789abcdef"); // "4f90d13a"
```

## customAlphabet

```ts
customAlphabet(alphabet: string, size?: number): (size?: number) => string
```

Makes an id generator with your own alphabet and length.

| Parameter | Type | Description |
| --- | --- | --- |
| `alphabet` | `string` |  |
| `size?` | `number` | Defaults to `21`. |

```js
const orderId = id.customAlphabet("0123456789ABCDEF", 12);
orderId(); // "4F1A09C2BB7E"
```

## prefixed

```ts
prefixed(prefix: string, size?: number): string
```

A random id with a prefix that says what it identifies, like Stripe's
`cus_...` and `sub_...`. A glance at a log line or a support ticket tells
you what kind of thing the id points to.

| Parameter | Type | Description |
| --- | --- | --- |
| `prefix` | `string` |  |
| `size?` | `number` | How many random characters come after the prefix (letters and digits). Defaults to `24`. |

```js
id.prefixed("user");      // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.prefixed("inv", 12);   // "inv_Q0f8ZrT1bK4m"
```

## token

```ts
token(bytes?: number, encoding?: TokenEncoding): string
```

A random token for API keys, session ids, reset links...

| Parameter | Type | Description |
| --- | --- | --- |
| `bytes?` | `number` | How much randomness, in bytes. Defaults to `32`. |
| `encoding?` | [`TokenEncoding`](#tokenencoding) | Defaults to `"hex"`. |

```js
id.token();                // 64 hex characters
id.token(16, "base64url"); // 22 URL-safe characters
id.token(16, "base58");    // no look-alike characters
```

## code

```ts
code(length?: number, alphabet?: string): string
```

A short code that's easy to read aloud and type: no `0/O` or `1/I/L`
mix-ups. For invites, coupons and verification codes.

| Parameter | Type | Description |
| --- | --- | --- |
| `length?` | `number` | Defaults to `6`. |
| `alphabet?` | `string` | Defaults to `"ABCDEFGHJKMNPQRSTUVWXYZ23456789"`. |

```js
id.code();                // "K7QF9X"
id.code(4, "0123456789"); // "3920"
```

## snowflake

```ts
snowflake(options?: SnowflakeOptions): string
```

A Snowflake id, the 64-bit format used by Discord and Twitter. Returned
as a string because it doesn't fit in a JavaScript number.

**Throws** `RangeError`: If the epoch is in the future.

```js
id.snowflake(); // "1215361932810932224"
```

## parseSnowflake

```ts
parseSnowflake(id: string | bigint, options?: SnowflakeOptions): ParsedSnowflake
```

Decodes a Snowflake. With the default epoch, it reads Discord ids.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | `string \| bigint` |  |
| `options?` | [`SnowflakeOptions`](#snowflakeoptions) | Use the epoch it was created with. |

**Throws** `TypeError`: If the id is not a string of digits or a bigint.

```js
id.parseSnowflake("175928847299117063").date; // 2016-04-30T11:18:25.796Z
```

## timestamp

```ts
timestamp(value: string): Date | undefined
```

When a UUID v7, a ULID or an ObjectId was created.

```js
id.timestamp(id.ulid());     // now
id.timestamp(id.objectId()); // now, to the second
id.timestamp(id.uuid());     // undefined, v4 has no time in it
```

## seq

```ts
seq(prefix?: string): string
```

Readable sequential ids like `"user-1"`, `"user-2"`, counted per prefix.
Only unique within the current process; handy in logs and tests.

| Parameter | Type | Description |
| --- | --- | --- |
| `prefix?` | `string` | Defaults to `""`. |

```js
id.seq("user"); // "user-1"
id.seq("user"); // "user-2"
```

## hash

:::caution[Deprecated]
Use `nc.crypto.hash()`. This alias goes away in 3.0.
:::

```ts
hash(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Hashes a value.

## hmac

:::caution[Deprecated]
Use `nc.crypto.hmac()`. This alias goes away in 3.0.
:::

```ts
hmac(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Signs a value with HMAC.

## safeEqual

:::caution[Deprecated]
Use `nc.crypto.safeEqual()`. This alias goes away in 3.0.
:::

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compares two secrets in constant time.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { ParsedSnowflake } from "@ix-xs/node-comfort"`.

### ParsedSnowflake

A decoded Snowflake.

| Property | Type | Description |
| --- | --- | --- |
| `date` | `Date` | When it was created. |
| `timestamp` | `number` | When it was created, in ms. |
| `workerId` | `number` |  |
| `processId` | `number` |  |
| `increment` | `number` | Sequence number within the millisecond, 0 to 4095. |

### SnowflakeOptions

Options for `snowflake()` and `parseSnowflake()`.

| Property | Type | Description |
| --- | --- | --- |
| `epoch?` | `number` | Start of time, in ms. Defaults to Discord's (2015-01-01). Twitter uses `1288834974657`. |
| `workerId?` | `number` | 0 to 31. Defaults to `0`. |
| `processId?` | `number` | 0 to 31. Defaults to `process.pid % 32`. |

### TokenEncoding

Encodings for `token()`.

```ts
type TokenEncoding = "hex" | "base64" | "base64url" | "base58" | "base32"
```

### UUIDNamespace

A namespace for `uuidv5()`: one of the four standard ones, or any UUID of
your own.

```ts
type UUIDNamespace = "dns" | "url" | "oid" | "x500" | (string & {})
```
