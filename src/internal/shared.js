"use strict";

// Helpers shared by the modules. Not part of the public API.

const { types } = require("node:util");

/** Keys that must never be copied onto an object: they reach its prototype. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
const isPlainObject = (value) => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  // The last check accepts objects from another realm (a worker, a `vm`).
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
};

const MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/**
 * The defaults set with `time.setLocale()` and `time.setTimezone()`. English
 * by default, so output never depends on the machine.
 * @type {{ locale: string, timeZone: string | undefined }}
 */
const timeConfig = { locale: "en", timeZone: undefined };

/** @type {Record<string, keyof typeof MS | "M" | "y">} */
const UNIT_ALIASES = {
  ms: "ms", msec: "ms", milli: "ms", millis: "ms", millisecond: "ms", milliseconds: "ms",
  s: "s", sec: "s", secs: "s", second: "s", seconds: "s",
  m: "m", min: "m", mins: "m", minute: "m", minutes: "m",
  h: "h", hr: "h", hrs: "h", hour: "h", hours: "h",
  d: "d", day: "d", days: "d",
  w: "w", wk: "w", wks: "w", week: "w", weeks: "w",
  M: "M", mo: "M", month: "M", months: "M",
  y: "y", yr: "y", yrs: "y", year: "y", years: "y",
};

/**
 * @param {string} unit
 * @returns {keyof typeof MS | "M" | "y" | undefined}
 */
const unitOf = (unit) => UNIT_ALIASES[unit] ?? UNIT_ALIASES[unit.toLowerCase()];

/** @type {Map<string, number | null>} */
const _durations = new Map();

/**
 * @param {string} text Already trimmed, not empty.
 * @returns {number | null}
 */
