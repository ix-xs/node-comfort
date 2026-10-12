---
title: "Cache"
description: "An in-memory cache with a size limit (the least recently used entries go first), expiry per entry, and stats. `getOrSet()` loads a missing value only once, even when many callers ask for it at the same moment."
sidebar:
  label: "Cache"
  order: 16
---

```js
const { Cache } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const Cache = require("@ix-xs/node-comfort/cache");
```

This page lists everything `Cache` has, as your editor shows it. For explanations and longer examples, read [the guide](/flow/cache/).

```js
const users = new nc.Cache({ max: 1000, ttl: "5m" });
const user = await users.getOrSet(id, () => db.users.find(id));
users.stats; // { hits: 12, misses: 3, hitRate: 0.8, ... }
```

## constructor

```ts
new Cache<K, V>(options?: CacheOptions<K, V>): Cache<K, V>
```

```js
const cache = new nc.Cache({ max: 500, ttl: "1h", updateAgeOnGet: true });
```

## get

```ts
get(key: K): V | undefined
```

Reads a value and marks it as recently used.

**Returns** `V`` | undefined`: `undefined` if missing or expired.

## peek

```ts
peek(key: K): V | undefined
```

Reads a value without counting it as a use or touching the stats.

## set

```ts
set(key: K, value: V, options?: CacheSetOptions): Cache<K, V>
```

Stores a value. When the cache is full, the least recently used entry
goes.

```js
cache.set("token", token, { ttl: "15m" });
```

## getOrSet

```ts
getOrSet(key: K, loader: () => V | PromiseLike<V>, options?: CacheSetOptions): Promise<V>
```

Returns the cached value, or calls `loader`, stores the result and
returns it. Simultaneous calls for the same key share one `loader` call,
and a failed load caches nothing.

With `staleWhileRevalidate`, an entry that just expired is returned at
once while a new value loads in the background, so callers never wait
on a refresh.

```js
const profile = await cache.getOrSet(`profile:${id}`, () => api.fetchProfile(id), { ttl: "10m" });
const rates = await cache.getOrSet("rates", fetchRates, { ttl: "1m", staleWhileRevalidate: "10m" });
```

## has

```ts
has(key: K): boolean
```

Is there a fresh entry for this key? Doesn't count as a use.

## delete

```ts
delete(key: K): boolean
```

Removes an entry. A value being loaded for this key by `getOrSet()` is
not stored when it arrives.

**Returns** `boolean`: `true` if there was one.

## clear

```ts
clear(): void
```

Removes every entry. Stats are kept.

## prune

```ts
prune(): number
```

Removes expired entries now instead of waiting for them to be read.

**Returns** `number`: How many were removed.

## ttl

```ts
ttl(key: K): number | undefined
```

Time left before an entry expires.

**Returns** `number | undefined`: Milliseconds, `Infinity` if it never expires, `undefined` if missing.

## wrap

```ts
wrap<A extends any[]>(fn: (...args: A) => V | PromiseLike<V>, options?: ({ key?: ((...args: A) => K) | undefined; } & CacheSetOptions) | undefined): (...args: A) => Promise<V>
```

Wraps a function so its results are cached here.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `(...args: ``A``) => ``V`` \| ``PromiseLike``<``V``>` |  |
| `options?` | `{ key?: (...args: ``A``) => ``K`` } & `[`CacheSetOptions`](#cachesetoptions) | `key` builds the cache key from the arguments. By default, primitives are compared by value and plain objects by content. |

```js
const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
```

## size

```ts
size: number
```

Number of entries, including expired ones not yet removed.

## stats

```ts
stats: CacheStats
```

Hit and miss counts.

## resetStats

```ts
resetStats(): Cache<K, V>
```

Puts every counter of `stats` back to zero.

## keys

```ts
keys(): K[]
```

Fresh keys, least recently used first.

## values

```ts
values(): V[]
```

Fresh values, least recently used first.

## entries

```ts
entries(): [K, V][]
```

Fresh `[key, value]` pairs, least recently used first.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { CacheEntry } from "@ix-xs/node-comfort"`.

### CacheEntry

| Property | Type | Description |
| --- | --- | --- |
| `value` | `V` |  |
| `expires` | `number` |  |
| `ttl` | `number` |  |
| `stale` | `number` |  |

### CacheOptions

Options for `new Cache()`.

| Property | Type | Description |
| --- | --- | --- |
| `max?` | `number` | Maximum number of entries. When full, the least recently used goes. No limit by default. |
| `ttl?` | `string \| number` | How long entries live, in ms or like `"10m"`. `0` means forever, the default. |
| `staleWhileRevalidate?` | `string \| number` | After an entry expires, `getOrSet()` may still return it for this long while it loads a new value in the background. |
| `updateAgeOnGet?` | `boolean` | Reading an entry restarts its time to live. |
| `onRemove?` | `((key: ``K``, value: ``V``, reason: `[`CacheRemovalReason`](#cacheremovalreason)`) => void)` | Called whenever an entry leaves the cache. |

### CacheRemovalReason

Why an entry left the cache.

```ts
type CacheRemovalReason = "evict" | "expire" | "delete" | "set" | "clear"
```

### CacheSetOptions

Options for `set()` and `getOrSet()`.

| Property | Type | Description |
| --- | --- | --- |
| `ttl?` | `string \| number` | Time to live of this entry. `0` means forever. |
| `staleWhileRevalidate?` | `string \| number` | How long this entry can be served by `getOrSet()` after it expires, while a new value loads. |

### CacheStats

Cache stats.

| Property | Type | Description |
| --- | --- | --- |
| `hits` | `number` | Reads that found a usable entry. |
| `misses` | `number` | Reads that found nothing or an expired entry. |
| `sets` | `number` |  |
| `evictions` | `number` | Entries dropped because the cache was full. |
| `expirations` | `number` | Entries dropped because they expired. |
| `hitRate` | `number` | From 0 to 1. |
