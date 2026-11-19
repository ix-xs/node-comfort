---
title: "Validation par schéma"
description: "`nc.schema` vérifie des données d'après une description de leur forme, les nettoie et donne le type TypeScript des données valides. L'API suit celle de zod."
---

```js
const { schema: s } = require("@ix-xs/node-comfort");
```

## Analyser

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

| Méthode | Renvoie |
| --- | --- |
| `parse(value, options?)` | Les données nettoyées (espaces retirés, valeurs converties, valeurs par défaut posées, clés inconnues retirées), ou lève une `ValidationError` qui liste chaque problème |
| `safeParse(value, options?)` | `{ success: true, data }` ou `{ success: false, error, issues }`, ne lève jamais |
| `is(value, options?)` | `true` ou `false` ; une garde de type |

La seule option est `maxDepth` : le nombre de niveaux d'objets et de tableaux qu'une valeur peut avoir (1000 par défaut). Une valeur plus profonde reçoit un problème `"too_deep"` au lieu d'épuiser la pile.

## Erreurs

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

`result.error` est une `nc.errors.ValidationError` (code `ERR_VALIDATION`) avec les mêmes `issues`. `flatten()` regroupe les messages par champ, pour un formulaire. Voir [Erreurs](/basics/errors/).

Chaque vérification accepte un message, sous forme de texte ou de fonction de la valeur :

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

En JavaScript : `/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */`.

## Constructeurs

| Constructeur | Vérifications et méthodes |
| --- | --- |
| `s.string()` | `min`, `max`, `length`, `nonempty`, `regex`, `startsWith`, `endsWith`, `includes` ; formats `email`, `url`, `uuid`, `ulid`, `ip`, `hostname`, `datetime`, `date`, `slug`, `hex`, `base64`, `semver` ; transformations `trim`, `toLowerCase`, `toUpperCase` |
| `s.number()` | `min`, `max`, `gt`, `lt`, `int`, `safe`, `positive`, `nonnegative`, `negative`, `multipleOf` |
| `s.boolean()`, `s.bigint()` | |
| `s.date()` | `min`, `max` |
| `s.literal(value)` | Exactement cette valeur |
| `s.enum([...])` | Une des valeurs |
| `s.array(item)` | `min`, `max`, `length`, `nonempty`, `unique` ; `element` est le schéma des éléments |
| `s.object(shape)` | `strict`, `passthrough`, `extend`, `merge`, `pick`, `omit`, `partial`, `required`, `keyof` ; `shape` |
| `s.union([...])` | Le premier schéma qui convient |
| `s.discriminatedUnion(key, [...])` | Le schéma d'objet dont le littéral `key` correspond |
| `s.tuple([...])`, `s.record(values)` | Tableaux de longueur fixe, objets aux clés libres |
| `s.lazy(() => schema)` | Structures récursives |
| `s.instanceOf(Class)`, `s.custom(test)` | Tout le reste |
| `s.any()`, `s.unknown()` | N'importe quoi |
| `s.coerce.string()`, `.number()`, `.boolean()`, `.date()`, `.bigint()` | Convertissent d'abord l'entrée |
| `s.Schema` | La classe de base de tous les schémas, pour `instanceof` |

```js
s.number().gt(0).lt(1000); // 0 et 1000 refusés, là où min et max les acceptent
s.number().safe();         // un entier que JavaScript représente exactement
s.string().date();         // "2024-01-31" : un vrai jour, sans heure
```

## Valeurs facultatives et par défaut

| Méthode | Donne |
| --- | --- |
| `optional()` | `T \| undefined` ; la clé d'un objet devient facultative |
| `nullable()` | `T \| null` |
| `nullish()` | `T \| null \| undefined` |
| `default(value)` | `value` quand l'entrée vaut `undefined` ; une fonction est appelée à chaque fois |
| `catch(value)` | `value` au lieu d'une erreur quand l'entrée est invalide |
| `or(other)` | Raccourci de `s.union([this, other])` |
| `array()` | Raccourci de `s.array(this)` |
| `describe(text)` | Définit `description`, écrite dans le JSON Schema |

## Transformations et règles personnalisées

```js
const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));
Port.parse("8080");  // 8080
Port.parse("70000"); // lève : Must be less than or equal to 65535

const Signup = s.object({ password: s.string().min(8), confirm: s.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
Signup.safeParse({ password: "12345678", confirm: "x" }).error.flatten();
// { confirm: ["Passwords don't match"] }
```

| Méthode | Rôle |
| --- | --- |
| `transform(fn)` | Remplace la valeur par `fn(value)` |
| `pipe(schema)` | Vérifie le résultat avec un autre schéma |
| `refine(test, { message, path, code })` | Une règle personnalisée ; `path` rattache le problème à un champ |

## Objets

Les clés inconnues sont retirées. `.strict()` les refuse, `.passthrough()` les garde.

```js
const Admin = User.extend({ level: s.number() });
const PublicUser = User.pick(["name", "role"]);
const UserPatch = User.partial(); // toutes les clés facultatives
const SortBy = User.keyof();      // "name" | "email" | "age" | "role" | "tags"
const Post = s.object({ title: s.string() }).merge(s.object({ createdAt: s.date() }));
```

`extend`, `pick`, `omit`, `partial` et `required` conservent le traitement des clés inconnues ; avec `merge`, le second schéma l'emporte. Les noms hérités comme `toString` ne sont lus que si l'entrée les possède en propre.

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

`discriminatedUnion` lit d'abord la clé et n'exécute que le schéma correspondant : les problèmes concernent donc ce type d'objet. `s.union([s.string(), s.number()])` essaie chaque schéma tour à tour.

## Chaînes venues des URL et de l'environnement

```js
const Query = s.object({
  page: s.coerce.number().int().min(1).default(1),
  active: s.coerce.boolean().default(false),
  since: s.coerce.date().optional(),
});

Query.parse({ page: "2", active: "true" }); // { page: 2, active: true }
```

`coerce.boolean()` lit `"true"`, `"1"`, `"yes"`, `"on"` et leurs contraires.

## Données récursives

```js
const Category = s.object({
  name: s.string(),
  children: s.lazy(() => s.array(Category)).default([]),
});

Category.safeParse(body, { maxDepth: 20 }); // au-delà de 20 niveaux : un problème "too_deep"
```

## JSON Schema

`toJSONSchema()` écrit un JSON Schema (draft 2020-12), pour OpenAPI ou un générateur de formulaires :

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

`refine()` et `transform()` ne peuvent pas s'y exprimer et sont omis. Un schéma récursif va sous `$defs`.
