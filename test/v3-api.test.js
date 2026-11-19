"use strict";

// The 3.0 API: one way to call everything (nc.<namespace>.<member>), and the
// names of 2.2 kept as deprecated aliases that warn once.

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const nc = require("..");
const { peek, aliasesOf, message, code } = require("../src/internal/deprecate.js");

const ROOT = path.join(__dirname, "..");
const NAMESPACES = ["config", "logger", "fs", "env", "is", "assert", "errors", "json", "str", "num", "arr", "obj", "schema", "time", "id", "crypto", "func", "async", "cache", "emitter", "sqlite", "http", "sys", "cli", "color"];

/**
 * Runs `fn` and returns the warnings it emitted.
 * @param {() => void} fn
 * @returns {Array<{ message: string, type: string | undefined, code: string | undefined }>}
 */
const warningsOf = (fn) => {
  /** @type {Array<{ message: string, type: string | undefined, code: string | undefined }>} */
  const seen = [];
  const original = process.emitWarning;
  process.emitWarning = /** @type {any} */ ((/** @type {any} */ warning, /** @type {any} */ options) => {
    seen.push({ message: String(warning), type: options?.type, code: options?.code });
  });
  try {
    fn();
  } finally {
    process.emitWarning = original;
  }
  return seen;
};

/**
 * Runs a script in a fresh process and returns what it printed.
 * @param {string} code
 * @param {string[]} [flags]
 * @param {string} [extension=".js"]
 * @returns {string}
 */
