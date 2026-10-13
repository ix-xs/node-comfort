---
title: "SQLite"
description: "SQLite made pleasant, on the engine built into Node.js (22.13+): CRUD with rich filters, JSON and boolean columns, transactions, migrations and backups. Methods are synchronous, like the engine, but `await` still works. Errors are `SQLiteError`s. Values are always bound as parameters and names are checked, so there's no SQL injection through them."
sidebar:
  label: "SQLite"
  order: 19
---

```js
const { SQLite } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const SQLite = require("@ix-xs/node-comfort/sqlite");
```

This page lists everything `SQLite` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/sqlite/).

```js
const db = new nc.SQLite("data/app.sqlite");
db.createTable({
  name: "users",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    email: { type: "TEXT", notNull: true, unique: true },
    settings: { type: "JSON", defaultValue: {} },
  },
});
db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
db.getAll("users", { email: { like: "%@example.com" } }, { orderBy: "email", limit: 20 });
```

## constructor

```ts
new SQLite<R = Record<string, any>>(path?: string, options?: SQLiteOptions): SQLite<R>
```

Opens a database, creating the file and its folders if needed. Use
`":memory:"` for a throwaway in-memory database.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Relative to the working directory. Defaults to `"db.sqlite"`. |
| `options?` | [`SQLiteOptions`](#sqliteoptions) |  |

**Throws** `SQLiteError`: If the file can't be opened.

```js
const db = new nc.SQLite();                                  // ./db.sqlite
const app = new nc.SQLite("data/app.sqlite", { dates: true });
const mem = new nc.SQLite(":memory:");
```

## exec

```ts
exec(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): { changes: number; lastInsertRowid: number | bigint; }
```

Runs SQL that doesn't return rows. Without parameters, you can pass
several statements at once.

| Parameter | Type | Description |
| --- | --- | --- |
| `sql` | `string` |  |
| `params?` | `unknown[] \| ``Record``<string, unknown> \| string \| number \| bigint \| boolean \| ``Date`` \| null` | An array, named parameters like `{ $id: 1 }`, or a single value. |

**Throws** `SQLiteError`

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]);
db.exec("DELETE FROM sessions WHERE user_id = $id", { $id: 42 });
db.exec(`
  CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT UNIQUE);
  CREATE INDEX idx_tags_label ON tags (label);
`);
```

## queryOne

```ts
queryOne<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T | undefined
```

Runs a query and returns the first row. JSON and boolean columns are
converted like in `get()`, joins and renamed columns included. On Node.js
before 22.16, that only works for a query on a single table.

**Throws** `SQLiteError`

```js
const user = db.queryOne("SELECT * FROM users WHERE email = ?", [email]);
```

## queryAll

```ts
queryAll<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T[]
```

Runs a query and returns every row.

**Throws** `SQLiteError`

```js
const stats = db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
```

## iterate

```ts
iterate<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): Generator<T, void, undefined>
```

Goes through the rows of a query one at a time, without loading them all.
For big exports.

**Throws** `SQLiteError`

```js
for (const row of db.iterate("SELECT * FROM events WHERE day = ?", [day])) {
  stream.write(JSON.stringify(row) + "\n");
}
```

## createTable

```ts
createTable(table: TableDefinition): { ok: true; }
```

Creates a table with its constraints and indexes, unless it already
exists. To change an existing table, use `migrate()`.

**Throws** `SQLiteError`: If the definition is invalid.

```js
db.createTable({
  name: "posts",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true, references: { table: "users", column: "id" }, onDelete: "CASCADE" },
    status: { type: "TEXT", values: ["draft", "published"], defaultValue: "draft" },
    tags: { type: "JSON", defaultValue: [] },
  },
  indexes: [{ columns: ["user_id", "status"] }],
});
```

## createIndex

```ts
createIndex(tableName: string, index: IndexDefinition): { ok: true; }
```

Creates an index, unless it already exists.

**Throws** `SQLiteError`

```js
db.createIndex("users", { columns: ["email"], unique: true });
db.createIndex("posts", { columns: ["slug"], unique: true, where: "deleted_at IS NULL" });
```

## deleteTable

```ts
deleteTable(tableName: string): { ok: true; }
```

Drops a table and everything in it.

**Throws** `SQLiteError`: If the table doesn't exist.

## clearTable

```ts
clearTable(tableName: string): { ok: true; }
```

Deletes every row, keeping the table.

**Throws** `SQLiteError`: If the table doesn't exist.

## hasTable

```ts
hasTable(tableName: string): boolean
```

Does the table exist?

## tables

```ts
tables(): string[]
```

The tables in the database, sorted.

## columns

```ts
columns(tableName: string): ColumnInfo[]
```

The columns of a table.

**Throws** `SQLiteError`: If the table doesn't exist.

```js
db.columns("users");
// [{ name: "id", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: true }, ...]
```

## get

```ts
get<T = R>(tableName: string, where?: Where<R>, options?: Pick<QueryOptions, "columns" | "orderBy" | "direction">): T | undefined
```

The first row that matches.

**Throws** `SQLiteError`

```js
const user = db.get("users", { email: "ada@example.com" });
const latest = db.get("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC" });
```

## getAll

```ts
getAll<T = R>(tableName: string, where?: Where<R>, options?: QueryOptions): T[]
```

The rows that match, with sorting and pagination.

**Throws** `SQLiteError`

```js
db.getAll("users");
db.getAll("users", { role: ["admin", "editor"], age: { gte: 18 } });
db.getAll("posts", { $or: [{ pinned: true }, { views: { gt: 1000 } }] }, {
  orderBy: [["views", "DESC"], "title"],
  limit: 20,
  offset: 40,
});
```

## paginate

```ts
paginate<T = R>(tableName: string, where?: Where<R>, options?: PaginateOptions): Page<T>
```

One page of the rows that match, with what a pager needs to draw itself.

**Returns** [`Page`](/reference/arr/#page)`<``T``>`: A page past the end gives the last one.

**Throws** `SQLiteError`

```js
const { items, pages, hasNext } = db.paginate("posts", { status: "published" }, {
  page: 3,
  perPage: 20,
  orderBy: "created_at",
  direction: "DESC",
});
```

## count

```ts
count(tableName: string, where?: Where<R>): number
```

Counts the rows that match.

**Throws** `SQLiteError`

```js
db.count("users", { active: true });
```

## exists

```ts
exists(tableName: string, where?: Where<R>): boolean
```

Does any row match?

**Throws** `SQLiteError`

```js
if (db.exists("users", { email })) throw new Error("Email already registered");
```

## insert

```ts
insert(tableName: string, data: Partial<R> & Record<string, unknown>, options?: InsertOptions): InsertResult
```

Inserts a row. Objects and arrays are stored as JSON, booleans as 1 and
0, dates as ISO strings. `undefined` values are skipped, so column
defaults apply.

**Throws** `SQLiteError`: On a constraint failure; `sqliteCode` tells you which, like `"SQLITE_CONSTRAINT_UNIQUE"`.

```js
const { lastInsertRowid } = db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
db.insert("tags", { label: "news" }, { onConflict: "ignore" }); // no error if it's already there
```

## insertMany

```ts
insertMany(tableName: string, rows: Iterable<Partial<R> & Record<string, unknown>>, options?: InsertOptions): ChangeResult
```

Inserts many rows in one transaction: all or nothing, and much faster
than one by one.

**Throws** `SQLiteError`: If a row fails; nothing is inserted then.

```js
db.insertMany("products", rowsFromCsv);
db.insertMany("tags", labels.map((label) => ({ label })), { onConflict: "ignore" });
```

## update

```ts
update(tableName: string, data: Partial<R> & Record<string, unknown>, where: Where<R>): ChangeResult
```

Updates the rows that match. The filter is required, so a forgotten
condition can't rewrite the whole table.

| Parameter | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `data` | `Partial``<``R``> & ``Record``<string, unknown>` | `undefined` values are skipped. |
| `where` | [`Where`](#where)`<``R``>` |  |

**Throws** `SQLiteError`

```js
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
```

## upsert

```ts
upsert(tableName: string, data: Partial<R> & Record<string, unknown>, conflict: string[]): InsertResult
```

Inserts a row, or updates it in place if it clashes with an existing one
on the `conflict` columns.

| Parameter | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `data` | `Partial``<``R``> & ``Record``<string, unknown>` |  |
| `conflict` | `string[]` | The unique columns that identify the row. |

**Throws** `SQLiteError`: If `conflict` doesn't match a unique constraint.

```js
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
```

## set

```ts
set(tableName: string, data: Partial<R> & Record<string, unknown>, where?: Where<R> | null): { ok: true; }
```

Updates the row matching `where` (or `{ id: data.id }`), or inserts it.
Kept from 1.x; `upsert()` does the same in one atomic statement.

**Throws** `SQLiteError`

## delete

```ts
delete(tableName: string, where: Where<R>): ChangeResult
```

Deletes the rows that match. The filter is required; `clearTable()`
deletes everything on purpose.

**Throws** `SQLiteError`

```js
db.delete("sessions", { expires_at: { lt: new Date() } });
```

## increment

```ts
increment(tableName: string, amounts: Partial<Record<keyof R & string, number>> & Record<string, number>, where: Where<R>): ChangeResult
```

Adds to number columns in one statement, so two requests at the same
moment both count. Reading the value, adding to it and writing it back
would lose one of them. Negative numbers subtract; an empty column
counts as 0.

| Parameter | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `amounts` | `Partial``<``Record``<keyof ``R`` & string, number>> & ``Record``<string, number>` | Column names and how much to add. |
| `where` | [`Where`](#where)`<``R``>` |  |

**Throws** `SQLiteError`

```js
db.increment("posts", { views: 1 }, { id: post.id });
db.increment("accounts", { balance: -25, withdrawals: 1 }, { id: account.id });
```

## table

```ts
table<T = R>(tableName: string): TableHandle<T>
```

Shortcuts bound to one table, so you don't repeat its name.

| Parameter | Type | Description |
| --- | --- | --- |
| `tableName` | `string` | The table can be created later. |

```js
const users = db.table("users"); // in TypeScript: db.table<User>("users")
users.insert({ email: "ada@example.com" });
users.count({ active: true });
```

## transaction

```ts
transaction<T>(callback: () => T, options?: TransactionOptions): T
```

Runs `callback` in a transaction: all its changes are saved together, or
none are if it throws. The error is then thrown again. Transactions can
nest; an inner failure can be caught without losing the outer work.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | `() => ``T` | Can be async; the commit then waits for it. |
| `options?` | [`TransactionOptions`](#transactionoptions) |  |

**Throws** Whatever `callback` threw, after rolling back.

```js
db.transaction(() => {
  db.increment("accounts", { balance: -amount }, { id: from.id });
  db.increment("accounts", { balance: amount }, { id: to.id });
});
```

## inTransaction

```ts
inTransaction: boolean
```

Whether a transaction is open.

## migrate

```ts
migrate(migrations: Migration[]): { from: number; to: number; }
```

Applies migrations in order, each one once. The current version is kept
in the database, and each migration runs in its own transaction. Only
ever add migrations at the end of the list.

| Parameter | Type | Description |
| --- | --- | --- |
| `migrations` | [`Migration`](#migration)`[]` | All of them, from the first. |

**Returns** `{ from: number, to: number }`: The version before and after.

**Throws** `SQLiteError`: If a migration fails. It's rolled back; earlier ones stay.

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
```

