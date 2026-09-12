"use strict";

/**
 * Array helpers. None of them mutate what you pass in, and item types carry
 * through (`chunk(numbers, 2)` is a `number[][]`). Many take an iteratee:
 * a property name, which your editor completes, or a function.
 *
 * @example
 * arr.chunk([1, 2, 3, 4, 5], 2);          // [[1, 2], [3, 4], [5]]
 * arr.groupBy(users, "role");             // { admin: [...], user: [...] }
 * arr.sortBy(users, ["lastName", "age"]);
 */

/**
 * How to get a value out of an item: a property name, or a function
 * `(item, index) => value`.
 *
 * @template T
 * @typedef {(T extends object ? keyof T & (string | number) : never) | ((item: T, index: number) => unknown)} Iteratee
 */

/**
 * A sort key for `sortBy()`: an iteratee, or `[iteratee, "asc" | "desc"]`
 * to give that key its own direction.
 *
 * @template T
 * @typedef {Iteratee<T> | [Iteratee<T>, "asc" | "desc"]} SortKey
 */

/**
 * Options for `sortBy()`.
 * @typedef {object} SortByOptions
 * @property {"asc"|"desc"} [order] Direction for keys that don't set their own. Defaults to `"asc"`.
 * @property {boolean} [natural] Sort text like a person would: ignore case, respect accents, `"item2"` before `"item10"`.
 * @property {string} [locale] Language used by `natural`. Defaults to the system's.
 */

/**
 * A page returned by `paginate()`.
 * @template T
 * @typedef {object} Page
 * @property {T[]} items The items on this page.
 * @property {number} page The page number, starting at 1.
 * @property {number} perPage
 * @property {number} total Total number of items.
 * @property {number} pages Number of pages, at least 1.
 * @property {boolean} hasPrev
 * @property {boolean} hasNext
 */

/**
 * @param {unknown} iteratee
 * @returns {(item: any, index: number) => any}
 */
const _fn = (iteratee) => {
  if (typeof iteratee === "function") return /** @type {(item: any, index: number) => any} */ (iteratee);
  if (typeof iteratee === "string" || typeof iteratee === "number" || typeof iteratee === "symbol") {
    return (item) => (item == null ? undefined : item[iteratee]);
  }
  return (item) => item;
};

/**
 * @param {unknown} key
 * @returns {PropertyKey}
 */
const _key = (key) => (typeof key === "symbol" || typeof key === "number" ? key : String(key));

/**
 * Splits an array into groups of `size` items. The last group can be shorter.
 *
 * @example
 * arr.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * arr.chunk(emails, 100).forEach(sendBatch);
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} size
 * @returns {T[][]}
 */
function chunk(array, size) {
  const n = Math.floor(size);
  if (!(n >= 1)) return [];
  /** @type {T[][]} */
  const out = [];
  for (let i = 0; i < array.length; i += n) out.push(array.slice(i, i + n));
  return out;
}

/**
 * Sliding windows of `size` items, moving by `step`. Good for moving
 * averages and comparing neighbours.
 *
 * @example
 * arr.windows([1, 2, 3, 4], 2);       // [[1, 2], [2, 3], [3, 4]]
 * arr.windows([1, 2, 3, 4, 5], 3, 2); // [[1, 2, 3], [3, 4, 5]]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} size
 * @param {number} [step=1]
 * @returns {T[][]}
 */
function windows(array, size, step = 1) {
  const n = Math.floor(size);
  const s = Math.max(1, Math.floor(step));
  /** @type {T[][]} */
  const out = [];
  if (!(n >= 1)) return out;
  for (let i = 0; i + n <= array.length; i += s) out.push(array.slice(i, i + n));
  return out;
}

/**
 * The first item, or the first `n` items.
 *
 * @example
 * arr.first([1, 2, 3]);    // 1
 * arr.first([1, 2, 3], 2); // [1, 2]
 *
 * @template T
 * @overload
 * @param {readonly T[]} array
 * @returns {T | undefined}
 */
