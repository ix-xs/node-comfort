# SQLite

`nc.SQLite` wraps the SQLite engine that ships with Node.js 22.13+. There's no native module to compile, and you get CRUD helpers, rich filters, JSON columns, transactions, migrations and backups.

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
```

Write-ahead logging and foreign keys are on by default. Close the connection with `db.close()`.

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
  },
  constraints: [{ type: "unique", columns: ["user_id", "title"] }],
  indexes: [{ columns: ["status"] }],
});

db.tables();         // ["posts", "users"]
db.columns("posts"); // [{ name: "id", type: "INTEGER", primaryKey: true, ... }, ...]
```

`createTable` does nothing if the table already exists. To change a table, use migrations.

## Reading

```js
db.get("users", { email });                                        // first match, or undefined
db.getAll("users");                                                // every row
db.getAll("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC", limit: 20, offset: 40 });
db.count("users", { active: true });
db.exists("users", { email });
```

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

## Writing

```js
const { lastInsertRowid } = db.insert("users", { email, settings: { theme: "dark" } });
db.insertMany("products", rows);                                  // one transaction, much faster
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
db.delete("sessions", { expires_at: { lt: new Date() } });
```

Objects and arrays are stored as JSON, booleans as 1 and 0, and dates as ISO strings. `update` and `delete` refuse an empty filter, so a forgotten condition can't wipe a table; `clearTable()` does that on purpose.

## JSON, booleans and dates

Columns declared as `JSON` come back parsed, and `BOOLEAN` columns come back as `true`/`false`. Pass `{ dates: true }` when opening the database to also get `Date` objects from `DATE`, `DATETIME` and `TIMESTAMP` columns.

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
  db.update("accounts", { balance: from.balance - amount }, { id: from.id });
  db.update("accounts", { balance: to.balance + amount }, { id: to.id });
});
```

If the function throws, every change is rolled back and the error is thrown again. Transactions can be nested: an inner failure you catch doesn't undo the outer work. Async functions work too; the commit waits for them.

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

`db.table("users")` returns shortcuts bound to one table: `users.get()`, `users.insert()`, `users.count()`...

## Maintenance

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`); // safe while running
db.vacuum();
db.fn("slugify", (text) => nc.str.slugify(String(text)));                   // call JavaScript from SQL
db.native;                                                                  // the underlying DatabaseSync
```
