"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const nc = require("..");

const windows = process.platform === "win32";

let root;
const at = (...parts) => path.join(root, ...parts);

before(() => {
  // macOS: /var is a link to /private/var, and the package resolves real paths
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nc-fs-v3-")));
});
after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** A new folder with a.txt, b.log, .hidden, sub/c.txt, sub/deep/d.txt and node_modules/x.js. */
let count = 0;
const tree = () => {
  const dir = at(`tree${count++}`);
  fs.mkdirSync(path.join(dir, "sub", "deep"), { recursive: true });
  fs.mkdirSync(path.join(dir, "node_modules"));
  fs.writeFileSync(path.join(dir, "a.txt"), "aaa");
  fs.writeFileSync(path.join(dir, "b.log"), "bb");
  fs.writeFileSync(path.join(dir, ".hidden"), "h");
  fs.writeFileSync(path.join(dir, "sub", "c.txt"), "cccc");
  fs.writeFileSync(path.join(dir, "sub", "deep", "d.txt"), "d");
  fs.writeFileSync(path.join(dir, "node_modules", "x.js"), "x");
  return dir;
};
const rel = (dir, list) => list.map((p) => path.relative(dir, p).split(path.sep).join("/")).sort();
const text = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

/** Calls `fn` with process.emitWarning replaced, and returns the warnings it got. */
const warnings = (fn) => {
  const original = process.emitWarning;
  const got = [];
  process.emitWarning = (message, options) => {
    got.push({ message, options });
  };
  try {
    fn();
  } finally {
    process.emitWarning = original;
  }
  return got;
};

const NEW = ["read", "readJSON", "readLines", "write", "writeJSON", "append", "exists", "isFile", "isFolder", "stat", "size", "hash", "list", "glob", "find", "findUp", "ensureFile", "ensureFolder", "touch", "copy", "move", "remove", "resolve", "temp", "sanitizeFilename", "watch"];

const OLD = {
  getEnv: "nc.env.get()",
  createPath: "nc.fs.resolve()",
  getFolder: "nc.fs.isFolder(p) ? nc.fs.resolve(p) : undefined",
  getFile: "nc.fs.isFile(p) ? nc.fs.resolve(p) : undefined",
  getFoldersIn: "nc.fs.list()",
  getFilesIn: "nc.fs.list()",
  readFile: "nc.fs.read()",
  writeFile: "nc.fs.write()",
  appendFile: "nc.fs.append()",
  createFile: "nc.fs.ensureFile() or nc.fs.write()",
  createFolder: "nc.fs.ensureFolder()",
  deleteFolder: "nc.fs.remove()",
  deleteFile: "nc.fs.remove()",
  deleteFoldersIn: "nc.fs.remove()",
  deleteFilesIn: "nc.fs.remove()",
  emptyFolder: "nc.fs.remove()",
  copyFoldersIn: "nc.fs.copy()",
  copyFolder: "nc.fs.copy()",
  copyFilesIn: "nc.fs.copy()",
  copyFile: "nc.fs.copy()",
  moveFoldersIn: "nc.fs.move()",
  moveFolder: "nc.fs.move()",
  moveFilesIn: "nc.fs.move()",
  moveFile: "nc.fs.move()",
  fileSize: "nc.fs.size()",
  folderSize: "nc.fs.size()",
  hashFile: "nc.fs.hash()",
  tempFolder: "nc.fs.temp()",
};

describe("fs 3.0: the namespace", () => {
  it("lists the 26 new functions only, in order", () => {
    assert.deepEqual(Object.keys(nc.fs), NEW);
    for (const name of NEW) assert.equal(typeof nc.fs[name], "function", name);
  });

  it("lists no deprecated name, and listing warns nothing", () => {
    const got = warnings(() => {
      const keys = [];
      for (const key in nc.fs) keys.push(key);
      assert.deepEqual(keys, NEW);
      assert.deepEqual(Object.entries(nc.fs).map(([key]) => key), NEW);
      assert.deepEqual({ ...nc.fs }, Object.fromEntries(NEW.map((name) => [name, nc.fs[name]])));
    });
    assert.deepEqual(got, []);
  });
});

