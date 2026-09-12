"use strict";

/**
 * Dates and durations: formatting, relative time, calendar math, time zones
 * and scheduling, in any language `Intl` knows. The default language is
 * English so results are the same on every machine; change it with
 * `setLocale()` or per call with `{ locale }`. Time zones work the same way
 * with `setTimezone()` or `{ timeZone }`.
 *
 * @example
 * time.setLocale("fr").setTimezone("Europe/Paris");
 * time.relative(Date.now() - 3600e3);        // "il y a 1 heure"
 * time.format(new Date(), "dddd D MMMM YYYY"); // "lundi 15 janvier 2024"
 * time.cron("0 9 * * 1-5", sendReport);        // weekdays at 9:00
 */

const { types } = require("node:util");

/**
 * A date: a `Date`, a timestamp in ms, or a string `new Date()` understands
 * (ISO 8601 is safest).
 * @typedef {Date | number | string} DateInput
 */

/**
 * A unit with a fixed length.
 * @typedef {"ms" | "millisecond" | "milliseconds" | "s" | "sec" | "second" | "seconds" | "m" | "min" | "minute" | "minutes" | "h" | "hour" | "hours" | "d" | "day" | "days" | "w" | "week" | "weeks"} DurationUnit
 */

/**
 * A fixed unit, or months and years, whose length varies.
 * @typedef {DurationUnit | "M" | "month" | "months" | "y" | "year" | "years"} CalendarUnit
 */

/**
 * A unit for `startOf()` and `endOf()`.
 * @typedef {"year" | "quarter" | "month" | "week" | "isoWeek" | "day" | "hour" | "minute" | "second"} StartOfUnit
 */

/**
 * Options for `formatDuration()`.
 * @typedef {object} FormatDurationOptions
 * @property {boolean} [long] Full, translated words: `"1 hour 30 minutes"` instead of `"1h 30m"`.
 * @property {number} [units] Show at most this many units, largest first: `units: 2` turns `"1d 3h 5m"` into `"1d 3h"`.
 * @property {boolean} [clock] Clock style, like `"01:30:05"`.
 * @property {boolean} [milliseconds] Show milliseconds. Defaults to `true`.
 * @property {string} [locale] Language for `long`. Defaults to the global locale.
 */

/**
 * Options for `relative()`.
 * @typedef {object} RelativeOptions
 * @property {string} [locale] Defaults to the global locale.
 * @property {"always" | "auto"} [numeric] `"auto"` says `"yesterday"` instead of `"1 day ago"`. Defaults to `"always"`.
 * @property {"long" | "short" | "narrow"} [style] `"short"` gives `"in 3 mo."`. Defaults to `"long"`.
 */

/**
 * Options for `format()`.
 * @typedef {object} FormatDateOptions
 * @property {string} [locale] Language of month and day names. Defaults to the global locale.
 * @property {string} [timeZone] Show the date in this zone, like `"Asia/Tokyo"`. Defaults to the global zone, then the system's.
 */

/**
 * Options for `calendar()`.
 * @typedef {object} CalendarOptions
 * @property {string} [locale] Defaults to the global locale.
 * @property {string} [timeZone] Defaults to the global zone, then the system's.
 * @property {DateInput} [now] What "now" is. Defaults to the current time.
 */

/**
 * Week settings.
 * @typedef {object} WeekOptions
 * @property {0 | 1 | 2 | 3 | 4 | 5 | 6} [weekStartsOn] First day of the week: `0` for Sunday, `1` for Monday. Defaults to `1`.
 */

/**
 * Time zone setting.
 * @typedef {object} TimeZoneOptions
 * @property {string} [timeZone] Zone used to decide which day it is. Defaults to the global zone, then the system's.
 */

/**
 * Options for `every()`.
 * @typedef {object} EveryOptions
 * @property {boolean} [immediate] Also run once right away.
 * @property {boolean} [unref] Let the process exit even if the schedule is active.
 * @property {(error: unknown) => void} [onError] Called when the task fails. Without it, errors surface as unhandled errors.
 */

/**
 * Options for `cron()` and `nextRun()`.
 * @typedef {object} CronOptions
 * @property {string} [timeZone] Zone in which the expression is read, like `"Europe/Paris"`. Defaults to the global zone, then the system's.
 * @property {DateInput} [from] `nextRun()` only: search after this date. Defaults to now.
 * @property {boolean} [unref] Let the process exit even if the schedule is active.
 * @property {boolean} [overlap] Start a run even if the previous one hasn't finished. By default it's skipped.
 * @property {(error: unknown) => void} [onError] Called when the task fails.
 */

/**
 * A schedule returned by `every()` and `cron()`.
 * @typedef {object} ScheduledTask
 * @property {() => void} stop Stops the schedule. A run in progress finishes.
 * @property {() => Date | undefined} next When the next run is planned.
 * @property {() => boolean} isRunning Whether a run is in progress.
 * @property {() => number} runs How many runs have started.
 */

/**
 * Returned by `stopwatch()`.
 * @typedef {object} Stopwatch
 * @property {() => number} elapsed Milliseconds since the start.
 * @property {(format?: boolean) => number | string} stop The elapsed time; `stop(true)` formats it, like `"1.5s"`.
 * @property {(label?: string) => number} lap Records a lap and returns the ms since the previous one.
 * @property {() => Array<{ label: string, ms: number, total: number }>} laps Every lap so far.
 * @property {() => void} reset Starts over.
 */

const MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

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

/** Global defaults. English by default so output never depends on the machine. */
const _config = { locale: "en", timeZone: /** @type {string | undefined} */ (undefined) };

/**
 * @param {DateInput | undefined} value
 * @returns {Date}
 */
const _toDate = (value) => (types.isDate(value) ? new Date(value.getTime()) : value === undefined ? new Date() : new Date(value));

/**
 * @param {number} n
 * @param {number} [len=2]
 */
const _pad = (n, len = 2) => String(Math.abs(n)).padStart(len, "0");

/**
 * @param {string} unit
 * @returns {keyof typeof MS | "M" | "y" | undefined}
 */
const _unit = (unit) => UNIT_ALIASES[unit] ?? UNIT_ALIASES[unit.toLowerCase()];

/** @type {Map<string, Intl.DateTimeFormat>} */
const _dtfCache = new Map();

/**
 * Calendar parts of a date in a time zone.
 * @param {Date} d
 * @param {string} [timeZone]
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number, weekday: number }}
 */
const _parts = (d, timeZone) => {
  if (!timeZone) {
    return {
      year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(),
      minute: d.getMinutes(), second: d.getSeconds(), ms: d.getMilliseconds(), weekday: d.getDay(),
    };
  }
  let dtf = _dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
      minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short",
    });
    _dtfCache.set(timeZone, dtf);
  }
  /** @type {Record<string, string>} */
  const p = {};
  for (const part of dtf.formatToParts(d)) p[part.type] = part.value;
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour) % 24,
    minute: Number(p.minute), second: Number(p.second), ms: d.getMilliseconds(),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
};

/**
 * UTC offset of a zone at an instant, in minutes.
 * @param {Date} d
 * @param {string} [timeZone]
 * @returns {number}
 */
const _offset = (d, timeZone) => {
  if (!timeZone) return -d.getTimezoneOffset();
  const p = _parts(d, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.ms);
  return Math.round((asUTC - d.getTime()) / 60_000);
};

/**
 * Wall-clock time in a zone to an instant. `undefined` when that time is
 * skipped by a daylight-saving change.
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {string} [timeZone]
 * @returns {Date | undefined}
 */
const _fromWall = (year, month, day, hour, minute, second, timeZone) => {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = guess - _offset(new Date(guess), timeZone) * 60_000;
  const second2 = guess - _offset(new Date(instant), timeZone) * 60_000;
  if (second2 !== instant) instant = second2;
  const p = _parts(new Date(instant), timeZone);
  if (p.year !== year || p.month !== month || p.day !== day || p.hour !== hour || p.minute !== minute) return undefined;
  return new Date(instant);
};

/**
 * @param {number} year
 * @param {number} month 1-12
 */
const _daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Adds calendar months, keeping the day in range (Jan 31 + 1 month = end of Feb).
 * @param {Date} d
 * @param {number} months
 * @returns {Date}
 */
const _addMonths = (d, months) => {
  const out = new Date(d.getTime());
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  out.setDate(Math.min(day, _daysIn(out.getFullYear(), out.getMonth() + 1)));
  return out;
};

/**
 * `setTimeout` that also works past its 24.8-day limit.
 * @param {() => void} fn
 * @param {number} ms
 * @param {boolean} unref
 * @returns {() => void}
 */
const _longTimeout = (fn, ms, unref) => {
  const MAX = 2 ** 31 - 1;
  /** @type {NodeJS.Timeout} */
  let timer;
  const schedule = (/** @type {number} */ remaining) => {
    timer = setTimeout(() => (remaining > MAX ? schedule(remaining - MAX) : fn()), Math.min(remaining, MAX));
    if (unref) timer.unref();
  };
  schedule(Math.max(0, ms));
  return () => clearTimeout(timer);
};

/**
 * @param {() => unknown} task
 * @param {((error: unknown) => void) | undefined} onError
 * @returns {Promise<void>}
 */
const _run = async (task, onError) => {
  try {
    await task();
  } catch (error) {
    if (onError) onError(error);
    else setImmediate(() => { throw error; });
  }
};

/**
 * Sets the default language for `relative`, `calendar`, `formatDuration`
 * and `format`.
 *
 * @example
 * time.setLocale("fr");
 * time.relative(Date.now() - 60e3); // "il y a 1 minute"
 *
 * @param {string} locale Like `"fr"`, `"en-GB"`, `"pt-BR"` or `"ja"`.
 * @returns {typeof import("./Time")} The module, so calls chain.
 */
function setLocale(locale) {
  _config.locale = locale;
  return module.exports;
}

/**
 * Sets the default time zone for `format`, `calendar`, `isSameDay`,
 * `cron`... Pass `undefined` to go back to the system zone.
 *
 * @example
 * time.setTimezone("Europe/Paris");
 *
 * @param {string | undefined} timeZone Like `"America/New_York"`.
 * @returns {typeof import("./Time")} The module, so calls chain.
 * @throws {RangeError} If the zone doesn't exist.
 */
function setTimezone(timeZone) {
  if (timeZone !== undefined) new Intl.DateTimeFormat("en-US", { timeZone });
  _config.timeZone = timeZone;
  return module.exports;
}

/**
 * The current defaults.
 *
 * @example
 * time.getConfig(); // { locale: "en", timeZone: undefined }
 *
 * @returns {{ locale: string, timeZone: string | undefined }}
 */
function getConfig() {
  return { ..._config };
}

