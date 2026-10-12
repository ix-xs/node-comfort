---
title: "Cache"
description: "`nc.Cache` est un cache en mémoire avec une taille limite et une expiration. Quand il est plein, l'entrée utilisée le moins récemment part la première."
sidebar:
  order: 3
---

```js
const users = new nc.Cache({ max: 1000, ttl: "5m" });

users.set(42, user);
users.get(42);       // l'utilisateur, ou undefined s'il est absent ou expiré
```

## Charger en cas d'absence

`getOrSet` renvoie la valeur en cache ou, à défaut, la charge, la stocke et la renvoie :

```js
const user = await users.getOrSet(id, () => db.users.find(id));
```

Si cent requêtes demandent la même clé absente au même moment, la fonction de chargement s'exécute une seule fois et toutes reçoivent son résultat. Si elle échoue, rien n'est mis en cache et l'erreur parvient à chaque appelant.

Si vous supprimez la clé avec `delete()`, videz le cache avec `clear()` ou définissez la clé vous-même avec `set()` pendant un chargement, les appelants reçoivent quand même la valeur chargée, mais elle n'est pas stockée.

## Servir une valeur périmée

Avec `ttl` seul, le premier appelant après l'expiration attend la fonction de chargement. `staleWhileRevalidate` permet à `getOrSet` de répondre avec l'ancienne valeur pendant qu'une nouvelle se charge :

```js
const rates = new nc.Cache({ ttl: "1m", staleWhileRevalidate: "10m" });

const rate = await rates.getOrSet("eur-usd", () => api.fetchRate("EUR", "USD"));
```

Pendant la première minute, les appelants reçoivent la valeur en cache. Pendant les dix minutes suivantes, ils reçoivent l'ancienne valeur immédiatement et un rechargement démarre en arrière-plan : personne n'attend le rafraîchissement. Passé ce délai, l'entrée a disparu et l'appelant suivant attend la fonction de chargement.

Un seul rechargement s'exécute à la fois. S'il échoue, l'ancienne valeur continue d'être servie et l'appel suivant réessaie.

Seuls `getOrSet` et les fonctions créées avec `wrap` servent des valeurs périmées. Pour `get`, `peek` et `has`, une entrée expirée est absente. L'option peut aussi être donnée à chaque appel, à côté de `ttl` :

```js
await cache.getOrSet("rates", fetchRates, { ttl: "1m", staleWhileRevalidate: "10m" });
```

## Envelopper une fonction

```js
const getWeather = cache.wrap((city) => api.weather(city), { key: (city) => city.toLowerCase(), ttl: "30m" });
await getWeather("Paris");
```

Sans `key`, ce sont les arguments eux-mêmes qui forment la clé de cache.

## Expiration

```js
const sessions = new nc.Cache({ ttl: "30m", updateAgeOnGet: true }); // la lecture renouvelle l'entrée
sessions.set("token", data, { ttl: "15m" }); // expiration propre à l'entrée
sessions.ttl("token");                        // ms restantes
sessions.prune();                             // retire tout de suite les entrées expirées
```

Les durées s'écrivent en millisecondes ou en texte, par exemple `"30m"`. Un `ttl` de `0` signifie sans limite de durée, et c'est la valeur par défaut.

Les entrées expirées sont retirées quand vous les lisez, ou quand vous appelez `prune()`. Un cache sans `max` les balaie aussi de lui-même de temps en temps, au fil des ajouts, pour que les clés que plus personne ne lit ne s'accumulent pas.

## Surveiller les suppressions

```js
const files = new nc.Cache({
  max: 100,
  onRemove: (key, handle, reason) => handle.close(), // "evict", "expire", "delete", "set" ou "clear"
});
```

## Statistiques

```js
cache.stats;        // { hits: 120, misses: 30, sets: 30, evictions: 2, expirations: 5, hitRate: 0.8 }
cache.resetStats(); // compteurs remis à zéro, les entrées restent
```

`clear()` vide le cache mais conserve les compteurs.

## Itération

```js
for (const [key, value] of cache) {}
cache.keys(); cache.values(); cache.entries(); // la moins récemment utilisée en premier
cache.size;
```

`peek()` lit sans compter comme une utilisation, et `has()` vérifie sans toucher à l'ordre.

## Typage

```ts
const cache = new nc.Cache<string, User>({ max: 500 });
```
