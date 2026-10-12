"use strict";

/**
 * SQLite made pleasant, on the engine built into Node.js (22.13+): CRUD with
 * rich filters, JSON and boolean columns, transactions, migrations and
 * backups. Methods are synchronous, like the engine, but `await` still
 * works. Errors are `SQLiteError`s. Values are always bound as parameters
 * and names are checked, so there's no SQL injection through them.
 *
 * @example
 * const db = new nc.SQLite("data/app.sqlite");
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
 */

const nodePath = require("node:path");
const fs = require("node:fs");
const { SQLiteError } = require("./errors.js");
const { toMs } = require("./internal/shared.js");

/**
 * A column type. `JSON` and `BOOLEAN` columns give you back objects and
 * `true`/`false`.
 * @typedef {"INTEGER" | "TEXT" | "REAL" | "BLOB" | "NUMERIC" | "JSON" | "BOOLEAN" | "DATETIME" | (string & {})} ColumnType
 */

/**
 * What happens to a row when the row it references changes.
 * @typedef {"CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION"} ForeignKeyAction
 */

/**
 * A column.
 * @typedef {object} ColumnDefinition
 * @property {ColumnType} type Like `"INTEGER"`, `"TEXT"`, `"JSON"` or `"VARCHAR(255)"`.
 * @property {boolean} [primaryKey]
 * @property {boolean} [autoincrement] With an `INTEGER` primary key: ids are never reused.
 * @property {boolean} [notNull]
 * @property {boolean} [unique]
 * @property {unknown} [defaultValue] Objects work for JSON columns, booleans for BOOLEAN ones. `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` and `"CURRENT_TIME"` mean the moment of the insert.
 * @property {string} [defaultExpression] A default computed by SQLite, like `"(unixepoch())"` or `"(lower(hex(randomblob(16))))"`. Written into the table as is: never build it from user input.
 * @property {unknown[]} [values] Allowed values.
 * @property {string} [check] A `CHECK` expression, like `"price >= 0"`.
 * @property {{ table: string, column: string }} [references] Foreign key target.
 * @property {ForeignKeyAction} [onDelete] When the referenced row is deleted.
 * @property {ForeignKeyAction} [onUpdate] When the referenced key changes.
 */

/**
 * A constraint on several columns.
 * @typedef {{ type: "unique", columns: string[] } | { type: "primaryKey", columns: string[] } | { type: "check", expression: string } | { type: "foreignKey", columns: string[], references: { table: string, columns: string[] }, onDelete?: ForeignKeyAction, onUpdate?: ForeignKeyAction }} TableConstraint
 */

/**
 * An index.
 * @typedef {object} IndexDefinition
 * @property {string[]} columns Several columns make a composite index.
 * @property {boolean} [unique]
 * @property {string} [name] Defaults to `idx_<table>_<columns>`.
 * @property {string} [where] Makes it a partial index, like `"deleted_at IS NULL"`.
 */

/**
 * A table for `createTable()`.
 * @typedef {object} TableDefinition
 * @property {string} name
 * @property {Record<string, ColumnDefinition>} [columns]
 * @property {Record<string, ColumnDefinition>} [options] Old name for `columns`, still accepted.
 * @property {TableConstraint[]} [constraints]
 * @property {IndexDefinition[]} [indexes]
 */

/**
 * Operators for a column in a filter.
 * @typedef {object} WhereOperators
 * @property {unknown} [eq] Equal. `null` means `IS NULL`.
 * @property {unknown} [ne] Not equal. Rows where the column is `NULL` match too.
 * @property {number | string | bigint | Date} [gt] Greater than.
 * @property {number | string | bigint | Date} [gte] Greater than or equal.
 * @property {number | string | bigint | Date} [lt] Less than.
 * @property {number | string | bigint | Date} [lte] Less than or equal.
 * @property {unknown[]} [in] One of these values.
 * @property {unknown[]} [notIn] None of these values.
 * @property {string} [like] A `LIKE` pattern: `%` any text, `_` one character.
 * @property {string} [notLike]
 * @property {string} [glob] A case-sensitive pattern: `*` any text, `?` one character.
 * @property {[unknown, unknown]} [between] From `min` to `max`, both included.
 * @property {boolean} [isNull] `true` for `IS NULL`, `false` for `IS NOT NULL`.
 */

/**
 * A filter. Each key is a column: a value means "equals", `null` means
 * `IS NULL`, an array means "one of", and an object uses operators. Keys
 * combine with AND; use `$or` and `$and` for the rest.
 *
 * A key with dots looks inside a JSON column: `"settings.theme"` is the
 * `theme` key of the `settings` column, `"tags.0"` the first item of `tags`.
 *
 * @example
 * { status: "active", age: { gte: 18, lt: 65 }, role: ["admin", "editor"], deleted_at: null }
 * { $or: [{ email: { like: "%@acme.com" } }, { vip: true }] }
 * { "settings.theme": "dark", "settings.beta": true }
 *
 * @template [R=Record<string, any>] Row type; its keys are suggested as columns.
 * @typedef {{ [K in keyof R]?: WhereValue } & { [path: `${string}.${string}`]: WhereValue } & { $or?: Where<R>[], $and?: Where<R>[] }} Where
 */

/**
 * The condition for one column: a value, `null`, an array, or operators.
 * @typedef {null | string | number | bigint | boolean | Date | Uint8Array | readonly unknown[] | WhereOperators} WhereValue
 */

/**
 * Sort direction.
 * @typedef {"ASC" | "DESC" | "asc" | "desc"} SortDirection
 */

/**
 * Options for `getAll()`.
 * @typedef {object} QueryOptions
 * @property {string | Array<string | [string, SortDirection]>} [orderBy] Like `"created_at"` or `[["age", "DESC"], "name"]`.
 * @property {SortDirection} [direction] For a single `orderBy` column. Defaults to `"ASC"`.
 * @property {number} [limit]
 * @property {number} [offset] Rows to skip, for pagination.
 * @property {string[]} [columns] Columns to return. Defaults to all.
 */

/**
 * Options for `new SQLite()`.
 * @typedef {object} SQLiteOptions
 * @property {boolean} [json] Parse `JSON` columns. Defaults to `true`.
 * @property {boolean} [booleans] Return `BOOLEAN` columns as `true`/`false`. Defaults to `true`.
 * @property {boolean} [dates] Return `DATE`, `DATETIME` and `TIMESTAMP` columns as `Date`s.
 * @property {boolean} [wal] Write-ahead logging: faster, and reads don't wait for writes. Defaults to `true`.
 * @property {boolean} [foreignKeys] Enforce foreign keys. Defaults to `true`.
 * @property {number | string} [busyTimeout] How long to wait for a lock held by another connection, in ms or like `"5s"`. Defaults to 5 seconds.
 * @property {"OFF" | "NORMAL" | "FULL" | "EXTRA"} [synchronous] How hard SQLite pushes each commit to the disk. With `wal`, `"NORMAL"` writes several times faster and can't corrupt the file; a power cut may undo the last commits. Defaults to SQLite's own setting, `"FULL"`.
 * @property {boolean} [readOnly]
 */

/**
 * What an insert returns.
 * @typedef {{ ok: true, changes: number, lastInsertRowid: number | bigint }} InsertResult
 */

/**
 * What an update or delete returns.
 * @typedef {{ ok: true, changes: number }} ChangeResult
 */

/**
 * A column, as returned by `columns()`.
 * @typedef {object} ColumnInfo
 * @property {string} name
 * @property {string} type `""` when there's none.
 * @property {boolean} notNull
 * @property {unknown} defaultValue As SQL text, or `null`.
 * @property {boolean} primaryKey
 */

/**
 * A migration: SQL (several statements are fine), or a function that gets
 * the database.
 * @typedef {string | ((db: SQLite<any>) => void)} Migration
 */

