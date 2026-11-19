---
title: "Circuit breaker"
description: "`nc.circuit` wraps the calls to a service that can go down. After too many failures in a row, calls fail at once with a `CircuitOpenError`; after a pause, a trial call checks whether the service is back."
---

```js
const { circuit } = require("@ix-xs/node-comfort");
```

## Creating a circuit

```js
const payments = circuit.create({ failureThreshold: 5, resetTimeout: "30s" });

const invoice = await payments.execute(() => api.createInvoice(order));
```

`circuit.create(options)` is `new circuit.Circuit(options)`. The class is there to type a variable or to extend it.

| Option | Default | |
| --- | --- | --- |
| `failureThreshold` | `5` | Failures in a row that open the circuit |
| `resetTimeout` | `"30s"` | How long it stays open before a trial, in ms or like `"30s"` |
| `successThreshold` | `1` | Successes in a row, while half-open, that close it |
| `isFailure` | every error | `(error) => boolean`: whether an error counts as a failure |
| `onOpen` | | Called each time the circuit opens |
| `onClose` | | Called each time it closes again |

A circuit decides whether a call may run, from the failures before it. To space calls out, use [`async.rateLimit`](/flow/async/#limiters); to cap how many run at once, [`async.limit`](/flow/async/#limiters); to retry a call, [`async.retry`](/flow/async/).

## States

`status` is `"closed"`, `"open"` or `"half-open"`:

| `status` | `execute(fn)` | Becomes |
| --- | --- | --- |
| `"closed"` | Runs `fn` | `"open"` after `failureThreshold` failures in a row. A success puts the count back to zero |
| `"open"` | Rejects with a `CircuitOpenError`, without running `fn` | `"half-open"` on the first call after `resetTimeout` |
| `"half-open"` | Runs `fn` | `"closed"` after `successThreshold` successes, `"open"` again on a failure |

`status` stays `"open"` until a call comes after `resetTimeout`: the trial is that call. Reopening starts the pause again.

```js
const search = circuit.create({ failureThreshold: 2, resetTimeout: "10s" });

await search.execute(() => api.search("a")).catch(() => {}); // fails
await search.execute(() => api.search("b")).catch(() => {}); // fails: open
search.status; // "open"
await search.execute(() => api.search("c")); // CircuitOpenError, api.search is not called
```

## Errors

`execute` returns a promise of what `fn` returns. An error of `fn` always reaches the caller, after being counted:

```js
try {
  return await payments.execute(() => api.charge(card, amount));
} catch (error) {
  if (error instanceof nc.errors.CircuitOpenError) return "Payments are down, try again in a minute";
  throw error;
}
```

| Error | `code` |
| --- | --- |
| `nc.errors.CircuitOpenError` | `ERR_CIRCUIT_OPEN` |

`isFailure` keeps the errors that say nothing about the service's health out of the count. They are still thrown:

```js
const users = circuit.create({
  isFailure: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
});
```

## Events

```js
const mailer = circuit.create({
  onOpen: () => nc.logger.warn("Mail server down, emails are on hold"),
  onClose: () => nc.logger.info("Mail server back"),
});
```

`onOpen` runs again when a trial fails. A circuit holds no timer: nothing to stop or close.

## Importing the class alone

The subpath exports the class, with a static `create`:

```js
const Circuit = require("@ix-xs/node-comfort/circuit");

const mailer = Circuit.create({ failureThreshold: 3 });
```
