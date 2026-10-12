---
title: "nc.obj"
description: "Object helpers: deep clone, merge, equality, diff, typed dot paths, pick and omit. Inputs are never mutated, and `__proto__`, `constructor` and `prototype` keys are always ignored, so user input can't pollute prototypes."
sidebar:
  label: "obj"
  order: 10
---

```js
const { obj } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const obj = require("@ix-xs/node-comfort/obj");
```

This page lists everything `nc.obj` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/obj/).

```js
obj.get(config, "db.pool.max", 10);         // typed, paths autocompleted
obj.set(state, "user.profile.name", "Ada"); // returns an updated copy
obj.merge(defaults, userConfig);
```

## clone

```ts
clone<T>(value: T): T
```

Deep copy. Unlike `structuredClone`, it keeps functions and class
instances (with their prototype), and it's faster on plain data. Shared
references and cycles are preserved.

```js
const copy = obj.clone({ a: { b: [1, 2] }, when: new Date() });
copy.a.b.push(3); // the original is untouched
```

## merge

```ts
merge<A extends object>(a: A): A
merge<A extends object, B extends object>(a: A, b: B): A & B
merge<A extends object, B extends object, C extends object>(a: A, b: B, c: C): A & B & C
merge(...sources: object[]): Record<string, any>
```

Deep-merges objects into a new one. Later objects win, nested objects are
merged, arrays are replaced. See `mergeWith()` to join arrays instead.

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
```

## mergeWith

```ts
mergeWith(options: MergeOptions, ...sources: object[]): Record<string, any>
```

Like `merge()`, with a choice of what happens to arrays and `undefined`.

```js
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] });
// { tags: ["a", "b", "c"] }
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });
// { port: 80 }
```

## defaults

```ts
defaults<T extends object, D extends object>(target: T, ...sources: D[]): T & D
```

Fills in missing properties from defaults, deeply. Values that are set,
even `null` or `0`, are kept.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `T` |  |
| `...sources` | `...``D` | The first one has the highest priority. |

```js
obj.defaults({ port: 8080, db: { user: "me" } }, { port: 80, db: { user: "root", pass: "" } });
// { port: 8080, db: { user: "me", pass: "" } }
```

## equal

```ts
equal(a: unknown, b: unknown): boolean
```

Deep equality. Knows about arrays, dates, regexes, maps, sets, typed
arrays, `NaN` and circular references.

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal({ a: 1 }, { a: 1, b: undefined });          // false
```

## diff

```ts
diff(before: unknown, after: unknown): Change[]
```

Lists what changed between two values, deeply. Handy for audit logs and
partial updates.

