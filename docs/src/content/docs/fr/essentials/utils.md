---
title: "Utilitaires"
description: "Une poignée de petites fonctions utilitaires, toutes disponibles à la racine."
sidebar:
  order: 6
---

## wait

```js
await nc.wait(500);
await nc.wait("2s");
await nc.wait("1m", { signal: controller.signal }); // rejette avec une AbortError en cas d'annulation
await nc.wait("30d");                               // les longues attentes fonctionnent aussi
```

Les durées s'expriment en millisecondes ou sous forme de chaînes comme `"250ms"`, `"1m30s"` et `"2h"`, comme partout dans node-comfort. Une attente peut dépasser les 24,8 jours auxquels `setTimeout` s'arrête. Une durée illisible provoque un rejet avec une `TypeError`.

Passez `unref: true` quand l'attente ne doit pas, à elle seule, maintenir le processus en vie.

## JSON sans risque

`JSONString()` ne lève jamais d'erreur. Les références circulaires deviennent `"[Circular]"`, les bigints deviennent des chaînes, les Map des objets, les Set des tableaux, et les erreurs conservent leur nom, leur message et leur pile d'appels :

```js
nc.JSONString({ id: 10n, tags: new Set(["a"]) }, 0); // '{"id":"10","tags":["a"]}'
nc.JSONString({ error: new Error("boom") }, 0);      // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
```

Le deuxième argument est l'indentation : 4 espaces par défaut, `0` pour une seule ligne. Une erreur conserve aussi ses propres champs, comme un `code`, ainsi que sa `cause`. Si un getter ou un `toJSON()` lève une erreur en cours de route, vous obtenez une description textuelle de la valeur au lieu d'une exception.

`JSONParse()` accepte une valeur de repli. Quand vous en fournissez une, une entrée invalide renvoie cette valeur au lieu de lever une erreur :

```js
const settings = nc.JSONParse(raw, {});
const strict = nc.JSONParse(raw); // lève une SyntaxError si l'entrée est invalide
const event = nc.JSONParse(raw, null, (key, value) => (key === "at" ? new Date(value) : value));
```

Le troisième argument est un reviver, comme dans `JSON.parse`. Une marque d'ordre des octets au début du texte, que certains éditeurs Windows ajoutent, est ignorée.

## dontCrash

Maintient en vie un processus de longue durée quand un imprévu survient. Les exceptions non interceptées et les rejets non gérés sont journalisés au lieu de tuer le processus, et `SIGINT`/`SIGTERM` sont journalisés avant une sortie propre :

```js
nc.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

Elle ne retire jamais que ses propres gestionnaires ; les écouteurs de votre code ou d'autres bibliothèques restent en place. Appelé sur l'objet renvoyé, `dispose()` retire tout ce qu'elle a installé. Pour un arrêt propre complet, avec des timeouts, voyez [`sys.onShutdown()`](/system/sys/).

## when

Vérifie une condition à intervalle régulier et émet des événements. Pensez à appeler `.start()` :

```js
nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.info(payload.reason))
  .on("timeout", () => nc.warn("Nothing happened in 10s"))
  .start();
```

`"trigger"` est émis à chaque vérification où la condition est vraie. `max` arrête la tâche après ce nombre de déclenchements, et `timeout` l'arrête au bout de cette durée, quoi qu'il se soit passé avant. Sans l'un ni l'autre, elle tourne jusqu'à ce que vous appeliez `.stop()`.

Pour attendre qu'une condition devienne vraie, [`async.poll()`](/flow/async/) renvoie une promesse et s'avère souvent plus simple.
