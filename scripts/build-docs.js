"use strict";

// Writes docs/API.md, the complete API reference, from the type declarations.
// It always matches what editors show. Run after build-types.js.

const fs = require("node:fs");
const path = require("node:path");
const { buildModel } = require("./lib/api-model.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "API.md");

const model = buildModel();
const anchor = (/** @type {string} */ heading) => heading.toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/ /g, "-");
const oneLine = (/** @type {string} */ text) => text.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();

/** @type {string[]} */
const out = [];
/** @type {string[]} */
const toc = [];
let functions = 0;

out.push("# API reference", "");
out.push(`> Generated from the type declarations of **${model.package.name}** v${model.package.version}. Your editor shows the same documentation on hover.`);
out.push("> For explanations and examples, see the [guides](https://ix-xs.github.io/node-comfort/).", "");
out.push("__TOC__", "");

out.push("## Flat helpers", "");
out.push("These are also available at the top level: `nc.info()`, `import { isEmail } from \"@ix-xs/node-comfort\"`.", "");
toc.push("- [Flat helpers](#flat-helpers)");
for (const [ns, names] of Object.entries(model.flat)) {
  out.push(`**\`nc.${ns}\`**: ${names.map((n) => `[\`${n}\`](#${anchor(`nc.${ns}.${n}()`)})`).join(" • ")}`, "");
}

for (const ns of model.namespaces) {
  const heading = ns.kind === "class" ? `Class nc.${ns.key}` : `nc.${ns.key}`;
  out.push(`## ${heading}`, "");
  toc.push(`- [${heading}](#${anchor(heading)})`);
  if (ns.description) out.push(ns.description, "");
  out.push(`Import on its own: \`require("${ns.subpath}")\``, "");
  for (const member of ns.members) {
    if (member.signatures.length) {
      functions++;
      const title = member.kind === "constructor" ? member.qualified : `${member.qualified}()`;
      out.push(`#### \`${title}\`${member.deprecated ? " (deprecated)" : ""}`, "");
      out.push("```ts", ...member.signatures.map((s) => s.code), "```", "");
    } else {
      out.push(`#### \`${member.qualified}\``, "", "```ts", `${member.name}: ${member.type}`, "```", "");
    }
    if (member.description) out.push(oneLine(member.description), "");
    if (member.deprecated) out.push(`> Deprecated: ${member.deprecated}`, "");
  }
  if (ns.extra.length) out.push(`**Also available**: ${ns.extra.map((n) => `\`${n}\``).join(" • ")}`, "");
  if (ns.types.length) {
    out.push(`<details><summary>Types (${ns.types.length})</summary>`, "", "| Type | Description |", "| --- | --- |");
    for (const t of ns.types) out.push(`| \`${t.name}\` | ${oneLine(t.description).replace(/\|/g, "\\|") || " "} |`);
    out.push("", "</details>", "");
  }
}

const text = out.join("\n").replace("__TOC__", `## Contents\n\n${toc.join("\n")}`).replace(/\n{3,}/g, "\n\n");
if (/—/.test(text)) {
  console.error("[build-docs] The documentation contains an em dash: replace it in the JSDoc.");
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text.endsWith("\n") ? text : `${text}\n`);
console.log(`[build-docs] docs/API.md: ${model.namespaces.length} namespaces/classes, ${functions} functions and methods.`);
