# Arrays

`nc.arr` groups, sorts, splits and combines arrays. Every function returns a new array and leaves yours alone, and item types carry through: `arr.chunk(numbers, 2)` is a `number[][]`.

```js
const { arr } = require("@ix-xs/node-comfort");

arr.chunk([1, 2, 3, 4, 5], 2);           // [[1, 2], [3, 4], [5]]
arr.groupBy(users, "role");              // { admin: [...], user: [...] }
arr.sortBy(users, [["age", "desc"], "name"]);
```

## Iteratees

Many functions take an iteratee: either a property name, which your editor completes, or a function of the item.

```js
arr.unique(users, "email");
arr.unique(tags, (tag) => tag.toLowerCase());
arr.sumBy(cart, (line) => line.price * line.quantity);
```

## Grouping and indexing

```js
arr.groupBy(orders, "status");          // { paid: [...], pending: [...] }
arr.keyBy(users, "id");                 // { 1: user1, 2: user2 }
arr.toMap(users, "id");                 // Map<number, User>, keys keep their type
arr.countBy(users, "country");          // { FR: 12, US: 7 }
arr.partition(people, (p) => p.age >= 18); // [adults, minors]
arr.pluck(users, "email");              // ["ada@x.io", "bob@x.io"]
```

## Sorting

`sortBy` sorts by one or more keys. It's stable, and `null`/`undefined` always go last:

```js
arr.sortBy(users, "age");                       // youngest first
arr.sortBy(users, "age", "desc");               // oldest first
arr.sortBy(users, [["age", "desc"], "lastName"]); // each key has its own direction
arr.sortBy(files, "name", { natural: true });   // "file2" before "file10", accents respected
```

## Pagination

```js
const page = arr.paginate(products, 2, 20);
// { items: [...], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

An out-of-range page is brought back into range, so `page` is always valid.

## Splitting

```js
arr.chunk(emails, 100).forEach(sendBatch);
arr.windows([1, 2, 3, 4], 2);   // [[1, 2], [2, 3], [3, 4]]
arr.first(list, 3);
arr.last(list);
```

## Sets

```js
arr.difference([1, 2, 3, 4], [2, 4]);         // [1, 3]
arr.intersection([1, 2, 3], [2, 3, 4]);       // [2, 3]
arr.union([1, 2], [2, 3]);                    // [1, 2, 3]
arr.without([1, 2, 3, 2], 2);                 // [1, 3]
```

## Editing without mutating

```js
arr.insert(["a", "d"], 1, "b", "c");          // ["a", "b", "c", "d"]
arr.move(["a", "b", "c"], 0, 2);              // ["b", "c", "a"]
arr.swap(list, 0, 2);
arr.toggle(selected, id);                     // adds it, or removes it if it's there
arr.upsert(users, { id: 2, name: "Bob" }, "id"); // replaces user 2, or appends
arr.remove(list, (n) => n % 2 === 0);
arr.compact([0, 1, false, "", null, 2]);      // [1, 2]
```

## Combining

```js
arr.zip(["a", "b"], [1, 2]);                  // [["a", 1], ["b", 2]]
arr.cartesian(["S", "M"], ["red", "blue"]);   // every size and color pair
arr.interleave([1, 3, 5], [2, 4]);            // [1, 2, 3, 4, 5]
arr.flatten([1, [2, [3]]], Infinity);         // [1, 2, 3]
arr.times(3, (i) => i * 2);                   // [0, 2, 4]
```

## Aggregates and randomness

```js
arr.sumBy(orders, "total");
arr.averageBy(reviews, "rating");
arr.maxBy(players, "score");
arr.minBy(products, "price");
arr.shuffle(deck);
arr.sample(deck);
arr.sampleSize(players, 3);
```

`shuffle` and `sample` use `Math.random`. For draws that must be fair and unpredictable, use [`crypto.randomInt()`](crypto.html).
