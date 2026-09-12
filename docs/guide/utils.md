# Utils

A handful of small helpers, all available at the top level.

## wait

```js
await nc.wait(500);
await nc.wait("2s");
await nc.wait("1m", { signal: controller.signal }); // rejects with an AbortError if aborted
```

Durations can be milliseconds or strings like `"250ms"`, `"1m30s"` and `"2h"`, as everywhere in node-comfort.

## Safe JSON

`JSONString()` never throws. Circular references become `"[Circular]"`, bigints become strings, Maps become objects and Sets become arrays:

```js
nc.JSONString({ id: 10n, tags: new Set(["a"]) }, 0); // '{"id":"10","tags":["a"]}'
```

`JSONParse()` takes a fallback. With one, invalid input returns the fallback instead of throwing:

```js
const settings = nc.JSONParse(raw, {});
const strict = nc.JSONParse(raw); // throws SyntaxError on invalid input
```

## dontCrash

Keeps a long-running process alive when something unexpected happens. Uncaught exceptions and unhandled rejections are logged instead of killing the process, and `SIGINT`/`SIGTERM` are logged before a clean exit:

```js
nc.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

It only ever removes its own handlers; listeners from your code or other libraries stay in place. For a full graceful shutdown with timeouts, see [`sys.onShutdown()`](sys.html).

## when

Checks a condition at an interval and emits events. Remember to call `.start()`:

```js
nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, timeout: 10_000 })
  .on("trigger", (payload) => nc.info(payload.reason))
  .on("timeout", () => nc.warn("Nothing happened in 10s"))
  .start();
```

To wait until something is true, [`async.poll()`](async.html) returns a promise and is usually easier.
