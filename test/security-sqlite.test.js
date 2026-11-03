"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nc = require("..");

const { SQLite } = nc;
const { op } = SQLite;

/**
 * A fresh in-memory database with three users.
 * @param {import("..").SQLiteOptions} [options]
 */
const open = (options) => {
  const db = new SQLite(":memory:", options);
  db.createTable({
    name: "users",
    columns: {
      id: { type: "INTEGER", primaryKey: true },
      email: { type: "TEXT" },
      role: { type: "TEXT" },
      token: { type: "TEXT" },
      visits: { type: "INTEGER", defaultValue: 0 },
      tags: { type: "JSON" },
      deleted_at: { type: "TEXT" },
    },
  });
  db.insert("users", { id: 1, email: "ada@example.com", role: "user", token: "t-1", tags: ["a"] });
  db.insert("users", { id: 2, email: "bob@example.com", role: "user", token: "t-2", tags: ["b"] });
  db.insert("users", { id: 3, email: "cy@example.com", role: "admin", token: "t-3", tags: [] });
  return db;
};

describe("security: SQLite writes never reach the whole table by accident", () => {
  /** @type {SQLite} */
  let db;
  before(() => {
    db = open();
  });
  after(() => {
    db.close();
  });

  const unchanged = () => {
    assert.equal(db.count("users"), 3);
    assert.equal(db.count("users", { role: "admin" }), 1);
    assert.equal(db.count("users", { visits: 0 }), 3);
  };

  it("update() refuses a filter whose values are undefined", () => {
    assert.throws(() => db.update("users", { role: "admin" }, { id: undefined }), { name: "SQLiteError", message: /where\.id is undefined/ });
    assert.throws(() => db.update("users", { role: "admin" }, { id: { eq: undefined } }), /where\.id\.eq is undefined/);
    assert.throws(() => db.update("users", { role: "admin" }, { $or: [{ id: 1 }, { email: undefined }] }), /where\.\$or\[1\]\.email is undefined/);
    unchanged();
  });

  it("delete() refuses filters that match every row", () => {
    for (const where of [{ id: undefined }, { id: { eq: undefined } }, { $and: [{}] }, { $or: [{}] }, { $and: [] }, { $or: [] }, { id: { notIn: [] } }, { $or: [{ id: 1 }, { id: { notIn: [] } }] }]) {
      assert.throws(() => db.delete("users", /** @type {any} */ (where)), { name: "SQLiteError" }, JSON.stringify(where));
    }
    assert.throws(() => db.delete("users", { id: { notIn: [] } }), /clearTable/);
    unchanged();
  });

  it("increment() refuses a filter whose values are undefined", () => {
    assert.throws(() => db.increment("users", { visits: 1 }, { email: undefined }), /where\.email is undefined/);
    assert.throws(() => db.table("users").increment({ visits: 1 }, { $and: [{}] }), /where\.\$and\[0\] matches every row/);
    unchanged();
  });

  it("set() can't turn into an update of every row", () => {
    assert.throws(() => db.set("users", { role: "admin" }, { id: undefined }), /where\.id is undefined/);
    unchanged();
  });

  it("writes with real conditions keep working", () => {
    assert.equal(db.update("users", { role: "editor" }, { id: 1 }).changes, 1);
    assert.equal(db.update("users", { role: "user" }, { id: 1, deleted_at: null }).changes, 1);
    assert.equal(db.increment("users", { visits: 2 }, { $or: [{ id: 1 }, { email: { like: "bob@%" } }] }).changes, 2);
    assert.equal(db.increment("users", { visits: -2 }, { id: { in: [1, 2] }, role: { notIn: [] } }).changes, 2);
    assert.equal(db.update("users", { role: "user" }, { id: [] }).changes, 0, "an empty list matches no row");
    db.insert("users", { id: 9, email: "tmp@example.com" });
    assert.equal(db.delete("users", { id: 9, role: null }).changes, 1);
    unchanged();
  });

  it("reads keep their behaviour", () => {
    assert.equal(db.count("users", { id: undefined }), 3);
    assert.equal(db.getAll("users", { $and: [{}] }).length, 3);
    assert.equal(db.getAll("users", { $or: [] }).length, 0);
    assert.equal(db.count("users", { id: { notIn: [] } }), 3);
    assert.equal(db.get("users", { email: undefined, id: 2 })?.email, "bob@example.com");
  });
});

