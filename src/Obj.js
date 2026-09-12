"use strict";

/**
 * Object helpers: deep clone, merge, equality, diff, typed dot paths,
 * pick and omit. Inputs are never mutated, and `__proto__`, `constructor`
 * and `prototype` keys are always ignored, so user input can't pollute
 * prototypes.
 *
 * @example
 * obj.get(config, "db.pool.max", 10);         // typed, paths autocompleted
 * obj.set(state, "user.profile.name", "Ada"); // returns an updated copy
 * obj.merge(defaults, userConfig);
 */

const { types } = require("node:util");

/**
 * Values that end a path: dates, regexes, maps, sets, functions and arrays.
 * @typedef {Date | RegExp | Map<any, any> | Set<any> | ((...args: any[]) => any) | readonly any[]} PathLeaf
 */

/**
 * Every dotted path of an object type, up to 6 levels. This is what powers
 * path completion in `obj.get()` and friends.
 *
 * @example
 * // Paths<{ a: { b: number }, c: string }> is "a" | "a.b" | "c"
 *
 * @template T
 * @template {unknown[]} [Depth=[]]
 * @typedef {Depth["length"] extends 6 ? never : T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${Paths<NonNullable<T[K]>, [...Depth, 0]>}` : `${K}` }[keyof T & (string | number)] : never} Paths
 */

/**
 * @template T
 * @typedef {[Extract<T, null | undefined>] extends [never] ? never : undefined} NullishToUndefined
 */

/**
 * The type found at a dotted path of `T`, or `any` for an unknown path.
 *
 * @template T
 * @template {string} P
 * @typedef {P extends `${infer Head}.${infer Rest}` ? PathStep<T, Head> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : PathValue<Next, Rest> | NullishToUndefined<T>) : any : PathStep<T, P> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : Next | NullishToUndefined<T>) : any} PathValue
 */

/**
 * @template T
 * @template {string} K
 * @typedef {K extends keyof NonNullable<T> ? NonNullable<T>[K] : NonNullable<T> extends readonly (infer E)[] ? (K extends `${number}` ? E | undefined : typeof _NOT_FOUND) : typeof _NOT_FOUND} PathStep
 */

/**
 * A path: a known dotted path (completed by your editor), any other string
 * like `"items[0].name"`, or an array of keys.
 *
 * @template T
 * @typedef {Paths<T> | (string & {}) | ReadonlyArray<string | number>} PathInput
 */

/**
 * `T`, read-only all the way down.
 * @template T
 * @typedef {T extends (...args: any[]) => any ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T} DeepReadonly
 */

/**
 * One difference reported by `diff()`.
 * @typedef {object} Change
 * @property {Array<string | number>} path Where it changed, like `["address", "city"]`.
 * @property {"added" | "removed" | "changed"} type
 * @property {unknown} [from] The old value.
 * @property {unknown} [to] The new value.
 */

/**
 * Options for `mergeWith()`.
 * @typedef {object} MergeOptions
 * @property {"replace" | "concat" | "unique"} [arrays] When both sides have an array: keep the last, join them, or join without duplicates. Defaults to `"replace"`.
 * @property {boolean} [skipUndefined] Don't let `undefined` overwrite an existing value.
 */

/**
 * Options for `compact()`.
 * @typedef {object} CompactOptions
 * @property {boolean} [deep] Clean nested objects and arrays too.
 * @property {boolean} [removeEmpty] Also remove `""`, `[]` and `{}`.
 */

const _UNSAFE = new Set(["__proto__", "constructor", "prototype"]);

/** Marks an unknown path segment in `PathStep`. */
const _NOT_FOUND = Symbol("not-found");

/** @param {unknown} value */
const _isPlain = (value) => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  // The last check accepts objects from another realm (a worker, a `vm`).
  return proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null;
};

/**
 * Parses `"a.b[0].c"` or `["a", "b", 0, "c"]` into keys.
 * @param {unknown} path
 * @returns {Array<string | number>}
 */
const _toPath = (path) => {
  if (Array.isArray(path)) return path;
  return String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[["']?([^\]"']+)["']?\]/g, ".$1")
    .split(".")
    .filter((part) => part !== "");
};

/** @param {Array<string | number>} keys */
const _isSafePath = (keys) => keys.every((key) => !_UNSAFE.has(String(key)));

/**
 * Deep copy for what `structuredClone` can't handle (functions, class instances).
 * @param {any} value
 * @param {WeakMap<object, any>} seen
 * @returns {any}
 */
