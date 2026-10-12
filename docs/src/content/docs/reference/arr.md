---
title: "nc.arr"
description: "Array helpers. None of them mutate what you pass in, and item types carry through (`chunk(numbers, 2)` is a `number[][]`). Many take an iteratee: a property name, which your editor completes, or a function."
sidebar:
  label: "arr"
  order: 9
---

```js
const { arr } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const arr = require("@ix-xs/node-comfort/arr");
```

This page lists everything `nc.arr` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/arr/).

```js
arr.chunk([1, 2, 3, 4, 5], 2);          // [[1, 2], [3, 4], [5]]
arr.groupBy(users, "role");             // { admin: [...], user: [...] }
arr.sortBy(users, ["lastName", "age"]);
```

## chunk

```ts
chunk<T>(array: readonly T[], size: number): T[][]
```

Splits an array into groups of `size` items. The last group can be shorter.

```js
arr.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
arr.chunk(emails, 100).forEach(sendBatch);
```

## windows

```ts
windows<T>(array: readonly T[], size: number, step?: number): T[][]
```

Sliding windows of `size` items, moving by `step`. Good for moving
averages and comparing neighbours.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `size` | `number` |  |
| `step?` | `number` | Defaults to `1`. |

```js
arr.windows([1, 2, 3, 4], 2);       // [[1, 2], [2, 3], [3, 4]]
arr.windows([1, 2, 3, 4, 5], 3, 2); // [[1, 2, 3], [3, 4, 5]]
```

## first

```ts
first<T>(array: readonly T[]): T | undefined
first<T>(array: readonly T[], n: number): T[]
```

The first item, or the first `n` items.

```js
arr.first([1, 2, 3]);    // 1
arr.first([1, 2, 3], 2); // [1, 2]
```

## last

```ts
last<T>(array: readonly T[]): T | undefined
last<T>(array: readonly T[], n: number): T[]
```

The last item, or the last `n` items.

```js
arr.last([1, 2, 3]);    // 3
arr.last([1, 2, 3], 2); // [2, 3]
```

## paginate

```ts
paginate<T>(array: readonly T[], page?: number, perPage?: number): Page<T>
```

One page of an array, with what you need to draw pagination controls.
Pages start at 1; an out-of-range page is brought back into range.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `page?` | `number` | Defaults to `1`. |
| `perPage?` | `number` | Defaults to `20`. |

