const { types } = require("node:util");

/**
 * Tiny runtime type-checking helper.
 *
 * All methods are simple boolean guards that work on any input value.
 */
module.exports = {
  /**
   * Checks if a value is a real Array.
   *
   * @example
   * nodeComfort.Checker.isArray([1, 2, 3]);    // true
   * nodeComfort.Checker.isArray("not array");  // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is an Array.
   */
  isArray(value) {
    return Array.isArray(value);
  },

  /**
   * Checks if a value is a number (excluding NaN).
   *
   * @example
   * nodeComfort.Checker.isNumber(42);          // true
   * nodeComfort.Checker.isNumber(NaN);         // false
   * nodeComfort.Checker.isNumber("42");        // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a finite number or Infinity/-Infinity.
   */
  isNumber(value) {
    return typeof value === "number" && !Number.isNaN(value);
  },

  /**
   * Checks if a value is a function.
   *
   * @example
   * nodeComfort.Checker.isFunction(() => {});  // true
   * nodeComfort.Checker.isFunction(class {});  // true
   * nodeComfort.Checker.isFunction("fn");      // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a function.
   */
  isFunction(value) {
    return typeof value === "function";
  },

  /**
   * Checks if a value is a non-null object.
   *
   * Note: Arrays, Maps, Sets, Dates, etc. are also considered objects here.
   *
   * @example
   * nodeComfort.Checker.isObject({});          // true
   * nodeComfort.Checker.isObject([]);          // true
   * nodeComfort.Checker.isObject(null);        // false
   * nodeComfort.Checker.isObject("str");       // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a non-null object.
   */
  isObject(value) {
    return typeof value === "object" && value !== null;
  },

  /**
   * Checks if a value is a boolean.
   *
   * @example
   * nodeComfort.Checker.isBoolean(true);       // true
   * nodeComfort.Checker.isBoolean(false);      // true
   * nodeComfort.Checker.isBoolean(0);          // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a boolean.
   */
  isBoolean(value) {
    return typeof value === "boolean";
  },

  /**
   * Checks if a value is a string.
   *
   * @example
   * nodeComfort.Checker.isString("hello");     // true
   * nodeComfort.Checker.isString(123);         // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a string.
   */
  isString(value) {
    return typeof value === "string";
  },

  /**
   * Checks if a value is exactly undefined.
   *
   * @example
   * nodeComfort.Checker.isUndefined(undefined);  // true
   * nodeComfort.Checker.isUndefined(null);       // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is undefined.
   */
  isUndefined(value) {
    return typeof value === "undefined";
  },

  /**
   * Checks if a value is exactly null.
   *
   * @example
   * nodeComfort.Checker.isNull(null);          // true
   * nodeComfort.Checker.isNull(undefined);     // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is null.
   */
  isNull(value) {
    return value === null;
  },

  /**
   * Checks if a value is a built-in Date instance.
   *
   * Uses `util.types.isDate` under the hood to handle cross-realm Dates.
   *
   * @example
   * nodeComfort.Checker.isDate(new Date());    // true
   * nodeComfort.Checker.isDate("2024-01-01");  // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a Date instance.
   */
  isDate(value) {
    return types.isDate(value);
  },

  /**
   * Checks if a value is a built-in Map instance.
   *
   * @example
   * nodeComfort.Checker.isMap(new Map());      // true
   * nodeComfort.Checker.isMap({});             // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a Map.
   */
  isMap(value) {
    return types.isMap(value);
  },

  /**
   * Checks if a value is a built-in Set instance.
   *
   * @example
   * nodeComfort.Checker.isSet(new Set());      // true
   * nodeComfort.Checker.isSet([]);             // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a Set.
   */
  isSet(value) {
    return types.isSet(value);
  },

  /**
   * Checks if a value is a native Error instance.
   *
   * Uses `util.types.isNativeError` to correctly handle errors from other realms.
   *
   * @example
   * nodeComfort.Checker.isError(new Error("x"));      // true
   * nodeComfort.Checker.isError(new TypeError("x"));  // true
   * nodeComfort.Checker.isError({ message: "x" });    // false
   *
   * @param {*} value - Value to check.
   * @returns {boolean} True if the value is a native Error.
   */
  isError(value) {
    return types.isNativeError(value);
  },
};
