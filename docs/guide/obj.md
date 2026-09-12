# Objects

`nc.obj` clones, merges, compares and reads nested objects. Inputs are never modified, and the keys `__proto__`, `constructor` and `prototype` are always ignored, so user input can't pollute prototypes.

```js
const { obj } = require("@ix-xs/node-comfort");

obj.get(config, "db.pool.max", 10);
obj.merge(defaults, userSettings);
obj.diff(before, after);
```

## Dot paths

`get`, `set`, `has` and `unset` take a path. In TypeScript and in checked JavaScript, your editor completes the paths and knows the type at the end:

```ts
type User = { profile: { name: string; address?: { city: string } } };

obj.get(user, "profile.name");                 // string
obj.get(user, "profile.address.city");         // string | undefined
obj.get(user, "profile.address.city", "Paris"); // string
```

Paths can also use brackets or be arrays: `"items[0].name"`, `["items", 0, "name"]`.

`set` and `unset` return a copy:

```js
const next = obj.set(state, "user.profile.name", "Ada"); // state is unchanged
obj.set({}, "list[1].name", "x");                        // creates arrays for numeric keys
obj.unset(config, "db.password");
obj.has({ a: { b: undefined } }, "a.b");                 // true
```

## Merging

`merge` deep-merges plain objects into a new one. Later objects win and arrays are replaced:

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
```

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

obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

`equal` understands dates, regexes, maps, sets, typed arrays, `NaN` and circular references. `diff` is handy for audit logs and "what changed?" messages.

## Copying

```js
const copy = obj.clone(state);
```

`clone` uses `structuredClone` when it can, and otherwise copies by hand, keeping functions and class prototypes.

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
```

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
