---
title: "Logger"
description: "`nc.logger` affiche des logs lisibles et colorés en développement et du JSON structuré en production, sans aucune configuration. Ses fonctions sont aussi disponibles à la racine : `nc.info()` équivaut à `nc.logger.info()`."
sidebar:
  order: 1
---

```js
nc.info("Server listening on port 3000");
nc.success("Database connected");
nc.warn("Cache is almost full");
nc.error(new Error("Payment failed"));
```

```text
[14:30:05] ℹ INFO Server listening on port 3000
[14:30:05] ✔ OK Database connected
[14:30:05] ⚠ WARN Cache is almost full
[14:30:05] ✖ ERROR Error: Payment failed
               at charge (/app/billing.js:42:11)
```

## Niveaux

Du plus bavard au plus grave : `trace`, `debug`, `info`, `warn`, `error`, `fatal`. `log` et `success` s'affichent au niveau `info`. Les messages situés sous le niveau courant sont ignorés.

Le niveau par défaut est `info`. Changez-le avec `LOG_LEVEL=warn`, ou dans le code :

```js
nc.setLevel("debug");
nc.setLevel("silent"); // plus rien du tout

if (nc.isLevelEnabled("debug")) nc.debug(buildExpensiveReport());
```

`warn`, `error` et `fatal` partent sur stderr, le reste sur stdout. `fatal` n'arrête pas le processus : appelez `process.exit(1)` si c'est ce que vous voulez.

## Messages de débogage

Les messages de débogage restent masqués tant que vous ne les demandez pas, pour tout le programme ou pour les loggers que vous nommez :

```js
const db = nc.createLogger({ scope: "db" });
db.debug("SELECT * FROM users"); // masqué par défaut
```

```bash
DEBUG=1 node app.js           # tous les loggers, comme avec LOG_LEVEL=debug
DEBUG=db node app.js          # le logger "db" uniquement
DEBUG=db,http:* node app.js   # "db", et les enfants de "http"
DEBUG=http*,-http:static node app.js
```

`DEBUG=1` (ou `true`, `yes`, `on`, `*`) fait passer le niveau par défaut à `debug`, tout comme `NODE_DEBUG`, quelle que soit sa valeur. `LOG_LEVEL` l'emporte s'il est défini lui aussi.

Toute autre valeur de `DEBUG` est une liste de portées, séparées par des virgules ou des espaces. `*` remplace n'importe quoi et un `-` placé en tête exclut. Les loggers ainsi désignés affichent leurs messages `debug` et `trace` quel que soit leur niveau, sauf si ce niveau est `silent`. Les autres ne changent pas, pas plus qu'un logger sans portée, comme `nc.debug()`.

Un motif doit correspondre à la portée entière : `http:*` correspond à `http:router` mais pas à `http`, alors que `http*` correspond aux deux.

## Erreurs et objets

Passez ce que vous voulez. Les objets sont mis en forme, et les erreurs affichent leur pile d'appels et leur chaîne de causes :

```js
nc.info("user:", { id: 1, roles: ["admin"] });
nc.error(new Error("Cannot save order", { cause: dbError }));
```

## Balisage

Mettez en forme des parties d'un message avec `<% styles text%>` :

```js
nc.log("<% green bold ✔ Saved%> in <% dim 12ms%>");
nc.log("<% #ff8800 Orange%> on <% bg#1e1e2e white a dark background%>");
```

Toutes les couleurs et tous les styles de [`nc.color`](/system/color/) fonctionnent, ainsi que `#hex`, `bg#hex`, `rgb(r, g, b)` et `bgRgb(r, g, b)`. Les espaces placés avant `%>` sont conservés et font partie du texte. Si `<%` entre en conflit avec un moteur de templates, changez les délimiteurs avec `nc.setDelimiter({ open: "{{", close: "}}" })`.

## Groupes, chronomètres et tableaux

```js
nc.group("Deploy");
nc.info("Building");
nc.timeStart("upload");
await upload();
nc.timeEnd("upload"); // "upload: 1s 240ms"
nc.groupEnd();

nc.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
nc.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
nc.divider("Results");
```

Chaque fonction renvoie le logger, les appels s'enchaînent donc : `nc.group("Startup").info("Loading config")`.

