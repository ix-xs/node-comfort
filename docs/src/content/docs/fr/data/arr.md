---
title: "Tableaux"
description: "`nc.arr` regroupe, trie, découpe et combine des tableaux. Chaque fonction renvoie un nouveau tableau sans toucher au vôtre, et le type des éléments est conservé : `arr.chunk(numbers, 2)` est un `number[][]`."
sidebar:
  order: 3
---

```js
const { arr } = require("@ix-xs/node-comfort");

arr.chunk([1, 2, 3, 4, 5], 2);           // [[1, 2], [3, 4], [5]]
arr.groupBy(users, "role");              // { admin: [...], user: [...] }
arr.sortBy(users, [["age", "desc"], "name"]);
```

## Iteratees

De nombreuses fonctions acceptent un « iteratee » : soit un nom de propriété, que votre éditeur complète, soit une fonction de l'élément.

```js
arr.unique(users, "email");
arr.unique(tags, (tag) => tag.toLowerCase());
arr.sumBy(cart, (line) => line.price * line.quantity);
```

## Regrouper et indexer

```js
arr.groupBy(orders, "status");          // { paid: [...], pending: [...] }
arr.keyBy(users, "id");                 // { 1: user1, 2: user2 }
arr.toMap(users, "id");                 // Map<number, User>, les clés gardent leur type
arr.countBy(users, "country");          // { FR: 12, US: 7 }
arr.partition(people, (p) => p.age >= 18); // [adults, minors]
arr.pluck(users, "email");              // ["ada@x.io", "bob@x.io"]
```

Les clés viennent de vos données. N'importe quel texte est donc une clé valide, y compris les noms que tout objet possède déjà :

```js
arr.countBy(["constructor", "toString", "constructor"]); // { constructor: 2, toString: 1 }
```

## Doublons

```js
arr.unique([1, 1, 2, 3]);           // [1, 2, 3]
arr.unique(users, "email");         // un utilisateur par e-mail, le premier est gardé
arr.duplicates([1, 2, 2, 3, 3, 3]); // [2, 3]
arr.duplicates(users, "email");     // un utilisateur pour chaque e-mail utilisé plus d'une fois
```

`duplicates` liste une seule fois chaque valeur répétée, quel que soit le nombre de copies : l'élément que vous obtenez est sa deuxième occurrence.

## Trier

`sortBy` trie selon une ou plusieurs clés. Le tri est stable, et `null`/`undefined` passent toujours en dernier :

```js
arr.sortBy(users, "age");                       // les plus jeunes d'abord
arr.sortBy(users, "age", "desc");               // les plus âgés d'abord
arr.sortBy(users, [["age", "desc"], "lastName"]); // chaque clé a son propre sens
arr.sortBy(files, "name", { natural: true });   // "file2" avant "file10", accents respectés
```

La clé de chaque élément est calculée une seule fois, et non à chaque comparaison : un iteratee qui fait un vrai travail (analyser une date, mesurer une distance) reste donc peu coûteux.

## Pagination

```js
const page = arr.paginate(products, 2, 20);
// { items: [...], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

Une page hors limites est ramenée dans les limites : `page` est donc toujours valide.

## Découper

```js
arr.chunk(emails, 100).forEach(sendBatch);
arr.windows([1, 2, 3, 4], 2);   // [[1, 2], [2, 3], [3, 4]]
arr.first(list, 3);
arr.last(list);
```

`takeWhile` et `dropWhile` coupent au premier élément qui échoue à un test :

```js
arr.takeWhile([1, 2, 5, 1], (n) => n < 3); // [1, 2]
arr.dropWhile([1, 2, 5, 1], (n) => n < 3); // [5, 1]
```

## Ensembles

```js
arr.difference([1, 2, 3, 4], [2, 4]);         // [1, 3]
arr.intersection([1, 2, 3], [2, 3, 4]);       // [2, 3]
arr.union([1, 2], [2, 3]);                    // [1, 2, 3]
arr.xor([1, 2, 3], [2, 3, 4]);                // [1, 4], ce qu'un seul des tableaux contient
arr.without([1, 2, 3, 2], 2);                 // [1, 3]
```

## Modifier sans muter

```js
arr.insert(["a", "d"], 1, "b", "c");          // ["a", "b", "c", "d"]
arr.move(["a", "b", "c"], 0, 2);              // ["b", "c", "a"]
arr.swap(list, 0, 2);
arr.toggle(selected, id);                     // l'ajoute, ou le retire s'il y est
arr.upsert(users, { id: 2, name: "Bob" }, "id"); // remplace l'utilisateur 2, ou l'ajoute à la fin
arr.remove(list, (n) => n % 2 === 0);
arr.compact([0, 1, false, "", null, 2]);      // [1, 2]
```

## Combiner

```js
arr.zip(["a", "b"], [1, 2]);                  // [["a", 1], ["b", 2]]
arr.cartesian(["S", "M"], ["red", "blue"]);   // toutes les paires taille et couleur
arr.interleave([1, 3, 5], [2, 4]);            // [1, 2, 3, 4, 5]
arr.flatten([1, [2, [3]]], Infinity);         // [1, 2, 3]
arr.times(3, (i) => i * 2);                   // [0, 2, 4]
```

## Des listes dans une phrase

```js
arr.toSentence(["Ada", "Bob", "Cy"]);                     // "Ada, Bob, and Cy"
arr.toSentence(["Ada", "Bob", "Cy"], { locale: "fr" });   // "Ada, Bob et Cy"
arr.toSentence(["red", "blue"], { type: "disjunction" }); // "red or blue"
```

`toSentence` assemble les éléments avec les mots et la ponctuation de la langue, grâce à `Intl.ListFormat`. Elle parle anglais, sauf si vous passez une `locale`.

## Agrégats et hasard

```js
arr.sumBy(orders, "total");
arr.averageBy(reviews, "rating");
arr.maxBy(players, "score");
arr.minBy(products, "price");
arr.shuffle(deck);
arr.sample(deck);
arr.sampleSize(players, 3);
```

`sumBy` additionne comme le fait [`num.sum()`](/data/num/) : trois commandes de `0.1`, `0.2` et `0.3` totalisent `0.6`, et non `0.6000000000000001`.

`shuffle` et `sample` utilisent `Math.random`. Pour des tirages qui doivent être équitables et imprévisibles, utilisez [`crypto.randomInt()`](/system/crypto/).

La [référence de `nc.arr`](/reference/arr/) liste toutes les fonctions avec leurs options.
