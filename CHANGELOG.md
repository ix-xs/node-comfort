# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-09-12

node-comfort becomes a complete, zero-dependency standard library for Node.js: 23 namespaces and classes,
more than 500 documented and typed functions, and an editor experience checked on every commit.

### Security

- **Prototype pollution fixed** in `obj.set()` and `obj.unflatten()` (1.2.0). A path such as
  `"__proto__.isAdmin"` coming from user input could modify `Object.prototype`. Every object helper
  (`set`, `unset`, `merge`, `mergeWith`, `defaults`, `unflatten`, `clone`, `fromEntries`...) now ignores
  `__proto__`, `constructor` and `prototype` keys. **Upgrade if you pass user-controlled paths or objects
  to these functions.**
- The 1.x filesystem helpers searched the whole folder tree for a file with the same name when a relative
  path did not exist, which could read, overwrite or delete the wrong file. This implicit search is gone
  (see `fs` below).
- `id.code()` no longer has a modulo bias (rejection sampling).

### Breaking changes

Each item explains what to change. Most projects only need the SQLite and Node.js items.

1. **Node.js 22.13 or newer is required** (`engines`). Node 20 reaches end of life, and 1.x already
   required `node:sqlite`, which is only available without a flag since Node 22.13.
2. **Deep imports are no longer allowed**: the package defines an `exports` map. Replace
   `require("@ix-xs/node-comfort/src/Logger")` by `require("@ix-xs/node-comfort").logger`, or by the
   official entry point of the namespace: `require("@ix-xs/node-comfort/logger")`.
3. **SQLite methods throw instead of returning `{ error }`.** Failures throw a `nc.errors.SQLiteError`
   (with `sql` and `sqliteCode`, for example `"SQLITE_CONSTRAINT_UNIQUE"`). Success values are unchanged.
   ```js
   // 1.x
   const result = await db.insert("users", data);
   if (result.error) console.error(result.error);
   // 2.0
   try {
     db.insert("users", data);
   } catch (error) {
     if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") console.error("Email already used");
   }
   ```
   `db.transaction()` re-throws the error after rolling back (it used to return `{ error }`).
4. **SQLite methods are synchronous.** They return values directly, like the underlying engine. `await`
   keeps working, but `.then()` chains on their results must be removed. `db.transaction()` still accepts
   async callbacks (it then returns a promise).
5. **`db.getAll()` no longer limits to 50 rows and no longer sorts by default.** Pass `{ limit: 50 }` to keep
   a limit, and `{ orderBy: "id", direction: "DESC" }` to keep the old order. When `orderBy` is given without
   `direction`, the order is now ascending (it was descending).
6. **SQLite tables are read from the database file.** 1.x only knew the tables created with `createTable()`
   in the same process (`get()` returned `undefined` and `getAll()` returned `[]` for the others). Tables are
   now found through `sqlite_master`, and an unknown table throws a `SQLiteError`.
7. **SQLite `BOOLEAN` and `JSON` columns are converted.** Reading a `BOOLEAN` column returns `true`/`false`
   (it returned `1`/`0`) and a `JSON` column returns the parsed value. Writing booleans, objects, arrays and
   dates now works (1.x threw "cannot be bound"). Disable with `new nc.SQLite(path, { booleans: false, json: false })`.
8. **`warn`, `error` and `fatal` logs are written to stderr**, like `console.warn` and `console.error`.
   Colors are disabled when the output is not a terminal (files, pipes, CI logs) and with `NO_COLOR`;
   use `FORCE_COLOR=1` to force them.
9. **Logger markup: `overline` draws a real overline.** It used to strike the text through; use
   `strikethrough` for that.
10. **`func.timeout()` rejects with a `nc.errors.TimeoutError`.** It is still an `Error` with the same
    message; only `error.name` (`"TimeoutError"`) and `error.code` (`"ETIMEDOUT"`) are new.
11. **`num.round()` rounds negative halves away from zero** (`-2.5` gives `-3`, it gave `-2`), consistently
    with positive numbers, and never returns `-0`. Decimal precision is fixed: `round(1.005, 2)` is `1.01`.
12. **`str.length()`, `str.reverse()`, `str.truncate()` and `str.center()` count graphemes**, not UTF-16
    code units: `str.length("👨‍👩‍👧")` is `1`, and emoji or accents are never cut in half.
13. **The filesystem helpers no longer search the folder tree** when a relative path does not exist
    (see Security). Use the new `nc.find("config.json")` to search explicitly.
