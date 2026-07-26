# @ix-xs/node-comfort

<div align="center">

![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![Github](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)

[![npm version](https://badge.fury.io/js/%40ix-xs%2Fnode-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)
[![Downloads](https://img.shields.io/npm/dm/@ix-xs/node-comfort.svg)](https://www.npmjs.com/package/@ix-xs/node-comfort)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@ix-xs/node-comfort)

</div>

A **zero-dependency** comfort belt for Node.js • the helpers you rewrite in every
project, in one small, well-typed package:

- 🎨 **Logger** • colorful console logging with a tiny markup syntax and levels
- 📁 **FS** • safe filesystem operations, JSON I/O, watching, hashing
- 🧪 **Checker** • 35 runtime type guards (`isEmail`, `isEmpty`, `isPlainObject`, …)
- ⏳ **Utils** • `wait`, `when`, `dontCrash`, JSON helpers
- 🔤 **str** • case conversion, slugs, truncation, templating
- 🔢 **num** • clamp, round, ranges, byte/duration/number formatting
- 📚 **arr** • chunk, groupBy, unique, set operations, shuffle
- 🧩 **obj** • deep clone/merge/equal, dot-path get/set, pick/omit
- 🛠️ **func** • debounce, throttle, memoize, retry, timeout, pipe/compose
- 🕒 **time** • durations, relative time, date math • locale & time-zone aware
- 🆔 **id** • secure UUID / ULID / nanoid / tokens, hashing, constant-time compare
- 🗄️ **SQLite** • a small model + CRUD wrapper over Node's built-in `node:sqlite`

Everything is plain CommonJS with JSDoc, and the package ships full TypeScript
type definitions.

---

## Installation

```bash
npm install @ix-xs/node-comfort
# or
yarn add @ix-xs/node-comfort
# or
pnpm add @ix-xs/node-comfort
```

Requires **Node 20.12+** (uses `node:sqlite`, `process.loadEnvFile`, `structuredClone`).

---

## Quick start

The package exposes a **flat API** for the historical modules (Logger, FS,
Checker, Utils) and **namespaces** for the newer utility collections.

```js
const nc = require("@ix-xs/node-comfort");

// Logger (flat)
nc.log("<% greenBright Success %>");
nc.info("server started");
nc.error(new Error("boom"));

// FS (flat)
nc.writeJSON("./data/config.json", { ready: true });
const cfg = nc.readJSON("./data/config.json", {});

// Checker (flat)
nc.isEmail("john@example.com"); // true
nc.isEmpty([]);                 // true

// Utils (flat)
await nc.wait(500);

// Namespaced collections
nc.str.slugify("Héllo World");        // "hello-world"
nc.num.formatBytes(1536);             // "1.5 KB"
nc.arr.chunk([1, 2, 3, 4], 2);        // [[1, 2], [3, 4]]
nc.obj.get(data, "a.b[0].c", "def");
nc.func.debounce(fn, 200);
nc.time.relative(Date.now() - 3600e3); // "1 hour ago"
nc.id.uuid();

// SQLite (class)
const db = new nc.SQLite("data/app.sqlite");
```

> The flat modules are also available as namespaces if you prefer explicit
> grouping: `nc.logger`, `nc.fs`, `nc.checker`, `nc.utils`.

---

## API at a glance

| Namespace | Highlights |
| --- | --- |
| flat / `logger` | `log` `info` `success` `warn` `error` `debug` `group` `groupEnd` `setTimestamp` `setDelimiter` |
| flat / `fs` | `readFile` `readJSON` `writeJSON` `appendFile` `createFile` `createFolder` `copy*` `move*` `delete*` `getFilesIn` `getFoldersIn` `exists` `stat` `fileSize` `hashFile` `emptyFolder` `watch` `getEnv` |
| flat / `checker` | `isArray` `isNumber` `isInteger` `isString` `isPlainObject` `isPromise` `isEmpty` `isEmail` `isURL` `isUUID` `isJSON` `isNumeric` … (35 total) |
| flat / `utils` | `wait` `when` `dontCrash` `JSONString` `JSONParse` |
| `str` | `capitalize` `camelCase` `snakeCase` `kebabCase` `slugify` `truncate` `template` `escapeHTML` `words` … |
| `num` | `clamp` `round` `range` `sum` `average` `median` `formatBytes` `abbreviate` `thousands` `ordinal` `percent` … |
| `arr` | `chunk` `unique` `groupBy` `keyBy` `partition` `sortBy` `difference` `intersection` `union` `zip` `shuffle` `sample` … |
| `obj` | `clone` `merge` `equal` `get` `set` `has` `pick` `omit` `mapValues` `flatten` `unflatten` `deepFreeze` … |
| `func` | `debounce` `throttle` `once` `memoize` `retry` `timeout` `pipe` `compose` `curry` `promisify` `attempt` … |
| `time` | `parseDuration` `formatDuration` `relative` `format` `add` `subtract` `diff` `startOf` `isSameDay` `stopwatch` `setLocale` `setTimezone` … (i18n + time-zone aware) |
| `id` | `uuid` `ulid` `nano` `token` `code` `hash` `hmac` `safeEqual` `seq` |
| `SQLite` | `createTable` `insert` `update` `upsert` `get` `getAll` `delete` `count` `transaction` `createIndex` … |

---

## Logger

Colorized console logger with a minimal markup syntax, optional timestamps,
groups, and level helpers.

Wrap styles in delimiters (default `<%` … `%>`):

- **styles**: `bold`, `italic`, `underline`, `overline`
- **colors**: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `black`
- **bright**: `redBright`, `greenBright`, … `whiteBright`
- **background**: `bgRed`, `bgBlue`, …
- **RGB**: `rgb(255, 0, 0)`

```js
nc.log("Plain log");
nc.log("<% green Success %>");
nc.log("<% red bold Error:%> something went wrong");
nc.log("<% bgBlue white INFO %> message");
nc.log("<% rgb(255,128,0) Orange text %>");
```

### Level helpers

```js
nc.info("Loading configuration…");   // ℹ INFO
nc.success("Database connected");     // ✔ OK
nc.warn("Cache miss");                // ⚠ WARN
nc.error(new Error("Boom"));          // ✖ ERROR  (prints the stack)
nc.debug({ requestId: 42 });          // ● DEBUG  (only when DEBUG/NODE_DEBUG is set)
```

### Timestamp, delimiters & groups

```js
nc.setTimestamp(false);
nc.setDelimiter({ open: "{{", close: "}}" });
nc.log("{{red Hello}} world");

nc.group("Startup");
nc.log("Loading config…");
nc.group("DB");
nc.log("Connecting…");
nc.groupEnd(); // end "DB"
nc.groupEnd(); // end "Startup"
```

---

## FS

File-system helper with safe path resolution, recursive walking, copy/move
helpers, JSON I/O, hashing and a small watcher. Relative paths (`./`, `../`) are
resolved from the **caller file**, which is handy inside libraries.

```js
// Paths
const p = nc.createPath("./config/app.json"); // absolute, even if missing
const folder = nc.getFolder("./src");
const file = nc.getFile("package.json");

// Create
nc.createFolder("./dist");
nc.createFile("./dist/info.txt", false, "hello");

// JSON I/O
nc.writeJSON("./dist/data.json", { ok: true });          // pretty, 2 spaces
const data = nc.readJSON("./dist/data.json", {});         // fallback on error

// Append / read
nc.appendFile("./logs/app.log", "started\n");
const content = nc.readFile("./README.md");

// Inspect
nc.exists("./dist");                 // true
nc.fileSize("./dist/data.json");     // bytes
nc.stat("./dist/data.json");         // fs.Stats
nc.hashFile("./dist/data.json");     // sha256 hex

// List & delete
const files = nc.getFilesIn("./src", true);
nc.deleteFilesIn("./logs", false, (f) => f.endsWith(".log"));
nc.emptyFolder("./tmp");             // keep the folder, clear its contents
```

### Copy & move

```js
nc.copyFolder({ path: "./templates", dest: "./dist/templates", recursive: true, withFiles: true, force: true });
nc.copyFilesIn({ path: "./src", dest: "./dist", recursive: true, filter: (f) => f.endsWith(".js") });
nc.copyFile({ path: "./src/index.js", dest: "./dist", force: true });

nc.moveFolder({ path: "./build", dest: "./dist", recursive: true, withFiles: true, force: true });
nc.moveFile({ path: "./logs/app.log", dest: "./logs/archive/app.log", force: true });
```

### Watch

```js
const watcher = nc.watch({ path: "./src", recursive: true, filter: (event, file) => file.endsWith(".js") });

watcher
  .on("change", (file) => nc.log(`<% cyan changed %> ${file}`))
  .on("rename", (file) => nc.log(`<% yellow renamed %> ${file}`));

watcher.pause();
watcher.resume();
watcher.stop();
```

---

## Checker

35 runtime type guards. Each is a boolean function that accepts any input.

```js
// Primitives & core
nc.isArray([1, 2]);          nc.isNumber(42);        nc.isInteger(4);
nc.isFloat(4.2);             nc.isString("x");       nc.isBoolean(false);
nc.isBigInt(10n);            nc.isSymbol(Symbol());   nc.isFunction(() => {});
nc.isAsyncFunction(async () => {});

// Nullish & primitiveness
nc.isNull(null);   nc.isUndefined(undefined);   nc.isNil(null);   nc.isPrimitive(1);

// Objects & structures
nc.isObject({});             nc.isPlainObject({});    nc.isPromise(Promise.resolve());
nc.isRegExp(/a/);            nc.isDate(new Date());   nc.isValidDate(new Date());
nc.isMap(new Map());        nc.isSet(new Set());     nc.isIterable([1]);
nc.isBuffer(Buffer.from("")); nc.isTypedArray(new Uint8Array()); nc.isError(new Error());

// Emptiness & formats
nc.isEmpty("");   nc.isEmpty([]);   nc.isEmpty({});   nc.isEmpty(new Map());
nc.isEmail("john@example.com");     nc.isURL("https://x.com");
nc.isUUID("123e4567-e89b-12d3-a456-426614174000");
nc.isJSON('{"a":1}');               nc.isNumeric("42");
```

---

## Utils

Async & process helpers.

```js
// wait
await nc.wait(500);

// when • poll a predicate and emit events
nc.when(() => Math.random() > 0.8, { label: "Lucky" }, { interval: 200, max: 3, timeout: 5000 })
  .on("trigger", (p) => nc.log(`<% green ${p.label} %>`))
  .on("timeout", () => nc.log("<% red Timeout %>"))
  .start();

// dontCrash • process-level safety nets
nc.dontCrash()
  .on("error", (err) => console.error("Global error:", err))
  .on("sig", (signal) => { nc.warn(`Caught ${signal}`); process.exit(0); });

// JSON
const json = nc.JSONString({ hello: "world" }); // 4-space pretty print
const value = nc.JSONParse(json);
```

---

## str • string utilities

```js
nc.str.capitalize("hELLO");            // "Hello"
nc.str.titleCase("the quick fox");     // "The Quick Fox"
nc.str.camelCase("foo-bar_baz");       // "fooBarBaz"
nc.str.pascalCase("foo bar");          // "FooBar"
nc.str.snakeCase("helloWorld");        // "hello_world"
nc.str.kebabCase("helloWorld");        // "hello-world"
nc.str.constantCase("helloWorld");     // "HELLO_WORLD"

nc.str.slugify("Héllo, World!");       // "hello-world"
nc.str.truncate("Hello world", 8);     // "Hello w…"
nc.str.center("hi", 6, "*");           // "**hi**"
nc.str.reverse("abc");                 // "cba"  (emoji-safe)
nc.str.squish("  a   b  ");            // "a b"
nc.str.stripTags("<b>Hi</b>");         // "Hi"
nc.str.escapeHTML('<a>&"');            // "&lt;a&gt;&amp;&quot;"
nc.str.escapeRegExp("a.b");            // "a\\.b"
nc.str.count("banana", "a");           // 3
nc.str.ensurePrefix("a.com", "https://"); // "https://a.com"
nc.str.template("Hi {name} ({user.role})", { name: "Jo", user: { role: "admin" } });
// "Hi Jo (admin)"
nc.str.words("helloWorld-foo");        // ["hello", "World", "foo"]
nc.str.length("😀");                    // 1
```

---

## num • number & math utilities

```js
nc.num.clamp(15, 0, 10);               // 10
nc.num.round(1.005, 2);                // 1.01
nc.num.inRange(5, 0, 10);              // true
nc.num.lerp(0, 100, 0.5);              // 50
nc.num.mapRange(5, 0, 10, 0, 100);     // 50
nc.num.randomInt(1, 6);                // dice roll

nc.num.range(4);                       // [0, 1, 2, 3]
nc.num.range(0, 10, 2);                // [0, 2, 4, 6, 8]
nc.num.range(5, 0);                    // [5, 4, 3, 2, 1]

nc.num.sum([1, 2, 3]);                 // 6
nc.num.average([2, 4]);                // 3
nc.num.median([3, 1, 2]);              // 2
nc.num.percent(25, 200);               // 12.5

nc.num.formatBytes(1536);              // "1.5 KB"
nc.num.formatBytes(1024, { iec: true }); // "1 KiB"
nc.num.abbreviate(2_400_000);          // "2.4M"
nc.num.thousands(1234567);             // "1,234,567"
nc.num.ordinal(22);                    // "22nd"
nc.num.parse("42px");                  // 42
```

---

## arr • array utilities

All methods are pure (they never mutate their input). Many accept an
`iteratee`: a property key (string) or a function.

```js
nc.arr.chunk([1, 2, 3, 4, 5], 2);      // [[1, 2], [3, 4], [5]]
nc.arr.unique([1, 1, 2]);              // [1, 2]
nc.arr.unique(users, "id");            // de-dupe by id
nc.arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"));
nc.arr.keyBy(users, "id");
nc.arr.partition([1, 2, 3, 4], (n) => n % 2 === 0); // [[2, 4], [1, 3]]
nc.arr.countBy(["a", "b", "a"]);       // { a: 2, b: 1 }

nc.arr.sortBy(users, "age");
nc.arr.sortBy(users, ["age", "name"], "desc");
nc.arr.sumBy(items, "price");
nc.arr.maxBy(items, "score");

nc.arr.difference([1, 2, 3, 4], [2, 4]); // [1, 3]
nc.arr.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
nc.arr.union([1, 2], [2, 3]);          // [1, 2, 3]
nc.arr.zip(["a", "b"], [1, 2]);        // [["a", 1], ["b", 2]]

nc.arr.compact([0, 1, false, 2, ""]);  // [1, 2]
nc.arr.flatten([1, [2, [3]]], Infinity); // [1, 2, 3]
nc.arr.shuffle([1, 2, 3]);             // random order
nc.arr.sample([1, 2, 3]);              // random element
nc.arr.sampleSize([1, 2, 3, 4], 2);    // 2 random elements
nc.arr.first([1, 2, 3], 2);            // [1, 2]
nc.arr.last([1, 2, 3]);                // 3
nc.arr.move([1, 2, 3], 0, 2);          // [2, 3, 1]
nc.arr.times(3, (i) => i * 2);         // [0, 2, 4]
```

---

## obj • object utilities

Pure, dot-path-aware helpers. `get`/`set`/`has` accept `"a.b[0].c"` paths.

```js
nc.obj.clone({ a: { b: 1 } });         // deep clone (structuredClone + fallback)
nc.obj.merge({ a: { x: 1 } }, { a: { y: 2 } }); // { a: { x: 1, y: 2 } }
nc.obj.equal({ a: [1, 2] }, { a: [1, 2] });     // true (deep)

nc.obj.get(data, "a.b[0].c", "default");
nc.obj.set({}, "a.b.c", 1);            // { a: { b: { c: 1 } } }  (returns a clone)
nc.obj.has({ a: { b: 1 } }, "a.b");    // true

nc.obj.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
nc.obj.omit({ a: 1, b: 2 }, ["b"]);            // { a: 1 }
nc.obj.filter({ a: 1, b: 2 }, (v) => v > 1);   // { b: 2 }
nc.obj.mapValues({ a: 1 }, (v) => v * 10);     // { a: 10 }
nc.obj.mapKeys({ a: 1 }, (k) => k.toUpperCase()); // { A: 1 }
nc.obj.invert({ a: "x" });             // { x: "a" }
nc.obj.compact({ a: 1, b: null });     // { a: 1 }

nc.obj.flatten({ a: { b: { c: 1 } } });  // { "a.b.c": 1 }
nc.obj.unflatten({ "a.b.c": 1 });        // { a: { b: { c: 1 } } }
nc.obj.deepFreeze(config);               // recursively immutable
```

---

## func • function & control-flow utilities

```js
// Rate limiting
const onResize = nc.func.debounce(() => render(), 200);
const onScroll = nc.func.throttle(() => update(), 100);
onResize.cancel(); onResize.flush();

// Caching & single-call
const init = nc.func.once(() => setup());
const fib = nc.func.memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));

// Resilience
const data = await nc.func.retry(() => fetchThing(), {
  attempts: 5, delay: 200, backoff: 2, // 200, 400, 800…
});
const res = await nc.func.timeout(fetchThing(), 5000, "too slow");

// Go-style error handling • no try/catch
const [err, user] = await nc.func.attempt(() => getUser(id))();

// Composition
const clean = nc.func.pipe((s) => s.trim(), (s) => s.toUpperCase());
const add = nc.func.curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6

// Interop
const readFile = nc.func.promisify(require("fs").readFile);
```

---

## time • date & time utilities

No heavyweight date library required.

```js
nc.time.parseDuration("1h30m");        // 5400000
nc.time.parseDuration("2 days");       // 172800000
nc.time.formatDuration(5_400_000);     // "1h 30m"
nc.time.formatDuration(90_000, { long: true }); // "1 minute 30 seconds"

nc.time.relative(Date.now() - 3600e3); // "1 hour ago"
nc.time.relative(Date.now() + 86400e3); // "in 1 day"

nc.time.format(new Date(), "YYYY-MM-DD HH:mm:ss");
nc.time.add(new Date(), "2h");
nc.time.subtract(new Date(), 1, "d");
nc.time.diff("2024-01-03", "2024-01-01", "d"); // 2
nc.time.startOf(new Date(), "day");
nc.time.isSameDay(a, b);
nc.time.unix();                        // seconds since epoch

const sw = nc.time.stopwatch();
doWork();
sw.stop();      // 12.34 (ms, sub-ms precise)
sw.stop(true);  // "12.34ms"
```

### Language & time zone

`relative`, `formatDuration` and `format` are **locale-aware** and built on the
platform's native `Intl` (Node ships with full ICU), so **every language works
out of the box** • no locale files, no dependencies. The default locale is
`"en"` for deterministic output.

Set a global default (chainable), or override per call:

```js
// Global defaults
nc.time.setLocale("fr").setTimezone("Europe/Paris");
nc.time.getConfig(); // { locale: "fr", timeZone: "Europe/Paris" }

// …or per call via options
nc.time.relative(Date.now() - 3600e3, undefined, { locale: "fr" });      // "il y a 1 heure"
nc.time.relative(Date.now() - 86400e3, undefined, { numeric: "auto" });  // "yesterday"
nc.time.formatDuration(90_000, { long: true, locale: "de" });            // "1 Minute 30 Sekunden"

// Localized date formatting
nc.time.format(Date.now(), "dddd D MMMM YYYY", { locale: "fr" });        // "lundi 15 janvier 2024"
nc.time.format(Date.now(), "h:mm A");                                    // "2:30 PM"

// Time-zone aware (IANA names)
nc.time.format(utcDate, "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
nc.time.isSameDay(a, b, { timeZone: "America/New_York" });
```

**`format` tokens** • numeric: `YYYY` `YY` `MM` `M` `DD` `D` `HH` `H` (24h)
`hh` `h` (12h) `mm` `m` `ss` `s` `SSS`; localized: `MMMM` `MMM` (month),
`dddd` `ddd` (weekday), `A` `a` (AM/PM). Wrap literal text in square brackets:
`format(d, "[Updated on] dddd")`.

---

## id • id, token & hashing utilities

Cryptographically secure, built on Node's native `node:crypto`.

```js
nc.id.uuid();                          // UUID v4
nc.id.ulid();                          // sortable, timestamp-prefixed id
nc.id.nano();                          // URL-safe nanoid (21 chars)
nc.id.nano(10);                        // custom length

nc.id.token();                         // 32-byte hex token
nc.id.token(16, "base64url");          // URL-safe base64
nc.id.token(16, "base58");             // Base58 (Bitcoin alphabet)
nc.id.code();                          // "K7QF9X"  (unambiguous, human-friendly)

nc.id.hash("hello");                   // sha256 hex
nc.id.hash("hello", { algorithm: "md5" });
nc.id.hmac("payload", "secret");       // HMAC-SHA256

nc.id.safeEqual(provided, expected);   // constant-time comparison
nc.id.seq("user");                     // "user-1", "user-2", …
```

> **Tip:** ULIDs sort by creation time, making them a great primary-key
> alternative to UUIDs. Use `nc.id.safeEqual` whenever you compare secrets,
> tokens or signatures to avoid timing attacks.

---

## SQLite

Thin wrapper over the built-in `node:sqlite` `DatabaseSync`, with a small model
system and CRUD helpers. Identifiers are validated and values are bound with
`?` placeholders. WAL mode and foreign keys are enabled automatically.

```js
const db = new nc.SQLite("data/app.sqlite"); // folder created if needed
// const db = new nc.SQLite(":memory:");     // transient in-memory DB

await db.createTable({
  name: "users",
  columns: {
    id:        { type: "INTEGER", primaryKey: true, autoincrement: true },
    name:      { type: "TEXT", notNull: true },
    role:      { type: "TEXT", values: ["admin", "user"], defaultValue: "user" },
    createdAt: { type: "INTEGER", notNull: true },
  },
  indexes: [{ columns: ["role"] }],
});

await db.insert("users", { name: "John", role: "admin", createdAt: Date.now() });
await db.update("users", { role: "user" }, { name: "John" });
await db.upsert("users", { id: 1, role: "admin" }, ["id"]);

const user  = await db.get("users", { name: "John" });
const admins = await db.getAll("users", { role: "admin" }, { limit: 100, orderBy: "createdAt", direction: "DESC" });

await db.delete("users", { role: "user" });
await db.count("users", { role: "admin" });
await db.clearTable("users");
```

### Constraints & indexes

```js
await db.createTable({
  name: "UserAuthMethod",
  columns: {
    id:             { type: "INTEGER", primaryKey: true, autoincrement: true },
    userId:         { type: "INTEGER", notNull: true },
    provider:       { type: "TEXT", notNull: true },
    providerUserId: { type: "TEXT", notNull: true },
  },
  constraints: [
    { type: "unique", columns: ["provider", "providerUserId"] },
    { type: "foreignKey", columns: ["userId"], references: { table: "users", columns: ["id"] }, onDelete: "CASCADE" },
  ],
});

await db.createIndex("UserAuthMethod", { columns: ["provider", "providerUserId"], unique: true });
```

### Transactions & raw SQL

```js
await db.transaction(async () => {
  await db.insert("users", { name: "A", createdAt: Date.now() });
  await db.insert("profiles", { userId: 1, nickname: "A" });
  return { ok: true }; // throw to roll back
});

await db.exec("CREATE INDEX IF NOT EXISTS idx_name ON users (name)");
const one = await db.queryOne("SELECT * FROM users WHERE id = ?", [1]);
const many = await db.queryAll("SELECT * FROM users WHERE role = ?", ["admin"]);

db.close();
```

---

## TypeScript

The package ships generated `.d.ts` files, so everything is fully typed out of
the box • no `@types` package needed.

```ts
import nc from "@ix-xs/node-comfort";
// or: import * as nc from "@ix-xs/node-comfort";

const id: string = nc.id.uuid();
const size: string = nc.num.formatBytes(2048);
```

---

## Contributing

Issues and PRs are welcome at
[github.com/ix-xs/node-comfort](https://github.com/ix-xs/node-comfort).

```bash
npm run build   # regenerate the type definitions (tsc)
```

---

## License

[MIT](./LICENSE) © ix-xs
