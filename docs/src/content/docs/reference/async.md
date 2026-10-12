---
title: "nc.async"
description: "Promises and concurrency: map with a limit, queues with priorities, mutexes, polling, and friendlier `Promise.allSettled`."
sidebar:
  label: "async"
  order: 15
---

```js
const { async } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const async = require("@ix-xs/node-comfort/async");
```

This page lists everything `nc.async` has, as your editor shows it. For explanations and longer examples, read [the guide](/flow/async/).

```js
const pages = await async.map(urls, (url) => fetchPage(url), { concurrency: 5 });

const limit = async.limit(2);
await Promise.all(files.map((file) => limit(() => upload(file))));

await async.poll(() => isServerReady(), { interval: 250, timeout: "10s" });
```

## sleep

```ts
sleep(duration: string | number, options?: { signal?: AbortSignal; } | undefined): Promise<void>
```

Waits for a while. Same as `nc.wait()`.

```js
await async.sleep("250ms");
```

## map

```ts
map<T, R>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => R | PromiseLike<R>, options?: MapOptions): Promise<Awaited<R>[]>
```

Maps items through an async function, with at most `concurrency` calls
at once. Results stay in order. Items are taken from the source as slots
free up, so a stream is never read faster than it's processed.

**Throws** The first error, an `AggregateError` with `stopOnError: false`, or an `AbortError`.

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(readline.createInterface({ input }), importLine, { concurrency: 20 });
```

## forEach

```ts
forEach<T>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => unknown, options?: MapOptions): Promise<void>
```

Runs an async function for every item, with a concurrency limit.

```js
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
```

## filter

```ts
filter<T>(items: Iterable<T> | AsyncIterable<T>, predicate: (item: T, index: number) => unknown, options?: MapOptions): Promise<T[]>
```

Keeps the items that pass an async test, with a concurrency limit.
Order is preserved.

```js
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

## series

```ts
series<T>(tasks: Iterable<() => T | PromiseLike<T>>): Promise<Awaited<T>[]>
```

Runs async functions one after the other and returns their results.

```js
await async.series([() => migrateUsers(), () => migrateOrders()]);
```

## parallel

```ts
parallel<T>(tasks: Iterable<() => T | PromiseLike<T>>, options?: MapOptions): Promise<Awaited<T>[]>
```

Runs async functions at the same time, or a few at once with
`concurrency`, and returns their results in order.

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 });
```

## limit

```ts
limit(concurrency: number): Limiter
```

A limiter: wrap calls with it, and at most `concurrency` run at once
while the rest wait their turn. Like `p-limit`.

```js
const limit = async.limit(3);
const results = await Promise.all(urls.map((url) => limit(() => fetch(url))));
```

## rateLimit

```ts
rateLimit(max: number, interval: string | number): RateLimiter
```

A rate limiter: at most `max` calls start within any `interval`. Made
for APIs that allow, say, 10 requests per second.

| Parameter | Type | Description |
| --- | --- | --- |
| `max` | `number` | How many calls may start per interval. |
| `interval` | `number \| string` | The window, in ms or like `"1s"`. |

```js
const throttled = async.rateLimit(10, "1s");
const pages = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

## queue

```ts
queue(options?: QueueOptions): Queue
```

