---
title: "Fonctions"
description: "`nc.func` enveloppe une fonction pour changer quand et comment elle s'exécute : debounce, throttle, mémoïsation, regroupement, dédoublonnage, composition."
---

```js
const { func } = require("@ix-xs/node-comfort");
```

Chaque fonction renvoie une nouvelle fonction et laisse l'originale intacte. Les durées acceptent des millisecondes ou du texte : `300`, `"300ms"`, `"5s"`.

## Debounce et throttle

`debounce` attend que les appels cessent, puis s'exécute une fois avec les derniers arguments. `throttle` s'exécute au plus une fois par intervalle.

```js
const save = func.debounce(persist, "1s", { maxWait: "5s" }); // au moins toutes les 5 s tant que les appels continuent
save.flush();   // exécute l'appel en attente maintenant
save.cancel();  // l'abandonne
save.pending(); // true tant qu'un appel attend

const report = func.throttle((percent) => console.log(`${percent}%`), "1s");
```

| Option | `debounce` | `throttle` |
| --- | --- | --- |
| `leading` | `false` : appel au début d'une rafale | `true` : appel dès le premier appel |
| `trailing` | `true` : appel une fois la rafale terminée | `true` : dernier appel avec les derniers arguments |
| `maxWait` | Ne jamais repousser plus longtemps que cela | |

La fonction obtenue par `debounce` a `flush()`, `cancel()` et `pending()` ; celle obtenue par `throttle` a `cancel()`.

## Mémoïser

`memoize` met les résultats en cache selon les arguments. Une promesse rejetée n'est pas gardée : l'appel suivant réessaie.

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: "1m", max: 1000 });
getUser.delete(42); // oublie une entrée
getUser.clear();    // oublie tout
```

| Option | Par défaut | |
| --- | --- | --- |
| `ttl` | pour toujours | Durée de vie d'un résultat |
| `max` | sans limite | Nombre de résultats ; le moins récemment utilisé part en premier |
| `resolver` | les arguments | `(...args) => clé`, accepté aussi directement comme second argument |
| `cacheRejections` | `false` | Garder les promesses rejetées |

Les primitives sont comparées par valeur et par type (`10`, `10n` et `"10"` font trois entrées), les objets simples et les tableaux par contenu (`{ page: 1 }` deux fois fait une entrée), le reste par identité. Pour un cache partagé avec des statistiques, voir [Cache](/flow/cache/).

## Regrouper les appels

`batch` réunit les appels faits à peu d'intervalle et exécute la fonction une seule fois avec tous leurs éléments. Chaque appelant reçoit son propre résultat.

```js
const loadUser = func.batch(async function(ids) {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});

const [ada, bob, eve] = await Promise.all([loadUser(1), loadUser(2), loadUser(3)]); // une seule requête
loadUser.flush(); // exécute maintenant les appels en attente
```

| Option | Par défaut | |
| --- | --- | --- |
| `wait` | même tick | Durée pendant laquelle les appels sont réunis |
| `max` | sans limite | Exécuter dès que ce nombre d'appels attend |

La fonction renvoie un résultat par élément, dans le même ordre, ou une `Map` indexée par élément. Une `Error` parmi les résultats ne rejette que cet appel ; une erreur levée rejette tous les appels du lot.

## Dédoublonner

`dedupe` fait partager une seule exécution aux appels qui se chevauchent :

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);

await Promise.all([refreshToken(), refreshToken(), refreshToken()]); // un seul rafraîchissement
```

Les appels avec les mêmes arguments reçoivent la promesse en cours. Une fois celle-ci réglée, l'appel suivant relance une exécution : rien n'est gardé, contrairement à `memoize`. Le second argument construit la clé : `func.dedupe(fetchUser, (id, options) => id)`.

## Nombre d'appels

```js
const connect = func.once(() => createPool(config)); // les appels suivants renvoient le premier résultat
const tryLogin = func.before(4, login);              // s'exécute pour les 3 premiers appels, puis renvoie le dernier résultat
const done = func.after(3, () => "all done");        // s'exécute à partir du 3e appel

done(); // undefined
done(); // undefined
done(); // "all done"
```

## Les erreurs comme valeurs

`attempt` enveloppe une fonction pour qu'elle se résolve en `[erreur, valeur]` au lieu de lever une erreur :

```js
const safeParse = func.attempt(JSON.parse);

await safeParse('{"a":1}'); // [null, { a: 1 }]
await safeParse("oops");    // [SyntaxError, undefined]
```

Pour une promesse, utilisez `nc.async.to()`.

## Composition

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"

const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN); // chaque étape est attendue
const url = await publish(postId);
```

| Fonction | Exemple | Résultat |
| --- | --- | --- |
| `pipe` | `func.pipe(f, g)(x)` | `g(f(x))`, de gauche à droite, typé de bout en bout |
| `pipeAsync` | `await func.pipeAsync(f, g)(x)` | Pareil, chaque étape attendue |
| `compose` | `func.compose((s) => s + "!", (s) => s.toUpperCase())("hi")` | `"HI!"`, de droite à gauche |
| `curry` | `func.curry((a, b, c) => a + b + c)(1)(2)(3)` | `6` |
| `partial` | `func.partial((a, b, c) => a + b + c, 1, 2)(3)` | `6` |
| `negate` | `[1, 2, 3, 4].filter(func.negate(isEven))` | `[1, 3]` |

## Autres fonctions

| Fonction | Rôle |
| --- | --- |
| `delay(fn, ms, ...args)` | Appelle `fn(...args)` après `ms` et se résout avec son résultat |
| `promisify(fn)` | Transforme une fonction dont le dernier paramètre est un callback `(error, result)` en une fonction qui renvoie une promesse |
| `noop()` | Ne fait rien, renvoie `undefined` |
| `identity(value)` | Renvoie `value` |

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.func.retry()` | `nc.async.retry()` |
| `nc.func.timeout()` | `nc.async.timeout()` |
| `nc.func.to()` | `nc.async.to()` |

Les anciens noms fonctionnent toujours et avertissent une fois. Ils sont retirés en 4.0. Voir [Asynchrone et concurrence](/flow/async/).
