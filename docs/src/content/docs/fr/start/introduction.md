---
title: "Introduction"
description: "node-comfort est une bibliothèque standard pour Node.js. Elle réunit les outils que vous finissez par installer dans presque tous vos projets (un logger, des couleurs, dotenv, une bibliothèque de validation, un client HTTP, de nouvelles tentatives, un cache, des utilitaires de date, des identifiants, le hachage de mots de passe, une boîte à outils CLI...) dans un seul paquet sans dépendance."
sidebar:
  order: 1
---

```js
const nc = require("@ix-xs/node-comfort");

const config = nc.env.validate({ PORT: { type: "port", default: 3000 } });
const users = await nc.http.get("https://api.example.com/users", { retry: { attempts: 3 } });
nc.success(`Loaded ${users.data.length} users`);
```

## Sa raison d'être

Un service Node.js classique embarque quelques centaines de paquets avant de faire quoi que ce soit d'utile. Chacun représente une version de plus à suivre, un journal des modifications de plus à lire et une porte d'entrée de plus pour une attaque de la chaîne d'approvisionnement. La plupart règlent de petits problèmes que Node.js sait désormais traiter seul : il fournit `fetch`, `Intl`, `node:crypto`, `node:sqlite` et un lanceur de tests.

node-comfort ne s'appuie que sur ces modules natifs. Vous y gagnez :

- **Une dépendance au lieu de vingt.** Rien d'autre n'est installé avec elle, et rien ne s'exécute à l'installation.
- **Des API cohérentes.** Les durées s'écrivent toujours `"5m"` ou en millisecondes, les options sont toujours le dernier argument et les erreurs portent toujours un `code` stable.
- **La documentation là où vous travaillez.** Chaque fonction, chaque paramètre et chaque option est décrit et typé : votre éditeur répond à la plupart des questions avant que vous n'ouvriez un navigateur.
- **La rapidité.** Charger le paquet coûte environ 4 ms ; chaque espace de noms se charge à sa première utilisation.

## Ce qu'il contient

| Espace de noms | Ce qu'il fait |
| --- | --- |
| [`logger`](/essentials/logger/) | Logs dans la console avec niveaux, couleurs, balisage, sortie JSON et fichiers de logs |
| [`fs`](/essentials/fs/) | Fichiers et dossiers : écritures atomiques, JSON, glob, surveillance |
| [`checker`](/essentials/checker/) | Vérifications de type et validateurs qui servent aussi de gardes de type TypeScript |
| [`env`](/essentials/env/) | Chargement du `.env` et configuration typée et validée |
| [`str`](/data/str/), [`num`](/data/num/), [`arr`](/data/arr/), [`obj`](/data/obj/) | Utilitaires du quotidien pour les chaînes, les nombres, les tableaux et les objets |
| [`time`](/data/time/) | Dates dans n'importe quelle langue et n'importe quel fuseau horaire, durées, cron |
| [`id`](/data/id/), [`crypto`](/system/crypto/) | Identifiants, tokens, hachage de mots de passe, chiffrement, JWT, codes 2FA |
| [`schema`](/data/schema/) | Validation avec des types TypeScript inférés pour vous |
| [`http`](/system/http/) | Un client `fetch` avec JSON, nouvelles tentatives, timeouts et hooks |
| [`func`](/flow/func/), [`async`](/flow/async/) | Debounce, nouvelles tentatives, mémoïsation, limites de concurrence, files d'attente |
| [`cli`](/system/cli/), [`color`](/system/color/), [`sys`](/system/sys/) | Outils en ligne de commande : arguments, invites, spinners, couleurs, processus |
| [`SQLite`](/system/sqlite/), [`Cache`](/flow/cache/), [`Emitter`](/flow/emitter/) | Une base de données, un cache LRU et un émetteur d'événements typé |

## Son organisation

Tout part d'un seul objet, généralement nommé `nc`. Les quatre modules historiques (logger, fs, checker et utils) sont aussi accessibles au premier niveau : `nc.info()` et `nc.logger.info()` sont donc la même fonction. Tout le reste se trouve dans un espace de noms : `nc.str.slugify()`, `nc.time.format()`, `nc.http.get()`.

Vous pouvez aussi importer un seul espace de noms. C'est la façon la plus rapide de le charger :

```js
import { slugify } from "@ix-xs/node-comfort/str";
```

## Étapes suivantes

- [Premiers pas](/start/getting-started/) : installez le paquet et écrivez votre premier script.
- [Votre éditeur](/start/editor/) : tirez le meilleur parti de la documentation et des types.
- [Recettes](/recipes/) : des exemples complets pour les tâches courantes.
