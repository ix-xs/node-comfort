---
title: "Dépannage"
description: "Les messages et les surprises les plus fréquents, ce qu'ils veulent dire et quoi faire."
---

## DeprecationWarning: nc.x() is deprecated

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

Le code utilise un nom de la 2.x. Il fonctionne comme avant ; l'avertissement dit quoi écrire à la place. `node --trace-deprecation` montre la ligne, et [Passer à la 3.0](/help/upgrade-3-0/) liste chaque ancien nom.

L'avertissement peut venir d'une dépendance qui utilise les noms de node-comfort 2.x. Dans ce cas, `node --no-deprecation` le fait taire en attendant la mise à jour de la dépendance.

## Version de Node.js

| Message | Cause |
| --- | --- |
| `npm warn EBADENGINE Unsupported engine` | Node.js est plus ancien que 22.23.4, 24.22.1 ou 26.12.1, ou c'est la 23 ou la 25 |
| `SQLiteError: node:sqlite is not available in Node.js` | `nc.sqlite` sur un Node.js sans `node:sqlite` |
| `ERR_ARGON2_UNAVAILABLE` | `nc.crypto.hashPassword()` avec Argon2id sur un Node.js plus ancien que 24.7 |

Vérifiez avec `node --version`, puis mettez à jour Node.js, le champ `engines` du projet, la CI et les images Docker. Les versions plus anciennes [peuvent planter sur une réponse HTTP malveillante](/system/http/#servers-you-dont-control).

## Left out of the automatic .env load

```text
[@ix-xs/node-comfort] Left out of the automatic .env load, as they can run code or weaken TLS: NODE_OPTIONS. Call env.load() to load them on purpose.
```

Le `.env` du dossier de travail définit une variable que le chargement automatique ne prend jamais : `NODE_OPTIONS`, `PATH`, `NODE_TLS_REJECT_UNAUTHORIZED` et d'autres ([Configuration](/start/configuration/)). Retirez-la du `.env`, ou chargez le fichier volontairement si vous lui faites confiance :

```js
nc.env.load(".env");
```

## Une variable du .env n'est pas définie

| Cause | Solution |
| --- | --- |
| Le programme est lancé depuis un autre dossier | Le chargement automatique lit le `.env` du dossier de travail. Lancez depuis le dossier du projet, ou appelez `nc.env.load(nc.fs.resolve("./.env"))` |
| La variable existe déjà dans l'environnement | L'environnement l'emporte. `override: true` sur `nc.env.load()` change cela |
| `NODE_COMFORT_DOTENV=false` | Le chargement automatique est désactivé |
| La variable est lue avant le chargement du paquet | Chargez le paquet d'abord, dans le fichier d'entrée |

## Un chemin relatif pointe au mauvais endroit

`nc.fs` lit `./x` depuis le fichier qui l'appelle. `nc.sqlite.open()`, `nc.env.load()`, `nc.http.download()`, `nc.sys.open()`, le `file.path` du logger et `nc.fs.glob()` le lisent depuis le dossier de travail :

```js
nc.sqlite.open(nc.fs.resolve("./data/app.sqlite")); // à côté de ce fichier, d'où que node soit lancé
```

Un outil en ligne de commande qui reçoit un chemin tapé par l'utilisateur doit le résoudre lui-même depuis le dossier de travail, avec `path.resolve()`, avant de le donner à `nc.fs`.

## fs.remove() a renvoyé false

`nc.fs` renvoie `false` au lieu de lever une erreur. Les causes habituelles : le chemin est vide (refusé, jamais lu comme le dossier de travail), il n'existe pas, un fichier est ouvert dans un autre programme (Windows), ou les permissions. `nc.fs.exists()` et `nc.fs.stat()` disent laquelle.

## Un import nommé échoue dans un module ES

```text
SyntaxError: Named export 'open' not found. The requested module '@ix-xs/node-comfort/sqlite' is a CommonJS module
```

`@ix-xs/node-comfort/sqlite`, `/cache`, `/emitter`, `/quota` et `/circuit` exportent une classe : importez-la par défaut (`import SQLite from "@ix-xs/node-comfort/sqlite"`), ou prenez le namespace depuis la racine (`import { sqlite } from "@ix-xs/node-comfort"`). Voir [Votre éditeur](/start/editor/).

## Pas de couleurs, ou des codes d'échappement dans un fichier

Les couleurs suivent le terminal : aucune quand la sortie est redirigée vers un fichier ou un pipe, ou quand `NO_COLOR` est défini. `FORCE_COLOR=1`, `2` ou `3` les force, `nc.logger.configure({ colors: false })` les retire des logs. Les fichiers de log n'ont jamais de couleurs.

## Une question rejette avec ERR_INPUT_CLOSED

L'entrée s'est terminée avant la réponse : stdin est fermé, un pipe s'est vidé, ou le programme tourne en CI. Vérifiez d'abord `nc.cli.isInteractive()`, et prenez la réponse dans une option ou une variable quand il renvoie false.

## Windows

| Sujet | |
| --- | --- |
| Commandes | `nc.sys.run("npm", [...])` trouve `npm.cmd`. Un fichier `.cmd` ou `.bat` refuse un argument avec un saut de ligne, ou avec un guillemet quand le fichier ne transmet pas ses arguments avec `%*` : cmd.exe ne peut pas les recevoir sans risque |
| Sortie | Les lignes de `nc.sys.exec()` finissent par `\r\n`. Découpez avec `nc.str.lines()` |
| Arrêt | `timeout` et `signal` arrêtent la commande et ce qu'elle a lancé |
| Fichiers utilisés | Un renommage refusé par un antivirus ou un indexeur est retenté. Un fichier ouvert dans un autre programme ne peut pas être supprimé : `remove` renvoie `false` |
| Liens | `nc.fs.remove(folder, { contents: true })` refuse une jonction : ce vers quoi elle pointe n'est pas touché |
| Chemins réseau | `nc.sys.open()` refuse `\\server\share` sans `allowUNC: true` |
| Signaux | `nc.sys.onShutdown()` écoute aussi `SIGBREAK` (Ctrl+Pause) |

## Toujours bloqué

Ouvrez une issue sur [GitHub](https://github.com/ix-xs/node-comfort/issues) avec la version de node-comfort et de Node.js, le système d'exploitation, le `code` de l'erreur, et le plus petit code qui montre le problème. Un problème de sécurité passe par les [GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new), jamais par une issue publique.
