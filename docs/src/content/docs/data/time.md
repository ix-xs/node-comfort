---
title: "Dates and time"
description: "`nc.time` formats and parses dates in any language and time zone, does calendar math, reads durations and schedules tasks. It uses `Intl`, which Node.js ships with every language."
sidebar:
  order: 5
---

```js
const { time } = require("@ix-xs/node-comfort");

time.format(new Date(), "dddd D MMMM YYYY"); // "Monday 15 January 2024"
time.relative(Date.now() - 3_600_000);       // "1 hour ago"
time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
```

## Language and time zone

Output is in English by default, so results are the same on every machine. Change the defaults once:

```js
time.setLocale("fr").setTimezone("Europe/Paris");

time.relative(Date.now() - 3_600_000);         // "il y a 1 heure"
time.format(new Date(), "dddd D MMMM YYYY");   // "lundi 15 janvier 2024"
```

The default zone is used by everything that reads a calendar: `format`, `parse`, `startOf`, `add` with months, `isToday`, `cron` and the others. Without one, the system zone is used.

The rest of this page uses the default English locale.

You can also choose per call, with `{ locale }` and `{ timeZone }`:

```js
time.format(Date.now(), "HH:mm Z", { timeZone: "Asia/Tokyo" }); // "22:30 +09:00"
time.relative(date, undefined, { locale: "de" });               // "vor 3 Stunden"
```

`time.timezones()` lists every zone, and `time.offset("Europe/Paris")` gives the current offset in minutes, daylight saving included.

## Formatting

```js
time.format(date);                          // "2024-01-15 14:30:05"
time.format(date, "DD/MM/YYYY");            // "15/01/2024"
time.format(date, "h:mm A");                // "2:30 PM"
time.format(date, "MMMM Do, YYYY");         // "January 15th, 2024"
time.format(date, "[Week] W, YYYY");        // "Week 3, 2024"
time.toISODate(date);                       // "2024-01-15"
```

| Token | Output | Token | Output |
| --- | --- | --- | --- |
| `YYYY` `YY` | 2024, 24 | `HH` `H` | 09, 9 (24h) |
| `MMMM` `MMM` | January, Jan | `hh` `h` | 09, 9 (12h) |
| `MM` `M` | 01, 1 | `mm` `m` | 05, 5 |
| `DD` `D` | 05, 5 | `ss` `s` | 07, 7 |
| `Do` | 5th | `SSS` | milliseconds |
| `dddd` `ddd` | Monday, Mon | `A` `a` | PM, pm |
| `d` | weekday, 0 is Sunday | `Z` `ZZ` | +02:00, +0200 |
| `Q` | quarter | `z` | zone name, like EST |
| `W` `WW` | ISO week | `X` `x` | Unix seconds, ms |

Text in brackets is kept as is. `Do` follows the language (`1er` in French). `z` is the short name `Intl` has for the zone in that language, which can be an offset such as `GMT+1`.

## Parsing

`parse()` is the opposite of `format()`, with the same tokens:

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");             // a Date
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
// 2024-01-15T00:00:00.000Z, 9:00 in Tokyo
time.parse("31/02/2024", "DD/MM/YYYY");                         // undefined, no such day
```

The text is read in the default zone, or the one you pass, unless it carries its own offset (the `Z` token). You get `undefined` when the text doesn't match the pattern or isn't a real date. A pattern with no date means today, and one with no time means midnight. The week, quarter and zone name tokens (`W`, `Q`, `d`, `z`) can't be read back: a pattern that has one throws a `TypeError`.

For Unix timestamps in seconds, as found in JWTs and many APIs:

```js
time.fromUnix(1705329000); // 2024-01-15T14:30:00.000Z
time.unix();               // the current one
```

## Relative and calendar dates

```js
time.relative(Date.now() + 2 * 86_400_000);                           // "in 2 days"
time.relative(Date.now() - 86_400_000, undefined, { numeric: "auto" }); // "yesterday"
time.calendar(message.sentAt); // "Today at 2:30 PM", "Yesterday at 9:05 AM", "Monday at 10:00 AM"...
```

## Durations

Everywhere in node-comfort, a duration can be milliseconds or a string:

```js
time.parseDuration("1h30m");   // 5400000
time.parseDuration("2 days");  // 172800000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("PT1H30M"); // 5400000

