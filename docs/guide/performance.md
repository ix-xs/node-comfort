# Performance

A library that bundles many tools shouldn't make your program slower to start. node-comfort loads almost nothing until you use it.

## Lazy loading

`require("@ix-xs/node-comfort")` creates the `nc` object and stops there. Each namespace is loaded the first time you touch it, and only then. Expensive setup, like `node:crypto` or the `Intl` objects used for text segmentation, is also deferred until a function needs it.

Measured on a Windows machine with Node.js 24 (median of 15 runs):

| Scenario | Time |
| --- | --- |
| `require()` the package | about 3 ms |
| ... then use `nc.str` and `nc.isEmail` | about 10 ms in total |
| ... then touch all 23 namespaces | about 37 ms in total |

You pay for what you use. A script that only logs and reads a JSON file never loads the SQLite, HTTP or crypto code.

## ES modules

When you `import` the root package from an ES module, Node.js has to read every named export up front, which loads every namespace (about 40 ms). To keep startup lean in ES modules, import the namespaces you need from their own entry points:

```js
import { slugify } from "@ix-xs/node-comfort/str";
import { get } from "@ix-xs/node-comfort/obj";
```

Each entry point loads only its own module and the few it depends on.

## Tips

- **Import namespaces directly in hot paths of short-lived scripts** (CLIs, serverless functions), where startup time matters most.
- **Enable Node's compile cache in your app** for faster startups across the board: `node --enable-compile-cache app.js`, or `NODE_COMPILE_CACHE=.cache` (Node 22.1+). This speeds up every module, not just this one.
- **Reuse clients and caches.** `nc.http.create()` and `new nc.Cache()` are cheap, but creating them once and sharing them avoids repeated work.
- **Use `db.insertMany()`** for bulk inserts: one transaction is dramatically faster than thousands of separate ones.
