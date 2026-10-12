---
title: "Asynchrone et concurrence"
description: "`nc.async` contrôle combien de choses s'exécutent en même temps : map avec une limite, files d'attente, limites de débit, mutex, polling."
sidebar:
  order: 2
---

```js
const { async } = require("@ix-xs/node-comfort");

const pages = await async.map(urls, (url) => nc.http.get(url), { concurrency: 5 });
```

## Map avec une limite

`Promise.all(items.map(fn))` lance tout en même temps, ce qui peut submerger une API ou épuiser les descripteurs de fichiers. `async.map` exécute au plus `concurrency` appels à la fois et conserve l'ordre des résultats :

```js
const users = await async.map(ids, (id) => api.getUser(id), { concurrency: 10 });
await async.forEach(images, (image) => optimize(image), { concurrency: 4 });
const alive = await async.filter(hosts, (host) => ping(host), { concurrency: 20 });
```

Par défaut, il s'arrête à la première erreur. Avec `stopOnError: false`, tout s'exécute et vous obtenez une `AggregateError` qui liste chaque échec. Passez un `signal` pour ne plus lancer de nouveau travail et rejeter avec une `AbortError`.

Les éléments n'ont pas à être dans un tableau. Tout itérable ou itérable asynchrone convient, comme un générateur ou un stream :

```js
const fs = require("node:fs");
const readline = require("node:readline");

const lines = readline.createInterface({ input: fs.createReadStream("./users.csv") });

await async.forEach(lines, (line) => importUser(line), { concurrency: 20 });
```

Les éléments sont prélevés dans la source un par un, à mesure que des places se libèrent : un stream n'est donc jamais lu plus vite qu'il n'est traité. `map` et `filter` renvoient malgré tout leurs résultats dans l'ordre de la source.

## Une liste de tâches

Quand chaque tâche est une fonction à part, `parallel` les exécute ensemble et `series` les exécute l'une après l'autre. Les deux renvoient les résultats dans l'ordre :

```js
const [users, posts] = await async.parallel([() => loadUsers(), () => loadPosts()]);
await async.parallel(jobs, { concurrency: 4 }); // quatre à la fois
await async.series([() => migrateUsers(), () => migrateOrders()]);
```

`parallel` accepte les mêmes options que `map`. Passez des fonctions, pas des promesses : une promesse a déjà démarré, il ne resterait donc plus rien à limiter.

## Limiteur

`limit` vous donne une fonction qui exécute ce que vous lui passez dès qu'il y a de la place, comme le paquet `p-limit` :

```js
const limit = async.limit(3);
const results = await Promise.all(files.map((file) => limit(() => upload(file))));

limit.activeCount;  // en cours d'exécution
limit.pendingCount; // en attente
```

Partagez un même limiteur entre plusieurs parties de votre code pour plafonner leur concurrence cumulée.

## Limite de débit

`limit` plafonne le nombre d'appels qui s'exécutent en même temps. `rateLimit` plafonne le nombre d'appels qui démarrent sur une période, et c'est ce que comptent la plupart des quotas d'API :

```js
const throttled = async.rateLimit(10, "1s"); // 10 appels par seconde au plus

const items = await Promise.all(ids.map((id) => throttled(() => api.get(`items/${id}`))));
```

Les appels au-delà de la limite attendent leur tour et démarrent dans l'ordre où ils ont été faits. La période s'écrit en millisecondes ou en texte, par exemple `"1s"` ou `"1m"`. `throttled.pendingCount` vous indique combien sont en attente.

## File d'attente

Une file d'attente ajoute les priorités, la mise en pause et un timeout par tâche :

```js
const jobs = async.queue({ concurrency: 2, timeout: "30s" });

jobs.add(() => sendEmail(user));
jobs.add(() => sendEmail(vip), { priority: 10 }); // passe devant les autres
jobs.pause();
jobs.start();
await jobs.onIdle(); // tout est terminé
```

`add` renvoie une promesse du résultat de la tâche.

## Mutex

Un mutex garantit que deux tâches ne se chevauchent jamais. Enveloppez-y les séquences de lecture, modification puis écriture :

```js
const lock = async.mutex();

await lock.run(async () => {
  const data = nc.readJSON("./counter.json", { n: 0 });
  nc.writeJSON("./counter.json", { n: data.n + 1 });
});
```

## Polling

`poll` appelle une fonction jusqu'à ce qu'elle renvoie une valeur truthy, puis se résout avec cette valeur :

```js
await async.poll(() => fetch(healthUrl).then((res) => res.ok), { interval: "500ms", timeout: "30s" });
```

Les erreurs comptent comme « pas encore prêt ». Après `timeout`, la promesse est rejetée avec une `TimeoutError`. Si le dernier essai a levé une erreur, celle-ci est conservée comme `cause`, ce qui vous permet de savoir pourquoi rien n'a jamais été prêt :

```js
try {
  await async.poll(() => db.ping(), { interval: "1s", timeout: "10s" });
} catch (error) {
  nc.error(`Database not ready: ${error.cause?.message}`); // Database not ready: connect ECONNREFUSED
}
```

## Annulation

`abortable` fait abandonner n'importe quelle promesse quand un signal se déclenche :

```js
const controller = new AbortController();
process.once("SIGINT", () => controller.abort());

const rows = await async.abortable(slowQuery(), controller.signal); // AbortError si le signal se déclenche en premier
```

Il ne met fin qu'à l'attente. Le travail derrière la promesse se poursuit, sauf s'il écoute lui aussi le signal.

`map`, `forEach`, `filter`, `parallel`, `poll` et `sleep` acceptent eux aussi une option `signal`.

## Petits utilitaires

```js
const { fulfilled, rejected } = await async.settle(emails.map(send));
const { user, orders } = await async.props({ user: getUser(id), orders: getOrders(id) });

const ready = async.deferred();
socket.once("open", () => ready.resolve());
await ready.promise;

await async.sleep("250ms");
```

`async.retry` et `async.timeout` sont les mêmes fonctions que dans [`nc.func`](/flow/func/). La [référence](/reference/async/) liste tout.
