---
title: "Cache"
description: "`nc.Cache` is an in-memory cache with a size limit and expiry. When it's full, the least recently used entry goes first."
sidebar:
  order: 3
---

```js
const users = new nc.Cache({ max: 1000, ttl: "5m" });

users.set(42, user);
users.get(42);       // the user, or undefined if missing or expired
```

## Load on miss

`getOrSet` returns the cached value, or loads it, stores it and returns it:

```js
const user = await users.getOrSet(id, () => db.users.find(id));
```

If a hundred requests ask for the same missing key at the same moment, the loader runs once and they all get its result. If the loader fails, nothing is cached and the error reaches every caller.

If you `delete()` the key, `clear()` the cache or `set()` the key yourself while a load is running, the callers still get the loaded value, but it is not stored.

## Serving a stale value

With `ttl` alone, the first caller after expiry waits for the loader. `staleWhileRevalidate` lets `getOrSet` answer with the old value while a fresh one loads:

```js
const rates = new nc.Cache({ ttl: "1m", staleWhileRevalidate: "10m" });

const rate = await rates.getOrSet("eur-usd", () => api.fetchRate("EUR", "USD"));
```

During the first minute, callers get the cached value. During the ten minutes after that, they get the old value at once and a reload starts in the background, so nobody waits on a refresh. Past that, the entry is gone and the next caller waits for the loader.

Only one reload runs at a time. If it fails, the old value keeps being served and the next call tries again.

Only `getOrSet` and functions made with `wrap` serve stale values. For `get`, `peek` and `has`, an expired entry is missing. The option can also be given per call, next to `ttl`:

```js
await cache.getOrSet("rates", fetchRates, { ttl: "1m", staleWhileRevalidate: "10m" });
```

## Wrapping a function

```js
const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
```

Without `key`, the arguments themselves make the cache key.

## Expiry

```js
const sessions = new nc.Cache({ ttl: "30m", updateAgeOnGet: true }); // reading renews the entry
sessions.set("token", data, { ttl: "15m" }); // per-entry expiry
sessions.ttl("token");                        // ms left
sessions.prune();                             // remove expired entries now
```

Durations are in milliseconds or text such as `"30m"`. A `ttl` of `0` means forever, which is the default.

Expired entries are removed when you read them, or when you call `prune()`. A cache without `max` also sweeps them by itself now and then as you add entries, so keys that nobody reads again don't pile up.

## Watching removals

```js
const files = new nc.Cache({
  max: 100,
  onRemove: (key, handle, reason) => handle.close(), // "evict", "expire", "delete", "set" or "clear"
});
```

## Stats

```js
cache.stats;        // { hits: 120, misses: 30, sets: 30, evictions: 2, expirations: 5, hitRate: 0.8 }
cache.resetStats(); // counters back to zero, entries stay
```

`clear()` empties the cache but keeps the counters.

## Iterating

```js
for (const [key, value] of cache) {}
cache.keys(); cache.values(); cache.entries(); // least recently used first
cache.size;
```

`peek()` reads without counting as a use, and `has()` checks without touching the order.

## Typing

```ts
const cache = new nc.Cache<string, User>({ max: 500 });
```
