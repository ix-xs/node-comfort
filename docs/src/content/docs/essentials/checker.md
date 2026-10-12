---
title: "Type checks and validators"
description: "`nc.checker` answers \"what is this value?\" without surprises. Every `isX` function accepts anything and never throws. They're also available at the top level: `nc.isEmail()`."
sidebar:
  order: 3
---

```js
nc.isEmail("ada@example.com");  // true
nc.isPlainObject([]);           // false
nc.isEmpty({});                 // true
```

## They narrow types

Most checks are TypeScript type guards, which your editor also understands in JavaScript. After the check, the variable has the right type:

```ts
function handle(input: unknown) {
  if (nc.isString(input)) return input.toUpperCase();
  if (nc.isArrayOf(input, nc.isNumber)) return input.reduce((a, b) => a + b, 0);
}

const ids = [1, null, 2, undefined].filter(nc.isDefined); // number[]
```

## Picking the right check

A few pairs are easy to mix up:

| Check | Accepts | Rejects |
| --- | --- | --- |
| `isNumber` | `42`, `Infinity` | `NaN`, `"42"` |
| `isFinite` | `42` | `Infinity`, `NaN`, `"42"` |
| `isNumeric` | `42`, `"4.2e3"`, `" 12 "` | `"12px"`, `""` |
| `isObject` | `{}`, `[]`, `new Date()` | `null` |
| `isPlainObject` | `{}`, `Object.create(null)` | `[]`, `new Date()`, class instances |
| `isEmpty` | `""`, `[]`, `{}`, empty Map/Set, `null` | `" "`, `0`, `new Date()`, `/x/`, `new Error()` |
| `isBlank` | `null`, `""`, `"  \n"` | `" a "` |
| `isDate` | any `Date` | strings |
| `isValidDate` | a `Date` holding a real time | `new Date("nope")` |

`isEmpty` is for `null`, `undefined` and containers: strings, arrays, maps, sets and objects with no keys. Numbers, booleans, functions, dates, regular expressions and errors are never empty.

## Validating input

Common formats are covered:

```js
nc.isEmail("jose@exemple.fr");                 // true, international addresses are fine
nc.isURL("https://example.com/a?b=1");         // http and https by default
nc.isURL("ftp://example.com", { protocols: ["ftp:"] });
nc.isUUID(id, { version: 7 });
nc.isIP("::1"); nc.isIPv4("192.168.0.1");
nc.isPort("8080");
nc.isSemver("v2.0.0-rc.1");
nc.isISODate("2024-02-29T10:00:00Z");          // also checks the date exists
nc.isHexColor("#f80");
nc.isSlug("my-first-post");
nc.isCreditCard("4242 4242 4242 4242");        // Luhn checksum
nc.isJWT(token);                               // shape only, see crypto.verifyJWT
nc.isOneOf(role, ["admin", "user"]);
```

So are the formats of networks, banks, databases and settings:

```js
nc.isHostname("api.example.com");              // "localhost" passes too, unless { requireTld: true }
nc.isMACAddress("00:1B:44:11:3A:B7");
nc.isE164("+33612345678");                     // phone numbers the way SMS APIs expect them
nc.isIBAN("FR76 3000 6000 0112 3456 7890 189"); // format and checksum, spaces allowed
nc.isObjectId("507f1f77bcf86cd799439011");     // MongoDB ids
nc.isULID(nc.id.ulid());
nc.isDataURL("data:image/png;base64,iVBORw0KGgo=");
nc.isMimeType("text/html; charset=utf-8");
nc.isTimeZone("Europe/Paris");                 // a zone this Node.js knows
nc.isLocale("pt-BR");                          // "en_US" is rejected, use a dash
nc.isCron("0 9 * * 1-5");                      // what time.cron() understands
nc.isASCII("héllo");                           // false
```

`isHostname` rejects IP addresses: that's the job of `isIP`. The full list is in the [reference](/reference/checker/).

For whole objects with many rules and good error messages, use [`nc.schema`](/data/schema/).

## Assertions

`assert()` throws an `AssertionError` when a condition is false, and tells TypeScript the condition holds afterwards:

```js
const user = users.find((u) => u.id === id);
nc.assert(user, `User ${id} not found`);
user.name; // no "possibly undefined" here

nc.assertType(config.port, nc.isInteger, "port must be an integer");
```

Pass a function as the message if building it is expensive: `nc.assert(ok, () => describe(state))`.
