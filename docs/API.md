# API reference

> Generated from the type declarations of **@ix-xs/node-comfort** v2.0.0. Your editor shows the same documentation on hover.
> For explanations and examples, see the [guides](https://ix-xs.github.io/node-comfort/).

## Contents

- [Flat helpers](#flat-helpers)
- [nc.logger](#nclogger)
- [nc.fs](#ncfs)
- [nc.checker](#ncchecker)
- [nc.utils](#ncutils)
- [nc.str](#ncstr)
- [nc.num](#ncnum)
- [nc.arr](#ncarr)
- [nc.obj](#ncobj)
- [nc.func](#ncfunc)
- [nc.time](#nctime)
- [nc.id](#ncid)
- [nc.crypto](#nccrypto)
- [nc.color](#nccolor)
- [nc.cli](#nccli)
- [nc.sys](#ncsys)
- [nc.async](#ncasync)
- [nc.schema](#ncschema)
- [nc.http](#nchttp)
- [nc.env](#ncenv)
- [nc.errors](#ncerrors)
- [Class nc.SQLite](#class-ncsqlite)
- [Class nc.Cache](#class-nccache)
- [Class nc.Emitter](#class-ncemitter)

## Flat helpers

These are also available at the top level: `nc.info()`, `import { isEmail } from "@ix-xs/node-comfort"`.

**`nc.logger`**: [`log`](#ncloggerlog) • [`trace`](#ncloggertrace) • [`debug`](#ncloggerdebug) • [`info`](#ncloggerinfo) • [`success`](#ncloggersuccess) • [`warn`](#ncloggerwarn) • [`error`](#ncloggererror) • [`fatal`](#ncloggerfatal) • [`group`](#ncloggergroup) • [`groupEnd`](#ncloggergroupend) • [`timeStart`](#ncloggertimestart) • [`timeEnd`](#ncloggertimeend) • [`table`](#ncloggertable) • [`box`](#ncloggerbox) • [`divider`](#ncloggerdivider) • [`setLevel`](#ncloggersetlevel) • [`getLevel`](#ncloggergetlevel) • [`isLevelEnabled`](#ncloggerislevelenabled) • [`configure`](#ncloggerconfigure) • [`setTimestamp`](#ncloggersettimestamp) • [`setDelimiter`](#ncloggersetdelimiter) • [`createLogger`](#ncloggercreatelogger)

**`nc.fs`**: [`getEnv`](#ncfsgetenv) • [`createPath`](#ncfscreatepath) • [`getFolder`](#ncfsgetfolder) • [`getFile`](#ncfsgetfile) • [`getFoldersIn`](#ncfsgetfoldersin) • [`getFilesIn`](#ncfsgetfilesin) • [`glob`](#ncfsglob) • [`find`](#ncfsfind) • [`readFile`](#ncfsreadfile) • [`readLines`](#ncfsreadlines) • [`readJSON`](#ncfsreadjson) • [`writeFile`](#ncfswritefile) • [`writeJSON`](#ncfswritejson) • [`appendFile`](#ncfsappendfile) • [`createFile`](#ncfscreatefile) • [`createFolder`](#ncfscreatefolder) • [`ensureFolder`](#ncfsensurefolder) • [`ensureFile`](#ncfsensurefile) • [`touch`](#ncfstouch) • [`deleteFolder`](#ncfsdeletefolder) • [`deleteFile`](#ncfsdeletefile) • [`remove`](#ncfsremove) • [`deleteFoldersIn`](#ncfsdeletefoldersin) • [`deleteFilesIn`](#ncfsdeletefilesin) • [`emptyFolder`](#ncfsemptyfolder) • [`copy`](#ncfscopy) • [`move`](#ncfsmove) • [`copyFoldersIn`](#ncfscopyfoldersin) • [`copyFolder`](#ncfscopyfolder) • [`copyFilesIn`](#ncfscopyfilesin) • [`copyFile`](#ncfscopyfile) • [`moveFoldersIn`](#ncfsmovefoldersin) • [`moveFolder`](#ncfsmovefolder) • [`moveFilesIn`](#ncfsmovefilesin) • [`moveFile`](#ncfsmovefile) • [`exists`](#ncfsexists) • [`isFile`](#ncfsisfile) • [`isFolder`](#ncfsisfolder) • [`stat`](#ncfsstat) • [`fileSize`](#ncfsfilesize) • [`folderSize`](#ncfsfoldersize) • [`hashFile`](#ncfshashfile) • [`tempFolder`](#ncfstempfolder) • [`sanitizeFilename`](#ncfssanitizefilename) • [`watch`](#ncfswatch)

**`nc.checker`**: [`isArray`](#nccheckerisarray) • [`isNumber`](#nccheckerisnumber) • [`isFinite`](#nccheckerisfinite) • [`isInteger`](#nccheckerisinteger) • [`isSafeInteger`](#nccheckerissafeinteger) • [`isFloat`](#nccheckerisfloat) • [`isPositive`](#nccheckerispositive) • [`isNegative`](#nccheckerisnegative) • [`isBoolean`](#nccheckerisboolean) • [`isString`](#nccheckerisstring) • [`isSymbol`](#nccheckerissymbol) • [`isBigInt`](#nccheckerisbigint) • [`isUndefined`](#nccheckerisundefined) • [`isNull`](#nccheckerisnull) • [`isNil`](#nccheckerisnil) • [`isDefined`](#nccheckerisdefined) • [`isPrimitive`](#nccheckerisprimitive) • [`isFunction`](#nccheckerisfunction) • [`isAsyncFunction`](#nccheckerisasyncfunction) • [`isGeneratorFunction`](#nccheckerisgeneratorfunction) • [`isGenerator`](#nccheckerisgenerator) • [`isClass`](#nccheckerisclass) • [`isObject`](#nccheckerisobject) • [`isPlainObject`](#nccheckerisplainobject) • [`isPromise`](#nccheckerispromise) • [`isRegExp`](#nccheckerisregexp) • [`isDate`](#nccheckerisdate) • [`isValidDate`](#nccheckerisvaliddate) • [`isMap`](#nccheckerismap) • [`isSet`](#nccheckerisset) • [`isWeakMap`](#nccheckerisweakmap) • [`isWeakSet`](#nccheckerisweakset) • [`isIterable`](#nccheckerisiterable) • [`isAsyncIterable`](#nccheckerisasynciterable) • [`isBuffer`](#nccheckerisbuffer) • [`isTypedArray`](#nccheckeristypedarray) • [`isError`](#nccheckeriserror) • [`isEmpty`](#nccheckerisempty) • [`isBlank`](#nccheckerisblank) • [`isArrayOf`](#nccheckerisarrayof) • [`isOneOf`](#nccheckerisoneof) • [`isEmail`](#nccheckerisemail) • [`isURL`](#nccheckerisurl) • [`isUUID`](#nccheckerisuuid) • [`isJSON`](#nccheckerisjson) • [`isNumeric`](#nccheckerisnumeric) • [`isIP`](#nccheckerisip) • [`isIPv4`](#nccheckerisipv4) • [`isIPv6`](#nccheckerisipv6) • [`isPort`](#nccheckerisport) • [`isHex`](#nccheckerishex) • [`isHexColor`](#nccheckerishexcolor) • [`isBase64`](#nccheckerisbase64) • [`isSemver`](#nccheckerissemver) • [`isISODate`](#nccheckerisisodate) • [`isSlug`](#nccheckerisslug) • [`isAlpha`](#nccheckerisalpha) • [`isAlphanumeric`](#nccheckerisalphanumeric) • [`isCreditCard`](#nccheckeriscreditcard) • [`isJWT`](#nccheckerisjwt) • [`assert`](#nccheckerassert) • [`assertType`](#nccheckerasserttype)

**`nc.utils`**: [`wait`](#ncutilswait) • [`when`](#ncutilswhen) • [`dontCrash`](#ncutilsdontcrash) • [`JSONString`](#ncutilsjsonstring) • [`JSONParse`](#ncutilsjsonparse)

## nc.logger

A console logger that works with zero setup: levels, colors, a small
markup for styling, groups, timers and tables. In production, switch to
one JSON object per line with `LOG_FORMAT=json`, and write to rotating
files if you need to.

Markup: `<% red bold Error:%> disk is full`. Any style name works, plus
`#ff8800`, `bg#1e1e2e`, `rgb(255, 128, 0)` and `bgRgb(...)`.

Levels, from chatty to severe: `trace`, `debug`, `info`, `warn`, `error`,
`fatal`. The default is `info`, or `debug` when `DEBUG` is set; `LOG_LEVEL`
overrides it. Warnings and errors go to stderr.

Import on its own: `require("@ix-xs/node-comfort/logger")`

#### `nc.logger.log()`

```ts
log(...args: unknown[]): typeof nc.logger
```

Prints a message without a badge. Strings support markup, objects are pretty-printed, and several arguments are joined with spaces.

#### `nc.logger.trace()`

```ts
trace(...args: unknown[]): typeof nc.logger
```

Very detailed diagnostics, shown only at the `trace` level.

#### `nc.logger.debug()`

```ts
debug(...args: unknown[]): typeof nc.logger
```

Diagnostics for developers, shown at the `debug` level (the default when `DEBUG` is set).

#### `nc.logger.info()`

```ts
info(...args: unknown[]): typeof nc.logger
```

An informational message.

#### `nc.logger.success()`

```ts
success(...args: unknown[]): typeof nc.logger
```

A success message.

#### `nc.logger.warn()`

```ts
warn(...args: unknown[]): typeof nc.logger
```

A warning, written to stderr.

#### `nc.logger.error()`

```ts
error(...args: unknown[]): typeof nc.logger
```

An error, written to stderr. Error objects show their stack trace and their chain of causes.

#### `nc.logger.fatal()`

```ts
fatal(...args: unknown[]): typeof nc.logger
```

A fatal error, written to stderr. It doesn't stop the process; call `process.exit(1)` yourself if you mean to.

#### `nc.logger.group()`

```ts
group(label?: string): typeof nc.logger
```

Prints a label and indents what follows, until `groupEnd()`. Groups nest.

#### `nc.logger.groupEnd()`

```ts
groupEnd(): typeof nc.logger
```

Closes the current group.

#### `nc.logger.timeStart()`

```ts
timeStart(label?: string): typeof nc.logger
```

Starts a named timer. `timeEnd()` prints the elapsed time.

#### `nc.logger.timeEnd()`

```ts
timeEnd(label?: string): typeof nc.logger
```

Prints the time since `timeStart()` with the same label.

#### `nc.logger.table()`

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): typeof nc.logger
```

Prints rows as a table.

#### `nc.logger.box()`

```ts
box(text: string, options?: BoxOptions): typeof nc.logger
```

Prints text in a box. Nice for startup banners.

#### `nc.logger.divider()`

```ts
divider(title?: string): typeof nc.logger
```

Prints a horizontal line, with an optional title in it.

#### `nc.logger.setLevel()`

```ts
setLevel(level: LogLevel): typeof nc.logger
```

Sets the minimum level.

#### `nc.logger.getLevel()`

```ts
getLevel(): LogLevel
```

The current minimum level.

#### `nc.logger.isLevelEnabled()`

```ts
isLevelEnabled(level: LogLevel): boolean
```

Would this level be printed? Use it to skip building expensive debug output.

#### `nc.logger.configure()`

```ts
configure(options: LoggerOptions): typeof nc.logger
```

Changes several settings at once.

#### `nc.logger.setTimestamp()`

```ts
setTimestamp(value: string | boolean): typeof nc.logger
```

Shows or hides timestamps, or sets their pattern.

#### `nc.logger.setDelimiter()`

```ts
setDelimiter(options?: { open?: string; close?: string; } | undefined): typeof nc.logger
```

Changes the markup delimiters, for when `<%` clashes with a template engine.

#### `nc.logger.createLogger()`

```ts
createLogger(options?: LoggerOptions): Logger
```

Creates a logger with its own settings.

<details><summary>Types (5)</summary>

| Type | Description |
| --- | --- |
| `LogFileOptions` | Writing logs to a file. |
| `Logger` | A logger from `createLogger()`. Every method returns the logger, so calls chain. |
| `LoggerOptions` | Options for `createLogger()` and `configure()`. |
| `LogLevel` | Log levels, from the most verbose to the most severe. `silent` hides everything. |
| `LogStream` | Where logs go: `process.stdout`, a file stream, or anything with a `write(text)` method. |

</details>

## nc.fs

Files and folders without try/catch: read and write text or JSON
(atomically), copy, move, delete, list, glob, watch, hash.

Paths: absolute paths are used as they are. Paths starting with `./` or
`../` start from the file that calls the function, so a script works
wherever it's run from. Other relative paths start from the working
directory, like Node's `fs`.

Everyday failures don't throw: you get `undefined` when something doesn't
exist and `false` when an operation fails.

Import on its own: `require("@ix-xs/node-comfort/fs")`

#### `nc.fs.getEnv()`

```ts
getEnv(name: string, fallback?: string): string | undefined
```

Reads an environment variable. For typed and checked values, see `nc.env`.

#### `nc.fs.createPath()`

```ts
createPath(path?: string): string
```

The absolute version of a path, whether it exists or not.

#### `nc.fs.getFolder()`

```ts
getFolder(path?: string): string | undefined
```

The absolute path of a folder, or `undefined` if it doesn't exist.

#### `nc.fs.getFile()`

```ts
getFile(path: string): string | undefined
```

The absolute path of a file, or `undefined` if it doesn't exist.

#### `nc.fs.getFoldersIn()`

```ts
getFoldersIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

The folders inside a folder, nested ones included by default. `node_modules` is skipped.

#### `nc.fs.getFilesIn()`

```ts
getFilesIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

The files inside a folder, nested ones included by default. `node_modules` is skipped.

#### `nc.fs.glob()`

```ts
glob(pattern: string | string[], options?: GlobOptions): string[]
```

Finds paths matching a glob pattern: `*` (anything but `/`), `**` (any depth), `?`, `[abc]` and `{js,ts}`.

#### `nc.fs.find()`

```ts
find(name: string, options?: FindOptions): string | undefined
```

Searches a folder tree for the first file or folder with this name, closest first.

#### `nc.fs.readFile()`

```ts
readFile(path: string, encoding: "buffer"): Buffer<ArrayBufferLike> | undefined
readFile(path: string, encoding?: BufferEncoding): string | undefined
```

Reads a file as text, or as a Buffer with `"buffer"`.

#### `nc.fs.readLines()`

```ts
readLines(path: string): string[] | undefined
```

Reads a text file as lines. A final newline doesn't add an empty line.

#### `nc.fs.readJSON()`

```ts
readJSON<T = any>(path: string, fallback?: T, options?: ReadJSONOptions): T
```

Reads a JSON file. If it's missing or invalid you get `fallback`, never an error.

#### `nc.fs.writeFile()`

```ts
writeFile(path: string, data: string | object | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: WriteFileOptions): boolean
```

Writes a file atomically, creating its folders. Objects are written as JSON.

#### `nc.fs.writeJSON()`

```ts
writeJSON(path: string, data: unknown, options?: WriteJSONOptions): boolean
```

Writes a value as JSON, atomically, creating folders.

#### `nc.fs.appendFile()`

```ts
appendFile(path: string, data: string | Buffer<ArrayBufferLike>): boolean
```

Appends to a file, creating it and its folders if needed.

#### `nc.fs.createFile()`

```ts
createFile(path: string, force?: boolean, data?: string | object | Buffer<ArrayBufferLike> | null): boolean | undefined
```

Creates a file and its folders.

#### `nc.fs.createFolder()`

```ts
createFolder(path: string, force?: boolean): boolean | undefined
```

Creates a folder and its parents.

#### `nc.fs.ensureFolder()`

```ts
ensureFolder(path: string): string
```

Makes sure a folder exists and returns its absolute path.

#### `nc.fs.ensureFile()`

```ts
ensureFile(path: string): string
```

Makes sure a file exists (an empty one if needed) and returns its absolute path. An existing file is left as is.

#### `nc.fs.touch()`

```ts
touch(path: string): boolean
```

Updates a file's modification time, creating the file if needed, like the Unix `touch` command.

#### `nc.fs.deleteFolder()`

```ts
deleteFolder(path: string): boolean | undefined
```

Deletes a folder and everything in it.

#### `nc.fs.deleteFile()`

```ts
deleteFile(path: string): boolean | undefined
```

Deletes a file.

#### `nc.fs.remove()`

```ts
remove(path: string): boolean
```

Deletes a file or a folder, whichever it is. Nothing happens if the path doesn't exist.

#### `nc.fs.deleteFoldersIn()`

```ts
deleteFoldersIn(path?: string, filter?: ((folder: string) => boolean) | undefined): number | undefined
```

Deletes the folders inside a folder that pass a test.

#### `nc.fs.deleteFilesIn()`

```ts
deleteFilesIn(path?: string, recursive?: boolean, filter?: ((file: string) => boolean) | undefined): number | undefined
```

Deletes the files inside a folder that pass a test.

#### `nc.fs.emptyFolder()`

```ts
emptyFolder(path: string): boolean | undefined
```

Deletes everything inside a folder, keeping the folder.

#### `nc.fs.copy()`

```ts
copy(source: string, destination: string, options?: CopyOptions): boolean
```

Copies a file or a whole folder, like `cp -r`.

#### `nc.fs.move()`

```ts
move(source: string, destination: string, options?: { overwrite?: boolean; } | undefined): boolean
```

Moves or renames a file or folder, across drives too.

#### `nc.fs.copyFoldersIn()`

```ts
copyFoldersIn(options: CopyFoldersOptions): number | undefined
```

Copies the folders inside a folder into another one. `copy()` is simpler for most cases.

#### `nc.fs.copyFolder()`

```ts
copyFolder(options: CopyFolderOptions): boolean | undefined
```

Copies a folder. Without `recursive` or `withFiles`, only the empty folder is created; `copy()` copies everything in one call.

#### `nc.fs.copyFilesIn()`

```ts
copyFilesIn(options: CopyFilesOptions): number | undefined
```

Copies the files inside a folder into another one, keeping the tree.

#### `nc.fs.copyFile()`

```ts
copyFile(options: CopyFileOptions): boolean | undefined
```

Copies one file. If `dest` ends with `/`, the file keeps its name inside that folder.

#### `nc.fs.moveFoldersIn()`

```ts
moveFoldersIn(options: CopyFoldersOptions): number | undefined
```

Moves the folders inside a folder.

#### `nc.fs.moveFolder()`

```ts
moveFolder(options: CopyFolderOptions & { path: string; }): boolean | undefined
```

Moves a folder.

#### `nc.fs.moveFilesIn()`

```ts
moveFilesIn(options: CopyFilesOptions): number | undefined
```

Moves the files inside a folder.

#### `nc.fs.moveFile()`

```ts
moveFile(options: CopyFileOptions): boolean | undefined
```

Moves one file.

#### `nc.fs.exists()`

```ts
exists(path: string): boolean
```

Does a file or folder exist at this path?

#### `nc.fs.isFile()`

```ts
isFile(path: string): boolean
```

Is it an existing file?

#### `nc.fs.isFolder()`

```ts
isFolder(path: string): boolean
```

Is it an existing folder?

#### `nc.fs.stat()`

```ts
stat(path: string): Stats | undefined
```

Size, dates and type of a path.

#### `nc.fs.fileSize()`

```ts
fileSize(path: string): number | undefined
```

A file's size in bytes.

#### `nc.fs.folderSize()`

```ts
folderSize(path: string): number | undefined
```

The total size of every file in a folder.

#### `nc.fs.hashFile()`

```ts
hashFile(path: string, options?: { algorithm?: string; encoding?: "base64" | "base64url" | "hex"; } | undefined): string | undefined
```

Hashes a file in chunks, so huge files are fine.

#### `nc.fs.tempFolder()`

```ts
tempFolder(prefix?: string): string
```

Creates a new, unique folder in the system's temp directory.

#### `nc.fs.sanitizeFilename()`

```ts
sanitizeFilename(name: string, options?: { replacement?: string; } | undefined): string
```

Turns any text into a file name that works on Windows, macOS and Linux: forbidden characters are replaced, reserved names like `CON` are prefixed, and the length is capped.

#### `nc.fs.watch()`

```ts
watch(options?: WatchOptions): Watcher | undefined
```

Watches a file or folder for changes.

<details><summary>Types (13)</summary>

| Type | Description |
| --- | --- |
| `CopyFileOptions` | Options for `copyFile()` and `moveFile()`. |
| `CopyFilesOptions` | Options for `copyFilesIn()` and `moveFilesIn()`. |
| `CopyFolderOptions` | Options for `copyFolder()` and `moveFolder()`. |
| `CopyFoldersOptions` | Options for `copyFoldersIn()` and `moveFoldersIn()`. |
| `CopyOptions` | Options for `copy()`. |
| `FindOptions` | Options for `find()`. |
| `GlobOptions` | Options for `glob()`. |
| `ListOptions` | Options for `getFilesIn()` and `getFoldersIn()`. |
| `ReadJSONOptions` | Options for `readJSON()`. |
| `Watcher` | Returned by `watch()`. |
| `WatchOptions` | Options for `watch()`. |
| `WriteFileOptions` | Options for `writeFile()`. |
| `WriteJSONOptions` | Options for `writeJSON()`. |

</details>

## nc.checker

Type checks and validators. Every `isX` accepts anything and never throws,
and most of them are type guards: inside `if (nc.isString(value))`, your
editor knows `value` is a string, in JavaScript too.

Import on its own: `require("@ix-xs/node-comfort/checker")`

#### `nc.checker.isArray()`

```ts
isArray(value: unknown): value is any[]
```

Is it an array?

#### `nc.checker.isNumber()`

```ts
isNumber(value: unknown): value is number
```

Is it a number? `NaN` is rejected, `Infinity` passes (see `isFinite`).

#### `nc.checker.isFinite()`

```ts
isFinite(value: unknown): value is number
```

Is it a finite number? Unlike the global `isFinite`, strings are rejected.

#### `nc.checker.isInteger()`

```ts
isInteger(value: unknown): value is number
```

Is it an integer?

#### `nc.checker.isSafeInteger()`

```ts
isSafeInteger(value: unknown): value is number
```

Is it an integer JavaScript can represent exactly (up to 2^53 - 1)?

#### `nc.checker.isFloat()`

```ts
isFloat(value: unknown): value is number
```

Is it a finite number with a decimal part?

#### `nc.checker.isPositive()`

```ts
isPositive(value: unknown): value is number
```

Is it a number greater than zero?

#### `nc.checker.isNegative()`

```ts
isNegative(value: unknown): value is number
```

Is it a number lower than zero?

#### `nc.checker.isBoolean()`

```ts
isBoolean(value: unknown): value is boolean
```

Is it `true` or `false`? Truthy and falsy values don't count.

#### `nc.checker.isString()`

```ts
isString(value: unknown): value is string
```

Is it a string?

#### `nc.checker.isSymbol()`

```ts
isSymbol(value: unknown): value is symbol
```

Is it a symbol?

#### `nc.checker.isBigInt()`

```ts
isBigInt(value: unknown): value is bigint
```

Is it a bigint?

#### `nc.checker.isUndefined()`

```ts
isUndefined(value: unknown): value is undefined
```

Is it `undefined`?

#### `nc.checker.isNull()`

```ts
isNull(value: unknown): value is null
```

Is it `null`?

#### `nc.checker.isNil()`

```ts
isNil(value: unknown): value is null | undefined
```

Is it `null` or `undefined`?

#### `nc.checker.isDefined()`

```ts
isDefined<T>(value: T): value is NonNullable<T>
```

Is it anything but `null` or `undefined`? Pass it to `filter()` to drop missing values and keep the right type.

#### `nc.checker.isPrimitive()`

```ts
isPrimitive(value: unknown): value is Primitive
```

Is it a primitive (string, number, boolean, symbol, bigint, `null` or `undefined`)?

#### `nc.checker.isFunction()`

```ts
isFunction(value: unknown): value is (...args: any[]) => any
```

Is it callable? Classes, async and generator functions count.

#### `nc.checker.isAsyncFunction()`

```ts
isAsyncFunction(value: unknown): value is (...args: any[]) => Promise<any>
```

Was it declared with `async`? A function that merely returns a promise doesn't count.

#### `nc.checker.isGeneratorFunction()`

```ts
isGeneratorFunction(value: unknown): value is (...args: any[]) => Generator<unknown, any, any>
```

Is it a generator function (`function*`)?

#### `nc.checker.isGenerator()`

```ts
isGenerator(value: unknown): value is Generator<unknown, any, any>
```

Is it a generator object, the result of calling a `function*`?

#### `nc.checker.isClass()`

```ts
isClass(value: unknown): value is new (...args: any[]) => any
```

Is it a `class` rather than a plain function?

#### `nc.checker.isObject()`

```ts
isObject(value: unknown): value is object
```

Is it an object, and not `null`? Arrays, dates and class instances count; use `isPlainObject` for `{}` literals only.

#### `nc.checker.isPlainObject()`

```ts
isPlainObject(value: unknown): value is Record<string, unknown>
```

Is it a plain object, made with `{}`, `new Object()` or `Object.create(null)`? Arrays, dates, maps and class instances are rejected.

#### `nc.checker.isPromise()`

```ts
isPromise(value: unknown): value is PromiseLike<any>
```

Can it be awaited like a promise (anything with a `then` method)?

#### `nc.checker.isRegExp()`

```ts
isRegExp(value: unknown): value is RegExp
```

Is it a regular expression?

#### `nc.checker.isDate()`

```ts
isDate(value: unknown): value is Date
```

Is it a `Date`, valid or not? Use `isValidDate` to reject `Invalid Date`.

#### `nc.checker.isValidDate()`

```ts
isValidDate(value: unknown): value is Date
```

Is it a `Date` holding a real point in time?

#### `nc.checker.isMap()`

```ts
isMap(value: unknown): value is Map<unknown, unknown>
```

Is it a `Map`?

#### `nc.checker.isSet()`

```ts
isSet(value: unknown): value is Set<unknown>
```

Is it a `Set`?

#### `nc.checker.isWeakMap()`

```ts
isWeakMap(value: unknown): value is WeakMap<object, unknown>
```

Is it a `WeakMap`?

#### `nc.checker.isWeakSet()`

```ts
isWeakSet(value: unknown): value is WeakSet<object>
```

Is it a `WeakSet`?

#### `nc.checker.isIterable()`

```ts
isIterable(value: unknown): value is Iterable<unknown>
```

Does it work with `for...of`? Strings, arrays, maps, sets and generators do.

#### `nc.checker.isAsyncIterable()`

```ts
isAsyncIterable(value: unknown): value is AsyncIterable<unknown>
```

Does it work with `for await...of`, like streams and async generators?

#### `nc.checker.isBuffer()`

```ts
isBuffer(value: unknown): value is Buffer<ArrayBufferLike>
```

Is it a Node.js `Buffer`?

#### `nc.checker.isTypedArray()`

```ts
isTypedArray(value: unknown): value is AnyTypedArray
```

Is it a typed array (`Uint8Array`, `Float64Array`...)? Buffers count.

#### `nc.checker.isError()`

```ts
isError(value: unknown): value is Error
```

Is it an `Error`, including subclasses and errors from other realms?

#### `nc.checker.isEmpty()`

```ts
isEmpty(value: unknown): boolean
```

Is it empty? `null`, `undefined`, `""`, `[]`, `{}` and empty maps and sets are. Numbers, booleans and functions never are.

#### `nc.checker.isBlank()`

```ts
isBlank(value: unknown): boolean
```

Is it `null`, `undefined`, or a string with nothing but whitespace?

#### `nc.checker.isArrayOf()`

```ts
isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[]
```

Is it an array where every item passes `guard`?

#### `nc.checker.isOneOf()`

```ts
isOneOf<L extends readonly unknown[]>(value: unknown, allowed: L): value is L[number]
```

Is it one of the allowed values? With a constant list, the value gets the matching literal type.

#### `nc.checker.isEmail()`

```ts
isEmail(value: unknown): value is string
```

Does it look like an email address? The rules are practical rather than the full RFC: one `@`, no stray dots, a real top-level domain. International addresses are accepted.

#### `nc.checker.isURL()`

```ts
isURL(value: unknown, options?: IsURLOptions): value is string
```

Is it an absolute URL with an allowed protocol (http and https by default)?

#### `nc.checker.isUUID()`

```ts
isUUID(value: unknown, options?: IsUUIDOptions): value is string
```

Is it a UUID?

#### `nc.checker.isJSON()`

```ts
isJSON(value: unknown): value is string
```

Is it a string of valid JSON?

#### `nc.checker.isNumeric()`

```ts
isNumeric(value: unknown): value is string | number
```

Is it a finite number, or a string that is exactly one (spaces around are fine)?

#### `nc.checker.isIP()`

```ts
isIP(value: unknown, version?: 4 | 6): value is string
```

Is it an IP address?

#### `nc.checker.isIPv4()`

```ts
isIPv4(value: unknown): value is string
```

Is it an IPv4 address, like `192.168.0.1`?

#### `nc.checker.isIPv6()`

```ts
isIPv6(value: unknown): value is string
```

Is it an IPv6 address, like `::1`?

#### `nc.checker.isPort()`

```ts
isPort(value: unknown): boolean
```

Is it a valid port (0 to 65535), as a number or a numeric string?

#### `nc.checker.isHex()`

```ts
isHex(value: unknown): value is string
```

Is it a hexadecimal string? A `0x` prefix is allowed.

#### `nc.checker.isHexColor()`

```ts
isHexColor(value: unknown): value is string
```

Is it a CSS hex color (`#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`)?

#### `nc.checker.isBase64()`

```ts
isBase64(value: unknown, options?: IsBase64Options): value is string
```

Is it valid Base64?

#### `nc.checker.isSemver()`

```ts
isSemver(value: unknown): value is string
```

Is it a semantic version? A leading `v` is fine.

#### `nc.checker.isISODate()`

```ts
isISODate(value: unknown): value is string
```

Is it an ISO 8601 date or date-time, and a real calendar date?

#### `nc.checker.isSlug()`

```ts
isSlug(value: unknown): value is string
```

Is it a URL slug like `my-first-post`? See `nc.str.slugify()` to make one.

#### `nc.checker.isAlpha()`

```ts
isAlpha(value: unknown): value is string
```

Is it made only of letters, in any alphabet?

#### `nc.checker.isAlphanumeric()`

```ts
isAlphanumeric(value: unknown): value is string
```

Is it made only of letters and digits, in any alphabet?

#### `nc.checker.isCreditCard()`

```ts
isCreditCard(value: unknown): value is string
```

Could it be a card number? Checks the length and the Luhn checksum; spaces and dashes are ignored.

#### `nc.checker.isJWT()`

```ts
isJWT(value: unknown): value is string
```

Does it look like a JSON Web Token? The signature is not verified; use `nc.crypto.verifyJWT()` for that.

#### `nc.checker.assert()`

```ts
assert(condition: unknown, message?: string | (() => string) | undefined): asserts condition
```

Throws an `AssertionError` if `condition` is falsy. Afterwards, TypeScript knows the condition holds.

#### `nc.checker.assertType()`

```ts
assertType<T>(value: unknown, guard: (value: unknown) => value is T, message?: string | (() => string) | undefined): asserts value is T
```

Throws an `AssertionError` unless `value` passes `guard`. Afterwards, `value` has the guarded type.

<details><summary>Types (5)</summary>

| Type | Description |
| --- | --- |
| `AnyTypedArray` | Any built-in typed array. |
| `IsBase64Options` | Options for `isBase64()`. |
| `IsURLOptions` | Options for `isURL()`. |
| `IsUUIDOptions` | Options for `isUUID()`. |
| `Primitive` | Any primitive value. |

</details>

## nc.utils

Everyday helpers: `wait`, `when`, `dontCrash`, and JSON functions that
don't throw. They are also available at the top level (`nc.wait()`).

Import on its own: `require("@ix-xs/node-comfort/utils")`

#### `nc.utils.wait()`

```ts
wait(duration: string | number, options?: WaitOptions): Promise<void>
```

Resolves after a delay, given in milliseconds or as a duration string.

#### `nc.utils.when()`

```ts
when(predicate: boolean | PromiseLike<boolean> | (() => unknown), payload?: any, options?: WhenOptions): WhenTask
```

Checks a condition at a regular interval and tells you when it's true. Call `.start()` once your listeners are in place. If you just want to await a condition, `nc.async.poll()` is simpler.

#### `nc.utils.dontCrash()`

```ts
dontCrash(): DontCrashController
```

Keeps the process alive when something goes wrong. Uncaught exceptions and unhandled rejections are logged instead of crashing, and `SIGINT`/`SIGTERM` are logged before a clean exit. Customize any of it with `.on()`.

#### `nc.utils.JSONString()`

```ts
JSONString(value: unknown, spaces?: number): string
```

`JSON.stringify` that never throws. Circular references become `"[Circular]"`, bigints become strings, Maps become objects and Sets become arrays.

#### `nc.utils.JSONParse()`

```ts
JSONParse<T = any>(text: string, fallback?: T, ...args: any[]): T
```

`JSON.parse` with an optional fallback. With a fallback, invalid input returns it instead of throwing.

<details><summary>Types (5)</summary>

| Type | Description |
| --- | --- |
| `DontCrashController` | Returned by `dontCrash()`. |
| `DontCrashEvent` | Events you can customize on `dontCrash()`. |
| `WaitOptions` | Options for `wait()`. |
| `WhenOptions` | Options for `when()`. |
| `WhenTask` | The task returned by `when()`. Every method returns the task, so calls chain. |

</details>

## nc.str

String helpers: case conversion, slugs, truncation, templates, wrapping,
fuzzy matching, plurals. Nothing is mutated, any value is accepted, and
lengths are counted the way you see them, so 👨‍👩‍👧 is one character and
is never cut in half.

Import on its own: `require("@ix-xs/node-comfort/str")`

#### `nc.str.capitalize()`

```ts
capitalize(input: unknown): string
```

Uppercases the first character and lowercases the rest.

#### `nc.str.titleCase()`

```ts
titleCase(input: unknown): string
```

Uppercases the first letter of each word and leaves the rest alone.

#### `nc.str.sentenceCase()`

```ts
sentenceCase(input: unknown): string
```

Lowercases everything, then capitalizes the start of each sentence.

#### `nc.str.camelCase()`

```ts
camelCase(input: unknown): string
```

Converts to `camelCase`.

#### `nc.str.pascalCase()`

```ts
pascalCase(input: unknown): string
```

Converts to `PascalCase`.

#### `nc.str.snakeCase()`

```ts
snakeCase(input: unknown): string
```

Converts to `snake_case`.

#### `nc.str.kebabCase()`

```ts
kebabCase(input: unknown): string
```

Converts to `kebab-case`.

#### `nc.str.constantCase()`

```ts
constantCase(input: unknown): string
```

Converts to `CONSTANT_CASE`.

#### `nc.str.dotCase()`

```ts
dotCase(input: unknown): string
```

Converts to `dot.case`.

#### `nc.str.words()`

```ts
words(input: unknown): string[]
```

Splits text into words. Understands camelCase, snake_case, kebab-case, dots, spaces and punctuation.

#### `nc.str.deburr()`

```ts
deburr(input: unknown): string
```

Removes accents (`é` becomes `e`) and spells out special Latin letters (`ß` becomes `ss`, `æ` becomes `ae`).

#### `nc.str.slugify()`

```ts
slugify(input: unknown, options?: SlugifyOptions): string
```

Turns text into a URL slug: no accents, lowercase, words joined by dashes.

#### `nc.str.squish()`

```ts
squish(input: unknown): string
```

Collapses runs of whitespace into single spaces and trims the ends.

#### `nc.str.stripTags()`

```ts
stripTags(input: unknown): string
```

Removes HTML tags and keeps the text. This is not a sanitizer: to show untrusted text in HTML, use `escapeHTML()`.

#### `nc.str.escapeHTML()`

```ts
escapeHTML(input: unknown): string
```

Escapes `& < > " '` so the text is safe inside HTML content and attributes.

#### `nc.str.unescapeHTML()`

```ts
unescapeHTML(input: unknown): string
```

Decodes HTML entities: named ones like `&amp;` and `&nbsp;`, and numeric ones like `&#233;`.

#### `nc.str.escapeRegExp()`

```ts
escapeRegExp(input: unknown): string
```

Escapes regex special characters so the text matches literally.

#### `nc.str.length()`

```ts
length(input: unknown): number
```

Counts visible characters. Unlike `.length`, an emoji or an accented letter counts as one.

#### `nc.str.byteLength()`

```ts
byteLength(input: unknown, encoding?: BufferEncoding): number
```

Size of the text in bytes once encoded, UTF-8 by default. Useful when a limit is in bytes, like a database column or an HTTP header.

#### `nc.str.count()`

```ts
count(input: unknown, search: string): number
```

Counts how many times `search` appears, without overlaps.

#### `nc.str.truncate()`

```ts
truncate(input: unknown, length: number, options?: TruncateOptions): string
```

Shortens text to `length` visible characters, ending with `…` when cut.

#### `nc.str.between()`

```ts
between(input: unknown, start: string, end: string): string | undefined
```

Returns the text between `start` and the next `end`, or `undefined` if a marker is missing.

#### `nc.str.splitOnce()`

```ts
splitOnce(input: unknown, separator: string): [string, string | undefined]
```

Splits at the first occurrence of `separator` only.

#### `nc.str.lines()`

```ts
lines(input: unknown): string[]
```

Splits text into lines, whatever the line endings.

#### `nc.str.padStart()`

```ts
padStart(input: unknown, length: number, char?: string): string
```

Pads the start until the text is `length` characters long.

#### `nc.str.padEnd()`

```ts
padEnd(input: unknown, length: number, char?: string): string
```

Pads the end until the text is `length` characters long.

#### `nc.str.center()`

```ts
center(input: unknown, length: number, char?: string): string
```

Centers text within `length` characters. An odd leftover goes to the right.

#### `nc.str.indent()`

```ts
indent(input: unknown, prefix?: string | number): string
```

Indents every non-empty line.

#### `nc.str.dedent()`

```ts
dedent(input: unknown, ...values: unknown[]): string
```

Removes the indentation shared by all lines, and blank first and last lines. Works as a template tag, so multi-line strings can follow your code's indentation.

#### `nc.str.wrap()`

```ts
wrap(input: unknown, options?: number | WrapOptions): string
```

Wraps text so no line is longer than `width` visible characters. Existing line breaks are kept.

#### `nc.str.reverse()`

```ts
reverse(input: unknown): string
```

Reverses text without breaking emoji or accents.

#### `nc.str.mask()`

```ts
mask(input: unknown, options?: MaskOptions): string
```

Hides part of a string, like a card number or a token.

#### `nc.str.initials()`

```ts
initials(input: unknown, max?: number): string
```

The initials of a name, in uppercase.

#### `nc.str.plural()`

```ts
plural(value: number, forms: PluralForms, options?: PluralOptions): string
```

Picks the right plural for a count, following the rules of the language, and puts the formatted count in front.

#### `nc.str.template()`

```ts
template(input: unknown, data: Record<string, any>, options?: TemplateOptions): string
```

Fills `{placeholders}` with values. Dotted paths like `{user.name}` work, and missing values are left alone unless you give a `fallback`.

#### `nc.str.ensurePrefix()`

```ts
ensurePrefix(input: unknown, prefix: string): string
```

Adds `prefix` unless the text already starts with it.

#### `nc.str.ensureSuffix()`

```ts
ensureSuffix(input: unknown, suffix: string): string
```

Adds `suffix` unless the text already ends with it.

#### `nc.str.removePrefix()`

```ts
removePrefix(input: unknown, prefix: string): string
```

Removes `prefix` if the text starts with it.

#### `nc.str.removeSuffix()`

```ts
removeSuffix(input: unknown, suffix: string): string
```

Removes `suffix` if the text ends with it.

#### `nc.str.compare()`

```ts
compare(a: unknown, b: unknown, options?: CompareOptions): number
```

Compares two strings the way people sort them: numbers in natural order and accents in the right place. Pass it straight to `sort()`.

#### `nc.str.levenshtein()`

```ts
levenshtein(a: unknown, b: unknown): number
```

The number of single-character edits needed to turn `a` into `b`.

#### `nc.str.similarity()`

```ts
similarity(a: unknown, b: unknown): number
```

How alike two strings are, from `0` (nothing in common) to `1` (identical).

#### `nc.str.closest()`

```ts
closest(input: unknown, candidates: Iterable<string>, options?: ClosestOptions): string | undefined
```

Finds the candidate closest to `input`. Made for "Did you mean...?" suggestions.

#### `nc.str.random()`

```ts
random(size?: number, options?: string | RandomStringOptions): string
```

A random string. It relies on `Math.random`, so don't use it for secrets: `nc.id.token()` and `nc.id.nano()` are made for that.

<details><summary>Types (10)</summary>

| Type | Description |
| --- | --- |
| `ClosestOptions` | Options for `closest()`. |
| `CompareOptions` | Options for `compare()`. |
| `MaskOptions` | Options for `mask()`. |
| `PluralForms` | The word forms for `plural()`. Only `other` is required; add the others when your language needs them. |
| `PluralOptions` | Options for `plural()`. |
| `RandomStringOptions` | Options for `random()`. |
| `SlugifyOptions` | Options for `slugify()`. |
| `TemplateOptions` | Options for `template()`. |
| `TruncateOptions` | Options for `truncate()`. |
| `WrapOptions` | Options for `wrap()`. |

</details>

## nc.num

Numbers: clamping, rounding that gets decimals right, statistics, and
formatting for humans (sizes, money, ordinals, compact numbers) in any
language. Formatting is English by default: change it with `setLocale()`
or per call with `{ locale }`.

Import on its own: `require("@ix-xs/node-comfort/num")`

#### `nc.num.setLocale()`

```ts
setLocale(locale: string): typeof nc.num
```

Sets the default language of `format`, `currency`, `percent`, `abbreviate`, `ordinal` and `formatBytes`.

#### `nc.num.getLocale()`

```ts
getLocale(): string
```

The current default language.

#### `nc.num.clamp()`

```ts
clamp(value: number, min: number, max: number): number
```

Keeps a number between `min` and `max`.

#### `nc.num.inRange()`

```ts
inRange(value: number, min: number, max: number): boolean
```

Is the number between `min` and `max`, both included?

#### `nc.num.wrap()`

```ts
wrap(value: number, min: number, max: number): number
```

Wraps a number around a range, like an angle or a carousel index. `max` is excluded.

#### `nc.num.round()`

```ts
round(value: number, decimals?: number): number
```

Rounds to `decimals` places without floating-point surprises: `Math.round(1.005 * 100) / 100` gives `1`, this gives `1.01`. Halves round away from zero, like in a spreadsheet.

#### `nc.num.floor()`

```ts
floor(value: number, decimals?: number): number
```

Rounds down to `decimals` places.

#### `nc.num.ceil()`

```ts
ceil(value: number, decimals?: number): number
```

Rounds up to `decimals` places.

#### `nc.num.snap()`

```ts
snap(value: number, step: number): number
```

Rounds to the nearest multiple of `step`.

#### `nc.num.approxEqual()`

```ts
approxEqual(a: number, b: number, epsilon?: number): boolean
```

Are two numbers equal within a small tolerance? The right way to compare float results, since `0.1 + 0.2 === 0.3` is `false`.

#### `nc.num.lerp()`

```ts
lerp(start: number, end: number, t: number): number
```

The value at ratio `t` between `start` and `end`.

#### `nc.num.mapRange()`

```ts
mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number
```

Moves a number from one range to another, keeping its relative position.

#### `nc.num.random()`

```ts
random(min?: number, max?: number): number
```

A random float from `min` (included) to `max` (excluded). Not for security: it uses `Math.random`.

#### `nc.num.randomInt()`

```ts
randomInt(min: number, max: number): number
```

A random integer from `min` to `max`, both included. Not for security.

#### `nc.num.sum()`

```ts
sum(values: Iterable<number>): number
```

Adds up numbers.

#### `nc.num.average()`

```ts
average(values: Iterable<number>): number
```

The mean, or `0` for an empty list.

#### `nc.num.median()`

```ts
median(values: Iterable<number>): number
```

The middle value once sorted, or `0` for an empty list.

#### `nc.num.mode()`

```ts
mode(values: Iterable<number>): number[]
```

The most frequent values.

#### `nc.num.variance()`

```ts
variance(values: Iterable<number>, options?: VarianceOptions): number
```

The variance: the average squared distance from the mean.

#### `nc.num.stdDev()`

```ts
stdDev(values: Iterable<number>, options?: VarianceOptions): number
```

The standard deviation.

#### `nc.num.percentile()`

```ts
percentile(values: Iterable<number>, p: number): number
```

The value under which `p` percent of the values fall, interpolated like Excel's `PERCENTILE.INC`.

#### `nc.num.min()`

```ts
min(values: Iterable<number>): number | undefined
```

The smallest number. Unlike `Math.min(...array)`, huge arrays are fine.

#### `nc.num.max()`

```ts
max(values: Iterable<number>): number | undefined
```

The largest number. Unlike `Math.max(...array)`, huge arrays are fine.

#### `nc.num.percent()`

```ts
percent(value: number, total: number, decimals?: number): number
```

What percentage `value` is of `total`. Returns `0` when `total` is `0`.

#### `nc.num.gcd()`

```ts
gcd(...values: number[]): number
```

Greatest common divisor.

#### `nc.num.lcm()`

```ts
lcm(...values: number[]): number
```

Least common multiple.

#### `nc.num.isPrime()`

```ts
isPrime(value: number): boolean
```

Is it a prime number?

#### `nc.num.factorial()`

```ts
factorial(n: number, asBigInt?: boolean): number | bigint
```

`n!`. Pass `true` to get an exact bigint, since numbers lose precision past 18!.

#### `nc.num.isEven()`

```ts
isEven(value: number): boolean
```

Is it even?

#### `nc.num.isOdd()`

```ts
isOdd(value: number): boolean
```

Is it odd? Negative numbers work too.

#### `nc.num.range()`

```ts
range(start: number, end?: number, step?: number): number[]
```

Numbers from `start` up to `end` (excluded). With one argument, counts from 0. Goes down when `end` is smaller.

#### `nc.num.parse()`

```ts
parse(value: unknown, fallback?: number): number
```

Reads a number from anything, ignoring trailing text like units.

#### `nc.num.parseBytes()`

```ts
parseBytes(value: string | number, options?: ParseBytesOptions): number
```

Turns a size like `"10 MB"` into bytes. The opposite of `formatBytes()`.

#### `nc.num.formatBytes()`

```ts
formatBytes(bytes: number, options?: FormatBytesOptions): string
```

Formats a byte count as a readable size.

#### `nc.num.format()`

```ts
format(value: number | bigint, options?: FormatNumberOptions): string
```

Formats a number for display, with `Intl.NumberFormat` doing the work: separators, decimals, compact notation, percentages, units.

#### `nc.num.currency()`

```ts
currency(value: number | bigint, code: string, options?: CurrencyOptions): string
```

Formats an amount of money.

#### `nc.num.abbreviate()`

```ts
abbreviate(value: number, decimals?: number): string
```

Shortens big numbers with `K`, `M`, `B` or `T`. For other languages, use `format(value, { compact: true, locale })`.

#### `nc.num.thousands()`

```ts
thousands(value: string | number, separator?: string): string
```

Adds thousands separators, leaving decimals alone.

#### `nc.num.ordinal()`

```ts
ordinal(value: number, options?: OrdinalOptions): string
```

Adds the ordinal suffix: 1st, 2nd, 3rd... in several languages.

<details><summary>Types (6)</summary>

| Type | Description |
| --- | --- |
| `CurrencyOptions` | Options for `currency()`. |
| `FormatBytesOptions` | Options for `formatBytes()`. |
| `FormatNumberOptions` | Options for `format()`. |
| `OrdinalOptions` | Options for `ordinal()`. |
| `ParseBytesOptions` | Options for `parseBytes()`. |
| `VarianceOptions` | Options for `variance()` and `stdDev()`. |

</details>

## nc.arr

Array helpers. None of them mutate what you pass in, and item types carry
through (`chunk(numbers, 2)` is a `number[][]`). Many take an iteratee:
a property name, which your editor completes, or a function.

Import on its own: `require("@ix-xs/node-comfort/arr")`

#### `nc.arr.chunk()`

```ts
chunk<T>(array: readonly T[], size: number): T[][]
```

Splits an array into groups of `size` items. The last group can be shorter.

#### `nc.arr.windows()`

```ts
windows<T>(array: readonly T[], size: number, step?: number): T[][]
```

Sliding windows of `size` items, moving by `step`. Good for moving averages and comparing neighbours.

#### `nc.arr.first()`

```ts
first<T>(array: readonly T[]): T | undefined
first<T>(array: readonly T[], n: number): T[]
```

The first item, or the first `n` items.

#### `nc.arr.last()`

```ts
last<T>(array: readonly T[]): T | undefined
last<T>(array: readonly T[], n: number): T[]
```

The last item, or the last `n` items.

#### `nc.arr.paginate()`

```ts
paginate<T>(array: readonly T[], page?: number, perPage?: number): Page<T>
```

One page of an array, with what you need to draw pagination controls. Pages start at 1; an out-of-range page is brought back into range.

#### `nc.arr.unique()`

```ts
unique<T>(array: readonly T[], iteratee?: Iteratee<T>): T[]
```

Removes duplicates. With an iteratee, items that give the same value are duplicates; the first one is kept.

#### `nc.arr.groupBy()`

```ts
groupBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T[]>
```

Groups items by key.

#### `nc.arr.keyBy()`

```ts
keyBy<T>(array: readonly T[], iteratee: Iteratee<T>): Record<string, T>
```

Indexes items by key. If two items share a key, the last one wins.

#### `nc.arr.toMap()`

```ts
toMap<T, V = T>(array: readonly T[], key: Iteratee<T>, value?: ((item: T, index: number) => V) | undefined): Map<any, V>
```

Builds a `Map` from an array. Unlike `keyBy()`, keys keep their type.

#### `nc.arr.countBy()`

```ts
countBy<T>(array: readonly T[], iteratee?: Iteratee<T>): Record<string, number>
```

Counts items per key.

#### `nc.arr.count()`

```ts
count<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): number
```

Counts the items that pass a test.

#### `nc.arr.partition()`

```ts
partition<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): [T[], T[]]
```

Splits items into those that pass a test and those that don't.

#### `nc.arr.pluck()`

```ts
pluck<T, K extends keyof T>(array: readonly T[], key: K): T[K][]
```

Takes one property from every item.

#### `nc.arr.sortBy()`

```ts
sortBy<T>(array: readonly T[], keys: SortKey<T> | SortKey<T>[], order?: "asc" | "desc" | SortByOptions): T[]
```

Sorts by one or more keys, each with its own direction if you like. The sort is stable and `null`/`undefined` always go last.

#### `nc.arr.shuffle()`

```ts
shuffle<T>(array: readonly T[]): T[]
```

A shuffled copy (Fisher-Yates).

#### `nc.arr.sample()`

```ts
sample<T>(array: readonly T[]): T | undefined
```

One random item, or `undefined` if the array is empty.

#### `nc.arr.sampleSize()`

```ts
sampleSize<T>(array: readonly T[], n: number): T[]
```

`n` random items, never the same one twice.

#### `nc.arr.rotate()`

```ts
rotate<T>(array: readonly T[], n?: number): T[]
```

Rotates items. Positive `n` moves items from the start to the end, negative `n` the other way.

#### `nc.arr.move()`

```ts
move<T>(array: readonly T[], from: number, to: number): T[]
```

Moves one item to another position. Negative indexes count from the end.

#### `nc.arr.swap()`

```ts
swap<T>(array: readonly T[], i: number, j: number): T[]
```

Swaps two items.

#### `nc.arr.difference()`

```ts
difference<T>(array: readonly T[], ...others: (readonly T[])[]): T[]
```

Items of `array` that appear in none of the others.

#### `nc.arr.intersection()`

```ts
intersection<T>(...arrays: (readonly T[])[]): T[]
```

Items present in every array, without duplicates.

#### `nc.arr.union()`

```ts
union<T>(...arrays: (readonly T[])[]): T[]
```

Items present in any array, without duplicates.

#### `nc.arr.without()`

```ts
without<T>(array: readonly T[], ...values: T[]): T[]
```

A copy without the given values. `NaN` works too.

#### `nc.arr.remove()`

```ts
remove<T>(array: readonly T[], predicate: (item: T, index: number) => unknown): T[]
```

A copy without the items that pass the test.

#### `nc.arr.compact()`

```ts
compact<T>(array: readonly T[]): Exclude<T, false | "" | 0 | 0n | null | undefined>[]
```

Removes falsy values (`false`, `null`, `undefined`, `0`, `""`, `NaN`).

#### `nc.arr.toggle()`

```ts
toggle<T>(array: readonly T[], item: T): T[]
```

Adds the item if it's missing, removes it if it's there. Handy for multi-select state.

#### `nc.arr.upsert()`

```ts
upsert<T>(array: readonly T[], item: T, identity: Iteratee<T>): T[]
```

Replaces the item with the same identity, or appends it if there's none.

#### `nc.arr.insert()`

```ts
insert<T>(array: readonly T[], index: number, ...items: T[]): T[]
```

Inserts items at an index. Negative indexes count from the end.

#### `nc.arr.flatten()`

```ts
flatten<T, D extends number = 1>(array: readonly T[], depth?: D): FlatArray<T[], D>[]
```

Flattens nested arrays, one level by default.

#### `nc.arr.zip()`

```ts
zip<T>(...arrays: (readonly T[])[]): (T | undefined)[][]
```

Pairs items by position. Shorter arrays leave `undefined` holes.

#### `nc.arr.unzip()`

```ts
unzip<T>(tuples: readonly (readonly T[])[]): (T | undefined)[][]
```

The opposite of `zip()`: rows become columns.

#### `nc.arr.interleave()`

```ts
interleave<T>(...arrays: (readonly T[])[]): T[]
```

Takes items from each array in turn, then appends the rest.

#### `nc.arr.cartesian()`

```ts
cartesian<T>(...arrays: (readonly T[])[]): T[][]
```

Every combination of one item from each array.

#### `nc.arr.times()`

```ts
times<T>(n: number, value?: T | ((index: number) => T) | undefined): T[]
```

An array of `n` items, from a value or a function of the index.

#### `nc.arr.sumBy()`

```ts
sumBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

Adds up a number from each item. Non-numbers count as 0.

#### `nc.arr.averageBy()`

```ts
averageBy<T>(array: readonly T[], iteratee?: Iteratee<T>): number
```

The average of a number from each item, or `0` for an empty array.

#### `nc.arr.maxBy()`

```ts
maxBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

The item with the highest value.

#### `nc.arr.minBy()`

```ts
minBy<T>(array: readonly T[], iteratee?: Iteratee<T>): T | undefined
```

The item with the lowest value.

<details><summary>Types (4)</summary>

| Type | Description |
| --- | --- |
| `Iteratee` | How to get a value out of an item: a property name, or a function `(item, index) => value`. |
| `Page` | A page returned by `paginate()`. |
| `SortByOptions` | Options for `sortBy()`. |
| `SortKey` | A sort key for `sortBy()`: an iteratee, or `[iteratee, "asc" \| "desc"]` to give that key its own direction. |

</details>

## nc.obj

Object helpers: deep clone, merge, equality, diff, typed dot paths,
pick and omit. Inputs are never mutated, and `__proto__`, `constructor`
and `prototype` keys are always ignored, so user input can't pollute
prototypes.

Import on its own: `require("@ix-xs/node-comfort/obj")`

#### `nc.obj.clone()`

```ts
clone<T>(value: T): T
```

Deep copy. Uses `structuredClone` when it can, and falls back to a copy that keeps functions and class prototypes.

#### `nc.obj.merge()`

```ts
merge<A extends object>(a: A): A
merge<A extends object, B extends object>(a: A, b: B): A & B
merge<A extends object, B extends object, C extends object>(a: A, b: B, c: C): A & B & C
merge(...sources: object[]): Record<string, any>
```

Deep-merges objects into a new one. Later objects win, nested objects are merged, arrays are replaced. See `mergeWith()` to join arrays instead.

#### `nc.obj.mergeWith()`

```ts
mergeWith(options: MergeOptions, ...sources: object[]): Record<string, any>
```

Like `merge()`, with a choice of what happens to arrays and `undefined`.

#### `nc.obj.defaults()`

```ts
defaults<T extends object, D extends object>(target: T, ...sources: D[]): T & D
```

Fills in missing properties from defaults, deeply. Values that are set, even `null` or `0`, are kept.

#### `nc.obj.equal()`

```ts
equal(a: unknown, b: unknown): boolean
```

Deep equality. Knows about arrays, dates, regexes, maps, sets, typed arrays, `NaN` and circular references.

#### `nc.obj.diff()`

```ts
diff(before: unknown, after: unknown): Change[]
```

Lists what changed between two values, deeply. Handy for audit logs and partial updates.

#### `nc.obj.get()`

```ts
get<T, P extends string>(object: T, path: P | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never) | readonly (string | number)[]): PathValue<T, P>
get<T, P extends string, F>(object: T, path: P | readonly (string | number)[] | (T extends PathLeaf ? never : T extends object ? { [K in keyof T & (string | number)]: NonNullable<T[K]> extends PathLeaf ? `${K}` : NonNullable<T[K]> extends object ? `${K}` | `${K}.${NonNullable<T[K]> extends PathLeaf ? never : NonNullable<T[K]> extends object ? { [K in keyof NonNullable<T[K]> & (string | number)]: NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<T[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<T[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<T[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` | `${K}.${NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? never : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> extends object ? { [K in keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)]: NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends PathLeaf ? `${K}` : NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]>[K]> extends object ? `${K}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<NonNullable<T[K]>[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<NonNullable<T[K]>[K]> & (string | number)] : never}` : `${K}`; }[keyof NonNullable<T[K]> & (string | number)] : never}` : `${K}`; }[keyof T & (string | number)] : never), fallback: F): F | Exclude<PathValue<T, P>, undefined>
```

Reads a nested value from a dotted path. Your editor completes the paths and knows the type of the result.

#### `nc.obj.set()`

```ts
set<T>(object: T, path: PathInput<T>, value: unknown): T
```

Returns a copy with a nested value set. Missing levels are created (arrays when the next key is a number).

#### `nc.obj.unset()`

```ts
unset<T>(object: T, path: PathInput<T>): T
```

Returns a copy without the property at `path`.

#### `nc.obj.has()`

```ts
has<T>(object: T, path: PathInput<T>): boolean
```

Does the path exist? A property set to `undefined` still counts.

#### `nc.obj.pick()`

```ts
pick<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Pick<T, K>
```

A copy with only the listed keys.

#### `nc.obj.omit()`

```ts
omit<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Omit<T, K>
```

A copy without the listed keys.

#### `nc.obj.filter()`

```ts
filter<T extends object>(object: T, predicate: (value: T[keyof T], key: keyof T & string) => unknown): Partial<T>
```

Keeps the entries that pass a test.

#### `nc.obj.mapValues()`

```ts
mapValues<T extends object, R>(object: T, fn: (value: T[keyof T], key: keyof T & string) => R): { [K in keyof T]: R; }
```

Transforms every value, keeping the keys.

#### `nc.obj.mapKeys()`

```ts
mapKeys<T extends object>(object: T, fn: (key: keyof T & string, value: T[keyof T]) => PropertyKey): Record<string, T[keyof T]>
```

Transforms every key, keeping the values.

#### `nc.obj.renameKeys()`

```ts
renameKeys<T extends object>(object: T, mapping: Partial<Record<keyof T, string>>): Record<string, T[keyof T]>
```

Renames some keys and leaves the others alone.

#### `nc.obj.invert()`

```ts
invert(object: Record<string, PropertyKey>): Record<string, string>
```

Swaps keys and values.

#### `nc.obj.compact()`

```ts
compact<T extends object>(object: T, options?: CompactOptions): Partial<T>
```

Removes `null` and `undefined` values, and optionally empty ones.

#### `nc.obj.flatten()`

```ts
flatten(object: object, prefix?: string): Record<string, unknown>
```

Flattens nested objects into dotted keys. Arrays stay as values.

#### `nc.obj.unflatten()`

```ts
unflatten(object: Record<string, unknown>): Record<string, any>
```

Rebuilds nested objects from dotted keys. The opposite of `flatten()`.

#### `nc.obj.keys()`

```ts
keys<T extends object>(object: T): (keyof T & string)[]
```

`Object.keys`, but typed with the object's actual keys.

#### `nc.obj.entries()`

```ts
entries<T extends object>(object: T): [keyof T & string, T[keyof T]][]
```

`Object.entries`, with typed keys and values.

#### `nc.obj.fromEntries()`

```ts
fromEntries<K extends PropertyKey, V>(pairs: Iterable<readonly [K, V]>): Record<K, V>
```

`Object.fromEntries` that accepts any iterable (a `Map` too) and skips unsafe keys.

#### `nc.obj.size()`

```ts
size(value: unknown): number
```

How many entries: own keys of an object, size of a map or set, length of an array or string.

#### `nc.obj.isEmpty()`

```ts
isEmpty(object: unknown): boolean
```

Does the object have no own keys? `null` and `undefined` count as empty.

#### `nc.obj.deepFreeze()`

```ts
deepFreeze<T>(object: T): DeepReadonly<T>
```

Freezes an object and everything inside it. Good for configuration and constants.

<details><summary>Types (10)</summary>

| Type | Description |
| --- | --- |
| `Change` | One difference reported by `diff()`. |
| `CompactOptions` | Options for `compact()`. |
| `DeepReadonly` | `T`, read-only all the way down. |
| `MergeOptions` | Options for `mergeWith()`. |
| `NullishToUndefined` |   |
| `PathInput` | A path: a known dotted path (completed by your editor), any other string like `"items[0].name"`, or an array of keys. |
| `PathLeaf` | Values that end a path: dates, regexes, maps, sets, functions and arrays. |
| `Paths` | Every dotted path of an object type, up to 6 levels. This is what powers path completion in `obj.get()` and friends. |
| `PathStep` |   |
| `PathValue` | The type found at a dotted path of `T`, or `any` for an unknown path. |

</details>

## nc.func

Function helpers: debounce, throttle, memoize, retry with backoff,
timeouts, error handling without try/catch, and typed composition.

Import on its own: `require("@ix-xs/node-comfort/func")`

#### `nc.func.debounce()`

```ts
debounce<F extends (...args: any[]) => any>(fn: F, wait: number, options?: DebounceOptions): DebouncedFunction<F>
```

Waits for a pause of `wait` ms between calls, then runs once with the latest arguments. For search boxes, resizing, auto-saving...

#### `nc.func.throttle()`

```ts
throttle<F extends (...args: any[]) => any>(fn: F, wait: number, options?: ThrottleOptions): ThrottledFunction<F>
```

Runs at most once every `wait` ms, however often it's called. For scroll handlers, progress reports, rate-limited APIs...

#### `nc.func.once()`

```ts
once<F extends (...args: any[]) => any>(fn: F): F
```

Runs `fn` the first time only; later calls return the same result.

#### `nc.func.memoize()`

```ts
memoize<F extends (...args: any[]) => any>(fn: F, options?: MemoizeOptions | ((...args: Parameters<F>) => unknown) | undefined): MemoizedFunction<F>
```

Caches results by arguments. Supports expiry (`ttl`), a size limit (`max`) and async functions: a failed promise isn't cached, so the next call tries again.

#### `nc.func.retry()`

```ts
retry<T>(fn: (attempt: number) => T | PromiseLike<T>, options?: RetryOptions): Promise<Awaited<T>>
```

Calls `fn` until it succeeds, waiting between attempts. If every attempt fails, the last error is thrown.

#### `nc.func.timeout()`

```ts
timeout<T>(promise: PromiseLike<T> | (() => T | PromiseLike<T>), ms: number, message?: string): Promise<Awaited<T>>
```

Rejects with a `TimeoutError` if the promise takes longer than `ms`.

#### `nc.func.delay()`

```ts
delay<F extends (...args: any[]) => any>(fn: F, ms: number, ...args: Parameters<F>): Promise<Awaited<ReturnType<F>>>
```

Waits `ms`, then calls `fn` with the arguments and resolves with its result.

#### `nc.func.to()`

```ts
to<T, E = Error>(promise: PromiseLike<T> | (() => T | PromiseLike<T>)): Promise<[E, undefined] | [null, Awaited<T>]>
```

Awaits a promise and gives you `[error, value]` instead of throwing, so you don't need a try/catch.

#### `nc.func.attempt()`

```ts
attempt<F extends (...args: any[]) => any>(fn: F): (...args: Parameters<F>) => Promise<[unknown, undefined] | [null, Awaited<ReturnType<F>>]>
```

Wraps a function so it resolves to `[error, value]` instead of throwing.

#### `nc.func.promisify()`

```ts
promisify(fn: (...args: any[]) => void): (...args: any[]) => Promise<any>
```

Turns a callback-style function into one that returns a promise.

#### `nc.func.pipe()`

```ts
pipe<A extends any[], B>(f1: (...args: A) => B): (...args: A) => B
pipe<A extends any[], B, C>(f1: (...args: A) => B, f2: (b: B) => C): (...args: A) => C
pipe<A extends any[], B, C, D>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D): (...args: A) => D
pipe<A extends any[], B, C, D, E>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E): (...args: A) => E
pipe<A extends any[], B, C, D, E, F>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F): (...args: A) => F
pipe<A extends any[], B, C, D, E, F, G>(f1: (...args: A) => B, f2: (b: B) => C, f3: (c: C) => D, f4: (d: D) => E, f5: (e: E) => F, f6: (f: F) => G): (...args: A) => G
pipe(...fns: ((arg: any) => any)[]): (...args: any[]) => any
```

Chains functions from left to right: `pipe(f, g)(x)` is `g(f(x))`. Types flow through up to 6 functions.

#### `nc.func.compose()`

```ts
compose(...fns: ((...args: any[]) => any)[]): (...args: any[]) => any
```

Chains functions from right to left: `compose(f, g)(x)` is `f(g(x))`. `pipe()` reads in execution order and is better typed.

#### `nc.func.curry()`

```ts
curry(fn: (...args: any[]) => any, arity?: number): (...args: any[]) => any
```

Lets you pass a function's arguments a few at a time.

#### `nc.func.partial()`

```ts
partial<P extends any[], R extends any[], T>(fn: (...args: [...P, ...R]) => T, ...preset: P): (...args: R) => T
```

Fixes the first arguments of a function.

#### `nc.func.negate()`

```ts
negate<A extends any[]>(predicate: (...args: A) => unknown): (...args: A) => boolean
```

The opposite of a predicate.

#### `nc.func.after()`

```ts
after<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Does nothing for the first `n - 1` calls, then calls `fn` every time.

#### `nc.func.before()`

```ts
before<F extends (...args: any[]) => any>(n: number, fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined
```

Calls `fn` for the first `n - 1` calls, then keeps returning the last result.

#### `nc.func.noop()`

```ts
noop(..._args: unknown[]): void
```

Does nothing. Useful as a default callback.

#### `nc.func.identity()`

```ts
identity<T>(value: T): T
```

Returns its argument.

<details><summary>Types (7)</summary>

| Type | Description |
| --- | --- |
| `DebouncedFunction` | A debounced function. `flush()` runs the pending call now, `cancel()` drops it, `pending()` tells you if there's one. |
| `DebounceOptions` | Options for `debounce()`. |
| `MemoizedFunction` | A memoized function, with its `cache`, `clear()` and `delete(...args)`. |
| `MemoizeOptions` | Options for `memoize()`. |
| `RetryOptions` | Options for `retry()`. |
| `ThrottledFunction` | A throttled function, with `cancel()`. |
| `ThrottleOptions` | Options for `throttle()`. |

</details>

## nc.time

Dates and durations: formatting, relative time, calendar math, time zones
and scheduling, in any language `Intl` knows. The default language is
English so results are the same on every machine; change it with
`setLocale()` or per call with `{ locale }`. Time zones work the same way
with `setTimezone()` or `{ timeZone }`.

Import on its own: `require("@ix-xs/node-comfort/time")`

#### `nc.time.setLocale()`

```ts
setLocale(locale: string): typeof nc.time
```

Sets the default language for `relative`, `calendar`, `formatDuration` and `format`.

#### `nc.time.setTimezone()`

```ts
setTimezone(timeZone: string | undefined): typeof nc.time
```

Sets the default time zone for `format`, `calendar`, `isSameDay`, `cron`... Pass `undefined` to go back to the system zone.

#### `nc.time.getConfig()`

```ts
getConfig(): { locale: string; timeZone: string | undefined; }
```

The current defaults.

#### `nc.time.timezones()`

```ts
timezones(): string[]
```

Every time zone Node knows, sorted.

#### `nc.time.offset()`

```ts
offset(timeZone?: string, date?: DateInput): number
```

A zone's UTC offset at a given date, in minutes. Daylight saving included.

#### `nc.time.parseDuration()`

```ts
parseDuration(input: string | number): number | null
```

Turns a duration into milliseconds. Understands `"1h30m"`, `"2 days"`, `"500ms"`, clock times like `"01:30:00"`, ISO durations like `"PT1H30M"`, and plain numbers. Months and years are refused because their length varies; use `add()` for those.

#### `nc.time.formatDuration()`

```ts
formatDuration(ms: number, options?: FormatDurationOptions): string
```

Writes a duration for humans.

#### `nc.time.relative()`

```ts
relative(date: DateInput, from?: DateInput, options?: RelativeOptions): string
```

Describes a date relative to now: `"3 hours ago"`, `"in 2 days"`, in any language.

#### `nc.time.calendar()`

```ts
calendar(date: DateInput, options?: CalendarOptions): string
```

Describes a date like a chat app does: `"Today at 2:30 PM"`, `"Yesterday at 9:05 AM"`, a weekday for the coming days, and the full date beyond that.

#### `nc.time.format()`

```ts
format(date: DateInput, pattern?: string, options?: FormatDateOptions): string
```

Formats a date with tokens, in any language and time zone.

#### `nc.time.toISODate()`

```ts
toISODate(date?: DateInput, options?: TimeZoneOptions): string
```

The date as `YYYY-MM-DD`, the format `<input type="date">` and most APIs expect.

#### `nc.time.add()`

```ts
add(date: DateInput, amount: string | number, unit?: CalendarUnit): Date
```

Adds time to a date and returns a new `Date`. Months and years follow the calendar: January 31 plus one month is the end of February.

#### `nc.time.subtract()`

```ts
subtract(date: DateInput, amount: string | number, unit?: CalendarUnit): Date
```

Subtracts time from a date and returns a new `Date`.

#### `nc.time.diff()`

```ts
diff(a: DateInput, b: DateInput, unit?: CalendarUnit): number
```

`a - b` in a unit. Fixed units can give fractions; months and years are whole calendar months and years.

#### `nc.time.startOf()`

```ts
startOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

A new `Date` at the start of the day, week, month... in local time.

#### `nc.time.endOf()`

```ts
endOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

A new `Date` at the last millisecond of the day, week, month...

#### `nc.time.isBefore()`

```ts
isBefore(a: DateInput, b: DateInput): boolean
```

Is `a` before `b`?

#### `nc.time.isAfter()`

```ts
isAfter(a: DateInput, b: DateInput): boolean
```

Is `a` after `b`?

#### `nc.time.isBetween()`

```ts
isBetween(date: DateInput, start: DateInput, end: DateInput): boolean
```

Is the date between `start` and `end`, both included?

#### `nc.time.isSameDay()`

```ts
isSameDay(a: DateInput, b: DateInput, options?: TimeZoneOptions): boolean
```

Are both dates on the same calendar day?

#### `nc.time.isToday()`

```ts
isToday(date: DateInput, options?: TimeZoneOptions): boolean
```

Is the date today?

#### `nc.time.isYesterday()`

```ts
isYesterday(date: DateInput, options?: TimeZoneOptions): boolean
```

Was the date yesterday?

#### `nc.time.isTomorrow()`

```ts
isTomorrow(date: DateInput, options?: TimeZoneOptions): boolean
```

Is the date tomorrow?

#### `nc.time.isWeekend()`

```ts
isWeekend(date: DateInput, options?: TimeZoneOptions): boolean
```

Is it a Saturday or a Sunday?

#### `nc.time.isLeapYear()`

```ts
isLeapYear(yearOrDate: DateInput): boolean
```

Is it a leap year?

#### `nc.time.isValid()`

```ts
isValid(value: unknown): boolean
```

Is it a real date, or something that parses to one?

#### `nc.time.daysInMonth()`

```ts
daysInMonth(dateOrYear: DateInput, month?: number): number
```

Number of days in a month.

#### `nc.time.dayOfYear()`

```ts
dayOfYear(date?: DateInput): number
```

Day of the year, from 1 to 366.

#### `nc.time.weekOfYear()`

```ts
weekOfYear(date?: DateInput, options?: { utc?: boolean; } | undefined): number
```

ISO week number, from 1 to 53. Weeks start on Monday, and week 1 holds the year's first Thursday.

#### `nc.time.min()`

```ts
min(dates: Iterable<DateInput>): Date | undefined
```

The earliest date.

#### `nc.time.max()`

```ts
max(dates: Iterable<DateInput>): Date | undefined
```

The latest date.

#### `nc.time.unix()`

```ts
unix(): number
```

The current Unix timestamp, in seconds.

#### `nc.time.stopwatch()`

```ts
stopwatch(): Stopwatch
```

Starts a precise stopwatch.

#### `nc.time.measure()`

```ts
measure<T>(fn: () => T): Promise<{ result: Awaited<T>; duration: number; }>
```

Runs a function, sync or async, and tells you how long it took.

#### `nc.time.every()`

```ts
every(interval: string | number, task: () => unknown, options?: EveryOptions): ScheduledTask
```

Runs a task at a regular interval. Unlike `setInterval`, a slow run delays the next one instead of piling up, timing doesn't drift, and errors are caught.

#### `nc.time.nextRun()`

```ts
nextRun(expression: string, options?: CronOptions): Date | undefined
```

The next date matching a cron expression, without scheduling anything.

#### `nc.time.cron()`

```ts
cron(expression: string, task: () => unknown, options?: CronOptions): ScheduledTask
```

Runs a task on a cron schedule, in any time zone. Daylight-saving changes are handled: a skipped time is skipped, a repeated one runs once. See `nextRun()` for the syntax.

<details><summary>Types (15)</summary>

| Type | Description |
| --- | --- |
| `CalendarOptions` | Options for `calendar()`. |
| `CalendarUnit` | A fixed unit, or months and years, whose length varies. |
| `CronOptions` | Options for `cron()` and `nextRun()`. |
| `CronSpec` | Parsed cron fields. |
| `DateInput` | A date: a `Date`, a timestamp in ms, or a string `new Date()` understands (ISO 8601 is safest). |
| `DurationUnit` | A unit with a fixed length. |
| `EveryOptions` | Options for `every()`. |
| `FormatDateOptions` | Options for `format()`. |
| `FormatDurationOptions` | Options for `formatDuration()`. |
| `RelativeOptions` | Options for `relative()`. |
| `ScheduledTask` | A schedule returned by `every()` and `cron()`. |
| `StartOfUnit` | A unit for `startOf()` and `endOf()`. |
| `Stopwatch` | Returned by `stopwatch()`. |
| `TimeZoneOptions` | Time zone setting. |
| `WeekOptions` | Week settings. |

</details>

## nc.id

Unique ids: UUID v4 and v7, ULID, nanoid-style ids, Snowflakes, tokens
and short codes. All of them use the secure random generator of
`node:crypto`, with no bias.

Import on its own: `require("@ix-xs/node-comfort/id")`

#### `nc.id.uuid()`

```ts
uuid(): string
```

A random UUID (version 4). For ids that sort by date, see `uuidv7()`.

#### `nc.id.uuidv7()`

```ts
uuidv7(): string
```

A UUID v7: it starts with a timestamp, so ids sort by creation time. That keeps database indexes compact, which makes them great primary keys. Ids from the same process always increase, even within a millisecond.

#### `nc.id.ulid()`

```ts
ulid(time?: number): string
```

A ULID: 26 URL-safe characters that sort by creation time. Ids made in the same millisecond still increase.

#### `nc.id.nano()`

```ts
nano(size?: number, alphabet?: string): string
```

A short, URL-safe random id, like `nanoid`. At 21 characters, collisions are as unlikely as with a UUID.

#### `nc.id.customAlphabet()`

```ts
customAlphabet(alphabet: string, size?: number): (size?: number) => string
```

Makes an id generator with your own alphabet and length.

#### `nc.id.token()`

```ts
token(bytes?: number, encoding?: TokenEncoding): string
```

A random token for API keys, session ids, reset links...

#### `nc.id.code()`

```ts
code(length?: number, alphabet?: string): string
```

A short code that's easy to read aloud and type: no `0/O` or `1/I/L` mix-ups. For invites, coupons and verification codes.

#### `nc.id.snowflake()`

```ts
snowflake(options?: SnowflakeOptions): string
```

A Snowflake id, the 64-bit format used by Discord and Twitter. Returned as a string because it doesn't fit in a JavaScript number.

#### `nc.id.parseSnowflake()`

```ts
parseSnowflake(id: string | bigint, options?: SnowflakeOptions): ParsedSnowflake
```

Decodes a Snowflake. With the default epoch, it reads Discord ids.

#### `nc.id.timestamp()`

```ts
timestamp(value: string): Date | undefined
```

When a ULID or a UUID v7 was created.

#### `nc.id.seq()`

```ts
seq(prefix?: string): string
```

Readable sequential ids like `"user-1"`, `"user-2"`, counted per prefix. Only unique within the current process; handy in logs and tests.

#### `nc.id.hash()` (deprecated)

```ts
hash(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Hashes a value.

> Deprecated: Use `nc.crypto.hash()`. This alias goes away in 3.0.

#### `nc.id.hmac()` (deprecated)

```ts
hmac(value: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Signs a value with HMAC.

> Deprecated: Use `nc.crypto.hmac()`. This alias goes away in 3.0.

#### `nc.id.safeEqual()` (deprecated)

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compares two secrets in constant time.

> Deprecated: Use `nc.crypto.safeEqual()`. This alias goes away in 3.0.

<details><summary>Types (3)</summary>

| Type | Description |
| --- | --- |
| `ParsedSnowflake` | A decoded Snowflake. |
| `SnowflakeOptions` | Options for `snowflake()` and `parseSnowflake()`. |
| `TokenEncoding` | Encodings for `token()`. |

</details>

## nc.crypto

Crypto without the footguns, built on `node:crypto`: hashes, HMAC,
password hashing (scrypt), encryption (AES-256-GCM), JWT, two-factor
codes (TOTP) and secure random values.

Import on its own: `require("@ix-xs/node-comfort/crypto")`

#### `nc.crypto.hash()`

```ts
hash(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

Hashes data, SHA-256 in hex by default.

#### `nc.crypto.hmac()`

```ts
hmac(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: HashOptions): string
```

An HMAC signature: a hash keyed with a secret. The usual way to sign and check webhooks.

#### `nc.crypto.safeEqual()`

```ts
safeEqual(a: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, b: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>): boolean
```

Compares two secrets in constant time, so the comparison can't leak anything through timing. Use it instead of `===` for tokens, signatures and API keys.

#### `nc.crypto.hashPassword()`

```ts
hashPassword(password: string, options?: HashPasswordOptions): Promise<string>
```

Hashes a password with scrypt and a random salt. The result records its own settings, so you can raise the cost later without breaking old hashes.

#### `nc.crypto.verifyPassword()`

```ts
verifyPassword(password: string, stored: string): Promise<boolean>
```

Checks a password against a stored hash, in constant time. A wrong password or a broken hash gives `false`, never an error.

#### `nc.crypto.needsRehash()`

```ts
needsRehash(stored: string, options?: HashPasswordOptions): boolean
```

Was this hash made with weaker settings than yours? If so, re-hash the password right after a successful login.

#### `nc.crypto.generateKey()`

```ts
generateKey(): string
```

A random 256-bit key for `encrypt()`, as text you can put in an environment variable.

#### `nc.crypto.encrypt()`

```ts
encrypt(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: EncryptOptions): string
```

Encrypts data with AES-256-GCM, which also detects tampering. Every call uses a fresh salt and nonce, so the same text never encrypts the same way twice.

#### `nc.crypto.decrypt()`

```ts
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options: DecryptOptions & { output: "buffer"; }): Buffer<ArrayBufferLike>
decrypt(payload: string, secret: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: DecryptOptions): string
```

Decrypts what `encrypt()` produced. Throws if the secret is wrong or the data was changed.

#### `nc.crypto.signJWT()`

```ts
signJWT(payload: Record<string, unknown>, secret: string | Buffer<ArrayBufferLike>, options?: SignJWTOptions): string
```

Creates a signed JSON Web Token. `iat` is added for you.

#### `nc.crypto.decodeJWT()`

```ts
decodeJWT<P = Record<string, unknown>>(token: string): DecodedJWT<P>
```

Reads a JWT without checking it. Fine for display; call `verifyJWT()` before trusting anything in it.

#### `nc.crypto.verifyJWT()`

```ts
verifyJWT<P = Record<string, unknown>>(token: string, secret: string | Buffer<ArrayBufferLike>, options?: VerifyJWTOptions): P & JWTClaims
```

Verifies a JWT: algorithm, signature, expiry, and whichever claims you require. Returns the payload, or throws a `JWTError` whose `code` says what's wrong.

#### `nc.crypto.totpSecret()`

```ts
totpSecret(bytes?: number): string
```

A new two-factor secret, in the Base32 format authenticator apps expect. Store it encrypted.

#### `nc.crypto.totp()`

```ts
totp(secret: string, options?: TOTPOptions): string
```

The current 6-digit code for a two-factor secret, as shown by authenticator apps.

#### `nc.crypto.verifyTOTP()`

```ts
verifyTOTP(token: string, secret: string, options?: VerifyTOTPOptions): boolean
```

Checks a code typed by a user. Codes from the neighbouring periods are accepted too, to cope with clock drift.

#### `nc.crypto.totpURI()`

```ts
totpURI(secret: string, options: TOTPURIOptions): string
```

The `otpauth://` link to show as a QR code when a user turns on 2FA.

#### `nc.crypto.randomBytes()`

```ts
randomBytes(size: number): Buffer<ArrayBufferLike>
```

Secure random bytes.

#### `nc.crypto.randomInt()`

```ts
randomInt(min: number, max: number): number
```

A secure random integer from `min` to `max`, both included, with no bias. For anything that has to be fair or unpredictable.

#### `nc.crypto.toBase64()`

```ts
toBase64(data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: { urlSafe?: boolean; } | undefined): string
```

Encodes to Base64, or URL-safe Base64.

#### `nc.crypto.fromBase64()`

```ts
fromBase64(text: string, options: { output: "buffer"; }): Buffer<ArrayBufferLike>
fromBase64(text: string, options?: { output?: "utf8"; } | undefined): string
```

Decodes Base64 or URL-safe Base64.

<details><summary>Types (13)</summary>

| Type | Description |
| --- | --- |
| `DecodedJWT` | A decoded JWT. |
| `DecryptOptions` | Options for `decrypt()`. |
| `DigestEncoding` | Text encodings for digests. |
| `EncryptOptions` | Options for `encrypt()`. |
| `HashOptions` | Options for `hash()` and `hmac()`. |
| `HashPasswordOptions` | Options for `hashPassword()`. |
| `JWTAlgorithm` | Supported JWT algorithms. |
| `JWTClaims` | Standard JWT claims. |
| `SignJWTOptions` | Options for `signJWT()`. |
| `TOTPOptions` | Options for `totp()` and `verifyTOTP()`. |
| `TOTPURIOptions` | Options for `totpURI()`. |
| `VerifyJWTOptions` | Options for `verifyJWT()`. |
| `VerifyTOTPOptions` | Options for `verifyTOTP()`. `window` is how many periods before and after now are accepted (defaults to `1`). |

</details>

## nc.color

Terminal colors you can chain, like `chalk`. Truecolor is supported and
downgraded on older terminals. Colors switch off by themselves when the
output isn't a terminal or `NO_COLOR` is set; `FORCE_COLOR=1|2|3` turns
them back on.

Import on its own: `require("@ix-xs/node-comfort/color")`

#### `nc.color.level`

```ts
level: ColorLevel
```

The current color level. Set it to force one; `0` turns colors off.

#### `nc.color.enabled`

```ts
enabled: boolean
```

Whether colors are being output.

#### `nc.color.create()`

```ts
create(level?: ColorLevel): ColorModule
```

A separate instance with its own level, for another stream or for tests.

#### `nc.color.detect()`

```ts
detect(stream?: WriteStream | { isTTY?: boolean; } | undefined): ColorLevel
```

The color level a stream supports, taking `NO_COLOR` and `FORCE_COLOR` into account.

#### `nc.color.strip()`

```ts
strip(text: string): string
```

Removes colors and other terminal escape codes.

#### `nc.color.width()`

```ts
width(text: string): number
```

How many columns the text takes, ignoring colors and counting emoji and CJK as 2.

#### `nc.color.link()`

```ts
link(text: string, url: string): string
```

A clickable link in terminals that support it, `"text (url)"` elsewhere.

#### `nc.color.gradient()`

```ts
gradient(text: string, colors: string[]): string
```

Colors the text along a gradient of hex colors.

**Also available**: `reset` • `bold` • `dim` • `italic` • `underline` • `overline` • `inverse` • `hidden` • `strikethrough` • `black` • `red` • `green` • `yellow` • `blue` • `magenta` • `cyan` • `white` • `gray` • `grey` • `blackBright` • `redBright` • `greenBright` • `yellowBright` • `blueBright` • `magentaBright` • `cyanBright` • `whiteBright` • `bgBlack` • `bgRed` • `bgGreen` • `bgYellow` • `bgBlue` • `bgMagenta` • `bgCyan` • `bgWhite` • `bgGray` • `bgGrey` • `bgBlackBright` • `bgRedBright` • `bgGreenBright` • `bgYellowBright` • `bgBlueBright` • `bgMagentaBright` • `bgCyanBright` • `bgWhiteBright` • `rgb` • `bgRgb` • `hex` • `bgHex` • `ansi256` • `bgAnsi256`

<details><summary>Types (9)</summary>

| Type | Description |
| --- | --- |
| `ColorChain` | A style you can call on text, or chain with more styles. |
| `ColorHelpers` | Color helpers. |
| `ColorLevel` | How many colors the terminal can show: `0` none, `1` 16, `2` 256, `3` millions. |
| `ColorMethods` | Custom colors, available on every chain. |
| `ColorModule` | `nc.color`: every style and color, plus a few helpers. |
| `ColorStyleProps` | The named styles. Each one can be called on text or chained with others: `color.red("x")`, `color.red.bold.underline("x")`. |
| `ColorStyles` | The named styles, read-only. |
| `StyleEntry` | A style in a chain: fixed codes, or a color resolved at output time. |
| `StyleName` | Every named style. |

</details>

## nc.cli

What you need for command-line tools: typed arguments with a generated
`--help`, prompts, arrow-key menus, spinners, progress bars, tables and
boxes. When nobody's at the keyboard (CI, pipes), prompts read plain lines
and animations print only their final state.

Import on its own: `require("@ix-xs/node-comfort/cli")`

#### `nc.cli.table()`

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): string
```

Draws a table from an array of objects (keys become columns) or an array of arrays. Colors, emoji and CJK characters line up correctly.

#### `nc.cli.box()`

```ts
box(text: string, options?: BoxOptions): string
```

Draws a box around text.

#### `nc.cli.spinner()`

```ts
spinner(text?: string, options?: SpinnerOptions): Spinner
```

A spinner for work in progress. Call `.start()`, then finish with `.succeed()`, `.fail()`, `.warn()`, `.info()` or `.stop()`.

#### `nc.cli.progress()`

```ts
progress(options: ProgressOptions): ProgressBar
```

A progress bar with percentage, ETA and speed. It redraws at most every 50 ms, so calling `tick()` in a tight loop is fine.

#### `nc.cli.prompt()`

```ts
prompt(question: string, options?: PromptOptions): Promise<string>
```

Asks a question and returns the answer. With `validate`, it keeps asking until the answer is valid.

#### `nc.cli.password()`

```ts
password(question: string, options?: { mask?: string; input?: ReadStream; output?: WriteStream; } | undefined): Promise<string>
```

Asks for a secret without showing it; each character appears as `*`.

#### `nc.cli.confirm()`

```ts
confirm(question: string, options?: ConfirmOptions): Promise<boolean>
```

Asks a yes/no question. Understands `y`, `yes`, `o`, `oui`, `true`, `1` and their opposites; an empty answer gives the default.

#### `nc.cli.select()`

```ts
select<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V>
```

Lets the user pick one choice with the arrow keys and Enter. Without an interactive terminal, it prints a numbered list and reads a number.

#### `nc.cli.multiselect()`

```ts
multiselect<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V[]>
```

Lets the user pick several choices: arrows to move, Space to toggle, `a` for all, Enter to confirm.

#### `nc.cli.args()`

```ts
args<S extends Record<string, FlagSpec>>(schema: S, options?: ArgsOptions): ParsedArgs<S>
```

Parses command-line arguments from a schema, and types the result: `flags.port` is a `number`. Handles short aliases, defaults, required flags, allowed values, repeated flags and `--no-flag`, and generates `--help`. A typo gets a "Did you mean...?" suggestion.

#### `nc.cli.isInteractive()`

```ts
isInteractive(): boolean
```

Is someone at the keyboard? True when stdin and stdout are terminals and we're not in CI.

#### `nc.cli.size()`

```ts
size(): { columns: number; rows: number; }
```

The terminal size, or 80x24 when it's unknown.

#### `nc.cli.clear()`

```ts
clear(): void
```

Clears the screen. Does nothing when stdout isn't a terminal.

<details><summary>Types (18)</summary>

| Type | Description |
| --- | --- |
| `ArgsOptions` | Options for `args()`. |
| `BorderStyle` | Border styles for `table()` and `box()`. |
| `BoxOptions` | Options for `box()`. |
| `Choice` | A choice for `select()` and `multiselect()`: a string, or a label with a value of any type. |
| `ConfirmOptions` | Options for `confirm()`. |
| `FlagSpec` | A flag for `args()`. |
| `FlagValue` | The type of a flag's value. |
| `LineReader` | One line reader per input stream, shared by every prompt, so piped lines that arrive early are queued instead of lost. |
| `ParsedArgs` | What `args()` returns. |
| `ParsedFlags` | The parsed flags, typed from the schema. |
| `ProgressBar` | A progress bar. |
| `ProgressOptions` | Options for `progress()`. |
| `PromptOptions` | Options for `prompt()`. |
| `SelectOptions` | Options for `select()` and `multiselect()`. |
| `Spinner` | A spinner. Every method returns it. |
| `SpinnerOptions` | Options for `spinner()`. |
| `TableColumn` | A column of `table()`. |
| `TableOptions` | Options for `table()`. |

</details>

## nc.sys

Processes and the system: run commands and get their output, find
executables, shut down cleanly, open URLs, and learn about the machine.
Behaves the same on Windows, macOS and Linux; on Windows,
`run("npm", [...])` finds `npm.cmd` and escapes arguments safely.

Import on its own: `require("@ix-xs/node-comfort/sys")`

#### `nc.sys.run()`

```ts
run(file: string, args?: string[], options?: RunOptions): Promise<RunResult>
```

Runs a program without a shell, so arguments are passed as they are and user input can't inject anything. Resolves with the output; rejects with a `ProcessError` if the exit code isn't 0.

#### `nc.sys.exec()`

```ts
exec(command: string, options?: RunOptions): Promise<RunResult>
```

Runs a command line through the shell, so pipes, `&&` and variables work. Don't build it from untrusted input; use `run()` for that.

#### `nc.sys.which()`

```ts
which(command: string): string | undefined
```

Finds an executable in `PATH`, like the `which` command.

#### `nc.sys.open()`

```ts
open(target: string): boolean
```

Opens a URL, file or folder with the default app.

#### `nc.sys.onShutdown()`

```ts
onShutdown(handler: () => unknown, options?: ShutdownOptions): () => void
```

Runs cleanup code when the process is asked to stop (Ctrl+C, `docker stop`, `kill`): close servers, flush logs, disconnect databases. Handlers run in reverse order, then the process exits. If they take longer than `timeout`, the exit is forced; a second Ctrl+C exits at once.

#### `nc.sys.isWindows()`

```ts
isWindows(): boolean
```

Are we on Windows?

#### `nc.sys.isMac()`

```ts
isMac(): boolean
```

Are we on macOS?

#### `nc.sys.isLinux()`

```ts
isLinux(): boolean
```

Are we on Linux? WSL counts.

#### `nc.sys.isCI()`

```ts
isCI(): boolean
```

Are we running in CI? Detects GitHub Actions, GitLab, CircleCI, Jenkins, Azure, Vercel, Netlify and more.

#### `nc.sys.isDocker()`

```ts
isDocker(): boolean
```

Are we running inside a container?

#### `nc.sys.isWSL()`

```ts
isWSL(): boolean
```

Are we running in WSL?

#### `nc.sys.info()`

```ts
info(): SystemInfo
```

Facts about the machine and the runtime, handy for bug reports.

#### `nc.sys.memory()`

```ts
memory(): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number; }
```

Memory used by this process, in bytes.

<details><summary>Types (4)</summary>

| Type | Description |
| --- | --- |
| `RunOptions` | Options for `run()` and `exec()`. |
| `RunResult` | A finished command. |
| `ShutdownOptions` | Options for `onShutdown()`. They apply to all handlers. |
| `SystemInfo` | Returned by `info()`. |

</details>

## nc.async

Promises and concurrency: map with a limit, queues with priorities,
mutexes, polling, and friendlier `Promise.allSettled`.

Import on its own: `require("@ix-xs/node-comfort/async")`

#### `nc.async.sleep()`

```ts
sleep(duration: string | number, options?: { signal?: AbortSignal; } | undefined): Promise<void>
```

Waits for a while. Same as `nc.wait()`.

#### `nc.async.map()`

```ts
map<T, R>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => R | PromiseLike<R>, options?: MapOptions): Promise<Awaited<R>[]>
```

Maps items through an async function, with at most `concurrency` calls at once. Results stay in order.

#### `nc.async.forEach()`

```ts
forEach<T>(items: Iterable<T> | AsyncIterable<T>, fn: (item: T, index: number) => unknown, options?: MapOptions): Promise<void>
```

Runs an async function for every item, with a concurrency limit.

#### `nc.async.filter()`

```ts
filter<T>(items: Iterable<T> | AsyncIterable<T>, predicate: (item: T, index: number) => unknown, options?: MapOptions): Promise<T[]>
```

Keeps the items that pass an async test, with a concurrency limit. Order is preserved.

#### `nc.async.series()`

```ts
series<T>(tasks: Iterable<() => T | PromiseLike<T>>): Promise<Awaited<T>[]>
```

Runs async functions one after the other and returns their results.

#### `nc.async.limit()`

```ts
limit(concurrency: number): Limiter
```

A limiter: wrap calls with it, and at most `concurrency` run at once while the rest wait their turn. Like `p-limit`.

#### `nc.async.queue()`

```ts
queue(options?: QueueOptions): Queue
```

A task queue with a concurrency limit, priorities, pause and per-task timeouts.

#### `nc.async.mutex()`

```ts
mutex(): Mutex
```

A mutex: tasks given to `run()` never overlap. Put it around read-modify-write steps, like updating a file or refreshing a token.

#### `nc.async.deferred()`

```ts
deferred<T = void>(): Deferred<T>
```

A promise along with its `resolve` and `reject`. Handy to connect callbacks or events to `await`.

#### `nc.async.settle()`

```ts
settle<T>(promises: Iterable<T | PromiseLike<T>>): Promise<Settled<Awaited<T>>>
```

Waits for every promise and sorts successes from failures.

#### `nc.async.props()`

```ts
props<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]>; }>
```

Like `Promise.all`, for an object of promises.

#### `nc.async.poll()`

```ts
poll<T>(fn: () => T | PromiseLike<T>, options?: PollOptions): Promise<NonNullable<Awaited<T>>>
```

Calls `fn` until it returns something truthy, and resolves with it. Errors count as "not yet".

#### `nc.async.retry()`

```ts
retry<T>(fn: (attempt: number) => T | PromiseLike<T>, options?: RetryOptions): Promise<Awaited<T>>
```

Calls `fn` until it succeeds, waiting between attempts. If every attempt fails, the last error is thrown.

#### `nc.async.timeout()`

```ts
timeout<T>(promise: PromiseLike<T> | (() => T | PromiseLike<T>), ms: number, message?: string): Promise<Awaited<T>>
```

Rejects with a `TimeoutError` if the promise takes longer than `ms`.

<details><summary>Types (9)</summary>

| Type | Description |
| --- | --- |
| `Deferred` | A promise with its `resolve` and `reject`. |
| `Limiter` | A limiter from `limit()`. Call it with a function to run it when there's room. |
| `MapOptions` | Options for `map()`, `forEach()` and `filter()`. |
| `Mutex` | A mutex from `mutex()`. |
| `PollOptions` | Options for `poll()`. |
| `Queue` | A queue from `queue()`. |
| `QueueAddOptions` | Options for `queue.add()`. |
| `QueueOptions` | Options for `queue()`. |
| `Settled` | What `settle()` returns. |

</details>

## nc.schema

Validate data with schemas, in the spirit of `zod`. Describe your data
once and get both a runtime check with clear messages and the TypeScript
type, `Infer<typeof schema>`. Schemas never change: `.min()` or
`.optional()` return a new one.

Import on its own: `require("@ix-xs/node-comfort/schema")`

#### `nc.schema.string()`

```ts
string(options?: { message?: Message; } | undefined): StringSchema
```

A string schema.

#### `nc.schema.number()`

```ts
number(options?: { message?: Message; } | undefined): NumberSchema
```

A number. `NaN` and `Infinity` are refused.

#### `nc.schema.boolean()`

```ts
boolean(options?: { message?: Message; } | undefined): BooleanSchema
```

A boolean schema.

#### `nc.schema.bigint()`

```ts
bigint(options?: { message?: Message; } | undefined): BigIntSchema
```

A bigint schema.

#### `nc.schema.date()`

```ts
date(options?: { message?: Message; } | undefined): DateSchema
```

A valid `Date`.

#### `nc.schema.literal()`

```ts
literal<L extends string | number | boolean | bigint | null | undefined>(value: L): LiteralSchema<L>
```

Exactly this value.

#### `nc.schema.enum()`

```ts
enum<V extends string | number>(values: readonly V[], options?: { message?: Message; } | undefined): LiteralSchema<V>
```

One of these values. The type is their union.

#### `nc.schema.array()`

```ts
array<T>(item: Schema<T>): ArraySchema<T>
```

An array whose items all match `item`.

#### `nc.schema.object()`

```ts
object<S extends Shape>(shape: S): ObjectSchema<S>
```

An object with known keys. Unknown keys are dropped; `.strict()` rejects them and `.passthrough()` keeps them.

#### `nc.schema.union()`

```ts
union<U extends ReadonlyArray<Schema<any>>>(options: U): UnionSchema<Infer<U[number]>>
```

Matches any of these schemas; the first that fits wins.

#### `nc.schema.tuple()`

```ts
tuple<T extends [Schema<any>, ...Schema<any>[]] | []>(items: T): TupleSchema<{ -readonly [K in keyof T]: Infer<T[K]>; }>
```

A fixed-length array with one schema per position.

#### `nc.schema.record()`

```ts
record<V>(values: Schema<V>, keys?: Schema<string>): RecordSchema<V>
```

An object with any keys whose values match a schema, like a dictionary.

#### `nc.schema.lazy()`

```ts
lazy<T>(getter: () => Schema<T>): LazySchema<T>
```

A schema defined later, for recursive data like trees.

#### `nc.schema.instanceOf()`

```ts
instanceOf<C extends new (...args: any[]) => any>(ctor: C, message?: Message): CustomSchema<InstanceType<C>>
```

An instance of a class.

#### `nc.schema.custom()`

```ts
custom<T = unknown>(test: ((value: unknown) => value is T) | ((value: unknown) => boolean), message?: Message): CustomSchema<T>
```

A schema from any test, usually a type guard.

#### `nc.schema.any()`

```ts
any(): Schema<any>
```

Anything, typed as `any`.

#### `nc.schema.unknown()`

```ts
unknown(): Schema<unknown>
```

Anything, typed as `unknown`.

#### `nc.schema.coerce`

```ts
coerce: CoerceBuilders
```

Schemas that convert their input before checking it. Query strings, form fields and environment variables are always strings, so this is what you want for them.

#### `nc.schema.Schema`

```ts
Schema: typeof Schema
```

The base of every schema.

<details><summary>Types (10)</summary>

| Type | Description |
| --- | --- |
| `CoerceBuilders` | The `s.coerce` builders. |
| `Infer` | The type a schema produces. |
| `Message` | An error message: a string, or a function that gets the invalid value. |
| `ObjectOutput` | The type of an object schema. Keys that accept `undefined` become optional. |
| `ParseContext` |   |
| `RefineOptions` | Options for `refine()`. |
| `SafeParseResult` | What `safeParse()` returns. |
| `Shape` | An object of schemas, as passed to `object()`. |
| `Simplify` | Flattens a type so editors show it nicely. |
| `Step` | A step in a schema: a check, a transformation or a refinement. |

</details>

## nc.http

An HTTP client on top of `fetch`: JSON by default, query objects, base
URLs, timeouts, safe retries that respect `Retry-After`, typed errors,
hooks, reusable clients and downloads with progress.

Import on its own: `require("@ix-xs/node-comfort/http")`

#### `nc.http.request()`

```ts
request<T = any>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a request and resolves with the response, body already read. Throws an `HttpError` for error statuses, a `TimeoutError` when it's too slow and an `AbortError` when cancelled.

#### `nc.http.get()`

```ts
get<T = any>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a GET request.

#### `nc.http.head()`

```ts
head<T = undefined>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a HEAD request: headers only, no body.

#### `nc.http.post()`

```ts
post<T = any>(url: string | URL, data?: unknown, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a POST request. Objects, arrays, numbers and booleans go as JSON; strings, Buffers, `FormData`, Blobs and streams go as they are.

#### `nc.http.put()`

```ts
put<T = any>(url: string | URL, data?: unknown, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a PUT request. The body works like in `post()`.

#### `nc.http.patch()`

```ts
patch<T = any>(url: string | URL, data?: unknown, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a PATCH request. The body works like in `post()`.

#### `nc.http.delete()`

```ts
delete<T = any>(url: string | URL, options?: HttpOptions): Promise<HttpResponse<T>>
```

Sends a DELETE request.

#### `nc.http.download()`

```ts
download(url: string | URL, destination: string, options?: HttpOptions): Promise<{ path: string; size: number; }>
```

Downloads to a file as a stream, so memory stays flat whatever the size. Folders are created, and a partial file is removed if it fails.

#### `nc.http.create()`

```ts
create(defaults?: HttpOptions): HttpClient
```

Creates a client with default options. Options passed to each call are merged on top.

#### `nc.http.HttpError`

```ts
HttpError: typeof HttpError
```

Thrown by `nc.http` when the response status isn't 2xx (unless you pass `throwHttpErrors: false`), and for network failures (`status` 0).

<details><summary>Types (9)</summary>

| Type | Description |
| --- | --- |
| `HttpBody` | A request body. |
| `HttpClient` | A client with its own defaults, from `create()`. |
| `HttpHooks` | Hooks to watch or change requests. |
| `HttpMethod` | An HTTP method. |
| `HttpOptions` | Request options. |
| `HttpRequestConfig` | A request as hooks see it. |
| `HttpResponse` | A response. |
| `HttpRetryOptions` | Retry settings. |
| `QueryParams` | Query string values. `null` and `undefined` are skipped, arrays repeat the key. |

</details>

## nc.env

Environment variables you can trust: `.env` loading, typed getters, and
`validate()` to check your whole configuration at startup and report
every problem at once.

The `.env` file in the working directory is loaded when the package is
required; variables that are already set are never overwritten. Set
`NODE_COMFORT_DOTENV=false` to turn that off.

Import on its own: `require("@ix-xs/node-comfort/env")`

#### `nc.env.parse()`

```ts
parse(content: string, options?: EnvParseOptions): Record<string, string>
```

Parses the text of a `.env` file: quotes, multi-line values, `export`, comments, escapes, and `${VAR}` expansion (except in single quotes).

#### `nc.env.load()`

```ts
load(files?: string | string[], options?: EnvLoadOptions): Record<string, string>
```

Loads `.env` files into `process.env`. The first file to set a variable wins, and variables that are already set are kept, unless you pass `override`.

#### `nc.env.get()`

```ts
get(name: string, fallback?: string): string | undefined
```

Reads a variable, with a fallback. Never throws.

#### `nc.env.has()`

```ts
has(name: string): boolean
```

Is the variable set, even to an empty string?

#### `nc.env.required()`

```ts
required(name: string): string
```

Reads a variable that must be set and not empty.

#### `nc.env.string()`

```ts
string(name: string, options?: (EnvGetterOptions<string> & { pattern?: RegExp; minLength?: number; }) | undefined): string
```

Reads a string. Required unless you give a default or `optional`.

#### `nc.env.number()`

```ts
number(name: string, options?: (EnvGetterOptions<number> & { min?: number; max?: number; integer?: boolean; }) | undefined): number
```

Reads a number.

#### `nc.env.bool()`

```ts
bool(name: string, options?: EnvGetterOptions<boolean>): boolean
```

Reads a boolean: `true`/`false`, `1`/`0`, `yes`/`no` or `on`/`off`.

#### `nc.env.port()`

```ts
port(name: string, options?: EnvGetterOptions<number>): number
```

Reads a port number.

#### `nc.env.url()`

```ts
url(name: string, options?: (EnvGetterOptions<string> & { protocols?: string[]; }) | undefined): string
```

Reads an absolute URL.

#### `nc.env.duration()`

```ts
duration(name: string, options?: EnvGetterOptions<string | number>): number
```

Reads a duration like `"30s"` or `"1h30m"` and returns milliseconds.

#### `nc.env.list()`

```ts
list(name: string, options?: (EnvGetterOptions<string[]> & { separator?: string; }) | undefined): string[]
```

Reads a comma-separated list. Items are trimmed and empty ones dropped.

#### `nc.env.json()`

```ts
json<T = any>(name: string, options?: EnvGetterOptions<T>): T
```

Reads a JSON value.

#### `nc.env.oneOf()`

```ts
oneOf<V extends string>(name: string, values: readonly V[], options?: EnvGetterOptions<V>): V
```

Reads a variable that must be one of the given values. The result has their literal type.

#### `nc.env.validate()`

```ts
validate<T extends Record<string, EnvVarSpec>>(spec: T, options?: { env?: ProcessEnv; } | undefined): Readonly<EnvConfig<T>>
```

Checks all your variables at once and returns a typed, frozen config. If anything is wrong, one `ValidationError` lists every problem, so a bad deployment fails at startup with the full picture.

#### `nc.env.mode()`

```ts
mode(): string
```

`NODE_ENV`, or `"development"` when it's not set.

#### `nc.env.isProduction()`

```ts
isProduction(): boolean
```

Is `NODE_ENV` set to `"production"`?

#### `nc.env.isDevelopment()`

```ts
isDevelopment(): boolean
```

Is `NODE_ENV` `"development"`, or not set?

#### `nc.env.isTest()`

```ts
isTest(): boolean
```

Are we running tests? True when `NODE_ENV` is `"test"` or a test runner like `node --test` or Jest is detected.

<details><summary>Types (6)</summary>

| Type | Description |
| --- | --- |
| `EnvConfig` | What `validate()` returns. |
| `EnvGetterOptions` | Options shared by the typed getters. |
| `EnvLoadOptions` | Options for `load()`. |
| `EnvParseOptions` | Options for `parse()`. |
| `EnvVarSpec` | One variable in `validate()`. It's required unless it has a `default` or `optional: true`. |
| `EnvVarValue` | The type a variable gets once read. |

</details>

## nc.errors

The errors node-comfort throws. They all extend `NodeComfortError` (itself
a regular `Error`) and carry a stable `code`, so you can branch on the
kind of failure without parsing messages.

Import on its own: `require("@ix-xs/node-comfort/errors")`

#### `nc.errors.NodeComfortError`

```ts
NodeComfortError: typeof NodeComfortError
```

Base class of every node-comfort error. `name` is the class name and `code` a stable identifier.

#### `nc.errors.AssertionError`

```ts
AssertionError: typeof AssertionError
```

Thrown by `nc.assert()` and `nc.assertType()`.

#### `nc.errors.TimeoutError`

```ts
TimeoutError: typeof TimeoutError
```

Thrown when something takes too long: `func.timeout`, `async.poll`, HTTP requests, `emitter.waitFor`...

#### `nc.errors.AbortError`

```ts
AbortError: typeof AbortError
```

Thrown when an operation is cancelled with an `AbortSignal`. Its name is `"AbortError"`, like native abort errors, so existing checks keep working.

#### `nc.errors.ValidationError`

```ts
ValidationError: typeof ValidationError
```

Thrown when data doesn't match a schema or when environment variables are invalid. `issues` lists every problem, not just the first one.

#### `nc.errors.HttpError`

```ts
HttpError: typeof HttpError
```

Thrown by `nc.http` when the response status isn't 2xx (unless you pass `throwHttpErrors: false`), and for network failures (`status` 0).

#### `nc.errors.JWTError`

```ts
JWTError: typeof JWTError
```

Thrown by `nc.crypto.verifyJWT()`. The `code` tells you why: `ERR_JWT_MALFORMED`, `ERR_JWT_ALGORITHM`, `ERR_JWT_SIGNATURE`, `ERR_JWT_EXPIRED`, `ERR_JWT_NOT_BEFORE` or `ERR_JWT_CLAIM`.

#### `nc.errors.ProcessError`

```ts
ProcessError: typeof ProcessError
```

Thrown by `nc.sys.run()` and `nc.sys.exec()` when a command fails, is killed or times out. Its output is kept on the error.

#### `nc.errors.SQLiteError`

```ts
SQLiteError: typeof SQLiteError
```

Thrown by `nc.SQLite` when a statement fails. Check `sqliteCode` to handle specific cases like a duplicate value.

<details><summary>Types (2)</summary>

| Type | Description |
| --- | --- |
| `NodeComfortErrorOptions` | Options shared by every error constructor. |
| `ValidationIssue` | One problem found while validating data. |

</details>

## Class nc.SQLite

SQLite made pleasant, on the engine built into Node.js (22.13+): CRUD with
rich filters, JSON and boolean columns, transactions, migrations and
backups. Methods are synchronous, like the engine, but `await` still
works. Errors are `SQLiteError`s. Values are always bound as parameters
and names are checked, so there's no SQL injection through them.

Import on its own: `require("@ix-xs/node-comfort/sqlite")`

#### `new nc.SQLite()`

```ts
new SQLite<R = Record<string, any>>(path?: string, options?: SQLiteOptions): SQLite<R>
```

Opens a database, creating the file and its folders if needed. Use `":memory:"` for a throwaway in-memory database.

#### `db.exec()`

```ts
exec(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): { changes: number; lastInsertRowid: number | bigint; }
```

Runs SQL that doesn't return rows. Without parameters, you can pass several statements at once.

#### `db.queryOne()`

```ts
queryOne<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T | undefined
```

Runs a query and returns the first row. When it reads a single table, JSON and boolean columns are converted.

#### `db.queryAll()`

```ts
queryAll<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T[]
```

Runs a query and returns every row.

#### `db.iterate()`

```ts
iterate<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): Generator<T, void, undefined>
```

Goes through the rows of a query one at a time, without loading them all. For big exports.

#### `db.createTable()`

```ts
createTable(table: TableDefinition): { ok: true; }
```

Creates a table with its constraints and indexes, unless it already exists. To change an existing table, use `migrate()`.

#### `db.createIndex()`

```ts
createIndex(tableName: string, index: IndexDefinition): { ok: true; }
```

Creates an index, unless it already exists.

#### `db.deleteTable()`

```ts
deleteTable(tableName: string): { ok: true; }
```

Drops a table and everything in it.

#### `db.clearTable()`

```ts
clearTable(tableName: string): { ok: true; }
```

Deletes every row, keeping the table.

#### `db.hasTable()`

```ts
hasTable(tableName: string): boolean
```

Does the table exist?

#### `db.tables()`

```ts
tables(): string[]
```

The tables in the database, sorted.

#### `db.columns()`

```ts
columns(tableName: string): ColumnInfo[]
```

The columns of a table.

#### `db.get()`

```ts
get<T = R>(tableName: string, where?: Where<R>, options?: Pick<QueryOptions, "columns" | "orderBy" | "direction">): T | undefined
```

The first row that matches.

#### `db.getAll()`

```ts
getAll<T = R>(tableName: string, where?: Where<R>, options?: QueryOptions): T[]
```

The rows that match, with sorting and pagination.

#### `db.count()`

```ts
count(tableName: string, where?: Where<R>): number
```

Counts the rows that match.

#### `db.exists()`

```ts
exists(tableName: string, where?: Where<R>): boolean
```

Does any row match?

#### `db.insert()`

```ts
insert(tableName: string, data: Partial<R> & Record<string, unknown>): InsertResult
```

Inserts a row. Objects and arrays are stored as JSON, booleans as 1 and 0, dates as ISO strings. `undefined` values are skipped, so column defaults apply.

#### `db.insertMany()`

```ts
insertMany(tableName: string, rows: (Partial<R> & Record<string, unknown>)[]): ChangeResult
```

Inserts many rows in one transaction: all or nothing, and much faster than one by one.

#### `db.update()`

```ts
update(tableName: string, data: Partial<R> & Record<string, unknown>, where: Where<R>): ChangeResult
```

Updates the rows that match. The filter is required, so a forgotten condition can't rewrite the whole table.

#### `db.upsert()`

```ts
upsert(tableName: string, data: Partial<R> & Record<string, unknown>, conflict: string[]): InsertResult
```

Inserts a row, or updates it in place if it clashes with an existing one on the `conflict` columns.

#### `db.set()`

```ts
set(tableName: string, data: Partial<R> & Record<string, unknown>, where?: Where<R> | null): { ok: true; }
```

Updates the row matching `where` (or `{ id: data.id }`), or inserts it. Kept from 1.x; `upsert()` does the same in one atomic statement.

#### `db.delete()`

```ts
delete(tableName: string, where: Where<R>): ChangeResult
```

Deletes the rows that match. The filter is required; `clearTable()` deletes everything on purpose.

#### `db.table()`

```ts
table<T = R>(tableName: string): TableHandle<T>
```

Shortcuts bound to one table, so you don't repeat its name.

#### `db.transaction()`

```ts
transaction<T>(callback: () => T): T
```

Runs `callback` in a transaction: all its changes are saved together, or none are if it throws. The error is then thrown again. Transactions can nest; an inner failure can be caught without losing the outer work.

#### `db.inTransaction`

```ts
inTransaction: boolean
```

Whether a transaction is open.

#### `db.migrate()`

```ts
migrate(migrations: Migration[]): { from: number; to: number; }
```

Applies migrations in order, each one once. The current version is kept in the database, and each migration runs in its own transaction. Only ever add migrations at the end of the list.

#### `db.version`

```ts
version: number
```

The migration version, stored in `PRAGMA user_version`.

#### `db.backup()`

```ts
backup(path: string): string
```

Copies the database to a new file. Safe while the app is running.

#### `db.vacuum()`

```ts
vacuum(): void
```

Compacts the database file to reclaim unused space.

#### `db.fn()`

```ts
fn(name: string, implementation: (...args: any[]) => string | number | bigint | Uint8Array<ArrayBufferLike> | null, options?: { deterministic?: boolean; varargs?: boolean; } | undefined): SQLite<R>
```

Makes a JavaScript function callable from SQL.

#### `db.path`

```ts
path: string
```

The absolute path of the database file, or `":memory:"`.

#### `db.isOpen`

```ts
isOpen: boolean
```

Whether the connection is open.

#### `db.native`

```ts
native: DatabaseSync
```

The underlying `node:sqlite` database, for anything not covered here.

#### `db.close()`

```ts
close(): void
```

Closes the connection. Calling it twice is fine.

<details><summary>Types (17)</summary>

| Type | Description |
| --- | --- |
| `ChangeResult` | What an update or delete returns. |
| `ColumnDefinition` | A column. |
| `ColumnInfo` | A column, as returned by `columns()`. |
| `ColumnType` | A column type. `JSON` and `BOOLEAN` columns give you back objects and `true`/`false`. |
| `ForeignKeyAction` | What happens to a row when the row it references changes. |
| `IndexDefinition` | An index. |
| `InsertResult` | What an insert returns. |
| `Migration` | A migration: SQL (several statements are fine), or a function that gets the database. |
| `QueryOptions` | Options for `getAll()`. |
| `SortDirection` | Sort direction. |
| `SQLiteOptions` | Options for `new SQLite()`. |
| `TableConstraint` | A constraint on several columns. |
| `TableDefinition` | A table for `createTable()`. |
| `TableHandle` | Shortcuts bound to one table, from `table()`. |
| `Where` | A filter. Each key is a column: a value means "equals", `null` means `IS NULL`, an array means "one of", and an object uses operators. Keys combine with AND; use `$or` and `$and` for the rest. |
| `WhereOperators` | Operators for a column in a filter. |
| `WhereValue` | The condition for one column: a value, `null`, an array, or operators. |

</details>

## Class nc.Cache

An in-memory cache with a size limit (the least recently used entries go
first), expiry per entry, and stats. `getOrSet()` loads a missing value
only once, even when many callers ask for it at the same moment.

Import on its own: `require("@ix-xs/node-comfort/cache")`

#### `new nc.Cache()`

```ts
new Cache<K, V>(options?: CacheOptions<K, V>): Cache<K, V>
```

#### `cache.get()`

```ts
get(key: K): V | undefined
```

Reads a value and marks it as recently used.

#### `cache.peek()`

```ts
peek(key: K): V | undefined
```

Reads a value without counting it as a use or touching the stats.

#### `cache.set()`

```ts
set(key: K, value: V, options?: CacheSetOptions): Cache<K, V>
```

Stores a value. When the cache is full, the least recently used entry goes.

#### `cache.getOrSet()`

```ts
getOrSet(key: K, loader: () => V | PromiseLike<V>, options?: CacheSetOptions): Promise<V>
```

Returns the cached value, or calls `loader`, stores the result and returns it. Simultaneous calls for the same key share one `loader` call, and a failed load caches nothing.

#### `cache.has()`

```ts
has(key: K): boolean
```

Is there a fresh entry for this key? Doesn't count as a use.

#### `cache.delete()`

```ts
delete(key: K): boolean
```

Removes an entry.

#### `cache.clear()`

```ts
clear(): void
```

Removes every entry. Stats are kept.

#### `cache.prune()`

```ts
prune(): number
```

Removes expired entries now instead of waiting for them to be read.

#### `cache.ttl()`

```ts
ttl(key: K): number | undefined
```

Time left before an entry expires.

#### `cache.wrap()`

```ts
wrap<A extends any[]>(fn: (...args: A) => V | PromiseLike<V>, options?: { key?: ((...args: A) => K) | undefined; ttl?: string | number; } | undefined): (...args: A) => Promise<V>
```

Wraps a function so its results are cached here.

#### `cache.size`

```ts
size: number
```

Number of entries, including expired ones not yet removed.

#### `cache.stats`

```ts
stats: CacheStats
```

Hit and miss counts.

#### `cache.keys()`

```ts
keys(): K[]
```

Fresh keys, least recently used first.

#### `cache.values()`

```ts
values(): V[]
```

Fresh values, least recently used first.

#### `cache.entries()`

```ts
entries(): [K, V][]
```

Fresh `[key, value]` pairs, least recently used first.

<details><summary>Types (4)</summary>

| Type | Description |
| --- | --- |
| `CacheOptions` | Options for `new Cache()`. |
| `CacheRemovalReason` | Why an entry left the cache. |
| `CacheSetOptions` | Options for `set()` and `getOrSet()`. |
| `CacheStats` | Cache stats. |

</details>

## Class nc.Emitter

A small typed event emitter. Declare your events once, and your editor
checks every event name and listener argument. `on()` returns a function
that removes the listener, and you can `await` an event or loop over
events with `for await`.

Import on its own: `require("@ix-xs/node-comfort/emitter")`

#### `new nc.Emitter()`

```ts
new Emitter<Events extends EventMap = EventMap>(): Emitter<Events>
```

#### `events.on()`

```ts
on<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => unknown): () => void
```

Listens to an event.

#### `events.once()`

```ts
once<K extends keyof Events & string>(event: K, listener: (...args: Events[K]) => unknown): () => void
```

Listens to an event once.

#### `events.onAny()`

```ts
onAny(listener: (event: keyof Events & string, ...args: any[]) => unknown): () => void
```

Listens to every event; the listener gets the event name first. Handy for logging.

#### `events.off()`

```ts
off<K extends keyof Events & string>(event: K, listener?: ((...args: Events[K]) => unknown) | undefined): Emitter<Events>
```

Removes a listener, or all listeners of the event if you don't pass one.

#### `events.emit()`

```ts
emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean
```

Calls the event's listeners right away, in the order they were added. If one throws, the error propagates, as with Node's `EventEmitter`.

#### `events.emitAsync()`

```ts
emitAsync<K extends keyof Events & string>(event: K, ...args: Events[K]): Promise<unknown[]>
```

Calls the listeners one at a time, waiting for each, and resolves with what they returned. Good for hooks that may be async.

#### `events.waitFor()`

```ts
waitFor<K extends keyof Events & string>(event: K, options?: WaitForOptions<Events[K]>): Promise<Events[K]>
```

Waits for the next time the event fires and resolves with its arguments.

#### `events.iterate()`

```ts
iterate<K extends keyof Events & string>(event: K, options?: { signal?: AbortSignal; } | undefined): AsyncIterableIterator<Events[K]>
```

Loops over an event with `for await`. Events that fire while your loop body runs are queued, and leaving the loop removes the listener.

#### `events.listenerCount()`

```ts
listenerCount(event?: (keyof Events & string) | undefined): number
```

How many listeners an event has, or all events together. `onAny` listeners aren't counted.

#### `events.eventNames()`

```ts
eventNames(): (keyof Events & string)[]
```

The events that have listeners.

#### `events.clear()`

```ts
clear(event?: (keyof Events & string) | undefined): Emitter<Events>
```

Removes all listeners of an event, or everything if you don't name one.

<details><summary>Types (2)</summary>

| Type | Description |
| --- | --- |
| `EventMap` | Event names mapped to their arguments, like `{ ready: [], data: [chunk: Buffer], error: [error: Error] }`. |
| `WaitForOptions` | Options for `waitFor()`. |

</details>
