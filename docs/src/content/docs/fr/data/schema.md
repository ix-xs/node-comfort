---
title: "Validation par schéma"
description: "`nc.schema` valide des données par rapport à une description de ce qu'elles doivent être, et vous donne en prime le type TypeScript des données valides. Si vous avez utilisé `zod`, vous serez en terrain connu."
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

`parse()` renvoie les données nettoyées (espaces retirés, minuscules appliquées, valeurs par défaut renseignées, clés inconnues supprimées), ou lève une `ValidationError` qui liste tous les problèmes.

## Gérer les erreurs

`safeParse()` ne lève jamais d'erreur. Elle renvoie soit les données, soit l'erreur :

```js
const result = User.safeParse(req.body);
if (!result.success) {
  return res.status(400).json(result.error.flatten());
  // { email: ["Invalid email address"], age: ["Must be greater than or equal to 18"] }
}
saveUser(result.data);
```

Un résultat en échec contient aussi `issues`, la simple liste des problèmes. Chaque problème a un `path`, un `code` et un `message` que vous pouvez montrer aux utilisateurs :

```js
result.issues;
// [
//   { path: ["email"], code: "invalid_string", message: "Invalid email address", validation: "email" },
//   { path: ["age"], code: "too_small", message: "Must be greater than or equal to 18", minimum: 18 },
// ]
```

`result.error` est une `ValidationError` qui contient la même liste. `is()` est une simple vérification par oui ou non, qui sert aussi de garde de type.

## Les types en prime

```ts
import { schema as s, type Infer } from "@ix-xs/node-comfort";

type User = Infer<typeof User>;
// { name: string; email: string; age?: number; role: "admin" | "user"; tags: string[] }
```

En JavaScript, le même type est disponible grâce à JSDoc : `/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */`.

## Les briques de base

| Constructeur | Vérifications |
| --- | --- |
| `s.string()` | `min`, `max`, `length`, `nonempty`, `regex`, `startsWith`, `endsWith`, `includes` ; formats `email`, `url`, `uuid`, `ulid`, `ip`, `hostname`, `datetime`, `date`, `slug`, `hex`, `base64`, `semver` ; transformations `trim`, `toLowerCase`, `toUpperCase` |
| `s.number()` | `min`, `max`, `gt`, `lt`, `int`, `safe`, `positive`, `nonnegative`, `negative`, `multipleOf` |
| `s.boolean()`, `s.bigint()` | |
| `s.date()` | `min`, `max` |
| `s.literal(value)` | exactement cette valeur |
| `s.enum([...])` | l'une des valeurs |
| `s.array(item)` | `min`, `max`, `length`, `nonempty`, `unique` |
| `s.object(shape)` | `strict`, `passthrough`, `extend`, `merge`, `pick`, `omit`, `partial`, `required`, `keyof` |
| `s.union([...])`, `s.discriminatedUnion(key, [...])` | l'un de plusieurs schémas |
| `s.tuple([...])`, `s.record(values)` | |
| `s.lazy(() => schema)` | structures récursives |
| `s.instanceOf(Class)`, `s.custom(test)` | tout le reste |
| `s.any()`, `s.unknown()` | n'importe quoi |

```js
s.number().gt(0).lt(1000); // 0 et 1000 sont refusés, là où min et max les acceptent
s.number().safe();         // un entier que JavaScript représente exactement, pour les identifiants issus d'une base de données
s.string().date();         // "2024-01-31" : un vrai jour, sans heure
s.string().slug();         // "my-first-post"
```

Chaque vérification accepte un message facultatif, sous forme de chaîne ou de fonction de la valeur :

```js
s.string().min(8, "Use at least 8 characters");
s.number().max(100, (value) => `${value} is too high`);
```

## Facultatif, nullable et valeurs par défaut

```js
s.string().optional();              // string | undefined, et la clé devient facultative
s.string().nullable();              // string | null
s.string().default("guest");        // utilisée quand la valeur est undefined
s.date().default(() => new Date()); // une nouvelle valeur à chaque fois
s.number().catch(0);                // 0 au lieu d'une erreur quand la valeur est invalide
```

## Transformations et règles personnalisées

```js
const Tags = s.string().transform((value) => value.split(",").map((t) => t.trim()));

const Signup = s.object({ password: s.string().min(8), confirm: s.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
```

`refine` avec un `path` rattache l'erreur à un champ, ce dont les formulaires ont besoin.

`pipe()` envoie le résultat dans un autre schéma. Après un `transform()`, elle vérifie ce que la conversion a produit :

```js
const Port = s.string().transform(Number).pipe(s.number().int().min(1).max(65535));

Port.parse("8080");  // 8080
Port.parse("abc");   // lève : Expected number, received NaN
Port.parse("70000"); // lève : Must be less than or equal to 65535
```

## Objets

Les clés inconnues sont supprimées par défaut. `.strict()` les rejette et `.passthrough()` les conserve.

```js
const Admin = User.extend({ level: s.number() });
const PublicUser = User.pick(["name", "role"]);
const UserPatch = User.partial();  // toutes les clés facultatives, pour les requêtes PATCH
const FullUser = User.required();  // l'inverse : age doit être présent lui aussi
const SortBy = User.keyof();       // accepte "name", "email", "age", "role" ou "tags"

const Timestamps = s.object({ createdAt: s.date(), updatedAt: s.date() });
const Post = s.object({ title: s.string() }).merge(Timestamps);
```

`extend`, `pick`, `omit`, `partial` et `required` conservent la façon dont le schéma traite les clés inconnues : un schéma strict reste donc strict. Avec `merge`, les clés du second schéma l'emportent, tout comme sa façon de traiter les clés inconnues.

Les méthodes dont tout objet hérite, comme `toString`, ne sont pas des données : une clé qui porte un tel nom n'est lue que si l'entrée la possède vraiment.

## Une forme parmi plusieurs

Quand des objets se distinguent par une clé, comme le `type` d'un événement, utilisez `discriminatedUnion()` :

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

Elle lit d'abord la clé et n'exécute que le schéma correspondant : les erreurs portent donc sur le genre d'objet que l'entrée déclare être. Chaque option doit être un schéma d'objet avec un littéral différent pour cette clé.

`s.union([...])` essaie chaque schéma tour à tour et garde le premier qui convient. Utilisez-la quand une telle clé n'existe pas, comme dans `s.union([s.string(), s.number()])`.

## Chaînes de requête et valeurs d'environnement

Les valeurs qui viennent des URL, des formulaires et des variables d'environnement sont toujours des chaînes. `s.coerce` les convertit avant de les vérifier :

```js
const Query = s.object({
  page: s.coerce.number().int().min(1).default(1),
  active: s.coerce.boolean().default(false),
  since: s.coerce.date().optional(),
});

Query.parse({ page: "2", active: "true" }); // { page: 2, active: true }
```

`coerce.boolean()` comprend `"true"`, `"1"`, `"yes"`, `"on"` et leurs contraires.

## Données récursives

```js
const Category = s.object({
  name: s.string(),
  children: s.lazy(() => s.array(Category)).default([]),
});
```

## JSON Schema

`toJSONSchema()` décrit ce qu'un schéma accepte sous la forme d'un JSON Schema (draft 2020-12), pour un document OpenAPI ou un générateur de formulaires :

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

Les règles qui n'existent que dans le code, comme `refine()` et `transform()`, ne peuvent pas s'écrire en JSON Schema et sont laissées de côté. Un schéma récursif est placé sous `$defs`.

Tous les constructeurs et toutes les vérifications sont listés dans la [référence](/reference/schema/).
