"use strict";

/**
 * Promises and concurrency: map with a limit, queues with priorities,
 * mutexes, polling, and friendlier `Promise.allSettled`.
 *
 * @example
 * const pages = await async.map(urls, (url) => fetchPage(url), { concurrency: 5 });
 *
 * const limit = async.limit(2);
 * await Promise.all(files.map((file) => limit(() => upload(file))));
 *
 * await async.poll(() => isServerReady(), { interval: 250, timeout: "10s" });
 */

const { AbortError, TimeoutError } = require("./errors.js");
const { retry, timeout } = require("./Func.js");

/**
 * Options for `map()`, `forEach()` and `filter()`.
 * @typedef {object} MapOptions
 * @property {number} [concurrency] How many run at the same time. No limit by default.
 * @property {boolean} [stopOnError] Stop at the first error. With `false`, everything runs and you get an `AggregateError` of all failures. Defaults to `true`.
 * @property {AbortSignal} [signal] Stops starting new work and rejects with an `AbortError`.
 */

/**
 * A limiter from `limit()`. Call it with a function to run it when there's room.
 * @typedef {(<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly activeCount: number, readonly pendingCount: number, concurrency: number, clearQueue(): void, onIdle(): Promise<void> }} Limiter
 */

/**
 * Options for `queue()`.
 * @typedef {object} QueueOptions
 * @property {number} [concurrency] How many tasks run at the same time. Defaults to `1`.
 * @property {boolean} [autoStart] Start right away. Defaults to `true`.
 * @property {number | string} [timeout] Time limit per task, like `"30s"`. A slower task rejects with a `TimeoutError`.
 */

/**
 * Options for `queue.add()`.
 * @typedef {object} QueueAddOptions
 * @property {number} [priority] Higher goes first; equal priorities keep their order. Defaults to `0`.
 */

/**
 * A queue from `queue()`.
 * @typedef {object} Queue
 * @property {<T>(task: () => T | PromiseLike<T>, options?: QueueAddOptions) => Promise<Awaited<T>>} add Adds a task; resolves with its result.
 * @property {<T>(tasks: Array<() => T | PromiseLike<T>>, options?: QueueAddOptions) => Promise<Array<Awaited<T>>>} addAll Adds several tasks; resolves with all results.
 * @property {() => Queue} pause Stops starting tasks. Running ones finish.
 * @property {() => Queue} start Starts again.
 * @property {() => void} clear Drops the tasks that haven't started. Their promises never settle.
 * @property {() => Promise<void>} onIdle Resolves when nothing is waiting or running.
 * @property {() => Promise<void>} onEmpty Resolves when nothing is waiting.
 * @property {number} size Tasks waiting.
 * @property {number} pending Tasks running.
 * @property {boolean} isPaused
 * @property {number} concurrency Can be changed on the fly.
 */

/**
 * A promise with its `resolve` and `reject`.
 * @template T
 * @typedef {object} Deferred
 * @property {Promise<T>} promise
 * @property {(value: T | PromiseLike<T>) => void} resolve
 * @property {(reason?: unknown) => void} reject
 * @property {boolean} settled Whether it's already resolved or rejected.
 */

/**
 * What `settle()` returns.
 * @template T
 * @typedef {object} Settled
 * @property {T[]} fulfilled Successful values, in order.
 * @property {unknown[]} rejected Errors, in order.
 * @property {Array<PromiseSettledResult<T>>} results Everything, like `Promise.allSettled`.
 */

/**
 * Options for `poll()`.
 * @typedef {object} PollOptions
 * @property {number | string} [interval] Time between tries. Defaults to 100 ms.
 * @property {number | string} [timeout] Give up with a `TimeoutError` after this long.
 * @property {AbortSignal} [signal] Stops with an `AbortError`.
 */

/**
 * A mutex from `mutex()`.
 * @typedef {object} Mutex
 * @property {<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>} run Runs `fn` once no other `run` is in progress.
 * @property {() => Promise<() => void>} lock Waits for the lock and gives you the function that releases it.
 * @property {boolean} isLocked
 */

/** @param {number | string | undefined} value */
const _ms = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  const ms = require("./Time.js").parseDuration(value);
  if (ms === null) throw new TypeError(`Invalid duration: ${value}`);
  return ms;
};

