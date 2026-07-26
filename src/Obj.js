/**
 * Object utilities.
 *
 * Deep clone / merge / equality, safe nested get/set via dot-paths,
 * pick/omit, mapping over keys and values, and flatten/unflatten • the
 * everyday object plumbing, done without mutating your inputs.
 */

const checker = require("./Checker");

/**
 * Parses a dot/bracket path into an array of keys.
 * @private
 * @param {string|Array<string|number>} path
 * @returns {Array<string|number>}
 */
const _toPath = (path) => {
  if (Array.isArray(path)) return path;
  return String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter((p) => p !== "");
};

/**
 * Manual deep-clone used when `structuredClone` is unavailable or throws
 * (e.g. objects containing functions). Handles arrays, Maps, Sets, Dates and
 * RegExps, and guards against circular references.
 * @private
 * @param {*} value - Value to clone.
 * @param {WeakMap} seen - Cache of already-cloned references.
 * @returns {*} The cloned value.
 */
const _deepClone = (value, seen) => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (checker.isDate(value)) return new Date(value.getTime());
  if (checker.isRegExp(value)) return new RegExp(value.source, value.flags);

  if (Array.isArray(value)) {
    const arr = [];
    seen.set(value, arr);
    for (const item of value) arr.push(_deepClone(item, seen));
    return arr;
  }
  if (checker.isMap(value)) {
    const map = new Map();
    seen.set(value, map);
    for (const [k, v] of value) map.set(k, _deepClone(v, seen));
    return map;
  }
  if (checker.isSet(value)) {
    const set = new Set();
    seen.set(value, set);
    for (const v of value) set.add(_deepClone(v, seen));
    return set;
  }

  const out = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) {
    out[key] = _deepClone(value[key], seen);
  }
  return out;
};

