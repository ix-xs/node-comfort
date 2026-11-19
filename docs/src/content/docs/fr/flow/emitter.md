---
title: "Événements typés"
description: "`nc.emitter` crée de petits émetteurs d'événements dont les événements et leurs arguments sont déclarés une fois : l'éditeur vérifie chaque `on` et chaque `emit`. Un événement peut être attendu, et parcouru dans une boucle."
---

```js
const { emitter } = require("@ix-xs/node-comfort");
```

## Créer un émetteur

```ts
const chat = emitter.create<{ message: [text: string, from: string]; close: [] }>();

const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
chat.emit("message", "hello", "ada"); // ada: hello
chat.emit("mesage", "hi");            // erreur de type : événement inconnu
off();
```

`emitter.create()` équivaut à `new emitter.Emitter()`. Étendez la classe pour donner des événements typés à l'une de vos classes :

```ts
class Job extends emitter.Emitter<{ done: [result: string] }> {
  run() {
    this.emit("done", "ok");
  }
}
```

En JavaScript, déclarez les événements avec JSDoc :

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>} */
const events = emitter.create();
```

## Écouter

```js
const off = events.on("ready", onReady); // renvoie une fonction qui retire l'écouteur
events.once("ready", onReady);           // ne s'exécute qu'une fois
events.onAny((name, ...args) => console.log(name, args));

events.off("ready", onReady); // un écouteur, y compris un écouteur once() qui n'a pas encore tourné
events.off("ready");          // tous les écouteurs de "ready"
events.clear();               // tout
```

| Méthode | Renvoie |
| --- | --- |
| `on(event, listener, { signal })` | Une fonction qui retire l'écouteur |
| `once(event, listener, { signal })` | Pareil |
| `onAny(listener)` | Pareil ; l'écouteur reçoit d'abord le nom de l'événement |
| `off(event, listener?)` | L'émetteur |
| `clear(event?)` | L'émetteur |

Ici, `on()` renvoie une fonction de désabonnement. Ailleurs dans la bibliothèque (`nc.fs.watch()`, `nc.async.when()`), `on()` renvoie l'objet, pour enchaîner les appels.

La fonction renvoyée par `on`, `once` et `onAny` fonctionne avec `using`, qui retire l'écouteur à la fin du bloc :

```js
{
  using off = events.on("ready", onReady);
  await startServer();
} // l'écouteur est retiré ici
```

## Un signal pour plusieurs écouteurs

Quand le signal s'annule, tous les écouteurs ajoutés avec lui sont retirés. Avec un signal déjà annulé, rien n'est ajouté.

```js
const controller = new AbortController();

chat.on("message", onMessage, { signal: controller.signal });
chat.once("close", onClose, { signal: controller.signal });

controller.abort(); // retire les deux
```

## Émettre

| Méthode | Rôle |
| --- | --- |
| `emit(event, ...args)` | Appelle les écouteurs tout de suite, dans l'ordre d'ajout. Renvoie s'il y en avait un. Un écouteur qui lève une erreur interrompt l'appel et l'erreur se propage, comme avec l'`EventEmitter` de Node |
| `emitAsync(event, ...args)` | Les appelle l'un après l'autre, en attendant chacun, et se résout avec ce qu'ils ont renvoyé |

```js
hooks.on("beforeSave", async (record) => validate(record));
await hooks.emitAsync("beforeSave", record);
```

## Attendre un événement

`waitFor` se résout avec les arguments du prochain événement qui correspond :

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

| Option | |
| --- | --- |
| `timeout` | Rejette avec une `TimeoutError`. `false` ou `Infinity` : sans limite, par défaut |
| `signal` | Rejette avec une `AbortError` |
| `filter` | `(...args) => boolean` : seuls ces événements comptent |

## Parcourir les événements

```js
for await (const [job] of jobs.iterate("job")) {
  await handle(job);
}
```

Les événements qui arrivent pendant que la boucle travaille sont mis en file. Sortir de la boucle retire l'écouteur. `iterate(event, { signal })` termine la boucle depuis l'extérieur.

## Qui écoute

```js
events.listenerCount("ready"); // 2
events.listeners("ready");     // [onReady, logReady], dans l'ordre d'exécution
events.eventNames();           // ["ready"]
```

Les écouteurs `onAny` ne sont pas comptés. Pour un écouteur ajouté avec `once`, `listeners` donne la fonction passée.

## Importer la classe seule

Le sous-chemin exporte la classe, avec une méthode statique `create` :

```js
const Emitter = require("@ix-xs/node-comfort/emitter");

const events = Emitter.create();
```

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `new nc.Emitter()` | `nc.emitter.create()` ou `new nc.emitter.Emitter()` |
| `class Job extends nc.Emitter {}` | `class Job extends nc.emitter.Emitter {}` |

`nc.Emitter` fonctionne toujours, avertit une fois et sera retiré en 4.0.
