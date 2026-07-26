/**
 * Date & time utilities.
 *
 * Parsing durations, human-friendly relative time ("3 hours ago"), duration
 * formatting, add/diff arithmetic and a tiny date formatter • with no
 * dependency on heavyweight date libraries.
 *
 * ### Internationalization & time zones
 *
 * `relative`, `formatDuration` and `format` are locale-aware and use the
 * platform's built-in `Intl` (full ICU ships with Node), so **every language
 * is supported out of the box** • no locale files, no dependencies.
 *
 * The default locale is `"en"` (for deterministic output). Change it globally
 * with {@link module:Time.setLocale}, or per call via an `options.locale`. A
 * time zone can be set globally with {@link module:Time.setTimezone} or passed
 * per call via `options.timeZone` (IANA name, e.g. `"Europe/Paris"`).
 *
 * @example
 * nodeComfort.time.setLocale("fr").setTimezone("Europe/Paris");
 * nodeComfort.time.relative(Date.now() - 3600e3);        // "il y a 1 heure"
 * nodeComfort.time.format(Date.now(), "dddd D MMMM YYYY"); // "lundi 15 janvier 2024"
 */

/**
 * The time module itself • used as the return type of the chainable setters so
 * `setLocale().setTimezone()...` stays fully typed without inlining the type.
 * @typedef {typeof import("./Time")} TimeModule
 */

const MS = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

const UNIT_ALIASES = {
  ms: "ms", milli: "ms", millisecond: "ms", milliseconds: "ms",
  s: "s", sec: "s", secs: "s", second: "s", seconds: "s",
  m: "m", min: "m", mins: "m", minute: "m", minutes: "m",
  h: "h", hr: "h", hrs: "h", hour: "h", hours: "h",
  d: "d", day: "d", days: "d",
  w: "w", week: "w", weeks: "w",
};

/**
 * Global defaults for locale-aware formatting. `locale` defaults to `"en"` so
 * output is deterministic regardless of the host machine; `timeZone`
 * `undefined` means the system local zone.
 * @private
 * @type {{ locale: string, timeZone: string|undefined }}
 */
const _config = { locale: "en", timeZone: undefined };

/**
 * Coerces a value into a Date.
 * @private
 * @param {Date|number|string} [value]
 * @returns {Date}
 */
const _toDate = (value) => (value instanceof Date ? new Date(value.getTime()) : value === undefined ? new Date() : new Date(value));

const _pad = (n, len = 2) => String(Math.abs(n)).padStart(len, "0");

/**
 * Extracts numeric calendar parts of a date, optionally in a target time zone.
 * When no zone is given, the host's local time is used (fast path).
 * @private
 * @param {Date} d - Date to read.
 * @param {string} [timeZone] - IANA time-zone name.
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number }}
 */
const _numericParts = (d, timeZone) => {
  if (!timeZone) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      ms: d.getMilliseconds(),
    };
  }
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = {};
  for (const p of dtf.formatToParts(d)) parts[p.type] = p.value;
  return {
    year: +parts.year,
    month: +parts.month,
    day: +parts.day,
    hour: +parts.hour,
    minute: +parts.minute,
    second: +parts.second,
    ms: d.getMilliseconds(),
  };
};

/**
 * Formats a single localized component (month/weekday name) via `Intl`.
 * @private
 * @param {Date} d - Date to format.
 * @param {Intl.DateTimeFormatOptions} opt - Component options.
 * @param {string} locale - BCP-47 locale.
 * @param {string} [timeZone] - IANA time-zone name.
 * @returns {string}
 */
const _named = (d, opt, locale, timeZone) =>
  new Intl.DateTimeFormat(locale, { ...opt, timeZone }).format(d);

