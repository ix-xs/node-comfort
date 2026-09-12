"use strict";

/**
 * Environment variables you can trust: `.env` loading, typed getters, and
 * `validate()` to check your whole configuration at startup and report
 * every problem at once.
 *
 * The `.env` file in the working directory is loaded when the package is
 * required; variables that are already set are never overwritten. Set
 * `NODE_COMFORT_DOTENV=false` to turn that off.
 *
 * @example
 * const config = env.validate({
 *   PORT: { type: "port", default: 3000 },
 *   DATABASE_URL: { type: "url" },                  // required
 *   CACHE_TTL: { type: "duration", default: "5m" }, // in ms
 * });
 * config.PORT; // a number, typed in your editor
 */

const fs = require("node:fs");
const nodePath = require("node:path");
const { ValidationError } = require("./errors.js");

/**
 * Options for `load()`.
 * @typedef {object} EnvLoadOptions
 * @property {boolean} [override] Overwrite variables that are already set.
 * @property {boolean} [expand] Replace `${OTHER}` references. Defaults to `true`.
 * @property {boolean} [required] Throw if a file is missing.
 * @property {NodeJS.ProcessEnv} [target] Where to put the variables. Defaults to `process.env`.
 */

/**
 * Options for `parse()`.
 * @typedef {object} EnvParseOptions
 * @property {boolean} [expand] Replace `$VAR`, `${VAR}` and `${VAR:-default}`. Defaults to `true`.
 * @property {Record<string, string | undefined>} [env] Other variables usable in expansions. Defaults to `process.env`.
 */

/**
 * Options shared by the typed getters.
 * @template T
 * @typedef {object} EnvGetterOptions
 * @property {T} [default] Used when the variable is missing or empty. Without it, the variable is required.
 * @property {boolean} [optional] Return `undefined` instead of throwing when it's missing.
 * @property {NodeJS.ProcessEnv} [env] Where to read from. Defaults to `process.env`.
 */

/**
 * One variable in `validate()`. It's required unless it has a `default` or
 * `optional: true`.
 *
 * @typedef {(
 *   { type: "string", default?: string, optional?: boolean, pattern?: RegExp, minLength?: number, description?: string } |
 *   { type: "number", default?: number, optional?: boolean, min?: number, max?: number, integer?: boolean, description?: string } |
 *   { type: "boolean", default?: boolean, optional?: boolean, description?: string } |
 *   { type: "port", default?: number, optional?: boolean, description?: string } |
 *   { type: "url", default?: string, optional?: boolean, protocols?: string[], description?: string } |
 *   { type: "email", default?: string, optional?: boolean, description?: string } |
 *   { type: "duration", default?: number | string, optional?: boolean, description?: string } |
 *   { type: "list", default?: string[], optional?: boolean, separator?: string, description?: string } |
 *   { type: "json", default?: unknown, optional?: boolean, description?: string } |
 *   { type: "enum", values: readonly string[], default?: string, optional?: boolean, description?: string }
 * )} EnvVarSpec
 */

/**
 * The type a variable gets once read.
 * @template {EnvVarSpec} S
 * @typedef {S["type"] extends "number" | "port" | "duration" ? number : S["type"] extends "boolean" ? boolean : S["type"] extends "list" ? string[] : S["type"] extends "json" ? any : S extends { values: readonly (infer V)[] } ? V : string} EnvVarValue
 */

/**
 * What `validate()` returns.
 * @template {Record<string, EnvVarSpec>} T
 * @typedef {{ -readonly [K in keyof T]: T[K] extends { optional: true } ? EnvVarValue<T[K]> | undefined : EnvVarValue<T[K]> }} EnvConfig
 */

/**
 * @param {string} name
 * @param {string} code
 * @param {string} message
 * @returns {never}
 */
const _fail = (name, code, message) => {
  throw new ValidationError([{ path: [name], code, message }], { message: `Environment variable ${name}: ${message}` });
};

/**
 * @param {string} name
 * @param {string} raw
 * @param {EnvVarSpec} spec
 * @returns {unknown}
 */