/**
 * The first `n` items.
 *
 * @template T
 * @overload
 * @param {readonly T[]} array
 * @param {number} n
 * @returns {T[]}
 */
/**
 * @template T
 * @param {readonly T[]} array
 * @param {number} [n]
 * @returns {T | T[] | undefined}
 */
function first(array, n) {
  if (n === undefined) return array[0];
  return array.slice(0, Math.max(0, n));
}

/**
 * The last item, or the last `n` items.
 *
 * @example
 * arr.last([1, 2, 3]);    // 3
 * arr.last([1, 2, 3], 2); // [2, 3]
 *
 * @template T
 * @overload
 * @param {readonly T[]} array
 * @returns {T | undefined}
 */
/**
 * The last `n` items.
 *
 * @template T
 * @overload
 * @param {readonly T[]} array
 * @param {number} n
 * @returns {T[]}
 */
/**
 * @template T
 * @param {readonly T[]} array
 * @param {number} [n]
 * @returns {T | T[] | undefined}
 */
function last(array, n) {
  if (n === undefined) return array[array.length - 1];
  return n <= 0 ? [] : array.slice(-n);
}

/**
 * One page of an array, with what you need to draw pagination controls.
 * Pages start at 1; an out-of-range page is brought back into range.
 *
 * @example
 * arr.paginate(products, 2, 20);
 * // { items: [...], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} [page=1]
 * @param {number} [perPage=20]
 * @returns {Page<T>}
 */
