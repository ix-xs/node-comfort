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
export function clamp(value: number, min: number, max: number): number;
/**
 * Checks whether a number is within an inclusive `[min, max]` range.
 *
 * @param {number} value - Value to test.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {boolean} True if within range.
 */
export function inRange(value: number, min: number, max: number): boolean;
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
export function round(value: number, decimals?: number): number;
/**
 * Rounds a number down to a given number of decimal places.
 *
 * @param {number} value - Value to round.
 * @param {number} [decimals=0] - Number of decimal places.
 * @returns {number} The floored number.
 */
export function floor(value: number, decimals?: number): number;
/**
 * Rounds a number up to a given number of decimal places.
 *
 * @param {number} value - Value to round.
 * @param {number} [decimals=0] - Number of decimal places.
 * @returns {number} The ceiled number.
 */
export function ceil(value: number, decimals?: number): number;
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
export function lerp(start: number, end: number, t: number): number;
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
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
/**
 * Returns a random number (float) in `[min, max)`.
 *
 * Not cryptographically secure. For secure randomness use `nodeComfort.id`.
 *
 * @param {number} [min=0] - Lower bound (inclusive).
 * @param {number} [max=1] - Upper bound (exclusive).
 * @returns {number} A random float.
 */
export function random(min?: number, max?: number): number;
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
export function randomInt(min: number, max: number): number;
/**
 * Sums all numbers in an array.
 *
 * @param {number[]} values - Array of numbers.
 * @returns {number} The sum (0 for an empty array).
 */
export function sum(values: number[]): number;
/**
 * Returns the arithmetic mean (average) of an array of numbers.
 *
 * @param {number[]} values - Array of numbers.
 * @returns {number} The average (0 for an empty array).
 */
export function average(values: number[]): number;
/**
 * Returns the median value of an array of numbers.
 *
 * @param {number[]} values - Array of numbers.
 * @returns {number} The median (0 for an empty array).
 */
export function median(values: number[]): number;
/**
 * Returns the smallest number in an array.
 *
 * @param {number[]} values - Array of numbers.
 * @returns {number|undefined} The minimum, or undefined if empty.
 */
export function min(values: number[]): number | undefined;
/**
 * Returns the largest number in an array.
 *
 * @param {number[]} values - Array of numbers.
 * @returns {number|undefined} The maximum, or undefined if empty.
 */
export function max(values: number[]): number | undefined;
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
export function percent(value: number, total: number, decimals?: number): number;
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
export function formatBytes(bytes: number, options?: {
    decimals?: number;
    binary?: boolean;
    iec?: boolean;
}): string;
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
export function abbreviate(value: number, decimals?: number): string;
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
export function thousands(value: number, separator?: string): string;
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
export function ordinal(value: number): string;
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
export function parse(value: any, fallback?: number): number;
/**
 * Checks whether a number is even.
 * @param {number} value - Number to check.
 * @returns {boolean} True if even.
 */
export function isEven(value: number): boolean;
/**
 * Checks whether a number is odd.
 * @param {number} value - Number to check.
 * @returns {boolean} True if odd.
 */
export function isOdd(value: number): boolean;
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
export function range(start: number, end?: number, step?: number): number[];
//# sourceMappingURL=Num.d.ts.map