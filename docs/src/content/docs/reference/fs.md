---
title: "nc.fs"
description: "Files and folders without try/catch: read and write text or JSON (atomically), copy, move, delete, list, glob, watch, hash."
sidebar:
  label: "fs"
  order: 2
---

Paths: absolute paths are used as they are. Paths starting with `./` or
`../` start from the file that calls the function, so a script works
wherever it's run from. Other relative paths start from the working
directory, like Node's `fs`.

Everyday failures don't throw: you get `undefined` when something doesn't
exist and `false` when an operation fails.

```js
const { fs } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const fs = require("@ix-xs/node-comfort/fs");
```

These functions are also at the top level: `nc.getEnv()` is `nc.fs.getEnv()`.

This page lists everything `nc.fs` has, as your editor shows it. For explanations and longer examples, read [the guide](/essentials/fs/).

```js
nc.writeJSON("./data/settings.json", { theme: "dark" });
const settings = nc.readJSON("./data/settings.json", {});
const sources = nc.glob("src/**\/*.{js,ts}");
```

## getEnv

```ts
getEnv(name: string, fallback?: string): string | undefined
```

Reads an environment variable. For typed and checked values, see `nc.env`.

```js
nc.getEnv("REGION", "eu-west-1");
```

## createPath

```ts
createPath(path?: string): string
```

The absolute version of a path, whether it exists or not.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |

```js
nc.createPath("./config/app.json"); // next to the calling file
nc.createPath("logs/app.log");      // from the working directory
```

## getFolder

```ts
getFolder(path?: string): string | undefined
```

The absolute path of a folder, or `undefined` if it doesn't exist.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |

```js
if (!nc.getFolder("./uploads")) nc.createFolder("./uploads");
```

## getFile

```ts
getFile(path: string): string | undefined
```

The absolute path of a file, or `undefined` if it doesn't exist.

## getFoldersIn

```ts
getFoldersIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

The folders inside a folder, nested ones included by default.
`node_modules` is skipped.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |
| `recursive?` | `boolean \| `[`ListOptions`](#listoptions) | Defaults to `true`. |

**Returns** `string[] | undefined`: Absolute paths, or `undefined` if the folder doesn't exist.

```js
nc.getFoldersIn("./src");        // everything
nc.getFoldersIn("./src", false); // direct children only
```

## getFilesIn

```ts
getFilesIn(path?: string, recursive?: boolean | ListOptions): string[] | undefined
```

The files inside a folder, nested ones included by default.
`node_modules` is skipped.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |
| `recursive?` | `boolean \| `[`ListOptions`](#listoptions) | Defaults to `true`. |

**Returns** `string[] | undefined`: Absolute paths, or `undefined` if the folder doesn't exist.

```js
nc.getFilesIn("./src").filter((file) => file.endsWith(".js"));
```

## glob

```ts
glob(pattern: string | string[], options?: GlobOptions): string[]
```

Finds paths matching a glob pattern: `*` (anything but `/`), `**` (any
depth), `?`, `[abc]` and `{js,ts}`.

A pattern starting from the root of the disk searches there, and its
results are absolute.

| Parameter | Type | Description |
| --- | --- | --- |
| `pattern` | `string \| string[]` | One or more patterns. |
| `options?` | [`GlobOptions`](#globoptions) |  |

**Returns** `string[]`: Sorted, relative to `cwd` with `/` separators, unless the pattern is absolute or `absolute` is set.

```js
nc.glob("src/**\/*.js");                           // ["src/index.js", "src/lib/a.js"]
nc.glob("**\/*.{png,jpg}", { cwd: "./assets", absolute: true });
nc.glob("packages/*", { type: "folders" });
nc.glob(`${folder}/**\/*.json`);                   // absolute pattern, absolute results
```

## find

```ts
find(name: string, options?: FindOptions): string | undefined
```

Searches a folder tree for the first file or folder with this name,
closest first.

**Returns** `string | undefined`: The absolute path.

```js
nc.find("config.json");
nc.find("fixtures", { type: "folder", cwd: "./test" });
```

## findUp

```ts
findUp(name: string | string[], options?: { cwd?: string; type?: "file" | "folder" | "any"; stopAt?: string; } | undefined): string | undefined
```

Looks for a file or folder in a folder, then in its parent, and so on up
to the root. It's how you find the `package.json` or the `.git` a file
belongs to.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string \| string[]` | One name, or several to try in each folder, in this order. |
| `options?` | `{ cwd?: string, type?: "file" \| "folder" \| "any", stopAt?: string }` | Where to start (the working directory by default), what to look for (`"any"` by default), and a folder not to go above. |