describe("fs 3.0: deprecated aliases", () => {
  it("each one is a hidden accessor that warns once, with the exact message and code", () => {
    for (const [name, instead] of Object.entries(OLD)) {
      const descriptor = Object.getOwnPropertyDescriptor(nc.fs, name);
      assert.ok(descriptor, name);
      assert.equal(descriptor.enumerable, false, name);
      assert.equal(typeof descriptor.get, "function", name);
      const got = warnings(() => {
        assert.equal(typeof nc.fs[name], "function", name);
        assert.equal(typeof nc.fs[name], "function", name);
      });
      assert.equal(got.length, 1, name);
      assert.equal(got[0].message, `nc.fs.${name}() is deprecated: use ${instead}. It will be removed in 4.0.`);
      assert.deepEqual(got[0].options, { type: "DeprecationWarning", code: `NODE_COMFORT_DEP_FS_${name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}` });
      // once per name: a third read stays silent
      assert.deepEqual(warnings(() => nc.fs[name]), []);
    }
  });

  it("the old names keep their 2.2 behaviour", () => {
    const dir = tree();
    warnings(() => {
      process.env.NC_FS_V3_TEST = "set";
      assert.equal(nc.fs.getEnv("NC_FS_V3_TEST"), "set");
      assert.equal(nc.fs.getEnv("NC_FS_V3_MISSING", "fallback"), "fallback");
      delete process.env.NC_FS_V3_TEST;
      assert.equal(nc.fs.createPath(dir), dir);
      assert.equal(nc.fs.createPath("./x.txt"), path.join(__dirname, "x.txt"));
      assert.equal(nc.fs.createPath("./x.txt"), nc.fs.resolve("./x.txt"));
      assert.equal(nc.fs.getFolder(dir), dir);
      assert.equal(nc.fs.getFolder(path.join(dir, "a.txt")), undefined);
      assert.equal(nc.fs.getFile(path.join(dir, "a.txt")), path.join(dir, "a.txt"));
      assert.equal(nc.fs.getFile(path.join(dir, "missing")), undefined);
      assert.deepEqual(rel(dir, nc.fs.getFilesIn(dir)), [".hidden", "a.txt", "b.log", "sub/c.txt", "sub/deep/d.txt"]);
      assert.deepEqual(rel(dir, nc.fs.getFilesIn(dir, false)), [".hidden", "a.txt", "b.log"]);
      assert.deepEqual(rel(dir, nc.fs.getFoldersIn(dir)), ["sub", "sub/deep"]);
      assert.deepEqual(rel(dir, nc.fs.getFoldersIn(dir, { recursive: false })), ["sub"]);
      assert.equal(nc.fs.getFilesIn(path.join(dir, "missing")), undefined);
      assert.equal(nc.fs.readFile(path.join(dir, "a.txt")), "aaa");
      assert.ok(Buffer.isBuffer(nc.fs.readFile(path.join(dir, "a.txt"), "buffer")));
      assert.equal(nc.fs.readFile(path.join(dir, "missing")), undefined);
      assert.equal(nc.fs.writeFile(path.join(dir, "w", "o.json"), { a: 1 }), true);
      assert.equal(text(dir, "w", "o.json"), '{\n  "a": 1\n}');
      assert.equal(nc.fs.appendFile(path.join(dir, "w", "log.txt"), "1"), true);
      assert.equal(nc.fs.appendFile(path.join(dir, "w", "log.txt"), "2"), true);
      assert.equal(text(dir, "w", "log.txt"), "12");
      assert.equal(nc.fs.createFile(path.join(dir, "w", "new.txt"), false, "hi"), true);
      assert.equal(nc.fs.createFile(path.join(dir, "w", "new.txt"), false, "again"), false);
      assert.equal(nc.fs.createFile(path.join(dir, "w", "new.txt"), true, "again"), true);
      assert.equal(text(dir, "w", "new.txt"), "again");
      assert.equal(nc.fs.createFolder(path.join(dir, "made")), true);
      assert.equal(nc.fs.createFolder(path.join(dir, "made")), false);
      assert.equal(nc.fs.fileSize(path.join(dir, "a.txt")), 3);
      assert.equal(nc.fs.fileSize(dir), undefined);
      assert.equal(nc.fs.folderSize(path.join(dir, "sub")), 5);
      assert.equal(nc.fs.folderSize(path.join(dir, "a.txt")), undefined);
      assert.equal(nc.fs.hashFile(path.join(dir, "a.txt")), nc.fs.hash(path.join(dir, "a.txt")));
      const tmp = nc.fs.tempFolder("nc-v3-old-");
      assert.ok(path.basename(tmp).startsWith("nc-v3-old-"));
      fs.rmSync(tmp, { recursive: true });
    });
  });

  it("the old copy and move functions keep their 2.2 behaviour", () => {
    const dir = tree();
    warnings(() => {
      // copyFile: a trailing / or an existing folder means "into it"
      assert.equal(nc.fs.copyFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, "out") + "/" }), true);
      assert.equal(text(dir, "out", "a.txt"), "aaa");
      assert.equal(nc.fs.copyFile({ path: path.join(dir, "b.log"), dest: path.join(dir, "out") }), true);
      assert.equal(text(dir, "out", "b.log"), "bb");
      assert.equal(nc.fs.copyFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, "a.txt") }), false);
      assert.equal(nc.fs.copyFile({ path: path.join(dir, "missing"), dest: path.join(dir, "out") }), undefined);
      // copyFolder without recursive or withFiles: only the empty folder
      assert.equal(nc.fs.copyFolder({ path: path.join(dir, "sub"), dest: path.join(dir, "empty") }), true);
      assert.deepEqual(fs.readdirSync(path.join(dir, "empty")), []);
      assert.equal(nc.fs.copyFolder({ path: path.join(dir, "sub"), dest: path.join(dir, "full"), recursive: true, withFiles: true }), true);
      assert.equal(text(dir, "full", "deep", "d.txt"), "d");
      assert.equal(nc.fs.copyFolder({ path: dir, dest: path.join(dir, "sub", "inside") }), false);
      // copyFilesIn and copyFoldersIn count
      assert.equal(nc.fs.copyFilesIn({ path: path.join(dir, "sub"), dest: path.join(dir, "files"), filter: (f) => f.endsWith(".txt") }), 2);
      assert.equal(text(dir, "files", "deep", "d.txt"), "d");
      assert.equal(nc.fs.copyFoldersIn({ path: path.join(dir, "sub"), dest: path.join(dir, "folders") }), 1);
      assert.ok(fs.statSync(path.join(dir, "folders", "deep")).isDirectory());
      assert.equal(nc.fs.copyFoldersIn({ path: dir, dest: path.join(dir, "sub") }), 0);
      // moveFile, moveFilesIn, moveFoldersIn, moveFolder
      assert.equal(nc.fs.moveFile({ path: path.join(dir, "out", "a.txt"), dest: path.join(dir, "moved") + "/" }), true);
      assert.equal(text(dir, "moved", "a.txt"), "aaa");
      assert.equal(fs.existsSync(path.join(dir, "out", "a.txt")), false);
      assert.equal(nc.fs.moveFilesIn({ path: path.join(dir, "files"), dest: path.join(dir, "files2") }), 2);
      assert.equal(fs.existsSync(path.join(dir, "files", "c.txt")), false);
      assert.equal(nc.fs.moveFoldersIn({ path: path.join(dir, "folders"), dest: path.join(dir, "folders2") }), 1);
      assert.equal(fs.existsSync(path.join(dir, "folders", "deep")), false);
      assert.equal(nc.fs.moveFolder({ path: path.join(dir, "full"), dest: path.join(dir, "full2"), recursive: true, withFiles: true }), true);
      assert.equal(fs.existsSync(path.join(dir, "full")), false);
      assert.equal(text(dir, "full2", "c.txt"), "cccc");
    });
  });

  it("the old delete functions keep their 2.2 behaviour", () => {
    const dir = tree();
    warnings(() => {
      assert.equal(nc.fs.deleteFile(path.join(dir, "a.txt")), true);
      assert.equal(nc.fs.deleteFile(path.join(dir, "a.txt")), undefined);
      assert.equal(nc.fs.deleteFile(path.join(dir, "sub")), undefined);
      assert.equal(nc.fs.deleteFilesIn(dir, false, (f) => f.endsWith(".log")), 1);
      assert.equal(fs.existsSync(path.join(dir, "sub", "c.txt")), true);
      assert.equal(nc.fs.deleteFilesIn(path.join(dir, "missing")), undefined);
      assert.equal(nc.fs.deleteFoldersIn(path.join(dir, "sub"), (f) => f.endsWith("deep")), 1);
      assert.equal(fs.existsSync(path.join(dir, "sub", "deep")), false);
      assert.equal(nc.fs.emptyFolder(path.join(dir, "sub")), true);
      assert.deepEqual(fs.readdirSync(path.join(dir, "sub")), []);
      assert.equal(nc.fs.emptyFolder(path.join(dir, "missing")), undefined);
      assert.equal(nc.fs.deleteFolder(path.join(dir, "sub")), true);
      assert.equal(nc.fs.deleteFolder(path.join(dir, "sub")), undefined);
    });
  });

  it("an alias can be replaced, for a mock, and stays hidden", () => {
    let original;
    warnings(() => {
      original = nc.fs.readFile;
    });
    try {
      nc.fs.readFile = () => "mocked";
      assert.equal(nc.fs.readFile("x"), "mocked");
      assert.equal(Object.keys(nc.fs).includes("readFile"), false);
    } finally {
      nc.fs.readFile = original;
    }
  });
});

