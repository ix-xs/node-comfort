"use strict";

/**
 * Validate data with schemas, in the spirit of `zod`. Describe your data
 * once and get both a runtime check with clear messages and the TypeScript
 * type, `Infer<typeof schema>`. Schemas never change: `.min()` or
 * `.optional()` return a new one.
 *
 * @example
 * const User = s.object({
 *   name: s.string().trim().min(2),
 *   email: s.string().email().toLowerCase(),
 *   age: s.number().int().min(18).optional(),
 *   role: s.enum(["admin", "user"]).default("user"),
 * });
 *
 * const user = User.parse(req.body);    // typed, or a ValidationError listing every issue
 * const result = User.safeParse(input); // { success, data } or { success, error, issues }
 */

const { types } = require("node:util");
const { ValidationError } = require("./errors.js");
const { UNSAFE_KEYS } = require("./internal/shared.js");

/**
 * The type a schema produces.
 *
 * @example
 * // type User = Infer<typeof UserSchema>;
 *
 * @template S
 * @typedef {S extends Schema<infer T> ? T : never} Infer
 */

/**
 * An object of schemas, as passed to `object()`.
 * @typedef {Record<string, Schema<any>>} Shape
 */

/**
 * Flattens a type so editors show it nicely.
 * @template T
 * @typedef {{ [K in keyof T]: T[K] } & {}} Simplify
 */

/**
 * The type of an object schema. Keys that accept `undefined` become optional.
 * @template {Shape} S
 * @typedef {Simplify<{ [K in keyof S as undefined extends Infer<S[K]> ? never : K]: Infer<S[K]> } & { [K in keyof S as undefined extends Infer<S[K]> ? K : never]?: Infer<S[K]> }>} ObjectOutput
 */

/**
 * What `safeParse()` returns. On failure, `issues` is the plain list and
 * `error` the same thing as a `ValidationError`, built when you read it.
 * @template T
 * @typedef {{ success: true, data: T, error?: undefined, issues?: undefined } | { success: false, data?: undefined, error: ValidationError, issues: import("./errors").ValidationIssue[] }} SafeParseResult
 */

/**
 * An error message: a string, or a function that gets the invalid value.
 * @typedef {string | ((value: any) => string)} Message
 */

/**
 * Options for `refine()`.
 * @typedef {object} RefineOptions
 * @property {Message} [message] Defaults to `"Invalid value"`.
 * @property {Array<string | number>} [path] Where to report the issue, like `["confirmPassword"]` for a cross-field check.
 * @property {string} [code] Defaults to `"custom"`.
 */

/**
 * @typedef {{ issues: import("./errors").ValidationIssue[], path: Array<string | number> }} ParseContext
 */

/**
 * A step in a schema: a check, a transformation, a refinement or a pipe
 * into another schema.
 * @typedef {{ kind: "check", test: (value: any) => boolean, code: string, message: Message, details?: Record<string, unknown>, json?: Record<string, unknown> } | { kind: "transform", fn: (value: any) => any } | { kind: "refine", test: (value: any) => boolean, options: RefineOptions } | { kind: "pipe", schema: Schema<any> }} Step
 */

/**
 * A JSON Schema, as made by `toJSONSchema()`.
 * @typedef {{ [keyword: string]: any }} JSONSchema
 */

/**
 * @typedef {{ defs: Record<string, JSONSchema>, names: Map<Schema<any>, string> }} _JSONContext
 */

const INVALID = Symbol("invalid");

const _TRUE = ["true", "1", "yes", "on", "y"];
const _FALSE = ["false", "0", "no", "off", "n", ""];
const _DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What a failed `safeParse()` returns. The error is only built if it's
 * read: capturing a stack trace costs far more than the validation itself.
 * @param {import("./errors").ValidationIssue[]} issues
 * @returns {{ success: false, error: ValidationError, issues: import("./errors").ValidationIssue[] }}
 */
const _failure = (issues) => {
  /** @type {ValidationError | undefined} */
  let error;
  return /** @type {any} */ (Object.defineProperty({ success: false, issues }, "error", { enumerable: true, get: () => (error ??= new ValidationError(issues)) }));
};

/**
 * @param {Schema<any>} schema
 * @param {_JSONContext} ctx
 * @returns {JSONSchema}
 */
const _jsonOf = (schema, ctx) => /** @type {any} */ (schema)._toJSON(ctx);

/** @param {unknown} value */
const _typeName = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (types.isDate(value)) return Number.isNaN(value.getTime()) ? "invalid date" : "date";
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  return typeof value;
};

/**
 * @param {Message} message
 * @param {unknown} value
 */
const _message = (message, value) => (typeof message === "function" ? message(value) : message);

/**
 * @param {ParseContext} ctx
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 */
const _issue = (ctx, code, message, details) => {
  ctx.issues.push({ path: [...ctx.path], code, message, ...details });
};

/**
 * @param {ParseContext} ctx
 * @param {string} expected
 * @param {unknown} value
 * @param {Message} [message]
 */
const _typeIssue = (ctx, expected, value, message) => {
  const received = _typeName(value);
  /** @protected */
  _issue(ctx, "invalid_type", message ? _message(message, value) : value === undefined ? "Required" : `Expected ${expected}, received ${received}`, { expected, received });
};

/**
 * Runs a nested schema.
 * @param {Schema<any>} schema
 * @param {unknown} value
 * @param {ParseContext} ctx
 * @returns {unknown}
 */
const _runChild = (schema, value, ctx) => /** @type {any} */ (schema)._run(value, ctx);

/**
 * The base of every schema.
 *
 * @template [T=unknown]
 */
class Schema {
  /** @protected @type {Step[]} */
  _steps = [];
  /** @protected */
  _optional = false;
  /** @protected */
  _nullable = false;
  /** @protected @type {{ value: unknown } | undefined} */
  _default = undefined;
  /** @protected @type {{ value: unknown } | undefined} */
  _catch = undefined;
  /** @protected @type {Message | undefined} */
  _typeMessage = undefined;
  /** @protected @type {string | undefined} */
  _description = undefined;

  /**
   * Checks the type, and coerces when asked. Subclasses override it.
   * @param {unknown} value
   * @param {ParseContext} _ctx
   * @returns {unknown}
   * @protected
   */
  _check(value, _ctx) {
    return value;
  }

  /**
   * @returns {this}
   * @protected
   */
  _clone() {
    const copy = Object.create(Object.getPrototypeOf(this));
    Object.assign(copy, this);
    copy._steps = [...this._steps];
    return copy;
  }

  /**
   * @param {Step} step
   * @returns {this}
   * @protected
   */
  _with(step) {
    const copy = this._clone();
    copy._steps.push(step);
    return copy;
  }

