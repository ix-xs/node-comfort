"use strict";

// Builds the documentation website into site/: landing page, guides from
// docs/guide/*.md, one API page per namespace from the type declarations,
// a search index and a sitemap. Every internal link is checked.
//
// Usage: node scripts/build-site.js

const fs = require("node:fs");
const path = require("node:path");
const { buildModel } = require("./lib/api-model.js");
const { render, inline, slug } = require("./lib/markdown.js");
const { highlight, escape } = require("./lib/highlight.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "site");
const GUIDES = path.join(ROOT, "docs", "guide");
const ASSETS = path.join(__dirname, "site");

const SITE = {
  name: "node-comfort",
  repo: "https://github.com/ix-xs/node-comfort",
  url: "https://ix-xs.github.io/node-comfort/",
  npm: "https://www.npmjs.com/package/@ix-xs/node-comfort",
};

const GUIDE_SECTIONS = [
  { title: "Getting started", pages: ["introduction", "getting-started", "editor", "performance"] },
  { title: "Essentials", pages: ["logger", "fs", "checker", "env", "errors", "utils"] },
  { title: "Data", pages: ["str", "num", "arr", "obj", "time", "id", "schema"] },
  { title: "Functions and async", pages: ["func", "async", "cache", "emitter"] },
  { title: "System and network", pages: ["http", "sqlite", "cli", "color", "sys", "crypto"] },
  { title: "Going further", pages: ["recipes", "migration"] },
];

const API_GROUPS = [
  { title: "Essentials", keys: ["logger", "fs", "checker", "env", "errors", "utils"] },
  { title: "Data", keys: ["str", "num", "arr", "obj", "time", "id", "schema"] },
  { title: "Functions and async", keys: ["func", "async", "Cache", "Emitter"] },
  { title: "System and network", keys: ["http", "SQLite", "cli", "color", "sys", "crypto"] },
];

/** Guide page of each namespace. */
const GUIDE_OF = /** @type {Record<string, string>} */ ({ SQLite: "sqlite", Cache: "cache", Emitter: "emitter" });
const guideOf = (/** @type {string} */ key) => GUIDE_OF[key] ?? key;
const apiFile = (/** @type {string} */ key) => `api/${key.toLowerCase()}.html`;

const model = buildModel();
const version = model.package.version;
const namespaces = new Map(model.namespaces.map((ns) => [ns.key, ns]));

/** @type {Map<string, string>} output file -> html */
const pages = new Map();
/** @type {Array<{ t: string, u: string, k: string, s?: string }>} */
const searchIndex = [];

// icons

const icon = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  sun: '<svg class="theme-light-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="theme-dark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H4zM8 20h8M12 16v4"/><path d="m9 9 2 2 4-4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
};

const MARK = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="nc-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#nc-g)"/><path d="M9 21v-7.5a3.5 3.5 0 0 1 7 0V21M25 13.5a3.5 3.5 0 1 0 0 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const FAVICON = MARK.replace('class="brand-mark" ', 'xmlns="http://www.w3.org/2000/svg" ');

// helpers

