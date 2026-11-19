---
title: "Logger"
description: "`nc.logger`: levels, colors, markup, groups, timers and tables in a terminal; one JSON object per line, rotating files and redaction in production. No setup."
---

```js
const { logger } = require("@ix-xs/node-comfort");
```

```js
logger.info("Server listening on port 3000");
logger.success("Database connected");
logger.warn("Cache is almost full");
logger.error(new Error("Payment failed"));
```

```text
[14:30:05] ℹ INFO Server listening on port 3000
[14:30:05] ✔ OK Database connected
[14:30:05] ⚠ WARN Cache is almost full
[14:30:05] ✖ ERROR Error: Payment failed
               at charge (/app/billing.js:42:11)
```

## Levels

| Method | Level | Stream |
| --- | --- | --- |
| `trace` | `trace` | stdout |
| `debug` | `debug` | stdout |
| `log` | `info`, no badge | stdout |
| `info`, `success` | `info` | stdout |
| `warn` | `warn` | stderr |
| `error` | `error` | stderr |
| `fatal` | `fatal` | stderr. Does not exit the process |

Messages below the current level are dropped. The default is `info`, or `LOG_LEVEL`. `silent` hides everything.

```js
logger.setLevel("debug");
logger.getLevel(); // "debug"
if (logger.isLevelEnabled("debug")) logger.debug(buildExpensiveReport());
```

## Debug output by scope

```bash
DEBUG=1 node app.js                  # every logger, as LOG_LEVEL=debug
DEBUG=db node app.js                 # the "db" logger only
DEBUG=db,http:* node app.js          # "db", and the children of "http"
DEBUG=http*,-http:static node app.js # a leading - excludes
```

| `DEBUG` value | Effect |
| --- | --- |
| `1`, `true`, `yes`, `on`, `*` | Default level becomes `debug` (as with any `NODE_DEBUG`). `LOG_LEVEL` wins when set |
| A list of scopes, comma or space separated | The loggers it names print `debug` and `trace`, whatever their level (unless `silent`) |

A pattern matches the whole scope: `http:*` matches `http:router` but not `http`; `http*` matches both. A logger without a scope is not affected.

## Arguments

Objects are pretty-printed. Errors show their stack and their chain of `cause`. The lines after the first are indented, so a value cannot pass for a log line of its own (except `log()` without scope and timestamp, which prints like `console.log`).

```js
logger.info("user:", { id: 1, roles: ["admin"] });
logger.error(new Error("Cannot save order", { cause: dbError }));
```

Control characters in logged values are written as text (`\x1b`, `\r`): a value cannot clear the terminal, change its title or rewrite a line. New lines, tabs, and the colors and links of [`nc.color`](/system/color/) are kept. Colors are removed when the output is not a terminal, in files, and with `NO_COLOR`.

## Markup

```js
logger.log("<% green bold ✔ Saved%> in <% dim 12ms%>");
logger.log("<% #ff8800 Orange%> on <% bg#1e1e2e white a dark background%>");
```

Any style of [`nc.color`](/system/color/) works, plus `#hex`, `bg#hex`, `rgb(r, g, b)` and `bgRgb(r, g, b)`. Only the first argument is read as markup: pass values from outside as the next arguments.

```js
logger.info("<% bold New user:%>", user.name); // a name like "<% red x%>" stays text
logger.configure({ delimiter: { open: "{{", close: "}}" } }); // if <% %> clashes with a template engine
```

## Groups, timers, tables

```js
logger.group("Deploy");
logger.info("Building");
logger.timeStart("upload");
await upload();
logger.timeEnd("upload"); // "upload: 1s 240ms"
logger.groupEnd();

logger.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
logger.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
logger.divider("Results");
```

| Method | Does |
| --- | --- |
| `group(label?)`, `groupEnd()` | Indents what follows. Groups nest |
| `timeStart(label?)`, `timeEnd(label?)` | Prints the time elapsed. The label defaults to `"default"` |
| `table(rows, options?)` | Prints rows as a table. The text alone comes from `nc.cli.table()` |
| `box(text, options?)` | Prints text in a box, see `nc.cli.box()` |
| `divider(title?)` | Prints a horizontal line |

Every method returns the logger: `logger.group("Startup").info("Loading config")`.

## Loggers of your own

```js
const log = logger.create({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200"); // [14:30:05.120] [api] ℹ INFO GET /users 200

const db = log.child("db");  // scope "api:db"
db.debug("query took 12ms"); // shown with DEBUG=api:db or DEBUG=api:*

const reqLog = log.child("request", { fields: { requestId: req.id } });
```

