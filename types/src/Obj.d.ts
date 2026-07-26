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
export function clone<T>(value: T): T;
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
export function merge(...sources: Record<string, any>[]): Record<string, any>;
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
export function equal(a: any, b: any): boolean;
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
export function get(object: Record<string, any>, path: string | Array<string | number>, fallback?: any): any;
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
export function set(object: Record<string, any>, path: string | Array<string | number>, value: any): Record<string, any>;
/**
 * Checks whether a nested path exists in an object.
 *
 * @param {Record<string, any>} object - Source object.
 * @param {string|Array<string|number>} path - Dot path or key array.
 * @returns {boolean} True if the path resolves.
 */
export function has(object: Record<string, any>, path: string | Array<string | number>): boolean;
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
export function pick(object: Record<string, any>, keys: string[]): Record<string, any>;
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
export function omit(object: Record<string, any>, keys: string[]): Record<string, any>;
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
export function filter(object: Record<string, any>, predicate: (value: any, key: string) => boolean): Record<string, any>;
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
export function mapValues(object: Record<string, any>, fn: (value: any, key: string) => any): Record<string, any>;
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
export function mapKeys(object: Record<string, any>, fn: (key: string, value: any) => string): Record<string, any>;
/**
 * Swaps keys and values of an object.
 *
 * @example
 * nodeComfort.obj.invert({ a: "x", b: "y" }); // { x: "a", y: "b" }
 *
 * @param {Record<string, any>} object - Source object.
 * @returns {Record<string, string>} The inverted object.
 */
export function invert(object: Record<string, any>): Record<string, string>;
/**
 * Removes entries whose value is `null` or `undefined` (shallow).
 *
 * @example
 * nodeComfort.obj.compact({ a: 1, b: null, c: undefined }); // { a: 1 }
 *
 * @param {Record<string, any>} object - Source object.
 * @returns {Record<string, any>} The compacted object.
 */
export function compact(object: Record<string, any>): Record<string, any>;
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
export function flatten(object: Record<string, any>, prefix?: string): Record<string, any>;
/**
 * Rebuilds a nested object from a flat, dot-path keyed object.
 *
 * @example
 * nodeComfort.obj.unflatten({ "a.b.c": 1 }); // { a: { b: { c: 1 } } }
 *
 * @param {Record<string, any>} object - Flat object.
 * @returns {Record<string, any>} The nested object.
 */
export function unflatten(object: Record<string, any>): Record<string, any>;
/**
 * Checks whether an object has no own enumerable keys.
 *
 * @param {Record<string, any>} object - Source object.
 * @returns {boolean} True if the object is empty.
 */
export function isEmpty(object: Record<string, any>): boolean;
/**
 * Freezes an object deeply, making it (and all nested objects) immutable.
 *
 * @param {Record<string, any>} object - Object to freeze.
 * @returns {Record<string, any>} The same, now deeply-frozen, object.
 */
export function deepFreeze(object: Record<string, any>): Record<string, any>;
//# sourceMappingURL=Obj.d.ts.map