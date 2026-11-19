---
title: "Errors"
description: "A failure at run time throws a subclass of `nc.errors.NodeComfortError` with a stable `code`. A wrong argument throws a plain `TypeError` or `RangeError`."
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

## The classes

| Class | `code` | Thrown by | Extra fields |
| --- | --- | --- | --- |
| `NodeComfortError` | `ERR_ENV_FILE_MISSING`, `ERR_NOT_FOUND`, `ERR_DECRYPT`, `ERR_ARGON2_UNAVAILABLE` | `env.load`, `sys.open`, `crypto.decrypt`, `crypto.hashPassword`, `crypto.verifyPassword` | |
| `AssertionError` | `ERR_ASSERTION` | `nc.assert()`, `nc.assert.type()` | |
| `TimeoutError` | `ETIMEDOUT` | `http`, `async.timeout`, `async.poll`, `emitter.waitFor`... | `timeout` |
| `AbortError` | `ABORT_ERR`, `ERR_INPUT_CLOSED` | Anything cancelled with an `AbortSignal`, a `cli` prompt | |
| `ValidationError` | `ERR_VALIDATION` | `schema`, `env`, `http` with a `schema` | `issues`, `flatten()` |
| `HttpError` | `ERR_HTTP`, `ERR_NETWORK`, `ERR_RESPONSE_TOO_LARGE`, `ERR_REDIRECT`, `ERR_TOO_MANY_REDIRECTS` | `http` | `status`, `statusText`, `url`, `method`, `headers`, `data` |
| `JWTError` | `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE`, `ERR_JWT_CLAIM` | `crypto.decodeJWT`, `crypto.verifyJWT` | `expiredAt` |
| `ProcessError` | `ERR_PROCESS`, `ETIMEDOUT` | `sys.run`, `sys.exec` | `command`, `exitCode`, `signal`, `stdout`, `stderr`, `timedOut` |
| `SQLiteError` | `ERR_SQLITE` | `sqlite` | `sql`, `sqliteCode` |

Every class extends `NodeComfortError`, which extends `Error`: `error instanceof nc.errors.NodeComfortError` catches the whole family. `instanceof` also works across two copies of the package in `node_modules`. `AbortError` is named `"AbortError"`, like the native one.

## Codes

| Code | Meaning |
| --- | --- |
| `ERR_HTTP` | The server answered with a status other than 2xx, or with a body that is not the JSON required |
| `ERR_NETWORK` | No answer came back. `status` is `0` |
| `ERR_RESPONSE_TOO_LARGE` | The body passed `maxResponseSize` (100 MB by default). Not retried |
| `ERR_REDIRECT` | A redirect that cannot be followed: `redirect: "error"`, a scheme other than `http:` or `https:`, a stream body to send again. Not retried |
| `ERR_TOO_MANY_REDIRECTS` | 20 redirects in a row. Not retried |
| `ERR_JWT_*` | The token is malformed, uses another algorithm, has a bad signature, is expired, not valid yet, or a claim does not match |
| `ERR_PROCESS` | The command exited with a code other than 0 |
| `ETIMEDOUT` | Too slow: `TimeoutError`, or `ProcessError` with `timedOut: true` |
| `ABORT_ERR` | An `AbortSignal` fired |
| `ERR_INPUT_CLOSED` | A `cli` prompt lost its input (closed stdin, a pipe that ended) before the answer |
| `ERR_ENV_FILE_MISSING` | `nc.env.load(file, { required: true })` found no file |
| `ERR_NOT_FOUND` | `nc.sys.open()` got a path that does not exist |
| `ERR_DECRYPT` | The secret is wrong, or the text is not what `nc.crypto.encrypt()` produced |
| `ERR_ARGON2_UNAVAILABLE` | Argon2id needs Node.js 24.7 or later |

```js
try {
  return nc.crypto.verifyJWT(token, secret);
} catch (error) {
  if (error.code === "ERR_JWT_EXPIRED") return refreshSession();
  throw error;
}
```

## Mistakes in the call

A wrong argument throws a plain `TypeError` or `RangeError`, as everywhere in JavaScript. It is a bug to fix, not a failure to handle:

```js
nc.logger.setLevel("loud");  // RangeError: Unknown log level "loud"
await nc.async.sleep("soon"); // TypeError: Invalid duration: "soon"
```

`nc.cli.args()` throws a `TypeError` too, for a mistake on the command line, with `code: "ERR_CLI_ARGS"` and a message ready to show to the user.

## Validation errors

A `ValidationError` lists every problem, not only the first:

```js
const result = User.safeParse(body);
if (!result.success) {
  result.error.issues;    // [{ path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" }]
  result.error.flatten(); // { email: ["Invalid email address"] }
}
```

## Causes

An error that wraps another keeps it as `cause`. The logger prints the whole chain:

```js
try {
  db.insert("users", { email });
} catch (error) {
  nc.logger.error(error); // the SQLiteError and the native error under it
}
```

## As JSON

`JSON.stringify()` of a native error gives `{}`. These write their name, code, message and fields, without the stack:

```js
JSON.stringify(new nc.errors.TimeoutError("Too slow", { timeout: 1000 }));
// '{"name":"TimeoutError","code":"ETIMEDOUT","message":"Too slow","timeout":1000}'

res.status(400).json({ error }); // a ValidationError arrives with its issues
```

A `cause` is written as its name, message and code. An `HttpError` holds the `url`, the `headers` and the `data` of the response: its JSON leaves out the cookie and credential headers and a body over 4 KB, and the values of query parameters that look secret (`api_key`, `token`, `sig`...) read `***` in its message and its `url`.

## Importing the classes

```js
const { HttpError, ValidationError } = require("@ix-xs/node-comfort/errors");
import { TimeoutError } from "@ix-xs/node-comfort/errors";
```
