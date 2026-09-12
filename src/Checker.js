"use strict";

/**
 * Type checks and validators. Every `isX` accepts anything and never throws,
 * and most of them are type guards: inside `if (nc.isString(value))`, your
 * editor knows `value` is a string, in JavaScript too.
 *
 * @example
 * if (nc.isEmail(body.email) && nc.isPort(body.port)) connect(body);
 * nc.assert(user, "User not found");
 */

const { types } = require("node:util");

/**
 * Any built-in typed array.
 * @typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array} AnyTypedArray
 */

/**
 * Any primitive value.
 * @typedef {string | number | boolean | symbol | bigint | null | undefined} Primitive
 */

/**
 * Options for `isURL()`.
 * @typedef {object} IsURLOptions
 * @property {string[]} [protocols] Accepted protocols, colon included. Defaults to `["http:", "https:"]`.
 * @property {boolean} [requireTld] Require a domain like `example.com`, rejecting `localhost` and bare IPs.
 */

/**
 * Options for `isUUID()`.
 * @typedef {object} IsUUIDOptions
 * @property {1|2|3|4|5|6|7|8} [version] Only accept this version. Otherwise versions 1 to 8 pass, plus the nil and max UUIDs.
 */

/**
 * Options for `isBase64()`.
 * @typedef {object} IsBase64Options
 * @property {boolean} [urlSafe] Expect the URL-safe alphabet (`-` and `_`), padding optional.
 */

/**
 * Is it an array?
 *
 * @example
 * nc.isArray([1, 2]);        // true
 * nc.isArray({ length: 0 }); // false
 *
 * @param {unknown} value
 * @returns {value is any[]}
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Is it a number? `NaN` is rejected, `Infinity` passes (see `isFinite`).
 *
 * @example
 * nc.isNumber(42);   // true
 * nc.isNumber(NaN);  // false
 * nc.isNumber("42"); // false, use isNumeric for strings
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
 * nc.isFinite(42);       // true
 * nc.isFinite(Infinity); // false
 * nc.isFinite("42");     // false
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
 * nc.isInteger(4);   // true
 * nc.isInteger(4.5); // false
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
 * nc.isSafeInteger(2 ** 53 - 1); // true
 * nc.isSafeInteger(2 ** 53);     // false
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
 * nc.isFloat(4.2); // true
 * nc.isFloat(4);   // false
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
 * nc.isPositive(3); // true
 * nc.isPositive(0); // false
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
 * nc.isNegative(-3); // true
 * nc.isNegative(0);  // false
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
 * nc.isBoolean(false); // true
 * nc.isBoolean(0);     // false
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
 * nc.isString("hello");             // true
 * nc.isString(new String("hello")); // false
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
 * nc.isBigInt(10n); // true
 * nc.isBigInt(10);  // false
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
 * nc.isNil(undefined); // true
 * nc.isNil(0);         // false
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
 * const ids = [1, null, 2, undefined].filter(nc.isDefined); // number[]
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
 * nc.isAsyncFunction(async () => {});         // true
 * nc.isAsyncFunction(() => Promise.resolve()); // false
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
 * nc.isClass(class User {});  // true
 * nc.isClass(function () {}); // false
 *
 * @param {unknown} value
 * @returns {value is new (...args: any[]) => any}
 */