**Returns** [`Change`](#change)`[]`: Empty when nothing changed.

```js
obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

## get

```ts
get<T, P extends string>(object: T, path: P | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never) | readonly (string | number)[]): PathValue<T, P>
get<T, P extends string, F>(object: T, path: P | readonly (string | number)[] | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never), fallback: F): F | Exclude<PathValue<T, P>, undefined>
```

Reads a nested value from a dotted path. Your editor completes the paths
and knows the type of the result.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `path` | `P`` \| `[`Paths`](#paths)`<``T``> \| ``ReadonlyArray``<string \| number>` | Like `"a.b.c"`, `"a[0].b"` or `["a", 0, "b"]`. |
| `fallback` | `F` |  |

```js
obj.get(config, "db.pool.max");      // number | undefined
obj.get(config, "db.pool.max", 10);  // number
obj.get(data, "users[0].name");
obj.get(data, ["users", 0, "name"]);
```

## set

```ts
set<T>(object: T, path: PathInput<T>, value: unknown): T
```

Returns a copy with a nested value set. Missing levels are created
(arrays when the next key is a number).

```js
obj.set({}, "a.b.c", 1);            // { a: { b: { c: 1 } } }
obj.set(state, "user.name", "Ada"); // state is untouched
```

## update

```ts
update<T>(object: T, path: PathInput<T>, updater: (value: any) => unknown): T
```

Returns a copy where the value at `path` is replaced by what `updater`
returns for it. Handy for counters and lists.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `path` | [`PathInput`](#pathinput)`<``T``>` |  |
| `updater` | `(value: any) => unknown` | Gets the current value, `undefined` if there's none. |

```js
obj.update(state, "stats.visits", (n = 0) => n + 1);
obj.update(cart, "items", (items = []) => [...items, product]);
```

## unset

```ts
unset<T>(object: T, path: PathInput<T>): T
```

Returns a copy without the property at `path`.

```js
obj.unset({ a: { b: 1, c: 2 } }, "a.b"); // { a: { c: 2 } }
```

## has

```ts
has<T>(object: T, path: PathInput<T>): boolean
```

Does the path exist? A property set to `undefined` still counts.

```js
obj.has({ a: { b: undefined } }, "a.b"); // true
obj.has({ a: {} }, "a.b");               // false
```

## pick

```ts
pick<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Pick<T, K>
```

A copy with only the listed keys.

```js
obj.pick(user, ["id", "email"]);
```

## omit

```ts
omit<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Omit<T, K>
```

A copy without the listed keys.

```js
obj.omit(user, ["password", "token"]);
```

## filter

```ts
filter<T extends object>(object: T, predicate: (value: T[keyof T], key: keyof T & string) => unknown): Partial<T>
```

Keeps the entries that pass a test.

```js
obj.filter({ a: 1, b: 2, c: 3 }, (value) => value > 1); // { b: 2, c: 3 }
```

## mapValues

```ts
mapValues<T extends object, R>(object: T, fn: (value: T[keyof T], key: keyof T & string) => R): { [K in keyof T]: R; }
```

Transforms every value, keeping the keys.

```js
obj.mapValues({ a: 1, b: 2 }, (v) => v * 10); // { a: 10, b: 20 }
```

## mapKeys

```ts
mapKeys<T extends object>(object: T, fn: (key: keyof T & string, value: T[keyof T]) => PropertyKey): Record<string, T[keyof T]>
```

Transforms every key, keeping the values.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `fn` | `(key: keyof ``T`` & string, value: ``T``[keyof ``T``]) => ``PropertyKey` | Returns the new key. |

```js
obj.mapKeys({ first_name: "Ada" }, (key) => nc.str.camelCase(key)); // { firstName: "Ada" }
```

## renameKeys

```ts
renameKeys<T extends object>(object: T, mapping: Partial<Record<keyof T, string>>): Record<string, T[keyof T]>
```

Renames some keys and leaves the others alone.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `mapping` | `Partial``<``Record``<keyof ``T``, string>>` | Old name to new name. |

```js
obj.renameKeys({ _id: 1, name: "Ada" }, { _id: "id" }); // { id: 1, name: "Ada" }
```

## invert

```ts
invert(object: Record<string, PropertyKey>): Record<string, string>
```

Swaps keys and values.

```js
obj.invert({ a: "x", b: "y" }); // { x: "a", y: "b" }
```

## compact

```ts
compact<T extends object>(object: T, options?: CompactOptions): Partial<T>
```

Removes `null` and `undefined` values, and optionally empty ones.

```js
obj.compact({ a: 1, b: null, c: undefined });                          // { a: 1 }
obj.compact({ a: { b: null, c: "" } }, { deep: true, removeEmpty: true }); // {}
```

## flatten

```ts
flatten(object: object, prefix?: string): Record<string, unknown>
```

Flattens nested objects into dotted keys. Arrays stay as values.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | `object` |  |
| `prefix?` | `string` | Added in front of every key. Defaults to `""`. |

```js
obj.flatten({ db: { host: "x", port: 5432 } }); // { "db.host": "x", "db.port": 5432 }
```

## unflatten

```ts
unflatten(object: Record<string, unknown>): Record<string, any>
```

Rebuilds nested objects from dotted keys. The opposite of `flatten()`.

```js
obj.unflatten({ "db.host": "x", "db.port": 5432 }); // { db: { host: "x", port: 5432 } }
```

## paths

```ts
paths(object: object): string[]
```

Every leaf path of an object, in dotted form. Arrays count as leaves.

```js
obj.paths({ db: { host: "x", port: 5432 }, tags: ["a"] }); // ["db.host", "db.port", "tags"]
```

## sortKeys

```ts
sortKeys<T>(object: T, options?: SortKeysOptions): T
```

A copy with its keys in order, nested objects included. Two objects with
the same content then give the same JSON, which makes stable hashes,
cache keys and readable diffs.

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }); // { a: { c: 2, d: 1 }, b: 1 }
nc.crypto.hash(JSON.stringify(obj.sortKeys(payload)));
```

## keys

```ts
keys<T extends object>(object: T): (keyof T & string)[]
```

`Object.keys`, but typed with the object's actual keys.

```js
for (const key of obj.keys(config)) config[key]; // no type error
```

## entries