function paginate(array, page = 1, perPage = 20) {
  const size = Math.max(1, Math.floor(perPage));
  const pages = Math.max(1, Math.ceil(array.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * size;
  return {
    items: array.slice(start, start + size),
    page: current,
    perPage: size,
    total: array.length,
    pages,
    hasPrev: current > 1,
    hasNext: current < pages,
  };
}

/**
 * Removes duplicates. With an iteratee, items that give the same value are
 * duplicates; the first one is kept.
 *
 * @example
 * arr.unique([1, 1, 2, 3]);                  // [1, 2, 3]
 * arr.unique(users, "email");                // one user per email
 * arr.unique(tags, (t) => t.toLowerCase());
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee]
 * @returns {T[]}
 */
function unique(array, iteratee) {
  if (iteratee === undefined) return [...new Set(array)];
  const fn = _fn(iteratee);
  const seen = new Set();
  return array.filter((item, i) => {
    const key = fn(item, i);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Groups items by key.
 *
 * @example
 * arr.groupBy(users, "role"); // { admin: [...], user: [...] }
 * arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even")); // { odd: [1, 3], even: [2, 4] }
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} iteratee
 * @returns {Record<string, T[]>}
 */
function groupBy(array, iteratee) {
  const fn = _fn(iteratee);
  /** @type {Record<PropertyKey, T[]>} */
  const out = {};
  array.forEach((item, i) => {
    (out[_key(fn(item, i))] ??= []).push(item);
  });
  return out;
}

/**
 * Indexes items by key. If two items share a key, the last one wins.
 *
 * @example
 * const byId = arr.keyBy(users, "id");
 * byId[42]; // user 42
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} iteratee
 * @returns {Record<string, T>}
 */
function keyBy(array, iteratee) {
  const fn = _fn(iteratee);
  /** @type {Record<PropertyKey, T>} */
  const out = {};
  array.forEach((item, i) => {
    out[_key(fn(item, i))] = item;
  });
  return out;
}

/**
 * Builds a `Map` from an array. Unlike `keyBy()`, keys keep their type.
 *
 * @example
 * arr.toMap(users, "id");                 // Map<number, User>
 * arr.toMap(users, "id", (u) => u.name);  // Map<number, string>
 *
 * @template T
 * @template [V=T]
 * @param {readonly T[]} array
 * @param {Iteratee<T>} key
 * @param {(item: T, index: number) => V} [value] The value to store. Defaults to the item.
 * @returns {Map<any, V>}
 */
function toMap(array, key, value) {
  const keyFn = _fn(key);
  /** @type {Map<any, V>} */
  const map = new Map();
  array.forEach((item, i) => map.set(keyFn(item, i), value ? value(item, i) : /** @type {V} */ (/** @type {unknown} */ (item))));
  return map;
}

/**
 * Counts items per key.
 *
 * @example
 * arr.countBy(["a", "b", "a"]);  // { a: 2, b: 1 }
 * arr.countBy(users, "country"); // { FR: 12, US: 7 }
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee] Defaults to the item itself.
 * @returns {Record<string, number>}
 */
function countBy(array, iteratee) {
  const fn = _fn(iteratee);
  /** @type {Record<PropertyKey, number>} */
  const out = {};
  array.forEach((item, i) => {
    const key = _key(fn(item, i));
    out[key] = (out[key] ?? 0) + 1;
  });
  return out;
}

/**
 * Counts the items that pass a test.
 *
 * @example
 * arr.count(users, (u) => u.active);
 *
 * @template T
 * @param {readonly T[]} array
 * @param {(item: T, index: number) => unknown} predicate
 * @returns {number}
 */
function count(array, predicate) {
  let total = 0;
  array.forEach((item, i) => {
    if (predicate(item, i)) total++;
  });
  return total;
}

/**
 * Splits items into those that pass a test and those that don't.
 *
 * @example
 * const [adults, minors] = arr.partition(people, (p) => p.age >= 18);
 *
 * @template T
 * @param {readonly T[]} array
 * @param {(item: T, index: number) => unknown} predicate
 * @returns {[T[], T[]]}
 */
function partition(array, predicate) {
  /** @type {T[]} */
  const pass = [];
  /** @type {T[]} */
  const fail = [];
  array.forEach((item, i) => (predicate(item, i) ? pass : fail).push(item));
  return [pass, fail];
}

/**
 * Takes one property from every item.
 *
 * @example
 * arr.pluck(users, "email"); // ["ada@x.io", "bob@x.io"]
 *
 * @template T
 * @template {keyof T} K
 * @param {readonly T[]} array
 * @param {K} key
 * @returns {Array<T[K]>}
 */
function pluck(array, key) {
  return array.map((item) => (item == null ? /** @type {T[K]} */ (/** @type {unknown} */ (undefined)) : item[key]));
}

/**
 * Sorts by one or more keys, each with its own direction if you like.
 * The sort is stable and `null`/`undefined` always go last.
 *
 * @example
 * arr.sortBy(users, "age");                         // youngest first
 * arr.sortBy(users, "age", "desc");                 // oldest first
 * arr.sortBy(users, [["age", "desc"], "lastName"]);
 * arr.sortBy(files, "name", { natural: true });     // "file2" before "file10"
 *
 * @template T
 * @param {readonly T[]} array
 * @param {SortKey<T> | Array<SortKey<T>>} keys
 * @param {"asc" | "desc" | SortByOptions} [order="asc"]
 * @returns {T[]}
 */
function sortBy(array, keys, order = "asc") {
  const options = typeof order === "string" ? { order } : order;
  const defaultDir = options.order === "desc" ? -1 : 1;
  const collator = options.natural ? new Intl.Collator(options.locale, { numeric: true, sensitivity: "base" }) : null;
  const isTuple = (/** @type {unknown} */ k) => Array.isArray(k) && k.length === 2 && (k[1] === "asc" || k[1] === "desc");
  const list = Array.isArray(keys) && !isTuple(keys) ? keys : [keys];
  const comparators = list.map((k) => {
    const [iteratee, dir] = isTuple(k) ? /** @type {[unknown, string]} */ (k) : [k, undefined];
    return { fn: _fn(iteratee), dir: dir === undefined ? defaultDir : dir === "desc" ? -1 : 1 };
  });
  return array
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      for (const { fn, dir } of comparators) {
        const va = fn(a.item, a.index);
        const vb = fn(b.item, b.index);
        const aNil = va === null || va === undefined;
        const bNil = vb === null || vb === undefined;
        if (aNil || bNil) {
          if (aNil && bNil) continue;
          return aNil ? 1 : -1;
        }
        let result = 0;
        if (collator && typeof va === "string" && typeof vb === "string") result = collator.compare(va, vb);
        else if (va < vb) result = -1;
        else if (va > vb) result = 1;
        if (result) return result * dir;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * A shuffled copy (Fisher-Yates).
 *
 * @template T
 * @param {readonly T[]} array
 * @returns {T[]}
 */
function shuffle(array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One random item, or `undefined` if the array is empty.
 *
 * @template T
 * @param {readonly T[]} array
 * @returns {T | undefined}
 */
function sample(array) {
  return array.length ? array[Math.floor(Math.random() * array.length)] : undefined;
}

/**
 * `n` random items, never the same one twice.
 *
 * @example
 * arr.sampleSize(players, 3);
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} n
 * @returns {T[]}
 */
function sampleSize(array, n) {
  return shuffle(array).slice(0, Math.max(0, n));
}

/**
 * Rotates items. Positive `n` moves items from the start to the end,
 * negative `n` the other way.
 *
 * @example
 * arr.rotate([1, 2, 3, 4], 1);  // [2, 3, 4, 1]
 * arr.rotate([1, 2, 3, 4], -1); // [4, 1, 2, 3]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} [n=1]
 * @returns {T[]}
 */
function rotate(array, n = 1) {
  if (!array.length) return [];
  const k = ((Math.trunc(n) % array.length) + array.length) % array.length;
  return [...array.slice(k), ...array.slice(0, k)];
}

/**
 * Moves one item to another position. Negative indexes count from the end.
 *
 * @example
 * arr.move(["a", "b", "c"], 0, 2); // ["b", "c", "a"]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} from
 * @param {number} to
 * @returns {T[]}
 */
function move(array, from, to) {
  const out = [...array];
  const len = out.length;
  const src = from < 0 ? len + from : from;
  if (src < 0 || src >= len) return out;
  const [item] = out.splice(src, 1);
  out.splice(to < 0 ? len + to : to, 0, item);
  return out;
}

/**
 * Swaps two items.
 *
 * @example
 * arr.swap(["a", "b", "c"], 0, 2); // ["c", "b", "a"]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} i
 * @param {number} j
 * @returns {T[]}
 */
function swap(array, i, j) {
  const out = [...array];
  if (i in out && j in out) [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/**
 * Items of `array` that appear in none of the others.
 *
 * @example
 * arr.difference([1, 2, 3, 4], [2, 4]); // [1, 3]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {...ReadonlyArray<T>} others
 * @returns {T[]}
 */
function difference(array, ...others) {
  const exclude = new Set(others.flat());
  return array.filter((item) => !exclude.has(item));
}

/**
 * Items present in every array, without duplicates.
 *
 * @example
 * arr.intersection([1, 2, 3], [2, 3, 4], [3, 2]); // [2, 3]
 *
 * @template T
 * @param {...ReadonlyArray<T>} arrays
 * @returns {T[]}
 */
function intersection(...arrays) {
  if (!arrays.length) return [];
  const [head, ...rest] = arrays;
  const sets = rest.map((a) => new Set(a));
  return [...new Set(head)].filter((item) => sets.every((set) => set.has(item)));
}

/**
 * Items present in any array, without duplicates.
 *
 * @example
 * arr.union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
 *
 * @template T
 * @param {...ReadonlyArray<T>} arrays
 * @returns {T[]}
 */
function union(...arrays) {
  return [...new Set(arrays.flat())];
}

/**
 * A copy without the given values. `NaN` works too.
 *
 * @example
 * arr.without([1, 2, 3, 2], 2); // [1, 3]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {...T} values
 * @returns {T[]}
 */
function without(array, ...values) {
  const exclude = new Set(values);
  return array.filter((item) => !exclude.has(item));
}

/**
 * A copy without the items that pass the test.
 *
 * @example
 * arr.remove([1, 2, 3, 4], (n) => n % 2 === 0); // [1, 3]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {(item: T, index: number) => unknown} predicate
 * @returns {T[]}
 */
function remove(array, predicate) {
  return array.filter((item, i) => !predicate(item, i));
}

/**
 * Removes falsy values (`false`, `null`, `undefined`, `0`, `""`, `NaN`).
 *
 * @example
 * arr.compact([0, 1, false, 2, "", 3, null]); // [1, 2, 3]
 *
 * @template T
 * @param {readonly T[]} array
 * @returns {Array<Exclude<T, false | 0 | 0n | "" | null | undefined>>}
 */
function compact(array) {
  return /** @type {any} */ (array.filter(Boolean));
}

/**
 * Adds the item if it's missing, removes it if it's there. Handy for
 * multi-select state.
 *
 * @example
 * arr.toggle(["a", "b"], "b"); // ["a"]
 * arr.toggle(["a"], "b");      // ["a", "b"]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {T} item
 * @returns {T[]}
 */
function toggle(array, item) {
  return array.includes(item) ? array.filter((x) => x !== item) : [...array, item];
}

/**
 * Replaces the item with the same identity, or appends it if there's none.
 *
 * @example
 * arr.upsert(users, { id: 2, name: "Bob" }, "id");
 *
 * @template T
 * @param {readonly T[]} array
 * @param {T} item
 * @param {Iteratee<T>} identity What makes two items "the same", like `"id"`.
 * @returns {T[]}
 */
function upsert(array, item, identity) {
  const fn = _fn(identity);
  const id = fn(item, -1);
  const index = array.findIndex((x, i) => fn(x, i) === id);
  if (index === -1) return [...array, item];
  const out = [...array];
  out[index] = item;
  return out;
}

/**
 * Inserts items at an index. Negative indexes count from the end.
 *
 * @example
 * arr.insert(["a", "d"], 1, "b", "c"); // ["a", "b", "c", "d"]
 *
 * @template T
 * @param {readonly T[]} array
 * @param {number} index
 * @param {...T} items
 * @returns {T[]}
 */
function insert(array, index, ...items) {
  const out = [...array];
  out.splice(index, 0, ...items);
  return out;
}

/**
 * Flattens nested arrays, one level by default.
 *
 * @example
 * arr.flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]
 * arr.flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
 *
 * @template T
 * @template {number} [D=1]
 * @param {readonly T[]} array
 * @param {D} [depth]
 * @returns {FlatArray<T[], D>[]}
 */
function flatten(array, depth) {
  return /** @type {any} */ (array.flat(depth ?? 1));
}

/**
 * Pairs items by position. Shorter arrays leave `undefined` holes.
 *
 * @example
 * arr.zip(["a", "b"], [1, 2]); // [["a", 1], ["b", 2]]
 *
 * @template T
 * @param {...ReadonlyArray<T>} arrays
 * @returns {Array<Array<T | undefined>>}
 */
function zip(...arrays) {
  const size = Math.max(0, ...arrays.map((a) => a.length));
  return Array.from({ length: size }, (_, i) => arrays.map((a) => a[i]));
}

/**
 * The opposite of `zip()`: rows become columns.
 *
 * @example
 * arr.unzip([["a", 1], ["b", 2]]); // [["a", "b"], [1, 2]]
 *
 * @template T
 * @param {ReadonlyArray<ReadonlyArray<T>>} tuples
 * @returns {Array<Array<T | undefined>>}
 */
function unzip(tuples) {
  return zip(...tuples);
}

/**
 * Takes items from each array in turn, then appends the rest.
 *
 * @example
 * arr.interleave([1, 3, 5], [2, 4]); // [1, 2, 3, 4, 5]
 *
 * @template T
 * @param {...ReadonlyArray<T>} arrays
 * @returns {T[]}
 */
function interleave(...arrays) {
  /** @type {T[]} */
  const out = [];
  const size = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < size; i++) for (const a of arrays) if (i < a.length) out.push(a[i]);
  return out;
}

/**
 * Every combination of one item from each array.
 *
 * @example
 * arr.cartesian(["S", "M"], ["red", "blue"]);
 * // [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]
 *
 * @template T
 * @param {...ReadonlyArray<T>} arrays
 * @returns {T[][]}
 */
function cartesian(...arrays) {
  if (!arrays.length) return [];
  return arrays.reduce((acc, list) => acc.flatMap((combo) => list.map((item) => [...combo, item])), /** @type {T[][]} */ ([[]]));
}

/**
 * An array of `n` items, from a value or a function of the index.
 *
 * @example
 * arr.times(3, "x");          // ["x", "x", "x"]
 * arr.times(3, (i) => i * 2); // [0, 2, 4]
 *
 * @template T
 * @param {number} n
 * @param {T | ((index: number) => T)} [value]
 * @returns {T[]}
 */
function times(n, value) {
  const size = Math.max(0, Math.floor(n));
  const fn = typeof value === "function" ? /** @type {(index: number) => T} */ (value) : () => /** @type {T} */ (value);
  return Array.from({ length: size }, (_, i) => fn(i));
}

/**
 * Adds up a number from each item. Non-numbers count as 0.
 *
 * @example
 * arr.sumBy(cart, "price");
 * arr.sumBy(cart, (item) => item.price * item.quantity);
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee]
 * @returns {number}
 */
function sumBy(array, iteratee) {
  const fn = _fn(iteratee);
  return array.reduce((acc, item, i) => acc + (Number(fn(item, i)) || 0), 0);
}

/**
 * The average of a number from each item, or `0` for an empty array.
 *
 * @example
 * arr.averageBy(reviews, "rating"); // 4.3
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee]
 * @returns {number}
 */
function averageBy(array, iteratee) {
  return array.length ? sumBy(array, iteratee) / array.length : 0;
}

/**
 * The item with the highest value.
 *
 * @example
 * arr.maxBy(players, "score");
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee]
 * @returns {T | undefined}
 */
function maxBy(array, iteratee) {
  const fn = _fn(iteratee);
  /** @type {T | undefined} */
  let best;
  /** @type {any} */
  let bestValue;
  array.forEach((item, i) => {
    const v = fn(item, i);
    if (v !== null && v !== undefined && (bestValue === undefined || v > bestValue)) {
      bestValue = v;
      best = item;
    }
  });
  return best;
}

/**
 * The item with the lowest value.
 *
 * @example
 * arr.minBy(products, "price");
 *
 * @template T
 * @param {readonly T[]} array
 * @param {Iteratee<T>} [iteratee]
 * @returns {T | undefined}
 */
function minBy(array, iteratee) {
  const fn = _fn(iteratee);
  /** @type {T | undefined} */
  let best;
  /** @type {any} */
  let bestValue;
  array.forEach((item, i) => {
    const v = fn(item, i);
    if (v !== null && v !== undefined && (bestValue === undefined || v < bestValue)) {
      bestValue = v;
      best = item;
    }
  });
  return best;
}

module.exports = {
  chunk,
  windows,
  first,
  last,
  paginate,
  unique,
  groupBy,
  keyBy,
  toMap,
  countBy,
  count,
  partition,
  pluck,
  sortBy,
  shuffle,
  sample,
  sampleSize,
  rotate,
  move,
  swap,
  difference,
  intersection,
  union,
  without,
  remove,
  compact,
  toggle,
  upsert,
  insert,
  flatten,
  zip,
  unzip,
  interleave,
  cartesian,
  times,
  sumBy,
  averageBy,
  maxBy,
  minBy,
};
