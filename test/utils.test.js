"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const nc = require("..");

describe("utils: wait", () => {
  it("waits for numbers and duration strings", async () => {
    let start = Date.now();
    await nc.wait(30);
    assert.ok(Date.now() - start >= 25);
    start = Date.now();
    await nc.wait("30ms");
    assert.ok(Date.now() - start >= 25);
    await assert.rejects(nc.wait("banana"), TypeError);
  });

  it("can be aborted", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);
    await assert.rejects(nc.wait(5000, { signal: controller.signal }), (e) => e instanceof nc.errors.AbortError);
    await assert.rejects(nc.wait(10, { signal: AbortSignal.abort() }), (e) => e.name === "AbortError");
  });
});

describe("utils: when", () => {
  it("triggers, respects max and payload", async () => {
    const payloads = [];
    let n = 0;
    nc.when(() => ++n >= 2, { tag: "x" }, { interval: 5, max: 2 }).on("trigger", (p) => payloads.push(p)).start();
    await nc.wait(80);
    assert.deepEqual(payloads, [{ tag: "x" }, { tag: "x" }]);
  });

  it("reports errors and timeouts, and is one-shot", async () => {
    const events = [];
    const task = nc.when(async () => { throw new Error("nope"); }, "p", { interval: 5, timeout: 40 })
      .on("error", (e) => events.push(e.message))
      .on("timeout", (p) => events.push(`timeout:${p}`))
      .start();
    await nc.wait(80);
    assert.ok(events.includes("nope"));
    assert.equal(events.at(-1), "timeout:p");
    const count = events.length;
    task.start();
    await nc.wait(30);
    assert.equal(events.length, count, "a stopped task does not restart");
  });
});

describe("utils: dontCrash", () => {
  it("only removes its own listeners", () => {
    const mine = () => {};
    process.on("uncaughtException", mine);
    const before = process.listenerCount("uncaughtException");
    const guard = nc.dontCrash();
    assert.equal(process.listenerCount("uncaughtException"), before + 1);
    guard.on("error", () => {});
    assert.equal(process.listenerCount("uncaughtException"), before + 1);
    guard.dispose();
    assert.equal(process.listenerCount("uncaughtException"), before);
    assert.ok(process.listeners("uncaughtException").includes(mine), "foreign listeners are kept");
    process.off("uncaughtException", mine);
  });

  it("calling it twice does not stack handlers", () => {
    const before = process.listenerCount("exit");
    nc.dontCrash();
    const second = nc.dontCrash();
    assert.equal(process.listenerCount("exit"), before + 1);
    second.dispose();
    assert.equal(process.listenerCount("exit"), before);
  });
});

describe("utils: JSON", () => {
  it("JSONString never throws", () => {
    assert.equal(nc.JSONString({ a: 1 }), '{\n    "a": 1\n}');
    assert.equal(nc.JSONString({ a: 1 }, 0), '{"a":1}');
    const circular = { a: 1 };
    circular.self = circular;
    assert.equal(nc.JSONString(circular, 0), '{"a":1,"self":"[Circular]"}');
    assert.equal(nc.JSONString({ big: 10n }, 0), '{"big":"10"}');
  });

  it("JSONString keeps shared references and converts Map/Set", () => {
    const shared = { x: 1 };
    assert.equal(nc.JSONString({ a: shared, b: shared, list: [shared, shared] }, 0), '{"a":{"x":1},"b":{"x":1},"list":[{"x":1},{"x":1}]}');
    assert.equal(nc.JSONString({ m: new Map([["k", 1]]), s: new Set([1, 2]) }, 0), '{"m":{"k":1},"s":[1,2]}');
    const map = new Map();
    map.set("self", map);
    assert.equal(nc.JSONString(map, 0), '{"self":"[Circular]"}');
    const deep = { level1: { level2: {} } };
    deep.level1.level2.back = deep.level1;
    assert.equal(nc.JSONString(deep, 0), '{"level1":{"level2":{"back":"[Circular]"}}}');
    assert.equal(nc.JSONString(undefined), "undefined");
    assert.equal(nc.JSONString({ when: new Date(0) }, 0), '{"when":"1970-01-01T00:00:00.000Z"}');
  });

  it("values from another realm are still recognized", () => {
    const context = vm.createContext({});
    const foreign = vm.runInContext('({ set: new Set([1, 2]), map: new Map([["a", 1]]), date: new Date(0) })', context);
    assert.equal(nc.JSONString(foreign, 0), '{"set":[1,2],"map":{"a":1},"date":"1970-01-01T00:00:00.000Z"}');
    assert.equal(nc.time.isValid(foreign.date), true);
    assert.equal(nc.time.format(foreign.date, "YYYY-MM-DD", { timeZone: "UTC" }), "1970-01-01");
    assert.equal(nc.schema.date().safeParse(foreign.date).success, true);
    assert.equal(nc.obj.equal(foreign.map, new Map([["a", 1]])), true);
  });

  it("JSONParse with and without fallback", () => {
    assert.deepEqual(nc.JSONParse('{"a":1}'), { a: 1 });
    assert.equal(nc.JSONParse("oops", null), null);
    assert.throws(() => nc.JSONParse("oops"), SyntaxError);
  });
});
