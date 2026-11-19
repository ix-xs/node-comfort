"use strict";

/**
 * Function helpers: debounce, throttle, memoize, batching, error handling
 * without try/catch, and typed composition. Retries and timeouts are in
 * `nc.async`.
 *
 * @example
 * const save = func.debounce(persist, 300);
 * const getUser = func.memoize((id) => db.get("users", { id }), { ttl: "1m" });
 * const safeParse = func.attempt(JSON.parse);
 */

const { types } = require("node:util");
const { toMs, sleep: _sleep, argsKey } = require("./internal/shared.js");
const { deprecate } = require("./internal/deprecate.js");

/**
 * Options for `debounce()`.
 * @typedef {object} DebounceOptions
 * @property {boolean} [leading] Call right away at the start of a burst.
 * @property {boolean} [trailing] Call once the burst is over. Defaults to `true`.
 * @property {number | string} [maxWait] Never postpone a call longer than this, even if calls keep coming. In ms, or like `"2s"`.
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
 * @property {(...args: any[]) => unknown} [resolver] Builds the cache key from the arguments. By default, primitives are compared by value, plain objects and arrays by content, anything else by identity.
 * @property {number | string} [ttl] How long a result stays cached, in ms or like `"5m"`.
 * @property {number} [max] Maximum number of results; the least recently used goes first.
 * @property {boolean} [cacheRejections] Keep rejected promises. By default they're dropped so the next call tries again.
 */

/**
 * A memoized function, with its `cache`, `clear()` and `delete(...args)`.
 * @template {(...args: any[]) => any} F
 * @typedef {F & { cache: Map<unknown, { value: ReturnType<F>, expires: number }>, clear(): void, delete(...args: Parameters<F>): boolean }} MemoizedFunction
 */

/**
 * Options for `batch()`.
 * @typedef {object} BatchOptions
 * @property {number | string} [wait] How long to collect calls before running. By default, calls made in the same tick go together.
 * @property {number} [max] Run as soon as this many calls are waiting.
 */

/**
 * A batched function. `flush()` runs the waiting calls now.
 * @template I
 * @template R
 * @typedef {((item: I) => Promise<R>) & { flush(): void }} BatchedFunction
 */

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
 * @param {number | string} wait Pause needed, in ms or like `"300ms"`.
 * @param {DebounceOptions} [options]
 * @returns {DebouncedFunction<F>}
 */
function debounce(fn, wait, options = {}) {
  const delay = toMs(wait, "wait");
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;
  const maxWait = options.maxWait === undefined ? undefined : toMs(options.maxWait, "maxWait");
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  let active = false;
  let lastCall = 0;
  let burstStart = 0;
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
  // One timer per burst: it checks how long ago the last call was instead of
  // being reset on every call, which keeps busy call sites cheap.
  const check = () => {
    const now = Date.now();
    const quiet = now - lastCall;
    const overdue = maxWait !== undefined && now - burstStart >= maxWait;
    if (quiet >= delay || quiet < 0 || overdue) {
      timer = undefined;
      active = false;
      if (trailing || overdue) invoke();
      else lastArgs = lastThis = undefined;
      return;
    }
    const untilMax = maxWait === undefined ? Infinity : maxWait - (now - burstStart);
    timer = setTimeout(check, Math.min(delay - quiet, untilMax));
  };

  /** @type {any} */
  const debounced = /** @this {any} */ function(/** @type {any[]} */ ...args) {
    lastArgs = args;
    lastThis = this;
    lastCall = Date.now();
    if (active) return;
    active = true;
    burstStart = lastCall;
    timer = setTimeout(check, maxWait === undefined ? delay : Math.min(delay, maxWait));
    if (leading) invoke();
  };
  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
    active = false;
  };
  debounced.cancel = () => {
    stop();
    lastArgs = lastThis = undefined;
  };
  debounced.flush = () => {
    stop();
    invoke();
  };
  debounced.pending = () => active && lastArgs !== undefined;
  return debounced;
}

/**
 * Runs at most once every `interval` ms, however often it's called. For scroll
 * handlers, progress reports, rate-limited APIs...
 *
 * @example
 * const report = func.throttle((pct) => console.log(`${pct}%`), 1000);
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number | string} interval Minimum gap between calls, in ms or like `"1s"`.
 * @param {ThrottleOptions} [options]
 * @returns {ThrottledFunction<F>}
 */
