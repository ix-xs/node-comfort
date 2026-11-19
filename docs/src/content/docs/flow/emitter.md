---
title: "Typed events"
description: "`nc.emitter` creates small event emitters whose events and arguments are declared once, so the editor checks every `on` and `emit`. Events can be awaited and looped over."
---

```js
const { emitter } = require("@ix-xs/node-comfort");
```

## Creating an emitter

```ts
const chat = emitter.create<{ message: [text: string, from: string]; close: [] }>();

const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
chat.emit("message", "hello", "ada"); // ada: hello
chat.emit("mesage", "hi");            // type error: unknown event
off();
```

`emitter.create()` is `new emitter.Emitter()`. Extend the class to give a class of yours typed events:

```ts
class Job extends emitter.Emitter<{ done: [result: string] }> {
  run() {
    this.emit("done", "ok");
  }
}
```

In JavaScript, declare the events with JSDoc:

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>} */
const events = emitter.create();
```

## Listening

```js
const off = events.on("ready", onReady); // returns a function that removes the listener
events.once("ready", onReady);           // runs one time only
events.onAny((name, ...args) => console.log(name, args));

events.off("ready", onReady); // one listener, also one added with once() that has not run
events.off("ready");          // every "ready" listener
events.clear();               // everything
```

| Method | Returns |
| --- | --- |
| `on(event, listener, { signal })` | A function that removes the listener |
| `once(event, listener, { signal })` | Same |
| `onAny(listener)` | Same; the listener gets the event name first |
| `off(event, listener?)` | The emitter |
| `clear(event?)` | The emitter |

Here `on()` returns an unsubscribe function. Elsewhere in the library (`nc.fs.watch()`, `nc.async.when()`), `on()` returns the object, so calls chain.

The function that `on`, `once` and `onAny` return works with `using`, which removes the listener at the end of the block:

```js
{
  using off = events.on("ready", onReady);
  await startServer();
} // the listener is removed here
```

## One signal for many listeners

When the signal aborts, every listener added with it is removed. With a signal already aborted, nothing is added.

```js
const controller = new AbortController();

chat.on("message", onMessage, { signal: controller.signal });
chat.once("close", onClose, { signal: controller.signal });

controller.abort(); // removes both
```

## Emitting

| Method | Does |
| --- | --- |
| `emit(event, ...args)` | Calls the listeners now, in the order they were added. Returns whether there was one. A listener that throws stops the call and the error propagates, as with Node's `EventEmitter` |
| `emitAsync(event, ...args)` | Calls them one after another, awaiting each, and resolves with what they returned |

```js
hooks.on("beforeSave", async (record) => validate(record));
await hooks.emitAsync("beforeSave", record);
```

## Waiting for an event

`waitFor` resolves with the arguments of the next matching event:

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

| Option | |
| --- | --- |
| `timeout` | Rejects with a `TimeoutError`. `false` or `Infinity`: no limit, the default |
| `signal` | Rejects with an `AbortError` |
| `filter` | `(...args) => boolean`: only these events count |

## Looping over events

```js
for await (const [job] of jobs.iterate("job")) {
  await handle(job);
}
```

Events that arrive while the loop is busy are queued. Leaving the loop removes the listener. `iterate(event, { signal })` ends the loop from outside.

## Who is listening

```js
events.listenerCount("ready"); // 2
events.listeners("ready");     // [onReady, logReady], in the order they run
events.eventNames();           // ["ready"]
```

`onAny` listeners are not counted. For a listener added with `once`, `listeners` gives the function that was passed.

## Importing the class alone

The subpath exports the class, with a static `create`:

```js
const Emitter = require("@ix-xs/node-comfort/emitter");

const events = Emitter.create();
```

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `new nc.Emitter()` | `nc.emitter.create()` or `new nc.emitter.Emitter()` |
| `class Job extends nc.Emitter {}` | `class Job extends nc.emitter.Emitter {}` |

`nc.Emitter` still works, warns once, and is removed in 4.0.
