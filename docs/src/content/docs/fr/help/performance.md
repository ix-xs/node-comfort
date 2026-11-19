---
title: "Performances"
description: "Ce que coûte la bibliothèque au démarrage et à chaque appel, et comment garder les deux bas."
---

## Démarrage

`require()` construit l'objet racine et s'arrête là. Chaque namespace se charge la première fois qu'il est lu, et les préparations coûteuses (`node:crypto`, objets `Intl`) attendent qu'une fonction en ait besoin.

| Scénario | Temps |
| --- | --- |
| `require()` du paquet | environ 12 ms |
| ... puis utiliser `nc.str` et `nc.is` | environ 20 ms au total |
| ... puis toucher les 25 namespaces | environ 65 ms au total |
| `import` de la racine depuis un module ES | environ 65 ms : tous les namespaces sont chargés |
| `import` d'un point d'entrée, comme `@ix-xs/node-comfort/str` | environ 13 ms |

Mesuré sur une machine Windows avec Node.js 26, médiane de 11 exécutions.

## Modules ES

Node.js lit chaque export nommé d'un paquet CommonJS quand un module ES l'importe, ce qui charge tous les namespaces. Dans un programme de courte durée (une CLI, une fonction serverless), importez les points d'entrée dont vous avez besoin :

```js
import { slugify } from "@ix-xs/node-comfort/str";
import { get } from "@ix-xs/node-comfort/obj";
```

## Par appel

Ce que JavaScript fait lentement est fait une fois et gardé : formateurs `Intl`, motifs de date compilés, durées lues, requêtes SQL préparées, une réserve d'octets aléatoires. Sur la même machine, un cœur :

| Opération | Par seconde |
| --- | --- |
| `nc.logger.info()` | 320 000 |
| `nc.logger.debug()` quand debug est désactivé | 100 millions |
| `nc.time.format()` avec noms de mois et de jours | 200 000 |
| `nc.time.parseDuration("5m")` | 32 millions |
| `nc.id.uuidv7()` | 1,9 million |
| `nc.str.slugify()` | 2,6 millions |
| `nc.num.format()` | 740 000 |
| `nc.obj.get()` avec un chemin pointé | 20 millions |
| `schema.parse()` sur un objet de cinq champs | 1,7 million |
| `emitter.emit()` | 24 millions |
| `db.get()` par clé primaire | 200 000 |
| `db.getAll()` de 200 lignes | 4 200 |

Ce sont des micro-benchmarks : ils disent ce que coûte la bibliothèque, pas à quelle vitesse va un programme. `node scripts/bench.js` dans le dépôt les mesure sur votre machine. Mesurez votre propre code avec `nc.time.stopwatch()` ou `nc.time.measure()`.

## Conseils

| Conseil | |
| --- | --- |
| Points d'entrée | En modules ES et dans les programmes de courte durée, importez `@ix-xs/node-comfort/<namespace>` |
| Cache de compilation | `NODE_COMPILE_CACHE=.cache`, ou `require("node:module").enableCompileCache()` dans le fichier d'entrée, accélère le démarrage de tous les modules |
| Réutiliser | Créez un client (`nc.http.create()`), un cache (`nc.cache.create()`) ou une base (`nc.sqlite.open()`) une fois et partagez-le |
| Écritures en masse | `db.insertMany()` écrit en une seule transaction, bien plus vite qu'une insertion à la fois |
| Logs | `nc.logger.isLevelEnabled("debug")` avant de construire un message de debug coûteux |
