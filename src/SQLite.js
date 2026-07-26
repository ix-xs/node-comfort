const checker = require("./Checker");
const { resolve, dirname, isAbsolute } = require("node:path");
const { existsSync, mkdirSync } = require("node:fs");
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
 * A lightweight SQLite wrapper around Node.js built-in `node:sqlite` module.
 *
 * Goals:
 * - Keep the API small and easy to learn.
 * - Support common CRUD workflows.
 * - Expose raw SQL helpers when advanced control is needed.
 * - Support indexes, foreign keys, composite unique constraints, and transactions.
 *
 * Notes:
 * - Values are safely bound with `?` placeholders.
 * - Table names, column names, and index names cannot be parameterized in SQLite,
 *   so this class validates identifiers before interpolating them into SQL.
 * - WAL mode and foreign keys are enabled automatically.
 *
 * @example
 * const { SQLite } = require("@ix-xs/node-comfort");
 * const db = new SQLite("db/app.sqlite");
 *
 * await db.createTable({
 *   name: "User",
 *   columns: {
 *     id: { type: "INTEGER", primaryKey: true, autoincrement: true },
 *     email: { type: "TEXT", unique: true },
 *     createdAt: { type: "INTEGER", notNull: true }
 *   },
 *   indexes: [
 *     { columns: ["email"], unique: true }
 *   ]
 * });
 *
 * await db.insert("User", {
 *   email: "john@example.com",
 *   createdAt: Date.now()
 * });
 *
 * const user = await db.get("User", { email: "john@example.com" });
 */
