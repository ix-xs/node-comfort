"use strict";

/**
 * Numbers: clamping, rounding that gets decimals right, statistics, and
 * formatting for humans (sizes, money, ordinals, compact numbers) in any
 * language. Formatting is English by default: change it with `setLocale()`
 * or per call with `{ locale }`.
 *
 * @example
 * num.round(1.005, 2);                           // 1.01
 * num.formatBytes(1536);                         // "1.5 KB"
 * num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
 * num.percentile(latencies, 95);
 */

/** The default language, changed with `setLocale()`. */
const _config = { locale: "en" };

/**
 * Options for `formatBytes()`.
 * @typedef {object} FormatBytesOptions
 * @property {number} [decimals] Maximum decimals. Defaults to `1`.
 * @property {boolean} [binary] 1 KB is 1024 bytes when `true`, 1000 when `false`. Defaults to `true`.
 * @property {boolean} [iec] Use `KiB`, `MiB`, `GiB` labels.
 * @property {string} [locale] Formats the number for a language, like `"fr"` for `"1,5 KB"`.
 * @property {string[]} [units] Your own labels from bytes up, like `["o", "Ko", "Mo", "Go", "To"]`.
 */

/**
 * Options for `parseBytes()`.
 * @typedef {object} ParseBytesOptions
 * @property {boolean} [binary] 1 KB is 1024 bytes when `true`, 1000 when `false`. `KiB` units are always 1024. Defaults to `true`.
 */

/**
 * Options for `format()`.
 * @typedef {object} FormatNumberOptions
 * @property {string} [locale] Language, like `"fr"` or `"en-US"`. Defaults to the one set with `setLocale()`, or `"en"`.
 * @property {number} [decimals] Exact number of decimals.
 * @property {number} [minDecimals] Minimum decimals.
 * @property {number} [maxDecimals] Maximum decimals. Defaults to `3`.
 * @property {boolean} [compact] Short notation like `1.2K` or `3.4M`.
 * @property {"percent"|"decimal"} [style] `"percent"` multiplies by 100 and adds `%`.
 * @property {string} [unit] Any `Intl` unit: `"kilometer"`, `"celsius"`, `"megabyte"`...
 * @property {"short"|"long"|"narrow"} [unitDisplay] How the unit is written. Defaults to `"short"`.
 * @property {"auto"|"always"|"never"|"exceptZero"} [signDisplay] When to show the sign. `"exceptZero"` gives `+5`.
 * @property {boolean} [grouping] Thousands separators. Defaults to `true`.
 */

/**
 * Options for `currency()`.
 * @typedef {object} CurrencyOptions
 * @property {string} [locale] Language. Defaults to the one set with `setLocale()`, or `"en"`.
 * @property {number} [decimals] Defaults to the currency's usual decimals (2 for EUR, 0 for JPY).
 * @property {"symbol"|"narrowSymbol"|"code"|"name"} [display] `€`, `€`, `EUR` or `euros`. Defaults to `"symbol"`.
 * @property {boolean} [accounting] Show negative amounts in parentheses, like `($5.00)`.
 */

/**
 * Options for `ordinal()`.
 * @typedef {object} OrdinalOptions
 * @property {string} [locale] Built in: `en`, `fr`, `es`, `it`, `pt`, `de`, `nl`. Defaults to the one set with `setLocale()`, or `"en"`.
 * @property {Partial<Record<Intl.LDMLPluralRule, string>>} [suffixes] Your own suffixes, for other languages.
 */

/**
 * Options for `variance()` and `stdDev()`.
 * @typedef {object} VarianceOptions
 * @property {boolean} [sample] Sample statistic (divides by n - 1) instead of population.
 */

/**
 * Multiplies by 10^exp without floating-point error.
 * @param {number} value
 * @param {number} exp
 * @returns {number}
 */
const _shift = (value, exp) => {
  const [mantissa, e = "0"] = String(value).split("e");
  return Number(`${mantissa}e${Number(e) + exp}`);
};

