---
title: "nc.logger"
description: "A console logger that works with zero setup: levels, colors, a small markup for styling, groups, timers and tables. In production, switch to one JSON object per line with `LOG_FORMAT=json`, and write to rotating files if you need to."
sidebar:
  label: "logger"
  order: 1
---

Markup: `<% red bold Error:%> disk is full`. Any style name works, plus
`#ff8800`, `bg#1e1e2e`, `rgb(255, 128, 0)` and `bgRgb(...)`.

Levels, from chatty to severe: `trace`, `debug`, `info`, `warn`, `error`,
`fatal`. The default is `info`; `LOG_LEVEL` changes it. `DEBUG=1` shows
debug messages, and `DEBUG=db,http:*` only those of the loggers with these
scopes. Warnings and errors go to stderr.

```js
const { logger } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const logger = require("@ix-xs/node-comfort/logger");
```

These functions are also at the top level: `nc.log()` is `nc.logger.log()`.

This page lists everything `nc.logger` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/logger/).

```js
nc.info("Server listening on port 3000");
nc.warn("Cache is almost full");
nc.error(new Error("Payment failed", { cause: err }));
nc.log("<% cyan bold Tip:%> press <% bgWhite black  q  %> to quit");
```

## log

```ts
log(...args: unknown[]): typeof nc.logger
```

Prints a message without a badge. Strings support markup, objects are
pretty-printed, and several arguments are joined with spaces.

```js
nc.log("<% green ✔ Saved %> in <% bold 12ms %>");
nc.log("user:", { id: 1, roles: ["admin"] });
```

## trace

```ts
trace(...args: unknown[]): typeof nc.logger
```

Very detailed diagnostics, shown only at the `trace` level.

## debug

```ts
debug(...args: unknown[]): typeof nc.logger
```

Diagnostics for developers, shown at the `debug` level (the default when
`DEBUG` is set).

```js
nc.debug("cache miss", { key });
```

## info

```ts
info(...args: unknown[]): typeof nc.logger
```

An informational message.

```js
nc.info("Server listening on http://localhost:3000");
```

## success

```ts
success(...args: unknown[]): typeof nc.logger
```

A success message.

```js
nc.success("Database connected");
```

## warn

```ts
warn(...args: unknown[]): typeof nc.logger
```

A warning, written to stderr.

## error

```ts
error(...args: unknown[]): typeof nc.logger
```

An error, written to stderr. Error objects show their stack trace and
their chain of causes.

```js
nc.error(new Error("Cannot save order", { cause: dbError }));
```

## fatal

```ts
fatal(...args: unknown[]): typeof nc.logger
```

A fatal error, written to stderr. It doesn't stop the process; call
`process.exit(1)` yourself if you mean to.

## group

```ts
group(label?: string): typeof nc.logger
```

Prints a label and indents what follows, until `groupEnd()`. Groups nest.

```js
nc.group("Startup").info("Loading config");
nc.group("Database").success("Connected").groupEnd();
nc.groupEnd();
```

## groupEnd

```ts
groupEnd(): typeof nc.logger
```

Closes the current group.

## timeStart

```ts
timeStart(label?: string): typeof nc.logger
```

Starts a named timer. `timeEnd()` prints the elapsed time.

| Parameter | Type | Description |
| --- | --- | --- |
| `label?` | `string` | Defaults to `"default"`. |

```js
nc.timeStart("import");
await importProducts();
nc.timeEnd("import"); // "import: 1.24s"
```

## timeEnd

```ts
timeEnd(label?: string): typeof nc.logger
```

Prints the time since `timeStart()` with the same label.

| Parameter | Type | Description |
| --- | --- | --- |
| `label?` | `string` | Defaults to `"default"`. |

