---
title: "nc.env"
description: "Des variables d'environnement fiables : chargement de `.env`, accesseurs typés, et `validate()` pour vérifier toute votre configuration au démarrage et signaler tous les problèmes d'un coup."
sidebar:
  label: "env"
  order: 4
---

Le fichier `.env` du répertoire de travail est chargé au chargement du paquet ; les variables déjà définies ne sont jamais écrasées. Définissez `NODE_COMFORT_DOTENV=false` pour désactiver ce comportement. Ce qu'il a chargé a la priorité la plus basse : un fichier que vous chargez vous-même ensuite l'emporte sur lui.

```js
const { env } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const env = require("@ix-xs/node-comfort/env");
```

Cette page liste tout ce que contient `nc.env`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/env/).

```js
const config = env.validate({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url" },                  // obligatoire
  CACHE_TTL: { type: "duration", default: "5m" }, // en ms
});
config.PORT; // un nombre, typé dans votre éditeur
```

## parse

```ts
parse(content: string, options?: EnvParseOptions): Record<string, string>
```

Analyse le texte d'un fichier `.env` : guillemets, valeurs multilignes, `export`, commentaires, échappements et expansion de `${VAR}` (sauf entre guillemets simples).

```js
env.parse('PORT=3000\nURL="http://localhost:${PORT}"');
// { PORT: "3000", URL: "http://localhost:3000" }
```

## load

```ts
load(files?: string | string[], options?: EnvLoadOptions): Record<string, string>
```

Charge des fichiers `.env` dans `process.env`. Le premier fichier qui définit une variable l'emporte, et les variables déjà définies sont conservées, sauf si vous passez `override`. Le `.env` chargé automatiquement au démarrage ne compte pas comme déjà défini : `.env.local` l'emporte sur lui, comme on s'y attend.

