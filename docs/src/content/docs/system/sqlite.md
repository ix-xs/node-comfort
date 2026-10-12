---
title: "SQLite"
description: "`nc.SQLite` wraps the SQLite engine that ships with Node.js 22.13+. There's no native module to compile, and you get CRUD helpers, rich filters, JSON columns, transactions, migrations and backups."
sidebar:
  order: 2
---

```js
const db = new nc.SQLite("data/app.sqlite");

db.createTable({
  name: "users",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    email: { type: "TEXT", notNull: true, unique: true },
    settings: { type: "JSON", defaultValue: {} },
    active: { type: "BOOLEAN", defaultValue: true },
  },
});

db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
const ada = db.get("users", { email: "ada@example.com" });
ada.settings.theme; // "dark"
```

Methods are synchronous, like the engine. `await` still works if you prefer it. Values are always passed as parameters and table and column names are checked, so there's no SQL injection through them.

## Opening a database

```js
const db = new nc.SQLite();                      // ./db.sqlite
const app = new nc.SQLite("data/app.sqlite");    // folders are created
const mem = new nc.SQLite(":memory:");           // throwaway, for tests
const ro = new nc.SQLite("app.sqlite", { readOnly: true });
const quick = new nc.SQLite("app.sqlite", { synchronous: "NORMAL" });
```

Write-ahead logging and foreign keys are on by default. Close the connection with `db.close()`.

`synchronous` says how hard SQLite pushes each commit to the disk. It stays at SQLite's own setting, `"FULL"`, unless you change it. With write-ahead logging, `"NORMAL"` makes writes faster and can't corrupt the file, but a power cut may undo the last commits.

## Tables

```js
db.createTable({
  name: "posts",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true, references: { table: "users", column: "id" }, onDelete: "CASCADE" },
    title: { type: "TEXT", notNull: true },
    status: { type: "TEXT", values: ["draft", "published"], defaultValue: "draft" },
    tags: { type: "JSON", defaultValue: [] },
    views: { type: "INTEGER", defaultValue: 0, check: "views >= 0" },
    created_at: { type: "DATETIME", defaultValue: "CURRENT_TIMESTAMP" },
    token: { type: "TEXT", defaultExpression: "lower(hex(randomblob(16)))" },
  },
  constraints: [{ type: "unique", columns: ["user_id", "title"] }],
  indexes: [{ columns: ["status"] }],
});

db.tables();         // ["posts", "users"]
db.columns("posts"); // [{ name: "id", type: "INTEGER", primaryKey: true, ... }, ...]
```

`createTable` does nothing if the table already exists. To change a table, use migrations.

`defaultValue` is a fixed value, with one exception: `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` and `"CURRENT_TIME"` mean the moment of the insert. `defaultExpression` is a default that SQLite computes for each new row. It's written into the table as is, so never build it from user input.

## Reading

```js
db.get("users", { email });                                        // first match, or undefined
db.getAll("users");                                                // every row
db.getAll("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC", limit: 20, offset: 40 });
db.count("users", { active: true });
db.exists("users", { email });
```

The name can also be a view or a temporary table. They're read like any other table.

`paginate` returns one page, with what a pager needs to draw itself:

```js
const page = db.paginate("posts", { status: "published" }, { page: 2, perPage: 10, orderBy: "created_at", direction: "DESC" });
page.items;   // the 10 rows of page 2
page.total;   // 22, the number of matching rows
page.pages;   // 3
page.hasPrev; // true
page.hasNext; // true
```

Pages start at 1, and `perPage` is 20 unless you say otherwise. A page past the end gives the last one. Always give an `orderBy`: without one, SQLite is free to return the rows in any order.

## Filters

A filter is an object where each key is a column:

```js
db.getAll("users", {
  role: ["admin", "editor"],             // IN
  age: { gte: 18, lt: 65 },              // operators
  deleted_at: null,                      // IS NULL
  $or: [{ email: { like: "%@acme.com" } }, { vip: true }],
});
```

Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `like`, `notLike`, `glob`, `between` and `isNull`. Booleans and dates can be passed directly.

A key with dots looks inside a JSON column:

```js
db.getAll("users", { "settings.theme": "dark", "settings.langs.0": "en" }, { orderBy: "settings.theme" });
```