**Returns** `string | undefined`: The absolute path.

```js
nc.findUp("package.json");                         // the closest one above the working directory
nc.findUp(".git", { type: "folder", cwd: __dirname });
nc.findUp(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]);
```

## readFile

```ts
readFile(path: string, encoding: "buffer"): Buffer<ArrayBufferLike> | undefined
readFile(path: string, encoding?: BufferEncoding): string | undefined
```

Reads a file as text, or as a Buffer with `"buffer"`.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `encoding?` | `BufferEncoding` | Defaults to `"utf8"`. |

**Returns** `string | undefined`: `undefined` if it can't be read.

```js
const text = nc.readFile("./README.md");
const bytes = nc.readFile("./logo.png", "buffer");
```

## readLines

```ts
readLines(path: string): string[] | undefined
```

Reads a text file as lines. A final newline doesn't add an empty line.

**Returns** `string[] | undefined`: `undefined` if it can't be read.

```js
for (const url of nc.readLines("./urls.txt") ?? []) await check(url);
```

## readJSON

```ts
readJSON<T = any>(path: string, fallback?: T, options?: ReadJSONOptions): T
```

Reads a JSON file. If it's missing or invalid you get `fallback`, never
an error.

```js
const settings = nc.readJSON("./settings.json", { theme: "light" });
const tsconfig = nc.readJSON("./tsconfig.json", {}, { comments: true });
```

## writeFile

```ts
writeFile(path: string, data: string | object | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, options?: WriteFileOptions): boolean
```

Writes a file atomically, creating its folders. Objects are written as
JSON.

**Returns** `boolean`: `false` if it failed.

```js
nc.writeFile("./dist/index.html", html);
nc.writeFile("./.secrets/token", token, { mode: 0o600 });
```

## writeJSON

```ts
writeJSON(path: string, data: unknown, options?: WriteJSONOptions): boolean
```

Writes a value as JSON, atomically, creating folders.

**Returns** `boolean`: `false` if it failed, for example on a circular structure.

```js
nc.writeJSON("./data/users.json", users);
```

## appendFile

```ts
appendFile(path: string, data: string | Buffer<ArrayBufferLike>): boolean
```

Appends to a file, creating it and its folders if needed.

