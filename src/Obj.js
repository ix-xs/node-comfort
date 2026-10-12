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
const shared = require("./internal/shared.js");

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
 * Options for `sortKeys()`.
 * @typedef {object} SortKeysOptions
 * @property {boolean} [deep] Sort nested objects too, arrays included. Defaults to `true`. With `false`, only the first level is copied and sorted: what it holds is shared with the original.
 * @property {(a: string, b: string) => number} [compare] How to order two keys. Defaults to code-unit order, which is stable across machines.
 */

/**
 * Options for `compact()`.
 * @typedef {object} CompactOptions
 * @property {boolean} [deep] Clean nested objects and arrays too.
 * @property {boolean} [removeEmpty] Also remove `""`, `[]` and `{}`.
 */

const _UNSAFE = shared.UNSAFE_KEYS;

/** Marks an unknown path segment in `PathStep`. */
const _NOT_FOUND = Symbol("not-found");

const _isPlain = shared.isPlainObject;

/** @param {ReadonlyArray<string | number>} keys */
const _isSafePath = (keys) => {
  for (let i = 0; i < keys.length; i++) if (_UNSAFE.has(String(keys[i]))) return false;
  return true;
};

/** @type {Map<string, { keys: Array<string | number>, safe: boolean }>} */
const _paths = new Map();

/**
 * Parses `"a.b[0].c"` or `["a", "b", 0, "c"]` into keys, and says whether
 * the path stays clear of prototypes. Parsed strings are remembered: paths
 * are almost always literals.
 * @param {unknown} path
 * @returns {{ keys: ReadonlyArray<string | number>, safe: boolean }}
 */
const _parsePath = (path) => {
  if (Array.isArray(path)) return { keys: path, safe: _isSafePath(path) };
  const text = String(path);
  let parsed = _paths.get(text);
  if (parsed === undefined) {
    const dotted = text.includes("[") ? text.replace(/\[(\d+)\]/g, ".$1").replace(/\[["']?([^\]"']+)["']?\]/g, ".$1") : text;
    const keys = dotted.includes(".") ? dotted.split(".").filter((part) => part !== "") : dotted === "" ? [] : [dotted];
    parsed = { keys, safe: _isSafePath(keys) };
    if (_paths.size >= 1000) _paths.clear();
    _paths.set(text, parsed);
  }
  return parsed;
};

/**
 * Deep copy that keeps what `structuredClone` loses: functions and class
 * prototypes. Shared references stay shared and cycles are preserved.
 * @param {any} value
 * @param {Map<object, any>} seen
 * @returns {any}
 */
const _deepClone = (value, seen) => {
  if (value === null || typeof value !== "object") return value;
  const known = seen.get(value);
  if (known !== undefined) return known;
  if (Array.isArray(value)) {
    /** @type {any[]} */
    const out = new Array(value.length);
    seen.set(value, out);
    for (let i = 0; i < value.length; i++) if (i in value) out[i] = _deepClone(value[i], seen);
    return out;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    /** @type {any} */
    const out = proto === null ? Object.create(null) : {};
    seen.set(value, out);
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!_UNSAFE.has(key)) out[key] = _deepClone(value[key], seen);
    }
    const symbols = Object.getOwnPropertySymbols(value);
    for (let i = 0; i < symbols.length; i++) {
      if (Object.prototype.propertyIsEnumerable.call(value, symbols[i])) out[symbols[i]] = _deepClone(value[symbols[i]], seen);
    }
    return out;
  }
  if (types.isDate(value)) return new Date(value.getTime());
  if (types.isRegExp(value)) {
    const out = new RegExp(value.source, value.flags);
    out.lastIndex = value.lastIndex;
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
  if (ArrayBuffer.isView(value)) {
    // Buffer.slice() is a view on the same memory, not a copy.
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    if (types.isDataView(value)) return new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    return /** @type {any} */ (value).slice();
  }
  if (types.isAnyArrayBuffer(value)) return value.slice(0);
  if (value instanceof URL) return new URL(value.href);
  if (value instanceof URLSearchParams) return new URLSearchParams(value);
  // Things that hold state outside their properties are shared, not copied.
  if (types.isPromise(value) || types.isWeakMap(value) || types.isWeakSet(value) || types.isProxy(value)) return value;
  const out = Object.create(proto);
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
 * Is it plain data, which merge copies, rather than a live object (a class
 * instance, a connection) that it must keep as is?
 * @param {unknown} value
 * @returns {boolean}
 */
const _isData = (value) =>
  Array.isArray(value) || _isPlain(value) || types.isDate(value) || types.isMap(value) || types.isSet(value) || types.isRegExp(value) || ArrayBuffer.isView(value) || types.isAnyArrayBuffer(value);

/**
 * Merges `source` into `target`, which the caller owns. What comes from the
 * source is copied, so the result shares nothing with the inputs.
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @param {MergeOptions} options
 * @returns {Record<string, any>}
 */
const _mergeInto = (target, source, options) => {
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (_UNSAFE.has(key)) continue;
    const value = source[key];
    if (value === undefined && options.skipUndefined) continue;
    const current = Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined;
    if (_isPlain(value)) {
      target[key] = _mergeInto(_isPlain(current) ? current : {}, value, options);
    } else if (Array.isArray(value)) {
      const copy = _deepClone(value, new Map());
      if (!Array.isArray(current) || options.arrays === undefined || options.arrays === "replace") target[key] = copy;
      else target[key] = options.arrays === "unique" ? [...new Set([...current, ...copy])] : [...current, ...copy];
    } else {
      target[key] = _isData(value) ? _deepClone(value, new Map()) : value;
    }
  }
  return target;
};