/**
 * Shortcuts bound to one table, from `table()`.
 * @template [R=Record<string, any>]
 * @typedef {object} TableHandle
 * @property {string} name
 * @property {(where?: Where<R>, options?: Pick<QueryOptions, "columns" | "orderBy" | "direction">) => R | undefined} get The first matching row.
 * @property {(where?: Where<R>, options?: QueryOptions) => R[]} getAll All matching rows.
 * @property {(where?: Where<R>, options?: PaginateOptions) => import("./Arr").Page<R>} paginate One page of matching rows.
 * @property {(data: Partial<R>, options?: InsertOptions) => InsertResult} insert Inserts a row.
 * @property {(rows: Iterable<Partial<R>>, options?: InsertOptions) => ChangeResult} insertMany Inserts rows in one transaction.
 * @property {(data: Partial<R>, where: Where<R>) => ChangeResult} update Updates matching rows.
 * @property {(amounts: Partial<Record<keyof R & string, number>>, where: Where<R>) => ChangeResult} increment Adds to number columns.
 * @property {(data: Partial<R>, conflict: string[]) => InsertResult} upsert Inserts, or updates on conflict.
 * @property {(where: Where<R>) => ChangeResult} delete Deletes matching rows.
 * @property {(where?: Where<R>) => number} count Counts matching rows.
 * @property {(where?: Where<R>) => boolean} exists Does any row match?
 * @property {() => { ok: true }} clear Deletes every row.
 */

/**
 * Options for `insert()` and `insertMany()`.
 * @typedef {object} InsertOptions
 * @property {"ignore" | "replace"} [onConflict] What to do when a row clashes with an existing one: `"ignore"` skips it, `"replace"` deletes the old row first. By default, the insert fails.
 */

/**
 * Options for `paginate()`.
 * @typedef {object} PaginateOptions
 * @property {number} [page] Starts at 1, which is the default.
 * @property {number} [perPage] Defaults to `20`.
 * @property {string | Array<string | [string, SortDirection]>} [orderBy] Give one: without it, SQLite is free to return the rows in any order.
 * @property {SortDirection} [direction]
 * @property {string[]} [columns]
 */

/**
 * Options for `transaction()`.
 * @typedef {object} TransactionOptions
 * @property {boolean} [immediate] Take the write lock right away, instead of on the first write. Use it for read-then-write work when several processes share the database: they then wait for each other instead of failing with `SQLITE_BUSY`.
 */

/**
 * A prepared query and what's needed to turn its rows into objects.
 * @typedef {{ stmt: import("node:sqlite").StatementSync, names: string[] | undefined, kinds: Uint8Array | undefined, table: string | undefined }} _Reader
 */

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PATH_PART = /^(?:[A-Za-z_][A-Za-z0-9_]*|\d+)$/;
const CURRENT = /^CURRENT_(?:TIMESTAMP|DATE|TIME)$/i;
const EXISTS = (/** @type {string} */ types) =>
  `SELECT 1 FROM (SELECT name, type FROM sqlite_master UNION ALL SELECT name, type FROM sqlite_temp_master) WHERE type IN (${types}) AND name = ?`;
const TABLE_EXISTS = EXISTS("'table'");
const SOURCE_EXISTS = EXISTS("'table', 'view'");
// how a column is converted when read
const JSON_KIND = 1;
const BOOLEAN_KIND = 2;
const DATE_KIND = 3;
const OPERATORS = new Set(["eq", "ne", "gt", "gte", "lt", "lte", "in", "notIn", "like", "notLike", "glob", "between", "isNull"]);
const COMPARATORS = /** @type {Record<string, string>} */ ({ gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", notLike: "NOT LIKE", glob: "GLOB" });
const ACTIONS = ["CASCADE", "SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION"];
const SQLITE_CODES = /** @type {Record<number, string>} */ ({
  1: "SQLITE_ERROR", 5: "SQLITE_BUSY", 6: "SQLITE_LOCKED", 8: "SQLITE_READONLY", 11: "SQLITE_CORRUPT", 13: "SQLITE_FULL",
  14: "SQLITE_CANTOPEN", 19: "SQLITE_CONSTRAINT", 20: "SQLITE_MISMATCH", 275: "SQLITE_CONSTRAINT_CHECK",
  787: "SQLITE_CONSTRAINT_FOREIGNKEY", 1299: "SQLITE_CONSTRAINT_NOTNULL", 1555: "SQLITE_CONSTRAINT_PRIMARYKEY",
  2067: "SQLITE_CONSTRAINT_UNIQUE",
});

/** @type {Array<[RegExp, string]>} */
const MESSAGE_CODES = [
  [/UNIQUE constraint failed/i, "SQLITE_CONSTRAINT_UNIQUE"],
  [/NOT NULL constraint failed/i, "SQLITE_CONSTRAINT_NOTNULL"],
  [/CHECK constraint failed/i, "SQLITE_CONSTRAINT_CHECK"],
  [/FOREIGN KEY constraint failed/i, "SQLITE_CONSTRAINT_FOREIGNKEY"],
  [/PRIMARY KEY/i, "SQLITE_CONSTRAINT_PRIMARYKEY"],
  [/readonly database/i, "SQLITE_READONLY"],
  [/database is locked/i, "SQLITE_BUSY"],
];

/** @type {typeof import("node:sqlite").DatabaseSync | undefined} */
let _DatabaseSync;

/**
 * Loads `node:sqlite` on first use, hiding its "experimental" warning.
 * @returns {typeof import("node:sqlite").DatabaseSync}
 */
const _engine = () => {
  if (_DatabaseSync) return _DatabaseSync;
  const original = process.emitWarning;
  process.emitWarning = /** @type {any} */ (function(/** @type {any} */ warning, /** @type {any[]} */ ...args) {
    const text = typeof warning === "string" ? warning : warning?.message ?? "";
    if (/sqlite/i.test(text)) return;
    return /** @type {Function} */ (original).call(process, warning, ...args);
  });
  try {
    _DatabaseSync = require("node:sqlite").DatabaseSync;
  } catch (error) {
    throw new SQLiteError(`node:sqlite is not available in Node.js ${process.version}: nc.SQLite requires Node.js 22.13 or newer`, { cause: error });
  } finally {
    process.emitWarning = original;
  }
  return _DatabaseSync;
};

/**
 * Checks and quotes a table or column name.
 * @param {unknown} name
 * @param {string} [kind="identifier"]
 * @returns {string}
 */
const _id = (name, kind = "identifier") => {
  if (typeof name !== "string" || !IDENTIFIER.test(name)) throw new SQLiteError(`Invalid ${kind}: "${String(name)}" (letters, digits and _ only, not starting with a digit)`);
  return `"${name}"`;
};

/**
 * @param {unknown} value
 * @returns {null | number | bigint | string | Uint8Array}
 */
const _toSQL = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return JSON.stringify(value);
};

/**
 * A SQL literal, for DEFAULT and CHECK where parameters can't be used.
 * @param {unknown} value
 * @returns {string}
 */
const _literal = (value) => {
  const v = _toSQL(value);
  if (v === null) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
  return `X'${Buffer.from(v).toString("hex")}'`;
};

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const _isPlain = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer);

/**
 * @param {unknown} error
 * @param {string} [sql]
 * @returns {SQLiteError}
 */
const _wrap = (error, sql) => {
  if (error instanceof SQLiteError) return error;
  /** @type {any} */
  const native = error;
  const errcode = typeof native?.errcode === "number" ? native.errcode : undefined;
  const message = String(native?.message ?? error);
  // older Node.js versions do not expose `errcode`: deduce the common codes from the message
  const fromMessage = MESSAGE_CODES.find(([pattern]) => pattern.test(message))?.[1];
  const sqliteCode = errcode === undefined ? fromMessage : SQLITE_CODES[errcode] ?? SQLITE_CODES[errcode & 0xff] ?? fromMessage;
  return new SQLiteError(sql ? `${message}\n  in: ${sql.replace(/\s+/g, " ").trim()}` : message, { sql, sqliteCode, cause: error });
};