function throttle(fn, interval, options = {}) {
  const wait = toMs(interval, "wait");
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
  const ttl = opts.ttl === undefined ? 0 : toMs(opts.ttl, "ttl");
  const max = opts.max;
  const resolver = opts.resolver;
  /** @type {Map<unknown, { value: any, expires: number }>} */
  const cache = new Map();
  let sweepAt = 256;

  /** @type {any} */
  const memoized = /** @this {any} */ function(/** @type {any[]} */ ...args) {
    const key = resolver ? resolver(...args) : argsKey(args);
    const hit = cache.get(key);
    if (hit !== undefined) {
      if (hit.expires === 0 || hit.expires > Date.now()) {
        if (max !== undefined) {
          cache.delete(key);
          cache.set(key, hit);
        }
        return hit.value;
      }
      cache.delete(key);
    }
    const value = fn.apply(this, args);
    cache.set(key, { value, expires: ttl ? Date.now() + ttl : 0 });
    if (max !== undefined) {
      if (cache.size > max) cache.delete(cache.keys().next().value);
    } else if (ttl && cache.size >= sweepAt) {
      // Without a size limit, expired results would pile up: drop them now and then.
      const now = Date.now();
      for (const [k, entry] of cache) if (entry.expires <= now) cache.delete(k);
      sweepAt = Math.max(256, cache.size * 2);
    }
    if (!opts.cacheRejections && value && typeof value.then === "function") {
      value.then(undefined, () => {
        if (cache.get(key)?.value === value) cache.delete(key);
      });
    }
    return value;
  };
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.delete = (/** @type {any[]} */ ...args) => cache.delete(resolver ? resolver(...args) : argsKey(args));
  return memoized;
}

/**
 * Waits `ms`, then calls `fn` with the arguments and resolves with its result.
 *
 * @example
 * await func.delay(() => console.log("1s later"), 1000);
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number | string} ms In ms, or like `"2s"`.
 * @param {Parameters<F>} args
 * @returns {Promise<Awaited<ReturnType<F>>>}
 */
async function delay(fn, ms, ...args) {
  await _sleep(toMs(ms, "delay"));
  return fn(...args);
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
 * const readFile = func.promisify(fs.readFile);
 * const text = await readFile("notes.txt", "utf8");
 *
 * @template {any[]} A
 * @template [R=any]
 * @param {(...args: [...A, (error: any, result: R) => void]) => void} fn Its last parameter is the callback `(error, result)`.
 * @returns {(...args: A) => Promise<R>}
 */
function promisify(fn) {
  return /** @this {any} */ function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (/** @type {unknown} */ error, /** @type {R} */ result) => (error ? reject(error) : resolve(result)));
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
 * @template {any[]} A
 * @template B
 * @template C
 * @overload
 * @param {(b: B) => C} f2
 * @param {(...args: A) => B} f1
 * @returns {(...args: A) => C}
 */
/**
 * Chains functions from right to left.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @overload
 * @param {(c: C) => D} f3
 * @param {(b: B) => C} f2
 * @param {(...args: A) => B} f1
 * @returns {(...args: A) => D}
 */
/**
 * Chains any number of functions from right to left.
 *
 * @overload
 * @param {...((...args: any[]) => any)} fns
 * @returns {(...args: any[]) => any}
 */
/**
 * @param {...((...args: any[]) => any)} fns
 * @returns {(...args: any[]) => any}
 */
function compose(...fns) {
  return /** @type {(...f: Array<(...args: any[]) => any>) => (...args: any[]) => any} */ (pipe)(...[...fns].reverse());
}

/**
 * Like `pipe()`, for functions that may be async: each one is awaited
 * before the next runs.
 *
 * @example
 * const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN);
 * const url = await publish(postId);
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: Awaited<B>) => C} f2
 * @returns {(...args: A) => Promise<Awaited<C>>}
 */
/**
 * Like `pipe()`, for functions that may be async.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: Awaited<B>) => C} f2
 * @param {(c: Awaited<C>) => D} f3
 * @returns {(...args: A) => Promise<Awaited<D>>}
 */
/**
 * Like `pipe()`, for functions that may be async.
 *
 * @template {any[]} A
 * @template B
 * @template C
 * @template D
 * @template E
 * @overload
 * @param {(...args: A) => B} f1
 * @param {(b: Awaited<B>) => C} f2
 * @param {(c: Awaited<C>) => D} f3
 * @param {(d: Awaited<D>) => E} f4
 * @returns {(...args: A) => Promise<Awaited<E>>}
 */
/**
 * Chains any number of functions, sync or async, from left to right.
 *
 * @overload
 * @param {...((arg: any) => any)} fns
 * @returns {(...args: any[]) => Promise<any>}
 */
/**
 * @param {...((...args: any[]) => any)} fns
 * @returns {(...args: any[]) => Promise<any>}
 */
function pipeAsync(...fns) {
  return async (...args) => {
    if (!fns.length) return args[0];
    let result = await fns[0](...args);
    for (let i = 1; i < fns.length; i++) result = await fns[i](result);
    return result;
  };
}

/**
 * Turns many single calls into few grouped ones. Calls made close together
 * are collected, `fn` runs once with all their items, and each caller gets
 * its own result. The classic cure for "N+1 queries".
 *
 * @example
 * const loadUser = func.batch(async (ids) => {
 *   const users = await db.getAll("users", { id: ids });
 *   return ids.map((id) => users.find((user) => user.id === id));
 * });
 * // One query, however many places ask at once:
 * const [ada, bob] = await Promise.all([loadUser(1), loadUser(2)]);
 *
 * @template I
 * @template R
 * @param {(items: I[]) => ReadonlyArray<R | Error> | Map<I, R | Error> | PromiseLike<ReadonlyArray<R | Error> | Map<I, R | Error>>} fn Gets every waiting item and returns one result per item, in the same order, or a `Map` keyed by item. An `Error` as a result rejects that call only.
 * @param {BatchOptions} [options]
 * @returns {BatchedFunction<I, R>}
 */
function batch(fn, options = {}) {
  const wait = options.wait === undefined ? 0 : toMs(options.wait, "wait");
  const max = Math.max(1, options.max ?? Infinity);
  /** @type {Array<{ item: I, resolve: (value: R) => void, reject: (reason: unknown) => void }>} */
  let waiting = [];
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    clearTimeout(timer);
    const current = waiting;
    waiting = [];
    if (!current.length) return;
    Promise.resolve()
      .then(() => fn(current.map((entry) => entry.item)))
      .then((results) => {
        const byItem = types.isMap(results);
        if (!byItem && (!Array.isArray(results) || results.length !== current.length)) {
          throw new TypeError(`batch(): expected ${current.length} results, one per item, got ${Array.isArray(results) ? results.length : typeof results}`);
        }
        current.forEach((entry, i) => {
          const result = byItem ? /** @type {Map<I, R | Error>} */ (results).get(entry.item) : /** @type {ReadonlyArray<R | Error>} */ (results)[i];
          if (types.isNativeError(result)) entry.reject(result);
          else entry.resolve(/** @type {R} */ (result));
        });
      })
      .catch((error) => {
        for (const entry of current) entry.reject(error);
      });
  };

  /** @type {any} */
  const batched = (/** @type {I} */ item) =>
    new Promise((resolve, reject) => {
      waiting.push({ item, resolve, reject });
      if (waiting.length >= max) return flush();
      if (scheduled) return;
      scheduled = true;
      if (wait > 0) timer = setTimeout(flush, wait);
      // After the promise jobs of this tick, so calls made from resolved promises join the batch too.
      else void Promise.resolve().then(() => process.nextTick(flush));
    });
  batched.flush = flush;
  return batched;
}