function isClass(value) {
  return typeof value === "function" && /^class[\s{]/.test(Function.prototype.toString.call(value));
}

/**
 * Is it an object, and not `null`? Arrays, dates and class instances count;
 * use `isPlainObject` for `{}` literals only.
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
 * nc.isPlainObject({ a: 1 });   // true
 * nc.isPlainObject(new Date()); // false
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  // The last check accepts objects from another realm (a worker, a `vm`).
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
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
 * Is it a `Date`, valid or not? Use `isValidDate` to reject `Invalid Date`.
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
 * nc.isValidDate(new Date());       // true
 * nc.isValidDate(new Date("nope")); // false
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
 * are. Numbers, booleans and functions never are.
 *
 * @example
 * nc.isEmpty({});  // true
 * nc.isEmpty(0);   // false
 * nc.isEmpty(" "); // false, see isBlank
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0;
  if (types.isMap(value) || types.isSet(value)) return /** @type {Map<unknown, unknown>} */ (value).size === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Is it `null`, `undefined`, or a string with nothing but whitespace?
 *
 * @example
 * nc.isBlank("  \n"); // true
 * nc.isBlank(" a ");  // false
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
 * if (nc.isArrayOf(input, nc.isString)) input.join(", "); // input: string[]
 *
 * @template T
 * @param {unknown} value
 * @param {(item: unknown) => item is T} guard Checked against every item, like `nc.isString`.
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
 * if (nc.isOneOf(input, ROLES)) input; // "admin" | "user"
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
 * International addresses are accepted.
 *
 * @example
 * nc.isEmail("jose@exemple.fr");     // true
 * nc.isEmail("john..doe@example.com"); // false
 * nc.isEmail("john@localhost");       // false
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isEmail(value) {
  if (typeof value !== "string" || value.length > 254) return false;
  return /^(?!\.)(?!.*\.\.)[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+(?<!\.)@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+\p{L}{2,}$/u.test(value);
}

/**
 * Is it an absolute URL with an allowed protocol (http and https by default)?
 *
 * @example
 * nc.isURL("https://example.com/a?b=1");                 // true
 * nc.isURL("ftp://example.com", { protocols: ["ftp:"] }); // true
 * nc.isURL("http://localhost:3000", { requireTld: true }); // false
 *
 * @param {unknown} value
 * @param {IsURLOptions} [options]
 * @returns {value is string}
 */
function isURL(value, options = {}) {
  if (typeof value !== "string") return false;
  const protocols = options.protocols ?? ["http:", "https:"];
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) return false;
    if (options.requireTld && !/\.[a-z]{2,}$/i.test(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Is it a UUID?
 *
 * @example
 * nc.isUUID(nc.id.uuid());           // true
 * nc.isUUID(id, { version: 7 });     // only v7
 *
 * @param {unknown} value
 * @param {IsUUIDOptions} [options]
 * @returns {value is string}
 */
function isUUID(value, options = {}) {
  if (typeof value !== "string") return false;
  if (options.version === undefined && /^(0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i.test(value)) return true;
  const version = options.version === undefined ? "[1-8]" : String(options.version);
  return new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-${version}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, "i").test(value);
}

/**
 * Is it a string of valid JSON?
 *
 * @example
 * nc.isJSON('{"a":1}'); // true
 * nc.isJSON("{a:1}");   // false
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
 * nc.isNumeric("4.2e3"); // true
 * nc.isNumeric(" 12 ");  // true
 * nc.isNumeric("12px");  // false
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
 * nc.isIP("192.168.0.1"); // true
 * nc.isIP("::1");         // true
 * nc.isIP("::1", 4);      // false
 *
 * @param {unknown} value
 * @param {4|6} [version] Only accept IPv4 or IPv6.
 * @returns {value is string}
 */
function isIP(value, version) {
  if (typeof value !== "string") return false;
  const detected = require("node:net").isIP(value);
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
 * nc.isPort("8080"); // true
 * nc.isPort(70000);  // false
 *
 * @param {unknown} value
 * @returns {boolean}
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
 * nc.isHexColor("#f80"); // true
 * nc.isHexColor("f80");  // false, the # is required
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
 * nc.isBase64("aGVsbG8=");                   // true
 * nc.isBase64("aGVsbG8", { urlSafe: true }); // true
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
 * nc.isSemver("v2.0.0-rc.1"); // true
 * nc.isSemver("1.2");         // false
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
 * nc.isISODate("2024-02-29T10:00:00Z"); // true
 * nc.isISODate("2023-02-29");           // false, not a leap year
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isISODate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(value);
  if (!match) return false;
  const [, y, m, d, hh = "0", mm = "0", ss = "0"] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth && Number(hh) <= 23 && Number(mm) <= 59 && Number(ss) <= 59;
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
 * nc.isAlpha("Élodie"); // true
 * nc.isAlpha("abc1");   // false
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
 * nc.isCreditCard("4242 4242 4242 4242"); // true
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
 * Throws an `AssertionError` unless `value` passes `guard`. Afterwards,
 * `value` has the guarded type.
 *
 * @example
 * nc.assertType(config.port, nc.isInteger, "port must be an integer");
 *
 * @template T
 * @param {unknown} value
 * @param {(value: unknown) => value is T} guard A check like `nc.isString`.
 * @param {string | (() => string)} [message]
 * @returns {asserts value is T}
 * @throws {AssertionError}
 */
function assertType(value, guard, message) {
  if (!guard(value)) {
    const text = typeof message === "function" ? message() : message;
    throw new (require("./errors.js").AssertionError)(text ?? `Expected value to pass ${guard.name || "the type guard"}`);
  }
}

module.exports = {
  isArray,
  isNumber,
  isFinite,
  isInteger,
  isSafeInteger,
  isFloat,
  isPositive,
  isNegative,
  isBoolean,
  isString,
  isSymbol,
  isBigInt,
  isUndefined,
  isNull,
  isNil,
  isDefined,
  isPrimitive,
  isFunction,
  isAsyncFunction,
  isGeneratorFunction,
  isGenerator,
  isClass,
  isObject,
  isPlainObject,
  isPromise,
  isRegExp,
  isDate,
  isValidDate,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isIterable,
  isAsyncIterable,
  isBuffer,
  isTypedArray,
  isError,
  isEmpty,
  isBlank,
  isArrayOf,
  isOneOf,
  isEmail,
  isURL,
  isUUID,
  isJSON,
  isNumeric,
  isIP,
  isIPv4,
  isIPv6,
  isPort,
  isHex,
  isHexColor,
  isBase64,
  isSemver,
  isISODate,
  isSlug,
  isAlpha,
  isAlphanumeric,
  isCreditCard,
  isJWT,
  assert,
  assertType,
};