/**
 * Deep copy. Unlike `structuredClone`, it keeps functions and class
 * instances (with their prototype), and it's faster on plain data. Shared
 * references and cycles are preserved.
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
  return _deepClone(value, new Map());
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
  /** @type {Record<string, any>} */
  const out = {};
  for (const source of sources) if (_isPlain(source)) _mergeInto(out, source, _NO_OPTIONS);
  return out;
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
  /** @type {Record<string, any>} */
  const out = {};
  for (const source of sources) if (_isPlain(source)) _mergeInto(out, source, options ?? _NO_OPTIONS);
  return out;
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
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  return _equal(a, b, [], []);
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
 * Own enumerable keys and values are the same.
 * @param {any} a
 * @param {any} b
 * @param {object[]} stackA
 * @param {object[]} stackB
 * @returns {boolean}
 */
const _equalKeys = (a, b, stackA, stackB) => {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || !_equal(a[key], b[key], stackA, stackB)) return false;
  }
  return true;
};

/**
 * The stacks hold the objects being compared, so a cycle is recognized
 * without a `WeakMap` lookup for every object.
 * @param {any} a
 * @param {any} b
 * @param {object[]} stackA
 * @param {object[]} stackB
 * @returns {boolean}
 */
function _equal(a, b, stackA, stackB) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.getPrototypeOf(b) && !_sameBuiltIn(a, b)) return false;
  for (let i = stackA.length - 1; i >= 0; i--) if (stackA[i] === a) return stackB[i] === b;
  stackA.push(a);
  stackB.push(b);
  const result = _equalObjects(a, b, proto, stackA, stackB);
  stackA.pop();
  stackB.pop();
  return result;
}

/**
 * @param {any} a
 * @param {any} b
 * @param {object | null} proto
 * @param {object[]} stackA
 * @param {object[]} stackB
 * @returns {boolean}
 */