/**
 * Makes concurrent calls with the same arguments share one run. Once it
 * settles, the next call starts a new one: nothing is cached.
 *
 * @example
 * const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);
 * // Ten requests hit a 401 at once: one refresh, ten answers.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {(...args: Parameters<F>) => unknown} [keyOf] Builds the key that identifies a call. Defaults to its arguments.
 * @returns {(...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>}
 */
function dedupe(fn, keyOf) {
  /** @type {Map<unknown, Promise<any>>} */
  const running = new Map();
  return /** @this {any} */ function(...args) {
    const key = keyOf ? keyOf(...args) : argsKey(args);
    const current = running.get(key);
    if (current) return current;
    /** @type {Promise<any>} */
    let started;
    try {
      started = Promise.resolve(fn.apply(this, args));
    } catch (error) {
      started = Promise.reject(error);
    }
    const promise = started.finally(() => running.delete(key));
    running.set(key, promise);
    return promise;
  };
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

/**
 * @deprecated Use `nc.async.retry()`. It will be removed in 4.0.
 * @type {typeof import("./Async").retry}
 */
const retry = require("./Async.js").retry;

/**
 * @deprecated Use `nc.async.timeout()`. It will be removed in 4.0.
 * @type {typeof import("./Async").timeout}
 */
const timeout = require("./Async.js").timeout;

/**
 * @deprecated Use `nc.async.to()`. It will be removed in 4.0.
 * @type {typeof import("./Async").to}
 */
const to = require("./Async.js").to;

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
  batch,
  dedupe,
  pipe,
  pipeAsync,
  compose,
  curry,
  partial,
  negate,
  after,
  before,
  noop,
  identity,
};

deprecate(module.exports, "nc.func", {
  retry: { use: "nc.async.retry()" },
  timeout: { use: "nc.async.timeout()" },
  to: { use: "nc.async.to()" },
});
