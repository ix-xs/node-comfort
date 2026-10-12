---
title: "Migrer depuis la 1.x"
description: "La version 2 conserve l'API de la 1.x : les utilitaires de premier niveau, les fonctions `fs` et les méthodes SQLite sont toujours là. Quelques comportements ont changé, et cette page les liste avec ce qu'il faut faire."
sidebar:
  order: 5
---

La plupart des projets n'ont besoin que des trois premières sections.

## Node.js 22.13 ou plus récent

Node 20 est en fin de vie, et la 1.x avait déjà besoin de `node:sqlite`, qui ne fonctionne sans option que depuis Node 22.13.

## SQLite lève une erreur au lieu de renvoyer `{ error }`

```js
// 1.x
const result = await db.insert("users", data);
if (result.error) console.error(result.error);

// 2.0
try {
  db.insert("users", data);
} catch (error) {
  if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") console.error("Email already used");
}
```

Autres changements côté SQLite :

- **Les méthodes sont synchrones.** Elles renvoient directement leurs valeurs. `await` fonctionne toujours, mais retirez tout `.then()` appliqué à leurs résultats.
- **`getAll()` ne limite plus à 50 lignes et ne trie plus par défaut.** Ajoutez `{ limit: 50 }` et `{ orderBy: "id", direction: "DESC" }` là où vous comptiez dessus. Avec `orderBy` et sans `direction`, l'ordre est maintenant croissant.
- **Les tables sont lues dans le fichier de la base de données.** En 1.x, seules les tables créées avec `createTable()` dans le même processus étaient visibles. Désormais, toute table du fichier fonctionne, et une table inconnue lève une erreur.
- **Les colonnes `BOOLEAN` et `JSON` sont converties.** Vous obtenez `true`/`false` au lieu de `1`/`0`, et des objets déjà analysés au lieu de texte JSON. L'écriture de booléens, d'objets et de dates fonctionne aussi désormais. Pour garder l'ancien comportement : `new nc.SQLite(path, { booleans: false, json: false })`.
- **`transaction()` lève l'erreur** après avoir annulé la transaction, au lieu de renvoyer `{ error }`.

## Fin des imports profonds

Le paquet déclare maintenant ses points d'entrée. Remplacez les imports de fichiers internes :

```js
// 1.x
const Logger = require("@ix-xs/node-comfort/src/Logger");
// 2.0
const { logger } = require("@ix-xs/node-comfort");
// ou, pour ne charger que le logger
const logger = require("@ix-xs/node-comfort/logger");
```

## Les logs

- **`warn`, `error` et `fatal` partent sur stderr**, comme `console.warn` et `console.error`. Si vous capturez la sortie de votre application, capturez aussi stderr.
- **Les couleurs se désactivent hors d'un terminal** et avec `NO_COLOR`. Utilisez `FORCE_COLOR=1` pour les garder.
- **Dans le balisage, `overline` trace une ligne au-dessus du texte.** Avant, il le barrait ; utilisez `strikethrough` pour cela.

## Les fichiers

Quand un chemin relatif n'existait pas, la 1.x cherchait dans l'arborescence des dossiers un fichier du même nom. Elle pouvait ainsi lire, écraser ou supprimer le mauvais fichier : ce comportement a donc disparu. Pour chercher volontairement, utilisez `nc.find("config.json")`.

## Changements mineurs

- **`func.timeout()` rejette avec une `TimeoutError`.** C'est toujours une `Error` avec le même message.
- **`num.round()` arrondit les demis négatifs en s'éloignant de zéro :** `-2.5` donne `-3`, comme c'était déjà le cas pour les nombres positifs. Les décimales sont aussi exactes désormais : `round(1.005, 2)` vaut `1.01`.
- **`str.length()`, `reverse()`, `truncate()` et `center()` comptent les caractères tels que vous les voyez**, si bien qu'un emoji compte pour un.
- **`dontCrash()` ne retire que ses propres écouteurs.** La 1.x retirait aussi les écouteurs ajoutés par le reste du code.
- **Les validateurs sont plus rigoureux.** `isEmail()` rejette les points mal placés, `isUUID()` accepte les versions 1 à 8 et `isURL()` prend des options.
- **`JSONString()` transforme les Map en objets et les Set en tableaux**, et seuls les vrais cycles deviennent `"[Circular]"`.

## Fonctions dépréciées

`id.hash()`, `id.hmac()` et `id.safeEqual()` ont été déplacées dans `nc.crypto`, avec les mêmes signatures. Les anciens noms fonctionnent encore et seront supprimés en 3.0.

## Correctif de sécurité

Dans la 1.2.0, `obj.set()` et `obj.unflatten()` pouvaient modifier `Object.prototype` quand on leur passait un chemin comme `"__proto__.isAdmin"`. Si vous passez à ces fonctions des chemins ou des objets contrôlés par l'utilisateur, mettez à jour.

## De la 2.0 à la 2.1

Rien à changer dans un projet qui utilisait la 2.0 comme le décrit la documentation. Quelques comportements ont été corrigés, et vous comptiez peut-être sur les anciens :

- **`DEBUG=name` n'affiche que les logs de debug de cette portée.** Avant, il les affichait tous. Utilisez `DEBUG=1` ou `LOG_LEVEL=debug` pour tout voir.
- **Les calculs de dates suivent `time.setTimezone()`.** `startOf()`, `endOf()`, `add()` et `diff()` utilisaient le fuseau de la machine. `time.add(date, "soon")` lève maintenant une erreur au lieu de ne rien ajouter.
- **`crypto.decrypt()` échoue toujours de la même façon :** une `NodeComfortError` avec le code `ERR_DECRYPT`. Avant, une entrée mal formée levait une `TypeError`.
- **Quitter un menu ou une saisie de mot de passe rejette avec une `AbortError`.** Testez `error.name === "AbortError"` plutôt que le message.
- **Un appel `http` complète les paramètres de requête et les en-têtes de son client.** Avant, il les remplaçait.
- **`env.load()` donne la priorité au premier fichier** qui définit une variable. `override` décide seulement si les fichiers peuvent remplacer ce que l'environnement contenait déjà.
- **Une valeur par défaut `CURRENT_TIMESTAMP` dans `createTable()` correspond à l'heure de l'insertion.** Avant, c'est ce texte qui était stocké.
- **`num.min()` et `num.max()` renvoient `NaN`** quand l'une des valeurs est `NaN`, et **`isEmpty()` vaut `false`** pour une `Date`, une `RegExp` et une `Error`.

Le [journal des modifications](https://github.com/ix-xs/node-comfort/blob/main/CHANGELOG.md) contient la liste complète.