const _convert = (name, raw, spec) => {
  const value = raw.trim();
  switch (spec.type) {
    case "string": {
      if (spec.minLength !== undefined && value.length < spec.minLength) _fail(name, "too_small", `must contain at least ${spec.minLength} characters`);
      if (spec.pattern && !spec.pattern.test(value)) _fail(name, "invalid_string", `does not match ${spec.pattern}`);
      return raw;
    }
    case "number": {
      const n = Number(value);
      if (value === "" || !Number.isFinite(n)) _fail(name, "invalid_type", `must be a number, got "${raw}"`);
      if (spec.integer && !Number.isInteger(n)) _fail(name, "invalid_type", `must be an integer, got "${raw}"`);
      if (spec.min !== undefined && n < spec.min) _fail(name, "too_small", `must be >= ${spec.min}, got ${n}`);
      if (spec.max !== undefined && n > spec.max) _fail(name, "too_big", `must be <= ${spec.max}, got ${n}`);
      return n;
    }
    case "port": {
      const n = Number(value);
      if (!/^\d+$/.test(value) || n < 0 || n > 65535) _fail(name, "invalid_type", `must be a port number (0-65535), got "${raw}"`);
      return n;
    }
    case "boolean": {
      const lower = value.toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(lower)) return true;
      if (["false", "0", "no", "n", "off", ""].includes(lower)) return false;
      return _fail(name, "invalid_type", `must be a boolean (true/false, 1/0, yes/no, on/off), got "${raw}"`);
    }
    case "url": {
      try {
        const url = new URL(value);
        if (spec.protocols && !spec.protocols.map((p) => p.replace(/:?$/, ":")).includes(url.protocol)) {
          _fail(name, "invalid_string", `must use one of these protocols: ${spec.protocols.join(", ")}`);
        }
        return value;
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        return _fail(name, "invalid_string", `must be a valid URL, got "${raw}"`);
      }
    }
    case "email": {
      const { isEmail } = require("./Checker.js");
      if (!isEmail(value)) _fail(name, "invalid_string", `must be an email address, got "${raw}"`);
      return value;
    }
    case "duration": {
      const { parseDuration } = require("./Time.js");
      const ms = parseDuration(value);
      if (ms === null) _fail(name, "invalid_type", `must be a duration such as "30s", "5m" or "1h", got "${raw}"`);
      return ms;
    }
    case "list":
      return value === "" ? [] : value.split(spec.separator ?? ",").map((item) => item.trim()).filter((item) => item !== "");
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return _fail(name, "invalid_type", "must be valid JSON");
      }
    case "enum":
      if (!spec.values.includes(value)) _fail(name, "invalid_enum_value", `must be one of: ${spec.values.join(", ")} (got "${raw}")`);
      return value;
    default:
      return raw;
  }
};

/**
 * @param {string} name
 * @param {EnvVarSpec & { optional?: boolean }} spec
 * @param {NodeJS.ProcessEnv} source
 * @returns {unknown}
 */
const _read = (name, spec, source) => {
  const raw = source[name];
  if (raw === undefined || raw.trim() === "") {
    if ("default" in spec && spec.default !== undefined) {
      return spec.type === "duration" && typeof spec.default === "string" ? _convert(name, spec.default, spec) : spec.default;
    }
    if (spec.optional) return undefined;
    return _fail(name, "required", "is required but is not set");
  }
  return _convert(name, raw, spec);
};

/**
 * Parses the text of a `.env` file: quotes, multi-line values, `export`,
 * comments, escapes, and `${VAR}` expansion (except in single quotes).
 *
 * @example
 * env.parse('PORT=3000\nURL="http://localhost:${PORT}"');
 * // { PORT: "3000", URL: "http://localhost:3000" }
 *
 * @param {string} content
 * @param {EnvParseOptions} [options]
 * @returns {Record<string, string>}
 */
function parse(content, options = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  /** @type {Set<string>} */
  const literal = new Set();
  const text = String(content).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const regex = /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*[=:][ \t]*(?:("(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`)[ \t]*(?:#[^\n]*)?|([^\n]*))$/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, key, quoted, bare] = match;
    let value;
    if (quoted !== undefined) {
      const quote = quoted[0];
      value = quoted.slice(1, -1);
      if (quote === '"') value = value.replace(/\\([nrt"\\$])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t" })[/** @type {"n"} */ (c)] ?? c);
      if (quote === "'") literal.add(key);
    } else {
      value = (bare ?? "").replace(/(?:^|[ \t]+)#.*$/, "").trim();
    }
    out[key] = value;
  }
  if (options.expand !== false) {
    const base = options.env ?? process.env;
    const resolve = (/** @type {string} */ name, /** @type {Set<string>} */ seen) => {
      if (seen.has(name)) return "";
      if (name in out) return expandValue(out[name], new Set([...seen, name]), name);
      return base[name] ?? "";
    };
    /**
     * @param {string} value
     * @param {Set<string>} seen
     * @param {string} key
     * @returns {string}
     */
    const expandValue = (value, seen, key) => {
      if (literal.has(key)) return value;
      return value.replace(/\\\$|\$\{([\w.]+)(?::?-([^}]*))?\}|\$([A-Za-z_]\w*)/g, (m, braced, fallback, bare) => {
        if (m === "\\$") return "$";
        const resolved = resolve(braced ?? bare, seen);
        return resolved === "" && fallback !== undefined ? fallback : resolved;
      });
    };
    for (const key of Object.keys(out)) out[key] = expandValue(out[key], new Set([key]), key);
  }
  return out;
}

/**
 * Loads `.env` files into `process.env`. The first file to set a variable
 * wins, and variables that are already set are kept, unless you pass
 * `override`.
 *
 * @example
 * env.load();                                // ./.env
 * env.load([".env.local", ".env"]);          // local values win
 * env.load(".env.test", { override: true });
 *
 * @param {string | string[]} [files=".env"] Relative to the working directory.
 * @param {EnvLoadOptions} [options]
 * @returns {Record<string, string>} Everything read from the files.
 * @throws {Error} If `required` is set and a file is missing.
 */
function load(files = ".env", options = {}) {
  const target = options.target ?? process.env;
  /** @type {Record<string, string>} */
  const loaded = {};
  for (const file of Array.isArray(files) ? files : [files]) {
    const full = nodePath.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) {
      if (options.required) throw new Error(`Environment file not found: ${full}`);
      continue;
    }
    const values = parse(fs.readFileSync(full, "utf8"), { expand: options.expand, env: { ...target, ...loaded } });
    for (const [key, value] of Object.entries(values)) {
      if (!(key in loaded)) loaded[key] = value;
      if (options.override || target[key] === undefined) target[key] = value;
    }
  }
  return loaded;
}

