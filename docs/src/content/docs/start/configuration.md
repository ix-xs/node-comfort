---
title: "Configuration"
description: "The settings shared by the whole library: language and time zone, the `.env` file loaded at startup, the default logger, the environment variables read, and the deprecation warnings."
---

```js
const nc = require("@ix-xs/node-comfort");

nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });
nc.logger.configure({ level: "debug" });
```

Every setting is optional. Without any, output is in English, dates in the system time zone, logs at the `info` level.

## Language and time zone

```js
nc.config.set({ locale: "fr", timeZone: "Europe/Paris" }); // { locale: "fr", timeZone: "Europe/Paris" }
nc.num.currency(1234.5, "EUR");                            // "1 234,50 €"
nc.time.format(new Date("2026-01-05T12:00:00Z"), "dddd D MMMM YYYY HH:mm"); // "lundi 5 janvier 2026 13:00"
nc.str.plural(2, { one: "fichier", other: "fichiers" });   // "2 fichiers"
nc.arr.toSentence(["a", "b", "c"]);                        // "a, b et c"
nc.config.get();                                           // { locale: "fr", timeZone: "Europe/Paris" }
```

| Setting | Default | Used by |
| --- | --- | --- |
| `locale` | `"en"` | `num` (formatting), `time` (names, relative dates), `str.plural`, `arr.toSentence` |
| `timeZone` | `undefined`: the system zone | `time`, the timestamps of the logger |

`set()` changes only the keys it is given and returns the settings now in use. It checks them first, and a bad value changes nothing:

| Value | Throws |
| --- | --- |
| `{ locale: "xx_invalid!" }` | `RangeError: Invalid language tag` |
| `{ locale: 42 }` | `TypeError: Invalid locale` |
| `{ timeZone: "Mars/Olympus" }` | `RangeError: Invalid time zone specified` |

`{ timeZone: null }` goes back to the system zone. A function that takes its own `{ locale }` or `{ timeZone }` option uses it for that call only. The settings are global to the process: set them once, at startup.

## The .env file

When the package loads and a `.env` file is in the working directory, its variables are added to `process.env`.

| Rule | |
| --- | --- |
| Already set | A variable that already exists in the environment keeps its value |
| Left out | Variables that can run code or turn off TLS checks: `NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `PATH`, `LD_PRELOAD`, `GIT_SSH_COMMAND` and others of the same kind. A warning on stderr names them |
| Errors | A broken file never stops the program: it is ignored |
| Off | `NODE_COMFORT_DOTENV=false` in the environment |

```text
[@ix-xs/node-comfort] Left out of the automatic .env load, as they can run code or weaken TLS: NODE_OPTIONS. Call env.load() to load them on purpose.
```

To load other files, several files, or on purpose the variables left out, call `nc.env.load()`. To check and convert the variables, `nc.env.validate()`. Both are on the [env page](/essentials/env/).

## The logger

`nc.logger` is a logger ready to use. `configure()` changes its settings, `create()` makes another one:

```js
nc.logger.configure({ level: "debug", timestamp: "YYYY-MM-DD HH:mm:ss" });
nc.logger.debug("visible");
// [2026-11-19 11:57:03] ● DEBUG visible

nc.logger.configure({ format: "json", fields: { service: "api" }, redact: ["password"] });
nc.logger.info("Signed in", { user: "ada", password: "hunter2" });
// {"time":"2026-11-19T10:57:03.678Z","level":"info","service":"api","user":"ada","password":"[redacted]","msg":"Signed in"}
```

| Option | Default |
| --- | --- |
| `level` | `LOG_LEVEL`, else `"info"` |
| `format` | `LOG_FORMAT`, else `"pretty"` |
| `timestamp` | `true` (`[HH:mm:ss]`), `false`, or a `time.format` pattern |
| `colors` | Depends on the terminal |
| `file` | A path, or `{ path, maxSize, maxFiles, mode }` |
| `fields`, `redact`, `scope`, `delimiter`, `stdout`, `stderr`, `onLog` | See the [logger page](/essentials/logger/) |

## Environment variables

| Variable | Effect |
| --- | --- |
| `LOG_LEVEL` | Minimum level of the logger: `trace`, `debug`, `info`, `warn`, `error`, `fatal` or `silent` |
| `LOG_FORMAT=json` | One JSON object per log line |
| `DEBUG` | Shows `debug` logs: `DEBUG=1` for all, `DEBUG=db,http:*` for these scopes |
| `NO_COLOR` | No colors |
| `FORCE_COLOR=1`, `2` or `3` | Colors on, with 16, 256 or 16 million colors |
| `NODE_COMFORT_DOTENV=false` | No automatic `.env` load |
| `NODE_ENV` | The mode read by `nc.env.mode()`, `isProduction()`, `isDevelopment()`, `isTest()` |

## Deprecation warnings

The names of 2.x still work in 3.0. The first use of each prints one warning, then never again:

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

| Node.js flag | Effect |
| --- | --- |
| `--trace-deprecation` | Prints where each old name is used |
| `--no-deprecation` | Silences the warnings |
| `--throw-deprecation` | Throws instead: a test run fails on the first old name |

Each warning has a `code` starting with `NODE_COMFORT_DEP_`, for `process.on("warning")`. [Upgrading to 3.0](/help/upgrade-3-0/) lists every old name and its replacement.
