---
title: "Upgrading to 3.0"
description: "3.0 gives every function one name, `nc.<namespace>.<member>`. The names of 2.x keep working until 4.0 and warn once. Every old name, its replacement, and the behaviour changes."
---

| | |
| --- | --- |
| Old names | They work as in 2.2, warn once each, and are removed in 4.0. Replace them at your pace |
| Behaviour changes | A few, listed below: read them before upgrading |
| Node.js | The same versions as 2.2: 22.23.4, 24.22.1, 26.12.1 or later |
| Types | Old names are marked `@deprecated`: editors strike them through |

```bash
npm install @ix-xs/node-comfort@3
```

## Finding the old names

Each old name prints one `DeprecationWarning` the first time it is used, with its replacement:

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

```bash
# where each old name is used
node --trace-deprecation app.js

# make the tests fail on the first old name
NODE_OPTIONS=--throw-deprecation npm test
```

```js
// collect them in a running application
process.on("warning", (warning) => {
  if (warning.code?.startsWith("NODE_COMFORT_DEP_")) nc.logger.warn(warning.message);
});
```

A warning only appears for code that runs. To find every call, search the code for the names in the tables below, or open the files in an editor, which strikes `@deprecated` names through.

## Behaviour changes

| Where | 2.2 | 3.0 |
| --- | --- | --- |
| Language | `num` and `time` each had their own language | One shared setting, `nc.config`: `num.setLocale()` also changes the language of `time`. `str.plural()` and `arr.toSentence()` follow it too (English until it is set) |
| `nc.config.set()` | New | Checks the language and the zone, and throws `RangeError` or `TypeError`. `num.setLocale()` and `time.setLocale()` still accept anything |
| `fs.copy()`, `fs.move()` of a file | Onto an existing folder or a `dest` ending with `/`: `move` replaced the whole folder by the file, `copy` wrote a file named like the folder path, or overwrote silently | The file goes inside the folder, with its name |
| `fs.remove()`, `fs.copy()`, `fs.move()` with `""` | An empty path was the working directory: `remove("")` could delete it | Refused: returns `false`. Write `"."` for the folder of the calling file |
| `cli` prompts on closed input | `Error` | `AbortError` with `code: "ERR_INPUT_CLOSED"` |
| `env.load(file, { required: true })` | `Error` for a missing file | `NodeComfortError` with `code: "ERR_ENV_FILE_MISSING"` |
| `sys.open()` of a missing path | `Error` | `NodeComfortError` with `code: "ERR_NOT_FOUND"` |
| `cli.args()` on a bad command line | `TypeError` | `TypeError` with `code: "ERR_CLI_ARGS"` |
| `async.when({ timeout: Infinity })` | Fired its timeout after about 1 ms | No limit |
| `crypto.totpURI()` | The algorithm as given | The algorithm in capitals (`SHA256`), as authenticator apps expect |

Every new error is still an `instanceof Error`, with the same message: code that tests `error.message` or `instanceof Error` keeps working.

## Where the old names went

Each table lists the old names, at the root (`nc.info()`) and in their 2.2 namespace (`nc.fs.readFile()`), with what to write instead.

### logger

| 2.2 | 3.0 |
| --- | --- |
| `nc.log()`, `nc.trace()`, `nc.debug()`, `nc.info()`, `nc.success()`, `nc.warn()`, `nc.error()`, `nc.fatal()` | The same name under `nc.logger`: `nc.logger.info()` |
| `nc.group()`, `nc.groupEnd()`, `nc.timeStart()`, `nc.timeEnd()`, `nc.table()`, `nc.box()`, `nc.divider()` | The same name under `nc.logger` |
| `nc.setLevel()`, `nc.getLevel()`, `nc.isLevelEnabled()`, `nc.configure()` | The same name under `nc.logger` |
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
| `nc.copyFile()`, `nc.copyFolder()`, `nc.copyFilesIn()`, `nc.copyFoldersIn()`, and under `nc.fs` | `nc.fs.copy(source, dest, options)` |
| `nc.moveFile()`, `nc.moveFolder()`, `nc.moveFilesIn()`, `nc.moveFoldersIn()`, and under `nc.fs` | `nc.fs.move(source, dest, options)` |
| `nc.deleteFile()`, `nc.deleteFolder()`, and under `nc.fs` | `nc.fs.remove(path)` |
| `nc.deleteFilesIn(folder, recursive, filter)`, `nc.deleteFoldersIn(folder, filter)`, and under `nc.fs` | `nc.fs.remove(folder, { filter })` |
| `nc.emptyFolder(folder)`, `nc.fs.emptyFolder(folder)` | `nc.fs.remove(folder, { contents: true })` |
| `nc.createFile()`, `nc.fs.createFile()` | `nc.fs.ensureFile()`, or `nc.fs.write()` to give it content |
| `nc.createFolder()`, `nc.fs.createFolder()` | `nc.fs.ensureFolder()` |
| `nc.tempFolder()`, `nc.fs.tempFolder()` | `nc.fs.temp()` |
| `nc.createPath()`, `nc.fs.createPath()` | `nc.fs.resolve()` |
| `nc.getFile(path)`, `nc.fs.getFile(path)` | `nc.fs.isFile(path) ? nc.fs.resolve(path) : undefined` |
| `nc.getFolder(path)`, `nc.fs.getFolder(path)` | `nc.fs.isFolder(path) ? nc.fs.resolve(path) : undefined` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |
| `nc.readJSON()`, `nc.readLines()`, `nc.writeJSON()`, `nc.exists()`, `nc.isFile()`, `nc.isFolder()`, `nc.stat()`, `nc.glob()`, `nc.find()`, `nc.findUp()`, `nc.ensureFile()`, `nc.ensureFolder()`, `nc.touch()`, `nc.copy()`, `nc.move()`, `nc.remove()`, `nc.sanitizeFilename()`, `nc.watch()` | The same name under `nc.fs` |