describe("fs 3.0: reading and writing", () => {
  it("read, write, append", () => {
    const file = at("rw", "note.txt");
    assert.equal(nc.fs.write(file, "hello"), true);
    assert.equal(nc.fs.read(file), "hello");
    assert.deepEqual(nc.fs.read(file, "buffer"), Buffer.from("hello"));
    assert.equal(nc.fs.append(file, " world"), true);
    assert.equal(nc.fs.read(file), "hello world");
    assert.equal(nc.fs.append(at("rw", "new", "log.txt"), "1"), true);
    assert.equal(nc.fs.read(at("rw", "new", "log.txt")), "1");
    assert.equal(nc.fs.read(at("rw", "missing")), undefined);
    assert.equal(nc.fs.read(at("rw")), undefined);
    assert.equal(nc.fs.write(at("rw", "obj.json"), { a: 1 }, { spaces: 0 }), true);
    assert.equal(nc.fs.read(at("rw", "obj.json")), '{"a":1}');
  });

  it("write is atomic and leaves no temporary file", () => {
    const file = at("atomic", "data.txt");
    assert.equal(nc.fs.write(file, "one"), true);
    assert.equal(nc.fs.write(file, "two"), true);
    assert.deepEqual(fs.readdirSync(at("atomic")), ["data.txt"]);
    assert.equal(nc.fs.read(file), "two");
  });

  it("readJSON, writeJSON, readLines", () => {
    const file = at("json", "data.json");
    assert.equal(nc.fs.writeJSON(file, { list: [1, 2] }), true);
    assert.deepEqual(nc.fs.readJSON(file), { list: [1, 2] });
    assert.deepEqual(nc.fs.readJSON(at("json", "missing.json"), { fallback: true }), { fallback: true });
    nc.fs.write(at("json", "c.jsonc"), '{ "a": 1, // note\n }');
    assert.deepEqual(nc.fs.readJSON(at("json", "c.jsonc"), null, { comments: true }), { a: 1 });
    nc.fs.write(at("json", "lines.txt"), "a\r\nb\nc\n");
    assert.deepEqual(nc.fs.readLines(at("json", "lines.txt")), ["a", "b", "c"]);
    assert.equal(nc.fs.readLines(at("json", "missing.txt")), undefined);
  });
});

