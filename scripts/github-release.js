"use strict";

// Publishes the GitHub release of the version in package.json, with its
// section of the changelog as notes. It does nothing when the version has no
// tag yet, or already has its release, so it can run on every push.
//
//   node scripts/github-release.js            creates the release (needs `gh` and GH_TOKEN)
//   node scripts/github-release.js --notes    only prints the notes

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = String(pkg.version);
const tag = `v${version}`;

/** The section of the changelog about one version, without its heading. */
function section() {
  const lines = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8").replace(/\r/g, "").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}`);
  let end = lines.findIndex((line, index) => index > start && /^## \[/.test(line));
  if (end === -1) end = lines.findIndex((line, index) => index > start && /^\[[^\]]+\]: /.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
}

const notes = [`Documentation: ${pkg.homepage}`, "", "```bash", `npm install ${pkg.name}`, "```", "", section(), ""].join("\n");

if (process.argv.includes("--notes")) {
  process.stdout.write(notes);
  process.exit(0);
}

/**
 * @param {string} command
 * @param {string[]} args
 */
const run = (command, args) => spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });

if (run("git", ["rev-parse", "--quiet", "--verify", `refs/tags/${tag}`]).status !== 0) {
  console.log(`[github-release] ${tag} is not tagged yet: nothing to release.`);
  process.exit(0);
}
if (run("gh", ["release", "view", tag]).status === 0) {
  console.log(`[github-release] ${tag} already has its release.`);
  process.exit(0);
}

const file = path.join(ROOT, ".release-notes.md");
fs.writeFileSync(file, notes);
const args = ["release", "create", tag, "--title", tag, "--notes-file", file, "--verify-tag"];
// 3.0.0-beta.1 and the like are not what `npm install` gives.
if (version.includes("-")) args.push("--prerelease");
const created = run("gh", args);
fs.rmSync(file, { force: true });
if (created.status !== 0) {
  console.error(`[github-release] Could not create the release of ${tag}:\n${created.stderr || created.stdout}`);
  process.exit(1);
}
console.log(`[github-release] ${created.stdout.trim()}`);
