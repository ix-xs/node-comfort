"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const nc = require("..");

const windows = process.platform === "win32";

let root;
const at = (...parts) => path.join(root, ...parts);

before(() => {
  // macOS: /var is a link to /private/var, and the package resolves real paths
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nc-sec-fs-")));
});
after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** A folder with a.txt and inner/data.txt, under a new name each time. */
let count = 0;
const work = () => {
  const dir = at(`work${count++}`);
  fs.mkdirSync(path.join(dir, "inner"), { recursive: true });
  fs.writeFileSync(path.join(dir, "a.txt"), "a");
  fs.writeFileSync(path.join(dir, "inner", "data.txt"), "data");
  return dir;
};
const intact = (dir) => {
  assert.equal(fs.readFileSync(path.join(dir, "a.txt"), "utf8"), "a");
  assert.equal(fs.readFileSync(path.join(dir, "inner", "data.txt"), "utf8"), "data");
};

/** Replaces fs.renameSync for the length of `fn`. */
const withRename = (fake, fn) => {
  const original = fs.renameSync;
  fs.renameSync = (from, to) => fake(String(from), String(to), original);
  try {
    return fn();
  } finally {
    fs.renameSync = original;
  }
};

describe("security: copying or moving onto itself loses nothing", () => {
  it("copyFile and moveFile onto the same file", () => {
    const dir = work();
    assert.equal(nc.copyFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, "a.txt"), force: true }), false);
    assert.equal(nc.copyFile({ path: path.join(dir, "a.txt"), dest: `${dir}${path.sep}`, force: true }), false);
    assert.equal(nc.moveFile({ path: path.join(dir, "a.txt"), dest: `${dir}${path.sep}` }), false);
    assert.equal(nc.moveFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, ".", "a.txt"), force: true }), false);
    intact(dir);
  });

  it("moveFile only changes the letter case on Windows", { skip: !windows && "Windows only" }, () => {
    const dir = work();
    assert.equal(nc.moveFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, "A.TXT"), force: true }), true);
    assert.ok(fs.readdirSync(dir).includes("A.TXT"));
    assert.equal(nc.moveFile({ path: path.join(dir, "A.TXT"), dest: path.join(dir, "A.txt") }), true);
    assert.deepEqual(fs.readdirSync(dir).filter((name) => name.toLowerCase() === "a.txt"), ["A.txt"]);
    assert.equal(nc.moveFile({ path: path.join(dir, "A.txt"), dest: path.join(dir, "A.txt") }), false, "the same name: nothing to do");
    intact(dir);
  });

  it("moveFilesIn keeps a file whose copy failed, and counts only what moved", () => {
    const dir = work();
    const dest = at(`dest${count++}`);
    // a folder where a.txt would go
    fs.mkdirSync(path.join(dest, "a.txt"), { recursive: true });
    assert.equal(nc.moveFilesIn({ path: dir, dest }), 1);
    assert.equal(fs.readFileSync(path.join(dir, "a.txt"), "utf8"), "a");
    assert.equal(fs.existsSync(path.join(dir, "inner", "data.txt")), false);
    assert.equal(fs.readFileSync(path.join(dest, "inner", "data.txt"), "utf8"), "data");
    assert.equal(nc.moveFilesIn({ path: dir, dest, force: true }), 0, "force doesn't remove a folder in the way either");
    assert.equal(fs.readFileSync(path.join(dir, "a.txt"), "utf8"), "a");
    assert.ok(fs.statSync(path.join(dest, "a.txt")).isDirectory());
  });

  it("copyFilesIn and moveFilesIn into the same folder", () => {
    const dir = work();
    assert.equal(nc.copyFilesIn({ path: dir, dest: dir, force: true }), 0);
    assert.equal(nc.moveFilesIn({ path: dir, dest: dir }), 0);
    assert.equal(nc.moveFilesIn({ path: dir, dest: path.join(dir, "inner") }), 0, "recursive, into its own tree");
    intact(dir);
  });

  it("copyFolder, copyFoldersIn, moveFolder and moveFoldersIn into themselves", () => {
    const dir = work();
    assert.equal(nc.copyFolder({ path: dir, dest: dir, force: true, recursive: true, withFiles: true }), false);
    assert.equal(nc.moveFolder({ path: dir, dest: path.join(dir, "inner"), force: true, recursive: true, withFiles: true }), false);
    assert.equal(nc.copyFoldersIn({ path: dir, dest: dir, force: true }), 0);
    assert.equal(nc.moveFoldersIn({ path: dir, dest: dir, force: true }), 0);
    assert.equal(nc.moveFoldersIn({ path: dir, dest: path.join(dir, "inner") }), 0);
    intact(dir);
  });

  it("move and copy of a folder into itself", () => {
    const dir = work();
    assert.equal(nc.move(dir, path.join(dir, "inner")), false);
    assert.equal(nc.move(dir, path.join(dir, "inner", "deeper")), false);
    assert.equal(nc.copy(dir, path.join(dir, "inner", "copy")), false);
    intact(dir);
  });

  it("move puts the destination back when the second rename fails", () => {
    const dir = work();
    const src = path.join(dir, "inner");
    const dest = at(`dest${count++}`);
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, "keep.txt"), "keep");
    const moved = withRename((from, to, original) => {
      if (from === src && to === dest) throw Object.assign(new Error("in the way"), { code: "ENOTEMPTY" });
      return original(from, to);
    }, () => nc.move(src, dest));
    assert.equal(moved, false);
    assert.equal(fs.readFileSync(path.join(dest, "keep.txt"), "utf8"), "keep");
    assert.deepEqual(fs.readdirSync(at()).filter((name) => name.endsWith(".bak")), []);
    intact(dir);
  });

  it("move keeps the destination after any other failure", () => {
    const dir = work();
    const dest = at(`dest${count++}`);
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, "keep.txt"), "keep");
    const moved = withRename(() => {
      throw Object.assign(new Error("disk error"), { code: "EIO" });
    }, () => nc.move(path.join(dir, "inner"), dest));
    assert.equal(moved, false);
    assert.equal(fs.readFileSync(path.join(dest, "keep.txt"), "utf8"), "keep");
    intact(dir);
  });

  it("everyday copies and moves still work", () => {
    const dir = work();
    const copyDir = at(`copy${count++}`);
    assert.equal(nc.copy(dir, copyDir), true);
    intact(copyDir);
    assert.equal(nc.copyFile({ path: path.join(dir, "a.txt"), dest: path.join(dir, "b.txt"), force: true }), true);
    assert.equal(nc.moveFile({ path: path.join(dir, "b.txt"), dest: path.join(dir, "inner") + path.sep }), true);
    assert.equal(fs.readFileSync(path.join(dir, "inner", "b.txt"), "utf8"), "a");
    assert.equal(nc.moveFilesIn({ path: path.join(dir, "inner"), dest: path.join(dir, "inner", "archive"), recursive: false }), 2);
    assert.deepEqual(fs.readdirSync(path.join(dir, "inner", "archive")).sort(), ["b.txt", "data.txt"]);
    // a folder in the way is replaced
    const target = at(`target${count++}`);
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "stale.txt"), "stale");
    assert.equal(nc.move(copyDir, target), true);
    intact(target);
    assert.equal(fs.existsSync(path.join(target, "stale.txt")), false);
    assert.equal(fs.existsSync(copyDir), false);
    if (windows) {
      // only the letter case changes
      assert.equal(nc.move(path.join(target, "a.txt"), path.join(target, "A.txt")), true);
      assert.ok(fs.readdirSync(target).includes("A.txt"));
    }
  });
});