describe("fs 3.0: checking", () => {
  it("exists, isFile, isFolder, stat", () => {
    const dir = tree();
    assert.equal(nc.fs.exists(dir), true);
    assert.equal(nc.fs.exists(path.join(dir, "missing")), false);
    assert.equal(nc.fs.isFile(path.join(dir, "a.txt")), true);
    assert.equal(nc.fs.isFile(dir), false);
    assert.equal(nc.fs.isFolder(dir), true);
    assert.equal(nc.fs.isFolder(path.join(dir, "a.txt")), false);
    assert.equal(nc.fs.stat(path.join(dir, "a.txt")).size, 3);
    assert.equal(nc.fs.stat(path.join(dir, "missing")), undefined);
  });

  it("size gives a file's bytes, or a folder's total", () => {
    const dir = tree();
    assert.equal(nc.fs.size(path.join(dir, "a.txt")), 3);
    assert.equal(nc.fs.size(path.join(dir, "sub")), 5);
    // everything, hidden files and node_modules included
    assert.equal(nc.fs.size(dir), 3 + 2 + 1 + 4 + 1 + 1);
    fs.mkdirSync(path.join(dir, "empty"));
    assert.equal(nc.fs.size(path.join(dir, "empty")), 0);
    assert.equal(nc.fs.size(path.join(dir, "missing")), undefined);
    assert.equal(nc.fs.size(""), undefined);
  });

  it("size doesn't follow a junction or a link to a folder", () => {
    const dir = tree();
    const outside = at(`outside${count++}`);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "big.bin"), Buffer.alloc(10_000));
    fs.symlinkSync(outside, path.join(dir, "sub", "link"), "junction");
    assert.ok(nc.fs.size(path.join(dir, "sub")) < 10_000);
  });

  it("hash", () => {
    const file = at("hash.txt");
    fs.writeFileSync(file, "abc");
    assert.equal(nc.fs.hash(file), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal(nc.fs.hash(file, { algorithm: "md5" }), "900150983cd24fb0d6963f7d28e17f72");
    assert.equal(nc.fs.hash(file, { encoding: "base64" }), "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=");
    assert.equal(nc.fs.hash(at("missing")), undefined);
  });
});

describe("fs 3.0: list", () => {
  it("lists files by default, nested ones included, node_modules skipped", () => {
    const dir = tree();
    assert.deepEqual(rel(dir, nc.fs.list(dir)), [".hidden", "a.txt", "b.log", "sub/c.txt", "sub/deep/d.txt"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "files" })), rel(dir, nc.fs.list(dir)));
  });

  it("type: folders and all", () => {
    const dir = tree();
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "folders" })), ["sub", "sub/deep"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "all" })), [".hidden", "a.txt", "b.log", "sub", "sub/c.txt", "sub/deep", "sub/deep/d.txt"]);
  });

  it("recursive: false, hidden, ignore", () => {
    const dir = tree();
    assert.deepEqual(rel(dir, nc.fs.list(dir, { recursive: false })), [".hidden", "a.txt", "b.log"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "all", recursive: false })), [".hidden", "a.txt", "b.log", "sub"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { hidden: false, recursive: false })), ["a.txt", "b.log"]);
    // dot, as glob calls it, is the same option
    assert.deepEqual(rel(dir, nc.fs.list(dir, { dot: false, recursive: false })), ["a.txt", "b.log"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { dot: true, recursive: false })), [".hidden", "a.txt", "b.log"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { dot: false, hidden: true, recursive: false })), [".hidden", "a.txt", "b.log"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { ignore: ["sub"] })), [".hidden", "a.txt", "b.log", "node_modules/x.js"]);
  });

  it("filter picks results, and a folder left out is still searched", () => {
    const dir = tree();
    assert.deepEqual(rel(dir, nc.fs.list(dir, { filter: (p) => p.endsWith(".txt") })), ["a.txt", "sub/c.txt", "sub/deep/d.txt"]);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "all", filter: (p) => !p.endsWith("sub") })), [".hidden", "a.txt", "b.log", "sub/c.txt", "sub/deep", "sub/deep/d.txt"]);
  });

  it("gives undefined for a missing folder, or a file", () => {
    const dir = tree();
    assert.equal(nc.fs.list(path.join(dir, "missing")), undefined);
    assert.equal(nc.fs.list(path.join(dir, "a.txt")), undefined);
  });

  it("lists a junction as a file, never what it points to", () => {
    const dir = tree();
    const outside = at(`outside${count++}`);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.txt"), "s");
    fs.symlinkSync(outside, path.join(dir, "link"), "junction");
    const all = rel(dir, nc.fs.list(dir, { type: "all" }));
    assert.ok(all.includes("link"));
    assert.ok(!all.some((p) => p.includes("secret")));
    assert.ok(!rel(dir, nc.fs.list(dir, { type: "folders" })).includes("link"));
  });
});

