"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { Cache, Emitter } = nc;

describe("Cache", () => {
  it("get, set, has, delete, peek", () => {
    const cache = new Cache();
    cache.set("a", 1).set("b", 2);
    assert.equal(cache.get("a"), 1);
    assert.equal(cache.peek("b"), 2);
    assert.equal(cache.has("a"), true);
    assert.equal(cache.delete("a"), true);
    assert.equal(cache.delete("a"), false);
    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.size, 1);
  });

  it("evicts the least recently used entry", () => {
    const removed = [];
    const cache = new Cache({ max: 2, onRemove: (key, value, reason) => removed.push([key, reason]) });
    cache.set("a", 1).set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    assert.deepEqual(cache.keys(), ["a", "c"]);
    assert.deepEqual(removed, [["b", "evict"]]);
    assert.equal(cache.stats.evictions, 1);
  });

  it("expires entries and supports sliding expiration", async () => {
    const cache = new Cache({ ttl: 30 });
    cache.set("a", 1);
    cache.set("forever", 2, { ttl: 0 });
    assert.ok(cache.ttl("a") <= 30);
    assert.equal(cache.ttl("forever"), Infinity);
    await nc.wait(50);
    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.get("forever"), 2);
    assert.equal(cache.stats.expirations, 1);
    const sliding = new Cache({ ttl: "60ms", updateAgeOnGet: true });
    sliding.set("k", 1);
    await nc.wait(40);
    assert.equal(sliding.get("k"), 1);
    await nc.wait(40);
    assert.equal(sliding.get("k"), 1, "reading restarted the ttl");
    const pruned = new Cache({ ttl: 5 });
    pruned.set("x", 1).set("y", 2);
    await nc.wait(20);
    assert.equal(pruned.prune(), 2);
  });

  it("getOrSet loads once for concurrent callers and caches nothing on failure", async () => {
    const cache = new Cache();
    let loads = 0;
    const loader = async () => {
      loads++;
      await nc.wait(10);
      return "value";
    };
    const results = await Promise.all([cache.getOrSet("k", loader), cache.getOrSet("k", loader), cache.getOrSet("k", loader)]);
    assert.deepEqual(results, ["value", "value", "value"]);
    assert.equal(loads, 1);
    assert.equal(await cache.getOrSet("k", loader), "value");
    assert.equal(loads, 1);
    await assert.rejects(cache.getOrSet("bad", async () => { throw new Error("boom"); }), /boom/);
    assert.equal(cache.has("bad"), false);
  });

  it("wrap, stats, iteration, clear", async () => {
    const cache = new Cache();
    let calls = 0;
    const square = cache.wrap(async (n) => {
      calls++;
      return n * n;
    });
    assert.equal(await square(4), 16);
    assert.equal(await square(4), 16);
    assert.equal(calls, 1);
    cache.set("x", 1);
    assert.equal(cache.stats.hits >= 1, true);
    assert.ok(cache.stats.hitRate > 0 && cache.stats.hitRate <= 1);
    assert.deepEqual([...cache].map(([k]) => k).includes("x"), true);
    assert.ok(cache.values().includes(1));
    assert.ok(cache.entries().some(([k, v]) => k === "x" && v === 1));
    cache.clear();
    assert.equal(cache.size, 0);
    assert.throws(() => new Cache({ ttl: "banana" }), TypeError);
  });
});

describe("Emitter", () => {
  it("on, once, off, emit, onAny", () => {
    const emitter = new Emitter();
    const log = [];
    const off = emitter.on("msg", (a, b) => log.push(`on:${a}${b}`));
    emitter.once("msg", (a) => log.push(`once:${a}`));
    const offAny = emitter.onAny((event, a) => log.push(`any:${event}:${a}`));
    assert.equal(emitter.emit("msg", "x", "y"), true);
    emitter.emit("msg", "z", "");
    off();
    offAny();
    assert.equal(emitter.emit("msg", "gone"), false);
    assert.deepEqual(log, ["on:xy", "once:x", "any:msg:x", "on:z", "any:msg:z"]);
    assert.equal(emitter.listenerCount("msg"), 0);
  });

  it("emit propagates listener errors; emitAsync awaits listeners", async () => {
    const emitter = new Emitter();
    emitter.on("boom", () => { throw new Error("listener failed"); });
    assert.throws(() => emitter.emit("boom"), /listener failed/);
    const hooks = new Emitter();
    const order = [];
    hooks.on("save", async (record) => {
      await nc.wait(10);
      order.push(`first ${record}`);
      return 1;
    });
    hooks.on("save", (record) => {
      order.push(`second ${record}`);
      return 2;
    });
    assert.deepEqual(await hooks.emitAsync("save", "r1"), [1, 2]);
    assert.deepEqual(order, ["first r1", "second r1"]);
  });

  it("waitFor with filter, timeout and abort", async () => {
    const emitter = new Emitter();
    setTimeout(() => {
      emitter.emit("data", 1);
      emitter.emit("data", 2);
    }, 5);
    assert.deepEqual(await emitter.waitFor("data", { filter: (n) => n === 2 }), [2]);
    await assert.rejects(emitter.waitFor("never", { timeout: 20 }), (e) => e instanceof nc.errors.TimeoutError);
    await assert.rejects(emitter.waitFor("never", { signal: AbortSignal.abort() }), (e) => e.name === "AbortError");
    assert.equal(emitter.listenerCount(), 0, "waitFor cleans up its listeners");
  });

  it("iterate with for await", async () => {
    const emitter = new Emitter();
    setTimeout(() => {
      emitter.emit("job", "a");
      emitter.emit("job", "b");
      emitter.emit("job", "c");
    }, 5);
    const received = [];
    for await (const [job] of emitter.iterate("job")) {
      received.push(job);
      if (received.length === 3) break;
    }
    assert.deepEqual(received, ["a", "b", "c"]);
    assert.equal(emitter.listenerCount("job"), 0, "breaking the loop removes the listener");
  });

  it("eventNames and clear", () => {
    const emitter = new Emitter();
    emitter.on("a", () => {});
    emitter.on("b", () => {});
    assert.deepEqual(emitter.eventNames(), ["a", "b"]);
    emitter.clear("a");
    assert.deepEqual(emitter.eventNames(), ["b"]);
    emitter.clear();
    assert.equal(emitter.listenerCount(), 0);
  });
});
