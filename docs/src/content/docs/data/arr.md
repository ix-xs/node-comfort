---
title: "Arrays"
description: "`nc.arr`: group, sort, split, compare and combine arrays. Every function returns a new array and keeps the item types: `arr.chunk(numbers, 2)` is a `number[][]`."
---

```js
const { arr } = require("@ix-xs/node-comfort");
```

The examples use this list:

```js
const users = [
  { id: 1, name: "Ada", role: "admin", age: 36, active: true, email: "ada@x.io" },
  { id: 2, name: "Bob", role: "user", age: 25, active: false, email: "bob@x.io" },
  { id: 3, name: "Cy", role: "user", age: 36, active: true, email: "ada@x.io" },
];
```

## Iteratees

Where a function takes an iteratee, pass a property name (completed by the editor) or a function of the item. A test (`count`, `partition`, `remove`, `takeWhile`, `dropWhile`) given a property name checks that its value is truthy.

```js
arr.unique(users, "email");                      // Ada and Bob
arr.unique(["a", "A", "b"], (s) => s.toLowerCase()); // ["a", "b"]
arr.count(users, "active");                      // 2
arr.count(users, (user) => user.age > 30);       // 2
```

## Grouping and indexing

```js
arr.groupBy(users, "role");                  // { admin: [Ada], user: [Bob, Cy] }
arr.keyBy(users, "id");                      // { 1: Ada, 2: Bob, 3: Cy }
arr.toMap(users, "id", (user) => user.name); // Map { 1 => "Ada", 2 => "Bob", 3 => "Cy" }
arr.countBy(users, "role");                  // { admin: 1, user: 2 }
arr.partition(users, "active");              // [[Ada, Cy], [Bob]]
arr.pluck(users, "name");                    // ["Ada", "Bob", "Cy"]
```

| Function | Returns |
| --- | --- |
| `groupBy(array, iteratee)` | An object of arrays, by key |
| `keyBy(array, iteratee)` | An object of items, the last one wins for a key |
| `toMap(array, key, value?)` | A `Map`; the keys keep their type |
| `countBy(array, iteratee?)` | An object of counts. Without iteratee, counts the items themselves |
| `count(array, test)` | A number |
| `partition(array, test)` | `[passed, failed]` |
| `pluck(array, key)` | The values of one property |

The keys come from your data: `arr.countBy(["constructor", "toString", "constructor"])` gives `{ constructor: 2, toString: 1 }`.

## Duplicates

```js
arr.unique([1, 1, 2, 3]);           // [1, 2, 3]
arr.duplicates([1, 2, 2, 3, 3, 3]); // [2, 3]
arr.duplicates(users, "email");     // [Cy]
```

`unique` keeps the first item of each value. `duplicates` lists each repeated value once, as its second occurrence.

## Sorting

```js
arr.sortBy(users, "age");                                  // Bob, Ada, Cy
arr.sortBy(users, "age", "desc");                          // Ada, Cy, Bob
arr.sortBy(users, [["age", "desc"], "name"]);              // Ada, Cy, Bob
arr.sortBy(["file10", "file2", "File1"], (f) => f, { natural: true }); // ["File1", "file2", "file10"]
```

The sort is stable, `null` and `undefined` go last, and the key of each item is computed once.

| `sortBy` option | Default | |
| --- | --- | --- |
| `order` | `"asc"` | For the keys that don't set their own. A string third argument is the same |
| `natural` | `false` | Ignore case, respect accents, `"item2"` before `"item10"` |
| `locale` | the system's | Language used by `natural` |

## Pagination

