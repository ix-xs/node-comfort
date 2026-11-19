---
title: "Conventions"
description: "Les règles que suivent tous les namespaces : durées, tailles, options, annulation, valeurs de retour, chemins, et les quelques endroits où deux namespaces diffèrent."
---

## Durées

Une durée est un nombre de millisecondes ou une chaîne avec une unité :

```js
nc.async.sleep("500ms");
nc.http.get(url, { timeout: "10s" });
nc.cache.create({ ttl: "30m" });
nc.time.every("1h", task);
nc.time.parseDuration("1h 30m"); // 5400000
```

| | |
| --- | --- |
| Unités | `ms`, `s`, `m`, `h`, `d`, `w`, aussi en toutes lettres (`"2 hours"`) et combinées (`"1h 30m"`) |
| Invalide | `TypeError: Invalid duration` levée par la fonction qui l'a reçue |
| Exception | JWT (`expiresIn`, `notBefore`, `maxAge`, `clockTolerance`) et TOTP (`period`) : un nombre est en **secondes**, comme le définissent les RFC 7519 et 6238. Les options JWT acceptent aussi une chaîne : écrivez `"15m"` |

## Tailles

Une taille est un nombre d'octets ou une chaîne avec une unité : `"10MB"`, `"512KB"`. Utilisée par `maxResponseSize` (http), `maxSize` (fichiers de log) et `nc.num.parseBytes()`.

## Arguments et options

Ce sur quoi la fonction travaille vient d'abord, un objet d'options vient en dernier et reste toujours facultatif :

```js
nc.str.truncate(text, 40, { words: true });
nc.fs.write(path, data, { mode: 0o600 });
nc.http.post(url, body, { retry: { attempts: 3 } });
```

Quand une limite peut être retirée (`timeout`, `maxResponseSize`), `false` et `Infinity` signifient tous deux « sans limite ».

## Annuler

Chaque fonction qui attend accepte un `AbortSignal` dans `signal`. Quand il se déclenche, la promesse est rejetée avec une `AbortError` (`code: "ABORT_ERR"`), et ce qui a été lancé est arrêté :

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await nc.http.get(url, { signal: controller.signal });
await nc.sys.run("npm", ["test"], { signal: controller.signal });
```

| Namespace | Accepte `signal` |
| --- | --- |
| `http` | Chaque requête, `download` |
| `sys` | `run`, `exec` |
| `async` | `sleep`, `map`, `forEach`, `filter`, `series`, `queue.add`, `poll`, `retry`, `when`, `abortable` |
| `time` | `every`, `cron` : la planification s'arrête |
| `cache` | `getOrSet` |
| `emitter` | `on` (retire l'écouteur), `waitFor`, `events` |
| `cli` | Chaque question, `spin` |

## Valeurs de retour

`nc.fs` ne lève pas d'erreur pour ce qui échoue tous les jours. Tout le reste lève.

| Namespace | Absent ou en échec |
| --- | --- |
| `fs` | Les lectures renvoient `undefined` (ou la valeur de repli), les écritures et opérations `false`. `ensureFile`, `ensureFolder` et `temp` lèvent |
| `is` | `false`, ne lève jamais, accepte n'importe quelle valeur |
| `obj.get`, `arr.first`, `env.get` | `undefined` |
| Tout le reste | Lève une [`NodeComfortError`](/basics/errors/) avec un `code` pour un échec à l'exécution, une `TypeError` ou une `RangeError` pour un mauvais argument |

Les fonctions de lecture diffèrent par ce que donne une entrée invalide :

| Fonction | Entrée invalide |
| --- | --- |
| `nc.json.parse(text)` | Lève `SyntaxError`. Avec une valeur de repli, `nc.json.parse(text, fallback)` la renvoie |
| `nc.fs.readJSON(path, fallback)` | La valeur de repli, ou `undefined` |
| `nc.num.parse`, `nc.num.parseBytes` | `NaN` |
| `nc.time.parseDuration` | `null` |
| `nc.time.parse(text, format)` | `undefined` |
| `nc.time.format` d'une date invalide | `"Invalid Date"` |
| `schema.parse` / `schema.safeParse` | Lève `ValidationError` / renvoie `{ success: false, error }` |
| `nc.env.number`, `nc.env.required`... | Lève `ValidationError` |
| `nc.crypto.decodeJWT`, `verifyJWT` | Lève `JWTError` |

## Délais dépassés

Tout délai dépassé échoue avec le code `ETIMEDOUT` : une `TimeoutError` pour `http`, `async.timeout`, `async.poll` et `emitter.waitFor`, une `ProcessError` (avec `timedOut: true`) pour `sys.run` et `sys.exec`. Testez le code pour traiter les deux :

```js
try {
  await nc.async.timeout(work(), "5s");
} catch (error) {
  if (error.code === "ETIMEDOUT") nc.logger.warn("Too slow");
  else throw error;
}
```

## Chemins

| Fonction | `./x` part de |
| --- | --- |
| Chaque fonction de `nc.fs` sauf `glob` | Le fichier qui l'appelle |
| `nc.fs.glob`, `nc.sqlite.open`, le `file.path` du logger, `nc.http.download`, `nc.env.load`, `nc.sys.open` | Le dossier de travail |

Pour donner au second groupe un chemin à côté de votre fichier, résolvez-le d'abord :

```js
const db = nc.sqlite.open(nc.fs.resolve("./data/app.sqlite"));
```

`nc.fs.remove(".")` supprime le dossier du fichier appelant. `remove`, `copy` et `move` refusent un chemin vide.

## Différences entre namespaces

| Sujet | Règle |
| --- | --- |
| `.on()` | Renvoie une fonction qui retire l'écouteur sur un émetteur (`nc.emitter`). Renvoie l'objet, pour enchaîner, sur `nc.fs.watch()`, `nc.async.when()` et `nc.sys.dontCrash()` |
| `compact` | `nc.arr.compact` retire toute valeur fausse (`0`, `""`, `false`...), `nc.obj.compact` seulement `null` et `undefined` |
| Arguments des callbacks | `nc.obj.mapValues` et `nc.obj.filter` reçoivent `(value, key)`, `nc.obj.mapKeys` reçoit `(key, value)` |
| Callbacks de relance | `delay(attempt, error)`, `shouldRetry(error, attempt)`. Les tentatives comptent à partir de 1 |
| `is.*` et `isX()` | `nc.is.*` vérifie le type ou le format de n'importe quelle valeur. Le `isX()` propre à un namespace répond à une question de son domaine : `nc.time.isToday()`, `nc.num.isPrime()`, `nc.sys.isWindows()`, `nc.env.isProduction()` |

```js
nc.obj.mapValues({ a: 1 }, (value, key) => key + value); // { a: "a1" }
nc.obj.mapKeys({ a: 1 }, (key, value) => key + value);   // { a1: 1 }
nc.arr.compact([0, "", null, 1, false]);                 // [1]
nc.obj.compact({ a: 0, b: null, c: "", d: undefined });  // { a: 0, c: "" }
```
