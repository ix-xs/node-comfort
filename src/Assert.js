"use strict";

/**
 * Assertions: they throw an `AssertionError` when something doesn't hold,
 * and tell TypeScript (and your editor, in JavaScript too) what holds after
 * them. `nc.assert(value, message)` checks a condition, `nc.assert.type()`
 * checks a value with a guard like `nc.is.string`.
 *
 * @example
 * const user = users.find((u) => u.id === id);
 * nc.assert(user, `User ${id} not found`);
 * nc.assert.type(config.port, nc.is.integer, "port must be an integer");
 */

/**
 * Throws an `AssertionError` if `condition` is falsy. Afterwards, TypeScript
 * knows the condition holds.
 *
 * @example
 * const user = users.find((u) => u.id === id);
 * nc.assert(user, `User ${id} not found`);
 * user.name; // no "possibly undefined" here
 *
 * @param {unknown} condition
 * @param {string | (() => string)} [message="Assertion failed"] A message, or a function that builds it.
 * @returns {asserts condition}
 * @throws {AssertionError}
 */
function assert(condition, message = "Assertion failed") {
  if (!condition) throw new (require("./errors.js").AssertionError)(typeof message === "function" ? message() : message);
}

/**
 * How a guard is called in 3.0: `nc.is.integer` rather than the name of its function.
 * @param {Function} guard
 * @returns {string}
 */
const _guardName = (guard) => {
  const is = require("./Is.js");
  const key = Object.keys(is).find((name) => /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (is))[name] === guard);
  return key ? `nc.is.${key}` : guard.name || "the type guard";
};

/**
 * Throws an `AssertionError` unless `value` passes `guard`. Afterwards,
 * `value` has the guarded type.
 *
 * @example
 * nc.assert.type(config.port, nc.is.integer, "port must be an integer");
 * nc.assert.type(body.tags, (v) => nc.is.arrayOf(v, nc.is.string));
 *
 * @template T
 * @param {unknown} value
 * @param {(value: unknown) => value is T} guard A check like `nc.is.string`.
 * @param {string | (() => string)} [message] A message, or a function that builds it. Defaults to one that names the guard.
 * @returns {asserts value is T}
 * @throws {AssertionError}
 */
assert.type = function assertType(value, guard, message) {
  if (!guard(value)) {
    const text = typeof message === "function" ? message() : message;
    throw new (require("./errors.js").AssertionError)(text ?? `Expected value to pass ${_guardName(guard)}`);
  }
};

module.exports = assert;
