---
title: "Numbers"
description: "`nc.num`: decimal rounding, ranges, statistics, percentages, and formatting of numbers, money and sizes in any language."
---

```js
const { num } = require("@ix-xs/node-comfort");
```

## Rounding

`Math.round(1.005 * 100) / 100` gives `1`, because `1.005` is stored as `1.00499...`. These functions round the decimal value:

```js
num.round(1.005, 2);             // 1.01
num.round(1234, -2);             // 1200
num.round(-2.5);                 // -3
num.floor(1.789, 2);             // 1.78
num.ceil(1.231, 2);              // 1.24
num.snap(17, 5);                 // 15
num.approxEqual(0.1 + 0.2, 0.3); // true
```

| Function | Does |
| --- | --- |
| `round(value, decimals?)` | Halves go away from zero, as in a spreadsheet. Negative `decimals` round to tens, hundreds... |
| `floor(value, decimals?)`, `ceil(value, decimals?)` | Down or up, to `decimals` places |
| `snap(value, step)` | Nearest multiple of `step` |
| `approxEqual(a, b, epsilon?)` | Equal within a tolerance relative to the size of the numbers |

## Ranges

```js
num.clamp(150, 0, 100);         // 100
num.inRange(10, 0, 10);         // true
num.wrap(-1, 0, 5);             // 4
num.lerp(0, 100, 0.25);         // 25
num.mapRange(5, 0, 10, 0, 100); // 50
num.range(0, 10, 2);            // [0, 2, 4, 6, 8]
num.range(5);                   // [0, 1, 2, 3, 4]
```

| Function | Does |
| --- | --- |
| `clamp(value, min, max)` | Keeps `value` between `min` and `max` |
| `inRange(value, min, max)` | `true` when `min <= value <= max` |
| `wrap(value, min, max)` | Wraps around, like a carousel: past `max` back to `min` |
| `lerp(start, end, t)` | The value at `t` (0 to 1) between `start` and `end` |
| `mapRange(value, inMin, inMax, outMin, outMax)` | Moves a value from one range to another |
| `range(start, end?, step?)` | Numbers from `start` up to `end`, excluded. One argument counts from 0 |

## Statistics

```js
num.sum([0.1, 0.2, 0.3]);                          // 0.6
num.average([2, 4, 9]);                            // 5
num.median([1, 2, 3, 4]);                          // 2.5
num.mode([1, 1, 2, 2, 3]);                         // [1, 2]
num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]);              // 2
num.percentile([10, 20, 30, 40, 50], 95);          // 48
num.max([1, NaN, 3]);                              // NaN
num.min([]);                                       // undefined
```

| Function | Does |
| --- | --- |
| `sum`, `product` | `sum` compensates rounding errors: a plain loop gives `0.6000000000000001` above |
| `average`, `median`, `mode` | `mode` returns every most frequent value |
| `variance`, `stdDev` | Population by default, `{ sample: true }` divides by n - 1 |
| `percentile(values, p)` | `p` from 0 to 100, interpolated like `PERCENTILE.INC` |
| `min`, `max` | Any length (no stack overflow as with `Math.max(...list)`), `NaN` if one value is `NaN`, `undefined` for an empty list |

Every function takes any iterable of numbers. A total of prices is still a binary float: round it with `num.round(total, 2)` before showing it.

## Percentages

```js
num.percent(25, 200);       // 12.5
num.percent(1, 3, 1);       // 33.3
num.percentChange(80, 100); // 25
num.percentChange(100, 80); // -20
num.percentChange(0, 5);    // Infinity
```

| Function | Does |
| --- | --- |
| `percent(value, total, decimals = 2)` | The share of a total. `0` when `total` is `0` |
| `percentChange(from, to, decimals = 2)` | The change from `from` to `to`. `Infinity` from `0`: test with `Number.isFinite()` |

## Formatting

`format` wraps `Intl.NumberFormat`:

```js
num.format(1234567.891);                      // "1,234,567.891"
num.format(1234567.891, { locale: "de" });    // "1.234.567,891"
num.format(0.256, { style: "percent" });      // "26%"
num.format(1500, { compact: true });          // "1.5K"
num.format(3.5, { unit: "kilometer" });       // "3.5 km"
num.format(2, { decimals: 2 });               // "2.00"
num.format(5, { signDisplay: "exceptZero" }); // "+5"
```

