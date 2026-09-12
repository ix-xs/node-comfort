# Dates and time

`nc.time` formats dates in any language and time zone, does calendar math, parses durations and schedules tasks. It uses `Intl`, which Node.js ships with every language.

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
time.format(date, "[Week] W, YYYY");        // "Week 3, 2024"
time.toISODate(date);                       // "2024-01-15"
```

| Token | Output | Token | Output |
| --- | --- | --- | --- |
| `YYYY` `YY` | 2024, 24 | `HH` `H` | 09, 9 (24h) |
| `MMMM` `MMM` | January, Jan | `hh` `h` | 09, 9 (12h) |
| `MM` `M` | 01, 1 | `mm` `m` | 05, 5 |
| `DD` `D` | 05, 5 | `ss` `s` | 07, 7 |
| `dddd` `ddd` | Monday, Mon | `SSS` | milliseconds |
| `d` | weekday, 0 is Sunday | `A` `a` | PM, pm |
| `Q` | quarter | `Z` `ZZ` | +02:00, +0200 |
| `W` `WW` | ISO week | `X` `x` | Unix seconds, ms |

Text in brackets is kept as is.

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
time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
```

Months and years aren't accepted in durations because their length varies; use `add()` for those.

## Calendar math

```js
time.add(date, 3, "days");
time.add(date, "2h30m");
time.subtract(date, 1, "year");
time.diff("2024-03-15", "2024-01-20", "months"); // 1
time.startOf(date, "week");                      // Monday 00:00
time.startOf(date, "week", { weekStartsOn: 0 }); // Sunday 00:00
time.endOf(date, "month");                       // last day, 23:59:59.999
```

Adding months keeps the day in range: January 31 plus one month is the last day of February.

## Questions about dates

```js
time.isToday(date);
time.isWeekend(date);
time.isSameDay(a, b, { timeZone: "Asia/Tokyo" });
time.isBetween(order.createdAt, start, end);
time.isLeapYear(2024);
time.isValid("2024-02-30");  // false
time.daysInMonth(2024, 2);   // 29
time.weekOfYear(date);       // ISO week
```

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
time.cron("@daily", cleanup);
time.nextRun("0 0 1 * *"); // when it would run next
```

Expressions have five fields (`minute hour day month weekday`), or six with seconds first. They support lists, ranges, steps, month and day names, and the `@hourly`, `@daily`, `@weekly`, `@monthly` and `@yearly` shortcuts.
