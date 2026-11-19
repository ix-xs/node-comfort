---
title: "Ids"
description: "`nc.id`: UUIDs, ULIDs, short ids, tokens, readable codes and Snowflakes. Random ids come from the secure generator of `node:crypto`."
---

```js
const { id } = require("@ix-xs/node-comfort");
```

## Choosing an id

| You need | Function | Looks like |
| --- | --- | --- |
| A database primary key | `uuidv7()`, `ulid()` | `0190a5c4-7c1e-7b2a-...`, `01HK153X000A1CBFR48GYHVDA0` |
| A standard random id | `uuid()` | `474cc4cf-5e81-41cc-9301-...` |
| The same id for the same input | `uuidv5(name, namespace)` | `cfbff0d1-9375-5685-968c-...` |
| A short id for URLs | `nano(size?, alphabet?)` | `V1StGXR8_Z5jdHi6B-myT` |
| An id that says what it points to | `prefixed(prefix, size?)` | `user_7Hq2mXc0LrT9aZ4bWk1PdE8s` |
| An API key, a session id, a reset link | `token(bytes?, encoding?)` | 64 hex characters |
| A code people read or type | `code(length?, alphabet?)` | `K7QF9X` |
| A MongoDB-style id | `objectId(time?)` | `65f2a9c47b1e4d0c9a3f2b10` |
| A Discord or Twitter-style id | `snowflake(options?)` | `1572925810812174336` |
| A readable counter, in one process | `seq(prefix?)` | `job-1` |

## Time-ordered ids

`uuidv7()`, `ulid()` and `objectId()` start with a timestamp: they sort by creation time, which keeps database indexes compact. Ids made by one process always increase, even within the same millisecond.

```js
id.ulid(Date.UTC(2024, 0, 1));                     // "01HK153X00" then 16 random characters
id.timestamp(id.objectId(new Date("2024-01-01"))); // 2024-01-01T00:00:00.000Z
id.timestamp("abc");                               // undefined
```

| Function | Does |
| --- | --- |
| `ulid(time?)`, `objectId(time?)` | Encode `time` (a `Date` or milliseconds) instead of now. A negative, fractional or invalid time throws a `RangeError` |
| `timestamp(value)` | The `Date` inside a UUID v7, a ULID or an ObjectId; `undefined` for anything else |

## Ids from a name

`uuidv5` is not random: the same name in the same namespace always gives the same id. Anyone who knows both can compute it.

```js
id.uuidv5("example.com", "dns");           // "cfbff0d1-9375-5685-968c-48ce8b15ae17"
id.uuidv5("https://example.com/a", "url"); // "6639460f-3425-5329-8097-a58f06127860"

const APP = "4af0209b-7fe4-57ba-b068-3b47d0855d11";
id.uuidv5("ada@example.com", APP);         // "60819758-1ff0-51f4-a91a-0d828ccb30ae"
```

The namespace is `"dns"`, `"url"`, `"oid"`, `"x500"` or a UUID; anything else throws a `TypeError`.

## Tokens and codes

```js
id.token();                         // 32 bytes, 64 hex characters
id.token(16, "base64url");          // "mZjcRZNGGLCQjfbTOpKPdQ"
id.prefixed("inv", 12);             // "inv_uQ9m8NGrIhTh"
id.code();                          // "K7QF9X"
id.code(6, "0123456789");           // "235733"

const orderNumber = id.customAlphabet("0123456789ABCDEF", 12);
orderNumber();                      // "4F1A09C2BB7E"
```

| Function | Defaults |
| --- | --- |
| `token(bytes, encoding)` | 32 bytes, `"hex"`. Encodings: `"hex"`, `"base64"`, `"base64url"`, `"base58"`, `"base32"` |
| `nano(size, alphabet)` | 21 characters among letters, digits, `_` and `-` |
| `customAlphabet(alphabet, size)` | Returns a generator; 2 to 256 characters, size 21 |
| `prefixed(prefix, size)` | `prefix`, `_`, then 24 letters and digits |
| `code(length, alphabet)` | 6 characters, without the look-alikes `0`, `O`, `1`, `I`, `L` |

Every character of the alphabet is equally likely.

## Snowflakes

```js
id.snowflake();                         // Discord's epoch
id.snowflake({ epoch: 1288834974657 }); // Twitter's epoch

id.parseSnowflake("175928847299117063");
// { date: 2016-04-30T11:18:25.796Z, timestamp: 1462015105796, workerId: 1, processId: 0, increment: 7 }
```

| Option | Default |
| --- | --- |
| `epoch` | `1420070400000` (2015-01-01, Discord) |
| `workerId` | `0` (0 to 31) |
| `processId` | `process.pid % 32` |

A Snowflake is a string: it does not fit in a JavaScript number. `parseSnowflake` takes a string of digits or a bigint, with the `epoch` it was made with, and throws a `TypeError` for anything else.

## Sequences

```js
id.seq("job"); // "job-1"
id.seq("job"); // "job-2"
```

One counter per prefix, in the current process only: for logs and tests, not for unique ids.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `id.hash()` | `nc.crypto.hash()` |
| `id.hmac()` | `nc.crypto.hmac()` |
| `id.safeEqual()` | `nc.crypto.safeEqual()` |
