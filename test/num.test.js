"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { num } = require("..");

describe("num: bounds and rounding", () => {
  it("clamp, inRange, wrap", () => {
    assert.equal(num.clamp(150, 0, 100), 100);
    assert.equal(num.clamp(-5, 0, 100), 0);
    assert.equal(num.inRange(10, 0, 10), true);
    assert.equal(num.inRange(11, 0, 10), false);
    assert.equal(num.wrap(370, 0, 360), 10);
    assert.equal(num.wrap(-1, 0, 5), 4);
    assert.equal(num.wrap(5, 0, 5), 0);
  });

  it("rounds precisely", () => {
    assert.equal(num.round(1.005, 2), 1.01);
    assert.equal(num.round(1234.5), 1235);
    assert.equal(num.round(-2.5), -3);
    assert.equal(num.round(-0.4), 0);
    assert.equal(num.round(1234, -2), 1200);
    assert.equal(num.round(1e-7, 8), 1e-7);
    assert.equal(num.round(Infinity), Infinity);
    assert.equal(num.floor(1.789, 2), 1.78);
    assert.equal(num.ceil(1.231, 2), 1.24);
    assert.equal(num.snap(17, 5), 15);
    assert.equal(num.snap(18, 5), 20);
    assert.equal(num.snap(0.37, 0.25), 0.25);
    assert.equal(num.approxEqual(0.1 + 0.2, 0.3), true);
    assert.equal(num.approxEqual(1, 1.01, 0.001), false);
  });

  it("interpolates", () => {
    assert.equal(num.lerp(0, 100, 0.25), 25);
    assert.equal(num.mapRange(5, 0, 10, 0, 100), 50);
    assert.equal(num.mapRange(75, 0, 100, 1, 0), 0.25);
    assert.equal(num.mapRange(1, 2, 2, 0, 9), 0);
  });

  it("random stays in bounds", () => {
    for (let i = 0; i < 200; i++) {
      const r = num.randomInt(1, 6);
      assert.ok(Number.isInteger(r) && r >= 1 && r <= 6);
      const f = num.random(10, 20);
      assert.ok(f >= 10 && f < 20);
    }
  });
});

describe("num: statistics", () => {
  it("central tendency", () => {
    assert.equal(num.sum([1, 2, 3]), 6);
    assert.equal(num.sum(new Set([1, 2])), 3);
    assert.equal(num.average([2, 4, 9]), 5);
    assert.equal(num.average([]), 0);
    assert.equal(num.median([3, 1, 2]), 2);
    assert.equal(num.median([1, 2, 3, 4]), 2.5);
    assert.deepEqual(num.mode([1, 2, 2, 3]), [2]);
    assert.deepEqual(num.mode([1, 1, 2, 2, 3]), [1, 2]);
    assert.deepEqual(num.mode([]), []);
  });

  it("dispersion and percentiles", () => {
    assert.equal(num.variance([2, 4, 4, 4, 5, 5, 7, 9]), 4);
    assert.equal(num.round(num.variance([2, 4, 4, 4, 5, 5, 7, 9], { sample: true }), 3), 4.571);
    assert.equal(num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2);
    assert.equal(num.percentile([1, 2, 3, 4, 5], 50), 3);
    assert.equal(num.percentile([1, 2, 3, 4, 5], 90), 4.6);
    assert.ok(Number.isNaN(num.percentile([], 50)));
  });

  it("min/max handle huge arrays", () => {
    const big = Array.from({ length: 300_000 }, (_, i) => i);
    assert.equal(num.max(big), 299_999);
    assert.equal(num.min(big), 0);
    assert.equal(num.max([]), undefined);
    assert.equal(num.percent(25, 200), 12.5);
    assert.equal(num.percent(5, 0), 0);
  });
});

describe("num: arithmetic", () => {
  it("gcd, lcm, primes, factorial", () => {
    assert.equal(num.gcd(12, 18), 6);
    assert.equal(num.gcd(12, 18, 27), 3);
    assert.equal(num.lcm(2, 3, 4), 12);
    assert.equal(num.lcm(0, 5), 0);
    assert.deepEqual(num.range(20).filter(num.isPrime), [2, 3, 5, 7, 11, 13, 17, 19]);
    assert.equal(num.factorial(5), 120);
    assert.equal(num.factorial(0), 1);
    assert.equal(num.factorial(25, true), 15511210043330985984000000n);
    assert.throws(() => num.factorial(-1), RangeError);
    assert.equal(num.isEven(4), true);
    assert.equal(num.isOdd(-3), true);
  });

  it("range", () => {
    assert.deepEqual(num.range(4), [0, 1, 2, 3]);
    assert.deepEqual(num.range(1, 5), [1, 2, 3, 4]);
    assert.deepEqual(num.range(0, 10, 2), [0, 2, 4, 6, 8]);
    assert.deepEqual(num.range(5, 0), [5, 4, 3, 2, 1]);
    assert.deepEqual(num.range(0, 1, 0.25), [0, 0.25, 0.5, 0.75]);
    assert.deepEqual(num.range(0, 0.3, 0.1), [0, 0.1, 0.2]);
    assert.deepEqual(num.range(0, 5, -1), []);
    assert.deepEqual(num.range(0, 5, 0), []);
  });
});

