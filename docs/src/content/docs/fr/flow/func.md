---
title: "Fonctions"
description: "`nc.func` enveloppe vos fonctions pour changer quand et comment elles s'exécutent : debounce, throttle, mémoïsation, nouvelles tentatives, timeouts, traitement par lots et gestion des erreurs sans try/catch."
sidebar:
  order: 1
---

```js
const { func } = require("@ix-xs/node-comfort");

const save = func.debounce(persist, 300);
const data = await func.retry(() => fetchJSON(url), { attempts: 5, delay: 200, backoff: 2 });
const [error, user] = await func.to(getUser(id));
```

Ici, chaque durée s'écrit en millisecondes ou en texte : `300`, `"300ms"`, `"5s"`, `"2m"`, `"1h"`.

## Debounce et throttle

Le **debounce** attend que les appels s'arrêtent, puis exécute la fonction une seule fois avec les derniers arguments. Utilisez-le pour les champs de recherche, les gestionnaires de redimensionnement et l'enregistrement automatique :

```js
const search = func.debounce((query) => api.search(query), 300);
input.on("input", (e) => search(e.target.value));

const save = func.debounce(persist, "1s", { maxWait: "5s" }); // mais au moins toutes les 5s
save.flush();  // exécute tout de suite l'appel en attente
save.cancel(); // l'abandonne
```

Le **throttle** exécute la fonction au plus une fois par intervalle, quel que soit le nombre d'appels. Utilisez-le pour les rapports de progression et les gestionnaires de défilement :

```js
const report = func.throttle((percent) => nc.info(`${percent}%`), "1s");
```

## Nouvelles tentatives

`retry` appelle une fonction jusqu'à ce qu'elle réussisse, en attendant entre deux tentatives. Si toutes les tentatives échouent, vous obtenez la dernière erreur.

```js
const data = await func.retry(() => fetchJSON(url), {
  attempts: 5,
  delay: 200,
  backoff: 2,   // attend 200, 400, 800, 1600 ms
  jitter: 0.2,  // étale les tentatives pour que les clients ne réessaient pas tous en même temps
  shouldRetry: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
  onRetry: (error, attempt, wait) => nc.warn(`Attempt ${attempt} failed, retrying in ${wait}ms`),
});
```

La fonction reçoit le numéro de la tentative, à partir de 1. Passez un `signal` pour arrêter les tentatives.

Une `AbortError` levée par la fonction met fin aux tentatives immédiatement. Une opération annulée a été arrêtée volontairement, elle n'est donc pas retentée.

## Timeouts

```js
const res = await func.timeout(fetch(url), "5s");                    // TimeoutError après 5s
const rows = await func.timeout(() => slowQuery(), 2000, "Database too slow");
```

Avec une promesse, `timeout` cesse seulement d'attendre : la requête elle-même se poursuit en arrière-plan. Donnez-lui plutôt une fonction, et celle-ci reçoit un `AbortSignal` qui se déclenche une fois le délai écoulé, si bien que le travail s'arrête lui aussi :

```js
const res = await func.timeout((signal) => fetch(url, { signal }), "5s");
```

Un timeout est une `TimeoutError`, pas une `AbortError`, il se combine donc avec `retry` :

```js
const res = await func.retry(() => func.timeout((signal) => fetch(url, { signal }), "5s"), { attempts: 3, delay: "1s" });
```

## Les erreurs comme valeurs

`to` transforme une promesse en `[error, value]`, si bien qu'un échec n'est plus qu'une valeur à vérifier :

```js
const [error, user] = await func.to(db.users.find(id));
if (error) return res.status(500).send(error.message);
res.json(user);
```

`attempt` fait de même pour une fonction que vous appellerez plus tard :

```js
const safeParse = func.attempt(JSON.parse);
const [error, data] = await safeParse(input);
```

## Mémoïsation

`memoize` met les résultats en cache selon les arguments. Il peut faire expirer les entrées, plafonner leur nombre, et il gère les fonctions asynchrones : une promesse rejetée n'est pas mise en cache, donc l'appel suivant réessaie.

```js
const getUser = func.memoize((id) => db.users.find(id), { ttl: "1m", max: 1000 });
getUser.delete(42); // oublie une entrée
getUser.clear();    // oublie tout
```

Les arguments primitifs sont comparés par valeur et par type, les objets simples et les tableaux par contenu. Ainsi, `{ page: 1 }` passé deux fois est servi par le cache, alors que `undefined` et `null`, ou `10`, `10n` et `"10"`, ont chacun leur propre entrée. Pour choisir la clé vous-même, passez un `resolver` : `func.memoize(fn, { resolver: (user) => user.id })`.

Pour un cache partagé, avec des statistiques et davantage de contrôle, voyez [`nc.Cache`](/flow/cache/).

## Traitement par lots

`batch` rassemble les appels rapprochés et exécute votre fonction une seule fois avec tous leurs éléments. Chaque appelant reçoit son propre résultat :

```js
const loadUser = func.batch(async (ids) => {
  const users = await db.getAll("users", { id: ids });
  return ids.map((id) => users.find((user) => user.id === id));
});

// Demandé depuis trois endroits en même temps : une seule requête.
const [ada, bob, eve] = await Promise.all([loadUser(1), loadUser(2), loadUser(3)]);
```

La fonction renvoie un résultat par élément, dans le même ordre, ou une `Map` indexée par élément. Une `Error` parmi les résultats ne rejette que l'appel concerné. Si la fonction lève une erreur, tous les appels du lot sont rejetés.

Par défaut, les appels faits dans le même tick partent ensemble. `wait` rassemble les appels plus longtemps, et `max` exécute le lot dès que ce nombre d'appels est en attente :

```js
const loadUser = func.batch(loadUsers, { wait: "20ms", max: 100 });
loadUser.flush(); // exécute tout de suite les appels en attente
```

## Dédoublonnage

`dedupe` fait partager une seule exécution aux appels qui ont lieu en même temps :

```js
const refreshToken = func.dedupe(async () => (await api.post("auth/refresh")).data);

// Dix requêtes reçoivent un 401 au même moment : un seul rafraîchissement, dix réponses.
const token = await refreshToken();
```

Les appels avec les mêmes arguments reçoivent la promesse de l'exécution en cours. Une fois celle-ci terminée, l'appel suivant lance une nouvelle exécution : rien n'est conservé, contrairement à `memoize`. Un second paramètre vous permet de construire la clé vous-même, comme dans `func.dedupe(fetchUser, (id, options) => id)`.

## Once, before, after

```js
const connect = func.once(() => createPool(config)); // les appels suivants renvoient le même pool
const tryLogin = func.before(4, login);               // 3 vraies tentatives au plus
const done = func.after(3, () => nc.info("All 3 uploads finished"));
```

## Composition

`pipe` enchaîne des fonctions de gauche à droite, et les types suivent d'un bout à l'autre :

```js
const toSlug = func.pipe(nc.str.deburr, nc.str.kebabCase);
toSlug("Crème Brûlée"); // "creme-brulee"
```

`pipeAsync` fait de même quand certaines étapes sont asynchrones. Chacune est attendue avant que la suivante ne s'exécute :

```js
const publish = func.pipeAsync(loadDraft, renderMarkdown, uploadToCDN);
const url = await publish(postId);
```

Également disponibles : `compose` (de droite à gauche), `curry`, `partial`, `negate`, `delay`, `promisify`, `noop` et `identity`. La [référence](/reference/func/) liste tout.