describe("security: SQLite filter operators from a request", () => {
  /** @type {SQLite} */
  let plain;
  /** @type {SQLite} */
  let tagged;
  before(() => {
    plain = open();
    tagged = open({ operators: "tagged" });
  });
  after(() => {
    plain.close();
    tagged.close();
  });

  // what an attacker sends instead of a token
  const fromJSON = (text) => JSON.parse(text).token;

  it("with operators: \"tagged\", a parsed object is a value, never an operator", () => {
    const login = (db, token) => db.get("users", { email: "ada@example.com", token });
    assert.equal(login(tagged, fromJSON('{ "token": { "ne": "x" } }')), undefined);
    assert.equal(login(tagged, fromJSON('{ "token": { "like": "t%" } }')), undefined);
    assert.equal(login(tagged, fromJSON('{ "token": { "isNull": false } }')), undefined);
    assert.equal(login(tagged, fromJSON('{ "token": ["t-1", "t-2"] }')), undefined);
    assert.equal(login(tagged, "t-1")?.id, 1);
    assert.equal(tagged.count("users", { token: fromJSON('{ "token": { "ne": "x" } }') }), 0);
  });

  it("the default mode keeps today's plain operators", () => {
    // documented: an object with operator keys is an operator, so a request value must be checked first
    assert.equal(plain.get("users", { email: "ada@example.com", token: fromJSON('{ "token": { "ne": "x" } }') })?.id, 1);
    assert.equal(plain.count("users", { id: { gte: 2 } }), 2);
    assert.equal(plain.count("users", { id: { gt: 1, lte: 3 }, role: ["user", "admin"] }), 2);
    assert.equal(plain.count("users", { email: { like: "%@example.com" }, deleted_at: { isNull: true } }), 3);
    assert.equal(plain.count("users", { id: { between: [1, 2] } }), 2);
    assert.equal(plain.count("users", { tags: ["a"] }), 0, "an array is a list of values, not JSON");
  });

  it("tagged operators work in both modes", () => {
    for (const db of [plain, tagged]) {
      assert.equal(db.count("users", { id: op.eq(2) }), 1);
      assert.equal(db.count("users", { id: op.ne(2) }), 2);
      assert.equal(db.count("users", { id: op.gt(1) }), 2);
      assert.equal(db.count("users", { id: op.gte(1) }), 3);
      assert.equal(db.count("users", { id: op.lt(3) }), 2);
      assert.equal(db.count("users", { id: op.lte(1) }), 1);
      assert.equal(db.count("users", { role: op.in(["admin", "editor"]) }), 1);
      assert.equal(db.count("users", { role: op.notIn(["admin"]) }), 2);
      assert.equal(db.count("users", { email: op.like("%@example.com") }), 3);
      assert.equal(db.count("users", { email: op.notLike("a%") }), 2);
      assert.equal(db.count("users", { email: op.glob("b*") }), 1);
      assert.equal(db.count("users", { id: op.between(2, 3) }), 2);
      assert.equal(db.count("users", { deleted_at: op.isNull() }), 3);
      assert.equal(db.count("users", { token: op.notNull() }), 3);
      assert.equal(db.count("users", { id: { ...op.gte(1), ...op.lt(3) } }), 2, "spread together");
      assert.equal(db.count("users", { $or: [{ id: op.eq(1) }, { role: "admin" }] }), 2);
      assert.equal(db.update("users", { visits: 0 }, { id: op.in([1, 2]) }).changes, 2);
      assert.throws(() => db.delete("users", { id: op.eq(undefined) }), /where\.id\.eq is undefined/);
      assert.throws(() => db.delete("users", { id: op.notIn([]) }), /matches every row/);
    }
  });

  it("tagged mode compares arrays and other objects as JSON text", () => {
    assert.equal(tagged.count("users", { tags: ["a"] }), 1);
    assert.equal(tagged.count("users", { tags: [] }), 1);
    assert.equal(tagged.count("users", { id: 2, role: "user" }), 1);
  });

  it("a tagged operator can't be forged through JSON", () => {
    const copy = JSON.parse(JSON.stringify({ token: op.ne("x") })).token;
    assert.deepEqual(copy, { ne: "x" });
    assert.equal(tagged.get("users", { email: "ada@example.com", token: copy }), undefined);
    assert.ok(Object.isFrozen(op) && Object.isFrozen(op.eq(1)));
    assert.deepEqual(Object.keys(op).sort(), ["between", "eq", "glob", "gt", "gte", "in", "isNull", "like", "lt", "lte", "ne", "notIn", "notLike", "notNull"]);
  });

  it("with operators: \"tagged\", an undefined value in a read throws instead of matching more rows", () => {
    // the token left out of the request body
    const body = {};
    for (const read of [
      () => tagged.get("users", { email: "ada@example.com", token: body.token }),
      () => tagged.getAll("users", { token: body.token }),
      () => tagged.count("users", { token: body.token }),
      () => tagged.exists("users", { token: body.token }),
      () => tagged.paginate("users", { token: body.token }),
    ]) {
      assert.throws(read, { name: "SQLiteError", message: /where\.token is undefined/ });
    }
    assert.throws(() => tagged.get("users", { email: "ada@example.com", token: body.token }), /^SQLiteError: get\(\): where\.token is undefined/);
    assert.throws(() => tagged.get("users", { token: op.eq(body.token) }), /get\(\): where\.token\.eq is undefined/);
    assert.throws(() => tagged.get("users", { $or: [{ id: 1 }, { token: body.token }] }), /where\.\$or\[1\]\.token is undefined/);
    assert.equal(tagged.get("users", { email: "ada@example.com", token: "t-1" })?.id, 1);
    assert.equal(tagged.count("users", {}), 3);
  });

  it("the default mode still drops the condition of an undefined value on reads", () => {
    assert.equal(plain.get("users", { email: "ada@example.com", token: undefined })?.id, 1);
    assert.equal(plain.count("users", { token: { eq: undefined } }), 3);
    assert.equal(plain.count("users", { $or: [{ token: undefined }] }), 3);
  });

  it("the option is checked", () => {
    assert.throws(() => new SQLite(":memory:", /** @type {any} */ ({ operators: "loose" })), { name: "SQLiteError", message: /Invalid operators/ });
    const explicit = new SQLite(":memory:", { operators: "plain" });
    explicit.close();
  });
});

describe("security: raw SQL fragments are documented as such", () => {
  it("check, constraint expressions and partial indexes warn against user input", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "src", "SQLite.js"), "utf8");
    const line = (pattern) => source.split("\n").find((l) => pattern.test(l)) ?? "";
    assert.match(line(/@property \{string\} \[check\]/), /never build it from user input/);
    assert.match(line(/@property \{string\} \[where\] Makes it a partial index/), /never build it from user input/);
    assert.match(source, /expression` of a `check` is written\s+\* into the table as is: never build it from user input/);
  });
});
