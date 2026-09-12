<div align="center">

# node-comfort

**The standard library Node.js deserves.**

Logging, config, validation, HTTP, SQLite, dates, crypto, CLI tools and 500+ helpers.<br>
One package, zero dependencies, documented right in your editor.

[![npm version](https://img.shields.io/npm/v/@ix-xs/node-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)
[![Downloads](https://img.shields.io/npm/dm/@ix-xs/node-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)
[![CI](https://github.com/ix-xs/node-comfort/actions/workflows/ci.yml/badge.svg)](https://github.com/ix-xs/node-comfort/actions/workflows/ci.yml)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@ix-xs/node-comfort?activeTab=dependencies)
[![Node](https://img.shields.io/node/v/@ix-xs/node-comfort.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

[Documentation](https://ix-xs.github.io/node-comfort/) •
[Getting started](https://ix-xs.github.io/node-comfort/guide/getting-started.html) •
[API reference](https://ix-xs.github.io/node-comfort/api/index.html) •
[Recipes](https://ix-xs.github.io/node-comfort/guide/recipes.html) •
[Changelog](./CHANGELOG.md)

</div>

---

Most Node.js projects install the same twenty packages before writing a single line of their own: a logger, dotenv, a validation library, an HTTP client, a retry helper, a date library, uuid, bcrypt, a CLI parser, a spinner. Hundreds of transitive dependencies come with them.

Node.js can do most of this on its own now. It ships `fetch`, `Intl`, `node:crypto` and even SQLite. node-comfort is the missing layer on top: one consistent, fully typed API, and nothing else to install.

```js
const nc = require("@ix-xs/node-comfort");

const config = nc.env.validate({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url" },
});

const db = new nc.SQLite("./data/app.sqlite");
const github = nc.http.create({ baseURL: "https://api.github.com/", retry: { attempts: 3 } });

const { data: repo } = await github.get("repos/nodejs/node");
nc.info(`Node.js has <% yellow ${nc.num.abbreviate(repo.stargazers_count)} %> stars`);

nc.sys.onShutdown(() => db.close());
```

## Install

```bash
npm install @ix-xs/node-comfort
```

Node.js 22.13 or newer. That's the first version where `node:sqlite` works without a flag.

## Why node-comfort

- **Zero dependencies.** Built only on Node's own modules. No install scripts, nothing else to audit or keep up to date.
- **Your editor already knows it.** Every function, parameter and option is typed and documented, with examples. Type `nc.` and look around. It works in plain JavaScript too.
- **Fast to load.** Namespaces load the first time you use them. Requiring the package takes about 3 ms, and a script that only logs never loads the database or the HTTP client.
- **Safe by default.** Prototype-pollution-proof objects, scrypt passwords, AES-256-GCM, constant-time comparisons, parameterized SQL, atomic file writes.
- **One way of doing things.** Durations are always `"5m"` or milliseconds, options always come last, and every error has a stable `code`.
- **Tested everywhere.** Linux, macOS and Windows, Node.js 22 and 24, TypeScript 5.9, 6 and 7.

## What's inside

| Namespace | What it's for | Often replaces |
| --- | --- | --- |
| [Logger](https://ix-xs.github.io/node-comfort/guide/logger.html) | Colorful logs, levels, JSON output, log files with rotation | `chalk`, `pino`, `winston` |
| [`fs`](https://ix-xs.github.io/node-comfort/guide/fs.html) | Files and folders without try/catch, atomic writes, glob, watch | `fs-extra`, `glob`, `rimraf` |
| [`checker`](https://ix-xs.github.io/node-comfort/guide/checker.html) | 60+ type guards and validators, `assert` | `is`, `validator` |
| [`env`](https://ix-xs.github.io/node-comfort/guide/env.html) | `.env` loading, typed and validated configuration | `dotenv`, `envalid` |
| [`schema`](https://ix-xs.github.io/node-comfort/guide/schema.html) | Data validation with TypeScript inference | `zod`, `yup`, `joi` |
| [`http`](https://ix-xs.github.io/node-comfort/guide/http.html) | `fetch` with JSON, retries, timeouts, hooks, downloads | `axios`, `got`, `ky` |
| [`SQLite`](https://ix-xs.github.io/node-comfort/guide/sqlite.html) | CRUD, filters, JSON columns, transactions, migrations | `better-sqlite3` and helpers |
| [`time`](https://ix-xs.github.io/node-comfort/guide/time.html) | Formatting in any language and time zone, durations, date math, cron | `dayjs`, `ms`, `node-cron` |
| [`str`](https://ix-xs.github.io/node-comfort/guide/str.html) | Case conversion, slugs, emoji-safe truncation, fuzzy matching, plurals | `lodash`, `slugify`, `leven` |
| [`num`](https://ix-xs.github.io/node-comfort/guide/num.html) | Exact rounding, statistics, currencies, bytes | `numeral`, `pretty-bytes` |
| [`arr`](https://ix-xs.github.io/node-comfort/guide/arr.html) | Chunk, group, multi-key sort, paginate, set operations | `lodash` |
| [`obj`](https://ix-xs.github.io/node-comfort/guide/obj.html) | Deep clone, merge, equal and diff, typed dot paths | `lodash`, `deepmerge`, `dequal` |
| [`func`](https://ix-xs.github.io/node-comfort/guide/func.html) | Debounce, throttle, memoize, retry with backoff, timeout | `p-retry`, `p-timeout` |
| [`async`](https://ix-xs.github.io/node-comfort/guide/async.html) | Concurrency limits, queues, mutex, polling | `p-limit`, `p-map`, `p-queue` |
| [`Cache`](https://ix-xs.github.io/node-comfort/guide/cache.html) | LRU cache with TTL, loaders and statistics | `lru-cache` |
| [`Emitter`](https://ix-xs.github.io/node-comfort/guide/emitter.html) | Typed events, `waitFor`, async iteration | `mitt`, `emittery` |
| [`id`](https://ix-xs.github.io/node-comfort/guide/id.html) | UUID v4 and v7, ULID, nanoid, tokens, Snowflakes | `uuid`, `ulid`, `nanoid` |
| [`crypto`](https://ix-xs.github.io/node-comfort/guide/crypto.html) | Passwords, encryption, JWT, TOTP two-factor codes | `bcrypt`, `jsonwebtoken`, `otplib` |
| [`cli`](https://ix-xs.github.io/node-comfort/guide/cli.html) | Typed arguments, prompts, menus, spinners, progress bars, tables | `commander`, `inquirer`, `ora` |
| [`color`](https://ix-xs.github.io/node-comfort/guide/color.html) | Chainable terminal colors, truecolor, gradients, links | `chalk`, `picocolors` |
| [`sys`](https://ix-xs.github.io/node-comfort/guide/sys.html) | Run commands, `which`, graceful shutdown, platform detection | `execa`, `which` |
| [`utils`](https://ix-xs.github.io/node-comfort/guide/utils.html) | `wait`, safe JSON, crash guard | |
| [`errors`](https://ix-xs.github.io/node-comfort/guide/errors.html) | Error classes with stable codes | |

The logger, `fs`, `checker` and `utils` helpers are also available at the top level: `nc.info()`, `nc.readJSON()`, `nc.isEmail()`, `nc.wait()`.

## Importing

```js
// CommonJS
const nc = require("@ix-xs/node-comfort");
const { str, isEmail, info } = require("@ix-xs/node-comfort");

// ES modules
import nc from "@ix-xs/node-comfort";
import { slugify } from "@ix-xs/node-comfort/str";   // loads only what it needs
```

Every namespace has its own entry point (`@ix-xs/node-comfort/http`, `/sqlite`, `/schema`...). In an ES module, importing from these keeps startup lean. See [Performance](https://ix-xs.github.io/node-comfort/guide/performance.html).

TypeScript needs no setup: the types ship with the package.

```ts
import { schema as s, type Infer } from "@ix-xs/node-comfort";

const User = s.object({ email: s.string().email(), age: s.number().int().optional() });
type User = Infer<typeof User>; // { email: string; age?: number | undefined }
```

## A quick tour

**Logs** that look good in a terminal and turn into JSON in production:

```js
nc.info("Server listening on port 3000").success("Connected to the database");
nc.log("<% cyan bold Tip:%> press <% bgWhite black  q  %> to quit");

const log = nc.createLogger({ scope: "api", file: { path: "./logs/api.log", maxSize: "10MB", maxFiles: 5 } });
const reqLog = log.child("request", { fields: { requestId: "a1b2" } });
```

**Validation** with the type inferred for you:

```js
const User = nc.schema.object({
  email: nc.schema.string().trim().email(),
  age: nc.schema.number().int().min(18).optional(),
  role: nc.schema.enum(["admin", "user"]).default("user"),
});

const result = User.safeParse(req.body);
if (!result.success) return res.status(400).json(result.error.flatten());
```

**HTTP** on top of `fetch`, with the parts you always end up writing:

```js
const api = nc.http.create({
  baseURL: "https://api.example.com/v1/",
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
  retry: { attempts: 3 },
});

const { data: users } = await api.get("users", { query: { page: 2 } });
await api.post("users", { name: "Ada" });
```

**SQLite** without compiling anything, with objects in and objects out:

```js
const db = new nc.SQLite("./data/app.sqlite");

db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
const admins = db.getAll("users", { role: ["admin", "owner"], age: { gte: 18 } }, { orderBy: "email", limit: 20 });
db.transaction(() => {
  db.update("accounts", { balance: 90 }, { id: 1 });
  db.update("accounts", { balance: 110 }, { id: 2 });
});
```

**Dates** in any language and time zone:

```js
nc.time.setLocale("fr").setTimezone("Europe/Paris");
nc.time.format(new Date(), "dddd D MMMM YYYY HH:mm"); // "vendredi 11 septembre 2026 14:30"
nc.time.relative(Date.now() - 3 * 3600e3);            // "il y a 3 heures"
nc.time.cron("0 9 * * 1-5", sendReport);              // weekdays at 9:00
```

**Command-line tools** with typed flags, prompts and spinners:

```js
const { flags } = nc.cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
}, { version: "1.0.0" });                              // --help and --version for free

const env = await nc.cli.select("Environment?", ["staging", "production"]);
const spinner = nc.cli.spinner(`Deploying to ${env}`).start();
spinner.succeed("Deployed");
```

That's a small part of it. The [guide](https://ix-xs.github.io/node-comfort/guide/introduction.html) walks through every namespace, and the [recipes](https://ix-xs.github.io/node-comfort/guide/recipes.html) show them working together: a small API server, a CLI, a scheduled job.

## Coming from 1.x

2.0 keeps the 1.x API but changes a few behaviors. The main ones:

- Node.js 22.13 or newer is required.
- SQLite methods throw a `SQLiteError` instead of returning `{ error }`, and `getAll()` no longer adds a default limit and order.
- `warn` and `error` write to stderr.
- Deep imports (`@ix-xs/node-comfort/src/...`) are replaced by official entry points (`@ix-xs/node-comfort/str`).

The [migration guide](https://ix-xs.github.io/node-comfort/guide/migration.html) lists every change with before and after examples.

## Contributing

Bug reports, ideas and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) explains how the project is organized. In short: `npm install`, then `npm run check` builds everything and runs the tests.

## License

[MIT](./LICENSE) © ix-xs
