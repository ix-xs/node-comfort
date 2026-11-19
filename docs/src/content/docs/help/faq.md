---
title: "FAQ"
description: "Short answers to the questions that come up before adopting the library, and while using it."
---

## Why no dependencies?

Each dependency is a version to follow and a way in for a supply-chain attack. node-comfort is built only on what Node.js ships (`fetch`, `Intl`, `node:crypto`, `node:sqlite`): installing it adds one folder to `node_modules`, and nothing runs at install time.

## Which Node.js?

22.23.4 or later on 22, 24.22.1 or later on 24, 26.12.1 or later. Older versions can be crashed by a single malicious HTTP response. Node.js 23 and 25 are not supported. See [Installation](/).

## CommonJS or ES modules?

Both give the same objects. In ES modules, import one namespace from its entry point (`@ix-xs/node-comfort/str`) to load only that one. See [Your editor](/start/editor/).

## Do I need TypeScript?

No. The types ship with the package, and editors read them in JavaScript too. In TypeScript, everything is typed, down to the type a schema describes.

## How does it compare to several packages?

One package covers a logger, dotenv, a validation library, an HTTP client, retries and concurrency, dates, a CLI toolkit, ids and password hashing. They follow the same [conventions](/basics/conventions/): durations, options last, errors with a `code`. A package dedicated to one subject may go further on it.

## Does it load everything at startup?

No. Each namespace loads the first time it is used. [Performance](/help/performance/) has the numbers.

## Why does nc.info() print a warning?

It is a name of 2.x. Since 3.0 everything is called as `nc.<namespace>.<member>`: `nc.logger.info()`. The old names work until 4.0 and warn once. See [Upgrading to 3.0](/help/upgrade-3-0/).

## Is it ready for production?

It follows semantic versioning: a minor or patch release never breaks working code, and a name only goes away in a major version, after a release where it warns. The tests run on Windows, macOS and Linux with Node.js 22, 24 and 26.

## Where do I report a bug or a security problem?

A bug or a question: the [issues](https://github.com/ix-xs/node-comfort/issues), with the versions of node-comfort and Node.js and the smallest code that shows it. A security problem: privately, through [GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new). See also [Troubleshooting](/help/troubleshooting/).
