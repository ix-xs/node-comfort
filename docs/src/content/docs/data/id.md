---
title: "Ids"
description: "`nc.id` generates unique ids, tokens and short codes. The random ones come from the secure generator in `node:crypto`."
sidebar:
  order: 6
---

```js
const { id } = require("@ix-xs/node-comfort");

id.uuidv7();         // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
id.nano();           // "V1StGXR8_Z5jdHi6B-myT"
id.prefixed("user"); // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.token(32);        // 64 hex characters
id.code();           // "K7QF9X"
```

## Which one should I use?

| You need | Use | Looks like |
| --- | --- | --- |
| A database primary key | `uuidv7()` or `ulid()` | `0190a5c4-7c1e-7b2a-...`, `01HQ3Z8K9V3N5W7Y2XJ4T6R8PB` |
| A standard random id | `uuid()` | `3f2504e0-4f89-41d3-9a0c-...` |
| The same id for the same input | `uuidv5()` | `cfbff0d1-9375-5685-968c-...` |
| A short id for URLs | `nano()` | `V1StGXR8_Z5jdHi6B-myT` |
| An id that says what it points to | `prefixed()` | `user_7Hq2mXc0LrT9aZ4bWk1PdE8s` |
| An API key, session id or reset link | `token()` | `ebc914257945f25247d468c6cd26dbed...` |
| A code people read or type | `code()` | `K7QF9X` |
| A MongoDB-style id | `objectId()` | `65f2a9c47b1e4d0c9a3f2b10` |
| Discord or Twitter-style ids | `snowflake()` | `1215361932810932224` |

## Time-ordered ids

`uuidv7()` and `ulid()` start with a timestamp, so they sort by creation time. Database indexes stay compact and inserts stay fast, which makes them better primary keys than random UUIDs. Ids made by the same process always increase, even within the same millisecond.

```js
const orderId = id.uuidv7();
id.timestamp(orderId); // when it was created
```

`objectId()` gives 24 hex characters that start with the time in seconds, like MongoDB's ids. `ulid()` and `objectId()` can also encode a time you choose, which helps when you give ids to rows that already exist:

```js
id.objectId();                    // "65f2a9c47b1e4d0c9a3f2b10"
id.ulid(Date.UTC(2024, 0, 1));    // "01HK153X00..." followed by 16 random characters
id.timestamp(id.objectId(new Date("2024-01-01"))); // 2024-01-01T00:00:00.000Z
```

The time is a `Date` or a timestamp in milliseconds. A negative, fractional or invalid one throws a `RangeError`. `timestamp()` reads a UUID v7, a ULID or an ObjectId, and returns `undefined` for anything else.

## Prefixed ids

```js
id.prefixed("user");    // "user_7Hq2mXc0LrT9aZ4bWk1PdE8s"
id.prefixed("inv", 12); // "inv_Q0f8ZrT1bK4m"
```

The prefix is followed by `_` and 24 random letters and digits, or as many as you ask for. One look at a log line or a support ticket tells you what kind of thing the id points to.

## Ids from a name

`uuidv5()` is not random: the same name in the same namespace always gives the same id. Use it to get a stable id from something you already have, like a URL or an email, without storing a mapping.

```js
id.uuidv5("example.com", "dns");           // "cfbff0d1-9375-5685-968c-48ce8b15ae17", every time
id.uuidv5("https://example.com/a", "url"); // "6639460f-3425-5329-8097-a58f06127860"

const APP = "4af0209b-7fe4-57ba-b068-3b47d0855d11"; // any UUID of yours
id.uuidv5("ada@example.com", APP);         // "60819758-1ff0-51f4-a91a-0d828ccb30ae"
```

The namespace is `"dns"`, `"url"`, `"oid"`, `"x500"` or a UUID. Anything else throws a `TypeError`. Anyone who knows the name and the namespace can compute the id, so it is not a secret.

## Tokens

```js
id.token();                // 32 bytes, hex
id.token(16, "base64url"); // shorter and URL-safe
id.token(16, "base58");    // no look-alike characters
```

## Short codes

`code()` skips characters that are easy to confuse (`0` and `O`, `1`, `I` and `L`):

```js
id.code();                // "K7QF9X", for invites or coupons
id.code(6, "0123456789"); // "402917", a numeric code
```

The distribution is uniform: no character is more likely than another.

## Your own alphabet

```js
const orderNumber = id.customAlphabet("0123456789ABCDEF", 12);
orderNumber(); // "4F1A09C2BB7E"
```

## Snowflakes

```js
id.snowflake();                         // uses Discord's epoch by default
id.snowflake({ epoch: 1288834974657 }); // Twitter's epoch

id.parseSnowflake("175928847299117063");
// { date: 2016-04-30T11:18:25.796Z, timestamp: 1462015105796, workerId: 1, processId: 0, increment: 7 }
```

A Snowflake is a string because it doesn't fit in a JavaScript number. `parseSnowflake()` takes a string of digits or a bigint, and throws a `TypeError` for anything else.

## Sequences

`seq()` gives readable, increasing ids per prefix, within the current process. Handy in logs and tests; not unique across processes.

```js
id.seq("job"); // "job-1"
id.seq("job"); // "job-2"
```
