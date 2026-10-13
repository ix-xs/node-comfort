---
title: "nc.func"
description: "Utilitaires pour les fonctions : debounce, throttle, mémoïsation, nouvelles tentatives avec backoff, timeouts, gestion des erreurs sans try/catch et composition typée."
sidebar:
  label: "func"
  order: 14
---

```js
const { func } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const func = require("@ix-xs/node-comfort/func");
```

Cette page liste tout ce que contient `nc.func`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/flow/func/).

```js
const save = func.debounce(persist, 300);
const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
const [error, user] = await func.to(getUser(id));
```

## debounce

```ts
debounce<F extends (...args: any[]) => any>(fn: F, wait: string | number, options?: DebounceOptions): DebouncedFunction<F>
```

Attend une pause de `wait` ms entre les appels, puis s'exécute une seule fois avec les derniers arguments. Pour les champs de recherche, le redimensionnement, l'enregistrement automatique...

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `wait` | `number \| string` | Pause nécessaire, en ms ou sous la forme `"300ms"`. |
| `options?` | [`DebounceOptions`](#debounceoptions) |  |

```js
const search = func.debounce((query) => api.search(query), 300);
input.on("input", (e) => search(e.target.value));

const save = func.debounce(persist, 1000, { maxWait: 5000 }); // enregistre au moins toutes les 5 s
```

## throttle

```ts
throttle<F extends (...args: any[]) => any>(fn: F, interval: string | number, options?: ThrottleOptions): ThrottledFunction<F>
```

S'exécute au plus une fois toutes les `interval` ms, quel que soit le nombre d'appels. Pour les gestionnaires de défilement, les rapports de progression, les API à débit limité...

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `interval` | `number \| string` | Écart minimal entre deux appels, en ms ou sous la forme `"1s"`. |
| `options?` | [`ThrottleOptions`](#throttleoptions) |  |

```js
const report = func.throttle((pct) => console.log(`${pct}%`), 1000);
```

## once

```ts
once<F extends (...args: any[]) => any>(fn: F): F
```

Exécute `fn` la première fois seulement ; les appels suivants renvoient le même résultat.

```js
const connect = func.once(() => createPool(config));
```

## memoize

```ts
memoize<F extends (...args: any[]) => any>(fn: F, options?: MemoizeOptions | ((...args: Parameters<F>) => unknown) | undefined): MemoizedFunction<F>
```

Met les résultats en cache selon les arguments. Gère l'expiration (`ttl`), une limite de taille (`max`) et les fonctions asynchrones : une promesse qui échoue n'est pas mise en cache, le prochain appel réessaie donc.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `options?` | [`MemoizeOptions`](#memoizeoptions)` \| ((...args: ``Parameters``<``F``>) => unknown)` | Les options, ou une fonction qui construit la clé de cache. |

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: 60_000, max: 1000 });
getUser.delete(42); // oublie une entrée
getUser.clear();    // oublie tout
```

## retry

```ts
retry<T>(fn: (attempt: number) => T | PromiseLike<T>, options?: RetryOptions): Promise<Awaited<T>>
```

Appelle `fn` jusqu'à ce qu'elle réussisse, en attendant entre les tentatives. Si toutes les tentatives échouent, la dernière erreur est levée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `(attempt: number) => ``T`` \| ``PromiseLike``<``T``>` | Reçoit le numéro de la tentative, à partir de 1. |
| `options?` | [`RetryOptions`](#retryoptions) |  |

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

## delay

```ts
delay<F extends (...args: any[]) => any>(fn: F, ms: string | number, ...args: Parameters<F>): Promise<Awaited<ReturnType<F>>>
```

Attend `ms`, puis appelle `fn` avec les arguments et résout avec son résultat.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `ms` | `number \| string` | En ms, ou sous la forme `"2s"`. |
| `...args` | `Parameters``<``F``>` |  |

```js
await func.delay(() => console.log("1s later"), 1000);
```

## to

```ts
to<T, E = Error>(promise: PromiseLike<T> | (() => T | PromiseLike<T>)): Promise<[E, undefined] | [null, Awaited<T>]>
```

Attend une promesse et vous donne `[error, value]` au lieu de lever une erreur : plus besoin de try/catch.

| Paramètre | Type | Description |
| --- | --- | --- |
| `promise` | `PromiseLike``<``T``> \| (() => ``PromiseLike``<``T``> \| ``T``)` | Une promesse, ou une fonction (les erreurs synchrones sont interceptées aussi). |

```js
const [error, user] = await func.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
```

## attempt

```ts
attempt<F extends (...args: any[]) => any>(fn: F): (...args: Parameters<F>) => Promise<[unknown, undefined] | [null, Awaited<ReturnType<F>>]>
```

Enveloppe une fonction pour qu'elle résolve avec `[error, value]` au lieu de lever une erreur.

```js
const safeParse = func.attempt(JSON.parse);
const [error, data] = await safeParse(input);
```

## promisify

```ts
promisify(fn: (...args: any[]) => void): (...args: any[]) => Promise<any>
```

Transforme une fonction à callback en une fonction qui renvoie une promesse.

```js
const lookup = func.promisify(dns.lookup);
const address = await lookup("nodejs.org");
```

## batch

```ts
batch<I, R>(fn: (items: I[]) => readonly (Error | R)[] | Map<I, Error | R> | PromiseLike<readonly (Error | R)[] | Map<I, Error | R>>, options?: BatchOptions): BatchedFunction<I, R>
```

Transforme de nombreux appels unitaires en quelques appels groupés. Les appels rapprochés sont rassemblés, `fn` s'exécute une seule fois avec tous leurs éléments, et chaque appelant reçoit son propre résultat. Le remède classique aux « requêtes N+1 ».

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `(items: ``I``[]) => ``ReadonlyArray``<``R`` \| ``Error``> \| ``Map``<``I``, ``R`` \| ``Error``> \| ``PromiseLike``<``ReadonlyArray``<``R`` \| ``Error``> \| ``Map``<``I``, ``R`` \| ``Error``>>` | Reçoit tous les éléments en attente et renvoie un résultat par élément, dans le même ordre, ou une `Map` indexée par élément. Une `Error` en guise de résultat ne rejette que cet appel. |
| `options?` | [`BatchOptions`](#batchoptions) |  |

```js
const loadUser = func.batch(async (ids) => {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});
// Une seule requête, quel que soit le nombre d'endroits qui demandent en même temps :
const [ada, bob] = await Promise.all([loadUser(1), loadUser(2)]);
```

## dedupe

```ts
dedupe<F extends (...args: any[]) => any>(fn: F, keyOf?: ((...args: Parameters<F>) => unknown) | undefined): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>
```

Fait partager une seule exécution aux appels simultanés qui ont les mêmes arguments. Une fois celle-ci terminée, l'appel suivant en lance une nouvelle : rien n'est mis en cache.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `F` |  |
| `keyOf?` | `(...args: ``Parameters``<``F``>) => unknown` | Construit la clé qui identifie un appel. Par défaut : ses arguments. |

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);
// Dix requêtes reçoivent un 401 en même temps : un seul rafraîchissement, dix réponses.
```

## pipe

```ts
pipe<A extends any[], B>(f1: (...args: A) => B): (...args: A) => B
pipe<A extends any[], B, C>(f1: (...args: A) => B, f2: (b: B) => C): (...args: A) => C
pipe<A extends any[], B, C, D>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D): (...args: A) => D
pipe<A extends any[], B, C, D, E>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E): (...args: A) => E
pipe<A extends any[], B, C, D, E, F>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F): (...args: A) => F
pipe<A extends any[], B, C, D, E, F, G>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G): (...args: A) => G
pipe(...fns: ((arg: any) => any)[]): (...args: any[]) => any
```

Enchaîne des fonctions de gauche à droite : `pipe(f, g)(x)` vaut `g(f(x))`. Les types sont suivis jusqu'à 6 fonctions.

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"
```

## pipeAsync

```ts
pipeAsync(...fns: ((...args: any[]) => any)[]): (...args: any[]) => Promise<any>
```

Comme `pipe()`, pour des fonctions qui peuvent être asynchrones : chacune est attendue avant que la suivante s'exécute.

```js
const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN);
const url = await publish(postId);
```

## compose

```ts
compose(...fns: ((...args: any[]) => any)[]): (...args: any[]) => any
```

Enchaîne des fonctions de droite à gauche : `compose(f, g)(x)` vaut `f(g(x))`. `pipe()` se lit dans l'ordre d'exécution et est mieux typée.

```js
const shout = func.compose((s) => s + "!", (s) => s.toUpperCase());
shout("hi"); // "HI!"
```

## curry

```ts
curry(fn: (...args: any[]) => any, arity?: number): (...args: any[]) => any
```

Permet de passer les arguments d'une fonction quelques-uns à la fois.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `(...args: any[]) => any` |  |
| `arity?` | `number` | Nombre d'arguments à réunir avant l'appel. Par défaut : `fn.length`. |

```js
const add = func.curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6
```

## partial

```ts
partial<P extends any[], R extends any[], T>(fn: (...args: [...P, ...R]) => T, ...preset: P): (...args: R) => T
```

Fixe les premiers arguments d'une fonction.

```js
const hello = func.partial((greeting, name) => `${greeting}, ${name}!`, "Hello");
hello("Ada"); // "Hello, Ada!"
```

## negate

```ts
negate<A extends any[]>(predicate: (...args: A) => unknown): (...args: A) => boolean
```

L'inverse d'un prédicat.

```js
files.filter(func.negate((name) => name.startsWith(".")));
```

## after

```ts
after<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Ne fait rien pendant les `n - 1` premiers appels, puis appelle `fn` à chaque fois.