const _deepClone = (value, seen) => {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (types.isDate(value)) return new Date(value.getTime());
  if (types.isRegExp(value)) return new RegExp(value.source, value.flags);
  if (Array.isArray(value)) {
    const out = /** @type {any[]} */ ([]);
    seen.set(value, out);
    for (const item of value) out.push(_deepClone(item, seen));
    return out;
  }
  if (types.isMap(value)) {
    const out = new Map();
    seen.set(value, out);
    for (const [k, v] of value) out.set(_deepClone(k, seen), _deepClone(v, seen));
    return out;
  }
  if (types.isSet(value)) {
    const out = new Set();
    seen.set(value, out);
    for (const v of value) out.add(_deepClone(v, seen));
    return out;
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return /** @type {any} */ (value).slice();
  }
  const out = Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "string" && _UNSAFE.has(key)) continue;
    const descriptor = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(value, key));
    if ("value" in descriptor) descriptor.value = _deepClone(descriptor.value, seen);
    Object.defineProperty(out, key, descriptor);
  }
  return out;
};

/**
 * @param {any} target
 * @param {any} source
 * @param {MergeOptions} options
 * @returns {any}
 */
const _mergeTwo = (target, source, options) => {
  if (Array.isArray(target) && Array.isArray(source)) {
    if (options.arrays === "concat") return [...target, ...source];
    if (options.arrays === "unique") return [...new Set([...target, ...source])];
    return [...source];
  }
  if (!_isPlain(source)) return source;
  const out = /** @type {Record<string, any>} */ (_isPlain(target) ? { ...target } : {});
  for (const key of Object.keys(source)) {
    if (_UNSAFE.has(key)) continue;
    const value = source[key];
    if (value === undefined && options.skipUndefined) continue;
    const current = out[key];
    out[key] = (_isPlain(value) && _isPlain(current)) || (Array.isArray(value) && Array.isArray(current))
      ? _mergeTwo(current, value, options)
      : _isPlain(value)
        ? _mergeTwo({}, value, options)
        : value;
  }
  return out;
};

/**
 * Deep copy. Uses `structuredClone` when it can, and falls back to a copy
 * that keeps functions and class prototypes.
 *
 * @example
 * const copy = obj.clone({ a: { b: [1, 2] }, when: new Date() });
 * copy.a.b.push(3); // the original is untouched
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
function clone(value) {
  if (value === null || typeof value !== "object") return value;
  if (_isPlain(value) || Array.isArray(value)) {
    try {
      return structuredClone(value);
    } catch {
      // Functions or exotic values inside: fall through to the manual copy.
    }
  }
  return _deepClone(value, new WeakMap());
}

/**
 * Deep-merges objects into a new one. Later objects win, nested objects are
 * merged, arrays are replaced. See `mergeWith()` to join arrays instead.
 *
 * @example
 * obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
 * // { db: { host: "localhost", port: 6543 } }
 *
 * @template {object} A
 * @overload
 * @param {A} a
 * @returns {A}
 */
/**
 * Deep-merges `b` into a copy of `a`.
 *
 * @template {object} A
 * @template {object} B
 * @overload
 * @param {A} a
 * @param {B} b
 * @returns {A & B}
 */
/**
 * Deep-merges three objects; the last one wins.
 *
 * @template {object} A
 * @template {object} B
 * @template {object} C
 * @overload
 * @param {A} a
 * @param {B} b
 * @param {C} c
 * @returns {A & B & C}
 */
/**
 * Deep-merges any number of objects; the last one wins.
 *
 * @overload
 * @param {...object} sources
 * @returns {Record<string, any>}
 */
/**
 * @param {...object} sources
 * @returns {Record<string, any>}
 */
function merge(...sources) {
  return sources.reduce((acc, source) => (_isPlain(source) ? _mergeTwo(acc, source, {}) : acc), /** @type {Record<string, any>} */ ({}));
}

/**
 * Like `merge()`, with a choice of what happens to arrays and `undefined`.
 *
 * @example
 * obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] });
 * // { tags: ["a", "b", "c"] }
 * obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });
 * // { port: 80 }
 *
 * @param {MergeOptions} options
 * @param {...object} sources
 * @returns {Record<string, any>}
 */
function mergeWith(options, ...sources) {
  return sources.reduce((acc, source) => (_isPlain(source) ? _mergeTwo(acc, source, options) : acc), /** @type {Record<string, any>} */ ({}));
}

