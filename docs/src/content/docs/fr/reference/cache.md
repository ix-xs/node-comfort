---
title: "Cache"
description: "Un cache en mémoire avec une limite de taille (les entrées les moins récemment utilisées partent en premier), une expiration par entrée et des statistiques. `getOrSet()` ne charge une valeur manquante qu'une seule fois, même quand de nombreux appelants la demandent au même moment."
sidebar:
  label: "Cache"
  order: 16
---

```js
const { Cache } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const Cache = require("@ix-xs/node-comfort/cache");
```

Cette page liste tout ce que contient `Cache`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/flow/cache/).

```js
const users = new nc.Cache({ max: 1000, ttl: "5m" });
const user = await users.getOrSet(id, () => db.users.find(id));
users.stats; // { hits: 12, misses: 3, hitRate: 0.8, ... }
```

## constructor

```ts
new Cache<K, V>(options?: CacheOptions<K, V>): Cache<K, V>
```

```js
const cache = new nc.Cache({ max: 500, ttl: "1h", updateAgeOnGet: true });
```

## get

```ts
get(key: K): V | undefined
```

Lit une valeur et la marque comme récemment utilisée.

**Renvoie** `V`` | undefined` : `undefined` si elle est absente ou expirée.

## peek

```ts
peek(key: K): V | undefined
```

Lit une valeur sans la compter comme une utilisation ni toucher aux statistiques.

## set

```ts
set(key: K, value: V, options?: CacheSetOptions): Cache<K, V>
```

Stocke une valeur. Quand le cache est plein, l'entrée la moins récemment utilisée part. Une valeur en cours de chargement pour cette clé par `getOrSet()` n'est pas stockée à son arrivée : celle que vous avez définie reste.

```js
cache.set("token", token, { ttl: "15m" });
```

## getOrSet

```ts
getOrSet(key: K, loader: () => V | PromiseLike<V>, options?: CacheSetOptions): Promise<V>
```

Renvoie la valeur en cache, ou appelle `loader`, stocke le résultat et le renvoie. Les appels simultanés pour la même clé partagent un seul appel à `loader`, et un chargement qui échoue ne met rien en cache.

Avec `staleWhileRevalidate`, une entrée qui vient d'expirer est renvoyée immédiatement pendant qu'une nouvelle valeur se charge en arrière-plan : les appelants n'attendent donc jamais un rafraîchissement.

```js
const profile = await cache.getOrSet(`profile:${id}`, () => api.fetchProfile(id), { ttl: "10m" });
const rates = await cache.getOrSet("rates", fetchRates, { ttl: "1m", staleWhileRevalidate: "10m" });
```

## has

```ts
has(key: K): boolean
```

Y a-t-il une entrée fraîche pour cette clé ? Ne compte pas comme une utilisation.

## delete

```ts
delete(key: K): boolean
```

Supprime une entrée. Une valeur en cours de chargement pour cette clé par `getOrSet()` n'est pas stockée à son arrivée.

**Renvoie** `boolean` : `true` s'il y en avait une.

## clear

```ts
clear(): void
```

Supprime toutes les entrées. Les statistiques sont conservées.

## prune

```ts
prune(): number
```

Supprime les entrées expirées maintenant, sans attendre qu'elles soient lues.

**Renvoie** `number` : Nombre d'entrées supprimées.

## ttl

```ts
ttl(key: K): number | undefined
```

Temps restant avant l'expiration d'une entrée.

**Renvoie** `number | undefined` : Des millisecondes, `Infinity` si elle n'expire jamais, `undefined` si elle est absente.

## wrap

```ts
wrap<A extends any[]>(fn: (...args: A) => V | PromiseLike<V>, options?: ({ key?: ((...args: A) => K) | undefined; } & CacheSetOptions) | undefined): (...args: A) => Promise<V>
```

Enveloppe une fonction pour que ses résultats soient mis en cache ici.

| Paramètre | Type | Description |
| --- | --- | --- |
| `fn` | `(...args: ``A``) => ``V`` \| ``PromiseLike``<``V``>` |  |
| `options?` | `{ key?: (...args: ``A``) => ``K`` } & `[`CacheSetOptions`](#cachesetoptions) | `key` construit la clé de cache à partir des arguments. Par défaut, les primitives sont comparées par valeur et les objets simples par contenu. |

```js
const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
```

## size

```ts
size: number
```

Nombre d'entrées, y compris celles qui ont expiré mais ne sont pas encore supprimées.

## stats

```ts
stats: CacheStats
```

Nombre de hits et de miss.

## resetStats

```ts
resetStats(): Cache<K, V>
```

Remet à zéro tous les compteurs de `stats`.

## keys

```ts
keys(): K[]
```

Les clés fraîches, la moins récemment utilisée en premier.

## values

```ts
values(): V[]
```

Les valeurs fraîches, la moins récemment utilisée en premier.

## entries

```ts
entries(): [K, V][]
```

Les paires `[key, value]` fraîches, la moins récemment utilisée en premier.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { CacheEntry } from "@ix-xs/node-comfort"`.

### CacheEntry

| Propriété | Type | Description |
| --- | --- | --- |
| `value` | `V` |  |
| `expires` | `number` |  |
| `ttl` | `number` |  |
| `stale` | `number` |  |

### CacheOptions

Options de `new Cache()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `max?` | `number` | Nombre maximal d'entrées. Quand le cache est plein, la moins récemment utilisée part. Aucune limite par défaut. |
| `ttl?` | `string \| number` | Durée de vie des entrées, en ms ou sous la forme `"10m"`. `0` signifie pour toujours, la valeur par défaut. |
| `staleWhileRevalidate?` | `string \| number` | Après l'expiration d'une entrée, `getOrSet()` peut encore la renvoyer pendant cette durée, le temps de charger une nouvelle valeur en arrière-plan. |
| `updateAgeOnGet?` | `boolean` | Lire une entrée relance sa durée de vie. |
| `onRemove?` | `((key: ``K``, value: ``V``, reason: `[`CacheRemovalReason`](#cacheremovalreason)`) => void)` | Appelée chaque fois qu'une entrée quitte le cache. |

### CacheRemovalReason

La raison pour laquelle une entrée a quitté le cache.

```ts
type CacheRemovalReason = "evict" | "expire" | "delete" | "set" | "clear"
```

### CacheSetOptions

Options de `set()` et `getOrSet()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `ttl?` | `string \| number` | Durée de vie de cette entrée. `0` signifie pour toujours. |
| `staleWhileRevalidate?` | `string \| number` | Durée pendant laquelle cette entrée peut être servie par `getOrSet()` après son expiration, le temps qu'une nouvelle valeur se charge. |

### CacheStats

Statistiques du cache.

| Propriété | Type | Description |
| --- | --- | --- |
| `hits` | `number` | Lectures qui ont trouvé une entrée utilisable. |
| `misses` | `number` | Lectures qui n'ont rien trouvé, ou une entrée expirée. |
| `sets` | `number` |  |
| `evictions` | `number` | Entrées évincées parce que le cache était plein. |
| `expirations` | `number` | Entrées supprimées parce qu'elles avaient expiré. |
| `hitRate` | `number` | De 0 à 1. |
