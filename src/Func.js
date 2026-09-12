"use strict";

/**
 * Function helpers: debounce, throttle, memoize, retry with backoff,
 * timeouts, error handling without try/catch, and typed composition.
 *
 * @example
 * const save = func.debounce(persist, 300);
 * const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
 * const [error, user] = await func.to(getUser(id));
 */

const { TimeoutError, AbortError } = require("./errors.js");

/**
 * Options for `debounce()`.
 * @typedef {object} DebounceOptions
 * @property {boolean} [leading] Call right away at the start of a burst.
 * @property {boolean} [trailing] Call once the burst is over. Defaults to `true`.
 * @property {number} [maxWait] Never postpone a call longer than this, in ms, even if calls keep coming.
 */

/**
 * A debounced function. `flush()` runs the pending call now, `cancel()`
 * drops it, `pending()` tells you if there's one.
 * @template {(...args: any[]) => any} F
 * @typedef {((...args: Parameters<F>) => void) & { cancel(): void, flush(): void, pending(): boolean }} DebouncedFunction
 */

/**
 * Options for `throttle()`.
 * @typedef {object} ThrottleOptions
 * @property {boolean} [leading] Call right away on the first call. Defaults to `true`.
 * @property {boolean} [trailing] Make a last call with the latest arguments at the end of the interval. Defaults to `true`.
 */

/**
 * A throttled function, with `cancel()`.
 * @template {(...args: any[]) => any} F
 * @typedef {((...args: Parameters<F>) => void) & { cancel(): void }} ThrottledFunction
 */

/**
 * Options for `memoize()`.
 * @typedef {object} MemoizeOptions
 * @property {(...args: any[]) => unknown} [resolver] Builds the cache key from the arguments. Defaults to the arguments as JSON.
 * @property {number} [ttl] How long a result stays cached, in ms.
 * @property {number} [max] Maximum number of results; the least recently used goes first.
 * @property {boolean} [cacheRejections] Keep rejected promises. By default they're dropped so the next call tries again.
 */

/**
 * A memoized function, with its `cache`, `clear()` and `delete(...args)`.
 * @template {(...args: any[]) => any} F
 * @typedef {F & { cache: Map<unknown, { value: ReturnType<F>, expires: number }>, clear(): void, delete(...args: Parameters<F>): boolean }} MemoizedFunction
 */

/**
 * Options for `retry()`.
 * @typedef {object} RetryOptions
 * @property {number} [attempts] Total attempts, the first one included. Defaults to `3`.
 * @property {number | ((attempt: number, error: unknown) => number)} [delay] Wait before the next attempt, in ms, or a function that computes it.
 * @property {number} [backoff] Multiplies the delay after each failure: `2` gives 200, 400, 800... Defaults to `1`.
 * @property {number} [maxDelay] Cap for the computed delay, in ms.
 * @property {number} [jitter] Randomizes the delay, from `0` (none) to `1` (anywhere between 0 and 2x). Stops many clients from retrying in sync.
 * @property {(error: unknown, attempt: number) => boolean | Promise<boolean>} [shouldRetry] Return `false` to give up early, for example on a 4xx error.
 * @property {(error: unknown, attempt: number, delay: number) => void} [onRetry] Called before each wait, for logs or metrics.
 * @property {AbortSignal} [signal] Stops retrying. The attempt in progress isn't interrupted.
 */

/**
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
const _sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError(undefined, { cause: signal.reason }));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortError(undefined, { cause: signal?.reason }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Waits for a pause of `wait` ms between calls, then runs once with the
 * latest arguments. For search boxes, resizing, auto-saving...
 *
 * @example
 * const search = func.debounce((query) => api.search(query), 300);
 * input.on("input", (e) => search(e.target.value));
 *
 * const save = func.debounce(persist, 1000, { maxWait: 5000 }); // saves at least every 5s
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} wait Pause needed, in ms.
 * @param {DebounceOptions} [options]
 * @returns {DebouncedFunction<F>}
 */
