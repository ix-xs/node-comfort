"use strict";

/**
 * SQLite made pleasant, on the engine built into Node.js: CRUD with
 * rich filters, JSON and boolean columns, transactions, migrations and
 * backups. Methods are synchronous, like the engine, but `await` still
 * works. Errors are `SQLiteError`s. Values are always bound as parameters
 * and names are checked, so there's no SQL injection through them.
 *
 * @example
 * const db = nc.sqlite.open("data/app.sqlite");
 * db.createTable({
 *   name: "users",
 *   columns: {
 *     id: { type: "INTEGER", primaryKey: true, autoincrement: true },
 *     email: { type: "TEXT", notNull: true, unique: true },
 *     settings: { type: "JSON", defaultValue: {} },
 *   },
 * });
 * db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
 * db.getAll("users", { email: { like: "%@example.com" } }, { orderBy: "email", limit: 20 });
 *
 * // Values from a request can't turn into operators:
 * const safe = nc.sqlite.open("data/app.sqlite", { operators: "tagged" });
 * safe.getAll("users", { age: nc.sqlite.op.gte(18), role: nc.sqlite.op.in(["admin", "editor"]) });
 */

const SQLite = require("./SQLite.js");

/**
 * Opens a database, creating the file and its folders if needed. Same as
 * `new nc.sqlite.SQLite(path, options)`. Use `":memory:"` for a throwaway
 * in-memory database.
 *
 * @example
 * const db = nc.sqlite.open();                                // ./db.sqlite
 * const app = nc.sqlite.open("data/app.sqlite", { dates: true });
 * const typed = nc.sqlite.open<{ id: number; email: string }>(":memory:"); // TypeScript
 *
 * @template [R=Record<string, any>]
 * @param {string} [path="db.sqlite"] Relative to the working directory.
 * @param {import("./SQLite").SQLiteOptions} [options]
 * @returns {SQLite<R>}
 * @throws {SQLiteError} If the file can't be opened.
 */
function open(path, options) {
  return /** @type {SQLite<R>} */ (SQLite.open(path, options));
}

/**
 * Filter operators that only code can make, like `op.between(18, 65)`. Same
 * object as `nc.sqlite.SQLite.op`.
 *
 * @example
 * const { op } = nc.sqlite;
 * db.getAll("users", { age: op.between(18, 65), deleted_at: op.isNull() });
 *
 * @type {import("./SQLite").OperatorHelpers}
 */
const op = SQLite.op;

module.exports = {
  open,
  SQLite,
  op,
};