describe("fs 3.0: glob, find, findUp", () => {
  it("still work under nc.fs", () => {
    const dir = tree();
    assert.deepEqual(nc.fs.glob("**/*.txt", { cwd: dir }), ["a.txt", "sub/c.txt", "sub/deep/d.txt"]);
    assert.equal(nc.fs.find("d.txt", { cwd: dir }), path.join(dir, "sub", "deep", "d.txt"));
    assert.equal(nc.fs.findUp("a.txt", { cwd: path.join(dir, "sub", "deep") }), path.join(dir, "a.txt"));
  });

  it("find and findUp take the plural types of list and glob, and the singular ones", () => {
    const dir = tree();
    fs.mkdirSync(path.join(dir, "sub", "deep", "a.txt"));
    const deep = path.join(dir, "sub", "deep");
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "folders" }), deep);
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "folder" }), deep);
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "files" }), undefined);
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "file" }), undefined);
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "all" }), deep);
    assert.equal(nc.fs.find("deep", { cwd: dir, type: "any" }), deep);
    assert.equal(nc.fs.find("deep", { cwd: dir }), undefined);
    // a.txt is a folder down there and a file above it
    assert.equal(nc.fs.findUp("a.txt", { cwd: deep, type: "files" }), path.join(dir, "a.txt"));
    assert.equal(nc.fs.findUp("a.txt", { cwd: deep, type: "file" }), path.join(dir, "a.txt"));
    assert.equal(nc.fs.findUp("a.txt", { cwd: deep, type: "folders" }), path.join(deep, "a.txt"));
    assert.equal(nc.fs.findUp("a.txt", { cwd: deep, type: "all" }), path.join(deep, "a.txt"));
    assert.equal(nc.fs.findUp("a.txt", { cwd: deep }), path.join(deep, "a.txt"));
  });
});

describe("fs 3.0: resolve", () => {
  it("resolves ./ from the calling file, other relative paths from the working directory", () => {
    assert.equal(nc.fs.resolve("./x.txt"), path.join(__dirname, "x.txt"));
    assert.equal(nc.fs.resolve("../x.txt"), path.join(__dirname, "..", "x.txt"));
    assert.equal(nc.fs.resolve("logs/app.log"), path.join(process.cwd(), "logs", "app.log"));
    assert.equal(nc.fs.resolve(), process.cwd());
    assert.equal(nc.fs.resolve(root), root);
  });
});

describe("fs 3.0: ensureFile, ensureFolder, touch", () => {
  it("create what's missing and leave the rest", () => {
    const file = at("ensure", "a", "b.txt");
    assert.equal(nc.fs.ensureFile(file), file);
    assert.equal(fs.readFileSync(file, "utf8"), "");
    fs.writeFileSync(file, "kept");
    nc.fs.ensureFile(file);
    assert.equal(fs.readFileSync(file, "utf8"), "kept");
    assert.equal(nc.fs.ensureFolder(at("ensure", "x", "y")), at("ensure", "x", "y"));
    assert.ok(fs.statSync(at("ensure", "x", "y")).isDirectory());
    const old = new Date(2000, 0, 1);
    fs.utimesSync(file, old, old);
    assert.equal(nc.fs.touch(file), true);
    assert.ok(fs.statSync(file).mtimeMs > old.getTime());
    assert.equal(fs.readFileSync(file, "utf8"), "kept");
  });
});

