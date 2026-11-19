---
title: "Performance"
description: "What the library costs at startup and per call, and how to keep both low."
---

## Startup

`require()` builds the root object and stops there. Each namespace loads the first time it is read, and expensive setup (`node:crypto`, `Intl` objects) waits until a function needs it.

| Scenario | Time |
| --- | --- |
| `require()` the package | about 12 ms |
| ... then use `nc.str` and `nc.is` | about 20 ms in total |
| ... then touch the 25 namespaces | about 65 ms in total |
| `import` the root from an ES module | about 65 ms: every namespace is loaded |
| `import` one entry point, like `@ix-xs/node-comfort/str` | about 13 ms |

Measured on a Windows machine with Node.js 26, median of 11 runs.

## ES modules

Node.js reads every named export of a CommonJS package when an ES module imports it, which loads every namespace. In a short-lived program (a CLI, a serverless function), import the entry points you need:

```js
import { slugify } from "@ix-xs/node-comfort/str";
import { get } from "@ix-xs/node-comfort/obj";
```

## Per call

What JavaScript does slowly is done once and kept: `Intl` formatters, compiled date patterns, parsed durations, prepared SQL statements, a pool of random bytes. On the same machine, one core:

| Operation | Per second |
| --- | --- |
| `nc.logger.info()` | 320,000 |
| `nc.logger.debug()` when debug is off | 100 million |
| `nc.time.format()` with month and day names | 200,000 |
| `nc.time.parseDuration("5m")` | 32 million |
| `nc.id.uuidv7()` | 1.9 million |
| `nc.str.slugify()` | 2.6 million |
| `nc.num.format()` | 740,000 |
| `nc.obj.get()` with a dot path | 20 million |
| `schema.parse()` on a five-field object | 1.7 million |
| `emitter.emit()` | 24 million |
| `db.get()` by primary key | 200,000 |
| `db.getAll()` of 200 rows | 4,200 |

These are micro-benchmarks: they say what the library costs, not how fast a program is. `node scripts/bench.js` in the repository measures them on your machine. Measure your own code with `nc.time.stopwatch()` or `nc.time.measure()`.

## Tips

| Tip | |
| --- | --- |
| Entry points | In ES modules and short-lived programs, import `@ix-xs/node-comfort/<namespace>` |
| Compile cache | `NODE_COMPILE_CACHE=.cache`, or `require("node:module").enableCompileCache()` in the entry file, speeds up the startup of every module |
| Reuse | Create a client (`nc.http.create()`), a cache (`nc.cache.create()`) or a database (`nc.sqlite.open()`) once and share it |
| Bulk writes | `db.insertMany()` writes in one transaction, much faster than one insert at a time |
| Logs | `nc.logger.isLevelEnabled("debug")` before building an expensive debug message |