| Paramètre | Type | Description |
| --- | --- | --- |
| `files?` | `string \| string[]` | Relatifs au répertoire de travail. Par défaut : `".env"`. |
| `options?` | [`EnvLoadOptions`](#envloadoptions) |  |

**Renvoie** `Record``<string, string>` : Tout ce qui a été lu dans les fichiers.

**Lève** `Error` : Si `required` est activé et qu'un fichier est manquant.

```js
env.load();                                // ./.env
env.load([".env.local", ".env"]);          // les valeurs locales l'emportent
env.load(".env.test", { override: true });
env.load(".env", { cascade: true });       // .env.production.local, .env.local, .env.production, .env
```

## get

```ts
get(name: string, fallback?: string): string | undefined
```

Lit une variable, avec une valeur de repli. Ne lève jamais d'erreur.

```js
env.get("REGION", "eu-west-1");
```

## has

```ts
has(name: string): boolean
```

La variable est-elle définie, même avec une chaîne vide ?

## required

```ts
required(name: string): string
```

Lit une variable qui doit être définie et non vide.

**Lève** `ValidationError` : Si elle est manquante ou vide.

```js
const key = env.required("STRIPE_SECRET_KEY");
```

## string

```ts
string(name: string, options?: (EnvGetterOptions<string> & { pattern?: RegExp; minLength?: number; }) | undefined): string
```

Lit une chaîne. Obligatoire sauf si vous donnez une valeur par défaut ou `optional`.

**Lève** `ValidationError`

```js
env.string("APP_NAME", { default: "my-app" });
```

## number

```ts
number(name: string, options?: (EnvGetterOptions<number> & { min?: number; max?: number; integer?: boolean; }) | undefined): number
```

Lit un nombre.

**Lève** `ValidationError`

```js
env.number("WORKERS", { default: 4, min: 1, integer: true });
```

## bool

```ts
bool(name: string, options?: EnvGetterOptions<boolean>): boolean
```

Lit un booléen : `true`/`false`, `1`/`0`, `yes`/`no` ou `on`/`off`.

**Lève** `ValidationError`

```js
if (env.bool("FEATURE_BETA", { default: false })) enableBeta();
```

## port

```ts
port(name: string, options?: EnvGetterOptions<number>): number
```

Lit un numéro de port.

**Lève** `ValidationError`

```js
server.listen(env.port("PORT", { default: 3000 }));
```

## url

```ts
url(name: string, options?: (EnvGetterOptions<string> & { protocols?: string[]; }) | undefined): string
```

Lit une URL absolue.

**Lève** `ValidationError`

```js
env.url("DATABASE_URL", { protocols: ["postgres", "postgresql"] });
```

## duration

```ts
duration(name: string, options?: EnvGetterOptions<string | number>): number
```

Lit une durée comme `"30s"` ou `"1h30m"` et renvoie des millisecondes.

**Lève** `ValidationError`

```js
env.duration("CACHE_TTL", { default: "10m" }); // 600000
```

## list

```ts
list(name: string, options?: (EnvGetterOptions<string[]> & { separator?: string; }) | undefined): string[]
```

Lit une liste séparée par des virgules. Les espaces autour des éléments sont retirés et les éléments vides écartés.

**Lève** `ValidationError`

```js
// ALLOWED_ORIGINS="https://a.com, https://b.com"
env.list("ALLOWED_ORIGINS", { default: [] }); // ["https://a.com", "https://b.com"]
```

## json

```ts
json<T = any>(name: string, options?: EnvGetterOptions<T>): T
```

Lit une valeur JSON.

**Lève** `ValidationError`

```js
const flags = env.json("FEATURE_FLAGS", { default: {} });
```

## oneOf

```ts
oneOf<V extends string>(name: string, values: readonly V[], options?: EnvGetterOptions<V>): V
```

Lit une variable qui doit être l'une des valeurs données. Le résultat a leur type littéral.

**Lève** `ValidationError`

```js
env.oneOf("LOG_LEVEL", ["debug", "info", "warn", "error"], { default: "info" });
```

## validate

```ts
validate<T extends Record<string, EnvVarSpec>>(spec: T, options?: { env?: ProcessEnv; } | undefined): Readonly<EnvConfig<T>>
```

Vérifie toutes vos variables d'un coup et renvoie une configuration typée et gelée. Si quelque chose ne va pas, une seule `ValidationError` liste tous les problèmes : un mauvais déploiement échoue ainsi au démarrage avec une vue d'ensemble complète.

**Lève** `ValidationError`

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

Écrit le `.env.example` qui accompagne une spécification `validate()` : une entrée par variable, avec sa description, son type et sa valeur par défaut. Gardez le fichier dans le dépôt pour que personne n'ait à lire le code pour savoir quoi définir.

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

`NODE_ENV`, ou `"development"` quand elle n'est pas définie.

## isProduction

```ts
isProduction(): boolean
```

`NODE_ENV` vaut-elle `"production"` ?

## isDevelopment

```ts
isDevelopment(): boolean
```

`NODE_ENV` vaut-elle `"development"`, ou n'est-elle pas définie ?

## isTest

```ts
isTest(): boolean
```

Des tests sont-ils en cours ? Vrai quand `NODE_ENV` vaut `"test"` ou qu'un lanceur de tests comme `node --test` ou Jest est détecté.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { EnvConfig } from "@ix-xs/node-comfort"`.

### EnvConfig

Ce que renvoie `validate()`.

```ts
type EnvConfig = { -readonly [K in keyof T]: T[K] extends { optional: true; } ? EnvVarValue<T[K]> | undefined : EnvVarValue<T[K]>; }
```

### EnvGetterOptions

Options communes aux accesseurs typés.

| Propriété | Type | Description |
| --- | --- | --- |
| `default?` | `T` | Utilisée quand la variable est manquante ou vide. Sans elle, la variable est obligatoire. |
| `optional?` | `boolean` | Renvoyer `undefined` au lieu de lever une erreur quand elle est manquante. |
| `env?` | `ProcessEnv` | D'où lire les valeurs. Par défaut : `process.env`. |

### EnvLoadOptions

Options de `load()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `override?` | `boolean` | Écraser les variables déjà définies. |
| `expand?` | `boolean` | Remplacer les références `${OTHER}`. Par défaut : `true`. |
| `required?` | `boolean` | Lever une erreur si un fichier est manquant. |
| `cascade?` | `string \| boolean` | Charger aussi les fichiers qui accompagnent chacun : `.env.production.local`, `.env.local`, `.env.production`, puis `.env`. `true` prend le mode dans `NODE_ENV` ; une chaîne le nomme. `.env.local` est ignoré en mode test, pour que les tests s'exécutent de la même façon pour tout le monde. |
| `target?` | `ProcessEnv` | Où placer les variables. Par défaut : `process.env`. |

### EnvParseOptions

Options de `parse()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `expand?` | `boolean` | Remplacer `$VAR`, `${VAR}` et `${VAR:-default}`. Par défaut : `true`. |
| `env?` | `Record``<string, string \| undefined>` | Autres variables utilisables dans les expansions. Par défaut : `process.env`. |

### EnvVarSpec

Une variable dans `validate()`. Elle est obligatoire sauf si elle a un `default` ou `optional: true`.

```ts
type EnvVarSpec = ({ type: "string"; default?: string; optional?: boolean; pattern?: RegExp; minLength?: number; description?: string; } | { type: "number"; default?: number; optional?: boolean; min?: number; max?: number; integer?: boolean; description?: string; } | { type: "boolean"; default?: boolean; optional?: boolean; description?: string; } | { type: "port"; default?: number; optional?: boolean; description?: string; } | { type: "url"; default?: string; optional?: boolean; protocols?: string[]; description?: string; } | { type: "email"; default?: string; optional?: boolean; description?: string; } | { type: "duration"; default?: number | string; optional?: boolean; description?: string; } | { type: "list"; default?: string[]; optional?: boolean; separator?: string; description?: string; } | { type: "json"; default?: unknown; optional?: boolean; description?: string; } | { type: "enum"; values: readonly string[]; default?: string; optional?: boolean; description?: string; })
```

### EnvVarValue

Le type que prend une variable une fois lue.

```ts
type EnvVarValue = S["type"] extends "number" | "port" | "duration" ? number : S["type"] extends "boolean" ? boolean : S["type"] extends "list" ? string[] : S["type"] extends "json" ? any : S extends { values: readonly (infer V)[]; } ? V : string
```
