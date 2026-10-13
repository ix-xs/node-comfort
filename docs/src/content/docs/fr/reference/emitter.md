---
title: "Emitter"
description: "Un petit émetteur d'événements typé. Déclarez vos événements une fois, et votre éditeur vérifie chaque nom d'événement et chaque argument d'écouteur. `on()` renvoie une fonction qui retire l'écouteur, et vous pouvez attendre un événement avec `await` ou parcourir des événements avec `for await`."
sidebar:
  label: "Emitter"
  order: 17
---

```js
const { Emitter } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const Emitter = require("@ix-xs/node-comfort/emitter");
```

Cette page liste tout ce que contient `Emitter`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/flow/emitter/).

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

Écoute un événement.

**Renvoie** `() => void` : Retire l'écouteur.

```js
const off = emitter.on("data", (chunk) => chunks.push(chunk));
off(); // arrête d'écouter

const controller = new AbortController();
emitter.on("data", onData, { signal: controller.signal });
emitter.on("end", onEnd, { signal: controller.signal });
controller.abort(); // retire les deux
```

## once

```ts
once<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => unknown, options?: ListenOptions): () => void
```

Écoute un événement une seule fois.

**Renvoie** `() => void` : Retire l'écouteur s'il n'a pas encore été appelé.

## onAny

```ts
onAny(listener: (event: keyof Events & string, ...args: any[]) => unknown): () => void
```

Écoute tous les événements ; l'écouteur reçoit d'abord le nom de l'événement. Pratique pour la journalisation.

**Renvoie** `() => void` : Retire l'écouteur.

```js
emitter.onAny((event, ...args) => nc.debug(event, args));
```

## off

```ts
off<K extends keyof Events & string>(event: K, listener?: ((...args: Events[K]) => unknown) | undefined): Emitter<Events>
```

Retire un écouteur, ou tous les écouteurs de l'événement si vous n'en passez pas.

| Paramètre | Type | Description |
| --- | --- | --- |
| `event` | `K` |  |
| `listener?` | `(...args: ``Events``[``K``]) => unknown` | La fonction donnée à `on()` ou `once()`. |

## emit

```ts
emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean
```

Appelle tout de suite les écouteurs de l'événement, dans l'ordre où ils ont été ajoutés. Si l'un d'eux lève une erreur, elle se propage, comme avec l'`EventEmitter` de Node.

**Renvoie** `boolean` : `true` si quelqu'un écoutait.

```js
emitter.emit("message", "hello", "ada");
```

## emitAsync

```ts
emitAsync<K extends keyof Events & string>(event: K, ...args: Events[K]): Promise<unknown[]>
```

Appelle les écouteurs un par un, en attendant chacun, et résout avec ce qu'ils ont renvoyé. Adapté aux hooks qui peuvent être asynchrones.

```js
await hooks.emitAsync("beforeSave", record);
```

## waitFor

```ts
waitFor<K extends keyof Events & string>(event: K, options?: WaitForOptions<Events[K]>): Promise<Events[K]>
```

Attend le prochain déclenchement de l'événement et résout avec ses arguments.

**Lève** `TimeoutError`

**Lève** `AbortError`

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

## iterate

```ts
iterate<K extends keyof Events & string>(event: K, options?: { signal?: AbortSignal; } | undefined): AsyncIterableIterator<Events[K]>
```

Parcourt un événement avec `for await`. Les événements déclenchés pendant que le corps de votre boucle s'exécute sont mis en file d'attente, et quitter la boucle retire l'écouteur.

| Paramètre | Type | Description |
| --- | --- | --- |
| `event` | `K` |  |
| `options?` | `{ signal?: ``AbortSignal`` }` | Termine la boucle à l'annulation. |

```js
for await (const [job] of queue.iterate("job")) {
  await process(job);
}
```

## listenerCount

```ts
listenerCount(event?: (keyof Events & string) | undefined): number
```

Nombre d'écouteurs d'un événement, ou de tous les événements réunis. Les écouteurs `onAny` ne sont pas comptés.

## listeners

```ts
listeners<K extends keyof Events & string>(event: K): ((...args: Events[K]) => unknown)[]
```

Les écouteurs d'un événement, dans l'ordre où ils s'exécutent. Pour `once()`, vous obtenez la fonction que vous avez passée, pas son enveloppe.

## eventNames

```ts
eventNames(): (keyof Events & string)[]
```

Les événements qui ont des écouteurs.

## clear

```ts
clear(event?: (keyof Events & string) | undefined): Emitter<Events>
```

Retire tous les écouteurs d'un événement, ou tout si vous n'en nommez aucun.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { EventMap } from "@ix-xs/node-comfort"`.

### EventMap

Les noms d'événements associés à leurs arguments, comme `{ ready: [], data: [chunk: Buffer], error: [error: Error] }`.

```ts
type EventMap = Record<string, any[]>
```

### ListenOptions

Options de `on()` et `once()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `signal?` | `AbortSignal` | Retire l'écouteur à l'annulation. Un seul signal peut nettoyer de nombreux écouteurs d'un coup. |

### WaitForOptions

Options de `waitFor()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `timeout?` | `string \| number` | Rejette avec une `TimeoutError` après cette durée. |
| `signal?` | `AbortSignal` | Rejette avec une `AbortError` à l'annulation. |
| `filter?` | `((...args: ``A``) => boolean)` | Ne résout que pour les événements qui passent ce test. |
