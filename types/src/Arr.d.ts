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
export function chunk(array: any[], size: number): any[][];
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
export function unique(array: any[], iteratee?: string | ((item: any) => any)): any[];
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
export function groupBy(array: any[], iteratee: string | ((item: any) => any)): Record<string, any[]>;
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
export function keyBy(array: any[], iteratee: string | ((item: any) => any)): Record<string, any>;
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
export function partition(array: any[], predicate: (item: any, index: number) => boolean): [any[], any[]];
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
export function flatten(array: any[], depth?: number): any[];
/**
 * Returns a shuffled copy of an array (Fisher–Yates).
 *
 * Uses `Math.random` • not cryptographically secure.
 *
 * @param {any[]} array - Source array.
 * @returns {any[]} A new shuffled array.
 */
export function shuffle(array: any[]): any[];
/**
 * Returns a random element from an array.
 *
 * @param {any[]} array - Source array.
 * @returns {any} A random element, or undefined if empty.
 */
export function sample(array: any[]): any;
/**
 * Returns `n` random elements from an array (without repetition).
 *
 * @param {any[]} array - Source array.
 * @param {number} n - Number of elements to pick.
 * @returns {any[]} The sampled elements.
 */
export function sampleSize(array: any[], n: number): any[];
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
export function sortBy(array: any[], iteratees: string | ((item: any) => any) | Array<string | ((item: any) => any)>, direction?: "asc" | "desc"): any[];
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
export function difference(array: any[], ...others: any[][]): any[];
/**
 * Returns the elements common to all provided arrays.
 *
 * @example
 * nodeComfort.arr.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
 *
 * @param {...any[]} arrays - Arrays to intersect.
 * @returns {any[]} The intersection.
 */
export function intersection(...arrays: any[][]): any[];
/**
 * Returns the union (unique values) of all provided arrays.
 *
 * @example
 * nodeComfort.arr.union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
 *
 * @param {...any[]} arrays - Arrays to unite.
 * @returns {any[]} The union.
 */
export function union(...arrays: any[][]): any[];
/**
 * Zips multiple arrays together into an array of tuples.
 *
 * @example
 * nodeComfort.arr.zip(["a", "b"], [1, 2]); // [["a", 1], ["b", 2]]
 *
 * @param {...any[]} arrays - Arrays to zip.
 * @returns {any[][]} The zipped tuples.
 */
export function zip(...arrays: any[][]): any[][];
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
export function compact(array: any[]): any[];
/**
 * Returns the first element (or the first `n` elements) of an array.
 *
 * @param {any[]} array - Source array.
 * @param {number} [n] - How many elements to take.
 * @returns {any} The first element, or the first `n` elements when `n` is given.
 */
export function first(array: any[], n?: number): any;
/**
 * Returns the last element (or the last `n` elements) of an array.
 *
 * @param {any[]} array - Source array.
 * @param {number} [n] - How many elements to take.
 * @returns {any} The last element, or the last `n` elements when `n` is given.
 */
export function last(array: any[], n?: number): any;
/**
 * Removes items from an array where the predicate is true, returning a new array.
 *
 * @param {any[]} array - Source array.
 * @param {(item: any, index: number) => boolean} predicate - Removal test.
 * @returns {any[]} A new array without the removed items.
 */
export function remove(array: any[], predicate: (item: any, index: number) => boolean): any[];
/**
 * Moves an element from one index to another (returns a new array).
 *
 * @param {any[]} array - Source array.
 * @param {number} from - Source index.
 * @param {number} to - Destination index.
 * @returns {any[]} The reordered array.
 */
export function move(array: any[], from: number, to: number): any[];
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
export function countBy(array: any[], iteratee?: string | ((item: any) => any)): Record<string, number>;
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
export function sumBy(array: any[], iteratee?: string | ((item: any) => number)): number;
/**
 * Returns the item with the maximum derived value.
 *
 * @param {any[]} array - Source array.
 * @param {string|((item: any) => number)} [iteratee] - Key or function.
 * @returns {any} The item, or undefined if the array is empty.
 */
export function maxBy(array: any[], iteratee?: string | ((item: any) => number)): any;
/**
 * Returns the item with the minimum derived value.
 *
 * @param {any[]} array - Source array.
 * @param {string|((item: any) => number)} [iteratee] - Key or function.
 * @returns {any} The item, or undefined if the array is empty.
 */
export function minBy(array: any[], iteratee?: string | ((item: any) => number)): any;
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
export function times(n: number, value?: any | ((index: number) => any)): any[];
//# sourceMappingURL=Arr.d.ts.map
