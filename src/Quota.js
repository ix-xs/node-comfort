"use strict";

/**
 * A quota per key: at most `limit` hits per `window` for each user, IP or
 * guild, counted in a fixed window that starts at the key's first hit.
 * `consume()` answers at once whether a hit is allowed: nothing waits.
 * Not to be confused with `async.rateLimit()`, which spaces calls out by
 * making them wait, or `async.limit()`, which caps how many run at once.
 *
 * @example
 * const perUser = nc.quota.create({ limit: 5, window: "1m" });
 * const { allowed, resetMs } = perUser.consume(userId);
 * if (!allowed) return reply(`Try again in ${Math.ceil(resetMs / 1000)}s`);
 */

const { toMs } = require("./internal/shared.js");

/**
 * Options for `nc.quota.create()`.
 * @typedef {object} QuotaOptions
 * @property {number} limit How many hits each key may make per window.
 * @property {number | string} window The length of a window, in ms or like `"1m"`. A key's window starts at its first hit.
 */

/**
 * What `consume()` answers.
 * @typedef {object} QuotaResult
 * @property {boolean} allowed Whether this hit fits in the quota. A refused hit is not counted.
 * @property {number} remaining Hits left in the current window.
 * @property {number} resetMs Milliseconds until the window ends and the key starts again from zero.
 */

/**
 * A key that can hold a quota: a user id, an IP address, a guild id...
 * @typedef {string | number} QuotaKey
 */

// Finished windows are dropped every this many hits.
const SWEEP_EVERY = 1000;

/**
 * Counts hits per key in a fixed window. Not to be confused with
 * `async.rateLimit()`, which spaces calls out, or `async.limit()`, which caps
 * how many run at once: a quota only says yes or no.
 */
class Quota {
  /** @type {Map<QuotaKey, { count: number, resetAt: number }>} */
  #windows = new Map();
  #limit;
  #windowMs;
  #hits = 0;

  /**
   * @example
   * const perIp = new nc.quota.Quota({ limit: 100, window: "1h" });
   *
   * @param {QuotaOptions} options
   * @throws {TypeError | RangeError} If `limit` is not a number of 0 or more, or `window` not a duration longer than 0.
   */
  constructor(options) {
    const { limit, window } = options ?? /** @type {QuotaOptions} */ ({});
    if (typeof limit !== "number" || Number.isNaN(limit)) throw new TypeError(`Invalid limit: ${String(limit)}`);
    if (limit < 0) throw new RangeError(`The limit must be 0 or more, got ${limit}`);
    const windowMs = toMs(/** @type {number | string} */ (window), "window");
    if (!(windowMs > 0)) throw new RangeError(`The window must be longer than 0, got ${String(window)}`);
    this.#limit = limit;
    this.#windowMs = windowMs;
  }

  /**
   * Creates a quota. Same as `new Quota(options)`, and as `nc.quota.create()`.
   *
   * @example
   * const Quota = require("@ix-xs/node-comfort/quota");
   * const logins = Quota.create({ limit: 5, window: "15m" });
   *
   * @param {QuotaOptions} options
   * @returns {Quota}
   */
  static create(options) {
    return new Quota(options);
  }

  /**
   * Records a hit for `key` and says whether it fits in the quota. A refused
   * hit is not counted, so a key that keeps trying is let in again as soon as
   * its window ends.
   *
   * @example
   * const result = perUser.consume(userId);
   * if (!result.allowed) throw new Error(`Slow down: retry in ${result.resetMs} ms`);
   * perUser.consume(userId, 3); // a hit that costs 3
   *
   * @param {QuotaKey} key
   * @param {number} [cost=1] How much this hit uses up. `0` reads the state without using anything.
   * @returns {QuotaResult}
   * @throws {TypeError | RangeError} If `cost` is not a number of 0 or more.
   */
  consume(key, cost = 1) {
    if (typeof cost !== "number" || Number.isNaN(cost)) throw new TypeError(`Invalid cost: ${String(cost)}`);
    if (cost < 0) throw new RangeError(`The cost must be 0 or more, got ${cost}`);
    const now = Date.now();
    // Keys that never come back (one-off users, deleted guilds) would otherwise stay for the life of the process.
    if (++this.#hits % SWEEP_EVERY === 0) {
      for (const [k, window] of this.#windows) if (now >= window.resetAt) this.#windows.delete(k);
    }
    let entry = this.#windows.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.#windowMs };
      this.#windows.set(key, entry);
    }
    const resetMs = entry.resetAt - now;
    if (entry.count + cost > this.#limit) {
      return { allowed: false, remaining: Math.max(0, this.#limit - entry.count), resetMs };
    }
    entry.count += cost;
    return { allowed: true, remaining: this.#limit - entry.count, resetMs };
  }

  /**
   * Forgets a key: its next hit starts a new window.
   *
   * @example
   * perUser.reset(userId); // after a successful login, say
   *
   * @param {QuotaKey} key
   * @returns {boolean} `true` if the key had a window.
   */
  reset(key) {
    return this.#windows.delete(key);
  }

  /** How many keys have a window, finished ones not dropped yet included. */
  get size() {
    return this.#windows.size;
  }
}

module.exports = Quota;