`logger.create(options)` returns an independent logger with the same methods, plus `child(scope, options?)`: same settings, nested scope, its `fields` added to the parent's.

## Options

`logger.create(options)` and `logger.configure(options)` take:

| Option | Default | |
| --- | --- | --- |
| `level` | `LOG_LEVEL`, else `"info"` | Minimum level |
| `scope` | none | Shown as `[db]`. Children extend it (`db:pool`) |
| `timestamp` | `true` | `true` is `[HH:mm:ss]`, `false` hides it, a string is a [`time.format`](/data/time/) pattern |
| `format` | `LOG_FORMAT`, else `"pretty"` | `"json"`: one object per line |
| `colors` | detected | Force colors on or off |
| `delimiter` | `{ open: "<%", close: "%>" }` | Markup delimiters |
| `fields` | none | Added to every JSON record |
| `redact` | none | Keys whose values are hidden |
| `onLog` | none | Called for every message that passes the level |
| `file` | none | A path, or `{ path, maxSize, maxFiles, mode }` |
| `stdout`, `stderr` | `process.stdout`, `process.stderr` | Anything with `write(text)` |

## JSON logs

```js
const log = logger.create({ format: "json", fields: { service: "billing", version: "2.3.0" } });
log.error("charge failed", { orderId: 42 }, error);
```

```json
{"time":"2026-09-11T14:30:05.120Z","level":"error","service":"billing","version":"2.3.0","orderId":42,"err":{"name":"Error","message":"card declined","stack":"Error: card declined\n    at ..."},"msg":"charge failed"}
```

Plain objects are merged into the record, errors go under `err`, the rest becomes `msg`. A logged object cannot replace `time`, `level`, `scope` or `msg`. `LOG_FORMAT=json` switches the default logger without code.

## Redaction

```js
logger.configure({ redact: ["password", "authorization"] });
logger.info("login", { user: "ada", password: "hunter2", headers: { Authorization: "Bearer abc" } });
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

Keys match at any depth, ignoring case, in the terminal, JSON records and files. Only keys are checked: a secret inside a string is printed.

## Forwarding logs

```js
const log = logger.create({
  onLog(entry) {
    if (entry.level === "error" || entry.level === "fatal") alerts.send(entry.scope, entry.message);
  },
});
```

| Entry field | |
| --- | --- |
| `time` | A `Date` |
| `level` | The level: `success()` gives `"info"` |
| `kind` | The method called: `success()` gives `"success"` |
| `scope` | The scope, or `undefined` |
| `message` | The line as written, without colors or timestamp, redacted |
| `args` | The arguments as passed, not redacted |

`onLog` is not awaited. An error it throws, or a promise it rejects, is ignored.

## Log files

```js
logger.configure({ file: { path: "logs/app.log", maxSize: "10MB", maxFiles: 5 } });
```

| `file` option | Default | |
| --- | --- | --- |
| `path` | required | Folders are created. Relative paths start from the working directory: pass `nc.fs.resolve("./logs/app.log")` for a path next to the calling file |
| `maxSize` | no rotation | Past this size, `app.log` becomes `app.log.1` |
| `maxFiles` | `5` | Rotated files kept |
| `mode` | `0o600` | Permissions of a new file. An existing file keeps its own. Ignored on Windows |

Colors are removed in files.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.log()`, `nc.trace()`, `nc.debug()`, `nc.info()`, `nc.success()`, `nc.warn()`, `nc.error()`, `nc.fatal()` | `nc.logger.log()`, `nc.logger.trace()`... the same name under `nc.logger` |
| `nc.group()`, `nc.groupEnd()`, `nc.timeStart()`, `nc.timeEnd()` | `nc.logger.group()`, `nc.logger.groupEnd()`, `nc.logger.timeStart()`, `nc.logger.timeEnd()` |
| `nc.table()`, `nc.box()`, `nc.divider()` | `nc.logger.table()`, `nc.logger.box()`, `nc.logger.divider()` |
| `nc.setLevel()`, `nc.getLevel()`, `nc.isLevelEnabled()`, `nc.configure()` | `nc.logger.setLevel()`, `nc.logger.getLevel()`, `nc.logger.isLevelEnabled()`, `nc.logger.configure()` |
| `nc.setTimestamp(value)`, `nc.logger.setTimestamp(value)` | `nc.logger.configure({ timestamp: value })` |
| `nc.setDelimiter(value)`, `nc.logger.setDelimiter(value)` | `nc.logger.configure({ delimiter: value })` |
| `nc.createLogger()`, `nc.logger.createLogger()` | `nc.logger.create()` |

The old names still work in 3.0, warn once, and are removed in 4.0: see [Upgrading to 3.0](/help/upgrade-3-0/).