## version

```ts
version: number
```

The migration version, stored in `PRAGMA user_version`.

## backup

```ts
backup(path: string): string
```

Copies the database to a new file. Safe while the app is running.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` | Must not exist yet. |

**Returns** `string`: The absolute path of the copy.

**Throws** `SQLiteError`: If the file exists or can't be written.

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
```

## vacuum

```ts
vacuum(): void
```

Compacts the database file to reclaim unused space.

## fn

```ts
fn(name: string, implementation: (...args: any[]) => string | number | bigint | Uint8Array<ArrayBufferLike> | null, options?: { deterministic?: boolean; varargs?: boolean; } | undefined): SQLite<R>
```

Makes a JavaScript function callable from SQL.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `implementation` | `(...args: any[]) => null \| number \| bigint \| string \| ``Uint8Array` |  |
| `options?` | `{ deterministic?: boolean, varargs?: boolean }` | `deterministic` (on by default) lets indexes use it; `varargs` accepts any number of arguments. |

```js
db.fn("slugify", (text) => nc.str.slugify(String(text)));
db.queryAll("SELECT slugify(title) AS slug FROM posts");
```

## path

```ts
path: string
```

The absolute path of the database file, or `":memory:"`.

## isOpen

```ts
isOpen: boolean
```

Whether the connection is open.

