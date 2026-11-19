---
title: "Organisation"
description: "La forme de l'API : 27 namespaces, une seule façon d'appeler chaque membre, des fabriques pour les objets qui ont un état, et les anciens noms gardés jusqu'à la 4.0."
---

```js
const nc = require("@ix-xs/node-comfort");

nc.logger.info("Ready");
nc.fs.readJSON("./settings.json", {});
nc.is.email("ada@example.com");
```

## Une seule forme

Chaque membre s'appelle `nc.<namespace>.<membre>`. La racine contient les 27 namespaces et rien d'autre :

```js
Object.keys(nc).length; // 27
Object.keys(nc.fs);     // ["read", "readJSON", "readLines", "write", ...]
```

Déstructurez les namespaces que vous utilisez, ou prenez-en un depuis son propre point d'entrée :

```js
const { logger, fs, str } = require("@ix-xs/node-comfort");
const { slugify } = require("@ix-xs/node-comfort/str");
```

[Votre éditeur](/start/editor/) liste les points d'entrée et les formes en modules ES.

## Les namespaces

| Namespace | Pour | Page |
| --- | --- | --- |
| `config` | Langue et fuseau horaire partagés par la bibliothèque | [Configuration](/start/configuration/) |
| `logger` | Niveaux, scopes, logs JSON, fichiers | [Logger](/essentials/logger/) |
| `fs` | Fichiers et dossiers, synchrones, chemins depuis le fichier appelant | [Fichiers et dossiers](/essentials/fs/) |
| `env` | Variables d'environnement, fichiers `.env`, validation | [Variables d'environnement](/essentials/env/) |
| `is` | Vérifications qui renvoient un booléen et affinent les types | [Vérifications et assertions](/essentials/is/) |
| `assert` | `nc.assert(value, message)` et `nc.assert.type(value, type)` | [Vérifications et assertions](/essentials/is/) |
| `errors` | Les classes d'erreur et leurs codes | [Erreurs](/basics/errors/) |
| `json` | Lecture avec valeur de repli, écriture qui ne lève jamais | [JSON](/essentials/json/) |
| `str` | Chaînes de caractères | [Chaînes de caractères](/data/str/) |
| `num` | Nombres, statistiques, mise en forme | [Nombres](/data/num/) |
| `arr` | Tableaux | [Tableaux](/data/arr/) |
| `obj` | Objets, chemins pointés, fusion profonde | [Objets](/data/obj/) |
| `schema` | Schémas de validation aux types déduits | [Validation par schéma](/data/schema/) |
| `time` | Dates, durées, fuseaux horaires, planification | [Dates et heures](/data/time/) |
| `id` | UUID, ULID, nano ids, jetons, snowflakes | [Identifiants](/data/id/) |
| `crypto` | Hashs, mots de passe, chiffrement, JWT, TOTP | [Crypto](/system/crypto/) |
| `func` | Debounce, throttle, mémoïsation, composition | [Fonctions](/flow/func/) |
| `async` | Concurrence, files d'attente, relances, délais | [Asynchrone et concurrence](/flow/async/) |
| `cache` | Cache en mémoire avec TTL et LRU | [Cache](/flow/cache/) |
| `emitter` | Événements typés | [Événements typés](/flow/emitter/) |
| `quota` | Passages autorisés par clé dans une fenêtre de temps | [Quota](/flow/quota/) |
| `circuit` | Disjoncteur pour un service qui peut tomber | [Disjoncteur](/flow/circuit/) |
| `sqlite` | SQLite sans SQL pour les requêtes courantes | [SQLite](/system/sqlite/) |
| `http` | Client HTTP avec relances et vérifications | [Client HTTP](/system/http/) |
| `sys` | Processus, ports, arrêt, la machine | [Processus et système](/system/sys/) |
| `cli` | Arguments, questions, spinners, tableaux | [Outils en ligne de commande](/system/cli/) |
| `color` | Couleurs du terminal | [Couleurs](/system/color/) |

## Fabriques et classes

Un namespace qui fournit des objets avec leur propre état a une fabrique. La classe est aussi exportée, pour l'étendre ou la vérifier avec `instanceof` :

| Fabrique | Renvoie | Classe |
| --- | --- | --- |
| `nc.logger.create(options)` | Un logger avec ses propres réglages | |
| `nc.cache.create(options)` | Un cache | `nc.cache.Cache` |
| `nc.emitter.create()` | Un émetteur d'événements | `nc.emitter.Emitter` |
| `nc.quota.create(options)` | Un quota par clé | `nc.quota.Quota` |
| `nc.circuit.create(options)` | Un disjoncteur | `nc.circuit.Circuit` |
| `nc.sqlite.open(path, options)` | Une connexion à une base | `nc.sqlite.SQLite` |
| `nc.http.create(options)` | Un client HTTP avec des valeurs par défaut | |
| `nc.color.create({ level })` | Des couleurs à un niveau donné | |

```js
const db = nc.sqlite.open("data/app.sqlite");
const sessions = nc.cache.create({ max: 10_000, ttl: "30m" });

class Room extends nc.emitter.Emitter {}
```

## Chargement

`require()` construit l'objet racine et s'arrête là. Un namespace se charge la première fois qu'il est lu, avec les modules de Node.js dont il a besoin : un script qui ne fait que des logs ne charge jamais le code de SQLite ou de crypto. Les chiffres sont dans [Performances](/help/performance/).

## Anciens noms

Les noms de la 2.x (`nc.info()`, `nc.readFile()`, `nc.isEmail()`, `new nc.SQLite()`...) fonctionnent toujours en 3.0 :

| | |
| --- | --- |
| Comportement | Le même qu'en 2.x : un ancien nom appelle l'ancienne implémentation |
| Avertissement | Un `DeprecationWarning` par nom, la première fois qu'il est lu, avec ce qu'il faut utiliser à la place |
| Énumération | Non énumérables : `Object.keys()`, `for...in` et la décomposition ne montrent que les noms de la 3.0, sans jamais avertir |
| Éditeurs | Barrés, avec le remplaçant au survol |
| Suppression | En 4.0 |

[Passer à la 3.0](/help/upgrade-3-0/) donne la table de chaque ancien nom, et comment les trouver dans un projet.
