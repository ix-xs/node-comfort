---
title: "Configuration"
description: "Les réglages communs à toute la bibliothèque : langue et fuseau horaire, le fichier `.env` chargé au démarrage, le logger par défaut, les variables d'environnement lues et les avertissements de dépréciation."
---

```js
const nc = require("@ix-xs/node-comfort");

nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });
nc.logger.configure({ level: "debug" });
```

Chaque réglage est facultatif. Sans aucun, la sortie est en anglais, les dates dans le fuseau du système, les logs au niveau `info`.

## Langue et fuseau horaire

```js
nc.config.set({ locale: "fr", timeZone: "Europe/Paris" }); // { locale: "fr", timeZone: "Europe/Paris" }
nc.num.currency(1234.5, "EUR");                            // "1 234,50 €"
nc.time.format(new Date("2026-01-05T12:00:00Z"), "dddd D MMMM YYYY HH:mm"); // "lundi 5 janvier 2026 13:00"
nc.str.plural(2, { one: "fichier", other: "fichiers" });   // "2 fichiers"
nc.arr.toSentence(["a", "b", "c"]);                        // "a, b et c"
nc.config.get();                                           // { locale: "fr", timeZone: "Europe/Paris" }
```

| Réglage | Par défaut | Utilisé par |
| --- | --- | --- |
| `locale` | `"en"` | `num` (mise en forme), `time` (noms, dates relatives), `str.plural`, `arr.toSentence` |
| `timeZone` | `undefined` : le fuseau du système | `time`, l'horodatage du logger |

`set()` ne change que les clés reçues et renvoie les réglages en vigueur. Il les vérifie d'abord, et une valeur invalide ne change rien :

| Valeur | Lève |
| --- | --- |
| `{ locale: "xx_invalid!" }` | `RangeError: Invalid language tag` |
| `{ locale: 42 }` | `TypeError: Invalid locale` |
| `{ timeZone: "Mars/Olympus" }` | `RangeError: Invalid time zone specified` |

`{ timeZone: null }` revient au fuseau du système. Une fonction qui prend sa propre option `{ locale }` ou `{ timeZone }` l'utilise pour cet appel seulement. Les réglages valent pour tout le processus : définissez-les une fois, au démarrage.

## Le fichier .env

Au chargement du paquet, si un fichier `.env` se trouve dans le dossier de travail, ses variables sont ajoutées à `process.env`.

| Règle | |
| --- | --- |
| Déjà définie | Une variable qui existe déjà dans l'environnement garde sa valeur |
| Écartées | Les variables qui peuvent exécuter du code ou couper les vérifications TLS : `NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `PATH`, `LD_PRELOAD`, `GIT_SSH_COMMAND` et d'autres du même genre. Un avertissement sur stderr les nomme |
| Erreurs | Un fichier invalide n'arrête jamais le programme : il est ignoré |
| Désactivé | `NODE_COMFORT_DOTENV=false` dans l'environnement |

```text
[@ix-xs/node-comfort] Left out of the automatic .env load, as they can run code or weaken TLS: NODE_OPTIONS. Call env.load() to load them on purpose.
```

Pour charger d'autres fichiers, plusieurs fichiers, ou volontairement les variables écartées, appelez `nc.env.load()`. Pour vérifier et convertir les variables, `nc.env.validate()`. Les deux sont sur la [page env](/essentials/env/).

## Le logger

`nc.logger` est un logger prêt à l'emploi. `configure()` change ses réglages, `create()` en crée un autre :

```js
nc.logger.configure({ level: "debug", timestamp: "YYYY-MM-DD HH:mm:ss" });
nc.logger.debug("visible");
// [2026-11-19 11:57:03] ● DEBUG visible

nc.logger.configure({ format: "json", fields: { service: "api" }, redact: ["password"] });
nc.logger.info("Signed in", { user: "ada", password: "hunter2" });
// {"time":"2026-11-19T10:57:03.678Z","level":"info","service":"api","user":"ada","password":"[redacted]","msg":"Signed in"}
```

| Option | Par défaut |
| --- | --- |
| `level` | `LOG_LEVEL`, sinon `"info"` |
| `format` | `LOG_FORMAT`, sinon `"pretty"` |
| `timestamp` | `true` (`[HH:mm:ss]`), `false`, ou un motif de `time.format` |
| `colors` | Selon le terminal |
| `file` | Un chemin, ou `{ path, maxSize, maxFiles, mode }` |
| `fields`, `redact`, `scope`, `delimiter`, `stdout`, `stderr`, `onLog` | Voir la [page du logger](/essentials/logger/) |

## Variables d'environnement

| Variable | Effet |
| --- | --- |
| `LOG_LEVEL` | Niveau minimum du logger : `trace`, `debug`, `info`, `warn`, `error`, `fatal` ou `silent` |
| `LOG_FORMAT=json` | Un objet JSON par ligne de log |
| `DEBUG` | Affiche les logs `debug` : `DEBUG=1` pour tous, `DEBUG=db,http:*` pour ces scopes |
| `NO_COLOR` | Pas de couleurs |
| `FORCE_COLOR=1`, `2` ou `3` | Couleurs forcées, en 16, 256 ou 16 millions de couleurs |
| `NODE_COMFORT_DOTENV=false` | Pas de chargement automatique de `.env` |
| `NODE_ENV` | Le mode lu par `nc.env.mode()`, `isProduction()`, `isDevelopment()`, `isTest()` |

## Avertissements de dépréciation

Les noms de la 2.x fonctionnent toujours en 3.0. La première utilisation de chacun affiche un avertissement, puis plus jamais :

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

| Option de Node.js | Effet |
| --- | --- |
| `--trace-deprecation` | Affiche où chaque ancien nom est utilisé |
| `--no-deprecation` | Fait taire les avertissements |
| `--throw-deprecation` | Lève une erreur à la place : une suite de tests échoue au premier ancien nom |

Chaque avertissement a un `code` qui commence par `NODE_COMFORT_DEP_`, pour `process.on("warning")`. [Passer à la 3.0](/help/upgrade-3-0/) liste chaque ancien nom et son remplaçant.
