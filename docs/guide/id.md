# Ids

`nc.id` generates unique ids, tokens and short codes, all from the secure random generator in `node:crypto`.

```js
const { id } = require("@ix-xs/node-comfort");

id.uuidv7();  // "0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b"
id.nano();    // "V1StGXR8_Z5jdHi6B-myT"
id.token(32); // 64 hex characters
id.code();    // "K7QF9X"
```

## Which one should I use?

| You need | Use | Looks like |
| --- | --- | --- |
| A database primary key | `uuidv7()` or `ulid()` | `0190a5c4-7c1e-7b2a-...`, `01HQ3Z8K9V3N5W7Y2XJ4T6R8PB` |
| A standard random id | `uuid()` | `3f2504e0-4f89-41d3-9a0c-...` |
| A short id for URLs | `nano()` | `V1StGXR8_Z5jdHi6B-myT` |
| An API key, session id or reset link | `token()` | `ebc914257945f25247d468c6cd26dbed` |
| A code people read or type | `code()` | `K7QF9X` |
| Discord or Twitter-style ids | `snowflake()` | `1215361932810932224` |

## Time-ordered ids

`uuidv7()` and `ulid()` start with a timestamp, so they sort by creation time. Database indexes stay compact and inserts stay fast, which makes them better primary keys than random UUIDs. Ids made by the same process always increase, even within the same millisecond.

```js
const orderId = id.uuidv7();
id.timestamp(orderId); // when it was created
```

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
id.snowflake();                                     // uses Discord's epoch by default
id.parseSnowflake("175928847299117063").date;       // 2016-04-30T11:18:25.796Z
id.snowflake({ epoch: 1288834974657 });             // Twitter's epoch
```

## Sequences

`seq()` gives readable, increasing ids per prefix, within the current process. Handy in logs and tests; not unique across processes.

```js
id.seq("job"); // "job-1"
id.seq("job"); // "job-2"
```
