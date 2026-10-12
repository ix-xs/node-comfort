"use strict";

/**
 * An in-memory cache with a size limit (the least recently used entries go
 * first), expiry per entry, and stats. `getOrSet()` loads a missing value
 * only once, even when many callers ask for it at the same moment.
 *
 * @example
 * const users = new nc.Cache({ max: 1000, ttl: "5m" });
 * const user = await users.getOrSet(id, () => db.users.find(id));
 * users.stats; // { hits: 12, misses: 3, hitRate: 0.8, ... }
 */

const { toMs, argsKey } = require("./internal/shared.js");

/**
 * Why an entry left the cache.
 * @typedef {"evict" | "expire" | "delete" | "set" | "clear"} CacheRemovalReason
 */

/**
 * Options for `new Cache()`.
 * @template K
 * @template V
 * @typedef {object} CacheOptions
 * @property {number} [max] Maximum number of entries. When full, the least recently used goes. No limit by default.
 * @property {number | string} [ttl] How long entries live, in ms or like `"10m"`. `0` means forever, the default.
 * @property {number | string} [staleWhileRevalidate] After an entry expires, `getOrSet()` may still return it for this long while it loads a new value in the background.
 * @property {boolean} [updateAgeOnGet] Reading an entry restarts its time to live.
 * @property {(key: K, value: V, reason: CacheRemovalReason) => void} [onRemove] Called whenever an entry leaves the cache.
 */

/**
 * Options for `set()` and `getOrSet()`.
 * @typedef {object} CacheSetOptions
 * @property {number | string} [ttl] Time to live of this entry. `0` means forever.
 * @property {number | string} [staleWhileRevalidate] How long this entry can be served by `getOrSet()` after it expires, while a new value loads.
 */

/**
 * Cache stats.
 * @typedef {object} CacheStats
 * @property {number} hits Reads that found a usable entry.
 * @property {number} misses Reads that found nothing or an expired entry.
 * @property {number} sets
 * @property {number} evictions Entries dropped because the cache was full.
 * @property {number} expirations Entries dropped because they expired.
 * @property {number} hitRate From 0 to 1.
 */

/**
 * @template V
 * @typedef {{ value: V, expires: number, ttl: number, stale: number }} CacheEntry
 */

/**
 * @param {number | string | undefined} value
 * @param {string} what
 * @returns {number}
 */
const _duration = (value, what) => (value === undefined ? 0 : Math.max(0, toMs(value, what)));

/**
 * An in-memory cache with a size limit and expiry.
 *
 * @template K
 * @template V
 */
class Cache {
  /** @type {Map<K, CacheEntry<V>>} */
  #map = new Map();
  /** @type {Map<K, Promise<V>>} */
  #loading = new Map();
  #max;
  #ttl;
  #stale;
  #updateAgeOnGet;
  /** @type {((key: K, value: V, reason: CacheRemovalReason) => void) | undefined} */
  #onRemove;
  #stats = { hits: 0, misses: 0, sets: 0, evictions: 0, expirations: 0 };
  /**
   * The most recently used key, so reading it again doesn't reorder anything.
   * @type {K | undefined}
   */
  #newest = undefined;
  #hasNewest = false;
  #sweepAt = 1024;

  /**
   * @example
   * const cache = new nc.Cache({ max: 500, ttl: "1h", updateAgeOnGet: true });
   *
   * @param {CacheOptions<K, V>} [options]
   */
  constructor(options = {}) {
    this.#max = Math.max(1, options.max ?? Infinity);
    this.#ttl = _duration(options.ttl, "ttl");
    this.#stale = _duration(options.staleWhileRevalidate, "staleWhileRevalidate");
    this.#updateAgeOnGet = options.updateAgeOnGet ?? false;
    this.#onRemove = options.onRemove;
  }

  /**
   * @param {K} key
   * @param {{ value: V }} entry
   * @param {CacheRemovalReason} reason
   */
  #remove(key, entry, reason) {
    this.#map.delete(key);
    if (this.#hasNewest && this.#newest === key) this.#hasNewest = false;
    if (reason === "expire") this.#stats.expirations++;
    if (reason === "evict") this.#stats.evictions++;
    this.#onRemove?.(key, entry.value, reason);
  }