function debounce(fn, wait, options = {}) {
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;
  const maxWait = options.maxWait;
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  /** @type {NodeJS.Timeout | undefined} */
  let maxTimer;
  /** @type {any[] | undefined} */
  let lastArgs;
  /** @type {unknown} */
  let lastThis;

  const invoke = () => {
    const args = lastArgs;
    const self = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    if (args) fn.apply(self, args);
  };
  const clearTimers = () => {
    clearTimeout(timer);
    clearTimeout(maxTimer);
    timer = undefined;
    maxTimer = undefined;
  };

  /** @type {any} */
  const debounced = /** @this {any} */ function(/** @type {any[]} */ ...args) {
    const isFirst = timer === undefined;
    lastArgs = args;
    lastThis = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      clearTimers();
      if (trailing) invoke();
      else lastArgs = undefined;
    }, wait);
    if (maxWait !== undefined && maxTimer === undefined) {
      maxTimer = setTimeout(() => {
        clearTimers();
        invoke();
      }, maxWait);
    }
    if (leading && isFirst) {
      invoke();
    }
  };
  debounced.cancel = () => {
    clearTimers();
    lastArgs = undefined;
  };
  debounced.flush = () => {
    clearTimers();
    invoke();
  };
  debounced.pending = () => timer !== undefined && lastArgs !== undefined;
  return debounced;
}

/**
 * Runs at most once every `wait` ms, however often it's called. For scroll
 * handlers, progress reports, rate-limited APIs...
 *
 * @example
 * const report = func.throttle((pct) => console.log(`${pct}%`), 1000);
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} wait Minimum gap between calls, in ms.
 * @param {ThrottleOptions} [options]
 * @returns {ThrottledFunction<F>}
 */
function throttle(fn, wait, options = {}) {
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;
  let last = 0;
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  /** @type {any[] | undefined} */
  let lastArgs;
  /** @type {unknown} */
  let lastThis;

  /** @type {any} */
  const throttled = /** @this {any} */ function(/** @type {any[]} */ ...args) {
    const now = Date.now();
    if (!last && !leading) last = now;
    const remaining = wait - (now - last);
    lastArgs = args;
    lastThis = this;
    if (remaining <= 0 || remaining > wait) {
      clearTimeout(timer);
      timer = undefined;
      last = now;
      fn.apply(lastThis, lastArgs);
      lastArgs = undefined;
    } else if (trailing && timer === undefined) {
      timer = setTimeout(() => {
        last = leading ? Date.now() : 0;
        timer = undefined;
        if (lastArgs) fn.apply(lastThis, lastArgs);
        lastArgs = undefined;
      }, remaining);
    }
  };
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    last = 0;
    lastArgs = undefined;
  };
  return throttled;
}

/**
 * Runs `fn` the first time only; later calls return the same result.
 *
 * @example
 * const connect = func.once(() => createPool(config));
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {F}
 */
function once(fn) {
  let called = false;
  /** @type {ReturnType<F>} */
  let result;
  return /** @type {F} */ (
    /** @this {any} */ function(/** @type {any[]} */ ...args) {
      if (!called) {
        called = true;
        result = fn.apply(this, args);
      }
      return result;
    }
  );
}

/**
 * Caches results by arguments. Supports expiry (`ttl`), a size limit
 * (`max`) and async functions: a failed promise isn't cached, so the next
 * call tries again.
 *
 * @example
 * const getUser = func.memoize((id) => db.users.find(id), { ttl: 60_000, max: 1000 });
 * getUser.delete(42); // forget one entry
 * getUser.clear();    // forget everything
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {MemoizeOptions | ((...args: Parameters<F>) => unknown)} [options] Options, or a function that builds the cache key.
 * @returns {MemoizedFunction<F>}
 */