```js
const done = func.after(3, () => console.log("All 3 uploads finished"));
uploads.forEach((upload) => upload.on("end", done));
```

## before

```ts
before<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Appelle `fn` pendant les `n - 1` premiers appels, puis renvoie toujours le dernier résultat.

```js
const tryLogin = func.before(4, login); // 3 real attempts at most
```

## noop

```ts
noop(..._args: unknown[]): void
```

Ne fait rien. Utile comme callback par défaut.

## identity

```ts
identity<T>(value: T): T
```

Renvoie son argument.

```js
[0, 1, 2].filter(func.identity); // [1, 2]
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { BatchedFunction } from "@ix-xs/node-comfort"`.

### BatchedFunction

Une fonction qui regroupe ses appels. `flush()` exécute tout de suite les appels en attente.

```ts
type BatchedFunction = ((item: I) => Promise<R>) & { flush(): void; }
```

### BatchOptions

Options de `batch()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `wait?` | `string \| number` | Durée pendant laquelle les appels sont rassemblés avant l'exécution. Par défaut, les appels faits dans le même tick partent ensemble. |
| `max?` | `number` | Exécute dès que ce nombre d'appels est en attente. |

### DebouncedFunction

Une fonction avec debounce. `flush()` exécute tout de suite l'appel en attente, `cancel()` l'abandonne, `pending()` vous dit s'il y en a un.

