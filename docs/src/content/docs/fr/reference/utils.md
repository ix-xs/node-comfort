---
title: "nc.utils"
description: "Les utilitaires du quotidien : `wait`, `when`, `dontCrash`, et des fonctions JSON qui ne lèvent pas d'erreur. Ils sont aussi disponibles à la racine (`nc.wait()`)."
sidebar:
  label: "utils"
  order: 6
---

```js
const { utils } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const utils = require("@ix-xs/node-comfort/utils");
```

Ces fonctions existent aussi à la racine : `nc.wait()` équivaut à `nc.utils.wait()`.

Cette page liste tout ce que contient `nc.utils`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/utils/).

```js
await nc.wait("1.5s");
const settings = nc.JSONParse(text, {});
```

## wait

```ts
wait(duration: string | number, options?: WaitOptions): Promise<void>
```

Se résout après un délai, donné en millisecondes ou sous forme de chaîne de durée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `duration` | `number \| string` | Des millisecondes, ou une chaîne comme `"250ms"`, `"2s"`, `"1m30s"`. |
| `options?` | [`WaitOptions`](#waitoptions) |  |

**Lève** `AbortError` : Si le signal est interrompu.

**Lève** `TypeError` : Si la durée ne peut pas être interprétée.

```js
await nc.wait(500);
await nc.wait("2s");
await nc.wait("1m", { signal: controller.signal });
```

## when

```ts
when(predicate: boolean | PromiseLike<boolean> | (() => unknown), payload?: any, options?: WhenOptions): WhenTask
```

Vérifie une condition à intervalle régulier et vous prévient quand elle est vraie. Appelez `.start()` une fois vos écouteurs en place. Si vous voulez seulement attendre une condition, `nc.async.poll()` est plus simple.

| Paramètre | Type | Description |
| --- | --- | --- |
| `predicate` | `boolean \| ``PromiseLike``<boolean> \| (() => unknown)` | La condition, ou une fonction (synchrone ou asynchrone) qui la renvoie. |
| `payload?` | `any` | Transmis aux écouteurs `"trigger"` et `"timeout"`. Par défaut : `{}`. |
| `options?` | [`WhenOptions`](#whenoptions) |  |

```js
nc.when(() => queue.length > 0, { reason: "jobs waiting" }, { interval: 500, max: 1, timeout: "10s" })
  .on("trigger", (payload) => nc.info(payload.reason))
  .on("timeout", () => nc.warn("Nothing happened in 10s"))
  .start();
```

## dontCrash

```ts
dontCrash(): DontCrashController
```

Maintient le processus en vie quand quelque chose tourne mal. Les exceptions non interceptées et les rejets non gérés sont journalisés au lieu de faire planter le processus, et `SIGINT`/`SIGTERM` sont journalisés avant un arrêt propre. Personnalisez chacun de ces comportements avec `.on()`.

Seuls ses propres gestionnaires sont retirés ; les écouteurs ajoutés par votre code ou par d'autres bibliothèques ne sont pas touchés.

```js
nc.dontCrash()
  .on("error", (error) => sentry.captureException(error))
  .on("sig", async () => {
    await server.close();
    process.exit(0);
  });
```

## JSONString

```ts
JSONString(value: unknown, spaces?: number): string
```

`JSON.stringify` qui ne lève jamais d'erreur. Les références circulaires deviennent `"[Circular]"`, les bigints deviennent des chaînes, les Map des objets, les Set des tableaux, et les erreurs gardent leur nom, leur message et leur pile d'appels.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `spaces?` | `number` | Indentation. Utilisez `0` pour tout mettre sur une seule ligne. Par défaut : `4`. |

**Renvoie** `string` : Le texte JSON, ou `"undefined"` pour les valeurs que JSON ne peut pas représenter.

```js
nc.JSONString({ a: 1 });                          // '{\n    "a": 1\n}'
nc.JSONString({ id: 10n, tags: new Set(["x"]) }, 0); // '{"id":"10","tags":["x"]}'
nc.JSONString({ error: new Error("boom") }, 0);   // '{"error":{"name":"Error","message":"boom","stack":"..."}}'
```

## JSONParse

```ts
JSONParse<T = any>(text: string, fallback?: T, reviver?: ((this: any, key: string, value: any) => any) | undefined, ...args: any[]): T
```

`JSON.parse` avec une valeur de repli facultative. Avec une valeur de repli, une entrée invalide la renvoie au lieu de lever une erreur. Une marque d'ordre des octets en tête, que les éditeurs Windows aiment ajouter, est ignorée.

| Paramètre | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `fallback?` | `T` | Renvoyée quand `text` n'est pas du JSON valide. |
| `reviver?` | `(this: any, key: string, value: any) => any` | Transmis à `JSON.parse`. |
| `...args` | `any[]` |  |

**Lève** `SyntaxError` : Si `text` est invalide et qu'il n'y a pas de valeur de repli.

```js
nc.JSONParse('{"a":1}');    // { a: 1 }
nc.JSONParse("oops", null); // null
nc.JSONParse("oops");       // lève une SyntaxError
nc.JSONParse(text, {}, (key, value) => (key === "at" ? new Date(value) : value));
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { DontCrashController } from "@ix-xs/node-comfort"`.

### DontCrashController

Renvoyé par `dontCrash()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `on` | `<``E`` extends `[`DontCrashEvent`](#dontcrashevent)`>(event: ``E``, handler?: (``E`` extends "error" ? (error: unknown) => void : ``E`` extends "sig" ? (signal: ``Signals``) => void : (code: number) => void) \| undefined) => `[`DontCrashController`](#dontcrashcontroller) | Remplace le gestionnaire d'un événement. Appelez-la sans gestionnaire pour rétablir celui par défaut. |
| `dispose` | `() => void` | Retire tout ce que `dontCrash()` a installé. |

### DontCrashEvent

Les événements que vous pouvez personnaliser sur `dontCrash()`.

```ts
type DontCrashEvent = "error" | "exit" | "sig" | "beforeExit"
```

### WaitOptions

Options de `wait()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `signal?` | `AbortSignal` | Annule l'attente ; la promesse est rejetée avec une `AbortError`. |
| `unref?` | `boolean` | Laisse le processus se terminer même si le minuteur est encore en attente. |

### WhenOptions

Options de `when()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `interval?` | `string \| number` | Temps entre deux vérifications, en ms ou sous la forme `"1s"`. Par défaut : `50`. |
| `timeout?` | `string \| number \| null` | Abandonne après ce délai, en ms ou sous la forme `"10s"`, et émet `"timeout"`. |
| `max?` | `number \| null` | S'arrête après ce nombre de déclenchements. |

### WhenTask

La tâche renvoyée par `when()`. Chaque méthode renvoie la tâche, ce qui permet d'enchaîner les appels.

| Propriété | Type | Description |
| --- | --- | --- |
| `start` | `() => `[`WhenTask`](#whentask) | Lance les vérifications. Une tâche arrêtée ne peut pas être relancée. |
| `stop` | `() => `[`WhenTask`](#whentask) | Arrête les vérifications et efface les minuteurs. |
| `on` | `<``E`` extends "trigger" \| "error" \| "timeout">(event: ``E``, handler: ``E`` extends "error" ? (error: unknown) => void : (payload: any) => void) => `[`WhenTask`](#whentask) | Écoute `"trigger"` (la condition est vraie), `"error"` (elle a levé une erreur) ou `"timeout"`. |
