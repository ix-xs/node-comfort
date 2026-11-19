---
title: "Logger"
description: "`nc.logger` : niveaux, couleurs, balisage, groupes, chronomètres et tableaux dans un terminal ; un objet JSON par ligne, fichiers tournants et masquage en production. Sans configuration."
---

```js
const { logger } = require("@ix-xs/node-comfort");
```

```js
logger.info("Server listening on port 3000");
logger.success("Database connected");
logger.warn("Cache is almost full");
logger.error(new Error("Payment failed"));
```

```text
[14:30:05] ℹ INFO Server listening on port 3000
[14:30:05] ✔ OK Database connected
[14:30:05] ⚠ WARN Cache is almost full
[14:30:05] ✖ ERROR Error: Payment failed
               at charge (/app/billing.js:42:11)
```

## Niveaux

| Méthode | Niveau | Flux |
| --- | --- | --- |
| `trace` | `trace` | stdout |
| `debug` | `debug` | stdout |
| `log` | `info`, sans badge | stdout |
| `info`, `success` | `info` | stdout |
| `warn` | `warn` | stderr |
| `error` | `error` | stderr |
| `fatal` | `fatal` | stderr. N'arrête pas le processus |

Les messages sous le niveau courant sont ignorés. Le niveau par défaut est `info`, ou `LOG_LEVEL`. `silent` masque tout.

```js
logger.setLevel("debug");
logger.getLevel(); // "debug"
if (logger.isLevelEnabled("debug")) logger.debug(buildExpensiveReport());
```

## Sortie de débogage par portée

```bash
DEBUG=1 node app.js                  # tous les loggers, comme LOG_LEVEL=debug
DEBUG=db node app.js                 # le logger "db" seulement
DEBUG=db,http:* node app.js          # "db", et les enfants de "http"
DEBUG=http*,-http:static node app.js # un - en tête exclut
```

