---
title: "nc.arr"
description: "Utilitaires pour les tableaux. Aucun ne modifie ce que vous lui passez, et le type des éléments est conservé (`chunk(numbers, 2)` est un `number[][]`). Beaucoup acceptent un iteratee : un nom de propriété, que votre éditeur complète, ou une fonction."
sidebar:
  label: "arr"
  order: 9
---

```js
const { arr } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const arr = require("@ix-xs/node-comfort/arr");
```

Cette page liste tout ce que contient `nc.arr`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/arr/).

```js
arr.chunk([1, 2, 3, 4, 5], 2);          // [[1, 2], [3, 4], [5]]
arr.groupBy(users, "role");             // { admin: [...], user: [...] }
arr.sortBy(users, ["lastName", "age"]);
```

## chunk

```ts
chunk<T>(array: readonly T[], size: number): T[][]
```

Découpe un tableau en groupes de `size` éléments. Le dernier groupe peut être plus court.

```js
arr.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
arr.chunk(emails, 100).forEach(sendBatch);
```

## windows

```ts
windows<T>(array: readonly T[], size: number, step?: number): T[][]
```

Fenêtres glissantes de `size` éléments, décalées de `step`. Pratique pour les moyennes mobiles et la comparaison de voisins.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `size` | `number` |  |
| `step?` | `number` | Par défaut : `1`. |

```js
arr.windows([1, 2, 3, 4], 2);       // [[1, 2], [2, 3], [3, 4]]
arr.windows([1, 2, 3, 4, 5], 3, 2); // [[1, 2, 3], [3, 4, 5]]
```

## first

```ts
first<T>(array: readonly T[]): T | undefined
first<T>(array: readonly T[], n: number): T[]
```

Le premier élément, ou les `n` premiers éléments.

```js
arr.first([1, 2, 3]);    // 1
arr.first([1, 2, 3], 2); // [1, 2]
```

## last

```ts
last<T>(array: readonly T[]): T | undefined
last<T>(array: readonly T[], n: number): T[]
```

Le dernier élément, ou les `n` derniers éléments.

```js
arr.last([1, 2, 3]);    // 3
arr.last([1, 2, 3], 2); // [2, 3]
```

## paginate

```ts
paginate<T>(array: readonly T[], page?: number, perPage?: number): Page<T>
```

Une page d'un tableau, avec ce qu'il faut pour afficher des contrôles de pagination. Les pages commencent à 1 ; une page hors limites est ramenée dans l'intervalle.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `page?` | `number` | Par défaut : `1`. |
| `perPage?` | `number` | Par défaut : `20`. |

```js
arr.paginate(products, 2, 20);
// { items: [...], page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true }
```

## unique

```ts
unique<T>(array: readonly T[], iteratee?: Iteratee<T>): T[]
```

Retire les doublons. Avec un iteratee, les éléments qui donnent la même valeur sont des doublons ; le premier est conservé.

```js
arr.unique([1, 1, 2, 3]);                  // [1, 2, 3]
arr.unique(users, "email");                // un utilisateur par e-mail
arr.unique(tags, (t) => t.toLowerCase());
```

## groupBy

```ts
groupBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T[]>
```

Regroupe les éléments par clé.

```js
arr.groupBy(users, "role"); // { admin: [...], user: [...] }
arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even")); // { odd: [1, 3], even: [2, 4] }
```

## keyBy

```ts
keyBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T>
```

Indexe les éléments par clé. Si deux éléments partagent une clé, le dernier l'emporte.

```js
const byId = arr.keyBy(users, "id");
byId[42]; // user 42
```

## toMap

```ts
toMap<T, V = T>(array: readonly T[], key: Iteratee<T>, value?: ((item: T, index: number) => V) | undefined): Map<any, V>
```

Construit une `Map` à partir d'un tableau. Contrairement à `keyBy()`, les clés gardent leur type.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `key` | [`Iteratee`](#iteratee)`<``T``>` |  |
| `value?` | `(item: ``T``, index: number) => ``V` | La valeur à stocker. Par défaut : l'élément. |

```js
arr.toMap(users, "id");                 // Map<number, User>
arr.toMap(users, "id", (u) => u.name);  // Map<number, string>
```

