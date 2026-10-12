---
title: "nc.utils"
description: "Everyday helpers: `wait`, `when`, `dontCrash`, and JSON functions that don't throw. They are also available at the top level (`nc.wait()`)."
sidebar:
  label: "utils"
  order: 6
---

```js
const { utils } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const utils = require("@ix-xs/node-comfort/utils");
```

These functions are also at the top level: `nc.wait()` is `nc.utils.wait()`.

This page lists everything `nc.utils` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/utils/).

```js
await nc.wait("1.5s");
const settings = nc.JSONParse(text, {});
```

## wait

```ts
wait(duration: string | number, options?: WaitOptions): Promise<void>
```

Resolves after a delay, given in milliseconds or as a duration string.

| Parameter | Type | Description |
| --- | --- | --- |
| `duration` | `number \| string` | Milliseconds, or a string like `"250ms"`, `"2s"`, `"1m30s"`. |
| `options?` | [`WaitOptions`](#waitoptions) |  |

**Throws** `AbortError`: If the signal is aborted.

**Throws** `TypeError`: If the duration can't be parsed.

```js
await nc.wait(500);
await nc.wait("2s");
await nc.wait("1m", { signal: controller.signal });
```

## when

```ts
when(predicate: boolean | PromiseLike<boolean> | (() => unknown), payload?: any, options?: WhenOptions): WhenTask
```

Checks a condition at a regular interval and tells you when it's true.
Call `.start()` once your listeners are in place. If you just want to
await a condition, `nc.async.poll()` is simpler.

| Parameter | Type | Description |
| --- | --- | --- |
| `predicate` | `boolean \| ``PromiseLike``<boolean> \| (() => unknown)` | The condition, or a function (sync or async) that returns it. |
| `payload?` | `any` | Passed to the `"trigger"` and `"timeout"` listeners. Defaults to `{}`. |
| `options?` | [`WhenOptions`](#whenoptions) |  |

```js
nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.info(payload.reason))
  .on("timeout", () => nc.warn("Nothing happened in 10s"))
  .start();
```

## dontCrash

```ts
dontCrash(): DontCrashController
```

Keeps the process alive when something goes wrong. Uncaught exceptions and
unhandled rejections are logged instead of crashing, and `SIGINT`/`SIGTERM`
are logged before a clean exit. Customize any of it with `.on()`.

Only its own handlers are ever removed; listeners added by your code or by
other libraries are left alone.

```js
nc.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

## JSONString

```ts
JSONString(value: unknown, spaces?: number): string
```

`JSON.stringify` that never throws. Circular references become
`"[Circular]"`, bigints become strings, Maps become objects, Sets become
arrays, and errors keep their name, message and stack.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `spaces?` | `number` | Indentation. Use `0` for a single line. Defaults to `4`. |

**Returns** `string`: The JSON text, or `"undefined"` for values JSON can't represent.

```js
nc.JSONString({ a: 1 });                          // '{\n    "a": 1\n}'
nc.JSONString({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
nc.JSONString({ error: new Error("boom") }, 0);   // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
```

## JSONParse

```ts
JSONParse<T = any>(text: string, fallback?: T, reviver?: ((this: any, key: string, value: any) => any) | undefined, ...args: any[]): T
```

`JSON.parse` with an optional fallback. With a fallback, invalid input
returns it instead of throwing. A leading byte order mark, which Windows
editors like to add, is ignored.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `fallback?` | `T` | Returned when `text` isn't valid JSON. |
| `reviver?` | `(this: any, key: string, value: any) => any` | Passed to `JSON.parse`. |
| `...args` | `any[]` |  |

**Throws** `SyntaxError`: If `text` is invalid and there's no fallback.

```js
nc.JSONParse('{"a":1}');    // { a: 1 }
nc.JSONParse("oops", null); // null
nc.JSONParse("oops");       // throws SyntaxError
nc.JSONParse(text, {}, (key, value) => (key === "at" ? new Date(value) : value));
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { DontCrashController } from "@ix-xs/node-comfort"`.

### DontCrashController

Returned by `dontCrash()`.

| Property | Type | Description |
| --- | --- | --- |
| `on` | `<``E`` extends `[`DontCrashEvent`](#dontcrashevent)`>(event: ``E``, handler?: (``E`` extends "error" ? (error: unknown) => void : ``E`` extends "sig" ? (signal: ``Signals``) => void : (code: number) => void) \| undefined) => `[`DontCrashController`](#dontcrashcontroller) | Replaces the handler for an event. Call it without a handler to restore the default one. |
| `dispose` | `() => void` | Removes everything `dontCrash()` installed. |

### DontCrashEvent

Events you can customize on `dontCrash()`.

```ts
type DontCrashEvent = "error" | "exit" | "sig" | "beforeExit"
```

### WaitOptions

Options for `wait()`.

| Property | Type | Description |
| --- | --- | --- |
| `signal?` | `AbortSignal` | Cancels the wait; the promise rejects with an `AbortError`. |
| `unref?` | `boolean` | Let the process exit even if the timer is still pending. |

### WhenOptions

Options for `when()`.

| Property | Type | Description |
| --- | --- | --- |
| `interval?` | `string \| number` | Time between two checks, in ms or like `"1s"`. Defaults to `50`. |
| `timeout?` | `string \| number \| null` | Give up after this long, in ms or like `"10s"`, and emit `"timeout"`. |
| `max?` | `number \| null` | Stop after this many triggers. |

### WhenTask

The task returned by `when()`. Every method returns the task, so calls chain.

| Property | Type | Description |
| --- | --- | --- |
| `start` | `() => `[`WhenTask`](#whentask) | Starts checking. A stopped task can't be restarted. |
| `stop` | `() => `[`WhenTask`](#whentask) | Stops checking and clears the timers. |
| `on` | `<``E`` extends "trigger" \| "error" \| "timeout">(event: ``E``, handler: ``E`` extends "error" ? (error: unknown) => void : (payload: any) => void) => `[`WhenTask`](#whentask) | Listens to `"trigger"` (the condition is true), `"error"` (it threw) or `"timeout"`. |