/**
 * Fills in missing properties from defaults, deeply. Values that are set,
 * even `null` or `0`, are kept.
 *
 * @example
 * obj.defaults({ port: 8080, db: { user: "me" } }, { port: 80, db: { user: "root", pass: "" } });
 * // { port: 8080, db: { user: "me", pass: "" } }
 *
 * @template {object} T
 * @template {object} D
 * @param {T} target
 * @param {...D} sources The first one has the highest priority.
 * @returns {T & D}
 */
function defaults(target, ...sources) {
  /** @type {(t: any, s: any) => any} */
  const fill = (t, s) => {
    const out = _isPlain(t) ? { ...t } : {};
    for (const key of Object.keys(s)) {
      if (_UNSAFE.has(key)) continue;
      if (out[key] === undefined) out[key] = clone(s[key]);
      else if (_isPlain(out[key]) && _isPlain(s[key])) out[key] = fill(out[key], s[key]);
    }
    return out;
  };
  return sources.reduce((acc, source) => (_isPlain(source) ? fill(acc, source) : acc), /** @type {any} */ (clone(target)));
}

/**
 * Deep equality. Knows about arrays, dates, regexes, maps, sets, typed
 * arrays, `NaN` and circular references.
 *
 * @example
 * obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
 * obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
 * obj.equal({ a: 1 }, { a: 1, b: undefined });          // false
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function equal(a, b) {
  return _equal(a, b, new WeakMap());
}

/**
 * Same kind of built-in value, even when they come from different realms
 * (a worker, a `vm` context) where prototypes are not shared.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
const _sameBuiltIn = (a, b) => {
  const tag = Object.prototype.toString.call(a);
  if (tag !== Object.prototype.toString.call(b)) return false;
  return tag !== "[object Object]" || (Object.getPrototypeOf(Object.getPrototypeOf(a) ?? {}) === null && Object.getPrototypeOf(Object.getPrototypeOf(b) ?? {}) === null);
};

/**
 * @param {any} a
 * @param {any} b
 * @param {WeakMap<object, object>} seen
 * @returns {boolean}
 */
function _equal(a, b, seen) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b) && !_sameBuiltIn(a, b)) return false;
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (types.isDate(a)) return a.getTime() === b.getTime();
  if (types.isRegExp(a)) return a.source === b.source && a.flags === b.flags;
  if (Array.isArray(a)) return a.length === b.length && a.every((item, i) => _equal(item, b[i], seen));
  if (ArrayBuffer.isView(a) && !(a instanceof DataView)) {
    const x = /** @type {any} */ (a);
    return x.length === b.length && x.every((/** @type {unknown} */ v, /** @type {number} */ i) => Object.is(v, b[i]));
  }
  if (types.isMap(a)) {
    if (a.size !== b.size) return false;
    outer: for (const [key, value] of a) {
      if (b.has(key)) {
        if (!_equal(value, b.get(key), seen)) return false;
        continue;
      }
      for (const [otherKey, otherValue] of b) if (_equal(key, otherKey, seen) && _equal(value, otherValue, seen)) continue outer;
      return false;
    }
    return true;
  }
  if (types.isSet(a)) {
    if (a.size !== b.size) return false;
    outer: for (const value of a) {
      if (b.has(value)) continue;
      for (const other of b) if (_equal(value, other, seen)) continue outer;
      return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && _equal(a[key], b[key], seen));
}

/**
 * Lists what changed between two values, deeply. Handy for audit logs and
 * partial updates.
 *
 * @example
 * obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
 * // [
 * //   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
 * //   { path: ["tags", 1], type: "added", to: "b" },
 * // ]
 *
 * @param {unknown} before
 * @param {unknown} after
 * @returns {Change[]} Empty when nothing changed.
 */
function diff(before, after) {
  /** @type {Change[]} */
  const changes = [];
  /** @type {(a: any, b: any, path: Array<string | number>) => void} */
  const walk = (a, b, path) => {
    if (equal(a, b)) return;
    const bothArrays = Array.isArray(a) && Array.isArray(b);
    if (bothArrays || (_isPlain(a) && _isPlain(b))) {
      const keys = bothArrays
        ? Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i)
        : [...new Set([...Object.keys(a), ...Object.keys(b)])];
      for (const key of keys) {
        const inA = bothArrays ? /** @type {number} */ (key) < a.length : Object.prototype.hasOwnProperty.call(a, key);
        const inB = bothArrays ? /** @type {number} */ (key) < b.length : Object.prototype.hasOwnProperty.call(b, key);
        if (inA && !inB) changes.push({ path: [...path, key], type: "removed", from: a[key] });
        else if (!inA && inB) changes.push({ path: [...path, key], type: "added", to: b[key] });
        else walk(a[key], b[key], [...path, key]);
      }
      return;
    }
    changes.push({ path, type: "changed", from: a, to: b });
  };
  walk(before, after, []);
  return changes;
}

