# Typed events

`nc.Emitter` is a small event emitter where the events and their arguments are declared once. Your editor then checks every `on` and `emit`.

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
events.once("ready", () => {});
events.onAny((name, ...args) => nc.debug(name, args));        // every event, handy for logs
events.off("ready");                                          // all "ready" listeners
events.clear();                                               // everything
```

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

`waitFor` rejects with a `TimeoutError` after `timeout`, or an `AbortError` if you pass a signal that fires.

## Looping over events

```js
for await (const [job] of queue.iterate("job")) {
  await process(job);
}
```

Events that arrive while your loop is busy are queued. Leaving the loop removes the listener.