`"settings.theme"` is the `theme` key of the `settings` column, and `"settings.langs.0"` the first item of its `langs` array. Operators work on these keys too, and `orderBy` accepts them.

## Writing

```js
const { lastInsertRowid } = db.insert("users", { email, settings: { theme: "dark" } });
db.insertMany("products", rows);                                  // one transaction, much faster
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
db.increment("posts", { views: 1 }, { id: post.id });
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
db.delete("sessions", { expires_at: { lt: new Date() } });
```

Objects and arrays are stored as JSON, booleans as 1 and 0, and dates as ISO strings. `update`, `increment` and `delete` refuse an empty filter, so a forgotten condition can't wipe a table; `clearTable()` does that on purpose.

`increment` adds to number columns in a single statement, so two requests that arrive together both count. Reading the value, adding to it and writing it back would lose one of them. Negative numbers subtract, and an empty column counts as 0.

An insert that clashes with an existing row fails, unless you say what to do with `onConflict`:

```js
db.insert("tags", { label: "news" }, { onConflict: "ignore" });    // changes is 0 if it was already there
db.insertMany("tags", labels.map((label) => ({ label })), { onConflict: "ignore" });
db.insert("tags", { id: 1, label: "press" }, { onConflict: "replace" });
```

`"ignore"` skips the row. `"replace"` deletes the old row, then inserts the new one. To change a row in place and keep its other columns, use `upsert`.

## JSON, booleans and dates

Columns declared as `JSON` come back parsed, and `BOOLEAN` columns come back as `true`/`false`. Pass `{ dates: true }` when opening the database to also get `Date` objects from `DATE`, `DATETIME` and `TIMESTAMP` columns.

Raw queries are converted the same way, joins and renamed columns included:

```js
db.queryOne("SELECT p.title, p.tags, u.active AS author_active FROM posts p JOIN users u ON u.id = p.user_id");
// { title: "Hello", tags: ["news"], author_active: true }
```

On Node.js before 22.16, that only works for a query on a single table.

A `CURRENT_TIMESTAMP` default writes UTC text like `"2026-10-12 10:37:04"`, without a time zone. To get the ISO format that inserted dates have, use `defaultExpression: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"` instead.

## Errors

Failures throw a `SQLiteError`. Its `sqliteCode` tells you what happened:

```js
try {
  db.insert("users", { email });
} catch (error) {
  if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") return "Email already taken";
  throw error;
}
```

## Transactions

```js
db.transaction(() => {
  db.increment("accounts", { balance: -amount }, { id: from.id });
  db.increment("accounts", { balance: amount }, { id: to.id });
});
```

If the function throws, every change is rolled back and the error is thrown again. Transactions can be nested: an inner failure you catch doesn't undo the outer work. Async functions work too; the commit waits for them.

When several processes share the database and a transaction reads before it writes, pass `{ immediate: true }`:

```js
db.transaction(() => {
  const account = db.get("accounts", { id });
  if (account.balance < amount) throw new Error("Not enough money");
  db.increment("accounts", { balance: -amount }, { id });
}, { immediate: true });
```

The write lock is then taken right away instead of on the first write, so the processes wait for each other instead of failing with `SQLITE_BUSY`.

## Migrations

`migrate` applies each migration once, in order, and records the version in the database:

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
```

Only ever add migrations at the end of the list. Each one runs in its own transaction, so a failing migration is rolled back and leaves the earlier ones in place.

## Raw SQL

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]);
db.queryOne("SELECT COUNT(*) AS total FROM orders WHERE paid = ?", true);
db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
for (const row of db.iterate("SELECT * FROM events")) stream.write(JSON.stringify(row));
```

Parameters can be an array, a single value, or named: `{ $id: 42 }`.

## Typed rows

```ts
type User = { id: number; email: string; active: boolean };
const db = new nc.SQLite<User>("app.sqlite");
db.getAll("users", { active: true }); // User[], and filters suggest the columns
```

`db.table("users")` returns shortcuts bound to one table: `users.get()`, `users.insert()`, `users.paginate()`...

## Maintenance

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`); // safe while running
db.vacuum();
db.fn("slugify", (text) => nc.str.slugify(String(text)));                   // call JavaScript from SQL
db.native;                                                                  // the underlying DatabaseSync
```

Every method and option is listed in the [reference](/reference/sqlite/).