/**
 * Reads a nested value from a dotted path. Your editor completes the paths
 * and knows the type of the result.
 *
 * @example
 * obj.get(config, "db.pool.max");      // number | undefined
 * obj.get(config, "db.pool.max", 10);  // number
 * obj.get(data, "users[0].name");
 * obj.get(data, ["users", 0, "name"]);
 *
 * @template T
 * @template {string} P
 * @overload
 * @param {T} object
 * @param {P | Paths<T> | ReadonlyArray<string | number>} path Like `"a.b.c"`, `"a[0].b"` or `["a", 0, "b"]`.
 * @returns {PathValue<T, P>}
 */
/**
 * Reads a nested value from a dotted path, or returns `fallback` if there's
 * nothing there.
 *
 * @template T
 * @template {string} P
 * @template F
 * @overload
 * @param {T} object
 * @param {P | Paths<T> | ReadonlyArray<string | number>} path Like `"a.b.c"`, `"a[0].b"` or `["a", 0, "b"]`.
 * @param {F} fallback
 * @returns {Exclude<PathValue<T, P>, undefined> | F}
 */
/**
 * @param {unknown} object
 * @param {string | ReadonlyArray<string | number>} path
 * @param {unknown} [fallback]
 * @returns {any}
 */
function get(object, path, fallback) {
  const keys = _toPath(path);
  if (!_isSafePath(keys)) return fallback;
  /** @type {any} */
  let current = object;
  for (const key of keys) {
    if (current === null || current === undefined) return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
}

/**
 * Returns a copy with a nested value set. Missing levels are created
 * (arrays when the next key is a number).
 *
 * @example
 * obj.set({}, "a.b.c", 1);            // { a: { b: { c: 1 } } }
 * obj.set(state, "user.name", "Ada"); // state is untouched
 *
 * @template T
 * @param {T} object
 * @param {PathInput<T>} path
 * @param {unknown} value
 * @returns {T}
 */
function set(object, path, value) {
  const keys = _toPath(path);
  /** @type {any} */
  const root = object === null || typeof object !== "object" ? {} : clone(object);
  if (!keys.length || !_isSafePath(keys)) return root;
  let current = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = keys[i + 1];
    if (current[key] === null || typeof current[key] !== "object") {
      current[key] = typeof next === "number" || /^\d+$/.test(String(next)) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return root;
}

/**
 * Returns a copy without the property at `path`.
 *
 * @example
 * obj.unset({ a: { b: 1, c: 2 } }, "a.b"); // { a: { c: 2 } }
 *
 * @template T
 * @param {T} object
 * @param {PathInput<T>} path
 * @returns {T}
 */
function unset(object, path) {
  const keys = _toPath(path);
  /** @type {any} */
  const root = clone(object);
  if (!keys.length || !_isSafePath(keys) || root === null || typeof root !== "object") return root;
  let current = root;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current?.[keys[i]];
    if (current === null || typeof current !== "object") return root;
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current) && typeof lastKey === "number") current.splice(lastKey, 1);
  else delete current[lastKey];
  return root;
}

/**
 * Does the path exist? A property set to `undefined` still counts.
 *
 * @example
 * obj.has({ a: { b: undefined } }, "a.b"); // true
 * obj.has({ a: {} }, "a.b");               // false
 *
 * @template T
 * @param {T} object
 * @param {PathInput<T>} path
 * @returns {boolean}
 */
function has(object, path) {
  const keys = _toPath(path);
  if (!keys.length || !_isSafePath(keys)) return false;
  /** @type {any} */
  let current = object;
  for (const key of keys) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), key)) return false;
    current = current[key];
  }
  return true;
}

/**
 * A copy with only the listed keys.
 *
 * @example
 * obj.pick(user, ["id", "email"]);
 *
 * @template {object} T
 * @template {keyof T} K
 * @param {T} object
 * @param {readonly K[]} keys
 * @returns {Pick<T, K>}
 */
function pick(object, keys) {
  /** @type {any} */
  const out = {};
  for (const key of keys) {
    if (object != null && Object.prototype.hasOwnProperty.call(object, key)) out[key] = object[key];
  }
  return out;
}

