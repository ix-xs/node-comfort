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
const { toMs } = require("./internal/shared.js");
const { retry, timeout } = require("./Func.js");

/**
 * Options for `map()`, `forEach()` and `filter()`.
 * @typedef {object} MapOptions
 * @property {number} [concurrency] How many run at the same time. No limit by default.
 * @property {boolean} [stopOnError] Stop at the first error. With `false`, everything runs and you get an `AggregateError` of all failures. Defaults to `true`.
 * @property {AbortSignal} [signal] Stops starting new work and rejects with an `AbortError`.
 */

/**
 * A rate limiter from `rateLimit()`. Call it with a function to run it as
 * soon as the rate allows.
 * @typedef {(<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly pendingCount: number }} RateLimiter
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
const _ms = (value) => (value === undefined ? undefined : toMs(value));

/**
 * A first-in first-out list where taking the first item costs nothing,
 * unlike `Array.prototype.shift` on a long array.
 * @template T
 */
class _Fifo {
  /** @type {T[]} */
  #items = [];
  #head = 0;

  /** @param {T} item */
  push(item) {
    this.#items.push(item);
  }

  /** @returns {T | undefined} */
  shift() {
    if (this.#head >= this.#items.length) return undefined;
    const item = this.#items[this.#head];
    this.#items[this.#head++] = /** @type {any} */ (undefined);
    if (this.#head > 1024 && this.#head * 2 > this.#items.length) {
      this.#items = this.#items.slice(this.#head);
      this.#head = 0;
    }
    return item;
  }

  clear() {
    this.#items = [];
    this.#head = 0;
  }

  get size() {
    return this.#items.length - this.#head;
  }
}

/**
 * A binary heap: the entry with the highest priority comes out first, and
 * entries with the same priority come out in the order they went in.
 * @template {{ priority: number, order: number }} T
 */
class _Heap {
  /** @type {T[]} */
  #items = [];

  /**
   * @param {T} a
   * @param {T} b
   */
  #before(a, b) {
    return a.priority > b.priority || (a.priority === b.priority && a.order < b.order);
  }

