---
title: "Upgrading to 2.2"
description: "Version 2.2 is a security release. Most projects upgrade without changing anything. This page lists what you may need to act on, the most likely first."
sidebar:
  order: 6
---

Most of the fixes in 2.2 change nothing for code that works today. The ones below refuse input that used to be accepted, or change a default. Go through the first sections at least: they are the ones most projects run into.

## Node.js 22.23.4, 24.22.1 or 26.12.1

The package now requires Node.js 22.23.4, 24.22.1, 26.12.1 or a later version of these lines. Older versions can be crashed by a single malicious HTTP response, and no package can prevent it ([details](/system/http/#servers-you-dont-control)). Node.js 25 is not supported.

Check with `node --version`, and update the `engines` field and the Node.js version of your CI and your Docker images. Node.js 26 is the fastest choice: time zones go through `Temporal` there.

## JWT secrets of at least 32 bytes

An `HS256`, `HS384` or `HS512` secret shorter than 32 bytes now throws a `TypeError`, when signing and when verifying. A secret like `"secret"` or `"my-app-key"` can be guessed from a single token.

Generate a new secret once and put it in your environment:

```js
console.log(nc.crypto.generateKey()); // copy the output into JWT_SECRET
```

Tokens signed with the old secret won't verify with the new one, so users will have to sign in again. To check the length at startup, add `JWT_SECRET: { type: "string", minLength: 32 }` to your [`env.validate()`](/essentials/env/) spec.

## env.parse() no longer reads process.env

A `${VAR}` reference in the text given to `env.parse()` now only uses the variables of the text itself and of the `env` option. To get the old behavior, pass the environment:

```js
nc.env.parse(text, { env: process.env });
```

`env.load()` and the automatic load of `.env` are unchanged on this point.

## Some variables of the automatic .env are left out

The `.env` loaded at startup no longer sets the variables that can run code or turn off TLS checks: `NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `PATH`, `GIT_SSH_COMMAND` and others of the same kind. A warning on stderr names the ones it left out.

If your own `.env` sets one of them on purpose, load it explicitly, which sets everything:

```js
nc.env.load(".env");
```

Or set these variables in the real environment. The [`.env` page](/essentials/env/) has the details.

## http: paths stay under baseURL

With a `baseURL`, a URL that leaves it (`"../admin"`, `"//other.host"`, `"https://other.host/"`) now throws a `TypeError`, so a path built from outside input can't take the client's `auth` header elsewhere. If a client of yours calls absolute URLs on purpose, pass `allowAbsoluteUrls: true`:

```js
await api.get(asset.url, { allowAbsoluteUrls: true });
```

The client's `auth`, `headers` and `query` then stay with the base origin, and only what the call gives goes along. A `params` value of `.` or `..` throws too.

## SQLite writes refuse filters that reach every row

`update()`, `delete()`, `increment()` and `set()` now throw a `SQLiteError` on an `undefined` filter value, an empty `$and` or `$or`, or a filter that matches every row, like `{ id: { notIn: [] } }`. Before, `{ id: undefined }` was dropped and the write changed the whole table.

If an error shows up there, a value was missing: check where it comes from. To empty a table on purpose, use `clearTable()`:

```js
db.clearTable("sessions");
```

If your filters take values from a request body, also look at [`operators: "tagged"`](/system/sqlite/#values-from-a-request).

## TOTP secrets of at least 10 bytes

`totp()` and `verifyTOTP()` throw a `TypeError` for a secret under 10 bytes (16 Base32 characters), so the 80-bit secrets many apps made still work. `totpSecret()` now makes secrets of at least 16 bytes (20 by default). `window` must be an integer from 0 to 10.

A user whose secret is shorter than 10 bytes has to set up two-factor authentication again, with a new secret.

## sys.open() opens web and mail links only

`sys.open()` now throws a `TypeError` for a scheme other than `http:`, `https:` and `mailto:`, and an `Error` for a path that doesn't exist. On Windows, network paths (`\\server\share`) are refused. Name the other schemes you need:

```js
nc.sys.open("vscode://file/C:/app/index.js", { protocols: ["vscode:"] });
nc.sys.open("\\\\nas\\reports\\today.pdf", { allowUNC: true });
```

## sys.run() on Windows and with extendEnv

- On Windows, an argument with a line break passed to a `.cmd` or `.bat` file (like `npm`) rejects with a `ProcessError`: `cmd.exe` can't be given one safely. Pass such text through `input` or a file instead.
- A relative command, like `"./bin/tool"`, is looked up from `options.cwd`, not from the current folder.
- `extendEnv: false` without `env` gives the command an empty environment. Pass what it needs in `env`.

## http: response size and redirects

- A body over 100 MB, once decompressed, throws an `HttpError` with the code `ERR_RESPONSE_TOO_LARGE`. Raise the limit with `maxResponseSize: "1GB"`, or use `responseType: "stream"` or `download()` for large files.
- The client follows redirects itself. On a redirect to another origin, it drops `authorization`, `cookie` and the headers of `sensitiveHeaders` (`x-api-key`, `x-auth-token` and `api-key` by default). If you send a secret under another header name, list it in `sensitiveHeaders`.
- `redirect: "error"` throws an `HttpError` with the code `ERR_REDIRECT`, which isn't retried.

## Logs

- Control characters in logged values are shown as text (`\x1b`, `\r`), and the lines after the first one are indented, even without a timestamp (except for `log()` with no scope and no timestamp, which prints like `console.log`). If a tool parses your pretty logs, check it still reads them. JSON logs are the better choice for tools.
- Markup (`<% red ...%>`) is read in the first argument only. Move markup that you put in a later argument into the first one.
- Without colors, and in log files, colors are removed from logged strings.
- In JSON, a logged object can't replace `time`, `level`, `scope` or `msg`.
- New log files are created readable by their owner only. Pass `mode: 0o640` in `file` if another user must read them.

## Smaller changes

- **`crypto.safeEqual("", "")` is `false`.** An empty value never matches, like a missing one.
- **`str.mask()` hides everything** when `start` and `end` would show the whole text: `str.mask("1234")` is `"****"`.
- **`color.strip()` also removes `\r`, `\b`** and every other control character but tabs and new lines.
- **`isURL()` and `schema.string().url()` refuse spaces, double quotes, `<`, `>`, backticks and backslashes.** An apostrophe is fine. `isEmail()`, `isHostname()`, `isMimeType()` and `isCron()` are stricter on look-alike characters, label lengths, line breaks and trailing text, and `time.cron()` refuses `"*/5/x"`.
- **`func.memoize()`, `func.dedupe()` and `cache.wrap()` compare `Set`, `Map` and class instances by identity.** Two different `Set`s with the same items are two calls.
- **`obj.set()` and `obj.unflatten()` make an object for a number key above 10000:** `obj.set({}, "a.20000", 1)` gives `{ a: { "20000": 1 } }`, not an array of 20001 items.
- **`arr.pluck()` and the other string iteratees ignore what an item inherits from `Object.prototype`,** and `obj.get({}, "toString")` is `undefined`.
- **`fs.copyFile()`, `moveFile()`, `copy()`, `move()` and the folder helpers return `false` (or `0`)** when the destination is the source or inside it. They used to delete the data.
- **`schema.union()` stops checking an option at its first issue, and `is()` stops at the first issue:** refinements after it no longer run.
- **`crypto.verifyPassword()` throws a `RangeError` for a hash whose settings would take minutes to check** (scrypt with `p` over 16, Argon2 with more than 1 GiB), without doing that work. The password may well be right: rehash it with settings within the limits.
- **With `operators: "tagged"`, SQLite reads throw on an `undefined` filter value too,** so a missing field in a request can't drop its condition.

## What you can use now

Not required, but worth a look once you're on 2.2:

- [Argon2id passwords](/system/crypto/#passwords) on Node.js 24.7 or later, with `needsRehash()` to move users one login at a time.
- [`totpStep()` and `after`](/system/crypto/#two-factor-authentication) to refuse a two-factor code that was already used.
- [`SQLite.op` and `operators: "tagged"`](/system/sqlite/#values-from-a-request) for filters built from request values.
- [`maxDepth`](/data/schema/#recursive-data) for schemas that read deeply nested input.
- [`using`](/recipes/#cleaning-up-with-using) with watchers, schedules, spinners and listeners on Node.js 24 and later.

The [changelog](https://github.com/ix-xs/node-comfort/blob/main/CHANGELOG.md) has the complete list.