/**
 * A copy without the listed keys.
 *
 * @example
 * obj.omit(user, ["password", "token"]);
 *
 * @template {object} T
 * @template {keyof T} K
 * @param {T} object
 * @param {readonly K[]} keys
 * @returns {Omit<T, K>}
 */
function omit(object, keys) {
  const exclude = new Set(/** @type {readonly PropertyKey[]} */ (keys));
  /** @type {any} */
  const out = {};
  for (const key of Object.keys(object ?? {})) {
    if (!exclude.has(key)) out[key] = /** @type {any} */ (object)[key];
  }
  return out;
}

/**
 * Keeps the entries that pass a test.
 *
 * @example
 * obj.filter({ a: 1, b: 2, c: 3 }, (value) => value > 1); // { b: 2, c: 3 }
 *
 * @template {object} T
 * @param {T} object
 * @param {(value: T[keyof T], key: keyof T & string) => unknown} predicate
 * @returns {Partial<T>}
 */
function filter(object, predicate) {
  /** @type {any} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) {
    if (predicate(value, /** @type {keyof T & string} */ (key))) out[key] = value;
  }
  return out;
}

/**
 * Transforms every value, keeping the keys.
 *
 * @example
 * obj.mapValues({ a: 1, b: 2 }, (v) => v * 10); // { a: 10, b: 20 }
 *
 * @template {object} T
 * @template R
 * @param {T} object
 * @param {(value: T[keyof T], key: keyof T & string) => R} fn
 * @returns {{ [K in keyof T]: R }}
 */
function mapValues(object, fn) {
  /** @type {any} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) out[key] = fn(value, /** @type {keyof T & string} */ (key));
  return out;
}

/**
 * Transforms every key, keeping the values.
 *
 * @example
 * obj.mapKeys({ first_name: "Ada" }, (key) => nc.str.camelCase(key)); // { firstName: "Ada" }
 *
 * @template {object} T
 * @param {T} object
 * @param {(key: keyof T & string, value: T[keyof T]) => PropertyKey} fn Returns the new key.
 * @returns {Record<string, T[keyof T]>}
 */
function mapKeys(object, fn) {
  /** @type {any} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) {
    const next = fn(/** @type {keyof T & string} */ (key), value);
    if (typeof next === "string" && _UNSAFE.has(next)) continue;
    out[next] = value;
  }
  return out;
}

/**
 * Renames some keys and leaves the others alone.
 *
 * @example
 * obj.renameKeys({ _id: 1, name: "Ada" }, { _id: "id" }); // { id: 1, name: "Ada" }
 *
 * @template {object} T
 * @param {T} object
 * @param {Partial<Record<keyof T, string>>} mapping Old name to new name.
 * @returns {Record<string, T[keyof T]>}
 */
function renameKeys(object, mapping) {
  const map = /** @type {Record<string, string | undefined>} */ (mapping);
  return mapKeys(object, (key) => map[key] ?? key);
}

/**
 * Swaps keys and values.
 *
 * @example
 * obj.invert({ a: "x", b: "y" }); // { x: "a", y: "b" }
 *
 * @param {Record<string, PropertyKey>} object
 * @returns {Record<string, string>}
 */
function invert(object) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) {
    const next = String(value);
    if (!_UNSAFE.has(next)) out[next] = key;
  }
  return out;
}

/**
 * Removes `null` and `undefined` values, and optionally empty ones.
 *
 * @example
 * obj.compact({ a: 1, b: null, c: undefined });                          // { a: 1 }
 * obj.compact({ a: { b: null, c: "" } }, { deep: true, removeEmpty: true }); // {}
 *
 * @template {object} T
 * @param {T} object
 * @param {CompactOptions} [options]
 * @returns {Partial<T>}
 */