time.formatDuration(5_400_000);                               // "1h 30m"
time.formatDuration("90m");                                   // "1h 30m"
time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
```

Months and years aren't accepted in durations because their length varies; use `add()` for those.

## Calendar math

```js
time.add(date, 3, "days");
time.add(date, "2h30m");
time.add(date, "1 month");                       // months and years work in text too
time.subtract(date, 1, "year");
time.diff("2024-03-15", "2024-01-20", "months"); // 1
time.startOf(date, "week");                      // Monday 00:00
time.startOf(date, "week", { weekStartsOn: 0 }); // Sunday 00:00
time.endOf(date, "month");                       // last day, 23:59:59.999
```

Adding months keeps the day in range: January 31 plus one month is the last day of February. A text amount that can't be read, like `"soon"`, throws a `TypeError`.

Whole days, weeks, months and years, like `startOf()` and `endOf()`, follow the calendar of the default zone, or the one you pass:

```js
time.startOf("2024-01-15T03:00:00Z", "day", { timeZone: "America/New_York" });
// 2024-01-14T05:00:00.000Z, midnight in New York

time.add("2024-02-15T12:00:00-05:00", 1, "month", { timeZone: "America/New_York" });
// 2024-03-15T16:00:00.000Z, still noon in New York after the clock change
```

One day later is the same time tomorrow, even on the night the clocks change. Hours and smaller units are exact, so `"24h"` is not always `"1 day"`:

```js
const paris = { timeZone: "Europe/Paris" };
time.add("2024-03-30T12:00:00+01:00", 1, "day", paris); // 2024-03-31T10:00:00.000Z, noon in Paris
time.add("2024-03-30T12:00:00+01:00", "24h", paris);   // 2024-03-31T11:00:00.000Z, 1 pm in Paris
```

A unit that doesn't exist, like `"bananas"`, throws a `TypeError`.

`range()` lists every date from a start to an end, both included:

```js
time.range("2024-01-01", "2024-01-07", "day");                         // 7 dates
time.range("2024-01-31", "2024-04-30", "month", { timeZone: "UTC" });  // Jan 31, Feb 29, Mar 31, Apr 30
time.range(start, end, "minute", { step: 15 });                        // every quarter of an hour
```

## Questions about dates

```js
time.isToday(date);
time.isYesterday(date);
time.isWeekend(date);
time.isSameDay(a, b, { timeZone: "Asia/Tokyo" });
time.isSame(a, b, "month");                         // same month of the same year
time.isSame(a, b, "week", { weekStartsOn: 0 });
time.isBetween(order.createdAt, start, end);
time.isLeapYear(2024);
time.isValid("2024-02-30");  // false
time.daysInMonth(2024, 2);   // 29
time.weekOfYear(date);       // ISO week
```

`isSame()` takes the same units as `startOf()`. `isToday()`, `isYesterday()` and `isTomorrow()` compare calendar days, not 24-hour spans, so they stay right on the days when clocks change.

## Measuring

```js
const sw = time.stopwatch();
await loadConfig(); sw.lap("config");
await connectDb();  sw.lap("db");
console.log(sw.stop(true)); // "182.4ms"

const { result, duration } = await time.measure(() => db.query(sql));
```

## Scheduling

`every()` runs a task at an interval. Unlike `setInterval`, a slow run delays the next one instead of piling up, and timing doesn't drift:

```js
const job = time.every("5m", syncInventory, { immediate: true, onError: nc.error });
job.stop();
```

`cron()` runs a task on a cron schedule, in any time zone, and handles daylight-saving changes:

```js
time.cron("0 9 * * mon-fri", sendReport, { timeZone: "Europe/Paris" });
time.cron("*/15 * * * *", refreshCache);
time.cron("0 18 L * *", closeMonth);                // the last day of each month at 18:00
time.cron("@daily", cleanup, { immediate: true });  // every midnight, and once right away
time.nextRun("0 0 1 * *"); // when it would run next
```

Expressions have five fields (`minute hour day month weekday`), or six with seconds first. They support lists, ranges, steps, month and day names, `L` in the day field for the last day of the month, and the `@hourly`, `@daily`, `@weekly`, `@monthly` and `@yearly` shortcuts.

Both return a task with `stop()`, `next()`, `isRunning()` and `runs()`. Every function is listed in the [reference](/reference/time/).
