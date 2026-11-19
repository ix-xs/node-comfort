"use strict";

/**
 * JSON that doesn't throw when you don't want it to: `parse` takes a
 * fallback and reads JSON with comments, `stringify` handles circular
 * references, bigints, Maps, Sets and errors.
 *
 * @example
 * const settings = nc.json.parse(text, {});
 * const tsconfig = nc.json.parse(text, {}, { comments: true });
 * nc.json.stringify({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
 */

const core = require("./internal/json.js");

/**
 * Options for `parse()`.
 * @typedef {object} JSONParseOptions
 * @property {(this: any, key: string, value: any) => any} [reviver] Passed to `JSON.parse`.
 * @property {boolean} [comments] Accept comments and trailing commas, like in `tsconfig.json`.
 */

/**
 * Options for `stringify()`.
 * @typedef {object} JSONStringifyOptions
 * @property {number} [spaces] Indentation. Defaults to `4`; use `0` for a single line.
 */

/**
 * `JSON.parse` with an optional fallback. With a second argument, even
 * `undefined`, invalid input returns it instead of throwing. A leading byte
 * order mark, which Windows editors like to add, is ignored.
 *
 * @example
 * nc.json.parse('{"a":1}');    // { a: 1 }
 * nc.json.parse("oops", null); // null
 * nc.json.parse("oops");       // throws SyntaxError
 * nc.json.parse(text, {}, { comments: true });
 * nc.json.parse(text, {}, (key, value) => (key === "at" ? new Date(value) : value));
 *
 * @template [T=any]
 * @param {string} text
 * @param {T} [fallback] Returned when `text` isn't valid JSON.
 * @param {JSONParseOptions | ((this: any, key: string, value: any) => any)} [options] Options, or a reviver passed to `JSON.parse`.
 * @returns {T}
 * @throws {SyntaxError} If `text` is invalid and there's no fallback.
 */
function parse(text, fallback, options) {
  const settings = typeof options === "function" ? { reviver: options } : options ?? {};
  return core.parse(text, arguments.length >= 2, fallback, settings.reviver, settings.comments === true);
}

/**
 * `JSON.stringify` that never throws. Circular references become
 * `"[Circular]"`, bigints become strings, Maps become objects, Sets become
 * arrays, and errors keep their name, message and stack. It indents with 4
 * spaces by default (`nc.fs.writeJSON()` writes files with 2).
 *
 * @example
 * nc.json.stringify({ a: 1 });                             // '{\n    "a": 1\n}'
 * nc.json.stringify({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
 * nc.json.stringify({ error: new Error("boom") }, { spaces: 2 });
 *
 * @param {unknown} value
 * @param {number | JSONStringifyOptions} [options=4] Indentation, or options. Use `0` for a single line.
 * @returns {string} The JSON text, or `"undefined"` for values JSON can't represent.
 */
function stringify(value, options = 4) {
  const spaces = typeof options === "object" && options !== null ? options.spaces ?? 4 : options;
  return core.stringify(value, spaces);
}

module.exports = {
  parse,
  stringify,
};
