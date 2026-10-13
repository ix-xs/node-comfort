---
title: "nc.obj"
description: "Utilitaires pour les objets : copie profonde, fusion, égalité, différences, chemins pointés typés, pick et omit. Les entrées ne sont jamais modifiées, et les clés `__proto__`, `constructor` et `prototype` sont toujours ignorées : une entrée utilisateur ne peut donc pas polluer les prototypes."
sidebar:
  label: "obj"
  order: 10
---

```js
const { obj } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const obj = require("@ix-xs/node-comfort/obj");
```

Cette page liste tout ce que contient `nc.obj`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/obj/).

```js
obj.get(config, "db.pool.max", 10);         // typé, chemins complétés automatiquement
obj.set(state, "user.profile.name", "Ada"); // renvoie une copie mise à jour
obj.merge(defaults, userConfig);
```

## clone

```ts
clone<T>(value: T): T
```

Copie profonde. Contrairement à `structuredClone`, elle conserve les fonctions et les instances de classe (avec leur prototype), et elle est plus rapide sur des données simples. Les références partagées et les cycles sont préservés.

```js
const copy = obj.clone({ a: { b: [1, 2] }, when: new Date() });
copy.a.b.push(3); // l'original est intact
```

## merge

```ts
merge<A extends object>(a: A): A
merge<A extends object, B extends object>(a: A, b: B): A & B
merge<A extends object, B extends object, C extends object>(a: A, b: B, c: C): A & B & C
merge(...sources: object[]): Record<string, any>
```

Fusionne des objets en profondeur dans un nouvel objet. Les derniers objets l'emportent, les objets imbriqués sont fusionnés, les tableaux sont remplacés. Voir `mergeWith()` pour concaténer les tableaux à la place.

```js
obj.merge({ db: { host: "localhost", port: 5432 } }, { db: { port: 6543 } });
// { db: { host: "localhost", port: 6543 } }
```

## mergeWith

```ts
mergeWith(options: MergeOptions, ...sources: object[]): Record<string, any>
```

Comme `merge()`, avec le choix de ce qui arrive aux tableaux et à `undefined`.

```js
obj.mergeWith({ arrays: "unique" }, { tags: ["a", "b"] }, { tags: ["b", "c"] });
// { tags: ["a", "b", "c"] }
obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined });
// { port: 80 }
```

## defaults

```ts
defaults<T extends object, D extends object>(target: T, ...sources: D[]): T & D
```

Complète les propriétés manquantes à partir de valeurs par défaut, en profondeur. Les valeurs définies, même `null` ou `0`, sont conservées.

| Paramètre | Type | Description |
| --- | --- | --- |
| `target` | `T` |  |
| `...sources` | `...``D` | La première a la priorité la plus élevée. |

```js
obj.defaults({ port: 8080, db: { user: "me" } }, { port: 80, db: { user: "root", pass: "" } });
// { port: 8080, db: { user: "me", pass: "" } }
```

## equal

```ts
equal(a: unknown, b: unknown): boolean
```

Égalité profonde. Gère les tableaux, les dates, les expressions régulières, les Map, les Set, les tableaux typés, `NaN` et les références circulaires.

```js
obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }); // true
obj.equal(new Set([1, 2]), new Set([2, 1]));          // true
obj.equal({ a: 1 }, { a: 1, b: undefined });          // false
```

## diff

```ts
diff(before: unknown, after: unknown): Change[]
```

Liste ce qui a changé entre deux valeurs, en profondeur. Pratique pour les journaux d'audit et les mises à jour partielles.