/**
 * How a column of this declared type is converted when read, or 0.
 * @param {string} type Upper case.
 * @param {{ json: boolean, booleans: boolean, dates: boolean }} read
 * @returns {number}
 */
const _kindOf = (type, read) => {
  if (type === "JSON") return read.json ? JSON_KIND : 0;
  if (type === "BOOLEAN" || type === "BOOL") return read.booleans ? BOOLEAN_KIND : 0;
  return read.dates && (type === "DATE" || type === "DATETIME" || type === "TIMESTAMP") ? DATE_KIND : 0;
};

/**
 * @param {number} kind
 * @param {unknown} value Not `null`.
 * @returns {unknown}
 */
const _convert = (kind, value) => {
  if (kind === JSON_KIND) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      // not valid JSON: keep the text
      return value;
    }
  }
  if (kind === BOOLEAN_KIND) return typeof value === "number" || typeof value === "bigint" ? Number(value) !== 0 : value;
  if (typeof value !== "string" && typeof value !== "number") return value;
  // SQLite writes its own dates (CURRENT_TIMESTAMP, datetime('now')) in UTC and
  // without saying so; read as they are, JavaScript would take them for local time.
  const date = new Date(typeof value === "string" && SQLITE_DATETIME.test(value) ? `${value.replace(" ", "T")}Z` : value);
  return Number.isNaN(date.getTime()) ? value : date;
};

const SQLITE_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/** @type {Map<string, string>} */
const _columns = new Map();

/**
 * A column in a filter or a sort: a name, or a path into a JSON column
 * like `settings.theme`.
 * @param {string} key
 * @returns {string}
 */
const _column = (key) => {
  const known = _columns.get(key);
  if (known) return known;
  let sql;
  if (typeof key === "string" && key.includes(".")) {
    const [name, ...path] = key.split(".");
    if (!path.every((part) => PATH_PART.test(part))) throw new SQLiteError(`Invalid JSON path "${key}" (letters, digits and _ only between the dots)`);
    sql = `json_extract(${_id(name, "column name")}, '$${path.map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join("")}')`;
  } else {
    sql = _id(key, "column name");
  }
  if (_columns.size >= 1000) _columns.clear();
  _columns.set(key, sql);
  return sql;
};

/** @param {InsertOptions | undefined} options */
const _insertVerb = (options) => {
  const mode = options?.onConflict;
  if (mode === undefined) return "INSERT";
  if (mode !== "ignore" && mode !== "replace") throw new SQLiteError(`Invalid onConflict "${String(mode)}" (use "ignore" or "replace")`);
  return mode === "ignore" ? "INSERT OR IGNORE" : "INSERT OR REPLACE";
};

/**
 * Removes quoted strings and names, to look for `;` safely.
 * @param {string} sql
 * @returns {string}
 */
const _stripQuoted = (sql) => sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"/g, "");

/**
 * A SQLite database connection.
 *
 * @template [R=Record<string, any>] The row type read methods return by default. Each call can override it.
 */
class SQLite {
  /** @type {import("node:sqlite").DatabaseSync} */
  #db;
  /** @type {Map<string, import("node:sqlite").StatementSync>} */
  #statements = new Map();
  /** @type {Map<string, _Reader>} */
  #readers = new Map();
  // Tables and views known to exist, so that each call doesn't ask SQLite again.
  /** @type {Set<string>} */
  #known = new Set();
  /** @type {Map<string, Map<string, number>>} */
  #columnKinds = new Map();
  /** @type {Map<string, string | undefined>} */
  #sources = new Map();
  /** @type {{ json: boolean, booleans: boolean, dates: boolean }} */
  #read;
  #depth = 0;
  #open = true;
  /** @type {string} */
  #path;

  /**
   * Opens a database, creating the file and its folders if needed. Use
   * `":memory:"` for a throwaway in-memory database.
   *
   * @example
   * const db = new nc.SQLite();                                  // ./db.sqlite
   * const app = new nc.SQLite("data/app.sqlite", { dates: true });
   * const mem = new nc.SQLite(":memory:");
   *
   * @param {string} [path="db.sqlite"] Relative to the working directory.
   * @param {SQLiteOptions} [options]
   * @throws {SQLiteError} If the file can't be opened.
   */
  constructor(path = "db.sqlite", options = {}) {
    const DatabaseSync = _engine();
    const memory = path === ":memory:" || path === "";
    const target = memory ? ":memory:" : nodePath.resolve(process.cwd(), path);
    if (!memory && !options.readOnly) fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    try {
      this.#db = new DatabaseSync(target, { readOnly: options.readOnly ?? false });
      this.#db.exec(`PRAGMA busy_timeout = ${Math.max(0, Math.floor(toMs(options.busyTimeout ?? 5000, "busyTimeout")) || 0)}`);
      if (!memory && !options.readOnly && (options.wal ?? true)) this.#db.exec("PRAGMA journal_mode = WAL");
      if (options.synchronous !== undefined) {
        const level = String(options.synchronous).toUpperCase();
        if (!["OFF", "NORMAL", "FULL", "EXTRA"].includes(level)) throw new SQLiteError(`Invalid synchronous "${options.synchronous}" (use "OFF", "NORMAL", "FULL" or "EXTRA")`);
        this.#db.exec(`PRAGMA synchronous = ${level}`);
      }
      this.#db.exec(`PRAGMA foreign_keys = ${options.foreignKeys === false ? "OFF" : "ON"}`);
    } catch (error) {
      throw _wrap(error);
    }
    this.#path = target;
    this.#read = { json: options.json ?? true, booleans: options.booleans ?? true, dates: options.dates ?? false };
  }

  /**
   * A prepared statement, kept for the next call.
   * @param {string} sql
   * @returns {import("node:sqlite").StatementSync}
   */
  #prepare(sql) {
    let stmt = this.#statements.get(sql);
    if (stmt) return stmt;
    try {
      stmt = this.#db.prepare(sql);
    } catch (error) {
      throw _wrap(error, sql);
    }
    if (this.#statements.size >= 500) this.#statements.delete(/** @type {string} */ (this.#statements.keys().next().value));
    this.#statements.set(sql, stmt);
    return stmt;
  }

  /**
   * A prepared query. Where Node allows it, rows are fetched as arrays and
   * turned into objects here: it's faster than copying the objects Node
   * returns, and Node says which column each value comes from.
   * @param {string} sql
   * @param {boolean} [keep=true] `false` for a statement used once, like an iteration.
   * @returns {_Reader}
   */
  #reader(sql, keep = true) {
    let reader = keep ? this.#readers.get(sql) : undefined;
    if (reader) return reader;
    let stmt;
    try {
      stmt = this.#db.prepare(sql);
    } catch (error) {
      throw _wrap(error, sql);
    }
    reader = { stmt, names: undefined, kinds: undefined, table: undefined };
    const modern = /** @type {any} */ (stmt);
    if (typeof modern.setReturnArrays === "function" && typeof modern.columns === "function") {
      modern.setReturnArrays(true);
      this.#describe(reader);
    } else {
      reader.table = this.#sourceTable(sql);
    }
    if (keep) {
      if (this.#readers.size >= 500) this.#readers.delete(/** @type {string} */ (this.#readers.keys().next().value));
      this.#readers.set(sql, reader);
    }
    return reader;
  }

  /**
   * Reads the column names of a query, and how to convert each one.
   * @param {_Reader} reader
   */
  #describe(reader) {
    /** @type {Array<{ name: string, type: string | null }>} */
    const columns = /** @type {any} */ (reader.stmt).columns();
    reader.names = columns.map((column) => column.name);
    reader.kinds = undefined;
    for (let i = 0; i < columns.length; i++) {
      const type = columns[i].type;
      const kind = type ? _kindOf(String(type).toUpperCase(), this.#read) : 0;
      if (kind) (reader.kinds ??= new Uint8Array(columns.length))[i] = kind;
    }
  }

