---
title: "Disjoncteur"
description: "`nc.circuit` enveloppe les appels à un service qui peut tomber. Après trop d'échecs de suite, les appels échouent aussitôt avec une `CircuitOpenError` ; après une pause, un appel d'essai vérifie si le service est revenu."
---

```js
const { circuit } = require("@ix-xs/node-comfort");
```

## Créer un disjoncteur

```js
const payments = circuit.create({ failureThreshold: 5, resetTimeout: "30s" });

const invoice = await payments.execute(() => api.createInvoice(order));
```

`circuit.create(options)` équivaut à `new circuit.Circuit(options)`. La classe sert à typer une variable ou à l'étendre.

| Option | Par défaut | |
| --- | --- | --- |
| `failureThreshold` | `5` | Échecs de suite qui ouvrent le circuit |
| `resetTimeout` | `"30s"` | Combien de temps il reste ouvert avant un essai, en ms ou comme `"30s"` |
| `successThreshold` | `1` | Succès de suite, en semi-ouvert, qui le referment |
| `isFailure` | toute erreur | `(error) => boolean` : si une erreur compte comme un échec |
| `onOpen` | | Appelée à chaque ouverture du circuit |
| `onClose` | | Appelée à chaque fois qu'il se referme |

Un disjoncteur décide si un appel peut s'exécuter, d'après les échecs qui l'ont précédé. Pour espacer des appels, utilisez [`async.rateLimit`](/flow/async/#limiters) ; pour plafonner le nombre d'appels simultanés, [`async.limit`](/flow/async/#limiters) ; pour réessayer un appel, [`async.retry`](/flow/async/).

## États

`status` vaut `"closed"`, `"open"` ou `"half-open"` :

| `status` | `execute(fn)` | Devient |
| --- | --- | --- |
| `"closed"` (fermé) | Exécute `fn` | `"open"` après `failureThreshold` échecs de suite. Un succès remet le compte à zéro |
| `"open"` (ouvert) | Rejette avec une `CircuitOpenError`, sans exécuter `fn` | `"half-open"` au premier appel après `resetTimeout` |
| `"half-open"` (semi-ouvert) | Exécute `fn` | `"closed"` après `successThreshold` succès, de nouveau `"open"` sur un échec |

`status` reste `"open"` jusqu'à ce qu'un appel arrive après `resetTimeout` : l'essai, c'est cet appel. Une nouvelle ouverture relance la pause.

```js
const search = circuit.create({ failureThreshold: 2, resetTimeout: "10s" });

await search.execute(() => api.search("a")).catch(() => {}); // échoue
await search.execute(() => api.search("b")).catch(() => {}); // échoue : ouvert
search.status; // "open"
await search.execute(() => api.search("c")); // CircuitOpenError, api.search n'est pas appelée
```

## Erreurs

`execute` renvoie une promesse de ce que renvoie `fn`. Une erreur de `fn` parvient toujours à l'appelant, après avoir été comptée :

```js
try {
  return await payments.execute(() => api.charge(card, amount));
} catch (error) {
  if (error instanceof nc.errors.CircuitOpenError) return "Payments are down, try again in a minute";
  throw error;
}
```

| Erreur | `code` |
| --- | --- |
| `nc.errors.CircuitOpenError` | `ERR_CIRCUIT_OPEN` |

`isFailure` écarte du compte les erreurs qui ne disent rien de la santé du service. Elles sont quand même levées :

```js
const users = circuit.create({
  isFailure: (error) => !(error instanceof nc.errors.HttpError && error.status < 500),
});
```

## Événements

```js
const mailer = circuit.create({
  onOpen: () => nc.logger.warn("Mail server down, emails are on hold"),
  onClose: () => nc.logger.info("Mail server back"),
});
```

`onOpen` est rappelée quand un essai échoue. Un disjoncteur ne tient aucun minuteur : rien à arrêter ni à fermer.

## Importer la classe seule

Le sous-chemin exporte la classe, avec un `create` statique :

```js
const Circuit = require("@ix-xs/node-comfort/circuit");

const mailer = Circuit.create({ failureThreshold: 3 });
```
