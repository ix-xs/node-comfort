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
  index.mdx start/ project/   the guide: the introduction, then one project built page by page
  essentials/ data/ flow/ system/ recipes/ help/   the topic pages, the complete examples, help
  fr/                        the French translation, same paths
src/data/api.json            the API reference, generated from the types (npm run build at the root), committed
src/reference-i18n/fr/       the French of the reference: one file per namespace, English sentence to French sentence
src/reference/               reads api.json and the catalogs for the reference pages
src/pages/reference/         one page per export, in each language (fr/reference/ for French)
src/components/reference/    the parts of a reference page
src/components/              the header, the search extras, the terminal of the scenes (demo/)
src/scenes/                  what the terminals of the guide run
  scenes.mjs                 the list of scenes: command, files, simulated sites
  project/<step>/            the files of the project at each step, as the pages show them
src/pages/dev/               a page for the dev server only, with worst-case scenes
src/styles/                  the look of the site (comfort.css)
src/i18n.ts                  the words of the interface, in both languages
plugins/                     links that follow the base path, names of the API in code that link to
                             their page, shared heading ids, scrollable tables
scripts/
  scenes.mjs                 runs the scenes and stores what they printed
  check-links.mjs            every link and anchor of the built site
  check-translation.mjs      a translated page has the same headings, code and links
  legacy-pages.mjs           redirects from the addresses of the previous site
  icons.mjs                  the PNG icons, from favicon.svg
```

## Writing

- A guide starts with an example, then explains. Sentences are short and plain. No long dash.
- Links between pages are written from the root of the site, without its base: `/data/time/`,
  `/reference/str/slugify/`. A name of the API in inline code, like `nc.str.slugify()`, links to its
  reference page by itself.
- Examples must run. Results shown in comments are copied from a real run.
- The reference pages come from the JSDoc in `src/`. To change one, change the JSDoc, then run
  `npm run build` at the root: it writes `src/data/api.json`, which is committed with the change.

## Translating

A French page lives at the same path under `src/content/docs/fr/`. It keeps the headings in the same
order, the code blocks untouched (comments may be translated) and the same links. A page that has no
translation is shown in English, so the site is never broken while a translation catches up.

The reference is translated sentence by sentence. `src/reference-i18n/fr/<namespace>.json` maps each
English sentence of the JSDoc to its French one, and the French pages read them as they are built.
When a sentence of the JSDoc changes, its translation no longer applies: the page shows the English
sentence until the catalog is updated. This lists what is waiting, and the entries that are no longer
used:

```bash
node scripts/build-reference.js --missing
```

## The scenes

A terminal in the guide (`<TerminalDemo scene="project/setup/first-run" />`) shows a real run.
`scripts/scenes.mjs` runs each scene listed in `src/scenes/scenes.mjs` before every build, in a folder
made of the files the reader has at that point, converts what it printed into HTML, and writes
`src/scenes/output.json`. Each of these files must appear, as it is, in a code block of its page, in
every language: the build fails otherwise. To add a scene, write its files, list it, and show it on the
page. `/dev/worst/` on the dev server shows the terminal with the worst output it may get.