  /**
   * @param {unknown} input
   * @param {ParseContext} ctx
   * @returns {unknown} The output, or `INVALID`.
   * @protected
   */
  _run(input, ctx) {
    let value = input;
    if (value === undefined && this._default) {
      const def = this._default.value;
      value = typeof def === "function" ? def() : def !== null && typeof def === "object" ? require("./Obj.js").clone(def) : def;
    }
    if (value === undefined && this._optional) return undefined;
    if (value === null && this._nullable) return null;
    const before = ctx.issues.length;
    let out = this._check(value, ctx);
    if (ctx.issues.length === before) {
      for (const step of this._steps) {
        if (step.kind === "check") {
          if (!step.test(out)) _issue(ctx, step.code, _message(step.message, out), step.details);
        } else if (ctx.issues.length > before) {
          // What follows needs a value that passed everything before it.
          if (step.kind !== "refine") break;
        } else if (step.kind === "transform") {
          out = step.fn(out);
        } else if (step.kind === "pipe") {
          out = _runChild(step.schema, out, ctx);
        } else if (!step.test(out)) {
          const saved = ctx.path;
          if (step.options.path) ctx.path = [...saved, ...step.options.path];
          _issue(ctx, step.options.code ?? "custom", _message(step.options.message ?? "Invalid value", out));
          ctx.path = saved;
        }
      }
    }
    if (ctx.issues.length > before) {
      if (this._catch) {
        ctx.issues.length = before;
        const fallback = this._catch.value;
        return typeof fallback === "function" ? fallback(input) : fallback;
      }
      return INVALID;
    }
    return out;
  }

  /**
   * Validates a value and returns it, with defaults and transformations
   * applied. Unknown object keys are dropped.
   *
   * @example
   * const port = s.coerce.number().int().min(1).max(65535).parse(process.env.PORT);
   *
   * @param {unknown} value
   * @returns {T}
   * @throws {ValidationError} Listing every issue with its path.
   */
  parse(value) {
    const ctx = { issues: [], path: [] };
    const out = this._run(value, ctx);
    if (ctx.issues.length) throw new ValidationError(ctx.issues);
    return /** @type {T} */ (out);
  }

  /**
   * Validates a value without throwing.
   *
   * @example
   * const result = User.safeParse(req.body);
   * if (!result.success) return res.status(400).json(result.error.flatten());
   * saveUser(result.data);
   *
   * @param {unknown} value
   * @returns {SafeParseResult<T>}
   */
  safeParse(value) {
    /** @type {ParseContext} */
    const ctx = { issues: [], path: [] };
    const out = this._run(value, ctx);
    if (ctx.issues.length) return _failure(ctx.issues);
    return { success: true, data: /** @type {T} */ (out) };
  }

  /**
   * Is the value valid? Works as a type guard, and builds no error.
   *
   * @example
   * if (Email.is(input)) sendMail(input); // input is a string here
   *
   * @param {unknown} value
   * @returns {value is T}
   */
  is(value) {
    /** @type {ParseContext} */
    const ctx = { issues: [], path: [] };
    this._run(value, ctx);
    return ctx.issues.length === 0;
  }

  /**
   * Also accepts `undefined`. In an object, the key becomes optional.
   *
   * @example
   * s.object({ nickname: s.string().optional() }); // { nickname?: string }
   *
   * @returns {Schema<T | undefined>}
   */
  optional() {
    const copy = this._clone();
    copy._optional = true;
    return copy;
  }

  /**
   * Also accepts `null`.
   *
   * @returns {Schema<T | null>}
   */
  nullable() {
    const copy = this._clone();
    copy._nullable = true;
    return copy;
  }

  /**
   * Also accepts `null` and `undefined`.
   *
   * @returns {Schema<T | null | undefined>}
   */
  nullish() {
    const copy = this._clone();
    copy._nullable = true;
    copy._optional = true;
    return copy;
  }

  /**
   * Uses this value when the input is `undefined`. Objects are copied each
   * time; pass a function to build a fresh value on every parse.
   *
   * @example
   * s.string().default("guest");
   * s.date().default(() => new Date());
   *
   * @param {Exclude<T, undefined> | (() => Exclude<T, undefined>)} value
   * @returns {Schema<Exclude<T, undefined>>}
   */
  default(value) {
    const copy = this._clone();
    copy._default = { value };
    return /** @type {any} */ (copy);
  }

  /**
   * Returns this value instead of failing when the input is invalid.
   *
   * @example
   * s.number().catch(0).parse("not a number"); // 0
   *
   * @param {T | ((input: unknown) => T)} value A value, or a function that gets the invalid input.
   * @returns {Schema<T>}
   */
  catch(value) {
    const copy = this._clone();
    copy._catch = { value };
    return /** @type {any} */ (copy);
  }

  /**
   * Changes the value once it's valid. Runs after the checks written before it.
   *
   * @example
   * s.string().transform((value) => value.split(",")); // Schema<string[]>
   *
   * @template U
   * @param {(value: T) => U} fn
   * @returns {Schema<U>}
   */
  transform(fn) {
    return /** @type {any} */ (this._with({ kind: "transform", fn }));
  }

  /**
   * Adds your own rule.
   *
   * @example
   * s.object({ password: s.string(), confirm: s.string() })
   *   .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
   *
   * @param {(value: T) => boolean} test Returns `true` when the value is fine.
   * @param {Message | RefineOptions} [options]
   * @returns {this}
   */
  refine(test, options = {}) {
    const opts = typeof options === "string" || typeof options === "function" ? { message: options } : options;
    return this._with({ kind: "refine", test, options: opts });
  }

  /**
   * Accepts values that match this schema or another one.
   *
   * @example
   * s.string().or(s.number()); // Schema<string | number>
   *
   * @template U
   * @param {Schema<U>} other
   * @returns {Schema<T | U>}
   */
  or(other) {
    return union([/** @type {Schema<T>} */ (this), other]);
  }

  /**
   * An array of this schema.
   *
   * @example
   * s.string().email().array(); // Schema<string[]>
   *
   * @returns {ArraySchema<T>}
   */
  array() {
    return array(/** @type {Schema<T>} */ (this));
  }

  /**
   * Sends the result into another schema. With `transform()` in between,
   * it validates what a conversion produced.
   *
   * @example
   * const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));
   * Port.parse("8080"); // 8080
   * Port.parse("abc");  // ValidationError: Expected number, received NaN
   *
   * @template U
   * @param {Schema<U>} next
   * @returns {Schema<U>}
   */
  pipe(next) {
    return /** @type {any} */ (this._with({ kind: "pipe", schema: next }));
  }

