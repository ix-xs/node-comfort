import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Where the pages of the previous structures went. Every old address keeps
// working: the build writes a redirect for each entry, in every language.
// Each entry points at the page as it is now, never at another redirect.
const PAGES = {
  // Before November 2026: the landing page, the introduction and the pages
  // about versions.
  "/start/introduction/": "/",
  "/start/getting-started/": "/",
  "/start/upgrade-2-2/": "/help/upgrade-2-2/",
  "/start/migration/": "/help/migration/",
  "/start/performance/": "/help/performance/",

  // 3.0: the guided path became a plain documentation. The project built page
  // by page went to the page of each namespace it used, the complete examples
  // too, and the installation is the home page.
  "/start/installation/": "/",
  "/project/setup/": "/essentials/logger/",
  "/project/configuration/": "/start/configuration/",
  "/project/input/": "/essentials/fs/",
  "/project/requests/": "/system/http/",
  "/project/storage/": "/system/sqlite/",
  "/project/command-line/": "/system/cli/",
  "/project/production/": "/basics/resources/",
  "/recipes/": "/system/http/",
  "/recipes/api-server/": "/system/http/",
  "/recipes/cli-tool/": "/system/cli/",
  "/recipes/scheduled-job/": "/data/time/",

  // 3.0: one namespace per page, the errors with the concepts.
  "/essentials/checker/": "/essentials/is/",
  "/essentials/utils/": "/help/upgrade-3-0/",
  "/essentials/errors/": "/basics/errors/",
};

// The pages of the reference of 2.2 and where each one is now, written by
// scripts/build-reference.js at the root of the repository.
// Read from disk rather than imported, so that the site still builds before
// the file exists. Next to this file, or from the docs folder when the config
// runs from a bundled copy.
const referenceFile = [new URL("./src/data/reference-moves.json", import.meta.url), path.resolve("src/data/reference-moves.json")].find((file) => existsSync(file));
const REFERENCE = referenceFile ? JSON.parse(readFileSync(referenceFile, "utf8")) : {};

/** An address that moved twice goes straight to the last one: no redirect leads to another. */
const final = (to, all) => {
  const seen = new Set();
  while (all[to] && !seen.has(to)) {
    seen.add(to);
    to = all[to];
  }
  return to;
};

const ALL = { ...REFERENCE, ...PAGES };
export const MOVED = Object.fromEntries(Object.entries(ALL).map(([from, to]) => [from, final(to, ALL)]));