/** @param {string} markdown */
const plain = (markdown) =>
  markdown
    .split(/\n\s*\n/)[0]
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** @param {string} text @param {number} max */
const clip = (text, max = 150) => (text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}...` : text);

/**
 * Links type names in highlighted or escaped HTML to their definitions.
 * @param {string} html
 * @param {string} root
 */
const linkTypes = (html, root) =>
  html.replace(/<span class="t-type">([A-Za-z_]\w*)<\/span>|\b([A-Z]\w*)\b(?![^<]*>)/g, (match, spanName, bareName) => {
    const name = spanName ?? bareName;
    const owner = model.typeOwners[name];
    if (!owner) return match;
    return `<a class="t-type" href="${root}${apiFile(owner)}#type-${name}">${name}</a>`;
  });

/** @param {string} code @param {string} lang @param {string} root */
const codeBlock = (code, lang, root) => `<div class="code" data-lang="${lang}"><pre><code class="lang-${lang}">${lang === "ts" ? linkTypes(highlight(code, lang), root) : highlight(code, lang)}</code></pre></div>`;

/** Rewrites .md links written in guides. */
const guideLink = (/** @type {string} */ href) => href.replace(/^([\w-]+)\.md(#.*)?$/, "$1.html$2");

// layout

/**
 * @param {{ file: string, title: string, description: string, section?: "guide" | "api" | "home", sidebar?: string, toc?: Array<{ level: number, id: string, text: string }>, content: string, home?: boolean }} page
 */
const layout = (page) => {
  const depth = page.file.split("/").length - 1;
  const root = "../".repeat(depth);
  const fullTitle = page.home ? `${SITE.name}: the zero-dependency standard library for Node.js` : `${page.title} | ${SITE.name}`;
  const toc = page.toc?.filter((h) => h.level === 2 || h.level === 3) ?? [];
  const tocHTML = toc.length
    ? `<aside class="toc" aria-label="On this page"><h2>On this page</h2><ul>${toc.map((h) => `<li class="depth-${h.level}"><a href="#${h.id}">${inline(h.text)}</a></li>`).join("")}</ul></aside>`
    : "";
  const nav = [
    ["Guide", `${root}guide/introduction.html`, "guide"],
    ["API", `${root}api/index.html`, "api"],
    ["Recipes", `${root}guide/recipes.html`, "recipes"],
  ]
    .map(([label, href, key]) => `<a href="${href}"${page.section === key ? ' class="active"' : ""}>${label}</a>`)
    .join("");
  const body = page.home
    ? `<main id="main" class="home">${page.content}</main>`
    : `<div class="layout">${page.sidebar ?? ""}<main id="main" class="content"><article class="article">${page.content}</article></main>${tocHTML}</div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(fullTitle)}</title>