## Des loggers avec leurs propres réglages

`createLogger()` vous donne un logger indépendant. `child()` en crée un avec les mêmes réglages et une portée imbriquée :

```js
const log = nc.createLogger({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200");        // [14:30:05.120] [api] ℹ INFO GET /users 200

const db = log.child("db");        // portée "api:db"
db.debug("query took 12ms");       // affiché avec DEBUG=api:db ou DEBUG=api:*
```

Un enfant peut porter ses propres `fields`. Ils s'ajoutent à ceux du parent, ce qui rend très simple la création d'un logger par requête :

```js
const reqLog = log.child("request", { fields: { requestId: req.id } });
reqLog.info("payment accepted");   // les enregistrements JSON contiennent requestId
```

## Des logs JSON pour la production

Définissez `LOG_FORMAT=json`, ou passez `format: "json"`, et chaque message devient un objet JSON par ligne, prêt pour Datadog, Loki, CloudWatch et les autres :

```js
const log = nc.createLogger({ format: "json", fields: { service: "billing", version: "2.3.0" } });
log.error("charge failed", { orderId: 42 }, error);
```

```json
{"time":"2026-09-11T14:30:05.120Z","level":"error","service":"billing","version":"2.3.0","orderId":42,"err":{"name":"Error","message":"card declined","stack":"Error: card declined\n    at ..."},"msg":"charge failed"}
```

Les objets simples passés en arguments sont fusionnés dans l'enregistrement, les erreurs vont sous `err`, et tout le reste devient le message.

## Masquer les secrets

Listez les clés qui ne doivent jamais arriver dans un log, et leurs valeurs sont remplacées partout où elles apparaissent dans un objet journalisé :

```js
nc.configure({ redact: ["password", "authorization"] });
nc.info("login", { user: "ada", password: "hunter2", headers: { Authorization: "Bearer abc" } });
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

Les clés sont repérées à n'importe quelle profondeur, sans tenir compte de la casse. Le fonctionnement est le même dans les enregistrements JSON et dans les fichiers de log. Seules les clés sont examinées : un secret écrit à l'intérieur d'une chaîne est affiché tel quel.

## Envoyer les logs ailleurs

`onLog` est appelé pour chaque message qui passe le niveau, une fois ce message écrit. Servez-vous-en pour transmettre les logs à un autre service :

```js
const log = nc.createLogger({
  redact: ["token"],
  onLog(entry) {
    if (entry.level === "error" || entry.level === "fatal") alerts.send(entry.scope, entry.message);
  },
});

log.error("Payment failed", { orderId: 42, token: "abc" });
// entry.message: '✖ ERROR Payment failed {\n  "orderId": 42,\n  "token": "[redacted]"\n}'
```

L'entrée contient `time` (une `Date`), `level`, `kind` (la méthode appelée : `success()` donne donc le kind `"success"` et le niveau `"info"`), `scope`, `message` et `args`. `message` est la ligne telle qu'elle est affichée, sans les couleurs ni l'horodatage. `args` contient les valeurs que vous avez passées, intactes : `redact` ne s'y applique pas.

Une erreur levée par le hook est ignorée, un hook défaillant ne peut donc pas faire tomber le programme. Le hook n'est pas attendu, et une promesse qu'il rejette est ignorée elle aussi.

## Fichiers de log

Écrivez aussi chaque message dans un fichier, avec une rotation selon la taille :

```js
nc.configure({ file: { path: "logs/app.log", maxSize: "10MB", maxFiles: 5 } });
```

Les couleurs sont retirées dans les fichiers. Quand `app.log` dépasse 10 Mo, il devient `app.log.1`, et le fichier le plus ancien au-delà de cinq est supprimé.

## Les réglages en un coup d'œil

`configure()` et `createLogger()` acceptent `level`, `scope`, `timestamp` (`true`, `false` ou un motif [`time.format`](/data/time/)), `format`, `colors`, `file`, `fields`, `redact`, `onLog`, `delimiter`, ainsi que les streams `stdout`/`stderr`. Les couleurs se désactivent d'elles-mêmes quand la sortie n'est pas un terminal ou quand `NO_COLOR` est défini. Toutes les fonctions sont listées dans la [référence](/reference/logger/).
