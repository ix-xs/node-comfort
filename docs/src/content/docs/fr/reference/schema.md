---
title: "nc.schema"
description: "Validez des données avec des schémas, dans l'esprit de `zod`. Décrivez vos données une seule fois et obtenez à la fois une vérification à l'exécution avec des messages clairs et le type TypeScript, `Infer<typeof schema>`. Les schémas ne changent jamais : `.min()` ou `.optional()` en renvoient un nouveau."
sidebar:
  label: "schema"
  order: 13
---

```js
const { schema } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const schema = require("@ix-xs/node-comfort/schema");
```

Cette page liste tout ce que contient `nc.schema`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/schema/).

```js
const User = s.object({
  name: s.string().trim().min(2),
  email: s.string().email().toLowerCase(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
});

const user = User.parse(req.body);    // typé, ou une ValidationError qui liste tous les problèmes
const result = User.safeParse(input); // { success, data } ou { success, error, issues }
```

## string

```ts
string(options?: { message?: Message; } | undefined): StringSchema
```

Un schéma de chaîne.

| Paramètre | Type | Description |
| --- | --- | --- |
| `options?` | `{ message?: `[`Message`](#message)` }` | Message quand la valeur n'est pas une chaîne. |

```js
s.string().trim().min(1).max(100);
s.string().email();
```

## number

```ts
number(options?: { message?: Message; } | undefined): NumberSchema
```

Un nombre. `NaN` et `Infinity` sont refusés.

| Paramètre | Type | Description |
| --- | --- | --- |
| `options?` | `{ message?: `[`Message`](#message)` }` | Message quand la valeur n'est pas un nombre. |

```js
s.number().int().min(0).max(120);
```

## boolean

```ts
boolean(options?: { message?: Message; } | undefined): BooleanSchema
```

Un schéma de booléen.

## bigint

```ts
bigint(options?: { message?: Message; } | undefined): BigIntSchema
```

Un schéma de bigint.

## date

```ts
date(options?: { message?: Message; } | undefined): DateSchema
```

Une `Date` valide.

```js
s.date().min("2024-01-01");
```

## literal

```ts
literal<L extends string | number | boolean | bigint | null | undefined>(value: L): LiteralSchema<L>
```

Exactement cette valeur.

```js
s.object({ type: s.literal("circle"), radius: s.number() });
```

## enum

```ts
enum<V extends string | number>(values: readonly V[], options?: { message?: Message; } | undefined): LiteralSchema<V>
```

L'une de ces valeurs. Le type est leur union.

```js
const Role = s.enum(["admin", "editor", "viewer"]); // Schema<"admin" | "editor" | "viewer">
Role.options; // ["admin", "editor", "viewer"]
```

## array

```ts
array<T>(item: Schema<T>): ArraySchema<T>
```

Un tableau dont tous les éléments correspondent à `item`.

```js
s.array(s.string()).min(1).max(10).unique();
```

## object

```ts
object<S extends Shape>(shape: S): ObjectSchema<S>
```

Un objet aux clés connues. Les clés inconnues sont retirées ; `.strict()` les refuse et `.passthrough()` les conserve.

```js
const Address = s.object({ street: s.string(), zip: s.string().regex(/^\d{5}$/), city: s.string() });
```

## union

```ts
union<U extends ReadonlyArray<Schema<any>>>(options: U): UnionSchema<Infer<U[number]>>
```

Correspond à l'un de ces schémas ; le premier qui convient l'emporte.

```js
s.union([s.string(), s.number()]); // Schema<string | number>
```

## discriminatedUnion

```ts
discriminatedUnion<U extends ReadonlyArray<ObjectSchema<any>>>(key: string, options: U): DiscriminatedUnionSchema<Infer<U[number]>>
```

Une union d'objets distingués par une clé, comme le `type` d'un événement. Contrairement à `union()`, elle va directement au bon schéma, et un objet incorrect reçoit les erreurs du genre qu'il prétend être.

| Paramètre | Type | Description |
| --- | --- | --- |
| `key` | `string` | La clé que possède chaque option, avec un littéral différent dans chacune. |
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

Un tableau de longueur fixe avec un schéma par position.

```js
s.tuple([s.number(), s.number()]); // Schema<[number, number]>
```

## record

```ts
record<V>(values: Schema<V>, keys?: Schema<string>): RecordSchema<V>
```

Un objet aux clés quelconques dont les valeurs correspondent à un schéma, comme un dictionnaire.

```js
s.record(s.number());                                // Record<string, number>
s.record(s.boolean(), s.string().regex(/^[a-z]+$/)); // les clés sont vérifiées aussi
```

## lazy

```ts
lazy<T>(getter: () => Schema<T>): LazySchema<T>
```

Un schéma défini plus tard, pour les données récursives comme les arbres.

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

Une instance d'une classe.

```js
s.instanceOf(URL);
```

## custom

```ts
custom<T = unknown>(test: ((value: unknown) => value is T) | ((value: unknown) => boolean), message?: Message): CustomSchema<T>
```

Un schéma à partir de n'importe quel test, en général une garde de type.

```js
const Color = s.custom(nc.isHexColor, "Expected a hex color");
```

## any

```ts
any(): Schema<any>
```

N'importe quoi, typé `any`.

## unknown

```ts
unknown(): Schema<unknown>
```

N'importe quoi, typé `unknown`.

## coerce

```ts
coerce: CoerceBuilders
```

Des schémas qui convertissent leur entrée avant de la vérifier. Les chaînes de requête, les champs de formulaire et les variables d'environnement sont toujours des chaînes, c'est donc ce qu'il vous faut dans ces cas.

## Schema

```ts
Schema: typeof Schema
```

La base de tous les schémas.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { CoerceBuilders } from "@ix-xs/node-comfort"`.

### CoerceBuilders

Les constructeurs `s.coerce`.

| Propriété | Type | Description |
| --- | --- | --- |
| `string` | `() => ``StringSchema` | Un schéma de chaîne qui transforme d'abord n'importe quelle valeur en chaîne. |
| `number` | `() => ``NumberSchema` | Un schéma de nombre qui convertit d'abord les chaînes comme `"42"`, les booléens et les dates. |
| `boolean` | `() => ``BooleanSchema` | Un schéma de booléen qui comprend `"true"`, `"1"`, `"yes"`, `"on"` et leurs contraires. |
| `date` | `() => ``DateSchema` | Un schéma de date qui convertit les chaînes ISO et les timestamps. |
| `bigint` | `() => ``BigIntSchema` | Un schéma de bigint qui convertit les chaînes numériques et les entiers. |

### Infer

Le type que produit un schéma.

```ts
type Infer = S extends Schema<infer T> ? T : never
```

### JSONSchema

Un JSON Schema, tel que produit par `toJSONSchema()`.

### Message

Un message d'erreur : une chaîne, ou une fonction qui reçoit la valeur invalide.

```ts
type Message = string | ((value: any) => string)
```

### ObjectOutput

Le type d'un schéma d'objet. Les clés qui acceptent `undefined` deviennent facultatives.

```ts
type ObjectOutput = Simplify<{ [K in keyof S as undefined extends Infer<S[K]> ? never : K]: Infer<S[K]>; } & { [K in keyof S as undefined extends Infer<S[K]> ? K : never]?: Infer<S[K]>; }>
```

### ParseContext

| Propriété | Type | Description |
| --- | --- | --- |
| `issues` | [`ValidationIssue`](/reference/errors/#validationissue)`[]` |  |
| `path` | `(string \| number)[]` |  |

### RefineOptions

Options de `refine()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `message?` | [`Message`](#message) | Par défaut : `"Invalid value"`. |
| `path?` | `(string \| number)[]` | Où signaler le problème, par exemple `["confirmPassword"]` pour une vérification entre plusieurs champs. |
| `code?` | `string` | Par défaut : `"custom"`. |

### SafeParseResult

Ce que renvoie `safeParse()`. En cas d'échec, `issues` est la liste brute et `error` la même chose sous forme de `ValidationError`, construite quand vous la lisez.

```ts
type SafeParseResult = { success: true; data: T; error?: undefined; issues?: undefined; } | { success: false; data?: undefined; error: ValidationError; issues: ValidationIssue[]; }
```

### Shape

Un objet de schémas, tel que passé à `object()`.

```ts
type Shape = Record<string, Schema<any>>
```

### Simplify

Aplatit un type pour que les éditeurs l'affichent proprement.

```ts
type Simplify = { [K in keyof T]: T[K]; } & {}
```

### Step

Une étape d'un schéma : une vérification, une transformation, un raffinement ou un pipe vers un autre schéma.

```ts
type Step = { kind: "check"; test: (value: any) => boolean; code: string; message: Message; details?: Record<string, unknown>; json?: Record<string, unknown>; } | { kind: "transform"; fn: (value: any) => any; } | { kind: "refine"; test: (value: any) => boolean; options: RefineOptions; } | { kind: "pipe"; schema: Schema<any>; }
```
