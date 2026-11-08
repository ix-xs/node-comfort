import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import { LOCALES, normalizeBase, remarkBaseLinks, withBase } from "./plugins/base-links.mjs";
import { remarkApiLinks } from "./plugins/api-links.mjs";
import { rehypeSharedHeadingIds } from "./plugins/heading-ids.mjs";
import { rehypeWrapTables } from "./plugins/wrap-tables.mjs";
import { MOVED } from "./redirects.mjs";
import { comfortDark, comfortLight } from "./src/styles/code-themes.mjs";

// Where the site is served from. Both can be set from the environment, so
// hosting it somewhere else (a domain of its own, at the root) is a matter of
// two variables in the deploy workflow:
//
//   DOCS_SITE=https://docs.example.dev DOCS_BASE=/ npm run build
//
// Internal links are written root-relative in the content and get the base
// from `remarkBaseLinks`, so nothing else has to change. An empty variable
// means "use the default"; DOCS_BASE=/ is the root.
const site = process.env.DOCS_SITE || "https://ix-xs.github.io";
const base = normalizeBase(process.env.DOCS_BASE || "/node-comfort");

/** One group of the sidebar, its pages in reading order. */
const group = (label, fr, items, collapsed = true) => ({
  label,
  translations: { fr },
  collapsed,
  items: items.map((item) => (typeof item === "string" ? { slug: item } : item)),
});

// https://starlight.astro.build/reference/configuration/
export default defineConfig({
  site,
  base: base || "/",
  // Addresses of the previous structure, each pointing at its new home, in
  // every language.
  redirects: Object.fromEntries(
    Object.entries(MOVED).flatMap(([from, to]) => [
      [from, withBase(to, base)],
      ...LOCALES.map((code) => [`/${code}${from}`, withBase(`/${code}${to === "/" ? "/" : to}`, base)]),
    ]),
  ),
  markdown: {
    // The plugins below are written for unified, not for Astro's default processor.
    processor: unified({
      // Names of the API in code become links to the reference, then every
      // internal link gets the language of its page and the base.
      remarkPlugins: [remarkApiLinks, [remarkBaseLinks, { base }]],
      rehypePlugins: [rehypeSharedHeadingIds, rehypeWrapTables],
    }),
  },
  integrations: [
    starlight({
      title: "node-comfort",
      // English is the original and sits at the root; a translation lives under
      // its language code. A page with no translation yet falls back to English.
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        fr: { label: "Français", lang: "fr" },
      },
      description:
        "The zero-dependency standard library for Node.js: logger, files, SQLite, validation, HTTP, CLI, dates, ids, crypto and hundreds of typed helpers.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/ix-xs/node-comfort" }],
      editLink: {
        baseUrl: "https://github.com/ix-xs/node-comfort/edit/main/docs/",
      },
      head: [
        // Lets the page paint under the notch; the header pads itself back out.
        { tag: "meta", attrs: { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" } },
        // The SVG icon comes from Starlight; these two are for the browsers that want a PNG.
        { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: withBase("/favicon-32.png", base) } },
        { tag: "link", attrs: { rel: "apple-touch-icon", href: withBase("/apple-touch-icon.png", base) } },
        // Kept in step with the theme by the theme toggle.
        { tag: "meta", attrs: { name: "theme-color", content: "#121211" } },
      ],
      customCss: [
        "@fontsource-variable/bricolage-grotesque/opsz.css",
        "@fontsource/fragment-mono/400.css",
        "@fontsource/fragment-mono/400-italic.css",
        "./src/styles/comfort.css",
        "./src/styles/reference.css",
      ],
      components: {
        Header: "./src/components/Header.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
        LanguageSelect: "./src/components/LanguageSelect.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      expressiveCode: {
        themes: [comfortDark, comfortLight],
        styleOverrides: {
          borderRadius: "6px",
          borderWidth: "1px",
          borderColor: "var(--nc-line)",
          codeFontFamily: "var(--sl-font-mono)",
          codeFontSize: "0.84rem",
          codeLineHeight: "1.75",
          codePaddingBlock: "1.25rem",
          codePaddingInline: "1.25rem",
          uiFontFamily: "var(--sl-font-mono)",
          uiFontSize: "0.75rem",
          frames: {
            frameBoxShadowCssValue: "none",
            editorTabBarBackground: "var(--nc-surface)",
            editorTabBarBorderBottomColor: "var(--nc-line)",
            editorActiveTabBackground: "var(--nc-surface)",
            editorActiveTabIndicatorTopColor: "transparent",
            editorActiveTabIndicatorBottomColor: "var(--nc-accent)",
            terminalBackground: "var(--nc-surface)",
            terminalTitlebarBackground: "var(--nc-surface)",
            terminalTitlebarBorderBottomColor: "var(--nc-line)",
            terminalTitlebarDotsOpacity: "0",
          },
        },
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      lastUpdated: false,
      // The guide, in reading order: first the setup, then one project built
      // page by page, then a page per namespace, to read when it is needed.
      // The reference is a section of its own, from the header.
      sidebar: [
        group("Getting started", "Pour commencer", [{ slug: "index", label: "Introduction" }, "start/installation", "start/editor"], false),
        group("Your first project", "Votre premier projet", [
          "project/setup",
          "project/configuration",
          "project/input",
          "project/requests",
          "project/storage",
          "project/command-line",
          "project/production",
        ], false),
        group("Essentials", "Essentiels", ["essentials/logger", "essentials/fs", "essentials/env", "essentials/checker", "essentials/errors", "essentials/utils"]),
        group("Data", "Données", ["data/str", "data/num", "data/arr", "data/obj", "data/schema", "data/time", "data/id"]),
        group("Functions and async", "Fonctions et asynchrone", ["flow/async", "flow/func", "flow/cache", "flow/emitter"]),
        group("System and network", "Système et réseau", ["system/http", "system/sqlite", "system/crypto", "system/cli", "system/color", "system/sys"]),
        group("Complete examples", "Exemples complets", ["recipes/api-server", "recipes/cli-tool", "recipes/scheduled-job"]),
        group("Help", "Aide", ["help/upgrade-2-2", "help/migration", "help/performance", "help/faq"]),
      ],
    }),
  ],
});
