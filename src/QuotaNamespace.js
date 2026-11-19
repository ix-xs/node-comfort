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

const Quota = require("./Quota.js");

/**
 * Creates a quota. Same as `new nc.quota.Quota(options)`.
 *
 * @example
 * const perUser = nc.quota.create({ limit: 5, window: "1m" });
 * perUser.consume("user-42"); // { allowed: true, remaining: 4, resetMs: 60000 }
 *
 * @param {import("./Quota").QuotaOptions} options
 * @returns {Quota}
 */
function create(options) {
  return Quota.create(options);
}

module.exports = {
  create,
  Quota,
};