  /** @param {T} item */
  push(item) {
    const items = this.#items;
    let i = items.length;
    items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.#before(item, items[parent])) break;
      items[i] = items[parent];
      i = parent;
    }
    items[i] = item;
  }

  /** @returns {T | undefined} */
  pop() {
    const items = this.#items;
    const top = items[0];
    const last = items.pop();
    if (items.length && last !== undefined) {
      let i = 0;
      const half = items.length >> 1;
      while (i < half) {
        let child = i * 2 + 1;
        if (child + 1 < items.length && this.#before(items[child + 1], items[child])) child++;
        if (!this.#before(items[child], last)) break;
        items[i] = items[child];
        i = child;
      }
      items[i] = last;
    }
    return top;
  }

  clear() {
    this.#items = [];
  }

  get size() {
    return this.#items.length;
  }
}

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
 * at once. Results stay in order. Items are taken from the source as slots
 * free up, so a stream is never read faster than it's processed.
 *
 * @example
 * const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
 * await async.forEach(readline.createInterface({ input }), importLine, { concurrency: 20 });
 *
 * @template T
 * @template R
 * @param {Iterable<T> | AsyncIterable<T>} items
 * @param {(item: T, index: number) => R | PromiseLike<R>} fn
 * @param {MapOptions} [options]
 * @returns {Promise<Array<Awaited<R>>>}
 * @throws The first error, an `AggregateError` with `stopOnError: false`, or an `AbortError`.
 */
function map(items, fn, options = {}) {
  const concurrency = Math.max(1, options.concurrency ?? Infinity);
  const stopOnError = options.stopOnError ?? true;
  const signal = options.signal;
  /** @type {Array<Awaited<R>>} */
  const results = [];
  /** @type {unknown[]} */
  const errors = [];

  return new Promise((resolve, reject) => {
    const source = /** @type {any} */ (items);
    const isAsync = source !== null && source !== undefined && typeof source[Symbol.asyncIterator] === "function";
    /** @type {Iterator<T> | AsyncIterator<T>} */
    let iterator;
    try {
      iterator = isAsync ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
    } catch (error) {
      return reject(error);
    }
    let started = 0;
    let active = 0;
    let exhausted = false;
    let pulling = false;
    let settled = false;

    /** @param {unknown} [error] */
    const end = (error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      // Stopped early: let the source release what it holds (an open file, a cursor).
      if (!exhausted) void Promise.resolve().then(() => iterator.return?.()).catch(() => {});
      if (error !== undefined) return reject(error);
      results.length = started;
      const failures = errors.filter((e) => e !== undefined);
      if (failures.length) reject(new AggregateError(failures, `${failures.length} of ${started} tasks failed`));
      else resolve(results);
    };
    const onAbort = () => end(new AbortError(undefined, { cause: signal?.reason }));

    /**
     * @param {T} item
     * @param {number} index
     */
    const run = (item, index) => {
      active++;
      /** @type {Promise<any>} */
      let work;
      try {
        work = Promise.resolve(fn(item, index));
      } catch (error) {
        work = Promise.reject(error);
      }
      work.then(
        (value) => {
          results[index] = value;
        },
        (error) => {
          if (stopOnError) end(error ?? new Error("Task failed"));
          else errors[index] = error ?? new Error("Task failed");
        },
      ).then(() => {
        active--;
        pump();
      });
    };

    const pump = () => {
      if (settled || pulling) return;
      while (!exhausted && active < concurrency) {
        /** @type {any} */
        let step;
        try {
          step = iterator.next();
        } catch (error) {
          return end(error ?? new Error("Iterator failed"));
        }
        if (isAsync) {
          pulling = true;
          /** @type {Promise<IteratorResult<T>>} */ (step).then(
            (result) => {
              pulling = false;
              if (settled) return;
              if (result.done) exhausted = true;
              else run(result.value, started++);
              pump();
            },
            (error) => end(error ?? new Error("Iterator failed")),
          );
          return;
        }
        if (step.done) exhausted = true;
        else run(step.value, started++);
        if (settled) return;
      }
      if (exhausted && active === 0) end();
    };

    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    pump();
  });
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
  const keep = await map(items, (item, index) => {
    list[index] = item;
    return predicate(item, index);
  }, options);
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
 * Runs async functions at the same time, or a few at once with
 * `concurrency`, and returns their results in order.
 *
 * @example
 * const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
 * await async.parallel(jobs, { concurrency: 4 });
 *
 * @template T
 * @param {Iterable<() => T | PromiseLike<T>>} tasks
 * @param {MapOptions} [options]
 * @returns {Promise<Array<Awaited<T>>>}
 */
function parallel(tasks, options = {}) {
  return map(tasks, (task) => task(), options);
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
  /** @type {_Fifo<() => void>} */
  const waiting = new _Fifo();
  /** @type {Array<() => void>} */
  let idleWaiters = [];
  const next = () => {
    while (active < max && waiting.size) {
      active++;
      /** @type {() => void} */ (waiting.shift())();
    }
    if (active === 0 && !waiting.size && idleWaiters.length) {
      const resolvers = idleWaiters;
      idleWaiters = [];
      for (const resolve of resolvers) resolve();
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
    pendingCount: { get: () => waiting.size },
    concurrency: {
      get: () => max,
      set: (/** @type {number} */ value) => {
        max = Math.max(1, value);
        next();
      },
    },
    clearQueue: { value: () => waiting.clear() },
    onIdle: { value: () => (active === 0 && !waiting.size ? Promise.resolve() : new Promise((resolve) => idleWaiters.push(() => resolve(undefined)))) },
  });
  return limiter;
}

/**
 * A rate limiter: at most `max` calls start within any `interval`. Made
 * for APIs that allow, say, 10 requests per second.
 *
 * @example
 * const throttled = async.rateLimit(10, "1s");
 * const pages = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
 *
 * @param {number} max How many calls may start per interval.
 * @param {number | string} interval The window, in ms or like `"1s"`.
 * @returns {RateLimiter}
 */
function rateLimit(max, interval) {
  const perWindow = Math.max(1, Math.floor(max));
  const windowMs = toMs(interval, "interval");
  /** @type {number[]} */
  const starts = [];
  /** @type {_Fifo<() => void>} */
  const waiting = new _Fifo();
  /** @type {NodeJS.Timeout | undefined} */
  let timer;

  const pump = () => {
    timer = undefined;
    while (waiting.size) {
      const now = Date.now();
      while (starts.length && now - starts[0] >= windowMs) starts.shift();
      if (starts.length >= perWindow) {
        timer = setTimeout(pump, Math.max(1, starts[0] + windowMs - now));
        return;
      }
      starts.push(now);
      /** @type {() => void} */ (waiting.shift())();
    }
  };
  /** @type {any} */
  const limiter = (/** @type {() => unknown} */ fn) =>
    new Promise((resolve, reject) => {
      waiting.push(() => void Promise.resolve().then(fn).then(resolve, reject));
      if (timer === undefined) pump();
    });
  Object.defineProperty(limiter, "pendingCount", { get: () => waiting.size });
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
  /** @type {_Heap<{ run: () => void, priority: number, order: number }>} */
  const waiting = new _Heap();
  /** @type {Array<() => void>} */
  let idle = [];
  /** @type {Array<() => void>} */
  let empty = [];

  const check = () => {
    if (!waiting.size) {
      for (const resolve of empty) resolve();
      empty = [];
      if (running === 0) {
        for (const resolve of idle) resolve();
        idle = [];
      }
    }
  };
  const pump = () => {
    while (!paused && running < concurrency && waiting.size) {
      const task = /** @type {{ run: () => void }} */ (waiting.pop());
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
        waiting.push(entry);
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
      waiting.clear();
      check();
    },
    onIdle() {
      return !waiting.size && running === 0 ? Promise.resolve() : new Promise((resolve) => idle.push(() => resolve(undefined)));
    },
    onEmpty() {
      return !waiting.size ? Promise.resolve() : new Promise((resolve) => empty.push(() => resolve(undefined)));
    },
    get size() {
      return waiting.size;
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
  return /** @type {any} */ (Object.fromEntries(keys.map((key, i) => [key, values[i]])));
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
  /** @type {unknown} */
  let lastError;
  for (;;) {
    if (options.signal?.aborted) throw new AbortError(undefined, { cause: options.signal.reason });
    try {
      const value = await fn();
      if (value) return /** @type {NonNullable<Awaited<T>>} */ (value);
      lastError = undefined;
    } catch (error) {
      // Not ready yet. Kept, so a timeout can say why.
      lastError = error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new TimeoutError(`poll() timed out after ${limitMs}ms`, { timeout: limitMs, cause: lastError });
    await sleep(Math.min(interval, remaining), { signal: options.signal });
  }
}

/**
 * Makes any promise give up when a signal fires. The work behind it keeps
 * running unless it listens to the signal too.
 *
 * @example
 * const controller = new AbortController();
 * const rows = await async.abortable(slowQuery(), controller.signal);
 *
 * @template T
 * @param {T | PromiseLike<T>} promise
 * @param {AbortSignal} [signal]
 * @returns {Promise<Awaited<T>>}
 * @throws {AbortError} When the signal fires first.
 */
function abortable(promise, signal) {
  if (!signal) return /** @type {Promise<Awaited<T>>} */ (Promise.resolve(promise));
  if (signal.aborted) return Promise.reject(new AbortError(undefined, { cause: signal.reason }));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new AbortError(undefined, { cause: signal.reason }));
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise)
      .then(/** @type {any} */ (resolve), reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

module.exports = {
  sleep,
  map,
  forEach,
  filter,
  series,
  parallel,
  limit,
  rateLimit,
  queue,
  mutex,
  deferred,
  settle,
  props,
  poll,
  abortable,
  retry,
  timeout,
};
