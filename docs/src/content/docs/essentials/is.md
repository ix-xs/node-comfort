---
title: "Checks and assertions"
description: "`nc.is` answers \"is this value of this type or format?\" with a boolean, for any value, without throwing. `nc.assert` throws an `AssertionError` when a condition does not hold."
---

```js
const { is, assert } = require("@ix-xs/node-comfort");
```

```js
is.email("ada@example.com"); // true
is.plainObject([]);          // false
is.empty({});                // true
```

## Type guards

Most checks are TypeScript type guards, also understood by the editor in JavaScript:

```ts
function handle(input: unknown) {
  if (is.string(input)) return input.toUpperCase();
  if (is.arrayOf(input, is.number)) return input.reduce((a, b) => a + b, 0);
}

const ids = [1, null, 2, undefined].filter(is.defined); // [1, 2], typed number[]
```

## Types

| Check | True for |
| --- | --- |
| `string`, `boolean`, `symbol`, `bigInt` | That primitive type |
| `undefined`, `null` | That value |
| `nil` | `null` or `undefined` |
| `defined` | Anything but `undefined` |
| `primitive` | A string, number, boolean, symbol, bigint, `null` or `undefined` |
| `array`, `arrayOf(value, guard)` | An array; every item passing `guard` |
| `function`, `asyncFunction`, `generatorFunction` | That kind of function |
| `class` | A function written with `class` |
| `generator`, `iterable`, `asyncIterable` | That protocol |
| `promise` | A thenable |
| `date`, `validDate` | A `Date`; a `Date` that holds a real time |
| `regExp`, `error`, `buffer`, `typedArray` | That object |
| `map`, `set`, `weakMap`, `weakSet` | That collection |
| `oneOf(value, allowed)` | One of the values of `allowed` |

## Numbers

| Check | Accepts | Rejects |
| --- | --- | --- |
| `number` | `42`, `Infinity` | `NaN`, `"42"` |
| `finite` | `42` | `Infinity`, `NaN`, `"42"` |
| `integer`, `safeInteger` | `3`; up to `2 ** 53 - 1` | `3.5`; `2 ** 53` |
| `float` | `3.5` | `3` |
| `positive`, `negative` | `1`; `-1` | `0` |
| `numeric` | `42`, `"4.2e3"`, `" 12 "` | `"12px"`, `""` |

## Objects and emptiness

| Check | Accepts | Rejects |
| --- | --- | --- |
| `object` | `{}`, `[]`, `new Date()` | `null` |
| `plainObject` | `{}`, `Object.create(null)` | `[]`, `new Date()`, class instances |
| `empty` | `""`, `[]`, `{}`, an empty Map or Set, `null`, `undefined` | `" "`, `0`, `new Date()` |
| `blank` | `null`, `""`, `"  \n"` | `" a "` |

`empty` is about `null`, `undefined` and containers: numbers, booleans, functions, dates, regular expressions and errors are never empty.

## Formats

```js
is.email("josé@exemple.fr");                          // true
is.url("ftp://example.com");                          // false: http and https by default
is.url("ftp://example.com", { protocols: ["ftp:"] }); // true
is.uuid(id, { version: 7 });
is.ip("192.168.0.1", 6);                              // false
is.isoDate("2023-02-29");                             // false, the day does not exist
is.hostname("localhost", { requireTld: true });       // false
is.locale("en_US");                                   // false, write "en-US"
```

| Check | Accepts | Options |
| --- | --- | --- |
| `email` | International addresses | |
| `url` | Absolute URLs | `protocols` (`["http:", "https:"]`), `requireTld` |
| `hostname` | `api.example.com`, `localhost`. Not an IP | `requireTld` |
| `ip`, `ipv4`, `ipv6` | IP addresses | `ip(value, 4 \| 6)` |
| `port` | 0 to 65535, number or text | |
| `macAddress` | `00:1B:44:11:3A:B7` | |
| `uuid` | Versions 1 to 8, nil and max | `version` |
| `ulid`, `objectId` | A ULID; a MongoDB id | |
| `jwt` | The shape of a JWT. Verify it with `nc.crypto.verifyJWT()` | |
| `json` | Text that parses as JSON | |
| `isoDate` | ISO 8601 dates that exist | |
| `semver` | `2.0.0`, `v2.0.0-rc.1` | |
| `hex`, `hexColor` | `ff00`; `#f80`, `#ff8800` | |
| `base64` | Base64 | `urlSafe` |
| `dataUrl` | `data:` URLs | `types`, like `["image/png"]` |
| `mimeType` | `text/html; charset=utf-8` | |
| `slug` | `my-first-post` | |
| `alpha`, `alphanumeric`, `ascii` | Letters; letters and digits; ASCII only | |
| `creditCard` | Card numbers, Luhn checksum, spaces allowed | |
| `iban` | Format and checksum, spaces allowed | |
| `e164` | Phone numbers like `+33612345678` | |
| `timeZone` | A zone this Node.js knows, like `Europe/Paris` | |
| `locale` | A BCP 47 tag, like `pt-BR` | |
| `cron` | What `nc.time.cron()` understands | |

For whole objects with many rules and messages, use [`nc.schema`](/data/schema/).

## Assertions

```js
const user = users.find((u) => u.id === id);
assert(user, `User ${id} not found`); // AssertionError: User 42 not found
user.name;                            // no "possibly undefined" here

assert.type(config.port, is.integer, "port must be an integer");
assert(ready, () => describe(state)); // the message is built only on failure
```

| Function | Throws an `AssertionError` (`code` `ERR_ASSERTION`) when |
| --- | --- |
| `assert(condition, message?)` | `condition` is falsy. The default message is `"Assertion failed"` |
| `assert.type(value, guard, message?)` | `guard(value)` is false. Afterwards `value` has the guarded type |

The message can be a function that builds it. See [Errors](/basics/errors/).

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.isX()`, `nc.checker.isX()` | `nc.is.x()`: the name without `is`, first letter lowercased |
| `nc.isURL()`, `nc.isUUID()`, `nc.isJSON()`, `nc.isIP()`, `nc.isIPv4()`, `nc.isIPv6()`, `nc.isJWT()`, `nc.isIBAN()`, `nc.isULID()`, `nc.isASCII()` | `nc.is.url()`, `nc.is.uuid()`, `nc.is.json()`, `nc.is.ip()`, `nc.is.ipv4()`, `nc.is.ipv6()`, `nc.is.jwt()`, `nc.is.iban()`, `nc.is.ulid()`, `nc.is.ascii()` |
| `nc.isISODate()`, `nc.isMACAddress()`, `nc.isDataURL()`, `nc.isE164()` | `nc.is.isoDate()`, `nc.is.macAddress()`, `nc.is.dataUrl()`, `nc.is.e164()` |
| `nc.checker.assert()` | `nc.assert()` |
| `nc.assertType()`, `nc.checker.assertType()` | `nc.assert.type()` |
| `nc.checker` | `nc.is` and `nc.assert` |

`nc.assert` itself keeps its name. The old names still work in 3.0, warn once, and are removed in 4.0: see [Upgrading to 3.0](/help/upgrade-3-0/).
