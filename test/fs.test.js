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
  root = fs.mkdtempSync(path.join(os.tmpdir(), "nc-fs-"));
});
after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("fs: path resolution", () => {
  it("resolves ./ from the calling file and plain relative paths from cwd", () => {
    assert.equal(nc.createPath("./x.json"), path.join(__dirname, "x.json"));
    assert.equal(nc.createPath("x.json"), path.join(process.cwd(), "x.json"));
    assert.equal(nc.createPath(p("abs.txt")), p("abs.txt"));
    assert.equal(nc.createPath(), process.cwd());
  });

  it("resolves ./ from an ES module caller", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-esm-"));
    try {
      const script = path.join(dir, "caller.mjs");
      const pkg = pathToFileURL(path.join(__dirname, "..", "index.js")).href;
      fs.writeFileSync(script, `import nc from ${JSON.stringify(pkg)};\nprocess.stdout.write(nc.createPath("./data.json"));\n`);
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
      assert.equal(nc.getFile("only-here.txt"), undefined);
      assert.equal(nc.deleteFile("only-here.txt"), undefined);
      assert.ok(fs.existsSync(p("deep", "nested", "only-here.txt")), "the nested file was not deleted");
      assert.equal(nc.find("only-here.txt"), p("deep", "nested", "only-here.txt"));
      assert.equal(nc.find("nested", { type: "folder" }), p("deep", "nested"));
      assert.equal(nc.find("missing.txt"), undefined);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("fs: read and write", () => {
  it("writeFile is atomic and creates folders", () => {
    assert.equal(nc.writeFile(p("a", "b", "c.txt"), "hello"), true);
    assert.equal(nc.readFile(p("a", "b", "c.txt")), "hello");
    assert.deepEqual(fs.readdirSync(p("a", "b")), ["c.txt"], "no temporary file left behind");
    assert.equal(nc.writeFile(p("obj.json"), { a: 1 }), true);
    assert.equal(nc.readFile(p("obj.json")), '{\n  "a": 1\n}');
    assert.equal(nc.writeFile(p("bin.dat"), Buffer.from([1, 2])), true);
    assert.deepEqual([...nc.readFile(p("bin.dat"), "buffer")], [1, 2]);
    assert.equal(nc.readFile(p("missing.txt")), undefined);
  });

  it("JSON with fallback, BOM and comments", () => {
    assert.equal(nc.writeJSON(p("data", "settings.json"), { theme: "dark" }), true);
    assert.deepEqual(nc.readJSON(p("data", "settings.json")), { theme: "dark" });
    assert.deepEqual(nc.readJSON(p("nope.json"), { fallback: true }), { fallback: true });
    fs.writeFileSync(p("bom.json"), '﻿{"ok":1}');
    assert.deepEqual(nc.readJSON(p("bom.json")), { ok: 1 });
    fs.writeFileSync(p("conf.jsonc"), '{\n  // comment\n  "a": "http://x", /* block */\n  "b": [1, 2,],\n}');
    assert.deepEqual(nc.readJSON(p("conf.jsonc"), null, { comments: true }), { a: "http://x", b: [1, 2] });
    assert.equal(nc.readJSON(p("conf.jsonc"), "invalid"), "invalid");
    const circular = {};
    circular.self = circular;
    assert.equal(nc.writeJSON(p("circular.json"), circular), false);
  });

  it("append, readLines, createFile, ensure*, touch", () => {
    nc.appendFile(p("log", "a.log"), "one\n");
    nc.appendFile(p("log", "a.log"), "two\r\n");
    assert.deepEqual(nc.readLines(p("log", "a.log")), ["one", "two"]);
    assert.equal(nc.createFile(p("new.txt"), false, "first"), true);
    assert.equal(nc.createFile(p("new.txt"), false, "second"), false);
    assert.equal(nc.readFile(p("new.txt")), "first");
    assert.equal(nc.createFile(p("new.txt"), true, { v: 2 }), true);
    assert.deepEqual(nc.readJSON(p("new.txt")), { v: 2 });
    assert.equal(nc.createFile(""), undefined);
    assert.equal(nc.ensureFolder(p("x", "y")), p("x", "y"));
    assert.equal(nc.ensureFile(p("x", "y", "z.txt")), p("x", "y", "z.txt"));
    assert.equal(nc.touch(p("touched")), true);
    assert.equal(nc.isFile(p("touched")), true);
  });
});

describe("fs: listing and glob", () => {
  before(() => {
    for (const file of ["g/src/index.js", "g/src/lib/util.ts", "g/src/lib/.hidden.js", "g/README.md", "g/node_modules/pkg/index.js", "g/assets/logo.png"]) {
      fs.mkdirSync(path.dirname(p(file)), { recursive: true });
      fs.writeFileSync(p(file), "x");
    }
  });

  it("getFilesIn / getFoldersIn skip node_modules", () => {
    const files = nc.getFilesIn(p("g")).map((f) => path.relative(p("g"), f).replace(/\\/g, "/")).sort();
    assert.deepEqual(files, ["README.md", "assets/logo.png", "src/index.js", "src/lib/.hidden.js", "src/lib/util.ts"]);
    assert.deepEqual(nc.getFilesIn(p("g"), false).map((f) => path.basename(f)), ["README.md"]);
    assert.equal(nc.getFilesIn(p("g"), { hidden: false }).some((f) => f.includes(".hidden")), false);
    assert.equal(nc.getFoldersIn(p("g")).some((f) => f.includes("node_modules")), false);
    assert.equal(nc.getFilesIn(p("nope")), undefined);
  });

  it("glob patterns", () => {
    const cwd = p("g");
    assert.deepEqual(nc.glob("src/**/*.js", { cwd }), ["src/index.js"]);
    assert.deepEqual(nc.glob("src/**/*.js", { cwd, dot: true }), ["src/index.js", "src/lib/.hidden.js"]);
    assert.deepEqual(nc.glob("**/*.{js,ts}", { cwd }), ["src/index.js", "src/lib/util.ts"]);
    assert.deepEqual(nc.glob("*.md", { cwd }), ["README.md"]);
    assert.deepEqual(nc.glob("src/*", { cwd, type: "folders" }), ["src/lib"]);
    assert.deepEqual(nc.glob("**/index.js", { cwd, ignore: [] }), ["node_modules/pkg/index.js", "src/index.js"]);
    assert.deepEqual(nc.glob("**/*.js", { cwd, ignore: ["src/**", "**/node_modules/**"] }), []);
    assert.deepEqual(nc.glob("**/*.js", { cwd, ignore: ["src/**"] }), ["node_modules/pkg/index.js"], "a custom ignore list replaces the default one");
    assert.deepEqual(nc.glob(["*.md", "assets/*.png"], { cwd }), ["README.md", "assets/logo.png"]);
    assert.deepEqual(nc.glob("src/li?/util.[tj]s", { cwd, absolute: true }), [path.join(cwd, "src", "lib", "util.ts")]);
  });

  it("absolute patterns search where they point and return absolute paths", () => {
    const cwd = p("g");
    const posix = cwd.replace(/\\/g, "/");
    assert.deepEqual(nc.glob(`${posix}/src/**/*.ts`), [path.join(cwd, "src", "lib", "util.ts")]);
    assert.deepEqual(nc.glob(`${cwd}/*.md`), [path.join(cwd, "README.md")], "backslashes work too");
    assert.deepEqual(nc.glob(`${posix}/src/*`, { type: "folders" }), [path.join(cwd, "src", "lib")]);
    assert.deepEqual(nc.glob(`${posix}/**/*.js`, { ignore: ["**/node_modules/**"] }), [path.join(cwd, "src", "index.js")]);
    assert.deepEqual(nc.glob(`${posix}/*.md`, { absolute: false }), ["README.md"]);
    assert.deepEqual(nc.glob([`${posix}/*.md`, `${posix}/assets/*.png`]), [path.join(cwd, "README.md"), path.join(cwd, "assets", "logo.png")].sort());
  });
});

describe("fs: copy, move, delete", () => {
  it("copy and move files and folders", () => {
    nc.writeFile(p("c", "src", "a.txt"), "a");
    nc.writeFile(p("c", "src", "sub", "b.log"), "b");
    assert.equal(nc.copy(p("c", "src"), p("c", "dest")), true);
    assert.equal(nc.readFile(p("c", "dest", "sub", "b.log")), "b");
    assert.equal(nc.copy(p("c", "src"), p("c", "filtered"), { filter: (src) => !src.endsWith(".log") }), true);
    assert.equal(nc.exists(p("c", "filtered", "sub", "b.log")), false);
    assert.equal(nc.copy(p("c", "missing"), p("c", "x")), false);
    nc.writeFile(p("c", "keep.txt"), "original");
    nc.writeFile(p("c", "other.txt"), "other");
    nc.copy(p("c", "other.txt"), p("c", "keep.txt"), { overwrite: false });
    assert.equal(nc.readFile(p("c", "keep.txt")), "original");
    assert.equal(nc.move(p("c", "dest"), p("c", "moved", "here")), true);
    assert.equal(nc.exists(p("c", "dest")), false);
    assert.equal(nc.readFile(p("c", "moved", "here", "a.txt")), "a");
  });

  it("legacy copy/move helpers keep their 1.x behaviour", () => {
    nc.writeFile(p("l", "src", "root.txt"), "r");
    nc.writeFile(p("l", "src", "one", "one.txt"), "1");
    nc.writeFile(p("l", "src", "one", "two", "two.txt"), "2");
    assert.equal(nc.copyFolder({ path: p("l", "src"), dest: p("l", "empty") }), true);
    assert.deepEqual(fs.readdirSync(p("l", "empty")), []);
    assert.equal(nc.copyFolder({ path: p("l", "src"), dest: p("l", "full"), recursive: true, withFiles: true }), true);
    assert.equal(nc.readFile(p("l", "full", "one", "two", "two.txt")), "2");
    assert.equal(nc.copyFoldersIn({ path: p("l", "src"), dest: p("l", "folders"), withFiles: true }), 2);
    assert.equal(nc.readFile(p("l", "folders", "one", "two", "two.txt")), "2");
    assert.equal(nc.copyFilesIn({ path: p("l", "src"), dest: p("l", "files"), filter: (f) => f.endsWith("one.txt") }), 1);
    assert.equal(nc.readFile(p("l", "files", "one", "one.txt")), "1");
    assert.equal(nc.copyFile({ path: p("l", "src", "root.txt"), dest: `${p("l", "into")}${path.sep}` }), true);
    assert.equal(nc.readFile(p("l", "into", "root.txt")), "r");
    assert.equal(nc.moveFile({ path: p("l", "into", "root.txt"), dest: p("l", "renamed.txt") }), true);
    assert.equal(nc.exists(p("l", "into", "root.txt")), false);
    assert.equal(nc.moveFilesIn({ path: p("l", "files"), dest: p("l", "files2") }), 1);
    assert.equal(nc.getFilesIn(p("l", "files")).length, 0);
    assert.equal(nc.moveFolder({ path: p("l", "full"), dest: p("l", "full2"), recursive: true, withFiles: true }), true);
    assert.equal(nc.exists(p("l", "full")), false);
    assert.equal(nc.copyFile({ path: p("l", "missing"), dest: p("l", "x") }), undefined);
  });

  it("delete helpers", () => {
    nc.writeFile(p("d", "a.log"), "1");
    nc.writeFile(p("d", "b.txt"), "2");
    nc.writeFile(p("d", "cache", "x"), "3");
    assert.equal(nc.deleteFilesIn(p("d"), false, (f) => f.endsWith(".log")), 1);
    assert.equal(nc.exists(p("d", "b.txt")), true);
    assert.equal(nc.deleteFoldersIn(p("d"), (f) => f.endsWith("cache")), 1);
    assert.equal(nc.deleteFile(p("d", "b.txt")), true);
    assert.equal(nc.deleteFile(p("d", "b.txt")), undefined);
    nc.writeFile(p("e", "x", "y.txt"), "1");
    assert.equal(nc.emptyFolder(p("e")), true);
    assert.deepEqual(fs.readdirSync(p("e")), []);
    assert.equal(nc.deleteFolder(p("e")), true);
    assert.equal(nc.remove(p("d")), true);
    assert.equal(nc.remove(p("d")), false);
    assert.equal(nc.createFolder(p("f")), true);
    assert.equal(nc.createFolder(p("f")), false);
    nc.writeFile(p("f", "x"), "1");
    assert.equal(nc.createFolder(p("f"), true), true);
    assert.deepEqual(fs.readdirSync(p("f")), []);
  });
});

describe("fs: inspection and utilities", () => {
  it("exists, stat, sizes, hash", () => {
    nc.writeFile(p("s", "a.txt"), "hello");
    nc.writeFile(p("s", "b", "c.txt"), "12345");
    assert.equal(nc.exists(p("s")), true);
    assert.equal(nc.isFolder(p("s")), true);
    assert.equal(nc.isFile(p("s")), false);
    assert.equal(nc.fileSize(p("s", "a.txt")), 5);
    assert.equal(nc.folderSize(p("s")), 10);
    assert.equal(nc.stat(p("s", "a.txt")).isFile(), true);
    assert.equal(nc.stat(p("nope")), undefined);
    assert.equal(nc.hashFile(p("s", "a.txt")), nc.crypto.hash("hello"));
    assert.equal(nc.hashFile(p("s", "a.txt"), { algorithm: "md5" }), "5d41402abc4b2a76b9719d911017c592");
  });

  it("tempFolder and sanitizeFilename", () => {
    const dir = nc.tempFolder("nc-test-");
    assert.ok(fs.existsSync(dir) && path.basename(dir).startsWith("nc-test-"));
    nc.remove(dir);
    assert.equal(nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'), "Report_ Q1_Q2 _final__.pdf");
    assert.equal(nc.sanitizeFilename("CON.txt"), "_CON.txt");
    assert.equal(nc.sanitizeFilename("name. "), "name");
    assert.equal(nc.sanitizeFilename("a/b", { replacement: "-" }), "a-b");
    assert.equal(nc.sanitizeFilename(""), "_");
    assert.ok(Buffer.byteLength(nc.sanitizeFilename("é".repeat(300))) <= 255);
  });

  it("watch reports changes", async () => {
    const dir = p("w");
    nc.ensureFolder(dir);
    const events = [];
    const watcher = nc.watch({ path: dir, debounce: 20 }).on("all", (event, file) => events.push([event, path.basename(file)]));
    await new Promise((r) => setTimeout(r, 50));
    fs.writeFileSync(path.join(dir, "file.txt"), "x");
    await new Promise((r) => setTimeout(r, 300));
    watcher.stop();
    assert.ok(events.some(([, name]) => name === "file.txt"), `events: ${JSON.stringify(events)}`);
    assert.equal(nc.watch({ path: p("missing") }), undefined);
  });

  it("getEnv", () => {
    process.env.NC_TEST_VALUE = "42";
    assert.equal(nc.getEnv("NC_TEST_VALUE"), "42");
    assert.equal(nc.getEnv("NC_NOT_SET", "fallback"), "fallback");
    delete process.env.NC_TEST_VALUE;
  });
});