```js
arr.paginate(products, 2, 20);
// { items: [...], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

## unique

```ts
unique<T>(array: readonly T[], iteratee?: Iteratee<T>): T[]
```

Removes duplicates. With an iteratee, items that give the same value are
duplicates; the first one is kept.

```js
arr.unique([1, 1, 2, 3]);                  // [1, 2, 3]
arr.unique(users, "email");                // one user per email
arr.unique(tags, (t) => t.toLowerCase());
```

## groupBy

```ts
groupBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T[]>
```

Groups items by key.

```js
arr.groupBy(users, "role"); // { admin: [...], user: [...] }
arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even")); // { odd: [1, 3], even: [2, 4] }
```

## keyBy

```ts
keyBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T>
```

Indexes items by key. If two items share a key, the last one wins.

```js
const byId = arr.keyBy(users, "id");
byId[42]; // user 42
```

## toMap

```ts
toMap<T, V = T>(array: readonly T[], key: Iteratee<T>, value?: ((item: T, index: number) => V) | undefined): Map<any, V>
```

Builds a `Map` from an array. Unlike `keyBy()`, keys keep their type.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `key` | [`Iteratee`](#iteratee)`<``T``>` |  |
| `value?` | `(item: ``T``, index: number) => ``V` | The value to store. Defaults to the item. |

```js
arr.toMap(users, "id");                 // Map<number, User>
arr.toMap(users, "id", (u) => u.name);  // Map<number, string>
```

## countBy

```ts
countBy<T>(array: readonly T[], iteratee?: Iteratee<T>): Record<string, number>
```

Counts items per key.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `iteratee?` | [`Iteratee`](#iteratee)`<``T``>` | Defaults to the item itself. |

```js
arr.countBy(["a", "b", "a"]);  // { a: 2, b: 1 }
arr.countBy(users, "country"); // { FR: 12, US: 7 }
```

## count

```ts
count<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): number
```

Counts the items that pass a test.

```js
arr.count(users, (u) => u.active);
```

## partition

```ts
partition<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): [T[], T[]]
```

Splits items into those that pass a test and those that don't.

```js
const [adults, minors] = arr.partition(people, (p) => p.age >= 18);
```

## pluck

```ts
pluck<T, K extends keyof T>(array: readonly T[], key: K): T[K][]
```

Takes one property from every item.

```js
arr.pluck(users, "email"); // ["ada@x.io", "bob@x.io"]
```

## sortBy

```ts
sortBy<T>(array: readonly T[], keys: SortKey<T> | SortKey<T>[], order?: "asc" | "desc" | SortByOptions): T[]
```

Sorts by one or more keys, each with its own direction if you like.
The sort is stable and `null`/`undefined` always go last.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `keys` | [`SortKey`](#sortkey)`<``T``> \| ``Array``<`[`SortKey`](#sortkey)`<``T``>>` |  |
| `order?` | `"asc" \| "desc" \| `[`SortByOptions`](#sortbyoptions) | Defaults to `"asc"`. |

```js
arr.sortBy(users, "age");                         // youngest first
arr.sortBy(users, "age", "desc");                 // oldest first
arr.sortBy(users, [["age", "desc"], "lastName"]);
arr.sortBy(files, "name", { natural: true });     // "file2" before "file10"
```

## shuffle

```ts
shuffle<T>(array: readonly T[]): T[]
```

A shuffled copy (Fisher-Yates).

## sample

```ts
sample<T>(array: readonly T[]): T | undefined
```

One random item, or `undefined` if the array is empty.

## sampleSize

```ts
sampleSize<T>(array: readonly T[], n: number): T[]
```

`n` random items, never the same one twice.

```js
arr.sampleSize(players, 3);
```

## rotate

```ts
rotate<T>(array: readonly T[], n?: number): T[]
```

Rotates items. Positive `n` moves items from the start to the end,
negative `n` the other way.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `n?` | `number` | Defaults to `1`. |

```js
arr.rotate([1, 2, 3, 4], 1);  // [2, 3, 4, 1]
arr.rotate([1, 2, 3, 4], -1); // [4, 1, 2, 3]
```

## move

```ts
move<T>(array: readonly T[], from: number, to: number): T[]
```

Moves one item to another position. Negative indexes count from the end.

```js
arr.move(["a", "b", "c"], 0, 2); // ["b", "c", "a"]
```

## swap

```ts
swap<T>(array: readonly T[], i: number, j: number): T[]
```

Swaps two items.

```js
arr.swap(["a", "b", "c"], 0, 2); // ["c", "b", "a"]
```

## difference

```ts
difference<T>(array: readonly T[], ...others: (readonly T[])[]): T[]
```

Items of `array` that appear in none of the others.

```js
arr.difference([1, 2, 3, 4], [2, 4]); // [1, 3]
```

## intersection

```ts
intersection<T>(...arrays: (readonly T[])[]): T[]
```

Items present in every array, without duplicates.

```js
arr.intersection([1, 2, 3], [2, 3, 4], [3, 2]); // [2, 3]
```

## union

```ts
union<T>(...arrays: (readonly T[])[]): T[]
```

Items present in any array, without duplicates.

```js
arr.union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
```

## without

```ts
without<T>(array: readonly T[], ...values: T[]): T[]
```

A copy without the given values. `NaN` works too.

```js
arr.without([1, 2, 3, 2], 2); // [1, 3]
```

## remove

```ts
remove<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

A copy without the items that pass the test.

```js
arr.remove([1, 2, 3, 4], (n) => n % 2 === 0); // [1, 3]
```

## compact

```ts
compact<T>(array: readonly T[]): Exclude<T, false | "" | 0 | 0n | null | undefined>[]
```

Removes falsy values (`false`, `null`, `undefined`, `0`, `""`, `NaN`).

```js
arr.compact([0, 1, false, 2, "", 3, null]); // [1, 2, 3]
```

## toggle

```ts
toggle<T>(array: readonly T[], item: T): T[]
```

Adds the item if it's missing, removes it if it's there. Handy for
multi-select state.

```js
arr.toggle(["a", "b"], "b"); // ["a"]
arr.toggle(["a"], "b");      // ["a", "b"]
```

## upsert

```ts
upsert<T>(array: readonly T[], item: T, identity: Iteratee<T>): T[]
```

