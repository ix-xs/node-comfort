# Schema validation

`nc.schema` validates data against a description of what it should look like, and gives you the TypeScript type of valid data for free. If you've used `zod`, you'll feel at home.

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

Each issue has a `path`, a `code` and a `message` you can show to users. `is()` is a plain yes/no check that also works as a type guard.

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
| `s.string()` | `min`, `max`, `length`, `nonempty`, `email`, `url`, `uuid`, `ip`, `datetime`, `regex`, `startsWith`, `endsWith`, `includes`; transforms `trim`, `toLowerCase`, `toUpperCase` |
| `s.number()` | `min`, `max`, `int`, `positive`, `nonnegative`, `negative`, `multipleOf` |
| `s.boolean()`, `s.bigint()` | |
| `s.date()` | `min`, `max` |
| `s.literal(value)` | exactly that value |
| `s.enum([...])` | one of the values |
| `s.array(item)` | `min`, `max`, `length`, `nonempty`, `unique` |
| `s.object(shape)` | `strict`, `passthrough`, `extend`, `pick`, `omit`, `partial` |
| `s.union([...])`, `s.tuple([...])`, `s.record(values)` | |
| `s.lazy(() => schema)` | recursive structures |
| `s.instanceOf(Class)`, `s.custom(test)` | anything else |
| `s.any()`, `s.unknown()` | anything |

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

## Objects

Unknown keys are dropped by default. `.strict()` rejects them and `.passthrough()` keeps them.

```js
const Admin = User.extend({ level: s.number() });
const PublicUser = User.pick(["name", "role"]);
const UserPatch = User.partial(); // every key optional, for PATCH requests
```

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
