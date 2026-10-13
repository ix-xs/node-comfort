---
title: "nc.func"
description: "Function helpers: debounce, throttle, memoize, retry with backoff, timeouts, error handling without try/catch, and typed composition."
sidebar:
  label: "func"
  order: 14
---

```js
const { func } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const func = require("@ix-xs/node-comfort/func");
```

This page lists everything `nc.func` has, as your editor shows it. For explanations and longer examples, read [the guide](/flow/func/).

```js
const save = func.debounce(persist, 300);
const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
const [error, user] = await func.to(getUser(id));
```

## debounce

```ts
debounce<F extends (...args: any[]) => any>(fn: F, wait: string | number, options?: DebounceOptions): DebouncedFunction<F>
```

Waits for a pause of `wait` ms between calls, then runs once with the
latest arguments. For search boxes, resizing, auto-saving...

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `wait` | `number \| string` | Pause needed, in ms or like `"300ms"`. |
| `options?` | [`DebounceOptions`](#debounceoptions) |  |

```js
const search = func.debounce((query) => api.search(query), 300);
input.on("input", (e) => search(e.target.value));

const save = func.debounce(persist, 1000, { maxWait: 5000 }); // saves at least every 5s
```

## throttle

```ts
throttle<F extends (...args: any[]) => any>(fn: F, interval: string | number, options?: ThrottleOptions): ThrottledFunction<F>
```

Runs at most once every `interval` ms, however often it's called. For scroll
handlers, progress reports, rate-limited APIs...

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `interval` | `number \| string` | Minimum gap between calls, in ms or like `"1s"`. |
| `options?` | [`ThrottleOptions`](#throttleoptions) |  |

```js
const report = func.throttle((pct) => console.log(`${pct}%`), 1000);
```

## once

```ts
once<F extends (...args: any[]) => any>(fn: F): F
```

Runs `fn` the first time only; later calls return the same result.

```js
const connect = func.once(() => createPool(config));
```

## memoize

```ts
memoize<F extends (...args: any[]) => any>(fn: F, options?: MemoizeOptions | ((...args: Parameters<F>) => unknown) | undefined): MemoizedFunction<F>
```

Caches results by arguments. Supports expiry (`ttl`), a size limit
(`max`) and async functions: a failed promise isn't cached, so the next
call tries again.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `options?` | [`MemoizeOptions`](#memoizeoptions)` \| ((...args: ``Parameters``<``F``>) => unknown)` | Options, or a function that builds the cache key. |

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: 60_000, max: 1000 });
getUser.delete(42); // forget one entry
getUser.clear();    // forget everything
```

## retry

```ts
retry<T>(fn: (attempt: number) => T | PromiseLike<T>, options?: RetryOptions): Promise<Awaited<T>>
```

Calls `fn` until it succeeds, waiting between attempts. If every attempt
fails, the last error is thrown.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `(attempt: number) => ``T`` \| ``PromiseLike``<``T``>` | Receives the attempt number, starting at 1. |
| `options?` | [`RetryOptions`](#retryoptions) |  |

**Throws** The last error, or an `AbortError` if the signal fires.

```js
const data = await func.retry(() => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2, // 200, 400, 800, 1600 ms
  shouldRetry: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
});
```

## timeout

```ts
timeout<T>(promise: PromiseLike<T> | ((signal: AbortSignal) => T | PromiseLike<T>), ms: string | number, message?: string): Promise<Awaited<T>>
```

Rejects with a `TimeoutError` if the promise takes longer than `ms`. Pass
a function to get an `AbortSignal` that fires when time is up, so the work
actually stops instead of running on in the background.

| Parameter | Type | Description |
| --- | --- | --- |
| `promise` | `PromiseLike``<``T``> \| ((signal: ``AbortSignal``) => ``PromiseLike``<``T``> \| ``T``)` | A promise, or a function that returns one. The function gets a signal that aborts on timeout. |
| `ms` | `number \| string` | The limit, in ms or like `"5s"`. `Infinity` means no limit. |
| `message?` | `string` |  |

**Throws** `TimeoutError`

```js
const res = await func.timeout(fetch(url), 5000);
const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
```

## delay

```ts
delay<F extends (...args: any[]) => any>(fn: F, ms: string | number, ...args: Parameters<F>): Promise<Awaited<ReturnType<F>>>
```

Waits `ms`, then calls `fn` with the arguments and resolves with its result.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `ms` | `number \| string` | In ms, or like `"2s"`. |
| `...args` | `Parameters``<``F``>` |  |

```js
await func.delay(() => console.log("1s later"), 1000);
```

## to

```ts
to<T, E = Error>(promise: PromiseLike<T> | (() => T | PromiseLike<T>)): Promise<[E, undefined] | [null, Awaited<T>]>
```

Awaits a promise and gives you `[error, value]` instead of throwing, so
you don't need a try/catch.

| Parameter | Type | Description |
| --- | --- | --- |
| `promise` | `PromiseLike``<``T``> \| (() => ``PromiseLike``<``T``> \| ``T``)` | A promise, or a function (sync errors are caught too). |

```js
const [error, user] = await func.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
```

## attempt

```ts
attempt<F extends (...args: any[]) => any>(fn: F): (...args: Parameters<F>) => Promise<[unknown, undefined] | [null, Awaited<ReturnType<F>>]>
```

Wraps a function so it resolves to `[error, value]` instead of throwing.

```js
const safeParse = func.attempt(JSON.parse);
const [error, data] = await safeParse(input);
```

## promisify

```ts
promisify(fn: (...args: any[]) => void): (...args: any[]) => Promise<any>
```

Turns a callback-style function into one that returns a promise.

```js
const lookup = func.promisify(dns.lookup);
const address = await lookup("nodejs.org");
```

## batch

```ts
batch<I, R>(fn: (items: I[]) => readonly (Error | R)[] | Map<I, Error | R> | PromiseLike<readonly (Error | R)[] | Map<I, Error | R>>, options?: BatchOptions): BatchedFunction<I, R>
```

Turns many single calls into few grouped ones. Calls made close together
are collected, `fn` runs once with all their items, and each caller gets
its own result. The classic cure for "N+1 queries".

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `(items: ``I``[]) => ``ReadonlyArray``<``R`` \| ``Error``> \| ``Map``<``I``, ``R`` \| ``Error``> \| ``PromiseLike``<``ReadonlyArray``<``R`` \| ``Error``> \| ``Map``<``I``, ``R`` \| ``Error``>>` | Gets every waiting item and returns one result per item, in the same order, or a `Map` keyed by item. An `Error` as a result rejects that call only. |
| `options?` | [`BatchOptions`](#batchoptions) |  |

```js
const loadUser = func.batch(async (ids) => {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});
// One query, however many places ask at once:
const [ada, bob] = await Promise.all([loadUser(1), loadUser(2)]);
```

## dedupe

```ts
dedupe<F extends (...args: any[]) => any>(fn: F, keyOf?: ((...args: Parameters<F>) => unknown) | undefined): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>
```

Makes concurrent calls with the same arguments share one run. Once it
settles, the next call starts a new one: nothing is cached.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `keyOf?` | `(...args: ``Parameters``<``F``>) => unknown` | Builds the key that identifies a call. Defaults to its arguments. |

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);
// Ten requests hit a 401 at once: one refresh, ten answers.
```

