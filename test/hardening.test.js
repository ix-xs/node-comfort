"use strict";

// Regression tests for defects fixed in 2.1: one test per defect, named after
// what used to go wrong.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { str, num, arr, obj, errors } = nc;

describe("errors", () => {
  it("an explicit undefined code keeps the default one", () => {
    assert.equal(new errors.HttpError("x", { code: undefined }).code, "ERR_HTTP");
    assert.equal(new errors.TimeoutError("x", { code: undefined }).code, "ETIMEDOUT");
    assert.equal(new errors.ProcessError("x", { timedOut: true }).code, "ETIMEDOUT");
  });

  it("serialize to JSON without the stack", () => {
    const error = new errors.HttpError("Not found", { status: 404, cause: new Error("socket") });
    const json = JSON.parse(JSON.stringify({ error })).error;
    assert.equal(json.name, "HttpError");
    assert.equal(json.code, "ERR_HTTP");
    assert.equal(json.message, "Not found");
    assert.equal(json.status, 404);
    assert.deepEqual(json.cause, { name: "Error", message: "socket" });
    assert.equal(json.stack, undefined);
  });

  it("instanceof works across two copies of the package", () => {
    const file = require.resolve("../src/errors.js");
    const first = require(file);
    const cached = require.cache[file];
    delete require.cache[file];
    const second = require(file);
    try {
      assert.notEqual(first.HttpError, second.HttpError);
      const error = new first.HttpError("x");
      assert.ok(error instanceof second.HttpError);
      assert.ok(error instanceof second.NodeComfortError);
      assert.equal(error instanceof second.TimeoutError, false);
      assert.equal({} instanceof second.HttpError, false);
      class Custom extends second.HttpError {}
      assert.equal(error instanceof Custom, false, "a subclass you wrote is not matched by name");
      assert.ok(new Custom("x") instanceof second.HttpError);
    } finally {
      require.cache[file] = cached;
    }
  });
});

describe("utils", () => {
  it("JSONString survives throwing getters and keeps errors readable", () => {
    const hostile = { get boom() { throw new Error("nope"); } };
    assert.equal(typeof nc.JSONString(hostile, 0), "string");
    const parsed = JSON.parse(nc.JSONString({ error: new TypeError("bad", { cause: "why" }) }, 0));
    assert.equal(parsed.error.name, "TypeError");
    assert.equal(parsed.error.message, "bad");
    assert.equal(parsed.error.cause, "why");
    assert.match(parsed.error.stack, /TypeError: bad/);
  });

  it("JSONParse ignores a byte order mark and takes a reviver", () => {
    assert.deepEqual(nc.JSONParse('﻿{"a":1}'), { a: 1 });
    assert.deepEqual(nc.JSONParse('{"at":0}', {}, (key, value) => (key === "at" ? new Date(value) : value)), { at: new Date(0) });
  });

  it("wait rejects invalid and infinite durations", async () => {
    await assert.rejects(nc.wait("banana"), TypeError);
    await assert.rejects(nc.wait(Infinity), TypeError);
    await assert.rejects(nc.wait(NaN), TypeError);
  });
});

