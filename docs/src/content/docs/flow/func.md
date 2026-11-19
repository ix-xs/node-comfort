---
title: "Functions"
description: "`nc.func` wraps a function to change when and how it runs: debounce, throttle, memoize, batching, deduplication, composition."
---

```js
const { func } = require("@ix-xs/node-comfort");
```

Every function returns a new function and leaves the original untouched. Durations take milliseconds or text: `300`, `"300ms"`, `"5s"`.

## Debounce and throttle

`debounce` waits for the calls to stop, then runs once with the latest arguments. `throttle` runs at most once per interval.

```js
const save = func.debounce(persist, "1s", { maxWait: "5s" }); // at least every 5s while calls keep coming
save.flush();   // run the waiting call now
save.cancel();  // drop it
save.pending(); // true while a call is waiting

const report = func.throttle((percent) => console.log(`${percent}%`), "1s");
```

| Option | `debounce` | `throttle` |
| --- | --- | --- |
| `leading` | `false`: call at the start of a burst | `true`: call on the first call |
| `trailing` | `true`: call once the burst is over | `true`: last call with the latest arguments |
| `maxWait` | Never postpone longer than this | |

The debounced function has `flush()`, `cancel()` and `pending()`; the throttled one has `cancel()`.

## Memoize

`memoize` caches results by arguments. A rejected promise is not kept, so the next call tries again.

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: "1m", max: 1000 });
getUser.delete(42); // forget one entry
getUser.clear();    // forget everything
```

| Option | Default | |
| --- | --- | --- |
| `ttl` | forever | How long a result stays |
| `max` | no limit | Number of results; the least recently used goes first |
| `resolver` | the arguments | `(...args) => key`, also accepted as the second argument itself |
| `cacheRejections` | `false` | Keep rejected promises |

Primitives are compared by value and type (`10`, `10n` and `"10"` are three entries), plain objects and arrays by content (`{ page: 1 }` twice is one entry), anything else by identity. For a shared cache with stats, see [Cache](/flow/cache/).

## Batch

`batch` collects the calls made close together and runs the function once with all their items. Each caller gets its own result.

```js
const loadUser = func.batch(async function(ids) {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});

const [ada, bob, eve] = await Promise.all([loadUser(1), loadUser(2), loadUser(3)]); // one query
loadUser.flush(); // run the waiting calls now
```

| Option | Default | |
| --- | --- | --- |
| `wait` | same tick | How long to collect calls |
| `max` | no limit | Run as soon as this many calls wait |

The function returns one result per item in the same order, or a `Map` keyed by item. An `Error` among the results rejects that call only; a thrown error rejects every call of the batch.

## Dedupe

`dedupe` makes the calls that overlap share one run:

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);

await Promise.all([refreshToken(), refreshToken(), refreshToken()]); // one refresh
```

Calls with the same arguments get the promise in flight. Once it settles, the next call starts a new run: nothing is kept, unlike `memoize`. The second argument builds the key: `func.dedupe(fetchUser, (id, options) => id)`.

## Call counts

```js
const connect = func.once(() => createPool(config)); // later calls return the first result
const tryLogin = func.before(4, login);              // runs for the first 3 calls, then returns the last result
const done = func.after(3, () => "all done");        // runs from the 3rd call on

done(); // undefined
done(); // undefined
done(); // "all done"
```

## Errors as values

`attempt` wraps a function so that it resolves to `[error, value]` instead of throwing:

```js
const safeParse = func.attempt(JSON.parse);

await safeParse('{"a":1}'); // [null, { a: 1 }]
await safeParse("oops");    // [SyntaxError, undefined]
```

For a promise, use `nc.async.to()`.

## Composition

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"

const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN); // each step awaited
const url = await publish(postId);
```

| Function | Example | Result |
| --- | --- | --- |
| `pipe` | `func.pipe(f, g)(x)` | `g(f(x))`, left to right, typed through |
| `pipeAsync` | `await func.pipeAsync(f, g)(x)` | Same, each step awaited |
| `compose` | `func.compose((s) => s + "!", (s) => s.toUpperCase())("hi")` | `"HI!"`, right to left |
| `curry` | `func.curry((a, b, c) => a + b + c)(1)(2)(3)` | `6` |
| `partial` | `func.partial((a, b, c) => a + b + c, 1, 2)(3)` | `6` |
| `negate` | `[1, 2, 3, 4].filter(func.negate(isEven))` | `[1, 3]` |

## Other functions

| Function | Does |
| --- | --- |
| `delay(fn, ms, ...args)` | Calls `fn(...args)` after `ms` and resolves with its result |
| `promisify(fn)` | Turns a function whose last parameter is a `(error, result)` callback into one that returns a promise |
| `noop()` | Does nothing, returns `undefined` |
| `identity(value)` | Returns `value` |

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.func.retry()` | `nc.async.retry()` |
| `nc.func.timeout()` | `nc.async.timeout()` |
| `nc.func.to()` | `nc.async.to()` |

The old names still work and warn once. They are removed in 4.0. See [Async and concurrency](/flow/async/).
