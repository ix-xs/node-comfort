---
title: "Votre éditeur"
description: "node-comfort est écrit en JavaScript avec une JSDoc détaillée, et fournit des déclarations TypeScript générées à partir de celle-ci. Les éditeurs qui reposent sur le service de langage TypeScript (VS Code, Cursor, WebStorm, Zed, Neovim avec un LSP...) utilisent ces déclarations même dans de simples fichiers JavaScript."
sidebar:
  order: 3
---

## Ce que vous y gagnez

**La complétion.** Tapez `nc.` pour voir tous les espaces de noms et les utilitaires de premier niveau, `nc.str.` pour voir les utilitaires de chaînes, et ainsi de suite. Les objets d'options se complètent aussi : dans `nc.http.get(url, { })`, votre éditeur propose `timeout`, `retry`, `query` et les autres.

**La documentation au survol.** Survolez une fonction pour lire ce qu'elle fait, le rôle de chaque paramètre, les valeurs par défaut et un exemple. Le même texte figure dans la [référence de l'API](/reference/).

**L'aide à la signature.** Pendant que vous tapez les arguments, le paramètre courant et sa description s'affichent.

**Les imports automatiques.** Dans un module ES ou un fichier TypeScript, tapez `nc` ou `isEmail` et acceptez la suggestion ; l'import est ajouté pour vous.

## La vérification des types en JavaScript

Ajoutez `// @ts-check` en haut d'un fichier JavaScript, ou `"checkJs": true` dans un `jsconfig.json`, et votre éditeur signalera les erreurs :

```js
// @ts-check
const nc = require("@ix-xs/node-comfort");

nc.str.truncate("Hello", "5");    // erreur : "5" n'est pas un nombre
nc.time.add(new Date(), 1, "dya"); // erreur : "dya" n'est pas une unité
```

## Des types qui suivent vos données

Beaucoup de fonctions propagent les types : vous avez rarement besoin de les écrire vous-même.

**Les gardes de type** affinent le type des variables :

```ts
declare const input: unknown;
if (nc.isString(input)) input.toUpperCase(); // ici, input est une chaîne
if (nc.isArrayOf(input, nc.isNumber)) input.reduce((a, b) => a + b); // number[]
```

**Les chemins à points** sont vérifiés et typés :

```ts
const city = nc.obj.get(user, "profile.address.city"); // string | undefined
nc.obj.get(user, "profile.adress.city"); // votre éditeur suggère le bon chemin
```

**Les schémas** vous donnent le type des données valides :

```ts
const User = nc.schema.object({ email: nc.schema.string().email(), age: nc.schema.number().optional() });
type User = nc.schema.Infer<typeof User>; // { email: string; age?: number }
```

**Les événements typés**, les caches et les bases de données vérifient les noms et les valeurs :

```ts
const events = new nc.Emitter<{ ready: [port: number] }>();
events.emit("ready", "3000"); // erreur : un nombre est attendu

const db = new nc.SQLite<{ id: number; email: string }>(":memory:");
db.getAll("users", { emial: "x" }); // erreur, et `email` est suggéré
```

## Utiliser les types en JavaScript

La JSDoc vous permet d'utiliser les types du paquet sans TypeScript :

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ message: [text: string] }>} */
const chat = new nc.Emitter();

/** @param {import("@ix-xs/node-comfort").HttpOptions} options */
function callApi(options) {}

/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */
```

Tous les types publics sont exportés depuis la racine du paquet : `SlugifyOptions`, `RetryOptions`, `Where`, `LogLevel` et environ 180 autres. La référence de l'API les liste en bas de chaque page.
