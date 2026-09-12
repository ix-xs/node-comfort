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
 * const result = User.safeParse(input); // { success, data } or { success, error }
 */

const { ValidationError } = require("./errors.js");
const { types } = require("node:util");

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
 * What `safeParse()` returns.
 * @template T
 * @typedef {{ success: true, data: T, error?: undefined } | { success: false, data?: undefined, error: ValidationError }} SafeParseResult
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
 * A step in a schema: a check, a transformation or a refinement.
 * @typedef {{ kind: "check", test: (value: any) => boolean, code: string, message: Message, details?: Record<string, unknown> } | { kind: "transform", fn: (value: any) => any } | { kind: "refine", test: (value: any) => boolean, options: RefineOptions }} Step
 */

const INVALID = Symbol("invalid");

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
      value = typeof def === "function" ? def() : structuredClone(def);
    }
    if (value === undefined && this._optional) return undefined;
    if (value === null && this._nullable) return null;
    const before = ctx.issues.length;
    let out = this._check(value, ctx);
    if (ctx.issues.length === before) {
      for (const step of this._steps) {
        if (step.kind === "transform") {
          if (ctx.issues.length > before) break;
          out = step.fn(out);
        } else if (step.kind === "check") {
          if (!step.test(out)) _issue(ctx, step.code, _message(step.message, out), step.details);
        } else if (ctx.issues.length === before && !step.test(out)) {
          const saved = ctx.path;
          ctx.path = [...ctx.path, ...(step.options.path ?? [])];
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
    const ctx = { issues: [], path: [] };
    const out = this._run(value, ctx);
    if (ctx.issues.length) return { success: false, error: new ValidationError(ctx.issues) };
    return { success: true, data: /** @type {T} */ (out) };
  }

  /**
   * Is the value valid? Works as a type guard. Transformations don't run.
   *
   * @example
   * if (Email.is(input)) sendMail(input); // input is a string here
   *
   * @param {unknown} value
   * @returns {value is T}
   */
  is(value) {
    return this.safeParse(value).success;
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
   * @returns {this}
   * @protected
   */
  _rule(test, code, message, details) {
    return this._with({ kind: "check", test, code, message, details });
  }

  /**
   * At least `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  min(length, message = `Must contain at least ${length} character${length > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length >= length, "too_small", message, { minimum: length });
  }

  /**
   * At most `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  max(length, message = `Must contain at most ${length} character${length > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length <= length, "too_big", message, { maximum: length });
  }

  /**
   * Exactly `length` characters.
   * @param {number} length
   * @param {Message} [message]
   * @returns {this}
   */
  length(length, message = `Must contain exactly ${length} characters`) {
    return this._rule((v) => v.length === length, "invalid_length", message, { exact: length });
  }

  /**
   * Not the empty string.
   * @param {Message} [message]
   * @returns {this}
   */
  nonempty(message = "Must not be empty") {
    return this._rule((v) => v.length > 0, "too_small", message, { minimum: 1 });
  }

  /**
   * A valid email address.
   * @param {Message} [message]
   * @returns {this}
   */
  email(message = "Invalid email address") {
    const { isEmail } = require("./Checker.js");
    return this._rule(isEmail, "invalid_string", message, { validation: "email" });
  }

  /**
   * An absolute URL.
   * @param {Message | { message?: Message, protocols?: string[] }} [options] A message, or allowed protocols (http and https by default).
   * @returns {this}
   */
  url(options = "Invalid URL") {
    const opts = typeof options === "object" ? options : { message: options };
    const { isURL } = require("./Checker.js");
    return this._rule((v) => isURL(v, { protocols: opts.protocols }), "invalid_string", opts.message ?? "Invalid URL", { validation: "url" });
  }

  /**
   * A UUID.
   * @param {Message} [message]
   * @returns {this}
   */
  uuid(message = "Invalid UUID") {
    const { isUUID } = require("./Checker.js");
    return this._rule((v) => isUUID(v), "invalid_string", message, { validation: "uuid" });
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
    return this._rule((v) => isIP(v, version), "invalid_string", typeof versionOrMessage === "number" ? message : versionOrMessage ?? message, { validation: "ip" });
  }

  /**
   * An ISO 8601 date or date-time, like `2024-01-31T10:00:00Z`.
   * @param {Message} [message]
   * @returns {this}
   */
  datetime(message = "Invalid ISO date") {
    const { isISODate } = require("./Checker.js");
    return this._rule(isISODate, "invalid_string", message, { validation: "datetime" });
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
    }, "invalid_string", message, { validation: "regex" });
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
   * @returns {this}
   * @protected
   */
  _rule(test, code, message, details) {
    return this._with({ kind: "check", test, code, message, details });
  }

  /**
   * At least `value`.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  min(value, message = `Must be greater than or equal to ${value}`) {
    return this._rule((v) => v >= value, "too_small", message, { minimum: value });
  }

  /**
   * At most `value`.
   * @param {number} value
   * @param {Message} [message]
   * @returns {this}
   */
  max(value, message = `Must be less than or equal to ${value}`) {
    return this._rule((v) => v <= value, "too_big", message, { maximum: value });
  }

  /**
   * An integer.
   * @param {Message} [message]
   * @returns {this}
   */
  int(message = "Must be an integer") {
    return this._rule(Number.isInteger, "invalid_type", message, { expected: "integer" });
  }

  /**
   * Greater than 0.
   * @param {Message} [message]
   * @returns {this}
   */
  positive(message = "Must be positive") {
    return this._rule((v) => v > 0, "too_small", message, { minimum: 0, exclusive: true });
  }

  /**
   * 0 or more.
   * @param {Message} [message]
   * @returns {this}
   */
  nonnegative(message = "Must not be negative") {
    return this._rule((v) => v >= 0, "too_small", message, { minimum: 0 });
  }

  /**
   * Less than 0.
   * @param {Message} [message]
   * @returns {this}
   */
  negative(message = "Must be negative") {
    return this._rule((v) => v < 0, "too_big", message, { maximum: 0, exclusive: true });
  }

  /**
   * A multiple of `step`.
   * @param {number} step
   * @param {Message} [message]
   * @returns {this}
   */
  multipleOf(step, message = `Must be a multiple of ${step}`) {
    return this._rule((v) => Math.abs(v / step - Math.round(v / step)) < 1e-9, "not_multiple_of", message, { multipleOf: step });
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
      if (["true", "1", "yes", "on", "y"].includes(text)) return true;
      if (["false", "0", "no", "off", "n", ""].includes(text)) return false;
    }
    return _typeIssue(ctx, "boolean", value, this._typeMessage);
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
  }

  /**
   * @param {unknown} value
   * @param {ParseContext} ctx
   * @returns {unknown}
   * @override
   * @protected
   */
  _check(value, ctx) {
    if (this._values.some((v) => Object.is(v, value))) return value;
    const list = this._values.map((v) => JSON.stringify(v)).join(" | ");
    const code = this._values.length > 1 ? "invalid_enum_value" : "invalid_literal";
    return _issue(ctx, code, this._typeMessage ? _message(this._typeMessage, value) : `Expected ${list}, received ${JSON.stringify(value) ?? String(value)}`, { expected: list, received: _typeName(value) });
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
    const out = [];
    for (let i = 0; i < value.length; i++) {
      const saved = ctx.path;
      ctx.path = [...saved, i];
      out.push(_runChild(this._item, value[i], ctx));
      ctx.path = saved;
    }
    return out;
  }

  /**
   * @param {(v: T[]) => boolean} test
   * @param {string} code
   * @param {Message} message
   * @returns {this}
   * @protected
   */
  _rule(test, code, message) {
    return this._with({ kind: "check", test, code, message });
  }

  /**
   * At least `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  min(count, message = `Must contain at least ${count} item${count > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length >= count, "too_small", message);
  }

  /**
   * At most `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  max(count, message = `Must contain at most ${count} item${count > 1 ? "s" : ""}`) {
    return this._rule((v) => v.length <= count, "too_big", message);
  }

  /**
   * Exactly `count` items.
   * @param {number} count
   * @param {Message} [message]
   * @returns {this}
   */
  length(count, message = `Must contain exactly ${count} items`) {
    return this._rule((v) => v.length === count, "invalid_length", message);
  }

  /**
   * At least one item.
   * @param {Message} [message]
   * @returns {this}
   */
  nonempty(message = "Must not be empty") {
    return this._rule((v) => v.length > 0, "too_small", message);
  }

  /**
   * No duplicates, compared by value or by a key.
   * @param {((item: T) => unknown) | Message} [keyOrMessage] A function returning the key, or a message.
   * @param {Message} [message]
   * @returns {this}
   */
  unique(keyOrMessage, message = "Must not contain duplicates") {
    const key = typeof keyOrMessage === "function" && keyOrMessage.length === 1 ? /** @type {(item: T) => unknown} */ (keyOrMessage) : (/** @type {T} */ item) => item;
    const msg = typeof keyOrMessage === "string" ? keyOrMessage : message;
    return this._rule((v) => new Set(v.map(key)).size === v.length, "not_unique", msg);
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
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, schema] of Object.entries(this._shape)) {
      const saved = ctx.path;
      ctx.path = [...saved, key];
      const result = _runChild(schema, input[key], ctx);
      ctx.path = saved;
      if (result !== undefined || Object.prototype.hasOwnProperty.call(input, key)) out[key] = result;
    }
    const unknownKeys = Object.keys(input).filter((key) => !(key in this._shape));
    if (unknownKeys.length) {
      if (this._unknown === "strict") _issue(ctx, "unrecognized_keys", `Unrecognized key${unknownKeys.length > 1 ? "s" : ""}: ${unknownKeys.join(", ")}`, { keys: unknownKeys });
      else if (this._unknown === "passthrough") {
        for (const key of unknownKeys) if (key !== "__proto__" && key !== "constructor" && key !== "prototype") out[key] = input[key];
      }
    }
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
    const copy = /** @type {any} */ (object({ ...this._shape, ...more }));
    copy._unknown = this._unknown;
    return copy;
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
    return object(shape);
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
    return object(shape);
  }

  /**
   * Makes every key optional, which suits PATCH requests.
   * @returns {ObjectSchema<{ [K in keyof S]: Schema<Infer<S[K]> | undefined> }>}
   */
  partial() {
    /** @type {any} */
    const shape = {};
    for (const [key, schema] of Object.entries(this._shape)) shape[key] = schema.optional();
    return object(shape);
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
    return this._items.map((schema, i) => {
      const saved = ctx.path;
      ctx.path = [...saved, i];
      const out = _runChild(schema, value[i], ctx);
      ctx.path = saved;
      return out;
    });
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
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      const saved = ctx.path;
      ctx.path = [...saved, key];
      const k = this._keys ? _runChild(this._keys, key, ctx) : key;
      const v = _runChild(this._values, item, ctx);
      ctx.path = saved;
      if (typeof k === "string") out[k] = v;
    }
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
    const out = _runChild(this._getter(), value, ctx);
    return ctx.issues.length > before ? INVALID : out;
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
