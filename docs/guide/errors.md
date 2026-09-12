# Errors

Every error node-comfort throws extends `nc.errors.NodeComfortError`, which extends `Error`. Each has a `name` (the class) and a stable `code`, so you can react to a specific failure without parsing messages.

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
| `AbortError` | `ABORT_ERR` | anything cancelled with an `AbortSignal` | |
| `ValidationError` | `ERR_VALIDATION` | `schema`, `env.validate` | `issues`, `flatten()` |
| `HttpError` | `ERR_HTTP`, `ERR_NETWORK` | `http` | `status`, `statusText`, `url`, `method`, `headers`, `data` |
| `JWTError` | `ERR_JWT_*` | `crypto.verifyJWT` | `expiredAt` |
| `ProcessError` | `ERR_PROCESS`, `ETIMEDOUT` | `sys.run`, `sys.exec` | `command`, `exitCode`, `signal`, `stdout`, `stderr`, `timedOut` |
| `SQLiteError` | `ERR_SQLITE` | `SQLite` | `sql`, `sqliteCode` |

`AbortError` is named `"AbortError"`, like the native one, so checks such as `error.name === "AbortError"` keep working.

## Validation errors

A `ValidationError` lists every problem, not just the first. Each issue has a `path`, a `code` and a readable `message`:

```js
const result = User.safeParse(body);
if (!result.success) {
  result.error.issues;    // [{ path: ["email"], code: "invalid_string", message: "Invalid email address" }]
  result.error.flatten(); // { email: ["Invalid email address"] }, handy for forms
}
```

## Causes

When an error wraps another one, the original is kept as `cause`, and the logger prints the whole chain:

```js
catch (error) {
  nc.error(error); // shows the SQLiteError and the native error that caused it
}
```

## Importing the classes

```js
const { HttpError, ValidationError } = require("@ix-xs/node-comfort/errors");
import { TimeoutError } from "@ix-xs/node-comfort/errors";
```