/**
 * Reads a variable, with a fallback. Never throws.
 *
 * @example
 * env.get("REGION", "eu-west-1");
 *
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string | undefined}
 */
function get(name, fallback) {
  return process.env[name] ?? fallback;
}

/**
 * Is the variable set, even to an empty string?
 *
 * @param {string} name
 * @returns {boolean}
 */
function has(name) {
  return process.env[name] !== undefined;
}

/**
 * Reads a variable that must be set and not empty.
 *
 * @example
 * const key = env.required("STRIPE_SECRET_KEY");
 *
 * @param {string} name
 * @returns {string}
 * @throws {ValidationError} If it's missing or empty.
 */
function required(name) {
  return /** @type {string} */ (_read(name, { type: "string" }, process.env));
}

/**
 * Reads a string. Required unless you give a default or `optional`.
 *
 * @example
 * env.string("APP_NAME", { default: "my-app" });
 *
 * @param {string} name
 * @param {EnvGetterOptions<string> & { pattern?: RegExp, minLength?: number }} [options]
 * @returns {string}
 * @throws {ValidationError}
 */
function string(name, options = {}) {
  return /** @type {string} */ (_read(name, { ...options, type: "string" }, options.env ?? process.env));
}

/**
 * Reads a number.
 *
 * @example
 * env.number("WORKERS", { default: 4, min: 1, integer: true });
 *
 * @param {string} name
 * @param {EnvGetterOptions<number> & { min?: number, max?: number, integer?: boolean }} [options]
 * @returns {number}
 * @throws {ValidationError}
 */
function number(name, options = {}) {
  return /** @type {number} */ (_read(name, { ...options, type: "number" }, options.env ?? process.env));
}

/**
 * Reads a boolean: `true`/`false`, `1`/`0`, `yes`/`no` or `on`/`off`.
 *
 * @example
 * if (env.bool("FEATURE_BETA", { default: false })) enableBeta();
 *
 * @param {string} name
 * @param {EnvGetterOptions<boolean>} [options]
 * @returns {boolean}
 * @throws {ValidationError}
 */
function bool(name, options = {}) {
  return /** @type {boolean} */ (_read(name, { ...options, type: "boolean" }, options.env ?? process.env));
}

/**
 * Reads a port number.
 *
 * @example
 * server.listen(env.port("PORT", { default: 3000 }));
 *
 * @param {string} name
 * @param {EnvGetterOptions<number>} [options]
 * @returns {number}
 * @throws {ValidationError}
 */
function port(name, options = {}) {
  return /** @type {number} */ (_read(name, { ...options, type: "port" }, options.env ?? process.env));
}

/**
 * Reads an absolute URL.
 *
 * @example
 * env.url("DATABASE_URL", { protocols: ["postgres", "postgresql"] });
 *
 * @param {string} name
 * @param {EnvGetterOptions<string> & { protocols?: string[] }} [options]
 * @returns {string}
 * @throws {ValidationError}
 */
function url(name, options = {}) {
  return /** @type {string} */ (_read(name, { ...options, type: "url" }, options.env ?? process.env));
}

/**
 * Reads a duration like `"30s"` or `"1h30m"` and returns milliseconds.
 *
 * @example
 * env.duration("CACHE_TTL", { default: "10m" }); // 600000
 *
 * @param {string} name
 * @param {EnvGetterOptions<number | string>} [options]
 * @returns {number}
 * @throws {ValidationError}
 */
