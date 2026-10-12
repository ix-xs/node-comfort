"use strict";

/**
 * The errors node-comfort throws. They all extend `NodeComfortError` (itself
 * a regular `Error`) and carry a stable `code`, so you can branch on the
 * kind of failure without parsing messages.
 *
 * @example
 * try {
 *   await nc.http.get("https://api.example.com/users/42");
 * } catch (error) {
 *   if (error instanceof nc.errors.HttpError && error.status === 404) return null;
 *   throw error;
 * }
 */

/**
 * Options shared by every error constructor.
 * @typedef {object} NodeComfortErrorOptions
 * @property {string} [code] Machine-readable code, like `"ETIMEDOUT"`.
 * @property {unknown} [cause] The error that caused this one, kept as `error.cause`.
 */

/**
 * Base class of every node-comfort error. `name` is the class name and
 * `code` a stable identifier.
 *
 * @example
 * if (error instanceof nc.errors.NodeComfortError) logger.warn(error.code);
 */
class NodeComfortError extends Error {
  /**
   * @param {string} message
   * @param {NodeComfortErrorOptions} [options]
   */
  constructor(message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    /** The class name, like `"TimeoutError"`. */
    this.name = new.target.name;
    /** Stable, machine-readable code. */
    this.code = options.code ?? "ERR_NODE_COMFORT";
  }

  /**
   * What `JSON.stringify()` writes for the error: its name, code, message
   * and own fields, without the stack. Handy for API responses and logs.
   *
   * @example
   * res.status(400).json({ error });
   * // {"error":{"name":"ValidationError","code":"ERR_VALIDATION","message":"...","issues":[...]}}
   *
   * @returns {Record<string, unknown>}
   */
  toJSON() {
    /** @type {Record<string, unknown>} */
    const out = { name: this.name, code: this.code, message: this.message };
    for (const key of Object.keys(this)) if (!(key in out)) out[key] = /** @type {any} */ (this)[key];
    const cause = /** @type {any} */ (this.cause);
    if (cause !== undefined) out.cause = cause instanceof Error ? { name: cause.name, message: cause.message, code: /** @type {any} */ (cause).code } : cause;
    return out;
  }

  /**
   * Makes `instanceof` work when two copies of the package are installed,
   * which would otherwise give two unrelated `HttpError` classes.
   *
   * @override
   * @param {unknown} value
   * @returns {boolean}
   */
  static [Symbol.hasInstance](value) {
    if (Function.prototype[Symbol.hasInstance].call(this, value)) return true;
    const brand = Symbol.for(`@ix-xs/node-comfort/${this.name}`);
    if (!Object.prototype.hasOwnProperty.call(this.prototype, brand)) return false;
    return value !== null && typeof value === "object" && /** @type {any} */ (value)[brand] === true;
  }
}

/**
 * Thrown by `nc.assert()` and `nc.assertType()`.
 *
 * @example
 * nc.assert(user, "User is required");
 */
class AssertionError extends NodeComfortError {
  /**
   * @param {string} [message="Assertion failed"]
   * @param {NodeComfortErrorOptions} [options]
   */
  constructor(message = "Assertion failed", options = {}) {
    super(message, { ...options, code: options.code ?? "ERR_ASSERTION" });
  }
}

/**
 * Thrown when something takes too long: `func.timeout`, `async.poll`, HTTP
 * requests, `emitter.waitFor`...
 *
 * @example
 * try {
 *   await nc.func.timeout(slowTask(), 1000);
 * } catch (error) {
 *   if (error instanceof nc.errors.TimeoutError) console.log(`Gave up after ${error.timeout}ms`);
 * }
 */
class TimeoutError extends NodeComfortError {
  /**
   * @param {string} [message="Operation timed out"]
   * @param {NodeComfortErrorOptions & { timeout?: number }} [options] Can include the time limit in milliseconds.
   */
  constructor(message = "Operation timed out", options = {}) {
    super(message, { ...options, code: options.code ?? "ETIMEDOUT" });
    /** The time limit in milliseconds, when known. */
    this.timeout = options.timeout;
  }
}

/**
 * Thrown when an operation is cancelled with an `AbortSignal`. Its name is
 * `"AbortError"`, like native abort errors, so existing checks keep working.
 */
class AbortError extends NodeComfortError {
  /**
   * @param {string} [message="The operation was aborted"]
   * @param {NodeComfortErrorOptions} [options] Usually `{ cause: signal.reason }`.
   */
  constructor(message = "The operation was aborted", options = {}) {
    super(message, { ...options, code: options.code ?? "ABORT_ERR" });
  }
}

/**
 * One problem found while validating data.
 * @typedef {object} ValidationIssue
 * @property {Array<string|number>} path Where the problem is, like `["user", "emails", 0]`. Empty for the root value.
 * @property {string} code What went wrong: `"invalid_type"`, `"too_small"`, `"invalid_string"`, `"custom"`...
 * @property {string} message A message you can show to users.
 * @property {string} [expected] The expected type, for type errors.
 * @property {string} [received] The received type, for type errors.
 */

/**
 * Thrown when data doesn't match a schema or when environment variables are
 * invalid. `issues` lists every problem, not just the first one.
 *
 * @example
 * try {
 *   User.parse(body);
 * } catch (error) {
 *   if (error instanceof nc.errors.ValidationError) return res.status(400).json(error.flatten());
 *   throw error;
 * }
 */