Where the new function has another contract:

| 2.2 | 3.0 |
| --- | --- |
| `fileSize()` of a folder: `undefined` | `size()` of a folder: the total of its files |
| `createFile()`, `createFolder()`: `false` when the path existed or on failure, `force` to replace | `ensureFile()`, `ensureFolder()`: keep what exists, return the absolute path, throw on failure |
| The `*In` functions returned how many were copied, moved or deleted | `copy()`, `move()`, `remove()` return `true` or `false` |
| `copyFile()`, `copyFolder()`... took one object, `{ path, dest }` | `copy(source, dest, options)` |

### is and assert

`nc.checker` becomes `nc.is` and `nc.assert`. Each check loses its `is` prefix and is written in camel case, acronyms as one word:

| 2.2, at the root and in `nc.checker` | 3.0 |
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
| `nc.checker` | `nc.is` and `nc.assert` |
| `nc.obj.isEmpty()` | `nc.is.empty()` |

`nc.is.empty()` returns `false` for numbers, booleans and other values that are not containers, where `nc.obj.isEmpty()` returned `true`. The options and the type guards of every check are unchanged.

### utils

`nc.utils` is gone: each function went to the namespace it belongs to.

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
| `nc.nc`, `nc.nodeComfort` | The package itself: `const nc = require("@ix-xs/node-comfort")` |

### Language and time zone

| 2.2 | 3.0 |
| --- | --- |
| `nc.num.setLocale(locale)`, `nc.time.setLocale(locale)` | `nc.config.set({ locale })` |
| `nc.num.getLocale()` | `nc.config.get().locale` |
| `nc.time.setTimezone(timeZone)` | `nc.config.set({ timeZone })` |
| `nc.time.getConfig()` | `nc.config.get()` |
| `nc.time.timezones()` | `nc.time.timeZones()` |

### Other namespaces

| 2.2 | 3.0 |
| --- | --- |
| `nc.env.bool()` | `nc.env.boolean()` |
| `nc.id.hash()` | `nc.crypto.hash()` |
| `nc.id.hmac()` | `nc.crypto.hmac()` |
| `nc.id.safeEqual()` | `nc.crypto.safeEqual()` |
| `nc.func.retry()` | `nc.async.retry()` |
| `nc.func.timeout()` | `nc.async.timeout()` |
| `nc.func.to()` | `nc.async.to()` |

### Members of objects

| 2.2 | 3.0 |
| --- | --- |
| `queue.pending` | `queue.activeCount`: tasks running |
| `queue.size` | `queue.pendingCount`: tasks waiting |
| `limiter.clearQueue()` | `limiter.clear()` |
| `db.set(table, data, where)` | `db.upsert(table, data, conflict)`, or `db.get()` then `db.update()` or `db.insert()` |
| `db.createTable({ options })` | `db.createTable({ columns })` |

`db.set()` looked the row up by `where` (or `data.id`) and needed no unique column. `db.upsert()` is one atomic statement and needs a primary key or a unique constraint on the `conflict` columns.

## Entry points

The entry points of 2.2 still work. `@ix-xs/node-comfort/checker` and `@ix-xs/node-comfort/utils` give the deprecated namespaces: use `/is`, `/assert`, `/json`, `/async` and `/sys`. The new namespaces have their own: `/config`, `/is`, `/assert`, `/json`. `/cache`, `/emitter` and `/sqlite` export the class, as in 2.2: see [Your editor](/start/editor/).

## Additions

| | |
| --- | --- |
| Namespaces | `config`, `is`, `assert`, `json`, `cache`, `emitter`, `sqlite` |
| `async` | `when`, `to`; `activeCount` and `pendingCount` on queues and limiters; `clear()` on limiters |
| `signal` | Every `cli` prompt, `async.series`, `queue.add`, `cache.getOrSet`, `async.when`, `time.every`, `time.cron` |
| Synonyms | `env.load(file, { overwrite })` besides `override`; `color.create({ level })` besides `create(level)`; `arr.paginate(array, { page, perPage })`; a property name for `arr.count`, `partition`, `remove`, `takeWhile`, `dropWhile`; `false` or `Infinity` for no limit; `jitter: true` (retry) or a number (http); `"80ms"` for the `interval` of `cli.spinner` |
| Chaining | `stop()` returns the task or the watcher; `cache.clear()` returns the cache; `off()` on watchers and `when` tasks |
