---
title: "Troubleshooting"
description: "The messages and surprises that come up most, what they mean and what to do."
---

## DeprecationWarning: nc.x() is deprecated

```text
(node:7676) [NODE_COMFORT_DEP_INFO] DeprecationWarning: nc.info() is deprecated: use nc.logger.info(). It will be removed in 4.0.
```

The code uses a name of 2.x. It works as before; the warning names what to write instead. `node --trace-deprecation` shows the line, and [Upgrading to 3.0](/help/upgrade-3-0/) lists every old name.

The warning can come from a dependency that uses node-comfort 2.x names. In that case, `node --no-deprecation` silences it until the dependency is updated.

## Node.js version

| Message | Cause |
| --- | --- |
| `npm warn EBADENGINE Unsupported engine` | Node.js is older than 22.23.4, 24.22.1 or 26.12.1, or is 23 or 25 |
| `SQLiteError: node:sqlite is not available in Node.js` | `nc.sqlite` on a Node.js without `node:sqlite` |
| `ERR_ARGON2_UNAVAILABLE` | `nc.crypto.hashPassword()` with Argon2id on Node.js older than 24.7 |

Check with `node --version`, then update Node.js, the `engines` field of the project, the CI and the Docker images. Older versions [can be crashed by a malicious HTTP response](/system/http/#servers-you-dont-control).

## Left out of the automatic .env load

```text
[@ix-xs/node-comfort] Left out of the automatic .env load, as they can run code or weaken TLS: NODE_OPTIONS. Call env.load() to load them on purpose.
```

The `.env` of the working directory sets a variable that the automatic load never takes: `NODE_OPTIONS`, `PATH`, `NODE_TLS_REJECT_UNAUTHORIZED` and others ([Configuration](/start/configuration/)). Remove it from `.env`, or load the file on purpose when you trust it:

```js
nc.env.load(".env");
```

## A variable of .env is not set

| Cause | Fix |
| --- | --- |
| The program runs from another folder | The automatic load reads `.env` in the working directory. Run from the project folder, or call `nc.env.load(nc.fs.resolve("./.env"))` |
| The variable is already set in the environment | The environment wins. `override: true` on `nc.env.load()` changes that |
| `NODE_COMFORT_DOTENV=false` | The automatic load is off |
| The variable is read before the package loads | Require the package first, in the entry file |

## A relative path points to the wrong place

`nc.fs` reads `./x` from the file that calls it. `nc.sqlite.open()`, `nc.env.load()`, `nc.http.download()`, `nc.sys.open()`, the logger's `file.path` and `nc.fs.glob()` read it from the working directory:

```js
nc.sqlite.open(nc.fs.resolve("./data/app.sqlite")); // next to this file, wherever node is started
```

A command-line tool that receives a path typed by the user should resolve it from the working directory itself, with `path.resolve()`, before giving it to `nc.fs`.

## fs.remove() returned false

`nc.fs` returns `false` instead of throwing. The usual causes: the path is empty (refused, never read as the working directory), it does not exist, a file is open in another program (Windows), or permissions. `nc.fs.exists()` and `nc.fs.stat()` tell which.

## A named import fails in an ES module

```text
SyntaxError: Named export 'open' not found. The requested module '@ix-xs/node-comfort/sqlite' is a CommonJS module
```

`@ix-xs/node-comfort/sqlite`, `/cache`, `/emitter`, `/quota` and `/circuit` export a class: import it by default (`import SQLite from "@ix-xs/node-comfort/sqlite"`), or take the namespace from the root (`import { sqlite } from "@ix-xs/node-comfort"`). See [Your editor](/start/editor/).

## No colors, or escape codes in a file

Colors follow the terminal: none when the output is redirected to a file or a pipe, or when `NO_COLOR` is set. `FORCE_COLOR=1`, `2` or `3` forces them, `nc.logger.configure({ colors: false })` removes them from the logs. Log files never get colors.

## A prompt rejects with ERR_INPUT_CLOSED

The input ended before the answer: stdin is closed, a pipe ran out, or the program runs in CI. Check `nc.cli.isInteractive()` first, and take the answer from a flag or a variable when it is false.

## Windows

| Topic | |
| --- | --- |
| Commands | `nc.sys.run("npm", [...])` finds `npm.cmd`. A `.cmd` or `.bat` file refuses an argument with a line break, or with a quote when the file does not pass its arguments with `%*`: cmd.exe cannot be given those safely |
| Output | Lines of `nc.sys.exec()` end with `\r\n`. Split with `nc.str.lines()` |
| Stopping | `timeout` and `signal` stop the command and what it started |
| Files in use | A rename refused by an antivirus or an indexer is tried again. A file open in another program cannot be removed: `remove` returns `false` |
| Links | `nc.fs.remove(folder, { contents: true })` refuses a junction: what it points to is left alone |
| Network paths | `nc.sys.open()` refuses `\\server\share` unless `allowUNC: true` |
| Signals | `nc.sys.onShutdown()` also listens to `SIGBREAK` (Ctrl+Break) |

## Still stuck

Open an issue on [GitHub](https://github.com/ix-xs/node-comfort/issues) with the version of node-comfort and of Node.js, the operating system, the `code` of the error, and the smallest code that shows the problem. A security problem goes through [GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new), never a public issue.
