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
 * @property {string} [timeZone] Zone whose calendar is used. Defaults to the global zone, then the system's.
 */

/**
 * Options for `parse()`.
 * @typedef {object} ParseDateOptions
 * @property {string} [locale] Language of month names in the text. Defaults to the global locale.
 * @property {string} [timeZone] Zone the text is written in, unless it carries its own offset. Defaults to the global zone, then the system's.
 */

/**
 * Options for `range()`.
 * @typedef {object} DateRangeOptions
 * @property {number} [step] How many units between two dates. Defaults to `1`.
 * @property {string} [timeZone] Zone whose calendar is used for days, months and years.
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
 * @property {boolean} [immediate] `cron()` only: also run once right away.
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

const shared = require("./internal/shared.js");

const { MS, intl, unitOf: _unit, setLongTimeout: _longTimeout } = shared;

const _config = shared.timeConfig;

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
const _daysIn = (year, month) => (month === 2 ? ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28) : month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31);

/**
 * Wall-clock time in a zone to an instant. A time that happens twice (clocks
 * going back) keeps its first occurrence; one that never happens (clocks
 * going forward) moves past the gap.
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {number} ms
 * @param {string} [timeZone]
 * @returns {Date}
 */
const _instantOf = (year, month, day, hour, minute, second, ms, timeZone) => {
  if (!timeZone) return new Date(year, month - 1, day, hour, minute, second, ms);
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  // The offsets a day before and a day after frame any clock change.
  const early = guess - _offset(new Date(guess - MS.d), timeZone) * 60_000;
  const late = guess - _offset(new Date(guess + MS.d), timeZone) * 60_000;
  if (early === late) return new Date(early);
  const first = Math.min(early, late);
  const at = _parts(new Date(first), timeZone);
  if (at.day === day && at.hour === hour && at.minute === minute) return new Date(first);
  return new Date(Math.max(early, late));
};

/**
 * The first moment of a unit, as wall-clock fields.
 * @param {{ year: number, month: number, day: number, hour: number, minute: number, second: number, weekday: number }} at
 * @param {string} unit
 * @param {number} [weekStartsOn]
 * @returns {[number, number, number, number, number, number] | undefined}
 */
const _startWall = (at, unit, weekStartsOn) => {
  switch (unit) {
    case "year": return [at.year, 1, 1, 0, 0, 0];
    case "quarter": return [at.year, Math.floor((at.month - 1) / 3) * 3 + 1, 1, 0, 0, 0];
    case "month": return [at.year, at.month, 1, 0, 0, 0];
    case "week":
    case "isoWeek": {
      const first = unit === "isoWeek" ? 1 : weekStartsOn ?? 1;
      const monday = new Date(Date.UTC(at.year, at.month - 1, at.day - ((at.weekday - first + 7) % 7)));
      return [monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), 0, 0, 0];
    }
    case "day": return [at.year, at.month, at.day, 0, 0, 0];
    case "hour": return [at.year, at.month, at.day, at.hour, 0, 0];
    case "minute": return [at.year, at.month, at.day, at.hour, at.minute, 0];
    case "second": return [at.year, at.month, at.day, at.hour, at.minute, at.second];
    default: return undefined;
  }
};

/**
 * Calendar days from `b` to `a` in a zone: 1 means "the day after".
 * @param {Date} a
 * @param {Date} b
 * @param {string} [timeZone]
 * @returns {number}
 */
const _dayDelta = (a, b, timeZone) => {
  const x = _parts(a, timeZone);
  const y = _parts(b, timeZone);
  return Math.round((Date.UTC(x.year, x.month - 1, x.day) - Date.UTC(y.year, y.month - 1, y.day)) / MS.d);
};

/**
 * Adds calendar months, keeping the day in range (Jan 31 + 1 month = end of Feb).
 * @param {Date} d
 * @param {number} months
 * @param {string} [timeZone]
 * @returns {Date}
 */