/**
 * @param {number} value
 * @param {number} decimals
 * @param {(n: number) => number} fn
 * @returns {number}
 */
const _roundWith = (value, decimals, fn) => {
  if (!Number.isFinite(value)) return value;
  return _shift(fn(_shift(value, decimals)), -decimals);
};

const _SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
const _IEC_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

/** @type {Record<string, Partial<Record<Intl.LDMLPluralRule, string>>>} */
const _ORDINAL_SUFFIXES = {
  en: { one: "st", two: "nd", few: "rd", other: "th" },
  fr: { one: "er", other: "e" },
  es: { other: "º" },
  it: { other: "º" },
  pt: { other: "º" },
  de: { other: "." },
  nl: { other: "e" },
};

/**
 * Keeps a number between `min` and `max`.
 *
 * @example
 * num.clamp(150, 0, 100); // 100
 * num.clamp(-5, 0, 100);  // 0
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Is the number between `min` and `max`, both included?
 *
 * @example
 * num.inRange(10, 0, 10); // true
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function inRange(value, min, max) {
  return value >= min && value <= max;
}

/**
 * Wraps a number around a range, like an angle or a carousel index.
 * `max` is excluded.
 *
 * @example
 * num.wrap(370, 0, 360); // 10
 * num.wrap(-1, 0, 5);    // 4
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function wrap(value, min, max) {
  const span = max - min;
  if (span <= 0) return min;
  return ((((value - min) % span) + span) % span) + min;
}

/**
 * Rounds to `decimals` places without floating-point surprises:
 * `Math.round(1.005 * 100) / 100` gives `1`, this gives `1.01`. Halves round
 * away from zero, like in a spreadsheet.
 *
 * @example
 * num.round(1.005, 2); // 1.01
 * num.round(1234, -2); // 1200
 * num.round(-2.5);     // -3
 *
 * @param {number} value
 * @param {number} [decimals=0] Negative values round to tens, hundreds...
 * @returns {number}
 */
function round(value, decimals = 0) {
  return _roundWith(value, decimals, (n) => Math.sign(n) * Math.round(Math.abs(n)) || 0);
}

/**
 * Rounds down to `decimals` places.
 *
 * @example
 * num.floor(1.789, 2); // 1.78
 *
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {number}
 */
function floor(value, decimals = 0) {
  return _roundWith(value, decimals, Math.floor);
}

/**
 * Rounds up to `decimals` places.
 *
 * @example
 * num.ceil(1.231, 2); // 1.24
 *
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {number}
 */
function ceil(value, decimals = 0) {
  return _roundWith(value, decimals, Math.ceil);
}

/**
 * Rounds to the nearest multiple of `step`.
 *
 * @example
 * num.snap(17, 5);        // 15
 * num.snap(0.37, 0.25);   // 0.25
 *
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
function snap(value, step) {
  if (!step) return value;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return round(Math.round(value / step) * step, decimals);
}

/**
 * Are two numbers equal within a small tolerance? The right way to compare
 * float results, since `0.1 + 0.2 === 0.3` is `false`.
 *
 * @example
 * num.approxEqual(0.1 + 0.2, 0.3); // true
 *
 * @param {number} a
 * @param {number} b
 * @param {number} [epsilon=Number.EPSILON * 16] Allowed difference, relative to the size of the numbers.
 * @returns {boolean}
 */
