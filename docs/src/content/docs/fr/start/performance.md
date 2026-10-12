---
title: "Performances"
description: "Une bibliothèque qui regroupe beaucoup d'outils ne devrait pas ralentir le démarrage de votre programme. node-comfort ne charge presque rien tant que vous ne vous en servez pas."
sidebar:
  order: 4
---

## Le chargement différé

`require("@ix-xs/node-comfort")` crée l'objet `nc` et s'arrête là. Chaque espace de noms est chargé la première fois que vous y touchez, pas avant. Les initialisations coûteuses, comme `node:crypto` ou les objets `Intl` utilisés pour la segmentation du texte, sont elles aussi repoussées jusqu'à ce qu'une fonction en ait besoin.

Mesures prises sur une machine Windows avec Node.js 24 (médiane de 15 exécutions) :

| Scénario | Temps |
| --- | --- |
| `require()` du paquet | environ 4 ms |
| ... puis utilisation de `nc.str` et de `nc.isEmail` | environ 13 ms au total |
| ... puis accès aux 23 espaces de noms | environ 43 ms au total |

Vous ne payez que ce que vous utilisez. Un script qui se contente d'écrire des logs et de lire un fichier JSON ne charge jamais le code de SQLite, de HTTP ou de crypto.

## Ce qui va vite

Les fonctions qu'un programme appelle des milliers de fois par seconde sont écrites pour cela. Ce que JavaScript a de lent est fait une fois puis conservé : les formateurs `Intl`, les motifs de date compilés, les durées déjà lues, les requêtes SQL préparées, une réserve d'octets aléatoires. Sur la même machine, sur un seul cœur :

| Opération | Par seconde |
| --- | --- |
| `nc.info()` vers un terminal | 2,9 millions |
| `nc.debug()` quand le niveau debug est coupé | plus de 100 millions |
| `time.format()` avec les noms de mois et de jours | 280 000 |
| `time.parseDuration("5m")` | 90 millions |
| `id.uuidv7()` | 7 millions |
| `id.nano()` | 5,8 millions |
| `str.slugify()` | 3,4 millions |
| `num.format()` | 1,3 millions |
| `obj.get()` avec un chemin pointé | 24 millions |
| `schema.parse()` sur un objet de cinq champs | 1,6 millions |
| `emitter.emit()` vers deux écouteurs | 35 à 60 millions |
| `db.get()` par clé primaire | 460 000 |
| `db.getAll()` de 200 lignes | 7 400 |

Par rapport à la 2.0, le logger est environ cent fois plus rapide, les dates avec des noms trente fois, les identifiants dix à quarante fois et les lectures SQLite trois à quatre fois. Le [journal des modifications](https://github.com/ix-xs/node-comfort/blob/main/CHANGELOG.md) en donne la liste.

Ce sont des micro-mesures : elles disent ce que coûte la bibliothèque, pas la vitesse de votre programme. Mesurez votre propre code avec `time.stopwatch()` ou `time.measure()` avant de l'optimiser.

## Les modules ES

Quand vous faites un `import` du paquet racine depuis un module ES, Node.js doit lire d'emblée tous les exports nommés, ce qui charge tous les espaces de noms (environ 45 ms). Pour garder un démarrage léger dans les modules ES, importez les espaces de noms dont vous avez besoin depuis leur propre point d'entrée :

```js
import { slugify } from "@ix-xs/node-comfort/str";
import { get } from "@ix-xs/node-comfort/obj";
```

Chaque point d'entrée ne charge que son propre module et les quelques modules dont il dépend.

## Conseils

- **Importez directement les espaces de noms dans les chemins critiques des scripts à courte durée de vie** (CLI, fonctions serverless), là où le temps de démarrage compte le plus.
- **Activez le cache de compilation de Node dans votre application** pour accélérer tous les démarrages : définissez `NODE_COMPILE_CACHE=.cache`, ou appelez `require("node:module").enableCompileCache()` en tête de votre fichier d'entrée. Tous les modules en profitent, pas seulement celui-ci.
- **Réutilisez les clients et les caches.** `nc.http.create()` et `new nc.Cache()` coûtent peu, mais les créer une seule fois et les partager évite de refaire le même travail.
- **Utilisez `db.insertMany()`** pour les insertions en masse : une seule transaction est bien plus rapide que des milliers de transactions séparées.
