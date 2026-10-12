import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import { normalizeBase, remarkBaseLinks, withBase } from "./plugins/base-links.mjs";
import { rehypeSharedHeadingIds } from "./plugins/heading-ids.mjs";
import { rehypeWrapTables } from "./plugins/wrap-tables.mjs";
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

/** One section of the sidebar: every page of a folder, in the order the pages give themselves. */
const section = (label, fr, directory, collapsed = false) => ({ label, translations: { fr }, collapsed, items: [{ autogenerate: { directory } }] });

// https://starlight.astro.build/reference/configuration/
export default defineConfig({
  site,
  base: base || "/",
  markdown: {
    // The plugins below are written for unified, not for Astro's default processor.
    processor: unified({
      remarkPlugins: [[remarkBaseLinks, { base }]],
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
      ],
      components: {
        Header: "./src/components/Header.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
        LanguageSelect: "./src/components/LanguageSelect.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Hero: "./src/components/Hero.astro",
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
      // One page per namespace, grouped by what it's for.
      sidebar: [
        section("Start", "Démarrer", "start"),
        section("Essentials", "Essentiels", "essentials"),
        section("Data", "Données", "data"),
        section("Functions and async", "Fonctions et asynchrone", "flow"),
        section("System and network", "Système et réseau", "system"),
        {
          label: "Going further",
          translations: { fr: "Aller plus loin" },
          items: [{ slug: "recipes" }],
        },
        {
          label: "Reference",
          translations: { fr: "Référence" },
          collapsed: true,
          items: [{ autogenerate: { directory: "reference" } }],
        },
      ],
    }),
  ],
});
