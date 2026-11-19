---
title: "Passer à la 3.0"
description: "La 3.0 donne un seul nom à chaque fonction, `nc.<namespace>.<membre>`. Les noms de la 2.x fonctionnent jusqu'à la 4.0 et avertissent une fois. Chaque ancien nom, son remplaçant, et les changements de comportement."
---

| | |
| --- | --- |
| Anciens noms | Ils fonctionnent comme en 2.2, avertissent une fois chacun, et disparaissent en 4.0. Remplacez-les à votre rythme |
| Changements de comportement | Quelques-uns, listés plus bas : lisez-les avant de mettre à jour |
| Node.js | Les mêmes versions qu'en 2.2 : 22.23.4, 24.22.1, 26.12.1 ou plus |
| Types | Les anciens noms sont marqués `@deprecated` : les éditeurs les barrent |

```bash
npm install @ix-xs/node-comfort@3
```

## Trouver les anciens noms

Chaque ancien nom affiche un `DeprecationWarning` la première fois qu'il sert, avec son remplaçant :

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

```bash
# où chaque ancien nom est utilisé
node --trace-deprecation app.js

# faire échouer les tests au premier ancien nom
NODE_OPTIONS=--throw-deprecation npm test
```

```js
// les relever dans une application qui tourne
process.on("warning", (warning) => {
  if (warning.code?.startsWith("NODE_COMFORT_DEP_")) nc.logger.warn(warning.message);
});
```

Un avertissement n'apparaît que pour le code qui s'exécute. Pour trouver tous les appels, cherchez dans le code les noms des tables ci-dessous, ou ouvrez les fichiers dans un éditeur, qui barre les noms `@deprecated`.

## Changements de comportement

| Où | 2.2 | 3.0 |
| --- | --- | --- |
| Langue | `num` et `time` avaient chacun leur langue | Un seul réglage partagé, `nc.config` : `num.setLocale()` change aussi la langue de `time`. `str.plural()` et `arr.toSentence()` le suivent aussi (anglais tant qu'il n'est pas défini) |
| `nc.config.set()` | Nouveau | Vérifie la langue et le fuseau, et lève `RangeError` ou `TypeError`. `num.setLocale()` et `time.setLocale()` acceptent toujours tout |
| `fs.copy()`, `fs.move()` d'un fichier | Vers un dossier existant ou un `dest` qui finit par `/` : `move` remplaçait tout le dossier par le fichier, `copy` écrivait un fichier nommé comme le chemin du dossier, ou écrasait sans rien dire | Le fichier va dans le dossier, avec son nom |
| `fs.remove()`, `fs.copy()`, `fs.move()` avec `""` | Un chemin vide valait le dossier de travail : `remove("")` pouvait le supprimer | Refusé : renvoie `false`. Écrivez `"."` pour le dossier du fichier appelant |
| Questions de `cli` sur une entrée fermée | `Error` | `AbortError` avec `code: "ERR_INPUT_CLOSED"` |
| `env.load(file, { required: true })` | `Error` pour un fichier absent | `NodeComfortError` avec `code: "ERR_ENV_FILE_MISSING"` |
| `sys.open()` d'un chemin absent | `Error` | `NodeComfortError` avec `code: "ERR_NOT_FOUND"` |
| `cli.args()` sur une ligne de commande invalide | `TypeError` | `TypeError` avec `code: "ERR_CLI_ARGS"` |
| `async.when({ timeout: Infinity })` | Déclenchait son délai après environ 1 ms | Sans limite |
| `crypto.totpURI()` | L'algorithme tel quel | L'algorithme en capitales (`SHA256`), comme l'attendent les applications d'authentification |

Chaque nouvelle erreur reste une `instanceof Error`, avec le même message : le code qui teste `error.message` ou `instanceof Error` continue de fonctionner.

## Où sont passés les anciens noms

Chaque table liste les anciens noms, à la racine (`nc.info()`) et dans leur namespace de la 2.2 (`nc.fs.readFile()`), avec ce qu'il faut écrire à la place.

### logger

| 2.2 | 3.0 |
| --- | --- |
| `nc.log()`, `nc.trace()`, `nc.debug()`, `nc.info()`, `nc.success()`, `nc.warn()`, `nc.error()`, `nc.fatal()` | Le même nom sous `nc.logger` : `nc.logger.info()` |
| `nc.group()`, `nc.groupEnd()`, `nc.timeStart()`, `nc.timeEnd()`, `nc.table()`, `nc.box()`, `nc.divider()` | Le même nom sous `nc.logger` |
| `nc.setLevel()`, `nc.getLevel()`, `nc.isLevelEnabled()`, `nc.configure()` | Le même nom sous `nc.logger` |
| `nc.setTimestamp(value)`, `nc.logger.setTimestamp(value)` | `nc.logger.configure({ timestamp: value })` |
| `nc.setDelimiter(value)`, `nc.logger.setDelimiter(value)` | `nc.logger.configure({ delimiter: value })` |
| `nc.createLogger()`, `nc.logger.createLogger()` | `nc.logger.create()` |

