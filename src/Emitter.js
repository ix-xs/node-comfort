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

/**
 * Event names mapped to their arguments, like
 * `{ ready: [], data: [chunk: Buffer], error: [error: Error] }`.
 * @typedef {Record<string, any[]>} EventMap
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
 * A typed event emitter. In JavaScript, give the variable a JSDoc type such
 * as `import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>`.
 *
 * @template {EventMap} [Events=EventMap]
 */
class Emitter {
  /** @type {Map<keyof Events, Set<(...args: any[]) => unknown>>} */
  #listeners = new Map();
  /** @type {Set<(event: keyof Events, ...args: any[]) => unknown>} */
  #any = new Set();

  /**
   * Listens to an event.
   *
   * @example
   * const off = emitter.on("data", (chunk) => chunks.push(chunk));
   * off(); // stop listening
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} listener
   * @returns {() => void} Removes the listener.
   */
  on(event, listener) {
    let set = this.#listeners.get(event);
    if (!set) this.#listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Listens to an event once.
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} listener
   * @returns {() => void} Removes the listener if it hasn't run yet.
   */
  once(event, listener) {
    /** @type {(...args: Events[K]) => unknown} */
    const wrapper = (...args) => {
      off();
      return listener(...args);
    };
    const off = this.on(event, wrapper);
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
    this.#any.add(/** @type {any} */ (listener));
    return () => void this.#any.delete(/** @type {any} */ (listener));
  }

  /**
   * Removes a listener, or all listeners of the event if you don't pass one.
   *
   * @template {keyof Events & string} K
   * @param {K} event
   * @param {(...args: Events[K]) => unknown} [listener]
   * @returns {this}
   */
  off(event, listener) {
    if (!listener) this.#listeners.delete(event);
    else {
      const set = this.#listeners.get(event);
      set?.delete(listener);
      if (set && !set.size) this.#listeners.delete(event);
    }
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
    const listeners = [...(this.#listeners.get(event) ?? [])];
    for (const listener of listeners) listener(...args);
    for (const listener of [...this.#any]) listener(event, ...args);
    return listeners.length > 0 || this.#any.size > 0;
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
    for (const listener of [...(this.#listeners.get(event) ?? [])]) results.push(await listener(...args));
    for (const listener of [...this.#any]) await listener(event, ...args);
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
      /** @type {NodeJS.Timeout | undefined} */
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
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
      if (options.timeout !== undefined) {
        const ms = typeof options.timeout === "number" ? options.timeout : require("./Time.js").parseDuration(options.timeout) ?? 0;
        timer = setTimeout(() => {
          cleanup();
          reject(new TimeoutError(`Timed out waiting for "${event}" after ${ms}ms`, { timeout: ms }));
        }, ms);
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
    if (event !== undefined) return this.#listeners.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.#listeners.values()) total += set.size;
    return total;
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
      this.#any.clear();
    }
    return this;
  }
}

module.exports = Emitter;
