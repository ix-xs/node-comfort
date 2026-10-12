---
title: "nc.time"
description: "Dates and durations: formatting, relative time, calendar math, time zones and scheduling, in any language `Intl` knows. The default language is English so results are the same on every machine; change it with `setLocale()` or per call with `{ locale }`. Time zones work the same way with `setTimezone()` or `{ timeZone }`."
sidebar:
  label: "time"
  order: 11
---

```js
const { time } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const time = require("@ix-xs/node-comfort/time");
```

This page lists everything `nc.time` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/time/).

```js
time.setLocale("fr").setTimezone("Europe/Paris");
time.relative(Date.now() - 3600e3);        // "il y a 1 heure"
time.format(new Date(), "dddd D MMMM YYYY"); // "lundi 15 janvier 2024"
time.cron("0 9 * * 1-5", sendReport);        // weekdays at 9:00
```

## setLocale

```ts
setLocale(locale: string): typeof nc.time
```

Sets the default language for `relative`, `calendar`, `formatDuration`
and `format`.

| Parameter | Type | Description |
| --- | --- | --- |
| `locale` | `string` | Like `"fr"`, `"en-GB"`, `"pt-BR"` or `"ja"`. |

**Returns** `typeof import("./``Time``")`: The module, so calls chain.

```js
time.setLocale("fr");
time.relative(Date.now() - 60e3); // "il y a 1 minute"
```

## setTimezone

```ts
setTimezone(timeZone: string | undefined): typeof nc.time
```