const _equalObjects = (a, b, proto, stackA, stackB) => {
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!_equal(a[i], b[i], stackA, stackB)) return false;
    return true;
  }
  if (proto === Object.prototype || proto === null) return _equalKeys(a, b, stackA, stackB);
  if (types.isDate(a)) return a.getTime() === b.getTime();
  if (types.isRegExp(a)) return a.source === b.source && a.flags === b.flags;
  if (ArrayBuffer.isView(a) || types.isAnyArrayBuffer(a)) {
    const x = ArrayBuffer.isView(a) ? new Uint8Array(a.buffer, a.byteOffset, a.byteLength) : new Uint8Array(a);
    const y = ArrayBuffer.isView(b) ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength) : new Uint8Array(b);
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  if (types.isMap(a)) {
    if (a.size !== b.size) return false;
    outer: for (const [key, value] of a) {
      if (b.has(key)) {
        if (!_equal(value, b.get(key), stackA, stackB)) return false;
        continue;
      }
      for (const [otherKey, otherValue] of b) if (_equal(key, otherKey, stackA, stackB) && _equal(value, otherValue, stackA, stackB)) continue outer;
      return false;
    }
    return true;
  }
  if (types.isSet(a)) {
    if (a.size !== b.size) return false;
    outer: for (const value of a) {
      if (b.has(value)) continue;
      for (const other of b) if (_equal(value, other, stackA, stackB)) continue outer;
      return false;
    }
    return true;
  }
  // These keep their content outside enumerable properties.
  if (types.isBoxedPrimitive(a)) return Object.is(a.valueOf(), b.valueOf());
  if (types.isNativeError(a)) return a.name === b.name && a.message === b.message && _equalKeys(a, b, stackA, stackB);
  if (a instanceof URL) return a.href === b.href;
  if (a instanceof URLSearchParams) return a.toString() === b.toString();
  return _equalKeys(a, b, stackA, stackB);
};

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
  /** @type {Array<string | number>} */
  const path = [];
  /** @type {(a: any, b: any) => void} */
  const walk = (a, b) => {
    if (Object.is(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      const size = Math.max(a.length, b.length);
      for (let i = 0; i < size; i++) {
        path.push(i);
        if (i >= b.length) changes.push({ path: [...path], type: "removed", from: a[i] });
        else if (i >= a.length) changes.push({ path: [...path], type: "added", to: b[i] });
        else walk(a[i], b[i]);
        path.pop();
      }
      return;
    }
    if (_isPlain(a) && _isPlain(b)) {
      for (const key of Object.keys(a)) {
        path.push(key);
        if (Object.prototype.hasOwnProperty.call(b, key)) walk(a[key], b[key]);
        else changes.push({ path: [...path], type: "removed", from: a[key] });
        path.pop();
      }
      for (const key of Object.keys(b)) {
        if (!Object.prototype.hasOwnProperty.call(a, key)) changes.push({ path: [...path, key], type: "added", to: b[key] });
      }
      return;
    }
    if (!equal(a, b)) changes.push({ path: [...path], type: "changed", from: a, to: b });
  };
  walk(before, after);
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
  const { keys, safe } = _parsePath(path);
  if (!safe) return fallback;
  /** @type {any} */
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    if (current === null || current === undefined) return fallback;
    current = current[keys[i]];
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
  const { keys, safe } = _parsePath(path);
  /** @type {any} */
  const root = object === null || typeof object !== "object" ? {} : clone(object);
  if (!keys.length || !safe) return root;
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
 * Returns a copy where the value at `path` is replaced by what `updater`
 * returns for it. Handy for counters and lists.
 *
 * @example
 * obj.update(state, "stats.visits", (n = 0) => n + 1);
 * obj.update(cart, "items", (items = []) => [...items, product]);
 *
 * @template T
 * @param {T} object
 * @param {PathInput<T>} path
 * @param {(value: any) => unknown} updater Gets the current value, `undefined` if there's none.
 * @returns {T}
 */
function update(object, path, updater) {
  return set(object, path, updater(get(object, /** @type {any} */ (path))));
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
  const { keys, safe } = _parsePath(path);
  /** @type {any} */
  const root = clone(object);
  if (!keys.length || !safe || root === null || typeof root !== "object") return root;
  let current = root;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current?.[keys[i]];
    if (current === null || typeof current !== "object") return root;
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current) && (typeof lastKey === "number" || /^\d+$/.test(lastKey))) current.splice(Number(lastKey), 1);
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
  const { keys, safe } = _parsePath(path);
  if (!keys.length || !safe) return false;
  /** @type {any} */
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), keys[i])) return false;
    current = current[keys[i]];
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
  if (object === null || object === undefined) return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key) && !_UNSAFE.has(/** @type {any} */ (key))) out[key] = object[key];
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
    if (!exclude.has(key) && !_UNSAFE.has(key)) out[key] = /** @type {any} */ (object)[key];
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
  for (const key of Object.keys(object ?? {})) {
    if (_UNSAFE.has(key)) continue;
    const value = /** @type {any} */ (object)[key];
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
  for (const key of Object.keys(object ?? {})) {
    if (!_UNSAFE.has(key)) out[key] = fn(/** @type {any} */ (object)[key], /** @type {keyof T & string} */ (key));
  }
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
    if (_UNSAFE.has(key)) continue;
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
  /** @type {(value: Record<string, unknown>, path: string) => void} */
  const walk = (value, path) => {
    for (const key of Object.keys(value)) {
      if (_UNSAFE.has(key)) continue;
      const child = value[key];
      const next = path ? `${path}.${key}` : key;
      if (_isPlain(child) && Object.keys(child).length) walk(child, next);
      else out[next] = child;
    }
  };
  walk(/** @type {any} */ (object ?? {}), prefix);
  return out;
}