| `format` option | Default | |
| --- | --- | --- |
| `locale` | `nc.config.get().locale` | Language, like `"fr"` or `"en-US"` |
| `decimals` | | Exact number of decimals |
| `minDecimals`, `maxDecimals` | `maxDecimals: 3` | |
| `compact` | `false` | `1.2K`, `3.4M` |
| `style` | `"decimal"` | `"percent"` multiplies by 100 |
| `unit`, `unitDisplay` | `unitDisplay: "short"` | Any `Intl` unit: `"kilometer"`, `"celsius"`, `"megabyte"` |
| `signDisplay` | `"auto"` | `"always"`, `"never"`, `"exceptZero"` |
| `grouping` | `true` | Thousands separators |

Money, sizes, ordinals:

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
num.formatBytes(1536);                         // "1.5 KB"
num.formatBytes(1000, { binary: false });      // "1 KB"
num.formatBytes(1536, { iec: true });          // "1.5 KiB"
num.formatBytes(1048575);                      // "1 MB"
num.parseBytes("10MB");                        // 10485760
num.abbreviate(2_400_000);                     // "2.4M"
num.ordinal(22);                               // "22nd"
num.thousands(1234567);                        // "1,234,567"
num.pad(7, 3);                                 // "007"
num.pad(-7, 3);                                // "-007"
```

| Function | Does |
| --- | --- |
| `currency(value, code, options?)` | `display`: `"symbol"` (default), `"narrowSymbol"`, `"code"`, `"name"`. `accounting`, `decimals`, `locale` |
| `formatBytes(bytes, options?)` | 1 KB = 1024 bytes; `binary: false` for 1000, `iec: true` for `KiB`, `decimals` (default 1), `units` for your own labels |
| `parseBytes(text)` | `"512kb"`, `"1.5G"`, `"10MB"` to a number of bytes; `binary: false` for powers of 1000 |
| `abbreviate(value, decimals = 1)` | `K`, `M`, `B`, `T` in every language. For a localized form: `format(value, { compact: true })` |
| `ordinal(value, options?)` | Built in: `en`, `fr`, `es`, `it`, `pt`, `de`, `nl`; `suffixes` for others |
| `thousands(value, separator = ",")` | Separators only, no rounding |
| `pad(value, length, char = "0")` | Pads the integer part; the sign stays in front |

`formatBytes` and `abbreviate` round up into the next unit: `1048575` bytes is `"1 MB"`, not `"1024 KB"`.

## Language

Every formatter writes English by default, so a program prints the same thing on every machine. `nc.config.set({ locale })` changes it for `num` and `nc.time` together ([Configuration](/start/configuration/)); `locale` on one call wins:

```js
const { config, num } = require("@ix-xs/node-comfort");

config.set({ locale: "fr" });
num.currency(1234.5, "EUR");                   // "1 234,50 €"
num.ordinal(1);                                // "1er"
num.currency(1234.5, "USD", { locale: "en" }); // "$1,234.50"
```

`format`, `currency`, `ordinal` and `formatBytes` follow it. French separates thousands with a narrow no-break space.

## Parsing

```js
num.parse("42px");    // 42
num.parse("1e3");     // 1000
num.parse("nope");    // NaN
num.parse("nope", 0); // 0
```

`parse(value, fallback = NaN)` reads the first number found in a value (`"abc12"` gives `12`) and returns `fallback` when there is none. Sizes go through `parseBytes`.

## Integers and random numbers

```js
num.gcd(12, 18);         // 6
num.lcm(4, 6);           // 12
num.isPrime(7);          // true
num.isEven(4);           // true
num.factorial(5);        // 120
num.factorial(25, true); // 15511210043330985984000000n
num.randomInt(1, 6);     // 1 to 6, both included
num.random(0, 1);        // a float, 1 excluded
```

`factorial(n, true)` returns an exact `bigint`. `random` and `randomInt` use `Math.random`: for secrets or fair draws, use `nc.crypto.randomInt()`.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `num.setLocale(locale)` | `nc.config.set({ locale })` |
| `num.getLocale()` | `nc.config.get().locale` |

The old names still work and warn once. The locale is now shared: `num.setLocale()` also changes the language of `nc.time`.