module.exports = {
  /**
   * Deeply clones a value.
   *
   * Uses the native `structuredClone` when the value supports it (plain data,
   * Dates, Maps, Sets, typed arrays, ...), and falls back to a manual deep copy
   * otherwise. Functions are copied by reference.
   *
   * @example
   * const copy = nodeComfort.obj.clone({ a: { b: 1 } });
   *
   * @template T
   * @param {T} value - Value to clone.
   * @returns {T} A deep copy.
   */
  clone(value) {
    if (value === null || typeof value !== "object") return value;
    try {
      return structuredClone(value);
    } catch {
      return _deepClone(value, new WeakMap());
    }
  },

  /**
   * Deeply merges two or more plain objects into a new object.
   *
   * Later sources win. Plain-object values are merged recursively; arrays and
   * other values are replaced (not concatenated). Inputs are never mutated.
   *
   * @example
   * nodeComfort.obj.merge({ a: { x: 1 } }, { a: { y: 2 } });
   * // { a: { x: 1, y: 2 } }
   *
   * @param {...Record<string, any>} sources - Objects to merge.
   * @returns {Record<string, any>} The merged object.
   */
  merge(...sources) {
    const result = {};
    for (const source of sources) {
      if (!checker.isPlainObject(source)) continue;
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (checker.isPlainObject(value) && checker.isPlainObject(result[key])) {
          result[key] = this.merge(result[key], value);
        } else if (checker.isPlainObject(value)) {
          result[key] = this.merge(value);
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  },

  /**
   * Deeply compares two values for structural equality.
   *
   * Handles plain objects, arrays, Dates, RegExps, Maps and Sets.
   *
   * @example
   * nodeComfort.obj.equal({ a: [1, 2] }, { a: [1, 2] }); // true
   *
   * @param {*} a - First value.
   * @param {*} b - Second value.
   * @returns {boolean} True if the values are deeply equal.
   */
  equal(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
      return a !== a && b !== b; // both NaN
    }
    if (checker.isDate(a) && checker.isDate(b)) return a.getTime() === b.getTime();
    if (checker.isRegExp(a) && checker.isRegExp(b)) return a.toString() === b.toString();

    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((item, i) => this.equal(item, b[i]));
    }
    if (checker.isMap(a) && checker.isMap(b)) {
      if (a.size !== b.size) return false;
      for (const [k, v] of a) {
        if (!b.has(k) || !this.equal(v, b.get(k))) return false;
      }
      return true;
    }
    if (checker.isSet(a) && checker.isSet(b)) {
      if (a.size !== b.size) return false;
      for (const v of a) if (!b.has(v)) return false;
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => Object.hasOwn(b, key) && this.equal(a[key], b[key]));
  },

  /**
   * Gets a nested value from an object using a dot/bracket path.
   *
   * @example
   * nodeComfort.obj.get({ a: { b: [{ c: 42 }] } }, "a.b[0].c");    // 42
   * nodeComfort.obj.get({}, "a.b.c", "default");                   // "default"
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string|Array<string|number>} path - Dot path or key array.
   * @param {*} [fallback] - Returned when the path does not resolve.
   * @returns {*} The value at the path, or the fallback.
   */
  get(object, path, fallback) {
    const keys = _toPath(path);
    let current = object;
    for (const key of keys) {
      if (current == null || !(key in Object(current))) return fallback;
      current = current[key];
    }
    return current === undefined ? fallback : current;
  },

  /**
   * Sets a nested value in an object using a dot/bracket path (returns a clone).
   *
   * Intermediate objects/arrays are created as needed. The original object is
   * not mutated.
   *
   * @example
   * nodeComfort.obj.set({}, "a.b.c", 1); // { a: { b: { c: 1 } } }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string|Array<string|number>} path - Dot path or key array.
   * @param {*} value - Value to set.
   * @returns {Record<string, any>} A new object with the value set.
   */
  set(object, path, value) {
    const keys = _toPath(path);
    if (!keys.length) return object;
    const root = this.clone(object) ?? {};
    let current = root;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] == null || typeof current[key] !== "object") {
        current[key] = typeof keys[i + 1] === "number" || /^\d+$/.test(String(keys[i + 1])) ? [] : {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return root;
  },

  /**
   * Checks whether a nested path exists in an object.
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string|Array<string|number>} path - Dot path or key array.
   * @returns {boolean} True if the path resolves.
   */
  has(object, path) {
    const keys = _toPath(path);
    let current = object;
    for (const key of keys) {
      if (current == null || !(key in Object(current))) return false;
      current = current[key];
    }
    return true;
  },

  /**
   * Returns a new object containing only the given keys.
   *
   * @example
   * nodeComfort.obj.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string[]} keys - Keys to keep.
   * @returns {Record<string, any>} The picked object.
   */
  pick(object, keys) {
    const result = {};
    for (const key of keys) {
      if (object != null && Object.hasOwn(object, key)) result[key] = object[key];
    }
    return result;
  },

  /**
   * Returns a new object without the given keys.
   *
   * @example
   * nodeComfort.obj.omit({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string[]} keys - Keys to remove.
   * @returns {Record<string, any>} The remaining object.
   */
  omit(object, keys) {
    const exclude = new Set(keys);
    const result = {};
    for (const key of Object.keys(object ?? {})) {
      if (!exclude.has(key)) result[key] = object[key];
    }
    return result;
  },

  /**
   * Returns a new object keeping only the entries that pass a predicate.
   *
   * @example
   * nodeComfort.obj.filter({ a: 1, b: 2, c: 3 }, (v) => v > 1); // { b: 2, c: 3 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {(value: any, key: string) => boolean} predicate - Test function.
   * @returns {Record<string, any>} The filtered object.
   */
  filter(object, predicate) {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      if (predicate(value, key)) result[key] = value;
    }
    return result;
  },

  /**
   * Maps over an object's values, returning a new object with the same keys.
   *
   * @example
   * nodeComfort.obj.mapValues({ a: 1, b: 2 }, (v) => v * 10); // { a: 10, b: 20 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {(value: any, key: string) => any} fn - Mapping function.
   * @returns {Record<string, any>} The mapped object.
   */
  mapValues(object, fn) {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      result[key] = fn(value, key);
    }
    return result;
  },

  /**
   * Maps over an object's keys, returning a new object with remapped keys.
   *
   * @example
   * nodeComfort.obj.mapKeys({ a: 1 }, (k) => k.toUpperCase()); // { A: 1 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {(key: string, value: any) => string} fn - Key-mapping function.
   * @returns {Record<string, any>} The remapped object.
   */
  mapKeys(object, fn) {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      result[fn(key, value)] = value;
    }
    return result;
  },

  /**
   * Swaps keys and values of an object.
   *
   * @example
   * nodeComfort.obj.invert({ a: "x", b: "y" }); // { x: "a", y: "b" }
   *
   * @param {Record<string, any>} object - Source object.
   * @returns {Record<string, string>} The inverted object.
   */
  invert(object) {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      result[value] = key;
    }
    return result;
  },

  /**
   * Removes entries whose value is `null` or `undefined` (shallow).
   *
   * @example
   * nodeComfort.obj.compact({ a: 1, b: null, c: undefined }); // { a: 1 }
   *
   * @param {Record<string, any>} object - Source object.
   * @returns {Record<string, any>} The compacted object.
   */
  compact(object) {
    return this.filter(object, (v) => v !== null && v !== undefined);
  },

  /**
   * Flattens a nested object into a single-level object with dot-path keys.
   *
   * @example
   * nodeComfort.obj.flatten({ a: { b: { c: 1 } } }); // { "a.b.c": 1 }
   *
   * @param {Record<string, any>} object - Source object.
   * @param {string} [prefix=""] - Prefix for keys (used internally).
   * @returns {Record<string, any>} The flattened object.
   */
  flatten(object, prefix = "") {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (checker.isPlainObject(value) && Object.keys(value).length) {
        Object.assign(result, this.flatten(value, path));
      } else {
        result[path] = value;
      }
    }
    return result;
  },

  /**
   * Rebuilds a nested object from a flat, dot-path keyed object.
   *
   * @example
   * nodeComfort.obj.unflatten({ "a.b.c": 1 }); // { a: { b: { c: 1 } } }
   *
   * @param {Record<string, any>} object - Flat object.
   * @returns {Record<string, any>} The nested object.
   */
  unflatten(object) {
    let result = {};
    for (const [path, value] of Object.entries(object ?? {})) {
      result = this.set(result, path, value);
    }
    return result;
  },

  /**
   * Checks whether an object has no own enumerable keys.
   *
   * @param {Record<string, any>} object - Source object.
   * @returns {boolean} True if the object is empty.
   */
  isEmpty(object) {
    return object == null || Object.keys(object).length === 0;
  },

  /**
   * Freezes an object deeply, making it (and all nested objects) immutable.
   *
   * @param {Record<string, any>} object - Object to freeze.
   * @returns {Record<string, any>} The same, now deeply-frozen, object.
   */
  deepFreeze(object) {
    if (object == null || typeof object !== "object" || Object.isFrozen(object)) {
      return object;
    }
    Object.freeze(object);
    for (const key of Object.keys(object)) {
      this.deepFreeze(object[key]);
    }
    return object;
  },
};
