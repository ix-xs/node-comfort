"use strict";

/**
 * A small typed event emitter. Declare your events once, and your editor
 * checks every event name and listener argument. `on()` returns a function
 * that removes the listener, and you can `await` an event or loop over
 * events with `for await`.
 *
 * @example
 * const chat = new nc.Emitter<{ message: [text: string, from: string]; close: [] }>();
 * const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
 * chat.emit("message", "hello", "ada");
 * off();
 * const [text] = await chat.waitFor("message", { timeout: "5s" });
 */

const { TimeoutError, AbortError } = require("./errors.js");
const { toMs, setLongTimeout } = require("./internal/shared.js");

/**
 * Event names mapped to their arguments, like
 * `{ ready: [], data: [chunk: Buffer], error: [error: Error] }`.
 * @typedef {Record<string, any[]>} EventMap
 */

/**
 * Options for `on()` and `once()`.
 * @typedef {object} ListenOptions
 * @property {AbortSignal} [signal] Removes the listener when aborted. One signal can clean up many listeners at once.
 */

/**
 * Options for `waitFor()`.
 * @template {any[]} A
 * @typedef {object} WaitForOptions
 * @property {number | string} [timeout] Reject with a `TimeoutError` after this long.
 * @property {AbortSignal} [signal] Reject with an `AbortError` when aborted.
 * @property {(...args: A) => boolean} [filter] Only resolve for events that pass this test.
 */

/**
 * A listener as stored: `once()` wraps the function it was given and keeps
 * it as `listener`, so `off()` can find it.
 * @typedef {((...args: any[]) => unknown) & { listener?: Function }} StoredListener
 */

/** @type {readonly StoredListener[]} */
const NONE = Object.freeze([]);

/**
 * A typed event emitter. In JavaScript, give the variable a JSDoc type such
 * as `import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>`.
 *
 * @template {EventMap} [Events=EventMap]
 */
class Emitter {
  // Listener lists are replaced, never changed in place: emit() can walk one
  // without copying it, even if a listener adds or removes others meanwhile.
  /** @type {Map<keyof Events, readonly StoredListener[]>} */
  #listeners = new Map();
  /** @type {readonly StoredListener[]} */
  #any = NONE;

