---
title: "nc.num"
description: "Numbers: clamping, rounding that gets decimals right, statistics, and formatting for humans (sizes, money, ordinals, compact numbers) in any language. Formatting is English by default: change it with `setLocale()` or per call with `{ locale }`."
sidebar:
  label: "num"
  order: 8
---

```js
const { num } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const num = require("@ix-xs/node-comfort/num");
```

This page lists everything `nc.num` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/num/).

```js
num.round(1.005, 2);                           // 1.01
num.formatBytes(1536);                         // "1.5 KB"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
num.percentile(latencies, 95);
```

## setLocale

```ts
setLocale(locale: string): typeof nc.num
```

Sets the default language of `format`, `currency`, `percent`,
`abbreviate`, `ordinal` and `formatBytes`.

| Parameter | Type | Description |
| --- | --- | --- |
| `locale` | `string` | Like `"fr"`, `"en-GB"` or `"pt-BR"`. |

**Returns** `typeof import("./``Num``")`: The module, so calls chain.

```js
num.setLocale("fr");
num.currency(1234.5, "EUR"); // "1 234,50 €"
```

## getLocale

```ts
getLocale(): string
```

The current default language.

```js
num.getLocale(); // "en"
```

## clamp

```ts
clamp(value: number, min: number, max: number): number
```

Keeps a number between `min` and `max`.

```js
num.clamp(150, 0, 100); // 100
num.clamp(-5, 0, 100);  // 0
```

## inRange

```ts
inRange(value: number, min: number, max: number): boolean
```

Is the number between `min` and `max`, both included?

```js
num.inRange(10, 0, 10); // true
```

## wrap

```ts
wrap(value: number, min: number, max: number): number
```

Wraps a number around a range, like an angle or a carousel index.
`max` is excluded.

```js
num.wrap(370, 0, 360); // 10
num.wrap(-1, 0, 5);    // 4
```

## round

```ts
round(value: number, decimals?: number): number
```

Rounds to `decimals` places without floating-point surprises:
`Math.round(1.005 * 100) / 100` gives `1`, this gives `1.01`. Halves round
away from zero, like in a spreadsheet.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Negative values round to tens, hundreds... Defaults to `0`. |

```js
num.round(1.005, 2); // 1.01
num.round(1234, -2); // 1200
num.round(-2.5);     // -3
```

## floor

```ts
floor(value: number, decimals?: number): number
```

Rounds down to `decimals` places.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Defaults to `0`. |

```js
num.floor(1.789, 2); // 1.78
```

## ceil

```ts
ceil(value: number, decimals?: number): number
```

Rounds up to `decimals` places.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Defaults to `0`. |

```js
num.ceil(1.231, 2); // 1.24
```

## snap

```ts
snap(value: number, step: number): number
```

Rounds to the nearest multiple of `step`.

```js
num.snap(17, 5);        // 15
num.snap(0.37, 0.25);   // 0.25
```

## approxEqual

```ts
approxEqual(a: number, b: number, epsilon?: number): boolean
```

Are two numbers equal within a small tolerance? The right way to compare
float results, since `0.1 + 0.2 === 0.3` is `false`.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | `number` |  |
| `b` | `number` |  |
| `epsilon?` | `number` | Allowed difference, relative to the size of the numbers. Defaults to `Number.EPSILON * 16`. |

```js
num.approxEqual(0.1 + 0.2, 0.3); // true
```

## lerp

```ts
lerp(start: number, end: number, t: number): number
```

The value at ratio `t` between `start` and `end`.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | `number` |  |
| `end` | `number` |  |
| `t` | `number` | Usually between 0 and 1. |

```js
num.lerp(0, 100, 0.25); // 25
```

## mapRange

```ts
mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number
```

Moves a number from one range to another, keeping its relative position.

```js
num.mapRange(5, 0, 10, 0, 100); // 50
num.mapRange(75, 0, 100, 1, 0); // 0.25
```

## random