  /**
   * The entry if it exists and is fresh. Expired entries are removed, unless
   * `getOrSet()` may still serve them while it reloads.
   * @param {K} key
   */
  #fresh(key) {
    const entry = this.#map.get(key);
    if (!entry) return undefined;
    if (entry.expires) {
      const now = Date.now();
      if (entry.expires <= now) {
        if (entry.stale <= now) this.#remove(key, entry, "expire");
        return undefined;
      }
    }
    return entry;
  }

  /**
   * Moves an entry to the "most recently used" end.
   * @param {K} key
   * @param {CacheEntry<V>} entry
   */
  #touch(key, entry) {
    if (this.#hasNewest && this.#newest === key) return;
    this.#map.delete(key);
    this.#map.set(key, entry);
    this.#newest = key;
    this.#hasNewest = true;
  }

  /**
   * Reads a value and marks it as recently used.
   *
   * @param {K} key
   * @returns {V | undefined} `undefined` if missing or expired.
   */
  get(key) {
    const entry = this.#fresh(key);
    if (!entry) {
      this.#stats.misses++;
      return undefined;
    }
    this.#stats.hits++;
    if (this.#updateAgeOnGet && entry.ttl) {
      const now = Date.now();
      entry.stale += now + entry.ttl - entry.expires;
      entry.expires = now + entry.ttl;
    }
    this.#touch(key, entry);
    return entry.value;
  }

  /**
   * Reads a value without counting it as a use or touching the stats.
   *
   * @param {K} key
   * @returns {V | undefined}
   */
  peek(key) {
    return this.#fresh(key)?.value;
  }

  /**
   * Stores a value. When the cache is full, the least recently used entry
   * goes.
   *
   * @example
   * cache.set("token", token, { ttl: "15m" });
   *
   * @param {K} key
   * @param {V} value
   * @param {CacheSetOptions} [options]
   * @returns {this}
   */
  set(key, value, options = {}) {
    const ttl = options.ttl === undefined ? this.#ttl : _duration(options.ttl, "ttl");
    const grace = options.staleWhileRevalidate === undefined ? this.#stale : _duration(options.staleWhileRevalidate, "staleWhileRevalidate");
    const previous = this.#map.get(key);
    if (previous) this.#remove(key, previous, "set");
    const expires = ttl ? Date.now() + ttl : 0;
    this.#map.set(key, { value, ttl, expires, stale: expires ? expires + grace : 0 });
    this.#newest = key;
    this.#hasNewest = true;
    this.#stats.sets++;
    if (this.#map.size > this.#max) {
      while (this.#map.size > this.#max) {
        const [oldestKey, oldest] = /** @type {[K, { value: V }]} */ (this.#map.entries().next().value);
        this.#remove(oldestKey, oldest, "evict");
      }
    } else if (expires && this.#max === Infinity && this.#map.size >= this.#sweepAt) {
      // Without a size limit, entries nobody reads again would stay forever.
      this.prune();
      this.#sweepAt = Math.max(1024, this.#map.size * 2);
    }
    return this;
  }

  /**
   * Returns the cached value, or calls `loader`, stores the result and
   * returns it. Simultaneous calls for the same key share one `loader` call,
   * and a failed load caches nothing.
   *
   * With `staleWhileRevalidate`, an entry that just expired is returned at
   * once while a new value loads in the background, so callers never wait
   * on a refresh.
   *
   * @example
   * const profile = await cache.getOrSet(`profile:${id}`, () => api.fetchProfile(id), { ttl: "10m" });
   * const rates = await cache.getOrSet("rates", fetchRates, { ttl: "1m", staleWhileRevalidate: "10m" });
   *
   * @param {K} key
   * @param {() => V | PromiseLike<V>} loader
   * @param {CacheSetOptions} [options]
   * @returns {Promise<V>}
   */
  getOrSet(key, loader, options = {}) {
    const entry = this.#map.get(key);
    if (entry) {
      const now = entry.expires ? Date.now() : 0;
      if (!entry.expires || entry.expires > now) return Promise.resolve(/** @type {V} */ (this.get(key)));
      if (entry.stale > now) {
        this.#stats.hits++;
        // The stale value is good enough if the refresh fails; the next call tries again.
        if (!this.#loading.has(key)) this.#load(key, loader, options).catch(() => {});
        return Promise.resolve(entry.value);
      }
      this.#remove(key, entry, "expire");
    }
    const inflight = this.#loading.get(key);
    if (inflight) return inflight;
    this.#stats.misses++;
    return this.#load(key, loader, options);
  }

  /**
   * @param {K} key
   * @param {() => V | PromiseLike<V>} loader
   * @param {CacheSetOptions} options
   * @returns {Promise<V>}
   */
  #load(key, loader, options) {
    /** @type {Promise<V>} */
    const promise = Promise.resolve()
      .then(loader)
      .then(
        (value) => {
          // A delete() or clear() during the load means the result is no longer wanted.
          if (this.#loading.get(key) === promise) {
            this.#loading.delete(key);
            this.set(key, value, options);
          }
          return value;
        },
        (error) => {
          if (this.#loading.get(key) === promise) this.#loading.delete(key);
          throw error;
        },
      );
    this.#loading.set(key, promise);
    return promise;
  }

  /**
   * Is there a fresh entry for this key? Doesn't count as a use.
   *
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    return this.#fresh(key) !== undefined;
  }

  /**
   * Removes an entry. A value being loaded for this key by `getOrSet()` is
   * not stored when it arrives.
   *
   * @param {K} key
   * @returns {boolean} `true` if there was one.
   */
  delete(key) {
    this.#loading.delete(key);
    const entry = this.#map.get(key);
    if (!entry) return false;
    this.#remove(key, entry, "delete");
    return true;
  }

  /**
   * Removes every entry. Stats are kept.
   *
   * @returns {void}
   */
  clear() {
    this.#loading.clear();
    for (const [key, entry] of [...this.#map]) this.#remove(key, entry, "clear");
  }

  /**
   * Removes expired entries now instead of waiting for them to be read.
   *
   * @returns {number} How many were removed.
   */
  prune() {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of this.#map) {
      if (entry.expires && entry.stale <= now) {
        this.#remove(key, entry, "expire");
        removed++;
      }
    }
    return removed;
  }

  /**
   * Time left before an entry expires.
   *
   * @param {K} key
   * @returns {number | undefined} Milliseconds, `Infinity` if it never expires, `undefined` if missing.
   */
  ttl(key) {
    const entry = this.#fresh(key);
    if (!entry) return undefined;
    return entry.expires ? entry.expires - Date.now() : Infinity;
  }

  /**
   * Wraps a function so its results are cached here.
   *
   * @example
   * const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
   * await getWeather("Paris");
   *
   * @template {any[]} A
   * @param {(...args: A) => V | PromiseLike<V>} fn
   * @param {{ key?: (...args: A) => K } & CacheSetOptions} [options] `key` builds the cache key from the arguments. By default, primitives are compared by value and plain objects by content.
   * @returns {(...args: A) => Promise<V>}
   */
  wrap(fn, options = {}) {
    const settings = { ttl: options.ttl, staleWhileRevalidate: options.staleWhileRevalidate };
    return (...args) => {
      const key = options.key ? options.key(...args) : /** @type {K} */ (argsKey(args));
      return this.getOrSet(key, () => fn(...args), settings);
    };
  }

  /** Number of entries, including expired ones not yet removed. */
  get size() {
    return this.#map.size;
  }

  /** Hit and miss counts. */
  get stats() {
    const total = this.#stats.hits + this.#stats.misses;
    return /** @type {CacheStats} */ ({ ...this.#stats, hitRate: total ? this.#stats.hits / total : 0 });
  }

  /**
   * Puts every counter of `stats` back to zero.
   *
   * @returns {this}
   */
  resetStats() {
    this.#stats = { hits: 0, misses: 0, sets: 0, evictions: 0, expirations: 0 };
    return this;
  }

  /**
   * @template R
   * @param {(key: K, entry: CacheEntry<V>) => R} pick
   * @returns {R[]}
   */
  #list(pick) {
    this.prune();
    const now = Date.now();
    /** @type {R[]} */
    const out = [];
    for (const [key, entry] of this.#map) if (!entry.expires || entry.expires > now) out.push(pick(key, entry));
    return out;
  }

  /**
   * Fresh keys, least recently used first.
   * @returns {K[]}
   */
  keys() {
    return this.#list((key) => key);
  }

  /**
   * Fresh values, least recently used first.
   * @returns {V[]}
   */
  values() {
    return this.#list((_, entry) => entry.value);
  }

  /**
   * Fresh `[key, value]` pairs, least recently used first.
   * @returns {Array<[K, V]>}
   */
  entries() {
    return this.#list((key, entry) => /** @type {[K, V]} */ ([key, entry.value]));
  }

  /**
   * Lets you write `for (const [key, value] of cache)`.
   * @returns {IterableIterator<[K, V]>}
   */
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
}

module.exports = Cache;
