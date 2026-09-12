# Async and concurrency

`nc.async` controls how many things run at once: maps with a limit, queues, mutexes, polling.

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

By default it stops at the first error. With `stopOnError: false`, everything runs and you get an `AggregateError` listing each failure. Items can come from an async iterable, like a stream.

## Limiter

`limit` gives you a function that runs what you pass it when there's room, like the `p-limit` package:

```js
const limit = async.limit(3);
const results = await Promise.all(files.map((file) => limit(() => upload(file))));

limit.activeCount;  // running now
limit.pendingCount; // waiting
```

Share one limiter between parts of your code to cap their combined concurrency.

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

`poll` calls a function until it returns something truthy:

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

Errors count as "not ready yet". After `timeout`, it rejects with a `TimeoutError`.

## Small helpers

```js
const { fulfilled, rejected } = await async.settle(emails.map(send));
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });
await async.series([() => migrateUsers(), () => migrateOrders()]);

const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;

await async.sleep("250ms");
```

`async.retry` and `async.timeout` are the same functions as in [`nc.func`](func.html).
