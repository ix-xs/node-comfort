// Runs every sample of the landing page's showcase against the package of this
// repository, and writes what each one printed to `src/showcase/output.json`.
// The site only ever shows output that a real run produced.
//
//   node scripts/showcase.mjs
import { spawnSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES } from "../src/showcase/scenes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const samples = path.resolve(here, "..", "src", "showcase", "samples");
const out = path.resolve(here, "..", "src", "showcase", "output.json");
const preload = path.join(here, "showcase-preload.cjs");

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
/** Colour codes are kept, every other escape sequence (cursor, links) is dropped. */
const OTHER_ESCAPES = new RegExp(`${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)|${ESC}\\[[0-9;?]*[A-LN-Za-ln-z]`, "g");
const SGR = new RegExp(`${ESC}\\[([0-9;]*)m`, "g");
const NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

const escapeHTML = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The 256 colours of a terminal, as CSS. The first sixteen follow the theme of the site. */
function indexed(code) {
  if (code < 8) return `var(--nc-ansi-${NAMES[code]})`;
  if (code < 16) return code === 8 ? "var(--nc-ansi-gray)" : `var(--nc-ansi-${NAMES[code - 8]})`;
  if (code >= 232) {
    const level = (code - 232) * 10 + 8;
    return `rgb(${level} ${level} ${level})`;
  }
  const n = code - 16;
  const step = (x) => (x === 0 ? 0 : x * 40 + 55);
  return `rgb(${step(Math.floor(n / 36))} ${step(Math.floor((n % 36) / 6))} ${step(n % 6)})`;
}

/** Terminal output as HTML: one element per line, colours as classes and styles. */
function toHTML(text) {
  const clean = text.replace(/\r\n/g, "\n").replace(OTHER_ESCAPES, "").replace(/\n+$/, "");
  const state = { bold: false, dim: false, italic: false, underline: false, fg: "", bg: "" };
  const open = () => {
    const classes = [state.bold && "b", state.dim && "d", state.italic && "i", state.underline && "u"].filter(Boolean);
    const styles = [state.fg && `color:${state.fg}`, state.bg && `background:${state.bg}`].filter(Boolean);
    if (!classes.length && !styles.length) return "";
    return `<span${classes.length ? ` class="${classes.join(" ")}"` : ""}${styles.length ? ` style="${styles.join(";")}"` : ""}>`;
  };
  const apply = (codes) => {
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) Object.assign(state, { bold: false, dim: false, italic: false, underline: false, fg: "", bg: "" });
      else if (code === 1) state.bold = true;
      else if (code === 2) state.dim = true;
      else if (code === 3) state.italic = true;
      else if (code === 4) state.underline = true;
      else if (code === 22) state.bold = state.dim = false;
      else if (code === 23) state.italic = false;
      else if (code === 24) state.underline = false;
      else if (code >= 30 && code <= 37) state.fg = indexed(code - 30);
      else if (code >= 90 && code <= 97) state.fg = indexed(code - 90 + 8);
      else if (code === 39) state.fg = "";
      else if (code >= 40 && code <= 47) state.bg = indexed(code - 40);
      else if (code >= 100 && code <= 107) state.bg = indexed(code - 100 + 8);
      else if (code === 49) state.bg = "";
      else if (code === 38 || code === 48) {
        const colour = codes[i + 1] === 5 ? indexed(codes[i + 2]) : `rgb(${codes[i + 2]} ${codes[i + 3]} ${codes[i + 4]})`;
        if (code === 38) state.fg = colour;
        else state.bg = colour;
        i += codes[i + 1] === 5 ? 2 : 4;
      }
    }
  };
  return clean
    .split("\n")
    .map((line) => {
      let html = "";
      let last = 0;
      let opened = open();
      html += opened;
      for (const match of line.matchAll(SGR)) {
        html += escapeHTML(line.slice(last, match.index));
        if (opened) html += "</span>";
        apply(match[1] === "" ? [0] : match[1].split(";").map(Number));
        opened = open();
        html += opened;
        last = match.index + match[0].length;
      }
      html += escapeHTML(line.slice(last));
      if (opened) html += "</span>";
      // A colour that was switched on and off again with nothing in between leaves an empty element.
      html = html.replaceAll(/<span[^>]*><[/]span>/g, "");
      return `<span class="nc-line">${html || " "}</span>`;
    })
    // Each line is a block of its own: a line break between two would show as an empty line.
    .join("");
}

const scratch = mkdtempSync(path.join(tmpdir(), "nc-showcase-"));
const result = {};
let failed = false;
for (const scene of SCENES) {
  result[scene.id] = {};
  for (const variant of scene.variants) {
    const file = path.join(samples, scene.id, `${variant.id}.js`);
    const log = path.join(scratch, "out.txt");
    const clock = path.join(scratch, "ms.txt");
    // One file for stdout and stderr, so lines stay in the order they were written.
    const fd = openSync(log, "w");
    const env = { ...process.env, FORCE_COLOR: "3", COLUMNS: "76", TZ: "UTC", NC_SHOWCASE_CLOCK: clock, NODE_COMFORT_DOTENV: "false", NODE_NO_WARNINGS: "1" };
    for (const name of ["CI", "NO_COLOR", "LOG_LEVEL", "LOG_FORMAT", "DEBUG", "GITHUB_ACTIONS"]) delete env[name];
    const run = spawnSync(process.execPath, ["--require", preload, file], { cwd: path.dirname(file), env, stdio: ["ignore", fd, fd], timeout: 30_000 });
    closeSync(fd);
    const text = readFileSync(log, "utf8");
    if (run.status !== 0) {
      failed = true;
      console.error(`✗ ${scene.id}/${variant.id} exited with ${run.status ?? run.signal}\n${text}`);
      continue;
    }
    let ms = 0;
    try {
      ms = Number(readFileSync(clock, "utf8"));
    } catch {
      // The sample left before the clock was written: show no time.
    }
    result[scene.id][variant.id] = { code: readFileSync(file, "utf8").replace(/\r\n/g, "\n").trimEnd(), html: toHTML(text), ms: Math.max(1, Math.round(ms)) };
  }
}
rmSync(scratch, { recursive: true, force: true });
if (failed) process.exit(1);
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`✓ showcase: ${SCENES.reduce((n, scene) => n + scene.variants.length, 0)} samples ran`);