describe("num: parsing and formatting", () => {
  it("parse", () => {
    assert.equal(num.parse("42px"), 42);
    assert.equal(num.parse(" -3.5 kg "), -3.5);
    assert.equal(num.parse("1e3"), 1000);
    assert.equal(num.parse("nope", 0), 0);
    assert.ok(Number.isNaN(num.parse("nope")));
  });

  it("bytes round-trip", () => {
    assert.equal(num.formatBytes(1536), "1.5 KB");
    assert.equal(num.formatBytes(1073741824), "1 GB");
    assert.equal(num.formatBytes(0), "0 B");
    assert.equal(num.formatBytes(-2048), "-2 KB");
    assert.equal(num.formatBytes(1000, { binary: false }), "1 KB");
    assert.equal(num.formatBytes(1024, { iec: true }), "1 KiB");
    assert.equal(num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo"] }), "1,5 Ko");
    assert.equal(num.parseBytes("1.5 KB"), 1536);
    assert.equal(num.parseBytes("10mb"), 10485760);
    assert.equal(num.parseBytes("2 GiB"), 2147483648);
    assert.equal(num.parseBytes("1 KB", { binary: false }), 1000);
    assert.equal(num.parseBytes("512 bytes"), 512);
    assert.equal(num.parseBytes(512), 512);
    assert.ok(Number.isNaN(num.parseBytes("oops")));
  });

  it("format and currency use Intl", () => {
    const nbsp = (s) => s.replace(/[  ]/g, " ");
    assert.equal(num.format(1234567.891), "1,234,567.891");
    assert.equal(nbsp(num.format(1234567.891, { locale: "fr" })), "1 234 567,891");
    assert.equal(num.format(0.256, { style: "percent" }), "26%");
    assert.equal(num.format(1500, { compact: true }), "1.5K");
    assert.equal(num.format(3.5, { unit: "kilometer" }), "3.5 km");
    assert.equal(num.format(5, { signDisplay: "exceptZero" }), "+5");
    assert.equal(num.format(2, { decimals: 2 }), "2.00");
    assert.equal(num.format(1234, { grouping: false }), "1234");
    assert.equal(num.currency(1234.5, "USD"), "$1,234.50");
    assert.equal(nbsp(num.currency(1234.5, "EUR", { locale: "fr" })), "1 234,50 €");
    assert.equal(num.currency(-5, "USD", { accounting: true }), "($5.00)");
    assert.equal(num.currency(10, "EUR", { display: "code", decimals: 0 }).replace(/\s/g, " "), "EUR 10");
  });

  it("abbreviate, thousands, ordinal", () => {
    assert.equal(num.abbreviate(1500), "1.5K");
    assert.equal(num.abbreviate(2_400_000), "2.4M");
    assert.equal(num.abbreviate(999), "999");
    assert.equal(num.abbreviate(-12_345, 0), "-12K");
    assert.equal(num.thousands(1234567), "1,234,567");
    assert.equal(num.thousands(1234567.89, " "), "1 234 567.89");
    assert.equal(num.ordinal(1), "1st");
    assert.equal(num.ordinal(22), "22nd");
    assert.equal(num.ordinal(113), "113th");
    assert.equal(num.ordinal(1, { locale: "fr" }), "1er");
    assert.equal(num.ordinal(2, { locale: "fr-CA" }), "2e");
    assert.equal(num.ordinal(3, { locale: "de" }), "3.");
    assert.equal(num.ordinal(4, { suffixes: { other: "°" } }), "4°");
  });

  it("setLocale changes the default language of every formatter", () => {
    const nbsp = (text) => text.replace(/\s/g, " ");
    try {
      assert.equal(num.getLocale(), "en");
      assert.equal(num.setLocale("fr"), num, "calls chain");
      assert.equal(nbsp(num.currency(1234.5, "EUR")), "1 234,50 €");
      assert.equal(nbsp(num.format(1234567.891)), "1 234 567,891");
      assert.equal(nbsp(num.formatBytes(1536)), "1,5 KB");
      assert.equal(num.ordinal(1), "1er");
      assert.equal(num.currency(1234.5, "USD", { locale: "en-US" }), "$1,234.50", "a call still wins");
    } finally {
      num.setLocale("en");
    }
    assert.equal(num.formatBytes(1536), "1.5 KB");
  });
});