/**
 * Every leaf path of an object, in dotted form. Arrays count as leaves.
 *
 * @example
 * obj.paths({ db: { host: "x", port: 5432 }, tags: ["a"] }); // ["db.host", "db.port", "tags"]
 *
 * @param {object} object
 * @returns {string[]}
 */
function paths(object) {
  return Object.keys(flatten(object));
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
    const { keys, safe } = _parsePath(path);
    if (!keys.length || !safe) continue;
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
 * Is there nothing in it? No own keys for an object, no entries for a Map
 * or a Set. `null` and `undefined` count as empty; a date, a regular
 * expression and an error never do.
 *
 * @example
 * obj.isEmpty({});                  // true
 * obj.isEmpty(new Map([["a", 1]])); // false
 *
 * @param {unknown} object
 * @returns {boolean}
 */
function isEmpty(object) {
  if (object === null || object === undefined) return true;
  if (types.isMap(object) || types.isSet(object)) return /** @type {Set<unknown>} */ (object).size === 0;
  if (types.isDate(object) || types.isRegExp(object) || types.isNativeError(object)) return false;
  return Object.keys(object).length === 0;
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
  if (object === null || (typeof object !== "object" && typeof object !== "function") || Object.isFrozen(object)) return /** @type {DeepReadonly<T>} */ (object);
  // Typed arrays and buffers can't be frozen: their memory stays writable.
  if (ArrayBuffer.isView(object)) return /** @type {DeepReadonly<T>} */ (object);
  Object.freeze(object);
  for (const key of Reflect.ownKeys(/** @type {object} */ (object))) deepFreeze(/** @type {any} */ (object)[key]);
  return /** @type {DeepReadonly<T>} */ (object);
}

/**
 * A copy with its keys in order, nested objects included. Two objects with
 * the same content then give the same JSON, which makes stable hashes,
 * cache keys and readable diffs.
 *
 * @example
 * obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }); // { a: { c: 2, d: 1 }, b: 1 }
 * nc.crypto.hash(JSON.stringify(obj.sortKeys(payload)));
 *
 * @template T
 * @param {T} object
 * @param {SortKeysOptions} [options]
 * @returns {T}
 */
function sortKeys(object, options = {}) {
  const deep = options.deep ?? true;
  /** @type {object[]} */
  const ancestors = [];
  /** @type {(value: any) => any} */
  const walk = (value) => {
    if (value === null || typeof value !== "object" || ancestors.includes(value)) return value;
    const isArray = Array.isArray(value);
    if (!isArray && !_isPlain(value)) return value;
    ancestors.push(value);
    /** @type {any} */
    let out;
    if (isArray) out = deep ? value.map(walk) : value;
    else {
      out = {};
      for (const key of Object.keys(value).sort(options.compare)) {
        if (!_UNSAFE.has(key)) out[key] = deep ? walk(value[key]) : value[key];
      }
    }
    ancestors.pop();
    return out;
  };
  return walk(object);
}

/** @type {MergeOptions} */
const _NO_OPTIONS = {};

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
  update,
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
  paths,
  sortKeys,
  keys,
  entries,
  fromEntries,
  size,
  isEmpty,
  deepFreeze,
};
