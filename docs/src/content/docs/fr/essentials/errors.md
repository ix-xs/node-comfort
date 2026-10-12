---
title: "Erreurs"
description: "Quand quelque chose échoue à l'exécution (une requête, une commande, des données invalides), node-comfort lève une erreur qui étend `nc.errors.NodeComfortError`, qui étend elle-même `Error`. Chacune a un `name` (la classe) et un `code` stable : vous pouvez ainsi réagir à un échec précis sans analyser les messages."
sidebar:
  order: 5
---

```js
try {
  await nc.http.get("https://api.example.com/users/42");
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

## Les classes

| Classe | `code` | Levée par | Champs supplémentaires |
| --- | --- | --- | --- |
| `AssertionError` | `ERR_ASSERTION` | `assert`, `assertType` | |
| `TimeoutError` | `ETIMEDOUT` | `func.timeout`, `http`, `async.poll`, `emitter.waitFor`... | `timeout` |
| `AbortError` | `ABORT_ERR` | tout ce qui est annulé avec un `AbortSignal`, une invite `cli` annulée | |
| `ValidationError` | `ERR_VALIDATION` | `schema`, `env`, `http` avec un `schema` | `issues`, `flatten()` |
| `HttpError` | `ERR_HTTP`, `ERR_NETWORK` | `http` | `status`, `statusText`, `url`, `method`, `headers`, `data` |
| `JWTError` | `ERR_JWT_*` | `crypto.verifyJWT` | `expiredAt` |
| `ProcessError` | `ERR_PROCESS`, `ETIMEDOUT` | `sys.run`, `sys.exec` | `command`, `exitCode`, `signal`, `stdout`, `stderr`, `timedOut` |
| `SQLiteError` | `ERR_SQLITE` | `SQLite` | `sql`, `sqliteCode` |
| `NodeComfortError` | `ERR_DECRYPT` | `crypto.decrypt` | |

`AbortError` porte le nom `"AbortError"`, comme l'erreur native : les tests du type `error.name === "AbortError"` continuent donc de fonctionner.

`NodeComfortError` est la base de toutes les autres : `error instanceof nc.errors.NodeComfortError` attrape donc toute la famille. `instanceof` fonctionne aussi quand deux copies du package sont installées, par exemple quand l'une de vos dépendances apporte la sienne.

## Codes

Quand une classe a plusieurs codes, le code précise de quel échec il s'agit :

```js
try {
  return nc.crypto.verifyJWT(token, secret);
} catch (error) {
  if (error.code === "ERR_JWT_EXPIRED") return refreshSession();
  throw error;
}
```

- `HttpError` : `ERR_HTTP` quand le serveur a répondu avec un statut qui n'est pas 2xx, ou avec un corps qui n'est pas le JSON que vous exigiez. `ERR_NETWORK` quand aucune réponse n'est revenue (`status` vaut alors `0`).
- `JWTError` : `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` et `ERR_JWT_CLAIM`.
- `ProcessError` : `ERR_PROCESS` quand la commande a échoué, `ETIMEDOUT` quand elle a été arrêtée pour avoir dépassé son `timeout`.
- `ERR_DECRYPT` : le secret est incorrect, ou le texte n'est pas ce que `crypto.encrypt()` a produit. L'erreur arrive sous la forme d'une simple `NodeComfortError`.

## Ce qui n'est pas une NodeComfortError

Une erreur dans l'appel lui-même, comme un mauvais argument, lève une simple `TypeError` ou `RangeError`, comme partout en JavaScript. Un texte impossible à analyser lève une `SyntaxError`.

```js
nc.setLevel("loud");    // RangeError: Unknown log level "loud"
await nc.wait("soon");  // TypeError: Invalid duration: "soon"
nc.JSONParse("oops");   // SyntaxError
```

`instanceof NodeComfortError` sépare donc « ceci a échoué pendant l'exécution » de « cet appel est incorrect ». Le premier cas mérite d'être géré, le second est un bug à corriger.

## Erreurs de validation

Une `ValidationError` liste tous les problèmes, pas seulement le premier. Chaque problème a un `path`, un `code` et un `message` lisible :

```js
const result = User.safeParse(body);
if (!result.success) {
  result.error.issues;    // [{ path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" }]
  result.error.flatten(); // { email: ["Invalid email address"] }, pratique pour les formulaires
}
```

## Causes

Quand une erreur en enveloppe une autre, l'erreur d'origine est conservée dans `cause`, et le logger affiche toute la chaîne :

```js
try {
  db.insert("users", { email });
} catch (error) {
  nc.error(error); // affiche la SQLiteError et l'erreur native qui l'a provoquée
}
```

## Envoyer une erreur en JSON

`JSON.stringify()` donne un objet vide pour une erreur native. Ces erreurs-ci écrivent leur nom, leur code, leur message et leurs champs supplémentaires, sans la pile d'appels :

```js
JSON.stringify(new nc.errors.TimeoutError("Too slow", { timeout: 1000 }));
// '{"name":"TimeoutError","code":"ETIMEDOUT","message":"Too slow","timeout":1000}'

res.status(400).json({ error }); // une ValidationError arrive avec ses issues
```

Une `cause` est incluse sous la forme de son nom, de son message et de son code. Regardez ce qu'une classe transporte avant de l'envoyer à un client : une `HttpError` contient l'`url`, les `headers` et les `data` de la réponse qu'elle a reçue.

## Importer les classes

```js
const { HttpError, ValidationError } = require("@ix-xs/node-comfort/errors");
import { TimeoutError } from "@ix-xs/node-comfort/errors";
```
