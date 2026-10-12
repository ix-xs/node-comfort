---
title: "Événements typés"
description: "`nc.Emitter` est un petit émetteur d'événements où les événements et leurs arguments sont déclarés une seule fois. Votre éditeur vérifie alors chaque `on` et chaque `emit`."
sidebar:
  order: 4
---

```ts
const chat = new nc.Emitter<{ message: [text: string, from: string]; close: [] }>();

const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
chat.emit("message", "hello", "ada");
chat.emit("mesage", "hi");   // erreur : événement inconnu
off();                       // arrête l'écoute
```

En JavaScript, déclarez le type avec JSDoc :

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ ready: [port: number] }>} */
const events = new nc.Emitter();
```

## Écouter

```js
events.on("ready", (port) => nc.info(`Listening on ${port}`)); // renvoie une fonction qui le retire
events.once("ready", onReady);                                 // s'exécute une seule fois
events.onAny((name, ...args) => nc.debug(name, args));        // tous les événements, pratique pour les logs

events.off("ready", onReady); // un seul écouteur
events.off("ready");          // tous les écouteurs de "ready"
events.clear();               // tout
```

`off(event, listener)` prend la fonction que vous avez donnée à `on` ou à `once`. Un écouteur ajouté avec `once` peut ainsi être retiré avant de s'être exécuté.

## Un seul signal pour plusieurs écouteurs

`on` et `once` acceptent un `signal`. Quand il est interrompu, l'écouteur est retiré :

```js
const controller = new AbortController();

chat.on("message", onMessage, { signal: controller.signal });
chat.once("close", onClose, { signal: controller.signal });

controller.abort(); // retire les deux
```

Cela vous évite de conserver une fonction de retrait par écouteur. Avec un signal déjà interrompu, rien n'est ajouté.

## Émettre

`emit` appelle les écouteurs tout de suite, dans l'ordre où ils ont été ajoutés, et indique en retour si quelqu'un écoutait. Si un écouteur lève une erreur, elle se propage, comme avec l'`EventEmitter` de Node.

`emitAsync` les appelle l'un après l'autre, en attendant chacun, et se résout avec ce qu'ils ont renvoyé. Il convient bien aux hooks :

```js
await hooks.emitAsync("beforeSave", record);
```

## Attendre un événement

```js
const [code] = await child.waitFor("exit", { timeout: "30s" });
const [text] = await chat.waitFor("message", { filter: (text, from) => from === "ada" });
```

`waitFor` rejette sa promesse avec une `TimeoutError` après `timeout`, ou avec une `AbortError` si vous passez un signal qui se déclenche. Le timeout s'écrit en millisecondes ou en texte, par exemple `"30s"` ou `"2m"`.

## Boucler sur les événements

```js
for await (const [job] of queue.iterate("job")) {
  await process(job);
}
```

Les événements qui arrivent pendant que votre boucle est occupée sont mis en file d'attente. Sortir de la boucle retire l'écouteur. Passez un `signal` pour terminer la boucle de l'extérieur.

## Qui écoute

```js
events.listenerCount("ready"); // 2
events.listeners("ready");     // [onReady, logReady], dans l'ordre d'exécution
events.eventNames();           // ["ready"]
```

Pour un écouteur ajouté avec `once`, `listeners` vous donne la fonction que vous avez passée. Les écouteurs `onAny` ne sont pas comptés.
