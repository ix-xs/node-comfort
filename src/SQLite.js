const fs = require("./FS");
const checker = require("./Checker");
const originalEmitWarning = process.emitWarning;

process.emitWarning = (warning, ...args) => {
  if (
    (warning &&
      warning.name === "ExperimentalWarning" &&
      warning.message.includes("SQLite")) ||
    (typeof warning === "string" &&
      warning.startsWith("SQLite is an experimental feature"))
  ) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

const { DatabaseSync } = require("node:sqlite");

/**
 * Lightweight SQLite wrapper around the built-in `node:sqlite` module.
 *
 * Features:
 * - Ensures the database file and its parent folder exist.
 * - Enables WAL journaling and foreign keys by default.
 * - Keeps an in-memory registry of table schemas ("models").
 * - Provides simple helpers for table creation and CRUD-like operations.
 *
 * @example
 * const { SQLite } = require("@ix-xs/node-comfort");
 * const db = new SQLite(); // ./db.sqlite
 *
 * await db.createTable({
 *   name: "users",
 *   options: {
 *     id:   { type: "INTEGER", primaryKey: true, autoincrement: true },
 *     name: { type: "TEXT", notNull: true },
 *     role: { type: "TEXT", values: ["admin", "user"], defaultValue: "user" },
 *   },
 * });
 *
 * await db.set("users", { name: "John" });
 * const user = await db.get("users", { name: "John" });
 */
module.exports = class SQLite {
  /** @type {DatabaseSync} */
  #$;
  /** @type {Map<string, { name: string, options: Record<string, any> }>} */
  #models = new Map();

  /**
   * Creates a new SQLite instance.
   *
   * By default, the database file is created at `./db.sqlite` relative
   * to the current working directory. You can pass a custom path if needed.
   *
   * @example
   * // Default path: "./db.sqlite"
   * const db = new SQLite();
   *
   * @example
   * // Custom path in a subfolder:
   * const db = new SQLite("data/myapp.sqlite");
   *
   * @param {string} [path] - Path to the SQLite database file.
   */
  constructor(path = fs.createPath("db.sqlite").replaceAll("\\", "/")) {
    if (path.includes("/")) {
      const parts = path.split("/");
      const file = parts[parts.length - 1];
      const folder = fs.createPath(path.slice(0, -file.length));
      fs.createFolder(folder);
    }

    this.#$ = new DatabaseSync(path);
    this.#exec("PRAGMA journal_mode = WAL");
    this.#exec("PRAGMA foreign_keys = ON");
  }

  /**
   * Executes a SQL statement with optional parameters using `run()`.
   * @private
   * @param {string} sql - SQL statement.
   * @param {any[]|any} [params=[]] - Parameters to bind to the statement.
   * @returns {{ changes: number, lastInsertRowid: bigint|number }} Run result metadata.
   */
  #exec(sql, params = []) {
    const stmt = this.#$.prepare(sql);
    const result = checker.isArray(params)
      ? stmt.run(...params)
      : stmt.run(params);

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  /**
   * Builds a CREATE TABLE statement from a model definition.
   *
   * Column names and table names are used as-is; you should avoid unsafe names.
   *
   * @private
   * @param {string} tableName
   * @param {Record<string, {
   *   type: "INTEGER"|"TEXT"|"REAL"|"BLOB"|"NUMERIC",
   *   primaryKey?: boolean,
   *   autoincrement?: boolean,
   *   notNull?: boolean,
   *   unique?: boolean,
   *   defaultValue?: any,
   *   values?: any[]
   * }>} options
   * @returns {string}
   */
  #buildCreateSQL(tableName, options) {
    const columns = Object.entries(options)
      .map(([col, def]) => {
        let colDef = `${col} ${def.type}`;

        if (def.primaryKey) {
          colDef += " PRIMARY KEY";
          if (def.autoincrement) colDef += " AUTOINCREMENT";
        }
        if (def.notNull) colDef += " NOT NULL";
        if (def.unique) colDef += " UNIQUE";
        if (def.defaultValue !== undefined) {
          colDef += ` DEFAULT ${this.#toSQLValue(def.defaultValue)}`;
        }
        if (def.values?.length) {
          colDef += ` CHECK(${col} IN (${def.values
            .map((v) => this.#toSQLValue(v))
            .join(", ")}))`;
        }

        return colDef;
      })
      .join(", ");

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
  }

  /**
   * Registers a model in memory and ensures the table exists.
   * @private
   * @param {string} tableName
   * @param {Record<string, any>} options
   */
  #defineModel(tableName, options) {
    if (this.#models.has(tableName)) return;

    const createSQL = this.#buildCreateSQL(tableName, options);
    this.#exec(createSQL);
    this.#models.set(tableName, { name: tableName, options });
  }

  /**
   * Builds a WHERE clause and parameters from an object.
   * Keys are used as column names; values are bound with `?` placeholders.
   * @private
   * @param {Record<string, any>} [where]
   * @returns {{ where: string, params: any[] }}
   */
  #buildWhere(where = {}) {
    if (!where || Object.keys(where).length === 0) {
      return { where: "", params: [] };
    }

    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(where)) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }

    return {
      where: `WHERE ${conditions.join(" AND ")}`,
      params,
    };
  }

  /**
   * Returns a default ORDER BY clause for a table.
   * Uses the first defined column in the model, or "id DESC" as fallback.
   * @private
   * @param {string} tableName
   * @returns {string}
   */
  #getOrderBy(tableName) {
    const model = this.#models.get(tableName);
    if (!model) return "id DESC";
    const firstCol = Object.keys(model.options)[0];
    return `${firstCol} DESC`;
  }

  /**
   * Converts a JS value to a SQL literal for DEFAULT / CHECK clauses.
   * @private
   * @param {any} value
   * @returns {string}
   */
  #toSQLValue(value) {
    if (value === null) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "bigint") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;

    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  /**
   * Creates (or ensures) a table exists for a given model definition.
   *
   * @example
   * await db.createTable({
   *   name: "sessions",
   *   options: {
   *     id:   { type: "TEXT", primaryKey: true },
   *     data: { type: "TEXT" },
   *   },
   * });
   *
   * @param {{ name: string, options: Record<string, {
   *   type: "INTEGER"|"TEXT"|"REAL"|"BLOB"|"NUMERIC",
   *   primaryKey?: boolean,
   *   autoincrement?: boolean,
   *   notNull?: boolean,
   *   unique?: boolean,
   *   defaultValue?: any,
   *   values?: any[]
   * }> }} table
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async createTable(table) {
    try {
      this.#defineModel(table.name, table.options);
      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Drops a table and removes its model definition.
   *
   * @param {string} tableName
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async deleteTable(tableName) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#exec(`DROP TABLE IF EXISTS ${tableName}`);
      this.#models.delete(tableName);
      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Deletes all rows from a table.
   *
   * @param {string} tableName
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async clearTable(tableName) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#exec(`DELETE FROM ${tableName}`);
      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Gets a single row matching a WHERE clause.
   *
   * Returns:
   * - `undefined` if no row matches,
   * - the row object if found,
   * - `{ error }` if a database error occurred.
   *
   * @param {string} tableName
   * @param {Record<string, any>} where
   * @returns {Promise<object|undefined|{ error: string }>}
   */
  async get(tableName, where) {
    try {
      if (!this.#models.has(tableName)) return undefined;

      const whereClause = this.#buildWhere(where);
      const sql = `SELECT * FROM ${tableName} ${whereClause.where} LIMIT 1`;
      const stmt = this.#$.prepare(sql);
      const record = stmt.get(...whereClause.params);

      return record || undefined;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Gets multiple rows matching a WHERE clause.
   *
   * Returns:
   * - an empty array if the table is not defined,
   * - an array of row objects,
   * - `{ error }` if a database error occurred.
   *
   * @param {string} tableName
   * @param {Record<string, any>} [where={}]
   * @param {number} [limit=50]
   * @param {number} [offset=0]
   * @returns {Promise<object[] | { error: string }>}
   */
  async getAll(tableName, where = {}, limit = 50, offset = 0) {
    try {
      if (!this.#models.has(tableName)) return [];

      const whereClause = this.#buildWhere(where);
      const sql = `SELECT * FROM ${tableName} ${whereClause.where} ORDER BY ${this.#getOrderBy(
        tableName,
      )} LIMIT ? OFFSET ?`;
      const stmt = this.#$.prepare(sql);
      const records = stmt.all(...whereClause.params, limit, offset);
      return records;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Inserts or replaces a row in a table.
   *
   * If `where` is provided (or `data.id` exists), it will first load the existing row and
   * merge it with `data`, then perform an `INSERT OR REPLACE`. This lets you do partial updates.
   *
   * @example
   * await db.set("users", { id: 1, name: "Jane" });
   *
   * @param {string} tableName
   * @param {Record<string, any>} data
   * @param {Record<string, any>|null} [where=null]
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async set(tableName, data, where = null) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      const lookup = where ?? (data.id ? { id: data.id } : null);
      let finalData = data;

      if (lookup) {
        const existing = await this.get(tableName, lookup);

        if (existing && !existing.error) {
          finalData = { ...existing, ...data };
        }
      }

      const columns = Object.keys(finalData);
      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(
        ", ",
      )}) VALUES (${placeholders})`;

      const stmt = this.#$.prepare(sql);
      stmt.run(...Object.values(finalData));

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Deletes rows matching a WHERE clause.
   *
   * @param {string} tableName
   * @param {Record<string, any>} where
   * @returns {Promise<{ ok: true, changes: number } | { error: string }>}
   */
  async delete(tableName, where) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      const whereClause = this.#buildWhere(where);
      const sql = `DELETE FROM ${tableName} ${whereClause.where}`;
      const stmt = this.#$.prepare(sql);
      const result = stmt.run(...whereClause.params);
      return { ok: true, changes: result.changes };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Counts rows matching a WHERE clause.
   *
   * Returns:
   * - the numeric count,
   * - or `{ error }` if a database error occurred.
   *
   * @param {string} tableName
   * @param {Record<string, any>} [where={}]
   * @returns {Promise<number | { error: string }>}
   */
  async count(tableName, where = {}) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      const whereClause = this.#buildWhere(where);
      const sql = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause.where}`;
      const stmt = this.#$.prepare(sql);
      const result = stmt.get(...whereClause.params);
      return result.total;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Closes the underlying SQLite connection (if the runtime supports it).
   *
   * @example
   * db.close();
   */
  close() {
    if (this.#$ && typeof this.#$.close === "function") {
      this.#$.close();
    }
  }
};