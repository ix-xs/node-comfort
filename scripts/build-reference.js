"use strict";

// Writes the reference pages of the documentation site from the type
// declarations: one page per namespace, and one that lists every export.
// They always say what editors show. Run after build-types.js.
//
// The English pages come straight from the JSDoc. The pages of another
// language are the same pages, with each sentence replaced by its translation
// from docs/src/reference-i18n/<language>/<namespace>.json. A sentence that
// has no translation yet stays in English, and is reported.
//
//   node scripts/build-reference.js             writes the pages
//   node scripts/build-reference.js --check     fails if a page is out of date
//   node scripts/build-reference.js --missing   lists what is not translated yet
//   node scripts/build-reference.js --strict    also fails when something is not translated

const fs = require("node:fs");
const path = require("node:path");
const { buildModel } = require("./lib/api-model.js");

const ROOT = path.resolve(__dirname, "..");
const CONTENT = path.join(ROOT, "docs", "src", "content", "docs");
const CATALOGS = path.join(ROOT, "docs", "src", "reference-i18n");
const CHECK = process.argv.includes("--check");
const MISSING = process.argv.includes("--missing");
const STRICT = process.argv.includes("--strict");

const GROUPS = [
  { title: "Essentials", keys: ["logger", "fs", "checker", "env", "errors", "utils"] },
  { title: "Data", keys: ["str", "num", "arr", "obj", "time", "id", "schema"] },
  { title: "Functions and async", keys: ["func", "async", "Cache", "Emitter"] },
  { title: "System and network", keys: ["http", "SQLite", "cli", "color", "sys", "crypto"] },
];

/** Where the guide of each namespace lives on the site. */
const GUIDES = /** @type {Record<string, string>} */ ({
  logger: "/essentials/logger/", fs: "/essentials/fs/", checker: "/essentials/checker/", env: "/essentials/env/", errors: "/essentials/errors/", utils: "/essentials/utils/",
  str: "/data/str/", num: "/data/num/", arr: "/data/arr/", obj: "/data/obj/", time: "/data/time/", id: "/data/id/", schema: "/data/schema/",
  func: "/flow/func/", async: "/flow/async/", Cache: "/flow/cache/", Emitter: "/flow/emitter/",
  http: "/system/http/", SQLite: "/system/sqlite/", cli: "/system/cli/", color: "/system/color/", sys: "/system/sys/", crypto: "/system/crypto/",
});

/**
 * The words the pages are built with, around what the JSDoc says.
 * @typedef {typeof WORDS.en} Words
 */
const WORDS = {
  en: {
    folder: "",
    colon: ": ",
    orAlone: "// or on its own, which loads nothing else",
    topLevel: (/** @type {string} */ flat, /** @type {string} */ full) => `These functions are also at the top level: \`${flat}\` is \`${full}\`.`,
    lists: (/** @type {string} */ display, /** @type {string} */ guide) => `This page lists everything \`${display}\` has, as your editor shows it. For explanations and longer examples, read [the guide](${guide}).`,
    deprecated: "Deprecated",
    avoid: "Avoid it in new code.",
    parameters: "| Parameter | Type | Description |",
    properties: "| Property | Type | Description |",
    defaultsTo: (/** @type {string} */ value) => `Defaults to \`${value}\`.`,
    returns: "Returns",
    throws: "Throws",
    also: "Also available",
    types: "Types",
    typesIntro: (/** @type {string} */ statement) => `The types behind the options and results above. In TypeScript, import them from the package: \`${statement}\`.`,
    all: "All exports",
    everything: (/** @type {string} */ name, /** @type {string} */ version, /** @type {number} */ spaces, /** @type {number} */ functions) =>
      `Everything in ${name} ${version}: ${spaces} namespaces and classes, ${functions} functions and methods, each with a line that says what it does.`,
    written: "This page is written from the source code, like the documentation your editor shows on hover. Search it with your browser to find out whether something exists, then follow the link for the details.",
    groups: /** @type {Record<string, string>} */ ({}),
    reference: "Reference",
    guide: "Guide",
    names: "| Name | What it does |",
    deprecatedShort: "Deprecated.",
  },
  fr: {
    folder: "fr",
    colon: " : ",
    orAlone: "// ou seul, ce qui ne charge rien d'autre",
    topLevel: (/** @type {string} */ flat, /** @type {string} */ full) => `Ces fonctions existent aussi à la racine : \`${flat}\` équivaut à \`${full}\`.`,
    lists: (/** @type {string} */ display, /** @type {string} */ guide) => `Cette page liste tout ce que contient \`${display}\`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](${guide}).`,
    deprecated: "Obsolète",
    avoid: "À éviter dans du nouveau code.",
    parameters: "| Paramètre | Type | Description |",
    properties: "| Propriété | Type | Description |",
    defaultsTo: (/** @type {string} */ value) => `Par défaut : \`${value}\`.`,
    returns: "Renvoie",
    throws: "Lève",
    also: "Également disponibles",
    types: "Types",
    typesIntro: (/** @type {string} */ statement) => `Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : \`${statement}\`.`,
    all: "Tous les exports",
    everything: (/** @type {string} */ name, /** @type {string} */ version, /** @type {number} */ spaces, /** @type {number} */ functions) =>
      `Tout ce que contient ${name} ${version} : ${spaces} espaces de noms et classes, ${functions} fonctions et méthodes, avec pour chacune une ligne qui dit ce qu'elle fait.`,
    written: "Cette page est écrite à partir du code source, comme la documentation que votre éditeur affiche au survol. Cherchez-y avec votre navigateur pour savoir si quelque chose existe, puis suivez le lien pour le détail.",
    groups: /** @type {Record<string, string>} */ ({ Essentials: "Essentiels", Data: "Données", "Functions and async": "Fonctions et asynchrone", "System and network": "Système et réseau" }),
    reference: "Référence",
    guide: "Guide",
    names: "| Nom | Rôle |",
    deprecatedShort: "Obsolète.",
  },
};