  /**
   * Describes what this schema accepts as a JSON Schema (draft 2020-12).
   * Use it for an OpenAPI document, a form generator, or the input of a
   * tool you give to a language model. Rules that only exist in code,
   * like `refine()`, `transform()` and what follows a `pipe()`, can't be
   * expressed and are left out.
   *
   * @example
   * s.object({ name: s.string().min(2), age: s.number().int().optional() }).toJSONSchema();
   * // {
   * //   type: "object",
   * //   properties: { name: { type: "string", minLength: 2 }, age: { type: "integer" } },
   * //   required: ["name"],
   * // }
   *
   * @returns {JSONSchema}
   */
  toJSONSchema() {
    /** @type {_JSONContext} */
    const ctx = { defs: {}, names: new Map() };
    const out = this._toJSON(ctx);
    if (ctx.names.size) out.$defs = ctx.defs;
    return out;
  }

  /**
   * The JSON Schema of the type itself. Subclasses override it.
   * @param {_JSONContext} _ctx
   * @returns {JSONSchema}
   * @protected
   */
  _json(_ctx) {
    return {};
  }

  /**
   * The JSON Schema with what every schema can carry: rules, `null`,
   * a description, a default.
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @protected
   */
  _toJSON(ctx) {
    let out = this._json(ctx);
    for (const step of this._steps) {
      if (step.kind === "check" && step.json) Object.assign(out, step.json);
    }
    if (this._nullable) out = { anyOf: [out, { type: "null" }] };
    if (this._description !== undefined) out.description = this._description;
    if (this._default && typeof this._default.value !== "function") out.default = this._default.value;
    return out;
  }

  /**
   * Attaches a description, available as `.description`. Useful to generate
   * docs or forms.
   *
   * @param {string} text
   * @returns {this}
   */
  describe(text) {
    const copy = this._clone();
    copy._description = text;
    return copy;
  }

  /** The text set with `describe()`. */
  get description() {
    return this._description;
  }
}

/**
 * A string schema.
 *
 * @extends {Schema<string>}
 */