describe("checker", () => {
  it("isEmail limits the local part and accepts punycode domains", () => {
    assert.equal(nc.isEmail(`${"x".repeat(64)}@example.com`), true);
    assert.equal(nc.isEmail(`${"x".repeat(65)}@example.com`), false);
    assert.equal(nc.isEmail("user@xn--p1ai.xn--p1ai"), true);
  });

  it("isURL with requireTld accepts punycode top-level domains", () => {
    assert.equal(nc.isURL("https://xn--e1afmkfd.xn--p1ai", { requireTld: true }), true);
    assert.equal(nc.isURL("http://localhost:3000", { requireTld: true }), false);
  });

  it("isISODate rejects impossible offsets", () => {
    assert.equal(nc.isISODate("2024-01-01T10:00:00+05:30"), true);
    assert.equal(nc.isISODate("2024-01-01T10:00:00+99:00"), false);
    assert.equal(nc.isISODate("2024-01-01T10:00:00+05:75"), false);
    assert.equal(nc.isISODate("2100-02-29"), false, "2100 is not a leap year");
    assert.equal(nc.isISODate("2000-02-29"), true);
  });

  it("isEmpty is false for dates, regular expressions and errors", () => {
    assert.equal(nc.isEmpty(new Date()), false);
    assert.equal(nc.isEmpty(/x/), false);
    assert.equal(nc.isEmpty(new Error("x")), false);
    assert.equal(nc.isEmpty({}), true);
  });

  it("new format guards", () => {
    assert.equal(nc.isHostname("api.example.com"), true);
    assert.equal(nc.isHostname("-bad-.com"), false);
    assert.equal(nc.isHostname("192.168.0.1"), false);
    assert.equal(nc.isHostname("localhost", { requireTld: true }), false);
    assert.equal(nc.isMACAddress("00:1B:44:11:3A:B7"), true);
    assert.equal(nc.isMACAddress("00:1B:44:11:3A"), false);
    assert.equal(nc.isIBAN("GB82 WEST 1234 5698 7654 32"), true);
    assert.equal(nc.isIBAN("GB82 WEST 1234 5698 7654 33"), false);
    assert.equal(nc.isE164("+33612345678"), true);
    assert.equal(nc.isE164("0612345678"), false);
    assert.equal(nc.isObjectId("507f1f77bcf86cd799439011"), true);
    assert.equal(nc.isULID(nc.id.ulid()), true);
    assert.equal(nc.isDataURL("data:image/png;base64,iVBORw0KGgo="), true);
    assert.equal(nc.isMimeType("text/html; charset=utf-8"), true);
    assert.equal(nc.isMimeType("json"), false);
    assert.equal(nc.isTimeZone("Europe/Paris"), true);
    assert.equal(nc.isTimeZone("Mars/Olympus"), false);
    assert.equal(nc.isLocale("pt-BR"), true);
    assert.equal(nc.isLocale("en_US"), false);
    assert.equal(nc.isCron("0 9 * * 1-5"), true);
    assert.equal(nc.isCron("61 * * * *"), false);
    assert.equal(nc.isCron("0 0 ,5 * *"), false, "an empty list item is not a value");
    assert.equal(nc.isASCII("hello"), true);
    assert.equal(nc.isASCII("héllo"), false);
  });
});

