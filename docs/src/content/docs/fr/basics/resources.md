---
title: "Ressources"
description: "Ce qui retient un fichier, un minuteur ou un écouteur, comment le libérer avec `using`, un signal ou un arrêt propre, et quels minuteurs gardent le processus en vie."
---

## Les objets à libérer

| Objet | Libéré par | Libéré par `using` |
| --- | --- | --- |
| `nc.sqlite.open()` | `db.close()` | Oui |
| `nc.time.every()`, `nc.time.cron()` | `task.stop()`, ou `signal` | Oui |
| `nc.fs.watch()` | `watcher.stop()` | Oui |
| `nc.async.when()` | `task.stop()`, ou `signal` | Oui |
| `nc.cli.spinner()`, `nc.cli.progress()` | `stop()`, `succeed()`, `fail()` | Oui |
| `nc.sys.dontCrash()` | `dispose()` | Oui |
| `nc.sys.onShutdown(handler)` | La fonction qu'il renvoie | Oui |
| Écouteurs de `nc.emitter` | La fonction que renvoie `on()`, ou `signal` | Non |

## using

Une déclaration `using` libère l'objet à la fin du bloc, même quand le bloc lève une erreur :

```js
function exportReport(path) {
  using db = nc.sqlite.open(path);
  return db.getAll("orders", { status: "paid" });
} // db.close() a été appelé

{
  using watcher = nc.fs.watch("./src").on("change", rebuild);
  await nc.async.sleep("1m");
} // le watcher est arrêté
```

`using` demande un environnement qui gère la libération explicite des ressources (Node.js 24 ou plus) ou TypeScript 5.2 ou plus.

## Signaux

Un `AbortSignal` arrête plusieurs choses d'un coup : requêtes, commandes, planifications, écouteurs, questions. Quand il se déclenche, ce qui attend est rejeté avec une `AbortError`.

```js
const controller = new AbortController();

nc.time.every("10s", refresh, { signal: controller.signal });
events.on("message", handle, { signal: controller.signal });
const page = nc.http.get(url, { signal: controller.signal });

controller.abort(); // la planification s'arrête, l'écouteur est retiré, la requête est rejetée
```

`AbortSignal.timeout(ms)` donne un signal qui se déclenche après un délai. La liste complète des fonctions qui acceptent `signal` est dans [Conventions](/basics/conventions/).

## S'arrêter

`nc.sys.onShutdown()` exécute du code de nettoyage quand on demande au processus de s'arrêter : Ctrl+C, `docker stop`, `kill`, un gestionnaire de processus.

```js
const db = nc.sqlite.open("data/app.sqlite");
const server = app.listen(3000);
const job = nc.time.every("5m", sync);

nc.sys.onShutdown(async (reason) => {
  nc.logger.info(`Stopping (${reason})`);
  job.stop();
  await new Promise((done) => server.close(done));
  db.close();
});
```

| | |
| --- | --- |
| Ordre | Les handlers s'exécutent dans l'ordre inverse de leur enregistrement, puis le processus se termine |
| Signaux | `SIGINT`, `SIGTERM` et `SIGHUP` par défaut (option `signals`) |
| Délai | 10 secondes (option `timeout`), puis la sortie est forcée. Un second Ctrl+C sort tout de suite |
| Code de sortie | `0` (option `exitCode`), `1` si un handler lève une erreur |
| Depuis le code | `nc.sys.shutdown(code)` exécute les mêmes handlers, à la place de `process.exit()` |

`nc.sys.dontCrash()` journalise les exceptions non rattrapées et les promesses rejetées sans gestionnaire au lieu de planter : voir [Processus et système](/system/sys/).

## Minuteurs et boucle d'événements

Une planification ou une attente garde le processus en vie, comme `setInterval`. Avec `unref: true`, non : le processus se termine quand il ne reste rien d'autre à faire.

```js
nc.time.every("1h", flushMetrics, { unref: true });
await nc.async.sleep("30s", { unref: true }); // ne se résout jamais si le processus n'a rien d'autre à faire
```

| Fonction | `unref` |
| --- | --- |
| `nc.time.every`, `nc.time.cron` | Oui |
| `nc.async.sleep` | Oui |
| Requêtes, commandes, questions | Non : c'est ce que le programme attend |
