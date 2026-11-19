---
title: "SQLite"
description: "`nc.sqlite`: the SQLite engine built into Node.js, with CRUD helpers, filters, JSON and boolean columns, transactions, migrations and backups. Nothing to compile."
---

```js
const nc = require("@ix-xs/node-comfort");
const { sqlite } = nc;
```

| Member | |
| --- | --- |
| `open(path?, options?)` | Opens a database: same as `new sqlite.SQLite(path, options)` |
| `SQLite` | The class, to type or extend |
| `op` | Filter operators that only code can make: `op.gte(18)` |

Methods are synchronous, like the engine; `await` still works. Values are always bound as parameters and table and column names are checked, so neither can inject SQL.

## Opening

```js
const db = sqlite.open();                                   // ./db.sqlite
const app = sqlite.open(nc.fs.resolve("./data/app.sqlite")); // folders are created
const mem = sqlite.open(":memory:");
const ro = sqlite.open("app.sqlite", { readOnly: true });
```

A relative path is read from the working directory, not from the calling file: pass `nc.fs.resolve()` for a path next to your code ([Conventions](/basics/conventions/)).

| Option | Default | |
| --- | --- | --- |
| `json` | `true` | Parse `JSON` columns |
| `booleans` | `true` | Return `BOOLEAN` columns as `true`/`false` |
| `dates` | `false` | Return `DATE`, `DATETIME` and `TIMESTAMP` columns as `Date` |
| `wal` | `true` | Write-ahead logging: reads don't wait for writes |
| `foreignKeys` | `true` | Enforce foreign keys |
| `busyTimeout` | 5 seconds | Wait for a lock held by another connection, ms or text |
| `synchronous` | `"FULL"` | `"NORMAL"` writes faster with `wal` and cannot corrupt the file; a power cut may undo the last commits |
| `readOnly` | `false` | |
| `operators` | `"plain"` | `"tagged"`: see [Values from a request](#values-from-a-request) |

| Property or method | |
| --- | --- |
| `db.path` | Absolute path, or `":memory:"` |
| `db.isOpen` | Whether the connection is open |
| `db.close()` | Closes it |
| `db.native` | The underlying `DatabaseSync` of `node:sqlite` |

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
  },
  constraints: [{ type: "unique", columns: ["user_id", "title"] }],
  indexes: [{ columns: ["status"] }],
});

db.tables();         // ["posts", "users"]
db.columns("posts"); // [{ name: "id", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: true }, ...]
```

| Column key | |
| --- | --- |
| `type` | `INTEGER`, `TEXT`, `REAL`, `BLOB`, `NUMERIC`, `JSON`, `BOOLEAN`, `DATETIME`, or any SQLite type like `VARCHAR(255)` |
| `primaryKey`, `autoincrement`, `notNull`, `unique` | Constraints |
| `defaultValue` | A fixed value; `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` and `"CURRENT_TIME"` mean the moment of the insert |
| `defaultExpression` | SQL computed for each row, written as is: never from user input |
| `values` | Allowed values |
| `check` | A `CHECK` expression |
| `references`, `onDelete`, `onUpdate` | Foreign key |

`constraints` takes `{ type: "unique" | "primaryKey", columns }`, `{ type: "check", expression }` and `{ type: "foreignKey", columns, references: { table, columns } }`; `indexes` takes what `createIndex` takes.

| Method | |
| --- | --- |
| `createTable(definition)` | Does nothing if the table exists. Change a table with migrations |
| `createIndex(table, { columns, unique, name, where })` | Unless it exists; `where` makes a partial index |
| `deleteTable(table)` | Drops it |
| `clearTable(table)` | Deletes every row, keeps the table |
| `hasTable(table)`, `tables()`, `columns(table)` | Inspect the schema |

## Reading

```js
db.get("users", { email });   // first match, or undefined
db.getAll("users");           // every row
db.getAll("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC", limit: 20, offset: 40 });
db.count("users", { active: true });
db.exists("users", { email });

