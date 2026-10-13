---
title: "nc.errors"
description: "Les erreurs que node-comfort lève quand quelque chose se passe mal à l'exécution : une requête échoue, des données sont invalides, une commande se termine mal. Elles étendent toutes `NodeComfortError` (elle-même une `Error` ordinaire) et portent un `code` stable, vous pouvez donc réagir selon le type d'échec sans analyser les messages."
sidebar:
  label: "errors"
  order: 5
---

Une erreur dans votre propre code, comme un mauvais argument, continue de lever une simple `TypeError` ou `RangeError`, comme partout en JavaScript.

```js
const { errors } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const errors = require("@ix-xs/node-comfort/errors");
```

Cette page liste tout ce que contient `nc.errors`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/errors/).

```js
try {
  await nc.http.get("https://api.example.com/users/42");
} catch (error) {
  if (error instanceof nc.errors.HttpError && error.status === 404) return null;
  throw error;
}
```

## NodeComfortError

```ts
NodeComfortError: typeof NodeComfortError
```

Classe de base de toutes les erreurs de node-comfort. `name` est le nom de la classe et `code` un identifiant stable.

## AssertionError

```ts
AssertionError: typeof AssertionError
```

Levée par `nc.assert()` et `nc.assertType()`.

## TimeoutError

```ts
TimeoutError: typeof TimeoutError
```

Levée quand quelque chose prend trop de temps : `func.timeout`, `async.poll`, les requêtes HTTP, `emitter.waitFor`...

## AbortError

```ts
AbortError: typeof AbortError
```

Levée quand une opération est annulée avec un `AbortSignal`. Son nom est `"AbortError"`, comme les erreurs d'annulation natives, les vérifications existantes continuent donc de fonctionner.

## ValidationError

```ts
ValidationError: typeof ValidationError
```

Levée quand des données ne correspondent pas à un schéma ou quand des variables d'environnement sont invalides. `issues` liste tous les problèmes, pas seulement le premier.

## HttpError

```ts
HttpError: typeof HttpError
```

Levée par `nc.http` quand le statut de la réponse n'est pas 2xx (sauf si vous passez `throwHttpErrors: false`), et pour les échecs réseau (`status` 0).

## JWTError

```ts
JWTError: typeof JWTError
```

Levée par `nc.crypto.verifyJWT()`. Le `code` vous dit pourquoi : `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` ou `ERR_JWT_CLAIM`.

## ProcessError

```ts
ProcessError: typeof ProcessError
```

Levée par `nc.sys.run()` et `nc.sys.exec()` quand une commande échoue, est tuée ou dépasse son délai. Sa sortie est conservée sur l'erreur.

## SQLiteError

```ts
SQLiteError: typeof SQLiteError
```

Levée par `nc.SQLite` quand une instruction échoue. Consultez `sqliteCode` pour traiter des cas précis comme une valeur en double.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { NodeComfortErrorOptions } from "@ix-xs/node-comfort"`.

### NodeComfortErrorOptions

Options communes à tous les constructeurs d'erreur.

| Propriété | Type | Description |
| --- | --- | --- |
| `code?` | `string` | Code lisible par une machine, comme `"ETIMEDOUT"`. |
| `cause?` | `unknown` | L'erreur qui a causé celle-ci, conservée dans `error.cause`. |

### ValidationIssue

Un problème trouvé lors de la validation de données.

| Propriété | Type | Description |
| --- | --- | --- |
| `path` | `(string \| number)[]` | Où se trouve le problème, par exemple `["user", "emails", 0]`. Vide pour la valeur racine. |
| `code` | `string` | Ce qui n'a pas fonctionné : `"invalid_type"`, `"too_small"`, `"invalid_string"`, `"custom"`... |
| `message` | `string` | Un message que vous pouvez montrer aux utilisateurs. |
| `expected?` | `string` | Le type attendu, pour les erreurs de type. |
| `received?` | `string` | Le type reçu, pour les erreurs de type. |