### fs

| 2.2 | 3.0 |
| --- | --- |
| `nc.readFile()`, `nc.fs.readFile()` | `nc.fs.read()` |
| `nc.writeFile()`, `nc.fs.writeFile()` | `nc.fs.write()` |
| `nc.appendFile()`, `nc.fs.appendFile()` | `nc.fs.append()` |
| `nc.fileSize()`, `nc.folderSize()`, `nc.fs.fileSize()`, `nc.fs.folderSize()` | `nc.fs.size()` |
| `nc.hashFile()`, `nc.fs.hashFile()` | `nc.fs.hash()` |
| `nc.getFilesIn(folder)`, `nc.fs.getFilesIn(folder)` | `nc.fs.list(folder)` |
| `nc.getFoldersIn(folder)`, `nc.fs.getFoldersIn(folder)` | `nc.fs.list(folder, { type: "folders" })` |
| `nc.copyFile()`, `nc.copyFolder()`, `nc.copyFilesIn()`, `nc.copyFoldersIn()`, et sous `nc.fs` | `nc.fs.copy(source, dest, options)` |
| `nc.moveFile()`, `nc.moveFolder()`, `nc.moveFilesIn()`, `nc.moveFoldersIn()`, et sous `nc.fs` | `nc.fs.move(source, dest, options)` |
| `nc.deleteFile()`, `nc.deleteFolder()`, et sous `nc.fs` | `nc.fs.remove(path)` |
| `nc.deleteFilesIn(folder, recursive, filter)`, `nc.deleteFoldersIn(folder, filter)`, et sous `nc.fs` | `nc.fs.remove(folder, { filter })` |
| `nc.emptyFolder(folder)`, `nc.fs.emptyFolder(folder)` | `nc.fs.remove(folder, { contents: true })` |
| `nc.createFile()`, `nc.fs.createFile()` | `nc.fs.ensureFile()`, ou `nc.fs.write()` pour lui donner un contenu |
| `nc.createFolder()`, `nc.fs.createFolder()` | `nc.fs.ensureFolder()` |
| `nc.tempFolder()`, `nc.fs.tempFolder()` | `nc.fs.temp()` |
| `nc.createPath()`, `nc.fs.createPath()` | `nc.fs.resolve()` |
| `nc.getFile(path)`, `nc.fs.getFile(path)` | `nc.fs.isFile(path) ? nc.fs.resolve(path) : undefined` |
| `nc.getFolder(path)`, `nc.fs.getFolder(path)` | `nc.fs.isFolder(path) ? nc.fs.resolve(path) : undefined` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |
| `nc.readJSON()`, `nc.readLines()`, `nc.writeJSON()`, `nc.exists()`, `nc.isFile()`, `nc.isFolder()`, `nc.stat()`, `nc.glob()`, `nc.find()`, `nc.findUp()`, `nc.ensureFile()`, `nc.ensureFolder()`, `nc.touch()`, `nc.copy()`, `nc.move()`, `nc.remove()`, `nc.sanitizeFilename()`, `nc.watch()` | Le même nom sous `nc.fs` |

Là où la nouvelle fonction a un autre contrat :

| 2.2 | 3.0 |
| --- | --- |
| `fileSize()` d'un dossier : `undefined` | `size()` d'un dossier : le total de ses fichiers |
| `createFile()`, `createFolder()` : `false` quand le chemin existait ou en cas d'échec, `force` pour remplacer | `ensureFile()`, `ensureFolder()` : gardent ce qui existe, renvoient le chemin absolu, lèvent en cas d'échec |
| Les fonctions `*In` renvoyaient combien d'éléments étaient copiés, déplacés ou supprimés | `copy()`, `move()`, `remove()` renvoient `true` ou `false` |
| `copyFile()`, `copyFolder()`... prenaient un seul objet, `{ path, dest }` | `copy(source, dest, options)` |

### is et assert

`nc.checker` devient `nc.is` et `nc.assert`. Chaque vérification perd son préfixe `is` et s'écrit en camel case, les acronymes comme un seul mot :

