---
title: "nc.async"
description: "Promesses et concurrence : map avec une limite, files d'attente avec priorités, mutex, polling, et un `Promise.allSettled` plus agréable."
sidebar:
  label: "async"
  order: 15
---

```js
const { async } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const async = require("@ix-xs/node-comfort/async");
```

Cette page liste tout ce que contient `nc.async`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/flow/async/).

```js
const pages = await async.map(urls, (url) => fetchPage(url), { concurrency: 5 });

const limit = async.limit(2);
await Promise.all(files.map((file) => limit(() => upload(file))));

await async.poll(() => isServerReady(), { interval: 250, timeout: "10s" });
```

## sleep

```ts
sleep(duration: string | number, options?: { signal?: AbortSignal; } | undefined): Promise<void>
```

Attend un moment. Identique à `nc.wait()`.

```js
await async.sleep("250ms");
```

## map

```ts
map<T, R>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => R | PromiseLike<R>, options?: MapOptions): Promise<Awaited<R>[]>
```

Fait passer des éléments dans une fonction asynchrone, avec au plus `concurrency` appels à la fois. Les résultats restent dans l'ordre. Les éléments sont pris dans la source à mesure que des places se libèrent : un flux n'est donc jamais lu plus vite qu'il n'est traité.

**Lève** La première erreur, une `AggregateError` avec `stopOnError: false`, ou une `AbortError`.

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(readline.createInterface({ input }), importLine, { concurrency: 20 });
```

## forEach

```ts
forEach<T>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => unknown, options?: MapOptions): Promise<void>
```

Exécute une fonction asynchrone pour chaque élément, avec une limite de concurrence.

```js
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
```

## filter

```ts
filter<T>(items: Iterable<T> | AsyncIterable<T>, predicate: (item: T, index: number) => unknown, options?: MapOptions): Promise<T[]>
```

Garde les éléments qui passent un test asynchrone, avec une limite de concurrence. L'ordre est conservé.

```js
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

## series

```ts
series<T>(tasks: Iterable<() => T | PromiseLike<T>>): Promise<Awaited<T>[]>
```

Exécute des fonctions asynchrones l'une après l'autre et renvoie leurs résultats.

```js
await async.series([() => migrateUsers(), () => migrateOrders()]);
```

## parallel

```ts
parallel<T>(tasks: Iterable<() => T | PromiseLike<T>>, options?: MapOptions): Promise<Awaited<T>[]>
```

Exécute des fonctions asynchrones en même temps, ou quelques-unes à la fois avec `concurrency`, et renvoie leurs résultats dans l'ordre.

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 });
```

## limit

```ts
limit(concurrency: number): Limiter
```

Un limiteur : enveloppez vos appels avec, et au plus `concurrency` s'exécutent à la fois pendant que les autres attendent leur tour. Comme `p-limit`.

```js
const limit = async.limit(3);
const results = await Promise.all(urls.map((url) => limit(() => fetch(url))));
```

## rateLimit

```ts
rateLimit(max: number, interval: string | number): RateLimiter
```

Un limiteur de débit : au plus `max` appels démarrent dans n'importe quel `interval`. Conçu pour les API qui autorisent, par exemple, 10 requêtes par seconde.

| Paramètre | Type | Description |
| --- | --- | --- |
| `max` | `number` | Nombre d'appels qui peuvent démarrer par intervalle. |
| `interval` | `number \| string` | La fenêtre, en ms ou sous la forme `"1s"`. |

```js
const throttled = async.rateLimit(10, "1s");
const pages = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

## queue

```ts
queue(options?: QueueOptions): Queue
```