```ts
random(min?: number, max?: number): number
```

A random float from `min` (included) to `max` (excluded). Not for
security: it uses `Math.random`.

| Parameter | Type | Description |
| --- | --- | --- |
| `min?` | `number` | Defaults to `0`. |
| `max?` | `number` | Defaults to `1`. |

```js
num.random(10, 20); // 13.84...
```

## randomInt

```ts
randomInt(min: number, max: number): number
```

A random integer from `min` to `max`, both included. Not for security.

```js
num.randomInt(1, 6); // a dice roll
```

## sum

```ts
sum(values: Iterable<number>): number
```

Adds up numbers, without the drift of a naive loop.

```js
num.sum([1, 2, 3]);       // 6
num.sum([0.1, 0.2, 0.3]); // 0.6, where a plain loop gives 0.6000000000000001
```

## product

```ts
product(values: Iterable<number>): number
```

Multiplies numbers. An empty list gives `1`.

```js
num.product([2, 3, 4]); // 24
```

## average

```ts
average(values: Iterable<number>): number
```

The mean, or `0` for an empty list.

```js
num.average([2, 4, 9]); // 5
```

## median

```ts
median(values: Iterable<number>): number
```

The middle value once sorted, or `0` for an empty list.

```js
num.median([3, 1, 2]);    // 2
num.median([1, 2, 3, 4]); // 2.5
```

## mode

```ts
mode(values: Iterable<number>): number[]
```

The most frequent values.

```js
num.mode([1, 1, 2, 2, 3]); // [1, 2]
```

## variance

```ts
variance(values: Iterable<number>, options?: VarianceOptions): number
```

The variance: the average squared distance from the mean.

```js
num.variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4
```

## stdDev

```ts
stdDev(values: Iterable<number>, options?: VarianceOptions): number
```

The standard deviation.

```js
num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]); // 2
```

## percentile

```ts
percentile(values: Iterable<number>, p: number): number
```

The value under which `p` percent of the values fall, interpolated like
Excel's `PERCENTILE.INC`.

| Parameter | Type | Description |
| --- | --- | --- |
| `values` | `Iterable``<number>` |  |
| `p` | `number` | From 0 to 100. |

**Returns** `number`: `NaN` for an empty list.

```js
num.percentile([1, 2, 3, 4, 5], 90); // 4.6
num.percentile(responseTimes, 95);   // p95 latency
```

## min

```ts
min(values: Iterable<number>): number | undefined
```

The smallest number. Unlike `Math.min(...array)`, huge arrays are fine.
Like `Math.min`, a `NaN` in the list gives `NaN`.

**Returns** `number | undefined`: `undefined` for an empty list.

## max

```ts
max(values: Iterable<number>): number | undefined
```

The largest number. Unlike `Math.max(...array)`, huge arrays are fine.
Like `Math.max`, a `NaN` in the list gives `NaN`.

**Returns** `number | undefined`: `undefined` for an empty list.

## percent

```ts
percent(value: number, total: number, decimals?: number): number
```

What percentage `value` is of `total`. Returns `0` when `total` is `0`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `total` | `number` |  |
| `decimals?` | `number` | Defaults to `2`. |

```js
num.percent(25, 200); // 12.5
num.percent(1, 3, 1); // 33.3
```

## percentChange

```ts
percentChange(from: number, to: number, decimals?: number): number
```

How much a value changed, in percent. Going from `0` to anything else is
an infinite change.

| Parameter | Type | Description |
| --- | --- | --- |
| `from` | `number` |  |
| `to` | `number` |  |
| `decimals?` | `number` | Defaults to `2`. |

```js
num.percentChange(80, 100); // 25
num.percentChange(100, 80); // -20
```

## gcd

```ts
gcd(...values: number[]): number
```

Greatest common divisor.

```js
num.gcd(12, 18, 27); // 3
```

## lcm

```ts
lcm(...values: number[]): number
```

Least common multiple.

```js
num.lcm(2, 3, 4); // 12
```

