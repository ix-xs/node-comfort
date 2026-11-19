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

const { toMs } = require("./internal/shared.js");
const { CircuitOpenError } = require("./errors.js");

/**
 * The state of a circuit: `"closed"` lets every call through, `"open"`
 * rejects them, `"half-open"` lets calls through to see whether the service
 * is back.
 * @typedef {"closed" | "open" | "half-open"} CircuitStatus
 */

/**
 * Options for `nc.circuit.create()`.
 * @typedef {object} CircuitOptions
 * @property {number} [failureThreshold] Failures in a row that open the circuit. Defaults to `5`.
 * @property {number | string} [resetTimeout] How long the circuit stays open before a trial, in ms or like `"30s"`. Defaults to `"30s"`.
 * @property {number} [successThreshold] Successes in a row, while half-open, that close the circuit. Defaults to `1`.
 * @property {(error: unknown) => boolean} [isFailure] Whether an error counts as a failure. Every error does by default; one that doesn't is still thrown to the caller.
 * @property {() => void} [onOpen] Called each time the circuit opens.
 * @property {() => void} [onClose] Called each time the circuit closes again.
 */

/**
 * @param {number | undefined} value
 * @param {number} fallback
 * @param {string} what
 * @returns {number}
 */
const _threshold = (value, fallback, what) => {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || Number.isNaN(value)) throw new TypeError(`Invalid ${what}: ${String(value)}`);
  if (value < 1) throw new RangeError(`The ${what} must be 1 or more, got ${value}`);
  return value;
};

/**
 * A circuit breaker: it fails fast while a service is down, then lets a
 * trial call through to see whether it is back. Not to be confused with
 * `async.rateLimit()`, which spaces calls out, or `async.limit()`, which
 * caps how many run at once.
 */
class Circuit {
  /** @type {CircuitStatus} */
  #status = "closed";
  #failures = 0;
  #successes = 0;
  #openedAt = 0;
  #failureThreshold;
  #resetTimeout;
  #successThreshold;
  /** @type {(error: unknown) => boolean} */
  #isFailure;
  /** @type {(() => void) | undefined} */
  #onOpen;
  /** @type {(() => void) | undefined} */
  #onClose;

  /**
   * @example
   * const search = new nc.circuit.Circuit({ resetTimeout: "1m", isFailure: (error) => error.status !== 404 });
   *
   * @param {CircuitOptions} [options]
   * @throws {TypeError | RangeError} If a threshold is not a number of 1 or more, or `resetTimeout` not a duration.
   */
  constructor(options = {}) {
    this.#failureThreshold = _threshold(options.failureThreshold, 5, "failureThreshold");
    this.#successThreshold = _threshold(options.successThreshold, 1, "successThreshold");
    this.#resetTimeout = Math.max(0, toMs(options.resetTimeout ?? "30s", "resetTimeout"));
    this.#isFailure = options.isFailure ?? (() => true);
    this.#onOpen = options.onOpen;
    this.#onClose = options.onClose;
  }

  /**
   * Creates a circuit. Same as `new Circuit(options)`, and as `nc.circuit.create()`.
   *
   * @example
   * const Circuit = require("@ix-xs/node-comfort/circuit");
   * const mailer = Circuit.create({ failureThreshold: 3 });
   *
   * @param {CircuitOptions} [options]
   * @returns {Circuit}
   */
  static create(options) {
    return new Circuit(options);
  }

  /**
   * Where the circuit stands. It stays `"open"` until the first call made
   * after `resetTimeout`, which turns it `"half-open"`.
   * @returns {CircuitStatus}
   */
  get status() {
    return this.#status;
  }

  /**
   * Runs `fn` through the circuit and returns what it returns. While the
   * circuit is open, rejects with a `CircuitOpenError` without calling `fn`.
   * An error of `fn` is always thrown back to you, after being counted as a
   * failure (unless `isFailure` says otherwise).
   *
   * @example
   * try {
   *   return await payments.execute(() => api.charge(card, amount));
   * } catch (error) {
   *   if (error instanceof nc.errors.CircuitOpenError) return "Payments are down, try again in a minute";
   *   throw error;
   * }
   *
   * @template T
   * @param {() => T | PromiseLike<T>} fn
   * @returns {Promise<Awaited<T>>}
   * @throws {CircuitOpenError} If the circuit is open.
   */
  async execute(fn) {
    if (this.#status === "open") {
      if (Date.now() - this.#openedAt < this.#resetTimeout) throw new CircuitOpenError();
      this.#status = "half-open";
      this.#successes = 0;
    }
    /** @type {Awaited<T>} */
    let result;
    try {
      result = await fn();
    } catch (error) {
      if (this.#isFailure(error)) this.#failed();
      throw error;
    }
    this.#succeeded();
    return result;
  }

  #succeeded() {
    if (this.#status === "half-open") {
      if (++this.#successes >= this.#successThreshold) this.#close();
    } else {
      this.#failures = 0;
    }
  }

  #failed() {
    this.#failures++;
    if (this.#status === "half-open" || this.#failures >= this.#failureThreshold) this.#open();
  }

  #open() {
    const was = this.#status;
    this.#status = "open";
    this.#openedAt = Date.now();
    if (was !== "open") this.#onOpen?.();
  }

  #close() {
    const was = this.#status;
    this.#status = "closed";
    this.#failures = 0;
    this.#successes = 0;
    if (was !== "closed") this.#onClose?.();
  }
}

module.exports = Circuit;
