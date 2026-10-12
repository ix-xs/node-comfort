---
title: "nc.schema"
description: "Validate data with schemas, in the spirit of `zod`. Describe your data once and get both a runtime check with clear messages and the TypeScript type, `Infer<typeof schema>`. Schemas never change: `.min()` or `.optional()` return a new one."
sidebar:
  label: "schema"
  order: 13
---

```js
const { schema } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const schema = require("@ix-xs/node-comfort/schema");
```

This page lists everything `nc.schema` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/schema/).

```js
const User = s.object({
  name: s.string().trim().min(2),
  email: s.string().email().toLowerCase(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
});

const user = User.parse(req.body);    // typed, or a ValidationError listing every issue
const result = User.safeParse(input); // { success, data } or { success, error, issues }
```

## string

```ts
string(options?: { message?: Message; } | undefined): StringSchema
```

A string schema.

| Parameter | Type | Description |
| --- | --- | --- |
| `options?` | `{ message?: `[`Message`](#message)` }` | Message when the value isn't a string. |

```js
s.string().trim().min(1).max(100);
s.string().email();
```

## number

```ts
number(options?: { message?: Message; } | undefined): NumberSchema
```

A number. `NaN` and `Infinity` are refused.

| Parameter | Type | Description |
| --- | --- | --- |
| `options?` | `{ message?: `[`Message`](#message)` }` | Message when the value isn't a number. |

```js
s.number().int().min(0).max(120);
```

## boolean

```ts
boolean(options?: { message?: Message; } | undefined): BooleanSchema
```

A boolean schema.

## bigint

```ts
bigint(options?: { message?: Message; } | undefined): BigIntSchema
```

A bigint schema.

## date

```ts
date(options?: { message?: Message; } | undefined): DateSchema
```

A valid `Date`.

```js
s.date().min("2024-01-01");
```

## literal

```ts
literal<L extends string | number | boolean | bigint | null | undefined>(value: L): LiteralSchema<L>
```

Exactly this value.

```js
s.object({ type: s.literal("circle"), radius: s.number() });
```

## enum

```ts
enum<V extends string | number>(values: readonly V[], options?: { message?: Message; } | undefined): LiteralSchema<V>
```

One of these values. The type is their union.

```js
const Role = s.enum(["admin", "editor", "viewer"]); // Schema<"admin" | "editor" | "viewer">
Role.options; // ["admin", "editor", "viewer"]
```

## array

```ts
array<T>(item: Schema<T>): ArraySchema<T>
```

An array whose items all match `item`.

```js
s.array(s.string()).min(1).max(10).unique();
```

## object

```ts
object<S extends Shape>(shape: S): ObjectSchema<S>
```

An object with known keys. Unknown keys are dropped; `.strict()` rejects
them and `.passthrough()` keeps them.

```js
const Address = s.object({ street: s.string(), zip: s.string().regex(/^\d{5}$/), city: s.string() });
```

## union

```ts
union<U extends ReadonlyArray<Schema<any>>>(options: U): UnionSchema<Infer<U[number]>>
```

Matches any of these schemas; the first that fits wins.

```js
s.union([s.string(), s.number()]); // Schema<string | number>
```

## discriminatedUnion

```ts
discriminatedUnion<U extends ReadonlyArray<ObjectSchema<any>>>(key: string, options: U): DiscriminatedUnionSchema<Infer<U[number]>>
```

A union of objects told apart by one key, like the `type` of an event.
Unlike `union()`, it goes straight to the right schema, and a wrong
object gets the errors of the kind it claims to be.

| Parameter | Type | Description |
| --- | --- | --- |
| `key` | `string` | The key every option has, with a different literal in each. |
| `options` | `U` |  |

```js
const Event = s.discriminatedUnion("type", [
  s.object({ type: s.literal("click"), x: s.number(), y: s.number() }),
  s.object({ type: s.literal("key"), key: s.string() }),
]);
Event.parse({ type: "key", key: "Enter" });
```

## tuple

```ts
tuple<T extends [Schema<any>, ...Schema<any>[]] | []>(items: T): TupleSchema<{ -readonly [K in keyof T]: Infer<T[K]>; }>
```

A fixed-length array with one schema per position.

```js
s.tuple([s.number(), s.number()]); // Schema<[number, number]>
```

## record

```ts
record<V>(values: Schema<V>, keys?: Schema<string>): RecordSchema<V>
```

An object with any keys whose values match a schema, like a dictionary.

```js
s.record(s.number());                                // Record<string, number>
s.record(s.boolean(), s.string().regex(/^[a-z]+$/)); // keys checked too
```

## lazy

```ts
lazy<T>(getter: () => Schema<T>): LazySchema<T>
```

A schema defined later, for recursive data like trees.

```js
const Category = s.object({
  name: s.string(),
  children: s.lazy(() => s.array(Category)).default([]),
});
```

## instanceOf

```ts
instanceOf<C extends new (...args: any[]) => any>(ctor: C, message?: Message): CustomSchema<InstanceType<C>>
```

An instance of a class.

```js
s.instanceOf(URL);
```

## custom

```ts
custom<T = unknown>(test: ((value: unknown) => value is T) | ((value: unknown) => boolean), message?: Message): CustomSchema<T>
```

A schema from any test, usually a type guard.

```js
const Color = s.custom(nc.isHexColor, "Expected a hex color");
```

## any

```ts
any(): Schema<any>
```

Anything, typed as `any`.

## unknown

```ts
unknown(): Schema<unknown>
```

Anything, typed as `unknown`.

## coerce

```ts
coerce: CoerceBuilders
```

Schemas that convert their input before checking it. Query strings, form
fields and environment variables are always strings, so this is what you
want for them.

## Schema

```ts
Schema: typeof Schema
```

The base of every schema.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { CoerceBuilders } from "@ix-xs/node-comfort"`.

### CoerceBuilders

The `s.coerce` builders.

| Property | Type | Description |
| --- | --- | --- |
| `string` | `() => ``StringSchema` | A string schema that turns any value into a string first. |
| `number` | `() => ``NumberSchema` | A number schema that converts strings like `"42"`, booleans and dates first. |
| `boolean` | `() => ``BooleanSchema` | A boolean schema that understands `"true"`, `"1"`, `"yes"`, `"on"` and their opposites. |
| `date` | `() => ``DateSchema` | A date schema that converts ISO strings and timestamps. |
| `bigint` | `() => ``BigIntSchema` | A bigint schema that converts numeric strings and integers. |

### Infer

The type a schema produces.

```ts
type Infer = S extends Schema<infer T> ? T : never
```

### JSONSchema

A JSON Schema, as made by `toJSONSchema()`.

### Message

An error message: a string, or a function that gets the invalid value.

```ts
type Message = string | ((value: any) => string)
```

### ObjectOutput

The type of an object schema. Keys that accept `undefined` become optional.

```ts
type ObjectOutput = Simplify<{ [K in keyof S as undefined extends Infer<S[K]> ? never : K]: Infer<S[K]>; } & { [K in keyof S as undefined extends Infer<S[K]> ? K : never]?: Infer<S[K]>; }>
```

### ParseContext

| Property | Type | Description |
| --- | --- | --- |
| `issues` | [`ValidationIssue`](/reference/errors/#validationissue)`[]` |  |
| `path` | `(string \| number)[]` |  |

### RefineOptions

Options for `refine()`.

| Property | Type | Description |
| --- | --- | --- |
| `message?` | [`Message`](#message) | Defaults to `"Invalid value"`. |
| `path?` | `(string \| number)[]` | Where to report the issue, like `["confirmPassword"]` for a cross-field check. |
| `code?` | `string` | Defaults to `"custom"`. |

### SafeParseResult

What `safeParse()` returns. On failure, `issues` is the plain list and
`error` the same thing as a `ValidationError`, built when you read it.

```ts
type SafeParseResult = { success: true; data: T; error?: undefined; issues?: undefined; } | { success: false; data?: undefined; error: ValidationError; issues: ValidationIssue[]; }
```

### Shape

An object of schemas, as passed to `object()`.

```ts
type Shape = Record<string, Schema<any>>
```

### Simplify

Flattens a type so editors show it nicely.

```ts
type Simplify = { [K in keyof T]: T[K]; } & {}
```

### Step

A step in a schema: a check, a transformation, a refinement or a pipe
into another schema.

```ts
type Step = { kind: "check"; test: (value: any) => boolean; code: string; message: Message; details?: Record<string, unknown>; json?: Record<string, unknown>; } | { kind: "transform"; fn: (value: any) => any; } | { kind: "refine"; test: (value: any) => boolean; options: RefineOptions; } | { kind: "pipe"; schema: Schema<any>; }
```
