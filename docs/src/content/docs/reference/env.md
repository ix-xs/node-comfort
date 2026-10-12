---
title: "nc.env"
description: "Environment variables you can trust: `.env` loading, typed getters, and `validate()` to check your whole configuration at startup and report every problem at once."
sidebar:
  label: "env"
  order: 4
---

The `.env` file in the working directory is loaded when the package is
required; variables that are already set are never overwritten. Set
`NODE_COMFORT_DOTENV=false` to turn that off. What it loaded has the
lowest priority: a file you load yourself afterwards wins over it.

```js
const { env } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const env = require("@ix-xs/node-comfort/env");
```

This page lists everything `nc.env` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/env/).

```js
const config = env.validate({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url" },                  // required
  CACHE_TTL: { type: "duration", default: "5m" }, // in ms
});
config.PORT; // a number, typed in your editor
```

## parse

```ts
parse(content: string, options?: EnvParseOptions): Record<string, string>
```

Parses the text of a `.env` file: quotes, multi-line values, `export`,
comments, escapes, and `${VAR}` expansion (except in single quotes).

```js
env.parse('PORT=3000\nURL="http://localhost:${PORT}"');
// { PORT: "3000", URL: "http://localhost:3000" }
```

## load

```ts
load(files?: string | string[], options?: EnvLoadOptions): Record<string, string>
```

Loads `.env` files into `process.env`. The first file to set a variable
wins, and variables that are already set are kept, unless you pass
`override`. The `.env` loaded by itself at startup doesn't count as
already set: `.env.local` wins over it, as you'd expect.