const page = db.paginate("posts", { status: "published" }, { page: 2, perPage: 10, orderBy: "id", direction: "DESC" });
// { items: [10 rows], page: 2, perPage: 10, total: 22, pages: 3, hasPrev: true, hasNext: true }
```

| Read option | |
| --- | --- |
| `orderBy`, `direction` | Column (a JSON path works) and `"ASC"` or `"DESC"` |
| `limit`, `offset` | `getAll` |
| `page`, `perPage` | `paginate`: pages start at 1, `perPage` is 20 by default, a page past the end gives the last one |

The table name can be a view or a temporary table. Give `paginate` an `orderBy`: without one, SQLite returns rows in any order.

## Filters

Each key of a filter is a column:

```js
db.getAll("users", {
  role: ["admin", "editor"],  // IN
  age: { gte: 18, lt: 65 },   // operators
  deleted_at: null,           // IS NULL
  $or: [{ email: { like: "%@acme.com" } }, { vip: true }],
});

db.getAll("users", { "settings.theme": "dark", "settings.langs.0": "en" }, { orderBy: "settings.theme" });
```

| Filter | |
| --- | --- |
| `value` | Equal; booleans and dates are converted |
| `[a, b]` | One of |
| `null` | `IS NULL` |
| `{ eq, ne, gt, gte, lt, lte, in, notIn, like, notLike, glob, between, isNull }` | Operators, combined with AND |
| `$or`, `$and` | Lists of filters |
| `"column.key.0"` | A key inside a JSON column, with every operator and in `orderBy` |

### Values from a request

By default any object with an operator key is an operator: if `req.body.token` is `{ "ne": "" }`, `{ token: req.body.token }` matches every row with a token. Check such values first ([schemas](/data/schema/)), or open the database with `operators: "tagged"`: only the operators made by `op` count, and any other object or array is a value, compared as JSON text.

```js
const { op } = sqlite;
const db = sqlite.open("data/app.sqlite", { operators: "tagged" });

db.getAll("users", { age: op.between(18, 65), role: op.in(["admin", "editor"]), deleted_at: op.isNull() });
db.get("users", { email, token: req.body.token }); // { "ne": "" } is a value; undefined throws
```

`op` has `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `like`, `notLike`, `glob`, `between`, `isNull` and `notNull`. They work in both modes and can be spread together: `{ ...op.gte(18), ...op.lt(65) }`. With `"tagged"`, an `undefined` value in a read throws, as it does in writes; in the default mode it drops its condition.

## Writing

```js
const { lastInsertRowid } = db.insert("users", { email, settings: { theme: "dark" } });
db.insertMany("products", rows);
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
db.increment("posts", { views: 1 }, { id: post.id });
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
db.delete("sessions", { expires_at: { lt: new Date() } });
```

| Method | Returns | |
| --- | --- | --- |
| `insert(table, data, { onConflict })` | `{ ok, changes, lastInsertRowid }` | `onConflict`: `"ignore"` skips the row, `"replace"` deletes the old one first |
| `insertMany(table, rows, { onConflict })` | `{ ok, changes }` | One transaction |
| `update(table, data, where)` | `{ ok, changes }` | `undefined` values are skipped |
| `increment(table, { column: n }, where)` | `{ ok, changes }` | One statement, so concurrent increments all count; negative subtracts |
| `upsert(table, data, conflict)` | `{ ok, changes, lastInsertRowid }` | Inserts, or updates in place on a clash of the `conflict` columns, which must be a primary key or unique constraint |
| `delete(table, where)` | `{ ok, changes }` | |

Objects and arrays are stored as JSON, booleans as 1 and 0, dates as ISO text. `update`, `increment` and `delete` throw a `SQLiteError` for a filter that would reach every row: an empty filter, `{ id: undefined }`, an empty `$or` or `$and`, `{ id: { notIn: [] } }`.

```js
db.delete("sessions", { user_id: req.user?.id }); // throws when req.user is missing
db.clearTable("sessions");                         // every row, on purpose
```