Replaces the item with the same identity, or appends it if there's none.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `item` | `T` |  |
| `identity` | [`Iteratee`](#iteratee)`<``T``>` | What makes two items "the same", like `"id"`. |

```js
arr.upsert(users, { id: 2, name: "Bob" }, "id");
```

## insert

```ts
insert<T>(array: readonly T[], index: number, ...items: T[]): T[]
```

Inserts items at an index. Negative indexes count from the end.

```js
arr.insert(["a", "d"], 1, "b", "c"); // ["a", "b", "c", "d"]
```

## flatten

```ts
flatten<T, D extends number = 1>(array: readonly T[], depth?: D): FlatArray<T[], D>[]
```

Flattens nested arrays, one level by default.

```js
arr.flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]
arr.flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
```

## zip

```ts
zip<T>(...arrays: (readonly T[])[]): (T | undefined)[][]
```

Pairs items by position. Shorter arrays leave `undefined` holes.

```js
arr.zip(["a", "b"], [1, 2]); // [["a", 1], ["b", 2]]
```

## unzip

```ts
unzip<T>(tuples: readonly (readonly T[])[]): (T | undefined)[][]
```

The opposite of `zip()`: rows become columns.

```js
arr.unzip([["a", 1], ["b", 2]]); // [["a", "b"], [1, 2]]
```

## interleave

```ts
interleave<T>(...arrays: (readonly T[])[]): T[]
```

Takes items from each array in turn, then appends the rest.

```js
arr.interleave([1, 3, 5], [2, 4]); // [1, 2, 3, 4, 5]
```

## cartesian

```ts
cartesian<T>(...arrays: (readonly T[])[]): T[][]
```

Every combination of one item from each array.

```js
arr.cartesian(["S", "M"], ["red", "blue"]);
// [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]
```

## times

```ts
times<T>(n: number, value?: T | ((index: number) => T) | undefined): T[]
```

An array of `n` items, from a value or a function of the index.

```js
arr.times(3, "x");          // ["x", "x", "x"]
arr.times(3, (i) => i * 2); // [0, 2, 4]
```

## sumBy

```ts
sumBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

Adds up a number from each item. Non-numbers count as 0.

```js
arr.sumBy(cart, "price");
arr.sumBy(cart, (item) => item.price * item.quantity);
```

## averageBy

```ts
averageBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

The average of a number from each item, or `0` for an empty array.

```js
arr.averageBy(reviews, "rating"); // 4.3
```

## maxBy

```ts
maxBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

The item with the highest value.

```js
arr.maxBy(players, "score");
```

## minBy

```ts
minBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

The item with the lowest value.

```js
arr.minBy(products, "price");
```

## duplicates

```ts
duplicates<T>(array: readonly T[], iteratee?: Iteratee<T>): T[]
```

The items that appear more than once, each listed once.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `iteratee?` | [`Iteratee`](#iteratee)`<``T``>` | What makes two items "the same". Defaults to the item itself. |

**Returns** `T``[]`: For each repeated value, its second occurrence.

```js
arr.duplicates([1, 2, 2, 3, 3, 3]); // [2, 3]
arr.duplicates(users, "email");      // users whose email is taken by an earlier one
```

## xor

```ts
xor<T>(...arrays: (readonly T[])[]): T[]
```

Items found in exactly one of the arrays, without duplicates.

```js
arr.xor([1, 2, 3], [2, 3, 4]); // [1, 4]
```

## takeWhile

```ts
takeWhile<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

The items from the start, up to the first one that fails the test.

```js
arr.takeWhile([1, 2, 5, 1], (n) => n < 3); // [1, 2]
```

## dropWhile

```ts
dropWhile<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

Skips items from the start while they pass the test, and returns the rest.

```js
arr.dropWhile([1, 2, 5, 1], (n) => n < 3); // [5, 1]
```

## toSentence

```ts
toSentence(items: Iterable<unknown>, options?: ToSentenceOptions): string
```

Joins items the way a sentence would, in any language.

```js
arr.toSentence(["Ada", "Bob", "Cy"]);                    // "Ada, Bob, and Cy"
arr.toSentence(["Ada", "Bob"], { locale: "fr" });        // "Ada et Bob"
arr.toSentence(["red", "blue"], { type: "disjunction" }); // "red or blue"
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { Iteratee } from "@ix-xs/node-comfort"`.

### Iteratee

How to get a value out of an item: a property name, or a function
`(item, index) => value`.

```ts
type Iteratee = (T extends object ? keyof T & (string | number) : never) | ((item: T, index: number) => unknown)
```

### Page

A page returned by `paginate()`.

| Property | Type | Description |
| --- | --- | --- |
| `items` | `T``[]` | The items on this page. |
| `page` | `number` | The page number, starting at 1. |
| `perPage` | `number` |  |
| `total` | `number` | Total number of items. |
| `pages` | `number` | Number of pages, at least 1. |
| `hasPrev` | `boolean` |  |
| `hasNext` | `boolean` |  |

### SortByOptions

Options for `sortBy()`.

| Property | Type | Description |
| --- | --- | --- |
| `order?` | `"asc" \| "desc"` | Direction for keys that don't set their own. Defaults to `"asc"`. |
| `natural?` | `boolean` | Sort text like a person would: ignore case, respect accents, `"item2"` before `"item10"`. |
| `locale?` | `string` | Language used by `natural`. Defaults to the system's. |

### SortKey

A sort key for `sortBy()`: an iteratee, or `[iteratee, "asc" | "desc"]`
to give that key its own direction.

```ts
type SortKey = Iteratee<T> | [Iteratee<T>, "asc" | "desc"]
```

### ToSentenceOptions

Options for `toSentence()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language of the joining word. Defaults to `"en"`. |
| `type?` | `"conjunction" \| "disjunction" \| "unit"` | `"conjunction"` joins with "and", `"disjunction"` with "or", `"unit"` with commas only. Defaults to `"conjunction"`. |
| `style?` | `"long" \| "short" \| "narrow"` | Defaults to `"long"`. |
