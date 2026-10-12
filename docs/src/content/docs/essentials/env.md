---
title: "Environment variables"
description: "`nc.env` loads `.env` files and turns environment variables into typed, validated values. The best way to use it is to check your whole configuration once, at startup."
sidebar:
  order: 4
---

```js
const config = nc.env.validate({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", protocols: ["postgres"] },
  JWT_SECRET: { type: "string", minLength: 32 },
  CACHE_TTL: { type: "duration", default: "5m" },
  ADMINS: { type: "list", default: [] },
  SENTRY_DSN: { type: "url", optional: true },
});

config.PORT;      // number
config.CACHE_TTL; // 300000 (milliseconds)
config.ADMINS;    // string[]
```

If anything is wrong, you get one error listing every problem, so a broken deployment tells you everything at once:

```text
ValidationError: Validation failed with 2 issues:
  • DATABASE_URL: is required but is not set
  • JWT_SECRET: must contain at least 32 characters
```

The returned object is frozen and fully typed, including the literal values of `enum`.

## Variable types

| `type` | Result | Accepts |
| --- | --- | --- |
| `string` | `string` | anything; `pattern` and `minLength` add rules |
| `number` | `number` | numbers; `min`, `max`, `integer` |
| `boolean` | `boolean` | `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off` |
| `port` | `number` | 0 to 65535 |
| `url` | `string` | absolute URLs; `protocols` restricts them |
| `email` | `string` | email addresses |
| `duration` | `number` (ms) | `"30s"`, `"5m"`, `"1h30m"`, `"PT1H"` or milliseconds |
| `list` | `string[]` | comma-separated values; `separator` changes the comma |
| `json` | `any` | JSON text |
| `enum` | union of `values` | one of `values` |

A variable is required unless it has a `default` or `optional: true`. An empty variable counts as missing. Any variable can carry a `description`: it's added to the "is required" message, and it's what `env.example()` writes above the variable.

## A .env.example from the same spec

Keep the spec in a variable, and `env.example()` turns it into the text of a `.env.example` file: one entry per variable, with its description, its type and its default.

```js
const spec = {
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", protocols: ["postgres"], description: "Postgres connection string" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  SENTRY_DSN: { type: "url", optional: true },
};

const config = nc.env.validate(spec);
nc.writeFile(".env.example", nc.env.example(spec));
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

`example()` returns the text and writes nothing itself. Run it from a small script and commit the file, so nobody has to read the code to know what to set.

## Reading one variable

The same types are available one by one:

```js
nc.env.port("PORT", { default: 3000 });
nc.env.number("WORKERS", { default: 4, min: 1, integer: true });
nc.env.bool("FEATURE_BETA", { default: false });
nc.env.url("API_URL");                         // throws if missing or invalid
nc.env.oneOf("LOG_LEVEL", ["debug", "info", "warn"], { default: "info" });
nc.env.get("REGION", "eu-west-1");             // plain string, never throws
nc.env.required("STRIPE_SECRET_KEY");
```

## .env files

The `.env` file in the working directory is loaded when you require the package. Variables that are already set aren't overwritten, so the real environment always wins. Set `NODE_COMFORT_DOTENV=false` to turn this off.

Load more files yourself when you need to:

```js
nc.env.load(".env.test", { override: true });
nc.env.load([".env.local", ".env"]);
```

`load()` works in two steps. It reads the files, and the first file to define a variable wins: here `.env.local` goes before `.env`. Then it puts the result in `process.env`, keeping the variables that are already there unless you pass `override: true`. `override` never changes the order between the files.

The `.env` loaded at startup counts as already there: a later `load()` adds the variables `.env` doesn't define and leaves the others alone. `override: true` lifts that, but it also lets the files replace the real environment. So when several files define the same variables, turn the automatic loading off and let one `load()` read them all.

`load()` returns everything it read from the files. Missing files are skipped, unless you pass `required: true`.

## One set of files per mode

`cascade` loads the files that go with a `.env` file, the most specific first:

```js
nc.env.load(".env", { cascade: true });
// with NODE_ENV=production: .env.production.local, .env.local, .env.production, .env
```

The mode is `NODE_ENV`, or `"development"` when it isn't set. Pass a string to name it yourself: `{ cascade: "staging" }`. In `test` mode `.env.local` is left out, so tests run the same for everyone.

Remember that the `.env` loaded at startup has already set its variables, so the more specific files can't replace them. Turn the automatic loading off where you use a cascade:

```bash
NODE_COMFORT_DOTENV=false node app.js
```

## What a .env file can contain

The parser handles what you'd expect: quotes, multi-line values, `export`, comments, escapes and references to other variables.

```bash
# .env
APP_URL=http://localhost:${PORT:-3000}
PRIVATE_KEY="-----BEGIN KEY-----
...
-----END KEY-----"
GREETING='single quotes keep ${THIS} as is'
```

`nc.env.parse(text)` parses without touching `process.env`.

## Modes

```js
nc.env.mode();          // NODE_ENV, or "development"
nc.env.isProduction();
nc.env.isTest();        // also true under node --test or Jest
```
