// The site of version 2.0 had addresses like /guide/logger.html and
// /api/str.html. Links to them are out there (articles, answers, bookmarks):
// after a build, this writes a small page at each old address that sends the
// reader to the new one, with the #section they asked for.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBase } from "../plugins/base-links.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "..", "dist");
const base = normalizeBase(process.env.DOCS_BASE || "/node-comfort");

const SECTIONS = {
  start: ["introduction", "getting-started", "editor", "performance", "migration"],
  essentials: ["logger", "fs", "checker", "env", "errors", "utils"],
  data: ["str", "num", "arr", "obj", "time", "id", "schema"],
  flow: ["func", "async", "cache", "emitter"],
  system: ["http", "sqlite", "cli", "color", "sys", "crypto"],
};

/** Old file, relative to the site -> new address, without the base. */
const moved = new Map([
  ["guide/recipes.html", "/recipes/"],
  ["api/index.html", "/reference/"],
]);
for (const [section, pages] of Object.entries(SECTIONS)) {
  for (const page of pages) moved.set(`guide/${page}.html`, `/${section}/${page}/`);
}
for (const page of [...SECTIONS.essentials, ...SECTIONS.data, ...SECTIONS.flow, ...SECTIONS.system]) {
  moved.set(`api/${page}.html`, `/reference/${page}/`);
}

for (const [file, to] of moved) {
  const target = `${base}${to}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>This page moved</title>
<link rel="canonical" href="${target}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.hash);</script>
</head>
<body>
<p>This page moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
  const out = path.join(dist, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
}
console.log(`✓ ${moved.size} old addresses point to their new page`);
