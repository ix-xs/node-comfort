"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const nc = require("..");
const { peek, aliasesOf } = require("../src/internal/deprecate.js");

// The helpers that 2.2 had at the top level. They stay there in 3.0, deprecated.
const FLAT_2_2 = {
  logger: ["log", "trace", "debug", "info", "success", "warn", "error", "fatal", "group", "groupEnd", "timeStart", "timeEnd", "table", "box", "divider", "setLevel", "getLevel", "isLevelEnabled", "configure", "setTimestamp", "setDelimiter", "createLogger"],
  fs: ["getEnv", "createPath", "getFolder", "getFile", "getFoldersIn", "getFilesIn", "glob", "find", "findUp", "readFile", "readLines", "readJSON", "writeFile", "writeJSON", "appendFile", "createFile", "createFolder", "ensureFolder", "ensureFile", "touch", "deleteFolder", "deleteFile", "remove", "deleteFoldersIn", "deleteFilesIn", "emptyFolder", "copy", "move", "copyFoldersIn", "copyFolder", "copyFilesIn", "copyFile", "moveFoldersIn", "moveFolder", "moveFilesIn", "moveFile", "exists", "isFile", "isFolder", "stat", "fileSize", "folderSize", "hashFile", "tempFolder", "sanitizeFilename", "watch"],
  checker: ["isArray", "isNumber", "isFinite", "isInteger", "isSafeInteger", "isFloat", "isPositive", "isNegative", "isBoolean", "isString", "isSymbol", "isBigInt", "isUndefined", "isNull", "isNil", "isDefined", "isPrimitive", "isFunction", "isAsyncFunction", "isGeneratorFunction", "isGenerator", "isClass", "isObject", "isPlainObject", "isPromise", "isRegExp", "isDate", "isValidDate", "isMap", "isSet", "isWeakMap", "isWeakSet", "isIterable", "isAsyncIterable", "isBuffer", "isTypedArray", "isError", "isEmpty", "isBlank", "isArrayOf", "isOneOf", "isEmail", "isURL", "isUUID", "isJSON", "isNumeric", "isIP", "isIPv4", "isIPv6", "isPort", "isHex", "isHexColor", "isBase64", "isSemver", "isISODate", "isSlug", "isAlpha", "isAlphanumeric", "isCreditCard", "isJWT", "isHostname", "isMACAddress", "isIBAN", "isE164", "isObjectId", "isULID", "isDataURL", "isMimeType", "isTimeZone", "isLocale", "isCron", "isASCII", "assert", "assertType"],
  utils: ["wait", "when", "dontCrash", "JSONString", "JSONParse"],
};

describe("package entry point", () => {
  it("exposes every CommonJS export as a named ES module export", async () => {
    const esm = await import(pathToFileURL(path.join(__dirname, "..", "index.js")).href);
    const named = Object.keys(esm).filter((key) => key !== "default" && key !== "module.exports");
    // the namespaces and the deprecated names of 2.2, which still import
    assert.deepEqual(named.sort(), Object.getOwnPropertyNames(nc).sort());
    assert.equal(esm.default, nc);
    assert.equal(esm.nc, nc);
  });

  // tests the deprecated alias on purpose
  it("self references and namespaces", () => {
    assert.equal(nc.nc, nc);
    assert.equal(nc.nodeComfort, nc);
    for (const ns of ["logger", "fs", "checker", "utils", "str", "num", "arr", "obj", "func", "time", "id", "crypto", "color", "cli", "env", "errors"]) {
      assert.ok(nc[ns] && typeof nc[ns] === "object", `nc.${ns} is missing`);
    }
    assert.equal(typeof nc.SQLite, "function");
  });

  // tests the deprecated alias on purpose
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
    const { setLevel, getLevel } = nc.logger;
    probe("setLevel", () => setLevel(getLevel()));
    assert.deepEqual(failures, []);
  });

  it("requiring the package loads no namespace until it is used", () => {
    const code = `
      const root = ${JSON.stringify(path.join(__dirname, ".."))};
      const nc = require(root);
      const src = require("node:path").join(root, "src");
      const loaded = () => Object.keys(require.cache).filter((f) => require("node:path").dirname(f) === src).length;
      const before = loaded();
      nc.str.slugify("a");
      console.log(JSON.stringify({ before, after: loaded() }));`;
    const out = execFileSync(process.execPath, ["-e", code], { env: { ...process.env, NODE_COMFORT_DOTENV: "false" } }).toString();
    assert.deepEqual(JSON.parse(out), { before: 0, after: 1 });
  });

  it("the root keeps every flat helper of 2.2, as a deprecated alias", () => {
    const renamed = { createLogger: nc.logger.create, assertType: nc.assert.type };
    for (const [namespace, names] of Object.entries(FLAT_2_2)) {
      const group = peek(nc, namespace);
      for (const name of names) {
        if (name === "assert") {
          // now the assert namespace, callable as before
          assert.equal(Object.getOwnPropertyDescriptor(nc, name)?.enumerable, true);
          continue;
        }
        assert.equal(Object.getOwnPropertyDescriptor(nc, name)?.enumerable, false, `nc.${name} is hidden`);
        assert.equal(peek(nc, name), renamed[name] ?? peek(group, name), `nc.${name}`);
      }
    }
    const expected = Object.values(FLAT_2_2).flat().filter((name) => name !== "assert").concat(["checker", "utils", "SQLite", "Cache", "Emitter", "nc", "nodeComfort"]);
    assert.deepEqual(aliasesOf(nc).map((a) => a.name).sort(), expected.sort());
  });

  it("every namespace has an official subpath, in CommonJS and ES modules", async () => {
    const pkg = require("../package.json");
    const subpaths = Object.keys(pkg.exports).filter((key) => key !== "." && key !== "./package.json");
    // checker and utils are kept for 2.2 code; cache, emitter and sqlite still give the class, as in 2.2
    assert.deepEqual(subpaths.map((s) => s.slice(2)).sort(), [...Object.keys(nc), "checker", "utils"].sort());
    const classes = { cache: "Cache", emitter: "Emitter", sqlite: "SQLite" };
    for (const subpath of subpaths) {
      const name = subpath.slice(2);
      const expected = Object.hasOwn(classes, name) ? nc[name][classes[name]] : peek(nc, name);
      const target = path.join(__dirname, "..", pkg.exports[subpath].default);
      assert.equal(require(target), expected, subpath);
      const esm = await import(pathToFileURL(target).href);
      assert.equal(esm.default, expected, `${subpath} (ESM default)`);
      if (typeof expected === "object" && name !== "color") {
        for (const key of Object.getOwnPropertyNames(expected)) assert.equal(esm[key], peek(expected, key), `${subpath} named export "${key}"`);
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
