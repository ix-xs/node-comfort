"use strict";

/**
 * The everyday helpers of node-comfort 2. Deprecated: `wait` is now
 * `nc.async.sleep()`, `when` is `nc.async.when()`, `dontCrash` is
 * `nc.sys.dontCrash()`, `JSONString` and `JSONParse` are
 * `nc.json.stringify()` and `nc.json.parse()`. Each name warns once when it
 * is used, and they will be removed in 4.0.
 *
 * @example
 * await nc.async.sleep("1.5s"); // instead of nc.wait("1.5s")
 */

const asyncModule = require("./Async.js");
const sys = require("./Sys.js");
const core = require("./internal/json.js");
const { deprecate } = require("./internal/deprecate.js");

/**
 * @deprecated Use `nc.async.sleep()`. It will be removed in 4.0.
 * @type {typeof asyncModule.sleep}
 */
const wait = asyncModule.sleep;

/**
 * @deprecated Use `nc.async.when()`. It will be removed in 4.0.
 * @type {typeof asyncModule.when}
 */
const when = asyncModule.when;

/**
 * @deprecated Use `nc.sys.dontCrash()`. It will be removed in 4.0.
 * @type {typeof sys.dontCrash}
 */
const dontCrash = sys.dontCrash;

/**
 * `JSON.stringify` that never throws. Circular references become
 * `"[Circular]"`, bigints become strings, Maps become objects, Sets become
 * arrays, and errors keep their name, message and stack.
 *
 * @example
 * nc.JSONString({ a: 1 });                          // '{\n    "a": 1\n}'
 * nc.JSONString({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
 * nc.JSONString({ error: new Error("boom") }, 0);   // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
 *
 * @param {unknown} value
 * @param {number} [spaces=4] Indentation. Use `0` for a single line.
 * @returns {string} The JSON text, or `"undefined"` for values JSON can't represent.
 *
 * @deprecated Use `nc.json.stringify()`. It will be removed in 4.0.
 */
function JSONString(value, spaces = 4) {
  return core.stringify(value, spaces);
}

/**
 * `JSON.parse` with an optional fallback. With a fallback, invalid input
 * returns it instead of throwing. A leading byte order mark, which Windows
 * editors like to add, is ignored.
 *
 * @example
 * nc.JSONParse('{"a":1}');    // { a: 1 }
 * nc.JSONParse("oops", null); // null
 * nc.JSONParse("oops");       // throws SyntaxError
 * nc.JSONParse(text, {}, (key, value) => (key === "at" ? new Date(value) : value));
 *
 * @template [T=any]
 * @param {string} text
 * @param {T} [fallback] Returned when `text` isn't valid JSON.
 * @param {(this: any, key: string, value: any) => any} [reviver] Passed to `JSON.parse`.
 * @returns {T}
 * @throws {SyntaxError} If `text` is invalid and there's no fallback.
 *
 * @deprecated Use `nc.json.parse()`. It will be removed in 4.0.
 */
function JSONParse(text, fallback, reviver) {
  return core.parse(text, arguments.length >= 2, fallback, reviver, false);
}

module.exports = {
  wait,
  when,
  dontCrash,
  JSONString,
  JSONParse,
};

deprecate(module.exports, "nc.utils", {
  wait: { use: "nc.async.sleep()" },
  when: { use: "nc.async.when()" },
  dontCrash: { use: "nc.sys.dontCrash()" },
  JSONString: { use: "nc.json.stringify()" },
  JSONParse: { use: "nc.json.parse()" },
});
