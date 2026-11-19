---
title: "Async and concurrency"
description: "`nc.async` controls how promises run: maps with a concurrency limit, limiters, queues, mutexes, retries, timeouts, polling and cancellation."
---

```js
const { async } = require("@ix-xs/node-comfort");
```

Durations take milliseconds or text: `500`, `"500ms"`, `"30s"`. A `signal` option stops the work with an `AbortError`.

## Map with a limit

`map`, `forEach` and `filter` run at most `concurrency` calls at a time and keep the results in the order of the input:

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

| Option | Default | |
| --- | --- | --- |
| `concurrency` | no limit | Calls running at the same time |
| `stopOnError` | `true` | With `false`, everything runs and the failures come as one `AggregateError` |
| `signal` | | Stops starting new work and rejects with an `AbortError` |

The items can be any iterable or async iterable (a generator, a stream, `readline`). They are read one at a time as slots free up, so a stream is never read faster than it is processed.

## A list of tasks

`parallel` runs functions together, `series` one after the other. Both resolve with the results in order:

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 });
await async.series([() => migrateUsers(), () => migrateOrders()], { signal });
```

`parallel` takes the options of `map`. `series` takes `signal`: it stops before the next task. Pass functions, not promises: a promise has already started.

## Limiters

`limit(n)` caps how many calls run at once. `rateLimit(max, interval)` caps how many start within a window, which is what API quotas count. Calls over the limit wait and start in order.

```js
const limit = async.limit(3);
const results = await Promise.all(files.map((file) => limit(() => upload(file))));

const throttled = async.rateLimit(10, "1s");
const items = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

| Member | `limit` | `rateLimit` |
| --- | --- | --- |
| `activeCount` | Calls running | Calls running |
| `pendingCount` | Calls waiting | Calls waiting |
| `clear()` | Drops the calls that have not started | Same |
| `concurrency` | Can be changed on the fly | |
| `onIdle()` | Resolves when nothing runs or waits | |

To refuse a call instead of making it wait, per user or per IP, use a [quota](/flow/quota/). To stop calling a service that keeps failing, a [circuit breaker](/flow/circuit/).

## Queue

A queue adds priorities, pausing and a time limit per task. `add()` resolves with the task's result.

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });

jobs.add(() => sendEmail(user));
jobs.add(() => sendEmail(vip), { priority: 10 }); // goes first
await jobs.onIdle();
```

| Option | Default | |
| --- | --- | --- |
| `concurrency` | `1` | Tasks running at the same time |
| `autoStart` | `true` | Start at once |
| `timeout` | no limit | Per task; a slower task rejects with a `TimeoutError`. `false` or `Infinity`: no limit |

| Member | |
| --- | --- |
| `add(task, { priority, signal })` | Higher `priority` goes first. A `signal` that fires before the task starts takes it out of the queue |
| `addAll(tasks, options)` | Resolves with every result |
| `pause()`, `start()` | Stop and resume starting tasks. Both return the queue |
| `clear()` | Drops the tasks that have not started: their promises never settle |
| `onIdle()`, `onEmpty()` | Nothing waiting or running, nothing waiting |
| `activeCount`, `pendingCount` | Tasks running, tasks waiting |
| `isPaused`, `concurrency` | `concurrency` can be changed on the fly |

## Mutex

A mutex makes sure two tasks never overlap: put it around read-modify-write steps.

```js
const lock = async.mutex();

await lock.run(async () => {
  const data = nc.fs.readJSON("./counter.json", { n: 0 });
  nc.fs.writeJSON("./counter.json", { n: data.n + 1 });
});