function memoize(fn, options = {}) {
  const opts = typeof options === "function" ? { resolver: options } : options;
  /** @type {Map<unknown, { value: any, expires: number }>} */
  const cache = new Map();
  /** @type {(args: any[]) => unknown} */
  const keyOf = (args) => {
    if (opts.resolver) return opts.resolver(...args);
    if (args.length === 1 && (args[0] === null || typeof args[0] !== "object")) return args[0];
    return JSON.stringify(args);
  };

  /** @type {any} */
  const memoized = /** @this {any} */ function(/** @type {any[]} */ ...args) {
    const key = keyOf(args);
    const hit = cache.get(key);
    if (hit && (hit.expires === 0 || hit.expires > Date.now())) {
      cache.delete(key);
      cache.set(key, hit);
      return hit.value;
    }
    const value = fn.apply(this, args);
    cache.set(key, { value, expires: opts.ttl ? Date.now() + opts.ttl : 0 });
    if (opts.max !== undefined && cache.size > opts.max) cache.delete(cache.keys().next().value);
    if (!opts.cacheRejections && value && typeof value.then === "function") {
      value.then(undefined, () => {
        if (cache.get(key)?.value === value) cache.delete(key);
      });
    }
    return value;
  };
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.delete = (/** @type {any[]} */ ...args) => cache.delete(keyOf(args));
  return memoized;
}

/**
 * Calls `fn` until it succeeds, waiting between attempts. If every attempt
 * fails, the last error is thrown.
 *
 * @example
 * const data = await func.retry(() => fetchJSON(url), {
 *   attempts: 5,
 *   delay: 200,
 *   backoff: 2, // 200, 400, 800, 1600 ms
 *   shouldRetry: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
 * });
 *
 * @template T
 * @param {(attempt: number) => T | PromiseLike<T>} fn Receives the attempt number, starting at 1.
 * @param {RetryOptions} [options]
 * @returns {Promise<Awaited<T>>}
 * @throws The last error, or an `AbortError` if the signal fires.
 */
async function retry(fn, options = {}) {
  const attempts = Math.max(1, options.attempts ?? 3);
  const backoff = options.backoff ?? 1;
  const maxDelay = options.maxDelay ?? Infinity;
  const jitter = Math.min(1, Math.max(0, options.jitter ?? 0));
  /** @type {unknown} */
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (options.signal?.aborted) throw new AbortError(undefined, { cause: options.signal.reason });
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      if (options.shouldRetry && !(await options.shouldRetry(error, attempt))) break;
      const base = typeof options.delay === "function" ? options.delay(attempt, error) : (options.delay ?? 0) * backoff ** (attempt - 1);
      const wait = Math.max(0, Math.round(Math.min(base, maxDelay) * (1 + jitter * (Math.random() * 2 - 1))));
      options.onRetry?.(error, attempt, wait);
      if (wait > 0) await _sleep(wait, options.signal);
    }
  }
  throw lastError;
}

/**
 * Rejects with a `TimeoutError` if the promise takes longer than `ms`.
 *
 * @example
 * const res = await func.timeout(fetch(url), 5000);
 * const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
 *
 * @template T
 * @param {PromiseLike<T> | (() => PromiseLike<T> | T)} promise A promise, or a function that returns one.
 * @param {number} ms
 * @param {string} [message]
 * @returns {Promise<Awaited<T>>}
 * @throws {TimeoutError}
 */
function timeout(promise, ms, message) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message ?? `Operation timed out after ${ms}ms`, { timeout: ms })), ms);
  });
  const target = Promise.resolve().then(() => (typeof promise === "function" ? promise() : promise));
  return /** @type {Promise<Awaited<T>>} */ (Promise.race([target, expired]).finally(() => clearTimeout(timer)));
}

