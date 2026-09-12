# Getting started

Install the package, write a first script, and see how the same code works in CommonJS, ES modules and TypeScript.

## Install

```bash
npm install @ix-xs/node-comfort
```

You need Node.js 22.13 or newer. That's the first version where `node:sqlite`, which `nc.SQLite` uses, works without a flag. Check yours with `node --version`.

## Your first script

Create `hello.js`:

```js
const nc = require("@ix-xs/node-comfort");

nc.info("Starting up");

const started = nc.time.stopwatch();
const slug = nc.str.slugify("Héllo Wörld, from node-comfort!");
nc.success(`Slug: ${slug}`);

nc.box(`Done in ${started.stop(true)}`, { title: "hello" });
```

Run it with `node hello.js`. You'll get colored output in a terminal and plain text when you redirect it to a file.

## CommonJS, ES modules and TypeScript

The package works the same way everywhere.

```js
// CommonJS
const nc = require("@ix-xs/node-comfort");
const { str, isEmail } = require("@ix-xs/node-comfort");
```

```js
// ES modules
import nc from "@ix-xs/node-comfort";
import { str, isEmail, nc as toolkit } from "@ix-xs/node-comfort";
```

```ts
// TypeScript: types come with the package
import nc = require("@ix-xs/node-comfort");
import { schema as s, type Infer } from "@ix-xs/node-comfort";
```

The whole toolkit is also exported as `nc` and `nodeComfort`, so `const { nc } = require("@ix-xs/node-comfort")` works too. In an ES module or a TypeScript file, start typing `nc` and let your editor add the import.

## Importing a single namespace

Each namespace has its own entry point:

```js
import { slugify, truncate } from "@ix-xs/node-comfort/str";
import SQLite from "@ix-xs/node-comfort/sqlite";
const { get, set } = require("@ix-xs/node-comfort/obj");
```

In ES modules, this is the way to load only what you use, because Node.js reads every export of the root package when you import it. See [Performance](performance.html) for the numbers.

The entry points are: `logger`, `fs`, `checker`, `utils`, `str`, `num`, `arr`, `obj`, `func`, `time`, `id`, `crypto`, `color`, `cli`, `sys`, `async`, `schema`, `http`, `env`, `errors`, `sqlite`, `cache` and `emitter`.

## The `.env` file

When you require the package, it loads the `.env` file in the working directory if there is one. Variables that are already set are never overwritten, so real environment variables always win.

```bash
# .env
DATABASE_URL=postgres://localhost/app
PORT=3000
```

```js
const nc = require("@ix-xs/node-comfort");
const port = nc.env.port("PORT", { default: 8080 }); // 3000
```

To turn this off, set `NODE_COMFORT_DOTENV=false`. To load other files, call `nc.env.load()` yourself. The [env guide](env.html) covers validation in detail.

## Environment variables that change behavior

| Variable | Effect |
| --- | --- |
| `LOG_LEVEL` | Minimum log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` or `silent` |
| `LOG_FORMAT=json` | Logs become one JSON object per line |
| `DEBUG` | Shows `debug` logs |
| `NO_COLOR` | Turns colors off |
| `FORCE_COLOR=1\|2\|3` | Forces colors on, with 16, 256 or 16 million colors |
| `NODE_COMFORT_DOTENV=false` | Don't load `.env` automatically |

## What's next

- [Your editor](editor.html) shows how to get completions and type checking, in JavaScript too.
- The module guides in the sidebar walk through each namespace.
- The [API reference](../api/index.html) lists every function.
