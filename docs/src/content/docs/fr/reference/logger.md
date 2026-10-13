---
title: "nc.logger"
description: "Un logger pour la console qui fonctionne sans aucune configuration : niveaux, couleurs, un petit balisage pour le style, groupes, chronomètres et tableaux. En production, passez à un objet JSON par ligne avec `LOG_FORMAT=json`, et écrivez dans des fichiers avec rotation si besoin."
sidebar:
  label: "logger"
  order: 1
---

Balisage : `<% red bold Error:%> disk is full`. Tous les noms de style fonctionnent, ainsi que `#ff8800`, `bg#1e1e2e`, `rgb(255, 128, 0)` et `bgRgb(...)`.

Niveaux, du plus bavard au plus grave : `trace`, `debug`, `info`, `warn`, `error`, `fatal`. Le niveau par défaut est `info` ; `LOG_LEVEL` le change. `DEBUG=1` affiche les messages de débogage, et `DEBUG=db,http:*` uniquement les messages debug et trace des loggers qui ont ces portées. Les avertissements et les erreurs vont sur stderr.

```js
const { logger } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const logger = require("@ix-xs/node-comfort/logger");
```

Ces fonctions existent aussi à la racine : `nc.log()` équivaut à `nc.logger.log()`.

Cette page liste tout ce que contient `nc.logger`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/essentials/logger/).

```js
nc.info("Server listening on port 3000");
nc.warn("Cache is almost full");
nc.error(new Error("Payment failed", { cause: err }));
nc.log("<% cyan bold Tip:%> press <% bgWhite black  q  %> to quit");
```

## log

```ts
log(...args: unknown[]): typeof nc.logger
```

Affiche un message sans badge. Les chaînes acceptent le balisage, les objets sont mis en forme, et plusieurs arguments sont joints par des espaces.

```js
nc.log("<% green ✔ Saved%> in <% bold 12ms%>");
nc.log("user:", { id: 1, roles: ["admin"] });
```

## trace

```ts
trace(...args: unknown[]): typeof nc.logger
```

Diagnostic très détaillé, affiché uniquement au niveau `trace`.

## debug

```ts
debug(...args: unknown[]): typeof nc.logger
```

Diagnostic pour les développeurs, affiché au niveau `debug` (le niveau par défaut quand `DEBUG` est défini).

```js
nc.debug("cache miss", { key });
```

## info

```ts
info(...args: unknown[]): typeof nc.logger
```

Un message d'information.

```js
nc.info("Server listening on http://localhost:3000");
```

## success

```ts
success(...args: unknown[]): typeof nc.logger
```

Un message de succès.

```js
nc.success("Database connected");
```

## warn

```ts
warn(...args: unknown[]): typeof nc.logger
```

Un avertissement, écrit sur stderr.

## error

```ts
error(...args: unknown[]): typeof nc.logger
```

Une erreur, écrite sur stderr. Les objets d'erreur affichent leur pile d'appels et leur chaîne de causes.

```js
nc.error(new Error("Cannot save order", { cause: dbError }));
```

## fatal

```ts
fatal(...args: unknown[]): typeof nc.logger
```

Une erreur fatale, écrite sur stderr. Elle n'arrête pas le processus ; appelez vous-même `process.exit(1)` si c'est ce que vous voulez.

## group

```ts
group(label?: string): typeof nc.logger
```

Affiche un libellé et indente ce qui suit, jusqu'à `groupEnd()`. Les groupes s'imbriquent.

```js
nc.group("Startup").info("Loading config");
nc.group("Database").success("Connected").groupEnd();
nc.groupEnd();
```

## groupEnd

```ts
groupEnd(): typeof nc.logger
```

Ferme le groupe en cours.

## timeStart

```ts
timeStart(label?: string): typeof nc.logger
```

Démarre un chronomètre nommé. `timeEnd()` affiche le temps écoulé.

| Paramètre | Type | Description |
| --- | --- | --- |
| `label?` | `string` | Par défaut : `"default"`. |

```js
nc.timeStart("import");
await importProducts();
nc.timeEnd("import"); // "import: 1s 240ms"
```

## timeEnd

```ts
timeEnd(label?: string): typeof nc.logger
```

Affiche le temps écoulé depuis `timeStart()` avec le même libellé.

| Paramètre | Type | Description |
| --- | --- | --- |
| `label?` | `string` | Par défaut : `"default"`. |

