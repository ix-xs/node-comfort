---
title: "Functions"
description: "`nc.func` wraps functions to change when and how they run: debounce, throttle, memoize, retry, timeouts, batching, and error handling without try/catch."
sidebar:
  order: 1
---

```js
const { func } = require("@ix-xs/node-comfort");

const save = func.debounce(persist, 300);
const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
const [error, user] = await func.to(getUser(id));
```

Every duration here takes milliseconds or text: `300`, `"300ms"`, `"5s"`, `"2m"`, `"1h"`.

## Debounce and throttle

**Debounce** waits for calls to stop, then runs once with the latest arguments. Use it for search boxes, resize handlers and autosave:

```js
const search = func.debounce((query) => api.search(query), 300);
input.on("input", (e) => search(e.target.value));

const save = func.debounce(persist, "1s", { maxWait: "5s" }); // but at least every 5s
save.flush();  // run the pending call now
save.cancel(); // drop it
```

**Throttle** runs at most once per interval, however often it's called. Use it for progress reports and scroll handlers:

```js
const report = func.throttle((percent) => nc.info(`${percent}%`), "1s");
```

## Retry

`retry` calls a function until it succeeds, waiting between attempts. If every attempt fails, you get the last error.

```js
const data = await func.retry(() => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2,   // waits 200, 400, 800, 1600 ms
  jitter: 0.2,  // spreads retries so clients don't retry in sync
  shouldRetry: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
  onRetry: (error, attempt, wait) => nc.warn(`Attempt ${attempt} failed, retrying in ${wait}ms`),
});
```

The function receives the attempt number, starting at 1. Pass a `signal` to stop retrying.

An `AbortError` thrown by the function ends the retries at once. A cancelled operation was stopped on purpose, so it is not tried again.

## Timeouts

```js
const res = await func.timeout(fetch(url), "5s");                    // TimeoutError after 5s
const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
```

Given a promise, `timeout` only stops waiting: the request itself goes on in the background. Give it a function instead, and the function receives an `AbortSignal` that fires when time is up, so the work stops too:

```js
const res = await func.timeout((signal) => fetch(url, { signal }), "5s");
```

A timeout is a `TimeoutError`, not an `AbortError`, so it combines with `retry`:

```js
const res = await func.retry(() => func.timeout((signal) => fetch(url, { signal }), "5s"), { attempts: 3, delay: "1s" });
```

## Errors as values

`to` turns a promise into `[error, value]`, so a failure is just a value you check:

```js
const [error, user] = await func.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
res.json(user);
```

`attempt` does the same for a function you'll call later:

```js
const safeParse = func.attempt(JSON.parse);
const [error, data] = await safeParse(input);
```

## Memoize

`memoize` caches results by arguments. It can expire entries, cap their number, and it handles async functions: a rejected promise isn't cached, so the next call tries again.

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: "1m", max: 1000 });
getUser.delete(42); // forget one entry
getUser.clear();    // forget everything
```

Primitive arguments are compared by value and type, plain objects and arrays by content. So `{ page: 1 }` passed twice hits the cache, while `undefined` and `null`, or `10`, `10n` and `"10"`, each get their own entry. To choose the key yourself, pass a `resolver`: `func.memoize(fn, { resolver: (user) => user.id })`.

For a shared cache with statistics and more control, see [`nc.Cache`](/flow/cache/).

## Batch

`batch` collects calls made close together and runs your function once with all their items. Each caller gets its own result:

```js
const loadUser = func.batch(async (ids) => {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});

// Asked from three places at once: one query.
const [ada, bob, eve] = await Promise.all([loadUser(1), loadUser(2), loadUser(3)]);
```

The function returns one result per item, in the same order, or a `Map` keyed by item. An `Error` in the results rejects that call only. If the function throws, every call of the batch rejects.

By default, calls made in the same tick go together. `wait` collects for longer, and `max` runs the batch as soon as that many calls are waiting:

```js
const loadUser = func.batch(loadUsers, { wait: "20ms", max: 100 });
loadUser.flush(); // run the waiting calls now
```

## Dedupe

`dedupe` makes calls that happen at the same time share one run:

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);

// Ten requests get a 401 at the same moment: one refresh, ten answers.
const token = await refreshToken();
```

Calls with the same arguments get the promise of the run in flight. Once it settles, the next call starts a new run: nothing is kept, unlike `memoize`. A second parameter builds the key yourself, as in `func.dedupe(fetchUser, (id, options) => id)`.

## Once, before, after

```js
const connect = func.once(() => createPool(config)); // later calls return the same pool
const tryLogin = func.before(4, login);               // 3 real attempts at most
const done = func.after(3, () => nc.info("All 3 uploads finished"));
```

## Composition

`pipe` chains functions left to right, with types flowing through:

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"
```

`pipeAsync` does the same when some steps are async. Each one is awaited before the next runs:

```js
const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN);
const url = await publish(postId);
```

Also available: `compose` (right to left), `curry`, `partial`, `negate`, `delay`, `promisify`, `noop` and `identity`. The [reference](/reference/func/) lists everything.
