"use strict";

/**
 * Checks that return a boolean. Each one accepts anything and never throws,
 * and most of them are type guards: inside `if (nc.is.string(value))`, your
 * editor knows `value` is a string, in JavaScript too. To throw instead,
 * use `nc.assert()`.
 *
 * @example
 * if (nc.is.email(body.email) && nc.is.port(body.port)) connect(body);
 * nc.is.uuid(id, { version: 4 });
 * nc.is.arrayOf(tags, nc.is.string);
 */

const { types } = require("node:util");
const shared = require("./internal/shared.js");

/** @type {typeof import("node:net") | undefined} */
let _net;
/** @type {typeof import("node:url") | undefined} */
let _url;

// No "i" flag: with "u", it would let the Kelvin sign match "k" and the long s match "s".
const EMAIL = /^(?!\.)(?!.*\.\.)[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]{1,64}(?<!\.)@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:\p{L}{2,}|[xX][nN]--[A-Za-z0-9-]{2,})$/u;
// The same rules for ASCII addresses, the common case, which need no further check.
const EMAIL_ASCII = /^(?!\.)(?!.*\.\.)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,}|[xX][nN]--[A-Za-z0-9-]{2,})$/;
const TLD = /\.(?:[a-z]{2,}|xn--[a-z0-9-]{2,})\.?$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_NIL_OR_MAX = /^(?:0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|([+-])(\d{2}):?(\d{2}))?)?$/;
const HOST_LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
// Characters a URL parser silently drops, encodes or rewrites.
// The apostrophe is legal, as in /wiki/Ender's_Game.
const URL_UNSAFE = /[\x00-\x20\x7f<>"`\\]/;
// Quoted and bare parameter values can't overlap, so there is nothing to backtrack into.
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*(?:\s*;\s*[a-z0-9-]+=(?:"[^"\r\n]*"|[^;\s"]+))*$/i;
const DATA_URL = /^data:(?:[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+)?(?:;[a-z0-9-]+=[^;,]*)*(?:;base64)?,/i;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Any built-in typed array.
 * @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array} AnyTypedArray
 */

/**
 * Any primitive value.
 * @typedef {string | number | boolean | symbol | bigint | null | undefined} Primitive
 */

/**
 * Options for `is.url()`.
 * @typedef {object} IsURLOptions
 * @property {string[]} [protocols] Accepted protocols, colon included. Defaults to `["http:", "https:"]`.
 * @property {boolean} [requireTld] Require a domain like `example.com`, rejecting `localhost` and bare IPs.
 */

/**
 * Options for `is.uuid()`.
 * @typedef {object} IsUUIDOptions
 * @property {1|2|3|4|5|6|7|8} [version] Only accept this version. Otherwise versions 1 to 8 pass, plus the nil and max UUIDs.
 */

/**
 * Options for `is.hostname()`.
 * @typedef {object} IsHostnameOptions
 * @property {boolean} [requireTld] Require a domain like `example.com`, rejecting `localhost`.
 */

/**
 * Options for `is.base64()`.
 * @typedef {object} IsBase64Options
 * @property {boolean} [urlSafe] Expect the URL-safe alphabet (`-` and `_`), padding optional.
 */

/**
 * Options for `is.dataUrl()`.
 * @typedef {object} IsDataURLOptions
 * @property {string[]} [types] Accepted media types, like `["image/png", "image/jpeg"]`, case ignored. A URL without a type, like `data:,Hello`, counts as `text/plain`. Without this option, any type passes.
 */

