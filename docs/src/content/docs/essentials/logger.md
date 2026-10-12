---
title: "Logger"
description: "`nc.logger` prints readable, colored logs in development and structured JSON in production, with no setup. Its functions are also available at the top level: `nc.info()` is `nc.logger.info()`."
sidebar:
  order: 1
---

```js
nc.info("Server listening on port 3000");
nc.success("Database connected");
nc.warn("Cache is almost full");
nc.error(new Error("Payment failed"));
```

```text
[14:30:05] ℹ INFO Server listening on port 3000
[14:30:05] ✔ OK Database connected
[14:30:05] ⚠ WARN Cache is almost full
[14:30:05] ✖ ERROR Error: Payment failed
               at charge (/app/billing.js:42:11)
```

## Levels

From the most talkative to the most severe: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. `log` and `success` print at the `info` level. Messages below the current level are dropped.

The default level is `info`. Change it with `LOG_LEVEL=warn`, or in code:

```js
nc.setLevel("debug");
nc.setLevel("silent"); // nothing at all

if (nc.isLevelEnabled("debug")) nc.debug(buildExpensiveReport());
```

`warn`, `error` and `fatal` go to stderr, the rest to stdout. `fatal` doesn't stop the process: call `process.exit(1)` if that's what you want.

## Debug output

Debug messages are hidden until you ask for them, for everything or for the loggers you name:

```js
const db = nc.createLogger({ scope: "db" });
db.debug("SELECT * FROM users"); // hidden by default
```

```bash
DEBUG=1 node app.js           # every logger, as with LOG_LEVEL=debug
DEBUG=db node app.js          # the "db" logger only
DEBUG=db,http:* node app.js   # "db", and the children of "http"
DEBUG=http*,-http:static node app.js
```

`DEBUG=1` (or `true`, `yes`, `on`, `*`) sets the default level to `debug`, and so does `NODE_DEBUG` with any value. `LOG_LEVEL` wins when it's set too.

Any other value of `DEBUG` is a list of scopes, separated by commas or spaces. `*` stands for anything and a leading `-` excludes. The loggers it names print their `debug` and `trace` messages whatever their level, unless that level is `silent`. The others don't change, and neither does a logger without a scope, such as `nc.debug()`.

A pattern has to match the whole scope: `http:*` matches `http:router` but not `http`, while `http*` matches both.

## Errors and objects

Pass anything. Objects are pretty-printed, and errors show their stack trace and their chain of causes:

```js
nc.info("user:", { id: 1, roles: ["admin"] });
nc.error(new Error("Cannot save order", { cause: dbError }));
```

## Markup

Style parts of a message with `<% styles text%>`:

```js
nc.log("<% green bold ✔ Saved%> in <% dim 12ms%>");
nc.log("<% #ff8800 Orange%> on <% bg#1e1e2e white a dark background%>");
```

Any color or style from [`nc.color`](/system/color/) works, plus `#hex`, `bg#hex`, `rgb(r, g, b)` and `bgRgb(r, g, b)`. Spaces before `%>` are kept as part of the text. If `<%` clashes with a template engine, change the delimiters with `nc.setDelimiter({ open: "{{", close: "}}" })`.

## Groups, timers and tables

```js
nc.group("Deploy");
nc.info("Building");
nc.timeStart("upload");
await upload();
nc.timeEnd("upload"); // "upload: 1s 240ms"
nc.groupEnd();

nc.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
nc.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
nc.divider("Results");
```

Every function returns the logger, so calls chain: `nc.group("Startup").info("Loading config")`.

## Loggers with their own settings

`createLogger()` gives you an independent logger. `child()` creates one with the same settings and a nested scope:

```js
const log = nc.createLogger({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200");        // [14:30:05.120] [api] ℹ INFO GET /users 200

const db = log.child("db");        // scope "api:db"
db.debug("query took 12ms");       // shown with DEBUG=api:db or DEBUG=api:*
```

A child can carry its own `fields`. They're added to the parent's, which makes per-request loggers easy:

```js
const reqLog = log.child("request", { fields: { requestId: req.id } });
reqLog.info("payment accepted");   // JSON records include requestId
```

## JSON logs for production

Set `LOG_FORMAT=json`, or pass `format: "json"`, and each message becomes one JSON object per line, ready for Datadog, Loki, CloudWatch and friends:

```js
const log = nc.createLogger({ format: "json", fields: { service: "billing", version: "2.3.0" } });
log.error("charge failed", { orderId: 42 }, error);
```

```json
{"time":"2026-09-11T14:30:05.120Z","level":"error","service":"billing","version":"2.3.0","orderId":42,"err":{"name":"Error","message":"card declined","stack":"Error: card declined\n    at ..."},"msg":"charge failed"}
```

Plain objects in the arguments are merged into the record, errors go under `err`, and everything else becomes the message.

## Hiding secrets

List the keys that must never reach a log, and their values are replaced wherever they appear in a logged object:

```js
nc.configure({ redact: ["password", "authorization"] });
nc.info("login", { user: "ada", password: "hunter2", headers: { Authorization: "Bearer abc" } });
```

```text
[14:30:05] ℹ INFO login {
             "user": "ada",
             "password": "[redacted]",
             "headers": {
               "Authorization": "[redacted]"
             }
           }
```

Keys are found at any depth and case doesn't matter. It works the same in JSON records and in log files. Only keys are looked at: a secret written inside a string is printed as it is.

## Sending logs elsewhere

`onLog` is called for every message that passes the level, once it has been written. Use it to forward logs to another service:

```js
const log = nc.createLogger({
  redact: ["token"],
  onLog(entry) {
    if (entry.level === "error" || entry.level === "fatal") alerts.send(entry.scope, entry.message);
  },
});

log.error("Payment failed", { orderId: 42, token: "abc" });
// entry.message: '✖ ERROR Payment failed {\n  "orderId": 42,\n  "token": "[redacted]"\n}'
```

The entry holds `time` (a `Date`), `level`, `kind` (the method that was called, so `success()` gives the kind `"success"` and the level `"info"`), `scope`, `message` and `args`. `message` is the line as printed, without colors or timestamp. `args` are the values you passed, untouched: `redact` doesn't apply to them.

An error thrown by the hook is ignored, so a broken hook can't take the program down. The hook isn't awaited: if it's async, catch its errors inside it.

## Log files

Write every message to a file as well, with rotation by size:

```js
nc.configure({ file: { path: "logs/app.log", maxSize: "10MB", maxFiles: 5 } });
```

Colors are removed in files. When `app.log` passes 10 MB it becomes `app.log.1`, and the oldest file beyond five is deleted.

## Settings at a glance

`configure()` and `createLogger()` accept `level`, `scope`, `timestamp` (`true`, `false` or a [`time.format`](/data/time/) pattern), `format`, `colors`, `file`, `fields`, `redact`, `onLog`, `delimiter`, and `stdout`/`stderr` streams. Colors turn off by themselves when the output isn't a terminal or when `NO_COLOR` is set. Every function is listed in the [reference](/reference/logger/).