function duration(name, options = {}) {
  return /** @type {number} */ (_read(name, { ...options, type: "duration" }, options.env ?? process.env));
}

/**
 * Reads a comma-separated list. Items are trimmed and empty ones dropped.
 *
 * @example
 * // ALLOWED_ORIGINS="https://a.com, https://b.com"
 * env.list("ALLOWED_ORIGINS", { default: [] }); // ["https://a.com", "https://b.com"]
 *
 * @param {string} name
 * @param {EnvGetterOptions<string[]> & { separator?: string }} [options]
 * @returns {string[]}
 * @throws {ValidationError}
 */
function list(name, options = {}) {
  return /** @type {string[]} */ (_read(name, { ...options, type: "list" }, options.env ?? process.env));
}

/**
 * Reads a JSON value.
 *
 * @example
 * const flags = env.json("FEATURE_FLAGS", { default: {} });
 *
 * @template [T=any]
 * @param {string} name
 * @param {EnvGetterOptions<T>} [options]
 * @returns {T}
 * @throws {ValidationError}
 */
function json(name, options = {}) {
  return /** @type {T} */ (_read(name, { ...options, type: "json" }, options.env ?? process.env));
}

/**
 * Reads a variable that must be one of the given values. The result has
 * their literal type.
 *
 * @example
 * env.oneOf("LOG_LEVEL", ["debug", "info", "warn", "error"], { default: "info" });
 *
 * @template {string} V
 * @param {string} name
 * @param {readonly V[]} values
 * @param {EnvGetterOptions<V>} [options]
 * @returns {V}
 * @throws {ValidationError}
 */
function oneOf(name, values, options = {}) {
  return /** @type {V} */ (_read(name, { ...options, type: "enum", values }, options.env ?? process.env));
}

/**
 * Checks all your variables at once and returns a typed, frozen config. If
 * anything is wrong, one `ValidationError` lists every problem, so a bad
 * deployment fails at startup with the full picture.
 *
 * @example
 * const config = env.validate({
 *   NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
 *   PORT: { type: "port", default: 3000 },
 *   DATABASE_URL: { type: "url", protocols: ["postgres"] },
 *   JWT_SECRET: { type: "string", minLength: 32 },
 *   SENTRY_DSN: { type: "url", optional: true },
 * });
 * // ValidationError: Validation failed with 2 issues:
 * //   • DATABASE_URL: is required but is not set
 * //   • JWT_SECRET: must contain at least 32 characters
 *
 * @template {Record<string, EnvVarSpec>} T
 * @param {T} spec
 * @param {{ env?: NodeJS.ProcessEnv }} [options]
 * @returns {Readonly<EnvConfig<T>>}
 * @throws {ValidationError}
 */
function validate(spec, options = {}) {
  const source = options.env ?? process.env;
  /** @type {Record<string, unknown>} */
  const out = {};
  /** @type {import("./errors").ValidationIssue[]} */
  const issues = [];
  for (const [name, varSpec] of Object.entries(spec)) {
    try {
      out[name] = _read(name, varSpec, source);
    } catch (error) {
      if (error instanceof ValidationError) issues.push(...error.issues);
      else throw error;
    }
  }
  if (issues.length) throw new ValidationError(issues);
  return /** @type {any} */ (Object.freeze(out));
}

/**
 * `NODE_ENV`, or `"development"` when it's not set.
 *
 * @returns {string}
 */
function mode() {
  return process.env.NODE_ENV || "development";
}

/**
 * Is `NODE_ENV` set to `"production"`?
 * @returns {boolean}
 */
function isProduction() {
  return mode() === "production";
}

/**
 * Is `NODE_ENV` `"development"`, or not set?
 * @returns {boolean}
 */
function isDevelopment() {
  return mode() === "development";
}

/**
 * Are we running tests? True when `NODE_ENV` is `"test"` or a test runner
 * like `node --test` or Jest is detected.
 * @returns {boolean}
 */
function isTest() {
  return mode() === "test" || process.env.NODE_TEST_CONTEXT !== undefined || process.env.JEST_WORKER_ID !== undefined;
}

if (String(process.env.NODE_COMFORT_DOTENV).toLowerCase() !== "false") {
  try {
    load(".env");
  } catch {
    // A broken .env file must never prevent the application from starting.
  }
}

module.exports = {
  parse,
  load,
  // not shorthand: Node's ES module export detection stops at a bare `get`
  get: get,
  has,
  required,
  string,
  number,
  bool,
  port,
  url,
  duration,
  list,
  json,
  oneOf,
  validate,
  mode,
  isProduction,
  isDevelopment,
  isTest,
};
