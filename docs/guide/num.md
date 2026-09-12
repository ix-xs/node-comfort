# Numbers

`nc.num` handles rounding that gets decimals right, statistics, and formatting numbers for people.

```js
const { num } = require("@ix-xs/node-comfort");

num.round(1.005, 2);                           // 1.01, where Math.round gives 1
num.formatBytes(1536);                         // "1.5 KB"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
```

## Rounding

`Math.round(1.005 * 100) / 100` gives `1`, because `1.005` is really `1.00499999...` in binary. `num.round` works on the decimal representation instead:

```js
num.round(1.005, 2);  // 1.01
num.round(1234, -2);  // 1200, negative decimals round to tens, hundreds...
num.round(-2.5);      // -3, halves go away from zero, like in a spreadsheet
num.floor(1.789, 2);  // 1.78
num.ceil(1.231, 2);   // 1.24
num.snap(17, 5);      // 15, nearest multiple
num.approxEqual(0.1 + 0.2, 0.3); // true
```

## Ranges

```js
num.clamp(150, 0, 100);         // 100
num.inRange(10, 0, 10);         // true, both ends included
num.wrap(-1, 0, 5);             // 4, like a carousel going backwards
num.lerp(0, 100, 0.25);         // 25
num.mapRange(5, 0, 10, 0, 100); // 50
num.range(0, 10, 2);            // [0, 2, 4, 6, 8]
```

## Statistics

```js
num.sum([1, 2, 3]);
num.average([2, 4, 9]);           // 5
num.median([1, 2, 3, 4]);         // 2.5
num.mode([1, 1, 2, 2, 3]);        // [1, 2]
num.percentile(latencies, 95);    // p95, interpolated like Excel's PERCENTILE.INC
num.stdDev(values);
num.stdDev(values, { sample: true });
num.min(bigArray);                // no "Maximum call stack" on huge arrays
num.percent(25, 200);             // 12.5
```

## Formatting

`format()` wraps `Intl.NumberFormat`:

```js
num.format(1234567.891);                  // "1,234,567.891"
num.format(1234567.891, { locale: "de" }); // "1.234.567,891"
num.format(0.256, { style: "percent" });  // "26%"
num.format(1500, { compact: true });      // "1.5K"
num.format(3.5, { unit: "kilometer" });   // "3.5 km"
num.format(2, { decimals: 2 });           // "2.00"
num.format(5, { signDisplay: "exceptZero" }); // "+5"
```

Money, sizes and ordinals:

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
num.formatBytes(1073741824);                   // "1 GB"
num.formatBytes(1000, { binary: false });      // "1 KB"
num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo", "Go"] }); // "1,5 Ko"
num.parseBytes("10MB");                        // 10485760
num.abbreviate(2_400_000);                     // "2.4M"
num.ordinal(22);                               // "22nd"
num.ordinal(1, { locale: "fr" });              // "1er"
```

`formatBytes` counts 1 KB as 1024 bytes by default; pass `binary: false` for 1000, or `iec: true` for `KiB` labels.

Every formatter speaks English by default, so a program prints the same thing on every machine. Change it once for the whole namespace, or per call:

```js
num.setLocale("fr");
num.currency(1234.5, "EUR");                 // "1 234,50 €"
num.currency(1234.5, "USD", { locale: "en" }); // "$1,234.50", this call only
```

`nc.time` has its own `setLocale()`, so dates and numbers can follow different languages when you need it.

## Reading numbers

```js
num.parse("42px");      // 42
num.parse("nope", 0);   // 0
```

## Integers

```js
num.gcd(12, 18);       // 6
num.lcm(4, 6);         // 12
num.isPrime(7);        // true
num.factorial(25, true); // 15511210043330985984000000n, exact as a bigint
num.randomInt(1, 6);   // not for security, see nc.crypto.randomInt()
```
