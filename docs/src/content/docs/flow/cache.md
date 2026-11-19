---
title: "Cache"
description: "`nc.cache` creates in-memory caches with a size limit, expiry per entry, stale-while-revalidate and stats. When a cache is full, the least recently used entry goes first."
---

```js
const { cache } = require("@ix-xs/node-comfort");
```

## Creating a cache

```js
const users = cache.create({ max: 1000, ttl: "5m" });

users.set(42, user);
users.get(42); // the user, or undefined if missing or expired
```

`cache.create(options)` is `new cache.Cache(options)`. The class is there to type a variable or to extend it.

| Option | Default | |
| --- | --- | --- |
| `max` | no limit | Number of entries; when full, the least recently used goes |
| `ttl` | `0` (forever) | How long an entry lives, in ms or like `"10m"` |
| `staleWhileRevalidate` | `0` | How long after expiry `getOrSet` may still serve the old value |
| `updateAgeOnGet` | `false` | Reading an entry restarts its time to live |
| `onRemove` | | `(key, value, reason)`, whenever an entry leaves |

In TypeScript: `cache.create<string, User>({ max: 500 })`.

## Load on miss

`getOrSet` returns the cached value, or calls the loader, stores its result and returns it:

```js
const user = await users.getOrSet(id, () => db.users.find(id));
```

| Case | What happens |
| --- | --- |
| Many callers ask for the same missing key | The loader runs once, they all get its result |
| The loader fails | Nothing is stored, every caller gets the error |
| `delete()`, `clear()` or `set()` on the key during the load | Callers get the loaded value, it is not stored |
| `{ signal }` fires before the value is there | That caller rejects with an `AbortError` |

The third argument also takes `ttl` and `staleWhileRevalidate` for that entry.

## Stale while revalidate

With `staleWhileRevalidate`, an expired entry is still served by `getOrSet` for that long, while a fresh value loads in the background:

```js
const rates = cache.create({ ttl: "1m", staleWhileRevalidate: "10m" });

const rate = await rates.getOrSet("eur-usd", () => api.fetchRate("EUR", "USD"));
```

| Age of the entry | `getOrSet` |
| --- | --- |
| Under `ttl` | The cached value |
| Between `ttl` and `ttl + staleWhileRevalidate` | The old value at once, and one reload in the background |
| Past that | Waits for the loader |

A failed reload keeps the old value served; the next call tries again. Only `getOrSet` and `wrap` serve stale values: for `get`, `peek` and `has`, an expired entry is missing.

## Wrapping a function

```js
const weather = cache.create({ max: 100 });
const getWeather = weather.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
await getWeather("paris"); // from the cache
```

Without `key`, the arguments make the key: primitives by value, plain objects by content.

## Expiry

```js
const sessions = cache.create({ ttl: "30m", updateAgeOnGet: true });
sessions.set("token", data, { ttl: "15m" }); // expiry of this entry
sessions.ttl("token");                        // ms left, Infinity if it never expires, undefined if missing
sessions.prune();                             // removes the expired entries now, returns how many
```

Expired entries are removed when read or by `prune()`. A cache without `max` also sweeps them now and then as entries are added.

## Removals

```js
const files = cache.create({
  max: 100,
  onRemove: (key, handle, reason) => handle.close(),
});
```

| `reason` | When |
| --- | --- |
| `"evict"` | The cache was full |
| `"expire"` | The entry expired |
| `"delete"` | `delete(key)` |
| `"set"` | `set()` replaced the value |
| `"clear"` | `clear()` |

## Reading and listing

| Member | |
| --- | --- |
| `get(key)` | The value, counted as a use |
| `peek(key)` | The value, without counting as a use |
| `has(key)` | Whether a fresh entry exists, without touching the order |
| `set(key, value, { ttl, staleWhileRevalidate })` | Returns the cache |
| `delete(key)` | Whether an entry was removed |
| `clear()` | Empties the cache and returns it; the stats stay |
| `keys()`, `values()`, `entries()`, `for...of` | Least recently used first |
| `size` | Entries, including expired ones not yet removed |

## Stats

```js
users.stats;        // { hits: 2, misses: 1, sets: 1, evictions: 0, expirations: 0, hitRate: 0.6666666666666666 }
users.resetStats(); // counters back to zero, entries stay
```

## Importing the class alone

The subpath exports the class, with a static `create`:

```js
const Cache = require("@ix-xs/node-comfort/cache");

const sessions = Cache.create({ max: 10000, ttl: "30m" });
```

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `new nc.Cache(options)` | `nc.cache.create(options)` or `new nc.cache.Cache(options)` |

`nc.Cache` still works, warns once, and is removed in 4.0. In 3.0, `clear()` returns the cache instead of `undefined`, and `getOrSet` accepts a `signal`.
