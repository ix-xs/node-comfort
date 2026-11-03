---
title: "Variables d'environnement"
description: "`nc.env` charge les fichiers `.env` et transforme les variables d'environnement en valeurs typées et validées. La meilleure façon de s'en servir est de vérifier toute votre configuration une seule fois, au démarrage."
sidebar:
  order: 4
---

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
config.CACHE_TTL; // 300000 (millisecondes)
config.ADMINS;    // string[]
```

Au moindre problème, vous recevez une seule erreur qui les liste tous, si bien qu'un déploiement défaillant vous dit tout en une fois :

```text
ValidationError: Validation failed with 2 issues:
  • DATABASE_URL: is required but is not set
  • JWT_SECRET: must contain at least 32 characters
```

L'objet renvoyé est gelé et entièrement typé, y compris les valeurs littérales de `enum`.

## Types de variables

| `type` | Résultat | Accepte |
| --- | --- | --- |
| `string` | `string` | n'importe quoi ; `pattern` et `minLength` ajoutent des règles |
| `number` | `number` | des nombres ; `min`, `max`, `integer` |
| `boolean` | `boolean` | `true`/`false`, `1`/`0`, `yes`/`no`, `on`/`off` |
| `port` | `number` | de 0 à 65535 |
| `url` | `string` | des URL absolues ; `protocols` les restreint |
| `email` | `string` | des adresses e-mail |
| `duration` | `number` (ms) | `"30s"`, `"5m"`, `"1h30m"`, `"PT1H"` ou des millisecondes |
| `list` | `string[]` | des valeurs séparées par des virgules ; `separator` change la virgule |
| `json` | `any` | du texte JSON |
| `enum` | union de `values` | l'une des `values` |

Une variable est obligatoire, sauf si elle a un `default` ou `optional: true`. Une variable vide compte comme absente. Toute variable peut porter une `description` : elle est ajoutée au message « is required », et c'est ce que `env.example()` écrit au-dessus de la variable.

## Un .env.example à partir de la même spécification

Gardez la spécification dans une variable, et `env.example()` la transforme en texte d'un fichier `.env.example` : une entrée par variable, avec sa description, son type et sa valeur par défaut.

```js
const spec = {
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", protocols: ["postgres"], description: "Postgres connection string" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  SENTRY_DSN: { type: "url", optional: true },
};

const config = nc.env.validate(spec);
nc.writeFile(".env.example", nc.env.example(spec));
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

`example()` renvoie le texte et n'écrit rien elle-même. Lancez-la depuis un petit script et commitez le fichier : personne n'aura à lire le code pour savoir quoi définir.

## Lire une seule variable

Les mêmes types sont disponibles un par un :

```js
nc.env.port("PORT", { default: 3000 });
nc.env.number("WORKERS", { default: 4, min: 1, integer: true });
nc.env.bool("FEATURE_BETA", { default: false });
nc.env.url("API_URL");                         // lève une erreur si elle est absente ou invalide
nc.env.oneOf("LOG_LEVEL", ["debug", "info", "warn"], { default: "info" });
nc.env.get("REGION", "eu-west-1");             // simple chaîne, ne lève jamais d'erreur
nc.env.required("STRIPE_SECRET_KEY");
```

## Les fichiers .env

Le fichier `.env` du répertoire de travail est chargé au moment où vous importez le package. Les variables déjà définies ne sont pas écrasées, l'environnement réel l'emporte donc toujours. Définissez `NODE_COMFORT_DOTENV=false` pour désactiver ce comportement.

Chargez vous-même d'autres fichiers quand vous en avez besoin :

```js
nc.env.load(".env.test", { override: true });
nc.env.load([".env.local", ".env"]);
```

`load()` travaille en deux temps. Elle lit les fichiers, et le premier fichier qui définit une variable l'emporte : ici, `.env.local` passe avant `.env`. Elle place ensuite le résultat dans `process.env`, en conservant les variables déjà présentes, sauf si vous passez `override: true`. `override` ne change jamais l'ordre entre les fichiers.

Le `.env` chargé au démarrage fait exception : ce qu'il a défini a la priorité la plus basse, un fichier que vous chargez vous-même l'emporte donc sur lui. `nc.env.load(".env.local")` fait ce que vous attendez, sans rien avoir à désactiver. L'environnement réel l'emporte toujours sur tous les fichiers.

### Ce que le chargement automatique laisse de côté

Le `.env` chargé au démarrage est lu dans le dossier de travail, qui peut être un dépôt que quelqu'un vous a envoyé. Il ne définit donc jamais les variables capables d'exécuter du code dans les programmes que votre application lance, ou de désactiver les vérifications TLS : `NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `NODE_PATH`, `LD_PRELOAD`, `DYLD_*`, `GIT_SSH_COMMAND`, `GIT_CONFIG*`, `PATH`, `EDITOR`, `PAGER` et quelques autres du même genre (la [référence](/reference/env/) donne la liste complète). Quand il en laisse une de côté, il le signale une fois sur stderr.

Si vous voulez vraiment l'une d'elles depuis un fichier de confiance, chargez-le vous-même : un appel explicite à `nc.env.load()` les définit toutes.

```js
nc.env.load(".env"); // votre propre fichier : NODE_OPTIONS et les autres sont aussi définies
```

Une référence comme `${HOST}` prend la valeur finale de `HOST`. Si l'environnement ou `.env.local` définit `HOST`, un `URL=http://${HOST}` placé dans `.env` la suit.

`load()` renvoie tout ce qu'elle a lu dans les fichiers. Les fichiers absents sont ignorés, sauf si vous passez `required: true`.

## Un jeu de fichiers par mode

`cascade` charge les fichiers qui accompagnent un fichier `.env`, le plus spécifique en premier :

```js
nc.env.load(".env", { cascade: true });
// avec NODE_ENV=production : .env.production.local, .env.local, .env.production, .env
```

Le mode est `NODE_ENV`, ou `"development"` quand il n'est pas défini. Passez une chaîne pour le nommer vous-même : `{ cascade: "staging" }`. En mode `test`, `.env.local` est laissé de côté, pour que les tests se déroulent de la même façon chez tout le monde.

Le `.env` chargé au démarrage ne gêne pas : les fichiers plus spécifiques remplacent ce qu'il a défini.

## Ce qu'un fichier .env peut contenir

L'analyseur gère ce à quoi vous vous attendez : guillemets, valeurs sur plusieurs lignes, `export`, commentaires, séquences d'échappement et références à d'autres variables.

```bash
# .env
APP_URL=http://localhost:${PORT:-3000}
PRIVATE_KEY="-----BEGIN KEY-----
...
-----END KEY-----"
GREETING='single quotes keep ${THIS} as is'
```

`nc.env.parse(text)` analyse le texte sans toucher à `process.env`, et sans le lire non plus : une référence `${VAR}` n'utilise que les variables du texte lui-même et celles de l'option `env`. Passez `process.env` pour utiliser l'environnement réel :

```js
nc.env.parse('PORT=3000\nURL="http://localhost:${PORT}"'); // { PORT: "3000", URL: "http://localhost:3000" }
nc.env.parse("TMP_COPY=${TMP}", { env: process.env });       // TMP vient de l'environnement réel
```

Une valeur qui dépasse 64 Ko à force de références (des variables qui utilisent chacune plusieurs fois la précédente) lève une `RangeError`.

## Modes

```js
nc.env.mode();          // NODE_ENV, ou "development"
nc.env.isProduction();
nc.env.isTest();        // vrai aussi sous node --test ou Jest
```