## JSON, booleans and dates

`JSON` columns come back parsed, `BOOLEAN` columns as booleans, and with `{ dates: true }`, date columns as `Date`. Raw queries are converted too, joins and aliases included (on Node.js before 22.16, only for a query on one table):

```js
db.queryOne("SELECT p.title, p.tags, u.active AS author_active FROM posts p JOIN users u ON u.id = p.user_id");
// { title: "Post 1", tags: ["news"], author_active: true }
```

A `CURRENT_TIMESTAMP` default writes UTC text without a zone (`"2026-10-12 10:37:04"`), read back as the right moment with `dates: true`. For the ISO format of inserted dates: `defaultExpression: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"`.

## Errors

Failures throw a `SQLiteError` (`code` `ERR_SQLITE`) with `sql` and `sqliteCode`:

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

A function that throws rolls everything back, and the error is thrown again. The function's return value is returned. Transactions nest: an inner failure you catch does not undo the outer work. An async function works; the commit waits for it. `db.inTransaction` tells whether one is open.

When several processes share the file and a transaction reads before it writes, pass `{ immediate: true }`: the write lock is taken at once, and the processes wait for each other instead of failing with `SQLITE_BUSY`.

## Migrations

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
// { from: 0, to: 3 }, then { from: 3, to: 3 } on the next start
```

Each migration runs once, in order, in its own transaction; the version is stored in `PRAGMA user_version` and read with `db.version`. A failing migration is rolled back, the earlier ones stay. Only add migrations at the end of the list.

## Raw SQL

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]); // { changes, lastInsertRowid }
db.queryOne("SELECT COUNT(*) AS total FROM orders WHERE paid = ?", true);   // { total: 2 }
db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
for (const row of db.iterate("SELECT * FROM events")) stream.write(JSON.stringify(row));
```

Parameters are an array, a single value, or named: `{ $id: 42 }`.

## Typed rows

```ts
type User = { id: number; email: string; active: boolean };
const db = nc.sqlite.open<User>("app.sqlite");
db.getAll("users", { active: true }); // User[], and filters suggest the columns
```

`db.table("users")` binds the helpers to one table: `name`, `get`, `getAll`, `paginate`, `insert`, `insertMany`, `update`, `increment`, `upsert`, `delete`, `count`, `exists` and `clear`.

## Maintenance

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`); // absolute path of the copy
db.vacuum();
db.fn("slugify", (text) => nc.str.slugify(String(text)));
db.queryOne("SELECT slugify(title) AS slug FROM posts WHERE id = 3");        // { slug: "post-3" }
```

| Method | |
| --- | --- |
| `backup(path)` | Copies the database while it runs. The file must not exist; a relative path is read from the working directory |
| `vacuum()` | Reclaims unused space |
| `fn(name, implementation, { deterministic, varargs })` | A JavaScript function callable from SQL |

## Subpath

`@ix-xs/node-comfort/sqlite` exports the class itself, with `open` and `op` as static members:

```js
const SQLite = require("@ix-xs/node-comfort/sqlite");
const db = SQLite.open(":memory:");
const { op } = SQLite;
```

In ES modules, import it as the default export (`import SQLite from "@ix-xs/node-comfort/sqlite"`): `open` and `op` are not named exports of this entry point.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.SQLite` | `nc.sqlite.SQLite` |
| `new nc.SQLite(path, options)` | `nc.sqlite.open(path, options)` |
| `nc.SQLite.op` | `nc.sqlite.op` |
| `db.set(table, data, where)` | `db.upsert(table, data, conflict)`, or `db.get()` then `db.update()` or `db.insert()` |
| `createTable({ options })` | `createTable({ columns })` |

`db.set` looked the row up by `where` (or by `data.id`) and needed no unique column. `upsert` is one atomic statement and needs a primary key or unique constraint on the `conflict` columns. The old names keep working until 4.0, with a warning ([Upgrading to 3.0](/help/upgrade-3-0/)).
