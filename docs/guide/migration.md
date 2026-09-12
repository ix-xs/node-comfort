# Migrating from 1.x

Version 2 keeps the 1.x API: the top-level helpers, the `fs` functions and the SQLite methods are all still there. A few behaviors changed, and this page lists them with what to do.

Most projects only need the first three sections.

## Node.js 22.13 or newer

Node 20 is at the end of its life, and 1.x already needed `node:sqlite`, which only works without a flag since Node 22.13.

## SQLite throws instead of returning `{ error }`

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

Other SQLite changes:

- **Methods are synchronous.** They return values directly. `await` still works, but remove any `.then()` on their results.
- **`getAll()` no longer limits to 50 rows or sorts by default.** Add `{ limit: 50 }` and `{ orderBy: "id", direction: "DESC" }` where you relied on that. With `orderBy` and no `direction`, the order is now ascending.
- **Tables are read from the database file.** In 1.x, only tables created with `createTable()` in the same process were visible. Now any table in the file works, and an unknown table throws.
- **`BOOLEAN` and `JSON` columns are converted.** You get `true`/`false` instead of `1`/`0`, and parsed objects instead of JSON text. Writing booleans, objects and dates now works too. To keep the old behavior: `new nc.SQLite(path, { booleans: false, json: false })`.
- **`transaction()` throws the error** after rolling back, instead of returning `{ error }`.

## No more deep imports

The package now declares its entry points. Replace imports of internal files:

```js
// 1.x
const Logger = require("@ix-xs/node-comfort/src/Logger");
// 2.0
const { logger } = require("@ix-xs/node-comfort");
const logger = require("@ix-xs/node-comfort/logger");
```

## Logs

- **`warn`, `error` and `fatal` go to stderr**, like `console.warn` and `console.error`. If you capture your app's output, capture stderr too.
- **Colors turn off outside a terminal** and with `NO_COLOR`. Use `FORCE_COLOR=1` to keep them.
- **In markup, `overline` draws a line above the text.** It used to cross it out; use `strikethrough` for that.

## Files

When a relative path didn't exist, 1.x searched the folder tree for a file with the same name. That could read, overwrite or delete the wrong file, so it's gone. To search on purpose, use `nc.find("config.json")`.

## Smaller changes

- **`func.timeout()` rejects with a `TimeoutError`.** It's still an `Error` with the same message.
- **`num.round()` rounds negative halves away from zero:** `-2.5` gives `-3`, as positive numbers already did. Decimals are also exact now: `round(1.005, 2)` is `1.01`.
- **`str.length()`, `reverse()`, `truncate()` and `center()` count characters as you see them**, so an emoji counts as one.
- **`dontCrash()` only removes its own listeners.** 1.x also removed listeners added by other code.
- **Validators are more thorough.** `isEmail()` rejects stray dots, `isUUID()` accepts versions 1 to 8, and `isURL()` takes options.
- **`JSONString()` turns Maps into objects and Sets into arrays**, and only real cycles become `"[Circular]"`.

## Deprecated

`id.hash()`, `id.hmac()` and `id.safeEqual()` moved to `nc.crypto`, with the same signatures. The old names still work and will be removed in 3.0.

## Security fix

`obj.set()` and `obj.unflatten()` in 1.2.0 could modify `Object.prototype` when given a path like `"__proto__.isAdmin"`. If you pass user-controlled paths or objects to these functions, upgrade.
