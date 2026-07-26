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
export function debounce<F extends (...args: any[]) => any>(fn: F, wait: number, options?: {
    leading?: boolean;
}): F & {
    cancel: () => void;
    flush: () => void;
};
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
export function throttle<F extends (...args: any[]) => any>(fn: F, wait: number, options?: {
    trailing?: boolean;
}): F & {
    cancel: () => void;
};
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
export function once<F extends (...args: any[]) => any>(fn: F): F;
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
export function memoize<F extends (...args: any[]) => any>(fn: F, resolver?: (...args: any[]) => any): F & {
    cache: Map<any, any>;
};
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
export function retry<T>(fn: () => T | Promise<T>, options?: {
    attempts?: number;
    delay?: number;
    backoff?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
}): Promise<T>;
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
export function timeout<T>(promise: Promise<T> | (() => Promise<T>), ms: number, message?: string): Promise<T>;
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
export function pipe(...fns: ((arg: any) => any)[]): (...args: any[]) => any;
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
export function compose(...fns: ((arg: any) => any)[]): (...args: any[]) => any;
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
export function curry(fn: (...args: any[]) => any, arity?: number): (...args: any[]) => any;
/**
 * Returns a function that negates the result of `predicate`.
 *
 * @example
 * const isOdd = nodeComfort.func.negate((n) => n % 2 === 0);
 *
 * @param {(...args: any[]) => boolean} predicate - Predicate to negate.
 * @returns {(...args: any[]) => boolean} The negated predicate.
 */
export function negate(predicate: (...args: any[]) => boolean): (...args: any[]) => boolean;
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
export function after<F extends (...args: any[]) => any>(n: number, fn: F): F;
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
export function promisify(fn: (...args: any[]) => void): (...args: any[]) => Promise<any>;
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
export function attempt<T>(fn: (...args: any[]) => Promise<T> | T): (...args: any[]) => Promise<[unknown, T | undefined]>;
//# sourceMappingURL=Func.d.ts.map