## native

```ts
native: DatabaseSync
```

The underlying `node:sqlite` database, for anything not covered here.

## close

```ts
close(): void
```

Closes the connection. Calling it twice is fine.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { ChangeResult } from "@ix-xs/node-comfort"`.

### ChangeResult

What an update or delete returns.

| Property | Type | Description |
| --- | --- | --- |
| `ok` | `true` |  |
| `changes` | `number` |  |

### ColumnDefinition

A column.

| Property | Type | Description |
| --- | --- | --- |
| `type` | [`ColumnType`](#columntype) | Like `"INTEGER"`, `"TEXT"`, `"JSON"` or `"VARCHAR(255)"`. |
| `primaryKey?` | `boolean` |  |
| `autoincrement?` | `boolean` | With an `INTEGER` primary key: ids are never reused. |
| `notNull?` | `boolean` |  |
| `unique?` | `boolean` |  |
| `defaultValue?` | `unknown` | Objects work for JSON columns, booleans for BOOLEAN ones. `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` and `"CURRENT_TIME"` mean the moment of the insert. |
| `defaultExpression?` | `string` | A default computed by SQLite, like `"(unixepoch())"` or `"(lower(hex(randomblob(16))))"`. Written into the table as is: never build it from user input. |
| `values?` | `unknown[]` | Allowed values. |
| `check?` | `string` | A `CHECK` expression, like `"price >= 0"`. |
| `references?` | `{ table: string; column: string; }` | Foreign key target. |
| `onDelete?` | [`ForeignKeyAction`](#foreignkeyaction) | When the referenced row is deleted. |
| `onUpdate?` | [`ForeignKeyAction`](#foreignkeyaction) | When the referenced key changes. |

### ColumnInfo

A column, as returned by `columns()`.

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `type` | `string` | `""` when there's none. |
| `notNull` | `boolean` |  |
| `defaultValue` | `unknown` | As SQL text, or `null`. |
| `primaryKey` | `boolean` |  |

### ColumnType

A column type. `JSON` and `BOOLEAN` columns give you back objects and
`true`/`false`.

```ts
type ColumnType = "INTEGER" | "TEXT" | "REAL" | "BLOB" | "NUMERIC" | "JSON" | "BOOLEAN" | "DATETIME" | (string & {})
```

### ForeignKeyAction

What happens to a row when the row it references changes.

```ts
type ForeignKeyAction = "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION"
```

### IndexDefinition

An index.

| Property | Type | Description |
| --- | --- | --- |
| `columns` | `string[]` | Several columns make a composite index. |
| `unique?` | `boolean` |  |
| `name?` | `string` | Defaults to `idx_<table>_<columns>`. |
| `where?` | `string` | Makes it a partial index, like `"deleted_at IS NULL"`. |

### InsertOptions

Options for `insert()` and `insertMany()`.

| Property | Type | Description |
| --- | --- | --- |
| `onConflict?` | `"replace" \| "ignore"` | What to do when a row clashes with an existing one: `"ignore"` skips it, `"replace"` deletes the old row first. By default, the insert fails. |

### InsertResult

What an insert returns.

| Property | Type | Description |
| --- | --- | --- |
| `ok` | `true` |  |
| `changes` | `number` |  |
| `lastInsertRowid` | `number \| bigint` |  |

### Migration

A migration: SQL (several statements are fine), or a function that gets
the database.

```ts
type Migration = string | ((db: SQLite<any>) => void)
```

### PaginateOptions

Options for `paginate()`.

| Property | Type | Description |
| --- | --- | --- |
| `page?` | `number` | Starts at 1, which is the default. |
| `perPage?` | `number` | Defaults to `20`. |
| `orderBy?` | `string \| (string \| [string, `[`SortDirection`](#sortdirection)`])[]` | Give one: without it, SQLite is free to return the rows in any order. |
| `direction?` | [`SortDirection`](#sortdirection) |  |
| `columns?` | `string[]` |  |

### QueryOptions

Options for `getAll()`.

| Property | Type | Description |
| --- | --- | --- |
| `orderBy?` | `string \| (string \| [string, `[`SortDirection`](#sortdirection)`])[]` | Like `"created_at"` or `[["age", "DESC"], "name"]`. |
| `direction?` | [`SortDirection`](#sortdirection) | For a single `orderBy` column. Defaults to `"ASC"`. |
| `limit?` | `number` |  |
| `offset?` | `number` | Rows to skip, for pagination. |
| `columns?` | `string[]` | Columns to return. Defaults to all. |

### SortDirection

Sort direction.

```ts
type SortDirection = "ASC" | "DESC" | "asc" | "desc"
```

### SQLiteOptions

Options for `new SQLite()`.

| Property | Type | Description |
| --- | --- | --- |
| `json?` | `boolean` | Parse `JSON` columns. Defaults to `true`. |
| `booleans?` | `boolean` | Return `BOOLEAN` columns as `true`/`false`. Defaults to `true`. |
| `dates?` | `boolean` | Return `DATE`, `DATETIME` and `TIMESTAMP` columns as `Date`s. Defaults to `false`. |
| `wal?` | `boolean` | Write-ahead logging: faster, and reads don't wait for writes. Defaults to `true`. |
| `foreignKeys?` | `boolean` | Enforce foreign keys. Defaults to `true`. |
| `busyTimeout?` | `string \| number` | How long to wait for a lock held by another connection, in ms or like `"5s"`. Defaults to 5 seconds. |
| `synchronous?` | `"``OFF``" \| "``NORMAL``" \| "``FULL``" \| "``EXTRA``"` | How hard SQLite pushes each commit to the disk. With `wal`, `"NORMAL"` writes several times faster and can't corrupt the file; a power cut may undo the last commits. Defaults to SQLite's own setting, `"FULL"`. |
| `readOnly?` | `boolean` |  |

### TableConstraint

A constraint on several columns.

```ts
type TableConstraint = { type: "unique"; columns: string[]; } | { type: "primaryKey"; columns: string[]; } | { type: "check"; expression: string; } | { type: "foreignKey"; columns: string[]; references: { table: string; columns: string[]; }; onDelete?: ForeignKeyAction; onUpdate?: ForeignKeyAction; }
```

### TableDefinition

A table for `createTable()`.

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `columns?` | `Record``<string, `[`ColumnDefinition`](#columndefinition)`>` |  |
| `options?` | `Record``<string, `[`ColumnDefinition`](#columndefinition)`>` | Old name for `columns`, still accepted. |
| `constraints?` | [`TableConstraint`](#tableconstraint)`[]` |  |
| `indexes?` | [`IndexDefinition`](#indexdefinition)`[]` |  |

### TableHandle

Shortcuts bound to one table, from `table()`.

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `get` | `(where?: `[`Where`](#where)`<``R``>, options?: ``Pick``<`[`QueryOptions`](#queryoptions)`, "columns" \| "orderBy" \| "direction">) => ``R` | The first matching row. |
| `getAll` | `(where?: `[`Where`](#where)`<``R``>, options?: `[`QueryOptions`](#queryoptions)`) => ``R``[]` | All matching rows. |
| `paginate` | `(where?: `[`Where`](#where)`<``R``>, options?: `[`PaginateOptions`](#paginateoptions)`) => `[`Page`](/reference/arr/#page)`<``R``>` | One page of matching rows. |
| `insert` | `(data: ``Partial``<``R``>, options?: `[`InsertOptions`](#insertoptions)`) => `[`InsertResult`](#insertresult) | Inserts a row. |
| `insertMany` | `(rows: ``Iterable``<``Partial``<``R``>>, options?: `[`InsertOptions`](#insertoptions)`) => `[`ChangeResult`](#changeresult) | Inserts rows in one transaction. |
| `update` | `(data: ``Partial``<``R``>, where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Updates matching rows. |
| `increment` | `(amounts: ``Partial``<``Record``<keyof ``R`` & string, number>>, where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Adds to number columns. |
| `upsert` | `(data: ``Partial``<``R``>, conflict: string[]) => `[`InsertResult`](#insertresult) | Inserts, or updates on conflict. |
| `delete` | `(where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Deletes matching rows. |
| `count` | `(where?: `[`Where`](#where)`<``R``>) => number` | Counts matching rows. |
| `exists` | `(where?: `[`Where`](#where)`<``R``>) => boolean` | Does any row match? |
| `clear` | `() => { ok: true; }` | Deletes every row. |

### TransactionOptions

Options for `transaction()`.

| Property | Type | Description |
| --- | --- | --- |
| `immediate?` | `boolean` | Take the write lock right away, instead of on the first write. Use it for read-then-write work when several processes share the database: they then wait for each other instead of failing with `SQLITE_BUSY`. |

### Where

A filter. Each key is a column: a value means "equals", `null` means
`IS NULL`, an array means "one of", and an object uses operators. Keys
combine with AND; use `$or` and `$and` for the rest.

A key with dots looks inside a JSON column: `"settings.theme"` is the
`theme` key of the `settings` column, `"tags.0"` the first item of `tags`.

```ts
type Where = { [K in keyof R]?: WhereValue; } & { [path: `${string}.${string}`]: WhereValue; } & { $or?: Where<R>[]; $and?: Where<R>[]; }
```

### WhereOperators

Operators for a column in a filter.

| Property | Type | Description |
| --- | --- | --- |
| `eq?` | `unknown` | Equal. `null` means `IS NULL`. |
| `ne?` | `unknown` | Not equal. Rows where the column is `NULL` match too. |
| `gt?` | `string \| number \| bigint \| ``Date` | Greater than. |
| `gte?` | `string \| number \| bigint \| ``Date` | Greater than or equal. |
| `lt?` | `string \| number \| bigint \| ``Date` | Less than. |
| `lte?` | `string \| number \| bigint \| ``Date` | Less than or equal. |
| `in?` | `unknown[]` | One of these values. |
| `notIn?` | `unknown[]` | None of these values. |
| `like?` | `string` | A `LIKE` pattern: `%` any text, `_` one character. |
| `notLike?` | `string` |  |
| `glob?` | `string` | A case-sensitive pattern: `*` any text, `?` one character. |
| `between?` | `[unknown, unknown]` | From `min` to `max`, both included. |
| `isNull?` | `boolean` | `true` for `IS NULL`, `false` for `IS NOT NULL`. |

### WhereValue

The condition for one column: a value, `null`, an array, or operators.

```ts
type WhereValue = null | string | number | bigint | boolean | Date | Uint8Array | readonly unknown[] | WhereOperators
```
