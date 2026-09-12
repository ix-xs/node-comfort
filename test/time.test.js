"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { time } = require("..");

const nbsp = (s) => s.replace(/[  ]/g, " ");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  time.setLocale("en").setTimezone(undefined);
});

describe("time: configuration", () => {
  it("setLocale / setTimezone are chainable and validated", () => {
    assert.equal(time.setLocale("fr").setTimezone("Europe/Paris"), time);
    assert.deepEqual(time.getConfig(), { locale: "fr", timeZone: "Europe/Paris" });
    assert.throws(() => time.setTimezone("Mars/Olympus"), RangeError);
    assert.ok(time.timezones().includes("Europe/Paris"));
    assert.equal(time.offset("Europe/Paris", "2024-07-01T12:00:00Z"), 120);
    assert.equal(time.offset("Europe/Paris", "2024-01-01T12:00:00Z"), 60);
    assert.equal(time.offset("America/New_York", "2024-01-01T12:00:00Z"), -300);
  });
});

describe("time: durations", () => {
  it("parseDuration understands units, clocks, ISO 8601 and numbers", () => {
    assert.equal(time.parseDuration("1h30m"), 5_400_000);
    assert.equal(time.parseDuration("2 days"), 172_800_000);
    assert.equal(time.parseDuration("1.5h"), 5_400_000);
    assert.equal(time.parseDuration("1h and 30m"), 5_400_000);
    assert.equal(time.parseDuration("-10s"), -10_000);
    assert.equal(time.parseDuration("01:30"), 90_000);
    assert.equal(time.parseDuration("1:02:03.25"), 3_723_250);
    assert.equal(time.parseDuration("PT1H30M"), 5_400_000);
    assert.equal(time.parseDuration("P1DT2H"), 93_600_000);
    assert.equal(time.parseDuration("P1W"), 604_800_000);
    assert.equal(time.parseDuration("5000"), 5000);
    assert.equal(time.parseDuration(250), 250);
    assert.equal(time.parseDuration("banana"), null);
    assert.equal(time.parseDuration("10 bananas"), null);
    assert.equal(time.parseDuration("1 month"), null);
    assert.equal(time.parseDuration("P"), null);
    assert.equal(time.parseDuration(""), null);
  });

  it("formatDuration in short, long, localized and clock styles", () => {
    assert.equal(time.formatDuration(5_400_000), "1h 30m");
    assert.equal(time.formatDuration(90_000, { long: true }), "1 minute 30 seconds");
    assert.equal(nbsp(time.formatDuration(90_000, { long: true, locale: "fr" })), "1 minute 30 secondes");
    assert.equal(time.formatDuration(93_784_000, { units: 2 }), "1d 2h");
    assert.equal(time.formatDuration(1_500, { milliseconds: false }), "1s");
    assert.equal(time.formatDuration(5_405_000, { clock: true }), "01:30:05");
    assert.equal(time.formatDuration(93_784_000, { clock: true }), "1:02:03:04");
    assert.equal(time.formatDuration(-60_000), "-1m");
    assert.equal(time.formatDuration(0), "0s");
    assert.equal(time.formatDuration(0, { long: true }), "0 seconds");
  });
});

describe("time: display", () => {
  it("relative in several languages", () => {
    const now = Date.now();
    assert.equal(time.relative(now - 3_600_000, now), "1 hour ago");
    assert.equal(time.relative(now + 2 * 86_400_000, now), "in 2 days");
    assert.equal(time.relative(now - 86_400_000, now, { numeric: "auto" }), "yesterday");
    assert.equal(time.relative(now - 3_600_000, now, { locale: "fr" }), "il y a 1 heure");
    assert.equal(time.relative(now, now), "now");
    time.setLocale("de");
    assert.equal(time.relative(now - 5 * 60_000, now), "vor 5 Minuten");
  });

  it("calendar", () => {
    const now = new Date(2024, 0, 15, 14, 30);
    assert.equal(time.calendar(now, { now }), "Today at 2:30 PM");
    assert.equal(nbsp(time.calendar(new Date(2024, 0, 14, 9, 5), { now, locale: "fr" })), "Hier à 09:05");
    assert.equal(time.calendar(new Date(2024, 0, 17, 18, 0), { now }), "Wednesday at 6:00 PM");
    assert.equal(time.calendar(new Date(2020, 0, 15), { now }), "January 15, 2020");
  });

  it("format tokens, locales, time zones and escaping", () => {
    const d = new Date(2024, 0, 15, 14, 30, 5, 42);
    assert.equal(time.format(d, "YYYY-MM-DD HH:mm:ss.SSS"), "2024-01-15 14:30:05.042");
    assert.equal(time.format(d, "YY M D H m s Q d"), "24 1 15 14 30 5 1 1");
    assert.equal(time.format(d, "dddd D MMMM YYYY", { locale: "fr" }), "lundi 15 janvier 2024");
    assert.equal(time.format(d, "ddd MMM"), "Mon Jan");
    assert.equal(time.format(d, "h:mm A / hh:mm a"), "2:30 PM / 02:30 pm");
    assert.equal(time.format(new Date(2024, 0, 15, 0, 5), "h:mm A"), "12:05 AM");
    assert.equal(time.format(d, "[Week] W [of] YYYY"), "Week 3 of 2024");
    const utc = new Date(Date.UTC(2024, 0, 15, 23, 30));
    assert.equal(time.format(utc, "YYYY-MM-DD HH:mm Z", { timeZone: "Asia/Tokyo" }), "2024-01-16 08:30 +09:00");
    assert.equal(time.format(utc, "HH:mm ZZ", { timeZone: "America/New_York" }), "18:30 -0500");
    assert.equal(time.format(utc, "X x"), `${utc.getTime() / 1000} ${utc.getTime()}`);
    assert.equal(time.format("not a date"), "Invalid Date");
    time.setTimezone("UTC");
    assert.equal(time.format(utc, "HH:mm"), "23:30");
    assert.equal(time.toISODate(utc), "2024-01-15");
  });
});

