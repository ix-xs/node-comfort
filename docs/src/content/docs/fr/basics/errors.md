---
title: "Erreurs"
description: "Un échec à l'exécution lève une sous-classe de `nc.errors.NodeComfortError` avec un `code` stable. Un mauvais argument lève une simple `TypeError` ou `RangeError`."
---

```js
const { errors } = require("@ix-xs/node-comfort");
```

```js
try {
  await nc.http.get("https://api.example.com/users/42");
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

## Les classes

| Classe | `code` | Levée par | Champs en plus |
| --- | --- | --- | --- |
| `NodeComfortError` | `ERR_ENV_FILE_MISSING`, `ERR_NOT_FOUND`, `ERR_DECRYPT`, `ERR_ARGON2_UNAVAILABLE` | `env.load`, `sys.open`, `crypto.decrypt`, `crypto.hashPassword`, `crypto.verifyPassword` | |
| `AssertionError` | `ERR_ASSERTION` | `nc.assert()`, `nc.assert.type()` | |
| `TimeoutError` | `ETIMEDOUT` | `http`, `async.timeout`, `async.poll`, `emitter.waitFor`... | `timeout` |
| `AbortError` | `ABORT_ERR`, `ERR_INPUT_CLOSED` | Tout ce qui est annulé par un `AbortSignal`, une question de `cli` | |
| `ValidationError` | `ERR_VALIDATION` | `schema`, `env`, `http` avec un `schema` | `issues`, `flatten()` |
| `HttpError` | `ERR_HTTP`, `ERR_NETWORK`, `ERR_RESPONSE_TOO_LARGE`, `ERR_REDIRECT`, `ERR_TOO_MANY_REDIRECTS` | `http` | `status`, `statusText`, `url`, `method`, `headers`, `data` |
| `JWTError` | `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE`, `ERR_JWT_CLAIM` | `crypto.decodeJWT`, `crypto.verifyJWT` | `expiredAt` |
| `ProcessError` | `ERR_PROCESS`, `ETIMEDOUT` | `sys.run`, `sys.exec` | `command`, `exitCode`, `signal`, `stdout`, `stderr`, `timedOut` |
| `SQLiteError` | `ERR_SQLITE` | `sqlite` | `sql`, `sqliteCode` |

Chaque classe étend `NodeComfortError`, qui étend `Error` : `error instanceof nc.errors.NodeComfortError` attrape toute la famille. `instanceof` fonctionne aussi entre deux copies du paquet dans `node_modules`. `AbortError` s'appelle `"AbortError"`, comme l'erreur native.

## Codes

| Code | Signification |
| --- | --- |
| `ERR_HTTP` | Le serveur a répondu avec un statut autre que 2xx, ou avec un corps qui n'est pas le JSON exigé |
| `ERR_NETWORK` | Aucune réponse n'est revenue. `status` vaut `0` |
| `ERR_RESPONSE_TOO_LARGE` | Le corps a dépassé `maxResponseSize` (100 Mo par défaut). Pas de relance |
| `ERR_REDIRECT` | Une redirection impossible à suivre : `redirect: "error"`, un schéma autre que `http:` ou `https:`, un corps en flux à renvoyer. Pas de relance |
| `ERR_TOO_MANY_REDIRECTS` | 20 redirections d'affilée. Pas de relance |
| `ERR_JWT_*` | Le jeton est mal formé, utilise un autre algorithme, a une mauvaise signature, a expiré, n'est pas encore valide, ou une revendication ne correspond pas |
| `ERR_PROCESS` | La commande s'est terminée avec un code autre que 0 |
| `ETIMEDOUT` | Trop lent : `TimeoutError`, ou `ProcessError` avec `timedOut: true` |
| `ABORT_ERR` | Un `AbortSignal` s'est déclenché |
| `ERR_INPUT_CLOSED` | Une question de `cli` a perdu son entrée (stdin fermé, un pipe terminé) avant la réponse |
| `ERR_ENV_FILE_MISSING` | `nc.env.load(file, { required: true })` n'a trouvé aucun fichier |
| `ERR_NOT_FOUND` | `nc.sys.open()` a reçu un chemin qui n'existe pas |
| `ERR_DECRYPT` | Le secret est faux, ou le texte n'a pas été produit par `nc.crypto.encrypt()` |
| `ERR_ARGON2_UNAVAILABLE` | Argon2id demande Node.js 24.7 ou plus |

```js
try {
  return nc.crypto.verifyJWT(token, secret);
} catch (error) {
  if (error.code === "ERR_JWT_EXPIRED") return refreshSession();
  throw error;
}
```

## Erreurs dans l'appel

Un mauvais argument lève une simple `TypeError` ou `RangeError`, comme partout en JavaScript. C'est un bug à corriger, pas un échec à traiter :

```js
nc.logger.setLevel("loud");  // RangeError: Unknown log level "loud"
await nc.async.sleep("soon"); // TypeError: Invalid duration: "soon"
```

`nc.cli.args()` lève aussi une `TypeError`, pour une erreur sur la ligne de commande, avec `code: "ERR_CLI_ARGS"` et un message prêt à montrer à l'utilisateur.

## Erreurs de validation

Une `ValidationError` liste tous les problèmes, pas seulement le premier :

```js
const result = User.safeParse(body);
if (!result.success) {
  result.error.issues;    // [{ path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" }]
  result.error.flatten(); // { email: ["Invalid email address"] }
}
```

## Causes

Une erreur qui en enveloppe une autre la garde dans `cause`. Le logger affiche toute la chaîne :

```js
try {
  db.insert("users", { email });
} catch (error) {
  nc.logger.error(error); // la SQLiteError et l'erreur native en dessous
}
```

## En JSON

`JSON.stringify()` d'une erreur native donne `{}`. Celles-ci écrivent leur nom, leur code, leur message et leurs champs, sans la pile :

```js
JSON.stringify(new nc.errors.TimeoutError("Too slow", { timeout: 1000 }));
// '{"name":"TimeoutError","code":"ETIMEDOUT","message":"Too slow","timeout":1000}'

res.status(400).json({ error }); // une ValidationError arrive avec ses issues
```

Une `cause` est écrite avec son nom, son message et son code. Une `HttpError` contient l'`url`, les `headers` et les `data` de la réponse : son JSON laisse de côté les en-têtes de cookies et d'identifiants et un corps de plus de 4 Ko, et les valeurs des paramètres de requête qui ressemblent à des secrets (`api_key`, `token`, `sig`...) s'affichent `***` dans son message et son `url`.

## Importer les classes

```js
const { HttpError, ValidationError } = require("@ix-xs/node-comfort/errors");
import { TimeoutError } from "@ix-xs/node-comfort/errors";
```
