# Files and folders

`nc.fs` covers the file work of everyday scripts and servers: reading and writing text and JSON, copying, moving, listing, watching. Its functions are also available at the top level (`nc.readJSON()`).

```js
const settings = nc.readJSON("./settings.json", { theme: "light" });
nc.writeJSON("./settings.json", { ...settings, theme: "dark" });
```

## No try/catch for everyday cases

Missing files and failed operations don't throw. Read functions return `undefined` (or the fallback you pass), and write functions return `false`:

```js
const text = nc.readFile("./notes.txt");            // undefined if it's missing
const config = nc.readJSON("./config.json", {});    // {} if missing or invalid
if (!nc.writeFile("/root/x", "data")) nc.warn("Could not write");
```

The few functions that must succeed, like `ensureFolder()`, say so and throw.

## Paths

- Absolute paths are used as they are.
- Paths starting with `./` or `../` start from **the file that calls the function**. A script reading `./data.json` finds the file next to it, wherever you run it from.
- Other relative paths, like `logs/app.log`, start from the working directory, as with Node's `fs`.

`nc.createPath("./x")` shows you the absolute path a function would use.

## Writing safely

`writeFile()` and `writeJSON()` write to a temporary file and rename it. Someone reading the file never sees half of it, and a crash in the middle can't corrupt it. Missing folders are created.

```js
nc.writeFile("./dist/index.html", html);
nc.writeFile("./.secrets/token", token, { mode: 0o600 });
nc.writeJSON("./data/users.json", users, { spaces: 2 });
nc.appendFile("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
```

`readJSON()` can read files with comments and trailing commas, like `tsconfig.json`:

```js
const tsconfig = nc.readJSON("./tsconfig.json", {}, { comments: true });
```

## Finding files

```js
nc.glob("src/**/*.{js,ts}");                         // ["src/index.js", "src/lib/a.ts"]
nc.glob("**/*.test.js", { ignore: ["**/fixtures/**"] });
nc.glob("packages/*", { type: "folders", absolute: true });

nc.find("package.json");                             // the closest one, searching down
nc.getFilesIn("./src");                              // every file, absolute paths
nc.readLines("./urls.txt");                          // ["https://a.com", "https://b.com"]
```

Globs understand `*`, `**`, `?`, `[abc]` and `{a,b}`. `node_modules` and `.git` are skipped unless you say otherwise. Patterns are relative to the working directory, or to `cwd`; a pattern that starts from the root of the disk searches there and returns absolute paths:

```js
nc.glob(`${nc.tempFolder("build-")}/**/*.json`);
nc.glob("/var/log/**/*.log");
```

## Copying, moving, deleting

```js
nc.copy("./templates", "./dist/templates");            // files or whole folders
nc.copy("./.env.example", "./.env", { overwrite: false });
nc.move("./report.pdf", "./archive/2026/report.pdf");  // works across drives
nc.remove("./dist");                                    // file or folder
nc.emptyFolder("./tmp");
```

## Checking and measuring

```js
nc.exists("./.env");
nc.isFile("./a.txt"); nc.isFolder("./src");
nc.fileSize("./backup.zip");         // bytes
nc.folderSize("./node_modules");
nc.hashFile("./release.zip");        // sha256, read in chunks
nc.stat("./video.mp4")?.mtime;
```

## Watching

```js
nc.watch({ path: "./src", recursive: true, debounce: 100 })
  .on("change", (file) => rebuild(file))
  .on("rename", (file) => nc.info(`Added or removed: ${file}`));
```

`debounce` merges the bursts of events editors produce when they save.

## Odds and ends

```js
const dir = nc.tempFolder("export-");                     // a fresh folder in the temp directory
nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf');         // "Report_ Q1_Q2 _final__.pdf"
nc.ensureFolder("./storage/uploads");
nc.touch("./.last-run");
```

`sanitizeFilename()` produces names that work on Windows, macOS and Linux: forbidden characters are replaced and reserved names like `CON` are prefixed.

The 1.x helpers (`getFile`, `getFolder`, `createFile`, `deleteFolder`, `copyFilesIn`, `moveFile` and the rest) are still here, with the same behavior.