<meta name="description" content="${escape(page.description)}">
<meta name="nc-root" content="${root}">
<meta property="og:title" content="${escape(fullTitle)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${page.file}">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${SITE.url}${page.file === "index.html" ? "" : page.file}">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/style.css?v=${version}">
<script>(()=>{try{const t=localStorage.getItem("nc-theme");document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch{document.documentElement.dataset.theme="light"}})()</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="header">
<button class="icon-button menu-button" id="menu-toggle" type="button" aria-label="Menu">${icon.menu}</button>
<a class="brand" href="${root}index.html">${MARK}<span>${SITE.name}</span><span class="version">v${version}</span></a>
<nav class="nav" aria-label="Main">${nav}</nav>
<div class="header-tools">
<button class="search-button" type="button" aria-label="Search">${icon.search.replace("<svg", '<svg width="16" height="16"')}<span>Search</span><kbd>Ctrl K</kbd></button>
<button class="icon-button" id="theme-toggle" type="button" aria-label="Toggle dark mode">${icon.sun}${icon.moon}</button>
<a class="icon-button" href="${SITE.repo}" aria-label="GitHub" target="_blank" rel="noopener">${icon.github}</a>
</div>
</header>
${body}
<div class="search-backdrop"></div>
<div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search">
<input type="search" placeholder="Search the docs" aria-label="Search the docs" autocomplete="off" spellcheck="false">
<ul class="search-results"></ul>
<div class="search-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>
</div>
<script src="${root}assets/app.js?v=${version}" defer></script>
</body>
</html>
`;
};

// guides

/** @type {Map<string, { title: string, description: string }>} */
const guideMeta = new Map();
const guideOrder = GUIDE_SECTIONS.flatMap((s) => s.pages);
for (const name of fs.readdirSync(GUIDES).filter((f) => f.endsWith(".md"))) {
  const slugName = name.replace(/\.md$/, "");
  if (!guideOrder.includes(slugName)) throw new Error(`docs/guide/${name} is not listed in GUIDE_SECTIONS`);
}
for (const slugName of guideOrder) {
  const file = path.join(GUIDES, `${slugName}.md`);
  if (!fs.existsSync(file)) throw new Error(`Missing guide: docs/guide/${slugName}.md`);
  const text = fs.readFileSync(file, "utf8");
  const title = /^#\s+(.+)$/m.exec(text)?.[1].trim() ?? slugName;
  const firstParagraph = text.replace(/^#.*$/m, "").trim().split(/\n\s*\n/)[0];
  guideMeta.set(slugName, { title, description: plain(firstParagraph) });
}

/** @param {string} current */
const guideSidebar = (current) =>
  `<nav class="sidebar" aria-label="Guide">${GUIDE_SECTIONS.map(
    (s) => `<h2>${s.title}</h2><ul>${s.pages.map((p) => `<li><a href="${p}.html"${p === current ? ' class="active"' : ""}>${escape(guideMeta.get(p)?.title ?? p)}</a></li>`).join("")}</ul>`,
  ).join("")}<h2>Reference</h2><ul><li><a href="../api/index.html">API reference</a></li><li><a href="${SITE.repo}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changelog</a></li></ul></nav>`;

guideOrder.forEach((slugName, i) => {
  const source = fs.readFileSync(path.join(GUIDES, `${slugName}.md`), "utf8");
  const { html, headings, title } = render(source, { link: guideLink });
  const meta = /** @type {{ title: string, description: string }} */ (guideMeta.get(slugName));
  const nsKey = [...namespaces.keys()].find((k) => guideOf(k) === slugName);
  const prev = guideOrder[i - 1];
  const next = guideOrder[i + 1];
  let content = `<h1>${inline(title ?? meta.title)}</h1>${html.replace("<p>", '<p class="lead">')}`;
  if (nsKey) {
    const ns = /** @type {any} */ (namespaces.get(nsKey));
    content += `<div class="callout"><div><strong>Full reference</strong><span>Every function in <code>nc.${nsKey}</code>, with its parameters and types.</span></div><a class="go" href="../${apiFile(nsKey)}">${ns.members.length} entries &rarr;</a></div>`;
  }
  content += `<nav class="pager" aria-label="Pages">${prev ? `<a class="prev" href="${prev}.html"><small>Previous</small>${escape(guideMeta.get(prev)?.title ?? prev)}</a>` : ""}${next ? `<a class="next" href="${next}.html"><small>Next</small>${escape(guideMeta.get(next)?.title ?? next)}</a>` : ""}</nav>`;
  content += `<div class="page-meta"><span>node-comfort v${version}</span><a href="${SITE.repo}/edit/main/docs/guide/${slugName}.md" target="_blank" rel="noopener">Edit this page on GitHub</a></div>`;
  const file = `guide/${slugName}.html`;
  pages.set(file, layout({ file, title: meta.title, description: meta.description, section: slugName === "recipes" ? "recipes" : "guide", sidebar: guideSidebar(slugName), toc: headings, content }));
  searchIndex.push({ t: meta.title, u: file, k: "Guide", s: clip(meta.description) });
  for (const h of headings.filter((h) => h.level === 2)) searchIndex.push({ t: h.text.replace(/`/g, ""), u: `${file}#${h.id}`, k: "Section", s: meta.title });
});

// API pages

/** @param {string} current */
const apiSidebar = (current) =>
  `<nav class="sidebar" aria-label="API">${`<h2>Reference</h2><ul><li><a href="index.html"${current === "index" ? ' class="active"' : ""}>Overview</a></li></ul>`}${API_GROUPS.map(
    (g) =>
      `<h2>${g.title}</h2><ul>${g.keys
        .map((k) => `<li><a href="${k.toLowerCase()}.html"${k === current ? ' class="active"' : ""}><code>${namespaces.get(k)?.kind === "class" ? k : `nc.${k}`}</code></a></li>`)
        .join("")}</ul>`,
  ).join("")}<h2>Guide</h2><ul><li><a href="../guide/introduction.html">Introduction</a></li><li><a href="../guide/getting-started.html">Getting started</a></li></ul></nav>`;

const covered = API_GROUPS.flatMap((g) => g.keys);
for (const key of namespaces.keys()) if (!covered.includes(key)) throw new Error(`Namespace ${key} is missing from API_GROUPS`);

/**
 * @param {import("./lib/api-model.js").buildModel extends () => infer M ? M extends { namespaces: Array<infer N> } ? N : never : never} ns
 */
const renderNamespace = (ns) => {
  const root = "../";
  const file = apiFile(ns.key);
  const display = ns.kind === "class" ? ns.key : `nc.${ns.key}`;
  /** @type {Array<{ level: number, id: string, text: string }>} */
  const toc = [];
  const [lead, ...restParagraphs] = ns.description.split(/\n\s*\n/);
  let content = `<h1><code>${display}</code></h1>`;
  if (lead) content += `<p class="lead">${inline(lead.replace(/\s*\n\s*/g, " "))}</p>`;
  if (restParagraphs.length) content += render(restParagraphs.join("\n\n")).html;

  const firstFn = ns.members.find((m) => m.kind === "function")?.name;
  const importCode =
    ns.kind === "class"
      ? `const { ${ns.key} } = require("@ix-xs/node-comfort");\nimport ${ns.key} from "${ns.subpath}";`
      : `const { ${ns.key} } = require("@ix-xs/node-comfort");\nimport { ${firstFn ?? "default"} } from "${ns.subpath}";`;
  content += `<div class="import">${codeBlock(importCode, "js", root)}</div>`;
  if (ns.flat) content += `<p>These functions are also available at the top level: <code>nc.${firstFn}()</code> is <code>nc.${ns.key}.${firstFn}()</code>.</p>`;
  for (const example of ns.examples) content += codeBlock(example, "js", root);
  content += `<div class="callout"><div><strong>Guide</strong><span>Explanations and examples for <code>${display}</code>.</span></div><a class="go" href="../guide/${guideOf(ns.key)}.html">Read the guide &rarr;</a></div>`;

  const title = ns.kind === "class" ? "Constructor and methods" : "Functions";
  content += `<h2 id="members">${title}</h2>`;
  toc.push({ level: 2, id: "members", text: title });
  for (const member of ns.members) {
    const id = member.kind === "constructor" ? "constructor" : member.name;
    toc.push({ level: 3, id, text: `${member.kind === "constructor" ? "new" : member.name}${member.signatures.length ? "()" : ""}` });
    const heading = member.kind === "constructor" ? `new ${ns.key}()` : `${member.qualified}${member.signatures.length ? "()" : ""}`;
    const badges = [
      member.kind === "method" && member.signatures.length ? '<span class="badge">method</span>' : "",
      !member.signatures.length ? '<span class="badge">property</span>' : "",
      member.signatures.length > 1 ? `<span class="badge">${member.signatures.length} overloads</span>` : "",
      member.deprecated ? '<span class="badge deprecated">deprecated</span>' : "",
    ].join("");
    let body = `<section class="member" id="${id}"><h3><code>${escape(heading)}</code>${badges}</h3>`;
    if (member.deprecated) body += `<p class="deprecation">${inline(member.deprecated)}</p>`;
    if (!member.signatures.length) {
      body += `<div class="sig">${codeBlock(`${member.name}: ${member.type}`, "ts", root)}</div>`;
      if (member.description) body += render(member.description).html;
    } else {
      body += `<div class="sig">${codeBlock(member.signatures.map((s) => s.code).join("\n"), "ts", root)}</div>`;
      const main = member.signatures.reduce((best, s) => (s.params.length > best.params.length ? s : best), member.signatures[0]);
      const description = member.signatures[0].description || member.description;
      if (description) body += render(description).html;
      const params = main.params.filter((p) => !/^_/.test(p.name));
      if (params.length) {
        const described = params.some((p) => p.description || p.defaultValue !== undefined);
        body += `<div class="params"><h4>Parameters</h4><div class="table"><table><thead><tr><th>Name</th><th>Type</th>${described ? "<th>Description</th>" : ""}</tr></thead><tbody>${params
          .map(
            (p) =>
              `<tr><td><code>${p.rest ? "..." : ""}${escape(p.name)}</code>${p.optional ? '<span class="opt">optional</span>' : ""}</td><td><span class="type">${linkTypes(escape(p.type), root)}</span></td>${described ? `<td>${p.description ? inline(p.description) : ""}${p.defaultValue !== undefined ? `<span class="default">Default: <code>${escape(p.defaultValue)}</code></span>` : ""}</td>` : ""}</tr>`,
          )
          .join("")}</tbody></table></div></div>`;
      }
      if (main.returns && main.returns.type !== "void" && member.kind !== "constructor") {
        body += `<p class="returns"><strong>Returns</strong> <code class="type">${linkTypes(escape(main.returns.type), root)}</code>${main.returns.description ? `: ${inline(main.returns.description)}` : ""}</p>`;
      }
      const throws = member.signatures.flatMap((s) => s.throws).filter((t, k, all) => all.findIndex((x) => x.type === t.type && x.description === t.description) === k);
      if (throws.length) body += `<p class="returns"><strong>Throws</strong> ${throws.map((t) => `${t.type ? `<code class="type">${linkTypes(escape(t.type), root)}</code>` : ""}${t.description ? ` ${inline(t.description)}` : ""}`).join("; ")}</p>`;
      const examples = [...new Set(member.signatures.flatMap((s) => s.examples))];
      if (examples.length) body += `<h4>Example</h4>${examples.map((e) => codeBlock(e, "js", root)).join("")}`;
    }
    body += "</section>";
    content += body;
    searchIndex.push({ t: member.kind === "constructor" ? `new nc.${ns.key}()` : member.qualified, u: `${file}#${id}`, k: member.kind === "constructor" ? "Constructor" : member.signatures.length ? (member.kind === "method" ? "Method" : "Function") : "Property", s: clip(plain(member.description || member.signatures[0]?.description || "")) });
  }
  if (ns.extra.length) {
    content += `<h3 id="also-available">Also available</h3><p>${ns.extra.map((n) => `<code>${escape(n)}</code>`).join(" ")}</p>`;
    toc.push({ level: 3, id: "also-available", text: "Also available" });
  }
  if (ns.types.length) {
    content += `<h2 id="types">Types</h2><p>Import any of them in TypeScript with <code>import type { ${ns.types[0].name} } from "@ix-xs/node-comfort"</code>, or in JavaScript with <code>import("@ix-xs/node-comfort").${ns.types[0].name}</code>.</p>`;
    toc.push({ level: 2, id: "types", text: "Types" });
    for (const t of ns.types) {
      let body = `<section class="type-def" id="type-${t.name}"><h3><code>${t.name}</code></h3>`;
      if (t.description) body += render(t.description).html;
      if (t.definition) body += codeBlock(`type ${t.name} = ${t.definition}`, "ts", root);
      if (t.properties.length) {
        body += `<div class="params"><div class="table"><table><thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead><tbody>${t.properties
          .map((p) => `<tr><td><code>${escape(p.name)}</code>${p.optional ? '<span class="opt">optional</span>' : ""}</td><td><span class="type">${linkTypes(escape(p.type), root)}</span></td><td>${p.description ? inline(p.description) : ""}</td></tr>`)
          .join("")}</tbody></table></div></div>`;
      }
      body += "</section>";
      content += body;
      searchIndex.push({ t: t.name, u: `${file}#type-${t.name}`, k: "Type", s: clip(plain(t.description)) });
    }
  }
  content += `<div class="page-meta"><span>node-comfort v${version}</span><a href="${SITE.repo}/blob/main/src/${ns.module}.js" target="_blank" rel="noopener">View the source</a></div>`;
  pages.set(file, layout({ file, title: display, description: clip(plain(ns.description), 160) || `API reference of ${display}`, section: "api", sidebar: apiSidebar(ns.key), toc, content }));
};

for (const ns of model.namespaces) renderNamespace(ns);

// API overview
{
  let content = `<h1>API reference</h1><p class="lead">Every function, class and type in node-comfort, generated from the same declarations your editor reads. ${model.namespaces.reduce((n, ns) => n + ns.members.length, 0)} entries across ${model.namespaces.length} namespaces.</p>`;
  content += `<p>The four essentials (<code>logger</code>, <code>fs</code>, <code>checker</code> and <code>utils</code>) are also available at the top level. Everything else lives in its namespace, and each namespace can be imported on its own from <code>@ix-xs/node-comfort/&lt;name&gt;</code>.</p>`;
  const toc = [];
  for (const group of API_GROUPS) {
    const id = slug(group.title);
    toc.push({ level: 2, id, text: group.title });
    content += `<h2 id="${id}">${group.title}</h2><div class="ns-grid">${group.keys
      .map((k) => {
        const ns = /** @type {any} */ (namespaces.get(k));
        return `<a class="ns-card" href="${k.toLowerCase()}.html"><span class="count">${ns.members.length}</span><code>${ns.kind === "class" ? k : `nc.${k}`}</code><p>${escape(clip(plain(ns.description), 110))}</p></a>`;
      })
      .join("")}</div>`;
  }
  pages.set("api/index.html", layout({ file: "api/index.html", title: "API reference", description: "Every function, class and type in node-comfort.", section: "api", sidebar: apiSidebar("index"), toc, content }));
}

// home page

{
  const total = Math.floor(model.namespaces.reduce((n, ns) => n + ns.members.length, 0) / 50) * 50;
  const sample = (/** @type {string} */ code) => `<pre><code class="lang-js">${highlight(code, "js")}</code></pre>`;
  const tabs = [
    [
      "Config and logs",
      `const nc = require("@ix-xs/node-comfort");

// Checked at startup: every problem is reported at once
const config = nc.env.validate({
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url" },
  CACHE_TTL: { type: "duration", default: "5m" },
});

nc.info(\`Listening on port \${config.PORT}\`);
nc.log("<% green bold ✔ Ready %> in <% dim 42ms %>");`,
    ],
    [
      "HTTP",
      `const api = nc.http.create({
  baseURL: "https://api.example.com/v1/",
  auth: { bearer: process.env.API_TOKEN },
  timeout: "10s",
  retry: { attempts: 3 }, // honours Retry-After
});

const users = new nc.Cache({ max: 1000, ttl: "5m" });
const user = await users.getOrSet(id, async () => (await api.get(\`users/\${id}\`)).data);`,
    ],
    [
      "Validation",
      `const { schema: s } = nc;

const User = s.object({
  email: s.string().trim().email(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
});

const result = User.safeParse(req.body);
if (!result.success) return res.status(400).json(result.error.flatten());`,
    ],
    [
      "SQLite",
      `const db = new nc.SQLite("data/app.sqlite");

db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });

const admins = db.getAll("users", {
  role: ["admin", "owner"],
  created_at: { gte: nc.time.subtract(new Date(), 30, "days") },
}, { orderBy: "email", limit: 20 });`,
    ],
  ];
  const features = [
    [icon.package, "Nothing else to install", "Built only on Node's own modules: fetch, Intl, node:crypto, node:sqlite. No dependencies, no install scripts, nothing else to audit."],
    [icon.cursor, "Your editor already knows", "Every function, parameter and option is documented and typed. Hover, completion and type checks work in JavaScript and TypeScript."],
    [icon.bolt, "Loads in about 3 ms", "Namespaces load the first time you use them. A script that only logs never loads the database or the HTTP client."],
    [icon.shield, "Safe by default", "Prototype-pollution-proof objects, scrypt passwords, AES-256-GCM, constant-time comparisons, parameterized SQL, atomic file writes."],
    [icon.globe, "Speaks every language", "Dates, durations, numbers, currencies and plurals in any language and time zone, through the Intl data Node already ships."],
    [icon.layers, "One consistent API", "Durations are always \"5m\" or milliseconds, options always come last, and every error carries a stable code you can check."],
  ];
  const cards = API_GROUPS.flatMap((g) => g.keys).map((k) => {
    const ns = /** @type {any} */ (namespaces.get(k));
    return `<a class="ns-card" href="guide/${guideOf(k)}.html"><code>${ns.kind === "class" ? k : `nc.${k}`}</code><p>${escape(clip(plain(ns.description), 96))}</p></a>`;
  });
  const content = `
<section class="hero">
<a class="eyebrow" href="${SITE.repo}/blob/main/CHANGELOG.md"><b>v${version}</b> Rewritten from the ground up. See what changed</a>
<h1>The standard library <span>Node.js deserves</span></h1>
<p>Logging, config, validation, HTTP, SQLite, dates, crypto, CLI tools and ${total}+ helpers. One package, zero dependencies, documented right in your editor.</p>
<div class="cta"><a class="button primary" href="guide/getting-started.html">Get started ${icon.arrow}</a><a class="button" href="api/index.html">API reference</a><a class="button" href="${SITE.repo}" target="_blank" rel="noopener">${icon.github.replace("<svg", '<svg width="18" height="18"')} GitHub</a></div>
<div class="install"><span class="prompt">$</span><span>npm install @ix-xs/node-comfort</span><button type="button" data-copy="npm install @ix-xs/node-comfort" aria-label="Copy the install command">${icon.copy}</button></div>
</section>
<section class="showcase">
<div class="window"><div class="window-bar"><i></i><i></i><i></i><span>app.js</span><div class="tabs" role="tablist" data-tabs>${tabs.map(([label], i) => `<button type="button" role="tab" aria-selected="${i === 0}">${label}</button>`).join("")}</div></div>
${tabs.map(([, code], i) => `<div data-panel${i ? " hidden" : ""}>${sample(code)}</div>`).join("")}
</div>
</section>
<section class="stats">
<div class="stat"><b>0</b><span>dependencies</span></div>
<div class="stat"><b>${total}+</b><span>documented functions</span></div>
<div class="stat"><b>~3 ms</b><span>to require</span></div>
<div class="stat"><b>100%</b><span>typed, in JS and TS</span></div>
</section>
<section class="section">
<h2>Why node-comfort</h2>
<p>Most projects install the same twenty packages, and hundreds of dependencies with them. Node.js can do most of it on its own now. This is the missing layer on top.</p>
<div class="features">${features.map(([svg, title, text]) => `<div class="feature"><div class="icon">${svg}</div><h3>${title}</h3><p>${text}</p></div>`).join("")}</div>
</section>
<section class="section">
<h2>Everything in one import</h2>
<p>${model.namespaces.length} namespaces, each with a guide and a full reference.</p>
<div class="modules">${cards.join("")}</div>
</section>
<section class="section" style="text-align:center">
<h2>Try it in two minutes</h2>
<p>Install it, require it, and type <code>nc.</code> in your editor.</p>
<div class="cta"><a class="button primary" href="guide/getting-started.html">Read the guide ${icon.arrow}</a><a class="button" href="guide/recipes.html">Browse the recipes</a></div>
</section>
<footer class="footer">MIT licensed. Built with node-comfort, without dependencies. <a href="${SITE.repo}">GitHub</a> • <a href="${SITE.npm}">npm</a> • <a href="${SITE.repo}/blob/main/CHANGELOG.md">Changelog</a></footer>`;
  pages.set("index.html", layout({ file: "index.html", title: SITE.name, description: `${model.package.description}`, section: "home", content, home: true }));
}

// 404
pages.set(
  "404.html",
  layout({
    file: "404.html",
    title: "Page not found",
    description: "This page doesn't exist.",
    content: `<h1>Page not found</h1><p class="lead">This page doesn't exist, or it moved.</p><p><a href="index.html">Home</a> • <a href="guide/introduction.html">Guide</a> • <a href="api/index.html">API reference</a></p>`,
    sidebar: "",
  }).replace('<meta name="nc-root" content="">', `<meta name="nc-root" content="${new URL(SITE.url).pathname}">`).replace(/(href|src)="(assets|index|guide|api)/g, `$1="${new URL(SITE.url).pathname}$2`),
);

// write

fs.rmSync(OUT, { recursive: true, force: true });
for (const [file, html] of pages) {
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.copyFileSync(path.join(ASSETS, "style.css"), path.join(OUT, "assets", "style.css"));
fs.copyFileSync(path.join(ASSETS, "app.js"), path.join(OUT, "assets", "app.js"));
fs.writeFileSync(path.join(OUT, "assets", "favicon.svg"), FAVICON);
fs.writeFileSync(path.join(OUT, "assets", "search-index.js"), `window.__NC_SEARCH__=${JSON.stringify(searchIndex)};\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}sitemap.xml\n`);
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...pages.keys()]
    .filter((f) => f !== "404.html")
    .map((f) => `<url><loc>${SITE.url}${f === "index.html" ? "" : f}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);

// link check

const ids = new Map([...pages].map(([file, html]) => [file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const broken = [];
for (const [file, html] of pages) {
  if (file === "404.html") continue;
  for (const [, href] of html.matchAll(/<(?:a|link)\s[^>]*?href="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(href)) continue;
    const [target, hash] = href.split("#");
    const resolved = target ? path.posix.normalize(path.posix.join(path.posix.dirname(file), target.split("?")[0])) : file;
    const exists = pages.has(resolved) || fs.existsSync(path.join(OUT, resolved));
    if (!exists) broken.push(`${file}: ${href}`);
    else if (hash && pages.has(resolved) && !ids.get(resolved)?.has(decodeURIComponent(hash))) broken.push(`${file}: ${href} (missing anchor)`);
  }
}
if (/—/.test([...pages.values()].join(""))) broken.push("An em dash made it into the site.");
if (broken.length) {
  console.error(`[build-site] ${broken.length} broken link(s):\n  ${broken.slice(0, 40).join("\n  ")}`);
  process.exit(1);
}
console.log(`[build-site] site/: ${pages.size} pages, ${searchIndex.length} search entries, all links OK.`);