function approxEqual(a, b, epsilon = Number.EPSILON * 16) {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  return diff <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * The value at ratio `t` between `start` and `end`.
 *
 * @example
 * num.lerp(0, 100, 0.25); // 25
 *
 * @param {number} start
 * @param {number} end
 * @param {number} t Usually between 0 and 1.
 * @returns {number}
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Moves a number from one range to another, keeping its relative position.
 *
 * @example
 * num.mapRange(5, 0, 10, 0, 100); // 50
 * num.mapRange(75, 0, 100, 1, 0); // 0.25
 *
 * @param {number} value
 * @param {number} inMin
 * @param {number} inMax
 * @param {number} outMin
 * @param {number} outMax
 * @returns {number}
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * A random float from `min` (included) to `max` (excluded). Not for
 * security: it uses `Math.random`.
 *
 * @example
 * num.random(10, 20); // 13.84...
 *
 * @param {number} [min=0]
 * @param {number} [max=1]
 * @returns {number}
 */
function random(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

/**
 * A random integer from `min` to `max`, both included. Not for security.
 *
 * @example
 * num.randomInt(1, 6); // a dice roll
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * Adds up numbers.
 *
 * @example
 * num.sum([1, 2, 3]); // 6
 *
 * @param {Iterable<number>} values
 * @returns {number}
 */
function sum(values) {
  let total = 0;
  for (const n of values) total += n;
  return total;
}

/**
 * The mean, or `0` for an empty list.
 *
 * @example
 * num.average([2, 4, 9]); // 5
 *
 * @param {Iterable<number>} values
 * @returns {number}
 */
function average(values) {
  const list = [...values];
  return list.length ? sum(list) / list.length : 0;
}

/**
 * The middle value once sorted, or `0` for an empty list.
 *
 * @example
 * num.median([3, 1, 2]);    // 2
 * num.median([1, 2, 3, 4]); // 2.5
 *
 * @param {Iterable<number>} values
 * @returns {number}
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The most frequent values.
 *
 * @example
 * num.mode([1, 1, 2, 2, 3]); // [1, 2]
 *
 * @param {Iterable<number>} values
 * @returns {number[]}
 */
function mode(values) {
  /** @type {Map<number, number>} */
  const counts = new Map();
  for (const n of values) counts.set(n, (counts.get(n) ?? 0) + 1);
  const best = Math.max(0, ...counts.values());
  return [...counts].filter(([, c]) => c === best && best > 0).map(([n]) => n);
}

/**
 * The variance: the average squared distance from the mean.
 *
 * @example
 * num.variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4
 *
 * @param {Iterable<number>} values
 * @param {VarianceOptions} [options]
 * @returns {number}
 */
function variance(values, options = {}) {
  const list = [...values];
  const divisor = options.sample ? list.length - 1 : list.length;
  if (divisor <= 0) return 0;
  const mean = sum(list) / list.length;
  return list.reduce((acc, n) => acc + (n - mean) ** 2, 0) / divisor;
}

/**
 * The standard deviation.
 *
 * @example
 * num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]); // 2
 *
 * @param {Iterable<number>} values
 * @param {VarianceOptions} [options]
 * @returns {number}
 */
function stdDev(values, options = {}) {
  return Math.sqrt(variance(values, options));
}

/**
 * The value under which `p` percent of the values fall, interpolated like
 * Excel's `PERCENTILE.INC`.
 *
 * @example
 * num.percentile([1, 2, 3, 4, 5], 90); // 4.6
 * num.percentile(responseTimes, 95);   // p95 latency
 *
 * @param {Iterable<number>} values
 * @param {number} p From 0 to 100.
 * @returns {number} `NaN` for an empty list.
 */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const rank = (clamp(p, 0, 100) / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower), 12);
}

/**
 * The smallest number. Unlike `Math.min(...array)`, huge arrays are fine.
 *
 * @param {Iterable<number>} values
 * @returns {number | undefined} `undefined` for an empty list.
 */
function min(values) {
  let best;
  for (const n of values) if (best === undefined || n < best) best = n;
  return best;
}

/**
 * The largest number. Unlike `Math.max(...array)`, huge arrays are fine.
 *
 * @param {Iterable<number>} values
 * @returns {number | undefined} `undefined` for an empty list.
 */
function max(values) {
  let best;
  for (const n of values) if (best === undefined || n > best) best = n;
  return best;
}

