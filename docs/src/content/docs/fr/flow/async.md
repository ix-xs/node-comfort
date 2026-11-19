---
title: "Asynchrone et concurrence"
description: "`nc.async` contrôle l'exécution des promesses : map avec une limite de concurrence, limiteurs, files, mutex, nouvelles tentatives, délais, sondage et annulation."
---

```js
const { async } = require("@ix-xs/node-comfort");
```

Les durées acceptent des millisecondes ou du texte : `500`, `"500ms"`, `"30s"`. Une option `signal` arrête le travail avec une `AbortError`.

## Map avec une limite

`map`, `forEach` et `filter` exécutent au plus `concurrency` appels à la fois et rendent les résultats dans l'ordre de l'entrée :

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

| Option | Par défaut | |
| --- | --- | --- |
| `concurrency` | sans limite | Appels exécutés en même temps |
| `stopOnError` | `true` | Avec `false`, tout s'exécute et les échecs arrivent dans une seule `AggregateError` |
| `signal` | | Arrête de lancer du travail et rejette avec une `AbortError` |

Les éléments peuvent être n'importe quel itérable ou itérable asynchrone (un générateur, un flux, `readline`). Ils sont lus un par un, à mesure que des places se libèrent : un flux n'est jamais lu plus vite qu'il n'est traité.

## Une liste de tâches

`parallel` exécute des fonctions ensemble, `series` l'une après l'autre. Les deux se résolvent avec les résultats dans l'ordre :

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 });
await async.series([() => migrateUsers(), () => migrateOrders()], { signal });
```

`parallel` accepte les options de `map`. `series` accepte `signal` : elle s'arrête avant la tâche suivante. Passez des fonctions, pas des promesses : une promesse a déjà démarré.

## Limiteurs

`limit(n)` plafonne le nombre d'appels simultanés. `rateLimit(max, interval)` plafonne le nombre d'appels lancés dans une fenêtre de temps, ce que comptent les quotas d'API. Les appels au-delà de la limite attendent et démarrent dans l'ordre.

```js
const limit = async.limit(3);
const results = await Promise.all(files.map((file) => limit(() => upload(file))));

const throttled = async.rateLimit(10, "1s");
const items = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

| Membre | `limit` | `rateLimit` |
| --- | --- | --- |
| `activeCount` | Appels en cours | Appels en cours |
| `pendingCount` | Appels en attente | Appels en attente |
| `clear()` | Abandonne les appels pas encore démarrés | Pareil |
| `concurrency` | Modifiable à la volée | |
| `onIdle()` | Se résout quand plus rien ne tourne ni n'attend | |

## File d'attente

Une file ajoute des priorités, la mise en pause et une limite de temps par tâche. `add()` se résout avec le résultat de la tâche.

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });

jobs.add(() => sendEmail(user));
jobs.add(() => sendEmail(vip), { priority: 10 }); // passe en premier
await jobs.onIdle();
```

| Option | Par défaut | |
| --- | --- | --- |
| `concurrency` | `1` | Tâches exécutées en même temps |
| `autoStart` | `true` | Démarrer tout de suite |
| `timeout` | sans limite | Par tâche ; une tâche plus lente rejette avec une `TimeoutError`. `false` ou `Infinity` : sans limite |

| Membre | |
| --- | --- |
| `add(task, { priority, signal })` | Une `priority` plus haute passe en premier. Un `signal` déclenché avant le démarrage de la tâche la retire de la file |
| `addAll(tasks, options)` | Se résout avec tous les résultats |
| `pause()`, `start()` | Suspendent et reprennent le lancement des tâches. Les deux renvoient la file |
| `clear()` | Abandonne les tâches pas encore démarrées : leurs promesses ne se règlent jamais |
| `onIdle()`, `onEmpty()` | Plus rien en attente ni en cours, plus rien en attente |
| `activeCount`, `pendingCount` | Tâches en cours, tâches en attente |
| `isPaused`, `concurrency` | `concurrency` est modifiable à la volée |

## Mutex

Un mutex garantit que deux tâches ne se chevauchent jamais : placez-le autour des étapes lire, modifier, écrire.

```js
const lock = async.mutex();

await lock.run(async () => {
  const data = nc.fs.readJSON("./counter.json", { n: 0 });
  nc.fs.writeJSON("./counter.json", { n: data.n + 1 });
});

