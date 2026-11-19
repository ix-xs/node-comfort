"use strict";

/**
 * An in-memory cache with a size limit (the least recently used entries go
 * first), expiry per entry, and stats. `getOrSet()` loads a missing value
 * only once, even when many callers ask for it at the same moment.
 *
 * @example
 * const users = nc.cache.create({ max: 1000, ttl: "5m" });
 * const user = await users.getOrSet(id, () => db.users.find(id));
 * users.stats; // { hits: 12, misses: 3, hitRate: 0.8, ... }
 */

const Cache = require("./Cache.js");

/**
 * Creates a cache. Same as `new nc.cache.Cache(options)`.
 *
 * @example
 * const sessions = nc.cache.create({ max: 10_000, ttl: "30m" });
 * sessions.set(token, user);
 * const pages = nc.cache.create<string, string>({ ttl: "1m" }); // TypeScript
 *
 * @template [K=any]
 * @template [V=any]
 * @param {import("./Cache").CacheOptions<K, V>} [options]
 * @returns {Cache<K, V>}
 */
function create(options) {
  return Cache.create(options);
}

module.exports = {
  create,
  Cache,
};