module.exports = {
  /**
   * Sets the global default locale used by `relative`, `formatDuration` and
   * `format` (named tokens). Chainable.
   *
   * @example
   * nodeComfort.time.setLocale("fr");
   *
   * @param {string} locale - A BCP-47 locale tag (e.g. `"fr"`, `"en-GB"`, `"ja"`).
   * @returns {TimeModule} The time module (for chaining).
   */
  setLocale(locale) {
    _config.locale = locale;
    return this;
  },

  /**
   * Sets the global default time zone used by `format` and `isSameDay`.
   * Chainable. Pass `undefined` to fall back to the system local zone.
   *
   * @example
   * nodeComfort.time.setTimezone("Europe/Paris");
   *
   * @param {string|undefined} timeZone - An IANA time-zone name (e.g. `"America/New_York"`).
   * @returns {TimeModule} The time module (for chaining).
   */
  setTimezone(timeZone) {
    _config.timeZone = timeZone;
    return this;
  },

  /**
   * Returns the current global `{ locale, timeZone }` defaults.
   *
   * @returns {{ locale: string, timeZone: string|undefined }} A copy of the config.
   */
  getConfig() {
    return { ..._config };
  },

  /**
   * Parses a human duration string into milliseconds.
   *
   * Accepts things like `"1h"`, `"30m"`, `"1h30m"`, `"2 days"`, `"500ms"`.
   * A plain number is treated as milliseconds.
   *
   * @example
   * nodeComfort.time.parseDuration("1h30m"); // 5400000
   * nodeComfort.time.parseDuration("2 days"); // 172800000
   *
   * @param {string|number} input - Duration string or millisecond count.
   * @returns {number|null} Milliseconds, or null if it can't be parsed.
   */
  parseDuration(input) {
    if (typeof input === "number") return input;
    if (typeof input !== "string") return null;

    const regex = /(-?\d*\.?\d+)\s*([a-z]+)/gi;
    let total = 0;
    let matched = false;
    let match;
    while ((match = regex.exec(input)) !== null) {
      const value = parseFloat(match[1]);
      const unit = UNIT_ALIASES[match[2].toLowerCase()];
      if (!unit) return null;
      total += value * MS[unit];
      matched = true;
    }
    return matched ? total : null;
  },

  /**
   * Formats a millisecond duration into a human string.
   *
   * The compact form (default) is language-neutral (`"1h 30m"`). The `long`
   * form is fully localized through `Intl` • pass `options.locale` or set a
   * global locale with {@link module:Time.setLocale}.
   *
   * @example
   * nodeComfort.time.formatDuration(5400000);                       // "1h 30m"
   * nodeComfort.time.formatDuration(90000, { long: true });         // "1 minute 30 seconds"
   * nodeComfort.time.formatDuration(90000, { long: true, locale: "fr" }); // "1 minute 30 secondes"
   *
   * @param {number} ms - Duration in milliseconds.
   * @param {{ long?: boolean, units?: number, locale?: string }} [options] - Formatting options (`units` caps how many parts show).
   * @returns {string} The formatted duration.
   */
  formatDuration(ms, options = {}) {
    const long = options.long ?? false;
    const maxUnits = options.units ?? Infinity;
    const locale = options.locale ?? _config.locale;
    if (!Number.isFinite(ms)) return String(ms);
    const sign = ms < 0 ? "-" : "";
    ms = Math.abs(Math.trunc(ms));

    const parts = [
      { v: Math.floor(ms / MS.d), short: "d", unit: "day" },
      { v: Math.floor((ms % MS.d) / MS.h), short: "h", unit: "hour" },
      { v: Math.floor((ms % MS.h) / MS.m), short: "m", unit: "minute" },
      { v: Math.floor((ms % MS.m) / MS.s), short: "s", unit: "second" },
      { v: ms % MS.s, short: "ms", unit: "millisecond" },
    ].filter((p) => p.v > 0);

    if (!parts.length) {
      return long
        ? new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "long" }).format(0)
        : "0s";
    }

    return sign + parts
      .slice(0, maxUnits)
      .map((p) =>
        long
          ? new Intl.NumberFormat(locale, { style: "unit", unit: p.unit, unitDisplay: "long" }).format(p.v)
          : `${p.v}${p.short}`,
      )
      .join(" ");
  },

  /**
   * Returns a human-friendly, localized relative time string.
   *
   * Built on `Intl.RelativeTimeFormat`, so it speaks every language. Set
   * `options.locale` (or a global locale) to translate; `options.numeric`
   * controls wording (`"always"` → "1 day ago", `"auto"` → "yesterday").
   *
   * @example
   * nodeComfort.time.relative(Date.now() - 3600e3);                 // "1 hour ago"
   * nodeComfort.time.relative(Date.now() - 3600e3, undefined, { locale: "fr" }); // "il y a 1 heure"
   * nodeComfort.time.relative(Date.now() - 86400e3, undefined, { numeric: "auto" }); // "yesterday"
   *
   * @param {Date|number|string} date - Target date.
   * @param {Date|number|string} [from] - Reference date (defaults to now).
   * @param {{ locale?: string, numeric?: "always"|"auto" }} [options] - Formatting options.
   * @returns {string} The relative time string.
   */
  relative(date, from, options = {}) {
    const locale = options.locale ?? _config.locale;
    const numeric = options.numeric ?? "always";
    const target = _toDate(date).getTime();
    const base = _toDate(from).getTime();
    const diff = target - base;
    const abs = Math.abs(diff);

    if (abs < MS.s) {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
    }

    const units = [
      { limit: MS.m, div: MS.s, name: "second" },
      { limit: MS.h, div: MS.m, name: "minute" },
      { limit: MS.d, div: MS.h, name: "hour" },
      { limit: MS.w, div: MS.d, name: "day" },
      { limit: MS.d * 30, div: MS.w, name: "week" },
      { limit: MS.d * 365, div: MS.d * 30, name: "month" },
      { limit: Infinity, div: MS.d * 365, name: "year" },
    ];

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric });
    for (const unit of units) {
      if (abs < unit.limit) {
        const value = Math.floor(abs / unit.div);
        return rtf.format(diff < 0 ? -value : value, /** @type {Intl.RelativeTimeFormatUnit} */ (unit.name));
      }
    }
    return rtf.format(0, "second");
  },

  /**
   * Formats a date using a small token syntax, with optional locale & time zone.
   *
   * **Numeric tokens:** `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` (24h) `hh` `h`
   * (12h) `mm` `m` `ss` `s` `SSS`.
   * **Localized tokens:** `MMMM` (month name) `MMM` (short month) `dddd` (weekday)
   * `ddd` (short weekday) `A` (AM/PM) `a` (am/pm).
   *
   * Wrap literal text in square brackets to keep it verbatim: `"[Today is] dddd"`.
   *
   * @example
   * nodeComfort.time.format(new Date(), "YYYY-MM-DD HH:mm:ss");
   * nodeComfort.time.format(Date.now(), "dddd D MMMM YYYY", { locale: "fr" });
   * nodeComfort.time.format(Date.now(), "HH:mm", { timeZone: "Asia/Tokyo" });
   *
   * @param {Date|number|string} date - Date to format.
   * @param {string} [pattern="YYYY-MM-DD HH:mm:ss"] - Format pattern.
   * @param {{ locale?: string, timeZone?: string }} [options] - Locale / time-zone overrides.
   * @returns {string} The formatted date.
   */
  format(date, pattern = "YYYY-MM-DD HH:mm:ss", options = {}) {
    const d = _toDate(date);
    if (Number.isNaN(d.getTime())) return "Invalid Date";

    const locale = options.locale ?? _config.locale;
    const timeZone = options.timeZone ?? _config.timeZone;
    const p = _numericParts(d, timeZone);

    const replacer = (token, escaped) => {
      if (escaped !== undefined) return escaped;
      switch (token) {
        case "YYYY": return String(p.year);
        case "YY": return String(p.year).slice(-2);
        case "MMMM": return _named(d, { month: "long" }, locale, timeZone);
        case "MMM": return _named(d, { month: "short" }, locale, timeZone);
        case "MM": return _pad(p.month);
        case "M": return String(p.month);
        case "DD": return _pad(p.day);
        case "D": return String(p.day);
        case "dddd": return _named(d, { weekday: "long" }, locale, timeZone);
        case "ddd": return _named(d, { weekday: "short" }, locale, timeZone);
        case "HH": return _pad(p.hour);
        case "H": return String(p.hour);
        case "hh": return _pad(p.hour % 12 === 0 ? 12 : p.hour % 12);
        case "h": return String(p.hour % 12 === 0 ? 12 : p.hour % 12);
        case "mm": return _pad(p.minute);
        case "m": return String(p.minute);
        case "ss": return _pad(p.second);
        case "s": return String(p.second);
        case "SSS": return _pad(p.ms, 3);
        case "A": return p.hour < 12 ? "AM" : "PM";
        case "a": return p.hour < 12 ? "am" : "pm";
        default: return token;
      }
    };

    return pattern.replace(
      /\[([^\]]*)\]|YYYY|MMMM|dddd|SSS|MMM|ddd|YY|MM|DD|HH|hh|mm|ss|M|D|H|h|m|s|A|a/g,
      replacer,
    );
  },

  /**
   * Adds a duration to a date and returns a new Date.
   *
   * The duration may be a millisecond number or a string like `"1h30m"`.
   *
   * @example
   * nodeComfort.time.add(new Date(), "2h");
   * nodeComfort.time.add(new Date(), -1, "days");
   *
   * @param {Date|number|string} date - Base date.
   * @param {number|string} amount - Amount (ms/string) or a number paired with `unit`.
   * @param {"ms"|"s"|"m"|"h"|"d"|"w"} [unit] - Unit when `amount` is a plain number.
   * @returns {Date} The resulting date.
   */
  add(date, amount, unit) {
    const d = _toDate(date);
    let ms;
    if (typeof amount === "number") {
      ms = unit ? amount * (MS[UNIT_ALIASES[unit] ?? unit] ?? 1) : amount;
    } else {
      ms = this.parseDuration(amount) ?? 0;
    }
    return new Date(d.getTime() + ms);
  },

  /**
   * Subtracts a duration from a date and returns a new Date.
   *
   * @param {Date|number|string} date - Base date.
   * @param {number|string} amount - Amount (ms/string) or a number paired with `unit`.
   * @param {"ms"|"s"|"m"|"h"|"d"|"w"} [unit] - Unit when `amount` is a plain number.
   * @returns {Date} The resulting date.
   */
  subtract(date, amount, unit) {
    if (typeof amount === "number") return this.add(date, -amount, unit);
    const ms = this.parseDuration(amount) ?? 0;
    return this.add(date, -ms);
  },

  /**
   * Returns the difference between two dates in the requested unit.
   *
   * @example
   * nodeComfort.time.diff("2024-01-02", "2024-01-01", "d"); // 1
   *
   * @param {Date|number|string} a - First date.
   * @param {Date|number|string} b - Second date.
   * @param {"ms"|"s"|"m"|"h"|"d"|"w"} [unit="ms"] - Result unit.
   * @returns {number} The signed difference (`a - b`) in the given unit.
   */
  diff(a, b, unit = "ms") {
    const ms = _toDate(a).getTime() - _toDate(b).getTime();
    return ms / (MS[UNIT_ALIASES[unit] ?? unit] ?? 1);
  },

  /**
   * Checks whether two dates fall on the same calendar day.
   *
   * Uses local time by default; pass `options.timeZone` (or set a global zone)
   * to compare calendar days in a specific zone.
   *
   * @param {Date|number|string} a - First date.
   * @param {Date|number|string} b - Second date.
   * @param {{ timeZone?: string }} [options] - Time-zone override.
   * @returns {boolean} True if both are the same day.
   */
  isSameDay(a, b, options = {}) {
    const timeZone = options.timeZone ?? _config.timeZone;
    const pa = _numericParts(_toDate(a), timeZone);
    const pb = _numericParts(_toDate(b), timeZone);
    return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
  },

  /**
   * Returns a new Date at the start of the given unit (day/hour/etc).
   *
   * @example
   * nodeComfort.time.startOf(new Date(), "day"); // midnight today
   *
   * @param {Date|number|string} date - Base date.
   * @param {"year"|"month"|"day"|"hour"|"minute"|"second"} unit - Unit to reset to.
   * @returns {Date} The start-of-unit date.
   */
  startOf(date, unit) {
    const d = _toDate(date);
    switch (unit) {
      case "year": d.setMonth(0);
      // falls through
      case "month": d.setDate(1);
      // falls through
      case "day": d.setHours(0);
      // falls through
      case "hour": d.setMinutes(0);
      // falls through
      case "minute": d.setSeconds(0);
      // falls through
      case "second": d.setMilliseconds(0);
    }
    return d;
  },

  /**
   * Returns the current Unix timestamp in seconds.
   *
   * @returns {number} Seconds since the Unix epoch.
   */
  unix() {
    return Math.floor(Date.now() / 1000);
  },

  /**
   * Returns a high-resolution stopwatch you can `.stop()` to get elapsed ms.
   *
   * @example
   * const timer = nodeComfort.time.stopwatch();
   * doWork();
   * console.log(timer.stop());          // e.g. 12.34 (ms, sub-ms precise)
   * console.log(timer.stop(true));      // "12.34ms"
   *
   * @returns {{ elapsed: () => number, stop: (format?: boolean) => number|string }} A stopwatch handle.
   */
  stopwatch() {
    const start = process.hrtime.bigint();
    const elapsed = () => Number(process.hrtime.bigint() - start) / 1e6;
    return {
      elapsed,
      stop: (format = false) => {
        const ms = elapsed();
        return format ? `${Math.round(ms * 100) / 100}ms` : ms;
      },
    };
  },
};
