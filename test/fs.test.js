"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const nc = require("..");

let root;
const p = (...parts) => path.join(root, ...parts);

before(() => {
  // macOS: /var is a link to /private/var, and the package resolves real paths
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nc-fs-")));
});
after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("fs: path resolution", () => {
  it("resolves ./ from the calling file and plain relative paths from cwd", () => {
    assert.equal(nc.fs.resolve("./x.json"), path.join(__dirname, "x.json"));
    assert.equal(nc.fs.resolve("x.json"), path.join(process.cwd(), "x.json"));
    assert.equal(nc.fs.resolve(p("abs.txt")), p("abs.txt"));
    assert.equal(nc.fs.resolve(), process.cwd());
  });

  it("resolves ./ from an ES module caller", () => {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nc-esm-")));
    try {
      const script = path.join(dir, "caller.mjs");
      const pkg = pathToFileURL(path.join(__dirname, "..", "index.js")).href;
      fs.writeFileSync(script, `import nc from ${JSON.stringify(pkg)};\nprocess.stdout.write(nc.fs.resolve("./data.json"));\n`);
      const output = execFileSync(process.execPath, [script], { encoding: "utf8" });
      assert.equal(output, path.join(dir, "data.json"));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("never searches the tree for a missing relative path", () => {
    fs.mkdirSync(p("deep", "nested"), { recursive: true });
    fs.writeFileSync(p("deep", "nested", "only-here.txt"), "x");
    const cwd = process.cwd();
    process.chdir(root);
    try {
      assert.equal(nc.fs.isFile("only-here.txt"), false);
      assert.equal(nc.fs.remove("only-here.txt"), false);
      assert.ok(fs.existsSync(p("deep", "nested", "only-here.txt")), "the nested file was not deleted");
      assert.equal(nc.fs.find("only-here.txt"), p("deep", "nested", "only-here.txt"));
      assert.equal(nc.fs.find("nested", { type: "folder" }), p("deep", "nested"));
      assert.equal(nc.fs.find("missing.txt"), undefined);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("fs: read and write", () => {
  it("write is atomic and creates folders", () => {
    assert.equal(nc.fs.write(p("a", "b", "c.txt"), "hello"), true);
    assert.equal(nc.fs.read(p("a", "b", "c.txt")), "hello");
    assert.deepEqual(fs.readdirSync(p("a", "b")), ["c.txt"], "no temporary file left behind");
    assert.equal(nc.fs.write(p("obj.json"), { a: 1 }), true);
    assert.equal(nc.fs.read(p("obj.json")), '{\n  "a": 1\n}');
    assert.equal(nc.fs.write(p("bin.dat"), Buffer.from([1, 2])), true);
    assert.deepEqual([...nc.fs.read(p("bin.dat"), "buffer")], [1, 2]);
    assert.equal(nc.fs.read(p("missing.txt")), undefined);
  });

  it("JSON with fallback, BOM and comments", () => {
    assert.equal(nc.fs.writeJSON(p("data", "settings.json"), { theme: "dark" }), true);
    assert.deepEqual(nc.fs.readJSON(p("data", "settings.json")), { theme: "dark" });
    assert.deepEqual(nc.fs.readJSON(p("nope.json"), { fallback: true }), { fallback: true });
    fs.writeFileSync(p("bom.json"), '﻿{"ok":1}');
    assert.deepEqual(nc.fs.readJSON(p("bom.json")), { ok: 1 });
    fs.writeFileSync(p("conf.jsonc"), '{\n  // comment\n  "a": "http://x", /* block */\n  "b": [1, 2,],\n}');
    assert.deepEqual(nc.fs.readJSON(p("conf.jsonc"), null, { comments: true }), { a: "http://x", b: [1, 2] });
    assert.equal(nc.fs.readJSON(p("conf.jsonc"), "invalid"), "invalid");
    const circular = {};
    circular.self = circular;
    assert.equal(nc.fs.writeJSON(p("circular.json"), circular), false);
  });

  it("append, readLines, createFile, ensure*, touch", () => {
    nc.fs.append(p("log", "a.log"), "one\n");
    nc.fs.append(p("log", "a.log"), "two\r\n");
    assert.deepEqual(nc.fs.readLines(p("log", "a.log")), ["one", "two"]);
    // tests the deprecated alias on purpose: createFile() reports an existing file, ensureFile() and write() don't
    assert.equal(nc.createFile(p("new.txt"), false, "first"), true);
    assert.equal(nc.createFile(p("new.txt"), false, "second"), false);
    assert.equal(nc.fs.read(p("new.txt")), "first");
    assert.equal(nc.createFile(p("new.txt"), true, { v: 2 }), true);
    assert.deepEqual(nc.fs.readJSON(p("new.txt")), { v: 2 });
    assert.equal(nc.createFile(""), undefined);
    assert.equal(nc.fs.ensureFolder(p("x", "y")), p("x", "y"));
    assert.equal(nc.fs.ensureFile(p("x", "y", "z.txt")), p("x", "y", "z.txt"));
    assert.equal(nc.fs.touch(p("touched")), true);
    assert.equal(nc.fs.isFile(p("touched")), true);
  });
});

describe("fs: listing and glob", () => {
  before(() => {
    for (const file of ["g/src/index.js", "g/src/lib/util.ts", "g/src/lib/.hidden.js", "g/README.md", "g/node_modules/pkg/index.js", "g/assets/logo.png"]) {
      fs.mkdirSync(path.dirname(p(file)), { recursive: true });
      fs.writeFileSync(p(file), "x");
    }
  });

  it("list skips node_modules", () => {
    const files = nc.fs.list(p("g")).map((f) => path.relative(p("g"), f).replace(/\\/g, "/")).sort();
    assert.deepEqual(files, ["README.md", "assets/logo.png", "src/index.js", "src/lib/.hidden.js", "src/lib/util.ts"]);
    assert.deepEqual(nc.fs.list(p("g"), { recursive: false }).map((f) => path.basename(f)), ["README.md"]);
    assert.equal(nc.fs.list(p("g"), { hidden: false }).some((f) => f.includes(".hidden")), false);
    assert.equal(nc.fs.list(p("g"), { type: "folders" }).some((f) => f.includes("node_modules")), false);
    assert.equal(nc.fs.list(p("nope")), undefined);
  });

  it("glob patterns", () => {
    const cwd = p("g");
    assert.deepEqual(nc.fs.glob("src/**/*.js", { cwd }), ["src/index.js"]);
    assert.deepEqual(nc.fs.glob("src/**/*.js", { cwd, dot: true }), ["src/index.js", "src/lib/.hidden.js"]);
    assert.deepEqual(nc.fs.glob("**/*.{js,ts}", { cwd }), ["src/index.js", "src/lib/util.ts"]);
    assert.deepEqual(nc.fs.glob("*.md", { cwd }), ["README.md"]);
    assert.deepEqual(nc.fs.glob("src/*", { cwd, type: "folders" }), ["src/lib"]);
    assert.deepEqual(nc.fs.glob("**/index.js", { cwd, ignore: [] }), ["node_modules/pkg/index.js", "src/index.js"]);
    assert.deepEqual(nc.fs.glob("**/*.js", { cwd, ignore: ["src/**", "**/node_modules/**"] }), []);
    assert.deepEqual(nc.fs.glob("**/*.js", { cwd, ignore: ["src/**"] }), ["node_modules/pkg/index.js"], "a custom ignore list replaces the default one");
    assert.deepEqual(nc.fs.glob(["*.md", "assets/*.png"], { cwd }), ["README.md", "assets/logo.png"]);
    assert.deepEqual(nc.fs.glob("src/li?/util.[tj]s", { cwd, absolute: true }), [path.join(cwd, "src", "lib", "util.ts")]);
  });

  it("absolute patterns search where they point and return absolute paths", () => {
    const cwd = p("g");
    const posix = cwd.replace(/\\/g, "/");
    assert.deepEqual(nc.fs.glob(`${posix}/src/**/*.ts`), [path.join(cwd, "src", "lib", "util.ts")]);
    assert.deepEqual(nc.fs.glob(`${cwd}/*.md`), [path.join(cwd, "README.md")], "backslashes work too");
    assert.deepEqual(nc.fs.glob(`${posix}/src/*`, { type: "folders" }), [path.join(cwd, "src", "lib")]);
    assert.deepEqual(nc.fs.glob(`${posix}/**/*.js`, { ignore: ["**/node_modules/**"] }), [path.join(cwd, "src", "index.js")]);
    assert.deepEqual(nc.fs.glob(`${posix}/*.md`, { absolute: false }), ["README.md"]);
    assert.deepEqual(nc.fs.glob([`${posix}/*.md`, `${posix}/assets/*.png`]), [path.join(cwd, "README.md"), path.join(cwd, "assets", "logo.png")].sort());
  });
});

describe("fs: copy, move, delete", () => {
  it("copy and move files and folders", () => {
    nc.fs.write(p("c", "src", "a.txt"), "a");
    nc.fs.write(p("c", "src", "sub", "b.log"), "b");
    assert.equal(nc.fs.copy(p("c", "src"), p("c", "dest")), true);
    assert.equal(nc.fs.read(p("c", "dest", "sub", "b.log")), "b");
    assert.equal(nc.fs.copy(p("c", "src"), p("c", "filtered"), { filter: (src) => !src.endsWith(".log") }), true);
    assert.equal(nc.fs.exists(p("c", "filtered", "sub", "b.log")), false);
    assert.equal(nc.fs.copy(p("c", "missing"), p("c", "x")), false);
    nc.fs.write(p("c", "keep.txt"), "original");
    nc.fs.write(p("c", "other.txt"), "other");
    nc.fs.copy(p("c", "other.txt"), p("c", "keep.txt"), { overwrite: false });
    assert.equal(nc.fs.read(p("c", "keep.txt")), "original");
    assert.equal(nc.fs.move(p("c", "dest"), p("c", "moved", "here")), true);
    assert.equal(nc.fs.exists(p("c", "dest")), false);
    assert.equal(nc.fs.read(p("c", "moved", "here", "a.txt")), "a");
  });

  // tests the deprecated alias on purpose: copy() and move() have no counts, no withFiles, no force
  it("legacy copy/move helpers keep their 1.x behaviour", () => {
    nc.fs.write(p("l", "src", "root.txt"), "r");
    nc.fs.write(p("l", "src", "one", "one.txt"), "1");
    nc.fs.write(p("l", "src", "one", "two", "two.txt"), "2");
    assert.equal(nc.copyFolder({ path: p("l", "src"), dest: p("l", "empty") }), true);
    assert.deepEqual(fs.readdirSync(p("l", "empty")), []);
    assert.equal(nc.copyFolder({ path: p("l", "src"), dest: p("l", "full"), recursive: true, withFiles: true }), true);
    assert.equal(nc.fs.read(p("l", "full", "one", "two", "two.txt")), "2");
    assert.equal(nc.copyFoldersIn({ path: p("l", "src"), dest: p("l", "folders"), withFiles: true }), 2);
    assert.equal(nc.fs.read(p("l", "folders", "one", "two", "two.txt")), "2");
    assert.equal(nc.copyFilesIn({ path: p("l", "src"), dest: p("l", "files"), filter: (f) => f.endsWith("one.txt") }), 1);
    assert.equal(nc.fs.read(p("l", "files", "one", "one.txt")), "1");
    assert.equal(nc.copyFile({ path: p("l", "src", "root.txt"), dest: `${p("l", "into")}${path.sep}` }), true);
    assert.equal(nc.fs.read(p("l", "into", "root.txt")), "r");
    assert.equal(nc.moveFile({ path: p("l", "into", "root.txt"), dest: p("l", "renamed.txt") }), true);
    assert.equal(nc.fs.exists(p("l", "into", "root.txt")), false);
    assert.equal(nc.moveFilesIn({ path: p("l", "files"), dest: p("l", "files2") }), 1);
    assert.equal(nc.fs.list(p("l", "files")).length, 0);
    assert.equal(nc.moveFolder({ path: p("l", "full"), dest: p("l", "full2"), recursive: true, withFiles: true }), true);
    assert.equal(nc.fs.exists(p("l", "full")), false);
    assert.equal(nc.copyFile({ path: p("l", "missing"), dest: p("l", "x") }), undefined);
  });

  // tests the deprecated alias on purpose: remove() returns no counts, and ensureFolder() doesn't report an existing folder
  it("delete helpers", () => {
    nc.fs.write(p("d", "a.log"), "1");
    nc.fs.write(p("d", "b.txt"), "2");
    nc.fs.write(p("d", "cache", "x"), "3");
    assert.equal(nc.deleteFilesIn(p("d"), false, (f) => f.endsWith(".log")), 1);
    assert.equal(nc.fs.exists(p("d", "b.txt")), true);
    assert.equal(nc.deleteFoldersIn(p("d"), (f) => f.endsWith("cache")), 1);
    assert.equal(nc.deleteFile(p("d", "b.txt")), true);
    assert.equal(nc.deleteFile(p("d", "b.txt")), undefined);
    nc.fs.write(p("e", "x", "y.txt"), "1");
    assert.equal(nc.emptyFolder(p("e")), true);
    assert.deepEqual(fs.readdirSync(p("e")), []);
    assert.equal(nc.deleteFolder(p("e")), true);
    assert.equal(nc.fs.remove(p("d")), true);
    assert.equal(nc.fs.remove(p("d")), false);
    assert.equal(nc.createFolder(p("f")), true);
    assert.equal(nc.createFolder(p("f")), false);
    nc.fs.write(p("f", "x"), "1");
    assert.equal(nc.createFolder(p("f"), true), true);
    assert.deepEqual(fs.readdirSync(p("f")), []);
  });
});

describe("fs: inspection and utilities", () => {
  it("exists, stat, sizes, hash", () => {
    nc.fs.write(p("s", "a.txt"), "hello");
    nc.fs.write(p("s", "b", "c.txt"), "12345");
    assert.equal(nc.fs.exists(p("s")), true);
    assert.equal(nc.fs.isFolder(p("s")), true);
    assert.equal(nc.fs.isFile(p("s")), false);
    assert.equal(nc.fs.size(p("s", "a.txt")), 5);
    assert.equal(nc.fs.size(p("s")), 10);
    assert.equal(nc.fs.stat(p("s", "a.txt")).isFile(), true);
    assert.equal(nc.fs.stat(p("nope")), undefined);
    assert.equal(nc.fs.hash(p("s", "a.txt")), nc.crypto.hash("hello"));
    assert.equal(nc.fs.hash(p("s", "a.txt"), { algorithm: "md5" }), "5d41402abc4b2a76b9719d911017c592");
  });

  it("temp and sanitizeFilename", () => {
    const dir = nc.fs.temp("nc-test-");
    assert.ok(fs.existsSync(dir) && path.basename(dir).startsWith("nc-test-"));
    nc.fs.remove(dir);
    assert.equal(nc.fs.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'), "Report_ Q1_Q2 _final__.pdf");
    assert.equal(nc.fs.sanitizeFilename("CON.txt"), "_CON.txt");
    assert.equal(nc.fs.sanitizeFilename("name. "), "name");
    assert.equal(nc.fs.sanitizeFilename("a/b", { replacement: "-" }), "a-b");
    assert.equal(nc.fs.sanitizeFilename(""), "_");
    assert.ok(Buffer.byteLength(nc.fs.sanitizeFilename("é".repeat(300))) <= 255);
  });

  it("watch reports changes", async () => {
    const dir = p("w");
    nc.fs.ensureFolder(dir);
    const events = [];
    const watcher = nc.fs.watch({ path: dir, debounce: 20 }).on("all", (event, file) => events.push([event, path.basename(file)]));
    await new Promise((r) => setTimeout(r, 50));
    fs.writeFileSync(path.join(dir, "file.txt"), "x");
    await new Promise((r) => setTimeout(r, 300));
    watcher.stop();
    assert.ok(events.some(([, name]) => name === "file.txt"), `events: ${JSON.stringify(events)}`);
    assert.equal(nc.fs.watch({ path: p("missing") }), undefined);
  });

  it("env.get, which replaces getEnv", () => {
    process.env.NC_TEST_VALUE = "42";
    assert.equal(nc.env.get("NC_TEST_VALUE"), "42");
    assert.equal(nc.env.get("NC_NOT_SET", "fallback"), "fallback");
    delete process.env.NC_TEST_VALUE;
  });
});