**Renvoie** [`Change`](#change)`[]` : Vide quand rien n'a changé.

```js
obj.diff({ name: "Ada", tags: ["a"] }, { name: "Ada L.", tags: ["a", "b"] });
// [
//   { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
//   { path: ["tags", 1], type: "added", to: "b" },
// ]
```

## get

```ts
get<T, P extends string>(object: T, path: P | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never) | readonly (string | number)[]): PathValue<T, P>
get<T, P extends string, F>(object: T, path: P | readonly (string | number)[] | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never), fallback: F): F | Exclude<PathValue<T, P>, undefined>
```

Lit une valeur imbriquée à partir d'un chemin pointé. Votre éditeur complète les chemins et connaît le type du résultat.

| Paramètre | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `path` | `P`` \| `[`Paths`](#paths)`<``T``> \| ``ReadonlyArray``<string \| number>` | Par exemple `"a.b.c"`, `"a[0].b"` ou `["a", 0, "b"]`. |
| `fallback` | `F` |  |

```js
obj.get(config, "db.pool.max");      // number | undefined
obj.get(config, "db.pool.max", 10);  // number
obj.get(data, "users[0].name");
obj.get(data, ["users", 0, "name"]);
```

## set

```ts
set<T>(object: T, path: PathInput<T>, value: unknown): T
```

Renvoie une copie dans laquelle une valeur imbriquée est définie. Les niveaux manquants sont créés (des tableaux quand la clé suivante est un nombre).

```js
obj.set({}, "a.b.c", 1);            // { a: { b: { c: 1 } } }
obj.set(state, "user.name", "Ada"); // state est intact
```

## update

```ts
update<T>(object: T, path: PathInput<T>, updater: (value: any) => unknown): T
```

Renvoie une copie où la valeur située à `path` est remplacée par ce que `updater` renvoie pour elle. Pratique pour les compteurs et les listes.

| Paramètre | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `path` | [`PathInput`](#pathinput)`<``T``>` |  |
| `updater` | `(value: any) => unknown` | Reçoit la valeur actuelle, `undefined` s'il n'y en a pas. |

```js
obj.update(state, "stats.visits", (n = 0) => n + 1);
obj.update(cart, "items", (items = []) => [...items, product]);
```

## unset

```ts
unset<T>(object: T, path: PathInput<T>): T
```

Renvoie une copie sans la propriété située à `path`.

```js
obj.unset({ a: { b: 1, c: 2 } }, "a.b"); // { a: { c: 2 } }
```

## has

```ts
has<T>(object: T, path: PathInput<T>): boolean
```

Le chemin existe-t-il ? Une propriété définie à `undefined` compte quand même.

```js
obj.has({ a: { b: undefined } }, "a.b"); // true
obj.has({ a: {} }, "a.b");               // false
```

## pick

```ts
pick<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Pick<T, K>
```

Une copie avec seulement les clés listées.

```js
obj.pick(user, ["id", "email"]);
```

## omit

```ts
omit<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Omit<T, K>
```

Une copie sans les clés listées.

```js
obj.omit(user, ["password", "token"]);
```

## filter

```ts
filter<T extends object>(object: T, predicate: (value: T[keyof T], key: keyof T & string) => unknown): Partial<T>
```

Garde les entrées qui passent un test.

```js
obj.filter({ a: 1, b: 2, c: 3 }, (value) => value > 1); // { b: 2, c: 3 }
```

## mapValues

```ts
mapValues<T extends object, R>(object: T, fn: (value: T[keyof T], key: keyof T & string) => R): { [K in keyof T]: R; }
```

Transforme chaque valeur, en gardant les clés.

```js
obj.mapValues({ a: 1, b: 2 }, (v) => v * 10); // { a: 10, b: 20 }
```

## mapKeys

```ts
mapKeys<T extends object>(object: T, fn: (key: keyof T & string, value: T[keyof T]) => PropertyKey): Record<string, T[keyof T]>
```

Transforme chaque clé, en gardant les valeurs.

| Paramètre | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `fn` | `(key: keyof ``T`` & string, value: ``T``[keyof ``T``]) => ``PropertyKey` | Renvoie la nouvelle clé. |

```js
obj.mapKeys({ first_name: "Ada" }, (key) => nc.str.camelCase(key)); // { firstName: "Ada" }
```

## renameKeys

```ts
renameKeys<T extends object>(object: T, mapping: Partial<Record<keyof T, string>>): Record<string, T[keyof T]>
```

Renomme certaines clés et laisse les autres telles quelles.

| Paramètre | Type | Description |
| --- | --- | --- |
| `object` | `T` |  |
| `mapping` | `Partial``<``Record``<keyof ``T``, string>>` | Ancien nom vers nouveau nom. |

```js
obj.renameKeys({ _id: 1, name: "Ada" }, { _id: "id" }); // { id: 1, name: "Ada" }
```

## invert

```ts
invert(object: Record<string, PropertyKey>): Record<string, string>
```

Échange les clés et les valeurs.

```js
obj.invert({ a: "x", b: "y" }); // { x: "a", y: "b" }
```

## compact

```ts
compact<T extends object>(object: T, options?: CompactOptions): Partial<T>
```

Retire les valeurs `null` et `undefined`, et éventuellement les valeurs vides.

```js
obj.compact({ a: 1, b: null, c: undefined });                          // { a: 1 }
obj.compact({ a: { b: null, c: "" } }, { deep: true, removeEmpty: true }); // {}
```

## flatten

```ts
flatten(object: object, prefix?: string): Record<string, unknown>
```

Aplatit les objets imbriqués en clés pointées. Les tableaux restent des valeurs.

| Paramètre | Type | Description |
| --- | --- | --- |
| `object` | `object` |  |
| `prefix?` | `string` | Ajouté devant chaque clé. Par défaut : `""`. |

```js
obj.flatten({ db: { host: "x", port: 5432 } }); // { "db.host": "x", "db.port": 5432 }
```

## unflatten

```ts
unflatten(object: Record<string, unknown>): Record<string, any>
```

Reconstruit des objets imbriqués à partir de clés pointées. L'inverse de `flatten()`.

```js
obj.unflatten({ "db.host": "x", "db.port": 5432 }); // { db: { host: "x", port: 5432 } }
```

## paths

```ts
paths(object: object): string[]
```

Tous les chemins feuilles d'un objet, sous forme pointée. Les tableaux comptent comme des feuilles.

```js
obj.paths({ db: { host: "x", port: 5432 }, tags: ["a"] }); // ["db.host", "db.port", "tags"]
```

## sortKeys

```ts
sortKeys<T>(object: T, options?: SortKeysOptions): T
```

Une copie dont les clés sont triées, objets imbriqués compris. Deux objets de même contenu donnent alors le même JSON, ce qui permet des hashs stables, des clés de cache et des diffs lisibles.

```js
obj.sortKeys({ b: 1, a: { d: 1, c: 2 } }); // { a: { c: 2, d: 1 }, b: 1 }
nc.crypto.hash(JSON.stringify(obj.sortKeys(payload)));
```

## keys

```ts
keys<T extends object>(object: T): (keyof T & string)[]
```

`Object.keys`, mais typé avec les clés réelles de l'objet.

```js
for (const key of obj.keys(config)) config[key]; // aucune erreur de type
```

## entries

```ts
entries<T extends object>(object: T): [keyof T & string, T[keyof T]][]
```

`Object.entries`, avec des clés et des valeurs typées.

## fromEntries

```ts
fromEntries<K extends PropertyKey, V>(pairs: Iterable<readonly [K, V]>): Record<K, V>
```

`Object.fromEntries` qui accepte n'importe quel itérable (une `Map` aussi) et ignore les clés dangereuses.

```js
obj.fromEntries(new Map([["x", true]])); // { x: true }
```

## size

```ts
size(value: unknown): number
```

Le nombre d'entrées : clés propres d'un objet, taille d'une Map ou d'un Set, longueur d'un tableau ou d'une chaîne.

```js
obj.size({ a: 1, b: 2 }); // 2
```

## isEmpty

```ts
isEmpty(object: unknown): boolean
```

Est-il vide ? Aucune clé propre pour un objet, aucune entrée pour une Map ou un Set. `null` et `undefined` comptent comme vides ; une date, une expression régulière et une erreur ne le sont jamais.

```js
obj.isEmpty({});                  // true
obj.isEmpty(new Map([["a", 1]])); // false
```

## deepFreeze

```ts
deepFreeze<T>(object: T): DeepReadonly<T>
```

Gèle un objet et tout ce qu'il contient. Pratique pour la configuration et les constantes.

**Renvoie** [`DeepReadonly`](#deepreadonly)`<``T``>` : Le même objet.

```js
const CONFIG = obj.deepFreeze({ db: { host: "localhost" } });
CONFIG.db.host = "x"; // erreur TypeScript, et ignorée à l'exécution
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { Change } from "@ix-xs/node-comfort"`.

### Change

Une différence signalée par `diff()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `path` | `(string \| number)[]` | L'endroit du changement, comme `["address", "city"]`. |
| `type` | `"added" \| "removed" \| "changed"` |  |
| `from?` | `unknown` | L'ancienne valeur. |
| `to?` | `unknown` | La nouvelle valeur. |

### CompactOptions

Options de `compact()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `deep?` | `boolean` | Nettoie aussi les objets et les tableaux imbriqués. |
| `removeEmpty?` | `boolean` | Retire aussi `""`, `[]` et `{}`. |

### DeepReadonly

`T`, en lecture seule à tous les niveaux.

```ts
type DeepReadonly = T extends (...args: any[]) => any ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]>; } : T
```

### MergeOptions

Options de `mergeWith()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `arrays?` | `"concat" \| "replace" \| "unique"` | Quand les deux côtés ont un tableau : garder le dernier, les concaténer, ou les concaténer sans doublons. Par défaut : `"replace"`. |
| `skipUndefined?` | `boolean` | Empêche `undefined` d'écraser une valeur existante. |

### NullishToUndefined

```ts
type NullishToUndefined = [Extract<T, null | undefined>] extends [never] ? never : undefined
```

### PathInput

Un chemin : un chemin pointé connu (complété par votre éditeur), toute autre chaîne comme `"items[0].name"`, ou un tableau de clés.

```ts
type PathInput = Paths<T> | (string & {}) | ReadonlyArray<string | number>
```

### PathLeaf

Les valeurs qui terminent un chemin : dates, expressions régulières, Map, Set, fonctions et tableaux.

```ts
type PathLeaf = Date | RegExp | Map<any, any> | Set<any> | ((...args: any[]) => any) | readonly any[]
```

### Paths

Tous les chemins pointés d'un type d'objet, jusqu'à 6 niveaux. C'est ce qui permet la complétion des chemins dans `obj.get()` et les fonctions voisines.

```ts
type Paths = Depth["length"] extends 6 ? never : T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${Paths<NonNullable<T[K]>, [...Depth, 0]>}` : `${K}`; }[keyof T & (string | number)] : never
```

### PathStep

```ts
type PathStep = K extends keyof NonNullable<T> ? NonNullable<T>[K] : NonNullable<T> extends readonly (infer E)[] ? (K extends `${number}` ? E | undefined : typeof _NOT_FOUND) : typeof _NOT_FOUND
```

### PathValue

Le type trouvé à un chemin pointé de `T`, ou `any` pour un chemin inconnu.

```ts
type PathValue = P extends `${infer Head}.${infer Rest}` ? PathStep<T, Head> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : PathValue<Next, Rest> | NullishToUndefined<T>) : any : PathStep<T, P> extends infer Next ? ([Next] extends [typeof _NOT_FOUND] ? any : Next | NullishToUndefined<T>) : any
```

### SortKeysOptions

Options de `sortKeys()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `deep?` | `boolean` | Trie aussi les objets imbriqués, tableaux compris. Par défaut : `true`. Avec `false`, seul le premier niveau est copié et trié : ce qu'il contient est partagé avec l'original. |
| `compare?` | `((a: string, b: string) => number)` | Comment ordonner deux clés. Par défaut : l'ordre des unités de code, qui est stable d'une machine à l'autre. |