/**
 * Waits for a while. Same as `nc.wait()`.
 *
 * @example
 * await async.sleep("250ms");
 *
 * @param {number | string} duration
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */
function sleep(duration, options = {}) {
  return require("./Utils.js").wait(duration, options);
}

/**
 * Maps items through an async function, with at most `concurrency` calls
 * at once. Results stay in order.
 *
 * @example
 * const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
 *
 * @template T
 * @template R
 * @param {Iterable<T> | AsyncIterable<T>} items
 * @param {(item: T, index: number) => R | PromiseLike<R>} fn
 * @param {MapOptions} [options]
 * @returns {Promise<Array<Awaited<R>>>}
 * @throws The first error, an `AggregateError` with `stopOnError: false`, or an `AbortError`.
 */
async function map(items, fn, options = {}) {
  /** @type {T[]} */
  const list = [];
  if (Symbol.asyncIterator in Object(items)) for await (const item of /** @type {AsyncIterable<T>} */ (items)) list.push(item);
  else for (const item of /** @type {Iterable<T>} */ (items)) list.push(item);
  const concurrency = Math.max(1, options.concurrency ?? Infinity);
  const stopOnError = options.stopOnError ?? true;
  /** @type {Array<Awaited<R>>} */
  const results = new Array(list.length);
  /** @type {unknown[]} */
  const errors = [];
  let next = 0;
  let failed = false;

  await new Promise((resolve, reject) => {
    if (!list.length) return resolve(undefined);
    let active = 0;
    let done = 0;
    const onAbort = () => {
      failed = true;
      reject(new AbortError(undefined, { cause: options.signal?.reason }));
    };
    if (options.signal?.aborted) return onAbort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const launch = () => {
      while (active < concurrency && next < list.length && !failed) {
        const index = next++;
        active++;
        Promise.resolve()
          .then(() => fn(list[index], index))
          .then(
            (value) => {
              results[index] = /** @type {Awaited<R>} */ (value);
            },
            (error) => {
              if (stopOnError) {
                failed = true;
                options.signal?.removeEventListener("abort", onAbort);
                reject(error);
              } else {
                errors[index] = error;
              }
            },
          )
          .finally(() => {
            active--;
            done++;
            if (failed) return;
            if (done === list.length) {
              options.signal?.removeEventListener("abort", onAbort);
              if (errors.length) reject(new AggregateError(errors.filter((e) => e !== undefined), `${errors.filter((e) => e !== undefined).length} of ${list.length} tasks failed`));
              else resolve(undefined);
            } else {
              launch();
            }
          });
      }
    };
    launch();
  });
  return results;
}

/**
 * Runs an async function for every item, with a concurrency limit.
 *
 * @example
 * await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
 *
 * @template T
 * @param {Iterable<T> | AsyncIterable<T>} items
 * @param {(item: T, index: number) => unknown} fn
 * @param {MapOptions} [options]
 * @returns {Promise<void>}
 */
async function forEach(items, fn, options = {}) {
  await map(items, fn, options);
}

/**
 * Keeps the items that pass an async test, with a concurrency limit.
 * Order is preserved.
 *
 * @example
 * const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
 *
 * @template T
 * @param {Iterable<T> | AsyncIterable<T>} items
 * @param {(item: T, index: number) => unknown} predicate
 * @param {MapOptions} [options]
 * @returns {Promise<T[]>}
 */
async function filter(items, predicate, options = {}) {
  /** @type {T[]} */
  const list = [];
  if (Symbol.asyncIterator in Object(items)) for await (const item of /** @type {AsyncIterable<T>} */ (items)) list.push(item);
  else for (const item of /** @type {Iterable<T>} */ (items)) list.push(item);
  const keep = await map(list, predicate, options);
  return list.filter((_, i) => keep[i]);
}

/**
 * Runs async functions one after the other and returns their results.
 *
 * @example
 * await async.series([() => migrateUsers(), () => migrateOrders()]);
 *
 * @template T
 * @param {Iterable<() => T | PromiseLike<T>>} tasks
 * @returns {Promise<Array<Awaited<T>>>}
 */
async function series(tasks) {
  /** @type {Array<Awaited<T>>} */
  const out = [];
  for (const task of tasks) out.push(await task());
  return out;
}