```js
nc.appendFile("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

## createFile

```ts
createFile(path: string, force?: boolean, data?: string | object | Buffer<ArrayBufferLike> | null): boolean | undefined
```

Creates a file and its folders.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `force?` | `boolean` | Replace the file if it exists. Defaults to `false`. |
| `data?` | `string \| ``Buffer`` \| object \| null` | Objects are written as JSON. |

**Returns** `boolean | undefined`: `false` if it already existed or failed.

```js
nc.createFile("./notes.txt", false, "hello");    // only if it doesn't exist
nc.createFile("./data.json", true, { ok: true }); // replace it
```

## createFolder

```ts
createFolder(path: string, force?: boolean): boolean | undefined
```

Creates a folder and its parents.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `force?` | `boolean` | Delete and recreate it if it exists. Defaults to `false`. |

**Returns** `boolean | undefined`: `false` if it already existed or failed.

```js
nc.createFolder("./uploads");
nc.createFolder("./cache", true); // start from an empty folder
```

## ensureFolder

```ts
ensureFolder(path: string): string
```

Makes sure a folder exists and returns its absolute path.

**Throws** `Error`: If it can't be created.

```js
const dir = nc.ensureFolder("./storage/uploads");
```

## ensureFile

```ts
ensureFile(path: string): string
```

Makes sure a file exists (an empty one if needed) and returns its
absolute path. An existing file is left as is.

**Throws** `Error`: If it can't be created.

## touch

```ts
touch(path: string): boolean
```

Updates a file's modification time, creating the file if needed, like
the Unix `touch` command.

## deleteFolder

```ts
deleteFolder(path: string): boolean | undefined
```

Deletes a folder and everything in it.

**Returns** `boolean | undefined`: `undefined` if it doesn't exist.

## deleteFile

```ts
deleteFile(path: string): boolean | undefined
```

Deletes a file.

**Returns** `boolean | undefined`: `undefined` if it doesn't exist.

## remove

```ts
remove(path: string): boolean
```

Deletes a file or a folder, whichever it is. Nothing happens if the path
doesn't exist.

**Returns** `boolean`: `true` if something was deleted.

```js
nc.remove("./dist");
```

## deleteFoldersIn

```ts
deleteFoldersIn(path?: string, filter?: ((folder: string) => boolean) | undefined): number | undefined
```

Deletes the folders inside a folder that pass a test.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |
| `filter?` | `(folder: string) => boolean` | Gets absolute paths. Defaults to every folder. |

**Returns** `number | undefined`: How many were deleted.

```js
nc.deleteFoldersIn("./packages", (folder) => folder.endsWith("dist"));
```

## deleteFilesIn

```ts
deleteFilesIn(path?: string, recursive?: boolean, filter?: ((file: string) => boolean) | undefined): number | undefined
```

Deletes the files inside a folder that pass a test.

| Parameter | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Defaults to the working directory. |
| `recursive?` | `boolean` | Defaults to `false`. |
| `filter?` | `(file: string) => boolean` | Gets absolute paths. Defaults to every file. |

**Returns** `number | undefined`: How many were deleted.

```js
nc.deleteFilesIn("./logs", false, (file) => file.endsWith(".log"));
```

## emptyFolder

```ts
emptyFolder(path: string): boolean | undefined
```

Deletes everything inside a folder, keeping the folder.

**Returns** `boolean | undefined`: `undefined` if it doesn't exist.

## copy

```ts
copy(source: string, destination: string, options?: CopyOptions): boolean
```

Copies a file or a whole folder, like `cp -r`.

**Returns** `boolean`: `false` if the source is missing or the copy failed.

```js
nc.copy("./templates", "./dist/templates");
nc.copy("./.env.example", "./.env", { overwrite: false });
```

## move

```ts
move(source: string, destination: string, options?: { overwrite?: boolean; } | undefined): boolean
```

Moves or renames a file or folder, across drives too.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | `string` |  |
| `destination` | `string` |  |
| `options?` | `{ overwrite?: boolean }` | Replace an existing destination. Defaults to `true`. |

```js
nc.move("./report.pdf", "./archive/2024/report.pdf");
```

## copyFoldersIn

```ts
copyFoldersIn(options: CopyFoldersOptions): number | undefined
```

Copies the folders inside a folder into another one. `copy()` is simpler
for most cases.

**Returns** `number | undefined`: How many were copied.

## copyFolder

```ts
copyFolder(options: CopyFolderOptions): boolean | undefined
```

Copies a folder. Without `recursive` or `withFiles`, only the empty
folder is created; `copy()` copies everything in one call.

## copyFilesIn

```ts
copyFilesIn(options: CopyFilesOptions): number | undefined
```

Copies the files inside a folder into another one, keeping the tree.

**Returns** `number | undefined`: How many were copied.

```js
nc.copyFilesIn({ path: "./src", dest: "./dist", filter: (file) => file.endsWith(".css") });
```

## copyFile

```ts
copyFile(options: CopyFileOptions): boolean | undefined
```

Copies one file. If `dest` ends with `/`, the file keeps its name inside
that folder.

```js
nc.copyFile({ path: "./src/index.js", dest: "./dist/" });
```

## moveFoldersIn

```ts
moveFoldersIn(options: CopyFoldersOptions): number | undefined
```

Moves the folders inside a folder.

**Returns** `number | undefined`: How many were moved.

## moveFolder

```ts
moveFolder(options: CopyFolderOptions & { path: string; }): boolean | undefined
```

Moves a folder.

## moveFilesIn

```ts
moveFilesIn(options: CopyFilesOptions): number | undefined
```

Moves the files inside a folder.

**Returns** `number | undefined`: How many were moved.

## moveFile

```ts
moveFile(options: CopyFileOptions): boolean | undefined
```

Moves one file.

```js
nc.moveFile({ path: "./logs/app.log", dest: "./logs/archive/" });
```

## exists

```ts
exists(path: string): boolean
```

Does a file or folder exist at this path?

## isFile

```ts
isFile(path: string): boolean
```

Is it an existing file?

## isFolder

```ts
isFolder(path: string): boolean
```

Is it an existing folder?

## stat

```ts
stat(path: string): Stats | undefined
```

Size, dates and type of a path.

**Returns** `fs.``Stats`` | undefined`: `undefined` if it doesn't exist.

```js
nc.stat("./video.mp4")?.mtime;
```

## fileSize

```ts
fileSize(path: string): number | undefined
```

A file's size in bytes.

**Returns** `number | undefined`: `undefined` if it doesn't exist.

```js
nc.num.formatBytes(nc.fileSize("./backup.zip") ?? 0); // "1.2 GB"
```

## folderSize

```ts
folderSize(path: string): number | undefined
```

The total size of every file in a folder.

**Returns** `number | undefined`: `undefined` if it doesn't exist.

## hashFile

```ts
hashFile(path: string, options?: { algorithm?: string; encoding?: "base64" | "base64url" | "hex"; } | undefined): string | undefined
```

Hashes a file in chunks, so huge files are fine.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | `string` |  |
| `options?` | `{ algorithm?: string, encoding?: "hex" \| "base64" \| "base64url" }` | Defaults to sha256 in hex. |

**Returns** `string | undefined`: `undefined` if it can't be read.

```js
nc.hashFile("./release.zip");                     // sha256, hex
nc.hashFile("./release.zip", { algorithm: "md5" });
```

## tempFolder

```ts
tempFolder(prefix?: string): string
```

Creates a new, unique folder in the system's temp directory.

| Parameter | Type | Description |
| --- | --- | --- |
| `prefix?` | `string` | Defaults to `"nc-"`. |

```js
const dir = nc.tempFolder("export-");
try { await exportTo(dir); } finally { nc.remove(dir); }
```

## sanitizeFilename

```ts
sanitizeFilename(name: string, options?: { replacement?: string; } | undefined): string
```

Turns any text into a file name that works on Windows, macOS and Linux:
forbidden characters are replaced, reserved names like `CON` are
prefixed, and the length is capped.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `options?` | `{ replacement?: string }` | Defaults to `"_"`. |

```js
nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
nc.sanitizeFilename("CON.txt");                    // "_CON.txt"
```

## watch

```ts
watch(options?: WatchOptions): Watcher | undefined
```

Watches a file or folder for changes.

**Returns** [`Watcher`](#watcher)` | undefined`: `undefined` if the path doesn't exist.

```js
const watcher = nc.watch({ path: "./src", recursive: true, debounce: 100 })
  .on("change", (file) => nc.info(`Changed: ${file}`))
  .on("rename", (file) => nc.info(`Added or removed: ${file}`));
