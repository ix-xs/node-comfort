/**
 * Function & control-flow utilities.
 *
 * The higher-order helpers you reach for constantly: debounce, throttle,
 * memoize, once, retry with backoff, timeout, and functional composition.
 * All zero-dependency and Promise-friendly.
 */

/**
 * Sleeps for a number of milliseconds.
 * @private
 * @param {number} ms
 * @returns {Promise<void>}
 */
const _wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  /**
   * Creates a debounced version of a function that delays invocation until
   * `wait` ms have elapsed since the last call.
   *
   * The returned function exposes `.cancel()` and `.flush()`.
   *
   * @example
   * const onResize = nodeComfort.func.debounce(() => render(), 200);
   * window.on("resize", onResize);
   * onResize.cancel(); // drop any pending call
   *
   * @template {(...args: any[]) => any} F
   * @param {F} fn - Function to debounce.
   * @param {number} wait - Delay in milliseconds.
   * @param {{ leading?: boolean }} [options] - Set `leading` to fire on the first call.
   * @returns {F & { cancel: () => void, flush: () => void }} The debounced function.
   */
  debounce(fn, wait, options = {}) {
    let timer = null;
    let lastArgs = null;
    let lastThis = null;
    const leading = options.leading ?? false;

    const debounced = function(...args) {
      lastArgs = args;
      lastThis = this;
      const callNow = leading && !timer;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!leading) fn.apply(lastThis, lastArgs);
      }, wait);

      if (callNow) fn.apply(lastThis, lastArgs);
    };

    debounced.cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      lastArgs = lastThis = null;
    };
    debounced.flush = () => {
      if (timer && lastArgs) {
        clearTimeout(timer);
        timer = null;
        fn.apply(lastThis, lastArgs);
      }
    };

    return /** @type {any} */ (debounced);
  },

  /**
   * Creates a throttled version of a function that runs at most once per
   * `wait` ms.
   *
   * @example
   * const onScroll = nodeComfort.func.throttle(() => update(), 100);
   *
   * @template {(...args: any[]) => any} F
   * @param {F} fn - Function to throttle.
   * @param {number} wait - Minimum interval in milliseconds.
   * @param {{ trailing?: boolean }} [options] - Set `trailing` (default true) to run a final call.
   * @returns {F & { cancel: () => void }} The throttled function.
   */
  throttle(fn, wait, options = {}) {
    let last = 0;
    let timer = null;
    let lastArgs = null;
    let lastThis = null;
    const trailing = options.trailing ?? true;

    const throttled = function(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      lastArgs = args;
      lastThis = this;

      if (remaining <= 0) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        last = now;
        fn.apply(lastThis, lastArgs);
      } else if (trailing && !timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(lastThis, lastArgs);
        }, remaining);
      }
    };

    throttled.cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      last = 0;
    };

    return /** @type {any} */ (throttled);
  },

  /**
   * Wraps a function so it can only ever run once; subsequent calls return
   * the first result.
   *
   * @example
   * const init = nodeComfort.func.once(() => expensiveSetup());
   *
   * @template {(...args: any[]) => any} F
   * @param {F} fn - Function to wrap.
   * @returns {F} The single-call function.
   */
  once(fn) {
    let called = false;
    let result;
    return /** @type {any} */ (function(...args) {
      if (!called) {
        called = true;
        result = fn.apply(this, args);
      }
      return result;
    });
  },

  /**
   * Memoizes a function, caching results by argument key.
   *
   * By default the cache key is a JSON serialization of the arguments; pass a
   * `resolver` for custom keys.
   *
   * @example
   * const fib = nodeComfort.func.memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
   *
   * @template {(...args: any[]) => any} F
   * @param {F} fn - Function to memoize.
   * @param {(...args: any[]) => any} [resolver] - Cache-key resolver.
   * @returns {F & { cache: Map<any, any> }} The memoized function.
   */
  memoize(fn, resolver) {
    const cache = new Map();
    const memoized = function(...args) {
      const key = resolver ? resolver.apply(this, args) : JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
    memoized.cache = cache;
    return /** @type {any} */ (memoized);
  },

  /**
   * Retries an async function until it succeeds or the attempt budget runs out.
   *
   * Supports fixed or exponential backoff and a `shouldRetry` guard.
   *
   * @example
   * const data = await nodeComfort.func.retry(() => fetch(url), {
   *   attempts: 5,
   *   delay: 200,
   *   backoff: 2, // 200, 400, 800, ...
   * });
   *
   * @template T
   * @param {() => T|Promise<T>} fn - Function to run.
   * @param {{
   *   attempts?: number,
   *   delay?: number,
   *   backoff?: number,
   *   maxDelay?: number,
   *   shouldRetry?: (error: unknown, attempt: number) => boolean,
   *   onRetry?: (error: unknown, attempt: number) => void
   * }} [options] - Retry options.
   * @returns {Promise<T>} The resolved value.
   * @throws Re-throws the last error if all attempts fail.
   */
  async retry(fn, options = {}) {
    const attempts = options.attempts ?? 3;
    const delay = options.delay ?? 0;
    const backoff = options.backoff ?? 1;
    const maxDelay = options.maxDelay ?? Infinity;
    const shouldRetry = options.shouldRetry ?? (() => true);

    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt >= attempts || !shouldRetry(error, attempt)) break;
        if (options.onRetry) options.onRetry(error, attempt);
        if (delay > 0) {
          const wait = Math.min(delay * backoff ** (attempt - 1), maxDelay);
          await _wait(wait);
        }
      }
    }
    throw lastError;
  },

  /**
   * Runs a promise (or async function) with a timeout, rejecting if it takes
   * too long.
   *
   * @example
   * await nodeComfort.func.timeout(fetch(url), 5000, "fetch too slow");
   *
   * @template T
   * @param {Promise<T>|(() => Promise<T>)} promise - Promise or async function.
   * @param {number} ms - Timeout in milliseconds.
   * @param {string} [message="Operation timed out"] - Error message on timeout.
   * @returns {Promise<T>} The resolved value.
   * @throws {Error} If the timeout elapses first.
   */
  timeout(promise, ms, message = "Operation timed out") {
    const target = typeof promise === "function" ? promise() : promise;
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([target, timeoutPromise]).finally(() => clearTimeout(timer));
  },

  /**
   * Composes functions left-to-right: `pipe(f, g)(x)` is `g(f(x))`.
   *
   * The first function may take multiple arguments; the rest take one.
   *
   * @example
   * const process = nodeComfort.func.pipe(
   *   (s) => s.trim(),
   *   (s) => s.toUpperCase(),
   * );
   * process("  hi  "); // "HI"
   *
   * @param {...((arg: any) => any)} fns - Functions to compose.
   * @returns {(...args: any[]) => any} The composed function.
   */
  pipe(...fns) {
    return (...args) => fns.reduce((acc, fn, i) => (i === 0 ? fn(...args) : fn(acc)), undefined);
  },

  /**
   * Composes functions right-to-left: `compose(f, g)(x)` is `f(g(x))`.
   *
   * @example
   * const process = nodeComfort.func.compose(
   *   (s) => s.toUpperCase(),
   *   (s) => s.trim(),
   * );
   * process("  hi  "); // "HI"
   *
   * @param {...((arg: any) => any)} fns - Functions to compose.
   * @returns {(...args: any[]) => any} The composed function.
   */
  compose(...fns) {
    return this.pipe(...fns.reverse());
  },

  /**
   * Curries a function so it can be called with arguments one (or a few) at a time.
   *
   * @example
   * const add = nodeComfort.func.curry((a, b, c) => a + b + c);
   * add(1)(2)(3);   // 6
   * add(1, 2)(3);   // 6
   *
   * @param {(...args: any[]) => any} fn - Function to curry.
   * @param {number} [arity=fn.length] - Number of arguments to wait for.
   * @returns {(...args: any[]) => any} The curried function.
   */
  curry(fn, arity = fn.length) {
    return function curried(...args) {
      if (args.length >= arity) return fn.apply(this, args);
      return (...next) => curried.apply(this, [...args, ...next]);
    };
  },

  /**
   * Returns a function that negates the result of `predicate`.
   *
   * @example
   * const isOdd = nodeComfort.func.negate((n) => n % 2 === 0);
   *
   * @param {(...args: any[]) => boolean} predicate - Predicate to negate.
   * @returns {(...args: any[]) => boolean} The negated predicate.
   */
  negate(predicate) {
    return function(...args) {
      return !predicate.apply(this, args);
    };
  },

  /**
   * Wraps a function so that it is only actually invoked from the `n`-th call on.
   *
   * @example
   * const save = nodeComfort.func.after(2, () => persist());
   * save(); save(); // persists on the 2nd call
   *
   * @template {(...args: any[]) => any} F
   * @param {number} n - Number of calls before `fn` fires.
   * @param {F} fn - Function to wrap.
   * @returns {F} The wrapped function.
   */
  after(n, fn) {
    let count = 0;
    return /** @type {any} */ (function(...args) {
      count++;
      if (count >= n) return fn.apply(this, args);
    });
  },

  /**
   * Turns a Node-style callback function (`(err, result) => ...`) into one that
   * returns a Promise.
   *
   * @example
   * const readFile = nodeComfort.func.promisify(fs.readFile);
   * const data = await readFile("a.txt", "utf8");
   *
   * @param {(...args: any[]) => void} fn - Callback-style function.
   * @returns {(...args: any[]) => Promise<any>} A promise-returning function.
   */
  promisify(fn) {
    return function(...args) {
      return new Promise((resolve, reject) => {
        fn.call(this, ...args, (err, result) => (err ? reject(err) : resolve(result)));
      });
    };
  },

  /**
   * Wraps an async function so it resolves to a `[error, result]` tuple instead
   * of throwing • Go-style error handling.
   *
   * @example
   * const [err, user] = await nodeComfort.func.attempt(() => getUser(id))();
   * if (err) return handle(err);
   *
   * @template T
   * @param {(...args: any[]) => Promise<T>|T} fn - Function to wrap.
   * @returns {(...args: any[]) => Promise<[unknown, T|undefined]>} The safe function.
   */
  attempt(fn) {
    return async function(...args) {
      try {
        const result = await fn.apply(this, args);
        return [null, result];
      } catch (error) {
        return [error, undefined];
      }
    };
  },
};
