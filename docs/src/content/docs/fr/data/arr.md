---
title: "Tableaux"
description: "`nc.arr` : regrouper, trier, découper, comparer et combiner des tableaux. Chaque fonction renvoie un nouveau tableau et conserve le type des éléments : `arr.chunk(numbers, 2)` est un `number[][]`."
---

```js
const { arr } = require("@ix-xs/node-comfort");
```

Les exemples utilisent cette liste :

```js
const users = [
  { id: 1, name: "Ada", role: "admin", age: 36, active: true, email: "ada@x.io" },
  { id: 2, name: "Bob", role: "user", age: 25, active: false, email: "bob@x.io" },
  { id: 3, name: "Cy", role: "user", age: 36, active: true, email: "ada@x.io" },
];
```

## Itérateurs

Là où une fonction prend un itérateur, passez un nom de propriété (complété par l'éditeur) ou une fonction de l'élément. Un test (`count`, `partition`, `remove`, `takeWhile`, `dropWhile`) qui reçoit un nom de propriété vérifie que sa valeur est vraie.

```js
arr.unique(users, "email");                      // Ada et Bob
arr.unique(["a", "A", "b"], (s) => s.toLowerCase()); // ["a", "b"]
arr.count(users, "active");                      // 2
arr.count(users, (user) => user.age > 30);       // 2
```

## Regrouper et indexer

```js
arr.groupBy(users, "role");                  // { admin: [Ada], user: [Bob, Cy] }
arr.keyBy(users, "id");                      // { 1: Ada, 2: Bob, 3: Cy }
arr.toMap(users, "id", (user) => user.name); // Map { 1 => "Ada", 2 => "Bob", 3 => "Cy" }
arr.countBy(users, "role");                  // { admin: 1, user: 2 }
arr.partition(users, "active");              // [[Ada, Cy], [Bob]]
arr.pluck(users, "name");                    // ["Ada", "Bob", "Cy"]
```

| Fonction | Renvoie |
| --- | --- |
| `groupBy(array, iteratee)` | Un objet de tableaux, par clé |
| `keyBy(array, iteratee)` | Un objet d'éléments, le dernier l'emporte pour une même clé |
| `toMap(array, key, value?)` | Une `Map` ; les clés gardent leur type |
| `countBy(array, iteratee?)` | Un objet de comptes. Sans itérateur, compte les éléments eux-mêmes |
| `count(array, test)` | Un nombre |
| `partition(array, test)` | `[réussis, échoués]` |
| `pluck(array, key)` | Les valeurs d'une propriété |

Les clés viennent de vos données : `arr.countBy(["constructor", "toString", "constructor"])` donne `{ constructor: 2, toString: 1 }`.

## Doublons

```js
arr.unique([1, 1, 2, 3]);           // [1, 2, 3]
arr.duplicates([1, 2, 2, 3, 3, 3]); // [2, 3]
arr.duplicates(users, "email");     // [Cy]
```

`unique` garde le premier élément de chaque valeur. `duplicates` liste chaque valeur répétée une seule fois, sous la forme de sa deuxième occurrence.

## Trier

```js
arr.sortBy(users, "age");                                  // Bob, Ada, Cy
arr.sortBy(users, "age", "desc");                          // Ada, Cy, Bob
arr.sortBy(users, [["age", "desc"], "name"]);              // Ada, Cy, Bob
arr.sortBy(["file10", "file2", "File1"], (f) => f, { natural: true }); // ["File1", "file2", "file10"]
```

Le tri est stable, `null` et `undefined` passent en dernier, et la clé de chaque élément n'est calculée qu'une fois.

| Option de `sortBy` | Défaut | |
| --- | --- | --- |
| `order` | `"asc"` | Pour les clés qui n'ont pas leur propre sens. Une chaîne en troisième argument revient au même |
| `natural` | `false` | Ignore la casse, respecte les accents, `"item2"` avant `"item10"` |
| `locale` | celle du système | Langue utilisée par `natural` |

## Pagination

```js
arr.paginate(products, 2, 20);
arr.paginate(products, { page: 2, perPage: 20 });
// { items: [20 éléments], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

`page` commence à 1 (par défaut), `perPage` vaut 20 par défaut. Une page hors limites est ramenée dans les limites.

## Découper

```js
arr.chunk([1, 2, 3, 4, 5], 2);             // [[1, 2], [3, 4], [5]]
arr.windows([1, 2, 3, 4], 2);              // [[1, 2], [2, 3], [3, 4]]
arr.windows([1, 2, 3, 4, 5], 2, 2);        // [[1, 2], [3, 4]]
arr.first([1, 2, 3, 4], 2);                // [1, 2]
arr.last([1, 2, 3]);                       // 3
arr.takeWhile([1, 2, 5, 1], (n) => n < 3); // [1, 2]
arr.dropWhile([1, 2, 5, 1], (n) => n < 3); // [5, 1]
```

`first` et `last` renvoient un élément sans nombre, un tableau avec un nombre.

## Ensembles

```js
arr.difference([1, 2, 3, 4], [2, 4]);   // [1, 3]
arr.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
arr.union([1, 2], [2, 3]);              // [1, 2, 3]
arr.xor([1, 2, 3], [2, 3, 4]);          // [1, 4]
arr.without([1, 2, 3, 2], 2);           // [1, 3]
```

## Modifier

Ces fonctions renvoient une copie et laissent le tableau intact :

```js
arr.insert(["a", "d"], 1, "b", "c");                // ["a", "b", "c", "d"]
arr.move(["a", "b", "c"], 0, 2);                    // ["b", "c", "a"]
arr.swap(["a", "b", "c"], 0, 2);                    // ["c", "b", "a"]
arr.rotate([1, 2, 3, 4], 1);                        // [2, 3, 4, 1]
arr.toggle([1, 2, 3], 2);                           // [1, 3]
arr.upsert(users, { id: 2, name: "Bo" }, "id");     // Bob remplacé par { id: 2, name: "Bo" }
arr.remove([1, 2, 3, 4], (n) => n % 2 === 0);       // [1, 3]
arr.compact([0, 1, false, "", null, 2, undefined]); // [1, 2]
```

| Fonction | Rôle |
| --- | --- |
| `insert(array, index, ...items)` | Insère à `index` |
| `move(array, from, to)`, `swap(array, i, j)` | Déplace un élément, en échange deux |
| `rotate(array, n = 1)` | Décale de `n` vers la gauche ; négatif, vers la droite |
| `toggle(array, item)` | Retire l'élément s'il est présent, l'ajoute à la fin sinon |
| `upsert(array, item, identity)` | Remplace l'élément de même `identity` (`"id"`), ou l'ajoute à la fin |
| `remove(array, test)` | Garde les éléments qui échouent au test |
| `compact(array)` | Retire toutes les valeurs fausses. `nc.obj.compact()` ne retire que `null` et `undefined` |

## Combiner

```js
arr.zip(["a", "b"], [1, 2]);                // [["a", 1], ["b", 2]]
arr.unzip([["a", 1], ["b", 2]]);            // [["a", "b"], [1, 2]]
arr.cartesian(["S", "M"], ["red", "blue"]); // [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]
arr.interleave([1, 3, 5], [2, 4]);          // [1, 2, 3, 4, 5]
arr.flatten([1, [2, [3]]]);                 // [1, 2, [3]]
arr.flatten([1, [2, [3]]], Infinity);       // [1, 2, 3]
arr.times(3, (i) => i * 2);                 // [0, 2, 4]
arr.times(3, "x");                          // ["x", "x", "x"]
```

## Agrégats et tirages

```js
arr.sumBy([{ total: 0.1 }, { total: 0.2 }, { total: 0.3 }], "total"); // 0.6
arr.averageBy(users, "age");                                         // 32.333333333333336
arr.maxBy(users, "age");                                             // Ada, la première des plus âgées
arr.minBy(users, "age");                                             // Bob
arr.sample(users);                                                   // un utilisateur
arr.sampleSize(users, 2);                                            // deux utilisateurs différents
arr.shuffle(users);                                                  // une copie mélangée
```

`sumBy` additionne comme `nc.num.sum()`, sans la dérive d'une simple boucle. `maxBy` et `minBy` renvoient `undefined` pour un tableau vide. `shuffle`, `sample` et `sampleSize` utilisent `Math.random` : pour un tirage équitable, utilisez `nc.crypto.randomInt()`.

## Listes en phrase

```js
arr.toSentence(["Ada", "Bob", "Cy"]);                     // "Ada, Bob, and Cy"
arr.toSentence(["Ada", "Bob", "Cy"], { locale: "fr" });   // "Ada, Bob et Cy"
arr.toSentence(["red", "blue"], { type: "disjunction" }); // "red or blue"
```

`toSentence` utilise `Intl.ListFormat`. La langue est `nc.config.get().locale`, sauf si `locale` est passé ([Configuration](/start/configuration/)).

| Option | Défaut | |
| --- | --- | --- |
| `locale` | `nc.config.get().locale` | |
| `type` | `"conjunction"` | `"disjunction"` relie avec « or », `"unit"` avec des virgules seulement |
| `style` | `"long"` | `"short"`, `"narrow"` |
