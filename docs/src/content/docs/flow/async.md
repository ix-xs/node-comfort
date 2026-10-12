---
title: "Async and concurrency"
description: "`nc.async` controls how many things run at once: maps with a limit, queues, rate limits, mutexes, polling."
sidebar:
  order: 2
---

```js
const { async } = require("@ix-xs/node-comfort");

const pages = await async.map(urls, (url) => nc.http.get(url), { concurrency: 5 });
```

## Map with a limit

`Promise.all(items.map(fn))` starts everything at once, which can overwhelm an API or run out of file handles. `async.map` runs at most `concurrency` calls at a time and keeps results in order:

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

By default it stops at the first error. With `stopOnError: false`, everything runs and you get an `AggregateError` listing each failure. Pass a `signal` to stop starting new work and reject with an `AbortError`.

Items don't have to be an array. Any iterable or async iterable works, like a generator or a stream:

```js
const fs = require("node:fs");
const readline = require("node:readline");

const lines = readline.createInterface({ input: fs.createReadStream("./users.csv") });

await async.forEach(lines, (line) => importUser(line), { concurrency: 20 });
```

Items are taken from the source one at a time, as slots free up, so a stream is never read faster than it is processed. `map` and `filter` still return their results in the order of the source.

## A list of tasks

When each job is its own function, `parallel` runs them together and `series` runs them one after the other. Both return the results in order:

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 }); // four at a time
await async.series([() => migrateUsers(), () => migrateOrders()]);
```

`parallel` takes the same options as `map`. Pass functions, not promises: a promise has already started, so there would be nothing left to limit.

## Limiter

`limit` gives you a function that runs what you pass it when there's room, like the `p-limit` package:

```js
const limit = async.limit(3);
const results = await Promise.all(files.map((file) => limit(() => upload(file))));

limit.activeCount;  // running now
limit.pendingCount; // waiting
```

Share one limiter between parts of your code to cap their combined concurrency.

## Rate limit

`limit` caps how many calls run at the same time. `rateLimit` caps how many start within a period, which is what most API quotas count:

```js
const throttled = async.rateLimit(10, "1s"); // 10 calls per second at most

const items = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

Calls over the limit wait for their turn and start in the order they were made. The period is in milliseconds or text such as `"1s"` or `"1m"`. `throttled.pendingCount` tells you how many are waiting.

## Queue

A queue adds priorities, pausing and per-task timeouts:

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });

jobs.add(() => sendEmail(user));
jobs.add(() => sendEmail(vip), { priority: 10 }); // jumps the line
jobs.pause();
jobs.start();
await jobs.onIdle(); // everything done
```

`add` returns a promise for the task's result.

## Mutex

A mutex makes sure two tasks never overlap. Wrap read-modify-write sequences with it:

```js
const lock = async.mutex();

await lock.run(async () => {
  const data = nc.readJSON("./counter.json", { n: 0 });
  nc.writeJSON("./counter.json", { n: data.n + 1 });
});
```

## Polling

`poll` calls a function until it returns something truthy, and resolves with that value:

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

Errors count as "not ready yet". After `timeout`, it rejects with a `TimeoutError`. If the last try threw, that error is kept as the `cause`, so you can tell why it never became ready:

```js
try {
  await async.poll(() => db.ping(), { interval: "1s", timeout: "10s" });
} catch (error) {
  nc.error(`Database not ready: ${error.cause?.message}`); // Database not ready: connect ECONNREFUSED
}
```

## Cancelling

`abortable` makes any promise give up when a signal fires:

```js
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());

const rows = await async.abortable(slowQuery(), controller.signal); // AbortError if the signal fires first
```

It only stops the waiting. The work behind the promise goes on, unless it listens to the signal too.

`map`, `forEach`, `filter`, `parallel`, `poll` and `sleep` take a `signal` option as well.

## Small helpers

```js
const { fulfilled, rejected } = await async.settle(emails.map(send));
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });

const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;

await async.sleep("250ms");
```

`async.retry` and `async.timeout` are the same functions as in [`nc.func`](/flow/func/). The [reference](/reference/async/) lists everything.