## pipe

```ts
pipe<A extends any[], B>(f1: (...args: A) => B): (...args: A) => B
pipe<A extends any[], B, C>(f1: (...args: A) => B, f2: (b: B) => C): (...args: A) => C
pipe<A extends any[], B, C, D>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D): (...args: A) => D
pipe<A extends any[], B, C, D, E>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E): (...args: A) => E
pipe<A extends any[], B, C, D, E, F>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F): (...args: A) => F
pipe<A extends any[], B, C, D, E, F, G>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G): (...args: A) => G
pipe(...fns: ((arg: any) => any)[]): (...args: any[]) => any
```

Chains functions from left to right: `pipe(f, g)(x)` is `g(f(x))`.
Types flow through up to 6 functions.

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"
```

## pipeAsync

```ts
pipeAsync(...fns: ((...args: any[]) => any)[]): (...args: any[]) => Promise<any>
```

Like `pipe()`, for functions that may be async: each one is awaited
before the next runs.

```js
const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN);
const url = await publish(postId);
```

## compose

```ts
compose(...fns: ((...args: any[]) => any)[]): (...args: any[]) => any
```

Chains functions from right to left: `compose(f, g)(x)` is `f(g(x))`.
`pipe()` reads in execution order and is better typed.

```js
const shout = func.compose((s) => s + "!", (s) => s.toUpperCase());
shout("hi"); // "HI!"
```

## curry

```ts
curry(fn: (...args: any[]) => any, arity?: number): (...args: any[]) => any
```

Lets you pass a function's arguments a few at a time.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | `(...args: any[]) => any` |  |
| `arity?` | `number` | How many arguments to collect before calling. Defaults to `fn.length`. |

```js
const add = func.curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6
```

## partial

```ts
partial<P extends any[], R extends any[], T>(fn: (...args: [...P, ...R]) => T, ...preset: P): (...args: R) => T
```

Fixes the first arguments of a function.

```js
const hello = func.partial((greeting, name) => `${greeting}, ${name}!`, "Hello");
hello("Ada"); // "Hello, Ada!"
```

## negate

```ts
negate<A extends any[]>(predicate: (...args: A) => unknown): (...args: A) => boolean
```

The opposite of a predicate.

```js
files.filter(func.negate((name) => name.startsWith(".")));
```

## after

```ts
after<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Does nothing for the first `n - 1` calls, then calls `fn` every time.

