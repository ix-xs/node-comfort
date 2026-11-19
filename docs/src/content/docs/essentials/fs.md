---
title: "Files and folders"
description: "`nc.fs`: read and write text and JSON, list, find, copy, move, remove and watch, synchronously, with paths relative to the calling file and no try/catch for everyday failures."
---

```js
const { fs } = require("@ix-xs/node-comfort");
```

```js
const settings = fs.readJSON("./settings.json", { theme: "light" });
fs.writeJSON("./settings.json", { ...settings, theme: "dark" });
```

## Return values

Missing files and failed operations do not throw. Reads return `undefined` (or the fallback), writes and operations return `false`:

```js
fs.read("./notes.txt");           // undefined when it is missing
fs.readJSON("./config.json", {}); // {} when missing or invalid
if (!fs.write("/root/x", "data")) logger.warn("Could not write");
```

Only `ensureFile` and `ensureFolder`, which must succeed, throw.

## Paths

| Path | Starts from |
| --- | --- |
| Absolute | Used as is |
| `./x`, `../x` | The file that calls the function, wherever the script is run from |
| `x`, `logs/x` | The working directory, as with `node:fs` |

`fs.resolve(path)` returns the absolute path a function of `nc.fs` would use; `fs.resolve()` is the working directory. `fs.remove(".")` is the folder of the calling file.

Only `nc.fs` reads `./` from the calling file. `nc.sqlite.open()`, the logger's `file.path`, `nc.http.download()`, `nc.env.load()`, `nc.sys.open()` and `fs.glob()` read it from the working directory: pass them `fs.resolve("./x")` for a path next to your file.

## Reading

```js
fs.read("./README.md");                              // string
fs.read("./logo.png", "buffer");                     // Buffer
fs.readLines("./urls.txt");                          // ["https://a.com", "https://b.com"]
fs.readJSON("./settings.json", { theme: "light" });  // the fallback when missing or invalid
fs.readJSON("./tsconfig.json", {}, { comments: true });
```

| Function | Returns when it cannot read |
| --- | --- |
| `read(path, encoding = "utf8")` | `undefined`. `"buffer"` returns a `Buffer` |
| `readLines(path)` | `undefined`. A final new line adds no empty line |
| `readJSON(path, fallback?, { comments, reviver })` | `fallback`. `comments` accepts comments and trailing commas |

## Writing

```js
fs.write("./dist/index.html", html);
fs.write("./.secrets/token", token, { mode: 0o600 });
fs.write("./data/ledger.json", ledger, { fsync: true }); // an object is written as JSON
fs.writeJSON("./data/users.json", users, { spaces: 2 });
fs.append("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

Writes go to a temporary file that is then renamed: a reader never sees half a file, and a crash cannot corrupt it. Missing folders are created. A file that already exists keeps its permissions.

| `write` / `writeJSON` option | Default | |
| --- | --- | --- |
| `atomic` | `true` | Temporary file, then rename |
| `mode` | system default | Permissions of a new file, like `0o600` |
| `fsync` | `false` | Wait until the data is on the disk |
| `spaces` | `2` | Indentation of JSON |
| `encoding` | `"utf8"` | `write` only |
| `replacer` | none | `writeJSON` only, passed to `JSON.stringify` |

`append(path, data)` adds to the end of a file and creates it if needed.

## Creating

```js
fs.ensureFolder("./storage/uploads"); // its absolute path
fs.ensureFile("./logs/app.log");      // an empty file if needed, an existing one is untouched
fs.touch("./.last-run");              // true, and the modification time is now
const dir = fs.temp("export-");       // a new folder in the system temp directory
```

| Function | Returns | On failure |
| --- | --- | --- |
| `ensureFolder(path)` | Absolute path | Throws |
| `ensureFile(path)` | Absolute path | Throws |
| `touch(path)` | `true` | `false` |
| `temp(prefix = "nc-")` | Absolute path of a new, unique folder | Throws |

## Checking and measuring

```js
fs.exists("./.env");               // true
fs.isFile("./logs/audit.log");     // true
fs.isFolder("./logs");             // true
fs.size("./logs/audit.log");       // 14, in bytes
fs.size("./data");                 // 57, every file of the folder
fs.hash("./release.zip");          // sha256 in hex, read in chunks
fs.hash("./release.zip", { algorithm: "md5", encoding: "base64" });
fs.stat("./video.mp4")?.mtime;
```

`size`, `hash` and `stat` return `undefined` when the path does not exist.

## Listing and finding

```js
fs.list("./");                                             // every file, recursive, absolute paths
fs.list("./", { type: "folders" });
fs.list("./", { recursive: false });
fs.list("./", { filter: (file) => file.endsWith(".json") });