module.exports = class SQLite {
  /** @type {DatabaseSync} */
  #$;

  /**
   * In-memory schema registry.
   * @type {Map<string, {
   *   name: string,
   *   columns: Record<string, any>,
   *   constraints?: any[],
   *   indexes?: any[]
   * }>}
   */
  #models = new Map();

  /**
   * Creates a new SQLite database connection.
   *
   * The database file and its parent folders are created if necessary.
   * WAL journal mode and foreign key support are enabled automatically.
   *
   * Pass `":memory:"` to create a transient in-memory database.
   *
   * @param {string} [path="db.sqlite"] - Path to the SQLite database file.
   *
   * @example
   * const db = new SQLite();
   *
   * @example
   * const db = new SQLite("data/my-app.sqlite");
   *
   * @example
   * const db = new SQLite(":memory:");
   */
  constructor(path = "db.sqlite") {
    let target = path;

    if (path !== ":memory:" && path !== "") {
      // Resolve to an absolute path so the folder we create and the file we
      // open are guaranteed to be the same location (relative to the cwd).
      target = isAbsolute(path) ? path : resolve(process.cwd(), path);
      const folder = dirname(target);
      if (folder && !existsSync(folder)) {
        mkdirSync(folder, { recursive: true });
      }
    }

    this.#$ = new DatabaseSync(target);
    this.#run("PRAGMA journal_mode = WAL");
    this.#run("PRAGMA foreign_keys = ON");
  }

  /**
   * Ensures a SQL identifier is safe to interpolate.
   *
   * SQLite does not allow binding table or column names as parameters,
   * so identifiers must be validated before being used in SQL strings.
   *
   * Allowed characters:
   * - letters
   * - digits
   * - underscore
   *
   * The first character must be a letter or underscore.
   *
   * @private
   * @param {string} name - Identifier to validate.
   * @param {string} [kind="identifier"] - Human-readable identifier type for error messages.
   * @returns {string}
   * @throws {Error} If the identifier is invalid.
   */
  #assertIdentifier(name, kind = "identifier") {
    if (typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid ${kind}: "${name}"`);
    }

    return name;
  }

  /**
   * Converts a JavaScript value into a SQL literal.
   *
   * This is only used for SQL fragments that cannot be parameter-bound,
   * such as `DEFAULT`, `CHECK`, or migration-time SQL generation.
   *
   * @private
   * @param {any} value - Value to convert.
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
   * Executes a SQL statement that modifies the database.
   *
   * This is the internal low-level helper used by mutation methods.
   *
   * @private
   * @param {string} sql - SQL statement.
   * @param {any[]|any} [params=[]] - Parameters to bind.
   * @returns {{ changes: number, lastInsertRowid: bigint|number }}
   */
  #run(sql, params = []) {
    const stmt = this.#$.prepare(sql);
    const result = checker.isArray(params) ? stmt.run(...params) : stmt.run(params);

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  /**
   * Builds a `WHERE` clause from a plain object.
   *
   * Example:
   * `{ id: 1, role: "admin" }`
   * becomes:
   * `WHERE id = ? AND role = ?`
   *
   * If the object is empty, an empty WHERE clause is returned.
   *
   * @private
   * @param {Record<string, any>} [where={}] - Conditions.
   * @returns {{ where: string, params: any[] }}
   */
  #buildWhere(where = {}) {
    if (!where || Object.keys(where).length === 0) {
      return { where: "", params: [] };
    }

    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(where)) {
      this.#assertIdentifier(key, "column name");

      if (value === null) {
        conditions.push(`${key} IS NULL`);
        continue;
      }

      conditions.push(`${key} = ?`);
      params.push(value);
    }

    return {
      where: `WHERE ${conditions.join(" AND ")}`,
      params,
    };
  }

  /**
   * Builds the SQL fragment for a column definition.
   *
   * Supported column properties:
   * - type
   * - primaryKey
   * - autoincrement
   * - notNull
   * - unique
   * - defaultValue
   * - values
   * - references
   * - onDelete
   * - onUpdate
   *
   * @private
   * @param {string} columnName - Column name.
   * @param {Record<string, any>} def - Column definition.
   * @returns {string}
   */
  #buildColumnSQL(columnName, def) {
    this.#assertIdentifier(columnName, "column name");

    if (!def?.type) {
      throw new Error(`Missing "type" for column "${columnName}"`);
    }

    let colDef = `${columnName} ${def.type}`;

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
      colDef += ` CHECK(${columnName} IN (${def.values
        .map((value) => this.#toSQLValue(value))
        .join(", ")}))`;
    }

    if (def.references) {
      this.#assertIdentifier(def.references.table, "referenced table");
      this.#assertIdentifier(def.references.column, "referenced column");

      colDef += ` REFERENCES ${def.references.table}(${def.references.column})`;

      if (def.onDelete) colDef += ` ON DELETE ${def.onDelete}`;
      if (def.onUpdate) colDef += ` ON UPDATE ${def.onUpdate}`;
    }

    return colDef;
  }

  /**
   * Builds a table-level constraint SQL fragment.
   *
   * Supported constraint formats:
   * - `{ type: "unique", columns: ["email", "provider"] }`
   * - `{ type: "primaryKey", columns: ["a", "b"] }`
   * - `{ type: "check", expression: "age >= 0" }`
   * - `{ type: "foreignKey", columns: ["userId"], references: { table: "User", columns: ["id"] }, onDelete: "CASCADE" }`
   *
   * @private
   * @param {Record<string, any>} constraint - Constraint definition.
   * @returns {string}
   */
  #buildConstraintSQL(constraint) {
    if (!constraint?.type) {
      throw new Error("Table constraint requires a \"type\" property");
    }

    if (constraint.type === "unique") {
      const columns = (constraint.columns || []).map((col) =>
        this.#assertIdentifier(col, "column name"),
      );
      if (!columns.length) throw new Error("UNIQUE constraint requires columns");
      return `UNIQUE (${columns.join(", ")})`;
    }

    if (constraint.type === "primaryKey") {
      const columns = (constraint.columns || []).map((col) =>
        this.#assertIdentifier(col, "column name"),
      );
      if (!columns.length) throw new Error("PRIMARY KEY constraint requires columns");
      return `PRIMARY KEY (${columns.join(", ")})`;
    }

    if (constraint.type === "check") {
      if (!constraint.expression || typeof constraint.expression !== "string") {
        throw new Error("CHECK constraint requires an expression");
      }
      return `CHECK (${constraint.expression})`;
    }

    if (constraint.type === "foreignKey") {
      const columns = (constraint.columns || []).map((col) =>
        this.#assertIdentifier(col, "column name"),
      );
      const refColumns = (constraint.references?.columns || []).map((col) =>
        this.#assertIdentifier(col, "referenced column"),
      );

      if (!columns.length) throw new Error("FOREIGN KEY constraint requires columns");
      if (!constraint.references?.table) {
        throw new Error("FOREIGN KEY constraint requires references.table");
      }
      if (!refColumns.length) {
        throw new Error("FOREIGN KEY constraint requires references.columns");
      }

      this.#assertIdentifier(constraint.references.table, "referenced table");

      let sql = `FOREIGN KEY (${columns.join(", ")}) REFERENCES ${constraint.references.table} (${refColumns.join(", ")})`;

      if (constraint.onDelete) sql += ` ON DELETE ${constraint.onDelete}`;
      if (constraint.onUpdate) sql += ` ON UPDATE ${constraint.onUpdate}`;

      return sql;
    }

    throw new Error(`Unsupported constraint type "${constraint.type}"`);
  }

  /**
   * Builds a complete `CREATE TABLE` statement.
   *
   * @private
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} columns - Column definitions.
   * @param {Record<string, any>[]} [constraints=[]] - Table-level constraints.
   * @returns {string}
   */
  #buildCreateSQL(tableName, columns, constraints = []) {
    this.#assertIdentifier(tableName, "table name");

    const columnDefs = Object.entries(columns).map(([columnName, def]) =>
      this.#buildColumnSQL(columnName, def),
    );

    const tableConstraints = constraints.map((constraint) =>
      this.#buildConstraintSQL(constraint),
    );

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${[
      ...columnDefs,
      ...tableConstraints,
    ].join(", ")})`;
  }

  /**
   * Returns the default `ORDER BY` clause for a table.
   *
   * The first declared column is used as default. If the model is unknown,
   * `"id DESC"` is used as a fallback.
   *
   * @private
   * @param {string} tableName - Table name.
   * @returns {string}
   */
  #getOrderBy(tableName) {
    const model = this.#models.get(tableName);
    if (!model) return "id DESC";

    const firstCol = Object.keys(model.columns)[0];
    return `${firstCol} DESC`;
  }

  /**
   * Registers a table model and creates the table if necessary.
   *
   * If the model already exists in memory, nothing is done.
   *
   * @private
   * @param {{
   *   name: string,
   *   columns: Record<string, any>,
   *   constraints?: Record<string, any>[],
   *   indexes?: Record<string, any>[]
   * }} table - Table definition.
   */
  #defineModel(table) {
    if (this.#models.has(table.name)) return;

    const createSQL = this.#buildCreateSQL(
      table.name,
      table.columns,
      table.constraints || [],
    );

    this.#run(createSQL);
    this.#models.set(table.name, {
      name: table.name,
      columns: table.columns,
      constraints: table.constraints || [],
      indexes: table.indexes || [],
    });

    for (const index of table.indexes || []) {
      this.createIndex(table.name, index);
    }
  }

  /**
   * Executes a raw SQL statement using `run()`.
   *
   * Use this for custom SQL that is not covered by the helper methods.
   * This method is intended for statements such as:
   * - `INSERT`
   * - `UPDATE`
   * - `DELETE`
   * - `CREATE INDEX`
   * - PRAGMA writes
   *
   * @param {string} sql - SQL statement.
   * @param {any[]|any} [params=[]] - Parameters to bind.
   * @returns {Promise<{ changes: number, lastInsertRowid: bigint|number } | { error: string }>}
   */
  async exec(sql, params = []) {
    try {
      return this.#run(sql, params);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Executes a raw SQL query and returns the first row.
   *
   * @param {string} sql - SQL query.
   * @param {any[]|any} [params=[]] - Parameters to bind.
   * @returns {Promise<object|undefined|{ error: string }>}
   */
  async queryOne(sql, params = []) {
    try {
      const stmt = this.#$.prepare(sql);
      const row = checker.isArray(params) ? stmt.get(...params) : stmt.get(params);
      return row || undefined;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Executes a raw SQL query and returns all rows.
   *
   * @param {string} sql - SQL query.
   * @param {any[]|any} [params=[]] - Parameters to bind.
   * @returns {Promise<object[]|{ error: string }>}
   */
  async queryAll(sql, params = []) {
    try {
      const stmt = this.#$.prepare(sql);
      return checker.isArray(params) ? stmt.all(...params) : stmt.all(params);
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Creates a table and stores its schema in memory.
   *
   * This method supports both the new `columns` property and the legacy
   * `options` property for backward compatibility.
   *
   * @param {{
   *   name: string,
   *   columns?: Record<string, {
   *     type: "INTEGER"|"TEXT"|"REAL"|"BLOB"|"NUMERIC",
   *     primaryKey?: boolean,
   *     autoincrement?: boolean,
   *     notNull?: boolean,
   *     unique?: boolean,
   *     defaultValue?: any,
   *     values?: any[],
   *     references?: { table: string, column: string },
   *     onDelete?: string,
   *     onUpdate?: string
   *   }>,
   *   options?: Record<string, any>,
   *   constraints?: Array<
   *     | { type: "unique", columns: string[] }
   *     | { type: "primaryKey", columns: string[] }
   *     | { type: "check", expression: string }
   *     | {
   *         type: "foreignKey",
   *         columns: string[],
   *         references: { table: string, columns: string[] },
   *         onDelete?: string,
   *         onUpdate?: string
   *       }
   *   >,
   *   indexes?: Array<{
   *     name?: string,
   *     columns: string[],
   *     unique?: boolean
   *   }>
   * }} table - Table definition.
   * @returns {Promise<{ ok: true } | { error: string }>}
   *
   * @example
   * await db.createTable({
   *   name: "Post",
   *   columns: {
   *     id: { type: "INTEGER", primaryKey: true, autoincrement: true },
   *     userId: {
   *       type: "INTEGER",
   *       notNull: true,
   *       references: { table: "User", column: "id" },
   *       onDelete: "CASCADE"
   *     },
   *     title: { type: "TEXT", notNull: true }
   *   },
   *   indexes: [{ columns: ["userId"] }]
   * });
   */
  async createTable(table) {
    try {
      const columns = table.columns || table.options;

      if (!columns) {
        return { error: "Missing \"columns\" (or legacy \"options\") in table definition" };
      }

      this.#defineModel({
        name: table.name,
        columns,
        constraints: table.constraints || [],
        indexes: table.indexes || [],
      });

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Creates an index on an existing table.
   *
   * Composite indexes are supported by passing multiple columns.
   *
   * @param {string} tableName - Table name.
   * @param {{
   *   name?: string,
   *   columns: string[],
   *   unique?: boolean
   * }} index - Index definition.
   * @returns {Promise<{ ok: true } | { error: string }>}
   *
   * @example
   * await db.createIndex("UserAuthMethod", {
   *   columns: ["provider", "providerUserId"],
   *   unique: true
   * });
   */
  async createIndex(tableName, index) {
    try {
      this.#assertIdentifier(tableName, "table name");

      const columns = (index.columns || []).map((column) =>
        this.#assertIdentifier(column, "column name"),
      );

      if (!columns.length) {
        return { error: "Index requires a non-empty \"columns\" array" };
      }

      const indexName =
        index.name ||
        `idx_${tableName}_${columns.join("_")}${index.unique ? "_unique" : ""}`;

      this.#assertIdentifier(indexName, "index name");

      const sql = `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns.join(", ")})`;
      this.#run(sql);

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Drops a table and removes its model definition.
   *
   * @param {string} tableName - Table name.
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async deleteTable(tableName) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#assertIdentifier(tableName, "table name");
      this.#run(`DROP TABLE IF EXISTS ${tableName}`);
      this.#models.delete(tableName);

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Deletes all rows from a table.
   *
   * @param {string} tableName - Table name.
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async clearTable(tableName) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#assertIdentifier(tableName, "table name");
      this.#run(`DELETE FROM ${tableName}`);

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Returns a single row matching a plain-object WHERE clause.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} [where={}] - Conditions.
   * @returns {Promise<object|undefined|{ error: string }>}
   */
  async get(tableName, where = {}) {
    try {
      if (!this.#models.has(tableName)) return undefined;

      this.#assertIdentifier(tableName, "table name");

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
   * Returns multiple rows from a table.
   *
   * Supports:
   * - exact-match filters via `where`
   * - custom ordering
   * - pagination via `limit` and `offset`
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} [where={}] - Exact-match conditions.
   * @param {{
   *   limit?: number,
   *   offset?: number,
   *   orderBy?: string,
   *   direction?: "ASC"|"DESC"
   * }} [options={}] - Query options.
   * @returns {Promise<object[] | { error: string }>}
   *
   * @example
   * const posts = await db.getAll("Post", { userId: 1 }, {
   *   limit: 20,
   *   offset: 0,
   *   orderBy: "createdAt",
   *   direction: "DESC"
   * });
   */
  async getAll(tableName, where = {}, options = {}) {
    try {
      if (!this.#models.has(tableName)) return [];

      this.#assertIdentifier(tableName, "table name");

      const whereClause = this.#buildWhere(where);
      const limit = Number.isInteger(options.limit) ? options.limit : 50;
      const offset = Number.isInteger(options.offset) ? options.offset : 0;
      const direction = options.direction === "ASC" ? "ASC" : "DESC";

      const orderBy = options.orderBy
        ? this.#assertIdentifier(options.orderBy, "column name")
        : this.#getOrderBy(tableName).split(" ")[0];

      const sql = `SELECT * FROM ${tableName} ${whereClause.where} ORDER BY ${orderBy} ${direction} LIMIT ? OFFSET ?`;
      const stmt = this.#$.prepare(sql);
      const records = stmt.all(...whereClause.params, limit, offset);

      return records;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Inserts a new row into a table.
   *
   * This method performs a plain `INSERT`.
   * If a unique constraint is violated, SQLite will throw an error.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} data - Row to insert.
   * @returns {Promise<{ ok: true, lastInsertRowid: bigint|number, changes: number } | { error: string }>}
   */
  async insert(tableName, data) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#assertIdentifier(tableName, "table name");

      const columns = Object.keys(data);
      if (!columns.length) return { error: "Insert data cannot be empty" };

      columns.forEach((column) => this.#assertIdentifier(column, "column name"));

      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

      const result = this.#run(sql, Object.values(data));

      return { ok: true, ...result };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Updates one or more rows matching a WHERE clause.
   *
   * This method performs a plain `UPDATE`.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} data - Fields to update.
   * @param {Record<string, any>} where - Conditions used to select rows.
   * @returns {Promise<{ ok: true, changes: number } | { error: string }>}
   */
  async update(tableName, data, where) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      if (!where || Object.keys(where).length === 0) {
        return { error: "Update requires a non-empty where clause" };
      }

      this.#assertIdentifier(tableName, "table name");

      const columns = Object.keys(data);
      if (!columns.length) return { error: "Update data cannot be empty" };

      columns.forEach((column) => this.#assertIdentifier(column, "column name"));

      const setClause = columns.map((column) => `${column} = ?`).join(", ");
      const whereClause = this.#buildWhere(where);

      const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause.where}`;
      const result = this.#run(sql, [...Object.values(data), ...whereClause.params]);

      return { ok: true, changes: result.changes };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Inserts or updates a row using SQLite `ON CONFLICT DO UPDATE`.
   *
   * This is safer than `INSERT OR REPLACE` because it does not delete
   * and recreate the row.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} data - Row data.
   * @param {string[]} conflict - Columns that define the conflict target.
   * @returns {Promise<{ ok: true, changes: number, lastInsertRowid: bigint|number } | { error: string }>}
   *
   * @example
   * await db.upsert("UserAuthMethod", {
   *   userId: 1,
   *   provider: "google",
   *   providerUserId: "123"
   * }, ["provider", "providerUserId"]);
   */
  async upsert(tableName, data, conflict = []) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#assertIdentifier(tableName, "table name");

      const columns = Object.keys(data);
      if (!columns.length) return { error: "Upsert data cannot be empty" };
      if (!conflict.length) return { error: "Upsert requires at least one conflict column" };

      columns.forEach((column) => this.#assertIdentifier(column, "column name"));
      conflict.forEach((column) => this.#assertIdentifier(column, "column name"));

      const placeholders = columns.map(() => "?").join(", ");
      const updateColumns = columns.filter((column) => !conflict.includes(column));

      const updateClause = updateColumns.length
        ? updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")
        : `${conflict[0]} = ${conflict[0]}`;

      const sql = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT (${conflict.join(", ")})
        DO UPDATE SET ${updateClause}
      `.trim();

      const result = this.#run(sql, Object.values(data));
      return { ok: true, ...result };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Backward-compatible helper that inserts or updates a row.
   *
   * Behavior:
   * - If `where` is provided, the existing row is loaded and merged with `data`,
   *   then updated if found or inserted if not found.
   * - If `where` is not provided but `data.id` exists, lookup is performed on `id`.
   * - If no existing row is found, a new row is inserted.
   *
   * This method is intentionally simple, but for production-grade control,
   * prefer using `insert()`, `update()`, or `upsert()`.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} data - Row data.
   * @param {Record<string, any>|null} [where=null] - Lookup condition.
   * @returns {Promise<{ ok: true } | { error: string }>}
   */
  async set(tableName, data, where = null) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      const lookup = where ?? (data.id ? { id: data.id } : null);

      if (!lookup) {
        const inserted = await this.insert(tableName, data);
        if (inserted.error) return inserted;
        return { ok: true };
      }

      const existing = await this.get(tableName, lookup);
      if (existing?.error) return existing;

      if (existing) {
        const merged = { ...existing, ...data };
        const updated = await this.update(tableName, merged, lookup);
        if (updated.error) return updated;
        return { ok: true };
      }

      const inserted = await this.insert(tableName, data);
      if (inserted.error) return inserted;

      return { ok: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Deletes rows matching a WHERE clause.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} where - Conditions.
   * @returns {Promise<{ ok: true, changes: number } | { error: string }>}
   */
  async delete(tableName, where) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      if (!where || Object.keys(where).length === 0) {
        return { error: "Delete requires a non-empty where clause" };
      }

      this.#assertIdentifier(tableName, "table name");

      const whereClause = this.#buildWhere(where);
      const sql = `DELETE FROM ${tableName} ${whereClause.where}`;
      const result = this.#run(sql, whereClause.params);

      return { ok: true, changes: result.changes };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Counts rows matching a WHERE clause.
   *
   * @param {string} tableName - Table name.
   * @param {Record<string, any>} [where={}] - Conditions.
   * @returns {Promise<number | { error: string }>}
   */
  async count(tableName, where = {}) {
    try {
      if (!this.#models.has(tableName)) {
        return { error: `Table ${tableName} doesn't exist` };
      }

      this.#assertIdentifier(tableName, "table name");

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
   * Runs multiple operations inside a transaction.
   *
   * If the callback throws, the transaction is rolled back.
   * If the callback completes successfully, the transaction is committed.
   *
   * The callback may be synchronous or asynchronous.
   *
   * @template T
   * @param {() => T|Promise<T>} callback - Function to execute inside the transaction.
   * @returns {Promise<T | { error: string }>}
   *
   * @example
   * const result = await db.transaction(async () => {
   *   await db.insert("User", { email: "a@b.com", createdAt: Date.now() });
   *   await db.insert("Profile", { userId: 1, nickname: "John" });
   *   return { ok: true };
   * });
   */
  async transaction(callback) {
    try {
      this.#run("BEGIN");

      const result = await callback();

      this.#run("COMMIT");
      return result;
    } catch (error) {
      try {
        this.#run("ROLLBACK");
      } catch {}

      return { error: error.message };
    }
  }

  /**
   * Closes the underlying SQLite connection.
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