describe("time: arithmetic", () => {
  it("add and subtract, calendar-aware for months and years", () => {
    assert.equal(time.add(new Date(2024, 0, 1), "2h").getHours(), 2);
    assert.equal(time.add(new Date(2024, 0, 1), 3, "days").getDate(), 4);
    const feb = time.add(new Date(2024, 0, 31), 1, "month");
    assert.deepEqual([feb.getFullYear(), feb.getMonth(), feb.getDate()], [2024, 1, 29]);
    const nextYear = time.add(new Date(2024, 1, 29), 1, "year");
    assert.deepEqual([nextYear.getMonth(), nextYear.getDate()], [1, 28]);
    assert.equal(time.subtract(new Date(2024, 0, 10), 7, "d").getDate(), 3);
    assert.equal(time.subtract(new Date(2024, 0, 1, 12), "90m").getHours(), 10);
  });

  it("diff in fixed and calendar units", () => {
    assert.equal(time.diff("2024-01-03", "2024-01-01", "days"), 2);
    assert.equal(time.diff(new Date(2024, 2, 15), new Date(2024, 0, 20), "months"), 1);
    assert.equal(time.diff(new Date(2024, 0, 20), new Date(2024, 2, 15), "months"), -1);
    assert.equal(time.diff(new Date(2026, 5, 1), new Date(2024, 5, 2), "years"), 1);
    assert.equal(time.diff(new Date(2024, 0, 1, 0, 0, 30), new Date(2024, 0, 1), "s"), 30);
  });

  it("startOf and endOf", () => {
    const d = new Date(2024, 4, 15, 13, 45, 12, 500); // Wednesday
    assert.equal(time.startOf(d, "day").getHours(), 0);
    assert.equal(time.startOf(d, "week").getDate(), 13); // Monday
    assert.equal(time.startOf(d, "week", { weekStartsOn: 0 }).getDate(), 12); // Sunday
    assert.equal(time.startOf(d, "month").getDate(), 1);
    assert.equal(time.startOf(d, "quarter").getMonth(), 3);
    assert.equal(time.startOf(d, "year").getMonth(), 0);
    assert.equal(time.startOf(d, "hour").getMinutes(), 0);
    const end = time.endOf(d, "month");
    assert.deepEqual([end.getDate(), end.getHours(), end.getMilliseconds()], [31, 23, 999]);
    assert.equal(time.endOf(d, "day").getHours(), 23);
    assert.equal(time.endOf(d, "week").getDate(), 19);
  });
});

describe("time: comparisons and calendar info", () => {
  it("before, after, between, same day, today", () => {
    assert.equal(time.isBefore("2024-01-01", "2024-06-01"), true);
    assert.equal(time.isAfter("2024-01-01", "2024-06-01"), false);
    assert.equal(time.isBetween("2024-03-01", "2024-01-01", "2024-06-01"), true);
    assert.equal(time.isSameDay(new Date(2024, 0, 1, 8), new Date(2024, 0, 1, 23)), true);
    const a = new Date(Date.UTC(2024, 0, 15, 23));
    const b = new Date(Date.UTC(2024, 0, 16, 1));
    assert.equal(time.isSameDay(a, b, { timeZone: "UTC" }), false);
    assert.equal(time.isSameDay(a, b, { timeZone: "Asia/Tokyo" }), true);
    assert.equal(time.isToday(new Date()), true);
    assert.equal(time.isYesterday(time.add(new Date(), -1, "d")), true);
    assert.equal(time.isTomorrow(time.add(new Date(), 1, "d")), true);
    assert.equal(time.isWeekend(new Date(2024, 0, 13)), true);
    assert.equal(time.isWeekend(new Date(2024, 0, 15)), false);
  });

  it("leap years, validity, month lengths, week numbers", () => {
    assert.equal(time.isLeapYear(2024), true);
    assert.equal(time.isLeapYear(1900), false);
    assert.equal(time.isLeapYear(2000), true);
    assert.equal(time.isLeapYear(new Date(2023, 5)), false);
    assert.equal(time.isValid("2024-02-29"), true);
    assert.equal(time.isValid("2024-02-30"), false);
    assert.equal(time.isValid("nope"), false);
    assert.equal(time.daysInMonth(2023, 2), 28);
    assert.equal(time.daysInMonth(new Date(2024, 1)), 29);
    assert.equal(time.dayOfYear(new Date(2024, 1, 1)), 32);
    assert.equal(time.weekOfYear(new Date(2024, 0, 1)), 1);
    assert.equal(time.weekOfYear(new Date(2021, 0, 3)), 53);
    assert.equal(time.min([new Date(2024, 1), new Date(2023, 1)]).getFullYear(), 2023);
    assert.equal(time.max([new Date(2024, 1), new Date(2023, 1)]).getFullYear(), 2024);
    assert.equal(time.min([]), undefined);
    assert.ok(Math.abs(time.unix() - Date.now() / 1000) < 2);
  });
});

