---
title: "Utils"
description: "A handful of small helpers, all available at the top level."
sidebar:
  order: 6
---

## wait

```js
await nc.wait(500);
await nc.wait("2s");
await nc.wait("1m", { signal: controller.signal }); // rejects with an AbortError if aborted
await nc.wait("30d");                               // long waits are fine too
```

Durations can be milliseconds or strings like `"250ms"`, `"1m30s"` and `"2h"`, as everywhere in node-comfort. A wait can be longer than the 24.8 days `setTimeout` stops at. A duration that can't be read rejects with a `TypeError`.

Pass `unref: true` when the wait shouldn't keep the process alive on its own.

## Safe JSON

`JSONString()` never throws. Circular references become `"[Circular]"`, bigints become strings, Maps become objects, Sets become arrays, and errors keep their name, message and stack:

```js
nc.JSONString({ id: 10n, tags: new Set(["a"]) }, 0); // '{"id":"10","tags":["a"]}'
nc.JSONString({ error: new Error("boom") }, 0);      // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
```

The second argument is the indentation: 4 spaces by default, `0` for a single line. An error also keeps its own fields, such as a `code`, and its `cause`. If a getter or a `toJSON()` throws along the way, you get a description of the value as text instead of an exception.

`JSONParse()` takes a fallback. With one, invalid input returns the fallback instead of throwing:

```js
const settings = nc.JSONParse(raw, {});
const strict = nc.JSONParse(raw); // throws SyntaxError on invalid input
const event = nc.JSONParse(raw, null, (key, value) => (key === "at" ? new Date(value) : value));
```

The third argument is a reviver, as in `JSON.parse`. A byte order mark at the start of the text, which some Windows editors add, is ignored.

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

It only ever removes its own handlers; listeners from your code or other libraries stay in place. `dispose()` on the returned object removes everything it installed. For a full graceful shutdown with timeouts, see [`sys.onShutdown()`](/system/sys/).

## when

Checks a condition at an interval and emits events. Remember to call `.start()`:

```js
nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.info(payload.reason))
  .on("timeout", () => nc.warn("Nothing happened in 10s"))
  .start();
```

`"trigger"` fires at every check where the condition is true. `max` stops the task after that many triggers, and `timeout` stops it after that long, whatever happened before. Without either, it runs until you call `.stop()`.

To wait until something is true, [`async.poll()`](/flow/async/) returns a promise and is usually easier.