## table

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): typeof nc.logger
```

Affiche des lignes sous forme de tableau.

```js
nc.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
```

## box

```ts
box(text: string, options?: BoxOptions): typeof nc.logger
```

Affiche du texte dans un cadre. Pratique pour les bannières de démarrage.

```js
nc.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
```

## divider

```ts
divider(title?: string): typeof nc.logger
```

Affiche une ligne horizontale, avec un titre facultatif à l'intérieur.

## setLevel

```ts
setLevel(level: LogLevel): typeof nc.logger
```

Définit le niveau minimal.

**Lève** `RangeError` : Pour un niveau inconnu.

```js
nc.setLevel("warn");   // avertissements et erreurs uniquement
nc.setLevel("silent"); // rien
```

## getLevel

```ts
getLevel(): LogLevel
```

Le niveau minimal actuel.

## isLevelEnabled

```ts
isLevelEnabled(level: LogLevel): boolean
```

Ce niveau serait-il affiché ? Servez-vous-en pour éviter de construire une sortie de débogage coûteuse.

```js
if (nc.isLevelEnabled("debug")) nc.debug(buildHugeReport());
```

## configure

```ts
configure(options: LoggerOptions): typeof nc.logger
```

Modifie plusieurs réglages à la fois.

```js
nc.configure({ level: "debug", file: "logs/app.log" });
nc.configure({ format: "json", fields: { service: "api" } });
```

## setTimestamp

```ts
setTimestamp(value: string | boolean): typeof nc.logger
```

Affiche ou masque les horodatages, ou définit leur motif.

```js
nc.setTimestamp(false);
nc.setTimestamp("YYYY-MM-DD HH:mm:ss.SSS");
```

## setDelimiter

```ts
setDelimiter(options?: { open?: string; close?: string; } | undefined): typeof nc.logger
```

Change les délimiteurs du balisage, pour les cas où `<%` entre en conflit avec un moteur de templates.

```js
nc.setDelimiter({ open: "{{", close: "}}" });
nc.log("{{red Hello}} world");
```

## createLogger

```ts
createLogger(options?: LoggerOptions): Logger
```

Crée un logger avec ses propres réglages.

```js
const log = nc.createLogger({ scope: "api", timestamp: "HH:mm:ss.SSS" });
log.info("GET /users 200"); // [14:30:05.120] [api] ℹ INFO GET /users 200
log.child("db").debug("query took 12ms");

const prod = nc.createLogger({ format: "json", fields: { service: "billing" } });
prod.error("charge failed", { orderId: 42 }, error);
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { LogEntry } from "@ix-xs/node-comfort"`.

### LogEntry

Un message tel que `onLog` le reçoit.

| Propriété | Type | Description |
| --- | --- | --- |
| `time` | `Date` |  |
| `level` | [`LogLevel`](#loglevel) |  |
| `kind` | `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal" \| "log" \| "success"` | La méthode qui a été appelée. |
| `scope` | `string` |  |
| `message` | `string` | La ligne telle qu'elle est écrite, sans couleurs ni horodatage. |
| `args` | `unknown[]` | Ce qui a été passé à la méthode, tel quel. |

### LogFileOptions

Écriture des logs dans un fichier.

| Propriété | Type | Description |
| --- | --- | --- |
| `path` | `string` | Le fichier à la suite duquel écrire. Les dossiers sont créés, les couleurs retirées. |
| `maxSize?` | `string \| number` | Rotation au-delà de cette taille, comme `"10MB"`. |
| `maxFiles?` | `number` | Nombre de fichiers de rotation à conserver. Par défaut : `5`. |

### Logger

Un logger créé par `createLogger()`. Chaque méthode renvoie le logger, les appels peuvent donc s'enchaîner.