class StringSchema extends Schema {
  /** @protected */
  _coerce = false;

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    let v = value;
    if (this._coerce && v !== undefined && v !== null && typeof v !== "string") v = String(v);
    if (typeof v !== "string") return _typeIssue(ctx, "string", value, this._typeMessage);
    return v;
  }

  /**
   * @param {(v: string) => boolean} test
   * @param {string} code
   * @param {Message} message
   * @param {Record<string, unknown>} [details]
   * @param {Record<string, unknown>} [json] What the rule is called in JSON Schema.
   * @returns {this}
   * @protected
   */
  _rule(test, code, message, details, json) {
    return this._with({ kind: "check", test, code, message, details, json });
  }

  /**
   * At least `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  min(length, message = `Must contain at least ${length} character${length > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length >= length, "too_small", message, { minimum: length }, { minLength: length });
  }

  /**
   * At most `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  max(length, message = `Must contain at most ${length} character${length > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length <= length, "too_big", message, { maximum: length }, { maxLength: length });
  }

  /**
   * Exactly `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  length(length, message = `Must contain exactly ${length} characters`) {
    return this._rule((v) => v.length === length, "invalid_length", message, { exact: length }, { minLength: length, maxLength: length });
  }

  /**
   * Not the empty string.
   * @param {Message} [message]
   * @returns {this}
   */
  nonempty(message = "Must not be empty") {
    return this._rule((v) => v.length > 0, "too_small", message, { minimum: 1 }, { minLength: 1 });
  }

  /**
   * A valid email address.
   * @param {Message} [message]
   * @returns {this}
   */
  email(message = "Invalid email address") {
    const { isEmail } = require("./Checker.js");
    return this._rule(isEmail, "invalid_string", message, { validation: "email" }, { format: "email" });
  }

  /**
   * An absolute URL.
   * @param {Message | { message?: Message, protocols?: string[] }} [options] A message, or allowed protocols (http and https by default).
   * @returns {this}
   */
  url(options = "Invalid URL") {
    const opts = typeof options === "object" ? options : { message: options };
    const { isURL } = require("./Checker.js");
    return this._rule((v) => isURL(v, { protocols: opts.protocols }), "invalid_string", opts.message ?? "Invalid URL", { validation: "url" }, { format: "uri" });
  }

  /**
   * A UUID.
   * @param {Message} [message]
   * @returns {this}
   */
  uuid(message = "Invalid UUID") {
    const { isUUID } = require("./Checker.js");
    return this._rule((v) => isUUID(v), "invalid_string", message, { validation: "uuid" }, { format: "uuid" });
  }

  /**
   * An IP address.
   * @param {4 | 6 | Message} [versionOrMessage] Only IPv4 or IPv6, or a message.
   * @param {Message} [message]
   * @returns {this}
   */
  ip(versionOrMessage, message = "Invalid IP address") {
    const version = typeof versionOrMessage === "number" ? versionOrMessage : undefined;
    const { isIP } = require("./Checker.js");
    return this._rule((v) => isIP(v, version), "invalid_string", typeof versionOrMessage === "number" ? message : versionOrMessage ?? message, { validation: "ip" }, version === 4 ? { format: "ipv4" } : version === 6 ? { format: "ipv6" } : undefined);
  }

  /**
   * An ISO 8601 date or date-time, like `2024-01-31T10:00:00Z`.
   * @param {Message} [message]
   * @returns {this}
   */
  datetime(message = "Invalid ISO date") {
    const { isISODate } = require("./Checker.js");
    return this._rule(isISODate, "invalid_string", message, { validation: "datetime" }, { format: "date-time" });
  }

  /**
   * Matches a regular expression.
   * @param {RegExp} pattern
   * @param {Message} [message]
   * @returns {this}
   */
  regex(pattern, message = `Must match ${pattern}`) {
    return this._rule((v) => {
      pattern.lastIndex = 0;
      return pattern.test(v);
    }, "invalid_string", message, { validation: "regex" }, { pattern: pattern.source });
  }

  /**
   * Starts with `prefix`.
   * @param {string} prefix
   * @param {Message} [message]
   * @returns {this}
   */
  startsWith(prefix, message = `Must start with "${prefix}"`) {
    return this._rule((v) => v.startsWith(prefix), "invalid_string", message);
  }

  /**
   * Ends with `suffix`.
   * @param {string} suffix
   * @param {Message} [message]
   * @returns {this}
   */
  endsWith(suffix, message = `Must end with "${suffix}"`) {
    return this._rule((v) => v.endsWith(suffix), "invalid_string", message);
  }

  /**
   * Contains `search`.
   * @param {string} search
   * @param {Message} [message]
   * @returns {this}
   */
  includes(search, message = `Must include "${search}"`) {
    return this._rule((v) => v.includes(search), "invalid_string", message);
  }

  /**
   * Trims whitespace before the checks that follow.
   * @returns {this}
   */
  trim() {
    return this._with({ kind: "transform", fn: (/** @type {string} */ v) => v.trim() });
  }

  /**
   * Lowercases before the checks that follow.
   * @returns {this}
   */
  toLowerCase() {
    return this._with({ kind: "transform", fn: (/** @type {string} */ v) => v.toLowerCase() });
  }

  /**
   * Uppercases before the checks that follow.
   * @returns {this}
   */
  toUpperCase() {
    return this._with({ kind: "transform", fn: (/** @type {string} */ v) => v.toUpperCase() });
  }

  /**
   * A calendar date like `2024-01-31`, without a time.
   * @param {Message} [message]
   * @returns {this}
   */
  date(message = "Invalid date, expected YYYY-MM-DD") {
    return this._rule((v) => _DATE.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "invalid_string", message, { validation: "date" }, { format: "date" });
  }

  /**
   * A URL slug like `my-first-post`: lowercase letters, digits and single dashes.
   * @param {Message} [message]
   * @returns {this}
   */
  slug(message = "Invalid slug") {
    const { isSlug } = require("./Checker.js");
    return this._rule(isSlug, "invalid_string", message, { validation: "slug" }, { pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" });
  }

  /**
   * Hexadecimal digits only.
   * @param {Message} [message]
   * @returns {this}
   */
  hex(message = "Invalid hexadecimal string") {
    const { isHex } = require("./Checker.js");
    return this._rule((v) => isHex(v), "invalid_string", message, { validation: "hex" }, { pattern: "^[0-9a-fA-F]+$" });
  }

  /**
   * Base64 data.
   * @param {Message} [message]
   * @returns {this}
   */
  base64(message = "Invalid Base64 string") {
    const { isBase64 } = require("./Checker.js");
    return this._rule((v) => isBase64(v), "invalid_string", message, { validation: "base64" }, { contentEncoding: "base64" });
  }

  /**
   * A ULID.
   * @param {Message} [message]
   * @returns {this}
   */
  ulid(message = "Invalid ULID") {
    const { isULID } = require("./Checker.js");
    return this._rule(isULID, "invalid_string", message, { validation: "ulid" });
  }

  /**
   * A semantic version like `1.4.0` or `2.0.0-beta.1`.
   * @param {Message} [message]
   * @returns {this}
   */
  semver(message = "Invalid version") {
    const { isSemver } = require("./Checker.js");
    return this._rule(isSemver, "invalid_string", message, { validation: "semver" });
  }

  /**
   * A host name like `api.example.com`.
   * @param {Message} [message]
   * @returns {this}
   */
  hostname(message = "Invalid host name") {
    const { isHostname } = require("./Checker.js");
    return this._rule((v) => isHostname(v), "invalid_string", message, { validation: "hostname" }, { format: "hostname" });
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    return { type: "string" };
  }
}

/**
 * A number schema.
 *
 * @extends {Schema<number>}
 */
class NumberSchema extends Schema {
  /** @protected */
  _coerce = false;

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    let v = value;
    if (this._coerce && typeof v === "string" && v.trim() !== "") v = Number(v);
    else if (this._coerce && (typeof v === "boolean" || typeof v === "bigint")) v = Number(v);
    else if (this._coerce && types.isDate(v)) v = v.getTime();
    if (typeof v !== "number" || Number.isNaN(v)) return _typeIssue(ctx, "number", value, this._typeMessage);
    if (!Number.isFinite(v)) {
      _issue(ctx, "not_finite", "Must be a finite number");
      return v;
    }
    return v;
  }

  /**
   * @param {(v: number) => boolean} test
   * @param {string} code
   * @param {Message} message
   * @param {Record<string, unknown>} [details]
   * @param {Record<string, unknown>} [json] What the rule is called in JSON Schema.
   * @returns {this}
   * @protected
   */
  _rule(test, code, message, details, json) {
    return this._with({ kind: "check", test, code, message, details, json });
  }

  /**
   * At least `value`.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  min(value, message = `Must be greater than or equal to ${value}`) {
    return this._rule((v) => v >= value, "too_small", message, { minimum: value }, { minimum: value });
  }

  /**
   * At most `value`.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  max(value, message = `Must be less than or equal to ${value}`) {
    return this._rule((v) => v <= value, "too_big", message, { maximum: value }, { maximum: value });
  }

  /**
   * An integer.
   * @param {Message} [message]
   * @returns {this}
   */
  int(message = "Must be an integer") {
    return this._rule(Number.isInteger, "invalid_type", message, { expected: "integer" }, { type: "integer" });
  }

  /**
   * Greater than 0.
   * @param {Message} [message]
   * @returns {this}
   */
  positive(message = "Must be positive") {
    return this._rule((v) => v > 0, "too_small", message, { minimum: 0, exclusive: true }, { exclusiveMinimum: 0 });
  }

  /**
   * 0 or more.
   * @param {Message} [message]
   * @returns {this}
   */
  nonnegative(message = "Must not be negative") {
    return this._rule((v) => v >= 0, "too_small", message, { minimum: 0 }, { minimum: 0 });
  }

  /**
   * Less than 0.
   * @param {Message} [message]
   * @returns {this}
   */
  negative(message = "Must be negative") {
    return this._rule((v) => v < 0, "too_big", message, { maximum: 0, exclusive: true }, { exclusiveMaximum: 0 });
  }

  /**
   * A multiple of `step`.
   * @param {number} step
   * @param {Message} [message]
   * @returns {this}
   */
  multipleOf(step, message = `Must be a multiple of ${step}`) {
    return this._rule((v) => Math.abs(v / step - Math.round(v / step)) < 1e-9, "not_multiple_of", message, { multipleOf: step }, { multipleOf: step });
  }

  /**
   * Greater than `value`, which itself is refused.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  gt(value, message = `Must be greater than ${value}`) {
    return this._rule((v) => v > value, "too_small", message, { minimum: value, exclusive: true }, { exclusiveMinimum: value });
  }

  /**
   * Less than `value`, which itself is refused.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  lt(value, message = `Must be less than ${value}`) {
    return this._rule((v) => v < value, "too_big", message, { maximum: value, exclusive: true }, { exclusiveMaximum: value });
  }

  /**
   * An integer JavaScript can hold exactly: up to 2^53 - 1 either way.
   * Ids from a database or an API should pass this before any arithmetic.
   * @param {Message} [message]
   * @returns {this}
   */
  safe(message = "Must be a safe integer") {
    return this._rule(Number.isSafeInteger, "invalid_type", message, { expected: "safe integer" }, { type: "integer", minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER });
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    return { type: "number" };
  }
}

/**
 * A boolean schema.
 *
 * @extends {Schema<boolean>}
 */
class BooleanSchema extends Schema {
  /** @protected */
  _coerce = false;

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (typeof value === "boolean") return value;
    if (this._coerce) {
      const text = String(value).trim().toLowerCase();
      if (_TRUE.includes(text)) return true;
      if (_FALSE.includes(text)) return false;
    }
    return _typeIssue(ctx, "boolean", value, this._typeMessage);
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    return { type: "boolean" };
  }
}

