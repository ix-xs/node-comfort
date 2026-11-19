---
title: "Variables d'environnement"
description: "`nc.env` : des variables d'environnement typées et validées, vérifiées une fois au démarrage, et le chargement et l'analyse des fichiers `.env`."
---

```js
const { env } = require("@ix-xs/node-comfort");
```

## Valider au démarrage

```js
const config = env.validate({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", protocols: ["postgres"] },
  JWT_SECRET: { type: "string", minLength: 32 },
  CACHE_TTL: { type: "duration", default: "5m" },
  ADMINS: { type: "list", default: [] },
  SENTRY_DSN: { type: "url", optional: true },
});

config.PORT;      // 3000, un nombre
config.CACHE_TTL; // 300000, en millisecondes
config.ADMINS;    // un string[]
```

`validate(spec, { env })` renvoie un objet figé et typé (`enum` donne l'union de ses `values`). Quand quelque chose ne va pas, une seule `ValidationError` liste tous les problèmes :

```text
ValidationError: Validation failed with 2 issues:
  • DATABASE_URL: is required but is not set
  • JWT_SECRET: must contain at least 32 characters
```

Une variable est obligatoire sauf si elle a un `default` ou `optional: true`. Une variable vide compte comme absente.

## Types

| `type` | Résultat | Accepte | Options |
| --- | --- | --- | --- |
| `string` | `string` | Tout | `pattern`, `minLength` |
| `number` | `number` | Des nombres | `min`, `max`, `integer` |
| `boolean` | `boolean` | `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off` | |
| `port` | `number` | De 0 à 65535 | |
| `url` | `string` | Des URL absolues | `protocols` |
| `email` | `string` | Des adresses e-mail | |
| `duration` | `number`, en ms | `"30s"`, `"5m"`, `"1h30m"`, `"PT1H"`, des millisecondes | |
| `list` | `string[]` | Des valeurs séparées par des virgules | `separator` |
| `json` | `any` | Du texte JSON | |
| `enum` | Une des `values` | Une des `values` | `values` (obligatoire) |

Chaque type accepte aussi `default`, `optional` et `description`.

## Une seule variable

```js
env.port("PORT", { default: 3000 });
env.number("WORKERS", { default: 4, min: 1, integer: true });
env.boolean("FEATURE_BETA", { default: false });
env.url("API_URL");                                          // lève une erreur si absente ou invalide
env.oneOf("LOG_LEVEL", ["debug", "info", "warn"], { default: "info" });
env.duration("CACHE_TTL", { default: "5m" });                // 300000
env.list("ADMINS", { optional: true });                      // undefined si absente
env.get("REGION", "eu-west-1");                              // une chaîne brute, ne lève jamais d'erreur
env.required("STRIPE_SECRET_KEY");
```

| Fonction | Renvoie |
| --- | --- |
| `get(name, fallback?)` | La chaîne brute, ou `fallback`. Ne lève jamais d'erreur |
| `has(name)` | Si elle est définie, même à une chaîne vide |
| `required(name)` | La chaîne brute. Lève une erreur si elle est absente ou vide |
| `string`, `number`, `boolean`, `port`, `url`, `duration`, `list`, `json` | La valeur typée, avec les options du tableau ci-dessus |
| `oneOf(name, values, options?)` | Une des `values` |

Chaque lecteur typé accepte `{ default, optional, env }` : `env` lit dans un autre objet que `process.env`. Une valeur absente ou invalide lève une `ValidationError`.

## Un .env.example à partir de la spec

```js
const spec = {
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", protocols: ["postgres"], description: "Postgres connection string" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  SENTRY_DSN: { type: "url", optional: true },
};

require("node:fs").writeFileSync(".env.example", env.example(spec));
```

```bash
# Port to listen on
# port, default: 3000
PORT=3000

# Postgres connection string
# url, required
DATABASE_URL=

# debug | info | warn, default: info
LOG_LEVEL=info

# url, optional
SENTRY_DSN=
```

`example(spec)` renvoie le texte et n'écrit rien. Une `description` apparaît aussi dans le message « is required ».

## Charger des fichiers

Le `.env` du dossier de travail est chargé quand le paquet est requis ([Configuration](/start/configuration/)). Chargez les autres fichiers vous-même :

```js
env.load(".env.test", { override: true });
env.load([".env.local", ".env"]);       // le premier fichier qui définit une variable l'emporte
env.load(".env", { cascade: true });    // avec NODE_ENV=production : .env.production.local, .env.local, .env.production, .env
env.load(".env.ci", { required: true }); // lève une erreur si le fichier manque
```

| Option | Par défaut | |
| --- | --- | --- |
| `override` (ou `overwrite`) | `false` | Remplace les variables déjà définies. Ne change jamais l'ordre entre les fichiers |
| `cascade` | `false` | Charge aussi les fichiers du mode, le plus précis d'abord. `true` prend le mode dans `NODE_ENV`, une chaîne le nomme. `.env.local` est sauté en mode test |
| `required` | `false` | Lève une `NodeComfortError` de code `ERR_ENV_FILE_MISSING` quand un fichier manque |
| `expand` | `true` | Remplace les références `${OTHER}` |
| `target` | `process.env` | Où placer les variables |

`load` renvoie tout ce qu'il a lu. Les chemins partent du dossier de travail. Le vrai environnement l'emporte sur tous les fichiers, et un fichier que vous chargez l'emporte sur le `.env` automatique. Une référence comme `${HOST}` prend la valeur finale de `HOST`, quel que soit le fichier ou l'environnement qui la définit.

Un `load()` explicite définit toutes les variables, y compris celles que le chargement automatique écarte (`NODE_OPTIONS`, `PATH`...) : ne chargez que des fichiers de confiance.

## Analyser

```js
env.parse('PORT=3000\nURL="http://localhost:${PORT}"'); // { PORT: "3000", URL: "http://localhost:3000" }
env.parse("TMP_COPY=${TMP}", { env: process.env });       // TMP pris dans le vrai environnement
```

`parse(text, { expand, env })` ne modifie rien et ne lit que le texte et `env`, jamais `process.env` par défaut. Il comprend les guillemets, les valeurs sur plusieurs lignes, `export`, les commentaires, les échappements, `$VAR`, `${VAR}` et `${VAR:-default}`. Une valeur qui dépasse 64 Ko à force de références lève une `RangeError`.

```bash
APP_URL=http://localhost:${PORT:-3000}
PRIVATE_KEY="-----BEGIN KEY-----
...
-----END KEY-----"
GREETING='single quotes keep ${THIS} as is'
```

## Modes

| Fonction | Renvoie |
| --- | --- |
| `mode()` | `NODE_ENV`, ou `"development"` |
| `isProduction()`, `isDevelopment()` | Compare `mode()` |
| `isTest()` | `NODE_ENV=test`, et aussi sous `node --test` ou Jest |

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.env.bool()` | `nc.env.boolean()` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |

Les anciens noms fonctionnent encore en 3.0, avertissent une fois et disparaissent en 4.0. `env.load(..., { required: true })` lève désormais une `NodeComfortError` de code `ERR_ENV_FILE_MISSING` pour un fichier manquant.