const release = await lock.lock(); // à la main
try { /* ... */ } finally { release(); }
```

`lock.isLocked` indique si une tâche le détient.

## Réessayer

`retry` appelle une fonction jusqu'à ce qu'elle réussisse. La fonction reçoit le numéro de la tentative, à partir de 1. Après la dernière tentative, la dernière erreur est levée.

```js
const data = await async.retry((attempt) => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2, // environ 200, 400, 800, 1600 ms
  jitter: true,
  shouldRetry: (error, attempt) => !(error instanceof nc.errors.HttpError && error.status < 500),
  onRetry: (error, attempt, wait) => nc.logger.warn(`Attempt ${attempt} failed, retrying in ${wait} ms`),
});
```

| Option | Par défaut | |
| --- | --- | --- |
| `attempts` | `3` | Au total, la première comprise |
| `delay` | `0` | Attente avant la tentative suivante, ou `(attempt, error) => ms` |
| `backoff` | `1` | Multiplie l'attente après chaque échec |
| `maxDelay` | | Plafond de l'attente calculée |
| `jitter` | `0` | De `0` à `1` ; `true` vaut `0.5` |
| `shouldRetry` | | `(error, attempt) => boolean` : `false` abandonne |
| `onRetry` | | `(error, attempt, delay)`, avant chaque attente |
| `signal` | | Arrête les tentatives ; celle en cours n'est pas interrompue |

Les callbacks ne prennent pas leurs arguments dans le même ordre : `delay` reçoit `(attempt, error)`, `shouldRetry` et `onRetry` reçoivent l'erreur en premier. Une `AbortError` levée par la fonction met fin aux tentatives immédiatement.

## Délai maximal

```js
const res = await async.timeout(fetch(url), "5s");                         // TimeoutError après 5 s
const res2 = await async.timeout((signal) => fetch(url, { signal }), "5s"); // la requête est annulée aussi
const rows = await async.timeout(() => slowQuery(), 2000, "Database too slow");
```

Avec une promesse, `timeout` arrête seulement d'attendre : le travail continue. Avec une fonction, celle-ci reçoit un signal qui s'annule quand le temps est écoulé. L'erreur est une `TimeoutError` (code `ETIMEDOUT`, champ `timeout`), qui se combine donc avec `retry`. `Infinity` ou `false` signifie sans limite.

## Les erreurs comme valeurs

`to` transforme une promesse, ou une fonction, en `[erreur, valeur]` :

```js
const [error, user] = await async.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
```

## Sonder et attendre

`poll` appelle une fonction jusqu'à ce qu'elle renvoie une valeur vraie, et se résout avec cette valeur. Une erreur levée compte comme « pas encore prêt ».

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

Après `timeout`, elle rejette avec une `TimeoutError` dont la `cause` est la dernière erreur levée, s'il y en a une :

```js
try {
  await async.poll(() => db.ping(), { interval: "1s", timeout: "10s" });
} catch (error) {
  nc.logger.error(`Database not ready: ${error.cause?.message}`); // Database not ready: connect ECONNREFUSED
}
```

| Option de `poll` | Par défaut | |
| --- | --- | --- |
| `interval` | `100` ms | Entre deux essais |
| `timeout` | sans limite | `false` ou `Infinity` : sans limite |
| `signal` | | Arrête avec une `AbortError` |

`sleep(duration, { signal, unref })` attend. Avec `unref: true`, le minuteur ne garde pas le processus en vie.

```js
await async.sleep("250ms");
```

## Surveiller une condition

`when` vérifie une condition à intervalle régulier et émet des événements. Ajoutez les écouteurs, puis appelez `start()`. Pour simplement attendre une condition, `poll` est plus court.

```js
const task = async.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.logger.info(payload.reason))
  .on("timeout", () => nc.logger.warn("Nothing happened in 10s"))
  .start();

task.stop();
```

| Option | Par défaut | |
| --- | --- | --- |
| `interval` | `50` ms | Entre deux vérifications |
| `timeout` | sans limite | Émet `"timeout"` et s'arrête. `null`, `false` ou `Infinity` : sans limite |
| `max` | sans limite | S'arrête après ce nombre de déclenchements |
| `signal` | | Arrête la tâche, comme `stop()` |

| Événement | L'écouteur reçoit |
| --- | --- |
| `"trigger"` | Le payload, chaque fois que la condition est vraie |
| `"error"` | L'erreur levée par la condition |
| `"timeout"` | Le payload |

`on()`, `off()`, `start()` et `stop()` renvoient la tâche. Une tâche arrêtée ne peut pas redémarrer. La tâche fonctionne avec `using`.

## Annuler

`abortable` fait abandonner une promesse quand un signal se déclenche. Seule l'attente s'arrête : le travail derrière la promesse continue, sauf s'il écoute aussi le signal.

```js
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());

const rows = await async.abortable(slowQuery(), controller.signal); // AbortError si le signal se déclenche avant
```

## Petits utilitaires

```js
const { fulfilled, rejected, results } = await async.settle(emails.map(send));
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });

const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;
```

| Fonction | Se résout avec |
| --- | --- |
| `settle(promises)` | `{ fulfilled, rejected, results }` : les valeurs et les erreurs dans l'ordre, et les résultats de `Promise.allSettled` |
| `props(object)` | L'objet, chaque promesse remplacée par sa valeur |
| `deferred()` | `{ promise, resolve, reject, settled }` : une promesse réglée de l'extérieur |

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.wait()`, `nc.utils.wait()` | `nc.async.sleep()` |
| `nc.when()`, `nc.utils.when()` | `nc.async.when()` |
| `nc.func.retry()`, `nc.func.timeout()`, `nc.func.to()` | `nc.async.retry()`, `nc.async.timeout()`, `nc.async.to()` |
| `queue.pending` | `queue.activeCount` |
| `queue.size` | `queue.pendingCount` |
| `limiter.clearQueue()` | `limiter.clear()` |

Les anciens noms fonctionnent toujours et avertissent une fois. Ils sont retirés en 4.0. En 2.2, `when({ timeout: Infinity })` déclenchait son délai au bout d'environ 1 ms ; cela signifie désormais sans limite.
