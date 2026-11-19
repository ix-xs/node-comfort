---
title: "Dates and time"
description: "`nc.time`: formatting and parsing in any language and time zone, calendar math, durations, measuring and scheduled jobs. Built on `Intl`, and on `Temporal` where Node.js has it."
---

```js
const { time } = require("@ix-xs/node-comfort");
```

The results below are computed in UTC (`nc.config.set({ timeZone: "UTC" })`), with `date = new Date("2024-01-15T14:30:05Z")`.

## Language and time zone

Output is in English and in the system zone until you change it, once, for `time`, `num` and the logger ([Configuration](/start/configuration/)):

```js
nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });

time.relative(Date.now() - 3_600_000);                 // "il y a 1 heure"
time.format(date, "dddd D MMMM YYYY HH:mm");           // "lundi 15 janvier 2024 15:30"
```

Each call can also take `{ locale }` and `{ timeZone }`:

```js
time.format(date, "HH:mm Z", { timeZone: "Asia/Tokyo" });  // "23:30 +09:00"
time.relative(threeHoursAgo, undefined, { locale: "de" }); // "vor 3 Stunden"
```

| Function | Returns |
| --- | --- |
| `timeZones()` | Every zone name `Intl` knows |
| `offset(timeZone?, date?)` | The offset in minutes, daylight saving included: `offset("Europe/Paris", "2024-07-01")` is `120` |

The zone is used by everything that reads a calendar: `format`, `parse`, `startOf`, `add` with days or months, `isToday`, `cron`.

## Dates accepted

Wherever a date is expected: a `Date`, a timestamp in milliseconds, an ISO string, a `Temporal.Instant` or a `Temporal.ZonedDateTime`. Results are `Date` objects.

```js
time.format(Temporal.Instant.from("2024-01-15T14:30:00Z"), "YYYY-MM-DD HH:mm"); // "2024-01-15 14:30"
time.isWeekend(Temporal.ZonedDateTime.from("2026-03-29T09:00[Europe/Paris]")); // true
```

Only the instant is read: the zone of a `ZonedDateTime` is ignored, pass `{ timeZone }`. On Node.js 26, zones go through `Temporal`, more than twice as fast; results are the same on 22 and 24.

## Formatting

```js
time.format(date);                   // "2024-01-15 14:30:05"
time.format(date, "DD/MM/YYYY");     // "15/01/2024"
time.format(date, "h:mm A");         // "2:30 PM"
time.format(date, "MMMM Do, YYYY");  // "January 15th, 2024"
time.format(date, "[Week] W, YYYY"); // "Week 3, 2024"
time.toISODate(date);                // "2024-01-15"
```

| Token | Output | Token | Output |
| --- | --- | --- | --- |
| `YYYY` `YY` | 2024, 24 | `HH` `H` | 09, 9 (24h) |
| `MMMM` `MMM` | January, Jan | `hh` `h` | 09, 9 (12h) |
| `MM` `M` | 01, 1 | `mm` `m` | 05, 5 |
| `DD` `D` | 05, 5 | `ss` `s` | 07, 7 |
| `Do` | 5th (`1er` in French) | `SSS` | milliseconds |
| `dddd` `ddd` | Monday, Mon | `A` `a` | PM, pm |
| `d` | weekday, 0 is Sunday | `Z` `ZZ` | +02:00, +0200 |
| `Q` | quarter | `z` | zone name, like EST or GMT+1 |
| `W` `WW` | ISO week | `X` `x` | Unix seconds, ms |

Text in `[brackets]` is kept as is.

## Parsing

`parse(text, pattern, options?)` uses the same tokens:

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");               // 2024-01-15T14:30:00.000Z
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });   // 2024-01-15T00:00:00.000Z
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" }); // 2024-01-15T00:00:00.000Z
time.parse("31/02/2024", "DD/MM/YYYY");                           // undefined
time.fromUnix(1705329000);                                        // 2024-01-15T14:30:00.000Z
```

| Case | Result |
| --- | --- |
| Text that does not match, or a day that does not exist | `undefined` |
| No date in the pattern | Today |
| No time in the pattern | Midnight |
| An offset in the text (`Z`) | Wins over the zone |
| `W`, `Q`, `d` or `z` in the pattern | `TypeError`: they cannot be read back |

`unix()` is the current time in Unix seconds, `fromUnix(seconds)` the opposite.

## Relative and calendar dates

```js
time.relative("2024-01-17T14:30:05Z", date);                         // "in 2 days"
time.relative("2024-01-14T14:30:05Z", date, { numeric: "auto" });    // "yesterday"
time.calendar("2024-01-14T09:05:00Z", { now: date });                // "Yesterday at 9:05 AM"
```

| `relative` option | Default |
| --- | --- |
| `locale` | `nc.config.get().locale` |
| `numeric` | `"always"`; `"auto"` says "yesterday" |
| `style` | `"long"`; `"short"`, `"narrow"` |

## Durations

A duration is milliseconds or text, everywhere in the library:

```js
time.parseDuration("1h30m");    // 5400000
time.parseDuration("2 days");   // 172800000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("PT1H30M");  // 5400000
time.parseDuration("soon");     // null