  /**
   * @param {_Reader} reader
   * @param {any} raw What the statement returned for one row.
   * @returns {any}
   */
  #row(reader, raw) {
    /** @type {Record<string, unknown>} */
    const row = {};
    if (reader.names === undefined) {
      // Node before 22.16: a row is an object without a prototype, copied into a plain one.
      for (const key in raw) row[key] = raw[key];
      if (reader.table === undefined) return row;
      for (const [key, kind] of this.#kinds(reader.table)) {
        const value = row[key];
        if (value !== null && value !== undefined) row[key] = _convert(kind, value);
      }
      return row;
    }
    // A statement prepared before the table changed can come back with other columns.
    if (raw.length !== reader.names.length) this.#describe(reader);
    const names = reader.names;
    const kinds = reader.kinds;
    if (kinds === undefined) {
      for (let i = 0; i < names.length; i++) row[names[i]] = raw[i];
      return row;
    }
    for (let i = 0; i < names.length; i++) {
      const value = raw[i];
      row[names[i]] = kinds[i] === 0 || value === null ? value : _convert(kinds[i], value);
    }
    return row;
  }

  /**
   * @param {string} sql
   * @param {any[]} params
   * @returns {any}
   */
  #one(sql, params) {
    const reader = this.#reader(sql);
    try {
      const raw = reader.stmt.get(...params);
      return raw === undefined ? undefined : this.#row(reader, raw);
    } catch (error) {
      throw _wrap(error, sql);
    }
  }

  /**
   * @param {string} sql
   * @param {any[]} params
   * @returns {any[]}
   */
  #all(sql, params) {
    const reader = this.#reader(sql);
    try {
      const rows = reader.stmt.all(...params);
      for (let i = 0; i < rows.length; i++) rows[i] = this.#row(reader, rows[i]);
      return rows;
    } catch (error) {
      throw _wrap(error, sql);
    }
  }

  /**
   * @param {unknown} params
   * @returns {any[]}
   */
  #params(params) {
    if (params === undefined) return [];
    if (Array.isArray(params)) return params.map(_toSQL);
    if (_isPlain(params)) return [Object.fromEntries(Object.entries(params).map(([k, v]) => [k, _toSQL(v)]))];
    return [_toSQL(params)];
  }

  /**
   * Forgets what was learned about the schema, after it changed.
   * @returns {void}
   */
  #invalidate() {
    this.#columnKinds.clear();
    this.#statements.clear();
    this.#readers.clear();
    this.#known.clear();
    this.#sources.clear();
  }

  /**
   * The columns of a table that are converted when read. Only used on Node
   * versions that don't describe the columns of a query.
   * @param {string} table
   * @returns {Map<string, number>}
   */
  #kinds(table) {
    let kinds = this.#columnKinds.get(table);
    if (!kinds) {
      kinds = new Map();
      for (const col of /** @type {Array<{ name: string, type: string }>} */ (/** @type {unknown} */ (this.#prepare(`PRAGMA table_info(${_id(table, "table name")})`).all()))) {
        const kind = _kindOf(String(col.type).toUpperCase(), this.#read);
        if (kind) kinds.set(col.name, kind);
      }
      this.#columnKinds.set(table, kinds);
    }
    return kinds;
  }

  /**
   * @param {Where<any> | undefined} where
   * @returns {{ sql: string, params: any[] }}
   */
  #where(where) {
    if (!where || !Object.keys(where).length) return { sql: "", params: [] };
    /** @type {any[]} */
    const params = [];
    /**
     * @param {Where<any>} filter
     * @returns {string}
     */
    const build = (filter) => {
      if (!_isPlain(filter)) throw new SQLiteError("A where filter must be a plain object");
      /** @type {string[]} */
      const parts = [];
      for (const [key, value] of Object.entries(filter)) {
        if (value === undefined) continue;
        if (key === "$or" || key === "$and") {
          if (!Array.isArray(value)) throw new SQLiteError(`"${key}" expects an array of filters`);
          const subs = value.map((sub) => build(sub) || "1");
          parts.push(subs.length ? `(${subs.map((s) => `(${s})`).join(key === "$or" ? " OR " : " AND ")})` : key === "$or" ? "0" : "1");
          continue;
        }
        const col = _column(key);
        if (value === null) parts.push(`${col} IS NULL`);
        else if (Array.isArray(value)) parts.push(this.#op(col, "in", value, params));
        else if (_isPlain(value) && Object.keys(value).some((k) => OPERATORS.has(k))) {
          // unknown keys next to operators are typos: #op() reports them
          for (const [op, operand] of Object.entries(value)) if (operand !== undefined) parts.push(this.#op(col, op, operand, params));
        } else {
          // other objects and arrays compare as JSON text
          parts.push(`${col} = ?`);
          params.push(_toSQL(value));
        }
      }
      return parts.join(" AND ");
    };
    const sql = build(where);
    return { sql: sql ? ` WHERE ${sql}` : "", params };
  }

  /**
   * @param {string} col
   * @param {string} op
   * @param {unknown} operand
   * @param {any[]} params
   * @returns {string}
   */
  #op(col, op, operand, params) {
    switch (op) {
      case "eq":
        if (operand === null) return `${col} IS NULL`;
        params.push(_toSQL(operand));
        return `${col} = ?`;
      case "ne":
        if (operand === null) return `${col} IS NOT NULL`;
        params.push(_toSQL(operand));
        return `${col} IS NOT ?`;
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "like":
      case "notLike":
      case "glob":
        params.push(_toSQL(operand));
        return `${col} ${COMPARATORS[op]} ?`;
      case "in":
      case "notIn": {
        if (!Array.isArray(operand)) throw new SQLiteError(`"${op}" expects an array`);
        if (!operand.length) return op === "in" ? "0" : "1";
        params.push(...operand.map(_toSQL));
        return `${col} ${op === "in" ? "IN" : "NOT IN"} (${operand.map(() => "?").join(", ")})`;
      }
      case "between": {
        if (!Array.isArray(operand) || operand.length !== 2) throw new SQLiteError('"between" expects [min, max]');
        params.push(_toSQL(operand[0]), _toSQL(operand[1]));
        return `${col} BETWEEN ? AND ?`;
      }
      case "isNull":
        return `${col} ${operand ? "IS NULL" : "IS NOT NULL"}`;
      default:
        throw new SQLiteError(`Unknown where operator "${op}"`);
    }
  }

  /**
   * @param {QueryOptions} options
   * @returns {string}
   */
  #orderBy(options) {
    if (!options.orderBy || (Array.isArray(options.orderBy) && !options.orderBy.length)) return "";
    /** @param {unknown} direction */
    const dir = (direction) => {
      const upper = String(direction ?? "ASC").toUpperCase();
      if (upper !== "ASC" && upper !== "DESC") throw new SQLiteError(`Invalid sort direction "${String(direction)}" (use "ASC" or "DESC")`);
      return upper;
    };
    if (!Array.isArray(options.orderBy)) return ` ORDER BY ${_column(options.orderBy)} ${dir(options.direction)}`;
    return ` ORDER BY ${options.orderBy.map((item) => (Array.isArray(item) ? `${_column(item[0])} ${dir(item[1])}` : `${_column(item)} ASC`)).join(", ")}`;
  }

  /**
   * Quoted columns and converted values. `undefined` values are skipped.
   * @param {unknown} data
   * @returns {[string[], any[]]}
   */
  #values(data) {
    if (!_isPlain(data)) throw new SQLiteError("Row data must be a plain object");
    const entries = Object.entries(data).filter(([, v]) => v !== undefined);
    return [entries.map(([k]) => _id(k, "column name")), entries.map(([, v]) => _toSQL(v))];
  }

  /**
   * @param {string} table
   * @returns {string}
   */
  #table(table) {
    const quoted = _id(table, "table name");
    if (!this.#known.has(table)) {
      if (this.#prepare(SOURCE_EXISTS).get(table) === undefined) throw new SQLiteError(`Table "${table}" does not exist`);
      this.#known.add(table);
    }
    return quoted;
  }

  /**
   * @param {string} sql
   * @param {any[]} params
   * @returns {InsertResult}
   */
  #run(sql, params) {
    const stmt = this.#prepare(sql);
    try {
      const result = stmt.run(...params);
      return { ok: true, changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
    } catch (error) {
      throw _wrap(error, sql);
    }
  }

  /**
   * The table a simple `SELECT` reads from, for type conversions.
   * @param {string} sql
   * @returns {string | undefined}
   */
  #sourceTable(sql) {
    if (this.#sources.has(sql)) return this.#sources.get(sql);
    /** @type {string | undefined} */
    let table;
    if (!/\bjoin\b/i.test(sql)) {
      const match = /^\s*select\b[\s\S]*?\bfrom\s+"?([A-Za-z_][A-Za-z0-9_]*)"?(?:\s+(?:as\s+)?(?!where\b|order\b|limit\b|group\b)[A-Za-z_]\w*)?\s*(?:where\b|order\b|limit\b|group\b|;|$)/i.exec(sql);
      // A view has column types too: SQLite takes them from the tables it reads.
      if (match && (this.#known.has(match[1]) || this.#prepare(SOURCE_EXISTS).get(match[1]) !== undefined)) table = match[1];
    }
    if (this.#sources.size >= 500) this.#sources.clear();
    this.#sources.set(sql, table);
    return table;
  }

  /**
   * Runs SQL that doesn't return rows. Without parameters, you can pass
   * several statements at once.
   *
   * @example
   * db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]);
   * db.exec("DELETE FROM sessions WHERE user_id = $id", { $id: 42 });
   * db.exec(`
   *   CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT UNIQUE);
   *   CREATE INDEX idx_tags_label ON tags (label);
   * `);
   *
   * @param {string} sql
   * @param {unknown[] | Record<string, unknown> | string | number | bigint | boolean | Date | null} [params] An array, named parameters like `{ $id: 1 }`, or a single value.
   * @returns {{ changes: number, lastInsertRowid: number | bigint }}
   * @throws {SQLiteError}
   */
  exec(sql, params) {
    const ddl = /^\s*(create|alter|drop)\b/i.test(sql);
    if (params === undefined && /;\s*\S/.test(_stripQuoted(sql))) {
      try {
        this.#db.exec(sql);
      } catch (error) {
        throw _wrap(error, sql);
      } finally {
        this.#invalidate();
      }
      return { changes: 0, lastInsertRowid: 0 };
    }
    const { changes, lastInsertRowid } = this.#run(sql, this.#params(params));
    if (ddl) this.#invalidate();
    return { changes, lastInsertRowid };
  }

  /**
   * Runs a query and returns the first row. JSON and boolean columns are
   * converted like in `get()`, joins and renamed columns included. On Node.js
   * before 22.16, that only works for a query on a single table.
   *
   * @example
   * const user = db.queryOne("SELECT * FROM users WHERE email = ?", [email]);
   *
   * @template [T=R]
   * @param {string} sql
   * @param {unknown[] | Record<string, unknown> | string | number | bigint | boolean | Date | null} [params]
   * @returns {T | undefined}
   * @throws {SQLiteError}
   */
  queryOne(sql, params) {
    return this.#one(sql, this.#params(params));
  }

  /**
   * Runs a query and returns every row.
   *
   * @example
   * const stats = db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
   *
   * @template [T=R]
   * @param {string} sql
   * @param {unknown[] | Record<string, unknown> | string | number | bigint | boolean | Date | null} [params]
   * @returns {T[]}
   * @throws {SQLiteError}
   */
  queryAll(sql, params) {
    return this.#all(sql, this.#params(params));
  }

  /**
   * Goes through the rows of a query one at a time, without loading them all.
   * For big exports.
   *
   * @example
   * for (const row of db.iterate("SELECT * FROM events WHERE day = ?", [day])) {
   *   stream.write(JSON.stringify(row) + "\n");
   * }
   *
   * @template [T=R]
   * @param {string} sql
   * @param {unknown[] | Record<string, unknown> | string | number | bigint | boolean | Date | null} [params]
   * @returns {Generator<T, void, undefined>}
   * @throws {SQLiteError}
   */
  *iterate(sql, params) {
    // Not kept: a statement being walked through can't serve another call at the same time.
    const reader = this.#reader(sql, false);
    for (const raw of reader.stmt.iterate(...this.#params(params))) yield this.#row(reader, raw);
  }

  /**
   * Creates a table with its constraints and indexes, unless it already
   * exists. To change an existing table, use `migrate()`.
   *
   * @example
   * db.createTable({
   *   name: "posts",
   *   columns: {
   *     id: { type: "INTEGER", primaryKey: true, autoincrement: true },
   *     user_id: { type: "INTEGER", notNull: true, references: { table: "users", column: "id" }, onDelete: "CASCADE" },
   *     status: { type: "TEXT", values: ["draft", "published"], defaultValue: "draft" },
   *     tags: { type: "JSON", defaultValue: [] },
   *   },
   *   indexes: [{ columns: ["user_id", "status"] }],
   * });
   *
   * @param {TableDefinition} table
   * @returns {{ ok: true }}
   * @throws {SQLiteError} If the definition is invalid.
   */
  createTable(table) {
    const columns = table?.columns ?? table?.options;
    const name = _id(table?.name, "table name");
    if (!_isPlain(columns) || !Object.keys(columns).length) throw new SQLiteError(`Table "${table.name}" needs at least one column in "columns"`);
    const defs = Object.entries(columns).map(([column, def]) => {
      const col = _id(column, "column name");
      if (!def || typeof def.type !== "string") throw new SQLiteError(`Missing "type" for column "${column}"`);
      if (!/^[A-Za-z][A-Za-z0-9_ ]*(\(\s*\d+\s*(,\s*\d+\s*)?\))?$/.test(def.type)) throw new SQLiteError(`Invalid type "${def.type}" for column "${column}"`);
      let sql = `${col} ${def.type}`;
      if (def.primaryKey) sql += ` PRIMARY KEY${def.autoincrement ? " AUTOINCREMENT" : ""}`;
      if (def.notNull) sql += " NOT NULL";
      if (def.unique) sql += " UNIQUE";
      if (def.defaultExpression !== undefined) sql += ` DEFAULT (${def.defaultExpression})`;
      else if (def.defaultValue !== undefined) {
        // Written bare, these are the clock of the insert. Quoted, they would be plain text.
        sql += ` DEFAULT ${typeof def.defaultValue === "string" && CURRENT.test(def.defaultValue) ? def.defaultValue.toUpperCase() : _literal(def.defaultValue)}`;
      }
      if (def.values?.length) sql += ` CHECK (${col} IN (${def.values.map(_literal).join(", ")}))`;
      if (def.check) sql += ` CHECK (${def.check})`;
      if (def.references) {
        sql += ` REFERENCES ${_id(def.references.table, "referenced table")} (${_id(def.references.column, "referenced column")})`;
        if (def.onDelete) sql += ` ON DELETE ${this.#action(def.onDelete)}`;
        if (def.onUpdate) sql += ` ON UPDATE ${this.#action(def.onUpdate)}`;
      }
      return sql;
    });
    for (const constraint of table.constraints ?? []) defs.push(this.#constraint(constraint));
    this.exec(`CREATE TABLE IF NOT EXISTS ${name} (${defs.join(", ")})`);
    for (const index of table.indexes ?? []) this.createIndex(table.name, index);
    return { ok: true };
  }

  /**
   * @param {string} action
   * @returns {string}
   */
  #action(action) {
    const upper = String(action).toUpperCase();
    if (!ACTIONS.includes(upper)) throw new SQLiteError(`Invalid foreign key action "${action}" (expected one of ${ACTIONS.join(", ")})`);
    return upper;
  }

  /**
   * @param {TableConstraint} constraint
   * @returns {string}
   */
  #constraint(constraint) {
    /** @param {unknown} list */
    const cols = (list) => {
      if (!Array.isArray(list) || !list.length) throw new SQLiteError(`Constraint "${constraint.type}" requires a non-empty columns array`);
      return list.map((c) => _id(c, "column name")).join(", ");
    };
    switch (constraint?.type) {
      case "unique":
        return `UNIQUE (${cols(constraint.columns)})`;
      case "primaryKey":
        return `PRIMARY KEY (${cols(constraint.columns)})`;
      case "check":
        if (!constraint.expression) throw new SQLiteError("A check constraint requires an expression");
        return `CHECK (${constraint.expression})`;
      case "foreignKey": {
        let sql = `FOREIGN KEY (${cols(constraint.columns)}) REFERENCES ${_id(constraint.references?.table, "referenced table")} (${cols(constraint.references?.columns)})`;
        if (constraint.onDelete) sql += ` ON DELETE ${this.#action(constraint.onDelete)}`;
        if (constraint.onUpdate) sql += ` ON UPDATE ${this.#action(constraint.onUpdate)}`;
        return sql;
      }
      default:
        throw new SQLiteError(`Unsupported constraint type "${String(/** @type {any} */ (constraint)?.type)}"`);
    }
  }

  /**
   * Creates an index, unless it already exists.
   *
   * @example
   * db.createIndex("users", { columns: ["email"], unique: true });
   * db.createIndex("posts", { columns: ["slug"], unique: true, where: "deleted_at IS NULL" });
   *
   * @param {string} tableName
   * @param {IndexDefinition} index
   * @returns {{ ok: true }}
   * @throws {SQLiteError}
   */
  createIndex(tableName, index) {
    const table = this.#table(tableName);
    if (!Array.isArray(index?.columns) || !index.columns.length) throw new SQLiteError('An index requires a non-empty "columns" array');
    const name = index.name ?? `idx_${tableName}_${index.columns.join("_")}${index.unique ? "_unique" : ""}`;
    this.exec(`CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${_id(name, "index name")} ON ${table} (${index.columns.map((c) => _id(c, "column name")).join(", ")})${index.where ? ` WHERE ${index.where}` : ""}`);
    return { ok: true };
  }

  /**
   * Drops a table and everything in it.
   *
   * @param {string} tableName
   * @returns {{ ok: true }}
   * @throws {SQLiteError} If the table doesn't exist.
   */
  deleteTable(tableName) {
    this.exec(`DROP TABLE ${this.#table(tableName)}`);
    return { ok: true };
  }

  /**
   * Deletes every row, keeping the table.
   *
   * @param {string} tableName
   * @returns {{ ok: true }}
   * @throws {SQLiteError} If the table doesn't exist.
   */
  clearTable(tableName) {
    this.#run(`DELETE FROM ${this.#table(tableName)}`, []);
    return { ok: true };
  }

  /**
   * Does the table exist?
   *
   * @param {string} tableName
   * @returns {boolean}
   */
  hasTable(tableName) {
    if (typeof tableName !== "string" || !IDENTIFIER.test(tableName)) return false;
    return this.#prepare(TABLE_EXISTS).get(tableName) !== undefined;
  }

  /**
   * The tables in the database, sorted.
   *
   * @returns {string[]}
   */
  tables() {
    return this.#prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name").all().map((row) => String(row.name));
  }

  /**
   * The columns of a table.
   *
   * @example
   * db.columns("users");
   * // [{ name: "id", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: true }, ...]
   *
   * @param {string} tableName
   * @returns {ColumnInfo[]}
   * @throws {SQLiteError} If the table doesn't exist.
   */
  columns(tableName) {
    return this.#prepare(`PRAGMA table_info(${this.#table(tableName)})`).all().map((c) => ({
      name: String(c.name),
      type: String(c.type),
      notNull: c.notnull === 1,
      defaultValue: c.dflt_value,
      primaryKey: Number(c.pk) > 0,
    }));
  }

  /**
   * The first row that matches.
   *
   * @example
   * const user = db.get("users", { email: "ada@example.com" });
   * const latest = db.get("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC" });
   *
   * @template [T=R]
   * @param {string} tableName
   * @param {Where<R>} [where]
   * @param {Pick<QueryOptions, "columns" | "orderBy" | "direction">} [options]
   * @returns {T | undefined}
   * @throws {SQLiteError}
   */
  get(tableName, where = {}, options = {}) {
    const query = this.#select(tableName, where, options, true);
    return this.#one(query.sql, query.params);
  }

  /**
   * The rows that match, with sorting and pagination.
   *
   * @example
   * db.getAll("users");
   * db.getAll("users", { role: ["admin", "editor"], age: { gte: 18 } });
   * db.getAll("posts", { $or: [{ pinned: true }, { views: { gt: 1000 } }] }, {
   *   orderBy: [["views", "DESC"], "title"],
   *   limit: 20,
   *   offset: 40,
   * });
   *
   * @template [T=R]
   * @param {string} tableName
   * @param {Where<R>} [where]
   * @param {QueryOptions} [options]
   * @returns {T[]}
   * @throws {SQLiteError}
   */
  getAll(tableName, where = {}, options = {}) {
    const query = this.#select(tableName, where, options, false);
    return this.#all(query.sql, query.params);
  }

  /**
   * @param {string} tableName
   * @param {Where<any>} where
   * @param {QueryOptions} options
   * @param {boolean} single
   * @returns {{ sql: string, params: any[] }}
   */
  #select(tableName, where, options, single) {
    const table = this.#table(tableName);
    const columns = options.columns?.length ? options.columns.map((c) => _id(c, "column name")).join(", ") : "*";
    const clause = this.#where(where);
    let sql = `SELECT ${columns} FROM ${table}${clause.sql}${this.#orderBy(options)}`;
    if (single) {
      sql += " LIMIT 1";
    } else if (options.limit !== undefined || options.offset !== undefined) {
      sql += " LIMIT ? OFFSET ?";
      clause.params.push(options.limit === undefined ? -1 : Math.max(0, Math.floor(options.limit)), Math.max(0, Math.floor(options.offset ?? 0)));
    }
    return { sql, params: clause.params };
  }

  /**
   * One page of the rows that match, with what a pager needs to draw itself.
   *
   * @example
   * const { items, pages, hasNext } = db.paginate("posts", { status: "published" }, {
   *   page: 3,
   *   perPage: 20,
   *   orderBy: "created_at",
   *   direction: "DESC",
   * });
   *
   * @template [T=R]
   * @param {string} tableName
   * @param {Where<R>} [where]
   * @param {PaginateOptions} [options]
   * @returns {import("./Arr").Page<T>} A page past the end gives the last one.
   * @throws {SQLiteError}
   */
  paginate(tableName, where = {}, options = {}) {
    const perPage = Math.max(1, Math.floor(options.perPage ?? 20) || 20);
    const total = this.count(tableName, where);
    const pages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(1, Math.floor(options.page ?? 1) || 1), pages);
    const items = total ? this.getAll(tableName, where, { orderBy: options.orderBy, direction: options.direction, columns: options.columns, limit: perPage, offset: (page - 1) * perPage }) : [];
    return { items: /** @type {any[]} */ (items), page, perPage, total, pages, hasPrev: page > 1, hasNext: page < pages };
  }

  /**
   * Counts the rows that match.
   *
   * @example
   * db.count("users", { active: true });
   *
   * @param {string} tableName
   * @param {Where<R>} [where]
   * @returns {number}
   * @throws {SQLiteError}
   */
  count(tableName, where = {}) {
    const clause = this.#where(where);
    const sql = `SELECT COUNT(*) AS total FROM ${this.#table(tableName)}${clause.sql}`;
    const stmt = this.#prepare(sql);
    try {
      return Number(stmt.get(...clause.params)?.total ?? 0);
    } catch (error) {
      throw _wrap(error, sql);
    }
  }

  /**
   * Does any row match?
   *
   * @example
   * if (db.exists("users", { email })) throw new Error("Email already registered");
   *
   * @param {string} tableName
   * @param {Where<R>} [where]
   * @returns {boolean}
   * @throws {SQLiteError}
   */
  exists(tableName, where = {}) {
    const clause = this.#where(where);
    const sql = `SELECT 1 FROM ${this.#table(tableName)}${clause.sql} LIMIT 1`;
    const stmt = this.#prepare(sql);
    try {
      return stmt.get(...clause.params) !== undefined;
    } catch (error) {
      throw _wrap(error, sql);
    }
  }

  /**
   * Inserts a row. Objects and arrays are stored as JSON, booleans as 1 and
   * 0, dates as ISO strings. `undefined` values are skipped, so column
   * defaults apply.
   *
   * @example
   * const { lastInsertRowid } = db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
   * db.insert("tags", { label: "news" }, { onConflict: "ignore" }); // no error if it's already there
   *
   * @param {string} tableName
   * @param {Partial<R> & Record<string, unknown>} data
   * @param {InsertOptions} [options]
   * @returns {InsertResult}
   * @throws {SQLiteError} On a constraint failure; `sqliteCode` tells you which, like `"SQLITE_CONSTRAINT_UNIQUE"`.
   */
  insert(tableName, data, options) {
    const table = this.#table(tableName);
    const [cols, values] = this.#values(data);
    const verb = _insertVerb(options);
    return this.#run(cols.length ? `${verb} INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})` : `${verb} INTO ${table} DEFAULT VALUES`, values);
  }

  /**
   * Inserts many rows in one transaction: all or nothing, and much faster
   * than one by one.
   *
   * @example
   * db.insertMany("products", rowsFromCsv);
   * db.insertMany("tags", labels.map((label) => ({ label })), { onConflict: "ignore" });
   *
   * @param {string} tableName
   * @param {Iterable<Partial<R> & Record<string, unknown>>} rows
   * @param {InsertOptions} [options]
   * @returns {ChangeResult}
   * @throws {SQLiteError} If a row fails; nothing is inserted then.
   */
  insertMany(tableName, rows, options) {
    const table = this.#table(tableName);
    const verb = _insertVerb(options);
    return this.transaction(() => {
      let changes = 0;
      let shape = "";
      let sql = "";
      /** @type {import("node:sqlite").StatementSync | undefined} */
      let stmt;
      for (const row of rows) {
        if (!_isPlain(row)) throw new SQLiteError("Row data must be a plain object");
        const keys = [];
        const values = [];
        for (const key of Object.keys(row)) {
          const value = /** @type {Record<string, unknown>} */ (row)[key];
          if (value === undefined) continue;
          keys.push(key);
          values.push(_toSQL(value));
        }
        // Rows of one import nearly always have the same columns: the statement is prepared once for all of them.
        const current = keys.join(",");
        if (stmt === undefined || current !== shape) {
          shape = current;
          const cols = keys.map((key) => _id(key, "column name"));
          sql = cols.length ? `${verb} INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})` : `${verb} INTO ${table} DEFAULT VALUES`;
          stmt = this.#prepare(sql);
        }
        try {
          changes += Number(stmt.run(...values).changes);
        } catch (error) {
          throw _wrap(error, sql);
        }
      }
      return { ok: /** @type {const} */ (true), changes };
    });
  }

  /**
   * Updates the rows that match. The filter is required, so a forgotten
   * condition can't rewrite the whole table.
   *
   * @example
   * db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
   *
   * @param {string} tableName
   * @param {Partial<R> & Record<string, unknown>} data `undefined` values are skipped.
   * @param {Where<R>} where
   * @returns {ChangeResult}
   * @throws {SQLiteError}
   */
  update(tableName, data, where) {
    const table = this.#table(tableName);
    if (!_isPlain(where) || !Object.keys(where).length) throw new SQLiteError("update() requires a non-empty where filter");
    const [cols, values] = this.#values(data);
    if (!cols.length) throw new SQLiteError("update() requires at least one column to change");
    const clause = this.#where(where);
    const { changes } = this.#run(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(", ")}${clause.sql}`, [...values, ...clause.params]);
    return { ok: true, changes };
  }

  /**
   * Inserts a row, or updates it in place if it clashes with an existing one
   * on the `conflict` columns.
   *
   * @example
   * db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
   *
   * @param {string} tableName
   * @param {Partial<R> & Record<string, unknown>} data
   * @param {string[]} conflict The unique columns that identify the row.
   * @returns {InsertResult}
   * @throws {SQLiteError} If `conflict` doesn't match a unique constraint.
   */
  upsert(tableName, data, conflict) {
    const table = this.#table(tableName);
    const [cols, values] = this.#values(data);
    if (!cols.length) throw new SQLiteError("upsert() requires data");
    if (!Array.isArray(conflict) || !conflict.length) throw new SQLiteError("upsert() requires at least one conflict column");
    const targets = conflict.map((c) => _id(c, "column name"));
    const updates = cols.filter((c) => !targets.includes(c));
    const set = updates.length ? updates.map((c) => `${c} = excluded.${c}`).join(", ") : `${targets[0]} = ${targets[0]}`;
    return this.#run(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) ON CONFLICT (${targets.join(", ")}) DO UPDATE SET ${set}`, values);
  }

  /**
   * Updates the row matching `where` (or `{ id: data.id }`), or inserts it.
   * Kept from 1.x; `upsert()` does the same in one atomic statement.
   *
   * @param {string} tableName
   * @param {Partial<R> & Record<string, unknown>} data
   * @param {Where<R> | null} [where]
   * @returns {{ ok: true }}
   * @throws {SQLiteError}
   */
  set(tableName, data, where = null) {
    /** @type {Record<string, unknown>} */
    const record = data;
    const lookup = where ?? (record.id !== undefined && record.id !== null ? { id: record.id } : null);
    this.transaction(() => {
      if (lookup && this.exists(tableName, lookup)) this.update(tableName, data, lookup);
      else this.insert(tableName, data);
    });
    return { ok: true };
  }

  /**
   * Deletes the rows that match. The filter is required; `clearTable()`
   * deletes everything on purpose.
   *
   * @example
   * db.delete("sessions", { expires_at: { lt: new Date() } });
   *
   * @param {string} tableName
   * @param {Where<R>} where
   * @returns {ChangeResult}
   * @throws {SQLiteError}
   */
  delete(tableName, where) {
    const table = this.#table(tableName);
    if (!_isPlain(where) || !Object.keys(where).length) throw new SQLiteError("delete() requires a non-empty where filter (use clearTable() to delete every row)");
    const clause = this.#where(where);
    const { changes } = this.#run(`DELETE FROM ${table}${clause.sql}`, clause.params);
    return { ok: true, changes };
  }

  /**
   * Adds to number columns in one statement, so two requests at the same
   * moment both count. Reading the value, adding to it and writing it back
   * would lose one of them. Negative numbers subtract; an empty column
   * counts as 0.
   *
   * @example
   * db.increment("posts", { views: 1 }, { id: post.id });
   * db.increment("accounts", { balance: -25, withdrawals: 1 }, { id: account.id });
   *
   * @param {string} tableName
   * @param {Partial<Record<keyof R & string, number>> & Record<string, number>} amounts Column names and how much to add.
   * @param {Where<R>} where
   * @returns {ChangeResult}
   * @throws {SQLiteError}
   */
  increment(tableName, amounts, where) {
    const table = this.#table(tableName);
    if (!_isPlain(where) || !Object.keys(where).length) throw new SQLiteError("increment() requires a non-empty where filter");
    if (!_isPlain(amounts)) throw new SQLiteError("increment() expects an object of columns and amounts");
    const entries = Object.entries(amounts).filter(([, amount]) => amount !== undefined);
    if (!entries.length) throw new SQLiteError("increment() requires at least one column");
    const set = entries.map(([column, amount]) => {
      if (typeof amount !== "number" || !Number.isFinite(amount)) throw new SQLiteError(`increment() expects a number for "${column}", got ${String(amount)}`);
      const col = _id(column, "column name");
      return `${col} = COALESCE(${col}, 0) + ?`;
    });
    const clause = this.#where(where);
    const { changes } = this.#run(`UPDATE ${table} SET ${set.join(", ")}${clause.sql}`, [...entries.map(([, amount]) => amount), ...clause.params]);
    return { ok: true, changes };
  }

  /**
   * Shortcuts bound to one table, so you don't repeat its name.
   *
   * @example
   * const users = db.table("users"); // in TypeScript: db.table<User>("users")
   * users.insert({ email: "ada@example.com" });
   * users.count({ active: true });
   *
   * @template [T=R]
   * @param {string} tableName The table can be created later.
   * @returns {TableHandle<T>}
   */
  table(tableName) {
    _id(tableName, "table name");
    return {
      name: tableName,
      get: (where, options) => this.get(tableName, where, options),
      getAll: (where, options) => this.getAll(tableName, where, options),
      paginate: (where, options) => this.paginate(tableName, where, options),
      insert: (data, options) => this.insert(tableName, /** @type {any} */ (data), options),
      insertMany: (rows, options) => this.insertMany(tableName, /** @type {any} */ (rows), options),
      update: (data, where) => this.update(tableName, /** @type {any} */ (data), where),
      increment: (amounts, where) => this.increment(tableName, /** @type {any} */ (amounts), where),
      upsert: (data, conflict) => this.upsert(tableName, /** @type {any} */ (data), conflict),
      delete: (where) => this.delete(tableName, where),
      count: (where) => this.count(tableName, where),
      exists: (where) => this.exists(tableName, where),
      clear: () => this.clearTable(tableName),
    };
  }

  /**
   * Runs `callback` in a transaction: all its changes are saved together, or
   * none are if it throws. The error is then thrown again. Transactions can
   * nest; an inner failure can be caught without losing the outer work.
   *
   * @example
   * db.transaction(() => {
   *   db.increment("accounts", { balance: -amount }, { id: from.id });
   *   db.increment("accounts", { balance: amount }, { id: to.id });
   * });
   *
   * @template T
   * @param {() => T} callback Can be async; the commit then waits for it.
   * @param {TransactionOptions} [options]
   * @returns {T}
   * @throws Whatever `callback` threw, after rolling back.
   */
  transaction(callback, options) {
    const savepoint = this.#depth > 0 ? `nc_savepoint_${this.#depth}` : null;
    this.#db.exec(savepoint ? `SAVEPOINT ${savepoint}` : options?.immediate ? "BEGIN IMMEDIATE" : "BEGIN");
    this.#depth++;
    const commit = () => {
      this.#depth--;
      this.#db.exec(savepoint ? `RELEASE ${savepoint}` : "COMMIT");
    };
    const rollback = () => {
      this.#depth--;
      // A table created in there is gone again.
      this.#known.clear();
      try {
        this.#db.exec(savepoint ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK");
      } catch {
        // SQLite already rolled back (for example after a fatal error)
      }
    };
    let result;
    try {
      result = callback();
    } catch (error) {
      rollback();
      throw error;
    }
    if (result !== null && typeof result === "object" && typeof (/** @type {any} */ (result).then) === "function") {
      return /** @type {T} */ (/** @type {unknown} */ (Promise.resolve(result).then(
        (value) => {
          commit();
          return value;
        },
        (error) => {
          rollback();
          throw error;
        },
      )));
    }
    commit();
    return result;
  }

  /** Whether a transaction is open. */
  get inTransaction() {
    // `isTransaction` exists since Node 22.16
    const native = /** @type {{ isTransaction?: boolean }} */ (/** @type {unknown} */ (this.#db)).isTransaction;
    return typeof native === "boolean" ? native : this.#depth > 0;
  }

  /**
   * Applies migrations in order, each one once. The current version is kept
   * in the database, and each migration runs in its own transaction. Only
   * ever add migrations at the end of the list.
   *
   * @example
   * db.migrate([
   *   "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
   *   "ALTER TABLE users ADD COLUMN name TEXT",
   *   (db) => db.update("users", { name: "unknown" }, { name: null }),
   * ]);
   *
   * @param {Migration[]} migrations All of them, from the first.
   * @returns {{ from: number, to: number }} The version before and after.
   * @throws {SQLiteError} If a migration fails. It's rolled back; earlier ones stay.
   */
  migrate(migrations) {
    const from = this.version;
    for (let i = from; i < migrations.length; i++) {
      const migration = migrations[i];
      try {
        this.transaction(() => {
          if (typeof migration === "function") migration(this);
          else this.#db.exec(migration);
          this.#db.exec(`PRAGMA user_version = ${i + 1}`);
        });
      } catch (error) {
        throw new SQLiteError(`Migration ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error, sql: typeof migration === "string" ? migration : undefined });
      } finally {
        this.#invalidate();
      }
    }
    return { from, to: this.version };
  }

  /** The migration version, stored in `PRAGMA user_version`. */
  get version() {
    return Number(this.#prepare("PRAGMA user_version").get()?.user_version ?? 0);
  }

  /**
   * Copies the database to a new file. Safe while the app is running.
   *
   * @example
   * db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
   *
   * @param {string} path Must not exist yet.
   * @returns {string} The absolute path of the copy.
   * @throws {SQLiteError} If the file exists or can't be written.
   */
  backup(path) {
    const target = nodePath.resolve(process.cwd(), path);
    if (fs.existsSync(target)) throw new SQLiteError(`Backup destination already exists: ${target}`);
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    try {
      this.#db.prepare("VACUUM INTO ?").run(target);
    } catch (error) {
      throw _wrap(error, "VACUUM INTO ?");
    }
    return target;
  }

  /**
   * Compacts the database file to reclaim unused space.
   *
   * @returns {void}
   */
  vacuum() {
    this.exec("VACUUM");
  }

  /**
   * Makes a JavaScript function callable from SQL.
   *
   * @example
   * db.fn("slugify", (text) => nc.str.slugify(String(text)));
   * db.queryAll("SELECT slugify(title) AS slug FROM posts");
   *
   * @param {string} name
   * @param {(...args: any[]) => null | number | bigint | string | Uint8Array} implementation
   * @param {{ deterministic?: boolean, varargs?: boolean }} [options] `deterministic` (on by default) lets indexes use it; `varargs` accepts any number of arguments.
   * @returns {this}
   */
  fn(name, implementation, options = {}) {
    _id(name, "function name");
    this.#db.function(name, { deterministic: options.deterministic ?? true, varargs: options.varargs ?? false }, implementation);
    return this;
  }

  /** The absolute path of the database file, or `":memory:"`. */
  get path() {
    return this.#path;
  }

  /** Whether the connection is open. */
  get isOpen() {
    return this.#open;
  }

  /**
   * The underlying `node:sqlite` database, for anything not covered here.
   * @returns {import("node:sqlite").DatabaseSync}
   */
  get native() {
    return this.#db;
  }

  /**
   * Closes the connection. Calling it twice is fine.
   *
   * @returns {void}
   */
  close() {
    this.#statements.clear();
    this.#readers.clear();
    if (!this.#open) return;
    this.#open = false;
    this.#db.close();
  }

  /**
   * Closes the connection at the end of a `using` block.
   * @returns {void}
   */
  [Symbol.dispose]() {
    this.close();
  }
}

module.exports = SQLite;
