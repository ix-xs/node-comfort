---
title: "Organisation"
description: "The shape of the API: 25 namespaces, one way to call each member, factories for the objects that hold state, and the old names kept until 4.0."
---

```js
const nc = require("@ix-xs/node-comfort");

nc.logger.info("Ready");
nc.fs.readJSON("./settings.json", {});
nc.is.email("ada@example.com");
```

## One form

Every member is called as `nc.<namespace>.<member>`. The root holds the 25 namespaces and nothing else:

```js
Object.keys(nc).length; // 25
Object.keys(nc.fs);     // ["read", "readJSON", "readLines", "write", ...]
```

Destructure the namespaces you use, or take one from its own entry point:

```js
const { logger, fs, str } = require("@ix-xs/node-comfort");
const { slugify } = require("@ix-xs/node-comfort/str");
```

[Your editor](/start/editor/) lists the entry points and the ES module forms.

## The namespaces

| Namespace | For | Page |
| --- | --- | --- |
| `config` | Language and time zone shared by the library | [Configuration](/start/configuration/) |
| `logger` | Levels, scopes, JSON logs, files | [Logger](/essentials/logger/) |
| `fs` | Files and folders, synchronous, paths from the calling file | [Files and folders](/essentials/fs/) |
| `env` | Environment variables, `.env` files, validation | [Environment variables](/essentials/env/) |
| `is` | Checks that return a boolean and narrow types | [Checks and assertions](/essentials/is/) |
| `assert` | `nc.assert(value, message)` and `nc.assert.type(value, type)` | [Checks and assertions](/essentials/is/) |
| `errors` | The error classes and their codes | [Errors](/basics/errors/) |
| `json` | Parsing with a fallback, stringifying that never throws | [JSON](/essentials/json/) |
| `str` | Strings | [Strings](/data/str/) |
| `num` | Numbers, statistics, formatting | [Numbers](/data/num/) |
| `arr` | Arrays | [Arrays](/data/arr/) |
| `obj` | Objects, dot paths, deep merge | [Objects](/data/obj/) |
| `schema` | Validation schemas with inferred types | [Schema validation](/data/schema/) |
| `time` | Dates, durations, time zones, schedules | [Dates and time](/data/time/) |
| `id` | UUID, ULID, nano ids, tokens, snowflakes | [Ids](/data/id/) |
| `crypto` | Hashes, passwords, encryption, JWT, TOTP | [Crypto](/system/crypto/) |
| `func` | Debounce, throttle, memoize, composition | [Functions](/flow/func/) |
| `async` | Concurrency, queues, retries, timeouts | [Async and concurrency](/flow/async/) |
| `cache` | In-memory cache with TTL and LRU | [Cache](/flow/cache/) |
| `emitter` | Typed events | [Typed events](/flow/emitter/) |
| `sqlite` | SQLite without SQL for everyday queries | [SQLite](/system/sqlite/) |
| `http` | HTTP client with retries and checks | [HTTP client](/system/http/) |
| `sys` | Processes, ports, shutdown, the machine | [Processes and system](/system/sys/) |
| `cli` | Arguments, prompts, spinners, tables | [Command-line tools](/system/cli/) |
| `color` | Terminal colors | [Colors](/system/color/) |

## Factories and classes

A namespace that hands out objects with their own state has a factory. The class is also exported, to extend it or to check with `instanceof`:

| Factory | Returns | Class |
| --- | --- | --- |
| `nc.logger.create(options)` | A logger with its own settings | |
| `nc.cache.create(options)` | A cache | `nc.cache.Cache` |
| `nc.emitter.create()` | An event emitter | `nc.emitter.Emitter` |
| `nc.sqlite.open(path, options)` | A database connection | `nc.sqlite.SQLite` |
| `nc.http.create(options)` | An HTTP client with defaults | |
| `nc.color.create({ level })` | Colors at a given level | |

```js
const db = nc.sqlite.open("data/app.sqlite");
const sessions = nc.cache.create({ max: 10_000, ttl: "30m" });

class Room extends nc.emitter.Emitter {}
```

## Loading

`require()` builds the root object and stops there. A namespace loads the first time it is read, with the modules of Node.js it needs: a script that only logs never loads the SQLite or crypto code. Numbers are on [Performance](/help/performance/).

## Old names

The names of 2.x (`nc.info()`, `nc.readFile()`, `nc.isEmail()`, `new nc.SQLite()`...) still work in 3.0:

| | |
| --- | --- |
| Behaviour | The same as in 2.x: an old name calls the old implementation |
| Warning | One `DeprecationWarning` per name, the first time it is read, with what to use instead |
| Listing | Not enumerable: `Object.keys()`, `for...in` and spreading show only the 3.0 names, and never warn |
| Editors | Struck through, with the replacement on hover |
| Removal | In 4.0 |

[Upgrading to 3.0](/help/upgrade-3-0/) has the table of every old name, and how to find them in a project.