## table

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): typeof nc.logger
```

Prints rows as a table.

```js
nc.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
```

## box

```ts
box(text: string, options?: BoxOptions): typeof nc.logger
```

Prints text in a box. Nice for startup banners.

```js
nc.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
```

## divider

```ts
divider(title?: string): typeof nc.logger
```

Prints a horizontal line, with an optional title in it.

## setLevel

```ts
setLevel(level: LogLevel): typeof nc.logger
```

Sets the minimum level.

**Throws** `RangeError`: For an unknown level.

```js
nc.setLevel("warn");   // warnings and errors only
nc.setLevel("silent"); // nothing
```

## getLevel

```ts
getLevel(): LogLevel
```

The current minimum level.

## isLevelEnabled

```ts
isLevelEnabled(level: LogLevel): boolean
```

Would this level be printed? Use it to skip building expensive debug
output.

```js
if (nc.isLevelEnabled("debug")) nc.debug(buildHugeReport());
```

## configure

```ts
configure(options: LoggerOptions): typeof nc.logger
```

Changes several settings at once.

```js
nc.configure({ level: "debug", file: "logs/app.log" });
nc.configure({ format: "json", fields: { service: "api" } });
```

## setTimestamp

```ts
setTimestamp(value: string | boolean): typeof nc.logger
```

Shows or hides timestamps, or sets their pattern.

```js
nc.setTimestamp(false);
nc.setTimestamp("YYYY-MM-DD HH:mm:ss.SSS");
```

## setDelimiter

```ts
setDelimiter(options?: { open?: string; close?: string; } | undefined): typeof nc.logger
```

Changes the markup delimiters, for when `<%` clashes with a template
engine.

```js
nc.setDelimiter({ open: "{{", close: "}}" });
nc.log("{{red Hello}} world");
```

## createLogger

```ts
createLogger(options?: LoggerOptions): Logger
```

Creates a logger with its own settings.

```js
const log = nc.createLogger({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200"); // [14:30:05.120] [api] ℹ INFO GET /users 200
log.child("db").debug("query took 12ms");

const prod = nc.createLogger({ format: "json", fields: { service: "billing" } });
prod.error("charge failed", { orderId: 42 }, error);
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { LogEntry } from "@ix-xs/node-comfort"`.

### LogEntry

A message as `onLog` receives it.

| Property | Type | Description |
| --- | --- | --- |
| `time` | `Date` |  |
| `level` | [`LogLevel`](#loglevel) |  |
| `kind` | `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal" \| "log" \| "success"` | The method that was called. |
| `scope` | `string` |  |
| `message` | `string` | The line as written, without colors or timestamp. |
| `args` | `unknown[]` | What was passed to the method, untouched. |

### LogFileOptions

Writing logs to a file.

| Property | Type | Description |
| --- | --- | --- |
| `path` | `string` | The file to append to. Folders are created, colors removed. |
| `maxSize?` | `string \| number` | Rotate past this size, like `"10MB"`. |
| `maxFiles?` | `number` | How many rotated files to keep. Defaults to `5`. |

### Logger

A logger from `createLogger()`. Every method returns the logger, so calls chain.

| Property | Type | Description |
| --- | --- | --- |
| `log` | `(...args: unknown[]) => `[`Logger`](#logger) | A plain message, no badge. Supports markup. |
| `trace` | `(...args: unknown[]) => `[`Logger`](#logger) | Very detailed diagnostics, hidden unless the level is `trace`. |
| `debug` | `(...args: unknown[]) => `[`Logger`](#logger) | Diagnostics, hidden unless the level is `debug` or lower. |
| `info` | `(...args: unknown[]) => `[`Logger`](#logger) | An `ℹ INFO` message. |
| `success` | `(...args: unknown[]) => `[`Logger`](#logger) | A `✔ OK` message. |
| `warn` | `(...args: unknown[]) => `[`Logger`](#logger) | A `⚠ WARN` message, on stderr. |
| `error` | `(...args: unknown[]) => `[`Logger`](#logger) | An `✖ ERROR` message, on stderr. Errors show their stack and cause. |
| `fatal` | `(...args: unknown[]) => `[`Logger`](#logger) | An `✖ FATAL` message, on stderr. |
| `group` | `(label?: string) => `[`Logger`](#logger) | Prints a label and indents what follows. Groups nest. |
| `groupEnd` | `() => `[`Logger`](#logger) | Closes the current group. |
| `timeStart` | `(label?: string) => `[`Logger`](#logger) | Starts a named timer. |
| `timeEnd` | `(label?: string) => `[`Logger`](#logger) | Prints how long since `timeStart(label)`. |
| `table` | `(rows: ``Record``<string, unknown>[] \| unknown[][], options?: `[`TableOptions`](/reference/cli/#tableoptions)`) => `[`Logger`](#logger) | Prints rows as a table. |
| `box` | `(text: string, options?: `[`BoxOptions`](/reference/cli/#boxoptions)`) => `[`Logger`](#logger) | Prints text in a box. |
| `divider` | `(title?: string) => `[`Logger`](#logger) | Prints a horizontal line. |
| `child` | `(scope: string, options?: `[`LoggerOptions`](#loggeroptions)`) => `[`Logger`](#logger) | A logger with the same settings and a nested scope. Its `fields` are added to the parent's. |
| `setLevel` | `(level: `[`LogLevel`](#loglevel)`) => `[`Logger`](#logger) | Changes the minimum level. |
| `getLevel` | `() => `[`LogLevel`](#loglevel) | The current minimum level. |
| `isLevelEnabled` | `(level: `[`LogLevel`](#loglevel)`) => boolean` | Would this level be printed? Skip expensive debug output when it wouldn't. |
| `configure` | `(options: `[`LoggerOptions`](#loggeroptions)`) => `[`Logger`](#logger) | Changes several settings at once. |

### LoggerOptions

Options for `createLogger()` and `configure()`.

| Property | Type | Description |
| --- | --- | --- |
| `level?` | [`LogLevel`](#loglevel) | Hide messages below this level. Defaults to `LOG_LEVEL`, else `"info"`. |
| `scope?` | `string` | Shown before each message, like `[db]`. Child loggers extend it (`db:pool`). |
| `timestamp?` | `string \| boolean` | `true` shows `[HH:mm:ss]`, `false` hides it, a string is a `time.format` pattern. Defaults to `true`. |
| `format?` | `"pretty" \| "json"` | `"json"` writes one object per line, for log collectors. Defaults to `LOG_FORMAT`, else `"pretty"`. |
| `delimiter?` | `{ open?: string; close?: string; }` | Markup delimiters. Defaults to `<%` and `%>`. |
| `colors?` | `boolean` | Force colors on or off. By default, it depends on the terminal. |
| `stdout?` | [`LogStream`](#logstream) | Where `trace` to `info` go. Defaults to `process.stdout`. |
| `stderr?` | [`LogStream`](#logstream) | Where `warn`, `error` and `fatal` go. Defaults to `process.stderr`. |
| `file?` | `string \| `[`LogFileOptions`](#logfileoptions) | Also write every message to a file. |
| `fields?` | `Record``<string, unknown>` | Added to every JSON record, like a service name. |
| `redact?` | `string[]` | Keys whose values are replaced by `"[redacted]"` wherever they appear in logged objects, like `["password", "authorization"]`. Case doesn't matter. |
| `onLog?` | `((entry: `[`LogEntry`](#logentry)`) => void)` | Called for every message that passes the level, to send logs somewhere else. An error it throws is ignored: logging never breaks the program. |

### LogLevel

Log levels, from the most verbose to the most severe. `silent` hides everything.

```ts
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"
```

### LogStream

Where logs go: `process.stdout`, a file stream, or anything with a
`write(text)` method.

| Property | Type | Description |
| --- | --- | --- |
| `write` | `(text: string) => unknown` |  |
