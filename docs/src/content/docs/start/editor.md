---
title: "Your editor"
description: "The imports in CommonJS, ES modules and TypeScript, the entry point of each namespace, and the types that editors read in JavaScript as in TypeScript."
---

## Imports

```js
// CommonJS
const nc = require("@ix-xs/node-comfort");
const { logger, fs, str } = require("@ix-xs/node-comfort");
```

```js
// ES modules
import nc from "@ix-xs/node-comfort";
import { logger, fs, str } from "@ix-xs/node-comfort";
```

```ts
// TypeScript
import nc = require("@ix-xs/node-comfort");
import { schema as s, type Infer } from "@ix-xs/node-comfort";
```

The default export, the namespace object and the named exports are the same objects. The package ships CommonJS: ES modules read it through Node's interop, with no separate build.

## One namespace

Each namespace has its own entry point, `@ix-xs/node-comfort/<namespace>`:

```js
const { slugify } = require("@ix-xs/node-comfort/str");
const { email } = require("@ix-xs/node-comfort/is");
import { get, set } from "@ix-xs/node-comfort/obj";
```

| Entry point | Exports |
| --- | --- |
| `config`, `logger`, `fs`, `env`, `is`, `assert`, `errors`, `json`, `str`, `num`, `arr`, `obj`, `schema`, `time`, `id`, `crypto`, `func`, `async`, `http`, `sys`, `cli`, `color` | The namespace, as `nc.<namespace>` |
| `cache`, `emitter`, `sqlite` | The class, with its factory as a static method: `Cache.create()`, `Emitter.create()`, `SQLite.open()` and `SQLite.op` |
| `checker`, `utils` | The 2.x namespaces, deprecated |

```js
const SQLite = require("@ix-xs/node-comfort/sqlite");
const db = SQLite.open(":memory:");
```

In ES modules, these three are default imports (`import SQLite from "@ix-xs/node-comfort/sqlite"`): a named import of `open` or `op` fails. Importing the root from an ES module loads every namespace, an entry point loads only its own: see [Performance](/help/performance/).

## Types

The declarations are generated from the JSDoc of the source and included in the package. Editors that use the TypeScript language service (VS Code, Cursor, WebStorm, Zed, Neovim with an LSP) read them in JavaScript files too.

| What you get | Where |
| --- | --- |
| Completion | Namespaces, members, and the keys of every options object |
| Hover | The description, the parameters, the defaults and an example, as in the [reference](/reference/) |
| Signature help | The current parameter and its description |
| Deprecated names | Struck through, with what to use instead |

Add `// @ts-check` at the top of a JavaScript file, or `"checkJs": true` in `jsconfig.json`, to get the errors:

```js
// @ts-check
const nc = require("@ix-xs/node-comfort");

nc.str.truncate("Hello", "5");     // error: "5" is not a number
nc.time.add(new Date(), 1, "dya"); // error: "dya" is not a unit
```

## Types that follow the data

```ts
declare const input: unknown;
if (nc.is.string(input)) input.toUpperCase();                       // input: string
if (nc.is.arrayOf(input, nc.is.number)) input.reduce((a, b) => a + b, 0); // input: number[]
const ids = [1, null, 2, undefined].filter(nc.is.defined);          // number[]

const city = nc.obj.get(user, "profile.address.city");              // string | undefined, the path completes

const User = s.object({ email: s.string().email(), age: s.number().optional() });
type User = Infer<typeof User>;                                      // { email: string; age?: number }

const events = nc.emitter.create<{ ready: [port: number] }>();
events.emit("ready", "3000");                                        // error: expected a number

const db = nc.sqlite.open<{ id: number; email: string }>(":memory:");
db.getAll("users", { emial: "x" });                                  // error, `email` is suggested
```

| Typed | How |
| --- | --- |
| `nc.is.*` | Type guards: the variable is narrowed after the check |
| `nc.obj.get`, `set`, `has` | Dot paths are checked against the object |
| `nc.schema` | `Infer<typeof schema>` is the type of valid data |
| `nc.emitter.create<Events>()` | Event names and arguments |
| `nc.cache.create<K, V>()` | Keys and values |
| `nc.sqlite.open<Row>()` | Rows, columns of filters |
| `nc.http.get<T>()` | The type of `data` |

## Types in JavaScript

Every public type is exported from the root, for JSDoc:

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ message: [text: string] }>} */
const chat = nc.emitter.create();

/** @param {import("@ix-xs/node-comfort").HttpOptions} options */
function callApi(options) {}
```

`SlugifyOptions`, `RetryOptions`, `Where`, `LogLevel` and the others are listed at the bottom of each namespace page of the [reference](/reference/).