fs.glob("src/**/*.{js,ts}");                               // ["src/index.js", "src/lib/a.ts"]
fs.glob("**/*.test.js", { ignore: ["**/fixtures/**"] });
fs.find("package.json");                                   // the closest one, searching down
fs.findUp("package.json");                                 // the closest one, searching up
fs.findUp(["pnpm-lock.yaml", "package-lock.json"], { stopAt: repoRoot });
```

| `list(folder, options)` option | Default | |
| --- | --- | --- |
| `type` | `"files"` | `"files"`, `"folders"` or `"all"` |
| `recursive` | `true` | Go into nested folders |
| `hidden` (or `dot`) | `true` | Include names starting with a dot |
| `ignore` | `["node_modules"]` | Folder names skipped with all they hold |
| `filter` | none | Keeps a path when it returns `true`. A folder left out is still searched |

`list` returns `undefined` when the folder does not exist.

| `glob(pattern, options)` option | Default | |
| --- | --- | --- |
| `cwd` | working directory | Where the pattern starts |
| `absolute` | `false` | Absolute paths. A pattern that starts at the root of the disk always returns them |
| `dot` | `false` | `*` and `**` match names starting with a dot |
| `ignore` | `node_modules`, `.git` | Patterns left out |
| `type` | `"files"` | `"files"`, `"folders"` or `"all"` |

Patterns understand `*`, `**`, `?`, `[abc]` and `{a,b}`. `glob` returns sorted paths with `/` separators.

`find(name, { cwd, type, ignore })` searches down, `findUp(name, { cwd, type, stopAt })` searches up to the root of the disk or to `stopAt`. Both return an absolute path or `undefined`. `findUp` takes several names, tried in order in each folder.

## Copying and moving

```js
fs.copy("./templates", "./dist/templates");                   // a folder, merged into dest
fs.copy("./logo.png", "./dist/");                             // ./dist/logo.png
fs.copy("./.env.example", "./.env", { overwrite: false });
fs.copy("./src", "./dist", { filter: (source) => !source.endsWith(".test.js") });
fs.move("./report.pdf", "./archive/2026/report.pdf");        // works across drives
fs.move("./report.pdf", "./archive/");                       // ./archive/report.pdf
```

| Source | `dest` | Result |
| --- | --- | --- |
| A file | An existing folder, or ends with `/` (or `\` on Windows) | Inside it, same name |
| A file | Anything else | `dest` itself |
| A folder | Any | `dest` itself, merged with what is there |

| Option | Default | |
| --- | --- | --- |
| `overwrite` | `true` | Replace what exists |
| `filter(source, destination)` | none | Return `false` to skip a file or folder, with all it holds |
| `preserveTimestamps` | `false` | `copy` only |

Both return `false` when the source is missing, when `source` or `dest` is empty, when the destination is inside the source, or when the operation failed. Links inside a copied folder are copied as links, never followed. `move` puts a destination in the way aside, and back if the move fails.

## Removing

```js
fs.remove("./dist");                                           // a file or a folder
fs.remove("./cache", { contents: true });                      // ./cache stays, empty
fs.remove("./logs", { filter: (file) => file.endsWith(".log") }); // only what passes, at any depth
```

| Option | |
| --- | --- |
| `contents` | Empty the folder, keep it |
| `filter(path)` | Delete only what passes. Implies `contents` |

`remove` returns `false` when the path is empty or missing. An empty string is refused, never read as the working directory: write `"."` for the folder of the calling file. With `contents` or `filter`, a link to a folder is never emptied.

## Watching

```js
const watcher = fs.watch("./src", { recursive: true, debounce: "100ms" })
  .on("change", (file) => rebuild(file))
  .on("rename", (file) => logger.info(`Added or removed: ${file}`))
  .on("error", (error) => logger.warn("The watch broke:", error.message));

