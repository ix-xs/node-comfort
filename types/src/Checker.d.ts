/**
 * Checks if a value is a real Array.
 *
 * @example
 * nodeComfort.isArray([1, 2, 3]);    // true
 * nodeComfort.isArray("not array");  // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is an Array.
 */
export function isArray(value: any): boolean;
/**
 * Checks if a value is a number (excluding NaN).
 *
 * @example
 * nodeComfort.isNumber(42);          // true
 * nodeComfort.isNumber(NaN);         // false
 * nodeComfort.isNumber("42");        // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a finite number or Infinity/-Infinity.
 */
export function isNumber(value: any): boolean;
/**
 * Checks if a value is a finite number (excludes NaN, Infinity and -Infinity).
 *
 * @example
 * nodeComfort.isFinite(42);        // true
 * nodeComfort.isFinite(Infinity);  // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a finite number.
 */
export function isFinite(value: any): boolean;
/**
 * Checks if a value is a safe integer.
 *
 * @example
 * nodeComfort.isInteger(42);    // true
 * nodeComfort.isInteger(4.2);   // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is an integer.
 */
export function isInteger(value: any): boolean;
/**
 * Checks if a value is a floating-point number (a finite non-integer number).
 *
 * @example
 * nodeComfort.isFloat(4.2);   // true
 * nodeComfort.isFloat(4);     // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a non-integer finite number.
 */
export function isFloat(value: any): boolean;
/**
 * Checks if a value is a function.
 *
 * @example
 * nodeComfort.isFunction(() => {});  // true
 * nodeComfort.isFunction(class {});  // true
 * nodeComfort.isFunction("fn");      // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a function.
 */
export function isFunction(value: any): boolean;
/**
 * Checks if a value is an async function (declared with `async`).
 *
 * @example
 * nodeComfort.isAsyncFunction(async () => {});  // true
 * nodeComfort.isAsyncFunction(() => {});        // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is an async function.
 */
export function isAsyncFunction(value: any): boolean;
/**
 * Checks if a value is a non-null object.
 *
 * Note: Arrays, Maps, Sets, Dates, etc. are also considered objects here.
 *
 * @example
 * nodeComfort.isObject({});          // true
 * nodeComfort.isObject([]);          // true
 * nodeComfort.isObject(null);        // false
 * nodeComfort.isObject("str");       // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a non-null object.
 */
export function isObject(value: any): boolean;
/**
 * Checks if a value is a plain object (created via `{}` or `new Object()`).
 *
 * Unlike {@link isObject}, this excludes arrays, Maps, Dates, class instances, etc.
 *
 * @example
 * nodeComfort.isPlainObject({ a: 1 });    // true
 * nodeComfort.isPlainObject([]);          // false
 * nodeComfort.isPlainObject(new Date());  // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a plain object.
 */
export function isPlainObject(value: any): boolean;
/**
 * Checks if a value is a boolean.
 *
 * @example
 * nodeComfort.isBoolean(true);       // true
 * nodeComfort.isBoolean(false);      // true
 * nodeComfort.isBoolean(0);          // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a boolean.
 */
export function isBoolean(value: any): boolean;
/**
 * Checks if a value is a string.
 *
 * @example
 * nodeComfort.isString("hello");     // true
 * nodeComfort.isString(123);         // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a string.
 */
export function isString(value: any): boolean;
/**
 * Checks if a value is a symbol.
 *
 * @example
 * nodeComfort.isSymbol(Symbol("x"));  // true
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a symbol.
 */
export function isSymbol(value: any): boolean;
/**
 * Checks if a value is a BigInt.
 *
 * @example
 * nodeComfort.isBigInt(10n);  // true
 * nodeComfort.isBigInt(10);   // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a BigInt.
 */
export function isBigInt(value: any): boolean;
/**
 * Checks if a value is exactly undefined.
 *
 * @example
 * nodeComfort.isUndefined(undefined);  // true
 * nodeComfort.isUndefined(null);       // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is undefined.
 */
export function isUndefined(value: any): boolean;
/**
 * Checks if a value is exactly null.
 *
 * @example
 * nodeComfort.isNull(null);          // true
 * nodeComfort.isNull(undefined);     // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is null.
 */
export function isNull(value: any): boolean;
/**
 * Checks if a value is `null` or `undefined`.
 *
 * @example
 * nodeComfort.isNil(null);       // true
 * nodeComfort.isNil(undefined);  // true
 * nodeComfort.isNil(0);          // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is null or undefined.
 */
export function isNil(value: any): boolean;
/**
 * Checks if a value is a primitive (string, number, boolean, symbol, bigint, null or undefined).
 *
 * @example
 * nodeComfort.isPrimitive(42);    // true
 * nodeComfort.isPrimitive({});    // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a primitive.
 */
export function isPrimitive(value: any): boolean;
/**
 * Checks if a value is a Promise (or a thenable object).
 *
 * @example
 * nodeComfort.isPromise(Promise.resolve());       // true
 * nodeComfort.isPromise({ then() {} });            // true
 * nodeComfort.isPromise(42);                       // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a Promise or thenable.
 */
