# Environment variables

`nc.env` loads `.env` files and turns environment variables into typed, validated values. The best way to use it is to check your whole configuration once, at startup.

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

A variable is required unless it has a `default` or `optional: true`.

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

Load more files yourself when you need to. The first file to set a variable wins:

```js
nc.env.load([".env.local", ".env"]);
nc.env.load(".env.test", { override: true });
```

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
