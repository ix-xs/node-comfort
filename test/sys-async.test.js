"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const { sys, async } = nc;
const node = process.execPath;

describe("sys: commands", () => {
  it("run captures output and passes arguments literally", async () => {
    const tricky = 'a b & c "q" %PATH% ^x $(whoami) `id`';
    const result = await sys.run(node, ["-e", "console.log(process.argv[1]); console.error('warn')", tricky]);
    assert.equal(result.stdout, tricky);
    assert.equal(result.stderr, "warn");
    assert.equal(result.exitCode, 0);
    assert.ok(result.duration >= 0);
  });

  it("run resolves executables from PATH (npm is a .cmd on Windows)", async () => {
    const { stdout } = await sys.run("npm", ["--version"]);
    assert.match(stdout, /^\d+\.\d+\.\d+/);
  });

  it("exec runs through the shell", async () => {
    // String(): console.log of a number is colored when npm passes FORCE_COLOR down
    const { stdout } = await sys.exec(`"${node}" -e "console.log(String(1+1))"`);
    assert.equal(stdout.trim(), "2");
  });

  it("rejects with ProcessError, or not when reject is false", async () => {
    await assert.rejects(sys.run(node, ["-e", "console.error('bad'); process.exit(3)"]), (e) =>
      e instanceof nc.errors.ProcessError && e.exitCode === 3 && e.stderr === "bad");
    const { exitCode } = await sys.run(node, ["-e", "process.exit(2)"], { reject: false });
    assert.equal(exitCode, 2);
    await assert.rejects(sys.run("definitely-not-a-command-nc", []), (e) => e instanceof nc.errors.ProcessError);
  });

  it("timeout, abort, input and line callbacks", async () => {
    await assert.rejects(sys.run(node, ["-e", "setTimeout(() => {}, 10000)"], { timeout: 200 }), (e) => e.timedOut === true && e.code === "ETIMEDOUT");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    await assert.rejects(sys.run(node, ["-e", "setTimeout(() => {}, 10000)"], { signal: controller.signal }), (e) => e.name === "AbortError");
    const piped = await sys.run(node, ["-e", "process.stdin.pipe(process.stdout)"], { input: "from stdin" });
    assert.equal(piped.stdout, "from stdin");
    const lines = [];
    await sys.run(node, ["-e", "console.log('one'); console.log('two')"], { onStdout: (line) => lines.push(line) });
    assert.deepEqual(lines, ["one", "two"]);
    const env = await sys.run(node, ["-e", "console.log(process.env.NC_SYS_TEST)"], { env: { NC_SYS_TEST: "yes" } });
    assert.equal(env.stdout, "yes");
  });

  it("which, platform and info", () => {
    assert.ok(sys.which("node"));
    assert.equal(sys.which("definitely-not-a-command-nc"), undefined);
    assert.equal([sys.isWindows(), sys.isMac(), sys.isLinux()].filter(Boolean).length <= 1, true);
    const info = sys.info();
    assert.equal(info.node, process.version);
    assert.ok(info.cpus > 0 && info.memory.total > 0);
    assert.ok(sys.memory().heapUsed > 0);
    assert.equal(typeof sys.isCI(), "boolean");
  });

  it("onShutdown returns an unregister function", () => {
    const off = sys.onShutdown(() => {});
    assert.equal(typeof off, "function");
    off();
  });
});

describe("async: collections", () => {
  it("map keeps order and respects concurrency", async () => {
    let active = 0;
    let peak = 0;
    const result = await async.map([30, 10, 20, 5], async (ms, i) => {
      active++;
      peak = Math.max(peak, active);
      await nc.wait(ms);
      active--;
      return i * 2;
    }, { concurrency: 2 });
    assert.deepEqual(result, [0, 2, 4, 6]);
    assert.equal(peak, 2);
    assert.deepEqual(await async.map([], async () => 1), []);
  });

  it("map error policies and abort", async () => {
    await assert.rejects(async.map([1, 2, 3], async (n) => { if (n === 2) throw new Error("two"); return n; }), /two/);
    await assert.rejects(
      async.map([1, 2, 3], async (n) => { if (n !== 1) throw new Error(`bad ${n}`); return n; }, { stopOnError: false }),
      (e) => e instanceof AggregateError && e.errors.length === 2,
    );
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    await assert.rejects(async.map([1, 2, 3, 4], () => nc.wait(50), { concurrency: 1, signal: controller.signal }), (e) => e.name === "AbortError");
  });

  it("forEach, filter, series, async iterables", async () => {
    const seen = [];
    await async.forEach([1, 2, 3], async (n) => seen.push(n), { concurrency: 1 });
    assert.deepEqual(seen, [1, 2, 3]);
    assert.deepEqual(await async.filter([1, 2, 3, 4], async (n) => n % 2 === 0), [2, 4]);
    assert.deepEqual(await async.series([async () => 1, () => 2]), [1, 2]);
    async function* gen() { yield 1; yield 2; }
    assert.deepEqual(await async.map(gen(), async (n) => n * 10), [10, 20]);
  });
});

