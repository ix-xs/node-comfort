# Cache

`nc.Cache` is an in-memory cache with a size limit and expiry. When it's full, the least recently used entry goes first.

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

## Wrapping a function

```js
const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
```

## Expiry

```js
const sessions = new nc.Cache({ ttl: "30m", updateAgeOnGet: true }); // reading renews the entry
sessions.set("token", data, { ttl: "15m" }); // per-entry expiry
sessions.ttl("token");                        // ms left
sessions.prune();                             // remove expired entries now
```

Expired entries are removed when you read them, or when you call `prune()`.

## Watching removals

```js
const files = new nc.Cache({
  max: 100,
  onRemove: (key, handle, reason) => handle.close(), // "evict", "expire", "delete", "set" or "clear"
});
```

## Stats

```js
cache.stats; // { hits: 120, misses: 30, sets: 30, evictions: 2, expirations: 5, hitRate: 0.8 }
```

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
