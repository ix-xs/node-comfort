"use strict";

// The 3.0 polish pass: consistent counters, error codes, signals, synonyms
// and chaining. Every old form keeps working, some of them with a warning.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough, Writable } = require("node:stream");
const nc = require("..");
const { message, code } = require("../src/internal/deprecate.js");

/**
 * Runs `fn` and returns the warnings it emitted.
 * @param {() => unknown} fn
 * @returns {Array<{ message: string, code: string | undefined }>}
 */
const warningsOf = (fn) => {
  /** @type {Array<{ message: string, code: string | undefined }>} */
  const seen = [];
  const original = process.emitWarning;
  process.emitWarning = /** @type {any} */ ((/** @type {any} */ warning, /** @type {any} */ options) => {
    seen.push({ message: String(warning), code: options?.code });
  });
  try {
    fn();
  } finally {
    process.emitWarning = original;
  }
  return seen;
};

const sink = () => new Writable({ write: (_chunk, _encoding, done) => done() });
const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("async counters", () => {
  it("queue: activeCount and pendingCount, and the old names warn once", async () => {
    const queue = nc.async.queue({ concurrency: 1 });
    /** @type {() => void} */
    let release = () => {};
    const first = queue.add(() => new Promise((resolve) => (release = () => resolve(1))));
    const second = queue.add(() => 2);
    assert.equal(queue.activeCount, 1);
    assert.equal(queue.pendingCount, 1);
    assert.ok(!Object.keys(queue).includes("size") && !Object.keys(queue).includes("pending"));
    /** @type {number[]} */
    const old = [];
    const warnings = warningsOf(() => {
      old.push(queue.size, queue.pending, queue.size);
    });
    assert.deepEqual(old, [1, 1, 1]);
    assert.deepEqual(warnings.map((w) => w.code), ["NODE_COMFORT_DEP_QUEUE_SIZE", "NODE_COMFORT_DEP_QUEUE_PENDING"]);
    assert.equal(warnings[0].message, message("queue.size", "queue.pendingCount", 1));
    await tick();
    release();
    assert.deepEqual(await Promise.all([first, second]), [1, 2]);
    // live values, not the ones read the first time
    assert.equal(queue.size, 0);
    assert.equal(queue.pending, 0);
  });

  it("limiter: clear(), and clearQueue warns once", async () => {
    const limit = nc.async.limit(1);
    /** @type {() => void} */
    let release = () => {};
    void limit(() => new Promise((resolve) => (release = () => resolve(undefined))));
    void limit(() => 1);
    await tick();
    assert.equal(limit.activeCount, 1);
    assert.equal(limit.pendingCount, 1);
    limit.clear();
    assert.equal(limit.pendingCount, 0);
    const warnings = warningsOf(() => {
      assert.equal(limit.clearQueue, limit.clear);
      limit.clearQueue();
    });
    assert.deepEqual(warnings.map((w) => w.code), ["NODE_COMFORT_DEP_LIMITER_CLEAR_QUEUE"]);
    assert.equal(warnings[0].message, "limiter.clearQueue() is deprecated: use limiter.clear(). It will be removed in 4.0.");
    release();
  });

  it("rate limiter: activeCount, pendingCount and clear()", async () => {
    const limited = nc.async.rateLimit(1, "1h");
    /** @type {() => void} */
    let release = () => {};
    const running = limited(() => new Promise((resolve) => (release = () => resolve("done"))));
    void limited(() => "never");
    await tick();
    assert.equal(limited.activeCount, 1);
    assert.equal(limited.pendingCount, 1);
    limited.clear();
    assert.equal(limited.pendingCount, 0);
    release();
    assert.equal(await running, "done");
    assert.equal(limited.activeCount, 0);
  });
});

