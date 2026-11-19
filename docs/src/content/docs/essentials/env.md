---
title: "Environment variables"
description: "`nc.env`: typed and validated environment variables, checked once at startup, and the loading and parsing of `.env` files."
---

```js
const { env } = require("@ix-xs/node-comfort");
```

## Validating at startup

```js
const config = env.validate({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", protocols: ["postgres"] },
  JWT_SECRET: { type: "string", minLength: 32 },
  CACHE_TTL: { type: "duration", default: "5m" },
  ADMINS: { type: "list", default: [] },
  SENTRY_DSN: { type: "url", optional: true },
});

config.PORT;      // 3000, a number
config.CACHE_TTL; // 300000, in milliseconds
config.ADMINS;    // a string[]
```

`validate(spec, { env })` returns a frozen, typed object (`enum` gives the union of its `values`). When something is wrong, one `ValidationError` lists every problem:

```text
ValidationError: Validation failed with 2 issues:
  • DATABASE_URL: is required but is not set
  • JWT_SECRET: must contain at least 32 characters
```

A variable is required unless it has a `default` or `optional: true`. An empty variable counts as missing.

## Types

| `type` | Result | Accepts | Options |
| --- | --- | --- | --- |
| `string` | `string` | Anything | `pattern`, `minLength` |
| `number` | `number` | Numbers | `min`, `max`, `integer` |
| `boolean` | `boolean` | `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off` | |
| `port` | `number` | 0 to 65535 | |
| `url` | `string` | Absolute URLs | `protocols` |
| `email` | `string` | Email addresses | |
| `duration` | `number`, in ms | `"30s"`, `"5m"`, `"1h30m"`, `"PT1H"`, milliseconds | |
| `list` | `string[]` | Comma-separated values | `separator` |
| `json` | `any` | JSON text | |
| `enum` | One of `values` | One of `values` | `values` (required) |

Every type also takes `default`, `optional` and `description`.

## One variable

```js
env.port("PORT", { default: 3000 });
env.number("WORKERS", { default: 4, min: 1, integer: true });
env.boolean("FEATURE_BETA", { default: false });
env.url("API_URL");                                          // throws when missing or invalid
env.oneOf("LOG_LEVEL", ["debug", "info", "warn"], { default: "info" });
env.duration("CACHE_TTL", { default: "5m" });                // 300000
env.list("ADMINS", { optional: true });                      // undefined when missing
env.get("REGION", "eu-west-1");                              // a plain string, never throws
env.required("STRIPE_SECRET_KEY");
```

| Function | Returns |
| --- | --- |
| `get(name, fallback?)` | The raw string, or `fallback`. Never throws |
| `has(name)` | Whether it is set, even to an empty string |
| `required(name)` | The raw string. Throws when missing or empty |
| `string`, `number`, `boolean`, `port`, `url`, `duration`, `list`, `json` | The typed value, with the options of the table above |
| `oneOf(name, values, options?)` | One of `values` |

Every typed reader takes `{ default, optional, env }`: `env` reads from another object than `process.env`. A missing or invalid value throws a `ValidationError`.

## A .env.example from the spec

```js
const spec = {
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", protocols: ["postgres"], description: "Postgres connection string" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  SENTRY_DSN: { type: "url", optional: true },
};

require("node:fs").writeFileSync(".env.example", env.example(spec));
```

```bash
# Port to listen on
# port, default: 3000
PORT=3000

# Postgres connection string
# url, required
DATABASE_URL=

# debug | info | warn, default: info
LOG_LEVEL=info

# url, optional
SENTRY_DSN=
```

`example(spec)` returns the text and writes nothing. A `description` also appears in the "is required" message.

## Loading files

The `.env` of the working directory is loaded when the package is required ([Configuration](/start/configuration/)). Load other files yourself:

```js
env.load(".env.test", { override: true });
env.load([".env.local", ".env"]);       // the first file that defines a variable wins
env.load(".env", { cascade: true });    // with NODE_ENV=production: .env.production.local, .env.local, .env.production, .env
env.load(".env.ci", { required: true }); // throws when the file is missing
```

| Option | Default | |
| --- | --- | --- |
| `override` (or `overwrite`) | `false` | Replace variables that are already set. It never changes the order between files |
| `cascade` | `false` | Also load the files of the mode, most specific first. `true` takes the mode from `NODE_ENV`, a string names it. `.env.local` is skipped in test mode |
| `required` | `false` | Throw a `NodeComfortError` with the code `ERR_ENV_FILE_MISSING` when a file is missing |
| `expand` | `true` | Replace `${OTHER}` references |
| `target` | `process.env` | Where to put the variables |

`load` returns everything it read. Paths are relative to the working directory. The real environment wins over every file, and a file you load wins over the automatic `.env`. A reference like `${HOST}` uses the final value of `HOST`, whichever file or environment sets it.

An explicit `load()` sets every variable, including those the automatic load leaves out (`NODE_OPTIONS`, `PATH`...): load only files you trust.

## Parsing

```js
env.parse('PORT=3000\nURL="http://localhost:${PORT}"'); // { PORT: "3000", URL: "http://localhost:3000" }
env.parse("TMP_COPY=${TMP}", { env: process.env });       // TMP from the real environment
```

`parse(text, { expand, env })` touches nothing and reads only the text and `env`, never `process.env` by default. It understands quotes, multi-line values, `export`, comments, escapes, `$VAR`, `${VAR}` and `${VAR:-default}`. A value that grows past 64 KB through references throws a `RangeError`.

```bash
APP_URL=http://localhost:${PORT:-3000}
PRIVATE_KEY="-----BEGIN KEY-----
...
-----END KEY-----"
GREETING='single quotes keep ${THIS} as is'
```

## Modes

| Function | Returns |
| --- | --- |
| `mode()` | `NODE_ENV`, or `"development"` |
| `isProduction()`, `isDevelopment()` | Compares `mode()` |
| `isTest()` | `NODE_ENV=test`, and also under `node --test` or Jest |

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.env.bool()` | `nc.env.boolean()` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |

The old names still work in 3.0, warn once, and are removed in 4.0. `env.load(..., { required: true })` now throws a `NodeComfortError` coded `ERR_ENV_FILE_MISSING` for a missing file.
