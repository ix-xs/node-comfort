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

const { parseDuration } = require("./Time.js");

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
 * @property {boolean} [updateAgeOnGet] Reading an entry restarts its time to live.
 * @property {(key: K, value: V, reason: CacheRemovalReason) => void} [onRemove] Called whenever an entry leaves the cache.
 */

/**
 * Options for `set()` and `getOrSet()`.
 * @typedef {object} CacheSetOptions
 * @property {number | string} [ttl] Time to live of this entry. `0` means forever.
 */

/**
 * Cache stats.
 * @typedef {object} CacheStats
 * @property {number} hits Reads that found a fresh entry.
 * @property {number} misses Reads that found nothing or an expired entry.
 * @property {number} sets
 * @property {number} evictions Entries dropped because the cache was full.
 * @property {number} expirations Entries dropped because they expired.
 * @property {number} hitRate From 0 to 1.
 */

/**
 * @param {number | string | undefined} value
 * @returns {number}
 */
const _ttl = (value) => {
  if (value === undefined) return 0;
  if (typeof value === "number") return Math.max(0, value);
  const ms = parseDuration(value);
  if (ms === null) throw new TypeError(`Invalid ttl: ${value}`);
  return ms;
};

/**
 * An in-memory cache with a size limit and expiry.
 *
 * @template K
 * @template V
 */
class Cache {
  /** @type {Map<K, { value: V, expires: number, ttl: number }>} */
  #map = new Map();
  /** @type {Map<K, Promise<V>>} */
  #loading = new Map();
  #max;
  #ttl;
  #updateAgeOnGet;
  /** @type {((key: K, value: V, reason: CacheRemovalReason) => void) | undefined} */
  #onRemove;
  #stats = { hits: 0, misses: 0, sets: 0, evictions: 0, expirations: 0 };

  /**
   * @example
   * const cache = new nc.Cache({ max: 500, ttl: "1h", updateAgeOnGet: true });
   *
   * @param {CacheOptions<K, V>} [options]
   */
  constructor(options = {}) {
    this.#max = Math.max(1, options.max ?? Infinity);
    this.#ttl = _ttl(options.ttl);
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
    if (reason === "expire") this.#stats.expirations++;
    if (reason === "evict") this.#stats.evictions++;
    this.#onRemove?.(key, entry.value, reason);
  }

  /**
   * The entry if it exists and is fresh. Expired entries are removed.
   * @param {K} key
   */
  #fresh(key) {
    const entry = this.#map.get(key);
    if (!entry) return undefined;
    if (entry.expires && entry.expires <= Date.now()) {
      this.#remove(key, entry, "expire");
      return undefined;
    }
    return entry;
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
    this.#map.delete(key);
    if (this.#updateAgeOnGet && entry.ttl) entry.expires = Date.now() + entry.ttl;
    this.#map.set(key, entry);
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
    const ttl = options.ttl === undefined ? this.#ttl : _ttl(options.ttl);
    const previous = this.#map.get(key);
    if (previous) this.#remove(key, previous, "set");
    this.#map.set(key, { value, ttl, expires: ttl ? Date.now() + ttl : 0 });
    this.#stats.sets++;
    while (this.#map.size > this.#max) {
      const [oldestKey, oldest] = /** @type {[K, { value: V }]} */ (this.#map.entries().next().value);
      this.#remove(oldestKey, oldest, "evict");
    }
    return this;
  }

  /**
   * Returns the cached value, or calls `loader`, stores the result and
   * returns it. Simultaneous calls for the same key share one `loader` call,
   * and a failed load caches nothing.
   *
   * @example
   * const profile = await cache.getOrSet(`profile:${id}`, () => api.fetchProfile(id), { ttl: "10m" });
   *
   * @param {K} key
   * @param {() => V | PromiseLike<V>} loader
   * @param {CacheSetOptions} [options]
   * @returns {Promise<V>}
   */
  async getOrSet(key, loader, options = {}) {
    const entry = this.#fresh(key);
    if (entry) return /** @type {V} */ (this.get(key));
    const inflight = this.#loading.get(key);
    if (inflight) return inflight;
    this.#stats.misses++;
    const promise = Promise.resolve()
      .then(loader)
      .then((value) => {
        this.set(key, value, options);
        return value;
      })
      .finally(() => this.#loading.delete(key));
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
   * Removes an entry.
   *
   * @param {K} key
   * @returns {boolean} `true` if there was one.
   */
  delete(key) {
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
    for (const [key, entry] of [...this.#map]) {
      if (entry.expires && entry.expires <= now) {
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
   * @param {{ key?: (...args: A) => K, ttl?: number | string }} [options] `key` builds the cache key from the arguments; by default they're turned into JSON.
   * @returns {(...args: A) => Promise<V>}
   */
  wrap(fn, options = {}) {
    return (...args) => {
      const key = options.key ? options.key(...args) : /** @type {K} */ (/** @type {unknown} */ (JSON.stringify(args)));
      return this.getOrSet(key, () => fn(...args), { ttl: options.ttl });
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
   * Fresh keys, least recently used first.
   * @returns {K[]}
   */
  keys() {
    this.prune();
    return [...this.#map.keys()];
  }

  /**
   * Fresh values, least recently used first.
   * @returns {V[]}
   */
  values() {
    this.prune();
    return [...this.#map.values()].map((entry) => entry.value);
  }

  /**
   * Fresh `[key, value]` pairs, least recently used first.
   * @returns {Array<[K, V]>}
   */
  entries() {
    this.prune();
    return [...this.#map].map(([key, entry]) => /** @type {[K, V]} */ ([key, entry.value]));
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