time.formatDuration(5_400_000);                            // "1h 30m"
time.formatDuration(90_000, { long: true, locale: "fr" }); // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });             // "1d 2h"
time.formatDuration(5_405_000, { clock: true });           // "01:30:05"
```

| `formatDuration` option | Does |
| --- | --- |
| `long` | Full, translated words |
| `units` | At most this many units, largest first |
| `clock` | `"01:30:05"` |
| `milliseconds` | Shows milliseconds; `true` by default |
| `locale` | Language of `long` |

Months and years are not durations, their length varies: use `add()`.

## Calendar math

```js
time.add("2024-01-31", 1, "month");              // 2024-02-29T00:00:00.000Z
time.add(date, "2h30m");                         // 2024-01-15T17:00:05.000Z
time.subtract(date, 1, "year");
time.diff("2024-03-15", "2024-01-20", "months"); // 1
time.startOf(date, "week");                      // 2024-01-15T00:00:00.000Z, a Monday
time.startOf(date, "week", { weekStartsOn: 0 }); // 2024-01-14T00:00:00.000Z
time.endOf(date, "month");                       // 2024-01-31T23:59:59.999Z
```

Days, weeks, months and years follow the calendar of the zone; hours and smaller units are exact:

```js
const paris = { timeZone: "Europe/Paris" };
time.add("2024-03-30T12:00:00+01:00", 1, "day", paris); // 2024-03-31T10:00:00.000Z, noon in Paris
time.add("2024-03-30T12:00:00+01:00", "24h", paris);   // 2024-03-31T11:00:00.000Z, 1 pm in Paris
```

| Function | Units |
| --- | --- |
| `add`, `subtract`, `diff` | `ms`, `s`, `m`, `h`, `d`, `w`, `M` (month), `y`, and their long names |
| `startOf`, `endOf`, `isSame` | `year`, `quarter`, `month`, `week`, `isoWeek`, `day`, `hour`, `minute`, `second` |
| `range(start, end, unit, { step })` | Every date from `start` to `end`, both included |

Adding months keeps the day in range: January 31 plus a month is the last day of February. An unknown unit or an unreadable amount throws a `TypeError`.

```js
time.range("2024-01-31", "2024-04-30", "month"); // Jan 31, Feb 29, Mar 31, Apr 30
time.range(start, end, "minute", { step: 15 });  // every quarter of an hour
```

## Comparing

| Function | Example | Result |
| --- | --- | --- |
| `isBefore`, `isAfter` | `time.isBefore("2024-01-01", "2024-01-02")` | `true` |
| `isBetween` | `time.isBetween("2024-01-10", "2024-01-01", "2024-01-31")` | `true` |
| `isSame` | `time.isSame("2024-01-02", "2024-01-30", "month")` | `true` |
| `isSameDay`, `isToday`, `isYesterday`, `isTomorrow` | `time.isToday(date, { timeZone })` | Calendar days, not 24-hour spans |
| `isWeekend` | `time.isWeekend("2024-01-13")` | `true` |
| `isLeapYear` | `time.isLeapYear(2024)` | `true` |
| `isValid` | `time.isValid("2024-02-30")` | `false` |
| `daysInMonth` | `time.daysInMonth(2024, 2)` | `29` |
| `dayOfYear`, `weekOfYear` | `time.weekOfYear(date)` | `3` (ISO week) |
| `min`, `max` | `time.min(["2024-03-01", "2024-01-01"])` | `2024-01-01T00:00:00.000Z` |

## Measuring

```js
const sw = time.stopwatch();
await loadConfig();
sw.lap("config");
sw.stop(true); // "182.4ms"; stop() alone gives the number

const { result, duration } = await time.measure(() => loadUsers());
```

| `stopwatch()` member | Does |
| --- | --- |
| `elapsed()` | Milliseconds since the start |
| `lap(label?)` | Records a lap, returns the milliseconds since the previous one |
| `laps()` | `[{ label, ms, total }]` |
| `stop(format?)` | The elapsed milliseconds, or text with `true` |
| `reset()` | Starts over |

## Scheduled jobs

`every(interval, task, options?)` runs a task at an interval: a slow run delays the next one instead of piling up, and the timing does not drift. `cron(expression, task, options?)` runs it on a cron schedule, in a time zone, across daylight-saving changes.

```js
const { time, sys, logger } = require("@ix-xs/node-comfort");

const job = time.every("5m", syncInventory, { immediate: true, onError: (error) => logger.error(error) });
const report = time.cron("0 9 * * mon-fri", sendReport, { timeZone: "Europe/Paris" });

sys.onShutdown(() => {
  job.stop();
  report.stop();
});
```

| Option | `every` | `cron` | Does |
| --- | --- | --- | --- |
| `immediate` | yes | yes | Also runs once right away |
| `onError` | yes | yes | Gets the error of a failed run; without it, the error is unhandled |
| `signal` | yes | yes | Aborting stops the schedule, like `stop()` |
| `unref` | yes | yes | Lets the process exit while the schedule is active |
| `timeZone` | | yes | Zone the expression is read in |
| `overlap` | | yes | Starts a run even if the previous one is still going; skipped by default |

```js
const controller = new AbortController();
time.every("30s", poll, { signal: controller.signal });
controller.abort(); // the schedule stops
```

The task returned has `stop()` (returns the task), `next()` (the next planned `Date`), `isRunning()` and `runs()`. Declared with `using`, it stops at the end of its block ([Resources](/basics/resources/)).

Expressions have five fields (`minute hour day month weekday`), or six with seconds first: lists, ranges, steps, month and day names, `L` for the last day of the month, and `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`.

```js
time.cron("*/15 * * * *", refreshCache);
time.cron("0 18 L * *", closeMonth);                // the last day of each month at 18:00
time.nextRun("0 0 1 * *", { from: date });          // 2024-02-01T00:00:00.000Z
```

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `time.setLocale(locale)` | `nc.config.set({ locale })` |
| `time.setTimezone(timeZone)` | `nc.config.set({ timeZone })` |
| `time.getConfig()` | `nc.config.get()` |
| `time.timezones()` | `time.timeZones()` |

The locale set with `nc.config.set()` is shared with `num`, `str.plural` and `arr.toSentence`: `num.setLocale()` used to leave `time` in its own language.
