---
title: "Cache"
description: "`nc.cache` crée des caches en mémoire avec une taille maximale, une expiration par entrée, le stale-while-revalidate et des statistiques. Quand un cache est plein, l'entrée utilisée le moins récemment part en premier."
---

```js
const { cache } = require("@ix-xs/node-comfort");
```

## Créer un cache

```js
const users = cache.create({ max: 1000, ttl: "5m" });

users.set(42, user);
users.get(42); // l'utilisateur, ou undefined s'il manque ou a expiré
```

`cache.create(options)` équivaut à `new cache.Cache(options)`. La classe sert à typer une variable ou à l'étendre.

| Option | Par défaut | |
| --- | --- | --- |
| `max` | sans limite | Nombre d'entrées ; une fois plein, l'entrée utilisée le moins récemment part |
| `ttl` | `0` (pour toujours) | Durée de vie d'une entrée, en ms ou comme `"10m"` |
| `staleWhileRevalidate` | `0` | Combien de temps après l'expiration `getOrSet` peut encore servir l'ancienne valeur |
| `updateAgeOnGet` | `false` | Lire une entrée relance sa durée de vie |
| `onRemove` | | `(key, value, reason)`, chaque fois qu'une entrée sort |

En TypeScript : `cache.create<string, User>({ max: 500 })`.

## Charger en cas d'absence

`getOrSet` renvoie la valeur en cache, ou appelle la fonction de chargement, stocke son résultat et le renvoie :

```js
const user = await users.getOrSet(id, () => db.users.find(id));
```

| Cas | Ce qui se passe |
| --- | --- |
| Plusieurs appelants demandent la même clé absente | Le chargement s'exécute une fois, tous reçoivent son résultat |
| Le chargement échoue | Rien n'est stocké, chaque appelant reçoit l'erreur |
| `delete()`, `clear()` ou `set()` sur la clé pendant le chargement | Les appelants reçoivent la valeur chargée, elle n'est pas stockée |
| `{ signal }` se déclenche avant que la valeur soit là | Cet appelant rejette avec une `AbortError` |

Le troisième argument accepte aussi `ttl` et `staleWhileRevalidate` pour cette entrée.

## Stale while revalidate

Avec `staleWhileRevalidate`, une entrée expirée est encore servie par `getOrSet` pendant cette durée, pendant qu'une valeur fraîche se charge en arrière-plan :

```js
const rates = cache.create({ ttl: "1m", staleWhileRevalidate: "10m" });

const rate = await rates.getOrSet("eur-usd", () => api.fetchRate("EUR", "USD"));
```

| Âge de l'entrée | `getOrSet` |
| --- | --- |
| Moins de `ttl` | La valeur en cache |
| Entre `ttl` et `ttl + staleWhileRevalidate` | L'ancienne valeur tout de suite, et un rechargement en arrière-plan |
| Au-delà | Attend le chargement |

Un rechargement qui échoue laisse l'ancienne valeur servie ; l'appel suivant réessaie. Seuls `getOrSet` et `wrap` servent des valeurs périmées : pour `get`, `peek` et `has`, une entrée expirée est absente.

## Envelopper une fonction

```js
const weather = cache.create({ max: 100 });
const getWeather = weather.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
await getWeather("paris"); // depuis le cache
```

Sans `key`, les arguments forment la clé : les primitives par valeur, les objets simples par contenu.

## Expiration

```js
const sessions = cache.create({ ttl: "30m", updateAgeOnGet: true });
sessions.set("token", data, { ttl: "15m" }); // expiration de cette entrée
sessions.ttl("token");                        // ms restantes, Infinity si elle n'expire jamais, undefined si absente
sessions.prune();                             // retire maintenant les entrées expirées, renvoie leur nombre
```

Les entrées expirées sont retirées à la lecture ou par `prune()`. Un cache sans `max` les balaie aussi de temps en temps quand des entrées sont ajoutées.

## Retraits

```js
const files = cache.create({
  max: 100,
  onRemove: (key, handle, reason) => handle.close(),
});
```

| `reason` | Quand |
| --- | --- |
| `"evict"` | Le cache était plein |
| `"expire"` | L'entrée a expiré |
| `"delete"` | `delete(key)` |
| `"set"` | `set()` a remplacé la valeur |
| `"clear"` | `clear()` |

## Lire et parcourir

| Membre | |
| --- | --- |
| `get(key)` | La valeur, compte comme une utilisation |
| `peek(key)` | La valeur, sans compter comme une utilisation |
| `has(key)` | Si une entrée fraîche existe, sans toucher à l'ordre |
| `set(key, value, { ttl, staleWhileRevalidate })` | Renvoie le cache |
| `delete(key)` | Si une entrée a été retirée |
| `clear()` | Vide le cache et le renvoie ; les statistiques restent |
| `keys()`, `values()`, `entries()`, `for...of` | La moins récemment utilisée d'abord |
| `size` | Entrées, y compris celles expirées pas encore retirées |

## Statistiques

```js
users.stats;        // { hits: 2, misses: 1, sets: 1, evictions: 0, expirations: 0, hitRate: 0.6666666666666666 }
users.resetStats(); // compteurs à zéro, les entrées restent
```

## Importer la classe seule

Le sous-chemin exporte la classe, avec une méthode statique `create` :

```js
const Cache = require("@ix-xs/node-comfort/cache");

const sessions = Cache.create({ max: 10000, ttl: "30m" });
```

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `new nc.Cache(options)` | `nc.cache.create(options)` ou `new nc.cache.Cache(options)` |

`nc.Cache` fonctionne toujours, avertit une fois et sera retiré en 4.0. En 3.0, `clear()` renvoie le cache au lieu de `undefined`, et `getOrSet` accepte un `signal`.
