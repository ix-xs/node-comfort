---
title: "Quota"
description: "`nc.quota` compte les passages par clé (un utilisateur, une IP, un serveur) dans une fenêtre fixe et dit tout de suite si chacun est autorisé : 5 commandes par utilisateur et par minute, 100 requêtes par IP et par heure."
---

```js
const { quota } = require("@ix-xs/node-comfort");
```

## Créer un quota

```js
const perUser = quota.create({ limit: 5, window: "1m" });

const { allowed, remaining, resetMs } = perUser.consume(userId);
if (!allowed) return reply(`Try again in ${Math.ceil(resetMs / 1000)}s`);
```

`quota.create(options)` équivaut à `new quota.Quota(options)`. La classe sert à typer une variable ou à l'étendre.

| Option | | |
| --- | --- | --- |
| `limit` | Obligatoire | Passages autorisés par clé et par fenêtre. `0` refuse tout |
| `window` | Obligatoire | Durée d'une fenêtre, en ms ou comme `"1m"` |

Un quota répond oui ou non et ne fait jamais attendre. Pour espacer des appels, utilisez [`async.rateLimit`](/flow/async/#limiters) ; pour plafonner le nombre d'appels simultanés, [`async.limit`](/flow/async/#limiters).

## consume

`consume(key, cost = 1)` enregistre un passage et renvoie :

| Champ | |
| --- | --- |
| `allowed` | Si le passage tient dans le quota |
| `remaining` | Passages restants dans la fenêtre en cours |
| `resetMs` | Millisecondes avant la fin de la fenêtre |

```js
const perUser = quota.create({ limit: 3, window: "1m" });

perUser.consume("ada"); // { allowed: true, remaining: 2, resetMs: 60000 }
perUser.consume("ada"); // { allowed: true, remaining: 1, ... }
perUser.consume("ada"); // { allowed: true, remaining: 0, ... }
perUser.consume("ada"); // { allowed: false, remaining: 0, resetMs: 59998 }, quelques ms plus tard
perUser.consume("bob"); // { allowed: true, remaining: 2, resetMs: 60000 }
```

| Règle | |
| --- | --- |
| Clés | Une chaîne ou un nombre. Chaque clé a sa propre fenêtre |
| Fenêtre | Fixe : elle commence au premier passage de la clé et dure `window`. Le passage suivant après elle en ouvre une nouvelle |
| Passages refusés | Non comptés : une clé qui insiste repasse dès la fin de sa fenêtre |
| `cost` | Ce que consomme le passage. Un passage qui coûte plus que ce qui reste est refusé. `0` lit l'état sans rien consommer |

```js
const perAccount = quota.create({ limit: 100, window: "1h" });
perAccount.consume(accountId, rows.length); // un passage qui coûte un par ligne
```

## Clés et mémoire

| Membre | |
| --- | --- |
| `reset(key)` | Oublie une clé, dont le prochain passage ouvre une nouvelle fenêtre. Renvoie si elle en avait une |
| `size` | Clés qui ont une fenêtre, y compris les fenêtres terminées pas encore retirées |

Les fenêtres terminées sont retirées tous les 1000 passages : les clés qui ne reviennent jamais (visiteurs de passage, comptes supprimés) ne s'accumulent pas. Un quota ne tient aucun minuteur : rien à arrêter ni à fermer.

```js
const logins = quota.create({ limit: 5, window: "15m" });

if (!logins.consume(ip).allowed) throw new Error("Too many attempts");
if (await checkPassword(user, password)) logins.reset(ip);
```

## Importer la classe seule

Le sous-chemin exporte la classe, avec un `create` statique :

```js
const Quota = require("@ix-xs/node-comfort/quota");

const perIp = Quota.create({ limit: 100, window: "1h" });
```