Sets the default time zone for `format`, `calendar`, `isSameDay`,
`cron`... Pass `undefined` to go back to the system zone.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeZone` | `string \| undefined` | Like `"America/New_York"`. |

**Returns** `typeof import("./``Time``")`: The module, so calls chain.

**Throws** `RangeError`: If the zone doesn't exist.

```js
time.setTimezone("Europe/Paris");
```

## getConfig

```ts
getConfig(): { locale: string; timeZone: string | undefined; }
```

The current defaults.

```js
time.getConfig(); // { locale: "en", timeZone: undefined }
```

## timezones

```ts
timezones(): string[]
```

Every time zone Node knows, sorted.

```js
time.timezones().includes("Europe/Paris"); // true
```

## offset

```ts
offset(timeZone?: string, date?: DateInput): number
```

A zone's UTC offset at a given date, in minutes. Daylight saving included.

| Parameter | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Defaults to the global zone, then the system's. |
| `date?` | [`DateInput`](#dateinput) | Defaults to now. |

```js
time.offset("Europe/Paris", "2024-07-01"); // 120
time.offset("Europe/Paris", "2024-01-01"); // 60
```

## parseDuration

```ts
parseDuration(input: string | number): number | null
```

Turns a duration into milliseconds. Understands `"1h30m"`, `"2 days"`,
`"500ms"`, clock times like `"01:30:00"`, ISO durations like `"PT1H30M"`,
and plain numbers. Months and years are refused because their length
varies; use `add()` for those.

**Returns** `number | null`: `null` when it isn't a duration.

```js
time.parseDuration("1h30m");    // 5400000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("banana");   // null
```

## formatDuration

```ts
formatDuration(duration: string | number, options?: FormatDurationOptions): string
```

Writes a duration for humans.

| Parameter | Type | Description |
| --- | --- | --- |
| `duration` | `number \| string` | Milliseconds, or text like `"90m"`. |
| `options?` | [`FormatDurationOptions`](#formatdurationoptions) |  |

```js
time.formatDuration(5_400_000);                               // "1h 30m"
time.formatDuration(90_000, { long: true });                  // "1 minute 30 seconds"
time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
time.formatDuration("90m");                                   // "1h 30m"
```

## relative

```ts
relative(date: DateInput, from?: DateInput, options?: RelativeOptions): string
```

Describes a date relative to now: `"3 hours ago"`, `"in 2 days"`, in
any language.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `from?` | [`DateInput`](#dateinput) | Compare with this date instead of now. |
| `options?` | [`RelativeOptions`](#relativeoptions) |  |

```js
time.relative(Date.now() - 3_600_000);                                  // "1 hour ago"
time.relative(Date.now() - 86_400_000, undefined, { numeric: "auto" }); // "yesterday"
time.relative(Date.now() - 3_600_000, undefined, { locale: "fr" });     // "il y a 1 heure"
```

## calendar

```ts
calendar(date: DateInput, options?: CalendarOptions): string
```

Describes a date like a chat app does: `"Today at 2:30 PM"`,
`"Yesterday at 9:05 AM"`, a weekday for the coming days, and the full date
beyond that.

```js
time.calendar(new Date());                     // "Today at 2:30 PM"
time.calendar(yesterday, { locale: "fr" });    // "Hier à 09:05"
```

## format

```ts
format(date: DateInput, pattern?: string, options?: FormatDateOptions): string
```

Formats a date with tokens, in any language and time zone.

| Token | Output | | Token | Output |
| --- | --- | --- | --- | --- |
| `YYYY` / `YY` | 2024 / 24 | | `HH` / `H` | 09 / 9 (24h) |
| `Q` | quarter, 1-4 | | `hh` / `h` | 09 / 9 (12h) |
| `MMMM` / `MMM` | January / Jan | | `mm` / `m` | 05 / 5 |
| `MM` / `M` | 01 / 1 | | `ss` / `s` | 07 / 7 |
| `DD` / `D` | 05 / 5 | | `SSS` | 042 (ms) |
| `dddd` / `ddd` | Monday / Mon | | `A` / `a` | PM / pm |
| `d` | weekday, 0 is Sunday | | `Z` / `ZZ` | +02:00 / +0200 |
| `W` / `WW` | ISO week | | `X` / `x` | Unix seconds / ms |
| `Do` | 5th | | `z` | zone name, like EST or GMT+1 |

Text in brackets stays as is: `"[Today is] dddd"`.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `pattern?` | `string` | Defaults to `"YYYY-MM-DD HH:mm:ss"`. |
| `options?` | [`FormatDateOptions`](#formatdateoptions) |  |

**Returns** `string`: Or `"Invalid Date"`.

```js
time.format(new Date(), "YYYY-MM-DD HH:mm:ss");                  // "2024-01-15 14:30:05"
time.format(Date.now(), "dddd D MMMM YYYY", { locale: "fr" });    // "lundi 15 janvier 2024"
time.format(Date.now(), "HH:mm Z", { timeZone: "Asia/Tokyo" });   // "22:30 +09:00"
```

## parse

```ts
parse(text: string, pattern: string, options?: ParseDateOptions): Date | undefined
```

Reads a date written in a known format: the opposite of `format()`, with
the same tokens. Parts the pattern doesn't have default to today's date
and to midnight.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `pattern` | `string` | Tokens like `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, `A`, `Z`. Text in brackets must match as is. |
| `options?` | [`ParseDateOptions`](#parsedateoptions) |  |

**Returns** `Date`` | undefined`: `undefined` when the text doesn't match or isn't a real date.

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
time.parse("31/02/2024", "DD/MM/YYYY"); // undefined, no such day
```

## toISODate

```ts
toISODate(date?: DateInput, options?: TimeZoneOptions): string
```

The date as `YYYY-MM-DD`, the format `<input type="date">` and most APIs
expect.

| Parameter | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Defaults to now. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

```js
time.toISODate(new Date(2024, 0, 5)); // "2024-01-05"
```

## add

```ts
add(date: DateInput, amount: string | number, unit?: CalendarUnit, options?: TimeZoneOptions): Date
```

Adds time to a date and returns a new `Date`. Whole days, weeks, months
and years follow the calendar: one day later is the same time tomorrow,
even when the clocks change in between, and January 31 plus one month is
the end of February. Hours and smaller units are exact.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `amount` | `number \| string` | A number with `unit`, or a duration like `"1h30m"` or `"1 month"`. |
| `unit?` | [`CalendarUnit`](#calendarunit) | Defaults to `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) | The zone whose calendar is followed. |

