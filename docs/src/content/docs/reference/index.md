---
title: "All exports"
description: "Everything in @ix-xs/node-comfort 2.1.0: 23 namespaces and classes, 573 functions and methods, each with a line that says what it does."
sidebar:
  label: "All exports"
  order: 0
---

This page is written from the source code, like the documentation your editor shows on hover. Search it with your browser to find out whether something exists, then follow the link for the details.

## Essentials

### nc.logger

A console logger that works with zero setup: levels, colors, a small markup for styling, groups, timers and tables. [Reference](/reference/logger/) • [Guide](/essentials/logger/)

| Name | What it does |
| --- | --- |
| [`log()`](/reference/logger/#log) | Prints a message without a badge. |
| [`trace()`](/reference/logger/#trace) | Very detailed diagnostics, shown only at the `trace` level. |
| [`debug()`](/reference/logger/#debug) | Diagnostics for developers, shown at the `debug` level (the default when `DEBUG` is set). |
| [`info()`](/reference/logger/#info) | An informational message. |
| [`success()`](/reference/logger/#success) | A success message. |
| [`warn()`](/reference/logger/#warn) | A warning, written to stderr. |
| [`error()`](/reference/logger/#error) | An error, written to stderr. |
| [`fatal()`](/reference/logger/#fatal) | A fatal error, written to stderr. |
| [`group()`](/reference/logger/#group) | Prints a label and indents what follows, until `groupEnd()`. |
| [`groupEnd()`](/reference/logger/#groupend) | Closes the current group. |
| [`timeStart()`](/reference/logger/#timestart) | Starts a named timer. |
| [`timeEnd()`](/reference/logger/#timeend) | Prints the time since `timeStart()` with the same label. |
| [`table()`](/reference/logger/#table) | Prints rows as a table. |
| [`box()`](/reference/logger/#box) | Prints text in a box. |
| [`divider()`](/reference/logger/#divider) | Prints a horizontal line, with an optional title in it. |
| [`setLevel()`](/reference/logger/#setlevel) | Sets the minimum level. |
| [`getLevel()`](/reference/logger/#getlevel) | The current minimum level. |
| [`isLevelEnabled()`](/reference/logger/#islevelenabled) | Would this level be printed? |
| [`configure()`](/reference/logger/#configure) | Changes several settings at once. |
| [`setTimestamp()`](/reference/logger/#settimestamp) | Shows or hides timestamps, or sets their pattern. |
| [`setDelimiter()`](/reference/logger/#setdelimiter) | Changes the markup delimiters, for when `<%` clashes with a template engine. |
| [`createLogger()`](/reference/logger/#createlogger) | Creates a logger with its own settings. |

### nc.fs

Files and folders without try/catch: read and write text or JSON (atomically), copy, move, delete, list, glob, watch, hash. [Reference](/reference/fs/) • [Guide](/essentials/fs/)

| Name | What it does |
| --- | --- |
| [`getEnv()`](/reference/fs/#getenv) | Reads an environment variable. |
| [`createPath()`](/reference/fs/#createpath) | The absolute version of a path, whether it exists or not. |
| [`getFolder()`](/reference/fs/#getfolder) | The absolute path of a folder, or `undefined` if it doesn't exist. |
| [`getFile()`](/reference/fs/#getfile) | The absolute path of a file, or `undefined` if it doesn't exist. |
| [`getFoldersIn()`](/reference/fs/#getfoldersin) | The folders inside a folder, nested ones included by default. |
| [`getFilesIn()`](/reference/fs/#getfilesin) | The files inside a folder, nested ones included by default. |
| [`glob()`](/reference/fs/#glob) | Finds paths matching a glob pattern: `*` (anything but `/`), `**` (any depth), `?`, `[abc]` and `{js,ts}`. |
| [`find()`](/reference/fs/#find) | Searches a folder tree for the first file or folder with this name, closest first. |
| [`findUp()`](/reference/fs/#findup) | Looks for a file or folder in a folder, then in its parent, and so on up to the root. |
| [`readFile()`](/reference/fs/#readfile) | Reads a file as text, or as a Buffer with `"buffer"`. |
| [`readLines()`](/reference/fs/#readlines) | Reads a text file as lines. |
| [`readJSON()`](/reference/fs/#readjson) | Reads a JSON file. |
| [`writeFile()`](/reference/fs/#writefile) | Writes a file atomically, creating its folders. |
| [`writeJSON()`](/reference/fs/#writejson) | Writes a value as JSON, atomically, creating folders. |
| [`appendFile()`](/reference/fs/#appendfile) | Appends to a file, creating it and its folders if needed. |
| [`createFile()`](/reference/fs/#createfile) | Creates a file and its folders. |
| [`createFolder()`](/reference/fs/#createfolder) | Creates a folder and its parents. |
| [`ensureFolder()`](/reference/fs/#ensurefolder) | Makes sure a folder exists and returns its absolute path. |
| [`ensureFile()`](/reference/fs/#ensurefile) | Makes sure a file exists (an empty one if needed) and returns its absolute path. |
| [`touch()`](/reference/fs/#touch) | Updates a file's modification time, creating the file if needed, like the Unix `touch` command. |
| [`deleteFolder()`](/reference/fs/#deletefolder) | Deletes a folder and everything in it. |
| [`deleteFile()`](/reference/fs/#deletefile) | Deletes a file. |
| [`remove()`](/reference/fs/#remove) | Deletes a file or a folder, whichever it is. |
| [`deleteFoldersIn()`](/reference/fs/#deletefoldersin) | Deletes the folders inside a folder that pass a test. |
| [`deleteFilesIn()`](/reference/fs/#deletefilesin) | Deletes the files inside a folder that pass a test. |
| [`emptyFolder()`](/reference/fs/#emptyfolder) | Deletes everything inside a folder, keeping the folder. |
| [`copy()`](/reference/fs/#copy) | Copies a file or a whole folder, like `cp -r`. |
| [`move()`](/reference/fs/#move) | Moves or renames a file or folder, across drives too. |
| [`copyFoldersIn()`](/reference/fs/#copyfoldersin) | Copies the folders inside a folder into another one. |
| [`copyFolder()`](/reference/fs/#copyfolder) | Copies a folder. |
| [`copyFilesIn()`](/reference/fs/#copyfilesin) | Copies the files inside a folder into another one, keeping the tree. |
| [`copyFile()`](/reference/fs/#copyfile) | Copies one file. |
| [`moveFoldersIn()`](/reference/fs/#movefoldersin) | Moves the folders inside a folder. |
| [`moveFolder()`](/reference/fs/#movefolder) | Moves a folder. |
| [`moveFilesIn()`](/reference/fs/#movefilesin) | Moves the files inside a folder. |
| [`moveFile()`](/reference/fs/#movefile) | Moves one file. |
| [`exists()`](/reference/fs/#exists) | Does a file or folder exist at this path? |
| [`isFile()`](/reference/fs/#isfile) | Is it an existing file? |
| [`isFolder()`](/reference/fs/#isfolder) | Is it an existing folder? |
| [`stat()`](/reference/fs/#stat) | Size, dates and type of a path. |
| [`fileSize()`](/reference/fs/#filesize) | A file's size in bytes. |
| [`folderSize()`](/reference/fs/#foldersize) | The total size of every file in a folder. |
| [`hashFile()`](/reference/fs/#hashfile) | Hashes a file in chunks, so huge files are fine. |
| [`tempFolder()`](/reference/fs/#tempfolder) | Creates a new, unique folder in the system's temp directory. |
| [`sanitizeFilename()`](/reference/fs/#sanitizefilename) | Turns any text into a file name that works on Windows, macOS and Linux: forbidden characters are replaced, reserved names like `CON` are prefixed, and the length is capped. |
| [`watch()`](/reference/fs/#watch) | Watches a file or folder for changes. |

### nc.checker

Type checks and validators. [Reference](/reference/checker/) • [Guide](/essentials/checker/)

| Name | What it does |
| --- | --- |
| [`isArray()`](/reference/checker/#isarray) | Is it an array? |
| [`isNumber()`](/reference/checker/#isnumber) | Is it a number? |
| [`isFinite()`](/reference/checker/#isfinite) | Is it a finite number? |
| [`isInteger()`](/reference/checker/#isinteger) | Is it an integer? |
| [`isSafeInteger()`](/reference/checker/#issafeinteger) | Is it an integer JavaScript can represent exactly (up to 2^53 - 1)? |
| [`isFloat()`](/reference/checker/#isfloat) | Is it a finite number with a decimal part? |
| [`isPositive()`](/reference/checker/#ispositive) | Is it a number greater than zero? |
| [`isNegative()`](/reference/checker/#isnegative) | Is it a number lower than zero? |
| [`isBoolean()`](/reference/checker/#isboolean) | Is it `true` or `false`? |
| [`isString()`](/reference/checker/#isstring) | Is it a string? |
| [`isSymbol()`](/reference/checker/#issymbol) | Is it a symbol? |
| [`isBigInt()`](/reference/checker/#isbigint) | Is it a bigint? |
| [`isUndefined()`](/reference/checker/#isundefined) | Is it `undefined`? |
| [`isNull()`](/reference/checker/#isnull) | Is it `null`? |
| [`isNil()`](/reference/checker/#isnil) | Is it `null` or `undefined`? |
| [`isDefined()`](/reference/checker/#isdefined) | Is it anything but `null` or `undefined`? |
| [`isPrimitive()`](/reference/checker/#isprimitive) | Is it a primitive (string, number, boolean, symbol, bigint, `null` or `undefined`)? |
| [`isFunction()`](/reference/checker/#isfunction) | Is it callable? |
| [`isAsyncFunction()`](/reference/checker/#isasyncfunction) | Was it declared with `async`? |
| [`isGeneratorFunction()`](/reference/checker/#isgeneratorfunction) | Is it a generator function (`function*`)? |
| [`isGenerator()`](/reference/checker/#isgenerator) | Is it a generator object, the result of calling a `function*`? |
| [`isClass()`](/reference/checker/#isclass) | Is it a `class` rather than a plain function? |
| [`isObject()`](/reference/checker/#isobject) | Is it an object, and not `null`? |
| [`isPlainObject()`](/reference/checker/#isplainobject) | Is it a plain object, made with `{}`, `new Object()` or `Object.create(null)`? |
| [`isPromise()`](/reference/checker/#ispromise) | Can it be awaited like a promise (anything with a `then` method)? |
| [`isRegExp()`](/reference/checker/#isregexp) | Is it a regular expression? |
| [`isDate()`](/reference/checker/#isdate) | Is it a `Date`, valid or not? |
| [`isValidDate()`](/reference/checker/#isvaliddate) | Is it a `Date` holding a real point in time? |
| [`isMap()`](/reference/checker/#ismap) | Is it a `Map`? |
| [`isSet()`](/reference/checker/#isset) | Is it a `Set`? |
| [`isWeakMap()`](/reference/checker/#isweakmap) | Is it a `WeakMap`? |
| [`isWeakSet()`](/reference/checker/#isweakset) | Is it a `WeakSet`? |
| [`isIterable()`](/reference/checker/#isiterable) | Does it work with `for...of`? |
| [`isAsyncIterable()`](/reference/checker/#isasynciterable) | Does it work with `for await...of`, like streams and async generators? |
| [`isBuffer()`](/reference/checker/#isbuffer) | Is it a Node.js `Buffer`? |
| [`isTypedArray()`](/reference/checker/#istypedarray) | Is it a typed array (`Uint8Array`, `Float64Array`...)? |
| [`isError()`](/reference/checker/#iserror) | Is it an `Error`, including subclasses and errors from other realms? |
| [`isEmpty()`](/reference/checker/#isempty) | Is it empty? |
| [`isBlank()`](/reference/checker/#isblank) | Is it `null`, `undefined`, or a string with nothing but whitespace? |
| [`isArrayOf()`](/reference/checker/#isarrayof) | Is it an array where every item passes `guard`? |
| [`isOneOf()`](/reference/checker/#isoneof) | Is it one of the allowed values? |
| [`isEmail()`](/reference/checker/#isemail) | Does it look like an email address? |
| [`isURL()`](/reference/checker/#isurl) | Is it an absolute URL with an allowed protocol (http and https by default)? |
| [`isUUID()`](/reference/checker/#isuuid) | Is it a UUID? |
| [`isJSON()`](/reference/checker/#isjson) | Is it a string of valid JSON? |
| [`isNumeric()`](/reference/checker/#isnumeric) | Is it a finite number, or a string that is exactly one (spaces around are fine)? |
| [`isIP()`](/reference/checker/#isip) | Is it an IP address? |
| [`isIPv4()`](/reference/checker/#isipv4) | Is it an IPv4 address, like `192.168.0.1`? |
| [`isIPv6()`](/reference/checker/#isipv6) | Is it an IPv6 address, like `::1`? |
| [`isPort()`](/reference/checker/#isport) | Is it a valid port (0 to 65535), as a number or a numeric string? |
| [`isHex()`](/reference/checker/#ishex) | Is it a hexadecimal string? |
| [`isHexColor()`](/reference/checker/#ishexcolor) | Is it a CSS hex color (`#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`)? |
| [`isBase64()`](/reference/checker/#isbase64) | Is it valid Base64? |
| [`isSemver()`](/reference/checker/#issemver) | Is it a semantic version? |
| [`isISODate()`](/reference/checker/#isisodate) | Is it an ISO 8601 date or date-time, and a real calendar date? |
| [`isSlug()`](/reference/checker/#isslug) | Is it a URL slug like `my-first-post`? |
| [`isAlpha()`](/reference/checker/#isalpha) | Is it made only of letters, in any alphabet? |
| [`isAlphanumeric()`](/reference/checker/#isalphanumeric) | Is it made only of letters and digits, in any alphabet? |
| [`isCreditCard()`](/reference/checker/#iscreditcard) | Could it be a card number? |
| [`isJWT()`](/reference/checker/#isjwt) | Does it look like a JSON Web Token? |
| [`isHostname()`](/reference/checker/#ishostname) | Is it a host name, like `example.com`, `api.internal` or `localhost`? |
| [`isMACAddress()`](/reference/checker/#ismacaddress) | Is it a MAC address? |
| [`isIBAN()`](/reference/checker/#isiban) | Is it a valid IBAN? |
| [`isE164()`](/reference/checker/#ise164) | Is it a phone number in the international E.164 format: a `+`, then 7 to 15 digits, no spaces? |
| [`isObjectId()`](/reference/checker/#isobjectid) | Is it a MongoDB ObjectId, 24 hexadecimal characters? |
| [`isULID()`](/reference/checker/#isulid) | Is it a ULID, like the ones `nc.id.ulid()` makes? |
| [`isDataURL()`](/reference/checker/#isdataurl) | Is it a `data:` URL, like an inline image? |
| [`isMimeType()`](/reference/checker/#ismimetype) | Is it a media type, like `application/json` or `text/html; charset=utf-8`? |
| [`isTimeZone()`](/reference/checker/#istimezone) | Is it a time zone Node.js knows, like `"Europe/Paris"` or `"UTC"`? |
| [`isLocale()`](/reference/checker/#islocale) | Is it a well-formed locale, like `"fr"`, `"en-GB"` or `"zh-Hant-TW"`? |
| [`isCron()`](/reference/checker/#iscron) | Is it a cron expression `nc.time.cron()` understands? |
| [`isASCII()`](/reference/checker/#isascii) | Is it made only of ASCII characters? |
| [`assert()`](/reference/checker/#assert) | Throws an `AssertionError` if `condition` is falsy. |
| [`assertType()`](/reference/checker/#asserttype) | Throws an `AssertionError` unless `value` passes `guard`. |

### nc.env

Environment variables you can trust: `.env` loading, typed getters, and `validate()` to check your whole configuration at startup and report every problem at once. [Reference](/reference/env/) • [Guide](/essentials/env/)

| Name | What it does |
| --- | --- |
| [`parse()`](/reference/env/#parse) | Parses the text of a `.env` file: quotes, multi-line values, `export`, comments, escapes, and `${VAR}` expansion (except in single quotes). |
| [`load()`](/reference/env/#load) | Loads `.env` files into `process.env`. |
| [`get()`](/reference/env/#get) | Reads a variable, with a fallback. |
| [`has()`](/reference/env/#has) | Is the variable set, even to an empty string? |
| [`required()`](/reference/env/#required) | Reads a variable that must be set and not empty. |
| [`string()`](/reference/env/#string) | Reads a string. |
| [`number()`](/reference/env/#number) | Reads a number. |
| [`bool()`](/reference/env/#bool) | Reads a boolean: `true`/`false`, `1`/`0`, `yes`/`no` or `on`/`off`. |
| [`port()`](/reference/env/#port) | Reads a port number. |
| [`url()`](/reference/env/#url) | Reads an absolute URL. |
| [`duration()`](/reference/env/#duration) | Reads a duration like `"30s"` or `"1h30m"` and returns milliseconds. |
| [`list()`](/reference/env/#list) | Reads a comma-separated list. |
| [`json()`](/reference/env/#json) | Reads a JSON value. |
| [`oneOf()`](/reference/env/#oneof) | Reads a variable that must be one of the given values. |
| [`validate()`](/reference/env/#validate) | Checks all your variables at once and returns a typed, frozen config. |
| [`example()`](/reference/env/#example) | Writes the `.env.example` that goes with a `validate()` spec: one entry per variable, with its description, type and default. |
| [`mode()`](/reference/env/#mode) | `NODE_ENV`, or `"development"` when it's not set. |
| [`isProduction()`](/reference/env/#isproduction) | Is `NODE_ENV` set to `"production"`? |
| [`isDevelopment()`](/reference/env/#isdevelopment) | Is `NODE_ENV` `"development"`, or not set? |
| [`isTest()`](/reference/env/#istest) | Are we running tests? |

### nc.errors

The errors node-comfort throws when something goes wrong at run time: a request fails, data is invalid, a command exits badly. [Reference](/reference/errors/) • [Guide](/essentials/errors/)

| Name | What it does |
| --- | --- |
| [`NodeComfortError`](/reference/errors/#nodecomforterror) | Base class of every node-comfort error. |
| [`AssertionError`](/reference/errors/#assertionerror) | Thrown by `nc.assert()` and `nc.assertType()`. |
| [`TimeoutError`](/reference/errors/#timeouterror) | Thrown when something takes too long: `func.timeout`, `async.poll`, HTTP requests, `emitter.waitFor`... |
| [`AbortError`](/reference/errors/#aborterror) | Thrown when an operation is cancelled with an `AbortSignal`. |
| [`ValidationError`](/reference/errors/#validationerror) | Thrown when data doesn't match a schema or when environment variables are invalid. |
| [`HttpError`](/reference/errors/#httperror) | Thrown by `nc.http` when the response status isn't 2xx (unless you pass `throwHttpErrors: false`), and for network failures (`status` 0). |
| [`JWTError`](/reference/errors/#jwterror) | Thrown by `nc.crypto.verifyJWT()`. |
| [`ProcessError`](/reference/errors/#processerror) | Thrown by `nc.sys.run()` and `nc.sys.exec()` when a command fails, is killed or times out. |
| [`SQLiteError`](/reference/errors/#sqliteerror) | Thrown by `nc.SQLite` when a statement fails. |

### nc.utils

Everyday helpers: `wait`, `when`, `dontCrash`, and JSON functions that don't throw. [Reference](/reference/utils/) • [Guide](/essentials/utils/)

| Name | What it does |
| --- | --- |
| [`wait()`](/reference/utils/#wait) | Resolves after a delay, given in milliseconds or as a duration string. |
| [`when()`](/reference/utils/#when) | Checks a condition at a regular interval and tells you when it's true. |
| [`dontCrash()`](/reference/utils/#dontcrash) | Keeps the process alive when something goes wrong. |
| [`JSONString()`](/reference/utils/#jsonstring) | `JSON.stringify` that never throws. |
| [`JSONParse()`](/reference/utils/#jsonparse) | `JSON.parse` with an optional fallback. |

## Data

### nc.str

String helpers: case conversion, slugs, truncation, templates, wrapping, fuzzy matching, plurals. [Reference](/reference/str/) • [Guide](/data/str/)

| Name | What it does |
| --- | --- |
| [`capitalize()`](/reference/str/#capitalize) | Uppercases the first character and lowercases the rest. |
| [`upperFirst()`](/reference/str/#upperfirst) | Uppercases the first character and leaves the rest alone. |
| [`lowerFirst()`](/reference/str/#lowerfirst) | Lowercases the first character and leaves the rest alone. |
| [`humanize()`](/reference/str/#humanize) | Turns an identifier into a label people can read. |
| [`titleCase()`](/reference/str/#titlecase) | Uppercases the first letter of each word and leaves the rest alone. |
| [`sentenceCase()`](/reference/str/#sentencecase) | Lowercases everything, then capitalizes the start of each sentence. |
| [`camelCase()`](/reference/str/#camelcase) | Converts to `camelCase`. |
| [`pascalCase()`](/reference/str/#pascalcase) | Converts to `PascalCase`. |
| [`snakeCase()`](/reference/str/#snakecase) | Converts to `snake_case`. |
| [`kebabCase()`](/reference/str/#kebabcase) | Converts to `kebab-case`. |
| [`constantCase()`](/reference/str/#constantcase) | Converts to `CONSTANT_CASE`. |
| [`dotCase()`](/reference/str/#dotcase) | Converts to `dot.case`. |
| [`words()`](/reference/str/#words) | Splits text into words. |
| [`deburr()`](/reference/str/#deburr) | Removes accents (`é` becomes `e`) and spells out special Latin letters (`ß` becomes `ss`, `æ` becomes `ae`). |
| [`slugify()`](/reference/str/#slugify) | Turns text into a URL slug: no accents, lowercase, words joined by dashes. |
| [`squish()`](/reference/str/#squish) | Collapses runs of whitespace into single spaces and trims the ends. |
| [`stripTags()`](/reference/str/#striptags) | Removes HTML tags and keeps the text. |
| [`escapeHTML()`](/reference/str/#escapehtml) | Escapes `& < > " '` so the text is safe inside HTML content and attributes. |
| [`unescapeHTML()`](/reference/str/#unescapehtml) | Decodes HTML entities: named ones like `&amp;` and `&nbsp;`, and numeric ones like `&#233;`. |
| [`escapeRegExp()`](/reference/str/#escaperegexp) | Escapes regex special characters so the text matches literally. |
| [`length()`](/reference/str/#length) | Counts visible characters. |
| [`byteLength()`](/reference/str/#bytelength) | Size of the text in bytes once encoded, UTF-8 by default. |
| [`count()`](/reference/str/#count) | Counts how many times `search` appears, without overlaps. |
| [`truncate()`](/reference/str/#truncate) | Shortens text to `length` visible characters, ending with `…` when cut. |
| [`chunk()`](/reference/str/#chunk) | Splits text into pieces of `size` visible characters. |
| [`between()`](/reference/str/#between) | Returns the text between `start` and the next `end`, or `undefined` if a marker is missing. |
| [`splitOnce()`](/reference/str/#splitonce) | Splits at the first occurrence of `separator` only. |
| [`lines()`](/reference/str/#lines) | Splits text into lines, whatever the line endings. |
| [`padStart()`](/reference/str/#padstart) | Pads the start until the text is `length` characters long. |
| [`padEnd()`](/reference/str/#padend) | Pads the end until the text is `length` characters long. |
| [`center()`](/reference/str/#center) | Centers text within `length` characters. |
| [`indent()`](/reference/str/#indent) | Indents every non-empty line. |
| [`dedent()`](/reference/str/#dedent) | Removes the indentation shared by all lines, and blank first and last lines. |
| [`wrap()`](/reference/str/#wrap) | Wraps text so no line is longer than `width` visible characters. |
| [`reverse()`](/reference/str/#reverse) | Reverses text without breaking emoji or accents. |
| [`mask()`](/reference/str/#mask) | Hides part of a string, like a card number or a token. |
| [`initials()`](/reference/str/#initials) | The initials of a name, in uppercase. |
| [`plural()`](/reference/str/#plural) | Picks the right plural for a count, following the rules of the language, and puts the formatted count in front. |
| [`template()`](/reference/str/#template) | Fills `{placeholders}` with values. |
| [`ensurePrefix()`](/reference/str/#ensureprefix) | Adds `prefix` unless the text already starts with it. |
| [`ensureSuffix()`](/reference/str/#ensuresuffix) | Adds `suffix` unless the text already ends with it. |
| [`removePrefix()`](/reference/str/#removeprefix) | Removes `prefix` if the text starts with it. |
| [`removeSuffix()`](/reference/str/#removesuffix) | Removes `suffix` if the text ends with it. |
| [`compare()`](/reference/str/#compare) | Compares two strings the way people sort them: numbers in natural order and accents in the right place. |
| [`levenshtein()`](/reference/str/#levenshtein) | The number of single-character edits needed to turn `a` into `b`. |
| [`similarity()`](/reference/str/#similarity) | How alike two strings are, from `0` (nothing in common) to `1` (identical). |
| [`closest()`](/reference/str/#closest) | Finds the candidate closest to `input`. |
| [`random()`](/reference/str/#random) | A random string. |

### nc.num

Numbers: clamping, rounding that gets decimals right, statistics, and formatting for humans (sizes, money, ordinals, compact numbers) in any language. [Reference](/reference/num/) • [Guide](/data/num/)

| Name | What it does |
| --- | --- |
| [`setLocale()`](/reference/num/#setlocale) | Sets the default language of `format`, `currency`, `ordinal` and `formatBytes`. |
| [`getLocale()`](/reference/num/#getlocale) | The current default language. |
| [`clamp()`](/reference/num/#clamp) | Keeps a number between `min` and `max`. |
| [`inRange()`](/reference/num/#inrange) | Is the number between `min` and `max`, both included? |
| [`wrap()`](/reference/num/#wrap) | Wraps a number around a range, like an angle or a carousel index. |
| [`round()`](/reference/num/#round) | Rounds to `decimals` places without floating-point surprises: `Math.round(1.005 * 100) / 100` gives `1`, this gives `1.01`. |
| [`floor()`](/reference/num/#floor) | Rounds down to `decimals` places. |
| [`ceil()`](/reference/num/#ceil) | Rounds up to `decimals` places. |
| [`snap()`](/reference/num/#snap) | Rounds to the nearest multiple of `step`. |
| [`approxEqual()`](/reference/num/#approxequal) | Are two numbers equal within a small tolerance? |
| [`lerp()`](/reference/num/#lerp) | The value at ratio `t` between `start` and `end`. |
| [`mapRange()`](/reference/num/#maprange) | Moves a number from one range to another, keeping its relative position. |
| [`random()`](/reference/num/#random) | A random float from `min` (included) to `max` (excluded). |
| [`randomInt()`](/reference/num/#randomint) | A random integer from `min` to `max`, both included. |
| [`sum()`](/reference/num/#sum) | Adds up numbers, without the drift of a naive loop. |
| [`product()`](/reference/num/#product) | Multiplies numbers. |
| [`average()`](/reference/num/#average) | The mean, or `0` for an empty list. |
| [`median()`](/reference/num/#median) | The middle value once sorted, or `0` for an empty list. |
| [`mode()`](/reference/num/#mode) | The most frequent values. |
| [`variance()`](/reference/num/#variance) | The variance: the average squared distance from the mean. |
| [`stdDev()`](/reference/num/#stddev) | The standard deviation. |
| [`percentile()`](/reference/num/#percentile) | The value under which `p` percent of the values fall, interpolated like Excel's `PERCENTILE.INC`. |
| [`min()`](/reference/num/#min) | The smallest number. |
| [`max()`](/reference/num/#max) | The largest number. |
| [`percent()`](/reference/num/#percent) | What percentage `value` is of `total`. |
| [`percentChange()`](/reference/num/#percentchange) | How much a value changed, in percent. |
| [`gcd()`](/reference/num/#gcd) | Greatest common divisor. |
| [`lcm()`](/reference/num/#lcm) | Least common multiple. |
| [`isPrime()`](/reference/num/#isprime) | Is it a prime number? |
| [`factorial()`](/reference/num/#factorial) | `n!`. |
| [`isEven()`](/reference/num/#iseven) | Is it even? |
| [`isOdd()`](/reference/num/#isodd) | Is it odd? |
| [`range()`](/reference/num/#range) | Numbers from `start` up to `end` (excluded). |
| [`parse()`](/reference/num/#parse) | Reads a number from anything, ignoring trailing text like units. |
| [`parseBytes()`](/reference/num/#parsebytes) | Turns a size like `"10 MB"` into bytes. |
| [`formatBytes()`](/reference/num/#formatbytes) | Formats a byte count as a readable size. |
| [`format()`](/reference/num/#format) | Formats a number for display, with `Intl.NumberFormat` doing the work: separators, decimals, compact notation, percentages, units. |
| [`currency()`](/reference/num/#currency) | Formats an amount of money. |
| [`abbreviate()`](/reference/num/#abbreviate) | Shortens big numbers with `K`, `M`, `B` or `T`. |
| [`thousands()`](/reference/num/#thousands) | Adds thousands separators, leaving decimals alone. |
| [`pad()`](/reference/num/#pad) | Pads the integer part with zeros (or another character). |
| [`ordinal()`](/reference/num/#ordinal) | Adds the ordinal suffix: 1st, 2nd, 3rd... in several languages. |

### nc.arr

Array helpers. [Reference](/reference/arr/) • [Guide](/data/arr/)

| Name | What it does |
| --- | --- |
| [`chunk()`](/reference/arr/#chunk) | Splits an array into groups of `size` items. |
| [`windows()`](/reference/arr/#windows) | Sliding windows of `size` items, moving by `step`. |
| [`first()`](/reference/arr/#first) | The first item, or the first `n` items. |
| [`last()`](/reference/arr/#last) | The last item, or the last `n` items. |
| [`paginate()`](/reference/arr/#paginate) | One page of an array, with what you need to draw pagination controls. |
| [`unique()`](/reference/arr/#unique) | Removes duplicates. |
| [`groupBy()`](/reference/arr/#groupby) | Groups items by key. |
| [`keyBy()`](/reference/arr/#keyby) | Indexes items by key. |
| [`toMap()`](/reference/arr/#tomap) | Builds a `Map` from an array. |
| [`countBy()`](/reference/arr/#countby) | Counts items per key. |
| [`count()`](/reference/arr/#count) | Counts the items that pass a test. |
| [`partition()`](/reference/arr/#partition) | Splits items into those that pass a test and those that don't. |
| [`pluck()`](/reference/arr/#pluck) | Takes one property from every item. |
| [`sortBy()`](/reference/arr/#sortby) | Sorts by one or more keys, each with its own direction if you like. |
| [`shuffle()`](/reference/arr/#shuffle) | A shuffled copy (Fisher-Yates). |
| [`sample()`](/reference/arr/#sample) | One random item, or `undefined` if the array is empty. |
| [`sampleSize()`](/reference/arr/#samplesize) | `n` random items, never the same one twice. |
| [`rotate()`](/reference/arr/#rotate) | Rotates items. |
| [`move()`](/reference/arr/#move) | Moves one item to another position. |
| [`swap()`](/reference/arr/#swap) | Swaps two items. |
| [`difference()`](/reference/arr/#difference) | Items of `array` that appear in none of the others. |
| [`intersection()`](/reference/arr/#intersection) | Items present in every array, without duplicates. |
| [`union()`](/reference/arr/#union) | Items present in any array, without duplicates. |
| [`without()`](/reference/arr/#without) | A copy without the given values. |
| [`remove()`](/reference/arr/#remove) | A copy without the items that pass the test. |
| [`compact()`](/reference/arr/#compact) | Removes falsy values (`false`, `null`, `undefined`, `0`, `""`, `NaN`). |
| [`toggle()`](/reference/arr/#toggle) | Adds the item if it's missing, removes it if it's there. |
| [`upsert()`](/reference/arr/#upsert) | Replaces the item with the same identity, or appends it if there's none. |
| [`insert()`](/reference/arr/#insert) | Inserts items at an index. |
| [`flatten()`](/reference/arr/#flatten) | Flattens nested arrays, one level by default. |
| [`zip()`](/reference/arr/#zip) | Pairs items by position. |
| [`unzip()`](/reference/arr/#unzip) | The opposite of `zip()`: rows become columns. |
| [`interleave()`](/reference/arr/#interleave) | Takes items from each array in turn, then appends the rest. |
| [`cartesian()`](/reference/arr/#cartesian) | Every combination of one item from each array. |
| [`times()`](/reference/arr/#times) | An array of `n` items, from a value or a function of the index. |
| [`sumBy()`](/reference/arr/#sumby) | Adds up a number from each item. |
| [`averageBy()`](/reference/arr/#averageby) | The average of a number from each item, or `0` for an empty array. |
| [`maxBy()`](/reference/arr/#maxby) | The item with the highest value. |
| [`minBy()`](/reference/arr/#minby) | The item with the lowest value. |
| [`duplicates()`](/reference/arr/#duplicates) | The items that appear more than once, each listed once. |
| [`xor()`](/reference/arr/#xor) | Items found in exactly one of the arrays, without duplicates. |
| [`takeWhile()`](/reference/arr/#takewhile) | The items from the start, up to the first one that fails the test. |
| [`dropWhile()`](/reference/arr/#dropwhile) | Skips items from the start while they pass the test, and returns the rest. |
| [`toSentence()`](/reference/arr/#tosentence) | Joins items the way a sentence would, in any language. |

### nc.obj

Object helpers: deep clone, merge, equality, diff, typed dot paths, pick and omit. [Reference](/reference/obj/) • [Guide](/data/obj/)

| Name | What it does |
| --- | --- |
| [`clone()`](/reference/obj/#clone) | Deep copy. |
| [`merge()`](/reference/obj/#merge) | Deep-merges objects into a new one. |
| [`mergeWith()`](/reference/obj/#mergewith) | Like `merge()`, with a choice of what happens to arrays and `undefined`. |
| [`defaults()`](/reference/obj/#defaults) | Fills in missing properties from defaults, deeply. |
| [`equal()`](/reference/obj/#equal) | Deep equality. |
| [`diff()`](/reference/obj/#diff) | Lists what changed between two values, deeply. |
| [`get()`](/reference/obj/#get) | Reads a nested value from a dotted path. |
| [`set()`](/reference/obj/#set) | Returns a copy with a nested value set. |
| [`update()`](/reference/obj/#update) | Returns a copy where the value at `path` is replaced by what `updater` returns for it. |
| [`unset()`](/reference/obj/#unset) | Returns a copy without the property at `path`. |
| [`has()`](/reference/obj/#has) | Does the path exist? |
| [`pick()`](/reference/obj/#pick) | A copy with only the listed keys. |
| [`omit()`](/reference/obj/#omit) | A copy without the listed keys. |
| [`filter()`](/reference/obj/#filter) | Keeps the entries that pass a test. |
| [`mapValues()`](/reference/obj/#mapvalues) | Transforms every value, keeping the keys. |
| [`mapKeys()`](/reference/obj/#mapkeys) | Transforms every key, keeping the values. |
| [`renameKeys()`](/reference/obj/#renamekeys) | Renames some keys and leaves the others alone. |
| [`invert()`](/reference/obj/#invert) | Swaps keys and values. |
| [`compact()`](/reference/obj/#compact) | Removes `null` and `undefined` values, and optionally empty ones. |
| [`flatten()`](/reference/obj/#flatten) | Flattens nested objects into dotted keys. |
| [`unflatten()`](/reference/obj/#unflatten) | Rebuilds nested objects from dotted keys. |
| [`paths()`](/reference/obj/#paths) | Every leaf path of an object, in dotted form. |
| [`sortKeys()`](/reference/obj/#sortkeys) | A copy with its keys in order, nested objects included. |
| [`keys()`](/reference/obj/#keys) | `Object.keys`, but typed with the object's actual keys. |
| [`entries()`](/reference/obj/#entries) | `Object.entries`, with typed keys and values. |
| [`fromEntries()`](/reference/obj/#fromentries) | `Object.fromEntries` that accepts any iterable (a `Map` too) and skips unsafe keys. |
| [`size()`](/reference/obj/#size) | How many entries: own keys of an object, size of a map or set, length of an array or string. |
| [`isEmpty()`](/reference/obj/#isempty) | Is there nothing in it? |
| [`deepFreeze()`](/reference/obj/#deepfreeze) | Freezes an object and everything inside it. |

### nc.time

Dates and durations: formatting, relative time, calendar math, time zones and scheduling, in any language `Intl` knows. [Reference](/reference/time/) • [Guide](/data/time/)

| Name | What it does |
| --- | --- |
| [`setLocale()`](/reference/time/#setlocale) | Sets the default language for `relative`, `calendar`, `formatDuration` and `format`. |
| [`setTimezone()`](/reference/time/#settimezone) | Sets the default time zone for `format`, `calendar`, `isSameDay`, `cron`... |
| [`getConfig()`](/reference/time/#getconfig) | The current defaults. |
| [`timezones()`](/reference/time/#timezones) | Every time zone Node knows, sorted. |
| [`offset()`](/reference/time/#offset) | A zone's UTC offset at a given date, in minutes. |
| [`parseDuration()`](/reference/time/#parseduration) | Turns a duration into milliseconds. |
| [`formatDuration()`](/reference/time/#formatduration) | Writes a duration for humans. |
| [`relative()`](/reference/time/#relative) | Describes a date relative to now: `"3 hours ago"`, `"in 2 days"`, in any language. |
| [`calendar()`](/reference/time/#calendar) | Describes a date like a chat app does: `"Today at 2:30 PM"`, `"Yesterday at 9:05 AM"`, a weekday for the coming days, and the full date beyond that. |
| [`format()`](/reference/time/#format) | Formats a date with tokens, in any language and time zone. |
| [`parse()`](/reference/time/#parse) | Reads a date written in a known format: the opposite of `format()`, with the same tokens. |
| [`toISODate()`](/reference/time/#toisodate) | The date as `YYYY-MM-DD`, the format `<input type="date">` and most APIs expect. |
| [`add()`](/reference/time/#add) | Adds time to a date and returns a new `Date`. |
| [`subtract()`](/reference/time/#subtract) | Subtracts time from a date and returns a new `Date`. |
| [`diff()`](/reference/time/#diff) | `a - b` in a unit. |
| [`startOf()`](/reference/time/#startof) | A new `Date` at the start of the day, week, month... in the global time zone, or the one you name. |
| [`endOf()`](/reference/time/#endof) | A new `Date` at the last millisecond of the day, week, month... |
| [`isBefore()`](/reference/time/#isbefore) | Is `a` before `b`? |
| [`isAfter()`](/reference/time/#isafter) | Is `a` after `b`? |
| [`isBetween()`](/reference/time/#isbetween) | Is the date between `start` and `end`, both included? |
| [`isSame()`](/reference/time/#issame) | Are both dates in the same year, month, week, day, hour...? |
| [`isSameDay()`](/reference/time/#issameday) | Are both dates on the same calendar day? |
| [`isToday()`](/reference/time/#istoday) | Is the date today? |
| [`isYesterday()`](/reference/time/#isyesterday) | Was the date yesterday? |
| [`isTomorrow()`](/reference/time/#istomorrow) | Is the date tomorrow? |
| [`isWeekend()`](/reference/time/#isweekend) | Is it a Saturday or a Sunday? |
| [`isLeapYear()`](/reference/time/#isleapyear) | Is it a leap year? |
| [`isValid()`](/reference/time/#isvalid) | Is it a real date, or something that parses to one? |
| [`daysInMonth()`](/reference/time/#daysinmonth) | Number of days in a month. |
| [`dayOfYear()`](/reference/time/#dayofyear) | Day of the year, from 1 to 366. |
| [`weekOfYear()`](/reference/time/#weekofyear) | ISO week number, from 1 to 53. |
| [`min()`](/reference/time/#min) | The earliest date. |
| [`max()`](/reference/time/#max) | The latest date. |
| [`unix()`](/reference/time/#unix) | The current Unix timestamp, in seconds. |
| [`fromUnix()`](/reference/time/#fromunix) | A `Date` from a Unix timestamp in seconds, as found in JWTs and many APIs. |
| [`range()`](/reference/time/#range) | Every date from `start` to `end`, both included, one unit apart. |
| [`stopwatch()`](/reference/time/#stopwatch) | Starts a precise stopwatch. |
| [`measure()`](/reference/time/#measure) | Runs a function, sync or async, and tells you how long it took. |
| [`every()`](/reference/time/#every) | Runs a task at a regular interval. |
| [`nextRun()`](/reference/time/#nextrun) | The next date matching a cron expression, without scheduling anything. |
| [`cron()`](/reference/time/#cron) | Runs a task on a cron schedule, in any time zone. |

### nc.id

Unique ids: UUID v4, v5 and v7, ULID, ObjectId, nanoid-style ids, Snowflakes, tokens and short codes. [Reference](/reference/id/) • [Guide](/data/id/)

| Name | What it does |
| --- | --- |
| [`uuid()`](/reference/id/#uuid) | A random UUID (version 4). |
| [`uuidv5()`](/reference/id/#uuidv5) | A UUID v5: the same name in the same namespace always gives the same id. |
| [`uuidv7()`](/reference/id/#uuidv7) | A UUID v7: it starts with a timestamp, so ids sort by creation time. |
| [`ulid()`](/reference/id/#ulid) | A ULID: 26 URL-safe characters that sort by creation time. |
| [`objectId()`](/reference/id/#objectid) | A MongoDB-style ObjectId: 24 hex characters that start with the time, in seconds, and increase within the process. |
| [`nano()`](/reference/id/#nano) | A short, URL-safe random id, like `nanoid`. |
| [`customAlphabet()`](/reference/id/#customalphabet) | Makes an id generator with your own alphabet and length. |
| [`prefixed()`](/reference/id/#prefixed) | A random id with a prefix that says what it identifies, like Stripe's `cus_...` and `sub_...`. |
| [`token()`](/reference/id/#token) | A random token for API keys, session ids, reset links... |
| [`code()`](/reference/id/#code) | A short code that's easy to read aloud and type: no `0/O` or `1/I/L` mix-ups. |
| [`snowflake()`](/reference/id/#snowflake) | A Snowflake id, the 64-bit format used by Discord and Twitter. |
| [`parseSnowflake()`](/reference/id/#parsesnowflake) | Decodes a Snowflake. |
| [`timestamp()`](/reference/id/#timestamp) | When a UUID v7, a ULID or an ObjectId was created. |
| [`seq()`](/reference/id/#seq) | Readable sequential ids like `"user-1"`, `"user-2"`, counted per prefix. |
| [`hash()`](/reference/id/#hash) | Deprecated. Hashes a value. |
| [`hmac()`](/reference/id/#hmac) | Deprecated. Signs a value with HMAC. |
| [`safeEqual()`](/reference/id/#safeequal) | Deprecated. Compares two secrets in constant time. |

### nc.schema

Validate data with schemas, in the spirit of `zod`. [Reference](/reference/schema/) • [Guide](/data/schema/)

| Name | What it does |
| --- | --- |
| [`string()`](/reference/schema/#string) | A string schema. |
| [`number()`](/reference/schema/#number) | A number. |
| [`boolean()`](/reference/schema/#boolean) | A boolean schema. |
| [`bigint()`](/reference/schema/#bigint) | A bigint schema. |
| [`date()`](/reference/schema/#date) | A valid `Date`. |
| [`literal()`](/reference/schema/#literal) | Exactly this value. |
| [`enum()`](/reference/schema/#enum) | One of these values. |
| [`array()`](/reference/schema/#array) | An array whose items all match `item`. |
| [`object()`](/reference/schema/#object) | An object with known keys. |
| [`union()`](/reference/schema/#union) | Matches any of these schemas; the first that fits wins. |
| [`discriminatedUnion()`](/reference/schema/#discriminatedunion) | A union of objects told apart by one key, like the `type` of an event. |
| [`tuple()`](/reference/schema/#tuple) | A fixed-length array with one schema per position. |
| [`record()`](/reference/schema/#record) | An object with any keys whose values match a schema, like a dictionary. |
| [`lazy()`](/reference/schema/#lazy) | A schema defined later, for recursive data like trees. |
| [`instanceOf()`](/reference/schema/#instanceof) | An instance of a class. |
| [`custom()`](/reference/schema/#custom) | A schema from any test, usually a type guard. |
| [`any()`](/reference/schema/#any) | Anything, typed as `any`. |
| [`unknown()`](/reference/schema/#unknown) | Anything, typed as `unknown`. |
| [`coerce`](/reference/schema/#coerce) | Schemas that convert their input before checking it. |
| [`Schema`](/reference/schema/#schema) | The base of every schema. |

## Functions and async

### nc.func

Function helpers: debounce, throttle, memoize, retry with backoff, timeouts, error handling without try/catch, and typed composition. [Reference](/reference/func/) • [Guide](/flow/func/)

| Name | What it does |
| --- | --- |
| [`debounce()`](/reference/func/#debounce) | Waits for a pause of `wait` ms between calls, then runs once with the latest arguments. |
| [`throttle()`](/reference/func/#throttle) | Runs at most once every `interval` ms, however often it's called. |
| [`once()`](/reference/func/#once) | Runs `fn` the first time only; later calls return the same result. |
| [`memoize()`](/reference/func/#memoize) | Caches results by arguments. |
| [`retry()`](/reference/func/#retry) | Calls `fn` until it succeeds, waiting between attempts. |
| [`timeout()`](/reference/func/#timeout) | Rejects with a `TimeoutError` if the promise takes longer than `ms`. |
| [`delay()`](/reference/func/#delay) | Waits `ms`, then calls `fn` with the arguments and resolves with its result. |
| [`to()`](/reference/func/#to) | Awaits a promise and gives you `[error, value]` instead of throwing, so you don't need a try/catch. |
| [`attempt()`](/reference/func/#attempt) | Wraps a function so it resolves to `[error, value]` instead of throwing. |
| [`promisify()`](/reference/func/#promisify) | Turns a callback-style function into one that returns a promise. |
| [`batch()`](/reference/func/#batch) | Turns many single calls into few grouped ones. |
| [`dedupe()`](/reference/func/#dedupe) | Makes concurrent calls with the same arguments share one run. |
| [`pipe()`](/reference/func/#pipe) | Chains functions from left to right: `pipe(f, g)(x)` is `g(f(x))`. |
| [`pipeAsync()`](/reference/func/#pipeasync) | Like `pipe()`, for functions that may be async: each one is awaited before the next runs. |
| [`compose()`](/reference/func/#compose) | Chains functions from right to left: `compose(f, g)(x)` is `f(g(x))`. |
| [`curry()`](/reference/func/#curry) | Lets you pass a function's arguments a few at a time. |
| [`partial()`](/reference/func/#partial) | Fixes the first arguments of a function. |
| [`negate()`](/reference/func/#negate) | The opposite of a predicate. |
| [`after()`](/reference/func/#after) | Does nothing for the first `n - 1` calls, then calls `fn` every time. |
| [`before()`](/reference/func/#before) | Calls `fn` for the first `n - 1` calls, then keeps returning the last result. |
| [`noop()`](/reference/func/#noop) | Does nothing. |
| [`identity()`](/reference/func/#identity) | Returns its argument. |

### nc.async

Promises and concurrency: map with a limit, queues with priorities, mutexes, polling, and friendlier `Promise.allSettled`. [Reference](/reference/async/) • [Guide](/flow/async/)

| Name | What it does |
| --- | --- |
| [`sleep()`](/reference/async/#sleep) | Waits for a while. |
| [`map()`](/reference/async/#map) | Maps items through an async function, with at most `concurrency` calls at once. |
| [`forEach()`](/reference/async/#foreach) | Runs an async function for every item, with a concurrency limit. |
| [`filter()`](/reference/async/#filter) | Keeps the items that pass an async test, with a concurrency limit. |
| [`series()`](/reference/async/#series) | Runs async functions one after the other and returns their results. |
| [`parallel()`](/reference/async/#parallel) | Runs async functions at the same time, or a few at once with `concurrency`, and returns their results in order. |
| [`limit()`](/reference/async/#limit) | A limiter: wrap calls with it, and at most `concurrency` run at once while the rest wait their turn. |
| [`rateLimit()`](/reference/async/#ratelimit) | A rate limiter: at most `max` calls start within any `interval`. |
| [`queue()`](/reference/async/#queue) | A task queue with a concurrency limit, priorities, pause and per-task timeouts. |
| [`mutex()`](/reference/async/#mutex) | A mutex: tasks given to `run()` never overlap. |
| [`deferred()`](/reference/async/#deferred) | A promise along with its `resolve` and `reject`. |
| [`settle()`](/reference/async/#settle) | Waits for every promise and sorts successes from failures. |
| [`props()`](/reference/async/#props) | Like `Promise.all`, for an object of promises. |
| [`poll()`](/reference/async/#poll) | Calls `fn` until it returns something truthy, and resolves with it. |
| [`abortable()`](/reference/async/#abortable) | Makes any promise give up when a signal fires. |
| [`retry()`](/reference/async/#retry) | Calls `fn` until it succeeds, waiting between attempts. |
| [`timeout()`](/reference/async/#timeout) | Rejects with a `TimeoutError` if the promise takes longer than `ms`. |

### Cache

An in-memory cache with a size limit (the least recently used entries go first), expiry per entry, and stats. [Reference](/reference/cache/) • [Guide](/flow/cache/)

| Name | What it does |
| --- | --- |
| [`new Cache()`](/reference/cache/#constructor) |  |
| [`get()`](/reference/cache/#get) | Reads a value and marks it as recently used. |
| [`peek()`](/reference/cache/#peek) | Reads a value without counting it as a use or touching the stats. |
| [`set()`](/reference/cache/#set) | Stores a value. |
| [`getOrSet()`](/reference/cache/#getorset) | Returns the cached value, or calls `loader`, stores the result and returns it. |
| [`has()`](/reference/cache/#has) | Is there a fresh entry for this key? |
| [`delete()`](/reference/cache/#delete) | Removes an entry. |
| [`clear()`](/reference/cache/#clear) | Removes every entry. |
| [`prune()`](/reference/cache/#prune) | Removes expired entries now instead of waiting for them to be read. |
| [`ttl()`](/reference/cache/#ttl) | Time left before an entry expires. |
| [`wrap()`](/reference/cache/#wrap) | Wraps a function so its results are cached here. |
| [`size`](/reference/cache/#size) | Number of entries, including expired ones not yet removed. |
| [`stats`](/reference/cache/#stats) | Hit and miss counts. |
| [`resetStats()`](/reference/cache/#resetstats) | Puts every counter of `stats` back to zero. |
| [`keys()`](/reference/cache/#keys) | Fresh keys, least recently used first. |
| [`values()`](/reference/cache/#values) | Fresh values, least recently used first. |
| [`entries()`](/reference/cache/#entries) | Fresh `[key, value]` pairs, least recently used first. |

### Emitter

A small typed event emitter. [Reference](/reference/emitter/) • [Guide](/flow/emitter/)

| Name | What it does |
| --- | --- |
| [`new Emitter()`](/reference/emitter/#constructor) |  |
| [`on()`](/reference/emitter/#on) | Listens to an event. |
| [`once()`](/reference/emitter/#once) | Listens to an event once. |
| [`onAny()`](/reference/emitter/#onany) | Listens to every event; the listener gets the event name first. |
| [`off()`](/reference/emitter/#off) | Removes a listener, or all listeners of the event if you don't pass one. |
| [`emit()`](/reference/emitter/#emit) | Calls the event's listeners right away, in the order they were added. |
| [`emitAsync()`](/reference/emitter/#emitasync) | Calls the listeners one at a time, waiting for each, and resolves with what they returned. |
| [`waitFor()`](/reference/emitter/#waitfor) | Waits for the next time the event fires and resolves with its arguments. |
| [`iterate()`](/reference/emitter/#iterate) | Loops over an event with `for await`. |
| [`listenerCount()`](/reference/emitter/#listenercount) | How many listeners an event has, or all events together. |
| [`listeners()`](/reference/emitter/#listeners) | The listeners of an event, in the order they run. |
| [`eventNames()`](/reference/emitter/#eventnames) | The events that have listeners. |
| [`clear()`](/reference/emitter/#clear) | Removes all listeners of an event, or everything if you don't name one. |

## System and network

### nc.http

An HTTP client on top of `fetch`: JSON by default, query objects, base URLs, timeouts, safe retries that respect `Retry-After`, typed errors, hooks, reusable clients and downloads with progress. [Reference](/reference/http/) • [Guide](/system/http/)

| Name | What it does |
| --- | --- |
| [`request()`](/reference/http/#request) | Sends a request and resolves with the response, body already read. |
| [`get()`](/reference/http/#get) | Sends a GET request. |
| [`head()`](/reference/http/#head) | Sends a HEAD request: headers only, no body. |
| [`post()`](/reference/http/#post) | Sends a POST request. |
| [`put()`](/reference/http/#put) | Sends a PUT request. |
| [`patch()`](/reference/http/#patch) | Sends a PATCH request. |
| [`delete()`](/reference/http/#delete) | Sends a DELETE request. |
| [`download()`](/reference/http/#download) | Downloads to a file as a stream, so memory stays flat whatever the size. |
| [`create()`](/reference/http/#create) | Creates a client with default options. |
| [`HttpError`](/reference/http/#httperror) | Thrown by `nc.http` when the response status isn't 2xx (unless you pass `throwHttpErrors: false`), and for network failures (`status` 0). |

### SQLite

SQLite made pleasant, on the engine built into Node.js (22.13+): CRUD with rich filters, JSON and boolean columns, transactions, migrations and backups. [Reference](/reference/sqlite/) • [Guide](/system/sqlite/)

| Name | What it does |
| --- | --- |
| [`new SQLite()`](/reference/sqlite/#constructor) | Opens a database, creating the file and its folders if needed. |
| [`exec()`](/reference/sqlite/#exec) | Runs SQL that doesn't return rows. |
| [`queryOne()`](/reference/sqlite/#queryone) | Runs a query and returns the first row. |
| [`queryAll()`](/reference/sqlite/#queryall) | Runs a query and returns every row. |
| [`iterate()`](/reference/sqlite/#iterate) | Goes through the rows of a query one at a time, without loading them all. |
| [`createTable()`](/reference/sqlite/#createtable) | Creates a table with its constraints and indexes, unless it already exists. |
| [`createIndex()`](/reference/sqlite/#createindex) | Creates an index, unless it already exists. |
| [`deleteTable()`](/reference/sqlite/#deletetable) | Drops a table and everything in it. |
| [`clearTable()`](/reference/sqlite/#cleartable) | Deletes every row, keeping the table. |
| [`hasTable()`](/reference/sqlite/#hastable) | Does the table exist? |
| [`tables()`](/reference/sqlite/#tables) | The tables in the database, sorted. |
| [`columns()`](/reference/sqlite/#columns) | The columns of a table. |
| [`get()`](/reference/sqlite/#get) | The first row that matches. |
| [`getAll()`](/reference/sqlite/#getall) | The rows that match, with sorting and pagination. |
| [`paginate()`](/reference/sqlite/#paginate) | One page of the rows that match, with what a pager needs to draw itself. |
| [`count()`](/reference/sqlite/#count) | Counts the rows that match. |
| [`exists()`](/reference/sqlite/#exists) | Does any row match? |
| [`insert()`](/reference/sqlite/#insert) | Inserts a row. |
| [`insertMany()`](/reference/sqlite/#insertmany) | Inserts many rows in one transaction: all or nothing, and much faster than one by one. |
| [`update()`](/reference/sqlite/#update) | Updates the rows that match. |
| [`upsert()`](/reference/sqlite/#upsert) | Inserts a row, or updates it in place if it clashes with an existing one on the `conflict` columns. |
| [`set()`](/reference/sqlite/#set) | Updates the row matching `where` (or `{ id: data.id }`), or inserts it. |
| [`delete()`](/reference/sqlite/#delete) | Deletes the rows that match. |
| [`increment()`](/reference/sqlite/#increment) | Adds to number columns in one statement, so two requests at the same moment both count. |
| [`table()`](/reference/sqlite/#table) | Shortcuts bound to one table, so you don't repeat its name. |
| [`transaction()`](/reference/sqlite/#transaction) | Runs `callback` in a transaction: all its changes are saved together, or none are if it throws. |
| [`inTransaction`](/reference/sqlite/#intransaction) | Whether a transaction is open. |
| [`migrate()`](/reference/sqlite/#migrate) | Applies migrations in order, each one once. |
| [`version`](/reference/sqlite/#version) | The migration version, stored in `PRAGMA user_version`. |
| [`backup()`](/reference/sqlite/#backup) | Copies the database to a new file. |
| [`vacuum()`](/reference/sqlite/#vacuum) | Compacts the database file to reclaim unused space. |
| [`fn()`](/reference/sqlite/#fn) | Makes a JavaScript function callable from SQL. |
| [`path`](/reference/sqlite/#path) | The absolute path of the database file, or `":memory:"`. |
| [`isOpen`](/reference/sqlite/#isopen) | Whether the connection is open. |
| [`native`](/reference/sqlite/#native) | The underlying `node:sqlite` database, for anything not covered here. |
| [`close()`](/reference/sqlite/#close) | Closes the connection. |

### nc.cli

What you need for command-line tools: typed arguments with a generated `--help`, prompts, arrow-key menus, spinners, progress bars, tables and boxes. [Reference](/reference/cli/) • [Guide](/system/cli/)

| Name | What it does |
| --- | --- |
| [`table()`](/reference/cli/#table) | Draws a table from an array of objects (keys become columns) or an array of arrays. |
| [`box()`](/reference/cli/#box) | Draws a box around text. |
| [`tree()`](/reference/cli/#tree) | Draws nested data as a tree, like the `tree` command does for folders. |
| [`spinner()`](/reference/cli/#spinner) | A spinner for work in progress. |
| [`spin()`](/reference/cli/#spin) | Shows a spinner while some work runs, then `✔` or `✖` depending on how it ended. |
| [`progress()`](/reference/cli/#progress) | A progress bar with percentage, ETA and speed. |
| [`prompt()`](/reference/cli/#prompt) | Asks a question and returns the answer. |
| [`password()`](/reference/cli/#password) | Asks for a secret without showing it; each character appears as `*`. |
| [`confirm()`](/reference/cli/#confirm) | Asks a yes/no question. |
| [`select()`](/reference/cli/#select) | Lets the user pick one choice with the arrow keys and Enter. |
| [`multiselect()`](/reference/cli/#multiselect) | Lets the user pick several choices: arrows to move, Space to toggle, `a` for all, Enter to confirm. |
| [`args()`](/reference/cli/#args) | Parses command-line arguments from a schema, and types the result: `flags.port` is a `number`. |
| [`isInteractive()`](/reference/cli/#isinteractive) | Is someone at the keyboard? |
| [`size()`](/reference/cli/#size) | The terminal size, or 80x24 when it's unknown. |
| [`clear()`](/reference/cli/#clear) | Clears the screen. |

### nc.color

Terminal colors you can chain, like `chalk`. [Reference](/reference/color/) • [Guide](/system/color/)

| Name | What it does |
| --- | --- |
| [`level`](/reference/color/#level) | The current color level. |
| [`enabled`](/reference/color/#enabled) | Whether colors are being output. |
| [`create()`](/reference/color/#create) | A separate instance with its own level, for another stream or for tests. |
| [`detect()`](/reference/color/#detect) | The color level a stream supports, taking `NO_COLOR` and `FORCE_COLOR` into account. |
| [`strip()`](/reference/color/#strip) | Removes colors and other terminal escape codes. |
| [`width()`](/reference/color/#width) | How many columns the text takes, ignoring colors and counting emoji and CJK as 2. |
| [`truncate()`](/reference/color/#truncate) | Cuts text to a number of columns and adds `…`. |
| [`link()`](/reference/color/#link) | A clickable link in terminals that support it, `"text (url)"` elsewhere. |
| [`gradient()`](/reference/color/#gradient) | Colors the text along a gradient of hex colors. |

### nc.sys

Processes and the system: run commands and get their output, find executables, shut down cleanly, open URLs, and learn about the machine. [Reference](/reference/sys/) • [Guide](/system/sys/)

| Name | What it does |
| --- | --- |
| [`run()`](/reference/sys/#run) | Runs a program without a shell, so arguments are passed as they are and user input can't inject anything. |
| [`exec()`](/reference/sys/#exec) | Runs a command line through the shell, so pipes, `&&` and variables work. |
| [`which()`](/reference/sys/#which) | Finds an executable in `PATH`, like the `which` command. |
| [`open()`](/reference/sys/#open) | Opens a URL, file or folder with the default app. |
| [`onShutdown()`](/reference/sys/#onshutdown) | Runs cleanup code when the process is asked to stop (Ctrl+C, `docker stop`, `kill`): close servers, flush logs, disconnect databases. |
| [`shutdown()`](/reference/sys/#shutdown) | Stops the process the clean way: runs the `onShutdown()` handlers, then exits. |
| [`freePort()`](/reference/sys/#freeport) | Finds a TCP port nobody is listening on. |
| [`localIP()`](/reference/sys/#localip) | The address of this machine on the local network, like `"192.168.1.20"`. |
| [`isWindows()`](/reference/sys/#iswindows) | Are we on Windows? |
| [`isMac()`](/reference/sys/#ismac) | Are we on macOS? |
| [`isLinux()`](/reference/sys/#islinux) | Are we on Linux? |
| [`isCI()`](/reference/sys/#isci) | Are we running in CI? |
| [`isDocker()`](/reference/sys/#isdocker) | Are we running inside a container? |
| [`isWSL()`](/reference/sys/#iswsl) | Are we running in WSL? |
| [`info()`](/reference/sys/#info) | Facts about the machine and the runtime, handy for bug reports. |
| [`memory()`](/reference/sys/#memory) | Memory used by this process, in bytes. |

### nc.crypto

Crypto without the footguns, built on `node:crypto`: hashes, HMAC, password hashing (scrypt), encryption (AES-256-GCM), JWT, two-factor codes (TOTP) and secure random values. [Reference](/reference/crypto/) • [Guide](/system/crypto/)

| Name | What it does |
| --- | --- |
| [`hash()`](/reference/crypto/#hash) | Hashes data, SHA-256 in hex by default. |
| [`hmac()`](/reference/crypto/#hmac) | An HMAC signature: a hash keyed with a secret. |
| [`verifyHmac()`](/reference/crypto/#verifyhmac) | Checks an HMAC signature you received, in constant time. |
| [`safeEqual()`](/reference/crypto/#safeequal) | Compares two secrets in constant time, so the comparison can't leak anything through timing, not even their lengths. |
| [`hashPassword()`](/reference/crypto/#hashpassword) | Hashes a password with scrypt and a random salt. |
| [`verifyPassword()`](/reference/crypto/#verifypassword) | Checks a password against a stored hash, in constant time. |
| [`needsRehash()`](/reference/crypto/#needsrehash) | Was this hash made with weaker settings than yours? |
| [`generateKey()`](/reference/crypto/#generatekey) | A random 256-bit key for `encrypt()`, as text you can put in an environment variable. |
| [`encrypt()`](/reference/crypto/#encrypt) | Encrypts data with AES-256-GCM, which also detects tampering. |
| [`decrypt()`](/reference/crypto/#decrypt) | Decrypts what `encrypt()` produced. |
| [`signJWT()`](/reference/crypto/#signjwt) | Creates a signed JSON Web Token. |
| [`decodeJWT()`](/reference/crypto/#decodejwt) | Reads a JWT without checking it. |
| [`verifyJWT()`](/reference/crypto/#verifyjwt) | Verifies a JWT: algorithm, signature, expiry, and whichever claims you require. |
| [`generateKeyPair()`](/reference/crypto/#generatekeypair) | Makes a pair of keys for signing JWTs: the private one signs, the public one verifies. |
| [`totpSecret()`](/reference/crypto/#totpsecret) | A new two-factor secret, in the Base32 format authenticator apps expect. |
| [`totp()`](/reference/crypto/#totp) | The current 6-digit code for a two-factor secret, as shown by authenticator apps. |
| [`verifyTOTP()`](/reference/crypto/#verifytotp) | Checks a code typed by a user. |
| [`totpURI()`](/reference/crypto/#totpuri) | The `otpauth://` link to show as a QR code when a user turns on 2FA. |
| [`randomBytes()`](/reference/crypto/#randombytes) | Secure random bytes. |
| [`randomInt()`](/reference/crypto/#randomint) | A secure random integer from `min` to `max`, both included, with no bias. |
| [`toBase64()`](/reference/crypto/#tobase64) | Encodes to Base64, or URL-safe Base64. |
| [`fromBase64()`](/reference/crypto/#frombase64) | Decodes Base64 or URL-safe Base64. |
