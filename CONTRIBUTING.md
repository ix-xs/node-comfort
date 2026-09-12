# Contributing to node-comfort

Thank you for helping! Bug reports, ideas, documentation fixes and pull requests are all welcome.

## Ground rules

- **Zero runtime dependencies.** Everything is built on Node.js native modules. Development tools
  (`typescript`, `@types/node`) are fine as `devDependencies`.
- **Everything is documented.** Every exported function has a description, a `@param` for each parameter
  (with its default value), `@returns` and at least one `@example`. Every option of an options object is a
  documented `@property`. This is what users read in their editor, so write it for a person: short
  sentences, no filler.
- **Everything is typed.** The code is checked by TypeScript in strict mode (`checkJs`). Prefer precise
  types (generics, type guards, literal unions) over `any`.
- **Everything is tested** with `node --test`, on Linux, macOS and Windows.
- **No breaking change without a major version.** Document every change in `CHANGELOG.md`.
- **Nothing loads before it is used.** A new namespace is added to the lazy table in `index.js`, and
  expensive setup (`node:crypto`, `Intl` objects, sockets) happens inside the function that needs it.
- Style: CommonJS, `"use strict"`, 2 spaces, double quotes, semicolons, `function(` without a space for
  anonymous functions. Use `•` or other punctuation, never the long dash character, in text.

## Getting started

```bash
git clone https://github.com/ix-xs/node-comfort.git
cd node-comfort
npm install
npm run check
```

`npm run check` runs, in order:

| Script | What it does |
| --- | --- |
| `npm run build` | Compiles the JSDoc into `types/` (fails on any type error) and regenerates `docs/API.md`. |
| `npm run build:site` | Builds the documentation website into `site/` and checks every internal link. |
| `npm test` | Runs every `test/*.test.js` file with the Node.js test runner. |
| `npm run test:types` | Installs the package in a temporary project and checks the editor experience: hover documentation for every export, completions, auto-imports, and a TypeScript consumer that must compile. |

To check the types with another TypeScript version:

```bash
npm install --no-save --prefix .ts59 typescript@5.9
node scripts/check-types.js --ts .ts59/node_modules/typescript
```

## Project layout

```
index.js            entry point: lazy namespaces and flat helpers
src/*.js            one module per namespace (JSDoc is the source of truth for the types)
src/errors.js       error classes
types/              generated declarations (npm run build, not committed)
docs/API.md         generated API reference (npm run build, committed)
docs/guide/*.md     the guides, written by hand, published on the website
scripts/            build-types, build-docs, build-site, check-types, serve-site
scripts/lib/        the shared API model, the Markdown renderer and the highlighter
scripts/site/       the website CSS and client script
test/               node --test suites
```

## Adding a function

1. Write it in the right `src/` module, with its complete JSDoc, and add it to the module's
   `module.exports`.
2. Add tests in `test/<module>.test.js` (normal cases, edge cases, invalid input).
3. Run `npm run check`. The build fails if the function is not typed, and `test:types` fails if it has
   no hover documentation.
4. Mention it in `CHANGELOG.md` under an "Unreleased" section, and in the guide of its namespace when it
   deserves an explanation.

A new namespace also needs:

- an entry in the `modules` table of `index.js` (and in `flat` if its helpers belong at the top level),
  plus its name in the `0 && (module.exports = { ... })` list that Node reads to find the named exports;
- an entry in the `exports` map of `package.json`, so that `@ix-xs/node-comfort/<name>` works;
- a top-of-file overview JSDoc block, shown when hovering `nc.name`;
- a page in `docs/guide/`, listed in `GUIDE_SECTIONS` and `API_GROUPS` in `scripts/build-site.js`.

## Working on the documentation

The guides are plain Markdown in `docs/guide/`. The website is generated from them and from the generated
types, so the API pages are never out of date.

```bash
npm run build:site   # writes site/ and checks every link
npm run site:serve   # http://localhost:4173
```

Examples in the guides are meant to run: check yours before sending it.

## Pull requests

- One topic per pull request, with a clear description of the problem and the solution.
- Keep the public API consistent with the existing functions (argument order, options objects, return
  values rather than exceptions for everyday "not found" cases).
- CI must be green.

## Reporting a security issue

Please do not open a public issue: see [SECURITY.md](./SECURITY.md).
