---
title: "Votre éditeur"
description: "Les imports en CommonJS, en modules ES et en TypeScript, le point d'entrée de chaque namespace, et les types que les éditeurs lisent en JavaScript comme en TypeScript."
---

## Imports

```js
// CommonJS
const nc = require("@ix-xs/node-comfort");
const { logger, fs, str } = require("@ix-xs/node-comfort");
```

```js
// Modules ES
import nc from "@ix-xs/node-comfort";
import { logger, fs, str } from "@ix-xs/node-comfort";
```

```ts
// TypeScript
import nc = require("@ix-xs/node-comfort");
import { schema as s, type Infer } from "@ix-xs/node-comfort";
```

L'export par défaut, l'objet du namespace et les exports nommés sont les mêmes objets. Le paquet est en CommonJS : les modules ES le lisent par l'interopérabilité de Node, sans build séparé.

## Un seul namespace

Chaque namespace a son point d'entrée, `@ix-xs/node-comfort/<namespace>` :

```js
const { slugify } = require("@ix-xs/node-comfort/str");
const { email } = require("@ix-xs/node-comfort/is");
import { get, set } from "@ix-xs/node-comfort/obj";
```

| Point d'entrée | Exporte |
| --- | --- |
| `config`, `logger`, `fs`, `env`, `is`, `assert`, `errors`, `json`, `str`, `num`, `arr`, `obj`, `schema`, `time`, `id`, `crypto`, `func`, `async`, `http`, `sys`, `cli`, `color` | Le namespace, comme `nc.<namespace>` |
| `cache`, `emitter`, `sqlite` | La classe, avec sa fabrique en méthode statique : `Cache.create()`, `Emitter.create()`, `SQLite.open()` et `SQLite.op` |
| `checker`, `utils` | Les namespaces de la 2.x, dépréciés |

```js
const SQLite = require("@ix-xs/node-comfort/sqlite");
const db = SQLite.open(":memory:");
```

En modules ES, ces trois-là s'importent par défaut (`import SQLite from "@ix-xs/node-comfort/sqlite"`) : un import nommé de `open` ou de `op` échoue. Importer la racine depuis un module ES charge tous les namespaces, un point d'entrée ne charge que le sien : voir [Performances](/help/performance/).

## Types

Les déclarations sont générées depuis la JSDoc du code et incluses dans le paquet. Les éditeurs qui utilisent le service de langage de TypeScript (VS Code, Cursor, WebStorm, Zed, Neovim avec un LSP) les lisent aussi dans les fichiers JavaScript.

| Ce que vous obtenez | Où |
| --- | --- |
| Complétion | Namespaces, membres, et les clés de chaque objet d'options |
| Survol | La description, les paramètres, les valeurs par défaut et un exemple, comme dans la [référence](/reference/) |
| Aide à la signature | Le paramètre en cours et sa description |
| Noms dépréciés | Barrés, avec ce qu'il faut utiliser à la place |

Ajoutez `// @ts-check` en haut d'un fichier JavaScript, ou `"checkJs": true` dans `jsconfig.json`, pour voir les erreurs :

```js
// @ts-check
const nc = require("@ix-xs/node-comfort");

nc.str.truncate("Hello", "5");     // erreur : "5" n'est pas un nombre
nc.time.add(new Date(), 1, "dya"); // erreur : "dya" n'est pas une unité
```

## Des types qui suivent les données

```ts
declare const input: unknown;
if (nc.is.string(input)) input.toUpperCase();                       // input : string
if (nc.is.arrayOf(input, nc.is.number)) input.reduce((a, b) => a + b, 0); // input : number[]
const ids = [1, null, 2, undefined].filter(nc.is.defined);          // number[]

const city = nc.obj.get(user, "profile.address.city");              // string | undefined, le chemin se complète

const User = s.object({ email: s.string().email(), age: s.number().optional() });
type User = Infer<typeof User>;                                      // { email: string; age?: number }

const events = nc.emitter.create<{ ready: [port: number] }>();
events.emit("ready", "3000");                                        // erreur : un nombre est attendu

const db = nc.sqlite.open<{ id: number; email: string }>(":memory:");
db.getAll("users", { emial: "x" });                                  // erreur, `email` est proposé
```

| Typé | Comment |
| --- | --- |
| `nc.is.*` | Gardes de type : la variable est affinée après la vérification |
| `nc.obj.get`, `set`, `has` | Les chemins pointés sont vérifiés d'après l'objet |
| `nc.schema` | `Infer<typeof schema>` est le type des données valides |
| `nc.emitter.create<Events>()` | Noms et arguments des événements |
| `nc.cache.create<K, V>()` | Clés et valeurs |
| `nc.sqlite.open<Row>()` | Lignes, colonnes des filtres |
| `nc.http.get<T>()` | Le type de `data` |

## Les types en JavaScript

Chaque type public est exporté depuis la racine, pour la JSDoc :

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ message: [text: string] }>} */
const chat = nc.emitter.create();

/** @param {import("@ix-xs/node-comfort").HttpOptions} options */
function callApi(options) {}
```

`SlugifyOptions`, `RetryOptions`, `Where`, `LogLevel` et les autres sont listés en bas de la page de chaque namespace de la [référence](/reference/).
