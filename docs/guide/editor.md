# Your editor

node-comfort is written in JavaScript with detailed JSDoc, and ships TypeScript declarations generated from it. Editors built on the TypeScript language service (VS Code, Cursor, WebStorm, Zed, Neovim with an LSP...) use those declarations even in plain JavaScript files.

## What you get

**Completions.** Type `nc.` to see every namespace and top-level helper, `nc.str.` to see the string helpers, and so on. Options objects complete too: inside `nc.http.get(url, { })`, your editor lists `timeout`, `retry`, `query` and the rest.

**Documentation on hover.** Hover a function to read what it does, what each parameter means, the default values and an example. The same text is in the [API reference](../api/index.html).

**Signature help.** While you type arguments, the current parameter and its description show up.

**Auto-imports.** In an ES module or a TypeScript file, type `nc` or `isEmail` and accept the suggestion; the import is added for you.

## Type checking in JavaScript

Add `// @ts-check` at the top of a JavaScript file, or `"checkJs": true` in a `jsconfig.json`, and your editor will flag mistakes:

```js
// @ts-check
const nc = require("@ix-xs/node-comfort");

nc.str.truncate("Hello", "5");    // error: "5" is not a number
nc.time.add(new Date(), 1, "dya"); // error: "dya" is not a unit
```

## Types that follow your data

Many functions carry types through, so you rarely need to write them yourself.

**Type guards** narrow variables:

```ts
declare const input: unknown;
if (nc.isString(input)) input.toUpperCase(); // input is a string here
if (nc.isArrayOf(input, nc.isNumber)) input.reduce((a, b) => a + b); // number[]
```

**Dot paths** are checked and typed:

```ts
const city = nc.obj.get(user, "profile.address.city"); // string | undefined
nc.obj.get(user, "profile.adress.city"); // your editor suggests the right path
```

**Schemas** give you the type of valid data:

```ts
const User = nc.schema.object({ email: nc.schema.string().email(), age: nc.schema.number().optional() });
type User = nc.schema.Infer<typeof User>; // { email: string; age?: number }
```

**Typed events**, caches and databases check names and values:

```ts
const events = new nc.Emitter<{ ready: [port: number] }>();
events.emit("ready", "3000"); // error: expected a number

const db = new nc.SQLite<{ id: number; email: string }>(":memory:");
db.getAll("users", { emial: "x" }); // error, and `email` is suggested
```

## Using the types in JavaScript

JSDoc lets you use the package's types without TypeScript:

```js
/** @type {import("@ix-xs/node-comfort").Emitter<{ message: [text: string] }>} */
const chat = new nc.Emitter();

/** @param {import("@ix-xs/node-comfort").HttpOptions} options */
function callApi(options) {}

/** @typedef {import("@ix-xs/node-comfort").Infer<typeof User>} User */
```

Every public type is exported from the package root: `SlugifyOptions`, `RetryOptions`, `Where`, `LogLevel` and about 180 more. The API reference lists them at the bottom of each page.