| 2.2, à la racine et dans `nc.checker` | 3.0 |
| --- | --- |
| `nc.isArray()` | `nc.is.array()` |
| `nc.isNumber()` | `nc.is.number()` |
| `nc.isFinite()` | `nc.is.finite()` |
| `nc.isInteger()` | `nc.is.integer()` |
| `nc.isSafeInteger()` | `nc.is.safeInteger()` |
| `nc.isFloat()` | `nc.is.float()` |
| `nc.isPositive()` | `nc.is.positive()` |
| `nc.isNegative()` | `nc.is.negative()` |
| `nc.isBoolean()` | `nc.is.boolean()` |
| `nc.isString()` | `nc.is.string()` |
| `nc.isSymbol()` | `nc.is.symbol()` |
| `nc.isBigInt()` | `nc.is.bigInt()` |
| `nc.isUndefined()` | `nc.is.undefined()` |
| `nc.isNull()` | `nc.is.null()` |
| `nc.isNil()` | `nc.is.nil()` |
| `nc.isDefined()` | `nc.is.defined()` |
| `nc.isPrimitive()` | `nc.is.primitive()` |
| `nc.isFunction()` | `nc.is.function()` |
| `nc.isAsyncFunction()` | `nc.is.asyncFunction()` |
| `nc.isGeneratorFunction()` | `nc.is.generatorFunction()` |
| `nc.isGenerator()` | `nc.is.generator()` |
| `nc.isClass()` | `nc.is.class()` |
| `nc.isObject()` | `nc.is.object()` |
| `nc.isPlainObject()` | `nc.is.plainObject()` |
| `nc.isPromise()` | `nc.is.promise()` |
| `nc.isRegExp()` | `nc.is.regExp()` |
| `nc.isDate()` | `nc.is.date()` |
| `nc.isValidDate()` | `nc.is.validDate()` |
| `nc.isMap()` | `nc.is.map()` |
| `nc.isSet()` | `nc.is.set()` |
| `nc.isWeakMap()` | `nc.is.weakMap()` |
| `nc.isWeakSet()` | `nc.is.weakSet()` |
| `nc.isIterable()` | `nc.is.iterable()` |
| `nc.isAsyncIterable()` | `nc.is.asyncIterable()` |
| `nc.isBuffer()` | `nc.is.buffer()` |
| `nc.isTypedArray()` | `nc.is.typedArray()` |
| `nc.isError()` | `nc.is.error()` |
| `nc.isEmpty()` | `nc.is.empty()` |
| `nc.isBlank()` | `nc.is.blank()` |
| `nc.isArrayOf()` | `nc.is.arrayOf()` |
| `nc.isOneOf()` | `nc.is.oneOf()` |
| `nc.isEmail()` | `nc.is.email()` |
| `nc.isURL()` | `nc.is.url()` |
| `nc.isUUID()` | `nc.is.uuid()` |
| `nc.isJSON()` | `nc.is.json()` |
| `nc.isNumeric()` | `nc.is.numeric()` |
| `nc.isIP()` | `nc.is.ip()` |
| `nc.isIPv4()` | `nc.is.ipv4()` |
| `nc.isIPv6()` | `nc.is.ipv6()` |
| `nc.isPort()` | `nc.is.port()` |
| `nc.isHex()` | `nc.is.hex()` |
| `nc.isHexColor()` | `nc.is.hexColor()` |
| `nc.isBase64()` | `nc.is.base64()` |
| `nc.isSemver()` | `nc.is.semver()` |
| `nc.isISODate()` | `nc.is.isoDate()` |
| `nc.isSlug()` | `nc.is.slug()` |
| `nc.isAlpha()` | `nc.is.alpha()` |
| `nc.isAlphanumeric()` | `nc.is.alphanumeric()` |
| `nc.isCreditCard()` | `nc.is.creditCard()` |
| `nc.isJWT()` | `nc.is.jwt()` |
| `nc.isHostname()` | `nc.is.hostname()` |
| `nc.isMACAddress()` | `nc.is.macAddress()` |
| `nc.isIBAN()` | `nc.is.iban()` |
| `nc.isE164()` | `nc.is.e164()` |
| `nc.isObjectId()` | `nc.is.objectId()` |
| `nc.isULID()` | `nc.is.ulid()` |
| `nc.isDataURL()` | `nc.is.dataUrl()` |
| `nc.isMimeType()` | `nc.is.mimeType()` |
| `nc.isTimeZone()` | `nc.is.timeZone()` |
| `nc.isLocale()` | `nc.is.locale()` |
| `nc.isCron()` | `nc.is.cron()` |
| `nc.isASCII()` | `nc.is.ascii()` |
| `nc.checker.assert()` | `nc.assert()` |
| `nc.assertType(value, guard)`, `nc.checker.assertType(value, guard)` | `nc.assert.type(value, guard)` |
| `nc.checker` | `nc.is` et `nc.assert` |
| `nc.obj.isEmpty()` | `nc.is.empty()` |

`nc.is.empty()` renvoie `false` pour les nombres, les booléens et les autres valeurs qui ne sont pas des conteneurs, là où `nc.obj.isEmpty()` renvoyait `true`. Les options et les gardes de type de chaque vérification sont inchangées.

### utils

