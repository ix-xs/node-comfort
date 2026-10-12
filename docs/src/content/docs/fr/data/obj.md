---
title: "Objets"
description: "`nc.obj` copie, fusionne, compare et lit des objets imbriqués. Les entrées ne sont jamais modifiées, et les clés `__proto__`, `constructor` et `prototype` sont toujours ignorées : une saisie utilisateur ne peut donc pas polluer les prototypes."
sidebar:
  order: 4
---

```js
const { obj } = require("@ix-xs/node-comfort");

obj.get(config, "db.pool.max", 10);
obj.merge(defaults, userSettings);
obj.diff(before, after);
```

## Chemins pointés

`get`, `set`, `update`, `has` et `unset` prennent un chemin. En TypeScript et en JavaScript vérifié, votre éditeur complète les chemins et connaît le type obtenu au bout :

```ts
type User = { profile: { name: string; address?: { city: string } } };

obj.get(user, "profile.name");                 // string
obj.get(user, "profile.address.city");         // string | undefined
obj.get(user, "profile.address.city", "Paris"); // string
```

Les chemins peuvent aussi utiliser des crochets ou être des tableaux : `"items[0].name"`, `["items", 0, "name"]`.

`set`, `update` et `unset` renvoient une copie :

```js
const next = obj.set(state, "user.profile.name", "Ada"); // state reste inchangé
obj.set({}, "list[1].name", "x");                        // crée des tableaux pour les clés numériques
obj.unset(config, "db.password");
obj.unset({ list: ["a", "b", "c"] }, "list[1]");         // { list: ["a", "c"] }, aucun trou laissé
obj.has({ a: { b: undefined } }, "a.b");                 // true
```

`update` calcule la nouvelle valeur à partir de la valeur actuelle. La fonction reçoit `undefined` quand il n'y a encore rien, ce qu'un paramètre par défaut permet de couvrir :

```js
obj.update({ stats: { visits: 41 } }, "stats.visits", (n = 0) => n + 1); // { stats: { visits: 42 } }
obj.update({}, "stats.visits", (n = 0) => n + 1);                        // { stats: { visits: 1 } }
obj.update(cart, "items", (items = []) => [...items, product]);
```

## Fusionner

`merge` fusionne en profondeur des objets simples dans un nouvel objet. Les derniers objets l'emportent et les tableaux sont remplacés :

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
```

Le résultat ne partage rien avec ce que vous avez passé. Les objets imbriqués, les tableaux, les dates, les Map et les Set sont copiés. Modifier le résultat ne modifie donc jamais vos valeurs par défaut :

```js
const settings = obj.merge(defaults, userSettings);
settings.db.host = "db.internal"; // defaults.db.host vaut toujours "localhost"
```

Les instances de classe, comme une connexion à une base de données ou un logger, ne sont pas copiées : le résultat contient la même instance.

`mergeWith` vous laisse choisir ce qu'il advient des tableaux et de `undefined` :

```js
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] }); // tags: ["a", "b", "c"]
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });     // port: 80
```

`defaults` complète ce qui manque et garde toute valeur déjà définie, même `null` ou `0` :

```js
obj.defaults(userOptions, { retries: 3, timeout: 5000 });
```

## Comparer

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal(new Error("boom"), new Error("bang"));      // false
obj.equal(Buffer.from("ab"), Buffer.from("ab"));      // true

obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

`equal` comprend les dates, les expressions régulières, les Map, les Set, les tableaux typés, les buffers, les erreurs, les URL, `NaN` et les références circulaires. Elle compare ce qu'une valeur contient : le message d'une erreur, l'adresse d'une URL, les octets d'un buffer. Une instance de classe n'est jamais égale à un objet simple qui a les mêmes propriétés.

`diff` est pratique pour les journaux d'audit et les messages du type « qu'est-ce qui a changé ? ».

## Copier

```js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const original = { at: new Point(3, 4), raw: Buffer.from("hi"), onDone() {} };
const copy = obj.clone(original);

copy.at instanceof Point; // true, et c'est un nouveau Point
copy.raw[0] = 72;         // original.raw contient toujours "hi"
```

`clone` fait une copie profonde : objets simples, tableaux, dates, expressions régulières, Map, Set, URL, buffers et tableaux typés. Là où `structuredClone` lève une erreur sur une fonction et transforme une instance de classe en objet simple, `clone` garde les deux, et la copie d'une instance a la même classe. Les références partagées et les cycles sont préservés.

## Sélectionner et remodeler

```js
obj.pick(user, ["id", "email"]);
obj.omit(user, ["password", "token"]);
obj.filter(scores, (value) => value > 10);
obj.mapValues(prices, (price) => price * 1.2);
obj.mapKeys(row, (key) => nc.str.camelCase(key));
obj.renameKeys(doc, { _id: "id" });
obj.invert({ a: "x", b: "y" });           // { x: "a", y: "b" }
obj.compact(payload, { deep: true, removeEmpty: true });
obj.flatten({ db: { host: "x" } });       // { "db.host": "x" }
obj.unflatten({ "db.host": "x" });        // { db: { host: "x" } }
obj.paths({ db: { host: "x", port: 5432 } }); // ["db.host", "db.port"]
```

`sortKeys` renvoie une copie dont les clés sont triées, objets imbriqués compris :

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } });                  // { a: { c: 2, d: 1 }, b: 1 }
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }, { deep: false }); // { a: { d: 1, c: 2 }, b: 1 }
```

Deux objets de même contenu donnent alors le même JSON, quel que soit l'ordre dans lequel leurs clés ont été écrites. C'est ce qu'il faut pour un hash ou une clé de cache :

```js
const key = JSON.stringify(obj.sortKeys(query));
```

## Clés venant d'une saisie utilisateur

```js
const body = JSON.parse('{ "name": "Ada", "__proto__": { "admin": true } }');

obj.merge({}, body);                  // { name: "Ada" }
obj.set({}, "__proto__.admin", true); // {}
obj.get(user, "constructor.name");    // undefined
```

Toutes les fonctions ignorent les clés `__proto__`, `constructor` et `prototype`, dans les objets qu'elles copient comme dans les chemins qu'elles suivent. Un corps de requête ou un chemin fourni par un utilisateur ne peut pas atteindre un prototype.

## Fonctions typées

En TypeScript, `Object.keys` et `Object.entries` renvoient de simples chaînes. Celles-ci gardent les vraies clés :

```ts
for (const key of obj.keys(config)) config[key]; // pas d'erreur de type
for (const [key, value] of obj.entries(scores)) {}
```

Et pour les constantes qui ne doivent jamais changer :

```js
const CONFIG = obj.deepFreeze({ db: { host: "localhost" } });
```

La [référence de `nc.obj`](/reference/obj/) liste toutes les fonctions avec leurs options.