describe("str", () => {
  it("slugify keeps a word that fits exactly", () => {
    assert.equal(str.slugify("a very long title", { maxLength: 6 }), "a-very");
    assert.equal(str.slugify("abcdefghijkl", { maxLength: 5 }), "abcde");
    assert.equal(str.slugify("Straße Æsir ¡Olé!", { separator: "_" }), "strasse_aesir_ole");
  });

  it("stripTags leaves comparisons alone", () => {
    assert.equal(str.stripTags("a < b and c > d"), "a < b and c > d");
    assert.equal(str.stripTags("<b>Hi</b> <a href=x>you</a><!-- note -->!"), "Hi you!");
  });

  it("unescapeHTML never throws on invalid code points", () => {
    assert.equal(str.unescapeHTML("&#x110000; &#xD800; &#99999999;"), "&#x110000; &#xD800; &#99999999;");
    assert.equal(str.unescapeHTML("&copy; &euro; &hellip; &unknown;"), "© € … &unknown;");
  });

  it("padStart, padEnd and center count visible characters", () => {
    assert.equal(str.padStart("👨‍👩‍👧", 3, "."), "..👨‍👩‍👧");
    assert.equal(str.padEnd("é", 3, "-"), "é--");
    assert.equal(str.center("hi", 7, "ab"), "abhiaba", "a multi-character pad never overflows");
    assert.equal(str.padStart("7", 3, "0"), "007");
  });

  it("template does not read inherited members", () => {
    assert.equal(str.template("{constructor} {toString} {name}", { name: "Ada" }), "{constructor} {toString} Ada");
    assert.equal(str.template("{items.length}", { items: [1, 2] }), "2");
  });

  it("truncate can cut in the middle or at the start", () => {
    assert.equal(str.truncate("/very/long/path/to/file.txt", 15, { position: "middle" }), "/very/l…ile.txt");
    assert.equal(str.truncate("Hello world", 8, { position: "start" }), "…o world");
  });

  it("dedent and wrap handle large inputs", () => {
    const big = Array.from({ length: 200_000 }, () => "  line").join("\n");
    assert.equal(str.dedent(big).startsWith("line\nline"), true);
    assert.equal(str.wrap("supercalifragilistic word", { width: 8, cut: true }), "supercal\nifragili\nstic\nword");
  });

  it("capitalize handles letters outside the basic plane", () => {
    assert.equal(str.capitalize("𝓪bc"), "𝓪bc".slice(0, 2).toUpperCase() + "bc");
    assert.equal(str.upperFirst("userName"), "UserName");
    assert.equal(str.lowerFirst("UserName"), "userName");
  });

  it("humanize and chunk", () => {
    assert.equal(str.humanize("user_first_name"), "User first name");
    assert.equal(str.humanize("userID"), "User ID");
    assert.equal(str.humanize("API_KEY"), "Api key");
    assert.deepEqual(str.chunk("4242424242424242", 4), ["4242", "4242", "4242", "4242"]);
    assert.deepEqual(str.chunk("héllo", 2), ["hé", "ll", "o"]);
  });

  it("closest and levenshtein agree with the definition", () => {
    assert.equal(str.levenshtein("kitten", "sitting"), 3);
    assert.equal(str.levenshtein("", "abc"), 3);
    assert.equal(str.levenshtein("👨‍👩‍👧a", "a"), 1);
    assert.equal(str.closest("instal", ["install", "uninstall", "init"]), "install");
    assert.equal(str.closest("zzz", ["install"]), undefined);
  });
});