export function isPromise(value: any): boolean;
/**
 * Checks if a value is a RegExp instance.
 *
 * @example
 * nodeComfort.isRegExp(/a/);   // true
 * nodeComfort.isRegExp("a");   // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a RegExp.
 */
export function isRegExp(value: any): boolean;
/**
 * Checks if a value is a built-in Date instance.
 *
 * Uses `util.types.isDate` under the hood to handle cross-realm Dates.
 *
 * @example
 * nodeComfort.isDate(new Date());    // true
 * nodeComfort.isDate("2024-01-01");  // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a Date instance.
 */
export function isDate(value: any): boolean;
/**
 * Checks if a value is a **valid** Date (a Date instance that is not `Invalid Date`).
 *
 * @example
 * nodeComfort.isValidDate(new Date());            // true
 * nodeComfort.isValidDate(new Date("nope"));      // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a valid Date.
 */
export function isValidDate(value: any): boolean;
/**
 * Checks if a value is a built-in Map instance.
 *
 * @example
 * nodeComfort.isMap(new Map());      // true
 * nodeComfort.isMap({});             // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a Map.
 */
export function isMap(value: any): boolean;
/**
 * Checks if a value is a built-in Set instance.
 *
 * @example
 * nodeComfort.isSet(new Set());      // true
 * nodeComfort.isSet([]);             // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a Set.
 */
export function isSet(value: any): boolean;
/**
 * Checks if a value is a WeakMap instance.
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a WeakMap.
 */
export function isWeakMap(value: any): boolean;
/**
 * Checks if a value is a WeakSet instance.
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a WeakSet.
 */
export function isWeakSet(value: any): boolean;
/**
 * Checks if a value is an iterable (has a `Symbol.iterator`).
 *
 * Strings, arrays, Maps, Sets and generators are iterable.
 *
 * @example
 * nodeComfort.isIterable([1, 2]);   // true
 * nodeComfort.isIterable("hi");     // true
 * nodeComfort.isIterable({});       // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is iterable.
 */
export function isIterable(value: any): boolean;
/**
 * Checks if a value is a Node.js Buffer.
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a Buffer.
 */
export function isBuffer(value: any): boolean;
/**
 * Checks if a value is any TypedArray (Uint8Array, Float64Array, etc.).
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a TypedArray.
 */
export function isTypedArray(value: any): boolean;
/**
 * Checks if a value is a native Error instance.
 *
 * Uses `util.types.isNativeError` to correctly handle errors from other realms.
 *
 * @example
 * nodeComfort.isError(new Error("x"));      // true
 * nodeComfort.isError(new TypeError("x"));  // true
 * nodeComfort.isError({ message: "x" });    // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a native Error.
 */
export function isError(value: any): boolean;
/**
 * Checks if a value is "empty".
 *
 * Emptiness rules:
 * - `null` / `undefined` -> empty
 * - string / array -> empty when `length === 0`
 * - Map / Set -> empty when `size === 0`
 * - plain object -> empty when it has no own enumerable keys
 * - anything else (numbers, booleans, functions, ...) -> never empty
 *
 * @example
 * nodeComfort.isEmpty("");        // true
 * nodeComfort.isEmpty([]);        // true
 * nodeComfort.isEmpty({});        // true
 * nodeComfort.isEmpty(new Map()); // true
 * nodeComfort.isEmpty("x");       // false
 * nodeComfort.isEmpty(0);         // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is considered empty.
 */
export function isEmpty(value: any): boolean;
/**
 * Checks if a string is a valid, well-formed email address.
 *
 * This is a pragmatic check (not a full RFC 5322 parser) that covers the
 * vast majority of real-world addresses.
 *
 * @example
 * nodeComfort.isEmail("john@example.com");  // true
 * nodeComfort.isEmail("nope");              // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value looks like an email address.
 */
export function isEmail(value: any): boolean;
/**
 * Checks if a string is a valid HTTP(S) URL.
 *
 * @example
 * nodeComfort.isURL("https://example.com");  // true
 * nodeComfort.isURL("ftp://example.com");    // false (not http/https)
 *
 * @param {*} value - Value to check.
 * @param {{ protocols?: string[] }} [options] - Allowed protocols (default: http, https).
 * @returns {boolean} True if the value is a valid URL with an allowed protocol.
 */
export function isURL(value: any, options?: {
    protocols?: string[];
}): boolean;
/**
 * Checks if a string is a valid UUID (versions 1-5, any variant).
 *
 * @example
 * nodeComfort.isUUID("123e4567-e89b-12d3-a456-426614174000");  // true
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a UUID.
 */
export function isUUID(value: any): boolean;
/**
 * Checks if a string is valid, parseable JSON.
 *
 * @example
 * nodeComfort.isJSON('{"a":1}');  // true
 * nodeComfort.isJSON("{a:1}");    // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is a JSON-parseable string.
 */
export function isJSON(value: any): boolean;
/**
 * Checks if a value is numeric • a number, or a string that fully represents one.
 *
 * @example
 * nodeComfort.isNumeric(42);      // true
 * nodeComfort.isNumeric("42");    // true
 * nodeComfort.isNumeric("4.2e3"); // true
 * nodeComfort.isNumeric("4px");   // false
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if the value is numeric.
 */
export function isNumeric(value: any): boolean;
//# sourceMappingURL=Checker.d.ts.map