describe("fs 3.0: copy", () => {
  it("copies a file and a folder", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), path.join(dir, "out", "copy.txt")), true);
    assert.equal(text(dir, "out", "copy.txt"), "aaa");
    assert.equal(nc.fs.copy(path.join(dir, "sub"), path.join(dir, "sub2")), true);
    assert.equal(text(dir, "sub2", "deep", "d.txt"), "d");
    assert.equal(nc.fs.copy(path.join(dir, "missing"), path.join(dir, "x")), false);
  });

  it("a file goes into a dest ending with /, under the same name", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), path.join(dir, "into") + "/"), true);
    assert.equal(text(dir, "into", "a.txt"), "aaa");
    assert.equal(nc.fs.copy(path.join(dir, "b.log"), path.join(dir, "x", "y") + "/"), true);
    assert.equal(text(dir, "x", "y", "b.log"), "bb");
  });

  it("a file copied onto an existing folder goes inside it", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), path.join(dir, "sub")), true);
    assert.equal(text(dir, "sub", "a.txt"), "aaa");
    assert.equal(text(dir, "sub", "c.txt"), "cccc");
  });

  it("a file to an existing file with a trailing / is refused, nothing touched", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), path.join(dir, "b.log") + "/"), false);
    assert.equal(text(dir, "b.log"), "bb");
  });

  it("a folder keeps the 2.2 meaning: dest is the copy, a trailing / changes nothing", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "sub"), path.join(dir, "dist") + "/"), true);
    assert.deepEqual(rel(path.join(dir, "dist"), nc.fs.list(path.join(dir, "dist"))), ["c.txt", "deep/d.txt"]);
    assert.equal(nc.fs.copy(path.join(dir, "sub"), path.join(dir, "plain")), true);
    assert.equal(text(dir, "plain", "c.txt"), "cccc");
    // onto an existing folder: merged with what's there, as in 2.2
    fs.mkdirSync(path.join(dir, "there"));
    fs.writeFileSync(path.join(dir, "there", "kept.txt"), "k");
    assert.equal(nc.fs.copy(path.join(dir, "sub"), path.join(dir, "there") + "/"), true);
    assert.deepEqual(rel(path.join(dir, "there"), nc.fs.list(path.join(dir, "there"))), ["c.txt", "deep/d.txt", "kept.txt"]);
    // to put it inside, write the full path
    assert.equal(nc.fs.copy(path.join(dir, "sub"), path.join(dir, "there", "sub")), true);
    assert.equal(text(dir, "there", "sub", "c.txt"), "cccc");
  });

  it("a dest ending with \\ means the same on Windows", { skip: !windows && "Windows only" }, () => {
    const dir = tree();
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), `${path.join(dir, "back")}\\`), true);
    assert.equal(text(dir, "back", "a.txt"), "aaa");
    assert.equal(nc.fs.move(path.join(dir, "b.log"), `${path.join(dir, "back")}\\`), true);
    assert.equal(text(dir, "back", "b.log"), "bb");
  });

  it("filter and overwrite", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(dir, at(`filtered${count++}`), { filter: (source) => !source.endsWith(".log") && !source.includes("node_modules") }), true);
    const out = at(`filtered${count - 1}`);
    assert.deepEqual(rel(out, nc.fs.list(out)), [".hidden", "a.txt", "sub/c.txt", "sub/deep/d.txt"]);
    fs.writeFileSync(path.join(dir, "other.txt"), "other");
    assert.equal(nc.fs.copy(path.join(dir, "other.txt"), path.join(dir, "a.txt"), { overwrite: false }), true);
    assert.equal(text(dir, "a.txt"), "aaa");
    assert.equal(nc.fs.copy(path.join(dir, "other.txt"), path.join(dir, "a.txt")), true);
    assert.equal(text(dir, "a.txt"), "other");
  });

  it("refuses to copy a folder onto itself or inside itself, a trailing / included", () => {
    const dir = tree();
    assert.equal(nc.fs.copy(dir, path.join(dir, "sub", "copy")), false);
    assert.equal(nc.fs.copy(dir, dir + "/"), false);
    assert.equal(nc.fs.copy(dir, path.join(dir, "sub") + "/"), false);
    // a file into its own folder is itself
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), dir + "/"), false);
    assert.equal(nc.fs.copy(path.join(dir, "a.txt"), dir), false);
    assert.equal(text(dir, "a.txt"), "aaa");
  });

  it("copies a junction as a link, not the folder it points to", () => {
    const dir = tree();
    const outside = at(`outside${count++}`);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.txt"), "s");
    fs.symlinkSync(outside, path.join(dir, "sub", "link"), "junction");
    const dest = at(`copied${count++}`);
    assert.equal(nc.fs.copy(path.join(dir, "sub"), dest + "/"), true);
    assert.ok(fs.lstatSync(path.join(dest, "link")).isSymbolicLink());
    assert.equal(fs.existsSync(path.join(dest, "link", "secret.txt")), true);
  });
});

