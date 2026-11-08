---
title: "FAQ"
description: "Short answers to the questions that come up before you start, and while you build."
sidebar:
  order: 7
---

## Before you start

### Why zero dependencies?

Each package you install is a version to follow, a changelog to read, and a
way in for a supply-chain attack. node-comfort is built only on what Node.js
ships (`fetch`, `Intl`, `node:crypto`, `node:sqlite`), so installing it adds
one folder to `node_modules`, and nothing runs at install time.

### Which version of Node.js do I need?

22.23.4 or later on Node.js 22, 24.22.1 or later on Node.js 24, or 26.12.1 or
later. Older versions can be crashed by a single malicious HTTP response, which
no package can prevent. Node.js 23 and 25 are not supported.

### CommonJS or ES modules?

Both. `require("@ix-xs/node-comfort")` and `import nc from "@ix-xs/node-comfort"`
give the same object. In ES modules, import a single namespace
(`@ix-xs/node-comfort/str`) to load only what you use. See
[Installation](/start/installation/#commonjs-es-modules-and-typescript).

### Do I need TypeScript?

No. The package is written in JavaScript and ships its types, so your editor
completes and checks your code in plain JavaScript too. In TypeScript,
everything is typed, down to the type a schema describes. See
[Your editor](/start/editor/).

## Using it

### How does it compare to installing several packages?

One package replaces a dozen: a logger, dotenv, a validation library, an HTTP
client, retry and concurrency helpers, a date library, a CLI toolkit, id
generators, password hashing. They are designed together: a duration is always
`"5m"` or milliseconds, options always come last, every error has a stable
`code`. A dedicated package may go further on its one subject; the
[Introduction](/#what-is-inside) lists what each namespace covers.

### Does it load everything at startup?

No. Requiring the package takes about 4 ms, and each namespace loads the first
time you use it. [Performance](/help/performance/) has the numbers.

### Is it ready for production?

It follows semantic versioning: a minor or patch release never breaks your
code. It has more than five hundred tests, run on Windows, macOS and Linux with
Node.js 22, 24 and 26, and every example of this guide is run when the site is
built.

### I am upgrading from an older version

[Upgrading to 2.2](/help/upgrade-2-2/) lists what changed, and
[Migration](/help/migration/) covers the move from 1.x.

## Getting help

### How do I report a security problem?

Privately, through
[GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new),
never in a public issue. Give the affected version and, if you can, a short
reproduction.

### Where do I report a bug or ask a question?

In the [issues](https://github.com/ix-xs/node-comfort/issues) of the
repository. Give the version of node-comfort and of Node.js, and the smallest
code that shows the problem.