## isPrime

```ts
isPrime(value: number): boolean
```

Is it a prime number?

```js
num.isPrime(7); // true
num.isPrime(1); // false
```

## factorial

```ts
factorial(n: number, asBigInt?: boolean): number | bigint
```

`n!`. Pass `true` to get an exact bigint, since numbers lose precision
past 18!.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | `number` |  |
| `asBigInt?` | `boolean` | Defaults to `false`. |

**Throws** `RangeError`: If `n` is negative or not an integer.

```js
num.factorial(5);        // 120
num.factorial(25, true); // 15511210043330985984000000n
```

## isEven

```ts
isEven(value: number): boolean
```

Is it even?

## isOdd

```ts
isOdd(value: number): boolean
```

Is it odd? Negative numbers work too.

## range

```ts
range(start: number, end?: number, step?: number): number[]
```

Numbers from `start` up to `end` (excluded). With one argument, counts
from 0. Goes down when `end` is smaller.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | `number` |  |
| `end?` | `number` |  |
| `step?` | `number` | Defaults to `1`, or `-1` when counting down. |

```js
num.range(4);        // [0, 1, 2, 3]
num.range(0, 10, 2); // [0, 2, 4, 6, 8]
num.range(5, 0);     // [5, 4, 3, 2, 1]
```

## parse

```ts
parse(value: unknown, fallback?: number): number
```

Reads a number from anything, ignoring trailing text like units.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `fallback?` | `number` | Returned when there's no number to read. Defaults to `NaN`. |

```js
num.parse("42px");     // 42
num.parse(" -3.5 kg"); // -3.5
num.parse("nope", 0);  // 0
```

## parseBytes

```ts
parseBytes(value: string | number, options?: ParseBytesOptions): number
```