```ts
entries<T extends object>(object: T): [keyof T & string, T[keyof T]][]
```

`Object.entries`, with typed keys and values.

## fromEntries

```ts
fromEntries<K extends PropertyKey, V>(pairs: Iterable<readonly [K, V]>): Record<K, V>
```

`Object.fromEntries` that accepts any iterable (a `Map` too) and skips
unsafe keys.

```js
obj.fromEntries(new Map([["x", true]])); // { x: true }
```

## size

```ts
size(value: unknown): number
```

How many entries: own keys of an object, size of a map or set, length of
an array or string.

```js
obj.size({ a: 1, b: 2 }); // 2
```

## isEmpty

```ts
isEmpty(object: unknown): boolean
```

Is there nothing in it? No own keys for an object, no entries for a Map
or a Set. `null` and `undefined` count as empty; a date, a regular
expression and an error never do.

```js
obj.isEmpty({});                  // true
obj.isEmpty(new Map([["a", 1]])); // false
```

## deepFreeze

```ts
deepFreeze<T>(object: T): DeepReadonly<T>
```

Freezes an object and everything inside it. Good for configuration and
constants.

**Returns** [`DeepReadonly`](#deepreadonly)`<``T``>`: The same object.

```js
const CONFIG = obj.deepFreeze({ db: { host: "localhost" } });
CONFIG.db.host = "x"; // TypeScript error, and ignored at runtime
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { Change } from "@ix-xs/node-comfort"`.

### Change

One difference reported by `diff()`.

| Property | Type | Description |
| --- | --- | --- |
| `path` | `(string \| number)[]` | Where it changed, like `["address", "city"]`. |
| `type` | `"added" \| "removed" \| "changed"` |  |
| `from?` | `unknown` | The old value. |
| `to?` | `unknown` | The new value. |

### CompactOptions

Options for `compact()`.

| Property | Type | Description |
| --- | --- | --- |
| `deep?` | `boolean` | Clean nested objects and arrays too. |
| `removeEmpty?` | `boolean` | Also remove `""`, `[]` and `{}`. |

### DeepReadonly

`T`, read-only all the way down.

```ts
type DeepReadonly = T extends (...args: any[]) => any ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]>; } : T
```

### MergeOptions

Options for `mergeWith()`.

| Property | Type | Description |
| --- | --- | --- |
| `arrays?` | `"concat" \| "replace" \| "unique"` | When both sides have an array: keep the last, join them, or join without duplicates. Defaults to `"replace"`. |
| `skipUndefined?` | `boolean` | Don't let `undefined` overwrite an existing value. |

### NullishToUndefined

```ts
type NullishToUndefined = [Extract<T, null | undefined>] extends [never] ? never : undefined
```

### PathInput

A path: a known dotted path (completed by your editor), any other string
like `"items[0].name"`, or an array of keys.

```ts
type PathInput = Paths<T> | (string & {}) | ReadonlyArray<string | number>
```

### PathLeaf

Values that end a path: dates, regexes, maps, sets, functions and arrays.

```ts
type PathLeaf = Date | RegExp | Map<any, any> | Set<any> | ((...args: any[]) => any) | readonly any[]
```

### Paths

Every dotted path of an object type, up to 6 levels. This is what powers
path completion in `obj.get()` and friends.

```ts
type Paths = Depth["length"] extends 6 ? never : T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${Paths<NonNullable<T[K]>, [...Depth, 0]>}` : `${K}`; }[keyof T & (string | number)] : never
```

### PathStep

```ts
type PathStep = K extends keyof NonNullable<T> ? NonNullable<T>[K] : NonNullable<T> extends readonly (infer E)[] ? (K extends `${number}` ? E | undefined : typeof _NOT_FOUND) : typeof _NOT_FOUND
```

### PathValue

The type found at a dotted path of `T`, or `any` for an unknown path.

```ts
type PathValue = P extends `${infer Head}.${infer Rest}` ? PathStep<T, Head> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : PathValue<Next, Rest> | NullishToUndefined<T>) : any : PathStep<T, P> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : Next | NullishToUndefined<T>) : any
```

### SortKeysOptions

Options for `sortKeys()`.

| Property | Type | Description |
| --- | --- | --- |
| `deep?` | `boolean` | Sort nested objects too, arrays included. Defaults to `true`. With `false`, only the first level is copied and sorted: what it holds is shared with the original. |
| `compare?` | `((a: string, b: string) => number)` | How to order two keys. Defaults to code-unit order, which is stable across machines. |
