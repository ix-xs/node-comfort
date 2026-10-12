"use strict";

// Writes the reference pages of the documentation site from the type
// declarations: one page per namespace, and one that lists every export.
// They always say what editors show. Run after build-types.js.
//
//   node scripts/build-reference.js          writes the pages
//   node scripts/build-reference.js --check  fails if a page is out of date

const fs = require("node:fs");
const path = require("node:path");
const { buildModel } = require("./lib/api-model.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "src", "content", "docs", "reference");
const CHECK = process.argv.includes("--check");

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
  const end = /[.!?](?=\s+[A-Z`]|$)/.exec(paragraph);
  return end ? paragraph.slice(0, end.index + 1) : paragraph;
};
const yaml = (/** @type {string} */ text) => JSON.stringify(text);
const cell = (/** @type {string} */ text) => text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();

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
 */
const namespacePage = (ns, position) => {
  const display = displayOf(ns);
  const [lead, ...rest] = ns.description.split(/\n\s*\n/);
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
  const variable = ns.kind === "class" ? ns.key : ns.key;
  out.push("```js", `const { ${variable} } = require("${model.package.name}");`, "// or on its own, which loads nothing else", `const ${variable} = require("${ns.subpath}");`, "```", "");
  if (ns.flat) out.push(`These functions are also at the top level: \`nc.${ns.members[0]?.name}()\` is \`nc.${ns.key}.${ns.members[0]?.name}()\`.`, "");
  out.push(`This page lists everything \`${display}\` has, as your editor shows it. For explanations and longer examples, read [the guide](${GUIDES[ns.key]}).`, "");
  for (const example of ns.examples) out.push("```js", example, "```", "");

  for (const member of ns.members) {
    const heading = member.kind === "constructor" ? "constructor" : member.name;
    out.push(`## ${heading}`, "");
    if (member.deprecated !== undefined) out.push(`:::caution[Deprecated]`, member.deprecated || "Avoid it in new code.", ":::", "");
    if (!member.signatures.length) {
      out.push("```ts", `${member.name}: ${member.type}`, "```", "");
      if (member.description) out.push(member.description, "");
      continue;
    }
    out.push("```ts", ...member.signatures.map((signature) => signature.code), "```", "");
    if (member.description) out.push(member.description, "");
    // With overloads, the last signature is the one that takes everything.
    const signature = member.signatures[member.signatures.length - 1];
    const described = signature.params.filter((param) => param.description || param.defaultValue !== undefined);
    if (signature.params.length && described.length) {
      out.push("| Parameter | Type | Description |", "| --- | --- | --- |");
      for (const param of signature.params) {
        const name = `\`${param.rest ? "..." : ""}${param.name}${param.optional ? "?" : ""}\``;
        const notes = [param.description, param.defaultValue !== undefined && !param.description.includes("Defaults to") ? `Defaults to \`${param.defaultValue}\`.` : ""].filter(Boolean).join(" ");
        out.push(`| ${name} | ${cell(typeLinks(param.type, ns.key))} | ${cell(notes)} |`);
      }
      out.push("");
    }
    if (signature.returns?.description) out.push(`**Returns** ${typeLinks(signature.returns.type, ns.key)}: ${signature.returns.description}`, "");
    for (const thrown of signature.throws) out.push(`**Throws** ${thrown.type ? `\`${thrown.type}\`` : ""}${thrown.description ? `${thrown.type ? ": " : ""}${thrown.description}` : ""}`.trimEnd(), "");
    const examples = [...new Set(member.signatures.flatMap((s) => s.examples))];
    for (const example of examples) out.push("```js", example, "```", "");
  }

  if (ns.extra.length) out.push("## Also available", "", ns.extra.map((name) => `\`${name}\``).join(" • "), "");

  if (ns.types.length) {
    out.push("## Types", "", `The types behind the options and results above. In TypeScript, import them from the package: \`import type { ${ns.types[0].name} } from "${model.package.name}"\`.`, "");
    for (const type of ns.types) {
      out.push(`### ${type.name}`, "");
      if (type.description) out.push(type.description, "");
      if (type.properties.length) {
        out.push("| Property | Type | Description |", "| --- | --- | --- |");
        for (const property of type.properties) {
          out.push(`| \`${property.name}${property.optional ? "?" : ""}\` | ${cell(typeLinks(property.type, ns.key))} | ${cell(property.description)} |`);
        }
        out.push("");
      } else if (type.definition) {
        out.push("```ts", `type ${type.name} = ${type.definition}`, "```", "");
      }
    }
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
};

const indexPage = () => {
  let functions = 0;
  for (const ns of model.namespaces) functions += ns.members.filter((member) => member.signatures.length).length;
  /** @type {string[]} */
  const out = [
    "---",
    'title: "All exports"',
    `description: ${yaml(`Everything in ${model.package.name} ${model.package.version}: ${model.namespaces.length} namespaces and classes, ${functions} functions and methods, each with a line that says what it does.`)}`,
    "sidebar:",
    '  label: "All exports"',
    "  order: 0",
    "---",
    "",
    "This page is written from the source code, like the documentation your editor shows on hover. Search it with your browser to find out whether something exists, then follow the link for the details.",
    "",
  ];
  for (const group of GROUPS) {
    out.push(`## ${group.title}`, "");
    for (const key of group.keys) {
      const ns = /** @type {import("./lib/api-model.js").Namespace} */ (namespaces.get(key));
      out.push(`### ${displayOf(ns)}`, "", `${firstSentence(ns.description)} [Reference](${pageOf(key)}) • [Guide](${GUIDES[key]})`, "", "| Name | What it does |", "| --- | --- |");
      for (const member of ns.members) {
        const name = member.kind === "constructor" ? `new ${key}()` : member.signatures.length ? `${member.name}()` : member.name;
        const heading = member.kind === "constructor" ? "constructor" : member.name;
        const summary = member.deprecated !== undefined ? `Deprecated. ${firstSentence(member.description)}` : firstSentence(member.description);
        out.push(`| [\`${name}\`](${pageOf(key)}#${anchor(heading)}) | ${cell(summary)} |`);
      }
      out.push("");
    }
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
};

/** @type {Map<string, string>} */
const pages = new Map([["index.md", indexPage()]]);
order.forEach((key, index) => pages.set(`${key.toLowerCase()}.md`, namespacePage(/** @type {import("./lib/api-model.js").Namespace} */ (namespaces.get(key)), index + 1)));

const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
for (const [file, text] of pages) {
  if (DASHES.test(text)) {
    console.error(`[build-reference] ${file} contains an em or en dash: replace it in the JSDoc.`);
    process.exit(1);
  }
}

if (CHECK) {
  const stale = [...pages].filter(([file, text]) => !fs.existsSync(path.join(OUT, file)) || fs.readFileSync(path.join(OUT, file), "utf8").replace(/\r\n/g, "\n") !== text).map(([file]) => file);
  const extra = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((file) => !pages.has(file)) : [];
  if (stale.length || extra.length) {
    console.error(`[build-reference] The reference is out of date (${[...stale, ...extra].join(", ")}). Run \`npm run build\` and commit the result.`);
    process.exit(1);
  }
  console.log(`[build-reference] OK: ${pages.size} reference pages match the source.`);
} else {
  fs.mkdirSync(OUT, { recursive: true });
  for (const file of fs.readdirSync(OUT)) if (!pages.has(file)) fs.rmSync(path.join(OUT, file));
  for (const [file, text] of pages) fs.writeFileSync(path.join(OUT, file), text);
  console.log(`[build-reference] ${pages.size} pages in docs/src/content/docs/reference.`);
}
