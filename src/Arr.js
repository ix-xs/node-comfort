/**
 * Array utilities.
 *
 * Chunking, grouping, uniqueness, set operations, shuffling, flattening and
 * more • expressed as small pure functions that never mutate their input.
 *
 * Many methods accept an `iteratee`: either a property key (string) or a
 * function mapping an item to a value.
 */

/**
 * Turns a key or function into a value-extracting function.
 * @private
 * @param {string|((item: any) => any)} [iteratee]
 * @returns {(item: any) => any}
 */
const _iteratee = (iteratee) => {
  if (typeof iteratee === "function") return iteratee;
  if (typeof iteratee === "string") return (item) => (item == null ? undefined : item[iteratee]);
  return (item) => item;
};

module.exports = {
  /**
   * Splits an array into chunks of a given size.
   *
   * @example
   * nodeComfort.arr.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
   *
   * @param {any[]} array - Source array.
   * @param {number} size - Chunk size (must be >= 1).
   * @returns {any[][]} The chunked array.
   */
  chunk(array, size) {
    if (size < 1) return [];
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  },

  /**
   * Returns a new array with duplicate values removed.
   *
   * Pass an `iteratee` to de-duplicate by a derived key.
   *
   * @example
   * nodeComfort.arr.unique([1, 1, 2, 3]);                       // [1, 2, 3]
   * nodeComfort.arr.unique([{ id: 1 }, { id: 1 }], "id");       // [{ id: 1 }]
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => any)} [iteratee] - Key or function to compare by.
   * @returns {any[]} The de-duplicated array.
   */
  unique(array, iteratee) {
    if (!iteratee) return [...new Set(array)];
    const fn = _iteratee(iteratee);
    const seen = new Set();
    const result = [];
    for (const item of array) {
      const key = fn(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  },

  /**
   * Groups the items of an array by a key or function.
   *
   * @example
   * nodeComfort.arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"));
   * // { odd: [1, 3], even: [2, 4] }
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => any)} iteratee - Key or function to group by.
   * @returns {Record<string, any[]>} The grouped object.
   */
  groupBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    const result = {};
    for (const item of array) {
      const key = fn(item);
      (result[key] ??= []).push(item);
    }
    return result;
  },

  /**
   * Builds an object keyed by a derived value, mapping each key to the
   * (last) matching item.
   *
   * @example
   * nodeComfort.arr.keyBy([{ id: "a" }, { id: "b" }], "id");
   * // { a: { id: "a" }, b: { id: "b" } }
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => any)} iteratee - Key or function.
   * @returns {Record<string, any>} The keyed object.
   */
  keyBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    const result = {};
    for (const item of array) result[fn(item)] = item;
    return result;
  },

  /**
   * Partitions an array into two groups based on a predicate:
   * `[matching, notMatching]`.
   *
   * @example
   * nodeComfort.arr.partition([1, 2, 3, 4], (n) => n % 2 === 0);
   * // [[2, 4], [1, 3]]
   *
   * @param {any[]} array - Source array.
   * @param {(item: any, index: number) => boolean} predicate - Test function.
   * @returns {[any[], any[]]} The two partitions.
   */
  partition(array, predicate) {
    const pass = [];
    const fail = [];
    array.forEach((item, i) => (predicate(item, i) ? pass : fail).push(item));
    return [pass, fail];
  },

  /**
   * Recursively flattens a nested array up to a given depth.
   *
   * @example
   * nodeComfort.arr.flatten([1, [2, [3, [4]]]]);      // [1, 2, 3, [4]]
   * nodeComfort.arr.flatten([1, [2, [3]]], Infinity); // [1, 2, 3]
   *
   * @param {any[]} array - Source array.
   * @param {number} [depth=1] - Maximum depth to flatten.
   * @returns {any[]} The flattened array.
   */
  flatten(array, depth = 1) {
    return array.flat(depth);
  },

  /**
   * Returns a shuffled copy of an array (Fisher–Yates).
   *
   * Uses `Math.random` • not cryptographically secure.
   *
   * @param {any[]} array - Source array.
   * @returns {any[]} A new shuffled array.
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  /**
   * Returns a random element from an array.
   *
   * @param {any[]} array - Source array.
   * @returns {any} A random element, or undefined if empty.
   */
  sample(array) {
    return array.length ? array[Math.floor(Math.random() * array.length)] : undefined;
  },

  /**
   * Returns `n` random elements from an array (without repetition).
   *
   * @param {any[]} array - Source array.
   * @param {number} n - Number of elements to pick.
   * @returns {any[]} The sampled elements.
   */
  sampleSize(array, n) {
    return this.shuffle(array).slice(0, Math.max(0, n));
  },

  /**
   * Sorts an array by one or more iteratees, ascending by default.
   *
   * Does not mutate the input.
   *
   * @example
   * nodeComfort.arr.sortBy(users, "age");
   * nodeComfort.arr.sortBy(users, [(u) => u.age, "name"]);
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => any)|Array<string|((item: any) => any)>} iteratees - Sort key(s).
   * @param {"asc"|"desc"} [direction="asc"] - Sort direction.
   * @returns {any[]} A new sorted array.
   */
  sortBy(array, iteratees, direction = "asc") {
    const fns = (Array.isArray(iteratees) ? iteratees : [iteratees]).map(_iteratee);
    const dir = direction === "desc" ? -1 : 1;
    return [...array].sort((a, b) => {
      for (const fn of fns) {
        const va = fn(a);
        const vb = fn(b);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
      }
      return 0;
    });
  },

  /**
   * Returns the elements present in the first array but not in the others.
   *
   * @example
   * nodeComfort.arr.difference([1, 2, 3, 4], [2, 4]); // [1, 3]
   *
   * @param {any[]} array - Source array.
   * @param {...any[]} others - Arrays to subtract.
   * @returns {any[]} The difference.
   */
  difference(array, ...others) {
    const exclude = new Set(others.flat());
    return array.filter((item) => !exclude.has(item));
  },

  /**
   * Returns the elements common to all provided arrays.
   *
   * @example
   * nodeComfort.arr.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
   *
   * @param {...any[]} arrays - Arrays to intersect.
   * @returns {any[]} The intersection.
   */
  intersection(...arrays) {
    if (!arrays.length) return [];
    const [first, ...rest] = arrays;
    const sets = rest.map((a) => new Set(a));
    return [...new Set(first)].filter((item) => sets.every((set) => set.has(item)));
  },

  /**
   * Returns the union (unique values) of all provided arrays.
   *
   * @example
   * nodeComfort.arr.union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
   *
   * @param {...any[]} arrays - Arrays to unite.
   * @returns {any[]} The union.
   */
  union(...arrays) {
    return [...new Set(arrays.flat())];
  },

  /**
   * Zips multiple arrays together into an array of tuples.
   *
   * @example
   * nodeComfort.arr.zip(["a", "b"], [1, 2]); // [["a", 1], ["b", 2]]
   *
   * @param {...any[]} arrays - Arrays to zip.
   * @returns {any[][]} The zipped tuples.
   */
  zip(...arrays) {
    const length = Math.max(0, ...arrays.map((a) => a.length));
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(arrays.map((a) => a[i]));
    }
    return result;
  },

  /**
   * Splits an array into `matching` and removes falsy values.
   *
   * Removes `false`, `null`, `0`, `""`, `undefined` and `NaN`.
   *
   * @example
   * nodeComfort.arr.compact([0, 1, false, 2, "", 3, null]); // [1, 2, 3]
   *
   * @param {any[]} array - Source array.
   * @returns {any[]} The compacted array.
   */
  compact(array) {
    return array.filter(Boolean);
  },

  /**
   * Returns the first element (or the first `n` elements) of an array.
   *
   * @param {any[]} array - Source array.
   * @param {number} [n] - How many elements to take.
   * @returns {any} The first element, or the first `n` elements when `n` is given.
   */
  first(array, n) {
    if (n === undefined) return array[0];
    return array.slice(0, Math.max(0, n));
  },

  /**
   * Returns the last element (or the last `n` elements) of an array.
   *
   * @param {any[]} array - Source array.
   * @param {number} [n] - How many elements to take.
   * @returns {any} The last element, or the last `n` elements when `n` is given.
   */
  last(array, n) {
    if (n === undefined) return array[array.length - 1];
    return array.slice(Math.max(0, array.length - n));
  },

  /**
   * Removes items from an array where the predicate is true, returning a new array.
   *
   * @param {any[]} array - Source array.
   * @param {(item: any, index: number) => boolean} predicate - Removal test.
   * @returns {any[]} A new array without the removed items.
   */
  remove(array, predicate) {
    return array.filter((item, i) => !predicate(item, i));
  },

  /**
   * Moves an element from one index to another (returns a new array).
   *
   * @param {any[]} array - Source array.
   * @param {number} from - Source index.
   * @param {number} to - Destination index.
   * @returns {any[]} The reordered array.
   */
  move(array, from, to) {
    const result = [...array];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },

  /**
   * Counts occurrences of each derived key in an array.
   *
   * @example
   * nodeComfort.arr.countBy(["a", "b", "a"]);       // { a: 2, b: 1 }
   * nodeComfort.arr.countBy([1.1, 2.3, 1.7], Math.floor); // { 1: 2, 2: 1 }
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => any)} [iteratee] - Key or function.
   * @returns {Record<string, number>} The counts.
   */
  countBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    const result = {};
    for (const item of array) {
      const key = fn(item);
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  },

  /**
   * Sums an array by a numeric iteratee (or the values themselves).
   *
   * @example
   * nodeComfort.arr.sumBy([{ n: 1 }, { n: 2 }], "n"); // 3
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => number)} [iteratee] - Key or function returning a number.
   * @returns {number} The sum.
   */
  sumBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    return array.reduce((acc, item) => acc + (Number(fn(item)) || 0), 0);
  },

  /**
   * Returns the item with the maximum derived value.
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => number)} [iteratee] - Key or function.
   * @returns {any} The item, or undefined if the array is empty.
   */
  maxBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    let best;
    let bestVal = -Infinity;
    for (const item of array) {
      const val = fn(item);
      if (val > bestVal) {
        bestVal = val;
        best = item;
      }
    }
    return best;
  },

  /**
   * Returns the item with the minimum derived value.
   *
   * @param {any[]} array - Source array.
   * @param {string|((item: any) => number)} [iteratee] - Key or function.
   * @returns {any} The item, or undefined if the array is empty.
   */
  minBy(array, iteratee) {
    const fn = _iteratee(iteratee);
    let best;
    let bestVal = Infinity;
    for (const item of array) {
      const val = fn(item);
      if (val < bestVal) {
        bestVal = val;
        best = item;
      }
    }
    return best;
  },

  /**
   * Creates an array of a given length, filled by a value or generator function.
   *
   * @example
   * nodeComfort.arr.times(3, "x");           // ["x", "x", "x"]
   * nodeComfort.arr.times(3, (i) => i * 2);  // [0, 2, 4]
   *
   * @param {number} n - Number of items.
   * @param {any|((index: number) => any)} [value] - Fill value or generator.
   * @returns {any[]} The generated array.
   */
  times(n, value) {
    const fn = typeof value === "function" ? value : () => value;
    const result = [];
    for (let i = 0; i < n; i++) result.push(fn(i));
    return result;
  },
};