const model = buildModel();
const namespaces = new Map(model.namespaces.map((ns) => [ns.key, ns]));
const order = GROUPS.flatMap((group) => group.keys);
for (const key of namespaces.keys()) if (!order.includes(key)) throw new Error(`nc.${key} is in no group: add it to GROUPS and GUIDES in scripts/build-reference.js`);

const pageOf = (/** @type {string} */ key) => `/reference/${key.toLowerCase()}/`;
const displayOf = (/** @type {import("./lib/api-model.js").Namespace} */ ns) => (ns.kind === "class" ? ns.key : `nc.${ns.key}`);
/** The id Starlight gives a heading made of this text. */
const anchor = (/** @type {string} */ heading) => heading.toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/ /g, "-");
const firstSentence = (/** @type {string} */ text) => {
  const paragraph = text.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
  const end = /[.!?](?=\s+[\p{Lu}`]|$)/u.exec(paragraph);
  return end ? paragraph.slice(0, end.index + 1) : paragraph;
};
const yaml = (/** @type {string} */ text) => JSON.stringify(text);
const cell = (/** @type {string} */ text) => text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();

/**
 * The name a paragraph has in a catalog: its text on one line. A table keeps
 * its lines.
 * @param {string} block
 */
const keyOf = (block) => (/^\s*\|/m.test(block) ? block.trim() : block.replace(/\s*\n\s*/g, " ").trim());

/** Code without its comments and its spacing: what a translation must leave alone. */
const bare = (/** @type {string} */ code) => code.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((line) => line.replace(/(^|\s)\/\/.*$/, "$1")).join("\n").replace(/\s+/g, "");

/**
 * What turns the sentences of a namespace into another language.
 * @param {string} language
 * @param {string} key The namespace.
 */
const translator = (language, key) => {
  const file = path.join(CATALOGS, language, `${key.toLowerCase()}.json`);
  /** @type {Record<string, string>} */
  const catalog = language !== "en" && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  /** @type {Set<string>} */
  const used = new Set();
  /** @type {Set<string>} */
  const missing = new Set();
  return {
    file,
    used,
    missing,
    catalog,
    /**
     * A description, paragraph by paragraph.
     * @param {string} text
     */
    text(text) {
      if (language === "en" || !text) return text;
      return text.split(/\n\s*\n/).map((block) => {
        const name = keyOf(block);
        if (!name) return block;
        const translated = Object.hasOwn(catalog, name) ? catalog[name] : undefined;
        if (!translated) {
          missing.add(name);
          return block;
        }
        used.add(name);
        return translated;
      }).join("\n\n");
    },
    /**
     * An example, when its comments were translated. The code must be the same.
     * @param {string} code
     */
    example(code) {
      if (language === "en") return code;
      const translated = Object.hasOwn(catalog, code) ? catalog[code] : undefined;
      if (!translated) return code;
      if (bare(translated) !== bare(code)) throw new Error(`${path.relative(ROOT, file)}: the translation of an example changes its code, only comments may change:\n${code}`);
      used.add(code);
      return translated;
    },
  };
};

/**
 * A type as Markdown: code, where the names of documented types are links.
 * @param {string} type
 * @param {string} here The namespace of the page being written.
 */
const typeLinks = (type, here) => {
  const parts = type.split(/\b([A-Z]\w*)\b/);
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const owner = i % 2 === 1 ? model.typeOwners[part] : undefined;
    const code = `\`${part.replace(/`/g, "'")}\``;
    out += owner ? `[${code}](${owner === here ? "" : pageOf(owner)}#${anchor(part)})` : code;
  }
  return out;
};