/**
 * Every time zone Node knows, sorted.
 *
 * @example
 * time.timezones().includes("Europe/Paris"); // true
 *
 * @returns {string[]}
 */
function timezones() {
  return Intl.supportedValuesOf("timeZone");
}

/**
 * A zone's UTC offset at a given date, in minutes. Daylight saving included.
 *
 * @example
 * time.offset("Europe/Paris", "2024-07-01"); // 120
 * time.offset("Europe/Paris", "2024-01-01"); // 60
 *
 * @param {string} [timeZone] Defaults to the global zone, then the system's.
 * @param {DateInput} [date] Defaults to now.
 * @returns {number}
 */
function offset(timeZone, date) {
  return _offset(_toDate(date), timeZone ?? _config.timeZone);
}

/**
 * Turns a duration into milliseconds. Understands `"1h30m"`, `"2 days"`,
 * `"500ms"`, clock times like `"01:30:00"`, ISO durations like `"PT1H30M"`,
 * and plain numbers. Months and years are refused because their length
 * varies; use `add()` for those.
 *
 * @example
 * time.parseDuration("1h30m");    // 5400000
 * time.parseDuration("01:30:00"); // 5400000
 * time.parseDuration("banana");   // null
 *
 * @param {string | number} input
 * @returns {number | null} `null` when it isn't a duration.
 */
function parseDuration(input) {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text) return null;
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
    const unit = _unit(match[2]);
    if (!unit || unit === "M" || unit === "y") return null;
    total += Number(match[1]) * MS[unit];
    consumed += match[0];
  }
  if (!consumed || consumed.replace(/\s+/g, "") !== text.replace(/[\s,]+|and/g, "")) return null;
  return total;
}

/**
 * Writes a duration for humans.
 *
 * @example
 * time.formatDuration(5_400_000);                               // "1h 30m"
 * time.formatDuration(90_000, { long: true });                  // "1 minute 30 seconds"
 * time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
 * time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
 * time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
 *
 * @param {number} ms
 * @param {FormatDurationOptions} [options]
 * @returns {string}
 */
function formatDuration(ms, options = {}) {
  if (!Number.isFinite(ms)) return String(ms);
  const sign = ms < 0 ? "-" : "";
  let rest = Math.abs(Math.trunc(ms));

  if (options.clock) {
    const d = Math.floor(rest / MS.d);
    const h = Math.floor((rest % MS.d) / MS.h);
    const m = Math.floor((rest % MS.h) / MS.m);
    const s = Math.floor((rest % MS.m) / MS.s);
    return `${sign}${d ? `${d}:${_pad(h)}` : _pad(h)}:${_pad(m)}:${_pad(s)}`;
  }

  const locale = options.locale ?? _config.locale;
  const showMs = options.milliseconds ?? true;
  /** @type {Array<{ v: number, short: string, unit: string }>} */
  const parts = [];
  for (const [size, short, unit] of /** @type {Array<[number, string, string]>} */ ([[MS.d, "d", "day"], [MS.h, "h", "hour"], [MS.m, "m", "minute"], [MS.s, "s", "second"], [1, "ms", "millisecond"]])) {
    const v = Math.floor(rest / size);
    rest -= v * size;
    if (v > 0 && (unit !== "millisecond" || showMs)) parts.push({ v, short, unit });
  }
  if (!parts.length) {
    return options.long ? new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "long" }).format(0) : "0s";
  }
  return sign + parts
    .slice(0, options.units ?? Infinity)
    .map((p) => (options.long ? new Intl.NumberFormat(locale, { style: "unit", unit: p.unit, unitDisplay: "long" }).format(p.v) : `${p.v}${p.short}`))
    .join(" ");
}

/**
 * Describes a date relative to now: `"3 hours ago"`, `"in 2 days"`, in
 * any language.
 *
 * @example
 * time.relative(Date.now() - 3_600_000);                                  // "1 hour ago"
 * time.relative(Date.now() - 86_400_000, undefined, { numeric: "auto" }); // "yesterday"
 * time.relative(Date.now() - 3_600_000, undefined, { locale: "fr" });     // "il y a 1 heure"
 *
 * @param {DateInput} date
 * @param {DateInput} [from] Compare with this date instead of now.
 * @param {RelativeOptions} [options]
 * @returns {string}
 */
function relative(date, from, options = {}) {
  const locale = options.locale ?? _config.locale;
  const diffMs = _toDate(date).getTime() - _toDate(from).getTime();
  const abs = Math.abs(diffMs);
  if (abs < MS.s) return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: options.style ?? "long" }).format(0, "second");
  /** @type {Array<[number, number, Intl.RelativeTimeFormatUnit]>} */
  const scale = [
    [MS.m, MS.s, "second"], [MS.h, MS.m, "minute"], [MS.d, MS.h, "hour"], [MS.w, MS.d, "day"],
    [MS.d * 30, MS.w, "week"], [MS.d * 365, MS.d * 30, "month"], [Infinity, MS.d * 365, "year"],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: options.numeric ?? "always", style: options.style ?? "long" });
  for (const [limit, size, unit] of scale) {
    if (abs < limit) {
      const value = Math.floor(abs / size);
      return rtf.format(diffMs < 0 ? -value : value, unit);
    }
  }
  return rtf.format(0, "second");
}

