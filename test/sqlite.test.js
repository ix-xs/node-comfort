"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const nc = require("..");

const { SQLite, errors } = nc;

/** @type {InstanceType<typeof SQLite>} */
let db;

const users = () =>
  db.createTable({
    name: "users",
    columns: {
      id: { type: "INTEGER", primaryKey: true, autoincrement: true },
      email: { type: "TEXT", notNull: true, unique: true },
      age: { type: "INTEGER" },
      role: { type: "TEXT", values: ["admin", "editor", "user"], defaultValue: "user" },
      settings: { type: "JSON", defaultValue: {} },
      active: { type: "BOOLEAN", defaultValue: true },
      created_at: { type: "DATETIME" },
    },
    indexes: [{ columns: ["role", "age"] }],
  });

beforeEach(() => {
  db = new SQLite(":memory:");
  users();
});

afterEach(() => db.close());

describe("SQLite: schema", () => {
  it("creates tables, indexes and introspects them", () => {
    assert.deepEqual(db.createTable({ name: "users", columns: { id: { type: "INTEGER" } } }), { ok: true });
    assert.deepEqual(db.tables(), ["users"]);
    assert.equal(db.hasTable("users"), true);
    assert.equal(db.hasTable("nope"), false);
    assert.equal(db.hasTable("bad name"), false);
    const cols = db.columns("users");
    assert.deepEqual(cols.map((c) => c.name), ["id", "email", "age", "role", "settings", "active", "created_at"]);
    assert.equal(cols[0].primaryKey, true);
    assert.equal(cols[1].notNull, true);
    assert.ok(db.queryOne("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_users_role_age'"));
  });

  it("accepts the 1.x `options` key and table constraints", () => {
    db.createTable({
      name: "memberships",
      options: { user_id: { type: "INTEGER", references: { table: "users", column: "id" }, onDelete: "CASCADE" }, team: { type: "TEXT" } },
      constraints: [{ type: "unique", columns: ["user_id", "team"] }, { type: "check", expression: "length(team) > 0" }],
    });
    const { lastInsertRowid } = db.insert("users", { email: "a@x.io" });
    db.insert("memberships", { user_id: lastInsertRowid, team: "core" });
    assert.throws(() => db.insert("memberships", { user_id: lastInsertRowid, team: "core" }), (e) => e.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE");
    assert.throws(() => db.insert("memberships", { user_id: lastInsertRowid, team: "" }), (e) => e.sqliteCode === "SQLITE_CONSTRAINT_CHECK");
    assert.throws(() => db.insert("memberships", { user_id: 999, team: "x" }), (e) => e.sqliteCode === "SQLITE_CONSTRAINT_FOREIGNKEY");
    db.delete("users", { id: lastInsertRowid });
    assert.equal(db.count("memberships"), 0, "ON DELETE CASCADE");
  });

  it("rejects invalid identifiers and definitions", () => {
    assert.throws(() => db.createTable({ name: "x; DROP TABLE users", columns: { a: { type: "TEXT" } } }), errors.SQLiteError);
    assert.throws(() => db.createTable({ name: "t", columns: {} }), /at least one column/);
    assert.throws(() => db.createTable({ name: "t", columns: { a: { type: "TEXT); DROP TABLE users; --" } } }), /Invalid type/);
    assert.throws(() => db.getAll("users", { "email = email OR 1": 1 }), /Invalid column name/);
    assert.throws(() => db.getAll("users", {}, { orderBy: "id; --" }), /Invalid column name/);
    assert.throws(() => db.getAll("users", {}, { orderBy: "id", direction: /** @type {any} */ ("sideways") }), /Invalid sort direction/);
    assert.throws(() => db.get("missing"), (e) => e instanceof errors.SQLiteError && /does not exist/.test(e.message));
    assert.ok(db.hasTable("users"));
  });

  it("deleteTable, clearTable", () => {
    db.insert("users", { email: "a@x.io" });
    assert.deepEqual(db.clearTable("users"), { ok: true });
    assert.equal(db.count("users"), 0);
    assert.deepEqual(db.deleteTable("users"), { ok: true });
    assert.equal(db.hasTable("users"), false);
    assert.throws(() => db.deleteTable("users"), /does not exist/);
  });
});

describe("SQLite: CRUD and conversions", () => {
  it("insert/get convert JSON, booleans and dates", () => {
    const when = new Date("2026-01-02T03:04:05.000Z");
    const res = db.insert("users", { email: "ada@x.io", age: 36, settings: { theme: "dark", tags: ["a"] }, active: false, created_at: when, role: undefined });
    assert.equal(res.ok, true);
    assert.equal(res.changes, 1);
    assert.equal(Number(res.lastInsertRowid), 1);
    const ada = db.get("users", { email: "ada@x.io" });
    assert.deepEqual(ada.settings, { theme: "dark", tags: ["a"] });
    assert.equal(ada.active, false);
    assert.equal(ada.role, "user", "undefined skipped, default applied");
    assert.equal(ada.created_at, when.toISOString());
    assert.equal(Object.getPrototypeOf(ada), Object.prototype);
    const withDefaults = db.get("users", { id: db.insert("users", { email: "b@x.io" }).lastInsertRowid });
    assert.deepEqual(withDefaults.settings, {});
    assert.equal(withDefaults.active, true);
  });

  it("dates option and disabled conversions", () => {
    const other = new SQLite(":memory:", { dates: true, json: false, booleans: false });
    try {
      db.close();
      db = other;
      users();
      db.insert("users", { email: "a@x.io", created_at: new Date(0), settings: [1], active: true });
      const row = db.get("users");
      assert.ok(row.created_at instanceof Date);
      assert.equal(row.created_at.getTime(), 0);
      assert.equal(row.settings, "[1]");
      assert.equal(row.active, 1);
    } finally {
      other.close();
    }
  });

  it("getAll: no default limit, ordering, pagination, columns", () => {
    for (let i = 0; i < 60; i++) db.insert("users", { email: `u${String(i).padStart(2, "0")}@x.io`, age: i % 30 });
    assert.equal(db.getAll("users").length, 60);
    assert.equal(db.getAll("users")[0].id, 1, "natural order, not DESC");
    const page = db.getAll("users", {}, { orderBy: "email", direction: "DESC", limit: 5, offset: 5 });
    assert.deepEqual(page.map((u) => u.email), ["u54@x.io", "u53@x.io", "u52@x.io", "u51@x.io", "u50@x.io"]);
    const multi = db.getAll("users", { age: 0 }, { orderBy: [["age", "DESC"], "email"], columns: ["email"] });
    assert.deepEqual(multi, [{ email: "u00@x.io" }, { email: "u30@x.io" }]);
    assert.equal(db.getAll("users", {}, { offset: 58 }).length, 2);
    assert.equal(db.get("users", {}, { orderBy: "id", direction: "desc" }).id, 60);
  });

  it("where operators", () => {
    const rows = [
      { email: "a@acme.com", age: 17, role: "user" },
      { email: "b@acme.com", age: 25, role: "admin" },
      { email: "c@other.org", age: 40, role: "editor" },
      { email: "d@other.org", age: null, role: "user" },
    ];
    db.insertMany("users", rows);
    const emails = (where) => db.getAll("users", where, { orderBy: "email" }).map((u) => u.email[0]).join("");
    assert.equal(emails({ age: { gte: 18 } }), "bc");
    assert.equal(emails({ age: { gt: 17, lt: 40 } }), "b");
    assert.equal(emails({ age: { between: [17, 25] } }), "ab");
    assert.equal(emails({ role: ["admin", "editor"] }), "bc");
    assert.equal(emails({ role: { notIn: ["user"] } }), "bc");
    assert.equal(emails({ role: { in: [] } }), "");
    assert.equal(emails({ age: null }), "d");
    assert.equal(emails({ age: { isNull: false } }), "abc");
    assert.equal(emails({ age: { ne: 25 } }), "acd", "ne includes NULL rows");
    assert.equal(emails({ age: { eq: null } }), "d");
    assert.equal(emails({ email: { like: "%@acme.com" } }), "ab");
    assert.equal(emails({ email: { notLike: "%@acme.com" } }), "cd");
    assert.equal(emails({ email: { glob: "?@other.*" } }), "cd");
    assert.equal(emails({ $or: [{ role: "admin" }, { age: { lt: 18 } }] }), "ab");
    assert.equal(emails({ role: "user", $or: [{ age: null }, { age: 17 }] }), "ad");
    assert.equal(emails({ $and: [{ age: { gte: 18 } }, { email: { like: "c%" } }] }), "c");
    assert.equal(emails({ $or: [] }), "");
    assert.equal(emails({ age: undefined }), "abcd", "undefined conditions are ignored");
    assert.equal(emails({ active: true }), "abcd", "booleans are bound as 1/0");
    assert.throws(() => db.getAll("users", { age: { nope: 1, gte: 2 } }), /Unknown where operator "nope"/);
    assert.equal(db.count("users", { role: "user" }), 2);
    assert.equal(db.exists("users", { role: "admin" }), true);
    assert.equal(db.exists("users", { role: "editor", age: { lt: 30 } }), false);
  });

  it("update, delete, upsert, set", () => {
    db.insert("users", { email: "a@x.io", age: 20 });
    db.insert("users", { email: "b@x.io", age: 30 });
    assert.deepEqual(db.update("users", { age: 21, settings: { a: 1 } }, { email: "a@x.io" }), { ok: true, changes: 1 });
    assert.deepEqual(db.get("users", { email: "a@x.io" }).settings, { a: 1 });
    assert.throws(() => db.update("users", { age: 1 }, {}), /non-empty where/);
    assert.throws(() => db.update("users", { age: undefined }, { id: 1 }), /at least one column/);
    assert.throws(() => db.delete("users", {}), /clearTable/);

    const up = db.upsert("users", { email: "a@x.io", age: 99 }, ["email"]);
    assert.equal(up.changes, 1);
    assert.equal(db.count("users"), 2);
    assert.equal(db.get("users", { email: "a@x.io" }).age, 99);
    assert.equal(db.get("users", { email: "a@x.io" }).id, 1, "updated in place");
    db.upsert("users", { email: "c@x.io", age: 1 }, ["email"]);
    assert.equal(db.count("users"), 3);
    assert.throws(() => db.upsert("users", { email: "z" }, []), /conflict column/);

    assert.deepEqual(db.set("users", { id: 2, age: 31 }), { ok: true });
    assert.equal(db.get("users", { id: 2 }).age, 31);
    db.set("users", { email: "d@x.io" }, { email: "d@x.io" });
    assert.equal(db.count("users"), 4);

    assert.deepEqual(db.delete("users", { age: { gte: 31 } }), { ok: true, changes: 2 });
    assert.throws(() => db.insert("users", { email: "c@x.io" }), (e) => e instanceof errors.SQLiteError && e.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE" && e.code === "ERR_SQLITE" && /INSERT INTO/.test(e.sql));
    assert.throws(() => db.insert("users", { email: null }), (e) => e.sqliteCode === "SQLITE_CONSTRAINT_NOTNULL");
    assert.throws(() => db.insert("users", { email: "e@x.io", role: "boss" }), (e) => e.sqliteCode === "SQLITE_CONSTRAINT_CHECK");
  });

  it("table() handle", () => {
    const u = db.table("users");
    assert.equal(u.name, "users");
    u.insert({ email: "a@x.io", age: 5 });
    u.insertMany([{ email: "b@x.io" }, { email: "c@x.io" }]);
    assert.equal(u.count(), 3);
    assert.equal(u.get({ email: "a@x.io" }).age, 5);
    assert.equal(u.getAll({}, { limit: 2 }).length, 2);
    u.update({ age: 6 }, { email: "a@x.io" });
    u.upsert({ email: "a@x.io", age: 7 }, ["email"]);
    assert.equal(u.get({ email: "a@x.io" }).age, 7);
    assert.equal(u.exists({ age: 7 }), true);
    assert.equal(u.delete({ email: "c@x.io" }).changes, 1);
    u.clear();
    assert.equal(u.count(), 0);
    assert.throws(() => db.table("no such"), /Invalid table name/);
  });
});

describe("SQLite: raw SQL", () => {
  it("exec, queryOne, queryAll, iterate with parameters", () => {
    const r = db.exec("INSERT INTO users (email, active, settings) VALUES (?, ?, ?)", ["a@x.io", true, { x: 1 }]);
    assert.equal(r.changes, 1);
    db.exec("INSERT INTO users (email) VALUES ($email)", { $email: "b@x.io" });
    db.exec("INSERT INTO users (email) VALUES (?)", "c@x.io");
    const row = db.queryOne("SELECT * FROM users WHERE email = ?", ["a@x.io"]);
    assert.deepEqual(row.settings, { x: 1 }, "conversions on single-table SELECT");
    assert.equal(row.active, true);
    assert.equal(db.queryOne("SELECT * FROM users u WHERE u.email = ?", "a@x.io").active, true);
    assert.equal(db.queryOne("SELECT COUNT(*) AS n FROM users").n, 3);
    assert.equal(db.queryOne("SELECT * FROM users WHERE email = ?", "zzz"), undefined);
    assert.deepEqual(db.queryAll("SELECT email FROM users WHERE active = ? ORDER BY email", [true]).map((u) => u.email), ["a@x.io", "b@x.io", "c@x.io"]);
    assert.deepEqual([...db.iterate("SELECT id FROM users ORDER BY id")].map((u) => u.id), [1, 2, 3]);
    assert.throws(() => db.queryAll("SELECT * FROM nowhere"), (e) => e instanceof errors.SQLiteError && e.sql === "SELECT * FROM nowhere");
  });

  it("multi-statement exec and schema cache invalidation", () => {
    db.exec("CREATE TABLE a (id INTEGER, flag BOOLEAN); INSERT INTO a VALUES (1, 1); -- 'quoted ; semicolon'");
    assert.equal(db.get("a").flag, true);
    db.exec("ALTER TABLE a ADD COLUMN meta JSON");
    db.update("a", { meta: { ok: 1 } }, { id: 1 });
    assert.deepEqual(db.get("a").meta, { ok: 1 });
    db.exec("INSERT INTO a (id) VALUES ('x;y')");
    assert.equal(db.count("a"), 2);
  });

  it("fn registers SQL functions", () => {
    db.fn("shout", (text) => String(text).toUpperCase());
    db.insert("users", { email: "a@x.io" });
    assert.equal(db.queryOne("SELECT shout(email) AS s FROM users").s, "A@X.IO");
  });
});

describe("SQLite: transactions", () => {
  it("commits, rolls back and rethrows", () => {
    const value = db.transaction(() => {
      db.insert("users", { email: "a@x.io" });
      return 42;
    });
    assert.equal(value, 42);
    assert.throws(
      () =>
        db.transaction(() => {
          db.insert("users", { email: "b@x.io" });
          throw new Error("boom");
        }),
      /boom/,
    );
    assert.equal(db.count("users"), 1);
    assert.equal(db.inTransaction, false);
  });

  it("nested savepoints", () => {
    db.transaction(() => {
      db.insert("users", { email: "outer@x.io" });
      assert.throws(() =>
        db.transaction(() => {
          db.insert("users", { email: "inner@x.io" });
          throw new Error("inner");
        }),
      );
      db.transaction(() => db.insert("users", { email: "inner2@x.io" }));
    });
    assert.deepEqual(db.getAll("users", {}, { orderBy: "id" }).map((u) => u.email), ["outer@x.io", "inner2@x.io"]);
  });

  it("async callbacks commit after the promise settles", async () => {
    await db.transaction(async () => {
      db.insert("users", { email: "a@x.io" });
      await nc.wait(1);
      db.insert("users", { email: "b@x.io" });
    });
    await assert.rejects(
      db.transaction(async () => {
        db.insert("users", { email: "c@x.io" });
        await nc.wait(1);
        throw new Error("late");
      }),
      /late/,
    );
    assert.equal(db.count("users"), 2);
  });

  it("insertMany is all or nothing", () => {
    assert.throws(() => db.insertMany("users", [{ email: "a@x.io" }, { email: "a@x.io" }]), errors.SQLiteError);
    assert.equal(db.count("users"), 0);
    assert.deepEqual(db.insertMany("users", [{ email: "a@x.io" }, { email: "b@x.io" }]), { ok: true, changes: 2 });
  });
});

describe("SQLite: files, migrations, backup", () => {
  it("creates folders, migrates, backs up, disposes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-sqlite-"));
    try {
      const file = path.join(dir, "nested", "app.sqlite");
      const migrations = [
        "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)",
        "ALTER TABLE notes ADD COLUMN pinned BOOLEAN DEFAULT 0",
        (/** @type {any} */ d) => d.insert("notes", { body: "welcome", pinned: true }),
      ];
      {
        const disk = new SQLite(file);
        assert.equal(disk.path, file);
        assert.equal(disk.version, 0);
        assert.deepEqual(disk.migrate(migrations), { from: 0, to: 3 });
        assert.deepEqual(disk.migrate(migrations), { from: 3, to: 3 }, "idempotent");
        assert.equal(disk.get("notes").pinned, true);
        assert.throws(() => disk.migrate([...migrations, "ALTER TABLE nope ADD x"]), (e) => e instanceof errors.SQLiteError && /Migration 4 failed/.test(e.message));
        assert.equal(disk.version, 3, "failed migration rolled back");
        const copy = disk.backup(path.join(dir, "backups", "copy.sqlite"));
        assert.throws(() => disk.backup(copy), /already exists/);
        disk.close();
        disk.close();
        assert.equal(disk.isOpen, false);
        const restored = new SQLite(copy, { readOnly: true });
        assert.equal(restored.count("notes"), 1);
        assert.throws(() => restored.insert("notes", { body: "x" }), (e) => e.sqliteCode === "SQLITE_READONLY");
        restored.close();
      }
      // `using db = new SQLite(...)` calls Symbol.dispose (syntax not available on Node 22)
      const scoped = new SQLite(file);
      assert.equal(scoped.count("notes"), 1);
      assert.ok(scoped.native);
      assert.equal(scoped.inTransaction, false);
      scoped[Symbol.dispose]();
      assert.equal(scoped.isOpen, false, "Symbol.dispose closes");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("methods stay awaitable (1.x code keeps working)", async () => {
    const res = await db.insert("users", { email: "a@x.io" });
    assert.equal(res.ok, true);
    assert.equal((await db.getAll("users")).length, 1);
  });
});