`nc.utils` disparaît : chaque fonction est passée dans le namespace auquel elle appartient.

| 2.2 | 3.0 |
| --- | --- |
| `nc.wait()`, `nc.utils.wait()` | `nc.async.sleep()` |
| `nc.when()`, `nc.utils.when()` | `nc.async.when()` |
| `nc.dontCrash()`, `nc.utils.dontCrash()` | `nc.sys.dontCrash()` |
| `nc.JSONParse()`, `nc.utils.JSONParse()` | `nc.json.parse()` |
| `nc.JSONString()`, `nc.utils.JSONString()` | `nc.json.stringify()` |

### Classes

| 2.2 | 3.0 |
| --- | --- |
| `new nc.SQLite(path, options)` | `nc.sqlite.open(path, options)` |
| `nc.SQLite` | `nc.sqlite.SQLite` |
| `nc.SQLite.op` | `nc.sqlite.op` |
| `new nc.Cache(options)` | `nc.cache.create(options)` |
| `nc.Cache` | `nc.cache.Cache` |
| `new nc.Emitter()` | `nc.emitter.create()` |
| `nc.Emitter`, `class X extends nc.Emitter` | `nc.emitter.Emitter` |
| `nc.http.HttpError` | `nc.errors.HttpError` |
| `nc.nc`, `nc.nodeComfort` | Le paquet lui-même : `const nc = require("@ix-xs/node-comfort")` |

### Langue et fuseau horaire

| 2.2 | 3.0 |
| --- | --- |
| `nc.num.setLocale(locale)`, `nc.time.setLocale(locale)` | `nc.config.set({ locale })` |
| `nc.num.getLocale()` | `nc.config.get().locale` |
| `nc.time.setTimezone(timeZone)` | `nc.config.set({ timeZone })` |
| `nc.time.getConfig()` | `nc.config.get()` |
| `nc.time.timezones()` | `nc.time.timeZones()` |

### Autres namespaces

| 2.2 | 3.0 |
| --- | --- |
| `nc.env.bool()` | `nc.env.boolean()` |
| `nc.id.hash()` | `nc.crypto.hash()` |
| `nc.id.hmac()` | `nc.crypto.hmac()` |
| `nc.id.safeEqual()` | `nc.crypto.safeEqual()` |
| `nc.func.retry()` | `nc.async.retry()` |
| `nc.func.timeout()` | `nc.async.timeout()` |
| `nc.func.to()` | `nc.async.to()` |

### Membres des objets

| 2.2 | 3.0 |
| --- | --- |
| `queue.pending` | `queue.activeCount` : tâches en cours |
| `queue.size` | `queue.pendingCount` : tâches en attente |
| `limiter.clearQueue()` | `limiter.clear()` |
| `db.set(table, data, where)` | `db.upsert(table, data, conflict)`, ou `db.get()` puis `db.update()` ou `db.insert()` |
| `db.createTable({ options })` | `db.createTable({ columns })` |

`db.set()` cherchait la ligne par `where` (ou `data.id`) et n'avait besoin d'aucune colonne unique. `db.upsert()` est une seule instruction atomique et exige une clé primaire ou une contrainte d'unicité sur les colonnes `conflict`.

## Points d'entrée

Les points d'entrée de la 2.2 fonctionnent toujours. `@ix-xs/node-comfort/checker` et `@ix-xs/node-comfort/utils` donnent les namespaces dépréciés : utilisez `/is`, `/assert`, `/json`, `/async` et `/sys`. Les nouveaux namespaces ont le leur : `/config`, `/is`, `/assert`, `/json`. `/cache`, `/emitter` et `/sqlite` exportent la classe, comme en 2.2 : voir [Votre éditeur](/start/editor/).

## Ajouts

| | |
| --- | --- |
| Namespaces | `config`, `is`, `assert`, `json`, `cache`, `emitter`, `sqlite` |
| `async` | `when`, `to` ; `activeCount` et `pendingCount` sur les files et les limiteurs ; `clear()` sur les limiteurs |
| `signal` | Chaque question de `cli`, `async.series`, `queue.add`, `cache.getOrSet`, `async.when`, `time.every`, `time.cron` |
| Synonymes | `env.load(file, { overwrite })` à côté de `override` ; `color.create({ level })` à côté de `create(level)` ; `arr.paginate(array, { page, perPage })` ; un nom de propriété pour `arr.count`, `partition`, `remove`, `takeWhile`, `dropWhile` ; `false` ou `Infinity` pour « sans limite » ; `jitter: true` (retry) ou un nombre (http) ; `"80ms"` pour l'`interval` de `cli.spinner` |
| Enchaînement | `stop()` renvoie la tâche ou le watcher ; `cache.clear()` renvoie le cache ; `off()` sur les watchers et les tâches de `when` |