const runScript = (code, flags = [], extension = ".js") => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-v3-"));
  const file = path.join(dir, `script${extension}`);
  fs.writeFileSync(file, code);
  try {
    return execFileSync(process.execPath, [...flags, file], { env: { ...process.env, NODE_COMFORT_DOTENV: "false" }, encoding: "utf8" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe("the 3.0 root", () => {
  it("lists exactly the namespaces, in order", () => {
    assert.deepEqual(Object.keys(nc), NAMESPACES);
    const seen = [];
    for (const key in nc) seen.push(key);
    assert.deepEqual(seen, NAMESPACES);
    assert.deepEqual(Object.keys({ ...nc }), NAMESPACES);
  });

  it("loads each namespace on first use only", () => {
    const out = runScript(`
      const nc = require(${JSON.stringify(ROOT)});
      const src = require("node:path").join(${JSON.stringify(ROOT)}, "src");
      const loaded = () => Object.keys(require.cache).filter((f) => require("node:path").dirname(f) === src).map((f) => require("node:path").basename(f));
      const before = loaded();
      nc.config.get();
      console.log(JSON.stringify({ before, after: loaded() }));`);
    assert.deepEqual(JSON.parse(out), { before: [], after: ["Config.js"] });
  });

  it("listing or spreading the root and every namespace never warns", () => {
    const out = runScript(`
      let count = 0;
      process.on("warning", () => count++);
      const nc = require(${JSON.stringify(ROOT)});
      const seen = [];
      for (const key in nc) seen.push(key);
      void { ...nc };
      Object.entries(nc);
      JSON.stringify(Object.keys(nc));
      require("node:util").inspect(nc);
      for (const value of Object.values(nc)) {
        if (value && (typeof value === "object" || typeof value === "function")) {
          void { ...value };
          Object.entries(value);
          for (const key in value) seen.push(key);
          require("node:util").inspect(value);
        }
      }
      setImmediate(() => console.log(count));`);
    assert.equal(out.trim(), "0");
  });

  it("node --no-deprecation silences the warnings", () => {
    const out = runScript(`
      let count = 0;
      process.on("warning", () => count++);
      const nc = require(${JSON.stringify(ROOT)});
      nc.info; nc.isEmail; nc.logger.createLogger; nc.SQLite;
      setImmediate(() => console.log(count));`, ["--no-deprecation"]);
    assert.equal(out.trim(), "0");
  });

  it("ES modules import the new and the old names", () => {
    const url = pathToFileURL(path.join(ROOT, "index.js")).href;
    const out = runScript(`
      let count = 0;
      process.on("warning", () => count++);
      import nc, { config, is, assert, json, sqlite, info, isEmail, readFile, SQLite, wait, checker, nc as self } from ${JSON.stringify(url)};
      import { email } from ${JSON.stringify(pathToFileURL(path.join(ROOT, "src", "Is.js")).href)};
      import { isEmail as oldEmail } from ${JSON.stringify(pathToFileURL(path.join(ROOT, "src", "Checker.js")).href)};
      const ok = [
        typeof config.set, typeof is.email, typeof assert, typeof assert.type, typeof json.parse, typeof sqlite.open,
        typeof info, isEmail("a@b.co"), typeof readFile, typeof SQLite, typeof wait, typeof checker.isEmail, self === nc,
        email("a@b.co"), oldEmail === email,
      ];
      setImmediate(() => console.log(JSON.stringify({ ok, count })));`, [], ".mjs");
    const { ok, count } = JSON.parse(out);
    assert.deepEqual(ok, ["function", "function", "function", "function", "function", "function", "function", true, "function", "function", "function", "function", true, true, true]);
    // The loader reads every named export when it builds the module: that alone must not warn.
    // Only checker.isEmail, read by the script itself, does.
    assert.equal(count, 1);
  });
});

describe("the new names", () => {
  afterEach(() => nc.config.set({ locale: "en", timeZone: undefined }));

  it("config.set() and config.get()", () => {
    assert.deepEqual(nc.config.get(), { locale: "en", timeZone: undefined });
    assert.deepEqual(nc.config.set({ locale: "fr" }), { locale: "fr", timeZone: undefined });
    assert.deepEqual(nc.config.set({ timeZone: "Europe/Paris" }), { locale: "fr", timeZone: "Europe/Paris" });
    assert.deepEqual(nc.config.set({ timeZone: null }), { locale: "fr", timeZone: undefined });
    assert.throws(() => nc.config.set({ timeZone: "Mars/Olympus" }), RangeError);
    assert.throws(() => nc.config.set({ locale: "not a locale!" }), RangeError);
    assert.throws(() => nc.config.set({ locale: /** @type {any} */ (5) }), TypeError);
    assert.deepEqual(nc.config.get(), { locale: "fr", timeZone: undefined }, "a refused value changes nothing");
    const copy = nc.config.get();
    copy.locale = "de";
    assert.equal(nc.config.get().locale, "fr");
  });

  it("config.set() changes num and time", () => {
    const date = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));
    assert.equal(nc.num.format(1234.5), "1,234.5");
    assert.equal(nc.time.format(date, "dddd HH:mm", { timeZone: "UTC" }), "Monday 12:00");
    nc.config.set({ locale: "fr", timeZone: "Asia/Tokyo" });
    assert.equal(nc.num.format(1234.5), "1 234,5");
    assert.equal(nc.time.format(date, "dddd HH:mm"), "lundi 21:00");
    assert.equal(nc.num.format(1234.5, { locale: "en" }), "1,234.5", "a call can still override it");
  });

  it("is: every check of checker, under its new name", () => {
    assert.equal(Object.keys(nc.is).length, 72);
    for (const value of Object.values(nc.is)) assert.equal(typeof value, "function");
    assert.equal(nc.is.email("a@b.co"), true);
    assert.equal(nc.is.url("https://example.com"), true);
    assert.equal(nc.is.null(null), true);
    assert.equal(nc.is.undefined(undefined), true);
    assert.equal(nc.is.function(() => {}), true);
    assert.equal(nc.is.class(class {}), true);
    assert.equal(nc.is.ipv4("127.0.0.1"), true);
    assert.equal(nc.is.isoDate("2024-01-15"), true);
    assert.equal(nc.is.macAddress("00:1A:2B:3C:4D:5E"), true);
    assert.equal(nc.is.dataUrl("data:,Hello"), true);
    assert.equal(nc.is.ascii("héllo"), false);
    assert.equal(nc.is.arrayOf(["a"], nc.is.string), true);
    assert.equal(nc.is.uuid(nc.id.uuid(), { version: 4 }), true);
  });

  it("assert() and assert.type()", () => {
    assert.equal(typeof nc.assert, "function");
    nc.assert(true);
    assert.throws(() => nc.assert(0, "nope"), (error) => error instanceof nc.errors.AssertionError && error.message === "nope");
    assert.throws(() => nc.assert(false, () => "lazy"), { message: "lazy" });
    assert.throws(() => nc.assert(null), { message: "Assertion failed" });
    nc.assert.type(3, nc.is.integer);
    assert.throws(() => nc.assert.type("3", nc.is.integer), (error) => error instanceof nc.errors.AssertionError && error.message === "Expected value to pass nc.is.integer");
    assert.throws(() => nc.assert.type("3", nc.is.integer, "port must be an integer"), { message: "port must be an integer" });
  });

  it("json.parse() and json.stringify()", () => {
    assert.deepEqual(nc.json.parse('{"a":1}'), { a: 1 });
    assert.equal(nc.json.parse("oops", null), null);
    assert.equal(nc.json.parse("oops", undefined), undefined);
    assert.throws(() => nc.json.parse("oops"), SyntaxError);
    assert.deepEqual(nc.json.parse("﻿[1]"), [1]);
    const jsonc = '{\n  // a comment\n  "a": 1, /* another */\n  "b": "// not a comment",\n}';
    assert.deepEqual(nc.json.parse(jsonc, null, { comments: true }), { a: 1, b: "// not a comment" });
    assert.equal(nc.json.parse(jsonc, null), null, "comments are refused unless asked for");
    const date = nc.json.parse('{"at":"2024-01-15T00:00:00.000Z"}', {}, (key, value) => (key === "at" ? new Date(value) : value));
    assert.ok(date.at instanceof Date);
    const revived = nc.json.parse('{"n":1}', {}, { reviver: (key, value) => (key === "n" ? value + 1 : value) });
    assert.deepEqual(revived, { n: 2 });
    assert.equal(nc.json.stringify({ a: 1 }), '{\n    "a": 1\n}');
    assert.equal(nc.json.stringify({ a: 1 }, 0), '{"a":1}');
    assert.equal(nc.json.stringify({ a: 1 }, { spaces: 2 }), '{\n  "a": 1\n}');
    assert.equal(nc.json.stringify({ a: 1 }, {}), '{\n    "a": 1\n}');
    const circular = { id: 10n, tags: new Set(["x"]) };
    /** @type {any} */ (circular).self = circular;
    assert.equal(nc.json.stringify(circular, 0), '{"id":"10","tags":["x"],"self":"[Circular]"}');
  });

  it("cache, emitter and sqlite: a factory and the class", () => {
    const cache = nc.cache.create({ max: 2 });
    assert.ok(cache instanceof nc.cache.Cache);
    cache.set("a", 1);
    assert.equal(cache.get("a"), 1);

    const events = nc.emitter.create();
    assert.ok(events instanceof nc.emitter.Emitter);
    let got;
    events.on("ready", (port) => (got = port));
    events.emit("ready", 3000);
    assert.equal(got, 3000);
    class Job extends nc.emitter.Emitter {}
    assert.ok(new Job() instanceof nc.emitter.Emitter);

    const db = nc.sqlite.open(":memory:");
    try {
      assert.ok(db instanceof nc.sqlite.SQLite);
      assert.equal(nc.sqlite.op, nc.sqlite.SQLite.op);
      db.exec("CREATE TABLE t (id INTEGER, age INTEGER)");
      db.insert("t", { id: 1, age: 30 });
      assert.equal(db.getAll("t", { age: nc.sqlite.op.between(18, 65) }).length, 1);
    } finally {
      db.close();
    }
  });

  it("logger.create(), async.sleep/when/to/retry/timeout, sys.dontCrash()", async () => {
    const lines = [];
    const log = nc.logger.create({ timestamp: false, colors: false, stdout: { write: (text) => lines.push(text) } });
    log.info("hello");
    assert.match(lines.join(""), /hello/);

    await nc.async.sleep(1, { unref: true });
    assert.deepEqual(await nc.async.to(Promise.resolve(1)), [null, 1]);
    const [error] = await nc.async.to(Promise.reject(new Error("x")));
    assert.equal(error.message, "x");
    let attempts = 0;
    assert.equal(await nc.async.retry(() => (++attempts < 2 ? Promise.reject(new Error("again")) : "ok"), { attempts: 3 }), "ok");
    await assert.rejects(nc.async.timeout(new Promise(() => {}), 5), nc.errors.TimeoutError);

    await new Promise((resolve, reject) => {
      nc.async.when(() => true, { why: "now" }, { interval: 1, max: 1 }).on("trigger", resolve).on("error", reject).start();
    });

    const before = process.listenerCount("uncaughtException");
    const guard = nc.sys.dontCrash();
    assert.equal(process.listenerCount("uncaughtException"), before + 1);
    guard.dispose();
    assert.equal(process.listenerCount("uncaughtException"), before);
  });
});

describe("the deprecated names of 2.2", () => {
  /**
   * Every alias of an object: it gives the old value, and warns exactly once.
   * @param {object} target
   * @param {string} owner
   */
  const checkAliases = (target, owner) => {
    const aliases = aliasesOf(target);
    assert.ok(aliases.length > 0, `${owner} has deprecated aliases`);
    for (const { name, use } of aliases) {
      const descriptor = Object.getOwnPropertyDescriptor(target, name);
      assert.equal(descriptor?.enumerable, false, `${owner}.${name} is hidden`);
      assert.ok(!Object.keys(target).includes(name));
      const expected = peek(target, name);
      /** @type {unknown} */
      let first;
      /** @type {unknown} */
      let second;
      const warnings = warningsOf(() => {
        first = /** @type {any} */ (target)[name];
        second = /** @type {any} */ (target)[name];
      });
      assert.equal(first, expected, `${owner}.${name}`);
      assert.equal(second, expected);
      const where = `${owner}.${name}`;
      assert.deepEqual(warnings, [{ message: message(where, use, expected), type: "DeprecationWarning", code: code(where) }], where);
    }
  };

  it("at the root: every one warns once and gives the old value", () => checkAliases(nc, "nc"));

  it("inside the namespaces: every one warns once and gives the old value", () => {
    const owners = ["logger", "env", "fs", "func", "id", "http", "num", "time", "obj"];
    for (const key of NAMESPACES) {
      if (owners.includes(key)) checkAliases(nc[key], `nc.${key}`);
      else assert.deepEqual(aliasesOf(nc[key]), [], `nc.${key} has no deprecated name`);
    }
    checkAliases(peek(nc, "checker"), "nc.checker");
    checkAliases(peek(nc, "utils"), "nc.utils");
  });

  it("the messages and codes follow one format", () => {
    assert.equal(message("nc.info", "nc.logger.info()", () => {}), "nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.");
    assert.equal(message("nc.SQLite", "nc.sqlite.open() or nc.sqlite.SQLite", class {}), "nc.SQLite is deprecated: use nc.sqlite.open() or nc.sqlite.SQLite. It will be removed in 4.0.");
    assert.equal(code("nc.info"), "NODE_COMFORT_DEP_INFO");
    assert.equal(code("nc.SQLite"), "NODE_COMFORT_DEP_SQLITE");
    assert.equal(code("nc.isISODate"), "NODE_COMFORT_DEP_IS_ISO_DATE");
    assert.equal(code("nc.isIPv4"), "NODE_COMFORT_DEP_IS_IPV4");
    assert.equal(code("nc.JSONParse"), "NODE_COMFORT_DEP_JSON_PARSE");
    assert.equal(code("nc.logger.createLogger"), "NODE_COMFORT_DEP_LOGGER_CREATE_LOGGER");
    assert.equal(code("nc.nc"), "NODE_COMFORT_DEP_NC");
    const uses = Object.fromEntries(aliasesOf(nc).map((a) => [a.name, a.use]));
    assert.equal(uses.readFile, "nc.fs.read()");
    assert.equal(uses.createLogger, "nc.logger.create()");
    assert.equal(uses.isURL, "nc.is.url()");
    assert.equal(uses.assertType, "nc.assert.type()");
    assert.equal(uses.wait, "nc.async.sleep()");
    assert.equal(uses.JSONParse, "nc.json.parse()");
  });

  it("the old values are the new functions, or keep their own behaviour", () => {
    assert.equal(peek(nc, "info"), nc.logger.info);
    assert.equal(peek(nc, "createLogger"), nc.logger.create);
    assert.equal(peek(nc, "isEmail"), nc.is.email);
    assert.equal(peek(nc, "assertType"), nc.assert.type);
    assert.equal(peek(nc, "wait"), nc.async.sleep);
    assert.equal(peek(nc, "when"), nc.async.when);
    assert.equal(peek(nc, "dontCrash"), nc.sys.dontCrash);
    assert.equal(peek(nc, "copy"), nc.fs.copy);
    assert.equal(peek(nc, "readFile"), peek(nc.fs, "readFile"));
    assert.equal(peek(nc, "SQLite"), nc.sqlite.SQLite);
    assert.equal(peek(nc, "Cache"), nc.cache.Cache);
    assert.equal(peek(nc, "Emitter"), nc.emitter.Emitter);
    assert.equal(peek(nc, "nc"), nc);
    assert.equal(peek(nc, "nodeComfort"), nc);
    assert.equal(peek(peek(nc, "SQLite"), "op"), nc.sqlite.op);
    const checker = peek(nc, "checker");
    assert.equal(peek(checker, "isEmail"), nc.is.email);
    assert.equal(peek(checker, "assert"), nc.assert);
    assert.equal(peek(nc.logger, "createLogger"), nc.logger.create);
    assert.equal(peek(nc.func, "retry"), nc.async.retry);
    assert.equal(peek(nc.func, "timeout"), nc.async.timeout);
    assert.equal(peek(nc.func, "to"), nc.async.to);
    assert.equal(peek(nc.http, "HttpError"), nc.errors.HttpError);
    // obj.isEmpty keeps its own answer for non-objects
    assert.equal(peek(nc.obj, "isEmpty")(5), true);
    assert.equal(nc.is.empty(5), false);
    // JSONParse and JSONString keep their signatures
    const utils = peek(nc, "utils");
    assert.equal(peek(utils, "JSONParse")("oops", 1), 1);
    assert.deepEqual(peek(utils, "JSONParse")('{"n":1}', null, (key, value) => (key === "n" ? 2 : value)), { n: 2 });
    assert.equal(peek(utils, "JSONString")({ a: 1 }, 0), '{"a":1}');
    // the id helpers still hash like crypto
    assert.equal(peek(nc.id, "hash")("x"), nc.crypto.hash("x"));
  });

  it("the old locale setters write the shared config", () => {
    try {
      const setLocale = peek(nc.num, "setLocale");
      assert.equal(setLocale("fr"), nc.num, "calls still chain");
      assert.equal(peek(nc.num, "getLocale")(), "fr");
      assert.equal(nc.config.get().locale, "fr");
      assert.deepEqual(peek(nc.time, "getConfig")(), { locale: "fr", timeZone: undefined });
      assert.equal(peek(nc.time, "setTimezone")("Europe/Paris"), nc.time);
      assert.equal(nc.config.get().timeZone, "Europe/Paris");
      assert.throws(() => peek(nc.time, "setTimezone")("Mars/Olympus"), RangeError);
    } finally {
      nc.config.set({ locale: "en", timeZone: undefined });
    }
  });

  it("assigning an alias replaces it without a warning", () => {
    const target = {};
    require("../src/internal/deprecate.js").deprecate(target, "nc.test", { old: { use: "nc.test.new()", value: () => 1 } });
    const warnings = warningsOf(() => {
      /** @type {any} */ (target).old = 2;
    });
    assert.deepEqual(warnings, []);
    assert.equal(peek(target, "old"), 2);
    assert.deepEqual(Object.keys(target), []);
  });
});
