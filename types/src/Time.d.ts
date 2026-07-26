declare namespace _exports {
    export { TimeModule };
}
declare namespace _exports {
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
    function setLocale(locale: string): TimeModule;
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
    function setTimezone(timeZone: string | undefined): TimeModule;
    /**
     * Returns the current global `{ locale, timeZone }` defaults.
     *
     * @returns {{ locale: string, timeZone: string|undefined }} A copy of the config.
     */
    function getConfig(): {
        locale: string;
        timeZone: string | undefined;
    };
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
    function parseDuration(input: string | number): number | null;
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
    function formatDuration(ms: number, options?: {
        long?: boolean;
        units?: number;
        locale?: string;
    }): string;
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
    function relative(date: Date | number | string, from?: Date | number | string, options?: {
        locale?: string;
        numeric?: "always" | "auto";
    }): string;
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
    function format(date: Date | number | string, pattern?: string, options?: {
        locale?: string;
        timeZone?: string;
    }): string;
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
    function add(date: Date | number | string, amount: number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): Date;
    /**
     * Subtracts a duration from a date and returns a new Date.
     *
     * @param {Date|number|string} date - Base date.
     * @param {number|string} amount - Amount (ms/string) or a number paired with `unit`.
     * @param {"ms"|"s"|"m"|"h"|"d"|"w"} [unit] - Unit when `amount` is a plain number.
     * @returns {Date} The resulting date.
     */
    function subtract(date: Date | number | string, amount: number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): Date;
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
    function diff(a: Date | number | string, b: Date | number | string, unit?: "ms" | "s" | "m" | "h" | "d" | "w"): number;
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
    function isSameDay(a: Date | number | string, b: Date | number | string, options?: {
        timeZone?: string;
    }): boolean;
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
    function startOf(date: Date | number | string, unit: "year" | "month" | "day" | "hour" | "minute" | "second"): Date;
    /**
     * Returns the current Unix timestamp in seconds.
     *
     * @returns {number} Seconds since the Unix epoch.
     */
    function unix(): number;
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
    function stopwatch(): {
        elapsed: () => number;
        stop: (format?: boolean) => number | string;
    };
}
export = _exports;
/**
 * The time module itself • used as the return type of the chainable setters so
 * `setLocale().setTimezone()...` stays fully typed without inlining the type.
 */
type TimeModule = typeof import("./Time");
//# sourceMappingURL=Time.d.ts.map