Turns a size like `"10 MB"` into bytes. The opposite of `formatBytes()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `string \| number` | A size like `"512kb"` or `"1.5G"`, or a number of bytes. |
| `options?` | [`ParseBytesOptions`](#parsebytesoptions) |  |

**Returns** `number`: Bytes, or `NaN` if it can't be read.

```js
num.parseBytes("1.5 KB");                   // 1536
num.parseBytes("2 GiB");                    // 2147483648
num.parseBytes("1 KB", { binary: false });  // 1000
```

## formatBytes

```ts
formatBytes(bytes: number, options?: FormatBytesOptions): string
```

Formats a byte count as a readable size.

```js
num.formatBytes(1536);                     // "1.5 KB"
num.formatBytes(1000, { binary: false });  // "1 KB"
num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo", "Go"] }); // "1,5 Ko"
```

## format

```ts
format(value: number | bigint, options?: FormatNumberOptions): string
```

Formats a number for display, with `Intl.NumberFormat` doing the work:
separators, decimals, compact notation, percentages, units.

```js
num.format(1234567.891);                   // "1,234,567.891"
num.format(1234567.891, { locale: "fr" }); // "1 234 567,891"
num.format(0.256, { style: "percent" });   // "26%"
num.format(1500, { compact: true });       // "1.5K"
num.format(3.5, { unit: "kilometer" });    // "3.5 km"
```

## currency

```ts
currency(value: number | bigint, code: string, options?: CurrencyOptions): string
```

Formats an amount of money.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| bigint` |  |
| `code` | `string` | A currency code like `"EUR"`, `"USD"` or `"JPY"`. |
| `options?` | [`CurrencyOptions`](#currencyoptions) |  |

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
```

## abbreviate

```ts
abbreviate(value: number, decimals?: number): string
```

Shortens big numbers with `K`, `M`, `B` or `T`. For other languages, use
`format(value, { compact: true, locale })`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Defaults to `1`. |

```js
num.abbreviate(1500);      // "1.5K"
num.abbreviate(2_400_000); // "2.4M"
```

## thousands

```ts
thousands(value: string | number, separator?: string): string
```

Adds thousands separators, leaving decimals alone.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number \| string` |  |
| `separator?` | `string` | Defaults to `","`. |

```js
num.thousands(1234567.89, " "); // "1 234 567.89"
```

## pad

```ts
pad(value: number, length: number, char?: string): string
```

Pads the integer part with zeros (or another character).

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `length` | `number` | Digits wanted before the decimal point. |
| `char?` | `string` | Defaults to `"0"`. |

```js
num.pad(7, 3);    // "007"
num.pad(-7, 3);   // "-007"
num.pad(3.5, 2);  // "03.5"
```

## ordinal

```ts
ordinal(value: number, options?: OrdinalOptions): string
```

Adds the ordinal suffix: 1st, 2nd, 3rd... in several languages.

```js
num.ordinal(22);                   // "22nd"
num.ordinal(1, { locale: "fr" });  // "1er"
num.ordinal(3, { locale: "de" });  // "3."
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { CurrencyOptions } from "@ix-xs/node-comfort"`.

### CurrencyOptions

Options for `currency()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language. Defaults to the one set with `setLocale()`, or `"en"`. |
| `decimals?` | `number` | Defaults to the currency's usual decimals (2 for EUR, 0 for JPY). |
| `display?` | `"symbol" \| "name" \| "code" \| "narrowSymbol"` | `€`, `€`, `EUR` or `euros`. Defaults to `"symbol"`. |
| `accounting?` | `boolean` | Show negative amounts in parentheses, like `($5.00)`. |

### FormatBytesOptions

Options for `formatBytes()`.

| Property | Type | Description |
| --- | --- | --- |
| `decimals?` | `number` | Maximum decimals. Defaults to `1`. |
| `binary?` | `boolean` | 1 KB is 1024 bytes when `true`, 1000 when `false`. Defaults to `true`. |
| `iec?` | `boolean` | Use `KiB`, `MiB`, `GiB` labels. |
| `locale?` | `string` | Formats the number for a language, like `"fr"` for `"1,5 KB"`. |
| `units?` | `string[]` | Your own labels from bytes up, like `["o", "Ko", "Mo", "Go", "To"]`. |

### FormatNumberOptions

Options for `format()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language, like `"fr"` or `"en-US"`. Defaults to the one set with `setLocale()`, or `"en"`. |
| `decimals?` | `number` | Exact number of decimals. |
| `minDecimals?` | `number` | Minimum decimals. |
| `maxDecimals?` | `number` | Maximum decimals. Defaults to `3`. |
| `compact?` | `boolean` | Short notation like `1.2K` or `3.4M`. |
| `style?` | `"percent" \| "decimal"` | `"percent"` multiplies by 100 and adds `%`. |
| `unit?` | `string` | Any `Intl` unit: `"kilometer"`, `"celsius"`, `"megabyte"`... |
| `unitDisplay?` | `"long" \| "short" \| "narrow"` | How the unit is written. Defaults to `"short"`. |
| `signDisplay?` | `"auto" \| "always" \| "never" \| "exceptZero"` | When to show the sign. `"exceptZero"` gives `+5`. |
| `grouping?` | `boolean` | Thousands separators. Defaults to `true`. |

### OrdinalOptions

Options for `ordinal()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Built in: `en`, `fr`, `es`, `it`, `pt`, `de`, `nl`. Defaults to the one set with `setLocale()`, or `"en"`. |
| `suffixes?` | `Partial``<``Record``<``LDMLPluralRule``, string>>` | Your own suffixes, for other languages. |

### ParseBytesOptions

Options for `parseBytes()`.

| Property | Type | Description |
| --- | --- | --- |
| `binary?` | `boolean` | 1 KB is 1024 bytes when `true`, 1000 when `false`. `KiB` units are always 1024. Defaults to `true`. |

### VarianceOptions

Options for `variance()` and `stdDev()`.

| Property | Type | Description |
| --- | --- | --- |
| `sample?` | `boolean` | Sample statistic (divides by n - 1) instead of population. |
