---
title: "JSON"
description: "`nc.json`: `JSON.parse` with a fallback and comments, `JSON.stringify` that never throws and handles circular references, bigints, Maps, Sets and errors."
---

```js
const { json } = require("@ix-xs/node-comfort");
```

## Parsing

```js
json.parse('{"a":1}');                                // { a: 1 }
json.parse("oops", null);                             // null
json.parse("oops");                                   // throws a SyntaxError
json.parse('{ // a comment\n "a": 1, }', {}, { comments: true }); // { a: 1 }
json.parse(text, null, (key, value) => (key === "at" ? new Date(value) : value));
```

`parse(text, fallback?, options?)`:

| Argument | |
| --- | --- |
| `fallback` | Returned when `text` is not valid JSON. Given at all, even as `undefined`, it replaces the `SyntaxError` |
| `options.comments` | Accept comments and trailing commas, like `tsconfig.json` |
| `options.reviver` | Passed to `JSON.parse`. A function as third argument is the reviver |

A byte order mark at the start of the text is ignored.

## Stringifying

```js
json.stringify({ a: 1 });                                // '{\n    "a": 1\n}'
json.stringify({ id: 10n, tags: new Set(["a"]) }, 0);    // '{"id":"10","tags":["a"]}'
json.stringify({ m: new Map([["k", 1]]) }, 0);           // '{"m":{"k":1}}'
json.stringify({ a: [1] }, { spaces: 2 });               // '{\n  "a": [\n    1\n  ]\n}'

const loop = { name: "loop" };
loop.self = loop;
json.stringify(loop, 0);                                 // '{"name":"loop","self":"[Circular]"}'
```

`stringify(value, spaces = 4)` takes the indentation, or `{ spaces }`. `0` writes one line. `nc.fs.writeJSON()` indents with 2.

| Value | Written as |
| --- | --- |
| A circular reference | `"[Circular]"` |
| A bigint | A string |
| A `Map` | An object |
| A `Set` | An array |
| An `Error` | `name`, `message`, its own fields (like `code`), `cause` and `stack` |
| `undefined`, a function | `"undefined"` at the top level, left out inside objects |

When a getter or a `toJSON()` throws, the result is a description of the value as a JSON string instead of an exception.

## Before 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.JSONParse()`, `nc.utils.JSONParse()` | `nc.json.parse()` |
| `nc.JSONString()`, `nc.utils.JSONString()` | `nc.json.stringify()` |

`nc.json.parse()` also takes `{ comments: true }`. The old names still work in 3.0, warn once, and are removed in 4.0: see [Upgrading to 3.0](/help/upgrade-3-0/).
