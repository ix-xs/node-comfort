---
title: "Installation"
description: "node-comfort is a standard library for Node.js in one package with no dependencies: logger, files, validation, HTTP, SQLite, command line, dates, ids and crypto, all typed."
---

```bash
npm install @ix-xs/node-comfort
```

Or `pnpm add`, `yarn add`. The types are included.

| Requirement | |
| --- | --- |
| Node.js | 22.23.4 or later on 22, 24.22.1 or later on 24, 26.12.1 or later. Node.js 23 and 25 are not supported |
| Modules | CommonJS and ES modules, plus one entry point per namespace |
| TypeScript | Declarations included, no `@types` package. Also read by editors in plain JavaScript |
| Dependencies | None. Nothing runs at install time |

Older versions of Node.js [can be crashed by a malicious HTTP response](/system/http/#servers-you-dont-control), which no package can prevent. Node.js 26 is the fastest: time zones go through `Temporal` there.

## First call

In CommonJS:

```js
const { logger, fs, str } = require("@ix-xs/node-comfort");

const settings = fs.readJSON("./settings.json", { name: "My App" });
logger.info(`Starting ${str.slugify(settings.name)}`);
// [11:54:34] ℹ INFO Starting my-app
```

In ES modules:

```js
import nc from "@ix-xs/node-comfort";
import { logger, fs, str } from "@ix-xs/node-comfort";
import { slugify } from "@ix-xs/node-comfort/str";
```

Everything is called as `nc.<namespace>.<member>`: [Organisation](/basics/organisation/) explains the shape of the API, [Your editor](/start/editor/) the imports and the types. The settings shared by every namespace are in [Configuration](/start/configuration/).

## What it covers

| Group | Namespaces |
| --- | --- |
| Configuration | [`config`](/start/configuration/): language and time zone shared by `num`, `time`, `str.plural` and the logger |
| Essentials | [`logger`](/essentials/logger/), [`fs`](/essentials/fs/), [`env`](/essentials/env/), [`is` and `assert`](/essentials/is/), [`errors`](/basics/errors/), [`json`](/essentials/json/) |
| Data | [`str`](/data/str/), [`num`](/data/num/), [`arr`](/data/arr/), [`obj`](/data/obj/), [`schema`](/data/schema/), [`time`](/data/time/), [`id`](/data/id/) |
| Functions and async | [`func`](/flow/func/), [`async`](/flow/async/), [`cache`](/flow/cache/), [`emitter`](/flow/emitter/), [`quota`](/flow/quota/), [`circuit`](/flow/circuit/) |
| System and network | [`crypto`](/system/crypto/), [`http`](/system/http/), [`sqlite`](/system/sqlite/), [`sys`](/system/sys/), [`cli`](/system/cli/), [`color`](/system/color/) |

[All functions](/modules/) lists every member on one page. The [reference](/reference/) has a page for each, with its signature, its options and its types.

## Upgrading

From 2.x, every old name still works in 3.0 and warns once: [Upgrading to 3.0](/help/upgrade-3-0/). From 1.x: [Migrating from 1.x](/help/migration/).