describe("error codes", () => {
  it("a prompt whose input ends rejects with ERR_INPUT_CLOSED", async () => {
    const input = new PassThrough();
    input.end();
    await tick();
    await assert.rejects(nc.cli.prompt("Name?", { input, output: sink() }), (error) => {
      assert.ok(error instanceof nc.errors.AbortError);
      assert.ok(error instanceof nc.errors.NodeComfortError);
      assert.equal(error.code, "ERR_INPUT_CLOSED");
      return true;
    });
  });

  it("env.load with required on a missing file: ERR_ENV_FILE_MISSING", () => {
    assert.throws(() => nc.env.load("does-not-exist.env", { required: true, target: {} }), (error) => {
      assert.ok(error instanceof nc.errors.NodeComfortError);
      assert.equal(error.code, "ERR_ENV_FILE_MISSING");
      assert.ok(error.cause);
      return true;
    });
  });

  it("sys.open on a missing path: ERR_NOT_FOUND", async () => {
    await assert.rejects(async () => nc.sys.open(path.join(os.tmpdir(), "nc-nothing-here", "x.txt")), (error) => {
      assert.ok(error instanceof nc.errors.NodeComfortError);
      assert.equal(error.code, "ERR_NOT_FOUND");
      return true;
    });
  });

  it("cli.args mistakes stay TypeErrors, with ERR_CLI_ARGS", () => {
    for (const argv of [["--nope"], ["--port", "abc"], []]) {
      assert.throws(() => nc.cli.args({ port: { type: "number", required: true } }, { argv }), (error) => {
        assert.ok(error instanceof TypeError);
        assert.equal(error.code, "ERR_CLI_ARGS");
        return true;
      });
    }
  });
});

describe("sqlite", () => {
  it("set() still works and warns once; TableDefinition.options too", () => {
    const db = nc.sqlite.open(":memory:");
    let warnings = warningsOf(() => db.createTable({ name: "t", options: { id: { type: "INTEGER", primaryKey: true }, v: { type: "TEXT" } } }));
    assert.deepEqual(warnings.map((w) => w.code), ["NODE_COMFORT_DEP_TABLE_DEFINITION_OPTIONS"]);
    assert.equal(warnings[0].message, "TableDefinition.options is deprecated: use TableDefinition.columns. It will be removed in 4.0.");
    // columns does not warn
    assert.deepEqual(warningsOf(() => db.createTable({ name: "u", columns: { id: { type: "INTEGER" } } })), []);
    warnings = warningsOf(() => {
      db.set("t", { id: 1, v: "a" });
      db.set("t", { id: 1, v: "b" });
    });
    assert.equal(db.get("t", { id: 1 })?.v, "b");
    assert.deepEqual(warnings.map((w) => w.code), ["NODE_COMFORT_DEP_DB_SET"]);
    assert.match(warnings[0].message, /^db\.set\(\) is deprecated: use db\.upsert\(table, data, conflict\) \(it needs a unique column as the conflict target\), or db\.get\(\) then db\.update\(\) or db\.insert\(\)\. It will be removed in 4\.0\.$/);
    db.close();
  });

  it("static factories match the namespaces", () => {
    const db = nc.sqlite.SQLite.open(":memory:");
    assert.ok(db instanceof nc.sqlite.SQLite);
    db.close();
    const cache = nc.cache.Cache.create({ max: 2 });
    assert.ok(cache instanceof nc.cache.Cache);
    assert.ok(nc.emitter.Emitter.create() instanceof nc.emitter.Emitter);
    // the subpaths, which export the classes
    assert.equal(require("@ix-xs/node-comfort/sqlite").open, nc.sqlite.SQLite.open);
    assert.ok(require("@ix-xs/node-comfort/cache").create() instanceof nc.cache.Cache);
    assert.ok(require("@ix-xs/node-comfort/emitter").create() instanceof nc.emitter.Emitter);
  });
});