/**
 * Waits `ms`, then calls `fn` with the arguments and resolves with its result.
 *
 * @example
 * await func.delay(() => console.log("1s later"), 1000);
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} ms
 * @param {Parameters<F>} args
 * @returns {Promise<Awaited<ReturnType<F>>>}
 */
async function delay(fn, ms, ...args) {
  await _sleep(ms);
  return fn(...args);
}

/**
 * Awaits a promise and gives you `[error, value]` instead of throwing, so
 * you don't need a try/catch.
 *
 * @example
 * const [error, user] = await func.to(db.users.find(id));
 * if (error) return res.status(500).send(error.message);
 *
 * @template T
 * @template [E=Error]
 * @param {PromiseLike<T> | (() => PromiseLike<T> | T)} promise A promise, or a function (sync errors are caught too).
 * @returns {Promise<[E, undefined] | [null, Awaited<T>]>}
 */
async function to(promise) {
  try {
    const value = await (typeof promise === "function" ? promise() : promise);
    return [null, /** @type {Awaited<T>} */ (value)];
  } catch (error) {
    return [/** @type {E} */ (error), undefined];
  }
}

/**
 * Wraps a function so it resolves to `[error, value]` instead of throwing.
 *
 * @example
 * const safeParse = func.attempt(JSON.parse);
 * const [error, data] = await safeParse(input);
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {(...args: Parameters<F>) => Promise<[unknown, undefined] | [null, Awaited<ReturnType<F>>]>}
 */
function attempt(fn) {
  return /** @this {any} */ function(...args) {
    return to(() => fn.apply(this, args));
  };
}

/**
 * Turns a callback-style function into one that returns a promise.
 *
 * @example
 * const lookup = func.promisify(dns.lookup);
 * const address = await lookup("nodejs.org");
 *
 * @param {(...args: any[]) => void} fn
 * @returns {(...args: any[]) => Promise<any>}
 */
function promisify(fn) {
  return /** @this {any} */ function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (/** @type {unknown} */ error, /** @type {unknown} */ result) => (error ? reject(error) : resolve(result)));
    });
  };
}

/**
 * Chains functions from left to right: `pipe(f, g)(x)` is `g(f(x))`.
 * Types flow through up to 6 functions.
 *
 * @example
 * const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
 * toSlug("Crème Brûlée"); // "creme-brulee"
 *
 * @template {any[]} A
 * @template B
 * @overload
 * @param {(...args: A) => B} f1
 * @returns {(...args: A) => B}
 */
/**
 * Chains functions from left to right.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: B) => C} f2
 * @returns {(...args: A) => C}
 */
/**
 * Chains functions from left to right.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: B) => C} f2
 * @param {(c: C) => D} f3
 * @returns {(...args: A) => D}
 */
/**
 * Chains functions from left to right.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @template E
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: B) => C} f2
 * @param {(c: C) => D} f3
 * @param {(d: D) => E} f4
 * @returns {(...args: A) => E}
 */
/**
 * Chains functions from left to right.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @template E
 * @template F
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: B) => C} f2
 * @param {(c: C) => D} f3
 * @param {(d: D) => E} f4
 * @param {(e: E) => F} f5
 * @returns {(...args: A) => F}
 */
/**
 * Chains functions from left to right.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @template E
 * @template F
 * @template G
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: B) => C} f2
 * @param {(c: C) => D} f3
 * @param {(d: D) => E} f4
 * @param {(e: E) => F} f5
 * @param {(f: F) => G} f6
 * @returns {(...args: A) => G}
 */
/**
 * Chains any number of functions from left to right.
 *
 * @overload
 * @param {...((arg: any) => any)} fns
 * @returns {(...args: any[]) => any}
 */
/**
 * @param {...((...args: any[]) => any)} fns
 * @returns {(...args: any[]) => any}
 */
function pipe(...fns) {
  return (...args) => {
    if (!fns.length) return args[0];
    let result = fns[0](...args);
    for (let i = 1; i < fns.length; i++) result = fns[i](result);
    return result;
  };
}