/**
 * A limiter: wrap calls with it, and at most `concurrency` run at once
 * while the rest wait their turn. Like `p-limit`.
 *
 * @example
 * const limit = async.limit(3);
 * const results = await Promise.all(urls.map((url) => limit(() => fetch(url))));
 *
 * @param {number} concurrency
 * @returns {Limiter}
 */
function limit(concurrency) {
  let max = Math.max(1, concurrency);
  let active = 0;
  /** @type {Array<() => void>} */
  const waiting = [];
  /** @type {Array<() => void>} */
  let idleWaiters = [];
  const next = () => {
    if (active < max && waiting.length) {
      active++;
      /** @type {() => void} */ (waiting.shift())();
    } else if (active === 0 && !waiting.length) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters = [];
    }
  };
  /** @type {any} */
  const limiter = (/** @type {() => unknown} */ fn) =>
    new Promise((resolve, reject) => {
      waiting.push(() => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  Object.defineProperties(limiter, {
    activeCount: { get: () => active },
    pendingCount: { get: () => waiting.length },
    concurrency: {
      get: () => max,
      set: (/** @type {number} */ value) => {
        max = Math.max(1, value);
        while (active < max && waiting.length) next();
      },
    },
    clearQueue: { value: () => void waiting.splice(0) },
    onIdle: { value: () => (active === 0 && !waiting.length ? Promise.resolve() : new Promise((resolve) => idleWaiters.push(() => resolve(undefined)))) },
  });
  return limiter;
}

/**
 * A task queue with a concurrency limit, priorities, pause and per-task
 * timeouts.
 *
 * @example
 * const jobs = async.queue({ concurrency: 2, timeout: "30s" });
 * jobs.add(() => sendEmail(a));
 * jobs.add(() => sendEmail(vip), { priority: 10 }); // jumps the line
 * await jobs.onIdle();
 *
 * @param {QueueOptions} [options]
 * @returns {Queue}
 */
function queue(options = {}) {
  let concurrency = Math.max(1, options.concurrency ?? 1);
  let paused = options.autoStart === false;
  let running = 0;
  let order = 0;
  const taskTimeout = _ms(options.timeout);
  /** @type {Array<{ run: () => void, priority: number, order: number }>} */
  const waiting = [];
  /** @type {Array<() => void>} */
  let idle = [];
  /** @type {Array<() => void>} */
  let empty = [];

  const check = () => {
    if (!waiting.length) {
      for (const resolve of empty) resolve();
      empty = [];
      if (running === 0) {
        for (const resolve of idle) resolve();
        idle = [];
      }
    }
  };
  const pump = () => {
    while (!paused && running < concurrency && waiting.length) {
      const task = /** @type {{ run: () => void }} */ (waiting.shift());
      running++;
      task.run();
    }
    check();
  };

  /** @type {Queue} */
  const self = {
    add(task, addOptions = {}) {
      return new Promise((resolve, reject) => {
        const entry = {
          priority: addOptions.priority ?? 0,
          order: order++,
          run: () => {
            const work = Promise.resolve().then(task);
            (taskTimeout === undefined ? work : timeout(work, taskTimeout, `Queue task timed out after ${taskTimeout}ms`))
              .then(/** @type {any} */ (resolve), reject)
              .finally(() => {
                running--;
                pump();
              });
          },
        };
        const index = waiting.findIndex((w) => w.priority < entry.priority);
        if (index === -1) waiting.push(entry);
        else waiting.splice(index, 0, entry);
        pump();
      });
    },
    addAll(tasks, addOptions) {
      return Promise.all(tasks.map((task) => self.add(task, addOptions)));
    },
    pause() {
      paused = true;
      return self;
    },
    start() {
      paused = false;
      pump();
      return self;
    },
    clear() {
      waiting.splice(0);
      check();
    },
    onIdle() {
      return !waiting.length && running === 0 ? Promise.resolve() : new Promise((resolve) => idle.push(() => resolve(undefined)));
    },
    onEmpty() {
      return !waiting.length ? Promise.resolve() : new Promise((resolve) => empty.push(() => resolve(undefined)));
    },
    get size() {
      return waiting.length;
    },
    get pending() {
      return running;
    },
    get isPaused() {
      return paused;
    },
    get concurrency() {
      return concurrency;
    },
    set concurrency(value) {
      concurrency = Math.max(1, value);
      pump();
    },
  };
  return self;
}

/**
 * A mutex: tasks given to `run()` never overlap. Put it around
 * read-modify-write steps, like updating a file or refreshing a token.
 *
 * @example
 * const lock = async.mutex();
 * await lock.run(async () => {
 *   const data = nc.readJSON("./counter.json", { n: 0 });
 *   nc.writeJSON("./counter.json", { n: data.n + 1 });
 * });
 *
 * @returns {Mutex}
 */
function mutex() {
  const limiter = limit(1);
  let locked = false;
  return {
    run: (fn) => limiter(async () => {
      locked = true;
      try {
        return await fn();
      } finally {
        locked = false;
      }
    }),
    lock: () =>
      new Promise((resolveLock) => {
        void limiter(() => new Promise((release) => {
          locked = true;
          resolveLock(() => {
            locked = false;
            release(undefined);
          });
        }));
      }),
    get isLocked() {
      return locked;
    },
  };
}

/**
 * A promise along with its `resolve` and `reject`. Handy to connect
 * callbacks or events to `await`.
 *
 * @example
 * const ready = async.deferred();
 * socket.once("open", () => ready.resolve());
 * await ready.promise;
 *
 * @template [T=void]
 * @returns {Deferred<T>}
 */
function deferred() {
  /** @type {(value: T | PromiseLike<T>) => void} */
  let resolve = () => {};
  /** @type {(reason?: unknown) => void} */
  let reject = () => {};
  /** @type {Deferred<T>} */
  const out = {
    promise: new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
    resolve: (value) => {
      out.settled = true;
      resolve(value);
    },
    reject: (reason) => {
      out.settled = true;
      reject(reason);
    },
    settled: false,
  };
  return out;
}

/**
 * Waits for every promise and sorts successes from failures.
 *
 * @example
 * const { fulfilled, rejected } = await async.settle(emails.map(send));
 * nc.info(`${fulfilled.length} sent, ${rejected.length} failed`);
 *
 * @template T
 * @param {Iterable<T | PromiseLike<T>>} promises
 * @returns {Promise<Settled<Awaited<T>>>}
 */
async function settle(promises) {
  const results = /** @type {Array<PromiseSettledResult<Awaited<T>>>} */ (await Promise.allSettled(promises));
  return {
    fulfilled: results.filter((r) => r.status === "fulfilled").map((r) => /** @type {PromiseFulfilledResult<Awaited<T>>} */ (r).value),
    rejected: results.filter((r) => r.status === "rejected").map((r) => /** @type {PromiseRejectedResult} */ (r).reason),
    results,
  };
}

/**
 * Like `Promise.all`, for an object of promises.
 *
 * @example
 * const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });
 *
 * @template {Record<string, unknown>} T
 * @param {T} object
 * @returns {Promise<{ [K in keyof T]: Awaited<T[K]> }>}
 */
async function props(object) {
  const keys = Object.keys(object);
  const values = await Promise.all(keys.map((key) => object[key]));
  /** @type {any} */
  const out = {};
  keys.forEach((key, i) => {
    out[key] = values[i];
  });
  return out;
}

/**
 * Calls `fn` until it returns something truthy, and resolves with it.
 * Errors count as "not yet".
 *
 * @example
 * await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
 *
 * @template T
 * @param {() => T | PromiseLike<T>} fn
 * @param {PollOptions} [options]
 * @returns {Promise<NonNullable<Awaited<T>>>}
 * @throws {TimeoutError}
 * @throws {AbortError}
 */
async function poll(fn, options = {}) {
  const interval = _ms(options.interval) ?? 100;
  const limitMs = _ms(options.timeout);
  const deadline = limitMs === undefined ? Infinity : Date.now() + limitMs;
  for (;;) {
    if (options.signal?.aborted) throw new AbortError(undefined, { cause: options.signal.reason });
    try {
      const value = await fn();
      if (value) return /** @type {NonNullable<Awaited<T>>} */ (value);
    } catch {
      // not ready yet
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new TimeoutError(`poll() timed out after ${limitMs}ms`, { timeout: limitMs });
    await sleep(Math.min(interval, remaining), { signal: options.signal });
  }
}

module.exports = {
  sleep,
  map,
  forEach,
  filter,
  series,
  limit,
  queue,
  mutex,
  deferred,
  settle,
  props,
  poll,
  retry,
  timeout,
};