```ts
type DebouncedFunction = ((...args: Parameters<F>) => void) & { cancel(): void; flush(): void; pending(): boolean; }
```

### DebounceOptions

Options de `debounce()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `leading?` | `boolean` | Appelle tout de suite au début d'une rafale. |
| `trailing?` | `boolean` | Appelle une fois la rafale terminée. Par défaut : `true`. |
| `maxWait?` | `string \| number` | Ne reporte jamais un appel plus longtemps que cela, même si les appels continuent d'arriver. En ms, ou sous la forme `"2s"`. |

### MemoizedFunction

Une fonction mémoïsée, avec son `cache`, `clear()` et `delete(...args)`.

```ts
type MemoizedFunction = F & { cache: Map<unknown, { value: ReturnType<F>; expires: number; }>; clear(): void; delete(...args: Parameters<F>): boolean; }
```

### MemoizeOptions

Options de `memoize()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `resolver?` | `((...args: any[]) => unknown)` | Construit la clé de cache à partir des arguments. Par défaut, les primitives sont comparées par valeur, les objets simples et les tableaux par contenu, tout le reste par identité. |
| `ttl?` | `string \| number` | Durée pendant laquelle un résultat reste en cache, en ms ou sous la forme `"5m"`. |
| `max?` | `number` | Nombre maximal de résultats ; le moins récemment utilisé part en premier. |
| `cacheRejections?` | `boolean` | Conserve les promesses rejetées. Par défaut, elles sont abandonnées pour que le prochain appel réessaie. |

### RetryOptions

Options de `retry()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `attempts?` | `number` | Nombre total de tentatives, la première comprise. Par défaut : `3`. |
| `delay?` | `string \| number \| ((attempt: number, error: unknown) => number)` | Attente avant la tentative suivante, en ms ou sous la forme `"1s"`, ou une fonction qui la calcule. |
| `backoff?` | `number` | Multiplie le délai après chaque échec : `2` donne 200, 400, 800... Par défaut : `1`. |
| `maxDelay?` | `string \| number` | Plafond du délai calculé. |
| `jitter?` | `number` | Rend le délai aléatoire, de `0` (pas du tout) à `1` (n'importe où entre 0 et 2x). Évite que de nombreux clients réessaient en même temps. |
| `shouldRetry?` | `((error: unknown, attempt: number) => boolean \| ``Promise``<boolean>)` | Renvoyez `false` pour abandonner plus tôt, par exemple sur une erreur 4xx. |
| `onRetry?` | `((error: unknown, attempt: number, delay: number) => void)` | Appelée avant chaque attente, pour les logs ou les métriques. |
| `signal?` | `AbortSignal` | Arrête les nouvelles tentatives. La tentative en cours n'est pas interrompue. |

### ThrottledFunction

Une fonction avec throttle, dotée de `cancel()`.

```ts
type ThrottledFunction = ((...args: Parameters<F>) => void) & { cancel(): void; }
```

### ThrottleOptions

Options de `throttle()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `leading?` | `boolean` | Appelle tout de suite au premier appel. Par défaut : `true`. |
| `trailing?` | `boolean` | Fait un dernier appel avec les derniers arguments à la fin de l'intervalle. Par défaut : `true`. |
