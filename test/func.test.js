"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { func } = nc;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe("func: rate limiting", () => {
  it("debounce calls once with the last arguments", async () => {
    const calls = [];
    const fn = func.debounce((x) => calls.push(x), 30);
    fn(1);
    fn(2);
    fn(3);
    assert.equal(fn.pending(), true);
    await sleep(80);
    assert.deepEqual(calls, [3]);
    assert.equal(fn.pending(), false);
  });

  it("debounce leading, flush, cancel, maxWait", async () => {
    const calls = [];
    const lead = func.debounce((x) => calls.push(x), 30, { leading: true, trailing: false });
    lead("a");
    lead("b");
    await sleep(60);
    assert.deepEqual(calls, ["a"]);

    const flushed = [];
    const f = func.debounce((x) => flushed.push(x), 1000);
    f("now");
    f.flush();
    assert.deepEqual(flushed, ["now"]);
    f("never");
    f.cancel();
    await sleep(20);
    assert.deepEqual(flushed, ["now"]);

    let count = 0;
    const capped = func.debounce(() => count++, 40, { maxWait: 60 });
    const start = Date.now();
    while (Date.now() - start < 150) {
      capped();
      await sleep(10);
    }
    assert.ok(count >= 1, "maxWait forces calls during continuous activity");
    capped.cancel();
  });

  it("throttle limits the call rate and keeps a trailing call", async () => {
    const calls = [];
    const fn = func.throttle((x) => calls.push(x), 40);
    fn(1);
    fn(2);
    fn(3);
    assert.deepEqual(calls, [1]);
    await sleep(80);
    assert.deepEqual(calls, [1, 3]);
    fn.cancel();
  });
});

describe("func: caching", () => {
  it("once", () => {
    let n = 0;
    const init = func.once(() => ++n);
    assert.equal(init(), 1);
    assert.equal(init(), 1);
    assert.equal(n, 1);
  });

  it("memoize with primitive keys, delete and clear", () => {
    let calls = 0;
    const double = func.memoize((n) => {
      calls++;
      return n * 2;
    });
    assert.equal(double(5), 10);
    assert.equal(double(5), 10);
    assert.equal(calls, 1);
    assert.equal(double.delete(5), true);
    double(5);
    assert.equal(calls, 2);
    double.clear();
    assert.equal(double.cache.size, 0);
    const byResolver = func.memoize((a, b) => a + b, (a) => a);
    assert.equal(byResolver(1, 2), 3);
    assert.equal(byResolver(1, 99), 3, "custom resolver ignores the second argument");
  });

  it("memoize honours max (LRU) and ttl", async () => {
    let calls = 0;
    const fn = func.memoize((n) => ++calls && n, { max: 2 });
    fn(1);
    fn(2);
    fn(1); // 1 becomes most recent
    fn(3); // evicts 2
    assert.deepEqual([...fn.cache.keys()], [1, 3]);
    const timed = func.memoize(() => ++calls, { ttl: 20 });
    const a = timed();
    assert.equal(timed(), a);
    await sleep(40);
    assert.notEqual(timed(), a);
  });

  it("memoize does not keep rejected promises", async () => {
    let calls = 0;
    const flaky = func.memoize(async () => {
      calls++;
      if (calls === 1) throw new Error("first call fails");
      return "ok";
    });
    await assert.rejects(flaky(), /first call fails/);
    await sleep(0);
    assert.equal(await flaky(), "ok");
  });
});

describe("func: resilience", () => {
  it("retry succeeds after failures and reports retries", async () => {
    const seen = [];
    const result = await func.retry(
      async (attempt) => {
        if (attempt < 3) throw new Error(`fail ${attempt}`);
        return "ok";
      },
      { attempts: 5, delay: 5, backoff: 2, onRetry: (error, attempt, wait) => seen.push([attempt, wait]) },
    );
    assert.equal(result, "ok");
    assert.deepEqual(seen, [[1, 5], [2, 10]]);
  });

  it("retry throws the last error, honours shouldRetry and signal", async () => {
    await assert.rejects(func.retry(async () => { throw new Error("nope"); }, { attempts: 2 }), /nope/);
    let calls = 0;
    await assert.rejects(
      func.retry(async () => { calls++; throw new Error("fatal"); }, { attempts: 5, shouldRetry: () => false }),
      /fatal/,
    );
    assert.equal(calls, 1);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    await assert.rejects(
      func.retry(async () => { throw new Error("x"); }, { attempts: 100, delay: 1000, signal: controller.signal }),
      (error) => error instanceof nc.errors.AbortError,
    );
  });

  it("timeout rejects with TimeoutError and supports functions", async () => {
    await assert.rejects(func.timeout(sleep(100), 10), (error) => error instanceof nc.errors.TimeoutError && error.timeout === 10);
    await assert.rejects(func.timeout(sleep(100), 10, "too slow"), /too slow/);
    assert.equal(await func.timeout(Promise.resolve("fast"), 50), "fast");
    assert.equal(await func.timeout(() => "sync value", 50), "sync value");
  });

  it("delay, to, attempt, promisify", async () => {
    assert.equal(await func.delay((a, b) => a + b, 5, 2, 3), 5);
    assert.deepEqual(await func.to(Promise.resolve(1)), [null, 1]);
    const [error] = await func.to(Promise.reject(new Error("x")));
    assert.equal(error.message, "x");
    const [syncError] = await func.to(() => { throw new Error("sync"); });
    assert.equal(syncError.message, "sync");
    const safeParse = func.attempt(JSON.parse);
    assert.deepEqual(await safeParse('{"a":1}'), [null, { a: 1 }]);
    assert.ok((await safeParse("{bad"))[0] instanceof SyntaxError);
    const promised = func.promisify((a, cb) => cb(null, a + 1));
    assert.equal(await promised(1), 2);
    const failing = func.promisify((cb) => cb(new Error("cb error")));
    await assert.rejects(failing(), /cb error/);
  });
});

describe("func: composition", () => {
  it("pipe and compose", () => {
    assert.equal(func.pipe((s) => s.trim(), (s) => s.toUpperCase())("  hi  "), "HI");
    assert.equal(func.pipe((a, b) => a + b, (n) => n * 2)(1, 2), 6);
    assert.equal(func.pipe()(7), 7);
    const fns = [(s) => s + "!", (s) => s.toUpperCase()];
    assert.equal(func.compose(...fns)("hi"), "HI!");
    assert.equal(fns.length, 2, "compose does not mutate its arguments");
  });

  it("curry, partial, negate, after, before, noop, identity", () => {
    const add = func.curry((a, b, c) => a + b + c);
    assert.equal(add(1)(2)(3), 6);
    assert.equal(add(1, 2)(3), 6);
    const hello = func.partial((greeting, name) => `${greeting}, ${name}!`, "Hello");
    assert.equal(hello("Ada"), "Hello, Ada!");
    assert.equal(func.negate((n) => n > 1)(0), true);
    const third = func.after(3, () => "go");
    assert.deepEqual([third(), third(), third()], [undefined, undefined, "go"]);
    let n = 0;
    const limited = func.before(3, () => ++n);
    assert.deepEqual([limited(), limited(), limited(), limited()], [1, 2, 2, 2]);
    assert.equal(func.noop(1, 2), undefined);
    assert.deepEqual([0, 1, 2].filter(func.identity), [1, 2]);
  });

  it("destructured functions keep working (no `this` dependency)", () => {
    const { compose, pipe } = func;
    assert.equal(compose((x) => x + 1)(1), 2);
    assert.equal(pipe((x) => x * 2)(2), 4);
  });
});