| Valeur de `DEBUG` | Effet |
| --- | --- |
| `1`, `true`, `yes`, `on`, `*` | Le niveau par défaut devient `debug` (comme avec n'importe quel `NODE_DEBUG`). `LOG_LEVEL` l'emporte s'il est défini |
| Une liste de portées, séparées par des virgules ou des espaces | Les loggers nommés affichent `debug` et `trace`, quel que soit leur niveau (sauf `silent`) |

Un motif doit couvrir toute la portée : `http:*` couvre `http:router` mais pas `http` ; `http*` couvre les deux. Un logger sans portée n'est pas concerné.

## Arguments

Les objets sont mis en forme. Les erreurs affichent leur pile et leur chaîne de `cause`. Les lignes après la première sont indentées : une valeur ne peut pas se faire passer pour une ligne de log (sauf avec `log()` sans portée ni horodatage, qui affiche comme `console.log`).

```js
logger.info("user:", { id: 1, roles: ["admin"] });
logger.error(new Error("Cannot save order", { cause: dbError }));
```

Les caractères de contrôle des valeurs sont écrits en texte (`\x1b`, `\r`) : une valeur ne peut ni effacer le terminal, ni changer son titre, ni réécrire une ligne. Les retours à la ligne, les tabulations, et les couleurs et liens de [`nc.color`](/system/color/) sont conservés. Les couleurs sont retirées quand la sortie n'est pas un terminal, dans les fichiers, et avec `NO_COLOR`.

## Balisage

```js
logger.log("<% green bold ✔ Saved%> in <% dim 12ms%>");
logger.log("<% #ff8800 Orange%> on <% bg#1e1e2e white a dark background%>");
```

Tout style de [`nc.color`](/system/color/) fonctionne, ainsi que `#hex`, `bg#hex`, `rgb(r, g, b)` et `bgRgb(r, g, b)`. Seul le premier argument est lu comme balisage : passez les valeurs venues de l'extérieur dans les arguments suivants.

```js
logger.info("<% bold New user:%>", user.name); // un nom comme "<% red x%>" reste du texte
logger.configure({ delimiter: { open: "{{", close: "}}" } }); // si <% %> entre en conflit avec un moteur de gabarits
```

## Groupes, chronomètres, tableaux

```js
logger.group("Deploy");
logger.info("Building");
logger.timeStart("upload");
await upload();
logger.timeEnd("upload"); // "upload: 1s 240ms"
logger.groupEnd();

logger.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
logger.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
logger.divider("Results");
```

| Méthode | Rôle |
| --- | --- |
| `group(label?)`, `groupEnd()` | Indente ce qui suit. Les groupes s'imbriquent |
| `timeStart(label?)`, `timeEnd(label?)` | Affiche le temps écoulé. Le libellé vaut `"default"` par défaut |
| `table(rows, options?)` | Affiche des lignes en tableau. Le texte seul vient de `nc.cli.table()` |
| `box(text, options?)` | Affiche un texte dans un cadre, voir `nc.cli.box()` |
| `divider(title?)` | Affiche une ligne horizontale |

Chaque méthode renvoie le logger : `logger.group("Startup").info("Loading config")`.

## Vos propres loggers

```js
const log = logger.create({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200"); // [14:30:05.120] [api] ℹ INFO GET /users 200

const db = log.child("db");  // portée "api:db"
db.debug("query took 12ms"); // affiché avec DEBUG=api:db ou DEBUG=api:*

const reqLog = log.child("request", { fields: { requestId: req.id } });
```

`logger.create(options)` renvoie un logger indépendant, avec les mêmes méthodes plus `child(scope, options?)` : mêmes réglages, portée imbriquée, ses `fields` ajoutés à ceux du parent.

## Options

`logger.create(options)` et `logger.configure(options)` acceptent :

| Option | Par défaut | |
| --- | --- | --- |
| `level` | `LOG_LEVEL`, sinon `"info"` | Niveau minimal |
| `scope` | aucune | Affichée comme `[db]`. Les enfants la prolongent (`db:pool`) |
| `timestamp` | `true` | `true` donne `[HH:mm:ss]`, `false` le masque, une chaîne est un motif de [`time.format`](/data/time/) |
| `format` | `LOG_FORMAT`, sinon `"pretty"` | `"json"` : un objet par ligne |
| `colors` | détecté | Force les couleurs |
| `delimiter` | `{ open: "<%", close: "%>" }` | Délimiteurs du balisage |
| `fields` | aucun | Ajoutés à chaque enregistrement JSON |
| `redact` | aucune | Clés dont les valeurs sont masquées |
| `onLog` | aucun | Appelé pour chaque message qui passe le niveau |
| `file` | aucun | Un chemin, ou `{ path, maxSize, maxFiles, mode }` |
| `stdout`, `stderr` | `process.stdout`, `process.stderr` | Tout objet avec `write(text)` |

## Logs JSON

```js
const log = logger.create({ format: "json", fields: { service: "billing", version: "2.3.0" } });
log.error("charge failed", { orderId: 42 }, error);
```

```json
{"time":"2026-09-11T14:30:05.120Z","level":"error","service":"billing","version":"2.3.0","orderId":42,"err":{"name":"Error","message":"card declined","stack":"Error: card declined\n    at ..."},"msg":"charge failed"}
```

Les objets simples sont fusionnés dans l'enregistrement, les erreurs vont sous `err`, le reste devient `msg`. Un objet logué ne peut pas remplacer `time`, `level`, `scope` ni `msg`. `LOG_FORMAT=json` bascule le logger par défaut sans code.

## Masquage

```js
logger.configure({ redact: ["password", "authorization"] });
logger.info("login", { user: "ada", password: "hunter2", headers: { Authorization: "Bearer abc" } });
```

```text
[14:30:05] ℹ INFO login {
             "user": "ada",
             "password": "[redacted]",
             "headers": {
               "Authorization": "[redacted]"
             }
           }
```

Les clés sont trouvées à toute profondeur, sans tenir compte de la casse, dans le terminal, les enregistrements JSON et les fichiers. Seules les clés sont examinées : un secret écrit dans une chaîne est affiché.

## Transmettre les logs

```js
const log = logger.create({
  onLog(entry) {
    if (entry.level === "error" || entry.level === "fatal") alerts.send(entry.scope, entry.message);
  },
});
```

| Champ de l'entrée | |
| --- | --- |
| `time` | Une `Date` |
| `level` | Le niveau : `success()` donne `"info"` |
| `kind` | La méthode appelée : `success()` donne `"success"` |
| `scope` | La portée, ou `undefined` |
| `message` | La ligne telle qu'écrite, sans couleurs ni horodatage, masquée |
| `args` | Les arguments tels que passés, non masqués |

`onLog` n'est pas attendu. Une erreur qu'il lève, ou une promesse qu'il rejette, est ignorée.

## Fichiers de log

```js
logger.configure({ file: { path: "logs/app.log", maxSize: "10MB", maxFiles: 5 } });
```

| Option de `file` | Par défaut | |
| --- | --- | --- |
| `path` | obligatoire | Les dossiers sont créés. Un chemin relatif part du dossier de travail : passez `nc.fs.resolve("./logs/app.log")` pour un chemin à côté du fichier appelant |
| `maxSize` | pas de rotation | Au-delà de cette taille, `app.log` devient `app.log.1` |
| `maxFiles` | `5` | Fichiers tournés conservés |
| `mode` | `0o600` | Permissions d'un nouveau fichier. Un fichier existant garde les siennes. Ignoré sous Windows |

Les couleurs sont retirées dans les fichiers.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.log()`, `nc.trace()`, `nc.debug()`, `nc.info()`, `nc.success()`, `nc.warn()`, `nc.error()`, `nc.fatal()` | `nc.logger.log()`, `nc.logger.trace()`... le même nom sous `nc.logger` |
| `nc.group()`, `nc.groupEnd()`, `nc.timeStart()`, `nc.timeEnd()` | `nc.logger.group()`, `nc.logger.groupEnd()`, `nc.logger.timeStart()`, `nc.logger.timeEnd()` |
| `nc.table()`, `nc.box()`, `nc.divider()` | `nc.logger.table()`, `nc.logger.box()`, `nc.logger.divider()` |
| `nc.setLevel()`, `nc.getLevel()`, `nc.isLevelEnabled()`, `nc.configure()` | `nc.logger.setLevel()`, `nc.logger.getLevel()`, `nc.logger.isLevelEnabled()`, `nc.logger.configure()` |
| `nc.setTimestamp(value)`, `nc.logger.setTimestamp(value)` | `nc.logger.configure({ timestamp: value })` |
| `nc.setDelimiter(value)`, `nc.logger.setDelimiter(value)` | `nc.logger.configure({ delimiter: value })` |
| `nc.createLogger()`, `nc.logger.createLogger()` | `nc.logger.create()` |

Les anciens noms fonctionnent encore en 3.0, avertissent une fois et disparaissent en 4.0 : voir [Passer à la 3.0](/help/upgrade-3-0/).