function compact(object, options = {}) {
  /** @type {(value: any) => boolean} */
  const isEmptyValue = (value) =>
    value === null ||
    value === undefined ||
    (options.removeEmpty === true &&
      (value === "" || (Array.isArray(value) && value.length === 0) || (_isPlain(value) && Object.keys(value).length === 0)));
  /** @type {(value: any) => any} */
  const clean = (value) => {
    if (!options.deep) return value;
    if (Array.isArray(value)) return value.map(clean).filter((v) => !isEmptyValue(v));
    if (_isPlain(value)) return compact(value, options);
    return value;
  };
  /** @type {any} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) {
    const cleaned = clean(value);
    if (!isEmptyValue(cleaned)) out[key] = cleaned;
  }
  return out;
}

/**
 * Flattens nested objects into dotted keys. Arrays stay as values.
 *
 * @example
 * obj.flatten({ db: { host: "x", port: 5432 } }); // { "db.host": "x", "db.port": 5432 }
 *
 * @param {object} object
 * @param {string} [prefix=""] Added in front of every key.
 * @returns {Record<string, unknown>}
 */
function flatten(object, prefix = "") {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(object ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (_isPlain(value) && Object.keys(/** @type {object} */ (value)).length) Object.assign(out, flatten(/** @type {object} */ (value), path));
    else out[path] = value;
  }
  return out;
}

/**
 * Rebuilds nested objects from dotted keys. The opposite of `flatten()`.
 *
 * @example
 * obj.unflatten({ "db.host": "x", "db.port": 5432 }); // { db: { host: "x", port: 5432 } }
 *
 * @param {Record<string, unknown>} object
 * @returns {Record<string, any>}
 */
function unflatten(object) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [path, value] of Object.entries(object ?? {})) {
    const keys = _toPath(path);
    if (!keys.length || !_isSafePath(keys)) continue;
    let current = out;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === null || typeof current[key] !== "object") {
        current[key] = /^\d+$/.test(String(keys[i + 1])) ? [] : {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  }
  return out;
}

/**
 * `Object.keys`, but typed with the object's actual keys.
 *
 * @example
 * for (const key of obj.keys(config)) config[key]; // no type error
 *
 * @template {object} T
 * @param {T} object
 * @returns {Array<keyof T & string>}
 */
function keys(object) {
  return /** @type {Array<keyof T & string>} */ (Object.keys(object ?? {}));
}

/**
 * `Object.entries`, with typed keys and values.
 *
 * @template {object} T
 * @param {T} object
 * @returns {Array<[keyof T & string, T[keyof T]]>}
 */
function entries(object) {
  return /** @type {Array<[keyof T & string, T[keyof T]]>} */ (Object.entries(object ?? {}));
}

/**
 * `Object.fromEntries` that accepts any iterable (a `Map` too) and skips
 * unsafe keys.
 *
 * @example
 * obj.fromEntries(new Map([["x", true]])); // { x: true }
 *
 * @template {PropertyKey} K
 * @template V
 * @param {Iterable<readonly [K, V]>} pairs
 * @returns {Record<K, V>}
 */
function fromEntries(pairs) {
  /** @type {any} */
  const out = {};
  for (const [key, value] of pairs) {
    if (typeof key === "string" && _UNSAFE.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * How many entries: own keys of an object, size of a map or set, length of
 * an array or string.
 *
 * @example
 * obj.size({ a: 1, b: 2 }); // 2
 *
 * @param {unknown} value
 * @returns {number}
 */
function size(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  if (types.isMap(value) || types.isSet(value)) return /** @type {Set<unknown>} */ (value).size;
  return typeof value === "object" ? Object.keys(value).length : 0;
}

/**
 * Does the object have no own keys? `null` and `undefined` count as empty.
 *
 * @param {unknown} object
 * @returns {boolean}
 */
function isEmpty(object) {
  return object === null || object === undefined || Object.keys(object).length === 0;
}

/**
 * Freezes an object and everything inside it. Good for configuration and
 * constants.
 *
 * @example
 * const CONFIG = obj.deepFreeze({ db: { host: "localhost" } });
 * CONFIG.db.host = "x"; // TypeScript error, and ignored at runtime
 *
 * @template T
 * @param {T} object
 * @returns {DeepReadonly<T>} The same object.
 */
function deepFreeze(object) {
  if (object !== null && (typeof object === "object" || typeof object === "function") && !Object.isFrozen(object)) {
    Object.freeze(object);
    for (const key of Reflect.ownKeys(/** @type {object} */ (object))) deepFreeze(/** @type {any} */ (object)[key]);
  }
  return /** @type {DeepReadonly<T>} */ (object);
}

module.exports = {
  clone,
  merge,
  mergeWith,
  defaults,
  equal,
  diff,
  // not shorthand: Node's ES module export detection stops at a bare `get`
  get: get,
  set,
  unset,
  has,
  pick,
  omit,
  filter,
  mapValues,
  mapKeys,
  renameKeys,
  invert,
  compact,
  flatten,
  unflatten,
  keys,
  entries,
  fromEntries,
  size,
  isEmpty,
  deepFreeze,
};
