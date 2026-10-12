---
title: "Errors"
description: "When something fails at run time (a request, a command, invalid data), node-comfort throws an error that extends `nc.errors.NodeComfortError`, which extends `Error`. Each has a `name` (the class) and a stable `code`, so you can react to a specific failure without parsing messages."
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

## The classes

| Class | `code` | Thrown by | Extra fields |
| --- | --- | --- | --- |
| `AssertionError` | `ERR_ASSERTION` | `assert`, `assertType` | |
| `TimeoutError` | `ETIMEDOUT` | `func.timeout`, `http`, `async.poll`, `emitter.waitFor`... | `timeout` |
| `AbortError` | `ABORT_ERR` | anything cancelled with an `AbortSignal`, a cancelled `cli` prompt | |
| `ValidationError` | `ERR_VALIDATION` | `schema`, `env`, `http` with a `schema` | `issues`, `flatten()` |
| `HttpError` | `ERR_HTTP`, `ERR_NETWORK` | `http` | `status`, `statusText`, `url`, `method`, `headers`, `data` |
| `JWTError` | `ERR_JWT_*` | `crypto.verifyJWT` | `expiredAt` |
| `ProcessError` | `ERR_PROCESS`, `ETIMEDOUT` | `sys.run`, `sys.exec` | `command`, `exitCode`, `signal`, `stdout`, `stderr`, `timedOut` |
| `SQLiteError` | `ERR_SQLITE` | `SQLite` | `sql`, `sqliteCode` |
| `NodeComfortError` | `ERR_DECRYPT` | `crypto.decrypt` | |

`AbortError` is named `"AbortError"`, like the native one, so checks such as `error.name === "AbortError"` keep working.

`NodeComfortError` is the base of all the others, so `error instanceof nc.errors.NodeComfortError` catches the whole family. `instanceof` also works when two copies of the package are installed, for instance when one of your dependencies brings its own.

## Codes

When a class has several codes, the code says which failure it was:

```js
try {
  return nc.crypto.verifyJWT(token, secret);
} catch (error) {
  if (error.code === "ERR_JWT_EXPIRED") return refreshSession();
  throw error;
}
```

- `HttpError`: `ERR_HTTP` when the server answered with a status that isn't 2xx, or with a body that isn't the JSON you required. `ERR_NETWORK` when no answer came back (`status` is then `0`).
- `JWTError`: `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` and `ERR_JWT_CLAIM`.
- `ProcessError`: `ERR_PROCESS` when the command failed, `ETIMEDOUT` when it was stopped for exceeding its `timeout`.
- `ERR_DECRYPT`: the secret is wrong, or the text isn't what `crypto.encrypt()` produced. It comes as a plain `NodeComfortError`.

## What isn't a NodeComfortError

A mistake in the call itself, like a wrong argument, throws a plain `TypeError` or `RangeError`, as it does everywhere in JavaScript. Text that can't be parsed throws a `SyntaxError`.

```js
nc.setLevel("loud");    // RangeError: Unknown log level "loud"
await nc.wait("soon");  // TypeError: Invalid duration: "soon"
nc.JSONParse("oops");   // SyntaxError
```

So `instanceof NodeComfortError` separates "this failed while running" from "this call is wrong". The first kind is worth handling, the second is a bug to fix.

## Validation errors

A `ValidationError` lists every problem, not just the first. Each issue has a `path`, a `code` and a readable `message`:

```js
const result = User.safeParse(body);
if (!result.success) {
  result.error.issues;    // [{ path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" }]
  result.error.flatten(); // { email: ["Invalid email address"] }, handy for forms
}
```

## Causes

When an error wraps another one, the original is kept as `cause`, and the logger prints the whole chain:

```js
try {
  db.insert("users", { email });
} catch (error) {
  nc.error(error); // shows the SQLiteError and the native error that caused it
}
```

## Sending an error as JSON

`JSON.stringify()` gives an empty object for a native error. These errors write their name, code, message and extra fields, without the stack:

```js
JSON.stringify(new nc.errors.TimeoutError("Too slow", { timeout: 1000 }));
// '{"name":"TimeoutError","code":"ETIMEDOUT","message":"Too slow","timeout":1000}'

res.status(400).json({ error }); // a ValidationError arrives with its issues
```

A `cause` is included as its name, message and code. Look at what a class carries before sending it to a client: an `HttpError` holds the `url`, the `headers` and the `data` of the response it got.

## Importing the classes

```js
const { HttpError, ValidationError } = require("@ix-xs/node-comfort/errors");
import { TimeoutError } from "@ix-xs/node-comfort/errors";
```