watcher.stop();
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { CopyFileOptions } from "@ix-xs/node-comfort"`.

### CopyFileOptions

Options for `copyFile()` and `moveFile()`.

| Property | Type | Description |
| --- | --- | --- |
| `path` | `string` | Source file. |
| `dest` | `string` | Destination file, or a folder if it ends with `/`. |
| `force?` | `boolean` | Delete the destination first. |

### CopyFilesOptions

Options for `copyFilesIn()` and `moveFilesIn()`.

| Property | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Destination folder. |
| `path?` | `string` | Source folder. Defaults to the working directory. |
| `recursive?` | `boolean` | Include files from nested folders, keeping the tree. Defaults to `true`. |
| `force?` | `boolean` | Delete existing destination files first. |
| `filter?` | `((file: string) => boolean)` | Keep a file when it returns `true`. Gets absolute paths. |

### CopyFolderOptions

Options for `copyFolder()` and `moveFolder()`.

| Property | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Destination folder. |
| `path?` | `string` | Source folder. Defaults to the working directory. |
| `recursive?` | `boolean` | Copy nested folders too. |
| `withFiles?` | `boolean` | Copy files too. `copy()` does all of this in one call. |
| `force?` | `boolean` | Delete an existing destination first. |

### CopyFoldersOptions

Options for `copyFoldersIn()` and `moveFoldersIn()`.

| Property | Type | Description |
| --- | --- | --- |
| `dest` | `string` | Destination folder. |
| `path?` | `string` | Source folder. Defaults to the working directory. |
| `recursive?` | `boolean` | Include nested folders. Defaults to `true`. |
| `withFiles?` | `boolean` | Copy the files in each folder too. |
| `force?` | `boolean` | Delete an existing destination folder first. |
| `filter?` | `((folder: string) => boolean)` | Keep a folder when it returns `true`. Gets absolute paths. |

### CopyOptions

Options for `copy()`.

| Property | Type | Description |
| --- | --- | --- |
| `overwrite?` | `boolean` | Replace existing files. Defaults to `true`. |
| `filter?` | `((source: string, destination: string) => boolean)` | Return `false` to skip a file or folder. |
| `preserveTimestamps?` | `boolean` | Keep modification times. |

### FindOptions

Options for `find()`.

| Property | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | Where to start. Defaults to the working directory. |
| `type?` | `"file" \| "folder" \| "any"` | Defaults to `"file"`. |
| `ignore?` | `string[]` | Folder names to skip. Defaults to `node_modules` and `.git`. |

### GlobOptions

Options for `glob()`.

| Property | Type | Description |
| --- | --- | --- |
| `cwd?` | `string` | Where the pattern starts. Defaults to the working directory. |
| `absolute?` | `boolean` | Return absolute paths. |
| `dot?` | `boolean` | Let `*` and `**` match names starting with a dot. |
| `ignore?` | `string[]` | Patterns to leave out. Defaults to `node_modules` and `.git`. |
| `type?` | `"files" \| "folders" \| "all"` | Defaults to `"files"`. |

### ListOptions

Options for `getFilesIn()` and `getFoldersIn()`.

| Property | Type | Description |
| --- | --- | --- |
| `recursive?` | `boolean` | Go into nested folders. Defaults to `true`. |
| `hidden?` | `boolean` | Include names starting with a dot. Defaults to `true`. |
| `ignore?` | `string[]` | Folder names to skip. Defaults to `["node_modules"]`. |

### ReadJSONOptions

Options for `readJSON()`.

| Property | Type | Description |
| --- | --- | --- |
| `comments?` | `boolean` | Allow comments and trailing commas, like in `tsconfig.json`. |
| `reviver?` | `((key: string, value: any) => any)` | Passed to `JSON.parse`. |

### Watcher

Returned by `watch()`.

| Property | Type | Description |
| --- | --- | --- |
| `on` | `<``E`` extends "change" \| "rename" \| "all" \| "error">(event: ``E``, callback: ``E`` extends "all" ? (event: "rename" \| "change", file: string) => void : ``E`` extends "error" ? (error: ``Error``) => void : (file: string) => void) => `[`Watcher`](#watcher) | Listens for changes. `"all"` also gets the event name. `"error"` tells you the watch broke, for instance because the folder was deleted. |
| `stop` | `() => void` | Stops watching. |
| `pause` | `() => `[`Watcher`](#watcher) | Ignores events until `resume()`. |
| `resume` | `() => `[`Watcher`](#watcher) |  |

### WatchOptions

Options for `watch()`.

| Property | Type | Description |
| --- | --- | --- |
| `path?` | `string` | What to watch. Defaults to the working directory. |
| `recursive?` | `boolean` | Watch nested folders too. |
| `filter?` | `((event: "rename" \| "change", file: string) => boolean)` | Return `false` to ignore an event. |
| `debounce?` | `string \| number` | Merge events on the same file within this long, in ms or like `"100ms"`. Editors often save in several steps. |

### WriteFileOptions

Options for `writeFile()`.

| Property | Type | Description |
| --- | --- | --- |
| `atomic?` | `boolean` | Write to a temporary file and rename it, so nobody reads a half-written file and a crash can't corrupt it. Defaults to `true`. |
| `encoding?` | `BufferEncoding` | Defaults to `"utf8"`. |
| `mode?` | `number` | Permissions, like `0o600` for secrets. A file that already exists keeps the ones it has. |
| `fsync?` | `boolean` | Wait until the data is on the disk before returning. Slower, for files that must survive a power cut. |
| `spaces?` | `number` | Indentation when writing an object as JSON. Defaults to `2`. |

### WriteJSONOptions

Options for `writeJSON()`.

| Property | Type | Description |
| --- | --- | --- |
| `spaces?` | `number` | Defaults to `2`. |
| `atomic?` | `boolean` | Defaults to `true`. |
| `replacer?` | `((key: string, value: unknown) => unknown)` | Passed to `JSON.stringify`. |
| `mode?` | `number` | Permissions, like `0o600` for secrets. A file that already exists keeps the ones it has. |
| `fsync?` | `boolean` | Wait until the data is on the disk before returning. |