14. **`dontCrash()` only removes the listeners it added.** 1.x removed every `uncaughtException`, `exit`
    and signal listener of the process, including those of other libraries. Calling it again replaces the
    previous handlers, and the returned controller has `dispose()`.
15. **Stricter or more complete validators**: `isEmail()` accepts international addresses but rejects
    consecutive or trailing dots; `isUUID()` accepts versions 1 to 8 and the nil/max UUIDs (use
    `{ version }` to restrict); `isURL()` accepts an options object (`protocols`, `requireTld`).
16. **`JSONString()` converts `Map` to objects and `Set` to arrays** (they gave `{}`), and an object used
    twice is serialized twice instead of being replaced by `"[Circular]"` (only real cycles are).

### Deprecated

- `id.hash()`, `id.hmac()` and `id.safeEqual()` moved to `nc.crypto` (same signatures). The aliases keep
  working and will be removed in 3.0.0.

### Added

**Packaging and editor experience**
- Lazy loading: `require("@ix-xs/node-comfort")` takes about 3 ms, and each namespace is loaded the first
  time it is used. A script that only logs never loads the database, the HTTP client or the crypto code.
- An entry point per namespace (`@ix-xs/node-comfort/str`, `/http`, `/sqlite`...), which keeps ES module
  imports light and makes bundling easier.
- A documentation website at https://ix-xs.github.io/node-comfort/: guides for every namespace, the full
  API reference, recipes, and search.
- Complete TypeScript declarations generated from the JSDoc: hover documentation with examples for every
  function, parameter and option, completion after `nc.` and `nodeComfort.`, auto-import of `nc`,
  `nodeComfort` and every flat helper, type guards, typed dot paths, schema inference, generic caches,
  typed events, SQLite columns suggested in `where` filters.
- ES module named imports (`import { str, isEmail, nc } from "@ix-xs/node-comfort"`) and
  `const { nc } = require(...)`.
- `docs/API.md`, a complete API reference generated from the types.
- Tests (`node --test`) and CI on Linux, macOS and Windows with Node 22, 24 and the latest release;
  editor checks with TypeScript 5.9, 6 and 7.

**New namespaces and classes**
- `nc.crypto`: `hashPassword`/`verifyPassword`/`needsRehash` (scrypt), `encrypt`/`decrypt` (AES-256-GCM),
  `signJWT`/`verifyJWT`/`decodeJWT` (HS256/384/512), `totp`/`verifyTOTP`/`totpSecret`/`totpURI` (2FA),
  `hash`, `hmac`, `safeEqual`, `generateKey`, `randomBytes`, `randomInt`, `toBase64`, `fromBase64`.
- `nc.color`: chainable terminal colors (`color.red.bold("x")`), hex/RGB/256 colors, automatic level
  detection and downgrade, `strip`, `width`, `link`, `gradient`, `create`.
- `nc.cli`: typed `args` with generated `--help`, `prompt`, `password`, `confirm`, `select`,
  `multiselect`, `spinner`, `progress`, `table`, `box`, `isInteractive`, `size`, `clear`.
- `nc.sys`: `run` (no shell, Windows-safe arguments), `exec`, `which`, `open`, `onShutdown` (graceful
  shutdown), `isWindows`, `isMac`, `isLinux`, `isCI`, `isDocker`, `isWSL`, `info`, `memory`.
- `nc.async`: `map`/`forEach`/`filter` with a concurrency limit, `series`, `limit`, `queue` (priorities,
  timeouts), `mutex`, `deferred`, `settle`, `props`, `poll`, `sleep`.
- `nc.schema`: schema validation with TypeScript inference (`string`, `number`, `boolean`, `bigint`, `date`,
  `literal`, `enum`, `array`, `object`, `union`, `tuple`, `record`, `lazy`, `instanceOf`, `custom`, `coerce`,
  `refine`, `transform`, `default`, `catch`...).
- `nc.http`: HTTP client on top of `fetch` with JSON, query objects, auth, timeouts, retries with
  `Retry-After`, hooks, clients (`create`/`extend`), downloads with progress.
- `nc.env`: `.env` parser and loader, typed getters (`number`, `bool`, `port`, `url`, `duration`, `list`,
  `json`, `oneOf`) and `validate()` reporting every invalid variable at once. `NODE_COMFORT_DOTENV=false`
  disables the automatic `.env` loading.
- `nc.errors`: `NodeComfortError`, `AssertionError`, `TimeoutError`, `AbortError`, `ValidationError`,
  `HttpError`, `JWTError`, `ProcessError`, `SQLiteError`, each with a stable `code`.