/**
 * A bigint schema.
 *
 * @extends {Schema<bigint>}
 */
class BigIntSchema extends Schema {
  /** @protected */
  _coerce = false;

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (typeof value === "bigint") return value;
    if (this._coerce && (typeof value === "string" || typeof value === "number")) {
      try {
        return BigInt(value);
      } catch {
        // fall through to the error
      }
    }
    return _typeIssue(ctx, "bigint", value, this._typeMessage);
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    return { type: "integer" };
  }
}

/**
 * A date schema.
 *
 * @extends {Schema<Date>}
 */
class DateSchema extends Schema {
  /** @protected */
  _coerce = false;

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    let v = value;
    if (this._coerce && (typeof v === "string" || typeof v === "number")) v = new Date(v);
    if (!types.isDate(v)) return _typeIssue(ctx, "date", value, this._typeMessage);
    if (Number.isNaN(v.getTime())) return _issue(ctx, "invalid_date", "Invalid date");
    return v;
  }

  /**
   * On or after `date`.
   * @param {Date | number | string} date
   * @param {Message} [message]
   * @returns {this}
   */
  min(date, message) {
    const limit = new Date(date).getTime();
    return this._with({ kind: "check", test: (/** @type {Date} */ v) => v.getTime() >= limit, code: "too_small", message: message ?? `Must be on or after ${new Date(limit).toISOString()}` });
  }

  /**
   * On or before `date`.
   * @param {Date | number | string} date
   * @param {Message} [message]
   * @returns {this}
   */
  max(date, message) {
    const limit = new Date(date).getTime();
    return this._with({ kind: "check", test: (/** @type {Date} */ v) => v.getTime() <= limit, code: "too_big", message: message ?? `Must be on or before ${new Date(limit).toISOString()}` });
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    return { type: "string", format: "date-time" };
  }
}

/**
 * A schema that accepts a fixed set of values.
 *
 * @template T
 * @extends {Schema<T>}
 */
class LiteralSchema extends Schema {
  /** @param {readonly T[]} values */
  constructor(values) {
    super();
    /** @protected */
    this._values = values;
    /** @protected @type {Set<unknown>} */
    this._set = new Set(values);
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    // A Set treats 0 and -0 as the same value: tell them apart, as before.
    if (this._set.has(value) && (value !== 0 || this._values.some((v) => Object.is(v, value)))) return value;
    const list = this._values.map((v) => JSON.stringify(v)).join(" | ");
    const code = this._values.length > 1 ? "invalid_enum_value" : "invalid_literal";
    return _issue(ctx, code, this._typeMessage ? _message(this._typeMessage, value) : `Expected ${list}, received ${JSON.stringify(value) ?? String(value)}`, { expected: list, received: _typeName(value) });
  }

  /**
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json() {
    const values = this._values.map((v) => (typeof v === "bigint" ? Number(v) : v === undefined ? null : v));
    return values.length === 1 ? { const: values[0] } : values.every((v) => typeof v === "string") ? { type: "string", enum: values } : { enum: values };
  }

  /** The accepted values. */
  get options() {
    return [...this._values];
  }
}

/**
 * A schema built from a test function.
 *
 * @template T
 * @extends {Schema<T>}
 */
class CustomSchema extends Schema {
  /**
   * @param {(value: unknown) => boolean} test
   * @param {Message} message
   * @param {string} expected
   */
  constructor(test, message, expected) {
    super();
    /** @protected */
    this._test = test;
    /** @protected */
    this._message = message;
    /** @protected */
    this._expected = expected;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (this._test(value)) return value;
    return _issue(ctx, this._expected === "custom" ? "custom" : "invalid_type", _message(this._message, value), { expected: this._expected, received: _typeName(value) });
  }
}

/**
 * An array schema.
 *
 * @template T
 * @extends {Schema<T[]>}
 */
class ArraySchema extends Schema {
  /** @param {Schema<T>} item */
  constructor(item) {
    super();
    /** @protected */
    this._item = item;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (!Array.isArray(value)) return _typeIssue(ctx, "array", value, this._typeMessage);
    const item = this._item;
    const path = ctx.path;
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      path.push(i);
      out[i] = _runChild(item, value[i], ctx);
      path.pop();
    }
    return out;
  }

  /**
   * @param {(v: T[]) => boolean} test
   * @param {string} code
   * @param {Message} message
   * @param {Record<string, unknown>} [details]
   * @param {Record<string, unknown>} [json]
   * @returns {this}
   * @protected
   */
  _rule(test, code, message, details, json) {
    return this._with({ kind: "check", test, code, message, details, json });
  }

  /**
   * At least `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  min(count, message = `Must contain at least ${count} item${count > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length >= count, "too_small", message, { minimum: count }, { minItems: count });
  }

  /**
   * At most `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  max(count, message = `Must contain at most ${count} item${count > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length <= count, "too_big", message, { maximum: count }, { maxItems: count });
  }

  /**
   * Exactly `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  length(count, message = `Must contain exactly ${count} items`) {
    return this._rule((v) => v.length === count, "invalid_length", message, { exact: count }, { minItems: count, maxItems: count });
  }

  /**
   * At least one item.
   * @param {Message} [message]
   * @returns {this}
   */
  nonempty(message = "Must not be empty") {
    return this._rule((v) => v.length > 0, "too_small", message, { minimum: 1 }, { minItems: 1 });
  }

  /**
   * No duplicates, compared by value or by a key.
   * @param {((item: T) => unknown) | Message} [keyOrMessage] A function returning the key, or a message.
   * @param {Message} [message]
   * @returns {this}
   */
  unique(keyOrMessage, message = "Must not contain duplicates") {
    const byKey = typeof keyOrMessage === "function" && keyOrMessage.length === 1 ? /** @type {(item: T) => unknown} */ (keyOrMessage) : undefined;
    const msg = typeof keyOrMessage === "string" ? keyOrMessage : message;
    return this._rule((v) => new Set(byKey ? v.map(byKey) : v).size === v.length, "not_unique", msg, undefined, byKey ? undefined : { uniqueItems: true });
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    return { type: "array", items: _jsonOf(this._item, ctx) };
  }

  /** The schema of the items. */
  get element() {
    return this._item;
  }
}

/**
 * An object schema.
 *
 * @template {Shape} S
 * @extends {Schema<ObjectOutput<S>>}
 */
class ObjectSchema extends Schema {
  /** @protected @type {"strip" | "strict" | "passthrough"} */
  _unknown = "strip";