Une file d'attente de tâches avec une limite de concurrence, des priorités, une pause et des timeouts par tâche.

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });
jobs.add(() => sendEmail(a));
jobs.add(() => sendEmail(vip), { priority: 10 }); // passe devant tout le monde
await jobs.onIdle();
```

## mutex

```ts
mutex(): Mutex
```

Un mutex : les tâches confiées à `run()` ne se chevauchent jamais. Placez-le autour des étapes de lecture, modification puis écriture, comme la mise à jour d'un fichier ou le rafraîchissement d'un token.

```js
const lock = async.mutex();
await lock.run(async () => {
  const data = nc.readJSON("./counter.json", { n: 0 });
  nc.writeJSON("./counter.json", { n: data.n + 1 });
});
```

## deferred

```ts
deferred<T = void>(): Deferred<T>
```

Une promesse accompagnée de ses `resolve` et `reject`. Pratique pour relier des callbacks ou des événements à `await`.

```js
const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;
```

## settle

```ts
settle<T>(promises: Iterable<T | PromiseLike<T>>): Promise<Settled<Awaited<T>>>
```

Attend toutes les promesses et sépare les succès des échecs.

```js
const { fulfilled, rejected } = await async.settle(emails.map(send));
nc.info(`${fulfilled.length} sent, ${rejected.length} failed`);
```

## props

```ts
props<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]>; }>
```

Comme `Promise.all`, pour un objet de promesses.

```js
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });
```

## poll

```ts
poll<T>(fn: () => T | PromiseLike<T>, options?: PollOptions): Promise<NonNullable<Awaited<T>>>
```

Appelle `fn` jusqu'à ce qu'elle renvoie une valeur truthy, et résout avec celle-ci. Les erreurs comptent comme « pas encore ».

**Lève** `TimeoutError`

**Lève** `AbortError`

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

## abortable

```ts
abortable<T>(promise: T | PromiseLike<T>, signal?: AbortSignal): Promise<Awaited<T>>
```

Fait abandonner n'importe quelle promesse quand un signal se déclenche. Le travail derrière continue, sauf s'il écoute lui aussi le signal.

**Lève** `AbortError` : Quand le signal se déclenche en premier.

```js
const controller = new AbortController();
const rows = await async.abortable(slowQuery(), controller.signal);
```

## retry

```ts
retry<T>(fn: (attempt: number) => T | PromiseLike<T>, options?: RetryOptions): Promise<Awaited<T>>
```

Appelle `fn` jusqu'à ce qu'elle réussisse, en attendant entre les tentatives. Si toutes les tentatives échouent, la dernière erreur est levée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `(attempt: number) => ``T`` \| ``PromiseLike``<``T``>` | Reçoit le numéro de la tentative, à partir de 1. |
| `options?` | [`RetryOptions`](/reference/func/#retryoptions) |  |

**Lève** La dernière erreur, ou une `AbortError` si le signal se déclenche.

```js
const data = await func.retry(() => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2, // 200, 400, 800, 1600 ms
  shouldRetry: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
});
```

## timeout

```ts
timeout<T>(promise: PromiseLike<T> | ((signal: AbortSignal) => T | PromiseLike<T>), ms: string | number, message?: string): Promise<Awaited<T>>
```

Rejette avec une `TimeoutError` si la promesse prend plus de `ms`. Passez une fonction pour recevoir un `AbortSignal` qui se déclenche une fois le délai écoulé : le travail s'arrête alors vraiment au lieu de continuer en arrière-plan.

| Paramètre | Type | Description |
| --- | --- | --- |
| `promise` | `PromiseLike``<``T``> \| ((signal: ``AbortSignal``) => ``PromiseLike``<``T``> \| ``T``)` | Une promesse, ou une fonction qui en renvoie une. La fonction reçoit un signal qui est annulé à l'expiration du délai. |
| `ms` | `number \| string` | La limite, en ms ou sous la forme `"5s"`. `Infinity` signifie aucune limite. |
| `message?` | `string` |  |

**Lève** `TimeoutError`

```js
const res = await func.timeout(fetch(url), 5000);
const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { Deferred } from "@ix-xs/node-comfort"`.

### Deferred

Une promesse avec ses `resolve` et `reject`.

| Propriété | Type | Description |
| --- | --- | --- |
| `promise` | `Promise``<``T``>` |  |
| `resolve` | `(value: ``T`` \| ``PromiseLike``<``T``>) => void` |  |
| `reject` | `(reason?: unknown) => void` |  |
| `settled` | `boolean` | Indique si elle est déjà résolue ou rejetée. |

### Limiter

Un limiteur issu de `limit()`. Appelez-le avec une fonction pour l'exécuter dès qu'il y a de la place.

```ts
type Limiter = (<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly activeCount: number; readonly pendingCount: number; concurrency: number; clearQueue(): void; onIdle(): Promise<void>; }
```

### MapOptions

Options de `map()`, `forEach()` et `filter()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `concurrency?` | `number` | Nombre d'exécutions simultanées. Aucune limite par défaut. |
| `stopOnError?` | `boolean` | S'arrête à la première erreur. Avec `false`, tout s'exécute et vous obtenez une `AggregateError` de tous les échecs. Par défaut : `true`. |
| `signal?` | `AbortSignal` | Cesse de lancer de nouveaux travaux et rejette avec une `AbortError`. |

