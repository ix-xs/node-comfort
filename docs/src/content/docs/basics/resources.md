---
title: "Resources"
description: "What holds a file, a timer or a listener, how to release it with `using`, a signal or a clean shutdown, and which timers keep the process alive."
---

## The objects to release

| Object | Release with | Released by `using` |
| --- | --- | --- |
| `nc.sqlite.open()` | `db.close()` | Yes |
| `nc.time.every()`, `nc.time.cron()` | `task.stop()`, or `signal` | Yes |
| `nc.fs.watch()` | `watcher.stop()` | Yes |
| `nc.async.when()` | `task.stop()`, or `signal` | Yes |
| `nc.cli.spinner()`, `nc.cli.progress()` | `stop()`, `succeed()`, `fail()` | Yes |
| `nc.sys.dontCrash()` | `dispose()` | Yes |
| `nc.sys.onShutdown(handler)` | The function it returns | Yes |
| `nc.emitter` listeners | The function `on()` returns, or `signal` | No |

## using

A `using` declaration releases the object at the end of the block, even when the block throws:

```js
function exportReport(path) {
  using db = nc.sqlite.open(path);
  return db.getAll("orders", { status: "paid" });
} // db.close() has run

{
  using watcher = nc.fs.watch("./src").on("change", rebuild);
  await nc.async.sleep("1m");
} // the watcher is stopped
```

`using` needs a runtime that supports explicit resource management (Node.js 24 or later) or TypeScript 5.2 or later.

## Signals

An `AbortSignal` stops several things at once: requests, commands, schedules, listeners, prompts. When it fires, what is waiting rejects with an `AbortError`.

```js
const controller = new AbortController();

nc.time.every("10s", refresh, { signal: controller.signal });
events.on("message", handle, { signal: controller.signal });
const page = nc.http.get(url, { signal: controller.signal });

controller.abort(); // the schedule stops, the listener is removed, the request rejects
```

`AbortSignal.timeout(ms)` gives a signal that fires after a delay. The full list of functions that take `signal` is in [Conventions](/basics/conventions/).

## Shutting down

`nc.sys.onShutdown()` runs cleanup code when the process is asked to stop: Ctrl+C, `docker stop`, `kill`, a process manager.

```js
const db = nc.sqlite.open("data/app.sqlite");
const server = app.listen(3000);
const job = nc.time.every("5m", sync);

nc.sys.onShutdown(async (reason) => {
  nc.logger.info(`Stopping (${reason})`);
  job.stop();
  await new Promise((done) => server.close(done));
  db.close();
});
```

| | |
| --- | --- |
| Order | Handlers run in reverse order of registration, then the process exits |
| Signals | `SIGINT`, `SIGTERM` and `SIGHUP` by default (`signals` option) |
| Time limit | 10 seconds (`timeout` option), then the exit is forced. A second Ctrl+C exits at once |
| Exit code | `0` (`exitCode` option), `1` if a handler throws |
| From code | `nc.sys.shutdown(code)` runs the same handlers, instead of `process.exit()` |

`nc.sys.dontCrash()` logs uncaught exceptions and unhandled rejections instead of crashing: see [Processes and system](/system/sys/).

## Timers and the event loop

A schedule or a wait keeps the process alive, like `setInterval`. With `unref: true` it does not: the process exits when nothing else is left to do.

```js
nc.time.every("1h", flushMetrics, { unref: true });
await nc.async.sleep("30s", { unref: true }); // never resolves if the process has nothing else to do
```

| Function | `unref` |
| --- | --- |
| `nc.time.every`, `nc.time.cron` | Yes |
| `nc.async.sleep` | Yes |
| Requests, commands, prompts | No: they are what the program is waiting for |