describe("fs 3.0: move", () => {
  it("moves a file and a folder", () => {
    const dir = tree();
    assert.equal(nc.fs.move(path.join(dir, "a.txt"), path.join(dir, "out", "a.txt")), true);
    assert.equal(fs.existsSync(path.join(dir, "a.txt")), false);
    assert.equal(nc.fs.move(path.join(dir, "sub"), path.join(dir, "sub2")), true);
    assert.equal(text(dir, "sub2", "deep", "d.txt"), "d");
    assert.equal(fs.existsSync(path.join(dir, "sub")), false);
    assert.equal(nc.fs.move(path.join(dir, "missing"), path.join(dir, "x")), false);
  });

  it("a file goes into a dest ending with /, or onto an existing folder", () => {
    const dir = tree();
    assert.equal(nc.fs.move(path.join(dir, "a.txt"), path.join(dir, "into") + "/"), true);
    assert.equal(text(dir, "into", "a.txt"), "aaa");
    assert.equal(fs.existsSync(path.join(dir, "a.txt")), false);
    // 2.2 put the file in place of the whole folder here
    assert.equal(nc.fs.move(path.join(dir, "b.log"), path.join(dir, "sub")), true);
    assert.equal(text(dir, "sub", "b.log"), "bb");
    assert.equal(text(dir, "sub", "c.txt"), "cccc");
    assert.equal(nc.fs.move(path.join(dir, "into", "a.txt"), path.join(dir, "sub", "c.txt") + "/"), false);
    assert.equal(text(dir, "sub", "c.txt"), "cccc");
  });

  it("a folder keeps the 2.2 meaning: dest is the new path, a trailing / changes nothing", () => {
    const dir = tree();
    assert.equal(nc.fs.move(path.join(dir, "sub"), path.join(dir, "renamed") + "/"), true);
    assert.deepEqual(rel(path.join(dir, "renamed"), nc.fs.list(path.join(dir, "renamed"))), ["c.txt", "deep/d.txt"]);
    assert.equal(fs.existsSync(path.join(dir, "sub")), false);
    // onto an existing folder: it takes its place, as in 2.2
    fs.mkdirSync(path.join(dir, "there"));
    fs.writeFileSync(path.join(dir, "there", "old.txt"), "o");
    assert.equal(nc.fs.move(path.join(dir, "renamed"), path.join(dir, "there")), true);
    assert.deepEqual(rel(path.join(dir, "there"), nc.fs.list(path.join(dir, "there"))), ["c.txt", "deep/d.txt"]);
    // with overwrite: false, it stays where it is
    fs.mkdirSync(path.join(dir, "other"));
    assert.equal(nc.fs.move(path.join(dir, "there"), path.join(dir, "other") + "/", { overwrite: false }), false);
    assert.equal(text(dir, "there", "c.txt"), "cccc");
    // to put it inside, write the full path
    assert.equal(nc.fs.move(path.join(dir, "there"), path.join(dir, "other", "there")), true);
    assert.equal(text(dir, "other", "there", "c.txt"), "cccc");
  });

  it("overwrite: false keeps what's there", () => {
    const dir = tree();
    assert.equal(nc.fs.move(path.join(dir, "b.log"), path.join(dir, "a.txt"), { overwrite: false }), false);
    assert.equal(text(dir, "a.txt"), "aaa");
    assert.equal(text(dir, "b.log"), "bb");
  });

  it("refuses a folder into itself, and a link onto what it leads to", () => {
    const dir = tree();
    assert.equal(nc.fs.move(dir, path.join(dir, "sub") + "/"), false);
    assert.equal(nc.fs.move(path.join(dir, "sub"), path.join(dir, "sub", "deep") + "/"), false);
    const link = at(`link${count++}`);
    fs.symlinkSync(dir, link, "junction");
    assert.equal(nc.fs.move(link, dir), false);
    assert.equal(text(dir, "a.txt"), "aaa");
  });

  it("filter moves only what passes, the rest stays", () => {
    const dir = tree();
    const dest = at(`moved${count++}`);
    assert.equal(nc.fs.move(dir, dest, { filter: (source) => !source.endsWith(".log") && !source.includes("node_modules") }), true);
    assert.deepEqual(rel(dest, nc.fs.list(dest)), [".hidden", "a.txt", "sub/c.txt", "sub/deep/d.txt"]);
    // what was left out stays, and the folders emptied by the move are gone
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "all", ignore: [] })), ["b.log", "node_modules", "node_modules/x.js"]);
  });

  it("filter with overwrite: false leaves a file kept at the destination at the source too", () => {
    const dir = tree();
    const dest = at(`moved${count++}`);
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, "a.txt"), "there");
    assert.equal(nc.fs.move(dir, dest, { overwrite: false, filter: (source) => !source.includes("node_modules") }), true);
    assert.equal(text(dest, "a.txt"), "there");
    assert.equal(text(dir, "a.txt"), "aaa");
    assert.equal(text(dest, "sub", "c.txt"), "cccc");
    assert.equal(fs.existsSync(path.join(dir, "sub")), false);
  });

  it("a filter that leaves out everything moves nothing", () => {
    const dir = tree();
    const dest = at(`moved${count++}`);
    assert.equal(nc.fs.move(dir, dest, { filter: () => false }), true);
    assert.equal(fs.existsSync(dest), false);
    assert.equal(text(dir, "a.txt"), "aaa");
  });
});

describe("fs 3.0: remove", () => {
  it("removes a file or a folder", () => {
    const dir = tree();
    assert.equal(nc.fs.remove(path.join(dir, "a.txt")), true);
    assert.equal(nc.fs.remove(path.join(dir, "a.txt")), false);
    assert.equal(nc.fs.remove(path.join(dir, "sub")), true);
    assert.equal(fs.existsSync(path.join(dir, "sub")), false);
  });

  it("contents: true empties a folder and keeps it", () => {
    const dir = tree();
    assert.equal(nc.fs.remove(dir, { contents: true }), true);
    assert.deepEqual(fs.readdirSync(dir), []);
    assert.equal(nc.fs.remove(path.join(dir, "missing"), { contents: true }), false);
    fs.writeFileSync(path.join(dir, "f.txt"), "f");
    assert.equal(nc.fs.remove(path.join(dir, "f.txt"), { contents: true }), false);
    assert.equal(text(dir, "f.txt"), "f");
  });

  it("contents: true refuses a junction, and what it points to is left alone", () => {
    const dir = tree();
    const link = at(`link${count++}`);
    fs.symlinkSync(dir, link, "junction");
    assert.equal(nc.fs.remove(link, { contents: true }), false);
    assert.equal(nc.fs.remove(link, { filter: () => true }), false);
    assert.equal(text(dir, "a.txt"), "aaa");
  });

  it("filter deletes only what passes, at any depth, and keeps the folder", () => {
    const dir = tree();
    assert.equal(nc.fs.remove(dir, { filter: (p) => p.endsWith(".txt") }), true);
    assert.deepEqual(rel(dir, nc.fs.list(dir, { type: "all", ignore: [] })), [".hidden", "b.log", "node_modules", "node_modules/x.js", "sub", "sub/deep"]);
    assert.equal(nc.fs.remove(dir, { contents: true, filter: (p) => path.basename(p) === "sub" }), true);
    assert.equal(fs.existsSync(path.join(dir, "sub")), false);
    assert.equal(fs.existsSync(dir), true);
  });

  it("filter never goes through a junction", () => {
    const dir = tree();
    const outside = at(`outside${count++}`);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.txt"), "s");
    fs.symlinkSync(outside, path.join(dir, "link"), "junction");
    assert.equal(nc.fs.remove(dir, { filter: (p) => p.endsWith(".txt") }), true);
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf8"), "s");
  });
});