describe("async: concurrency primitives", () => {
  it("limit", async () => {
    const limit = async.limit(2);
    let active = 0;
    let peak = 0;
    const task = async () => {
      active++;
      peak = Math.max(peak, active);
      await nc.wait(10);
      active--;
    };
    const all = Promise.all([1, 2, 3, 4, 5].map(() => limit(task)));
    assert.equal(limit.activeCount, 2);
    assert.equal(limit.pendingCount, 3);
    await all;
    assert.equal(peak, 2);
    await limit.onIdle();
    assert.equal(await limit(() => "value"), "value");
    await assert.rejects(limit(() => { throw new Error("sync throw"); }), /sync throw/);
  });

  it("queue with priorities, pause and timeout", async () => {
    const order = [];
    const q = async.queue({ concurrency: 1, autoStart: false });
    q.add(() => order.push("low"));
    q.add(() => order.push("high"), { priority: 10 });
    q.add(() => order.push("mid"), { priority: 5 });
    assert.equal(q.size, 3);
    assert.equal(q.isPaused, true);
    q.start();
    await q.onIdle();
    assert.deepEqual(order, ["high", "mid", "low"]);
    const slow = async.queue({ timeout: 20 });
    await assert.rejects(slow.add(() => nc.wait(200)), (e) => e instanceof nc.errors.TimeoutError);
    assert.deepEqual(await async.queue({ concurrency: 2 }).addAll([() => 1, async () => 2]), [1, 2]);
  });

  it("mutex serializes sections", async () => {
    const lock = async.mutex();
    const log = [];
    await Promise.all([1, 2, 3].map((n) => lock.run(async () => {
      log.push(`start ${n}`);
      await nc.wait(5);
      log.push(`end ${n}`);
    })));
    assert.deepEqual(log, ["start 1", "end 1", "start 2", "end 2", "start 3", "end 3"]);
    const release = await lock.lock();
    assert.equal(lock.isLocked, true);
    release();
    await nc.wait(0);
    assert.equal(lock.isLocked, false);
  });
});

describe("async: promises", () => {
  it("deferred, settle, props", async () => {
    const d = async.deferred();
    setTimeout(() => d.resolve(42), 5);
    assert.equal(await d.promise, 42);
    assert.equal(d.settled, true);
    const { fulfilled, rejected } = await async.settle([Promise.resolve(1), Promise.reject(new Error("x")), 3]);
    assert.deepEqual(fulfilled, [1, 3]);
    assert.equal(rejected[0].message, "x");
    assert.deepEqual(await async.props({ a: Promise.resolve(1), b: 2 }), { a: 1, b: 2 });
  });

  it("poll resolves, times out and aborts", async () => {
    let n = 0;
    assert.equal(await async.poll(() => (++n >= 3 ? "ready" : false), { interval: 5 }), "ready");
    let tries = 0;
    assert.equal(await async.poll(() => { if (++tries < 2) throw new Error("not yet"); return true; }, { interval: 5 }), true);
    await assert.rejects(async.poll(() => false, { interval: 5, timeout: 30 }), (e) => e instanceof nc.errors.TimeoutError);
    await assert.rejects(async.poll(() => false, { signal: AbortSignal.abort() }), (e) => e.name === "AbortError");
  });

  it("re-exports retry, timeout and sleep", async () => {
    assert.equal(async.retry, nc.func.retry);
    assert.equal(async.timeout, nc.func.timeout);
    const start = Date.now();
    await async.sleep("20ms");
    assert.ok(Date.now() - start >= 15);
  });
});