describe("env, time and color synonyms", () => {
  it("env.boolean, env.bool deprecated, load({ overwrite })", () => {
    const env = { FLAG: "yes" };
    assert.equal(nc.env.boolean("FLAG", { env }), true);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-polish-"));
    fs.writeFileSync(path.join(dir, "a.env"), "KEY=new\n");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const kept = { KEY: "old" };
      nc.env.load("a.env", { target: kept });
      assert.equal(kept.KEY, "old");
      const overwritten = { KEY: "old" };
      nc.env.load("a.env", { target: overwritten, overwrite: true });
      assert.equal(overwritten.KEY, "new");
    } finally {
      process.chdir(cwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("time.timeZones, and every/cron stop on abort", async () => {
    assert.ok(nc.time.timeZones().includes("Europe/Paris"));
    const controller = new AbortController();
    let runs = 0;
    const job = nc.time.every(5, () => runs++, { signal: controller.signal });
    await new Promise((resolve) => setTimeout(resolve, 30));
    controller.abort();
    const seen = runs;
    assert.ok(seen > 0);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(runs, seen);
    assert.equal(job.next(), undefined);
    const cron = nc.time.cron("* * * * *", () => runs++, { signal: AbortSignal.abort(), immediate: true });
    assert.equal(cron.next(), undefined);
    assert.equal(cron.runs(), 0);
    // stop() chains
    assert.equal(job.stop(), job);
    assert.equal(cron.stop(), cron);
  });

  it("color.create({ level })", () => {
    assert.equal(nc.color.create({ level: 0 }).red("x"), "x");
    assert.equal(nc.color.create(0).red("x"), "x");
    assert.equal(nc.color.create({ level: 1 }).level, 1);
  });
});

describe("arr", () => {
  const users = [
    { name: "a", active: true },
    { name: "b", active: false },
    { name: "c", active: true },
  ];

  it("predicates accept a property name", () => {
    assert.equal(nc.arr.count(users, "active"), 2);
    assert.deepEqual(nc.arr.partition(users, "active").map((side) => side.map((u) => u.name)), [["a", "c"], ["b"]]);
    assert.deepEqual(nc.arr.remove(users, "active").map((u) => u.name), ["b"]);
    assert.deepEqual(nc.arr.takeWhile(users, "active").map((u) => u.name), ["a"]);
    assert.deepEqual(nc.arr.dropWhile(users, "active").map((u) => u.name), ["b", "c"]);
    // functions still work
    assert.equal(nc.arr.count([1, 2, 3], (n) => n > 1), 2);
  });

  it("paginate takes { page, perPage } too", () => {
    const list = Array.from({ length: 45 }, (_, i) => i);
    assert.deepEqual(nc.arr.paginate(list, { page: 2, perPage: 20 }), nc.arr.paginate(list, 2, 20));
    assert.equal(nc.arr.paginate(list, {}).perPage, 20);
  });
});

describe("chaining and off()", () => {
  it("Cache.clear() returns the cache", () => {
    const cache = nc.cache.create();
    cache.set("a", 1);
    assert.equal(cache.clear(), cache);
    assert.equal(cache.size, 0);
  });

  it("Watcher: stop() returns it, off() removes a listener", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-polish-watch-"));
    try {
      const watcher = nc.fs.watch(dir);
      assert.ok(watcher);
      const handler = () => {};
      assert.equal(watcher.on("change", handler).off("change", handler), watcher);
      assert.equal(watcher.stop(), watcher);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("WhenTask: off() and signal", async () => {
    let calls = 0;
    const handler = () => calls++;
    const task = nc.async.when(() => true, {}, { interval: 5 }).on("trigger", handler).off("trigger", handler).start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    task.stop();
    assert.equal(calls, 0);
    const controller = new AbortController();
    let triggers = 0;
    nc.async.when(() => true, {}, { interval: 5, signal: controller.signal }).on("trigger", () => triggers++).start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    controller.abort();
    const seen = triggers;
    assert.ok(seen > 0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(triggers, seen);
  });
});

describe("no limit and durations", () => {
  it("false and Infinity mean no limit", async () => {
    assert.equal(await nc.async.timeout(Promise.resolve(1), false), 1);
    assert.equal(await nc.async.timeout(Promise.resolve(1), Infinity), 1);
    let timedOut = false;
    const task = nc.async.when(() => false, {}, { interval: 5, timeout: Infinity }).on("timeout", () => (timedOut = true)).start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    task.stop();
    assert.equal(timedOut, false);
    const queue = nc.async.queue({ timeout: false });
    assert.equal(await queue.add(() => 3), 3);
    assert.equal(await nc.async.poll(() => 4, { timeout: false }), 4);
    const events = nc.emitter.create();
    const waiting = events.waitFor("x", { timeout: false });
    events.emit("x", 5);
    assert.deepEqual(await waiting, [5]);
  });

  it("spinner interval accepts duration text", () => {
    const spinner = nc.cli.spinner("x", { interval: "80ms", stream: /** @type {any} */ (sink()) });
    assert.equal(spinner.start().stop(), spinner);
  });

  it("retry jitter accepts true", async () => {
    let attempts = 0;
    const result = await nc.async.retry(() => {
      if (++attempts < 2) throw new Error("again");
      return "ok";
    }, { delay: 1, jitter: true });
    assert.equal(result, "ok");
  });
});

describe("signals", () => {
  it("async.series stops before the next task", async () => {
    const controller = new AbortController();
    const ran = [];
    await assert.rejects(
      nc.async.series([() => ran.push(1) && controller.abort(), () => ran.push(2)], { signal: controller.signal }),
      (error) => error instanceof nc.errors.AbortError,
    );
    assert.deepEqual(ran, [1]);
    assert.deepEqual(await nc.async.series([() => 1, async () => 2]), [1, 2]);
  });

  it("queue.add takes a waiting task out", async () => {
    const queue = nc.async.queue({ concurrency: 1 });
    /** @type {() => void} */
    let release = () => {};
    const first = queue.add(() => new Promise((resolve) => (release = () => resolve("first"))));
    const controller = new AbortController();
    let ran = false;
    const second = queue.add(() => (ran = true), { signal: controller.signal });
    const third = queue.add(() => "third");
    assert.equal(queue.pendingCount, 2);
    controller.abort();
    await assert.rejects(second, (error) => error instanceof nc.errors.AbortError);
    assert.equal(queue.pendingCount, 1);
    await tick();
    release();
    assert.deepEqual(await Promise.all([first, third]), ["first", "third"]);
    assert.equal(ran, false);
    await assert.rejects(queue.add(() => 1, { signal: AbortSignal.abort() }), (error) => error instanceof nc.errors.AbortError);
  });

  it("cache.getOrSet stops waiting, the load still fills the cache", async () => {
    const cache = nc.cache.create();
    const controller = new AbortController();
    /** @type {(value: number) => void} */
    let finish = () => {};
    const pending = cache.getOrSet("k", () => new Promise((resolve) => (finish = resolve)), { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (error) => error instanceof nc.errors.AbortError);
    finish(7);
    await tick();
    assert.equal(cache.get("k"), 7);
    assert.equal(await cache.getOrSet("k", () => 8, { signal: new AbortController().signal }), 7);
  });

  it("prompts reject when the signal fires, and the next question still gets its line", async () => {
    const input = new PassThrough();
    const output = sink();
    const controller = new AbortController();
    const asked = nc.cli.prompt("First?", { input, output, signal: controller.signal });
    controller.abort();
    await assert.rejects(asked, (error) => error instanceof nc.errors.AbortError && error.code === "ABORT_ERR");
    const next = nc.cli.confirm("Second?", { input, output });
    input.write("y\n");
    assert.equal(await next, true);
    await assert.rejects(nc.cli.select("Pick?", ["a", "b"], { input: /** @type {any} */ (input), output: /** @type {any} */ (output), signal: AbortSignal.abort() }), (error) => error instanceof nc.errors.AbortError);
    await assert.rejects(nc.cli.password("Secret?", { input: /** @type {any} */ (input), output: /** @type {any} */ (output), signal: AbortSignal.abort() }), (error) => error instanceof nc.errors.AbortError);
    input.end();
  });

  it("cli.spin rejects when the signal fires", async () => {
    const controller = new AbortController();
    const running = nc.cli.spin("Working", new Promise(() => {}), { signal: controller.signal, stream: /** @type {any} */ (sink()) });
    controller.abort();
    await assert.rejects(running, (error) => error instanceof nc.errors.AbortError);
  });
});

describe("locale from config", () => {
  it("str.plural and arr.toSentence follow nc.config", () => {
    const before = nc.config.get().locale;
    assert.equal(nc.arr.toSentence(["a", "b"]), "a and b");
    try {
      nc.config.set({ locale: "fr" });
      assert.equal(nc.arr.toSentence(["a", "b"]), "a et b");
      assert.equal(nc.str.plural(1234, { one: "fichier", other: "fichiers" }), "1\u202f234 fichiers");
      assert.equal(nc.arr.toSentence(["a", "b"], { locale: "en" }), "a and b");
    } finally {
      nc.config.set({ locale: before });
    }
  });
});

describe("http jitter", () => {
  it("accepts a number from 0 to 1", async () => {
    const http = require("node:http");
    let hits = 0;
    const server = http.createServer((_req, res) => {
      hits++;
      res.statusCode = hits < 2 ? 503 : 200;
      res.end("ok");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
    try {
      const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
      const res = await nc.http.get(`http://127.0.0.1:${port}/`, { retry: { attempts: 2, delay: 1, jitter: 0.3 }, responseType: "text" });
      assert.equal(res.data, "ok");
      assert.equal(hits, 2);
    } finally {
      server.close();
    }
  });
});

describe("deprecation codes", () => {
  it("follow the shared format", () => {
    assert.equal(code("queue.pending"), "NODE_COMFORT_DEP_QUEUE_PENDING");
    assert.equal(code("nc.env.bool"), "NODE_COMFORT_DEP_ENV_BOOL");
    assert.equal(code("nc.time.timezones"), "NODE_COMFORT_DEP_TIME_TIMEZONES");
  });
});

describe("3.0: fixes found by running the docs", () => {
  it("time.parse() without a pattern says what it needs", () => {
    assert.throws(() => nc.time.parse("2026-01-02"), { name: "TypeError", message: /needs a pattern/ });
    assert.equal(nc.time.format(nc.time.parse("02/01/2026", "DD/MM/YYYY"), "YYYY-MM-DD"), "2026-01-02");
  });

  it("assert.type names the guard by its 3.0 name", () => {
    assert.throws(() => nc.assert.type(1.5, nc.is.integer), { message: "Expected value to pass nc.is.integer" });
    assert.throws(() => nc.assert.type(1, (v) => typeof v === "string"), { message: /Expected value to pass/ });
  });

  it("the class subpaths carry their factory, in CommonJS and in ES modules", () => {
    const SQLite = require("../src/SQLite.js");
    assert.equal(typeof SQLite.open, "function");
    assert.equal(require("../src/Cache.js").create().constructor, require("../src/Cache.js"));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-esm-"));
    try {
      const entry = path.join(dir, "check.mjs");
      const url = (name) => JSON.stringify(require("node:url").pathToFileURL(path.join(__dirname, "..", "src", name)).href);
      fs.writeFileSync(
        entry,
        [
          `import SQLite from ${url("SQLite.js")};`,
          `import Cache from ${url("Cache.js")};`,
          `import Emitter from ${url("Emitter.js")};`,
          "const db = SQLite.open(':memory:');",
          "console.log(db instanceof SQLite, typeof SQLite.op.gte, Cache.create() instanceof Cache, Emitter.create() instanceof Emitter);",
          "db.close();",
        ].join("\n"),
      );
      const out = require("node:child_process").execFileSync(process.execPath, [entry], { encoding: "utf8" });
      assert.equal(out.trim(), "true function true true");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