describe("time: measurement", () => {
  it("stopwatch with laps and formatting", async () => {
    const sw = time.stopwatch();
    await sleep(15);
    const lap = sw.lap("first");
    assert.ok(lap >= 10);
    assert.equal(sw.laps()[0].label, "first");
    assert.match(String(sw.stop(true)), /ms$/);
    assert.ok(sw.elapsed() >= 10);
    sw.reset();
    assert.equal(sw.laps().length, 0);
    assert.ok(sw.elapsed() < 10);
  });

  it("measure", async () => {
    const { result, duration } = await time.measure(async () => {
      await sleep(10);
      return 42;
    });
    assert.equal(result, 42);
    assert.ok(duration >= 5);
  });
});

describe("time: scheduling", () => {
  it("nextRun: syntax, names, steps, macros", () => {
    const from = new Date(2024, 0, 13, 12, 0); // Saturday
    const weekday = time.nextRun("0 9 * * mon-fri", { from });
    assert.deepEqual([weekday.getDate(), weekday.getHours(), weekday.getMinutes()], [15, 9, 0]);
    assert.equal(time.nextRun("*/15 * * * *", { from: new Date(2024, 0, 1, 10, 7) }).getMinutes(), 15);
    assert.equal(time.nextRun("*/10 * * * * *", { from: new Date(2024, 0, 1, 10, 0, 3) }).getSeconds(), 10);
    assert.equal(time.nextRun("@daily", { from }).getDate(), 14);
    assert.equal(time.nextRun("0 0 1 jan *", { from }).getFullYear(), 2025);
    assert.equal(time.nextRun("0 0 * * 7", { from }).getDay(), 0);
    assert.equal(time.nextRun("0 0 29 2 *", { from: new Date(2025, 0, 1) }).getFullYear(), 2028);
    assert.equal(time.nextRun("0 0 31 2 *", { from }), undefined);
  });

  it("nextRun: day-of-month OR day-of-week (standard cron)", () => {
    const next = time.nextRun("0 0 13 * fri", { from: new Date(2024, 0, 1) });
    assert.equal(next.getDate(), 5); // Friday Jan 5 comes before the 13th
  });

  it("nextRun: time zones and daylight saving", () => {
    assert.equal(
      time.nextRun("0 0 1 * *", { from: new Date("2024-03-15T00:00:00Z"), timeZone: "America/New_York" }).toISOString(),
      "2024-04-01T04:00:00.000Z",
    );
    // 02:30 does not exist in Paris on 2024-03-31: that day is skipped.
    assert.equal(
      time.nextRun("30 2 * * *", { from: new Date("2024-03-30T12:00:00Z"), timeZone: "Europe/Paris" }).toISOString(),
      "2024-04-01T00:30:00.000Z",
    );
  });

  it("nextRun rejects invalid expressions", () => {
    assert.throws(() => time.nextRun("* * *"), SyntaxError);
    assert.throws(() => time.nextRun("61 * * * *"), SyntaxError);
    assert.throws(() => time.nextRun("*/0 * * * *"), SyntaxError);
    assert.throws(() => time.nextRun("0 0 * foo *"), SyntaxError);
  });

  it("cron runs a task on schedule and can be stopped", async () => {
    let runs = 0;
    const job = time.cron("* * * * * *", () => runs++);
    assert.ok(job.next() instanceof Date);
    await sleep(2200);
    job.stop();
    assert.ok(runs >= 1, `expected at least one run, got ${runs}`);
    assert.equal(job.next(), undefined);
    const after = runs;
    await sleep(1100);
    assert.equal(runs, after);
  });

  it("every runs without overlap and reports errors", async () => {
    let runs = 0;
    const errors = [];
    const job = time.every(20, () => {
      runs++;
      if (runs === 2) throw new Error("boom");
    }, { immediate: true, onError: (e) => errors.push(e.message) });
    await sleep(110);
    job.stop();
    assert.ok(runs >= 3, `expected several runs, got ${runs}`);
    assert.deepEqual(errors, ["boom"]);
    assert.equal(job.runs(), runs);
    assert.throws(() => time.every("nope", () => {}), RangeError);
  });
});