/**
 * Is it an array?
 *
 * @example
 * nc.is.array([1, 2]);        // true
 * nc.is.array({ length: 0 }); // false
 *
 * @param {unknown} value
 * @returns {value is any[]}
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Is it a number? `NaN` is rejected, `Infinity` passes (see `is.finite`).
 *
 * @example
 * nc.is.number(42);   // true
 * nc.is.number(NaN);  // false
 * nc.is.number("42"); // false, use is.numeric for strings
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Is it a finite number? Unlike the global `isFinite`, strings are rejected.
 *
 * @example
 * nc.is.finite(42);       // true
 * nc.is.finite(Infinity); // false
 * nc.is.finite("42");     // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isFinite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Is it an integer?
 *
 * @example
 * nc.is.integer(4);   // true
 * nc.is.integer(4.5); // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isInteger(value) {
  return Number.isInteger(value);
}

/**
 * Is it an integer JavaScript can represent exactly (up to 2^53 - 1)?
 *
 * @example
 * nc.is.safeInteger(2 ** 53 - 1); // true
 * nc.is.safeInteger(2 ** 53);     // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isSafeInteger(value) {
  return Number.isSafeInteger(value);
}

/**
 * Is it a finite number with a decimal part?
 *
 * @example
 * nc.is.float(4.2); // true
 * nc.is.float(4);   // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isFloat(value) {
  return typeof value === "number" && Number.isFinite(value) && !Number.isInteger(value);
}

/**
 * Is it a number greater than zero?
 *
 * @example
 * nc.is.positive(3); // true
 * nc.is.positive(0); // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isPositive(value) {
  return typeof value === "number" && value > 0;
}

/**
 * Is it a number lower than zero?
 *
 * @example
 * nc.is.negative(-3); // true
 * nc.is.negative(0);  // false
 *
 * @param {unknown} value
 * @returns {value is number}
 */
function isNegative(value) {
  return typeof value === "number" && value < 0;
}

/**
 * Is it `true` or `false`? Truthy and falsy values don't count.
 *
 * @example
 * nc.is.boolean(false); // true
 * nc.is.boolean(0);     // false
 *
 * @param {unknown} value
 * @returns {value is boolean}
 */
function isBoolean(value) {
  return typeof value === "boolean";
}

/**
 * Is it a string?
 *
 * @example
 * nc.is.string("hello");             // true
 * nc.is.string(new String("hello")); // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isString(value) {
  return typeof value === "string";
}

/**
 * Is it a symbol?
 *
 * @param {unknown} value
 * @returns {value is symbol}
 */
function isSymbol(value) {
  return typeof value === "symbol";
}

/**
 * Is it a bigint?
 *
 * @example
 * nc.is.bigInt(10n); // true
 * nc.is.bigInt(10);  // false
 *
 * @param {unknown} value
 * @returns {value is bigint}
 */
function isBigInt(value) {
  return typeof value === "bigint";
}

/**
 * Is it `undefined`?
 *
 * @param {unknown} value
 * @returns {value is undefined}
 */
function isUndefined(value) {
  return value === undefined;
}

/**
 * Is it `null`?
 *
 * @param {unknown} value
 * @returns {value is null}
 */
function isNull(value) {
  return value === null;
}

/**
 * Is it `null` or `undefined`?
 *
 * @example
 * nc.is.nil(undefined); // true
 * nc.is.nil(0);         // false
 *
 * @param {unknown} value
 * @returns {value is null | undefined}
 */
function isNil(value) {
  return value === null || value === undefined;
}

/**
 * Is it anything but `null` or `undefined`? Pass it to `filter()` to drop
 * missing values and keep the right type.
 *
 * @example
 * const ids = [1, null, 2, undefined].filter(nc.is.defined); // number[]
 *
 * @template T
 * @param {T} value
 * @returns {value is NonNullable<T>}
 */
function isDefined(value) {
  return value !== null && value !== undefined;
}

/**
 * Is it a primitive (string, number, boolean, symbol, bigint, `null` or `undefined`)?
 *
 * @param {unknown} value
 * @returns {value is Primitive}
 */
