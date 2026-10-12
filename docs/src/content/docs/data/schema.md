---
title: "Schema validation"
description: "`nc.schema` validates data against a description of what it should look like, and gives you the TypeScript type of valid data for free. If you've used `zod`, you'll feel at home."
sidebar:
  order: 7
---

```js
const { schema: s } = require("@ix-xs/node-comfort");

const User = s.object({
  name: s.string().trim().min(2),
  email: s.string().email().toLowerCase(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
  tags: s.array(s.string()).max(5).default([]),
});

const user = User.parse(req.body);
```

`parse()` returns the data, cleaned up (trimmed, lowercased, defaults filled in, unknown keys removed), or throws a `ValidationError` listing every problem.

## Handling errors

`safeParse()` never throws. It returns either the data or the error:

```js
const result = User.safeParse(req.body);
if (!result.success) {
  return res.status(400).json(result.error.flatten());
  // { email: ["Invalid email address"], age: ["Must be greater than or equal to 18"] }
}
saveUser(result.data);
```

A failed result also has `issues`, the plain list of problems. Each issue has a `path`, a `code` and a `message` you can show to users:

```js
result.issues;
// [
//   { path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" },
//   { path: ["age"], code: "too_small", message: "Must be greater than or equal to 18", minimum: 18 },
// ]
```

`result.error` is a `ValidationError` holding the same list. `is()` is a plain yes/no check that also works as a type guard.

## Types for free

```ts
import { schema as s, type Infer } from "@ix-xs/node-comfort";

type User = Infer<typeof User>;
// { name: string; email: string; age?: number; role: "admin" | "user"; tags: string[] }
```

In JavaScript, the same type is available through JSDoc: `/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */`.

## The building blocks

| Builder | Checks |
| --- | --- |
| `s.string()` | `min`, `max`, `length`, `nonempty`, `regex`, `startsWith`, `endsWith`, `includes`; formats `email`, `url`, `uuid`, `ulid`, `ip`, `hostname`, `datetime`, `date`, `slug`, `hex`, `base64`, `semver`; transforms `trim`, `toLowerCase`, `toUpperCase` |
| `s.number()` | `min`, `max`, `gt`, `lt`, `int`, `safe`, `positive`, `nonnegative`, `negative`, `multipleOf` |
| `s.boolean()`, `s.bigint()` | |
| `s.date()` | `min`, `max` |
| `s.literal(value)` | exactly that value |
| `s.enum([...])` | one of the values |
| `s.array(item)` | `min`, `max`, `length`, `nonempty`, `unique` |
| `s.object(shape)` | `strict`, `passthrough`, `extend`, `merge`, `pick`, `omit`, `partial`, `required`, `keyof` |
| `s.union([...])`, `s.discriminatedUnion(key, [...])` | one of several schemas |
| `s.tuple([...])`, `s.record(values)` | |
| `s.lazy(() => schema)` | recursive structures |
| `s.instanceOf(Class)`, `s.custom(test)` | anything else |
| `s.any()`, `s.unknown()` | anything |

```js
s.number().gt(0).lt(1000); // 0 and 1000 are refused, where min and max accept them
s.number().safe();         // an integer JavaScript holds exactly, for ids from a database
s.string().date();         // "2024-01-31": a real day, without a time
s.string().slug();         // "my-first-post"
```

Every check takes an optional message, as a string or a function of the value:

```js
s.string().min(8, "Use at least 8 characters");
s.number().max(100, (value) => `${value} is too high`);
```

## Optional, nullable and defaults

```js
s.string().optional();              // string | undefined, and the key becomes optional
s.string().nullable();              // string | null
s.string().default("guest");        // used when the value is undefined
s.date().default(() => new Date()); // a fresh value each time
s.number().catch(0);                // 0 instead of an error when invalid
```

## Transforming and custom rules

```js
const Tags = s.string().transform((value) => value.split(",").map((t) => t.trim()));

const Signup = s.object({ password: s.string().min(8), confirm: s.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
```

`refine` with a `path` attaches the error to a field, which is what forms need.

`pipe()` sends the result into another schema. After a `transform()`, it checks what the conversion produced:

```js
const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));

Port.parse("8080");  // 8080
Port.parse("abc");   // throws: Expected number, received NaN
Port.parse("70000"); // throws: Must be less than or equal to 65535
```

## Objects

Unknown keys are dropped by default. `.strict()` rejects them and `.passthrough()` keeps them.

```js
const Admin = User.extend({ level: s.number() });
const PublicUser = User.pick(["name", "role"]);
const UserPatch = User.partial();  // every key optional, for PATCH requests
const FullUser = User.required();  // the opposite: age has to be there too
const SortBy = User.keyof();       // accepts "name", "email", "age", "role" or "tags"

const Timestamps = s.object({ createdAt: s.date(), updatedAt: s.date() });
const Post = s.object({ title: s.string() }).merge(Timestamps);
```

`extend`, `pick`, `omit`, `partial` and `required` keep the way the schema treats unknown keys, so a strict schema stays strict. With `merge`, the keys of the second schema win, and so does its way of treating unknown keys.

Methods that every object inherits, like `toString`, are not data: a key with such a name is only read when the input really has it.

## One of several shapes

When objects are told apart by one key, like the `type` of an event, use `discriminatedUnion()`:

```js
const Payment = s.discriminatedUnion("method", [
  s.object({ method: s.literal("card"), last4: s.string().length(4) }),
  s.object({ method: s.literal("transfer"), iban: s.string() }),
]);

Payment.parse({ method: "card", last4: "4242" });          // { method: "card", last4: "4242" }
Payment.safeParse({ method: "transfer" }).error.flatten(); // { iban: ["Required"] }
Payment.safeParse({ method: "cash" }).error.flatten();
// { method: ['Expected "card" | "transfer", received "cash"'] }
```

It reads the key first and runs only the schema that matches, so the errors are about the kind of object the input says it is. Each option must be an object schema with a different literal at that key.

`s.union([...])` tries each schema in turn and keeps the first that fits. Use it when there's no such key, as in `s.union([s.string(), s.number()])`.

## Query strings and environment values

Values that come from URLs, forms and environment variables are always strings. `s.coerce` converts them before checking:

```js
const Query = s.object({
  page: s.coerce.number().int().min(1).default(1),
  active: s.coerce.boolean().default(false),
  since: s.coerce.date().optional(),
});

Query.parse({ page: "2", active: "true" }); // { page: 2, active: true }
```

`coerce.boolean()` understands `"true"`, `"1"`, `"yes"`, `"on"` and their opposites.

## Recursive data

```js
const Category = s.object({
  name: s.string(),
  children: s.lazy(() => s.array(Category)).default([]),
});
```

## JSON Schema

`toJSONSchema()` describes what a schema accepts as a JSON Schema (draft 2020-12), for an OpenAPI document or a form generator:

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

Rules that only exist in code, like `refine()` and `transform()`, can't be written in JSON Schema and are left out. A recursive schema goes under `$defs`.

Every builder and check is listed in the [reference](/reference/schema/).