describe("fs 3.0: an empty path never means the working directory", () => {
  const BLANK = [undefined, null, "", "   ", "\t"];

  /** Runs `fn` from a working directory of its own, and checks nothing in it changed. */
  const inSandbox = (fn) => {
    const sandbox = at(`sandbox${count++}`);
    fs.mkdirSync(path.join(sandbox, "inner"), { recursive: true });
    fs.writeFileSync(path.join(sandbox, "keep.txt"), "k");
    fs.writeFileSync(path.join(sandbox, "inner", "keep.txt"), "k");
    const before = rel(sandbox, nc.fs.list(sandbox, { type: "all" }));
    const previous = process.cwd();
    process.chdir(sandbox);
    try {
      fn(sandbox);
    } finally {
      process.chdir(previous);
    }
    assert.deepEqual(rel(sandbox, nc.fs.list(sandbox, { type: "all" })), before);
    assert.equal(text(sandbox, "keep.txt"), "k");
  };

  it("remove refuses it, with or without options", () => {
    inSandbox(() => {
      for (const blank of BLANK) {
        assert.equal(nc.fs.remove(blank), false);
        assert.equal(nc.fs.remove(blank, { contents: true }), false);
        assert.equal(nc.fs.remove(blank, { filter: () => true }), false);
      }
      assert.equal(nc.fs.remove(), false);
    });
  });

  it("copy and move refuse an empty source or destination", () => {
    inSandbox((sandbox) => {
      for (const blank of BLANK) {
        assert.equal(nc.fs.copy(blank, path.join(sandbox, "out")), false);
        assert.equal(nc.fs.move(blank, path.join(sandbox, "out")), false);
        assert.equal(nc.fs.copy(path.join(sandbox, "inner"), blank), false);
        assert.equal(nc.fs.move(path.join(sandbox, "inner"), blank), false);
        assert.equal(nc.fs.move(path.join(sandbox, "keep.txt"), blank), false);
      }
    });
  });

  it("the deprecated aliases refuse it too, with their own nothing-done value", () => {
    inSandbox((sandbox) => {
      warnings(() => {
        for (const blank of BLANK) {
          assert.equal(nc.fs.deleteFolder(blank), undefined);
          assert.equal(nc.fs.deleteFile(blank), undefined);
          assert.equal(nc.fs.emptyFolder(blank), undefined);
          assert.equal(nc.fs.deleteFilesIn(blank, true), undefined);
          assert.equal(nc.fs.deleteFoldersIn(blank), undefined);
          const out = path.join(sandbox, "out");
          for (const name of ["copyFoldersIn", "copyFolder", "copyFilesIn", "copyFile", "moveFoldersIn", "moveFolder", "moveFilesIn", "moveFile"]) {
            assert.equal(nc.fs[name]({ path: blank, dest: out, recursive: true, withFiles: true }), undefined, name);
            assert.equal(nc.fs[name]({ path: path.join(sandbox, "inner"), dest: blank }), undefined, name);
          }
        }
        assert.equal(nc.fs.deleteFilesIn(), undefined);
        assert.equal(nc.fs.emptyFolder(), undefined);
      });
    });
  });

  it("an explicit . is still a path", () => {
    // "." starts from this file's folder, like "./": a filter that keeps everything deletes nothing
    assert.equal(nc.fs.remove(".", { filter: () => false }), true);
    assert.equal(nc.fs.remove("./", { filter: () => false }), true);
    assert.ok(fs.existsSync(__filename));
  });
});

describe("fs 3.0: temp, sanitizeFilename, watch", () => {
  it("temp makes a new folder in the temp directory", () => {
    const dir = nc.fs.temp("nc-v3-");
    try {
      assert.ok(path.basename(dir).startsWith("nc-v3-"));
      assert.ok(fs.statSync(dir).isDirectory());
      assert.notEqual(nc.fs.temp("nc-v3-"), dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sanitizeFilename", () => {
    assert.equal(nc.fs.sanitizeFilename("a/b:c?.txt"), "a_b_c_.txt");
    assert.equal(nc.fs.sanitizeFilename("CON.txt"), "_CON.txt");
  });

  it("watch reports a change", async () => {
    const dir = at(`watch${count++}`);
    fs.mkdirSync(dir);
    const seen = new Promise((resolve) => {
      const watcher = nc.fs.watch({ path: dir }).on("all", (event, file) => {
        watcher.stop();
        resolve(file);
      });
      setTimeout(() => fs.writeFileSync(path.join(dir, "new.txt"), "x"), 50);
    });
    assert.equal(await seen, path.join(dir, "new.txt"));
    assert.equal(nc.fs.watch({ path: path.join(dir, "missing") }), undefined);
  });

  it("watch takes the path first too", async () => {
    const dir = at(`watch${count++}`);
    fs.mkdirSync(dir);
    const seen = new Promise((resolve) => {
      const watcher = nc.fs.watch(dir, { filter: (event, file) => file.endsWith("wanted.txt") }).on("all", (event, file) => {
        watcher.stop();
        resolve(file);
      });
      setTimeout(() => {
        fs.writeFileSync(path.join(dir, "other.txt"), "x");
        fs.writeFileSync(path.join(dir, "wanted.txt"), "x");
      }, 50);
    });
    assert.equal(await seen, path.join(dir, "wanted.txt"));
    assert.equal(nc.fs.watch(path.join(dir, "missing")), undefined);
  });
});