- `nc.Cache`: LRU cache with TTL, `getOrSet` (concurrent loads shared), `wrap`, `prune`, `stats`.
- `nc.Emitter`: typed event emitter with `once`, `onAny`, `emitAsync`, `waitFor`, `iterate`.

**Existing modules**
- Logger: `trace`, `fatal` and `silent` levels, `LOG_LEVEL`, `LOG_FORMAT=json`, structured fields,
  `createLogger` with scope, file output with rotation, `child` (its `fields` are added to the parent's,
  for per-request loggers), `table`, `box`, `divider`, markup colors in
  hex and RGB, `setLevel`, `configure`; every function returns the logger for chaining.
- FS: `glob` (relative patterns, or absolute ones that search where they point), `find`, `readLines`,
  `writeFile` (atomic), `ensureFolder`, `ensureFile`, `touch`, `remove`,
  `copy`, `move`, `isFile`, `isFolder`, `folderSize`, `tempFolder`, `sanitizeFilename`, chunked
  `hashFile`, `readJSON` with comments, atomic `writeJSON`, debounced `watch`.
- Checker: about 30 new guards (`isIP`, `isPort`, `isSemver`, `isJWT`, `isHexColor`, `isBase64`,
  `isCreditCard`, `isArrayOf`, `isOneOf`, `isClass`, `isBlank`...), `assert` and `assertType`.
- `str`, `num`, `arr`, `obj`, `func`, `time`, `id`: more than 120 new functions, among them `str.dedent`,
  `str.wrap`, `str.plural`, `str.closest`, `str.mask`, `num.currency`, `num.percentile`, `num.parseBytes`,
  `arr.paginate`, `arr.windows`, `arr.cartesian`, `obj.diff`, `obj.mergeWith`, `func.pipe`,
  `time.setLocale`/`time.setTimezone` (every date function in any language and time zone),
  `time.calendar`, `time.cron`, `time.every`, `time.nextRun`, `id.uuidv7`, `id.snowflake`.
- `num.setLocale()` sets the default language of `format`, `currency`, `percent`, `abbreviate`,
  `ordinal` and `formatBytes`, like `time.setLocale()` does for dates.
- SQLite: rich `where` operators (`gt`, `in`, `like`, `between`, `$or`...), `insertMany`, `exists`,
  `tables`, `columns`, `hasTable`, `table()` handles, `migrate()` (versioned with `user_version`),
  `backup()`, `vacuum()`, `iterate()`, `fn()` (SQL functions in JavaScript), nested transactions with
  savepoints, prepared statement cache, `readOnly`/`busyTimeout` options, `using` support.

### Fixed

- `const { merge } = nc.obj` (and any destructured helper) threw because functions relied on `this`.
- `titleCase()` broke words with accented letters.
- Logger groups were not indented consistently, and logging a circular object crashed.
- `unescapeHTML()` now decodes numeric entities (`&#39;`, `&#x27;`) and `&nbsp;`.
- `memoize()` no longer keeps rejected promises: a failed call is retried next time.
- `watch()` follows the real path of what it watches, so a short (8.3) or symlinked path no longer
  crashes the watcher on Windows.
- Dates, maps, sets and plain objects coming from a worker or a `vm` context are recognized by
  `obj`, `schema`, `time`, `checker.isPlainObject` and `JSONString` (1.x compared prototypes, which
  are not shared between realms).

### Migration checklist

1. Upgrade Node.js to 22.13+.
2. Replace deep imports by the namespaces (`nc.logger`, `nc.fs`...).
3. SQLite: replace `if (result.error)` checks by `try/catch`, add `{ limit, orderBy, direction: "DESC" }`
   where you relied on the old `getAll()` defaults, and check code that compared `BOOLEAN` columns to `1`/`0`.
4. If you parse your application's output, remember that warnings and errors now go to stderr.
5. Replace `nc.id.hash/hmac/safeEqual` by `nc.crypto.hash/hmac/safeEqual` (optional until 3.0).

## [1.2.0]

### Added

- Namespaces `str`, `num`, `arr`, `obj`, `func`, `time` and `id`.
- Checker: 22 new guards (`isEmail`, `isURL`, `isUUID`, `isEmpty`, `isPlainObject`...).
- Logger: `info`, `success`, `warn`, `error` and `debug` levels.
- FS: `readJSON`, `writeJSON`, `appendFile`, `exists`, `stat`, `fileSize`, `hashFile`, `emptyFolder`.
- SQLite: `:memory:` databases.

### Fixed

- SQLite: the folder of the database was created in one place and the file opened in another.

[2.0.0]: https://github.com/ix-xs/node-comfort/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/ix-xs/node-comfort/releases/tag/v1.2.0
