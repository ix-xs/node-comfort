---
title: "Typed events"
description: "`nc.Emitter` is a small event emitter where the events and their arguments are declared once. Your editor then checks every `on` and `emit`."
sidebar:
  order: 4
---

```ts
const chat = new nc.Emitter<{ message: [text: string, from: string]; close: [] }>();

const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
chat.emit("message", "hello", "ada");
chat.emit("mesage", "hi");   // error: unknown event
off();                       // stop listening
```

In JavaScript, declare the type with JSDoc:

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>} */
const events = new nc.Emitter();
```

## Listening

```js
events.on("ready", (port) => nc.info(`Listening on ${port}`)); // returns a function that removes it
events.once("ready", onReady);                                 // runs one time only
events.onAny((name, ...args) => nc.debug(name, args));        // every event, handy for logs

events.off("ready", onReady); // one listener
events.off("ready");          // all "ready" listeners
events.clear();               // everything
```

`off(event, listener)` takes the function you gave to `on` or `once`. A listener added with `once` can be removed this way before it has run.

## One signal for many listeners

`on` and `once` accept a `signal`. When it aborts, the listener is removed:

```js
const controller = new AbortController();

chat.on("message", onMessage, { signal: controller.signal });
chat.once("close", onClose, { signal: controller.signal });

controller.abort(); // removes both
```

This saves you from keeping one remove function per listener. With a signal that is already aborted, nothing is added.

## Emitting

`emit` calls listeners right away, in the order they were added, and returns whether anyone was listening. If a listener throws, the error propagates, as with Node's `EventEmitter`.

`emitAsync` calls them one after another, waiting for each, and resolves with what they returned. It's a good fit for hooks:

```js
await hooks.emitAsync("beforeSave", record);
```

## Waiting for an event

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

`waitFor` rejects with a `TimeoutError` after `timeout`, or an `AbortError` if you pass a signal that fires. The timeout is in milliseconds or text such as `"30s"` or `"2m"`.

## Looping over events

```js
for await (const [job] of queue.iterate("job")) {
  await process(job);
}
```

Events that arrive while your loop is busy are queued. Leaving the loop removes the listener. Pass a `signal` to end the loop from outside.

## Who is listening

```js
events.listenerCount("ready"); // 2
events.listeners("ready");     // [onReady, logReady], in the order they run
events.eventNames();           // ["ready"]
```

For a listener added with `once`, `listeners` gives you the function you passed. `onAny` listeners are not counted.