const _addMonths = (d, months, timeZone) => {
  const at = _parts(d, timeZone);
  const index = at.year * 12 + at.month - 1 + Math.trunc(months);
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return _instantOf(year, month, Math.min(at.day, _daysIn(year, month)), at.hour, at.minute, at.second, at.ms, timeZone);
};

/**
 * Adds a duration written as text: a fixed one (`"1h30m"`) or one with
 * calendar units (`"1 month"`, `"2y 3d"`).
 * @param {Date} d
 * @param {string} text
 * @param {1 | -1} sign
 * @param {string} [timeZone]
 * @returns {Date}
 */
const _addText = (d, text, sign, timeZone) => {
  const fixed = shared.parseDuration(text);
  if (fixed !== null) return new Date(d.getTime() + sign * fixed);
  const regex = /([-+]?\d*\.?\d+)\s*([a-zA-Z]+)/g;
  let months = 0;
  let ms = 0;
  let consumed = "";
  let match;
  while ((match = regex.exec(text)) !== null) {
    const unit = _unit(match[2]);
    if (!unit) break;
    const amount = Number(match[1]);
    if (unit === "M") months += amount;
    else if (unit === "y") months += amount * 12;
    else ms += amount * MS[unit];
    consumed += match[0];
  }
  if (!consumed || consumed.replace(/\s+/g, "") !== text.replace(/[\s,]+|and/g, "")) throw new TypeError(`Invalid duration: ${JSON.stringify(text)}`);
  const moved = months ? _addMonths(d, sign * months, timeZone) : d;
  return new Date(moved.getTime() + sign * ms);
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
  return shared.parseDuration(input);
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
  const limit = options.units ?? Infinity;
  /** @param {string} unit */
  const long = (unit) => intl.number(locale, { style: "unit", unit, unitDisplay: "long" });
  let out = "";
  let shown = 0;
  for (let i = 0; i < _DURATION_UNITS.length && shown < limit; i++) {
    const [size, short, unit] = _DURATION_UNITS[i];
    const value = Math.floor(rest / size);
    rest -= value * size;
    if (value === 0 || (unit === "millisecond" && !showMs)) continue;
    out += `${shown ? " " : ""}${options.long ? long(unit).format(value) : `${value}${short}`}`;
    shown++;
  }
  if (!shown) return options.long ? long("second").format(0) : "0s";
  return sign + out;
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
  const style = options.style ?? "long";
  const diffMs = _toDate(date).getTime() - _toDate(from).getTime();
  const abs = Math.abs(diffMs);
  if (abs < MS.s) return intl.relativeTime(locale, { numeric: "auto", style }).format(0, "second");
  const rtf = intl.relativeTime(locale, { numeric: options.numeric ?? "always", style });
  for (let i = 0; i < _RELATIVE_SCALE.length; i++) {
    const [limit, size, unit] = _RELATIVE_SCALE[i];
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
  const delta = _dayDelta(d, _toDate(options.now), timeZone);
  if (delta < -1 || delta >= 7) return intl.dateTime(locale, { dateStyle: "long", timeZone }).format(d);
  const hhmm = intl.dateTime(locale, { timeStyle: "short", timeZone }).format(d);
  const label = delta <= 1 ? intl.relativeTime(locale, { numeric: "auto" }).format(delta, "day") : intl.dateTime(locale, { weekday: "long", timeZone }).format(d);
  // The word that joins a date and a time in this language ("at", "à", "um").
  const joined = intl.dateTime(locale, { dateStyle: "full", timeStyle: "short", timeZone }).formatToParts(d);
  const literal = joined.find((part, i) => part.type === "literal" && joined[i + 1]?.type === "hour")?.value ?? " ";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}${literal}${hhmm}`;
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
 * | `Do` | 5th | | `z` | zone name, like CET |
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
  const at = _parts(d, timeZone);
  let compiled = _patterns.get(pattern);
  if (compiled === undefined) {
    compiled = _compile(pattern);
    if (_patterns.size >= 200) _patterns.clear();
    _patterns.set(pattern, compiled);
  }
  // Literal text and tokens alternate, starting with text.
  let out = compiled[0];
  for (let i = 1; i < compiled.length; i += 2) out += _token(compiled[i], d, at, locale, timeZone) + compiled[i + 1];
  return out;
}

const _TOKENS = /\[([^\]]*)\]|YYYY|MMMM|dddd|SSS|MMM|ddd|Do|YY|MM|DD|HH|hh|mm|ss|ZZ|WW|M|D|d|H|h|m|s|A|a|Z|z|Q|X|x|W/g;

/** @type {Map<string, string[]>} */
const _patterns = new Map();

/**
 * Splits a pattern into literal text and tokens, alternating.
 * @param {string} pattern
 * @returns {string[]}
 */
const _compile = (pattern) => {
  /** @type {string[]} */
  const out = [""];
  let last = 0;
  for (const match of pattern.matchAll(_TOKENS)) {
    const literal = pattern.slice(last, match.index);
    last = match.index + match[0].length;
    if (match[1] !== undefined) {
      out[out.length - 1] += literal + match[1];
      continue;
    }
    out[out.length - 1] += literal;
    out.push(match[0], "");
  }
  out[out.length - 1] += pattern.slice(last);
  return out;
};

/**
 * @param {Date} d
 * @param {string | undefined} timeZone
 * @param {string} separator
 */
const _offsetText = (d, timeZone, separator) => {
  const offset = _offset(d, timeZone);
  const abs = Math.abs(offset);
  return `${offset < 0 ? "-" : "+"}${_pad(Math.floor(abs / 60))}${separator}${_pad(abs % 60)}`;
};

/**
 * @param {string} token
 * @param {Date} d
 * @param {{ year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number, weekday: number }} at
 * @param {string} locale
 * @param {string} [timeZone]
 * @returns {string}
 */
const _token = (token, d, at, locale, timeZone) => {
  switch (token) {
    case "YYYY": return String(at.year);
    case "YY": return String(at.year).slice(-2);
    case "Q": return String(Math.ceil(at.month / 3));
    case "MMMM": return intl.dateTime(locale, { month: "long", timeZone }).format(d);
    case "MMM": return intl.dateTime(locale, { month: "short", timeZone }).format(d);
    case "MM": return _pad(at.month);
    case "M": return String(at.month);
    case "DD": return _pad(at.day);
    case "D": return String(at.day);
    case "Do": return require("./Num.js").ordinal(at.day, { locale });
    case "dddd": return intl.dateTime(locale, { weekday: "long", timeZone }).format(d);
    case "ddd": return intl.dateTime(locale, { weekday: "short", timeZone }).format(d);
    case "d": return String(at.weekday);
    case "HH": return _pad(at.hour);
    case "H": return String(at.hour);
    case "hh": return _pad(at.hour % 12 === 0 ? 12 : at.hour % 12);
    case "h": return String(at.hour % 12 === 0 ? 12 : at.hour % 12);
    case "mm": return _pad(at.minute);
    case "m": return String(at.minute);
    case "ss": return _pad(at.second);
    case "s": return String(at.second);
    case "SSS": return _pad(at.ms, 3);
    case "A": return at.hour < 12 ? "AM" : "PM";
    case "a": return at.hour < 12 ? "am" : "pm";
    case "Z": return _offsetText(d, timeZone, ":");
    case "ZZ": return _offsetText(d, timeZone, "");
    case "z": return intl.dateTime(locale, { timeZoneName: "short", timeZone }).formatToParts(d).find((part) => part.type === "timeZoneName")?.value ?? "";
    case "X": return String(Math.floor(d.getTime() / 1000));
    case "x": return String(d.getTime());
    case "W": return String(_isoWeek(at.year, at.month, at.day));
    case "WW": return _pad(_isoWeek(at.year, at.month, at.day));
    default: return token;
  }
};

/**
 * ISO week number of a calendar date.
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @returns {number}
 */
const _isoWeek = (year, month, day) => {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  return Math.ceil(((utc.getTime() - Date.UTC(utc.getUTCFullYear(), 0, 1)) / MS.d + 1) / 7);
};

/** @type {Array<[number, string, string]>} */
const _DURATION_UNITS = [[MS.d, "d", "day"], [MS.h, "h", "hour"], [MS.m, "m", "minute"], [MS.s, "s", "second"], [1, "ms", "millisecond"]];

/** @type {Array<[number, number, Intl.RelativeTimeFormatUnit]>} */
const _RELATIVE_SCALE = [
  [MS.m, MS.s, "second"], [MS.h, MS.m, "minute"], [MS.d, MS.h, "hour"], [MS.w, MS.d, "day"],
  [MS.d * 30, MS.w, "week"], [MS.d * 365, MS.d * 30, "month"], [Infinity, MS.d * 365, "year"],
];

/** @type {Map<string, { regex: RegExp, tokens: string[] }>} */
const _parsers = new Map();

/** @type {Record<string, string>} */
const _PARSE_TOKENS = {
  YYYY: "(\\d{4})", YY: "(\\d{2})", MM: "(\\d{2})", M: "(\\d{1,2})", DD: "(\\d{2})", D: "(\\d{1,2})", Do: "(\\d{1,2})\\D{0,4}?",
  HH: "(\\d{2})", H: "(\\d{1,2})", hh: "(\\d{2})", h: "(\\d{1,2})", mm: "(\\d{2})", m: "(\\d{1,2})", ss: "(\\d{2})", s: "(\\d{1,2})",
  SSS: "(\\d{3})", A: "([AaPp][Mm])", a: "([AaPp][Mm])", Z: "(Z|[+-]\\d{2}:\\d{2})", ZZ: "(Z|[+-]\\d{4})", X: "(-?\\d+)", x: "(-?\\d+)",
  MMMM: "([^\\d\\s,./-]+\\.?)", MMM: "([^\\d\\s,./-]+\\.?)", dddd: "[^\\d\\s,]+\\.?", ddd: "[^\\d\\s,]+\\.?",
};

/** @type {Map<string, Map<string, number>>} */
const _monthNames = new Map();

/**
 * Month names of a language, long and short, mapped to 1-12.
 * @param {string} locale
 * @returns {Map<string, number>}
 */
const _monthsOf = (locale) => {
  let names = _monthNames.get(locale);
  if (!names) {
    names = new Map();
    for (let month = 1; month <= 12; month++) {
      const sample = new Date(Date.UTC(2024, month - 1, 15));
      for (const style of /** @type {const} */ (["long", "short"])) {
        names.set(intl.dateTime(locale, { month: style, timeZone: "UTC" }).format(sample).toLowerCase().replace(/\.$/, ""), month);
      }
    }
    _monthNames.set(locale, names);
  }
  return names;
};

/**
 * Reads a date written in a known format: the opposite of `format()`, with
 * the same tokens. Parts the pattern doesn't have default to today's date
 * and to midnight.
 *
 * @example
 * time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");
 * time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });
 * time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
 * time.parse("31/02/2024", "DD/MM/YYYY"); // undefined, no such day
 *
 * @param {string} text
 * @param {string} pattern Tokens like `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, `A`, `Z`. Text in brackets must match as is.
 * @param {ParseDateOptions} [options]
 * @returns {Date | undefined} `undefined` when the text doesn't match or isn't a real date.
 */
function parse(text, pattern, options = {}) {
  let parser = _parsers.get(pattern);
  if (!parser) {
    const compiled = _compile(pattern);
    const escape = (/** @type {string} */ literal) => literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    let source = escape(compiled[0]);
    /** @type {string[]} */
    const tokens = [];
    for (let i = 1; i < compiled.length; i += 2) {
      const expression = _PARSE_TOKENS[compiled[i]];
      if (!expression) throw new TypeError(`parse() does not support the "${compiled[i]}" token`);
      if (expression.startsWith("(")) tokens.push(compiled[i]);
      source += expression + escape(compiled[i + 1]);
    }
    parser = { regex: new RegExp(`^\\s*${source}\\s*$`), tokens };
    if (_parsers.size >= 200) _parsers.clear();
    _parsers.set(pattern, parser);
  }
  const match = parser.regex.exec(String(text));
  if (!match) return undefined;

  const locale = options.locale ?? _config.locale;
  const timeZone = options.timeZone ?? _config.timeZone;
  /** @type {Record<string, number | undefined>} */
  const found = {};
  /** @type {string | undefined} */
  let meridiem;
  /** @type {number | undefined} */
  let offset;
  for (let i = 0; i < parser.tokens.length; i++) {
    const token = parser.tokens[i];
    const value = match[i + 1];
    switch (token) {
      case "YYYY": found.year = Number(value); break;
      case "YY": found.year = 2000 + Number(value); break;
      case "MM": case "M": found.month = Number(value); break;
      case "MMMM": case "MMM": {
        const month = _monthsOf(locale).get(value.toLowerCase().replace(/\.$/, ""));
        if (month === undefined) return undefined;
        found.month = month;
        break;
      }
      case "DD": case "D": case "Do": found.day = Number(value); break;
      case "HH": case "H": case "hh": case "h": found.hour = Number(value); break;
      case "mm": case "m": found.minute = Number(value); break;
      case "ss": case "s": found.second = Number(value); break;
      case "SSS": found.ms = Number(value); break;
      case "A": case "a": meridiem = value.toLowerCase(); break;
      case "Z": case "ZZ": {
        const digits = value.replace(":", "");
        offset = value === "Z" ? 0 : (digits[0] === "-" ? -1 : 1) * (Number(digits.slice(1, 3)) * 60 + Number(digits.slice(3, 5)));
        break;
      }
      case "X": return new Date(Number(value) * 1000);
      case "x": return new Date(Number(value));
    }
  }
  const today = _parts(new Date(), offset === undefined ? timeZone : "UTC");
  const year = found.year ?? today.year;
  const month = found.month ?? (found.year === undefined ? today.month : 1);
  const day = found.day ?? (found.year === undefined && found.month === undefined ? today.day : 1);
  let hour = found.hour ?? 0;
  if (meridiem !== undefined) {
    if (hour < 1 || hour > 12) return undefined;
    hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  }
  const minute = found.minute ?? 0;
  const second = found.second ?? 0;
  if (month < 1 || month > 12 || day < 1 || day > _daysIn(year, month) || hour > 23 || minute > 59 || second > 59) return undefined;
  if (offset !== undefined) return new Date(Date.UTC(year, month - 1, day, hour, minute, second, found.ms ?? 0) - offset * 60_000);
  return _instantOf(year, month, day, hour, minute, second, found.ms ?? 0, timeZone);
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
 * time.add(new Date(), "1 month");
 * time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
 *
 * @param {DateInput} date
 * @param {number | string} amount A number with `unit`, or a duration like `"1h30m"` or `"1 month"`.
 * @param {CalendarUnit} [unit="ms"]
 * @param {TimeZoneOptions} [options] The zone whose calendar months and years follow.
 * @returns {Date}
 * @throws {TypeError} If a text amount isn't a duration.
 */
function add(date, amount, unit = "ms", options = {}) {
  const d = _toDate(date);
  const timeZone = options.timeZone ?? _config.timeZone;
  if (typeof amount === "string") return _addText(d, amount, 1, timeZone);
  const u = _unit(unit) ?? "ms";
  if (u === "M") return _addMonths(d, amount, timeZone);
  if (u === "y") return _addMonths(d, amount * 12, timeZone);
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
 * @param {TimeZoneOptions} [options]
 * @returns {Date}
 * @throws {TypeError} If a text amount isn't a duration.
 */
function subtract(date, amount, unit = "ms", options = {}) {
  if (typeof amount === "string") return _addText(_toDate(date), amount, -1, options.timeZone ?? _config.timeZone);
  return add(date, -amount, unit, options);
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
 * @param {TimeZoneOptions} [options] The zone whose calendar months and years follow.
 * @returns {number}
 */
function diff(a, b, unit = "ms", options = {}) {
  const da = _toDate(a);
  const db = _toDate(b);
  const u = _unit(unit) ?? "ms";
  if (u === "M" || u === "y") {
    const timeZone = options.timeZone ?? _config.timeZone;
    const sign = da >= db ? 1 : -1;
    const [late, early] = sign > 0 ? [da, db] : [db, da];
    const x = _parts(late, timeZone);
    const y = _parts(early, timeZone);
    let months = (x.year - y.year) * 12 + x.month - y.month;
    if (_addMonths(early, months, timeZone) > late) months--;
    return sign * (u === "y" ? Math.trunc(months / 12) : months) || 0;
  }
  return (da.getTime() - db.getTime()) / MS[u];
}

/**
 * A new `Date` at the start of the day, week, month... in the global time
 * zone, or the one you name.
 *
 * @example
 * time.startOf(new Date(), "day");                              // today at 00:00
 * time.startOf(new Date(), "week");                             // Monday at 00:00
 * time.startOf(new Date(), "week", { weekStartsOn: 0 });        // Sunday at 00:00
 * time.startOf(new Date(), "day", { timeZone: "Asia/Tokyo" });  // midnight in Tokyo
 *
 * @param {DateInput} date
 * @param {StartOfUnit} unit
 * @param {WeekOptions} [options]
 * @returns {Date}
 */
function startOf(date, unit, options = {}) {
  const d = _toDate(date);
  const timeZone = options.timeZone ?? _config.timeZone;
  const wall = _startWall(_parts(d, timeZone), unit, options.weekStartsOn);
  return wall ? _instantOf(wall[0], wall[1], wall[2], wall[3], wall[4], wall[5], 0, timeZone) : d;
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
  const d = _toDate(date);
  const timeZone = options.timeZone ?? _config.timeZone;
  const wall = _startWall(_parts(d, timeZone), unit, options.weekStartsOn);
  if (!wall) return d;
  // The start of the next unit, minus one millisecond.
  const step = unit === "year" ? 0 : unit === "quarter" || unit === "month" ? 1 : unit === "week" || unit === "isoWeek" || unit === "day" ? 2 : unit === "hour" ? 3 : unit === "minute" ? 4 : 5;
  wall[step] += unit === "quarter" ? 3 : unit === "week" || unit === "isoWeek" ? 7 : 1;
  const next = new Date(Date.UTC(wall[0], wall[1] - 1, wall[2], wall[3], wall[4], wall[5]));
  return new Date(_instantOf(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), next.getUTCHours(), next.getUTCMinutes(), next.getUTCSeconds(), 0, timeZone).getTime() - 1);
}

/**
 * Are both dates in the same year, month, week, day, hour...?
 *
 * @example
 * time.isSame(a, b, "month");
 * time.isSame(a, b, "day", { timeZone: "America/New_York" });
 *
 * @param {DateInput} a
 * @param {DateInput} b
 * @param {StartOfUnit} unit
 * @param {WeekOptions} [options]
 * @returns {boolean}
 */
function isSame(a, b, unit, options = {}) {
  return startOf(a, unit, options).getTime() === startOf(b, unit, options).getTime();
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
  return _dayDelta(_toDate(date), new Date(), options.timeZone ?? _config.timeZone) === -1;
}

/**
 * Is the date tomorrow?
 *
 * @param {DateInput} date
 * @param {TimeZoneOptions} [options]
 * @returns {boolean}
 */
function isTomorrow(date, options = {}) {
  return _dayDelta(_toDate(date), new Date(), options.timeZone ?? _config.timeZone) === 1;
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
 * @param {TimeZoneOptions} [options]
 * @returns {number}
 */
function dayOfYear(date, options = {}) {
  const at = _parts(_toDate(date), options.timeZone ?? _config.timeZone);
  return Math.round((Date.UTC(at.year, at.month - 1, at.day) - Date.UTC(at.year, 0, 1)) / MS.d) + 1;
}

/**
 * ISO week number, from 1 to 53. Weeks start on Monday, and week 1 holds
 * the year's first Thursday.
 *
 * @example
 * time.weekOfYear(new Date(2021, 0, 3)); // 53, the last week of 2020
 *
 * @param {DateInput} [date] Defaults to now.
 * @param {{ utc?: boolean, timeZone?: string }} [options] `utc` reads the date in UTC, `timeZone` in another zone.
 * @returns {number}
 */
function weekOfYear(date, options = {}) {
  const at = _parts(_toDate(date), options.utc ? "UTC" : options.timeZone ?? _config.timeZone);
  return _isoWeek(at.year, at.month, at.day);
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
 * A `Date` from a Unix timestamp in seconds, as found in JWTs and many APIs.
 *
 * @example
 * time.fromUnix(1705329000); // 2024-01-15T14:30:00.000Z
 *
 * @param {number} seconds
 * @returns {Date}
 */
function fromUnix(seconds) {
  return new Date(seconds * 1000);
}

/**
 * Every date from `start` to `end`, both included, one unit apart. Handy
 * for charts, calendars and reports.
 *
 * @example
 * time.range("2024-01-01", "2024-01-07", "day");           // 7 dates
 * time.range(start, end, "month");                          // the same day each month
 * time.range(start, end, "minute", { step: 15 });           // every quarter of an hour
 *
 * @param {DateInput} start
 * @param {DateInput} end
 * @param {CalendarUnit} [unit="day"]
 * @param {DateRangeOptions} [options]
 * @returns {Date[]}
 * @throws {RangeError} If the step isn't positive, or the range would hold more than a million dates.
 */
function range(start, end, unit = "day", options = {}) {
  const from = _toDate(start);
  const to = _toDate(end).getTime();
  const step = options.step ?? 1;
  if (!(step > 0)) throw new RangeError("range() needs a positive step");
  /** @type {Date[]} */
  const out = [];
  // Each date is computed from the start, so a month-end start never drifts.
  for (let i = 0; ; i++) {
    const next = add(from, i * step, unit, options);
    if (!(next.getTime() <= to)) break;
    if (out.length >= 1_000_000) throw new RangeError("range() would return more than a million dates");
    out.push(next);
  }
  return out;
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
  const ms = shared.parseDuration(interval);
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

const _parseCron = shared.parseCron;

/**
 * @param {import("./internal/shared").CronSpec} spec
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
    const dom = spec.days.has(wall.getUTCDate()) || (spec.lastDay && wall.getUTCDate() === _daysIn(wall.getUTCFullYear(), wall.getUTCMonth() + 1));
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
 * (`*\/15`), names (`jan`, `mon-fri`), `L` for the last day of the month,
 * and `@daily`, `@hourly`, `@weekly`, `@monthly`, `@yearly`. As in classic
 * cron, when both the day and the weekday are set, either one matching is
 * enough.
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
  if (options.immediate) {
    running = true;
    runs++;
    void _run(task, options.onError).finally(() => {
      running = false;
    });
  }

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
  parse,
  toISODate,
  add,
  subtract,
  diff,
  startOf,
  endOf,
  isBefore,
  isAfter,
  isBetween,
  isSame,
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
  fromUnix,
  range,
  stopwatch,
  measure,
  every,
  nextRun,
  cron,
};