class ValidationError extends NodeComfortError {
  /**
   * @param {ValidationIssue[]} issues
   * @param {NodeComfortErrorOptions & { message?: string }} [options]
   */
  constructor(issues, options = {}) {
    super(options.message ?? ValidationError.format(issues), { ...options, code: options.code ?? "ERR_VALIDATION" });
    /** Every problem found, in order. */
    this.issues = issues;
  }

  /**
   * Turns issues into a readable message, one line per issue.
   *
   * @param {ValidationIssue[]} issues
   * @returns {string}
   */
  static format(issues) {
    if (!issues.length) return "Validation failed";
    const lines = issues.map((issue) => {
      const where = issue.path.length ? issue.path.join(".") : "(root)";
      return `  • ${where}: ${issue.message}`;
    });
    return `Validation failed with ${issues.length} issue${issues.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;
  }

  /**
   * Groups messages by path, which is handy for forms.
   *
   * @example
   * error.flatten(); // { email: ["Invalid email address"], age: ["Must be at least 18"] }
   *
   * @returns {Record<string, string[]>} Messages by dotted path (`""` for the root).
   */
  flatten() {
    /** @type {Record<string, string[]>} */
    const out = {};
    for (const issue of this.issues) {
      const key = issue.path.join(".");
      (out[key] ??= []).push(issue.message);
    }
    return out;
  }
}

/**
 * Thrown by `nc.http` when the response status isn't 2xx (unless you pass
 * `throwHttpErrors: false`), and for network failures (`status` 0).
 *
 * @example
 * try {
 *   await nc.http.get(url);
 * } catch (error) {
 *   if (error instanceof nc.errors.HttpError) console.log(error.status, error.data);
 * }
 */
class HttpError extends NodeComfortError {
  /**
   * @param {string} message
   * @param {NodeComfortErrorOptions & { status?: number, statusText?: string, url?: string, method?: string, headers?: Record<string, string>, data?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "ERR_HTTP" });
    /** HTTP status, like `404`. `0` when no response came back. */
    this.status = options.status ?? 0;
    /** HTTP status text, like `"Not Found"`. */
    this.statusText = options.statusText ?? "";
    /** The requested URL. */
    this.url = options.url ?? "";
    /** The HTTP method, like `"GET"`. */
    this.method = options.method ?? "GET";
    /** Response headers, with lower-cased names. */
    this.headers = options.headers ?? {};
    /** The response body: parsed JSON when possible, text otherwise. */
    this.data = options.data;
  }
}

/**
 * Thrown by `nc.crypto.verifyJWT()`. The `code` tells you why:
 * `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`,
 * `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` or `ERR_JWT_CLAIM`.
 *
 * @example
 * try {
 *   return nc.crypto.verifyJWT(token, secret);
 * } catch (error) {
 *   if (error.code === "ERR_JWT_EXPIRED") return refreshSession();
 *   throw error;
 * }
 */
class JWTError extends NodeComfortError {
  /**
   * @param {string} message
   * @param {NodeComfortErrorOptions & { expiredAt?: Date }} [options]
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "ERR_JWT" });
    /** When the token expired. Only set for `ERR_JWT_EXPIRED`. */
    this.expiredAt = options.expiredAt;
  }
}

/**
 * Thrown by `nc.sys.run()` and `nc.sys.exec()` when a command fails, is
 * killed or times out. Its output is kept on the error.
 *
 * @example
 * try {
 *   await nc.sys.run("git", ["push"]);
 * } catch (error) {
 *   console.error(error.exitCode, error.stderr);
 * }
 */
class ProcessError extends NodeComfortError {
  /**
   * @param {string} message
   * @param {NodeComfortErrorOptions & { command?: string, exitCode?: number | null, signal?: string | null, stdout?: string, stderr?: string, timedOut?: boolean }} [options]
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? (options.timedOut ? "ETIMEDOUT" : "ERR_PROCESS") });
    /** The command that ran. */
    this.command = options.command ?? "";
    /** Exit code, or `null` if a signal killed the process. */
    this.exitCode = options.exitCode ?? null;
    /** The signal that killed the process, like `"SIGTERM"`. */
    this.signal = options.signal ?? null;
    /** Everything written to stdout. */
    this.stdout = options.stdout ?? "";
    /** Everything written to stderr. */
    this.stderr = options.stderr ?? "";
    /** `true` if the process was killed for exceeding its `timeout`. */
    this.timedOut = options.timedOut ?? false;
  }
}

/**
 * Thrown by `nc.SQLite` when a statement fails. Check `sqliteCode` to handle
 * specific cases like a duplicate value.
 *
 * @example
 * try {
 *   db.insert("users", { email });
 * } catch (error) {
 *   if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") return "Email already taken";
 *   throw error;
 * }
 */
class SQLiteError extends NodeComfortError {
  /**
   * @param {string} message
   * @param {NodeComfortErrorOptions & { sql?: string, sqliteCode?: string }} [options]
   */
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code ?? "ERR_SQLITE" });
    /** The SQL that failed, when there is one. */
    this.sql = options.sql;
    /** SQLite's error code, like `"SQLITE_CONSTRAINT_UNIQUE"`, when known. */
    this.sqliteCode = options.sqliteCode;
  }
}

const _classes = [NodeComfortError, AssertionError, TimeoutError, AbortError, ValidationError, HttpError, JWTError, ProcessError, SQLiteError];
for (const Class of _classes) {
  Object.defineProperty(Class.prototype, Symbol.for(`@ix-xs/node-comfort/${Class.name}`), { value: true });
}

module.exports = {
  NodeComfortError,
  AssertionError,
  TimeoutError,
  AbortError,
  ValidationError,
  HttpError,
  JWTError,
  ProcessError,
  SQLiteError,
};
