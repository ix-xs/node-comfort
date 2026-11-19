"use strict";

/**
 * A circuit breaker. After too many failures in a row, the circuit opens and
 * every call fails at once with a `CircuitOpenError`, without touching the
 * service that is down. After `resetTimeout`, the next call is a trial
 * (half-open): if it works the circuit closes, if it fails it opens again.
 * Not to be confused with `async.rateLimit()`, which spaces calls out, or
 * `async.limit()`, which caps how many run at once.
 *
 * @example
 * const payments = nc.circuit.create({ failureThreshold: 5, resetTimeout: "30s" });
 * const invoice = await payments.execute(() => api.createInvoice(order));
 */

const Circuit = require("./Circuit.js");

/**
 * Creates a circuit breaker. Same as `new nc.circuit.Circuit(options)`.
 *
 * @example
 * const payments = nc.circuit.create({ failureThreshold: 5, resetTimeout: "30s" });
 * await payments.execute(() => api.charge(card, amount));
 * payments.status; // "closed", "open" or "half-open"
 *
 * @param {import("./Circuit").CircuitOptions} [options]
 * @returns {Circuit}
 */
function create(options) {
  return Circuit.create(options);
}

module.exports = {
  create,
  Circuit,
};
