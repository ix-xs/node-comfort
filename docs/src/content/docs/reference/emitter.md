---
title: "Emitter"
description: "A small typed event emitter. Declare your events once, and your editor checks every event name and listener argument. `on()` returns a function that removes the listener, and you can `await` an event or loop over events with `for await`."
sidebar:
  label: "Emitter"
  order: 17
---

```js
const { Emitter } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const Emitter = require("@ix-xs/node-comfort/emitter");
```

This page lists everything `Emitter` has, as your editor shows it. For explanations and longer examples, read [the guide](/flow/emitter/).

```js
const chat = new nc.Emitter<{ message: [text: string, from: string]; close: [] }>();
const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
chat.emit("message", "hello", "ada");
off();
const [text] = await chat.waitFor("message", { timeout: "5s" });
```

## constructor

```ts
new Emitter<Events extends EventMap = EventMap>(): Emitter<Events>
```

## on

```ts
on<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => unknown, options?: ListenOptions): () => void
```

Listens to an event.

**Returns** `() => void`: Removes the listener.

```js
const off = emitter.on("data", (chunk) => chunks.push(chunk));
off(); // stop listening

const controller = new AbortController();
emitter.on("data", onData, { signal: controller.signal });
emitter.on("end", onEnd, { signal: controller.signal });
controller.abort(); // removes both
```

## once

```ts
once<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => unknown, options?: ListenOptions): () => void
```

Listens to an event once.

**Returns** `() => void`: Removes the listener if it hasn't run yet.

## onAny

```ts
onAny(listener: (event: keyof Events & string, ...args: any[]) => unknown): () => void
```

Listens to every event; the listener gets the event name first. Handy for
logging.

**Returns** `() => void`: Removes the listener.

```js
emitter.onAny((event, ...args) => nc.debug(event, args));
```

## off

```ts
off<K extends keyof Events & string>(event: K, listener?: ((...args: Events[K]) => unknown) | undefined): Emitter<Events>
```

Removes a listener, or all listeners of the event if you don't pass one.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `K` |  |
| `listener?` | `(...args: ``Events``[``K``]) => unknown` | The function given to `on()` or `once()`. |

## emit

```ts
emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean
```

Calls the event's listeners right away, in the order they were added.
If one throws, the error propagates, as with Node's `EventEmitter`.

**Returns** `boolean`: `true` if anyone was listening.

```js
emitter.emit("message", "hello", "ada");
```

## emitAsync

```ts
emitAsync<K extends keyof Events & string>(event: K, ...args: Events[K]): Promise<unknown[]>
```

Calls the listeners one at a time, waiting for each, and resolves with
what they returned. Good for hooks that may be async.

```js
await hooks.emitAsync("beforeSave", record);
```

## waitFor

```ts
waitFor<K extends keyof Events & string>(event: K, options?: WaitForOptions<Events[K]>): Promise<Events[K]>
```

Waits for the next time the event fires and resolves with its arguments.

**Throws** `TimeoutError`

**Throws** `AbortError`

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

## iterate

```ts
iterate<K extends keyof Events & string>(event: K, options?: { signal?: AbortSignal; } | undefined): AsyncIterableIterator<Events[K]>
```

Loops over an event with `for await`. Events that fire while your loop
body runs are queued, and leaving the loop removes the listener.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | `K` |  |
| `options?` | `{ signal?: ``AbortSignal`` }` | Ends the loop when aborted. |

```js
for await (const [job] of queue.iterate("job")) {
  await process(job);
}
```

## listenerCount

```ts
listenerCount(event?: (keyof Events & string) | undefined): number
```

How many listeners an event has, or all events together. `onAny`
listeners aren't counted.

## listeners

```ts
listeners<K extends keyof Events & string>(event: K): ((...args: Events[K]) => unknown)[]
```

The listeners of an event, in the order they run. For `once()`, you get
the function you passed, not its wrapper.

## eventNames

```ts
eventNames(): (keyof Events & string)[]
```

The events that have listeners.

## clear

```ts
clear(event?: (keyof Events & string) | undefined): Emitter<Events>
```

Removes all listeners of an event, or everything if you don't name one.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { EventMap } from "@ix-xs/node-comfort"`.

### EventMap

Event names mapped to their arguments, like
`{ ready: [], data: [chunk: Buffer], error: [error: Error] }`.

```ts
type EventMap = Record<string, any[]>
```

### ListenOptions

Options for `on()` and `once()`.

| Property | Type | Description |
| --- | --- | --- |
| `signal?` | `AbortSignal` | Removes the listener when aborted. One signal can clean up many listeners at once. |

### WaitForOptions

Options for `waitFor()`.

| Property | Type | Description |
| --- | --- | --- |
| `timeout?` | `string \| number` | Reject with a `TimeoutError` after this long. |
| `signal?` | `AbortSignal` | Reject with an `AbortError` when aborted. |
| `filter?` | `((...args: ``A``) => boolean)` | Only resolve for events that pass this test. |
