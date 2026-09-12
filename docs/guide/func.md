# Functions

`nc.func` wraps functions to change when and how they run: debounce, throttle, memoize, retry, timeouts, and error handling without try/catch.

```js
const { func } = require("@ix-xs/node-comfort");

const save = func.debounce(persist, 300);
const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
const [error, user] = await func.to(getUser(id));
```

## Debounce and throttle

**Debounce** waits for calls to stop, then runs once with the latest arguments. Use it for search boxes, resize handlers and autosave:

```js
const search = func.debounce((query) => api.search(query), 300);
input.on("input", (e) => search(e.target.value));

const save = func.debounce(persist, 1000, { maxWait: 5000 }); // but at least every 5s
save.flush();  // run the pending call now
save.cancel(); // drop it
```

**Throttle** runs at most once per interval, however often it's called. Use it for progress reports and scroll handlers:

```js
const report = func.throttle((percent) => nc.info(`${percent}%`), 1000);
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

## Timeouts

```js
const res = await func.timeout(fetch(url), 5000);                    // TimeoutError after 5s
const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
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
const getUser = func.memoize((id) => db.users.find(id), { ttl: 60_000, max: 1000 });
getUser.delete(42); // forget one entry
getUser.clear();    // forget everything
```

For a shared cache with statistics and more control, see [`nc.Cache`](cache.html).

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

Also available: `compose` (right to left), `curry`, `partial`, `negate`, `delay`, `promisify`, `noop` and `identity`.