/**
 * @param {import("./lib/api-model.js").Namespace} ns
 * @param {number} position
 * @param {Words} words
 * @param {ReturnType<typeof translator>} tr
 */
const namespacePage = (ns, position, words, tr) => {
  const display = displayOf(ns);
  const [lead, ...rest] = tr.text(ns.description).split(/\n\s*\n/);
  /** @type {string[]} */
  const out = [
    "---",
    `title: ${yaml(display)}`,
    `description: ${yaml(lead.replace(/\s*\n\s*/g, " ").trim())}`,
    "sidebar:",
    `  label: ${yaml(ns.key)}`,
    `  order: ${position}`,
    "---",
    "",
  ];
  if (rest.length) out.push(rest.join("\n\n"), "");
  out.push("```js", `const { ${ns.key} } = require("${model.package.name}");`, words.orAlone, `const ${ns.key} = require("${ns.subpath}");`, "```", "");
  if (ns.flat) out.push(words.topLevel(`nc.${ns.members[0]?.name}()`, `nc.${ns.key}.${ns.members[0]?.name}()`), "");
  out.push(words.lists(display, GUIDES[ns.key]), "");
  for (const example of ns.examples) out.push("```js", tr.example(example), "```", "");

  for (const member of ns.members) {
    const heading = member.kind === "constructor" ? "constructor" : member.name;
    out.push(`## ${heading}`, "");
    if (member.deprecated !== undefined) out.push(`:::caution[${words.deprecated}]`, member.deprecated ? tr.text(member.deprecated) : words.avoid, ":::", "");
    if (!member.signatures.length) {
      out.push("```ts", `${member.name}: ${member.type}`, "```", "");
      if (member.description) out.push(tr.text(member.description), "");
      continue;
    }
    out.push("```ts", ...member.signatures.map((signature) => signature.code), "```", "");
    if (member.description) out.push(tr.text(member.description), "");
    // With overloads, the last signature is the one that takes everything.
    const signature = member.signatures[member.signatures.length - 1];
    const described = signature.params.filter((param) => param.description || param.defaultValue !== undefined);
    if (signature.params.length && described.length) {
      out.push(words.parameters, "| --- | --- | --- |");
      for (const param of signature.params) {
        const name = `\`${param.rest ? "..." : ""}${param.name}${param.optional ? "?" : ""}\``;
        const notes = [tr.text(param.description), param.defaultValue !== undefined && !param.description.includes("Defaults to") ? words.defaultsTo(param.defaultValue) : ""].filter(Boolean).join(" ");
        out.push(`| ${name} | ${cell(typeLinks(param.type, ns.key))} | ${cell(notes)} |`);
      }
      out.push("");
    }
    if (signature.returns?.description) out.push(`**${words.returns}** ${typeLinks(signature.returns.type, ns.key)}${words.colon}${tr.text(signature.returns.description)}`, "");
    for (const thrown of signature.throws) out.push(`**${words.throws}** ${thrown.type ? `\`${thrown.type}\`` : ""}${thrown.description ? `${thrown.type ? words.colon : ""}${tr.text(thrown.description)}` : ""}`.trimEnd(), "");
    const examples = [...new Set(member.signatures.flatMap((s) => s.examples))];
    for (const example of examples) out.push("```js", tr.example(example), "```", "");
  }

  if (ns.extra.length) out.push(`## ${words.also}`, "", ns.extra.map((name) => `\`${name}\``).join(" • "), "");

  if (ns.types.length) {
    out.push(`## ${words.types}`, "", words.typesIntro(`import type { ${ns.types[0].name} } from "${model.package.name}"`), "");
    for (const type of ns.types) {
      out.push(`### ${type.name}`, "");
      if (type.description) out.push(tr.text(type.description), "");
      if (type.properties.length) {
        out.push(words.properties, "| --- | --- | --- |");
        for (const property of type.properties) {
          out.push(`| \`${property.name}${property.optional ? "?" : ""}\` | ${cell(typeLinks(property.type, ns.key))} | ${cell(tr.text(property.description))} |`);
        }
        out.push("");
      } else if (type.definition) {
        out.push("```ts", `type ${type.name} = ${type.definition}`, "```", "");
      }
    }
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
};

/**
 * @param {Words} words
 * @param {Map<string, ReturnType<typeof translator>>} translators
 */
const indexPage = (words, translators) => {
  let functions = 0;
  for (const ns of model.namespaces) functions += ns.members.filter((member) => member.signatures.length).length;
  /** @type {string[]} */
  const out = [
    "---",
    `title: ${yaml(words.all)}`,
    `description: ${yaml(words.everything(model.package.name, model.package.version, model.namespaces.length, functions))}`,
    "sidebar:",
    `  label: ${yaml(words.all)}`,
    "  order: 0",
    "---",
    "",
    words.written,
    "",
  ];
  for (const group of GROUPS) {
    out.push(`## ${words.groups[group.title] ?? group.title}`, "");
    for (const key of group.keys) {
      const ns = /** @type {import("./lib/api-model.js").Namespace} */ (namespaces.get(key));
      const tr = /** @type {ReturnType<typeof translator>} */ (translators.get(key));
      out.push(`### ${displayOf(ns)}`, "", `${firstSentence(tr.text(ns.description))} [${words.reference}](${pageOf(key)}) • [${words.guide}](${GUIDES[key]})`, "", words.names, "| --- | --- |");
      for (const member of ns.members) {
        const name = member.kind === "constructor" ? `new ${key}()` : member.signatures.length ? `${member.name}()` : member.name;
        const heading = member.kind === "constructor" ? "constructor" : member.name;
        const first = firstSentence(tr.text(member.description));
        const summary = member.deprecated !== undefined ? `${words.deprecatedShort} ${first}` : first;
        out.push(`| [\`${name}\`](${pageOf(key)}#${anchor(heading)}) | ${cell(summary)} |`);
      }
      out.push("");
    }
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
};

const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
let untranslated = 0;
let failed = false;

for (const [language, words] of /** @type {Array<[keyof typeof WORDS, Words]>} */ (Object.entries(WORDS))) {
  const out = path.join(CONTENT, words.folder, "reference");
  const translators = new Map(order.map((key) => [key, translator(language, key)]));
  /** @type {Map<string, string>} */
  const pages = new Map();
  order.forEach((key, index) => pages.set(`${key.toLowerCase()}.md`, namespacePage(/** @type {import("./lib/api-model.js").Namespace} */ (namespaces.get(key)), index + 1, words, /** @type {ReturnType<typeof translator>} */ (translators.get(key)))));
  pages.set("index.md", indexPage(words, translators));
  const label = `docs/src/content/docs/${words.folder ? `${words.folder}/` : ""}reference`;

  for (const [file, text] of pages) {
    if (DASHES.test(text)) {
      console.error(`[build-reference] ${label}/${file} contains an em or en dash: replace it in the JSDoc${language === "en" ? "" : " or in its translation"}.`);
      process.exit(1);
    }
  }

  if (language !== "en") {
    let missing = 0;
    let unused = 0;
    for (const [key, tr] of translators) {
      const stale = Object.keys(tr.catalog).filter((name) => !tr.used.has(name));
      missing += tr.missing.size;
      unused += stale.length;
      if (MISSING) {
        for (const name of tr.missing) console.log(`[${language}] ${key}: not translated: ${JSON.stringify(name)}`);
        for (const name of stale) console.log(`[${language}] ${key}: no longer used: ${JSON.stringify(name)}`);
      }
    }
    untranslated += missing;
    if (missing || unused) console.log(`[build-reference] ${language}: ${missing} sentence(s) not translated yet, ${unused} translation(s) no longer used. \`node scripts/build-reference.js --missing\` lists them.`);
  }

  if (CHECK) {
    const stale = [...pages].filter(([file, text]) => !fs.existsSync(path.join(out, file)) || fs.readFileSync(path.join(out, file), "utf8").replace(/\r\n/g, "\n") !== text).map(([file]) => file);
    const extra = fs.existsSync(out) ? fs.readdirSync(out).filter((file) => !pages.has(file)) : [];
    if (stale.length || extra.length) {
      console.error(`[build-reference] ${label} is out of date (${[...stale, ...extra].join(", ")}). Run \`npm run build\` and commit the result.`);
      failed = true;
    } else console.log(`[build-reference] OK: ${pages.size} pages of ${label} match the source.`);
  } else {
    fs.mkdirSync(out, { recursive: true });
    for (const file of fs.readdirSync(out)) if (!pages.has(file)) fs.rmSync(path.join(out, file));
    for (const [file, text] of pages) fs.writeFileSync(path.join(out, file), text);
    console.log(`[build-reference] ${pages.size} pages in ${label}.`);
  }
}

if (STRICT && untranslated) {
  console.error(`[build-reference] ${untranslated} sentence(s) have no translation.`);
  failed = true;
}
if (failed) process.exit(1);
