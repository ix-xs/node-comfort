---
title: "Objets"
description: "`nc.obj` : chemins pointés, clonage, fusion et comparaison en profondeur, remodelage. Les entrées ne sont jamais modifiées, et `__proto__`, `constructor` et `prototype` sont toujours ignorés."
---

```js
const { obj } = require("@ix-xs/node-comfort");
```

## Chemins pointés

```js
const config = { db: { pool: { max: 5 } }, items: [{ name: "a" }] };

obj.get(config, "db.pool.max", 10);      // 5
obj.get(config, "db.pool.min", 1);       // 1
obj.get(config, "items[0].name");        // "a"
obj.get(config, ["items", 0, "name"]);   // "a"
obj.has({ a: { b: undefined } }, "a.b"); // true
```

`set`, `update` et `unset` renvoient une copie :

```js
obj.set(config, "db.pool.max", 10);                                      // config est inchangé
obj.set({}, "list[1].name", "x");                                        // { list: [<vide>, { name: "x" }] }
obj.unset({ list: ["a", "b", "c"] }, "list[1]");                         // { list: ["a", "c"] }
obj.update({ stats: { visits: 41 } }, "stats.visits", (n = 0) => n + 1); // { stats: { visits: 42 } }
obj.update({}, "stats.visits", (n = 0) => n + 1);                        // { stats: { visits: 1 } }
```

| Fonction | Rôle |
| --- | --- |
| `get(object, path, fallback?)` | La valeur, ou `fallback` quand elle vaut `undefined` |
| `has(object, path)` | `true` quand le chemin existe, même s'il contient `undefined` |
| `set(object, path, value)` | Crée ce qui manque : des tableaux pour les clés numériques, des objets sinon |
| `update(object, path, fn)` | `fn` reçoit la valeur actuelle, `undefined` s'il n'y en a pas |
| `unset(object, path)` | Retire une clé ; dans un tableau, ne laisse pas de trou |

Un chemin s'écrit `"a.b.c"`, `"a[0].b"` ou `["a", 0, "b"]`. En TypeScript et en JavaScript vérifié, l'éditeur complète les chemins et type le résultat :

```ts
type User = { profile: { name: string; address?: { city: string } } };

obj.get(user, "profile.name");                  // string
obj.get(user, "profile.address.city");          // string | undefined
obj.get(user, "profile.address.city", "Paris"); // string
```

## Fusionner

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] }); // { tags: ["a", "b", "c"] }
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });     // { port: 80 }
obj.defaults({ retries: 0, timeout: null }, { retries: 3, timeout: 5000, debug: false });
// { retries: 0, timeout: null, debug: false }
```

`merge` fusionne en profondeur des objets simples dans un nouvel objet : les dernières sources l'emportent, les tableaux sont remplacés. Le résultat ne partage rien avec les sources (objets imbriqués, tableaux, dates, maps et sets sont copiés) ; les instances de classes sont gardées telles quelles.

| Fonction | Rôle |
| --- | --- |
| `merge(...sources)` | Fusion en profondeur, la dernière source l'emporte |
| `mergeWith(options, ...sources)` | `arrays` : `"replace"` (défaut), `"concat"`, `"unique"` ; `skipUndefined` |
| `defaults(target, ...sources)` | Ne remplit que ce qui vaut `undefined` ; la première source a la priorité |

## Comparer

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal(new Error("boom"), new Error("bang"));      // false
obj.equal(NaN, NaN);                                  // true

obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

`equal` compare les dates, les expressions régulières, les maps, les sets, les tableaux typés, les buffers, les erreurs (par leur message), les URL et les structures circulaires. Une instance de classe n'est jamais égale à un objet simple. `diff` renvoie des entrées `{ path, type: "added" | "removed" | "changed", from?, to? }`.

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

copy.at instanceof Point; // true, un nouveau Point
copy.raw[0] = 72;         // original.raw contient toujours "hi"
```

`clone` copie les objets simples, les tableaux, les dates, les expressions régulières, les maps, les sets, les URL, les buffers et les tableaux typés. Contrairement à `structuredClone`, il garde les fonctions et la classe des instances. Les références partagées et les cycles sont préservés.

