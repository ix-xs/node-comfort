"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const nc = require("..");

describe("package entry point", () => {
  it("exposes every CommonJS export as a named ES module export", async () => {
    const esm = await import(pathToFileURL(path.join(__dirname, "..", "index.js")).href);
    const named = Object.keys(esm).filter((key) => key !== "default" && key !== "module.exports");
    assert.deepEqual(named.sort(), Object.keys(nc).sort());
    assert.equal(esm.default, nc);
    assert.equal(esm.nc, nc);
  });

  it("self references and namespaces", () => {
    assert.equal(nc.nc, nc);
    assert.equal(nc.nodeComfort, nc);
    for (const ns of ["logger", "fs", "checker", "utils", "str", "num", "arr", "obj", "func", "time", "id", "crypto", "color", "cli", "env", "errors"]) {
      assert.ok(nc[ns] && typeof nc[ns] === "object", `nc.${ns} is missing`);
    }
    assert.equal(typeof nc.SQLite, "function");
  });

  it("flat helpers are the same functions as the grouped ones", () => {
    assert.equal(nc.log, nc.logger.log);
    assert.equal(nc.readJSON, nc.fs.readJSON);
    assert.equal(nc.isEmail, nc.checker.isEmail);
    assert.equal(nc.wait, nc.utils.wait);
  });

  it("every function works when destructured (no `this` dependency)", () => {
    const failures = [];
    const probe = (label, fn) => {
      try {
        fn();
      } catch (error) {
        if (/this|Cannot read properties of undefined/.test(error.message)) failures.push(`${label}: ${error.message}`);
      }
    };
    const { merge, set } = nc.obj;
    probe("obj.merge", () => merge({ a: 1 }, { b: 2 }));
    probe("obj.set", () => set({}, "a.b", 1));
    const { percent, formatBytes } = nc.num;
    probe("num.percent", () => percent(1, 4));
    probe("num.formatBytes", () => formatBytes(10));
    const { add, format } = nc.time;
    probe("time.add", () => add(new Date(), "1h"));
    probe("time.format", () => format(new Date()));
    const { compose, pipe } = nc.func;
    probe("func.compose", () => compose((x) => x)(1));
    probe("func.pipe", () => pipe((x) => x)(1));
    const { sampleSize } = nc.arr;
    probe("arr.sampleSize", () => sampleSize([1, 2], 1));
    const { setLevel, getLevel } = nc;
    probe("setLevel", () => setLevel(getLevel()));
    assert.deepEqual(failures, []);
  });

  it("requiring the package loads no namespace until it is used", () => {
    const code = `
      const root = ${JSON.stringify(path.join(__dirname, ".."))};
      const nc = require(root);
      const loaded = () => Object.keys(require.cache).filter((f) => f.includes(require("node:path").join(root, "src"))).length;
      const before = loaded();
      nc.str.slugify("a");
      console.log(JSON.stringify({ before, after: loaded() }));`;
    const out = execFileSync(process.execPath, ["-e", code], { env: { ...process.env, NODE_COMFORT_DOTENV: "false" } }).toString();
    assert.deepEqual(JSON.parse(out), { before: 0, after: 1 });
  });

  it("flat helpers list every function of logger, fs, checker and utils", () => {
    for (const [namespace, file] of [["logger", "Logger"], ["fs", "FS"], ["checker", "Checker"], ["utils", "Utils"]]) {
      const own = Object.keys(require(`../src/${file}.js`));
      assert.deepEqual(own, Object.keys(nc[namespace]));
      for (const name of own) assert.equal(nc[name], nc[namespace][name], `nc.${name}`);
    }
  });

  it("every namespace has an official subpath, in CommonJS and ES modules", async () => {
    const pkg = require("../package.json");
    const subpaths = Object.keys(pkg.exports).filter((key) => key !== "." && key !== "./package.json");
    const namespaces = Object.keys(nc).filter((key) => typeof nc[key] === "object" && key !== "nc" && key !== "nodeComfort").concat(["SQLite", "Cache", "Emitter"]);
    assert.deepEqual(subpaths.map((s) => s.slice(2)).sort(), namespaces.map((n) => n.toLowerCase()).sort());
    for (const subpath of subpaths) {
      const name = namespaces.find((n) => n.toLowerCase() === subpath.slice(2));
      const target = path.join(__dirname, "..", pkg.exports[subpath].default);
      assert.equal(require(target), nc[name], subpath);
      const esm = await import(pathToFileURL(target).href);
      assert.equal(esm.default, nc[name], `${subpath} (ESM default)`);
      if (typeof nc[name] === "object" && name !== "color") {
        for (const key of Object.keys(nc[name])) assert.equal(esm[key], nc[name][key], `${subpath} named export "${key}"`);
      }
    }
  });

  it("package.json is consistent", () => {
    const pkg = require("../package.json");
    assert.equal(pkg.main, "./index.js");
    assert.equal(pkg.exports["."].default, "./index.js");
    assert.equal(pkg.exports["."].types, pkg.types);
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], "zero runtime dependencies");
  });
});