const _readDuration = (text) => {
  if (/^[-+]?\d+(?:\.\d+)?$/.test(text)) return Number(text);

  const iso = /^([-+])?P(?:(\d+(?:[.,]\d+)?)W)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i.exec(text);
  if (iso && /\d/.test(text)) {
    const [, sign, w, d, h, m, s] = iso;
    const n = (/** @type {string | undefined} */ v) => (v ? Number(v.replace(",", ".")) : 0);
    const total = n(w) * MS.w + n(d) * MS.d + n(h) * MS.h + n(m) * MS.m + n(s) * MS.s;
    return sign === "-" ? -total : total;
  }

  const clock = /^([-+])?(?:(\d+):)?(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(text);
  if (clock) {
    const [, sign, h, m, s, ms] = clock;
    const total = Number(h ?? 0) * MS.h + Number(m) * MS.m + Number(s) * MS.s + (ms ? Number(ms.padEnd(3, "0")) : 0);
    return sign === "-" ? -total : total;
  }

  const regex = /(-?\d*\.?\d+)\s*([a-zA-Z]+)/g;
  let total = 0;
  let consumed = "";
  let match;
  while ((match = regex.exec(text)) !== null) {
    const unit = unitOf(match[2]);
    if (!unit || unit === "M" || unit === "y") return null;
    total += Number(match[1]) * MS[unit];
    consumed += match[0];
  }
  if (!consumed || consumed.replace(/\s+/g, "") !== text.replace(/[\s,]+|and/g, "")) return null;
  return total;
};

/**
 * A duration in milliseconds, or `null` when the input isn't one.
 * @param {unknown} input
 * @returns {number | null}
 */
const parseDuration = (input) => {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const cached = _durations.get(input);
  if (cached !== undefined) return cached;
  const text = input.trim();
  const result = text ? _readDuration(text) : null;
  // Durations are almost always literals, so a handful of entries covers a whole program.
  if (_durations.size >= 500) _durations.clear();
  _durations.set(input, result);
  return result;
};

/**
 * Milliseconds from a number or a duration string.
 * @param {number | string} value
 * @param {string} [what="duration"] Names the value in the error message.
 * @returns {number}
 * @throws {TypeError} If it can't be read.
 */
const toMs = (value, what = "duration") => {
  if (typeof value === "number") {
    if (Number.isNaN(value)) throw new TypeError(`Invalid ${what}: NaN`);
    return value;
  }
  const ms = parseDuration(value);
  if (ms === null) throw new TypeError(`Invalid ${what}: ${JSON.stringify(value) ?? String(value)}`);
  return ms;
};

const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * `setTimeout` that also works past its 24.8-day limit. `Infinity` never fires.
 * @param {() => void} fn
 * @param {number} ms
 * @param {boolean} [unref=false]
 * @returns {() => void} Cancels the timer.
 */
const setLongTimeout = (fn, ms, unref = false) => {
  if (ms === Infinity) return () => {};
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const schedule = (/** @type {number} */ remaining) => {
    timer = setTimeout(() => (remaining > MAX_TIMEOUT ? schedule(remaining - MAX_TIMEOUT) : fn()), Math.min(remaining, MAX_TIMEOUT));
    if (unref) timer.unref();
  };
  schedule(Math.max(0, ms) || 0);
  return () => clearTimeout(timer);
};

/**
 * Resolves after `ms`, or rejects with an `AbortError` when the signal fires.
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @param {boolean} [unref=false]
 * @returns {Promise<void>}
 */
const sleep = (ms, signal, unref = false) =>
  new Promise((resolve, reject) => {
    const { AbortError } = require("../errors.js");
    if (signal?.aborted) return reject(new AbortError(undefined, { cause: signal.reason }));
    const onAbort = () => {
      cancel();
      reject(new AbortError(undefined, { cause: signal?.reason }));
    };
    const cancel = setLongTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms, unref);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Builds a cache of `Intl` objects, which are slow to construct (tens of
 * microseconds) and fast to use.
 * @template T
 * @param {(locale: string | undefined, options: any) => T} create
 * @returns {(locale?: string, options?: object) => T}
 */
const _intlCache = (create) => {
  /** @type {Map<string, T>} */
  const cache = new Map();
  return (locale, options) => {
    const key = options === undefined ? `${locale ?? ""}` : `${locale ?? ""}|${JSON.stringify(options)}`;
    let found = cache.get(key);
    if (found === undefined) {
      found = create(locale, options);
      if (cache.size >= 200) cache.clear();
      cache.set(key, found);
    }
    return found;
  };
};

const intl = {
  number: _intlCache((locale, options) => new Intl.NumberFormat(locale, options)),
  dateTime: _intlCache((locale, options) => new Intl.DateTimeFormat(locale, options)),
  plural: _intlCache((locale, options) => new Intl.PluralRules(locale, options)),
  collator: _intlCache((locale, options) => new Intl.Collator(locale, options)),
  relativeTime: _intlCache((locale, options) => new Intl.RelativeTimeFormat(locale, options)),
  list: _intlCache((locale, options) => new Intl.ListFormat(locale, options)),
};

/** @type {Intl.Segmenter | undefined} */
let _segmenter;

/** The grapheme segmenter, built on first use. */
const segmenter = () => (_segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" }));

const ASCII = /^[\x00-\x7f]*$/;

/**
 * Splits text into graphemes, so emoji and accents stay whole.
 * @param {string} input
 * @returns {string[]}
 */
const graphemes = (input) => {
  if (ASCII.test(input)) return input.split("");
  return Array.from(segmenter().segment(input), (s) => s.segment);
};

/**
 * Counts graphemes without building an array.
 * @param {string} input
 * @returns {number}
 */
const graphemeCount = (input) => {
  if (ASCII.test(input)) return input.length;
  let count = 0;
  for (const _ of segmenter().segment(input)) count++;
  return count;
};

/**
 * Adds numbers with Neumaier's compensation, so `0.1 + 0.2 + 0.3` is `0.6`.
 * @param {Iterable<number>} values
 * @returns {number}
 */
const preciseSum = (values) => {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    const next = sum + value;
    compensation += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  const total = sum + compensation;
  return Number.isNaN(total) ? sum : total;
};

/** @type {WeakMap<object, number>} */
const _objectIds = new WeakMap();
/** @type {Map<symbol, number>} */
const _symbolIds = new Map();
let _nextId = 0;

/** @param {object} value */
const _identity = (value) => {
  let id = _objectIds.get(value);
  if (id === undefined) _objectIds.set(value, (id = ++_nextId));
  return id;
};

/**
 * @param {unknown} value
 * @returns {string}
 */
const _keyPart = (value) => {
  switch (typeof value) {
    case "string": return `s${value.length}:${value}`;
    case "number": return Object.is(value, -0) ? "n-0" : `n${value}`;
    case "boolean": return value ? "t" : "f";
    case "undefined": return "u";
    case "bigint": return `i${value}`;
    case "symbol": {
      let id = _symbolIds.get(value);
      if (id === undefined) _symbolIds.set(value, (id = ++_nextId));
      return `y${id}`;
    }
    case "function": return `F${_identity(value)}`;
    default: {
      if (value === null) return "l";
      const object = /** @type {object} */ (value);
      if (types.isDate(object)) return `d${object.getTime()}`;
      if (!Array.isArray(object) && !isPlainObject(object)) return `O${_identity(object)}`;
      try {
        // The replacer keeps what JSON drops or refuses: undefined, bigint, functions, symbols.
        return `j${JSON.stringify(object, (_, v) => (v !== null && typeof v === "object" ? v : typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : _keyPart(v)))}`;
      } catch {
        return `O${_identity(object)}`;
      }
    }
  }
};

/**
 * A cache key for a list of arguments. Primitives are compared by value and
 * type, plain objects and arrays by content, everything else by identity.
 * @param {readonly unknown[]} args
 * @returns {unknown} A primitive usable as a `Map` key.
 */
const argsKey = (args) => {
  if (args.length === 1) {
    const only = args[0];
    // Numbers and booleans can't clash with the tagged strings used for everything else.
    return typeof only === "number" || typeof only === "boolean" ? only : _keyPart(only);
  }
  if (args.length === 0) return "";
  let key = "";
  for (let i = 0; i < args.length; i++) key += `${_keyPart(args[i])}\u0001`;
  return key;
};

/**
 * Parsed cron fields. `lastDay` is set by `L` in the day-of-month field.
 * @typedef {{ seconds: Set<number>, minutes: Set<number>, hours: Set<number>, days: Set<number>, months: Set<number>, weekdays: Set<number>, anyDay: boolean, anyWeekday: boolean, lastDay: boolean }} CronSpec
 */

/** @type {Record<string, string>} */
const CRON_MACROS = {
  "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *",
};
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** @type {Map<string, CronSpec>} */
const _cronSpecs = new Map();

/**
 * Parses a cron expression with 5 fields, or 6 with seconds first.
 * @param {string} expression
 * @returns {CronSpec}
 * @throws {SyntaxError} If the expression is invalid.
 */
const parseCron = (expression) => {
  const cached = _cronSpecs.get(expression);
  if (cached) return cached;
  const text = CRON_MACROS[expression.trim().toLowerCase()] ?? expression.trim();
  const fields = text.split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) throw new SyntaxError(`Invalid cron expression "${expression}": expected 5 or 6 fields`);
  if (fields.length === 5) fields.unshift("0");
  /** @type {(field: string, min: number, max: number, names?: string[]) => Set<number>} */
  const parse = (field, min, max, names) => {
    /** @type {Set<number>} */
    const values = new Set();
    for (const part of field.split(",")) {
      const [rangePart, stepPart] = part.split("/");
      const step = stepPart === undefined ? 1 : Number(stepPart);
      if (!Number.isInteger(step) || step < 1) throw new SyntaxError(`Invalid step "${part}" in cron expression "${expression}"`);
      const toNumber = (/** @type {string} */ token) => {
        const index = names ? names.indexOf(token.toLowerCase()) : -1;
        const n = index >= 0 ? index + (min === 1 ? 1 : 0) : token === "" ? NaN : Number(token);
        if (!Number.isInteger(n)) throw new SyntaxError(`Invalid value "${token}" in cron expression "${expression}"`);
        return n;
      };
      let from = min;
      let to = max;
      if (rangePart !== "*" && rangePart !== "?") {
        const [a, b] = rangePart.split("-");
        from = toNumber(a);
        to = b === undefined ? (stepPart === undefined ? from : max) : toNumber(b);
      }
      if (from < min || to > max || from > to) throw new SyntaxError(`Value out of range in "${part}" (allowed ${min}-${max}) in cron expression "${expression}"`);
      for (let v = from; v <= to; v += step) values.add(v);
    }
    return values;
  };
  const weekdays = parse(fields[5], 0, 7, DAY_NAMES);
  if (weekdays.has(7)) {
    weekdays.delete(7);
    weekdays.add(0);
  }
  // "L" alone, or in a list like "15,L", means the last day of the month.
  const dayParts = fields[3].split(",");
  const lastDay = dayParts.some((part) => part.toUpperCase() === "L");
  const dayField = dayParts.filter((part) => part.toUpperCase() !== "L").join(",");
  /** @type {CronSpec} */
  const spec = {
    seconds: parse(fields[0], 0, 59),
    minutes: parse(fields[1], 0, 59),
    hours: parse(fields[2], 0, 23),
    days: dayField === "" ? new Set() : parse(dayField, 1, 31),
    months: parse(fields[4], 1, 12, MONTH_NAMES),
    weekdays,
    anyDay: fields[3] === "*" || fields[3] === "?",
    anyWeekday: fields[5] === "*" || fields[5] === "?",
    lastDay,
  };
  if (_cronSpecs.size >= 200) _cronSpecs.clear();
  _cronSpecs.set(expression, spec);
  return spec;
};

/**
 * Blocks the thread for a few milliseconds. Only for short retries of
 * synchronous file operations.
 * @param {number} ms
 */
const sleepSync = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

module.exports = {
  UNSAFE_KEYS,
  MS,
  timeConfig,
  ASCII,
  isPlainObject,
  unitOf,
  parseDuration,
  toMs,
  setLongTimeout,
  sleep,
  sleepSync,
  intl,
  segmenter,
  graphemes,
  graphemeCount,
  preciseSum,
  argsKey,
  parseCron,
};