`deepFreeze(object)` gèle un objet et tout ce qu'il contient.

## Choisir et remodeler

```js
const user = { id: 1, email: "a@x.io", password: "p", token: "t" };

obj.pick(user, ["id", "email"]);                                       // { id: 1, email: "a@x.io" }
obj.omit(user, ["password", "token"]);                                 // { id: 1, email: "a@x.io" }
obj.filter({ a: 5, b: 20, c: 12 }, (value) => value > 10);             // { b: 20, c: 12 }
obj.mapValues({ tea: 2, cake: 4 }, (price) => price * 1.5);            // { tea: 3, cake: 6 }
obj.mapKeys({ first_name: "Ada" }, (key) => key.toUpperCase());        // { FIRST_NAME: "Ada" }
obj.renameKeys({ _id: 7, name: "x" }, { _id: "id" });                  // { id: 7, name: "x" }
obj.invert({ a: "x", b: "y" });                                        // { x: "a", y: "b" }
obj.compact({ a: 0, b: null, c: "", d: undefined });                   // { a: 0, c: "" }
obj.compact({ a: { b: null, c: "" }, d: [], e: 1 }, { deep: true, removeEmpty: true }); // { e: 1 }
```

| Fonction | Fonction de rappel |
| --- | --- |
| `filter(object, fn)` | `(value, key)` |
| `mapValues(object, fn)` | `(value, key)` |
| `mapKeys(object, fn)` | `(key, value)`, renvoie la nouvelle clé |

`compact` ne retire que `null` et `undefined` ; `removeEmpty` retire aussi `""`, `[]` et `{}`, `deep` nettoie les objets et tableaux imbriqués. `nc.arr.compact()` retire toutes les valeurs fausses.

## Clés à plat

```js
obj.flatten({ db: { host: "x", ports: [1, 2] } }); // { "db.host": "x", "db.ports": [1, 2] }
obj.flatten({ db: { host: "x" } }, "app");         // { "app.db.host": "x" }
obj.unflatten({ "db.host": "x" });                 // { db: { host: "x" } }
obj.paths({ db: { host: "x", port: 5432 } });      // ["db.host", "db.port"]
```

`flatten` garde les tableaux comme valeurs.

## Trier les clés

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } });                  // { a: { c: 2, d: 1 }, b: 1 }
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }, { deep: false }); // { a: { d: 1, c: 2 }, b: 1 }

const key = JSON.stringify(obj.sortKeys(query)); // le même JSON quel que soit l'ordre des clés : une clé de cache
```

| Option | Défaut | |
| --- | --- | --- |
| `deep` | `true` | Les objets et tableaux imbriqués aussi. Avec `false`, les valeurs imbriquées sont partagées |
| `compare` | ordre des unités de code | `(a, b) => number` |

## Clés typées et taille

```ts
for (const key of obj.keys(config)) config[key]; // key est keyof typeof config, pas string
for (const [key, value] of obj.entries(scores)) {}
const map = obj.fromEntries(new Map([["a", 1]])); // { a: 1 }
```

`size(value)` compte les clés propres d'un objet, les entrées d'une `Map` ou d'un `Set`, les éléments d'un tableau, les caractères d'une chaîne, et donne `0` pour `null` et `undefined`.

## Clés venues des utilisateurs

```js
const body = JSON.parse('{ "name": "Ada", "__proto__": { "admin": true } }');

obj.merge({}, body);                    // { name: "Ada" }
obj.set({}, "__proto__.admin", true);   // {}
obj.get({ a: 1 }, "constructor.name");  // undefined
```

Chaque fonction ignore `__proto__`, `constructor` et `prototype`, dans les objets qu'elle copie comme dans les chemins qu'elle suit.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `obj.isEmpty(value)` | `nc.is.empty(value)` |

L'ancien nom fonctionne toujours et prévient une fois. `nc.is.empty()` renvoie `false` pour les nombres, les booléens et les autres valeurs qui ne sont pas des conteneurs, là où `obj.isEmpty()` renvoyait `true`.