**Throws** `TypeError`: If a text amount isn't a duration, or the unit isn't one.

```js
time.add(new Date(), "2h30m");
time.add(new Date(), 3, "days");
time.add(new Date(), "1 month");
time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
```

## subtract

```ts
subtract(date: DateInput, amount: string | number, unit?: CalendarUnit, options?: TimeZoneOptions): Date
```

Subtracts time from a date and returns a new `Date`.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `amount` | `number \| string` |  |
| `unit?` | [`CalendarUnit`](#calendarunit) | Defaults to `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

**Throws** `TypeError`: If a text amount isn't a duration.

```js
time.subtract(new Date(), 7, "days");
time.subtract(new Date(), "90m");
```

## diff

```ts
diff(a: DateInput, b: DateInput, unit?: CalendarUnit, options?: TimeZoneOptions): number
```

`a - b` in a unit. Fixed units can give fractions; months and years are
whole calendar months and years.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | [`DateInput`](#dateinput) |  |
| `b` | [`DateInput`](#dateinput) |  |
| `unit?` | [`CalendarUnit`](#calendarunit) | Defaults to `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) | The zone whose calendar months and years follow. |

**Throws** `TypeError`: If the unit isn't one.

```js
time.diff("2024-01-03", "2024-01-01", "days");   // 2
time.diff("2024-03-15", "2024-01-20", "months"); // 1
```

## startOf

```ts
startOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

A new `Date` at the start of the day, week, month... in the global time
zone, or the one you name.

```js
time.startOf(new Date(), "day");                              // today at 00:00
time.startOf(new Date(), "week");                             // Monday at 00:00
time.startOf(new Date(), "week", { weekStartsOn: 0 });        // Sunday at 00:00
time.startOf(new Date(), "day", { timeZone: "Asia/Tokyo" });  // midnight in Tokyo
```

## endOf

```ts
endOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

A new `Date` at the last millisecond of the day, week, month...

```js
time.endOf(new Date(), "month"); // last day of the month, 23:59:59.999
```

## isBefore

```ts
isBefore(a: DateInput, b: DateInput): boolean
```

Is `a` before `b`?

## isAfter

```ts
isAfter(a: DateInput, b: DateInput): boolean
```

Is `a` after `b`?

```js
if (time.isAfter(expiresAt, Date.now())) grantAccess();
```

## isBetween

```ts
isBetween(date: DateInput, start: DateInput, end: DateInput): boolean
```

Is the date between `start` and `end`, both included?

## isSame

```ts
isSame(a: DateInput, b: DateInput, unit: StartOfUnit, options?: WeekOptions): boolean
```

Are both dates in the same year, month, week, day, hour...?

```js
time.isSame(a, b, "month");
time.isSame(a, b, "day", { timeZone: "America/New_York" });
```

## isSameDay

```ts
isSameDay(a: DateInput, b: DateInput, options?: TimeZoneOptions): boolean
```

Are both dates on the same calendar day?

```js
time.isSameDay(a, b);                            // local time
time.isSameDay(a, b, { timeZone: "Asia/Tokyo" }); // as seen in Tokyo
```

## isToday

```ts
isToday(date: DateInput, options?: TimeZoneOptions): boolean
```

Is the date today?

## isYesterday

```ts
isYesterday(date: DateInput, options?: TimeZoneOptions): boolean
```

Was the date yesterday?

## isTomorrow

```ts
isTomorrow(date: DateInput, options?: TimeZoneOptions): boolean
```

Is the date tomorrow?

## isWeekend

```ts
isWeekend(date: DateInput, options?: TimeZoneOptions): boolean
```

Is it a Saturday or a Sunday?

## isLeapYear

```ts
isLeapYear(yearOrDate: DateInput): boolean
```

Is it a leap year?

| Parameter | Type | Description |
| --- | --- | --- |
| `yearOrDate` | `number \| `[`DateInput`](#dateinput) | A year (1000 to 9999) or a date. |

```js
time.isLeapYear(2024); // true
time.isLeapYear(1900); // false
```

## isValid

```ts
isValid(value: unknown): boolean
```

Is it a real date, or something that parses to one?

```js
time.isValid("2024-02-29"); // true
time.isValid("2024-02-30"); // false
```

## daysInMonth

```ts
daysInMonth(dateOrYear: DateInput, month?: number): number
```

Number of days in a month.

| Parameter | Type | Description |
| --- | --- | --- |
| `dateOrYear` | [`DateInput`](#dateinput)` \| number` | A date, or a year when you pass `month`. |
| `month?` | `number` | 1 to 12. |

```js
time.daysInMonth(new Date(2024, 1)); // 29
time.daysInMonth(2023, 2);           // 28
```

## dayOfYear

```ts
dayOfYear(date?: DateInput, options?: TimeZoneOptions): number
```

Day of the year, from 1 to 366.

| Parameter | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Defaults to now. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

## weekOfYear

```ts
weekOfYear(date?: DateInput, options?: { utc?: boolean; timeZone?: string; } | undefined): number
```

ISO week number, from 1 to 53. Weeks start on Monday, and week 1 holds
the year's first Thursday.

| Parameter | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Defaults to now. |
| `options?` | `{ utc?: boolean, timeZone?: string }` | `utc` reads the date in UTC, `timeZone` in another zone. |

```js
time.weekOfYear(new Date(2021, 0, 3)); // 53, the last week of 2020
```

## min

```ts
min(dates: Iterable<DateInput>): Date | undefined
```

The earliest date.

## max

```ts
max(dates: Iterable<DateInput>): Date | undefined
```

The latest date.

## unix

```ts
unix(): number
```

The current Unix timestamp, in seconds.

## fromUnix

```ts
fromUnix(seconds: number): Date
```

A `Date` from a Unix timestamp in seconds, as found in JWTs and many APIs.

```js
time.fromUnix(1705329000); // 2024-01-15T14:30:00.000Z
```

## range

```ts
range(start: DateInput, end: DateInput, unit?: CalendarUnit, options?: DateRangeOptions): Date[]
```

Every date from `start` to `end`, both included, one unit apart. Handy
for charts, calendars and reports.

| Parameter | Type | Description |
| --- | --- | --- |
| `start` | [`DateInput`](#dateinput) |  |
| `end` | [`DateInput`](#dateinput) |  |
| `unit?` | [`CalendarUnit`](#calendarunit) | Defaults to `"day"`. |
| `options?` | [`DateRangeOptions`](#daterangeoptions) |  |

**Throws** `RangeError`: If the step isn't positive, or the range would hold more than a million dates.

```js
time.range("2024-01-01", "2024-01-07", "day");           // 7 dates
time.range(start, end, "month");                          // the same day each month
time.range(start, end, "minute", { step: 15 });           // every quarter of an hour
```

## stopwatch

```ts
stopwatch(): Stopwatch
```

Starts a precise stopwatch.

```js
const sw = time.stopwatch();
await loadConfig(); sw.lap("config");
await connectDb();  sw.lap("db");
console.log(sw.stop(true)); // "182.4ms"
```

## measure

```ts
measure<T>(fn: () => T): Promise<{ result: Awaited<T>; duration: number; }>
```

Runs a function, sync or async, and tells you how long it took.

**Returns** `Promise``<{ result: ``Awaited``<``T``>, duration: number }>`: `duration` is in milliseconds.

```js
const { result, duration } = await time.measure(() => db.query(sql));
nc.info(`Query took ${duration.toFixed(1)}ms`);
```

## every

```ts
every(interval: string | number, task: () => unknown, options?: EveryOptions): ScheduledTask
```

Runs a task at a regular interval. Unlike `setInterval`, a slow run
delays the next one instead of piling up, timing doesn't drift, and
errors are caught.

| Parameter | Type | Description |
| --- | --- | --- |
| `interval` | `number \| string` | In ms, or a duration like `"30s"`. |
| `task` | `() => unknown` | Can be async. |
| `options?` | [`EveryOptions`](#everyoptions) |  |

**Throws** `RangeError`: If the interval isn't a positive duration.

```js
const job = time.every("5m", syncInventory, { immediate: true, onError: nc.error });
job.next(); // when it runs next
job.stop();
```

## nextRun

```ts
nextRun(expression: string, options?: CronOptions): Date | undefined
```

The next date matching a cron expression, without scheduling anything.

Expressions have 5 fields (`minute hour day month weekday`), or 6 with
seconds first. You can use `*`, lists (`1,15`), ranges (`1-5`), steps
(`*\/15`), names (`jan`, `mon-fri`), `L` for the last day of the month,
and `@daily`, `@hourly`, `@weekly`, `@monthly`, `@yearly`. As in classic
cron, when both the day and the weekday are set, either one matching is
enough.

**Returns** `Date`` | undefined`: `undefined` if nothing matches within 8 years.

**Throws** `SyntaxError`: If the expression is invalid.

```js
time.nextRun("0 9 * * mon-fri");                              // next weekday at 09:00
time.nextRun("0 0 1 * *", { timeZone: "America/New_York" });  // next 1st of the month
```

## cron

```ts
cron(expression: string, task: () => unknown, options?: CronOptions): ScheduledTask
```

Runs a task on a cron schedule, in any time zone. Daylight-saving changes
are handled: a skipped time is skipped, a repeated one runs once. See
`nextRun()` for the syntax.

| Parameter | Type | Description |
| --- | --- | --- |
| `expression` | `string` |  |
| `task` | `() => unknown` | Can be async. |
| `options?` | [`CronOptions`](#cronoptions) |  |

**Throws** `SyntaxError`: If the expression is invalid.

```js
const job = time.cron("0 9 * * 1-5", sendDailyReport, { timeZone: "Europe/Paris" });
time.cron("*\/15 * * * *", refreshCache, { onError: nc.error });
job.stop();
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { CalendarOptions } from "@ix-xs/node-comfort"`.

### CalendarOptions

Options for `calendar()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Defaults to the global locale. |
| `timeZone?` | `string` | Defaults to the global zone, then the system's. |
| `now?` | [`DateInput`](#dateinput) | What "now" is. Defaults to the current time. |

### CalendarUnit

A fixed unit, or months and years, whose length varies.

```ts
type CalendarUnit = DurationUnit | "M" | "month" | "months" | "y" | "year" | "years"
```

### CronOptions

Options for `cron()` and `nextRun()`.

| Property | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Zone in which the expression is read, like `"Europe/Paris"`. Defaults to the global zone, then the system's. |
| `from?` | [`DateInput`](#dateinput) | `nextRun()` only: search after this date. Defaults to now. |
| `unref?` | `boolean` | Let the process exit even if the schedule is active. |
| `overlap?` | `boolean` | Start a run even if the previous one hasn't finished. By default it's skipped. |
| `immediate?` | `boolean` | `cron()` only: also run once right away. |
| `onError?` | `((error: unknown) => void)` | Called when the task fails. |

### DateInput

A date: a `Date`, a timestamp in ms, or a string `new Date()` understands
(ISO 8601 is safest).

```ts
type DateInput = Date | number | string
```

### DateRangeOptions

Options for `range()`.

| Property | Type | Description |
| --- | --- | --- |
| `step?` | `number` | How many units between two dates. Defaults to `1`. |
| `timeZone?` | `string` | Zone whose calendar is used for days, weeks, months and years. |

### DurationUnit

A unit with a fixed length.

```ts
type DurationUnit = "ms" | "millisecond" | "milliseconds" | "s" | "sec" | "second" | "seconds" | "m" | "min" | "minute" | "minutes" | "h" | "hour" | "hours" | "d" | "day" | "days" | "w" | "week" | "weeks"
```

### EveryOptions

Options for `every()`.

| Property | Type | Description |
| --- | --- | --- |
| `immediate?` | `boolean` | Also run once right away. |
| `unref?` | `boolean` | Let the process exit even if the schedule is active. |
| `onError?` | `((error: unknown) => void)` | Called when the task fails. Without it, errors surface as unhandled errors. |

### FormatDateOptions

Options for `format()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language of month and day names. Defaults to the global locale. |
| `timeZone?` | `string` | Show the date in this zone, like `"Asia/Tokyo"`. Defaults to the global zone, then the system's. |

### FormatDurationOptions

Options for `formatDuration()`.

| Property | Type | Description |
| --- | --- | --- |
| `long?` | `boolean` | Full, translated words: `"1 hour 30 minutes"` instead of `"1h 30m"`. |
| `units?` | `number` | Show at most this many units, largest first: `units: 2` turns `"1d 3h 5m"` into `"1d 3h"`. |
| `clock?` | `boolean` | Clock style, like `"01:30:05"`. |
| `milliseconds?` | `boolean` | Show milliseconds. Defaults to `true`. |
| `locale?` | `string` | Language for `long`. Defaults to the global locale. |

### ParseDateOptions

Options for `parse()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language of month names in the text. Defaults to the global locale. |
| `timeZone?` | `string` | Zone the text is written in, unless it carries its own offset. Defaults to the global zone, then the system's. |

### RelativeOptions

Options for `relative()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Defaults to the global locale. |
| `numeric?` | `"auto" \| "always"` | `"auto"` says `"yesterday"` instead of `"1 day ago"`. Defaults to `"always"`. |
| `style?` | `"long" \| "short" \| "narrow"` | `"short"` gives `"in 3 mo."`. Defaults to `"long"`. |

### ScheduledTask

A schedule returned by `every()` and `cron()`.

| Property | Type | Description |
| --- | --- | --- |
| `stop` | `() => void` | Stops the schedule. A run in progress finishes. |
| `next` | `() => ``Date` | When the next run is planned. |
| `isRunning` | `() => boolean` | Whether a run is in progress. |
| `runs` | `() => number` | How many runs have started. |

### StartOfUnit

A unit for `startOf()` and `endOf()`.

```ts
type StartOfUnit = "year" | "quarter" | "month" | "week" | "isoWeek" | "day" | "hour" | "minute" | "second"
```

### Stopwatch

Returned by `stopwatch()`.

| Property | Type | Description |
| --- | --- | --- |
| `elapsed` | `() => number` | Milliseconds since the start. |
| `stop` | `(format?: boolean) => string \| number` | The elapsed time; `stop(true)` formats it, like `"1.5s"`. |
| `lap` | `(label?: string) => number` | Records a lap and returns the ms since the previous one. |
| `laps` | `() => { label: string; ms: number; total: number; }[]` | Every lap so far. |
| `reset` | `() => void` | Starts over. |

### TimeZoneOptions

Time zone setting.

| Property | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Zone used to decide which day it is. Defaults to the global zone, then the system's. |

### WeekOptions

Week settings.

| Property | Type | Description |
| --- | --- | --- |
| `weekStartsOn?` | `0 \| 4 \| 6 \| 1 \| 2 \| 3 \| 5` | First day of the week: `0` for Sunday, `1` for Monday. Defaults to `1`. |
| `timeZone?` | `string` | Zone whose calendar is used. Defaults to the global zone, then the system's. |