describe("security: links inside a folder are never followed", () => {
  let outside;
  let tree;
  before(() => {
    outside = at("outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
    tree = at("tree");
    fs.mkdirSync(tree);
    fs.writeFileSync(path.join(tree, "own.txt"), "own");
    // a junction on Windows (no special rights needed), a link elsewhere
    fs.symlinkSync(outside, path.join(tree, "link"), "junction");
  });

  it("copy() copies a junction as a link, not the folder it points to", () => {
    const dest = at("tree-copy");
    assert.equal(nc.copy(tree, dest), true);
    assert.equal(fs.readFileSync(path.join(dest, "own.txt"), "utf8"), "own");
    assert.equal(fs.lstatSync(path.join(dest, "link")).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(path.join(dest, "link")), fs.realpathSync(outside));
    // copying again over the copy keeps it a link
    assert.equal(nc.copy(tree, dest), true);
    assert.equal(fs.lstatSync(path.join(dest, "link")).isSymbolicLink(), true);
    assert.deepEqual(fs.readdirSync(outside), ["secret.txt"]);
  });

  it("emptyFolder() refuses a junction", () => {
    assert.equal(nc.emptyFolder(path.join(tree, "link")), false);
    assert.deepEqual(fs.readdirSync(outside), ["secret.txt"]);
    const plain = at("to-empty");
    fs.mkdirSync(path.join(plain, "sub"), { recursive: true });
    fs.writeFileSync(path.join(plain, "x.txt"), "x");
    assert.equal(nc.emptyFolder(plain), true);
    assert.deepEqual(fs.readdirSync(plain), []);
  });
});

describe("security: a link never takes the place of what it points to", () => {
  it("move refuses a junction onto its own folder, and still moves the junction elsewhere", () => {
    const dir = work();
    const link = at(`link${count++}`);
    fs.symlinkSync(dir, link, "junction");
    assert.equal(nc.move(link, dir), false);
    assert.equal(fs.lstatSync(dir).isSymbolicLink(), false);
    intact(dir);
    const renamed = at(`renamed${count++}`);
    assert.equal(nc.move(link, renamed), true);
    assert.equal(fs.lstatSync(renamed).isSymbolicLink(), true);
    assert.equal(fs.existsSync(link), false);
    intact(dir);
  });

  it("move, moveFile and copyFile refuse a file link onto its file", (t) => {
    const dir = work();
    const link = path.join(dir, "alias.txt");
    try {
      fs.symlinkSync("a.txt", link, "file");
    } catch (error) {
      // Windows needs developer mode or admin rights for a file link
      t.skip(`no file links here (${error.code})`);
      return;
    }
    const file = path.join(dir, "a.txt");
    assert.equal(nc.move(link, file), false);
    assert.equal(nc.moveFile({ path: link, dest: file }), false);
    assert.equal(nc.moveFile({ path: link, dest: file, force: true }), false);
    assert.equal(nc.copyFile({ path: link, dest: file, force: true }), false);
    assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
    intact(dir);
  });
});

describe("security: findUp stops at stopAt", () => {
  before(() => {
    fs.mkdirSync(at("up", "a", "b"), { recursive: true });
    fs.writeFileSync(at("up", "marker.txt"), "");
  });

  it("with a trailing separator", () => {
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: `${at("up", "a")}${path.sep}` }), undefined);
  });

  it("with another letter case on Windows", { skip: !windows && "Windows only" }, () => {
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: at("up", "a").toUpperCase() }), undefined);
  });

  it("when the search is outside of it", () => {
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: at("elsewhere") }), undefined);
  });

  it("when stopAt and the search reach the same folder through a junction or a link", () => {
    const link = at("up-link");
    fs.symlinkSync(at("up"), link, "junction");
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: link }), at("up", "marker.txt"));
    assert.equal(nc.findUp("marker.txt", { cwd: path.join(link, "a", "b"), stopAt: at("up") }), path.join(link, "marker.txt"));
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: path.join(link, "a") }), undefined, "still stops there");
    assert.equal(nc.findUp("marker.txt", { cwd: path.join(link, "a", "b"), stopAt: at("up", "a") }), undefined);
  });

  it("still finds what is below stopAt", () => {
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b"), stopAt: at("up") }), at("up", "marker.txt"));
    assert.equal(nc.findUp("marker.txt", { cwd: at("up", "a", "b") }), at("up", "marker.txt"));
  });
});

