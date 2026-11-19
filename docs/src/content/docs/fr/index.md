---
title: "Installation"
description: "node-comfort est une bibliothèque standard pour Node.js en un seul paquet sans dépendance : logger, fichiers, validation, HTTP, SQLite, ligne de commande, dates, identifiants et cryptographie, le tout typé."
---

```bash
npm install @ix-xs/node-comfort
```

Ou `pnpm add`, `yarn add`. Les types sont inclus.

| Prérequis | |
| --- | --- |
| Node.js | 22.23.4 ou plus en 22, 24.22.1 ou plus en 24, 26.12.1 ou plus. Node.js 23 et 25 ne sont pas pris en charge |
| Modules | CommonJS et modules ES, plus un point d'entrée par namespace |
| TypeScript | Déclarations incluses, sans paquet `@types`. Les éditeurs les lisent aussi en JavaScript |
| Dépendances | Aucune. Rien ne s'exécute à l'installation |

Les versions plus anciennes de Node.js [peuvent planter sur une réponse HTTP malveillante](/system/http/#servers-you-dont-control), ce qu'aucun paquet ne peut empêcher. Node.js 26 est le plus rapide : les fuseaux horaires y passent par `Temporal`.

## Premier appel

En CommonJS :

```js
const { logger, fs, str } = require("@ix-xs/node-comfort");

const settings = fs.readJSON("./settings.json", { name: "My App" });
logger.info(`Starting ${str.slugify(settings.name)}`);
// [11:54:34] ℹ INFO Starting my-app
```

En modules ES :

```js
import nc from "@ix-xs/node-comfort";
import { logger, fs, str } from "@ix-xs/node-comfort";
import { slugify } from "@ix-xs/node-comfort/str";
```

Tout s'appelle `nc.<namespace>.<membre>` : [Organisation](/basics/organisation/) décrit la forme de l'API, [Votre éditeur](/start/editor/) les imports et les types. Les réglages communs à tous les namespaces sont dans [Configuration](/start/configuration/).

## Ce que couvre la bibliothèque

| Groupe | Namespaces |
| --- | --- |
| Configuration | [`config`](/start/configuration/) : langue et fuseau horaire partagés par `num`, `time`, `str.plural` et le logger |
| Essentiels | [`logger`](/essentials/logger/), [`fs`](/essentials/fs/), [`env`](/essentials/env/), [`is` et `assert`](/essentials/is/), [`errors`](/basics/errors/), [`json`](/essentials/json/) |
| Données | [`str`](/data/str/), [`num`](/data/num/), [`arr`](/data/arr/), [`obj`](/data/obj/), [`schema`](/data/schema/), [`time`](/data/time/), [`id`](/data/id/) |
| Fonctions et asynchrone | [`func`](/flow/func/), [`async`](/flow/async/), [`cache`](/flow/cache/), [`emitter`](/flow/emitter/) |
| Système et réseau | [`crypto`](/system/crypto/), [`http`](/system/http/), [`sqlite`](/system/sqlite/), [`sys`](/system/sys/), [`cli`](/system/cli/), [`color`](/system/color/) |

[Toutes les fonctions](/modules/) liste chaque membre sur une seule page. La [référence](/reference/) a une page pour chacun, avec sa signature, ses options et ses types.

## Mettre à jour

Depuis la 2.x, chaque ancien nom fonctionne toujours en 3.0 et prévient une fois : [Passer à la 3.0](/help/upgrade-3-0/). Depuis la 1.x : [Migrer depuis la 1.x](/help/migration/).
