# @ix-xs/node-comfort


<div align="center">


![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![Github](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)


[![npm version](https://badge.fury.io/js/%40ix-xs%2Fnode-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)
[![Downloads](https://img.shields.io/npm/dm/@ix-xs/node-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)


</div>


Small collection of Node.js utilities I use across projects: a logger, a file-system helper, a SQLite wrapper, a runtime type checker, and a few async/process helpers.


Everything is plain CommonJS with JSDoc. The package ships with type information for TypeScript and modern editors.


---


## Installation


```bash
npm install @ix-xs/node-comfort
# or
yarn add @ix-xs/node-comfort
# or
pnpm add @ix-xs/node-comfort
```


Requires Node 20+ (uses `node:sqlite` and `process.loadEnvFile`).


---


## Import and global usage


The package exposes a **flat API**: all utilities are directly on the `nodeComfort` object.


```js
const nodeComfort = require("@ix-xs/node-comfort");


// Logger
nodeComfort.log("Hello");
nodeComfort.log("<% greenBright Success %>");


// FS
const files = nodeComfort.getFilesIn(".", true);
nodeComfort.createFolder("./dist");


// Checker
if (nodeComfort.isArray(files)) {
  nodeComfort.log(`<% cyan Found ${files.length} files %>`);
}


// Utils
await nodeComfort.wait(500);
nodeComfort.dontCrash();


// SQLite
const db = new nodeComfort.SQLite();
await db.createTable({
  name: "users",
  columns: {
    id:   { type: "INTEGER", primaryKey: true, autoincrement: true },
    name: { type: "TEXT", notNull: true },
  },
});
```


---


## Logger


Colorized console logger with a minimal markup syntax and optional timestamps.


You wrap styles in delimiters (by default `<%` and `%>`):


- styles: `bold`, `italic`, `underline`, `overline`
- colors: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `black`
- bright: `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright`
- background: `bgRed`, `bgBlue`, etc.
- RGB: `rgb(255, 0, 0)`


### Basic usage


```js
nodeComfort.log("Plain log");
nodeComfort.log("<% green Success %>");
nodeComfort.log("<% red bold Error:%> something went wrong");
nodeComfort.log("<% bgBlue white INFO %> message");
```


Multi-line strings keep indentation and timestamps readable:


```js
nodeComfort.log(`
<% yellow Multi-line %>
This is line 2
This is line 3
`);
```


### Timestamp and delimiters


```js
// Disable timestamps
nodeComfort.setTimestamp(false);


// Change delimiters if "<%" conflicts with other template syntax
nodeComfort.setDelimiter({ open: "{{", close: "}}" });
nodeComfort.log("{{red Hello}} world");
```


### Groups


Groups add indentation to related logs.


```js
nodeComfort.group("Startup");


nodeComfort.log("Loading config…");
nodeComfort.log("<% green OK %>");


nodeComfort.group("DB");
nodeComfort.log("Connecting…");
// ...
nodeComfort.groupEnd(); // end "DB"


nodeComfort.groupEnd(); // end "Startup"
```


---


## FS


File-system helper with safe path resolution, recursive walking, copy/move helpers, and a small watcher abstraction.


It resolves relative paths from the **caller file**, not just from `process.cwd()`, which makes it nicer inside libraries.


### Path helpers


```js
// Absolute path, even if it doesn't exist yet
const configPath = nodeComfort.createPath("./config/app.json");


// Existing folder/file or undefined
const folder = nodeComfort.getFolder("./src");
const file = nodeComfort.getFile("package.json");
```


### Create folders and files


```js
// Folders
nodeComfort.createFolder("./dist");        // true if created
nodeComfort.createFolder("./dist", true);  // force recreate


// Files
nodeComfort.createFile("./dist/info.txt", false, "hello");
nodeComfort.createFile("./dist/data.json", true, { ok: true });
```


### List and delete


```js
// Folders inside a path
const dirs = nodeComfort.getFoldersIn("./src", true);


// Delete folders matching a filter
nodeComfort.deleteFoldersIn("./tmp", (folder) =>
  folder.endsWith(".cache"),
);


// Files
const files = nodeComfort.getFilesIn("./src", true);


// Delete files matching a filter
nodeComfort.deleteFilesIn("./logs", false, (file) =>
  file.endsWith(".log"),
);
```


### Copy


```js
// Copy one folder
nodeComfort.copyFolder({
  path: "./templates",
  dest: "./dist/templates",
  recursive: true,
  withFiles: true,
  force: true,
});


// Copy only some folders in a tree
nodeComfort.copyFoldersIn({
  path: "./src",
  dest: "./dist",
  recursive: true,
  withFiles: false,
  filter: (folder) => folder.endsWith("components"),
});


// Copy files
nodeComfort.copyFilesIn({
  path: "./src",
  dest: "./dist",
  recursive: true,
  force: true,
  filter: (file) => file.endsWith(".js"),
});


// Copy a single file
nodeComfort.copyFile({
  path: "./src/index.js",
  dest: "./dist", // or "./dist/index.js"
  force: true,
});
```


### Move


Move helpers are basically copy + delete.


```js
// Move a folder tree
nodeComfort.moveFolder({
  path: "./build",
  dest: "./dist",
  recursive: true,
  withFiles: true,
  force: true,
});


// Move some folders under a path
nodeComfort.moveFoldersIn({
  path: "./tmp",
  dest: "./archive",
  recursive: true,
  withFiles: false,
  filter: (folder) => folder.includes("session"),
});


// Move files
nodeComfort.moveFilesIn({
  path: "./logs",
  dest: "./logs/archive",
  recursive: false,
  force: true,
  filter: (file) => file.endsWith(".log"),
});


// Move a single file
nodeComfort.moveFile({
  path: "./logs/app.log",
  dest: "./logs/archive/app.log",
  force: true,
});
```


### Read and watch


```js
// Read a UTF-8 file
const content = nodeComfort.readFile("./README.md");


// Watch a directory
const watcher = nodeComfort.watch({
  path: "./src",
  recursive: true,
  filter: (event, file) => file.endsWith(".js"),
});


watcher
  .on("change", (file) => {
    nodeComfort.log(`<% cyan File changed: %> ${file}`);
  })
  .on("rename", (file) => {
    nodeComfort.log(`<% yellow File renamed: %> ${file}`);
  });
```


You can pause, resume and stop watching:


```js
watcher.pause();
// ...
watcher.resume();
// ...
watcher.stop();
```


---


## Checker


Runtime type-checking helpers. Everything is just a boolean guard that works on any input.


```js
nodeComfort.isArray();        // true[1][2]
nodeComfort.isArray("nope");        // false


nodeComfort.isNumber(42);           // true
nodeComfort.isNumber(NaN);          // false


nodeComfort.isFunction(() => {});   // true
nodeComfort.isFunction(class {});   // true


nodeComfort.isObject({});           // true
nodeComfort.isObject([]);           // true
nodeComfort.isObject(null);         // false


nodeComfort.isBoolean(false);       // true
nodeComfort.isString("hello");      // true
nodeComfort.isUndefined(undefined); // true
nodeComfort.isNull(null);           // true


nodeComfort.isDate(new Date());     // true
nodeComfort.isMap(new Map());       // true
nodeComfort.isSet(new Set());       // true


nodeComfort.isError(new Error("x")); // true
nodeComfort.isError({ message: "x" }); // false
```


---


## Utils


Small async and process helpers.


### wait(ms)


```js
await nodeComfort.wait(500);
// code here runs after ~500ms
```


### when(predicate, payload?, options?)


Polling helper that emits events until a condition is met.


```js
const task = nodeComfort.when(
  () => Math.random() > 0.8,
  { label: "Lucky" },
  { interval: 200, max: 3, timeout: 5000 },
);


task
  .on("trigger", (payload) => {
    nodeComfort.log(`<% green Triggered: %> ${payload.label}`);
  })
  .on("timeout", () => {
    nodeComfort.log("<% red Timeout %>");
  })
  .on("error", (err) => {
    nodeComfort.log(`<% red Error in predicate %>\n${err}`);
  })
  .start();
```


- `predicate`: boolean, promise, or function (sync/async) returning a boolean.  
- `payload`: value passed to listeners on `trigger` / `timeout`.  
- `options`:
  - `interval` (ms, default `50`)
  - `timeout` (ms or `null`)
  - `max` (number of triggers or `null` for infinite)


### dontCrash()


Installs process-level safety nets for errors, exits and signals.


```js
nodeComfort.dontCrash();


// Or customize:
nodeComfort.dontCrash()
  .on("error", (err) => {
    console.error("Global error:", err);
    process.exit(1);
  })
  .on("exit", (code) => {
    nodeComfort.log(`<% gray Process exited with code ${code} %>`);
  })
  .on("sig", (signal) => {
    nodeComfort.log(`<% yellow Caught signal ${signal}, exiting… %>`);
    process.exit(0);
  });
```


Events:


- `"error"` – uncaught exceptions + unhandled rejections  
- `"exit"` – `process.on("exit")`  
- `"sig"` – `SIGINT`, `SIGTERM`, `SIGQUIT`  
- `"beforeExit"` – `process.on("beforeExit")`


### JSON helpers


```js
const json = nodeComfort.JSONString({ hello: "world" });
// pretty-printed with 4 spaces


const data = nodeComfort.JSONParse(json);
```


---


## SQLite


Thin wrapper over the built-in `node:sqlite` `DatabaseSync` with a small "model" system and CRUD-style helpers.


### Creating an instance


```js
// Default: ./db.sqlite (relative to cwd)
const db = new nodeComfort.SQLite();


// Custom path (folder created if needed)
const db2 = new nodeComfort.SQLite("data/app.sqlite");
```


The constructor ensures the parent folder exists, and enables WAL journal mode and foreign keys by default.


### Defining a table


```js
await db.createTable({
  name: "users",
  columns: {
    id: {
      type: "INTEGER",
      primaryKey: true,
      autoincrement: true,
    },
    name: {
      type: "TEXT",
      notNull: true,
    },
    role: {
      type: "TEXT",
      values: ["admin", "user"],
      defaultValue: "user",
    },
    createdAt: {
      type: "TEXT",
      defaultValue: new Date().toISOString(),
    },
  },
});
```


Models are kept in memory and used for defaults like ordering.


The `columns` property is the new, recommended way. The legacy `options` property is still supported for backward compatibility.


### Insert / update / upsert


```js
// Insert a new row
await db.insert("users", { name: "John" });


// Update rows matching a where clause
await db.update("users", { role: "admin" }, { name: "John" });


// Upsert (INSERT with ON CONFLICT DO UPDATE)
await db.upsert("users", { id: 1, role: "user" }, ["id"]);
```


When `where` or `data.id` is provided, `set` (legacy helper):


1. loads the existing row if it exists,  
2. merges it with `data`,  
3. inserts or updates depending on whether the row exists.


```js
// Insert
await db.set("users", { name: "John" });


// Upsert by id
await db.set("users", { id: 1, role: "admin" });


// Upsert with custom where
await db.set("users", { role: "user" }, { name: "John" });
```


### Get / list


```js
// One row or undefined
const user = await db.get("users", { name: "John" });


// Multiple rows with pagination and ordering
const admins = await db.getAll(
  "users",
  { role: "admin" }, // where
  {
    limit: 100,
    offset: 0,
    orderBy: "createdAt",
    direction: "DESC",
  },
);
```


If the table is not registered, `getAll` returns an empty array.


### Delete / clear / count


```js
// Delete rows
const res = await db.delete("users", { role: "user" });
// res.ok, res.changes


// Delete all rows
await db.clearTable("users");


// Count rows
const totalUsers = await db.count("users");
const adminCount = await db.count("users", { role: "admin" });
```


### Indexes and constraints


```js
// Create a composite unique index
await db.createIndex("UserAuthMethod", {
  columns: ["provider", "providerUserId"],
  unique: true,
});


// Create a non-unique index
await db.createIndex("Post", {
  columns: ["userId"],
});
```


```js
// Table-level constraints
await db.createTable({
  name: "UserAuthMethod",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    userId: { type: "INTEGER", notNull: true },
    provider: { type: "TEXT", notNull: true },
    providerUserId: { type: "TEXT", notNull: true },
  },
  constraints: [
    {
      type: "unique",
      columns: ["provider", "providerUserId"],
    },
    {
      type: "foreignKey",
      columns: ["userId"],
      references: { table: "User", columns: ["id"] },
      onDelete: "CASCADE",
    },
  ],
});
```


### Transactions


```js
const result = await db.transaction(async () => {
  await db.insert("User", {
    email: "a@b.com",
    createdAt: Date.now(),
  });
  await db.insert("Profile", {
    userId: 1,
    nickname: "John",
  });
  return { ok: true };
});
```


If the callback throws, the transaction is rolled back.


### Raw SQL helpers


```js
// Execute a write statement (INSERT/UPDATE/DELETE/CREATE/PRAGMA)
await db.exec("CREATE INDEX IF NOT EXISTS idx_email ON users (email)");


// Execute a query and get one row
const user = await db.queryOne("SELECT * FROM users WHERE id = ?", );[1]


// Execute a query and get all rows
const users = await db.queryAll("SELECT * FROM users WHERE role = ?", ["admin"]);
```


### Drop and close


```js
await db.deleteTable("users");
db.close();
```


---


## License


MIT.
