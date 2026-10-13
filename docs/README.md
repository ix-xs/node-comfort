# The node-comfort documentation site

The website published at <https://ix-xs.github.io/node-comfort/>. It is an [Astro](https://astro.build)
project with [Starlight](https://starlight.astro.build), kept apart from the package: what is installed
here never reaches the people who install `@ix-xs/node-comfort`.

## Run it

From the root of the repository:

```bash
npm run docs:install
```

```bash
npm run docs:dev
```

The site is then at <http://localhost:4321/node-comfort/>. Before sending a change:

```bash
npm run docs:build
```

This builds `docs/dist`, checks every internal link and anchor, and checks that every French page still
mirrors its English original.

## Where things are

```
src/content/docs/            the pages, in English
  start/ essentials/ data/ flow/ system/ recipes.md     written by hand
  reference/                 generated from the types, never edited by hand
  fr/                        the French translation, same paths
  fr/reference/              generated too, from the same types and the catalogs below
src/reference-i18n/fr/       the French of the reference: one file per namespace, English sentence to French sentence
src/components/              the header, the hero, the search extras, the showcase
src/showcase/                the examples of the landing page
  samples/<subject>/*.js     real files, run against the package at every build
  scenes.mjs                 their order, labels and one-line descriptions
src/styles/                  the look of the site (comfort.css) and of the showcase
src/i18n.ts                  the words of the interface, in both languages
plugins/                     links that follow the base path, shared heading ids, scrollable tables
scripts/
  showcase.mjs               runs the samples and stores what they printed
  check-links.mjs            every link and anchor of the built site
  check-translation.mjs      a translated page has the same headings, code and links
  legacy-pages.mjs           redirects from the addresses of the previous site
  icons.mjs                  the PNG icons, from favicon.svg
```

## Writing

- A guide starts with an example, then explains. Sentences are short and plain. No long dash.
- Links between pages are written from the root of the site, without its base: `/data/time/`,
  `/reference/str/#slugify`.
- Examples must run. Results shown in comments are copied from a real run.
- The reference pages come from the JSDoc in `src/`. To change one, change the JSDoc, then run
  `npm run build` at the root.

## Translating

A French page lives at the same path under `src/content/docs/fr/`. It keeps the headings in the same
order, the code blocks untouched (comments may be translated) and the same links. A page that has no
translation is shown in English, so the site is never broken while a translation catches up.

The reference is translated sentence by sentence. `src/reference-i18n/fr/<namespace>.json` maps each
English sentence of the JSDoc to its French one, and `npm run build` writes the French pages from them.
When a sentence of the JSDoc changes, its translation no longer applies: the page shows the English
sentence until the catalog is updated. This lists what is waiting, and the entries that are no longer
used:

```bash
node scripts/build-reference.js --missing
```

## The showcase

Each example of the landing page is a file in `src/showcase/samples/`. `scripts/showcase.mjs` runs it
with colors on, converts what it printed into HTML, and the page shows both. To add one, write the file,
then list it in `src/showcase/scenes.mjs`.
