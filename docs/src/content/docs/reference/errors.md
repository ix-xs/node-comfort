---
title: "nc.errors"
description: "The errors node-comfort throws when something goes wrong at run time: a request fails, data is invalid, a command exits badly. They all extend `NodeComfortError` (itself a regular `Error`) and carry a stable `code`, so you can branch on the kind of failure without parsing messages."
sidebar:
  label: "errors"
  order: 5
---

A mistake in your own code, like a wrong argument, still throws a plain
`TypeError` or `RangeError`, as it does everywhere in JavaScript.

```js
const { errors } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const errors = require("@ix-xs/node-comfort/errors");
```

This page lists everything `nc.errors` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/errors/).

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

Base class of every node-comfort error. `name` is the class name and
`code` a stable identifier.

## AssertionError

```ts
AssertionError: typeof AssertionError
```

Thrown by `nc.assert()` and `nc.assertType()`.

## TimeoutError

```ts
TimeoutError: typeof TimeoutError
```

Thrown when something takes too long: `func.timeout`, `async.poll`, HTTP
requests, `emitter.waitFor`...

## AbortError

```ts
AbortError: typeof AbortError
```

Thrown when an operation is cancelled with an `AbortSignal`. Its name is
`"AbortError"`, like native abort errors, so existing checks keep working.

## ValidationError

```ts
ValidationError: typeof ValidationError
```

Thrown when data doesn't match a schema or when environment variables are
invalid. `issues` lists every problem, not just the first one.

## HttpError

```ts
HttpError: typeof HttpError
```

Thrown by `nc.http` when the response status isn't 2xx (unless you pass
`throwHttpErrors: false`), and for network failures (`status` 0).

## JWTError

```ts
JWTError: typeof JWTError
```

Thrown by `nc.crypto.verifyJWT()`. The `code` tells you why:
`ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`,
`ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` or `ERR_JWT_CLAIM`.

## ProcessError

```ts
ProcessError: typeof ProcessError
```

Thrown by `nc.sys.run()` and `nc.sys.exec()` when a command fails, is
killed or times out. Its output is kept on the error.

## SQLiteError

```ts
SQLiteError: typeof SQLiteError
```

Thrown by `nc.SQLite` when a statement fails. Check `sqliteCode` to handle
specific cases like a duplicate value.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { NodeComfortErrorOptions } from "@ix-xs/node-comfort"`.

### NodeComfortErrorOptions

Options shared by every error constructor.

| Property | Type | Description |
| --- | --- | --- |
| `code?` | `string` | Machine-readable code, like `"ETIMEDOUT"`. |
| `cause?` | `unknown` | The error that caused this one, kept as `error.cause`. |

### ValidationIssue

One problem found while validating data.

| Property | Type | Description |
| --- | --- | --- |
| `path` | `(string \| number)[]` | Where the problem is, like `["user", "emails", 0]`. Empty for the root value. |
| `code` | `string` | What went wrong: `"invalid_type"`, `"too_small"`, `"invalid_string"`, `"custom"`... |
| `message` | `string` | A message you can show to users. |
| `expected?` | `string` | The expected type, for type errors. |
| `received?` | `string` | The received type, for type errors. |