  /** @param {S} shape */
  constructor(shape) {
    super();
    /** @protected */
    this._shape = shape;
    // Read once here rather than on every parse. A key named __proto__ could
    // only ever replace the prototype of the result, so it's left out.
    /** @protected @type {string[]} */
    this._keys = Object.keys(shape).filter((key) => key !== "__proto__");
    /** @protected @type {Array<Schema<any>>} */
    this._schemas = this._keys.map((key) => shape[key]);
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return _typeIssue(ctx, "object", value, this._typeMessage);
    const input = /** @type {Record<string, unknown>} */ (value);
    const keys = this._keys;
    const schemas = this._schemas;
    const path = ctx.path;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let raw = input[key];
      // What every object inherits, like toString, is not data.
      if (typeof raw === "function" && !Object.hasOwn(input, key)) raw = undefined;
      path.push(key);
      const result = _runChild(schemas[i], raw, ctx);
      path.pop();
      if (result !== undefined || Object.hasOwn(input, key)) out[key] = result;
    }
    if (this._unknown === "strip") return out;
    /** @type {string[] | undefined} */
    let unknown;
    for (const key of Object.keys(input)) {
      if (Object.hasOwn(this._shape, key)) continue;
      if (this._unknown === "strict") (unknown ??= []).push(key);
      else if (!UNSAFE_KEYS.has(key)) out[key] = input[key];
    }
    if (unknown) _issue(ctx, "unrecognized_keys", `Unrecognized key${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`, { keys: unknown });
    return out;
  }

  /**
   * A schema with another shape that keeps how this one treats unknown keys.
   * @param {Shape} shape
   * @returns {any}
   * @protected
   */
  _reshape(shape) {
    const copy = new ObjectSchema(shape);
    copy._unknown = this._unknown;
    return copy;
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    /** @type {Record<string, JSONSchema>} */
    const properties = {};
    const required = [];
    for (let i = 0; i < this._keys.length; i++) {
      const child = /** @type {any} */ (this._schemas[i]);
      properties[this._keys[i]] = _jsonOf(child, ctx);
      // any() and unknown() take undefined too, so a key of theirs can be left out
      if (!child._optional && !child._default && child.constructor !== Schema) required.push(this._keys[i]);
    }
    /** @type {JSONSchema} */
    const out = { type: "object", properties };
    if (required.length) out.required = required;
    if (this._unknown === "strict") out.additionalProperties = false;
    return out;
  }

  /** The schema of each key. */
  get shape() {
    return this._shape;
  }

  /**
   * Rejects unknown keys instead of dropping them.
   * @returns {this}
   */
  strict() {
    const copy = this._clone();
    copy._unknown = "strict";
    return copy;
  }

  /**
   * Keeps unknown keys instead of dropping them.
   * @returns {this}
   */
  passthrough() {
    const copy = this._clone();
    copy._unknown = "passthrough";
    return copy;
  }

  /**
   * Adds keys, or replaces existing ones.
   * @template {Shape} M
   * @param {M} more
   * @returns {ObjectSchema<Omit<S, keyof M> & M>}
   */
  extend(more) {
    return this._reshape({ ...this._shape, ...more });
  }

  /**
   * Keeps only some keys.
   * @template {keyof S & string} K
   * @param {readonly K[]} keys
   * @returns {ObjectSchema<Pick<S, K>>}
   */
  pick(keys) {
    /** @type {any} */
    const shape = {};
    for (const key of keys) shape[key] = this._shape[key];
    return this._reshape(shape);
  }

  /**
   * Drops some keys.
   * @template {keyof S & string} K
   * @param {readonly K[]} keys
   * @returns {ObjectSchema<Omit<S, K>>}
   */
  omit(keys) {
    /** @type {any} */
    const shape = { ...this._shape };
    for (const key of keys) delete shape[key];
    return this._reshape(shape);
  }

  /**
   * Makes every key optional, which suits PATCH requests.
   * @returns {ObjectSchema<{ [K in keyof S]: Schema<Infer<S[K]> | undefined> }>}
   */
  partial() {
    /** @type {any} */
    const shape = {};
    for (let i = 0; i < this._keys.length; i++) shape[this._keys[i]] = this._schemas[i].optional();
    return this._reshape(shape);
  }

  /**
   * Makes every key required again: the opposite of `partial()`.
   * @returns {ObjectSchema<{ [K in keyof S]: Schema<Exclude<Infer<S[K]>, undefined>> }>}
   */
  required() {
    /** @type {any} */
    const shape = {};
    for (let i = 0; i < this._keys.length; i++) {
      const copy = /** @type {any} */ (this._schemas[i])._clone();
      copy._optional = false;
      shape[this._keys[i]] = copy;
    }
    return this._reshape(shape);
  }

  /**
   * Combines two object schemas. Keys of the other one win, and so does
   * its way of treating unknown keys.
   *
   * @example
   * const Timestamps = s.object({ createdAt: s.date(), updatedAt: s.date() });
   * const Post = s.object({ title: s.string() }).merge(Timestamps);
   *
   * @template {Shape} M
   * @param {ObjectSchema<M>} other
   * @returns {ObjectSchema<Omit<S, keyof M> & M>}
   */
  merge(other) {
    const copy = /** @type {any} */ (new ObjectSchema({ ...this._shape, ...other._shape }));
    copy._unknown = other._unknown;
    return copy;
  }

  /**
   * A schema that accepts the name of any key: handy for a `sort` or
   * `fields` query parameter.
   *
   * @example
   * const SortBy = User.keyof(); // "name" | "email" | "age" | "role"
   *
   * @returns {LiteralSchema<keyof S & string>}
   */
  keyof() {
    return new LiteralSchema(/** @type {Array<keyof S & string>} */ (this._keys));
  }
}

/**
 * A schema that accepts any of several schemas.
 *
 * @template T
 * @extends {Schema<T>}
 */
class UnionSchema extends Schema {
  /** @param {ReadonlyArray<Schema<any>>} options */
  constructor(options) {
    super();
    /** @protected */
    this._options = options;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    /** @type {import("./errors").ValidationIssue[][]} */
    const failures = [];
    for (const option of this._options) {
      const attempt = { issues: [], path: ctx.path };
      const out = _runChild(option, value, attempt);
      if (!attempt.issues.length) return out;
      failures.push(attempt.issues);
    }
    const typeOnly = failures.every((issues) => issues.length === 1 && issues[0].code === "invalid_type" && issues[0].path.length === ctx.path.length);
    if (typeOnly) {
      const expected = failures.map((issues) => issues[0].expected).join(" | ");
      return _issue(ctx, "invalid_union", `Expected ${expected}, received ${_typeName(value)}`, { expected, received: _typeName(value) });
    }
    const best = failures.reduce((a, b) => (b.length < a.length ? b : a));
    ctx.issues.push(...best);
    return INVALID;
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    return { anyOf: this._options.map((option) => _jsonOf(option, ctx)) };
  }
}

