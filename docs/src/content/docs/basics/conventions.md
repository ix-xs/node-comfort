---
title: "Conventions"
description: "The rules every namespace follows: durations, sizes, options, cancellation, return values, paths, and the few places where two namespaces differ."
---

## Durations

A duration is a number of milliseconds or a string with a unit:

```js
nc.async.sleep("500ms");
nc.http.get(url, { timeout: "10s" });
nc.cache.create({ ttl: "30m" });
nc.time.every("1h", task);
nc.time.parseDuration("1h 30m"); // 5400000
```

| | |
| --- | --- |
| Units | `ms`, `s`, `m`, `h`, `d`, `w`, also written out (`"2 hours"`) and combined (`"1h 30m"`) |
| Invalid | `TypeError: Invalid duration` from the function that received it |
| Exception | JWT (`expiresIn`, `notBefore`, `maxAge`, `clockTolerance`) and TOTP (`period`): a number is in **seconds**, as RFC 7519 and RFC 6238 define it. JWT options also take a string: write `"15m"` |

## Sizes

A size is a number of bytes or a string with a unit: `"10MB"`, `"512KB"`. Used by `maxResponseSize` (http), `maxSize` (log files) and `nc.num.parseBytes()`.

## Arguments and options

What the function works on comes first, an options object comes last and is always optional:

```js
nc.str.truncate(text, 40, { words: true });
nc.fs.write(path, data, { mode: 0o600 });
nc.http.post(url, body, { retry: { attempts: 3 } });
```

Where a limit can be turned off (`timeout`, `maxResponseSize`), both `false` and `Infinity` mean no limit.

## Cancelling

Every function that waits accepts an `AbortSignal` as `signal`. When it fires, the promise rejects with an `AbortError` (`code: "ABORT_ERR"`), and what was started is stopped:

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await nc.http.get(url, { signal: controller.signal });
await nc.sys.run("npm", ["test"], { signal: controller.signal });
```

| Namespace | Takes `signal` |
| --- | --- |
| `http` | Every request, `download` |
| `sys` | `run`, `exec` |
| `async` | `sleep`, `map`, `forEach`, `filter`, `series`, `queue.add`, `poll`, `retry`, `when`, `abortable` |
| `time` | `every`, `cron`: the schedule stops |
| `cache` | `getOrSet` |
| `emitter` | `on` (removes the listener), `waitFor`, `events` |
| `cli` | Every prompt, `spin` |

## Return values

`nc.fs` does not throw for what goes wrong every day. Everything else throws.

| Namespace | Missing or failed |
| --- | --- |
| `fs` | Reads return `undefined` (or the fallback), writes and operations return `false`. `ensureFile`, `ensureFolder` and `temp` throw |
| `is` | `false`, never throws, accepts any value |
| `obj.get`, `arr.first`, `env.get` | `undefined` |
| Everything else | Throws a [`NodeComfortError`](/basics/errors/) with a `code` for a failure at run time, a `TypeError` or `RangeError` for a wrong argument |

Parsing functions differ by what an invalid input gives:

| Function | Invalid input |
| --- | --- |
| `nc.json.parse(text)` | Throws `SyntaxError`. With a fallback, `nc.json.parse(text, fallback)` returns it |
| `nc.fs.readJSON(path, fallback)` | The fallback, or `undefined` |
| `nc.num.parse`, `nc.num.parseBytes` | `NaN` |
| `nc.time.parseDuration` | `null` |
| `nc.time.parse(text, format)` | `undefined` |
| `nc.time.format` of an invalid date | `"Invalid Date"` |
| `schema.parse` / `schema.safeParse` | Throws `ValidationError` / returns `{ success: false, error }` |
| `nc.env.number`, `nc.env.required`... | Throws `ValidationError` |
| `nc.crypto.decodeJWT`, `verifyJWT` | Throws `JWTError` |

## Timeouts

Every timeout fails with the code `ETIMEDOUT`: a `TimeoutError` from `http`, `async.timeout`, `async.poll` and `emitter.waitFor`, a `ProcessError` (with `timedOut: true`) from `sys.run` and `sys.exec`. Test the code to handle both:

```js
try {
  await nc.async.timeout(work(), "5s");
} catch (error) {
  if (error.code === "ETIMEDOUT") nc.logger.warn("Too slow");
  else throw error;
}
```

## Paths

| Function | `./x` starts from |
| --- | --- |
| Every function of `nc.fs` but `glob` | The file that calls it |
| `nc.fs.glob`, `nc.sqlite.open`, the logger's `file.path`, `nc.http.download`, `nc.env.load`, `nc.sys.open` | The working directory |

To give a path next to your file to the second group, resolve it first:

```js
const db = nc.sqlite.open(nc.fs.resolve("./data/app.sqlite"));
```

`nc.fs.remove(".")` removes the folder of the calling file. `remove`, `copy` and `move` refuse an empty path.

## Differences between namespaces

| Topic | Rule |
| --- | --- |
| `.on()` | Returns a function that removes the listener on an emitter (`nc.emitter`). Returns the object, to chain, on `nc.fs.watch()`, `nc.async.when()` and `nc.sys.dontCrash()` |
| `compact` | `nc.arr.compact` removes every falsy value (`0`, `""`, `false`...), `nc.obj.compact` only `null` and `undefined` |
| Callback arguments | `nc.obj.mapValues` and `nc.obj.filter` get `(value, key)`, `nc.obj.mapKeys` gets `(key, value)` |
| Retry callbacks | `delay(attempt, error)`, `shouldRetry(error, attempt)`. Attempts count from 1 |
| `is.*` and `isX()` | `nc.is.*` checks the type or the format of any value. A namespace's own `isX()` answers a question of its domain: `nc.time.isToday()`, `nc.num.isPrime()`, `nc.sys.isWindows()`, `nc.env.isProduction()` |

```js
nc.obj.mapValues({ a: 1 }, (value, key) => key + value); // { a: "a1" }
nc.obj.mapKeys({ a: 1 }, (key, value) => key + value);   // { a1: 1 }
nc.arr.compact([0, "", null, 1, false]);                 // [1]
nc.obj.compact({ a: 0, b: null, c: "", d: undefined });  // { a: 0, c: "" }
```
