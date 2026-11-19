---
title: "Schema validation"
description: "`nc.schema` checks data against a description of its shape, cleans it, and gives the TypeScript type of valid data. The API follows zod."
---

```js
const { schema: s } = require("@ix-xs/node-comfort");
```

## Parsing

```js
const User = s.object({
  name: s.string().trim().min(2),
  email: s.string().email().toLowerCase(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
  tags: s.array(s.string()).max(5).default([]),
});

User.parse({ name: "  Ada ", email: "ADA@Example.com", extra: 1 });
// { name: "Ada", email: "ada@example.com", role: "user", tags: [] }
```

| Method | Returns |
| --- | --- |
| `parse(value, options?)` | The cleaned data (trimmed, converted, defaults filled, unknown keys removed), or throws a `ValidationError` listing every issue |
| `safeParse(value, options?)` | `{ success: true, data }` or `{ success: false, error, issues }`, never throws |
| `is(value, options?)` | `true` or `false`; a type guard |

The only option is `maxDepth`: how many levels of objects and arrays a value may have (1000 by default). Deeper values get a `"too_deep"` issue instead of running out of stack.

## Errors

```js
const result = User.safeParse({ name: "Ada", email: "nope", age: 12 });

result.error.flatten();
// { email: ["Invalid email address"], age: ["Must be greater than or equal to 18"] }
result.issues;
// [
//   { path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" },
//   { path: ["age"], code: "too_small", message: "Must be greater than or equal to 18", minimum: 18 },
// ]
```

`result.error` is a `nc.errors.ValidationError` (code `ERR_VALIDATION`) with the same `issues`. `flatten()` groups the messages by field, for a form. See [Errors](/basics/errors/).

Every check takes a message, as text or as a function of the value:

```js
s.string().min(8, "Use at least 8 characters");
s.number().max(100, (value) => `${value} is too high`);
```

## Types

```ts
import { schema as s, type Infer } from "@ix-xs/node-comfort";

type User = Infer<typeof User>;
// { name: string; email: string; age?: number; role: "admin" | "user"; tags: string[] }
```

In JavaScript: `/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */`.

## Builders

| Builder | Checks and methods |
| --- | --- |
| `s.string()` | `min`, `max`, `length`, `nonempty`, `regex`, `startsWith`, `endsWith`, `includes`; formats `email`, `url`, `uuid`, `ulid`, `ip`, `hostname`, `datetime`, `date`, `slug`, `hex`, `base64`, `semver`; transforms `trim`, `toLowerCase`, `toUpperCase` |
| `s.number()` | `min`, `max`, `gt`, `lt`, `int`, `safe`, `positive`, `nonnegative`, `negative`, `multipleOf` |
| `s.boolean()`, `s.bigint()` | |
| `s.date()` | `min`, `max` |
| `s.literal(value)` | Exactly that value |
| `s.enum([...])` | One of the values |
| `s.array(item)` | `min`, `max`, `length`, `nonempty`, `unique`; `element` is the item schema |
| `s.object(shape)` | `strict`, `passthrough`, `extend`, `merge`, `pick`, `omit`, `partial`, `required`, `keyof`; `shape` |
| `s.union([...])` | The first schema that fits |
| `s.discriminatedUnion(key, [...])` | The object schema whose literal `key` matches |
| `s.tuple([...])`, `s.record(values)` | Fixed-length arrays, objects of any keys |
| `s.lazy(() => schema)` | Recursive structures |
| `s.instanceOf(Class)`, `s.custom(test)` | Anything else |
| `s.any()`, `s.unknown()` | Anything |
| `s.coerce.string()`, `.number()`, `.boolean()`, `.date()`, `.bigint()` | Convert the input first |
| `s.Schema` | The base class of every schema, for `instanceof` |

```js
s.number().gt(0).lt(1000); // 0 and 1000 refused, where min and max accept them
s.number().safe();         // an integer JavaScript holds exactly
s.string().date();         // "2024-01-31": a real day, without a time
```