### Mutex

Un mutex issu de `mutex()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `run` | `<``T``>(fn: () => ``T`` \| ``PromiseLike``<``T``>) => ``Promise``<``Awaited``<``T``>>` | Exécute `fn` dès qu'aucun autre `run` n'est en cours. |
| `lock` | `() => ``Promise``<() => void>` | Attend le verrou et vous donne la fonction qui le libère. |
| `isLocked` | `boolean` |  |

### PollOptions

Options de `poll()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `interval?` | `string \| number` | Temps entre deux essais. Par défaut : 100 ms. |
| `timeout?` | `string \| number` | Abandonne avec une `TimeoutError` après cette durée. |
| `signal?` | `AbortSignal` | S'arrête avec une `AbortError`. |

### Queue

Une file d'attente issue de `queue()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `add` | `<``T``>(task: () => ``T`` \| ``PromiseLike``<``T``>, options?: `[`QueueAddOptions`](#queueaddoptions)`) => ``Promise``<``Awaited``<``T``>>` | Ajoute une tâche ; résout avec son résultat. |
| `addAll` | `<``T``>(tasks: (() => ``T`` \| ``PromiseLike``<``T``>)[], options?: `[`QueueAddOptions`](#queueaddoptions)`) => ``Promise``<``Awaited``<``T``>[]>` | Ajoute plusieurs tâches ; résout avec tous les résultats. |
| `pause` | `() => `[`Queue`](#queue) | Cesse de lancer des tâches. Celles en cours se terminent. |
| `start` | `() => `[`Queue`](#queue) | Reprend. |
| `clear` | `() => void` | Abandonne les tâches qui n'ont pas commencé. Leurs promesses ne sont jamais résolues ni rejetées. |
| `onIdle` | `() => ``Promise``<void>` | Résout quand rien n'est en attente ni en cours. |
| `onEmpty` | `() => ``Promise``<void>` | Résout quand rien n'est en attente. |
| `size` | `number` | Tâches en attente. |
| `pending` | `number` | Tâches en cours. |
| `isPaused` | `boolean` |  |
| `concurrency` | `number` | Peut être modifiée à la volée. |

### QueueAddOptions

Options de `queue.add()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `priority?` | `number` | La plus haute passe en premier ; les priorités égales gardent leur ordre. Par défaut : `0`. |

### QueueOptions

Options de `queue()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `concurrency?` | `number` | Nombre de tâches exécutées en même temps. Par défaut : `1`. |
| `autoStart?` | `boolean` | Démarre tout de suite. Par défaut : `true`. |
| `timeout?` | `string \| number` | Limite de temps par tâche, comme `"30s"`. Une tâche plus lente rejette avec une `TimeoutError`. |

### RateLimiter

Un limiteur de débit issu de `rateLimit()`. Appelez-le avec une fonction pour l'exécuter dès que le débit le permet.

```ts
type RateLimiter = (<T>(fn: () => T | PromiseLike<T>) => Promise<Awaited<T>>) & { readonly pendingCount: number; }
```

### Settled

Ce que renvoie `settle()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `fulfilled` | `T``[]` | Les valeurs des succès, dans l'ordre. |
| `rejected` | `unknown[]` | Les erreurs, dans l'ordre. |
| `results` | `PromiseSettledResult``<``T``>[]` | Tout, comme `Promise.allSettled`. |