describe("num", () => {
  it("formatBytes handles fractions and rounds into the next unit", () => {
    assert.equal(num.formatBytes(0.5), "0.5 B");
    assert.equal(num.formatBytes(1023.99 * 1024), "1 MB");
    assert.equal(num.formatBytes(1048575), "1 MB");
    assert.equal(num.formatBytes(1e30), "827180.6 YB");
  });

  it("abbreviate rounds into the next suffix", () => {
    assert.equal(num.abbreviate(999_950), "1M");
    assert.equal(num.abbreviate(999.96), "1K");
    assert.equal(num.abbreviate(1500), "1.5K");
  });

  it("range never includes the end", () => {
    assert.deepEqual(num.range(0, 1.1, 0.1), [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    assert.deepEqual(num.range(0, 3e-7, 1e-7), [0, 1e-7, 2e-7]);
    assert.throws(() => num.range(0, Infinity), RangeError);
  });

  it("sum does not drift", () => {
    assert.equal(num.sum([0.1, 0.2, 0.3]), 0.6);
    assert.equal(num.sum([1e100, 1, -1e100]), 1);
    assert.equal(arr.sumBy([{ v: 0.1 }, { v: 0.2 }, { v: 0.3 }], "v"), 0.6);
    assert.equal(num.product([2, 3, 4]), 24);
  });

  it("min and max follow Math.min and Math.max for NaN", () => {
    assert.ok(Number.isNaN(num.max([1, NaN, 3])));
    assert.ok(Number.isNaN(num.min([NaN, 1])));
    assert.equal(num.max([1, 3, 2]), 3);
  });

  it("mode and lcm cope with large inputs", () => {
    const many = Array.from({ length: 200_000 }, (_, i) => i);
    assert.equal(num.mode(many).length, 200_000);
    assert.equal(num.lcm(2 ** 40, 2 ** 41), 2 ** 41);
  });

  it("pad and percentChange", () => {
    assert.equal(num.pad(7, 3), "007");
    assert.equal(num.pad(-7, 3), "-007");
    assert.equal(num.pad(3.5, 2), "03.5");
    assert.equal(num.percentChange(80, 100), 25);
    assert.equal(num.percentChange(100, 80), -20);
    assert.equal(num.percentChange(0, 5), Infinity);
  });
});

describe("arr", () => {
  it("groupBy, countBy and keyBy treat every key as data", () => {
    const items = [{ type: "constructor" }, { type: "__proto__" }, { type: "toString" }, { type: "a" }, { type: "a" }];
    const groups = arr.groupBy(items, "type");
    assert.deepEqual(Object.keys(groups), ["constructor", "__proto__", "toString", "a"]);
    assert.equal(groups.a.length, 2);
    assert.equal(Object.getPrototypeOf(groups), Object.prototype);
    assert.deepEqual(arr.countBy(items, "type"), Object.fromEntries([["constructor", 1], ["__proto__", 1], ["toString", 1], ["a", 2]]));
    assert.equal(Object.getPrototypeOf(arr.keyBy(items, "type")), Object.prototype);
    assert.equal({}.type, undefined);
  });

  it("unzip handles more rows than a function can take arguments", () => {
    const rows = Array.from({ length: 200_000 }, (_, i) => [i, String(i)]);
    const [numbers, texts] = arr.unzip(rows);
    assert.equal(numbers.length, 200_000);
    assert.equal(texts[199_999], "199999");
  });

  it("sortBy calls each iteratee once per item", () => {
    let calls = 0;
    const sorted = arr.sortBy([3, 1, 2, 5, 4], (n) => (calls++, n));
    assert.deepEqual(sorted, [1, 2, 3, 4, 5]);
    assert.equal(calls, 5);
  });

  it("toggle removes NaN, maxBy and minBy skip it", () => {
    assert.deepEqual(arr.toggle([1, NaN, 2], NaN), [1, 2]);
    assert.deepEqual(arr.maxBy([{ v: NaN }, { v: 2 }, { v: 5 }], "v"), { v: 5 });
    assert.deepEqual(arr.minBy([{ v: NaN }, { v: 2 }, { v: 5 }], "v"), { v: 2 });
  });

  it("duplicates, xor, takeWhile, dropWhile, toSentence", () => {
    assert.deepEqual(arr.duplicates([1, 2, 2, 3, 3, 3]), [2, 3]);
    assert.deepEqual(arr.xor([1, 2, 3], [2, 3, 4]), [1, 4]);
    assert.deepEqual(arr.takeWhile([1, 2, 5, 1], (n) => n < 3), [1, 2]);
    assert.deepEqual(arr.dropWhile([1, 2, 5, 1], (n) => n < 3), [5, 1]);
    assert.equal(arr.toSentence(["Ada", "Bob", "Cy"]), "Ada, Bob, and Cy");
    assert.equal(arr.toSentence(["Ada", "Bob"], { locale: "fr" }), "Ada et Bob");
    assert.equal(arr.toSentence(["red", "blue"], { type: "disjunction" }), "red or blue");
    assert.equal(arr.sampleSize([1, 2, 3, 4, 5], 3).length, 3);
    assert.equal(new Set(arr.sampleSize([1, 2, 3, 4, 5], 5)).size, 5);
  });
});

describe("obj", () => {
  it("no helper lets an own __proto__ key become the prototype of the result", () => {
    const hostile = JSON.parse('{"__proto__":{"isAdmin":true},"a":1}');
    for (const result of [
      obj.omit(hostile, []),
      obj.pick(hostile, /** @type {any} */ (["__proto__", "a"])),
      obj.filter(hostile, () => true),
      obj.mapValues(hostile, (v) => v),
      obj.compact(hostile),
      obj.flatten(hostile),
      obj.merge(hostile),
      obj.clone(hostile),
    ]) {
      assert.equal(/** @type {any} */ (result).isAdmin, undefined);
    }
    assert.equal({}.isAdmin, undefined);
  });

  it("clone keeps class instances inside plain data and copies buffers", () => {
    class User {
      constructor() {
        this.name = "ada";
      }
    }
    const source = { user: new User(), buffer: Buffer.from("ab"), list: [1, , 3], when: new Date(0), url: new URL("https://a.io/x") };
    const copy = obj.clone(source);
    assert.ok(copy.user instanceof User);
    assert.notEqual(copy.user, source.user);
    copy.buffer[0] = 0;
    assert.equal(source.buffer[0], 97, "the buffer is a copy, not a view");
    assert.equal(1 in copy.list, false, "holes stay holes");
    assert.equal(copy.url.href, "https://a.io/x");
    const loop = { n: 1 };
    loop.self = loop;
    assert.equal(obj.clone(loop).self.self.n, 1);
  });

  it("merge shares nothing with its inputs", () => {
    const defaults = { db: { host: "x", tags: [1] }, keep: { n: 1 }, when: new Date(0) };
    const merged = obj.merge(defaults, { db: { port: 1 } });
    merged.db.tags.push(2);
    merged.db.host = "y";
    merged.keep.n = 2;
    merged.when.setFullYear(2000);
    assert.deepEqual(defaults.db, { host: "x", tags: [1] });
    assert.equal(defaults.keep.n, 1);
    assert.equal(defaults.when.getTime(), 0);
    class Connection {}
    const live = new Connection();
    assert.equal(obj.merge({ a: 1 }, { handle: live }).handle, live, "live objects are kept as they are");
  });

  it("equal compares what objects hold, not just their enumerable keys", () => {
    assert.equal(obj.equal(new Error("a"), new Error("b")), false);
    assert.equal(obj.equal(new Error("a"), new Error("a")), true);
    assert.equal(obj.equal(new URL("https://a.io"), new URL("https://b.io")), false);
    assert.equal(obj.equal(new ArrayBuffer(1), new ArrayBuffer(2)), false);
    assert.equal(obj.equal(new Number(1), new Number(2)), false);
    assert.equal(obj.equal(Buffer.from("ab"), Buffer.from("ab")), true);
    const a = { n: 1 };
    a.self = a;
    const b = { n: 1 };
    b.self = b;
    assert.equal(obj.equal(a, b), true);
  });

  it("diff, get and unset on arrays", () => {
    assert.deepEqual(obj.diff({ list: [1, 2] }, { list: [1, 3, 4] }), [
      { path: ["list", 1], type: "changed", from: 2, to: 3 },
      { path: ["list", 2], type: "added", to: 4 },
    ]);
    assert.deepEqual(obj.unset({ a: [1, 2, 3] }, "a[1]"), { a: [1, 3] });
    assert.equal(obj.get({ a: { b: [{ c: 7 }] } }, "a.b[0].c"), 7);
    assert.equal(obj.has({}, "toString"), false);
  });

  it("deepFreeze skips typed arrays instead of throwing", () => {
    const frozen = obj.deepFreeze({ a: { b: 1 }, bytes: new Uint8Array(2) });
    assert.ok(Object.isFrozen(frozen.a));
  });

  it("update, sortKeys and paths", () => {
    assert.deepEqual(obj.update({ stats: { visits: 1 } }, "stats.visits", (n) => n + 1), { stats: { visits: 2 } });
    assert.deepEqual(obj.update({}, "items", (items = []) => [...items, 1]), { items: [1] });
    assert.equal(JSON.stringify(obj.sortKeys({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } })), '{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
    assert.deepEqual(obj.paths({ db: { host: "x", port: 1 }, tags: ["a"] }), ["db.host", "db.port", "tags"]);
  });
});
