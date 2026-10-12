---
title: "Objects"
description: "`nc.obj` clones, merges, compares and reads nested objects. Inputs are never modified, and the keys `__proto__`, `constructor` and `prototype` are always ignored, so user input can't pollute prototypes."
sidebar:
  order: 4
---

```js
const { obj } = require("@ix-xs/node-comfort");

obj.get(config, "db.pool.max", 10);
obj.merge(defaults, userSettings);
obj.diff(before, after);
```

## Dot paths

`get`, `set`, `update`, `has` and `unset` take a path. In TypeScript and in checked JavaScript, your editor completes the paths and knows the type at the end:

```ts
type User = { profile: { name: string; address?: { city: string } } };

obj.get(user, "profile.name");                 // string
obj.get(user, "profile.address.city");         // string | undefined
obj.get(user, "profile.address.city", "Paris"); // string
```

Paths can also use brackets or be arrays: `"items[0].name"`, `["items", 0, "name"]`.

`set`, `update` and `unset` return a copy:

```js
const next = obj.set(state, "user.profile.name", "Ada"); // state is unchanged
obj.set({}, "list[1].name", "x");                        // creates arrays for numeric keys
obj.unset(config, "db.password");
obj.unset({ list: ["a", "b", "c"] }, "list[1]");         // { list: ["a", "c"] }, no hole left
obj.has({ a: { b: undefined } }, "a.b");                 // true
```

`update` computes the new value from the current one. The function gets `undefined` when nothing is there yet, which a default parameter covers:

```js
obj.update({ stats: { visits: 41 } }, "stats.visits", (n = 0) => n + 1); // { stats: { visits: 42 } }
obj.update({}, "stats.visits", (n = 0) => n + 1);                        // { stats: { visits: 1 } }
obj.update(cart, "items", (items = []) => [...items, product]);
```

## Merging

`merge` deep-merges plain objects into a new one. Later objects win and arrays are replaced:

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
```

The result shares nothing with what you passed in. Nested objects, arrays, dates, maps and sets are copied, so changing the result never changes your defaults:

```js
const settings = obj.merge(defaults, userSettings);
settings.db.host = "db.internal"; // defaults.db.host is still "localhost"
```

Class instances, like a database connection or a logger, are not copied: the result holds the same one.

`mergeWith` lets you choose what happens to arrays and `undefined`:

```js
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] }); // tags: ["a", "b", "c"]
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });     // port: 80
```

`defaults` fills in what's missing, keeping any value that's set, even `null` or `0`:

```js
obj.defaults(userOptions, { retries: 3, timeout: 5000 });
```

## Comparing

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal(new Error("boom"), new Error("bang"));      // false
obj.equal(Buffer.from("ab"), Buffer.from("ab"));      // true

obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

`equal` understands dates, regexes, maps, sets, typed arrays, buffers, errors, URLs, `NaN` and circular references. It compares what a value holds: the message of an error, the address of a URL, the bytes of a buffer. An instance of a class is never equal to a plain object with the same properties.

`diff` is handy for audit logs and "what changed?" messages.

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

copy.at instanceof Point; // true, and it's a new Point
copy.raw[0] = 72;         // original.raw still reads "hi"
```

`clone` copies deeply: plain objects, arrays, dates, regexes, maps, sets, URLs, buffers and typed arrays. Where `structuredClone` throws on a function and turns a class instance into a plain object, `clone` keeps both, and the copy of an instance has the same class. Shared references and cycles are preserved.

## Picking and reshaping

```js
obj.pick(user, ["id", "email"]);
obj.omit(user, ["password", "token"]);
obj.filter(scores, (value) => value > 10);
obj.mapValues(prices, (price) => price * 1.2);
obj.mapKeys(row, (key) => nc.str.camelCase(key));
obj.renameKeys(doc, { _id: "id" });
obj.invert({ a: "x", b: "y" });           // { x: "a", y: "b" }
obj.compact(payload, { deep: true, removeEmpty: true });
obj.flatten({ db: { host: "x" } });       // { "db.host": "x" }
obj.unflatten({ "db.host": "x" });        // { db: { host: "x" } }
obj.paths({ db: { host: "x", port: 5432 } }); // ["db.host", "db.port"]
```

`sortKeys` returns a copy with its keys in order, nested objects included:

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } });                  // { a: { c: 2, d: 1 }, b: 1 }
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }, { deep: false }); // { a: { d: 1, c: 2 }, b: 1 }
```

Two objects with the same content then give the same JSON, whatever the order their keys were written in. That's what a hash or a cache key needs:

```js
const key = JSON.stringify(obj.sortKeys(query));
```

## Keys from user input

```js
const body = JSON.parse('{ "name": "Ada", "__proto__": { "admin": true } }');

obj.merge({}, body);                  // { name: "Ada" }
obj.set({}, "__proto__.admin", true); // {}
obj.get(user, "constructor.name");    // undefined
```

Every helper skips the keys `__proto__`, `constructor` and `prototype`, in the objects it copies and in the paths it follows. A request body or a path that comes from a user can't reach a prototype.

## Typed helpers

`Object.keys` and `Object.entries` return plain strings in TypeScript. These keep the real keys:

```ts
for (const key of obj.keys(config)) config[key]; // no type error
for (const [key, value] of obj.entries(scores)) {}
```

And for constants that must never change:

```js
const CONFIG = obj.deepFreeze({ db: { host: "localhost" } });
```

The [`nc.obj` reference](/reference/obj/) lists every function with its options.