describe("security: atomic writes can't be redirected", () => {
  it("the temporary name doesn't come from Math.random or the clock", () => {
    const target = at("atomic", "settings.json");
    const victim = at("victim.txt");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(victim, "untouched");
    const { random } = Math;
    const { now } = Date;
    Math.random = () => 0.5;
    Date.now = () => 1_000_000;
    try {
      // the name the old code would have picked, as a hard link to another file
      const guessed = `${target}.${process.pid}.${(1_000_000).toString(36)}${(0.5).toString(36).slice(2, 8)}.tmp`;
      fs.linkSync(victim, guessed);
      try {
        assert.equal(nc.writeFile(target, "new"), true);
      } finally {
        fs.rmSync(guessed, { force: true });
      }
    } finally {
      Math.random = random;
      Date.now = now;
    }
    assert.equal(fs.readFileSync(victim, "utf8"), "untouched");
    assert.equal(fs.readFileSync(target, "utf8"), "new");
  });

  it("the temporary file is created, never reused", () => {
    const target = at("atomic", "token.txt");
    const victim = at("victim2.txt");
    fs.writeFileSync(victim, "untouched");
    const { randomBytes } = crypto;
    crypto.randomBytes = /** @type {any} */ ((size) => Buffer.alloc(size, 7));
    try {
      const planted = `${target}.${Buffer.alloc(8, 7).toString("hex")}.tmp`;
      fs.linkSync(victim, planted);
      try {
        assert.equal(nc.writeFile(target, "new"), false);
        assert.equal(fs.existsSync(planted), true, "what was there is not ours to delete");
      } finally {
        fs.rmSync(planted, { force: true });
      }
    } finally {
      crypto.randomBytes = randomBytes;
    }
    assert.equal(fs.readFileSync(victim, "utf8"), "untouched");
    assert.equal(fs.existsSync(target), false);
  });

  it("keeps modes and leaves no temporary file", { skip: windows && "no POSIX modes on Windows" }, () => {
    const secret = at("atomic", "secret.txt");
    assert.equal(nc.writeFile(secret, "s", { mode: 0o600 }), true);
    assert.equal(fs.statSync(secret).mode & 0o777, 0o600);
    assert.equal(nc.writeFile(secret, "t"), true);
    assert.equal(fs.statSync(secret).mode & 0o777, 0o600);
    // a new file gets the usual permissions, like any file the process creates
    const fresh = at("atomic", "fresh.txt");
    const usual = at("atomic", "usual.txt");
    assert.equal(nc.writeFile(fresh, "f"), true);
    fs.writeFileSync(usual, "u");
    assert.equal(fs.statSync(fresh).mode & 0o777, fs.statSync(usual).mode & 0o777);
    assert.deepEqual(fs.readdirSync(at("atomic")).filter((name) => name.endsWith(".tmp")), []);
  });

  it("everyday writes still work", () => {
    const file = at("atomic", "data", "list.json");
    assert.equal(nc.writeJSON(file, { a: 1 }), true);
    assert.equal(nc.writeJSON(file, { a: 2 }, { fsync: true }), true);
    assert.deepEqual(nc.readJSON(file), { a: 2 });
    assert.equal(nc.writeFile(file, Buffer.from("raw")), true);
    assert.equal(nc.readFile(file), "raw");
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ["list.json"]);
  });
});

describe("security: sanitizeFilename", () => {
  it("prefixes every reserved Windows name", () => {
    for (const name of ["COM¹", "COM².txt", "LPT³", "lpt¹.log", "CONIN$", "conout$.txt", "CON .txt", "NUL .txt", "aux  .tar.gz", "CON", "nul.txt"]) {
      assert.equal(nc.sanitizeFilename(name), `_${name}`, name);
    }
  });

  it("removes text direction and zero-width characters", () => {
    assert.equal(nc.sanitizeFilename("invoice‮fdp.exe"), "invoicefdp.exe");
    assert.equal(nc.sanitizeFilename("a​b‌c‍d‎e‏f⁦g⁩h﻿"), "abcdefgh");
    assert.equal(nc.sanitizeFilename("C​ON.txt"), "_CON.txt");
  });

  it("leaves ordinary names alone", () => {
    for (const name of ["console.log", "COM10.txt", "nullable.js", "LPT.txt", "CONIN.txt", "rapport été.pdf", "مرحبا.txt", "😀.png"]) {
      assert.equal(nc.sanitizeFilename(name), name, name);
    }
    assert.equal(nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'), "Report_ Q1_Q2 _final__.pdf");
  });
});
