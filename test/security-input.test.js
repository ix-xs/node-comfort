"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { str, arr } = nc;

/** Runs `fn` and returns how long it took, in milliseconds. */
const elapsed = (/** @type {() => unknown} */ fn) => {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
};

describe("hostile input", () => {
  it("isMimeType does not backtrack on many quoted parameters", () => {
    const hostile = "a/b" + ';a="x"'.repeat(25) + ";";
    let result;
    const ms = elapsed(() => (result = nc.isMimeType(hostile)));
    assert.equal(result, false);
    assert.ok(ms < 200, `isMimeType took ${ms.toFixed(0)} ms`);
    assert.equal(nc.isMimeType(`a/b${';a="x"'.repeat(25)}`), true);
    assert.equal(nc.isMimeType('text/plain; a="b c"'), true);
    assert.equal(nc.isMimeType("text/html; charset=utf-8"), true);
    assert.equal(nc.isMimeType('a/b; x="\r\nInjected: 1"'), false);
    assert.equal(nc.isMimeType('a/b; x="unterminated'), false);
  });

  it("case converters split long runs of capitals in linear time", () => {
    const hostile = "A".repeat(40_000);
    let result = "";
    const ms = elapsed(() => (result = str.camelCase(hostile)));
    assert.equal(result.length, 40_000);
    assert.ok(ms < 200, `camelCase took ${ms.toFixed(0)} ms`);
    assert.deepEqual(str.words("XMLHttpRequest"), ["XML", "Http", "Request"]);
    assert.deepEqual(str.words("userID"), ["user", "ID"]);
    assert.deepEqual(str.words("HTTPServerURLParser"), ["HTTP", "Server", "URL", "Parser"]);
    assert.deepEqual(str.words("ÉCOLEÉté"), ["ÉCOLE", "Été"]);
  });

  it("isURL refuses raw text the URL parser had to clean", () => {
    for (const value of [
      'https://a.com/"><script>alert(1)</script>',
      // refused for its spaces: the apostrophe alone is legal
      "https://a.com/' onmouseover='alert(1)",
      "\u0000 https://a.com",
      "https://a.com/\r\nSet-Cookie: x=1",
      "ht\ttps://a.com",
      " https://a.com",
      "https://a.com/a b",
      "https:\\\\a.com",
      "https://a.com/`x`",
    ]) {
      assert.equal(nc.isURL(value), false, JSON.stringify(value));
    }
    assert.equal(nc.isURL("https://example.com/a?b=1&c=%22#top"), true);
    assert.equal(nc.isURL("https://user@example.com:8080/path"), true);
    assert.equal(nc.isURL("https://en.wikipedia.org/wiki/Ender's_Game"), true);
  });

  it("mask hides everything when the text is too short", () => {
    assert.equal(str.mask("1234"), "****");
    assert.equal(str.mask("hunter2", { start: 3 }), "*******");
    assert.equal(str.mask("secret", { start: 2, end: 4 }), "******");
    assert.equal(str.mask("1 2", { keepSpaces: true }), "* *");
    assert.equal(str.mask(""), "");
    assert.equal(str.mask("4242424242424242"), "************4242");
    assert.equal(str.mask("secret-token", { start: 2, end: 2, char: "•" }), "se••••••••en");
  });

  it("inherited members are not read as data", () => {
    assert.equal(str.unescapeHTML("&constructor; &toString; &__proto__; &valueOf;"), "&constructor; &toString; &__proto__; &valueOf;");
    assert.equal(str.unescapeHTML("&amp; &AMP; &copy;"), "& & ©");

    assert.deepEqual(arr.pluck([{}], /** @type {any} */ ("__proto__")), [undefined]);
    assert.deepEqual(Object.keys(arr.groupBy([{ a: 1 }], /** @type {any} */ ("constructor"))), ["undefined"]);
    assert.deepEqual(arr.pluck([{}], /** @type {any} */ ("toString")), [undefined]);
    // Own properties with those names, and getters of a class, still count.
    assert.deepEqual(arr.pluck([{ constructor: "own" }], "constructor"), ["own"]);
    class Point {
      constructor(/** @type {number} */ x) {
        this.x = x;
      }
      get double() {
        return this.x * 2;
      }
    }
    assert.deepEqual(arr.pluck([new Point(1), new Point(2)], "double"), [2, 4]);
    assert.deepEqual(arr.pluck(["ab", "c"], "length"), [2, 1]);
  });

  it("levenshtein keeps no large buffer and can stop early", () => {
    const before = process.memoryUsage().arrayBuffers;
    assert.equal(str.levenshtein("a", "b".repeat(1_000_000) + "c"), 1_000_001);
    const grown = process.memoryUsage().arrayBuffers - before;
    assert.ok(grown < 1_048_576, `levenshtein kept ${(grown / 1_048_576).toFixed(1)} MB`);

    assert.equal(str.levenshtein("ab".repeat(2500), "ba".repeat(2500)), 2);
    assert.equal(str.levenshtein("kitten", "sitting", { maxDistance: 3 }), 3);
    assert.equal(str.levenshtein("kitten", "sitting", { maxDistance: 2 }), 3);
    assert.equal(str.levenshtein("kitten", "sitting", { maxDistance: 0 }), 1);
    assert.equal(str.levenshtein("same", "same", { maxDistance: 0 }), 0);
    assert.equal(str.levenshtein("abc", "abcdefgh", { maxDistance: 2 }), 3);

    const a = "a".repeat(20_000);
    const b = "b".repeat(20_000);
    let distance = 0;
    const ms = elapsed(() => (distance = str.levenshtein(a, b, { maxDistance: 5 })));
    assert.equal(distance, 6);
    assert.ok(ms < 200, `levenshtein with maxDistance took ${ms.toFixed(0)} ms`);

    assert.equal(str.closest("instal", ["install", "uninstall", "list"], { maxDistance: 1 }), "install");
    assert.equal(str.closest("instal", ["uninstall", "list"], { maxDistance: 2 }), undefined);
    const big = "z".repeat(1_000_000);
    const closestMs = elapsed(() => assert.equal(str.closest(big, ["install", "uninstall", "list"]), undefined));
    assert.ok(closestMs < 200, `closest took ${closestMs.toFixed(0)} ms`);
  });

  it("isHostname counts label length in octets", () => {
    assert.equal(nc.isHostname("é".repeat(63) + ".com"), false);
    assert.equal(nc.isHostname("ü".repeat(62) + ".de"), false);
    // 220 characters, 262 bytes once encoded.
    assert.equal(nc.isHostname(Array(7).fill("é".repeat(30)).join(".") + ".com"), false);
    assert.equal(nc.isHostname(Array(6).fill("é".repeat(30)).join(".") + ".com"), true);
    assert.equal(nc.isHostname("é".repeat(20) + ".com"), true);
    assert.equal(nc.isHostname("exemple.fr"), true);
    assert.equal(nc.isHostname("münchen.de"), true);
  });

  it("isEmail does not fold look-alike characters into ASCII", () => {
    assert.equal(nc.isEmail("a@\u212Abc.com"), false);
    assert.equal(nc.isEmail("a@b.xn--\u017F\u017F"), false);
    assert.equal(nc.isEmail("a@b.XN--P1AI"), true);
    assert.equal(nc.isEmail("josé@exemple.fr"), true);
    assert.equal(nc.isEmail("user@xn--p1ai.xn--p1ai"), true);
  });

  it("isDataURL can restrict the media type", () => {
    assert.equal(nc.isDataURL("data:text/html,<script>alert(1)</script>", { types: ["image/png"] }), false);
    assert.equal(nc.isDataURL("data:image/svg+xml,<svg onload=alert(1)>", { types: ["image/png", "image/jpeg"] }), false);
    assert.equal(nc.isDataURL("data:image/PNG;base64,iVBORw0KGgo=", { types: ["image/png"] }), true);
    assert.equal(nc.isDataURL("data:,Hello", { types: ["text/plain"] }), true);
    assert.equal(nc.isDataURL("data:,Hello", { types: ["image/png"] }), false);
    assert.equal(nc.isDataURL("data:text/html,<p>"), true);
  });

  it("isCron refuses trailing garbage in a step or a range", () => {
    assert.equal(nc.isCron("*/5/garbage * * * *"), false);
    assert.equal(nc.isCron("1-5-junk * * * *"), false);
    assert.equal(nc.isCron("0 9 * * 1-5/2"), true);
    assert.equal(nc.isCron("*/15 * * * *"), true);
    // the scheduler reads cron the same way
    assert.throws(() => nc.time.nextRun("*/5/garbage * * * *"), SyntaxError);
    assert.throws(() => nc.time.nextRun("1-5-junk * * * *"), SyntaxError);
    assert.ok(nc.time.nextRun("0 9 * * 1-5/2") instanceof Date);
  });

  it("zip and unzip do not trust the length of non-arrays", () => {
    let result;
    const ms = elapsed(() => (result = arr.unzip(JSON.parse('[{"length":3000000}]'))));
    assert.deepEqual(result, []);
    assert.ok(ms < 200, `unzip took ${ms.toFixed(0)} ms`);
    assert.deepEqual(arr.zip([1, 2], /** @type {any} */ ({ length: 3e6 })), [[1, undefined], [2, undefined]]);
    assert.deepEqual(arr.unzip(/** @type {any} */ ({ length: 3e6 })), []);
    assert.deepEqual(arr.zip(["a"], [1, 2]), [["a", 1], [undefined, 2]]);
  });
});