function isPrimitive(value) {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

/**
 * Is it callable? Classes, async and generator functions count.
 *
 * @param {unknown} value
 * @returns {value is (...args: any[]) => any}
 */
function isFunction(value) {
  return typeof value === "function";
}

/**
 * Was it declared with `async`? A function that merely returns a promise
 * doesn't count.
 *
 * @example
 * nc.is.asyncFunction(async () => {});         // true
 * nc.is.asyncFunction(() => Promise.resolve()); // false
 *
 * @param {unknown} value
 * @returns {value is (...args: any[]) => Promise<any>}
 */
function isAsyncFunction(value) {
  return types.isAsyncFunction(value);
}

/**
 * Is it a generator function (`function*`)?
 *
 * @param {unknown} value
 * @returns {value is (...args: any[]) => Generator}
 */
function isGeneratorFunction(value) {
  return types.isGeneratorFunction(value);
}

/**
 * Is it a generator object, the result of calling a `function*`?
 *
 * @param {unknown} value
 * @returns {value is Generator}
 */
function isGenerator(value) {
  return types.isGeneratorObject(value);
}

/**
 * Is it a `class` rather than a plain function?
 *
 * @example
 * nc.is.class(class User {});  // true
 * nc.is.class(function () {}); // false
 *
 * @param {unknown} value
 * @returns {value is new (...args: any[]) => any}
 */
function isClass(value) {
  return typeof value === "function" && /^class[\s{]/.test(Function.prototype.toString.call(value));
}

/**
 * Is it an object, and not `null`? Arrays, dates and class instances count;
 * use `is.plainObject` for `{}` literals only.
 *
 * @param {unknown} value
 * @returns {value is object}
 */
function isObject(value) {
  return typeof value === "object" && value !== null;
}

/**
 * Is it a plain object, made with `{}`, `new Object()` or
 * `Object.create(null)`? Arrays, dates, maps and class instances are rejected.
 *
 * @example
 * nc.is.plainObject({ a: 1 });   // true
 * nc.is.plainObject(new Date()); // false
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return shared.isPlainObject(value);
}

/**
 * Can it be awaited like a promise (anything with a `then` method)?
 *
 * @param {unknown} value
 * @returns {value is PromiseLike<any>}
 */
function isPromise(value) {
  return (
    types.isPromise(value) ||
    (value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      typeof (/** @type {{ then?: unknown }} */ (value)).then === "function")
  );
}

/**
 * Is it a regular expression?
 *
 * @param {unknown} value
 * @returns {value is RegExp}
 */
function isRegExp(value) {
  return types.isRegExp(value);
}

/**
 * Is it a `Date`, valid or not? Use `is.validDate` to reject `Invalid Date`.
 *
 * @param {unknown} value
 * @returns {value is Date}
 */
function isDate(value) {
  return types.isDate(value);
}

/**
 * Is it a `Date` holding a real point in time?
 *
 * @example
 * nc.is.validDate(new Date());       // true
 * nc.is.validDate(new Date("nope")); // false
 *
 * @param {unknown} value
 * @returns {value is Date}
 */
function isValidDate(value) {
  return types.isDate(value) && !Number.isNaN(/** @type {Date} */ (value).getTime());
}

/**
 * Is it a `Map`?
 *
 * @param {unknown} value
 * @returns {value is Map<unknown, unknown>}
 */
function isMap(value) {
  return types.isMap(value);
}

/**
 * Is it a `Set`?
 *
 * @param {unknown} value
 * @returns {value is Set<unknown>}
 */
function isSet(value) {
  return types.isSet(value);
}

/**
 * Is it a `WeakMap`?
 *
 * @param {unknown} value
 * @returns {value is WeakMap<object, unknown>}
 */
function isWeakMap(value) {
  return types.isWeakMap(value);
}

/**
 * Is it a `WeakSet`?
 *
 * @param {unknown} value
 * @returns {value is WeakSet<object>}
 */
function isWeakSet(value) {
  return types.isWeakSet(value);
}

/**
 * Does it work with `for...of`? Strings, arrays, maps, sets and generators do.
 *
 * @param {unknown} value
 * @returns {value is Iterable<unknown>}
 */
function isIterable(value) {
  return value != null && typeof (/** @type {any} */ (value))[Symbol.iterator] === "function";
}

/**
 * Does it work with `for await...of`, like streams and async generators?
 *
 * @param {unknown} value
 * @returns {value is AsyncIterable<unknown>}
 */
function isAsyncIterable(value) {
  return value != null && typeof (/** @type {any} */ (value))[Symbol.asyncIterator] === "function";
}

/**
 * Is it a Node.js `Buffer`?
 *
 * @param {unknown} value
 * @returns {value is Buffer}
 */
function isBuffer(value) {
  return Buffer.isBuffer(value);
}

/**
 * Is it a typed array (`Uint8Array`, `Float64Array`...)? Buffers count.
 *
 * @param {unknown} value
 * @returns {value is AnyTypedArray}
 */
function isTypedArray(value) {
  return types.isTypedArray(value);
}

/**
 * Is it an `Error`, including subclasses and errors from other realms?
 *
 * @param {unknown} value
 * @returns {value is Error}
 */
function isError(value) {
  return types.isNativeError(value) || value instanceof Error;
}

/**
 * Is it empty? `null`, `undefined`, `""`, `[]`, `{}` and empty maps and sets
 * are. Numbers, booleans, functions, dates, regular expressions and errors
 * never are.
 *
 * @example
 * nc.is.empty({});  // true
 * nc.is.empty(0);   // false
 * nc.is.empty(" "); // false, see is.blank
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0;
  if (typeof value !== "object") return false;
  if (types.isMap(value) || types.isSet(value)) return /** @type {Map<unknown, unknown>} */ (value).size === 0;
  if (types.isDate(value) || types.isRegExp(value) || types.isNativeError(value)) return false;
  return Object.keys(value).length === 0;
}

/**
 * Is it `null`, `undefined`, or a string with nothing but whitespace?
 *
 * @example
 * nc.is.blank("  \n"); // true
 * nc.is.blank(" a ");  // false
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isBlank(value) {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.trim() === "";
}

/**
 * Is it an array where every item passes `guard`?
 *
 * @example
 * if (nc.is.arrayOf(input, nc.is.string)) input.join(", "); // input: string[]
 *
 * @template T
 * @param {unknown} value
 * @param {(item: unknown) => item is T} guard Checked against every item, like `nc.is.string`.
 * @returns {value is T[]}
 */
function isArrayOf(value, guard) {
  return Array.isArray(value) && value.every((item) => guard(item));
}

/**
 * Is it one of the allowed values? With a constant list, the value gets the
 * matching literal type.
 *
 * @example
 * const ROLES = ["admin", "user"] as const;
 * if (nc.is.oneOf(input, ROLES)) input; // "admin" | "user"
 *
 * @template {readonly unknown[]} L
 * @param {unknown} value
 * @param {L} allowed
 * @returns {value is L[number]}
 */
function isOneOf(value, allowed) {
  return allowed.includes(value);
}

/**
 * Does it look like an email address? The rules are practical rather than
 * the full RFC: one `@`, no stray dots, a real top-level domain.
 * International addresses are accepted, but not look-alike characters such
 * as the Kelvin sign in the domain. A valid address can still contain
 * quotes, `&`, `|` or backticks: it is not safe to put unescaped into HTML
 * or a shell command.
 *
 * @example
 * nc.is.email("jose@exemple.fr");     // true
 * nc.is.email("john..doe@example.com"); // false
 * nc.is.email("john@localhost");       // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isEmail(value) {
  if (typeof value !== "string" || value.length > 254) return false;
  if (EMAIL_ASCII.test(value)) return true;
  if (shared.ASCII.test(value) || !EMAIL.test(value)) return false;
  // Compatibility characters (Kelvin sign, fullwidth letters...) become other letters in DNS.
  const domain = value.slice(value.lastIndexOf("@") + 1);
  return domain === domain.normalize("NFKC");
}

/**
 * Is it an absolute URL with an allowed protocol (http and https by default)?
 * The text must already be clean: spaces, control characters, double
 * quotes, backticks, `<`, `>` and backslashes are refused, even where the URL
 * parser would quietly fix them. An apostrophe is fine.
 *
 * @example
 * nc.is.url("https://example.com/a?b=1");                 // true
 * nc.is.url("ftp://example.com", { protocols: ["ftp:"] }); // true
 * nc.is.url("http://localhost:3000", { requireTld: true }); // false
 *
 * @param {unknown} value
 * @param {IsURLOptions} [options]
 * @returns {value is string}
 */
function isURL(value, options = {}) {
  if (typeof value !== "string" || URL_UNSAFE.test(value)) return false;
  const url = URL.parse(value);
  if (!url) return false;
  const protocols = options.protocols;
  if (protocols ? !protocols.includes(url.protocol) : url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !options.requireTld || TLD.test(url.hostname);
}

/**
 * Is it a UUID?
 *
 * @example
 * nc.is.uuid(nc.id.uuid());           // true
 * nc.is.uuid(id, { version: 7 });     // only v7
 *
 * @param {unknown} value
 * @param {IsUUIDOptions} [options]
 * @returns {value is string}
 */
function isUUID(value, options = {}) {
  if (typeof value !== "string") return false;
  if (value.length !== 36) return false;
  const match = UUID.exec(value);
  if (!match) return options.version === undefined && UUID_NIL_OR_MAX.test(value);
  return options.version === undefined || Number(match[1]) === options.version;
}

/**
 * Is it a string of valid JSON?
 *
 * @example
 * nc.is.json('{"a":1}'); // true
 * nc.is.json("{a:1}");   // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isJSON(value) {
  if (typeof value !== "string") return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Is it a finite number, or a string that is exactly one (spaces around are fine)?
 *
 * @example
 * nc.is.numeric("4.2e3"); // true
 * nc.is.numeric(" 12 ");  // true
 * nc.is.numeric("12px");  // false
 *
 * @param {unknown} value
 * @returns {value is number | string}
 */
function isNumeric(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string" || value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

/**
 * Is it an IP address?
 *
 * @example
 * nc.is.ip("192.168.0.1"); // true
 * nc.is.ip("::1");         // true
 * nc.is.ip("::1", 4);      // false
 *
 * @param {unknown} value
 * @param {4|6} [version] Only accept IPv4 or IPv6.
 * @returns {value is string}
 */
function isIP(value, version) {
  if (typeof value !== "string") return false;
  const detected = (_net ??= require("node:net")).isIP(value);
  return version === undefined ? detected !== 0 : detected === version;
}

/**
 * Is it an IPv4 address, like `192.168.0.1`?
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isIPv4(value) {
  return isIP(value, 4);
}

/**
 * Is it an IPv6 address, like `::1`?
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isIPv6(value) {
  return isIP(value, 6);
}

/**
 * Is it a valid port (0 to 65535), as a number or a numeric string?
 *
 * @example
 * nc.is.port("8080"); // true
 * nc.is.port(70000);  // false
 *
 * @param {unknown} value
 * @returns {value is number | string}
 */
function isPort(value) {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
  return Number.isInteger(n) && /** @type {number} */ (n) >= 0 && /** @type {number} */ (n) <= 65535;
}

/**
 * Is it a hexadecimal string? A `0x` prefix is allowed.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isHex(value) {
  return typeof value === "string" && /^(0x)?[0-9a-f]+$/i.test(value);
}

/**
 * Is it a CSS hex color (`#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`)?
 *
 * @example
 * nc.is.hexColor("#f80"); // true
 * nc.is.hexColor("f80");  // false, the # is required
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isHexColor(value) {
  return typeof value === "string" && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/**
 * Is it valid Base64?
 *
 * @example
 * nc.is.base64("aGVsbG8=");                   // true
 * nc.is.base64("aGVsbG8", { urlSafe: true }); // true
 *
 * @param {unknown} value
 * @param {IsBase64Options} [options]
 * @returns {value is string}
 */
function isBase64(value, options = {}) {
  if (typeof value !== "string" || value === "") return false;
  if (options.urlSafe) return /^[A-Za-z0-9_-]+={0,2}$/.test(value) && value.replace(/=+$/, "").length % 4 !== 1;
  return value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

/**
 * Is it a semantic version? A leading `v` is fine.
 *
 * @example
 * nc.is.semver("v2.0.0-rc.1"); // true
 * nc.is.semver("1.2");         // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isSemver(value) {
  return (
    typeof value === "string" &&
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(value)
  );
}

/**
 * Is it an ISO 8601 date or date-time, and a real calendar date?
 *
 * @example
 * nc.is.isoDate("2024-02-29T10:00:00Z"); // true
 * nc.is.isoDate("2023-02-29");           // false, not a leap year
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isISODate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d, hh = "0", mm = "0", ss = "0", , offsetHours = "0", offsetMinutes = "0"] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (day > (month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1])) return false;
  return Number(hh) <= 23 && Number(mm) <= 59 && Number(ss) <= 59 && Number(offsetHours) <= 14 && Number(offsetMinutes) <= 59;
}

/**
 * Is it a URL slug like `my-first-post`? See `nc.str.slugify()` to make one.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Is it made only of letters, in any alphabet?
 *
 * @example
 * nc.is.alpha("Élodie"); // true
 * nc.is.alpha("abc1");   // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isAlpha(value) {
  return typeof value === "string" && /^\p{L}+$/u.test(value);
}

/**
 * Is it made only of letters and digits, in any alphabet?
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isAlphanumeric(value) {
  return typeof value === "string" && /^[\p{L}\p{N}]+$/u.test(value);
}

/**
 * Could it be a card number? Checks the length and the Luhn checksum;
 * spaces and dashes are ignored.
 *
 * @example
 * nc.is.creditCard("4242 4242 4242 4242"); // true
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isCreditCard(value) {
  if (typeof value !== "string") return false;
  const digits = value.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Does it look like a JSON Web Token? The signature is not verified; use
 * `nc.crypto.verifyJWT()` for that.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isJWT(value) {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !parts.slice(0, 2).every((p) => /^[A-Za-z0-9_-]+$/.test(p))) return false;
  if (parts[2] !== "" && !/^[A-Za-z0-9_-]+$/.test(parts[2])) return false;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return isPlainObject(header) && typeof header.alg === "string";
  } catch {
    return false;
  }
}

/**
 * Is it a host name, like `example.com`, `api.internal` or `localhost`?
 * International names are accepted. IP addresses aren't: see `is.ip`.
 * Lengths are counted the way DNS sees them, once converted to ASCII
 * (`xn--`): 63 bytes per label, 253 in all.
 *
 * @example
 * nc.is.hostname("api.example.com");                    // true
 * nc.is.hostname("localhost");                          // true
 * nc.is.hostname("localhost", { requireTld: true });    // false
 * nc.is.hostname("-bad-.com");                          // false
 *
 * @param {unknown} value
 * @param {IsHostnameOptions} [options]
 * @returns {value is string}
 */
function isHostname(value, options = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > 253) return false;
  const labels = value.split(".");
  if (!labels.every((label) => HOST_LABEL.test(label))) return false;
  if (/^\d+$/.test(labels[labels.length - 1])) return false;
  if (!shared.ASCII.test(value)) {
    // An international label takes more room once encoded: "é" x 63 is 67 bytes long.
    const ascii = (_url ??= require("node:url")).domainToASCII(value);
    if (ascii === "" || ascii.length > 253 || ascii.split(".").some((label) => label.length > 63)) return false;
  }
  return !options.requireTld || (labels.length > 1 && TLD.test(value));
}

/**
 * Is it a MAC address? Accepts `aa:bb:cc:dd:ee:ff`, `aa-bb-cc-dd-ee-ff` and
 * `aabb.ccdd.eeff`.
 *
 * @example
 * nc.is.macAddress("00:1B:44:11:3A:B7"); // true
 * nc.is.macAddress("00:1B:44:11:3A");    // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isMACAddress(value) {
  return typeof value === "string" && /^(?:[0-9a-f]{2}(?::[0-9a-f]{2}){5}|[0-9a-f]{2}(?:-[0-9a-f]{2}){5}|[0-9a-f]{4}(?:\.[0-9a-f]{4}){2})$/i.test(value);
}

/**
 * Is it a valid IBAN? Checks the format and the checksum, spaces allowed.
 *
 * @example
 * nc.is.iban("FR76 3000 6000 0112 3456 7890 189"); // true
 * nc.is.iban("FR76 3000 6000 0112 3456 7890 180"); // false, wrong checksum
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isIBAN(value) {
  if (typeof value !== "string") return false;
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    // Letters count as two digits (A = 10 ... Z = 35).
    remainder = code >= 65 ? (remainder * 100 + code - 55) % 97 : (remainder * 10 + code - 48) % 97;
  }
  return remainder === 1;
}

/**
 * Is it a phone number in the international E.164 format: a `+`, then 7 to
 * 15 digits, no spaces? That's what SMS and telephony APIs expect.
 *
 * @example
 * nc.is.e164("+33612345678"); // true
 * nc.is.e164("06 12 34 56 78"); // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isE164(value) {
  return typeof value === "string" && /^\+[1-9]\d{6,14}$/.test(value);
}

/**
 * Is it a MongoDB ObjectId, 24 hexadecimal characters?
 *
 * @example
 * nc.is.objectId("507f1f77bcf86cd799439011"); // true
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isObjectId(value) {
  return typeof value === "string" && value.length === 24 && /^[0-9a-f]{24}$/i.test(value);
}

/**
 * Is it a ULID, like the ones `nc.id.ulid()` makes?
 *
 * @example
 * nc.is.ulid(nc.id.ulid()); // true
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isULID(value) {
  return typeof value === "string" && value.length === 26 && /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value);
}

/**
 * Is it a `data:` URL, like an inline image? Only the header is checked,
 * not the data. Without `types`, any media type passes, `text/html` and
 * `image/svg+xml` included, and both can run scripts.
 *
 * @example
 * nc.is.dataUrl("data:image/png;base64,iVBORw0KGgo="); // true
 * nc.is.dataUrl("data:,Hello");                         // true
 * nc.is.dataUrl("data:text/html,<p>Hi</p>", { types: ["image/png"] }); // false
 *
 * @param {unknown} value
 * @param {IsDataURLOptions} [options]
 * @returns {value is string}
 */
function isDataURL(value, options = {}) {
  if (typeof value !== "string" || !DATA_URL.test(value)) return false;
  const types = options.types;
  if (!types) return true;
  const type = value.slice(5, value.search(/[;,]/)).toLowerCase() || "text/plain";
  return types.some((allowed) => allowed.toLowerCase() === type);
}

/**
 * Is it a media type, like `application/json` or
 * `text/html; charset=utf-8`?
 *
 * @example
 * nc.is.mimeType("image/svg+xml"); // true
 * nc.is.mimeType("json");          // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isMimeType(value) {
  return typeof value === "string" && MIME_TYPE.test(value);
}

/**
 * Is it a time zone Node.js knows, like `"Europe/Paris"` or `"UTC"`?
 *
 * @example
 * nc.is.timeZone("America/New_York"); // true
 * nc.is.timeZone("Mars/Olympus");     // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isTimeZone(value) {
  if (typeof value !== "string" || value === "") return false;
  try {
    shared.intl.dateTime("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Is it a well-formed locale, like `"fr"`, `"en-GB"` or `"zh-Hant-TW"`?
 *
 * @example
 * nc.is.locale("pt-BR"); // true
 * nc.is.locale("en_US"); // false, use a dash
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isLocale(value) {
  if (typeof value !== "string" || value === "") return false;
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

/**
 * Is it a cron expression `nc.time.cron()` understands?
 *
 * @example
 * nc.is.cron("0 9 * * 1-5"); // true
 * nc.is.cron("@daily");      // true
 * nc.is.cron("61 * * * *");  // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isCron(value) {
  if (typeof value !== "string") return false;
  // "*/5/x" is not a step and "1-5-x" is not a range, even though the parser stops reading early.
  for (const part of value.trim().split(/[\s,]+/)) {
    const step = part.split("/");
    if (step.length > 2 || step[0].split("-").length > 2) return false;
  }
  try {
    shared.parseCron(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Is it made only of ASCII characters?
 *
 * @example
 * nc.is.ascii("hello"); // true
 * nc.is.ascii("héllo"); // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isASCII(value) {
  return typeof value === "string" && shared.ASCII.test(value);
}

module.exports = {
  array: isArray,
  number: isNumber,
  finite: isFinite,
  integer: isInteger,
  safeInteger: isSafeInteger,
  float: isFloat,
  positive: isPositive,
  negative: isNegative,
  boolean: isBoolean,
  string: isString,
  symbol: isSymbol,
  bigInt: isBigInt,
  undefined: isUndefined,
  null: isNull,
  nil: isNil,
  defined: isDefined,
  primitive: isPrimitive,
  function: isFunction,
  asyncFunction: isAsyncFunction,
  generatorFunction: isGeneratorFunction,
  generator: isGenerator,
  class: isClass,
  object: isObject,
  plainObject: isPlainObject,
  promise: isPromise,
  regExp: isRegExp,
  date: isDate,
  validDate: isValidDate,
  map: isMap,
  set: isSet,
  weakMap: isWeakMap,
  weakSet: isWeakSet,
  iterable: isIterable,
  asyncIterable: isAsyncIterable,
  buffer: isBuffer,
  typedArray: isTypedArray,
  error: isError,
  empty: isEmpty,
  blank: isBlank,
  arrayOf: isArrayOf,
  oneOf: isOneOf,
  email: isEmail,
  url: isURL,
  uuid: isUUID,
  json: isJSON,
  numeric: isNumeric,
  ip: isIP,
  ipv4: isIPv4,
  ipv6: isIPv6,
  port: isPort,
  hex: isHex,
  hexColor: isHexColor,
  base64: isBase64,
  semver: isSemver,
  isoDate: isISODate,
  slug: isSlug,
  alpha: isAlpha,
  alphanumeric: isAlphanumeric,
  creditCard: isCreditCard,
  jwt: isJWT,
  hostname: isHostname,
  macAddress: isMACAddress,
  iban: isIBAN,
  e164: isE164,
  objectId: isObjectId,
  ulid: isULID,
  dataUrl: isDataURL,
  mimeType: isMimeType,
  timeZone: isTimeZone,
  locale: isLocale,
  cron: isCron,
  ascii: isASCII,
};
