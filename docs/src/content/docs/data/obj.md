---
title: "Objects"
description: "`nc.obj`: dot paths, deep clone, merge and comparison, reshaping. Inputs are never modified, and `__proto__`, `constructor` and `prototype` are always skipped."
---

```js
const { obj } = require("@ix-xs/node-comfort");
```

## Dot paths

```js
const config = { db: { pool: { max: 5 } }, items: [{ name: "a" }] };

obj.get(config, "db.pool.max", 10);      // 5
obj.get(config, "db.pool.min", 1);       // 1
obj.get(config, "items[0].name");        // "a"
obj.get(config, ["items", 0, "name"]);   // "a"
obj.has({ a: { b: undefined } }, "a.b"); // true
```

`set`, `update` and `unset` return a copy:

```js
obj.set(config, "db.pool.max", 10);                                      // config is unchanged
obj.set({}, "list[1].name", "x");                                        // { list: [<empty>, { name: "x" }] }
obj.unset({ list: ["a", "b", "c"] }, "list[1]");                         // { list: ["a", "c"] }
obj.update({ stats: { visits: 41 } }, "stats.visits", (n = 0) => n + 1); // { stats: { visits: 42 } }
obj.update({}, "stats.visits", (n = 0) => n + 1);                        // { stats: { visits: 1 } }
```

| Function | Does |
| --- | --- |
| `get(object, path, fallback?)` | The value, or `fallback` when it is `undefined` |
| `has(object, path)` | `true` when the path exists, even holding `undefined` |
| `set(object, path, value)` | Creates what is missing: arrays for numeric keys, objects otherwise |
| `update(object, path, fn)` | `fn` gets the current value, `undefined` when there is none |
| `unset(object, path)` | Removes a key; in an array, leaves no hole |

A path is `"a.b.c"`, `"a[0].b"` or `["a", 0, "b"]`. In TypeScript and checked JavaScript, the editor completes the paths and types the result:

```ts
type User = { profile: { name: string; address?: { city: string } } };

obj.get(user, "profile.name");                  // string
obj.get(user, "profile.address.city");          // string | undefined
obj.get(user, "profile.address.city", "Paris"); // string
```

## Merging

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] }); // { tags: ["a", "b", "c"] }
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });     // { port: 80 }
obj.defaults({ retries: 0, timeout: null }, { retries: 3, timeout: 5000, debug: false });
// { retries: 0, timeout: null, debug: false }
```

`merge` deep-merges plain objects into a new one: later sources win, arrays are replaced. The result shares nothing with the sources (nested objects, arrays, dates, maps and sets are copied); class instances are kept as they are.

| Function | Does |
| --- | --- |
| `merge(...sources)` | Deep merge, the last source wins |
| `mergeWith(options, ...sources)` | `arrays`: `"replace"` (default), `"concat"`, `"unique"`; `skipUndefined` |
| `defaults(target, ...sources)` | Fills only what is `undefined`; the first source has the highest priority |

## Comparing

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal(new Error("boom"), new Error("bang"));      // false
obj.equal(NaN, NaN);                                  // true

obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

`equal` compares dates, regular expressions, maps, sets, typed arrays, buffers, errors (by message), URLs and circular structures. A class instance is never equal to a plain object. `diff` returns `{ path, type: "added" | "removed" | "changed", from?, to? }` entries.

## Copying

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const original = { at: new Point(3, 4), raw: Buffer.from("hi"), onDone() {} };
const copy = obj.clone(original);

copy.at instanceof Point; // true, a new Point
copy.raw[0] = 72;         // original.raw still reads "hi"
```

`clone` copies plain objects, arrays, dates, regular expressions, maps, sets, URLs, buffers and typed arrays. Unlike `structuredClone`, it keeps functions and the class of instances. Shared references and cycles are preserved.

`deepFreeze(object)` freezes an object and everything inside it.

## Picking and reshaping

```js
const user = { id: 1, email: "a@x.io", password: "p", token: "t" };

obj.pick(user, ["id", "email"]);                                       // { id: 1, email: "a@x.io" }
obj.omit(user, ["password", "token"]);                                 // { id: 1, email: "a@x.io" }
obj.filter({ a: 5, b: 20, c: 12 }, (value) => value > 10);             // { b: 20, c: 12 }
obj.mapValues({ tea: 2, cake: 4 }, (price) => price * 1.5);            // { tea: 3, cake: 6 }
obj.mapKeys({ first_name: "Ada" }, (key) => key.toUpperCase());        // { FIRST_NAME: "Ada" }
obj.renameKeys({ _id: 7, name: "x" }, { _id: "id" });                  // { id: 7, name: "x" }
obj.invert({ a: "x", b: "y" });                                        // { x: "a", y: "b" }
obj.compact({ a: 0, b: null, c: "", d: undefined });                   // { a: 0, c: "" }
obj.compact({ a: { b: null, c: "" }, d: [], e: 1 }, { deep: true, removeEmpty: true }); // { e: 1 }
```

| Function | Callback |
| --- | --- |
| `filter(object, fn)` | `(value, key)` |
| `mapValues(object, fn)` | `(value, key)` |
| `mapKeys(object, fn)` | `(key, value)`, returns the new key |

`compact` removes `null` and `undefined` only; `removeEmpty` also removes `""`, `[]` and `{}`, `deep` cleans nested objects and arrays. `nc.arr.compact()` removes every falsy value.

## Flat keys

```js
obj.flatten({ db: { host: "x", ports: [1, 2] } }); // { "db.host": "x", "db.ports": [1, 2] }
obj.flatten({ db: { host: "x" } }, "app");         // { "app.db.host": "x" }
obj.unflatten({ "db.host": "x" });                 // { db: { host: "x" } }
obj.paths({ db: { host: "x", port: 5432 } });      // ["db.host", "db.port"]
```

`flatten` keeps arrays as values.

## Sorting keys

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } });                  // { a: { c: 2, d: 1 }, b: 1 }
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }, { deep: false }); // { a: { d: 1, c: 2 }, b: 1 }

const key = JSON.stringify(obj.sortKeys(query)); // same JSON whatever the key order: a cache key
```

| Option | Default | |
| --- | --- | --- |
| `deep` | `true` | Nested objects and arrays too. With `false`, the nested values are shared |
| `compare` | code-unit order | `(a, b) => number` |

## Typed keys and size

```ts
for (const key of obj.keys(config)) config[key]; // key is keyof typeof config, not string
for (const [key, value] of obj.entries(scores)) {}
const map = obj.fromEntries(new Map([["a", 1]])); // { a: 1 }
```

`size(value)` counts own keys of an object, entries of a `Map` or `Set`, items of an array, characters of a string, `0` for `null` and `undefined`.

## Keys from user input

```js
const body = JSON.parse('{ "name": "Ada", "__proto__": { "admin": true } }');

obj.merge({}, body);                    // { name: "Ada" }
obj.set({}, "__proto__.admin", true);   // {}
obj.get({ a: 1 }, "constructor.name");  // undefined
```

Every function skips `__proto__`, `constructor` and `prototype`, in the objects it copies and in the paths it follows.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `obj.isEmpty(value)` | `nc.is.empty(value)` |

The old name still works and warns once. `nc.is.empty()` returns `false` for numbers, booleans and other values that are not containers, where `obj.isEmpty()` returned `true`.