| Parameter | Type | Description |
| --- | --- | --- |
| `files?` | `string \| string[]` | Relative to the working directory. Defaults to `".env"`. |
| `options?` | [`EnvLoadOptions`](#envloadoptions) |  |

**Returns** `Record``<string, string>`: Everything read from the files.

**Throws** `Error`: If `required` is set and a file is missing.

```js
env.load();                                // ./.env
env.load([".env.local", ".env"]);          // local values win
env.load(".env.test", { override: true });
env.load(".env", { cascade: true });       // .env.production.local, .env.local, .env.production, .env
```

## get

```ts
get(name: string, fallback?: string): string | undefined
```

Reads a variable, with a fallback. Never throws.

```js
env.get("REGION", "eu-west-1");
```

## has

```ts
has(name: string): boolean
```

Is the variable set, even to an empty string?

## required

```ts
required(name: string): string
```

Reads a variable that must be set and not empty.

**Throws** `ValidationError`: If it's missing or empty.

```js
const key = env.required("STRIPE_SECRET_KEY");
```

## string

```ts
string(name: string, options?: (EnvGetterOptions<string> & { pattern?: RegExp; minLength?: number; }) | undefined): string
```

Reads a string. Required unless you give a default or `optional`.

**Throws** `ValidationError`

```js
env.string("APP_NAME", { default: "my-app" });
```

## number

```ts
number(name: string, options?: (EnvGetterOptions<number> & { min?: number; max?: number; integer?: boolean; }) | undefined): number
```

Reads a number.

**Throws** `ValidationError`

```js
env.number("WORKERS", { default: 4, min: 1, integer: true });
```

## bool

```ts
bool(name: string, options?: EnvGetterOptions<boolean>): boolean
```

Reads a boolean: `true`/`false`, `1`/`0`, `yes`/`no` or `on`/`off`.

**Throws** `ValidationError`

```js
if (env.bool("FEATURE_BETA", { default: false })) enableBeta();
```

## port

```ts
port(name: string, options?: EnvGetterOptions<number>): number
```

Reads a port number.

**Throws** `ValidationError`

```js
server.listen(env.port("PORT", { default: 3000 }));
```

## url

```ts
url(name: string, options?: (EnvGetterOptions<string> & { protocols?: string[]; }) | undefined): string
```

Reads an absolute URL.

**Throws** `ValidationError`

```js
env.url("DATABASE_URL", { protocols: ["postgres", "postgresql"] });
```

## duration

```ts
duration(name: string, options?: EnvGetterOptions<string | number>): number
```

Reads a duration like `"30s"` or `"1h30m"` and returns milliseconds.

**Throws** `ValidationError`

```js
env.duration("CACHE_TTL", { default: "10m" }); // 600000
```

## list

```ts
list(name: string, options?: (EnvGetterOptions<string[]> & { separator?: string; }) | undefined): string[]
```

Reads a comma-separated list. Items are trimmed and empty ones dropped.

**Throws** `ValidationError`

```js
// ALLOWED_ORIGINS="https://a.com, https://b.com"
env.list("ALLOWED_ORIGINS", { default: [] }); // ["https://a.com", "https://b.com"]
```

## json

```ts
json<T = any>(name: string, options?: EnvGetterOptions<T>): T
```

Reads a JSON value.

**Throws** `ValidationError`

```js
const flags = env.json("FEATURE_FLAGS", { default: {} });
```

## oneOf

```ts
oneOf<V extends string>(name: string, values: readonly V[], options?: EnvGetterOptions<V>): V
```

Reads a variable that must be one of the given values. The result has
their literal type.

**Throws** `ValidationError`

```js
env.oneOf("LOG_LEVEL", ["debug", "info", "warn", "error"], { default: "info" });
```

## validate

```ts
validate<T extends Record<string, EnvVarSpec>>(spec: T, options?: { env?: ProcessEnv; } | undefined): Readonly<EnvConfig<T>>
```

Checks all your variables at once and returns a typed, frozen config. If
anything is wrong, one `ValidationError` lists every problem, so a bad
deployment fails at startup with the full picture.

**Throws** `ValidationError`

```js
const config = env.validate({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", protocols: ["postgres"] },
  JWT_SECRET: { type: "string", minLength: 32 },
  SENTRY_DSN: { type: "url", optional: true },
});
// ValidationError: Validation failed with 2 issues:
//   • DATABASE_URL: is required but is not set
//   • JWT_SECRET: must contain at least 32 characters
```

## example

```ts
example(spec: Record<string, EnvVarSpec>): string
```

Writes the `.env.example` that goes with a `validate()` spec: one entry
per variable, with its description, type and default. Keep the file in
the repository so nobody has to read the code to know what to set.

```js
const spec = {
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", description: "Postgres connection string" },
};
fs.writeFileSync(".env.example", env.example(spec));
// # Port to listen on
// # port, default: 3000
// PORT=3000
//
// # Postgres connection string
// # url, required
// DATABASE_URL=
```

## mode

```ts
mode(): string
```

`NODE_ENV`, or `"development"` when it's not set.

## isProduction

```ts
isProduction(): boolean
```

Is `NODE_ENV` set to `"production"`?

## isDevelopment

```ts
isDevelopment(): boolean
```

Is `NODE_ENV` `"development"`, or not set?

## isTest

```ts
isTest(): boolean
```

Are we running tests? True when `NODE_ENV` is `"test"` or a test runner
like `node --test` or Jest is detected.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { EnvConfig } from "@ix-xs/node-comfort"`.

### EnvConfig

What `validate()` returns.

```ts
type EnvConfig = { -readonly [K in keyof T]: T[K] extends { optional: true; } ? EnvVarValue<T[K]> | undefined : EnvVarValue<T[K]>; }
```

### EnvGetterOptions

Options shared by the typed getters.

| Property | Type | Description |
| --- | --- | --- |
| `default?` | `T` | Used when the variable is missing or empty. Without it, the variable is required. |
| `optional?` | `boolean` | Return `undefined` instead of throwing when it's missing. |
| `env?` | `ProcessEnv` | Where to read from. Defaults to `process.env`. |

### EnvLoadOptions

Options for `load()`.

| Property | Type | Description |
| --- | --- | --- |
| `override?` | `boolean` | Overwrite variables that are already set. |
| `expand?` | `boolean` | Replace `${OTHER}` references. Defaults to `true`. |
| `required?` | `boolean` | Throw if a file is missing. |
| `cascade?` | `string \| boolean` | Also load the files that go with each one: `.env.production.local`, `.env.local`, `.env.production`, then `.env`. `true` takes the mode from `NODE_ENV`; a string names it. `.env.local` is skipped in test mode, so tests run the same for everyone. |
| `target?` | `ProcessEnv` | Where to put the variables. Defaults to `process.env`. |

### EnvParseOptions

Options for `parse()`.

| Property | Type | Description |
| --- | --- | --- |
| `expand?` | `boolean` | Replace `$VAR`, `${VAR}` and `${VAR:-default}`. Defaults to `true`. |
| `env?` | `Record``<string, string \| undefined>` | Other variables usable in expansions. Defaults to `process.env`. |

### EnvVarSpec

One variable in `validate()`. It's required unless it has a `default` or
`optional: true`.

```ts
type EnvVarSpec = ({ type: "string"; default?: string; optional?: boolean; pattern?: RegExp; minLength?: number; description?: string; } | { type: "number"; default?: number; optional?: boolean; min?: number; max?: number; integer?: boolean; description?: string; } | { type: "boolean"; default?: boolean; optional?: boolean; description?: string; } | { type: "port"; default?: number; optional?: boolean; description?: string; } | { type: "url"; default?: string; optional?: boolean; protocols?: string[]; description?: string; } | { type: "email"; default?: string; optional?: boolean; description?: string; } | { type: "duration"; default?: number | string; optional?: boolean; description?: string; } | { type: "list"; default?: string[]; optional?: boolean; separator?: string; description?: string; } | { type: "json"; default?: unknown; optional?: boolean; description?: string; } | { type: "enum"; values: readonly string[]; default?: string; optional?: boolean; description?: string; })
```

### EnvVarValue

The type a variable gets once read.

```ts
type EnvVarValue = S["type"] extends "number" | "port" | "duration" ? number : S["type"] extends "boolean" ? boolean : S["type"] extends "list" ? string[] : S["type"] extends "json" ? any : S extends { values: readonly (infer V)[]; } ? V : string
```
