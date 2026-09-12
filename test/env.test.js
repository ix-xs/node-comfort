"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { env, errors } = require("..");

const SAMPLE = [
  "# a comment",
  "export PORT=3000",
  'URL="http://localhost:${PORT}/x"',
  "SINGLE='${PORT}'",
  'MULTI="line1\\nline2"',
  "EMPTY=",
  "WITH_COMMENT=value # trailing comment",
  "HASH=https://x.io/#anchor",
  'QUOTED_COMMENT="kept # not a comment" # removed',
  "DEF=${MISSING_VAR_NC:-fallback}",
  'ESCAPED="cost \\$5"',
  'REAL_MULTI="first',
  'second"',
  "SPACED = spaced value ",
  "",
].join("\n");

describe("env: parse", () => {
  it("understands the .env syntax", () => {
    assert.deepEqual(env.parse(SAMPLE, { env: {} }), {
      PORT: "3000",
      URL: "http://localhost:3000/x",
      SINGLE: "${PORT}",
      MULTI: "line1\nline2",
      EMPTY: "",
      WITH_COMMENT: "value",
      HASH: "https://x.io/#anchor",
      QUOTED_COMMENT: "kept # not a comment",
      DEF: "fallback",
      ESCAPED: "cost $5",
      REAL_MULTI: "first\nsecond",
      SPACED: "spaced value",
    });
    assert.equal(env.parse("A=$B", { env: { B: "from-env" } }).A, "from-env");
    assert.equal(env.parse("A=${A}", { env: {} }).A, "", "self references do not loop");
    assert.equal(env.parse("A=$B", { expand: false }).A, "$B");
    assert.deepEqual(env.parse("A=1\r\nB=2\r\n"), { A: "1", B: "2" });
  });
});

describe("env: load", () => {
  it("loads files without overwriting existing variables", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-env-"));
    const cwd = process.cwd();
    try {
      fs.writeFileSync(path.join(dir, ".env"), "NC_A=file\nNC_B=file-b\n");
      fs.writeFileSync(path.join(dir, ".env.local"), "NC_B=local\n");
      process.chdir(dir);
      const target = { NC_A: "already-set" };
      const loaded = env.load([".env.local", ".env"], { target });
      assert.deepEqual(loaded, { NC_B: "local", NC_A: "file" });
      assert.deepEqual(target, { NC_A: "already-set", NC_B: "local" });
      env.load(".env", { target, override: true });
      assert.equal(target.NC_A, "file");
      assert.throws(() => env.load(".env.missing", { required: true }), /not found/);
      assert.deepEqual(env.load(".env.missing"), {});
    } finally {
      process.chdir(cwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("env: typed getters", () => {
  const vars = { S: "hello", N: "42", F: "3.5", B: "yes", B2: "off", P: "8080", U: "https://api.example.com", D: "5m", L: "a, b,,c", J: '{"x":1}', E: "prod", BAD: "abc" };
  const opt = { env: vars };

  it("convert values", () => {
    assert.equal(env.string("S", opt), "hello");
    assert.equal(env.number("N", opt), 42);
    assert.equal(env.number("F", opt), 3.5);
    assert.equal(env.bool("B", opt), true);
    assert.equal(env.bool("B2", opt), false);
    assert.equal(env.port("P", opt), 8080);
    assert.equal(env.url("U", opt), "https://api.example.com");
    assert.equal(env.duration("D", opt), 300_000);
    assert.deepEqual(env.list("L", opt), ["a", "b", "c"]);
    assert.deepEqual(env.json("J", opt), { x: 1 });
    assert.equal(env.oneOf("E", ["dev", "prod"], opt), "prod");
  });

  it("apply defaults, optional and required rules", () => {
    assert.equal(env.number("MISSING", { ...opt, default: 7 }), 7);
    assert.equal(env.duration("MISSING", { ...opt, default: "1h" }), 3_600_000);
    assert.equal(env.string("MISSING", { ...opt, optional: true }), undefined);
    assert.throws(() => env.string("MISSING", opt), (e) => e instanceof errors.ValidationError && e.issues[0].code === "required");
    assert.throws(() => env.number("BAD", opt), /must be a number/);
    assert.throws(() => env.number("N", { ...opt, max: 10 }), /must be <= 10/);
    assert.throws(() => env.number("F", { ...opt, integer: true }), /integer/);
    assert.throws(() => env.bool("BAD", opt), /boolean/);
    assert.throws(() => env.port("BAD", opt), /port/);
    assert.throws(() => env.url("BAD", opt), /valid URL/);
    assert.throws(() => env.url("U", { ...opt, protocols: ["postgres"] }), /protocols/);
    assert.throws(() => env.oneOf("E", ["dev"], opt), /must be one of/);
    assert.throws(() => env.duration("BAD", opt), /duration/);
    process.env.NC_REQUIRED_TEST = "ok";
    assert.equal(env.required("NC_REQUIRED_TEST"), "ok");
    assert.equal(env.get("NC_REQUIRED_TEST"), "ok");
    assert.equal(env.has("NC_REQUIRED_TEST"), true);
    delete process.env.NC_REQUIRED_TEST;
    assert.equal(env.get("NC_REQUIRED_TEST", "fb"), "fb");
  });
});

describe("env: validate", () => {
  it("returns a frozen typed config", () => {
    const config = env.validate({
      NODE_ENV: { type: "enum", values: ["development", "production"], default: "development" },
      PORT: { type: "port", default: 3000 },
      DEBUG: { type: "boolean", default: false },
      ADMINS: { type: "list", default: [] },
      TTL: { type: "duration", default: "10s" },
      SENTRY: { type: "url", optional: true },
    }, { env: { PORT: "4000", ADMINS: "ada,bob" } });
    assert.deepEqual({ ...config }, { NODE_ENV: "development", PORT: 4000, DEBUG: false, ADMINS: ["ada", "bob"], TTL: 10_000, SENTRY: undefined });
    assert.ok(Object.isFrozen(config));
  });

  it("reports every problem at once", () => {
    try {
      env.validate({
        DB: { type: "url" },
        SECRET: { type: "string", minLength: 32 },
        WORKERS: { type: "number", min: 1 },
        MAIL: { type: "email" },
      }, { env: { SECRET: "short", WORKERS: "0", MAIL: "nope" } });
      assert.fail("should throw");
    } catch (error) {
      assert.ok(error instanceof errors.ValidationError);
      assert.deepEqual(error.issues.map((i) => i.path[0]), ["DB", "SECRET", "WORKERS", "MAIL"]);
      assert.match(error.message, /4 issues/);
      assert.deepEqual(Object.keys(error.flatten()), ["DB", "SECRET", "WORKERS", "MAIL"]);
    }
  });
});

describe("env: modes", () => {
  it("mode helpers", () => {
    const saved = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      assert.equal(env.isProduction(), true);
      assert.equal(env.isDevelopment(), false);
      delete process.env.NODE_ENV;
      assert.equal(env.mode(), "development");
      assert.equal(env.isDevelopment(), true);
      assert.equal(env.isTest(), true, "node --test is detected");
    } finally {
      if (saved === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = saved;
    }
  });
});