/**
 * Chains functions from right to left: `compose(f, g)(x)` is `f(g(x))`.
 * `pipe()` reads in execution order and is better typed.
 *
 * @example
 * const shout = func.compose((s) => s + "!", (s) => s.toUpperCase());
 * shout("hi"); // "HI!"
 *
 * @param {...((...args: any[]) => any)} fns
 * @returns {(...args: any[]) => any}
 */
function compose(...fns) {
  return /** @type {(...f: Array<(...args: any[]) => any>) => (...args: any[]) => any} */ (pipe)(...[...fns].reverse());
}

/**
 * Lets you pass a function's arguments a few at a time.
 *
 * @example
 * const add = func.curry((a, b, c) => a + b + c);
 * add(1)(2)(3); // 6
 * add(1, 2)(3); // 6
 *
 * @param {(...args: any[]) => any} fn
 * @param {number} [arity=fn.length] How many arguments to collect before calling.
 * @returns {(...args: any[]) => any}
 */
function curry(fn, arity = fn.length) {
  /** @type {(...args: any[]) => any} */
  const curried = (...args) => (args.length >= arity ? fn(...args) : (/** @type {any[]} */ ...next) => curried(...args, ...next));
  return curried;
}

/**
 * Fixes the first arguments of a function.
 *
 * @example
 * const hello = func.partial((greeting, name) => `${greeting}, ${name}!`, "Hello");
 * hello("Ada"); // "Hello, Ada!"
 *
 * @template {any[]} P
 * @template {any[]} R
 * @template T
 * @param {(...args: [...P, ...R]) => T} fn
 * @param {P} preset
 * @returns {(...args: R) => T}
 */
function partial(fn, ...preset) {
  return (...args) => fn(.../** @type {[...P, ...R]} */ ([...preset, ...args]));
}

/**
 * The opposite of a predicate.
 *
 * @example
 * files.filter(func.negate((name) => name.startsWith(".")));
 *
 * @template {any[]} A
 * @param {(...args: A) => unknown} predicate
 * @returns {(...args: A) => boolean}
 */
function negate(predicate) {
  return (...args) => !predicate(...args);
}

/**
 * Does nothing for the first `n - 1` calls, then calls `fn` every time.
 *
 * @example
 * const done = func.after(3, () => console.log("All 3 uploads finished"));
 * uploads.forEach((upload) => upload.on("end", done));
 *
 * @template {(...args: any[]) => any} F
 * @param {number} n
 * @param {F} fn
 * @returns {(...args: Parameters<F>) => ReturnType<F> | undefined}
 */
function after(n, fn) {
  let count = 0;
  return (...args) => (++count >= n ? fn(...args) : undefined);
}

/**
 * Calls `fn` for the first `n - 1` calls, then keeps returning the last
 * result.
 *
 * @example
 * const tryLogin = func.before(4, login); // 3 real attempts at most
 *
 * @template {(...args: any[]) => any} F
 * @param {number} n
 * @param {F} fn
 * @returns {(...args: Parameters<F>) => ReturnType<F> | undefined}
 */
function before(n, fn) {
  let count = 0;
  /** @type {ReturnType<F> | undefined} */
  let last;
  return (...args) => {
    if (++count < n) last = fn(...args);
    return last;
  };
}

/**
 * Does nothing. Useful as a default callback.
 *
 * @param {...unknown} _args
 * @returns {void}
 */
function noop(..._args) {}

/**
 * Returns its argument.
 *
 * @example
 * [0, 1, 2].filter(func.identity); // [1, 2]
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
function identity(value) {
  return value;
}

module.exports = {
  debounce,
  throttle,
  once,
  memoize,
  retry,
  timeout,
  delay,
  to,
  attempt,
  promisify,
  pipe,
  compose,
  curry,
  partial,
  negate,
  after,
  before,
  noop,
  identity,
};