/**
 * What percentage `value` is of `total`. Returns `0` when `total` is `0`.
 *
 * @example
 * num.percent(25, 200); // 12.5
 * num.percent(1, 3, 1); // 33.3
 *
 * @param {number} value
 * @param {number} total
 * @param {number} [decimals=2]
 * @returns {number}
 */
function percent(value, total, decimals = 2) {
  if (!total) return 0;
  return round((value / total) * 100, decimals);
}

/**
 * Greatest common divisor.
 *
 * @example
 * num.gcd(12, 18, 27); // 3
 *
 * @param {...number} values
 * @returns {number}
 */
function gcd(...values) {
  return values.reduce((a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x;
  }, 0);
}

/**
 * Least common multiple.
 *
 * @example
 * num.lcm(2, 3, 4); // 12
 *
 * @param {...number} values
 * @returns {number}
 */
function lcm(...values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b)));
}

/**
 * Is it a prime number?
 *
 * @example
 * num.isPrime(7); // true
 * num.isPrime(1); // false
 *
 * @param {number} value
 * @returns {boolean}
 */
function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  if (value < 4) return true;
  if (value % 2 === 0 || value % 3 === 0) return false;
  for (let i = 5; i * i <= value; i += 6) {
    if (value % i === 0 || value % (i + 2) === 0) return false;
  }
  return true;
}

/**
 * `n!`. Pass `true` to get an exact bigint, since numbers lose precision
 * past 18!.
 *
 * @example
 * num.factorial(5);        // 120
 * num.factorial(25, true); // 15511210043330985984000000n
 *
 * @param {number} n
 * @param {boolean} [asBigInt=false]
 * @returns {number | bigint}
 * @throws {RangeError} If `n` is negative or not an integer.
 */
function factorial(n, asBigInt = false) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("factorial() expects a non-negative integer");
  if (asBigInt) {
    let result = 1n;
    for (let i = 2n; i <= BigInt(n); i++) result *= i;
    return result;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Is it even?
 *
 * @param {number} value
 * @returns {boolean}
 */
function isEven(value) {
  return value % 2 === 0;
}

/**
 * Is it odd? Negative numbers work too.
 *
 * @param {number} value
 * @returns {boolean}
 */
function isOdd(value) {
  return Math.abs(value % 2) === 1;
}

/**
 * Numbers from `start` up to `end` (excluded). With one argument, counts
 * from 0. Goes down when `end` is smaller.
 *
 * @example
 * num.range(4);        // [0, 1, 2, 3]
 * num.range(0, 10, 2); // [0, 2, 4, 6, 8]
 * num.range(5, 0);     // [5, 4, 3, 2, 1]
 *
 * @param {number} start
 * @param {number} [end]
 * @param {number} [step] Defaults to `1`, or `-1` when counting down.
 * @returns {number[]}
 */
function range(start, end, step) {
  let from = start;
  let to = end;
  if (to === undefined) {
    to = from;
    from = 0;
  }
  const inc = step ?? (to < from ? -1 : 1);
  if (inc === 0 || (inc > 0 && from > to) || (inc < 0 && from < to)) return [];
  const decimals = Math.max((String(inc).split(".")[1] ?? "").length, (String(from).split(".")[1] ?? "").length);
  const out = [];
  const count = Math.ceil((to - from) / inc);
  for (let i = 0; i < count; i++) out.push(decimals ? round(from + i * inc, decimals) : from + i * inc);
  return out;
}

/**
 * Reads a number from anything, ignoring trailing text like units.
 *
 * @example
 * num.parse("42px");     // 42
 * num.parse(" -3.5 kg"); // -3.5
 * num.parse("nope", 0);  // 0
 *
 * @param {unknown} value
 * @param {number} [fallback=NaN] Returned when there's no number to read.
 * @returns {number}
 */
function parse(value, fallback = NaN) {
  if (typeof value === "number") return Number.isNaN(value) ? fallback : value;
  if (typeof value === "bigint") return Number(value);
  const match = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(String(value));
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Turns a size like `"10 MB"` into bytes. The opposite of `formatBytes()`.
 *
 * @example
 * num.parseBytes("1.5 KB");                   // 1536
 * num.parseBytes("2 GiB");                    // 2147483648
 * num.parseBytes("1 KB", { binary: false });  // 1000
 *
 * @param {string | number} value A size like `"512kb"` or `"1.5G"`, or a number of bytes.
 * @param {ParseBytesOptions} [options]
 * @returns {number} Bytes, or `NaN` if it can't be read.
 */
function parseBytes(value, options = {}) {
  if (typeof value === "number") return value;
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+))\s*([kmgtpezy]?)(i?)(b?)(?:ytes?)?\s*$/i.exec(String(value));
  if (!match) return NaN;
  const [, amount, prefix, iec] = match;
  const base = iec || options.binary !== false ? 1024 : 1000;
  const power = prefix ? "kmgtpezy".indexOf(prefix.toLowerCase()) + 1 : 0;
  return Math.floor(Number(amount) * base ** power);
}