## countBy

```ts
countBy<T>(array: readonly T[], iteratee?: Iteratee<T>): Record<string, number>
```

Compte les éléments par clé.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `iteratee?` | [`Iteratee`](#iteratee)`<``T``>` | Par défaut : l'élément lui-même. |

```js
arr.countBy(["a", "b", "a"]);  // { a: 2, b: 1 }
arr.countBy(users, "country"); // { FR: 12, US: 7 }
```

## count

```ts
count<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): number
```

Compte les éléments qui passent un test.

```js
arr.count(users, (u) => u.active);
```

## partition

```ts
partition<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): [T[], T[]]
```

Sépare les éléments entre ceux qui passent un test et ceux qui ne le passent pas.

```js
const [adults, minors] = arr.partition(people, (p) => p.age >= 18);
```

## pluck

```ts
pluck<T, K extends keyof T>(array: readonly T[], key: K): T[K][]
```

Extrait une propriété de chaque élément.

```js
arr.pluck(users, "email"); // ["ada@x.io", "bob@x.io"]
```

## sortBy

```ts
sortBy<T>(array: readonly T[], keys: SortKey<T> | SortKey<T>[], order?: "asc" | "desc" | SortByOptions): T[]
```

Trie selon une ou plusieurs clés, chacune avec son propre sens si vous le souhaitez. Le tri est stable et `null`/`undefined` vont toujours à la fin.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `keys` | [`SortKey`](#sortkey)`<``T``> \| ``Array``<`[`SortKey`](#sortkey)`<``T``>>` |  |
| `order?` | `"asc" \| "desc" \| `[`SortByOptions`](#sortbyoptions) | Par défaut : `"asc"`. |

```js
arr.sortBy(users, "age");                         // les plus jeunes d'abord
arr.sortBy(users, "age", "desc");                 // les plus âgés d'abord
arr.sortBy(users, [["age", "desc"], "lastName"]);
arr.sortBy(files, "name", { natural: true });     // "file2" avant "file10"
```

## shuffle

```ts
shuffle<T>(array: readonly T[]): T[]
```

Une copie mélangée (Fisher-Yates).

## sample

```ts
sample<T>(array: readonly T[]): T | undefined
```

Un élément au hasard, ou `undefined` si le tableau est vide.

## sampleSize

```ts
sampleSize<T>(array: readonly T[], n: number): T[]
```

`n` éléments au hasard, jamais deux fois le même.

```js
arr.sampleSize(players, 3);
```

## rotate

```ts
rotate<T>(array: readonly T[], n?: number): T[]
```

Fait tourner les éléments. Un `n` positif déplace les éléments du début vers la fin, un `n` négatif fait l'inverse.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `n?` | `number` | Par défaut : `1`. |

```js
arr.rotate([1, 2, 3, 4], 1);  // [2, 3, 4, 1]
arr.rotate([1, 2, 3, 4], -1); // [4, 1, 2, 3]
```

## move

```ts
move<T>(array: readonly T[], from: number, to: number): T[]
```

Déplace un élément vers une autre position. Les index négatifs comptent à partir de la fin.

```js
arr.move(["a", "b", "c"], 0, 2); // ["b", "c", "a"]
```

## swap

```ts
swap<T>(array: readonly T[], i: number, j: number): T[]
```

Échange deux éléments.

```js
arr.swap(["a", "b", "c"], 0, 2); // ["c", "b", "a"]
```

## difference

```ts
difference<T>(array: readonly T[], ...others: (readonly T[])[]): T[]
```

Les éléments de `array` qui n'apparaissent dans aucun des autres.

```js
arr.difference([1, 2, 3, 4], [2, 4]); // [1, 3]
```

## intersection

```ts
intersection<T>(...arrays: (readonly T[])[]): T[]
```

Les éléments présents dans tous les tableaux, sans doublons.

```js
arr.intersection([1, 2, 3], [2, 3, 4], [3, 2]); // [2, 3]
```

## union

```ts
union<T>(...arrays: (readonly T[])[]): T[]
```

Les éléments présents dans au moins un tableau, sans doublons.

```js
arr.union([1, 2], [2, 3], [3, 4]); // [1, 2, 3, 4]
```

## without

```ts
without<T>(array: readonly T[], ...values: T[]): T[]
```

Une copie sans les valeurs données. Fonctionne aussi avec `NaN`.

```js
arr.without([1, 2, 3, 2], 2); // [1, 3]
```

## remove

```ts
remove<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

Une copie sans les éléments qui passent le test.

```js
arr.remove([1, 2, 3, 4], (n) => n % 2 === 0); // [1, 3]
```

## compact

```ts
compact<T>(array: readonly T[]): Exclude<T, false | "" | 0 | 0n | null | undefined>[]
```

Retire les valeurs falsy (`false`, `null`, `undefined`, `0`, `""`, `NaN`).

```js
arr.compact([0, 1, false, 2, "", 3, null]); // [1, 2, 3]
```

## toggle

```ts
toggle<T>(array: readonly T[], item: T): T[]
```

Ajoute l'élément s'il est absent, le retire s'il est présent. Pratique pour un état de sélection multiple.

```js
arr.toggle(["a", "b"], "b"); // ["a"]
arr.toggle(["a"], "b");      // ["a", "b"]
```

## upsert

```ts
upsert<T>(array: readonly T[], item: T, identity: Iteratee<T>): T[]
```

Remplace l'élément de même identité, ou l'ajoute à la fin s'il n'y en a pas.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `item` | `T` |  |
| `identity` | [`Iteratee`](#iteratee)`<``T``>` | Ce qui fait que deux éléments sont « le même », comme `"id"`. |

```js
arr.upsert(users, { id: 2, name: "Bob" }, "id");
```

## insert

```ts
insert<T>(array: readonly T[], index: number, ...items: T[]): T[]
```

Insère des éléments à un index. Les index négatifs comptent à partir de la fin.

```js
arr.insert(["a", "d"], 1, "b", "c"); // ["a", "b", "c", "d"]
```

## flatten

```ts
flatten<T, D extends number = 1>(array: readonly T[], depth?: D): FlatArray<T[], D>[]
```

Aplatit les tableaux imbriqués, d'un niveau par défaut.

```js
arr.flatten([1, [2, [3, [4]]]]);           // [1, 2, [3, [4]]]
arr.flatten([1, [2, [3, [4]]]], Infinity); // [1, 2, 3, 4]
```

## zip

```ts
zip<T>(...arrays: (readonly T[])[]): (T | undefined)[][]
```

Associe les éléments par position. Les tableaux plus courts laissent des trous `undefined`.

```js
arr.zip(["a", "b"], [1, 2]); // [["a", 1], ["b", 2]]
```

## unzip

```ts
unzip<T>(tuples: readonly (readonly T[])[]): (T | undefined)[][]
```

L'inverse de `zip()` : les lignes deviennent des colonnes.

```js
arr.unzip([["a", 1], ["b", 2]]); // [["a", "b"], [1, 2]]
```

## interleave

```ts
interleave<T>(...arrays: (readonly T[])[]): T[]
```

Prend les éléments de chaque tableau à tour de rôle, puis ajoute le reste à la fin.

```js
arr.interleave([1, 3, 5], [2, 4]); // [1, 2, 3, 4, 5]
```

## cartesian

```ts
cartesian<T>(...arrays: (readonly T[])[]): T[][]
```

Toutes les combinaisons d'un élément de chaque tableau.

```js
arr.cartesian(["S", "M"], ["red", "blue"]);
// [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]
```

## times

```ts
times<T>(n: number, value?: T | ((index: number) => T) | undefined): T[]
```

Un tableau de `n` éléments, à partir d'une valeur ou d'une fonction de l'index.

```js
arr.times(3, "x");          // ["x", "x", "x"]
arr.times(3, (i) => i * 2); // [0, 2, 4]
```

## sumBy

```ts
sumBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

Additionne un nombre tiré de chaque élément. Ce qui n'est pas un nombre compte pour 0.

```js
arr.sumBy(cart, "price");
arr.sumBy(cart, (item) => item.price * item.quantity);
```

## averageBy

```ts
averageBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

La moyenne d'un nombre tiré de chaque élément, ou `0` pour un tableau vide.

```js
arr.averageBy(reviews, "rating"); // 4.3
```

## maxBy

```ts
maxBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

L'élément dont la valeur est la plus élevée.

```js
arr.maxBy(players, "score");
```

## minBy

```ts
minBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

L'élément dont la valeur est la plus basse.

```js
arr.minBy(products, "price");
```

## duplicates

```ts
duplicates<T>(array: readonly T[], iteratee?: Iteratee<T>): T[]
```

Les éléments qui apparaissent plus d'une fois, chacun listé une seule fois.

| Paramètre | Type | Description |
| --- | --- | --- |
| `array` | `readonly ``T``[]` |  |
| `iteratee?` | [`Iteratee`](#iteratee)`<``T``>` | Ce qui fait que deux éléments sont « le même ». Par défaut : l'élément lui-même. |

**Renvoie** `T``[]` : Pour chaque valeur répétée, sa deuxième occurrence.

```js
arr.duplicates([1, 2, 2, 3, 3, 3]); // [2, 3]
arr.duplicates(users, "email");      // les utilisateurs dont l'e-mail est déjà pris par un précédent
```

## xor

```ts
xor<T>(...arrays: (readonly T[])[]): T[]
```

Les éléments présents dans un seul des tableaux exactement, sans doublons.

```js
arr.xor([1, 2, 3], [2, 3, 4]); // [1, 4]
```

## takeWhile

```ts
takeWhile<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

Les éléments depuis le début, jusqu'au premier qui échoue au test.

```js
arr.takeWhile([1, 2, 5, 1], (n) => n < 3); // [1, 2]
```

## dropWhile

```ts
dropWhile<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

Ignore les éléments depuis le début tant qu'ils passent le test, et renvoie le reste.

```js
arr.dropWhile([1, 2, 5, 1], (n) => n < 3); // [5, 1]
```

## toSentence

```ts
toSentence(items: Iterable<unknown>, options?: ToSentenceOptions): string
```

Assemble les éléments comme dans une phrase, dans n'importe quelle langue.

```js
arr.toSentence(["Ada", "Bob", "Cy"]);                    // "Ada, Bob, and Cy"
arr.toSentence(["Ada", "Bob"], { locale: "fr" });        // "Ada et Bob"
arr.toSentence(["red", "blue"], { type: "disjunction" }); // "red or blue"
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { Iteratee } from "@ix-xs/node-comfort"`.

### Iteratee

Comment obtenir une valeur à partir d'un élément : un nom de propriété, ou une fonction `(item, index) => value`.

```ts
type Iteratee = (T extends object ? keyof T & (string | number) : never) | ((item: T, index: number) => unknown)
```

### Page

Une page renvoyée par `paginate()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `items` | `T``[]` | Les éléments de cette page. |
| `page` | `number` | Le numéro de la page, à partir de 1. |
| `perPage` | `number` |  |
| `total` | `number` | Nombre total d'éléments. |
| `pages` | `number` | Nombre de pages, au moins 1. |
| `hasPrev` | `boolean` |  |
| `hasNext` | `boolean` |  |

### SortByOptions

Options de `sortBy()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `order?` | `"asc" \| "desc"` | Sens des clés qui ne définissent pas le leur. Par défaut : `"asc"`. |
| `natural?` | `boolean` | Trie le texte comme le ferait une personne : ignore la casse, respecte les accents, `"item2"` avant `"item10"`. |
| `locale?` | `string` | Langue utilisée par `natural`. Par défaut : celle du système. |

### SortKey

Une clé de tri pour `sortBy()` : un iteratee, ou `[iteratee, "asc" | "desc"]` pour donner à cette clé son propre sens.

```ts
type SortKey = Iteratee<T> | [Iteratee<T>, "asc" | "desc"]
```

### ToSentenceOptions

Options de `toSentence()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue du mot de liaison. Par défaut : `"en"`. |
| `type?` | `"conjunction" \| "disjunction" \| "unit"` | `"conjunction"` relie avec « et », `"disjunction"` avec « ou », `"unit"` avec des virgules seulement. Par défaut : `"conjunction"`. |
| `style?` | `"long" \| "short" \| "narrow"` | Par défaut : `"long"`. |
