export = SQLite;
declare class SQLite {
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
    constructor(path?: string);
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
    exec(sql: string, params?: any[] | any): Promise<{
        changes: number;
        lastInsertRowid: bigint | number;
    } | {
        error: string;
    }>;
    /**
     * Executes a raw SQL query and returns the first row.
     *
     * @param {string} sql - SQL query.
     * @param {any[]|any} [params=[]] - Parameters to bind.
     * @returns {Promise<object|undefined|{ error: string }>}
     */
    queryOne(sql: string, params?: any[] | any): Promise<object | undefined | {
        error: string;
    }>;
    /**
     * Executes a raw SQL query and returns all rows.
     *
     * @param {string} sql - SQL query.
     * @param {any[]|any} [params=[]] - Parameters to bind.
     * @returns {Promise<object[]|{ error: string }>}
     */
    queryAll(sql: string, params?: any[] | any): Promise<object[] | {
        error: string;
    }>;
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
    createTable(table: {
        name: string;
        columns?: Record<string, {
            type: "INTEGER" | "TEXT" | "REAL" | "BLOB" | "NUMERIC";
            primaryKey?: boolean;
            autoincrement?: boolean;
            notNull?: boolean;
            unique?: boolean;
            defaultValue?: any;
            values?: any[];
            references?: {
                table: string;
                column: string;
            };
            onDelete?: string;
            onUpdate?: string;
        }>;
        options?: Record<string, any>;
        constraints?: Array<{
            type: "unique";
            columns: string[];
        } | {
            type: "primaryKey";
            columns: string[];
        } | {
            type: "check";
            expression: string;
        } | {
            type: "foreignKey";
            columns: string[];
            references: {
                table: string;
                columns: string[];
            };
            onDelete?: string;
            onUpdate?: string;
        }>;
        indexes?: Array<{
            name?: string;
            columns: string[];
            unique?: boolean;
        }>;
    }): Promise<{
        ok: true;
    } | {
        error: string;
    }>;
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
    createIndex(tableName: string, index: {
        name?: string;
        columns: string[];
        unique?: boolean;
    }): Promise<{
        ok: true;
    } | {
        error: string;
    }>;
    /**
     * Drops a table and removes its model definition.
     *
     * @param {string} tableName - Table name.
     * @returns {Promise<{ ok: true } | { error: string }>}
     */
    deleteTable(tableName: string): Promise<{
        ok: true;
    } | {
        error: string;
    }>;
    /**
     * Deletes all rows from a table.
     *
     * @param {string} tableName - Table name.
     * @returns {Promise<{ ok: true } | { error: string }>}
     */
    clearTable(tableName: string): Promise<{
        ok: true;
    } | {
        error: string;
    }>;
    /**
     * Returns a single row matching a plain-object WHERE clause.
     *
     * @param {string} tableName - Table name.
     * @param {Record<string, any>} [where={}] - Conditions.
     * @returns {Promise<object|undefined|{ error: string }>}
     */
    get(tableName: string, where?: Record<string, any>): Promise<object | undefined | {
        error: string;
    }>;
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
    getAll(tableName: string, where?: Record<string, any>, options?: {
        limit?: number;
        offset?: number;
        orderBy?: string;
        direction?: "ASC" | "DESC";
    }): Promise<object[] | {
        error: string;
    }>;
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
    insert(tableName: string, data: Record<string, any>): Promise<{
        ok: true;
        lastInsertRowid: bigint | number;
        changes: number;
    } | {
        error: string;
    }>;
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
    update(tableName: string, data: Record<string, any>, where: Record<string, any>): Promise<{
        ok: true;
        changes: number;
    } | {
        error: string;
    }>;
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
    upsert(tableName: string, data: Record<string, any>, conflict?: string[]): Promise<{
        ok: true;
        changes: number;
        lastInsertRowid: bigint | number;
    } | {
        error: string;
    }>;
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
    set(tableName: string, data: Record<string, any>, where?: Record<string, any> | null): Promise<{
        ok: true;
    } | {
        error: string;
    }>;
    /**
     * Deletes rows matching a WHERE clause.
     *
     * @param {string} tableName - Table name.
     * @param {Record<string, any>} where - Conditions.
     * @returns {Promise<{ ok: true, changes: number } | { error: string }>}
     */
    delete(tableName: string, where: Record<string, any>): Promise<{
        ok: true;
        changes: number;
    } | {
        error: string;
    }>;
    /**
     * Counts rows matching a WHERE clause.
     *
     * @param {string} tableName - Table name.
     * @param {Record<string, any>} [where={}] - Conditions.
     * @returns {Promise<number | { error: string }>}
     */
    count(tableName: string, where?: Record<string, any>): Promise<number | {
        error: string;
    }>;
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
    transaction<T>(callback: () => T | Promise<T>): Promise<T | {
        error: string;
    }>;
    /**
     * Closes the underlying SQLite connection.
     *
     * @example
     * db.close();
     */
    close(): void;
    #private;
}
//# sourceMappingURL=SQLite.d.ts.map