## Optional values and defaults

| Method | Gives |
| --- | --- |
| `optional()` | `T \| undefined`; the key of an object becomes optional |
| `nullable()` | `T \| null` |
| `nullish()` | `T \| null \| undefined` |
| `default(value)` | `value` when the input is `undefined`; a function is called each time |
| `catch(value)` | `value` instead of an error when the input is invalid |
| `or(other)` | Shorthand for `s.union([this, other])` |
| `array()` | Shorthand for `s.array(this)` |
| `describe(text)` | Sets `description`, written into the JSON Schema |

## Transforms and custom rules

```js
const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));
Port.parse("8080");  // 8080
Port.parse("70000"); // throws: Must be less than or equal to 65535

const Signup = s.object({ password: s.string().min(8), confirm: s.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
Signup.safeParse({ password: "12345678", confirm: "x" }).error.flatten();
// { confirm: ["Passwords don't match"] }
```

| Method | Does |
| --- | --- |
| `transform(fn)` | Replaces the value with `fn(value)` |
| `pipe(schema)` | Checks the result with another schema |
| `refine(test, { message, path, code })` | A custom rule; `path` attaches the issue to a field |

## Objects

Unknown keys are dropped. `.strict()` refuses them, `.passthrough()` keeps them.

```js
const Admin = User.extend({ level: s.number() });
const PublicUser = User.pick(["name", "role"]);
const UserPatch = User.partial(); // every key optional
const SortBy = User.keyof();      // "name" | "email" | "age" | "role" | "tags"
const Post = s.object({ title: s.string() }).merge(s.object({ createdAt: s.date() }));
```

`extend`, `pick`, `omit`, `partial` and `required` keep the unknown-key mode; with `merge`, the second schema wins. Inherited names like `toString` are only read when the input has them as its own keys.

## Unions

```js
const Payment = s.discriminatedUnion("method", [
  s.object({ method: s.literal("card"), last4: s.string().length(4) }),
  s.object({ method: s.literal("transfer"), iban: s.string() }),
]);

Payment.safeParse({ method: "transfer" }).error.flatten(); // { iban: ["Required"] }
Payment.safeParse({ method: "cash" }).error.flatten();
// { method: ['Expected "card" | "transfer", received "cash"'] }
```

`discriminatedUnion` reads the key first and only runs the matching schema, so the issues are about that kind of object. `s.union([s.string(), s.number()])` tries each schema in turn.

## Strings from URLs and the environment

```js
const Query = s.object({
  page: s.coerce.number().int().min(1).default(1),
  active: s.coerce.boolean().default(false),
  since: s.coerce.date().optional(),
});

Query.parse({ page: "2", active: "true" }); // { page: 2, active: true }
```

`coerce.boolean()` reads `"true"`, `"1"`, `"yes"`, `"on"` and their opposites.

## Recursive data

```js
const Category = s.object({
  name: s.string(),
  children: s.lazy(() => s.array(Category)).default([]),
});

Category.safeParse(body, { maxDepth: 20 }); // deeper than 20 levels: a "too_deep" issue
```

## JSON Schema

`toJSONSchema()` writes a JSON Schema (draft 2020-12), for OpenAPI or a form generator:

```js
const Forecast = s.object({
  city: s.string().describe("City name, like Paris"),
  unit: s.enum(["celsius", "fahrenheit"]).default("celsius"),
  days: s.number().int().min(1).max(7).optional(),
}).strict();

Forecast.toJSONSchema();
// {
//   type: "object",
//   properties: {
//     city: { type: "string", description: "City name, like Paris" },
//     unit: { type: "string", enum: ["celsius", "fahrenheit"], default: "celsius" },
//     days: { type: "integer", minimum: 1, maximum: 7 },
//   },
//   required: ["city"],
//   additionalProperties: false,
// }
```

`refine()` and `transform()` cannot be expressed and are left out. A recursive schema goes under `$defs`.