| Propriété | Type | Description |
| --- | --- | --- |
| `log` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message simple, sans badge. Accepte le balisage. |
| `trace` | `(...args: unknown[]) => `[`Logger`](#logger) | Diagnostic très détaillé, masqué sauf si le niveau est `trace`. |
| `debug` | `(...args: unknown[]) => `[`Logger`](#logger) | Diagnostic, masqué sauf si le niveau est `debug` ou inférieur. |
| `info` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message `ℹ INFO`. |
| `success` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message `✔ OK`. |
| `warn` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message `⚠ WARN`, sur stderr. |
| `error` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message `✖ ERROR`, sur stderr. Les erreurs affichent leur pile d'appels et leur cause. |
| `fatal` | `(...args: unknown[]) => `[`Logger`](#logger) | Un message `✖ FATAL`, sur stderr. |
| `group` | `(label?: string) => `[`Logger`](#logger) | Affiche un libellé et indente ce qui suit. Les groupes s'imbriquent. |
| `groupEnd` | `() => `[`Logger`](#logger) | Ferme le groupe en cours. |
| `timeStart` | `(label?: string) => `[`Logger`](#logger) | Démarre un chronomètre nommé. |
| `timeEnd` | `(label?: string) => `[`Logger`](#logger) | Affiche le temps écoulé depuis `timeStart(label)`. |
| `table` | `(rows: ``Record``<string, unknown>[] \| unknown[][], options?: `[`TableOptions`](/reference/cli/#tableoptions)`) => `[`Logger`](#logger) | Affiche des lignes sous forme de tableau. |
| `box` | `(text: string, options?: `[`BoxOptions`](/reference/cli/#boxoptions)`) => `[`Logger`](#logger) | Affiche du texte dans un cadre. |
| `divider` | `(title?: string) => `[`Logger`](#logger) | Affiche une ligne horizontale. |
| `child` | `(scope: string, options?: `[`LoggerOptions`](#loggeroptions)`) => `[`Logger`](#logger) | Un logger avec les mêmes réglages et une portée imbriquée. Ses `fields` s'ajoutent à ceux du parent. |
| `setLevel` | `(level: `[`LogLevel`](#loglevel)`) => `[`Logger`](#logger) | Change le niveau minimal. |
| `getLevel` | `() => `[`LogLevel`](#loglevel) | Le niveau minimal actuel. |
| `isLevelEnabled` | `(level: `[`LogLevel`](#loglevel)`) => boolean` | Ce niveau serait-il affiché ? Évitez une sortie de débogage coûteuse quand ce n'est pas le cas. |
| `configure` | `(options: `[`LoggerOptions`](#loggeroptions)`) => `[`Logger`](#logger) | Modifie plusieurs réglages à la fois. |

### LoggerOptions

Options de `createLogger()` et `configure()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `level?` | [`LogLevel`](#loglevel) | Masque les messages en dessous de ce niveau. Par défaut : `LOG_LEVEL`, sinon `"info"`. |
| `scope?` | `string` | Affichée avant chaque message, comme `[db]`. Les loggers enfants la prolongent (`db:pool`). |
| `timestamp?` | `string \| boolean` | `true` affiche `[HH:mm:ss]`, `false` le masque, une chaîne est un motif `time.format`. Par défaut : `true`. |
| `format?` | `"pretty" \| "json"` | `"json"` écrit un objet par ligne, pour les collecteurs de logs. Par défaut : `LOG_FORMAT`, sinon `"pretty"`. |
| `delimiter?` | `{ open?: string; close?: string; }` | Délimiteurs du balisage. Par défaut : `<%` et `%>`. |
| `colors?` | `boolean` | Force l'activation ou la désactivation des couleurs. Par défaut, cela dépend du terminal. |
| `stdout?` | [`LogStream`](#logstream) | Destination des niveaux `trace` à `info`. Par défaut : `process.stdout`. |
| `stderr?` | [`LogStream`](#logstream) | Destination de `warn`, `error` et `fatal`. Par défaut : `process.stderr`. |
| `file?` | `string \| `[`LogFileOptions`](#logfileoptions) | Écrit aussi chaque message dans un fichier. |
| `fields?` | `Record``<string, unknown>` | Ajoutés à chaque enregistrement JSON, comme un nom de service. |
| `redact?` | `string[]` | Clés dont les valeurs sont remplacées par `"[redacted]"` partout où elles apparaissent dans les objets journalisés, comme `["password", "authorization"]`. La casse n'a pas d'importance. |
| `onLog?` | `((entry: `[`LogEntry`](#logentry)`) => void \| ``Promise``<void>)` | Appelé pour chaque message qui passe le niveau, pour envoyer les logs ailleurs. Il n'est pas attendu, et une erreur qu'il lève (ou une promesse qu'il rejette) est ignorée : la journalisation ne casse jamais le programme. |

### LogLevel

Niveaux de log, du plus verbeux au plus grave. `silent` masque tout.

```ts
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"
```

### LogStream

Destination des logs : `process.stdout`, un stream de fichier, ou tout objet doté d'une méthode `write(text)`.

| Propriété | Type | Description |
| --- | --- | --- |
| `write` | `(text: string) => unknown` |  |