```js
const done = func.after(3, () => console.log("All 3 uploads finished"));
uploads.forEach((upload) => upload.on("end", done));
```

## before

```ts
before<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Calls `fn` for the first `n - 1` calls, then keeps returning the last
result.

```js
const tryLogin = func.before(4, login); // 3 real attempts at most
```

## noop

```ts
noop(..._args: unknown[]): void
```

Does nothing. Useful as a default callback.

## identity

```ts
identity<T>(value: T): T
```

Returns its argument.

```js
[0, 1, 2].filter(func.identity); // [1, 2]
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { BatchedFunction } from "@ix-xs/node-comfort"`.

### BatchedFunction

A batched function. `flush()` runs the waiting calls now.

```ts
type BatchedFunction = ((item: I) => Promise<R>) & { flush(): void; }
```

### BatchOptions

Options for `batch()`.

| Property | Type | Description |
| --- | --- | --- |
| `wait?` | `string \| number` | How long to collect calls before running. By default, calls made in the same tick go together. |
| `max?` | `number` | Run as soon as this many calls are waiting. |

### DebouncedFunction

A debounced function. `flush()` runs the pending call now, `cancel()`
drops it, `pending()` tells you if there's one.

```ts
type DebouncedFunction = ((...args: Parameters<F>) => void) & { cancel(): void; flush(): void; pending(): boolean; }
```

### DebounceOptions

Options for `debounce()`.

| Property | Type | Description |
| --- | --- | --- |
| `leading?` | `boolean` | Call right away at the start of a burst. |
| `trailing?` | `boolean` | Call once the burst is over. Defaults to `true`. |
| `maxWait?` | `string \| number` | Never postpone a call longer than this, even if calls keep coming. In ms, or like `"2s"`. |

### MemoizedFunction

A memoized function, with its `cache`, `clear()` and `delete(...args)`.

```ts
type MemoizedFunction = F & { cache: Map<unknown, { value: ReturnType<F>; expires: number; }>; clear(): void; delete(...args: Parameters<F>): boolean; }
```

### MemoizeOptions

Options for `memoize()`.

| Property | Type | Description |
| --- | --- | --- |
| `resolver?` | `((...args: any[]) => unknown)` | Builds the cache key from the arguments. By default, primitives are compared by value, plain objects and arrays by content, anything else by identity. |
| `ttl?` | `string \| number` | How long a result stays cached, in ms or like `"5m"`. |
| `max?` | `number` | Maximum number of results; the least recently used goes first. |
| `cacheRejections?` | `boolean` | Keep rejected promises. By default they're dropped so the next call tries again. |

### RetryOptions

Options for `retry()`.

| Property | Type | Description |
| --- | --- | --- |
| `attempts?` | `number` | Total attempts, the first one included. Defaults to `3`. |
| `delay?` | `string \| number \| ((attempt: number, error: unknown) => number)` | Wait before the next attempt, in ms or like `"1s"`, or a function that computes it. |
| `backoff?` | `number` | Multiplies the delay after each failure: `2` gives 200, 400, 800... Defaults to `1`. |
| `maxDelay?` | `string \| number` | Cap for the computed delay. |
| `jitter?` | `number` | Randomizes the delay, from `0` (none) to `1` (anywhere between 0 and 2x). Stops many clients from retrying in sync. |
| `shouldRetry?` | `((error: unknown, attempt: number) => boolean \| ``Promise``<boolean>)` | Return `false` to give up early, for example on a 4xx error. |
| `onRetry?` | `((error: unknown, attempt: number, delay: number) => void)` | Called before each wait, for logs or metrics. |
| `signal?` | `AbortSignal` | Stops retrying. The attempt in progress isn't interrupted. |

### ThrottledFunction

A throttled function, with `cancel()`.

```ts
type ThrottledFunction = ((...args: Parameters<F>) => void) & { cancel(): void; }
```

### ThrottleOptions

Options for `throttle()`.

| Property | Type | Description |
| --- | --- | --- |
| `leading?` | `boolean` | Call right away on the first call. Defaults to `true`. |
| `trailing?` | `boolean` | Make a last call with the latest arguments at the end of the interval. Defaults to `true`. |