/**
 * Formats a byte count as a readable size.
 *
 * @example
 * num.formatBytes(1536);                     // "1.5 KB"
 * num.formatBytes(1000, { binary: false });  // "1 KB"
 * num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo", "Go"] }); // "1,5 Ko"
 *
 * @param {number} bytes
 * @param {FormatBytesOptions} [options]
 * @returns {string}
 */
function formatBytes(bytes, options = {}) {
  const units = options.units ?? (options.iec ? _IEC_UNITS : _SIZE_UNITS);
  if (!Number.isFinite(bytes) || bytes === 0) return `0 ${units[0]}`;
  const decimals = options.decimals ?? 1;
  const base = options.binary === false ? 1000 : 1024;
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  const i = Math.min(Math.floor(Math.log(abs) / Math.log(base)), units.length - 1);
  const amount = round(abs / base ** i, decimals);
  const locale = options.locale ?? (_config.locale === "en" ? undefined : _config.locale);
  const text = locale ? new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(amount) : String(amount);
  return `${sign}${text} ${units[i]}`;
}

/**
 * Formats a number for display, with `Intl.NumberFormat` doing the work:
 * separators, decimals, compact notation, percentages, units.
 *
 * @example
 * num.format(1234567.891);                   // "1,234,567.891"
 * num.format(1234567.891, { locale: "fr" }); // "1 234 567,891"
 * num.format(0.256, { style: "percent" });   // "26%"
 * num.format(1500, { compact: true });       // "1.5K"
 * num.format(3.5, { unit: "kilometer" });    // "3.5 km"
 *
 * @param {number | bigint} value
 * @param {FormatNumberOptions} [options]
 * @returns {string}
 */
function format(value, options = {}) {
  /** @type {Intl.NumberFormatOptions} */
  const intl = {};
  if (options.decimals !== undefined) {
    intl.minimumFractionDigits = options.decimals;
    intl.maximumFractionDigits = options.decimals;
  }
  if (options.minDecimals !== undefined) intl.minimumFractionDigits = options.minDecimals;
  if (options.maxDecimals !== undefined) intl.maximumFractionDigits = options.maxDecimals;
  if (options.compact) {
    intl.notation = "compact";
    intl.compactDisplay = "short";
  }
  if (options.style === "percent") intl.style = "percent";
  if (options.unit) {
    intl.style = "unit";
    intl.unit = options.unit;
    intl.unitDisplay = options.unitDisplay ?? "short";
  }
  if (options.signDisplay) intl.signDisplay = options.signDisplay;
  if (options.grouping === false) intl.useGrouping = false;
  return new Intl.NumberFormat(options.locale ?? _config.locale, intl).format(value);
}