A task queue with a concurrency limit, priorities, pause and per-task
timeouts.

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });
jobs.add(() => sendEmail(a));
jobs.add(() => sendEmail(vip), { priority: 10 }); // jumps the line
await jobs.onIdle();
```

## mutex

```ts
mutex(): Mutex
```

A mutex: tasks given to `run()` never overlap. Put it around
read-modify-write steps, like updating a file or refreshing a token.

```js
const lock = async.mutex();
await lock.run(async () => {
  const data = nc.readJSON("./counter.json", { n: 0 });
  nc.writeJSON("./counter.json", { n: data.n + 1 });
});
```

## deferred

```ts
deferred<T = void>(): Deferred<T>
```

A promise along with its `resolve` and `reject`. Handy to connect
callbacks or events to `await`.

```js
const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;
```

## settle

```ts
settle<T>(promises: Iterable<T | PromiseLike<T>>): Promise<Settled<Awaited<T>>>
```

Waits for every promise and sorts successes from failures.

```js
const { fulfilled, rejected } = await async.settle(emails.map(send));
nc.info(`${fulfilled.length} sent, ${rejected.length} failed`);
```

## props

```ts
props<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]>; }>
```

Like `Promise.all`, for an object of promises.

```js
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });
```

## poll

```ts
poll<T>(fn: () => T | PromiseLike<T>, options?: PollOptions): Promise<NonNullable<Awaited<T>>>
```

Calls `fn` until it returns something truthy, and resolves with it.
Errors count as "not yet".

**Throws** `TimeoutError`

**Throws** `AbortError`

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

## abortable

```ts
abortable<T>(promise: T | PromiseLike<T>, signal?: AbortSignal): Promise<Awaited<T>>
```

Makes any promise give up when a signal fires. The work behind it keeps
running unless it listens to the signal too.

**Throws** `AbortError`: When the signal fires first.

```js
const controller = new AbortController();
const rows = await async.abortable(slowQuery(), controller.signal);
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
| `options?` | [`RetryOptions`](/reference/func/#retryoptions) |  |

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

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { Deferred } from "@ix-xs/node-comfort"`.

### Deferred

A promise with its `resolve` and `reject`.

| Property | Type | Description |
| --- | --- | --- |
| `promise` | `Promise``<``T``>` |  |
| `resolve` | `(value: ``T`` \| ``PromiseLike``<``T``>) => void` |  |
| `reject` | `(reason?: unknown) => void` |  |
| `settled` | `boolean` | Whether it's already resolved or rejected. |

### Limiter

A limiter from `limit()`. Call it with a function to run it when there's room.

```ts
type Limiter = (<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly activeCount: number; readonly pendingCount: number; concurrency: number; clearQueue(): void; onIdle(): Promise<void>; }
```

### MapOptions

Options for `map()`, `forEach()` and `filter()`.

| Property | Type | Description |
| --- | --- | --- |
| `concurrency?` | `number` | How many run at the same time. No limit by default. |
| `stopOnError?` | `boolean` | Stop at the first error. With `false`, everything runs and you get an `AggregateError` of all failures. Defaults to `true`. |
| `signal?` | `AbortSignal` | Stops starting new work and rejects with an `AbortError`. |

### Mutex

A mutex from `mutex()`.

| Property | Type | Description |
| --- | --- | --- |
| `run` | `<``T``>(fn: () => ``T`` \| ``PromiseLike``<``T``>) => ``Promise``<``Awaited``<``T``>>` | Runs `fn` once no other `run` is in progress. |
| `lock` | `() => ``Promise``<() => void>` | Waits for the lock and gives you the function that releases it. |
| `isLocked` | `boolean` |  |

### PollOptions

Options for `poll()`.

| Property | Type | Description |
| --- | --- | --- |
| `interval?` | `string \| number` | Time between tries. Defaults to 100 ms. |
| `timeout?` | `string \| number` | Give up with a `TimeoutError` after this long. |
| `signal?` | `AbortSignal` | Stops with an `AbortError`. |

### Queue

A queue from `queue()`.

| Property | Type | Description |
| --- | --- | --- |
| `add` | `<``T``>(task: () => ``T`` \| ``PromiseLike``<``T``>, options?: `[`QueueAddOptions`](#queueaddoptions)`) => ``Promise``<``Awaited``<``T``>>` | Adds a task; resolves with its result. |
| `addAll` | `<``T``>(tasks: (() => ``T`` \| ``PromiseLike``<``T``>)[], options?: `[`QueueAddOptions`](#queueaddoptions)`) => ``Promise``<``Awaited``<``T``>[]>` | Adds several tasks; resolves with all results. |
| `pause` | `() => `[`Queue`](#queue) | Stops starting tasks. Running ones finish. |
| `start` | `() => `[`Queue`](#queue) | Starts again. |
| `clear` | `() => void` | Drops the tasks that haven't started. Their promises never settle. |
| `onIdle` | `() => ``Promise``<void>` | Resolves when nothing is waiting or running. |
| `onEmpty` | `() => ``Promise``<void>` | Resolves when nothing is waiting. |
| `size` | `number` | Tasks waiting. |
| `pending` | `number` | Tasks running. |
| `isPaused` | `boolean` |  |
| `concurrency` | `number` | Can be changed on the fly. |

### QueueAddOptions

Options for `queue.add()`.

| Property | Type | Description |
| --- | --- | --- |
| `priority?` | `number` | Higher goes first; equal priorities keep their order. Defaults to `0`. |

### QueueOptions

Options for `queue()`.

| Property | Type | Description |
| --- | --- | --- |
| `concurrency?` | `number` | How many tasks run at the same time. Defaults to `1`. |
| `autoStart?` | `boolean` | Start right away. Defaults to `true`. |
| `timeout?` | `string \| number` | Time limit per task, like `"30s"`. A slower task rejects with a `TimeoutError`. |

### RateLimiter

A rate limiter from `rateLimit()`. Call it with a function to run it as
soon as the rate allows.

```ts
type RateLimiter = (<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly pendingCount: number; }
```

### Settled

What `settle()` returns.

| Property | Type | Description |
| --- | --- | --- |
| `fulfilled` | `T``[]` | Successful values, in order. |
| `rejected` | `unknown[]` | Errors, in order. |
| `results` | `PromiseSettledResult``<``T``>[]` | Everything, like `Promise.allSettled`. |
