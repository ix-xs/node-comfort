---
title: "Premiers pas"
description: "Installez le paquet, écrivez un premier script et voyez comment le même code fonctionne en CommonJS, en modules ES et en TypeScript."
sidebar:
  order: 2
---

## Installation

```bash
npm install @ix-xs/node-comfort
```

Il vous faut Node.js 22.13 ou plus récent. C'est la première version où `node:sqlite`, qu'utilise `nc.SQLite`, fonctionne sans option. Vérifiez la vôtre avec `node --version`.

## Votre premier script

Créez `hello.js` :

```js
const nc = require("@ix-xs/node-comfort");

nc.info("Starting up");

const started = nc.time.stopwatch();
const slug = nc.str.slugify("Héllo Wörld, from node-comfort!");
nc.success(`Slug: ${slug}`);

nc.box(`Done in ${started.stop(true)}`, { title: "hello" });
```

Lancez-le avec `node hello.js`. La sortie est en couleur dans un terminal, et en texte brut quand vous la redirigez vers un fichier.

## CommonJS, modules ES et TypeScript

Le paquet fonctionne de la même façon partout.

```js
// CommonJS
const nc = require("@ix-xs/node-comfort");
const { str, isEmail } = require("@ix-xs/node-comfort");
```

```js
// Modules ES
import nc from "@ix-xs/node-comfort";
import { str, isEmail, nc as toolkit } from "@ix-xs/node-comfort";
```

```ts
// TypeScript : les types sont fournis avec le paquet
import nc = require("@ix-xs/node-comfort");
import { schema as s, type Infer } from "@ix-xs/node-comfort";
```

Toute la boîte à outils est aussi exportée sous les noms `nc` et `nodeComfort` : `const { nc } = require("@ix-xs/node-comfort")` fonctionne donc aussi. Dans un module ES ou un fichier TypeScript, commencez à taper `nc` et laissez votre éditeur ajouter l'import.

## Importer un seul espace de noms

Chaque espace de noms a son propre point d'entrée :

```js
import { slugify, truncate } from "@ix-xs/node-comfort/str";
import SQLite from "@ix-xs/node-comfort/sqlite";
const { get, set } = require("@ix-xs/node-comfort/obj");
```

Dans les modules ES, c'est le moyen de ne charger que ce que vous utilisez, car Node.js lit tous les exports du paquet racine quand vous l'importez. Les chiffres se trouvent sur la page [Performances](/start/performance/).

Les points d'entrée sont : `logger`, `fs`, `checker`, `utils`, `str`, `num`, `arr`, `obj`, `func`, `time`, `id`, `crypto`, `color`, `cli`, `sys`, `async`, `schema`, `http`, `env`, `errors`, `sqlite`, `cache` et `emitter`.

## Le fichier `.env`

Quand vous chargez le paquet, il lit le fichier `.env` du répertoire de travail s'il y en a un. Les variables déjà définies ne sont jamais écrasées : les vraies variables d'environnement l'emportent toujours.

```bash
# .env
DATABASE_URL=postgres://localhost/app
PORT=3000
```

```js
const nc = require("@ix-xs/node-comfort");
const port = nc.env.port("PORT", { default: 8080 }); // 3000
```

Pour désactiver ce chargement, définissez `NODE_COMFORT_DOTENV=false`. Pour charger d'autres fichiers, appelez vous-même `nc.env.load()`. Le [guide env](/essentials/env/) détaille la validation.

## Les variables d'environnement qui changent le comportement

| Variable | Effet |
| --- | --- |
| `LOG_LEVEL` | Niveau de log minimal : `trace`, `debug`, `info`, `warn`, `error`, `fatal` ou `silent` |
| `LOG_FORMAT=json` | Les logs deviennent un objet JSON par ligne |
| `DEBUG` | Affiche les logs `debug` : `DEBUG=1` pour tous, `DEBUG=db,http:*` pour les loggers qui ont ces portées |
| `NO_COLOR` | Désactive les couleurs |
| `FORCE_COLOR=1\|2\|3` | Force les couleurs, en 16, 256 ou 16 millions de couleurs |
| `NODE_COMFORT_DOTENV=false` | Ne charge pas `.env` automatiquement |

## Et ensuite

- [Votre éditeur](/start/editor/) montre comment obtenir la complétion et la vérification des types, y compris en JavaScript.
- Les guides des modules, dans la barre latérale, parcourent chaque espace de noms.
- La [référence de l'API](/reference/) liste toutes les fonctions.