  /**
   * @param {keyof Events} event
   * @param {StoredListener} stored
   * @param {ListenOptions | undefined} options
   * @returns {() => void}
   */
  #add(event, stored, options) {
    const signal = options?.signal;
    if (signal?.aborted) return () => {};
    const current = this.#listeners.get(event) ?? NONE;
    if (!current.includes(stored)) this.#listeners.set(event, [...current, stored]);
    const off = () => {
      signal?.removeEventListener("abort", off);
      this.#drop(event, stored);
    };
    signal?.addEventListener("abort", off, { once: true });
    return off;
  }

  /**
   * @param {keyof Events} event
   * @param {Function} listener The stored function, or the one given to `once()`.
   */
  #drop(event, listener) {
    const current = this.#listeners.get(event);
    if (!current) return;
    const next = current.filter((stored) => stored !== listener && stored.listener !== listener);
    if (next.length === current.length) return;
    if (next.length) this.#listeners.set(event, next);
    else this.#listeners.delete(event);
  }

  /**
   * Listens to an event.
   *
   * @example
   * const off = emitter.on("data", (chunk) => chunks.push(chunk));
   * off(); // stop listening
   *
   * const controller = new AbortController();
   * emitter.on("data", onData, { signal: controller.signal });
   * emitter.on("end", onEnd, { signal: controller.signal });
   * controller.abort(); // removes both
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} listener
   * @param {ListenOptions} [options]
   * @returns {() => void} Removes the listener.
   */
  on(event, listener, options) {
    return this.#add(event, listener, options);
  }

  /**
   * Listens to an event once.
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} listener
   * @param {ListenOptions} [options]
   * @returns {() => void} Removes the listener if it hasn't run yet.
   */
  once(event, listener, options) {
    /** @type {StoredListener} */
    const wrapper = (...args) => {
      off();
      return listener(.../** @type {Events[K]} */ (args));
    };
    wrapper.listener = listener;
    const off = this.#add(event, wrapper, options);
    return off;
  }

  /**
   * Listens to every event; the listener gets the event name first. Handy for
   * logging.
   *
   * @example
   * emitter.onAny((event, ...args) => nc.debug(event, args));
   *
   * @param {(event: keyof Events & string, ...args: any[]) => unknown} listener
   * @returns {() => void} Removes the listener.
   */
  onAny(listener) {
    if (!this.#any.includes(listener)) this.#any = [...this.#any, listener];
    return () => {
      this.#any = this.#any.filter((stored) => stored !== listener);
    };
  }

  /**
   * Removes a listener, or all listeners of the event if you don't pass one.
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} [listener] The function given to `on()` or `once()`.
   * @returns {this}
   */
  off(event, listener) {
    if (!listener) this.#listeners.delete(event);
    else this.#drop(event, listener);
    return this;
  }

  /**
   * Calls the event's listeners right away, in the order they were added.
   * If one throws, the error propagates, as with Node's `EventEmitter`.
   *
   * @example
   * emitter.emit("message", "hello", "ada");
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {Events[K]} args
   * @returns {boolean} `true` if anyone was listening.
   */
  emit(event, ...args) {
    const listeners = this.#listeners.get(event);
    const any = this.#any;
    if (listeners !== undefined) for (let i = 0; i < listeners.length; i++) listeners[i](...args);
    for (let i = 0; i < any.length; i++) any[i](event, ...args);
    return listeners !== undefined || any.length > 0;
  }

  /**
   * Calls the listeners one at a time, waiting for each, and resolves with
   * what they returned. Good for hooks that may be async.
   *
   * @example
   * await hooks.emitAsync("beforeSave", record);
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {Events[K]} args
   * @returns {Promise<unknown[]>}
   */
  async emitAsync(event, ...args) {
    const results = [];
    const any = this.#any;
    for (const listener of this.#listeners.get(event) ?? NONE) results.push(await listener(...args));
    for (const listener of any) await listener(event, ...args);
    return results;
  }

  /**
   * Waits for the next time the event fires and resolves with its arguments.
   *
   * @example
   * const [code] = await child.waitFor("exit", { timeout: "30s" });
   * const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {WaitForOptions<Events[K]>} [options]
   * @returns {Promise<Events[K]>}
   * @throws {TimeoutError}
   * @throws {AbortError}
   */
  waitFor(event, options = {}) {
    return new Promise((resolve, reject) => {
      const limit = options.timeout === undefined ? undefined : toMs(options.timeout, "timeout");
      /** @type {() => void} */
      let cancelTimer = () => {};
      const cleanup = () => {
        cancelTimer();
        off();
        options.signal?.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(new AbortError(`Stopped waiting for "${event}"`, { cause: options.signal?.reason }));
      };
      const off = this.on(event, /** @type {any} */ ((/** @type {Events[K]} */ ...args) => {
        if (options.filter && !options.filter(...args)) return;
        cleanup();
        resolve(args);
      }));
      if (options.signal?.aborted) return onAbort();
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (limit !== undefined) {
        cancelTimer = setLongTimeout(() => {
          cleanup();
          reject(new TimeoutError(`Timed out waiting for "${event}" after ${limit}ms`, { timeout: limit }));
        }, limit);
      }
    });
  }

  /**
   * Loops over an event with `for await`. Events that fire while your loop
   * body runs are queued, and leaving the loop removes the listener.
   *
   * @example
   * for await (const [job] of queue.iterate("job")) {
   *   await process(job);
   * }
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {{ signal?: AbortSignal }} [options] Ends the loop when aborted.
   * @returns {AsyncIterableIterator<Events[K]>}
   */
  iterate(event, options = {}) {
    /** @type {Array<Events[K]>} */
    const buffer = [];
    /** @type {Array<(result: IteratorResult<Events[K]>) => void>} */
    const waiting = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      off();
      options.signal?.removeEventListener("abort", finish);
      for (const resolve of waiting.splice(0)) resolve({ value: undefined, done: true });
    };
    const off = this.on(event, /** @type {any} */ ((/** @type {Events[K]} */ ...args) => {
      const next = waiting.shift();
      if (next) next({ value: args, done: false });
      else buffer.push(args);
    }));
    if (options.signal?.aborted) finish();
    options.signal?.addEventListener("abort", finish, { once: true });
    /** @type {AsyncIterableIterator<Events[K]>} */
    const iterator = {
      next: () => {
        if (buffer.length) return Promise.resolve({ value: /** @type {Events[K]} */ (buffer.shift()), done: false });
        if (done) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => waiting.push(resolve));
      },
      return: () => {
        finish();
        return Promise.resolve({ value: undefined, done: true });
      },
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  /**
   * How many listeners an event has, or all events together. `onAny`
   * listeners aren't counted.
   *
   * @param {keyof Events & string} [event]
   * @returns {number}
   */
  listenerCount(event) {
    if (event !== undefined) return this.#listeners.get(event)?.length ?? 0;
    let total = 0;
    for (const list of this.#listeners.values()) total += list.length;
    return total;
  }

  /**
   * The listeners of an event, in the order they run. For `once()`, you get
   * the function you passed, not its wrapper.
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @returns {Array<(...args: Events[K]) => unknown>}
   */
  listeners(event) {
    return (this.#listeners.get(event) ?? NONE).map((stored) => /** @type {any} */ (stored.listener ?? stored));
  }

  /**
   * The events that have listeners.
   *
   * @returns {Array<keyof Events & string>}
   */
  eventNames() {
    return /** @type {Array<keyof Events & string>} */ ([...this.#listeners.keys()]);
  }

  /**
   * Removes all listeners of an event, or everything if you don't name one.
   *
   * @param {keyof Events & string} [event]
   * @returns {this}
   */
  clear(event) {
    if (event !== undefined) this.#listeners.delete(event);
    else {
      this.#listeners.clear();
      this.#any = NONE;
    }
    return this;
  }
}

module.exports = Emitter;
