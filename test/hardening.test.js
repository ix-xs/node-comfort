"use strict";

// Regression tests for defects fixed in 2.1: one test per defect, named after
// what used to go wrong.

const { describe, it, before, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
// These tests describe the defaults: what the shell sets must not change them.
for (const name of ["LOG_LEVEL", "LOG_FORMAT", "DEBUG"]) delete process.env[name];

const nc = require("..");

const { str, num, arr, obj, errors, func, time } = nc;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

describe("func", () => {
  it("durations can be written as text", async () => {
    let calls = 0;
    const save = func.debounce(() => calls++, "10ms");
    save();
    save();
    save();
    await sleep(40);
    assert.equal(calls, 1);
    assert.throws(() => func.debounce(() => {}, "soon"), TypeError);
    assert.throws(() => func.throttle(() => {}, "soon"), TypeError);
  });

  it("debounce keeps the last arguments and maxWait still fires during a long burst", async () => {
    /** @type {number[]} */
    const seen = [];
    const save = func.debounce((n) => seen.push(n), 15, { maxWait: 40 });
    for (let i = 0; i < 12; i++) {
      save(i);
      await sleep(8);
    }
    await sleep(40);
    assert.ok(seen.length >= 2, "maxWait fired before the burst ended");
    assert.equal(seen.at(-1), 11);
  });

  it("memoize doesn't mix up arguments that print the same", () => {
    let calls = 0;
    const id = func.memoize((value) => (calls++, typeof value));
    assert.deepEqual([id(1), id("1"), id(null), id(undefined), id("null"), id(1n), id(true), id("true")], [
      "number", "string", "object", "undefined", "string", "bigint", "boolean", "string",
    ]);
    assert.equal(calls, 8);
    const pair = func.memoize((a, b) => `${a}|${b}`);
    assert.equal(pair("a,b", "c"), "a,b|c");
    assert.equal(pair("a", "b,c"), "a|b,c");
  });

  it("memoize drops entries past their ttl and past max", async () => {
    let calls = 0;
    const cached = func.memoize((n) => (calls++, n), { ttl: "15ms", max: 2 });
    cached(1);
    cached(1);
    assert.equal(calls, 1);
    await sleep(30);
    cached(1);
    assert.equal(calls, 2);
    cached(2);
    cached(1);
    cached(3);
    cached(1);
    assert.equal(calls, 4, "1 was used last, so 2 was dropped");
  });

  it("retry gives up at once when the work was aborted", async () => {
    let tries = 0;
    await assert.rejects(
      func.retry(() => {
        tries++;
        throw new errors.AbortError("stop");
      }, { retries: 5, delay: 1 }),
      { name: "AbortError" },
    );
    assert.equal(tries, 1);
    let later = 0;
    assert.equal(await func.retry(() => (++later < 3 ? Promise.reject(new Error("x")) : "ok"), { retries: 3, delay: "1ms" }), "ok");
  });

  it("timeout tells the task to stop", async () => {
    /** @type {AbortSignal | undefined} */
    let seen;
    await assert.rejects(
      func.timeout((signal) => {
        seen = signal;
        return sleep(200);
      }, "10ms"),
      { name: "TimeoutError", timeout: 10 },
    );
    assert.equal(seen?.aborted, true);
    assert.equal(await func.timeout(Promise.resolve(1), Infinity), 1);
    await assert.rejects(func.timeout(Promise.reject(new Error("own")), 50), { message: "own" });
  });

  it("pipeAsync, batch and dedupe", async () => {
    const run = func.pipeAsync((n) => n + 1, async (n) => n * 2, String);
    assert.equal(await run(1), "4");

    /** @type {number[][]} */
    const batches = [];
    const load = func.batch(async (ids) => {
      batches.push(ids);
      return ids.map((id) => (id === 3 ? new Error("missing") : id * 10));
    });
    const [a, b, c] = await Promise.allSettled([load(1), load(2), load(3)]);
    assert.deepEqual(batches, [[1, 2, 3]]);
    assert.equal(a.status === "fulfilled" && a.value, 10);
    assert.equal(b.status === "fulfilled" && b.value, 20);
    assert.equal(c.status, "rejected");

    const small = func.batch(async (ids) => new Map(ids.map((id) => [id, id + 1])), { max: 2 });
    assert.deepEqual(await Promise.all([small(1), small(2), small(3)]), [2, 3, 4]);
    await assert.rejects(func.batch(async () => [])(1), TypeError);

    let calls = 0;
    const fetchUser = func.dedupe(async (id) => {
      calls++;
      await sleep(5);
      return { id };
    });
    const [x, y, z] = await Promise.all([fetchUser(1), fetchUser(1), fetchUser(2)]);
    assert.equal(x, y);
    assert.notEqual(x, z);
    assert.equal(calls, 2);
    await fetchUser(1);
    assert.equal(calls, 3, "nothing is cached once the call has settled");
  });
});

describe("async", () => {
  it("map takes items from a generator only when a slot is free, and closes it on failure", async () => {
    let pulled = 0;
    let closed = false;
    function* numbers() {
      try {
        for (let i = 1; i <= 100; i++) {
          pulled++;
          yield i;
        }
      } finally {
        closed = true;
      }
    }
    await assert.rejects(
      nc.async.map(numbers(), async (n) => {
        await sleep(1);
        if (n === 3) throw new Error("boom");
        return n;
      }, { concurrency: 2 }),
      { message: "boom" },
    );
    assert.ok(pulled < 10, `pulled ${pulled} items`);
    assert.equal(closed, true);

    async function* later() {
      yield 1;
      yield 2;
      yield 3;
    }
    assert.deepEqual(await nc.async.map(later(), (n) => n * 2, { concurrency: 2 }), [2, 4, 6]);
    assert.deepEqual(await nc.async.filter(later(), (n) => n !== 2), [1, 3]);
  });

  it("limit and queue run tasks in the order they came, priorities first", async () => {
    /** @type {number[]} */
    const order = [];
    const limit = nc.async.limit(1);
    await Promise.all([1, 2, 3, 4].map((n) => limit(async () => void order.push(n))));
    assert.deepEqual(order, [1, 2, 3, 4]);

    /** @type {string[]} */
    const ran = [];
    const queue = nc.async.queue({ concurrency: 1 });
    queue.add(async () => void ran.push("first"));
    queue.add(async () => void ran.push("low"));
    queue.add(async () => void ran.push("also low"));
    queue.add(async () => void ran.push("vip"), { priority: 10 });
    await queue.onIdle();
    assert.deepEqual(ran, ["first", "vip", "low", "also low"]);
  });

  it("poll says why it gave up", async () => {
    const error = await nc.async.poll(() => {
      throw new Error("not ready");
    }, { interval: 2, timeout: 20 }).catch((e) => e);
    assert.equal(error.name, "TimeoutError");
    assert.equal(error.cause?.message, "not ready");
  });

  it("parallel, rateLimit and abortable", async () => {
    assert.deepEqual(await nc.async.parallel([() => 1, async () => 2, () => 3], { concurrency: 2 }), [1, 2, 3]);

    const limiter = nc.async.rateLimit(2, 120);
    const started = Date.now();
    /** @type {number[]} */
    const at = [];
    await Promise.all([1, 2, 3].map(() => limiter(() => void at.push(Date.now() - started))));
    assert.ok(at[1] < 100, "the first two start at once");
    assert.ok(at[2] >= 110, `the third waits for the next window, started after ${at[2]}ms`);

    const controller = new AbortController();
    const waiting = nc.async.abortable(sleep(200), controller.signal);
    controller.abort();
    await assert.rejects(waiting, { name: "AbortError" });
    assert.equal(await nc.async.abortable(Promise.resolve(5), new AbortController().signal), 5);
  });
});

describe("cache", () => {
  it("a value loaded for a key that was deleted meanwhile is not stored", async () => {
    const cache = new nc.Cache();
    /** @type {(value: string) => void} */
    let finish = () => {};
    const loading = cache.getOrSet("k", () => new Promise((resolve) => (finish = resolve)));
    await sleep(1);
    cache.delete("k");
    finish("late");
    assert.equal(await loading, "late");
    assert.equal(cache.has("k"), false);
  });

  it("concurrent loads share one call, and a failure isn't cached", async () => {
    const cache = new nc.Cache();
    let loads = 0;
    const [a, b] = await Promise.all([cache.getOrSet("k", async () => ++loads), cache.getOrSet("k", async () => ++loads)]);
    assert.deepEqual([a, b, loads], [1, 1, 1]);
    let tries = 0;
    for (let i = 0; i < 2; i++) {
      await assert.rejects(cache.getOrSet("bad", () => {
        tries++;
        throw new Error("x");
      }));
    }
    assert.equal(tries, 2);
  });

  it("staleWhileRevalidate answers with the old value and refreshes behind", async () => {
    let n = 0;
    const cache = new nc.Cache({ ttl: 60, staleWhileRevalidate: "5s" });
    assert.equal(await cache.getOrSet("k", () => ++n), 1);
    await sleep(90);
    assert.equal(cache.get("k"), undefined, "get() never returns a stale value");
    assert.equal(await cache.getOrSet("k", () => ++n), 1);
    await sleep(5);
    assert.equal(await cache.getOrSet("k", () => ++n), 2);
    assert.equal(n, 2);
  });

  it("the least recently used key goes first, expired keys don't pile up", async () => {
    /** @type {string[]} */
    const removed = [];
    const cache = new nc.Cache({ max: 2, onRemove: (key, _value, reason) => removed.push(`${key}:${reason}`) });
    cache.set("a", 1).set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    assert.deepEqual(cache.keys(), ["a", "c"]);
    assert.deepEqual(removed, ["b:evict"]);

    const short = new nc.Cache({ ttl: 1 });
    for (let i = 0; i < 1100; i++) short.set(i, i);
    await sleep(5);
    for (let i = 2000; i < 3300; i++) short.set(i, i);
    assert.ok(short.size < 2400, `kept ${short.size} entries`);
  });

  it("wrap tells arguments apart, and stats can be reset", async () => {
    const cache = new nc.Cache();
    let calls = 0;
    const load = cache.wrap(async (a, b) => (calls++, `${a}${b}`));
    await load(undefined, 1);
    await load(null, 1);
    await load("1", 1);
    await load(1, 1);
    await load(1, 1);
    assert.equal(calls, 4);
    assert.equal(cache.stats.hits, 1);
    assert.deepEqual(cache.resetStats().stats, { hits: 0, misses: 0, sets: 0, evictions: 0, expirations: 0, hitRate: 0 });
  });
});

describe("emitter", () => {
  it("off() finds a listener added with once()", () => {
    const emitter = new nc.Emitter();
    let calls = 0;
    const listener = () => calls++;
    emitter.once("x", listener);
    assert.deepEqual(emitter.listeners("x"), [listener]);
    emitter.off("x", listener);
    emitter.emit("x");
    assert.equal(calls, 0);
    assert.equal(emitter.listenerCount("x"), 0);
  });

  it("one signal removes many listeners", () => {
    const emitter = new nc.Emitter();
    const controller = new AbortController();
    emitter.on("a", () => {}, { signal: controller.signal });
    emitter.once("b", () => {}, { signal: controller.signal });
    controller.abort();
    assert.deepEqual(emitter.eventNames(), []);
    emitter.on("c", () => {}, { signal: controller.signal });
    assert.equal(emitter.listenerCount("c"), 0, "an aborted signal adds nothing");
  });

  it("listeners added or removed during an emit don't disturb it", () => {
    const emitter = new nc.Emitter();
    /** @type {string[]} */
    const order = [];
    const self = () => {
      order.push("self");
      emitter.off("x", self);
      emitter.on("x", () => order.push("late"));
    };
    emitter.on("x", self);
    emitter.on("x", () => order.push("second"));
    emitter.emit("x");
    emitter.emit("x");
    assert.deepEqual(order, ["self", "second", "second", "late"]);
  });

  it("waitFor takes text durations and refuses nonsense", async () => {
    const emitter = new nc.Emitter();
    await assert.rejects(emitter.waitFor("never", { timeout: "10ms" }), { name: "TimeoutError", timeout: 10 });
    await assert.rejects(emitter.waitFor("never", { timeout: "soon" }), TypeError);
    assert.equal(emitter.listenerCount("never"), 0);
  });
});

describe("time", () => {
  const tokyo = { timeZone: "Asia/Tokyo" };
  const paris = { timeZone: "Europe/Paris" };
  const utc = { timeZone: "UTC" };
  /** @param {Date | undefined} d */
  const iso = (d) => d?.toISOString();

  it("startOf and endOf follow the time zone", () => {
    const d = "2024-03-14T10:05:07.042Z";
    assert.equal(iso(time.startOf(d, "day", tokyo)), "2024-03-13T15:00:00.000Z");
    assert.equal(iso(time.startOf(d, "month", tokyo)), "2024-02-29T15:00:00.000Z");
    assert.equal(iso(time.startOf(d, "week", paris)), "2024-03-10T23:00:00.000Z");
    assert.equal(iso(time.startOf(d, "hour", { timeZone: "Asia/Kolkata" })), "2024-03-14T09:30:00.000Z");
    assert.equal(iso(time.endOf(d, "day", tokyo)), "2024-03-14T14:59:59.999Z");
    // the day Paris moves its clocks forward is 23 hours long
    assert.equal(iso(time.startOf("2024-03-31T12:00:00Z", "day", paris)), "2024-03-30T23:00:00.000Z");
    assert.equal(iso(time.endOf("2024-03-31T12:00:00Z", "day", paris)), "2024-03-31T21:59:59.999Z");
  });

  it("the zone set with setTimezone() applies to date maths too", () => {
    time.setTimezone("Asia/Tokyo");
    try {
      assert.equal(iso(time.startOf("2024-03-14T10:05:07Z", "day")), "2024-03-13T15:00:00.000Z");
      assert.equal(iso(time.add("2024-01-31T23:30:00Z", 1, "month")), "2024-02-29T23:30:00.000Z");
    } finally {
      time.setTimezone(undefined);
    }
  });

  it("add understands calendar units in text, and refuses what it can't read", () => {
    assert.equal(iso(time.add("2024-01-31T00:00:00Z", "1 month", "ms", utc)), "2024-02-29T00:00:00.000Z");
    assert.equal(iso(time.add("2024-01-01T00:00:00Z", "1y 2 months and 3 days", "ms", utc)), "2025-03-04T00:00:00.000Z");
    assert.equal(iso(time.add("2024-01-01T00:00:00Z", "1h30m")), "2024-01-01T01:30:00.000Z");
    assert.equal(iso(time.subtract("2024-03-31T00:00:00Z", "1 month", "ms", utc)), "2024-02-29T00:00:00.000Z");
    assert.throws(() => time.add(new Date(), "soonish"), TypeError);
  });

  it("parse reads a date written with a pattern", () => {
    assert.equal(iso(time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm", utc)), "2024-01-15T14:30:00.000Z");
    assert.equal(iso(time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr", timeZone: "UTC" })), "2024-01-15T00:00:00.000Z");
    assert.equal(iso(time.parse("Jan 5, 2024 3:07 PM", "MMM D, YYYY h:mm A", utc)), "2024-01-05T15:07:00.000Z");
    assert.equal(iso(time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", tokyo)), "2024-01-15T00:00:00.000Z");
    assert.equal(iso(time.parse("2024-01-15T09:00:00+02:00", "YYYY-MM-DD[T]HH:mm:ssZ")), "2024-01-15T07:00:00.000Z");
    assert.equal(iso(time.parse("5th March 2024", "Do MMMM YYYY", utc)), "2024-03-05T00:00:00.000Z");
    assert.equal(iso(time.parse("1705329000", "X")), "2024-01-15T14:30:00.000Z");
    assert.equal(time.parse("31/02/2024", "DD/MM/YYYY"), undefined);
    assert.equal(time.parse("nope", "DD/MM/YYYY"), undefined);
  });

  it("format knows ordinals and zone names", () => {
    const d = new Date("2024-03-14T10:05:07.042Z");
    assert.equal(time.format(d, "Do MMM YY, h:mm A z", { timeZone: "America/New_York", locale: "en-US" }), "14th Mar 24, 6:05 AM EDT");
    assert.equal(time.format(d, "[Week] W, Q, d, X", utc), "Week 11, 1, 4, 1710410707");
    assert.equal(time.format(d, "[only text]"), "only text");
  });

  it("isSame, range and fromUnix", () => {
    assert.equal(time.isSame("2024-03-14T23:30:00Z", "2024-03-15T00:30:00Z", "day", utc), false);
    assert.equal(time.isSame("2024-03-14T23:30:00Z", "2024-03-15T00:30:00Z", "day", tokyo), true);
    assert.equal(time.range("2024-01-01T00:00:00Z", "2024-01-04T00:00:00Z").length, 4);
    assert.deepEqual(
      time.range("2024-01-31T00:00:00Z", "2024-05-01T00:00:00Z", "month", utc).map((d) => d.toISOString().slice(5, 10)),
      ["01-31", "02-29", "03-31", "04-30"],
    );
    assert.equal(time.range("2024-01-01T00:00:00Z", "2024-01-01T01:00:00Z", "minute", { step: 15 }).length, 5);
    assert.equal(iso(time.fromUnix(1705329000)), "2024-01-15T14:30:00.000Z");
  });

  it("cron: L is the last day of the month", () => {
    assert.equal(iso(time.nextRun("0 0 L * *", { from: "2024-02-10T00:00:00Z", timeZone: "UTC" })), "2024-02-29T00:00:00.000Z");
    assert.equal(iso(time.nextRun("0 12 15,L * *", { from: "2024-02-16T00:00:00Z", timeZone: "UTC" })), "2024-02-29T12:00:00.000Z");
    assert.equal(nc.isCron("0 0 L * *"), true);
    assert.equal(nc.isCron("0 0 1,,2 * *"), false);
  });

  it("calendar days, not 24 hour blocks, decide what yesterday is", () => {
    const now = new Date();
    const lateYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59);
    const earlyTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1);
    assert.equal(time.isYesterday(lateYesterday), true);
    assert.equal(time.isTomorrow(earlyTomorrow), true);
    assert.equal(time.isToday(lateYesterday), false);
  });
});

describe("id", () => {
  const { id } = nc;
  /** @param {string[]} list */
  const increases = (list) => list.every((value, i) => i === 0 || list[i - 1] < value);

  it("time ordered ids keep increasing within a millisecond", () => {
    const v7 = Array.from({ length: 20_000 }, () => id.uuidv7());
    const ulids = Array.from({ length: 20_000 }, () => id.ulid());
    assert.ok(increases(v7));
    assert.ok(increases(ulids));
    assert.equal(new Set(v7).size, v7.length);
    assert.ok(v7.every((value) => nc.isUUID(value, { version: 7 })));
    assert.ok(ulids.every((value) => nc.isULID(value)));
  });

  it("ulid refuses a time it can't encode", () => {
    for (const time of [-1, 2 ** 48, 1.5, NaN, "tomorrow"]) assert.throws(() => id.ulid(/** @type {any} */ (time)), RangeError);
    assert.equal(id.timestamp(id.ulid(new Date("2024-01-01")))?.toISOString(), "2024-01-01T00:00:00.000Z");
  });

  it("uuidv5 gives the standard result", () => {
    assert.equal(id.uuidv5("python.org", "dns"), "886313e1-3b8a-5372-9b90-0c9aee199e5d");
    assert.equal(id.uuidv5("www.example.com", "dns"), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
    assert.equal(id.uuidv5("a", "6ba7b811-9dad-11d1-80b4-00c04fd430c8"), id.uuidv5("a", "url"));
    assert.throws(() => id.uuidv5("a", "nope"), TypeError);
    assert.throws(() => id.uuidv5("a", "constructor"), TypeError);
  });

  it("objectId and prefixed", () => {
    const ids = Array.from({ length: 1000 }, () => id.objectId());
    assert.ok(ids.every((value) => nc.isObjectId(value)));
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(id.timestamp(id.objectId(new Date("2024-01-01T00:00:05.900Z")))?.toISOString(), "2024-01-01T00:00:05.000Z");
    assert.match(id.prefixed("user"), /^user_[0-9A-Za-z]{24}$/);
    assert.match(id.prefixed("inv", 8), /^inv_[0-9A-Za-z]{8}$/);
    assert.throws(() => id.prefixed(""), TypeError);
  });

  it("sizes and snowflakes are checked", () => {
    assert.equal(id.nano(0), "");
    assert.equal(id.nano(5000).length, 5000);
    for (const size of [-1, 1.5, "8"]) assert.throws(() => id.nano(/** @type {any} */ (size)), RangeError);
    for (const value of ["abc", "", "-5", 12]) assert.throws(() => id.parseSnowflake(/** @type {any} */ (value)), TypeError);
    assert.throws(() => id.snowflake({ epoch: Date.now() + 86_400_000 }), RangeError);
    assert.equal(id.seq("__proto__"), "__proto__-1");
  });
});

describe("crypto", () => {
  const crypto = nc.crypto;
  /** @param {() => unknown} fn */
  const codeOf = (fn) => {
    try {
      fn();
    } catch (error) {
      return /** @type {any} */ (error).code ?? /** @type {Error} */ (error).name;
    }
    return "no error";
  };

  it("a missing value is never hashed as the text \"undefined\"", () => {
    for (const value of [undefined, null, {}]) {
      assert.throws(() => crypto.hash(/** @type {any} */ (value)), TypeError);
      assert.throws(() => crypto.hmac("data", /** @type {any} */ (value)), TypeError);
    }
    assert.throws(() => crypto.hmac("data", ""), TypeError);
    assert.equal(crypto.safeEqual(/** @type {any} */ (undefined), "undefined"), false);
    assert.equal(crypto.safeEqual(/** @type {any} */ (undefined), /** @type {any} */ (undefined)), false);
    assert.equal(crypto.safeEqual("abc", "abcd"), false);
    assert.equal(crypto.safeEqual(Buffer.from("abc"), "abc"), true);
  });

  it("verifyHmac checks webhook signatures", () => {
    const signature = crypto.hmac("body", "secret");
    assert.equal(crypto.verifyHmac("body", signature, "secret"), true);
    assert.equal(crypto.verifyHmac("body", `sha256=${signature.toUpperCase()}`, "secret"), true);
    assert.equal(crypto.verifyHmac("body", crypto.hmac("body", "secret", { encoding: "base64" }), "secret", { encoding: "base64" }), true);
    assert.equal(crypto.verifyHmac("other body", signature, "secret"), false);
    assert.equal(crypto.verifyHmac("body", undefined, "secret"), false);
  });

  it("a stored hash can't ask for unreasonable work", async () => {
    const salt = "AAAAAAAAAAAAAAAAAAAAAA";
    const key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    assert.equal(await crypto.verifyPassword("x", `$scrypt$ln=30,r=8,p=1$${salt}$${key}`), false);
    assert.equal(await crypto.verifyPassword("x", `$scrypt$ln=10,r=8,p=9999$${salt}$${key}`), false);
    assert.equal(await crypto.verifyPassword(/** @type {any} */ (undefined), `$scrypt$ln=10,r=8,p=1$${salt}$${key}`), false);
    await assert.rejects(crypto.hashPassword("x", { cost: 25 }), RangeError);
    await assert.rejects(crypto.hashPassword(/** @type {any} */ (undefined)), TypeError);
    const stored = await crypto.hashPassword("hunter2", { cost: 10 });
    assert.equal(await crypto.verifyPassword("hunter2", stored), true);
    assert.equal(await crypto.verifyPassword("hunter3", stored), false);
  });

  it("decrypt refuses a shortened authentication tag", () => {
    const key = crypto.generateKey();
    const parts = crypto.encrypt("secret", key).split(".");
    parts[3] = Buffer.from(parts[3], "base64url").subarray(0, 4).toString("base64url");
    assert.equal(codeOf(() => crypto.decrypt(parts.join("."), key)), "ERR_DECRYPT");
    assert.equal(codeOf(() => crypto.decrypt("garbage", key)), "ERR_DECRYPT");
    assert.equal(codeOf(() => crypto.decrypt(/** @type {any} */ (undefined), key)), "ERR_DECRYPT");
    assert.equal(codeOf(() => crypto.decrypt(crypto.encrypt("secret", key), crypto.generateKey())), "ERR_DECRYPT");
    assert.equal(crypto.decrypt(crypto.encrypt("", key), key), "");
  });

  it("reads the JWT of RFC 7515", () => {
    const key = Buffer.from("AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow", "base64url");
    const token =
      "eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    assert.equal(crypto.verifyJWT(token, key, { ignoreExpiration: true }).iss, "joe");
    assert.equal(codeOf(() => crypto.verifyJWT(token, key)), "ERR_JWT_EXPIRED");
  });

  it("a JWT needs a real secret and sane claims", () => {
    assert.throws(() => crypto.signJWT({}, ""), TypeError);
    assert.throws(() => crypto.signJWT({}, /** @type {any} */ (undefined)), TypeError);
    assert.throws(() => crypto.signJWT(/** @type {any} */ ("text"), "secret"), TypeError);
    assert.throws(() => crypto.signJWT({}, "secret", { expiresIn: "soon" }), TypeError);
    const token = crypto.signJWT({ sub: "1" }, "a-long-shared-secret");
    assert.throws(() => crypto.verifyJWT(token, ""), TypeError);
    assert.equal(codeOf(() => crypto.verifyJWT(crypto.signJWT({ exp: "never" }, "a-long-shared-secret"), "a-long-shared-secret")), "ERR_JWT_CLAIM");
    assert.equal(codeOf(() => crypto.verifyJWT(`${token}x`, "a-long-shared-secret")), "ERR_JWT_SIGNATURE");
    const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"admin"}').toString("base64url")}.`;
    assert.equal(codeOf(() => crypto.verifyJWT(unsigned, "a-long-shared-secret", { algorithms: /** @type {any} */ (["none"]) })), "ERR_JWT_ALGORITHM");
    assert.deepEqual(crypto.decodeJWT(crypto.signJWT({}, "secret-secret", { header: { kid: "k1" }, noTimestamp: true })).header, { typ: "JWT", kid: "k1", alg: "HS256" });
  });

  it("signs with a private key and verifies with the public one", async () => {
    const nodeCrypto = require("node:crypto");
    for (const algorithm of /** @type {const} */ (["EdDSA", "ES256", "ES384", "ES512", "RS256", "PS256"])) {
      const { publicKey, privateKey } = await crypto.generateKeyPair(algorithm);
      const token = crypto.signJWT({ sub: "42" }, privateKey, { algorithm, expiresIn: "1m" });
      assert.equal(crypto.verifyJWT(token, publicKey).sub, "42", algorithm);
      assert.equal(crypto.verifyJWT(token, nodeCrypto.createPublicKey(publicKey)).sub, "42", algorithm);
      assert.equal(crypto.verifyJWT(token, nodeCrypto.createPublicKey(publicKey).export({ format: "jwk" })).sub, "42", algorithm);
      assert.throws(() => crypto.signJWT({}, publicKey), TypeError, "a public key can't sign");
      assert.throws(() => crypto.signJWT({}, privateKey, { algorithm: "HS256" }), TypeError);

      // the classic attack: an HS256 token signed with the public key as its secret
      const [, body, signature] = token.split(".");
      const forged = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${body}`;
      const forgedToken = `${forged}.${nodeCrypto.createHmac("sha256", publicKey).update(forged).digest("base64url")}`;
      assert.equal(codeOf(() => crypto.verifyJWT(forgedToken, publicKey)), "ERR_JWT_ALGORITHM", algorithm);
      assert.equal(codeOf(() => crypto.verifyJWT(forgedToken, publicKey, { algorithms: ["HS256"] })), "ERR_JWT_ALGORITHM", algorithm);
      assert.equal(codeOf(() => crypto.verifyJWT(`${token.slice(0, -signature.length)}${signature.slice(0, -4)}AAAA`, publicKey)), "ERR_JWT_SIGNATURE", algorithm);
    }
    const weak = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 1024, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    assert.throws(() => crypto.signJWT({}, weak.privateKey), /2048/);
    await assert.rejects(crypto.generateKeyPair(/** @type {any} */ ("HS256")), TypeError);
  });

  it("TOTP matches the vectors of RFC 6238", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    assert.deepEqual(
      [59, 1111111109, 1234567890, 20000000000].map((seconds) => crypto.totp(secret, { digits: 8, time: seconds * 1000 })),
      ["94287082", "07081804", "89005924", "65353130"],
    );
    assert.equal(crypto.verifyTOTP("287 082", secret, { time: 59_000 }), true);
    assert.equal(crypto.verifyTOTP("287082", secret, { time: 59_000 + 90_000 }), false);
    assert.equal(crypto.verifyTOTP("287082", secret, { time: 59_000 + 90_000, window: 3 }), true);
    assert.equal(crypto.verifyTOTP(/** @type {any} */ (undefined), secret), false);
    assert.throws(() => crypto.totp(secret, { digits: 20 }), RangeError);
  });
});

describe("color", () => {
  const ESC = String.fromCharCode(27);
  const c3 = nc.color.create(3);

  it("a chain is built once and follows level changes", () => {
    const live = nc.color.create(3);
    const red = live.red.bold;
    assert.equal(live.red.bold, red);
    assert.equal(red("x"), `${ESC}[31m${ESC}[1mx${ESC}[22m${ESC}[39m`);
    live.level = 0;
    assert.equal(red("x"), "x");
    live.level = 1;
    assert.equal(live.hex("#f80")("x"), `${ESC}[93mx${ESC}[39m`);
    live.level = /** @type {any} */ (NaN);
    assert.equal(live.level, 0);
  });

  it("nested styles and line breaks keep their colors", () => {
    assert.equal(c3.red(`a ${c3.blue("b")} c`), `${ESC}[31ma ${ESC}[34mb${ESC}[39m${ESC}[31m c${ESC}[39m`);
    assert.equal(c3.bgRed("a\nb"), `${ESC}[41ma${ESC}[49m\n${ESC}[41mb${ESC}[49m`);
    assert.equal(c3.rgb(300, -5, 12.6)("x"), `${ESC}[38;2;255;0;13mx${ESC}[39m`);
    assert.equal(c3.red(1, "a", null), `${ESC}[31m1 a null${ESC}[39m`);
  });

  it("width counts what the terminal shows", () => {
    const keycap = String.fromCodePoint(0x31, 0xfe0f, 0x20e3);
    const accent = `e${String.fromCodePoint(0x301)}`;
    const zeroWidthSpace = String.fromCodePoint(0x200b);
    assert.equal(nc.color.width("héllo"), 5);
    assert.equal(nc.color.width(accent), 1);
    assert.equal(nc.color.width(keycap), 2);
    assert.equal(nc.color.width(`a${zeroWidthSpace}b`), 2);
    assert.equal(nc.color.width(c3.red("日本")), 4);
    assert.equal(nc.color.width("👨‍👩‍👧"), 2);
  });

  it("truncate cuts by columns and keeps the colors closed", () => {
    assert.equal(nc.color.truncate("hello world", 8), "hello w…");
    assert.equal(nc.color.truncate("hello", 8), "hello");
    assert.equal(nc.color.truncate("hello world", 8, { ellipsis: "..." }), "hello...");
    assert.equal(nc.color.truncate("日本語日本語", 5), "日本…");
    assert.equal(nc.color.truncate(c3.red("hello world"), 8), `${ESC}[31mhello w…${ESC}[39m`);
    const cut = nc.color.truncate(c3.red.bold(`hello ${c3.blue("wide 日本語 text")} end`), 12);
    assert.equal(nc.color.width(cut), 12);
    assert.ok(cut.endsWith(`${ESC}[22m${ESC}[39m`));
  });
});

describe("cli", () => {
  const { cli } = nc;
  const { PassThrough } = require("node:stream");
  const ESC = String.fromCharCode(27);
  const KEY = { up: `${ESC}[A`, down: `${ESC}[B`, home: `${ESC}[1~`, end: `${ESC}[4~`, pageUp: `${ESC}[5~`, enter: "\r", space: " ", ctrlC: String.fromCharCode(3), backspace: String.fromCharCode(127) };

  /** A terminal that isn't one: what the prompts write, and a way to press keys. */
  const terminal = (columns = 60) => {
    /** @type {any} */
    const input = new PassThrough();
    input.isTTY = true;
    input.setRawMode = () => input;
    /** @type {any} */
    const output = new PassThrough();
    output.isTTY = true;
    output.columns = columns;
    let written = "";
    output.on("data", (/** @type {Buffer} */ chunk) => (written += chunk));
    return {
      input,
      output,
      text: () => nc.color.strip(written),
      /** @param {string[]} keys */
      async press(...keys) {
        for (const key of keys) {
          input.write(key);
          await sleep(5);
        }
      },
    };
  };

  it("table: cells can span several lines, and big tables don't overflow the stack", () => {
    assert.equal(
      cli.table([{ name: "Ada", note: "one\ntwo" }, { name: "Bob", note: "x" }], { colors: false, border: "ascii" }),
      ["+------+------+", "| name | note |", "+------+------+", "| Ada  | one  |", "|      | two  |", "| Bob  | x    |", "+------+------+"].join("\n"),
    );
    assert.equal(cli.table([{ a: 1, b: "x|y\nz" }], { border: "markdown" }), "|   a | b         |\n| --: | --------- |\n|   1 | x\\|y<br>z |");
    assert.equal(cli.table([]), "");
    assert.equal(cli.table(Array.from({ length: 150_000 }, (_, i) => ({ i })), { colors: false }).split("\n").length, 150_004);
  });

  it("tree draws nested data", () => {
    assert.equal(
      cli.tree({ src: { "index.js": null, lib: ["a.js", "b.js"] }, "package.json": "1.2 kB" }),
      ["├── src", "│   ├── index.js", "│   └── lib", "│       ├── a.js", "│       └── b.js", "└── package.json: 1.2 kB"].join("\n"),
    );
    assert.equal(cli.tree({ a: { b: null }, c: null }, { ascii: true }), "+-- a\n|   +-- b\n+-- c");
    /** @type {Record<string, unknown>} */
    const loop = {};
    loop.self = loop;
    assert.ok(cli.tree(loop).includes("(circular)"));
  });

  it("args: environment variables, number choices, commands", () => {
    const schema = /** @type {const} */ ({
      port: { type: "number", default: 3000, env: "PORT" },
      verbose: { type: "boolean", env: "VERBOSE" },
      tag: { type: "string", multiple: true, env: "TAGS" },
      level: { type: "number", choices: [1, 2, 3] },
    });
    assert.deepEqual(cli.args(schema, { argv: [], env: { PORT: "9000", VERBOSE: "yes", TAGS: "a, b" } }).flags, { port: 9000, verbose: true, tag: ["a", "b"], level: undefined });
    assert.equal(cli.args(schema, { argv: ["--port", "1"], env: { PORT: "9000" } }).flags.port, 1, "the command line wins");
    assert.equal(cli.args(schema, { argv: ["--level", "2"], env: {} }).flags.level, 2);
    assert.throws(() => cli.args(schema, { argv: ["--level", "9"], env: {} }), /must be one of: 1, 2, 3/);
    assert.throws(() => cli.args(schema, { argv: [], env: { PORT: "abc" } }), /Environment variable PORT expects a number/);
    assert.throws(() => cli.args(schema, { argv: ["--port"], env: {} }), /Option --port needs a value/);
    assert.deepEqual(cli.args(schema, { argv: ["--", "--verbose", "-h"], env: {} }).positionals, ["--verbose", "-h"]);

    const commands = { build: "Build the project", serve: "Start the server" };
    const parsed = cli.args(schema, { argv: ["build", "--verbose", "src"], env: {}, commands });
    assert.equal(parsed.command, "build");
    assert.deepEqual(parsed.positionals, ["src"]);
    assert.throws(() => cli.args(schema, { argv: ["biuld"], env: {}, commands }), /Unknown command "biuld"\. Did you mean build\?/);
    assert.match(parsed.help(), /Commands:\n {2}build {2}Build the project/);
    assert.match(parsed.help(), /\[env: PORT\]/);
  });

  it("select: arrows skip disabled choices, and the list folds into the answer", async () => {
    const t = terminal();
    const pending = cli.select("Pick", ["a", { label: "b", value: "B", disabled: true }, "c"], { input: t.input, output: t.output });
    await t.press(KEY.down, KEY.enter);
    assert.equal(await pending, "c");
    assert.equal(t.text().trim().split("\n").at(-1), "✔ Pick c");
  });

  it("select: Home, End and Page keys, and nothing wider than the terminal", async () => {
    const items = Array.from({ length: 30 }, (_, i) => `item ${i} with a label that is far too long for this terminal`);
    const t = terminal(24);
    const pending = cli.select("Pick", items, { input: t.input, output: t.output, pageSize: 5 });
    await t.press(KEY.end, KEY.pageUp, KEY.up, KEY.home, KEY.up, KEY.enter);
    assert.equal(await pending, items[29]);
    const widest = Math.max(...t.text().split(/[\r\n]+/).map((line) => nc.color.width(line)));
    assert.ok(widest <= 23, `a line was ${widest} columns wide`);
  });

  it("multiselect: space, a for all, and the minimum", async () => {
    const t = terminal();
    const pending = cli.multiselect("Pick", ["a", { label: "b", value: "b", disabled: true }, "c"], { input: t.input, output: t.output, min: 1 });
    await t.press(KEY.enter, "a", KEY.enter);
    assert.deepEqual(await pending, ["a", "c"]);
    assert.ok(t.text().includes("Select at least 1"));
  });

  it("Ctrl+C in a prompt rejects with an AbortError", async () => {
    const t = terminal();
    const picking = assert.rejects(cli.select("Pick", ["a", "b"], { input: t.input, output: t.output }), { name: "AbortError" });
    await t.press(KEY.ctrlC);
    await picking;
    const typing = assert.rejects(cli.password("Token?", { input: t.input, output: t.output }), { name: "AbortError" });
    await t.press("x", KEY.ctrlC);
    await typing;
    await assert.rejects(cli.select("Pick", [{ label: "a", value: 1, disabled: true }]), RangeError);
  });

  it("password ignores arrow keys and handles backspace", async () => {
    const t = terminal();
    const pending = cli.password("Token?", { input: t.input, output: t.output });
    await t.press("s", "3", KEY.up, "x", KEY.backspace, "c", KEY.enter);
    assert.equal(await pending, "s3c");
    assert.ok(!t.text().includes("s3c"));
  });

  it("spin reports how the work ended", async () => {
    const quiet = () => {
      const stream = /** @type {any} */ (new PassThrough());
      let written = "";
      stream.on("data", (/** @type {Buffer} */ chunk) => (written += chunk));
      return { stream, lines: () => nc.color.strip(written).trim().split("\n") };
    };
    const ok = quiet();
    assert.equal(await cli.spin("Loading", async () => 42, { stream: ok.stream, success: (n) => `Got ${n}` }), 42);
    assert.deepEqual(ok.lines(), ["- Loading", "✔ Got 42"]);
    const bad = quiet();
    await assert.rejects(cli.spin("Loading", Promise.reject(new Error("boom")), { stream: bad.stream, fail: (error) => `Nope: ${/** @type {Error} */ (error).message}` }), { message: "boom" });
    assert.deepEqual(bad.lines(), ["- Loading", "✖ Nope: boom"]);
  });

  it("progress shows a label as it is, whatever it contains", () => {
    const stream = /** @type {any} */ (new PassThrough());
    let written = "";
    stream.on("data", (/** @type {Buffer} */ chunk) => (written += chunk));
    cli.progress({ total: 2, stream, format: "{percent}% {label} {label}", label: "$& $1" }).update(2).stop();
    assert.equal(nc.color.strip(written), "100% $& $1 $& $1\n");
  });
});

describe("sys", () => {
  const { sys } = nc;
  const node = process.execPath;

  it("a timeout also stops what the command started", async () => {
    const os = require("node:os");
    const path = require("node:path");
    const fs = require("node:fs");
    const pidFile = path.join(fs.realpathSync(os.tmpdir()), `nc-tree-${process.pid}.pid`);
    const script = "require('fs').writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)";
    // exec goes through a shell: the script is the grandchild
    await assert.rejects(sys.exec(`"${node}" -e "${script}" "${pidFile}"`, { timeout: 3000 }), { timedOut: true });
    const pid = Number(fs.readFileSync(pidFile, "utf8"));
    fs.rmSync(pidFile, { force: true });
    let alive = true;
    for (let i = 0; i < 40 && alive; i++) {
      await sleep(100);
      try {
        process.kill(pid, 0);
      } catch {
        alive = false;
      }
    }
    if (alive) process.kill(pid);
    // Without a process group, a POSIX shell may leave the script running: Windows is where this used to leak.
    if (process.platform === "win32") assert.equal(alive, false, "the script outlived its shell");
  });

  it("a timeout that can't be read is refused", async () => {
    await assert.rejects(sys.run(node, ["-e", "1"], { timeout: "soon" }), TypeError);
    assert.equal((await sys.run(node, ["-e", "console.log('ok')"], { timeout: "30s" })).stdout, "ok");
  });

  it("env replaces a variable whatever its case on Windows, and undefined removes it", async () => {
    process.env.NC_HARDENING_GONE = "here";
    try {
      const { stdout } = await sys.run(node, ["-e", "console.log(String(process.env.NC_HARDENING_GONE) + ' ' + Object.keys(process.env).filter((k) => k.toUpperCase() === 'PATH').length)"], {
        env: { NC_HARDENING_GONE: undefined, PATH: process.env.PATH },
      });
      assert.equal(stdout, "undefined 1");
    } finally {
      delete process.env.NC_HARDENING_GONE;
    }
  });

  it("which answers the same question quickly the second time", () => {
    const first = sys.which("node");
    assert.ok(first);
    assert.equal(sys.which("node"), first);
    assert.equal(sys.which(""), undefined);
    assert.equal(sys.which(/** @type {any} */ (undefined)), undefined);
  });

  it("shutdown runs the handlers with the reason, last one first", async () => {
    const sysPath = JSON.stringify(require.resolve("../src/Sys.js"));
    const script = `
      const sys = require(${sysPath});
      sys.onShutdown((reason) => console.log("first", reason));
      sys.onShutdown(async (reason) => { await new Promise((done) => setTimeout(done, 20)); console.log("second", reason); }, { timeout: "5s" });
      sys.shutdown(3);
    `;
    const result = await sys.run(node, ["-e", script], { reject: false });
    assert.deepEqual(result.stdout.split(/\r?\n/), ["second shutdown", "first shutdown"]);
    assert.equal(result.exitCode, 3);
  });

  it("freePort and localIP", async () => {
    const net = require("node:net");
    const server = net.createServer().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const taken = /** @type {import("node:net").AddressInfo} */ (server.address()).port;
    try {
      const other = await sys.freePort(taken);
      assert.notEqual(other, taken);
      assert.ok(other > 0 && other < 65536);
      assert.ok((await sys.freePort()) > 0);
      await assert.rejects(sys.freePort(70_000), RangeError);
    } finally {
      server.close();
    }
    const ip = sys.localIP();
    assert.ok(ip === undefined || net.isIPv4(ip));
  });
});

describe("env", () => {
  const { env } = nc;

  it("a variable named like something every object has is still a variable", () => {
    assert.deepEqual(env.parse("A=${toString}\nB=${constructor}", { env: {} }), { A: "", B: "" });
    assert.deepEqual(Object.keys(env.parse("__proto__=x\nconstructor=y")), ["__proto__", "constructor"]);
    assert.deepEqual(env.parse("toString=y\nA=${toString}", { env: {} }), { toString: "y", A: "y" });
    assert.throws(() => env.string("toString", { env: {} }), /is required but is not set/);
    assert.equal(env.get("toString", "fallback"), "fallback");
    assert.equal(env.has("constructor"), false);
  });

  it("a later plain value isn't treated as the earlier single-quoted one", () => {
    assert.deepEqual(env.parse("A='$X'\nA=$X", { env: { X: "expanded" } }), { A: "expanded" });
  });

  it("load: the first file wins, cascade adds the files that go with it", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "nc-env-"));
    const write = (/** @type {string} */ name, /** @type {string} */ text) => fs.writeFileSync(path.join(dir, name), text);
    write(".env", "A=base\nB=base\nC=base\nREF=${A}-ref");
    write(".env.local", "B=local");
    write(".env.production", "B=prod\nC=prod");
    write(".env.production.local", "D=prod-local");
    const file = path.join(dir, ".env");
    try {
      /** @type {Record<string, string>} */
      let target = { A: "already" };
      assert.deepEqual(env.load([path.join(dir, ".env.local"), file], { target, override: true }), { B: "local", A: "base", C: "base", REF: "base-ref" });
      assert.deepEqual(target, { A: "base", B: "local", C: "base", REF: "base-ref" });
      target = {};
      assert.deepEqual(env.load(file, { target, cascade: "production" }), { D: "prod-local", B: "local", C: "prod", A: "base", REF: "base-ref" });
      assert.equal(env.load(file, { target: {}, cascade: "test" }).B, "base", ".env.local is left out of tests");
      assert.throws(() => env.load(path.join(dir, ".nope"), { target: {}, required: true }), /not found/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("example writes a file that parse reads back", () => {
    const spec = /** @type {const} */ ({
      PORT: { type: "port", default: 3000, description: "Port to listen on" },
      DATABASE_URL: { type: "url", description: "Postgres connection string" },
      GREETING: { type: "string", default: "hello world # not a comment" },
      QUOTE: { type: "string", default: "it's $5" },
      TAGS: { type: "list", default: ["a", "b"] },
      SENTRY_DSN: { type: "url", optional: true },
    });
    const text = env.example(spec);
    assert.ok(text.startsWith("# Port to listen on\n# port, default: 3000\nPORT=3000\n\n# Postgres connection string\n# url, required\nDATABASE_URL=\n"));
    assert.ok(text.includes("# url, optional\nSENTRY_DSN=\n"));
    assert.deepEqual(env.parse(text, { expand: false }), { PORT: "3000", DATABASE_URL: "", GREETING: "hello world # not a comment", QUOTE: "it's $5", TAGS: "a,b", SENTRY_DSN: "" });
    assert.throws(() => env.validate(spec, { env: {} }), /DATABASE_URL: is required but is not set \(Postgres connection string\)/);
  });
});

describe("http", () => {
  const { http } = nc;
  const nodeHttp = require("node:http");
  /** @type {import("node:http").Server} */
  let server;
  let base = "";
  /** @type {Array<{ method: string, url: string, headers: import("node:http").IncomingHttpHeaders }>} */
  let seen = [];

  before(async () => {
    server = nodeHttp.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      seen.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers });
      const json = (/** @type {number} */ status, /** @type {unknown} */ body) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname.startsWith("/echo")) return json(200, { url: req.url, headers: req.headers });
      if (url.pathname === "/cookies") {
        res.writeHead(200, { "set-cookie": ["a=1; Path=/", "b=2; HttpOnly"], "content-type": "text/plain" });
        return res.end("ok");
      }
      if (url.pathname === "/slow-body") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.write("start ");
        return void setTimeout(() => res.end("end"), 250);
      }
      if (url.pathname === "/busy") {
        req.resume();
        return json(503, { error: "busy" });
      }
      if (url.pathname === "/user") return json(200, url.searchParams.get("bad") ? { id: "nope" } : { id: 7, name: "Ada" });
      if (url.pathname === "/cut") {
        res.writeHead(200, { "content-length": "1000", "content-type": "application/octet-stream" });
        res.write("partial");
        return void setTimeout(() => res.destroy(), 30);
      }
      if (url.pathname === "/file") {
        res.writeHead(200, { "content-length": "5" });
        return res.end("hello");
      }
      json(404, { error: "not found" });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
    base = `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}`;
  });
  after(() => {
    server.closeAllConnections();
    server.close();
  });

  it("params fill the :name parts of the URL, and leave the port alone", async () => {
    const { data } = await http.get(`${base}/echo/:id/files/:name`, { params: { id: 42, name: "a b/c" } });
    assert.equal(data.url, "/echo/42/files/a%20b%2Fc");
    await assert.rejects(http.get(`${base}/echo/:id`, { params: {} }), /Missing URL parameter "id"/);
  });

  it("a call adds to the client's query and headers instead of replacing them", async () => {
    const api = http.create({ baseURL: base, query: { key: "k", page: 1 }, headers: { "X-Trace": "t", "X-Drop": "d" } });
    const { data } = await api.get("echo", { query: { page: 2, since: new Date("2024-01-01T00:00:00Z"), tag: ["a", "b"] }, headers: new Headers({ "x-drop": "replaced", "X-More": "m" }) });
    assert.equal(data.url, "/echo?key=k&page=2&since=2024-01-01T00%3A00%3A00.000Z&tag=a&tag=b");
    assert.equal(data.headers["x-trace"], "t");
    assert.equal(data.headers["x-drop"], "replaced");
    assert.equal(data.headers["x-more"], "m");
    const pairs = await http.get(`${base}/echo`, { headers: [["X-Pair", "p"]] });
    assert.equal(pairs.data.headers["x-pair"], "p");
  });

  it("every Set-Cookie header is kept", async () => {
    const { cookies } = await http.get(`${base}/cookies`);
    assert.deepEqual(cookies, ["a=1; Path=/", "b=2; HttpOnly"]);
  });

  it("a stream is not cut off by the timeout once the headers are in", async () => {
    const { data } = await http.get(`${base}/slow-body`, { responseType: "stream", timeout: 100 });
    let text = "";
    for await (const chunk of data) text += chunk;
    assert.equal(text, "start end");
    await assert.rejects(http.get(`${base}/slow-body`, { timeout: 100, retry: false }), { name: "TimeoutError", timeout: 100 });
  });

  it("an error status is read whole even when a stream was asked for", async () => {
    const error = await http.get(`${base}/nope`, { responseType: "stream" }).catch((e) => e);
    assert.equal(error.status, 404);
    assert.deepEqual(error.data, { error: "not found" });
  });

  it("a request that sends a stream is never sent twice", async () => {
    const { Readable } = require("node:stream");
    seen = [];
    await assert.rejects(http.put(`${base}/busy`, Readable.from(["a", "b"]), { retry: { attempts: 3, delay: 1 } }), { status: 503 });
    assert.equal(seen.length, 1);
    seen = [];
    await assert.rejects(http.put(`${base}/busy`, { a: 1 }, { retry: { attempts: 3, delay: "1ms", jitter: true } }), { status: 503 });
    assert.equal(seen.length, 3);
  });

  it("schema checks what the server sent", async () => {
    const User = nc.schema.object({ id: nc.schema.number(), name: nc.schema.string() });
    assert.deepEqual((await http.get(`${base}/user`, { schema: User })).data, { id: 7, name: "Ada" });
    await assert.rejects(http.get(`${base}/user`, { schema: User, query: { bad: 1 } }), { name: "ValidationError" });
  });

  it("aborting while waiting to retry stops at once", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    const startedAt = Date.now();
    await assert.rejects(http.get(`${base}/busy`, { retry: { attempts: 3, delay: "5s" }, signal: controller.signal }), { name: "AbortError" });
    assert.ok(Date.now() - startedAt < 2000);
  });

  it("download leaves nothing behind when the transfer breaks", async () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "nc-http-"));
    try {
      const target = path.join(dir, "out", "file.bin");
      fs.mkdirSync(path.dirname(target));
      fs.writeFileSync(target, "previous version");
      await assert.rejects(http.download(`${base}/cut`, target, { retry: false }));
      assert.equal(fs.readFileSync(target, "utf8"), "previous version", "the file that was there is untouched");
      assert.deepEqual(fs.readdirSync(path.dirname(target)), ["file.bin"]);
      const done = await http.download(`${base}/file`, target);
      assert.equal(done.size, 5);
      assert.equal(fs.readFileSync(target, "utf8"), "hello");
      assert.deepEqual(fs.readdirSync(path.dirname(target)), ["file.bin"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("schema", () => {
  const s = nc.schema;
  /**
   * @param {import("..").Schema<any>} schema
   * @param {unknown} value
   */
  const issuesOf = (schema, value) => (schema.safeParse(value).issues ?? []).map((issue) => `${issue.path.join(".")}: ${issue.code}`);

  it("issues keep the right path however deep they are", () => {
    const schema = s.object({ list: s.array(s.object({ pair: s.tuple([s.string(), s.number()]), tags: s.record(s.number()) })) });
    assert.deepEqual(issuesOf(schema, { list: [{ pair: ["a", 1], tags: {} }, { pair: ["a", "b"], tags: { x: "y" } }] }), ["list.1.pair.1: invalid_type", "list.1.tags.x: invalid_type"]);
    const form = s.object({ password: s.string(), confirm: s.string() }).refine((value) => value.password === value.confirm, { message: "Mismatch", path: ["confirm"] });
    assert.deepEqual(issuesOf(s.object({ form }), { form: { password: "a", confirm: "b" } }), ["form.confirm: custom"]);
  });

  it("safeParse gives the issues at once and builds the error on demand", () => {
    const result = s.object({ name: s.string() }).safeParse({});
    assert.equal(result.success, false);
    assert.deepEqual(result.issues?.map((issue) => issue.code), ["invalid_type"]);
    assert.ok(result.error instanceof nc.errors.ValidationError);
    assert.equal(result.error, result.error);
    assert.equal(JSON.parse(JSON.stringify(result)).error.name, "ValidationError");
    assert.ok("error" in { ...result });
  });

  it("names every object inherits are not read as data", () => {
    assert.deepEqual(s.object({ toString: s.string().optional(), constructor: s.string().optional() }).parse({}), {});
    assert.deepEqual(issuesOf(s.object({ a: s.string() }).strict(), { a: "x", constructor: 1, toString: 2 }), [": unrecognized_keys"]);
    const kept = s.object({ a: s.string() }).passthrough().parse(JSON.parse('{"a":"x","b":1,"__proto__":{"admin":true}}'));
    assert.deepEqual(Object.keys(kept), ["a", "b"]);
    assert.equal(/** @type {any} */ (kept).admin, undefined);
  });

  it("pick, omit, partial and extend keep strict()", () => {
    const Strict = s.object({ a: s.string(), b: s.number() }).strict();
    assert.deepEqual(issuesOf(Strict.partial(), { x: 1 }), [": unrecognized_keys"]);
    assert.deepEqual(issuesOf(Strict.pick(["a"]), { a: "x", x: 1 }), [": unrecognized_keys"]);
    assert.deepEqual(issuesOf(Strict.omit(["a"]), { b: 1, x: 1 }), [": unrecognized_keys"]);
    assert.deepEqual(issuesOf(Strict.extend({ c: s.boolean() }), { a: "x", b: 1, c: true, x: 1 }), [": unrecognized_keys"]);
  });

  it("an object default is a fresh copy each time", () => {
    const schema = s.object({ list: s.array(s.string()).default([]), meta: s.object({ n: s.number() }).default({ n: 1 }) });
    const first = schema.parse({});
    first.list.push("x");
    first.meta.n = 9;
    assert.deepEqual(schema.parse({}), { list: [], meta: { n: 1 } });
  });

  it("required, merge and keyof", () => {
    const User = s.object({ name: s.string(), age: s.number().optional() });
    assert.deepEqual(issuesOf(User.required(), { name: "a" }), ["age: invalid_type"]);
    const merged = User.merge(s.object({ age: s.string(), admin: s.boolean() }));
    assert.deepEqual(merged.parse({ name: "a", age: "old", admin: true }), { name: "a", age: "old", admin: true });
    assert.deepEqual(User.keyof().options, ["name", "age"]);
    assert.equal(User.keyof().is("email"), false);
  });

  it("pipe validates what a transformation produced", () => {
    const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));
    assert.equal(Port.parse("8080"), 8080);
    assert.deepEqual(issuesOf(Port, "abc"), [": invalid_type"]);
    assert.deepEqual(issuesOf(s.object({ port: Port }), { port: "70000" }), ["port: too_big"]);
  });

  it("discriminatedUnion goes to the schema the key names", () => {
    const Event = s.discriminatedUnion("type", [
      s.object({ type: s.literal("click"), x: s.number() }),
      s.object({ type: s.enum(["key", "keyup"]), key: s.string() }),
    ]);
    assert.deepEqual(Event.parse({ type: "keyup", key: "a", extra: 1 }), { type: "keyup", key: "a" });
    assert.deepEqual(issuesOf(Event, { type: "click" }), ["x: invalid_type"]);
    assert.deepEqual(issuesOf(Event, { type: "nope" }), ["type: invalid_union_discriminator"]);
    assert.deepEqual(issuesOf(Event, "text"), [": invalid_type"]);
    assert.throws(() => s.discriminatedUnion("type", [s.object({ a: s.string() })]), TypeError);
    assert.throws(() => s.discriminatedUnion("t", [s.object({ t: s.literal("a") }), s.object({ t: s.literal("a") })]), /two options/);
  });

  it("new string and number rules", () => {
    assert.equal(s.string().date().is("2024-02-29"), true);
    assert.equal(s.string().date().is("2024-02-30"), false);
    assert.equal(s.string().date().is("2024-2-9"), false);
    assert.equal(s.string().slug().is("my-post"), true);
    assert.equal(s.string().slug().is("My Post"), false);
    assert.equal(s.string().hex().is("c0ffee"), true);
    assert.equal(s.string().base64().is("aGVsbG8="), true);
    assert.equal(s.string().ulid().is("01HQ3Z8K9V3N5W7Y2XJ4T6R8PB"), true);
    assert.equal(s.string().semver().is("1.2"), false);
    assert.equal(s.string().hostname().is("api.example.com"), true);
    assert.deepEqual([s.number().gt(0).is(0), s.number().lt(10).is(10), s.number().gt(0).lt(10).is(5)], [false, false, true]);
    assert.deepEqual([s.number().safe().is(2 ** 53), s.number().safe().is(42)], [false, true]);
    assert.deepEqual([s.literal(0).is(-0), s.literal(0).is(0), s.literal(NaN).is(NaN)], [false, true, true]);
  });

  it("toJSONSchema describes what the schema accepts", () => {
    const schema = s.object({
      name: s.string().trim().min(2).describe("Display name"),
      email: s.string().email(),
      age: s.number().int().min(18).optional(),
      score: s.number().positive().nullable(),
      role: s.enum(["admin", "user"]).default("user"),
      tags: s.array(s.string()).max(5).unique(),
      pair: s.tuple([s.string(), s.number()]),
      meta: s.record(s.boolean()),
      anything: s.any(),
    }).strict();
    assert.deepEqual(schema.toJSONSchema(), {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2, description: "Display name" },
        email: { type: "string", format: "email" },
        age: { type: "integer", minimum: 18 },
        score: { anyOf: [{ type: "number", exclusiveMinimum: 0 }, { type: "null" }] },
        role: { type: "string", enum: ["admin", "user"], default: "user" },
        tags: { type: "array", items: { type: "string" }, maxItems: 5, uniqueItems: true },
        pair: { type: "array", prefixItems: [{ type: "string" }, { type: "number" }], items: false, minItems: 2, maxItems: 2 },
        meta: { type: "object", additionalProperties: { type: "boolean" } },
        anything: {},
      },
      required: ["name", "email", "score", "tags", "pair", "meta"],
      additionalProperties: false,
    });
    /** @type {import("..").Schema<any>} */
    const Category = s.object({ name: s.string(), children: s.lazy(() => s.array(Category)).optional() });
    const json = Category.toJSONSchema();
    assert.deepEqual(json.properties.children, { $ref: "#/$defs/schema1" });
    assert.deepEqual(json.$defs.schema1.items.properties.children, { $ref: "#/$defs/schema1" });
  });
});

describe("sqlite", () => {
  /** @type {Array<import("..").SQLite>} */
  const opened = [];
  afterEach(() => {
    for (const db of opened.splice(0)) db.close();
  });
  const open = (/** @type {import("..").SQLiteOptions} */ options = {}) => {
    const db = new nc.SQLite(":memory:", options);
    opened.push(db);
    db.createTable({
      name: "users",
      columns: {
        id: { type: "INTEGER", primaryKey: true, autoincrement: true },
        email: { type: "TEXT", unique: true },
        role: { type: "TEXT", defaultValue: "user" },
        active: { type: "BOOLEAN", defaultValue: true },
        settings: { type: "JSON", defaultValue: {} },
        visits: { type: "INTEGER" },
        created_at: { type: "DATETIME", defaultValue: "CURRENT_TIMESTAMP" },
        token: { type: "TEXT", defaultExpression: "lower(hex(randomblob(4)))" },
      },
    });
    db.insert("users", { email: "ada@x.io", settings: { theme: "dark", beta: true, tags: ["a", "b"] }, visits: 1 });
    db.insertMany("users", [{ email: "bob@x.io", role: "admin", settings: { theme: "light" } }, { email: "cy@x.io", active: false }, { email: "di@x.io", settings: { theme: "dark" }, visits: 5 }]);
    return db;
  };
  /** @param {any[]} rows */
  const emails = (rows) => rows.map((row) => row.email);

  it("CURRENT_TIMESTAMP is the clock, not a piece of text", () => {
    const db = open();
    const user = db.get("users", { id: 1 });
    assert.match(user?.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.match(user?.token, /^[0-9a-f]{8}$/);
    assert.equal(Object.getPrototypeOf(user), Object.prototype);
  });

  it("filters and sorts on keys inside a JSON column", () => {
    const db = open();
    assert.deepEqual(emails(db.getAll("users", { "settings.theme": "dark" })), ["ada@x.io", "di@x.io"]);
    assert.deepEqual(emails(db.getAll("users", { "settings.beta": true })), ["ada@x.io"]);
    assert.deepEqual(emails(db.getAll("users", { "settings.tags.1": "b" })), ["ada@x.io"]);
    assert.deepEqual(emails(db.getAll("users", { "settings.theme": { in: ["light", "dark"] } }, { orderBy: [["settings.theme", "DESC"], "email"] })), ["bob@x.io", "ada@x.io", "di@x.io"]);
    assert.throws(() => db.getAll("users", { "settings.th'eme": 1 }), /Invalid JSON path/);
  });

  it("increment adds in one statement", () => {
    const db = open();
    assert.equal(db.increment("users", { visits: 2 }, { email: "ada@x.io" }).changes, 1);
    assert.equal(db.get("users", { email: "ada@x.io" })?.visits, 3);
    db.increment("users", { visits: -1 }, { email: "cy@x.io" });
    assert.equal(db.get("users", { email: "cy@x.io" })?.visits, -1, "an empty column counts as 0");
    assert.throws(() => db.increment("users", { visits: 1 }, {}), /non-empty where/);
    assert.throws(() => db.increment("users", /** @type {any} */ ({ visits: "1" }), { id: 1 }), /expects a number/);
  });

  it("onConflict ignores or replaces a clashing row", () => {
    const db = open();
    assert.throws(() => db.insert("users", { email: "ada@x.io" }), { sqliteCode: "SQLITE_CONSTRAINT_UNIQUE" });
    assert.equal(db.insert("users", { email: "ada@x.io" }, { onConflict: "ignore" }).changes, 0);
    assert.equal(db.insertMany("users", [{ email: "ada@x.io" }, { email: "new@x.io" }], { onConflict: "ignore" }).changes, 1);
    db.insert("users", { id: 2, email: "bob2@x.io" }, { onConflict: "replace" });
    assert.equal(db.get("users", { id: 2 })?.email, "bob2@x.io");
    assert.throws(() => db.insert("users", { email: "z" }, /** @type {any} */ ({ onConflict: "nope" })), /Invalid onConflict/);
  });

  it("insertMany takes rows with different columns, and any iterable", () => {
    const db = open();
    function* rows() {
      yield { email: "a@x.io" };
      yield { email: "b@x.io", role: "admin" };
      yield { email: "c@x.io" };
    }
    assert.equal(db.insertMany("users", rows()).changes, 3);
    assert.equal(db.get("users", { email: "b@x.io" })?.role, "admin");
    assert.equal(db.get("users", { email: "c@x.io" })?.role, "user");
    assert.throws(() => db.insertMany("users", [{ email: "d@x.io" }, { email: "a@x.io" }]));
    assert.equal(db.exists("users", { email: "d@x.io" }), false, "all or nothing");
  });

  it("paginate", () => {
    const db = open();
    const page = db.paginate("users", {}, { page: 2, perPage: 3, orderBy: "id" });
    assert.deepEqual({ ...page, items: emails(page.items) }, { items: ["di@x.io"], page: 2, perPage: 3, total: 4, pages: 2, hasPrev: true, hasNext: false });
    assert.equal(db.paginate("users", {}, { page: 99, perPage: 3 }).page, 2);
    assert.deepEqual(db.paginate("users", { role: "nope" }), { items: [], page: 1, perPage: 20, total: 0, pages: 1, hasPrev: false, hasNext: false });
  });

  it("reads views and temporary tables", () => {
    const db = open();
    db.exec("CREATE VIEW admins AS SELECT id, email, active FROM users WHERE role = 'admin'");
    db.exec("CREATE TEMP TABLE scratch (id INTEGER PRIMARY KEY, done BOOLEAN)");
    db.insert("scratch", { done: true });
    assert.deepEqual(db.getAll("admins"), [{ id: 2, email: "bob@x.io", active: true }]);
    assert.equal(db.count("admins"), 1);
    assert.deepEqual(db.get("scratch"), { id: 1, done: true });
    assert.equal(db.hasTable("scratch"), true);
    assert.equal(db.hasTable("admins"), false, "a view is not a table");
    assert.throws(() => db.get("nope"), /does not exist/);
  });

  it("follows the schema as it changes", () => {
    const db = open();
    db.get("users", { id: 1 });
    db.exec("ALTER TABLE users ADD COLUMN flags JSON");
    db.update("users", { flags: { a: 1 } }, { id: 1 });
    assert.deepEqual(db.get("users", { id: 1 })?.flags, { a: 1 });
    assert.throws(() => db.transaction(() => {
      db.createTable({ name: "tmp", columns: { id: { type: "INTEGER" } } });
      db.insert("tmp", { id: 1 });
      throw new Error("undo");
    }), /undo/);
    assert.throws(() => db.insert("tmp", { id: 1 }), /does not exist/);
  });

  it("transaction can take the write lock up front", () => {
    const db = open();
    assert.equal(db.transaction(() => db.count("users"), { immediate: true }), 4);
    assert.equal(db.inTransaction, false);
  });

  it("converts columns of joins where Node says where they come from, and of single tables everywhere", () => {
    const db = open();
    db.createTable({ name: "posts", columns: { id: { type: "INTEGER", primaryKey: true }, user_id: { type: "INTEGER" }, meta: { type: "JSON" }, pinned: { type: "BOOLEAN" } } });
    db.insert("posts", { id: 1, user_id: 1, meta: { tags: ["x"] }, pinned: true });
    const statement = /** @type {any} */ (db.native.prepare("SELECT 1"));
    const sql = "SELECT p.meta, p.pinned AS top, u.active FROM posts p JOIN users u ON u.id = p.user_id";
    if (typeof statement.setReturnArrays === "function" && typeof statement.columns === "function") {
      assert.deepEqual(db.queryAll(sql), [{ meta: { tags: ["x"] }, top: true, active: true }]);
    }
    assert.deepEqual(db.queryOne("SELECT * FROM posts WHERE id = ?", 1), { id: 1, user_id: 1, meta: { tags: ["x"] }, pinned: true });
    assert.deepEqual([...db.iterate("SELECT id, pinned FROM posts")], [{ id: 1, pinned: true }]);

    // what Node 22.13 offers: rows come as objects, without column descriptions
    const proto = Object.getPrototypeOf(statement);
    const saved = proto.setReturnArrays;
    proto.setReturnArrays = undefined;
    try {
      const old = open();
      assert.deepEqual(old.get("users", { id: 1 }, { columns: ["id", "active", "settings"] }), { id: 1, active: true, settings: { theme: "dark", beta: true, tags: ["a", "b"] } });
      assert.equal(Object.getPrototypeOf(old.getAll("users")[0]), Object.prototype);
      assert.deepEqual(old.queryOne("SELECT id, active FROM users WHERE id = ?", 3), { id: 3, active: false });
    } finally {
      proto.setReturnArrays = saved;
    }
  });
});

describe("logger", () => {
  const collect = () => {
    /** @type {string[]} */
    const lines = [];
    return { lines, stream: { write: (/** @type {string} */ text) => void lines.push(text.replace(/\n$/, "")) } };
  };

  it("redact masks secrets wherever they are", () => {
    const out = collect();
    const log = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, redact: ["password", "Authorization"] });
    log.info({ user: "ada", password: "hunter2", nested: { authorization: "Bearer x", list: [{ PASSWORD: 1 }] } });
    assert.ok(!out.lines[0].includes("hunter2") && !out.lines[0].includes("Bearer"));
    assert.equal((out.lines[0].match(/\[redacted\]/g) ?? []).length, 3);

    class Session {
      user = "ada";
      password = "hunter2";
      /** @type {unknown} */
      self = this;
    }
    log.info(new Session());
    assert.match(out.lines[1], /Session \{ user: 'ada', password: '\[redacted\]'/);

    const json = collect();
    nc.createLogger({ format: "json", stdout: json.stream, redact: ["token"] }).info("paid", { token: "secret", deep: { token: "x" }, amount: 3 });
    const record = JSON.parse(json.lines[0]);
    assert.deepEqual([record.token, record.deep.token, record.amount], ["[redacted]", "[redacted]", 3]);
  });

  it("onLog gets every message that passes the level, and can't break logging", () => {
    /** @type {import("..").LogEntry[]} */
    const entries = [];
    const out = collect();
    const log = nc.createLogger({ level: "info", colors: true, stdout: out.stream, stderr: out.stream, scope: "jobs", onLog: (entry) => entries.push(entry) });
    log.info("<% green done %>", 3).debug("too quiet").error("failed");
    assert.deepEqual(entries.map((entry) => [entry.level, entry.kind, entry.scope, entry.message, entry.args.length]), [
      ["info", "info", "jobs", "[jobs] ℹ INFO done  3", 2],
      ["error", "error", "jobs", "[jobs] ✖ ERROR failed", 1],
    ]);
    assert.ok(entries[0].time instanceof Date);
    const broken = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, onLog: () => {
      throw new Error("hook");
    } });
    broken.info("still written");
    assert.equal(out.lines.at(-1), "ℹ INFO still written");
  });

  it("DEBUG can name the scopes whose debug messages show", () => {
    const saved = { debug: process.env.DEBUG, level: process.env.LOG_LEVEL };
    delete process.env.LOG_LEVEL;
    const out = collect();
    /** @param {string | undefined} scope */
    const make = (scope) => nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, scope });
    try {
      process.env.DEBUG = "db,http:*,-http:static";
      for (const scope of [undefined, "db", "db:pool", "http:router", "http:static", "cache"]) make(scope).debug("x");
      assert.deepEqual(out.lines, ["[db] ● DEBUG x", "[http:router] ● DEBUG x"]);
      assert.equal(make("db").isLevelEnabled("debug"), true);
      assert.equal(make("cache").isLevelEnabled("debug"), false);
      assert.equal(make("db").setLevel("silent").isLevelEnabled("debug"), false);
      process.env.DEBUG = "*";
      assert.equal(make(undefined).getLevel(), "debug");
      process.env.DEBUG = "express:*";
      assert.equal(make(undefined).getLevel(), "info", "a DEBUG meant for another library doesn't open the floodgates");
    } finally {
      if (saved.debug === undefined) delete process.env.DEBUG;
      else process.env.DEBUG = saved.debug;
      if (saved.level !== undefined) process.env.LOG_LEVEL = saved.level;
    }
  });

  it("the timestamp follows time.setTimezone() and custom patterns", () => {
    const out = collect();
    time.setTimezone("Asia/Tokyo");
    try {
      nc.createLogger({ colors: false, stdout: out.stream }).info("x");
      assert.equal(out.lines[0].slice(1, 3), time.format(new Date(), "HH", { timeZone: "Asia/Tokyo" }));
    } finally {
      time.setTimezone(undefined);
    }
    nc.createLogger({ colors: false, stdout: out.stream, timestamp: "YYYY" }).info("a\nb");
    assert.equal(out.lines[1], `[${new Date().getFullYear()}] ℹ INFO a\n       b`);
    nc.createLogger({ colors: false, stdout: out.stream }).info("plain");
    assert.match(out.lines[2], /^\[\d\d:\d\d:\d\d\] ℹ INFO plain$/);
  });

  it("the log file comes back if its folder is removed", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "nc-log-"));
    try {
      const file = path.join(dir, "logs", "app.log");
      const log = nc.createLogger({ timestamp: false, colors: true, stdout: { write() {} }, file: { path: file, maxSize: 60, maxFiles: 2 } });
      for (let i = 0; i < 10; i++) log.info(`line number ${i}`);
      assert.deepEqual(fs.readdirSync(path.dirname(file)).sort(), ["app.log", "app.log.1", "app.log.2"]);
      assert.equal(fs.readFileSync(file, "utf8"), "ℹ INFO line number 8\nℹ INFO line number 9\n");
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
      log.info("back");
      assert.equal(fs.readFileSync(file, "utf8"), "ℹ INFO back\n");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