/**
 * Describes a date like a chat app does: `"Today at 2:30 PM"`,
 * `"Yesterday at 9:05 AM"`, a weekday for the coming days, and the full date
 * beyond that.
 *
 * @example
 * time.calendar(new Date());                     // "Today at 2:30 PM"
 * time.calendar(yesterday, { locale: "fr" });    // "Hier à 09:05"
 *
 * @param {DateInput} date
 * @param {CalendarOptions} [options]
 * @returns {string}
 */
function calendar(date, options = {}) {
  const locale = options.locale ?? _config.locale;
  const timeZone = options.timeZone ?? _config.timeZone;
  const d = _toDate(date);
  const now = _toDate(options.now);
  const p = _parts(d, timeZone);
  const n = _parts(now, timeZone);
  const dayIndex = (/** @type {{ year: number, month: number, day: number }} */ x) => Date.UTC(x.year, x.month - 1, x.day) / MS.d;
  const delta = dayIndex(p) - dayIndex(n);
  const hhmm = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(d);
  const at = (/** @type {string} */ label) => {
    const joined = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short", timeZone }).formatToParts(d);
    const literal = joined.find((part, i) => part.type === "literal" && joined[i + 1]?.type === "hour")?.value ?? " ";
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}${literal}${hhmm}`;
  };
  if (Math.abs(delta) <= 1) {
    return at(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(delta, "day"));
  }
  if (delta > 1 && delta < 7) {
    return at(new Intl.DateTimeFormat(locale, { weekday: "long", timeZone }).format(d));
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone }).format(d);
}

/**
 * Formats a date with tokens, in any language and time zone.
 *
 * | Token | Output | | Token | Output |
 * | --- | --- | --- | --- | --- |
 * | `YYYY` / `YY` | 2024 / 24 | | `HH` / `H` | 09 / 9 (24h) |
 * | `Q` | quarter, 1-4 | | `hh` / `h` | 09 / 9 (12h) |
 * | `MMMM` / `MMM` | January / Jan | | `mm` / `m` | 05 / 5 |
 * | `MM` / `M` | 01 / 1 | | `ss` / `s` | 07 / 7 |
 * | `DD` / `D` | 05 / 5 | | `SSS` | 042 (ms) |
 * | `dddd` / `ddd` | Monday / Mon | | `A` / `a` | PM / pm |
 * | `d` | weekday, 0 is Sunday | | `Z` / `ZZ` | +02:00 / +0200 |
 * | `W` / `WW` | ISO week | | `X` / `x` | Unix seconds / ms |
 *
 * Text in brackets stays as is: `"[Today is] dddd"`.
 *
 * @example
 * time.format(new Date(), "YYYY-MM-DD HH:mm:ss");                  // "2024-01-15 14:30:05"
 * time.format(Date.now(), "dddd D MMMM YYYY", { locale: "fr" });    // "lundi 15 janvier 2024"
 * time.format(Date.now(), "HH:mm Z", { timeZone: "Asia/Tokyo" });   // "22:30 +09:00"
 *
 * @param {DateInput} date
 * @param {string} [pattern="YYYY-MM-DD HH:mm:ss"]
 * @param {FormatDateOptions} [options]
 * @returns {string} Or `"Invalid Date"`.
 */
function format(date, pattern = "YYYY-MM-DD HH:mm:ss", options = {}) {
  const d = _toDate(date);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  const locale = options.locale ?? _config.locale;
  const timeZone = options.timeZone ?? _config.timeZone;
  const p = _parts(d, timeZone);
  const named = (/** @type {Intl.DateTimeFormatOptions} */ opt) => new Intl.DateTimeFormat(locale, { ...opt, timeZone }).format(d);
  const tz = (/** @type {string} */ sep) => {
    const off = _offset(d, timeZone);
    return `${off < 0 ? "-" : "+"}${_pad(Math.floor(Math.abs(off) / 60))}${sep}${_pad(Math.abs(off) % 60)}`;
  };
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const isoWeek = () => weekOfYear(Date.UTC(p.year, p.month - 1, p.day), { utc: true });

  return pattern.replace(
    /\[([^\]]*)\]|YYYY|MMMM|dddd|SSS|MMM|ddd|YY|MM|DD|HH|hh|mm|ss|ZZ|WW|M|D|d|H|h|m|s|A|a|Z|Q|X|x|W/g,
    (token, escaped) => {
      if (escaped !== undefined) return escaped;
      switch (token) {
        case "YYYY": return String(p.year);
        case "YY": return String(p.year).slice(-2);
        case "Q": return String(Math.ceil(p.month / 3));
        case "MMMM": return named({ month: "long" });
        case "MMM": return named({ month: "short" });
        case "MM": return _pad(p.month);
        case "M": return String(p.month);
        case "DD": return _pad(p.day);
        case "D": return String(p.day);
        case "dddd": return named({ weekday: "long" });
        case "ddd": return named({ weekday: "short" });
        case "d": return String(p.weekday);
        case "HH": return _pad(p.hour);
        case "H": return String(p.hour);
        case "hh": return _pad(h12);
        case "h": return String(h12);
        case "mm": return _pad(p.minute);
        case "m": return String(p.minute);
        case "ss": return _pad(p.second);
        case "s": return String(p.second);
        case "SSS": return _pad(p.ms, 3);
        case "A": return p.hour < 12 ? "AM" : "PM";
        case "a": return p.hour < 12 ? "am" : "pm";
        case "Z": return tz(":");
        case "ZZ": return tz("");
        case "X": return String(Math.floor(d.getTime() / 1000));
        case "x": return String(d.getTime());
        case "W": return String(isoWeek());
        case "WW": return _pad(isoWeek());
        default: return token;
      }
    },
  );
}

/**
 * The date as `YYYY-MM-DD`, the format `<input type="date">` and most APIs
 * expect.
 *
 * @example
 * time.toISODate(new Date(2024, 0, 5)); // "2024-01-05"
 *
 * @param {DateInput} [date] Defaults to now.
 * @param {TimeZoneOptions} [options]
 * @returns {string}
 */
function toISODate(date, options = {}) {
  return format(date ?? new Date(), "YYYY-MM-DD", { timeZone: options.timeZone ?? _config.timeZone });
}

/**
 * Adds time to a date and returns a new `Date`. Months and years follow the
 * calendar: January 31 plus one month is the end of February.
 *
 * @example
 * time.add(new Date(), "2h30m");
 * time.add(new Date(), 3, "days");
 * time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
 *
 * @param {DateInput} date
 * @param {number | string} amount A number with `unit`, or a duration like `"1h30m"`.
 * @param {CalendarUnit} [unit="ms"]
 * @returns {Date}
 */
function add(date, amount, unit = "ms") {
  const d = _toDate(date);
  if (typeof amount === "string") return new Date(d.getTime() + (parseDuration(amount) ?? 0));
  const u = _unit(unit) ?? "ms";
  if (u === "M") return _addMonths(d, amount);
  if (u === "y") return _addMonths(d, amount * 12);
  return new Date(d.getTime() + amount * MS[u]);
}

/**
 * Subtracts time from a date and returns a new `Date`.
 *
 * @example
 * time.subtract(new Date(), 7, "days");
 * time.subtract(new Date(), "90m");
 *
 * @param {DateInput} date
 * @param {number | string} amount
 * @param {CalendarUnit} [unit="ms"]
 * @returns {Date}
 */
function subtract(date, amount, unit = "ms") {
  if (typeof amount === "string") return add(date, -(parseDuration(amount) ?? 0));
  return add(date, -amount, unit);
}

/**
 * `a - b` in a unit. Fixed units can give fractions; months and years are
 * whole calendar months and years.
 *
 * @example
 * time.diff("2024-01-03", "2024-01-01", "days");   // 2
 * time.diff("2024-03-15", "2024-01-20", "months"); // 1
 *
 * @param {DateInput} a
 * @param {DateInput} b
 * @param {CalendarUnit} [unit="ms"]
 * @returns {number}
 */
function diff(a, b, unit = "ms") {
  const da = _toDate(a);
  const db = _toDate(b);
  const u = _unit(unit) ?? "ms";
  if (u === "M" || u === "y") {
    const sign = da >= db ? 1 : -1;
    const [late, early] = sign > 0 ? [da, db] : [db, da];
    let months = (late.getFullYear() - early.getFullYear()) * 12 + late.getMonth() - early.getMonth();
    if (_addMonths(early, months) > late) months--;
    return sign * (u === "y" ? Math.trunc(months / 12) : months) || 0;
  }
  return (da.getTime() - db.getTime()) / MS[u];
}

/**
 * A new `Date` at the start of the day, week, month... in local time.
 *
 * @example
 * time.startOf(new Date(), "day");                         // today at 00:00
 * time.startOf(new Date(), "week");                        // Monday at 00:00
 * time.startOf(new Date(), "week", { weekStartsOn: 0 });   // Sunday at 00:00
 *
 * @param {DateInput} date
 * @param {StartOfUnit} unit
 * @param {WeekOptions} [options]
 * @returns {Date}
 */
function startOf(date, unit, options = {}) {
  const d = _toDate(date);
  switch (unit) {
    case "year":
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
    case "quarter":
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      d.setHours(0, 0, 0, 0);
      break;
    case "month":
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case "week":
    case "isoWeek": {
      const start = unit === "isoWeek" ? 1 : options.weekStartsOn ?? 1;
      d.setDate(d.getDate() - ((d.getDay() - start + 7) % 7));
      d.setHours(0, 0, 0, 0);
      break;
    }
    case "day":
      d.setHours(0, 0, 0, 0);
      break;
    case "hour":
      d.setMinutes(0, 0, 0);
      break;
    case "minute":
      d.setSeconds(0, 0);
      break;
    case "second":
      d.setMilliseconds(0);
      break;
  }
  return d;
}

/**
 * A new `Date` at the last millisecond of the day, week, month...
 *
 * @example
 * time.endOf(new Date(), "month"); // last day of the month, 23:59:59.999
 *
 * @param {DateInput} date
 * @param {StartOfUnit} unit
 * @param {WeekOptions} [options]
 * @returns {Date}
 */
function endOf(date, unit, options = {}) {
  const start = startOf(date, unit, options);
  /** @type {Date} */
  let next;
  switch (unit) {
    case "year": next = _addMonths(start, 12); break;
    case "quarter": next = _addMonths(start, 3); break;
    case "month": next = _addMonths(start, 1); break;
    case "week":
    case "isoWeek": next = new Date(start); next.setDate(next.getDate() + 7); break;
    case "day": next = new Date(start); next.setDate(next.getDate() + 1); break;
    case "hour": next = new Date(start.getTime() + MS.h); break;
    case "minute": next = new Date(start.getTime() + MS.m); break;
    default: next = new Date(start.getTime() + MS.s); break;
  }
  return new Date(next.getTime() - 1);
}

/**
 * Is `a` before `b`?
 *
 * @param {DateInput} a
 * @param {DateInput} b
 * @returns {boolean}
 */
function isBefore(a, b) {
  return _toDate(a).getTime() < _toDate(b).getTime();
}

/**
 * Is `a` after `b`?
 *
 * @example
 * if (time.isAfter(expiresAt, Date.now())) grantAccess();
 *
 * @param {DateInput} a
 * @param {DateInput} b
 * @returns {boolean}
 */
function isAfter(a, b) {
  return _toDate(a).getTime() > _toDate(b).getTime();
}

/**
 * Is the date between `start` and `end`, both included?
 *
 * @param {DateInput} date
 * @param {DateInput} start
 * @param {DateInput} end
 * @returns {boolean}
 */
function isBetween(date, start, end) {
  const t = _toDate(date).getTime();
  return t >= _toDate(start).getTime() && t <= _toDate(end).getTime();
}

/**
 * Are both dates on the same calendar day?
 *
 * @example
 * time.isSameDay(a, b);                            // local time
 * time.isSameDay(a, b, { timeZone: "Asia/Tokyo" }); // as seen in Tokyo
 *
 * @param {DateInput} a
 * @param {DateInput} b
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isSameDay(a, b, options = {}) {
  const timeZone = options.timeZone ?? _config.timeZone;
  const pa = _parts(_toDate(a), timeZone);
  const pb = _parts(_toDate(b), timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/**
 * Is the date today?
 *
 * @param {DateInput} date
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isToday(date, options = {}) {
  return isSameDay(date, new Date(), options);
}

/**
 * Was the date yesterday?
 *
 * @param {DateInput} date
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isYesterday(date, options = {}) {
  return isSameDay(date, add(new Date(), -1, "d"), options);
}

/**
 * Is the date tomorrow?
 *
 * @param {DateInput} date
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isTomorrow(date, options = {}) {
  return isSameDay(date, add(new Date(), 1, "d"), options);
}

/**
 * Is it a Saturday or a Sunday?
 *
 * @param {DateInput} date
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isWeekend(date, options = {}) {
  const day = _parts(_toDate(date), options.timeZone ?? _config.timeZone).weekday;
  return day === 0 || day === 6;
}

/**
 * Is it a leap year?
 *
 * @example
 * time.isLeapYear(2024); // true
 * time.isLeapYear(1900); // false
 *
 * @param {number | DateInput} yearOrDate A year (1000 to 9999) or a date.
 * @returns {boolean}
 */
function isLeapYear(yearOrDate) {
  const year = typeof yearOrDate === "number" && yearOrDate >= 1000 && yearOrDate <= 9999 ? yearOrDate : _toDate(yearOrDate).getFullYear();
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Is it a real date, or something that parses to one?
 *
 * @example
 * time.isValid("2024-02-29"); // true
 * time.isValid("2024-02-30"); // false
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isValid(value) {
  if (types.isDate(value)) return !Number.isNaN(value.getTime());
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m && Number(m[3]) > _daysIn(Number(m[1]), Number(m[2]))) return false;
  }
  if (typeof value !== "string" && typeof value !== "number") return false;
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Number of days in a month.
 *
 * @example
 * time.daysInMonth(new Date(2024, 1)); // 29
 * time.daysInMonth(2023, 2);           // 28
 *
 * @param {DateInput | number} dateOrYear A date, or a year when you pass `month`.
 * @param {number} [month] 1 to 12.
 * @returns {number}
 */
function daysInMonth(dateOrYear, month) {
  if (typeof dateOrYear === "number" && month !== undefined) return _daysIn(dateOrYear, month);
  const d = _toDate(dateOrYear);
  return _daysIn(d.getFullYear(), d.getMonth() + 1);
}

/**
 * Day of the year, from 1 to 366.
 *
 * @param {DateInput} [date] Defaults to now.
 * @returns {number}
 */
function dayOfYear(date) {
  const d = _toDate(date);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / MS.d) + 1;
}

/**
 * ISO week number, from 1 to 53. Weeks start on Monday, and week 1 holds
 * the year's first Thursday.
 *
 * @example
 * time.weekOfYear(new Date(2021, 0, 3)); // 53, the last week of 2020
 *
 * @param {DateInput} [date] Defaults to now.
 * @param {{ utc?: boolean }} [options] Read the date in UTC.
 * @returns {number}
 */
function weekOfYear(date, options = {}) {
  const d = _toDate(date);
  const utc = options.utc
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  return Math.ceil(((utc.getTime() - yearStart) / MS.d + 1) / 7);
}

/**
 * The earliest date.
 *
 * @param {Iterable<DateInput>} dates
 * @returns {Date | undefined}
 */
function min(dates) {
  /** @type {Date | undefined} */
  let best;
  for (const value of dates) {
    const d = _toDate(value);
    if (!best || d < best) best = d;
  }
  return best;
}

/**
 * The latest date.
 *
 * @param {Iterable<DateInput>} dates
 * @returns {Date | undefined}
 */
function max(dates) {
  /** @type {Date | undefined} */
  let best;
  for (const value of dates) {
    const d = _toDate(value);
    if (!best || d > best) best = d;
  }
  return best;
}

/**
 * The current Unix timestamp, in seconds.
 *
 * @returns {number}
 */
function unix() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Starts a precise stopwatch.
 *
 * @example
 * const sw = time.stopwatch();
 * await loadConfig(); sw.lap("config");
 * await connectDb();  sw.lap("db");
 * console.log(sw.stop(true)); // "182.4ms"
 *
 * @returns {Stopwatch}
 */
function stopwatch() {
  let start = process.hrtime.bigint();
  let lastLap = start;
  /** @type {Array<{ label: string, ms: number, total: number }>} */
  let laps = [];
  const since = (/** @type {bigint} */ t) => Number(process.hrtime.bigint() - t) / 1e6;
  const pretty = (/** @type {number} */ ms) =>
    ms < 1000 ? `${Math.round(ms * 100) / 100}ms` : ms < MS.m ? `${Math.round(ms / 10) / 100}s` : formatDuration(ms, { units: 2, milliseconds: false });
  return {
    elapsed: () => since(start),
    stop: (fmt = false) => (fmt ? pretty(since(start)) : since(start)),
    lap: (label) => {
      const now = process.hrtime.bigint();
      const ms = Number(now - lastLap) / 1e6;
      lastLap = now;
      laps.push({ label: label ?? `lap ${laps.length + 1}`, ms, total: Number(now - start) / 1e6 });
      return ms;
    },
    laps: () => laps.map((l) => ({ ...l })),
    reset: () => {
      start = process.hrtime.bigint();
      lastLap = start;
      laps = [];
    },
  };
}

/**
 * Runs a function, sync or async, and tells you how long it took.
 *
 * @example
 * const { result, duration } = await time.measure(() => db.query(sql));
 * nc.info(`Query took ${duration.toFixed(1)}ms`);
 *
 * @template T
 * @param {() => T} fn
 * @returns {Promise<{ result: Awaited<T>, duration: number }>} `duration` is in milliseconds.
 */
async function measure(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  return { result, duration: Number(process.hrtime.bigint() - start) / 1e6 };
}

/**
 * Runs a task at a regular interval. Unlike `setInterval`, a slow run
 * delays the next one instead of piling up, timing doesn't drift, and
 * errors are caught.
 *
 * @example
 * const job = time.every("5m", syncInventory, { immediate: true, onError: nc.error });
 * job.next(); // when it runs next
 * job.stop();
 *
 * @param {number | string} interval In ms, or a duration like `"30s"`.
 * @param {() => unknown} task Can be async.
 * @param {EveryOptions} [options]
 * @returns {ScheduledTask}
 * @throws {RangeError} If the interval isn't a positive duration.
 */
function every(interval, task, options = {}) {
  const ms = parseDuration(interval);
  if (ms === null || ms <= 0) throw new RangeError(`Invalid interval: ${String(interval)}`);
  let stopped = false;
  let running = false;
  let runs = 0;
  /** @type {() => void} */
  let cancel = () => {};
  let nextAt = Date.now() + (options.immediate ? 0 : ms);

  const tick = async () => {
    if (stopped) return;
    running = true;
    runs++;
    await _run(task, options.onError);
    running = false;
    if (stopped) return;
    const now = Date.now();
    nextAt += ms;
    if (nextAt <= now) nextAt = now + ms - ((now - nextAt) % ms);
    cancel = _longTimeout(tick, nextAt - Date.now(), options.unref ?? false);
  };
  cancel = _longTimeout(tick, nextAt - Date.now(), options.unref ?? false);

  return {
    stop: () => {
      stopped = true;
      cancel();
    },
    next: () => (stopped ? undefined : new Date(nextAt)),
    isRunning: () => running,
    runs: () => runs,
  };
}

/**
 * Parsed cron fields.
 * @typedef {{ seconds: Set<number>, minutes: Set<number>, hours: Set<number>, days: Set<number>, months: Set<number>, weekdays: Set<number>, anyDay: boolean, anyWeekday: boolean }} CronSpec
 */

/** @type {Record<string, string>} */
const _CRON_MACROS = {
  "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *",
};
const _MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const _DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * @param {string} expression
 * @returns {CronSpec}
 */
const _parseCron = (expression) => {
  const text = _CRON_MACROS[expression.trim().toLowerCase()] ?? expression.trim();
  const fields = text.split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) throw new SyntaxError(`Invalid cron expression "${expression}": expected 5 or 6 fields`);
  if (fields.length === 5) fields.unshift("0");
  /** @type {(field: string, min: number, max: number, names?: string[]) => Set<number>} */
  const parse = (field, min, max, names) => {
    const values = new Set();
    for (const part of field.split(",")) {
      const [rangePart, stepPart] = part.split("/");
      const step = stepPart === undefined ? 1 : Number(stepPart);
      if (!Number.isInteger(step) || step < 1) throw new SyntaxError(`Invalid step "${part}" in cron expression "${expression}"`);
      const toNumber = (/** @type {string} */ token) => {
        const index = names ? names.indexOf(token.toLowerCase()) : -1;
        const n = index >= 0 ? index + (min === 1 ? 1 : 0) : Number(token);
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
  const weekdays = parse(fields[5], 0, 7, _DAY_NAMES);
  if (weekdays.has(7)) {
    weekdays.delete(7);
    weekdays.add(0);
  }
  return {
    seconds: parse(fields[0], 0, 59),
    minutes: parse(fields[1], 0, 59),
    hours: parse(fields[2], 0, 23),
    days: parse(fields[3], 1, 31),
    months: parse(fields[4], 1, 12, _MONTH_NAMES),
    weekdays,
    anyDay: fields[3] === "*" || fields[3] === "?",
    anyWeekday: fields[5] === "*" || fields[5] === "?",
  };
};

/**
 * @param {CronSpec} spec
 * @param {Date} from
 * @param {string | undefined} timeZone
 * @returns {Date | undefined}
 */
const _nextCron = (spec, from, timeZone) => {
  const start = _parts(new Date(from.getTime() + 1000), timeZone);
  // Walk wall-clock time (stored in a UTC Date) and convert matches to instants.
  const wall = new Date(Date.UTC(start.year, start.month - 1, start.day, start.hour, start.minute, start.second));
  const limit = wall.getTime() + 8 * 366 * MS.d;
  const dayMatches = () => {
    const dom = spec.days.has(wall.getUTCDate());
    const dow = spec.weekdays.has(wall.getUTCDay());
    if (spec.anyDay && spec.anyWeekday) return true;
    if (spec.anyDay) return dow;
    if (spec.anyWeekday) return dom;
    return dom || dow;
  };
  while (wall.getTime() <= limit) {
    if (!spec.months.has(wall.getUTCMonth() + 1)) {
      wall.setUTCMonth(wall.getUTCMonth() + 1, 1);
      wall.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches()) {
      wall.setUTCDate(wall.getUTCDate() + 1);
      wall.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!spec.hours.has(wall.getUTCHours())) {
      wall.setUTCHours(wall.getUTCHours() + 1, 0, 0, 0);
      continue;
    }
    if (!spec.minutes.has(wall.getUTCMinutes())) {
      wall.setUTCMinutes(wall.getUTCMinutes() + 1, 0, 0);
      continue;
    }
    if (!spec.seconds.has(wall.getUTCSeconds())) {
      wall.setUTCSeconds(wall.getUTCSeconds() + 1, 0);
      continue;
    }
    const instant = _fromWall(wall.getUTCFullYear(), wall.getUTCMonth() + 1, wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds(), timeZone);
    if (instant && instant.getTime() > from.getTime()) return instant;
    wall.setUTCSeconds(wall.getUTCSeconds() + 1, 0);
  }
  return undefined;
};

/**
 * The next date matching a cron expression, without scheduling anything.
 *
 * Expressions have 5 fields (`minute hour day month weekday`), or 6 with
 * seconds first. You can use `*`, lists (`1,15`), ranges (`1-5`), steps
 * (`*\/15`), names (`jan`, `mon-fri`) and `@daily`, `@hourly`, `@weekly`,
 * `@monthly`, `@yearly`. As in classic cron, when both the day and the
 * weekday are set, either one matching is enough.
 *
 * @example
 * time.nextRun("0 9 * * mon-fri");                              // next weekday at 09:00
 * time.nextRun("0 0 1 * *", { timeZone: "America/New_York" });  // next 1st of the month
 *
 * @param {string} expression
 * @param {CronOptions} [options]
 * @returns {Date | undefined} `undefined` if nothing matches within 8 years.
 * @throws {SyntaxError} If the expression is invalid.
 */
function nextRun(expression, options = {}) {
  return _nextCron(_parseCron(expression), _toDate(options.from), options.timeZone ?? _config.timeZone);
}

/**
 * Runs a task on a cron schedule, in any time zone. Daylight-saving changes
 * are handled: a skipped time is skipped, a repeated one runs once. See
 * `nextRun()` for the syntax.
 *
 * @example
 * const job = time.cron("0 9 * * 1-5", sendDailyReport, { timeZone: "Europe/Paris" });
 * time.cron("*\/15 * * * *", refreshCache, { onError: nc.error });
 * job.stop();
 *
 * @param {string} expression
 * @param {() => unknown} task Can be async.
 * @param {CronOptions} [options]
 * @returns {ScheduledTask}
 * @throws {SyntaxError} If the expression is invalid.
 */
function cron(expression, task, options = {}) {
  const spec = _parseCron(expression);
  const timeZone = options.timeZone ?? _config.timeZone;
  let stopped = false;
  let running = false;
  let runs = 0;
  /** @type {Date | undefined} */
  let nextDate;
  /** @type {() => void} */
  let cancel = () => {};

  const plan = (/** @type {Date} */ after) => {
    nextDate = _nextCron(spec, after, timeZone);
    if (!nextDate || stopped) return;
    const target = nextDate;
    cancel = _longTimeout(() => {
      if (stopped) return;
      plan(target);
      if (running && !options.overlap) return;
      running = true;
      runs++;
      _run(task, options.onError).finally(() => {
        running = false;
      });
    }, target.getTime() - Date.now(), options.unref ?? false);
  };
  plan(new Date());

  return {
    stop: () => {
      stopped = true;
      nextDate = undefined;
      cancel();
    },
    next: () => (stopped ? undefined : nextDate),
    isRunning: () => running,
    runs: () => runs,
  };
}

module.exports = {
  setLocale,
  setTimezone,
  getConfig,
  timezones,
  offset,
  parseDuration,
  formatDuration,
  relative,
  calendar,
  format,
  toISODate,
  add,
  subtract,
  diff,
  startOf,
  endOf,
  isBefore,
  isAfter,
  isBetween,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  isWeekend,
  isLeapYear,
  isValid,
  daysInMonth,
  dayOfYear,
  weekOfYear,
  min,
  max,
  unix,
  stopwatch,
  measure,
  every,
  nextRun,
  cron,
};