watcher.stop();
```

| Option | |
| --- | --- |
| `path` | What to watch, when not given first. Defaults to the working directory |
| `recursive` | Nested folders too |
| `debounce` | Merges the events on one file within this long, in ms or like `"100ms"` |
| `filter(event, file)` | Return `false` to ignore an event |

| Watcher method | |
| --- | --- |
| `on(event, callback)`, `off(event, callback)` | `"change"`, `"rename"`, `"all"` (gets the event name too), `"error"` |
| `pause()`, `resume()` | Ignore events for a while |
| `stop()` | Stops watching |

Every method returns the watcher. `watch` returns `undefined` when the path does not exist. When the watched folder is deleted, `"error"` fires once with the code `ENOENT` and the watcher stops. `using watcher = fs.watch(...)` stops it at the end of the block ([Resources](/basics/resources/)).

## File names

```js
fs.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
fs.sanitizeFilename("CON.txt");                    // "_CON.txt"
```

The name works on Windows, macOS and Linux: forbidden characters are replaced (`replacement`, `"_"` by default), invisible characters removed, reserved names prefixed, the length capped at 255 bytes.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.readFile()`, `nc.fs.readFile()` | `nc.fs.read()` |
| `nc.writeFile()`, `nc.fs.writeFile()` | `nc.fs.write()` |
| `nc.appendFile()`, `nc.fs.appendFile()` | `nc.fs.append()` |
| `nc.fileSize()`, `nc.folderSize()` (and under `nc.fs`) | `nc.fs.size()` |
| `nc.hashFile()`, `nc.fs.hashFile()` | `nc.fs.hash()` |
| `nc.getFilesIn()`, `nc.getFoldersIn()` (and under `nc.fs`) | `nc.fs.list()`, `nc.fs.list(folder, { type: "folders" })` |
| `nc.copyFile()`, `nc.copyFolder()`, `nc.copyFilesIn()`, `nc.copyFoldersIn()` (and under `nc.fs`) | `nc.fs.copy()` |
| `nc.moveFile()`, `nc.moveFolder()`, `nc.moveFilesIn()`, `nc.moveFoldersIn()` (and under `nc.fs`) | `nc.fs.move()` |
| `nc.deleteFile()`, `nc.deleteFolder()`, `nc.deleteFilesIn()`, `nc.deleteFoldersIn()` (and under `nc.fs`) | `nc.fs.remove()` |
| `nc.emptyFolder()`, `nc.fs.emptyFolder()` | `nc.fs.remove(folder, { contents: true })` |
| `nc.createFile()`, `nc.fs.createFile()` | `nc.fs.ensureFile()` or `nc.fs.write()` |
| `nc.createFolder()`, `nc.fs.createFolder()` | `nc.fs.ensureFolder()` |
| `nc.tempFolder()`, `nc.fs.tempFolder()` | `nc.fs.temp()` |
| `nc.createPath()`, `nc.fs.createPath()` | `nc.fs.resolve()` |
| `nc.getFile(p)`, `nc.fs.getFile(p)` | `nc.fs.isFile(p) ? nc.fs.resolve(p) : undefined` |
| `nc.getFolder(p)`, `nc.fs.getFolder(p)` | `nc.fs.isFolder(p) ? nc.fs.resolve(p) : undefined` |
| `nc.getEnv()`, `nc.fs.getEnv()` | `nc.env.get()` |
| `nc.readJSON()`, `nc.readLines()`, `nc.writeJSON()`, `nc.exists()`, `nc.isFile()`, `nc.isFolder()`, `nc.stat()`, `nc.glob()`, `nc.find()`, `nc.findUp()`, `nc.ensureFile()`, `nc.ensureFolder()`, `nc.touch()`, `nc.copy()`, `nc.move()`, `nc.remove()`, `nc.sanitizeFilename()`, `nc.watch()` | The same name under `nc.fs` |

The old names still work in 3.0, with their 2.2 behaviour, warn once, and are removed in 4.0. Where the new function differs:

- `fileSize()` on a folder returned `undefined`; `size()` returns the total of its files.
- `createFile()` and `createFolder()` returned `false` when the path existed or on failure; `ensureFile()` and `ensureFolder()` leave what exists, return the absolute path and throw on failure.
- The `*In` helpers returned a count; `copy()`, `move()` and `remove()` return a boolean.
- `copy()` and `move()` of a file onto an existing folder, or to a `dest` ending with `/`, now put it inside. In 2.2, the file could replace the whole folder (`move()`), be written under a name like the folder path, or overwrite silently.
- `remove()`, `copy()` and `move()` refuse an empty path or destination. 2.2 resolved it to the working directory.

See [Upgrading to 3.0](/help/upgrade-3-0/).