/**
 * A union of objects told apart by one key.
 *
 * @template T
 * @extends {Schema<T>}
 */
class DiscriminatedUnionSchema extends Schema {
  /**
   * @param {string} key
   * @param {ReadonlyArray<ObjectSchema<any>>} options
   */
  constructor(key, options) {
    super();
    /** @protected */
    this._key = key;
    /** @protected */
    this._options = options;
    /** @protected @type {Map<unknown, Schema<any>>} */
    this._byValue = new Map();
    for (const option of options) {
      const values = /** @type {any} */ (option)?._shape?.[key]?._values;
      if (!Array.isArray(values)) throw new TypeError(`discriminatedUnion(): every option must be an object with a literal "${key}"`);
      for (const value of values) {
        if (this._byValue.has(value)) throw new TypeError(`discriminatedUnion(): two options have "${key}" set to ${JSON.stringify(value)}`);
        this._byValue.set(value, option);
      }
    }
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return _typeIssue(ctx, "object", value, this._typeMessage);
    const tag = /** @type {Record<string, unknown>} */ (value)[this._key];
    const option = this._byValue.get(tag);
    if (option) return _runChild(option, value, ctx);
    const expected = [...this._byValue.keys()].map((known) => JSON.stringify(known)).join(" | ");
    ctx.path.push(this._key);
    _issue(ctx, "invalid_union_discriminator", `Expected ${expected}, received ${JSON.stringify(tag) ?? String(tag)}`, { expected, received: _typeName(tag) });
    ctx.path.pop();
    return INVALID;
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    return { oneOf: this._options.map((option) => _jsonOf(option, ctx)), discriminator: { propertyName: this._key } };
  }
}

/**
 * A fixed-length array schema.
 *
 * @template {any[]} T
 * @extends {Schema<T>}
 */
class TupleSchema extends Schema {
  /** @param {ReadonlyArray<Schema<any>>} items */
  constructor(items) {
    super();
    /** @protected */
    this._items = items;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (!Array.isArray(value)) return _typeIssue(ctx, "tuple", value, this._typeMessage);
    if (value.length !== this._items.length) {
      return _issue(ctx, "invalid_length", `Expected ${this._items.length} items, received ${value.length}`);
    }
    const path = ctx.path;
    const out = new Array(this._items.length);
    for (let i = 0; i < out.length; i++) {
      path.push(i);
      out[i] = _runChild(this._items[i], value[i], ctx);
      path.pop();
    }
    return out;
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    return { type: "array", prefixItems: this._items.map((item) => _jsonOf(item, ctx)), items: false, minItems: this._items.length, maxItems: this._items.length };
  }
}

/**
 * A dictionary schema.
 *
 * @template V
 * @extends {Schema<Record<string, V>>}
 */
class RecordSchema extends Schema {
  /**
   * @param {Schema<V>} values
   * @param {Schema<string> | undefined} keys
   */
  constructor(values, keys) {
    super();
    /** @protected */
    this._values = values;
    /** @protected */
    this._keys = keys;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return _typeIssue(ctx, "object", value, this._typeMessage);
    const input = /** @type {Record<string, unknown>} */ (value);
    const path = ctx.path;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const key of Object.keys(input)) {
      if (UNSAFE_KEYS.has(key)) continue;
      path.push(key);
      const k = this._keys ? _runChild(this._keys, key, ctx) : key;
      const v = _runChild(this._values, input[key], ctx);
      path.pop();
      if (typeof k === "string" && !UNSAFE_KEYS.has(k)) out[k] = v;
    }
    return out;
  }

  /**
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    /** @type {JSONSchema} */
    const out = { type: "object", additionalProperties: _jsonOf(this._values, ctx) };
    if (this._keys) out.propertyNames = _jsonOf(this._keys, ctx);
    return out;
  }
}

/**
 * A schema resolved on first use, for recursive data.
 *
 * @template T
 * @extends {Schema<T>}
 */
class LazySchema extends Schema {
  /** @param {() => Schema<T>} getter */
  constructor(getter) {
    super();
    /** @protected */
    this._getter = getter;
    /** @protected @type {Schema<T> | undefined} */
    this._resolved = undefined;
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    const before = ctx.issues.length;
    const out = _runChild((this._resolved ??= this._getter()), value, ctx);
    return ctx.issues.length > before ? INVALID : out;
  }

  /**
   * A schema that refers to itself can't be written inline: it goes under
   * `$defs` and is pointed at.
   * @param {_JSONContext} ctx
   * @returns {JSONSchema}
   * @override
   * @protected
   */
  _json(ctx) {
    const target = (this._resolved ??= this._getter());
    let name = ctx.names.get(target);
    if (!name) {
      name = `schema${ctx.names.size + 1}`;
      ctx.names.set(target, name);
      ctx.defs[name] = _jsonOf(target, ctx);
    }
    return { $ref: `#/$defs/${name}` };
  }
}

/**
 * A string schema.
 *
 * @example
 * s.string().trim().min(1).max(100);
 * s.string().email();
 *
 * @param {{ message?: Message }} [options] Message when the value isn't a string.
 * @returns {StringSchema}
 */