/**
 * Formats an amount of money.
 *
 * @example
 * num.currency(1234.5, "USD");                   // "$1,234.50"
 * num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
 * num.currency(-5, "USD", { accounting: true }); // "($5.00)"
 *
 * @param {number | bigint} value
 * @param {string} code A currency code like `"EUR"`, `"USD"` or `"JPY"`.
 * @param {CurrencyOptions} [options]
 * @returns {string}
 */
function currency(value, code, options = {}) {
  /** @type {Intl.NumberFormatOptions} */
  const intl = { style: "currency", currency: code, currencyDisplay: options.display ?? "symbol" };
  if (options.decimals !== undefined) {
    intl.minimumFractionDigits = options.decimals;
    intl.maximumFractionDigits = options.decimals;
  }
  if (options.accounting) intl.currencySign = "accounting";
  return new Intl.NumberFormat(options.locale ?? _config.locale, intl).format(value);
}

/**
 * Shortens big numbers with `K`, `M`, `B` or `T`. For other languages, use
 * `format(value, { compact: true, locale })`.
 *
 * @example
 * num.abbreviate(1500);      // "1.5K"
 * num.abbreviate(2_400_000); // "2.4M"
 *
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
function abbreviate(value, decimals = 1) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  for (const [limit, suffix] of /** @type {Array<[number, string]>} */ ([[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]])) {
    if (abs >= limit) return `${sign}${round(abs / limit, decimals)}${suffix}`;
  }
  return `${sign}${round(abs, decimals)}`;
}

/**
 * Adds thousands separators, leaving decimals alone.
 *
 * @example
 * num.thousands(1234567.89, " "); // "1 234 567.89"
 *
 * @param {number | string} value
 * @param {string} [separator=","]
 * @returns {string}
 */
function thousands(value, separator = ",") {
  const [int, dec] = String(value).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}

/**
 * Adds the ordinal suffix: 1st, 2nd, 3rd... in several languages.
 *
 * @example
 * num.ordinal(22);                   // "22nd"
 * num.ordinal(1, { locale: "fr" });  // "1er"
 * num.ordinal(3, { locale: "de" });  // "3."
 *
 * @param {number} value
 * @param {OrdinalOptions} [options]
 * @returns {string}
 */
function ordinal(value, options = {}) {
  const locale = options.locale ?? _config.locale;
  const language = locale.split(/[-_]/)[0].toLowerCase();
  const suffixes = options.suffixes ?? _ORDINAL_SUFFIXES[language] ?? _ORDINAL_SUFFIXES.en;
  let category;
  try {
    category = new Intl.PluralRules(locale, { type: "ordinal" }).select(value);
  } catch {
    category = new Intl.PluralRules("en", { type: "ordinal" }).select(value);
  }
  return `${value}${suffixes[category] ?? suffixes.other ?? ""}`;
}

/**
 * Sets the default language of `format`, `currency`, `percent`,
 * `abbreviate`, `ordinal` and `formatBytes`.
 *
 * @example
 * num.setLocale("fr");
 * num.currency(1234.5, "EUR"); // "1 234,50 €"
 *
 * @param {string} locale Like `"fr"`, `"en-GB"` or `"pt-BR"`.
 * @returns {typeof import("./Num")} The module, so calls chain.
 */
function setLocale(locale) {
  _config.locale = locale;
  return module.exports;
}

/**
 * The current default language.
 *
 * @example
 * num.getLocale(); // "en"
 *
 * @returns {string}
 */
function getLocale() {
  return _config.locale;
}

module.exports = {
  setLocale,
  getLocale,
  clamp,
  inRange,
  wrap,
  round,
  floor,
  ceil,
  snap,
  approxEqual,
  lerp,
  mapRange,
  random,
  randomInt,
  sum,
  average,
  median,
  mode,
  variance,
  stdDev,
  percentile,
  min,
  max,
  percent,
  gcd,
  lcm,
  isPrime,
  factorial,
  isEven,
  isOdd,
  range,
  parse,
  parseBytes,
  formatBytes,
  format,
  currency,
  abbreviate,
  thousands,
  ordinal,
};