const release = await lock.lock(); // by hand
try { /* ... */ } finally { release(); }
```

`lock.isLocked` tells whether a task holds it.

## Retry

`retry` calls a function until it succeeds. The function receives the attempt number, from 1. After the last attempt, the last error is thrown.

```js
const data = await async.retry((attempt) => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2, // about 200, 400, 800, 1600 ms
  jitter: true,
  shouldRetry: (error, attempt) => !(error instanceof nc.errors.HttpError && error.status < 500),
  onRetry: (error, attempt, wait) => nc.logger.warn(`Attempt ${attempt} failed, retrying in ${wait} ms`),
});
```

| Option | Default | |
| --- | --- | --- |
| `attempts` | `3` | Total, the first one included |
| `delay` | `0` | Wait before the next attempt, or `(attempt, error) => ms` |
| `backoff` | `1` | Multiplies the delay after each failure |
| `maxDelay` | | Cap for the computed delay |
| `jitter` | `0` | `0` to `1`; `true` is `0.5` |
| `shouldRetry` | | `(error, attempt) => boolean`: `false` gives up |
| `onRetry` | | `(error, attempt, delay)`, before each wait |
| `signal` | | Stops retrying; the attempt in progress is not interrupted |

The callbacks do not take their arguments in the same order: `delay` gets `(attempt, error)`, `shouldRetry` and `onRetry` get the error first. An `AbortError` thrown by the function ends the retries at once.

## Timeout

```js
const res = await async.timeout(fetch(url), "5s");                         // TimeoutError after 5s
const res2 = await async.timeout((signal) => fetch(url, { signal }), "5s"); // the request is aborted too
const rows = await async.timeout(() => slowQuery(), 2000, "Database too slow");
```

Given a promise, `timeout` only stops waiting: the work goes on. Given a function, the function receives a signal that aborts when time is up. The error is a `TimeoutError` (code `ETIMEDOUT`, field `timeout`), so it combines with `retry`. `Infinity` or `false` means no limit.

## Errors as values

`to` turns a promise, or a function, into `[error, value]`:

```js
const [error, user] = await async.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
```

## Polling and waiting

`poll` calls a function until it returns something truthy, and resolves with that value. A thrown error counts as "not ready".

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

After `timeout`, it rejects with a `TimeoutError` whose `cause` is the last error thrown, if any:

```js
try {
  await async.poll(() => db.ping(), { interval: "1s", timeout: "10s" });
} catch (error) {
  nc.logger.error(`Database not ready: ${error.cause?.message}`); // Database not ready: connect ECONNREFUSED
}
```

| `poll` option | Default | |
| --- | --- | --- |
| `interval` | `100` ms | Between two tries |
| `timeout` | no limit | `false` or `Infinity`: no limit |
| `signal` | | Stops with an `AbortError` |

`sleep(duration, { signal, unref })` waits. With `unref: true`, the timer does not keep the process alive.

```js
await async.sleep("250ms");
```

## Watching a condition

`when` checks a condition at an interval and emits events. Add the listeners, then call `start()`. To simply await a condition, `poll` is shorter.

```js
const task = async.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.logger.info(payload.reason))
  .on("timeout", () => nc.logger.warn("Nothing happened in 10s"))
  .start();

task.stop();
```

| Option | Default | |
| --- | --- | --- |
| `interval` | `50` ms | Between two checks |
| `timeout` | no limit | Emits `"timeout"` and stops. `null`, `false` or `Infinity`: no limit |
| `max` | no limit | Stops after this many triggers |
| `signal` | | Stops the task, like `stop()` |

| Event | Listener gets |
| --- | --- |
| `"trigger"` | The payload, each time the condition is true |
| `"error"` | The error the condition threw |
| `"timeout"` | The payload |

`on()`, `off()`, `start()` and `stop()` return the task. A stopped task cannot be restarted. The task works with `using`.

## Cancelling

`abortable` makes a promise give up when a signal fires. Only the waiting stops: the work behind the promise goes on unless it listens to the signal too.

```js
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());

const rows = await async.abortable(slowQuery(), controller.signal); // AbortError if the signal fires first
```

## Small helpers

```js
const { fulfilled, rejected, results } = await async.settle(emails.map(send));
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });

const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;
```

| Function | Resolves with |
| --- | --- |
| `settle(promises)` | `{ fulfilled, rejected, results }`: values and errors in order, and the `Promise.allSettled` results |
| `props(object)` | The object with each promise replaced by its value |
| `deferred()` | `{ promise, resolve, reject, settled }`: a promise settled from outside |

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.wait()`, `nc.utils.wait()` | `nc.async.sleep()` |
| `nc.when()`, `nc.utils.when()` | `nc.async.when()` |
| `nc.func.retry()`, `nc.func.timeout()`, `nc.func.to()` | `nc.async.retry()`, `nc.async.timeout()`, `nc.async.to()` |
| `queue.pending` | `queue.activeCount` |
| `queue.size` | `queue.pendingCount` |
| `limiter.clearQueue()` | `limiter.clear()` |

The old names still work and warn once. They are removed in 4.0. In 2.2, `when({ timeout: Infinity })` fired its timeout after about 1 ms; it now means no limit.