function string(options = {}) {
  const schema = new StringSchema();
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * A number. `NaN` and `Infinity` are refused.
 *
 * @example
 * s.number().int().min(0).max(120);
 *
 * @param {{ message?: Message }} [options] Message when the value isn't a number.
 * @returns {NumberSchema}
 */
function number(options = {}) {
  const schema = new NumberSchema();
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * A boolean schema.
 *
 * @param {{ message?: Message }} [options]
 * @returns {BooleanSchema}
 */
function boolean(options = {}) {
  const schema = new BooleanSchema();
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * A bigint schema.
 *
 * @param {{ message?: Message }} [options]
 * @returns {BigIntSchema}
 */
function bigint(options = {}) {
  const schema = new BigIntSchema();
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * A valid `Date`.
 *
 * @example
 * s.date().min("2024-01-01");
 *
 * @param {{ message?: Message }} [options]
 * @returns {DateSchema}
 */
function date(options = {}) {
  const schema = new DateSchema();
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * Exactly this value.
 *
 * @example
 * s.object({ type: s.literal("circle"), radius: s.number() });
 *
 * @template {string | number | boolean | bigint | null | undefined} L
 * @param {L} value
 * @returns {LiteralSchema<L>}
 */
function literal(value) {
  return new LiteralSchema([value]);
}

/**
 * One of these values. The type is their union.
 *
 * @example
 * const Role = s.enum(["admin", "editor", "viewer"]); // Schema<"admin" | "editor" | "viewer">
 * Role.options; // ["admin", "editor", "viewer"]
 *
 * @template {string | number} V
 * @param {readonly V[]} values
 * @param {{ message?: Message }} [options]
 * @returns {LiteralSchema<V>}
 */
function enumeration(values, options = {}) {
  const schema = new LiteralSchema(values);
  /** @type {any} */ (schema)._typeMessage = options.message;
  return schema;
}

/**
 * An array whose items all match `item`.
 *
 * @example
 * s.array(s.string()).min(1).max(10).unique();
 *
 * @template T
 * @param {Schema<T>} item
 * @returns {ArraySchema<T>}
 */
function array(item) {
  return new ArraySchema(item);
}

/**
 * An object with known keys. Unknown keys are dropped; `.strict()` rejects
 * them and `.passthrough()` keeps them.
 *
 * @example
 * const Address = s.object({ street: s.string(), zip: s.string().regex(/^\d{5}$/), city: s.string() });
 *
 * @template {Shape} S
 * @param {S} shape
 * @returns {ObjectSchema<S>}
 */
function object(shape) {
  return new ObjectSchema(shape);
}

/**
 * Matches any of these schemas; the first that fits wins.
 *
 * @example
 * s.union([s.string(), s.number()]); // Schema<string | number>
 *
 * @template {ReadonlyArray<Schema<any>>} U
 * @param {U} options
 * @returns {UnionSchema<Infer<U[number]>>}
 */
function union(options) {
  return new UnionSchema(options);
}

/**
 * A union of objects told apart by one key, like the `type` of an event.
 * Unlike `union()`, it goes straight to the right schema, and a wrong
 * object gets the errors of the kind it claims to be.
 *
 * @example
 * const Event = s.discriminatedUnion("type", [
 *   s.object({ type: s.literal("click"), x: s.number(), y: s.number() }),
 *   s.object({ type: s.literal("key"), key: s.string() }),
 * ]);
 * Event.parse({ type: "key", key: "Enter" });
 *
 * @template {ReadonlyArray<ObjectSchema<any>>} U
 * @param {string} key The key every option has, with a different literal in each.
 * @param {U} options
 * @returns {DiscriminatedUnionSchema<Infer<U[number]>>}
 */
function discriminatedUnion(key, options) {
  return new DiscriminatedUnionSchema(key, options);
}

/**
 * A fixed-length array with one schema per position.
 *
 * @example
 * s.tuple([s.number(), s.number()]); // Schema<[number, number]>
 *
 * @template {[Schema<any>, ...Schema<any>[]] | []} T
 * @param {T} items
 * @returns {TupleSchema<{ -readonly [K in keyof T]: Infer<T[K]> }>}
 */
function tuple(items) {
  return /** @type {any} */ (new TupleSchema(items));
}

/**
 * An object with any keys whose values match a schema, like a dictionary.
 *
 * @example
 * s.record(s.number());                                // Record<string, number>
 * s.record(s.boolean(), s.string().regex(/^[a-z]+$/)); // keys checked too
 *
 * @template V
 * @param {Schema<V>} values
 * @param {Schema<string>} [keys]
 * @returns {RecordSchema<V>}
 */
function record(values, keys) {
  return new RecordSchema(values, keys);
}

/**
 * A schema defined later, for recursive data like trees.
 *
 * @example
 * const Category = s.object({
 *   name: s.string(),
 *   children: s.lazy(() => s.array(Category)).default([]),
 * });
 *
 * @template T
 * @param {() => Schema<T>} getter
 * @returns {LazySchema<T>}
 */
function lazy(getter) {
  return new LazySchema(getter);
}

/**
 * An instance of a class.
 *
 * @example
 * s.instanceOf(URL);
 *
 * @template {new (...args: any[]) => any} C
 * @param {C} ctor
 * @param {Message} [message]
 * @returns {CustomSchema<InstanceType<C>>}
 */
function instanceOf(ctor, message = `Expected an instance of ${ctor.name}`) {
  return new CustomSchema((value) => value instanceof ctor, message, ctor.name);
}

/**
 * A schema from any test, usually a type guard.
 *
 * @example
 * const Color = s.custom(nc.isHexColor, "Expected a hex color");
 *
 * @template [T=unknown]
 * @param {((value: unknown) => value is T) | ((value: unknown) => boolean)} test
 * @param {Message} [message]
 * @returns {CustomSchema<T>}
 */
function custom(test, message = "Invalid value") {
  return new CustomSchema(test, message, "custom");
}

/**
 * Anything, typed as `any`.
 * @returns {Schema<any>}
 */
function any() {
  return new Schema();
}

/**
 * Anything, typed as `unknown`.
 * @returns {Schema<unknown>}
 */
function unknown() {
  return new Schema();
}

/**
 * The `s.coerce` builders.
 * @typedef {object} CoerceBuilders
 * @property {() => StringSchema} string A string schema that turns any value into a string first.
 * @property {() => NumberSchema} number A number schema that converts strings like `"42"`, booleans and dates first.
 * @property {() => BooleanSchema} boolean A boolean schema that understands `"true"`, `"1"`, `"yes"`, `"on"` and their opposites.
 * @property {() => DateSchema} date A date schema that converts ISO strings and timestamps.
 * @property {() => BigIntSchema} bigint A bigint schema that converts numeric strings and integers.
 */

/**
 * Schemas that convert their input before checking it. Query strings, form
 * fields and environment variables are always strings, so this is what you
 * want for them.
 *
 * @example
 * const Query = s.object({
 *   page: s.coerce.number().int().min(1).default(1),
 *   active: s.coerce.boolean().default(false),
 * });
 * Query.parse({ page: "2", active: "true" }); // { page: 2, active: true }
 *
 * @type {CoerceBuilders}
 */
const coerce = {
  /**
   * @returns {StringSchema}
   */
  string() {
    const schema = new StringSchema();
    /** @type {any} */ (schema)._coerce = true;
    return schema;
  },
  /**
   * @returns {NumberSchema}
   */
  number() {
    const schema = new NumberSchema();
    /** @type {any} */ (schema)._coerce = true;
    return schema;
  },
  /**
   * @returns {BooleanSchema}
   */
  boolean() {
    const schema = new BooleanSchema();
    /** @type {any} */ (schema)._coerce = true;
    return schema;
  },
  /**
   * @returns {DateSchema}
   */
  date() {
    const schema = new DateSchema();
    /** @type {any} */ (schema)._coerce = true;
    return schema;
  },
  /**
   * @returns {BigIntSchema}
   */
  bigint() {
    const schema = new BigIntSchema();
    /** @type {any} */ (schema)._coerce = true;
    return schema;
  },
};

module.exports = {
  string,
  number,
  boolean,
  bigint,
  date,
  literal,
  enum: enumeration,
  array,
  object,
  union,
  discriminatedUnion,
  tuple,
  record,
  lazy,
  instanceOf,
  custom,
  any,
  unknown,
  coerce,
  Schema,
};