```js
arr.paginate(products, 2, 20);
arr.paginate(products, { page: 2, perPage: 20 });
// { items: [20 items], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

`page` starts at 1 (default), `perPage` defaults to 20. A page out of range is brought back into range.

## Splitting

```js
arr.chunk([1, 2, 3, 4, 5], 2);             // [[1, 2], [3, 4], [5]]
arr.windows([1, 2, 3, 4], 2);              // [[1, 2], [2, 3], [3, 4]]
arr.windows([1, 2, 3, 4, 5], 2, 2);        // [[1, 2], [3, 4]]
arr.first([1, 2, 3, 4], 2);                // [1, 2]
arr.last([1, 2, 3]);                       // 3
arr.takeWhile([1, 2, 5, 1], (n) => n < 3); // [1, 2]
arr.dropWhile([1, 2, 5, 1], (n) => n < 3); // [5, 1]
```

`first` and `last` without a count return one item, with a count an array.

## Sets

```js
arr.difference([1, 2, 3, 4], [2, 4]);   // [1, 3]
arr.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
arr.union([1, 2], [2, 3]);              // [1, 2, 3]
arr.xor([1, 2, 3], [2, 3, 4]);          // [1, 4]
arr.without([1, 2, 3, 2], 2);           // [1, 3]
```

## Editing

These return a copy and leave the array unchanged:

```js
arr.insert(["a", "d"], 1, "b", "c");                // ["a", "b", "c", "d"]
arr.move(["a", "b", "c"], 0, 2);                    // ["b", "c", "a"]
arr.swap(["a", "b", "c"], 0, 2);                    // ["c", "b", "a"]
arr.rotate([1, 2, 3, 4], 1);                        // [2, 3, 4, 1]
arr.toggle([1, 2, 3], 2);                           // [1, 3]
arr.upsert(users, { id: 2, name: "Bo" }, "id");     // Bob replaced by { id: 2, name: "Bo" }
arr.remove([1, 2, 3, 4], (n) => n % 2 === 0);       // [1, 3]
arr.compact([0, 1, false, "", null, 2, undefined]); // [1, 2]
```

| Function | Does |
| --- | --- |
| `insert(array, index, ...items)` | Inserts at `index` |
| `move(array, from, to)`, `swap(array, i, j)` | Moves one item, exchanges two |
| `rotate(array, n = 1)` | Shifts left by `n`; negative shifts right |
| `toggle(array, item)` | Removes the item if present, appends it otherwise |
| `upsert(array, item, identity)` | Replaces the item with the same `identity` (`"id"`), or appends |
| `remove(array, test)` | Keeps the items that fail the test |
| `compact(array)` | Removes every falsy value. `nc.obj.compact()` only removes `null` and `undefined` |

## Combining

```js
arr.zip(["a", "b"], [1, 2]);                // [["a", 1], ["b", 2]]
arr.unzip([["a", 1], ["b", 2]]);            // [["a", "b"], [1, 2]]
arr.cartesian(["S", "M"], ["red", "blue"]); // [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]
arr.interleave([1, 3, 5], [2, 4]);          // [1, 2, 3, 4, 5]
arr.flatten([1, [2, [3]]]);                 // [1, 2, [3]]
arr.flatten([1, [2, [3]]], Infinity);       // [1, 2, 3]
arr.times(3, (i) => i * 2);                 // [0, 2, 4]
arr.times(3, "x");                          // ["x", "x", "x"]
```

## Aggregates and random picks

```js
arr.sumBy([{ total: 0.1 }, { total: 0.2 }, { total: 0.3 }], "total"); // 0.6
arr.averageBy(users, "age");                                         // 32.333333333333336
arr.maxBy(users, "age");                                             // Ada, the first of the highest
arr.minBy(users, "age");                                             // Bob
arr.sample(users);                                                   // one user
arr.sampleSize(users, 2);                                            // two different users
arr.shuffle(users);                                                  // a shuffled copy
```

`sumBy` adds like `nc.num.sum()`, without the drift of a plain loop. `maxBy` and `minBy` return `undefined` for an empty array. `shuffle`, `sample` and `sampleSize` use `Math.random`: for fair draws, use `nc.crypto.randomInt()`.

## Lists in a sentence

```js
arr.toSentence(["Ada", "Bob", "Cy"]);                     // "Ada, Bob, and Cy"
arr.toSentence(["Ada", "Bob", "Cy"], { locale: "fr" });   // "Ada, Bob et Cy"
arr.toSentence(["red", "blue"], { type: "disjunction" }); // "red or blue"
```

`toSentence` uses `Intl.ListFormat`. The language is `nc.config.get().locale` unless `locale` is passed ([Configuration](/start/configuration/)).

| Option | Default | |
| --- | --- | --- |
| `locale` | `nc.config.get().locale` | |
| `type` | `"conjunction"` | `"disjunction"` joins with "or", `"unit"` with commas only |
| `style` | `"long"` | `"short"`, `"narrow"` |
