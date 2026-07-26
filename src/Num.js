/**
 * Number & math utilities.
 *
 * Clamping, rounding, ranges, human-friendly formatting (bytes, durations,
 * ordinals, abbreviations) and safe parsing • the stuff `Math` leaves out.
 */
module.exports = {
  /**
   * Clamps a number between a minimum and maximum.
   *
   * @example
   * nodeComfort.num.clamp(15, 0, 10); // 10
   * nodeComfort.num.clamp(-3, 0, 10); // 0
   *
   * @param {number} value - Value to clamp.
   * @param {number} min - Lower bound.
   * @param {number} max - Upper bound.
   * @returns {number} The clamped value.
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Checks whether a number is within an inclusive `[min, max]` range.
   *
   * @param {number} value - Value to test.
   * @param {number} min - Lower bound.
   * @param {number} max - Upper bound.
   * @returns {boolean} True if within range.
   */
  inRange(value, min, max) {
    return value >= min && value <= max;
  },

  /**
   * Rounds a number to a given number of decimal places (avoids float artifacts).
   *
   * @example
   * nodeComfort.num.round(1.005, 2); // 1.01
   *
   * @param {number} value - Value to round.
   * @param {number} [decimals=0] - Number of decimal places.
   * @returns {number} The rounded number.
   */
  round(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  },

  /**
   * Rounds a number down to a given number of decimal places.
   *
   * @param {number} value - Value to round.
   * @param {number} [decimals=0] - Number of decimal places.
   * @returns {number} The floored number.
   */
  floor(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.floor(value * factor) / factor;
  },

  /**
   * Rounds a number up to a given number of decimal places.
   *
   * @param {number} value - Value to round.
   * @param {number} [decimals=0] - Number of decimal places.
   * @returns {number} The ceiled number.
   */
  ceil(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.ceil(value * factor) / factor;
  },

  /**
   * Linearly interpolates between `start` and `end` by ratio `t` (0..1).
   *
   * @example
   * nodeComfort.num.lerp(0, 100, 0.5); // 50
   *
   * @param {number} start - Start value.
   * @param {number} end - End value.
   * @param {number} t - Interpolation factor (usually 0..1).
   * @returns {number} The interpolated value.
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  },

  /**
   * Re-maps a number from one range to another.
   *
   * @example
   * nodeComfort.num.mapRange(5, 0, 10, 0, 100); // 50
   *
   * @param {number} value - Value to map.
   * @param {number} inMin - Input range minimum.
   * @param {number} inMax - Input range maximum.
   * @param {number} outMin - Output range minimum.
   * @param {number} outMax - Output range maximum.
   * @returns {number} The mapped value.
   */
  mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  },

  /**
   * Returns a random number (float) in `[min, max)`.
   *
   * Not cryptographically secure. For secure randomness use `nodeComfort.id`.
   *
   * @param {number} [min=0] - Lower bound (inclusive).
   * @param {number} [max=1] - Upper bound (exclusive).
   * @returns {number} A random float.
   */
  random(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Returns a random integer in `[min, max]` (both inclusive).
   *
   * @example
   * nodeComfort.num.randomInt(1, 6); // dice roll
   *
   * @param {number} min - Lower bound (inclusive).
   * @param {number} max - Upper bound (inclusive).
   * @returns {number} A random integer.
   */
  randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Sums all numbers in an array.
   *
   * @param {number[]} values - Array of numbers.
   * @returns {number} The sum (0 for an empty array).
   */
  sum(values) {
    return values.reduce((acc, n) => acc + n, 0);
  },

  /**
   * Returns the arithmetic mean (average) of an array of numbers.
   *
   * @param {number[]} values - Array of numbers.
   * @returns {number} The average (0 for an empty array).
   */
  average(values) {
    return values.length ? this.sum(values) / values.length : 0;
  },

  /**
   * Returns the median value of an array of numbers.
   *
   * @param {number[]} values - Array of numbers.
   * @returns {number} The median (0 for an empty array).
   */
  median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  /**
   * Returns the smallest number in an array.
   *
   * @param {number[]} values - Array of numbers.
   * @returns {number|undefined} The minimum, or undefined if empty.
   */
  min(values) {
    return values.length ? Math.min(...values) : undefined;
  },

  /**
   * Returns the largest number in an array.
   *
   * @param {number[]} values - Array of numbers.
   * @returns {number|undefined} The maximum, or undefined if empty.
   */
  max(values) {
    return values.length ? Math.max(...values) : undefined;
  },

  /**
   * Computes what percentage `value` is of `total`.
   *
   * @example
   * nodeComfort.num.percent(25, 200); // 12.5
   *
   * @param {number} value - Partial value.
   * @param {number} total - Total value.
   * @param {number} [decimals=2] - Decimal places to keep.
   * @returns {number} The percentage.
   */
  percent(value, total, decimals = 2) {
    if (!total) return 0;
    return this.round((value / total) * 100, decimals);
  },

  /**
   * Formats a byte count into a human-readable string (KB, MB, GB, ...).
   *
   * By default uses binary sizing (base 1024) with familiar `KB`/`MB` labels.
   * Set `binary: false` for SI sizing (base 1000), or `iec: true` for
   * strict `KiB`/`MiB` labels.
   *
   * @example
   * nodeComfort.num.formatBytes(1536);                 // "1.5 KB"
   * nodeComfort.num.formatBytes(1073741824);           // "1 GB"
   * nodeComfort.num.formatBytes(1000, { binary: false }); // "1 KB"
   * nodeComfort.num.formatBytes(1024, { iec: true });     // "1 KiB"
   *
   * @param {number} bytes - Number of bytes.
   * @param {{ decimals?: number, binary?: boolean, iec?: boolean }} [options] - Formatting options.
   * @returns {string} The human-readable size.
   */
  formatBytes(bytes, options = {}) {
    if (!Number.isFinite(bytes) || bytes === 0) return "0 B";
    const decimals = options.decimals ?? 1;
    const base = options.binary === false ? 1000 : 1024;
    const units = options.iec
      ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
      : ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const sign = bytes < 0 ? "-" : "";
    bytes = Math.abs(bytes);
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    return `${sign}${this.round(bytes / base ** i, decimals)} ${units[i]}`;
  },

  /**
   * Formats a large number with a compact suffix (K, M, B, T).
   *
   * @example
   * nodeComfort.num.abbreviate(1500);      // "1.5K"
   * nodeComfort.num.abbreviate(2_400_000); // "2.4M"
   *
   * @param {number} value - Number to abbreviate.
   * @param {number} [decimals=1] - Decimal places.
   * @returns {string} The abbreviated number.
   */
  abbreviate(value, decimals = 1) {
    const sign = value < 0 ? "-" : "";
    value = Math.abs(value);
    const units = [
      { v: 1e12, s: "T" },
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const { v, s } of units) {
      if (value >= v) return `${sign}${this.round(value / v, decimals)}${s}`;
    }
    return `${sign}${value}`;
  },

  /**
   * Inserts thousands separators into a number.
   *
   * @example
   * nodeComfort.num.thousands(1234567);        // "1,234,567"
   * nodeComfort.num.thousands(1234.5, " ");    // "1 234.5"
   *
   * @param {number} value - Number to format.
   * @param {string} [separator=","] - Thousands separator.
   * @returns {string} The formatted number.
   */
  thousands(value, separator = ",") {
    const [int, dec] = String(value).split(".");
    const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return dec ? `${withSep}.${dec}` : withSep;
  },

  /**
   * Returns the English ordinal suffix for a number ("st", "nd", "rd", "th").
   *
   * @example
   * nodeComfort.num.ordinal(1);  // "1st"
   * nodeComfort.num.ordinal(22); // "22nd"
   *
   * @param {number} value - The number.
   * @returns {string} The number with its ordinal suffix.
   */
  ordinal(value) {
    const abs = Math.abs(value) % 100;
    const suffix =
      abs >= 11 && abs <= 13
        ? "th"
        : ["th", "st", "nd", "rd"][Math.abs(value) % 10] || "th";
    return `${value}${suffix}`;
  },

  /**
   * Parses a value into a number, returning a fallback when it isn't numeric.
   *
   * @example
   * nodeComfort.num.parse("42px");        // 42
   * nodeComfort.num.parse("nope", 0);     // 0
   *
   * @param {*} value - Value to parse.
   * @param {number} [fallback=NaN] - Value returned when parsing fails.
   * @returns {number} The parsed number or the fallback.
   */
  parse(value, fallback = NaN) {
    if (typeof value === "number") return Number.isNaN(value) ? fallback : value;
    const parsed = parseFloat(String(value).replace(/[^0-9.eE+-]/g, ""));
    return Number.isNaN(parsed) ? fallback : parsed;
  },

  /**
   * Checks whether a number is even.
   * @param {number} value - Number to check.
   * @returns {boolean} True if even.
   */
  isEven(value) {
    return value % 2 === 0;
  },

  /**
   * Checks whether a number is odd.
   * @param {number} value - Number to check.
   * @returns {boolean} True if odd.
   */
  isOdd(value) {
    return Math.abs(value % 2) === 1;
  },

  /**
   * Returns an array of numbers from `start` to `end`.
   *
   * `end` is exclusive. Supports a custom step and descending ranges.
   *
   * @example
   * nodeComfort.num.range(4);          // [0, 1, 2, 3]
   * nodeComfort.num.range(1, 5);       // [1, 2, 3, 4]
   * nodeComfort.num.range(0, 10, 2);   // [0, 2, 4, 6, 8]
   * nodeComfort.num.range(5, 0);       // [5, 4, 3, 2, 1]
   *
   * @param {number} start - Start (or end if it's the only argument).
   * @param {number} [end] - End (exclusive).
   * @param {number} [step] - Step size (defaults to 1 or -1 based on direction).
   * @returns {number[]} The generated range.
   */
  range(start, end, step) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    const descending = end < start;
    step = step ?? (descending ? -1 : 1);
    if (step === 0) return [];

    const result = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) result.push(i);
    } else {
      for (let i = start; i > end; i += step) result.push(i);
    }
    return result;
  },
};
