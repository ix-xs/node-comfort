# Introduction

node-comfort is a standard library for Node.js. It gathers the tools you end up installing in almost every project (a logger, colors, dotenv, a validation library, an HTTP client, retries, a cache, date helpers, ids, password hashing, a CLI toolkit...) into one package with no dependencies.

```js
const nc = require("@ix-xs/node-comfort");

const config = nc.env.validate({ PORT: { type: "port", default: 3000 } });
const users = await nc.http.get("https://api.example.com/users", { retry: { attempts: 3 } });
nc.success(`Loaded ${users.data.length} users`);
```

## Why it exists

A typical Node.js service pulls in a few hundred packages before it does anything useful. Each one is another version to follow, another changelog to read, and another way for a supply-chain attack to reach you. Most of them solve small problems that Node.js can now handle on its own: it ships `fetch`, `Intl`, `node:crypto`, `node:sqlite` and a test runner.

node-comfort is built only on those native modules. You get:

- **One dependency instead of twenty.** Nothing gets installed alongside it, and nothing runs at install time.
- **Consistent APIs.** Durations are always `"5m"` or milliseconds, options are always the last argument, and errors always carry a stable `code`.
- **Documentation where you work.** Every function, parameter and option is described and typed, so your editor can answer most questions before you open a browser.
- **Speed.** Requiring the package costs about 3 ms; each namespace loads the first time you use it.

## What's inside

| Namespace | What it does |
| --- | --- |
| [`logger`](logger.html) | Console logging with levels, colors, markup, JSON output and log files |
| [`fs`](fs.html) | Files and folders: atomic writes, JSON, glob, watch |
| [`checker`](checker.html) | Type checks and validators that double as TypeScript type guards |
| [`env`](env.html) | `.env` loading and typed, validated configuration |
| [`str`](str.html), [`num`](num.html), [`arr`](arr.html), [`obj`](obj.html) | Everyday helpers for strings, numbers, arrays and objects |
| [`time`](time.html) | Dates in any language and time zone, durations, cron |
| [`id`](id.html), [`crypto`](crypto.html) | Ids, tokens, password hashing, encryption, JWT, 2FA codes |
| [`schema`](schema.html) | Validation with TypeScript types inferred for you |
| [`http`](http.html) | A `fetch` client with JSON, retries, timeouts and hooks |
| [`func`](func.html), [`async`](async.html) | Debounce, retry, memoize, concurrency limits, queues |
| [`cli`](cli.html), [`color`](color.html), [`sys`](sys.html) | Command-line tools: arguments, prompts, spinners, colors, processes |
| [`SQLite`](sqlite.html), [`Cache`](cache.html), [`Emitter`](emitter.html) | A database, an LRU cache and a typed event emitter |

## How it's organized

Everything hangs off one object, usually called `nc`. The four historical modules (logger, fs, checker and utils) are also available at the top level, so `nc.info()` and `nc.logger.info()` are the same function. Everything else lives in a namespace: `nc.str.slugify()`, `nc.time.format()`, `nc.http.get()`.

You can also import a single namespace, which is the fastest way to load it:

```js
import { slugify } from "@ix-xs/node-comfort/str";
```

## Next steps

- [Getting started](getting-started.html): install it and write your first script.
- [Your editor](editor.html): make the most of the documentation and types.
- [Recipes](recipes.html): complete examples for common tasks.
