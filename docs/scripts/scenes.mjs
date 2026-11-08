// Runs every scene of the guide against the package of this repository, and
// writes what each one printed to `src/scenes/output.json`. A page shows a
// scene with <TerminalDemo scene="project/setup/first-run" />: the command,
// then what the program printed when this script ran it. Nothing in a scene is
// written by hand but the command.
//
//   node scripts/scenes.mjs
//
// The scenes are listed in `src/scenes/scenes.mjs`. Each one runs in a folder
// of its own, made of the files the reader has at that point of the guide,
// and each of these files must appear, as it is, in a code block of its page:
// the code a reader copies is the code that ran.
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLOCK, PROJECT, SCENES, SITES } from "../src/scenes/scenes.mjs";
import { LOCALES } from "../plugins/base-links.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const scenes = path.resolve(here, "..", "src", "scenes");
const pages = path.resolve(here, "..", "src", "content", "docs");
const out = path.join(scenes, "output.json");
const preload = path.join(here, "scenes-preload.cjs");

/** A pause longer than this, between two things the program printed, is shown as one. */
const PAUSE = 250;
/** How many scenes run at the same time. */
const PARALLEL = 4;

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

/** Lines of terminal output as HTML, one element per line, colours as classes and styles. */
function toHTML(lines) {
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
  return lines.map((raw) => {
    const line = raw.replace(OTHER_ESCAPES, "");
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
  });
}

/**
 * What a terminal shows once the program is done, cut where the program
 * wrote: the lines that one write finished make one unit, shown at once. A
 * line that is drawn again and again (a spinner) keeps its last drawing.
 *
 * @param {Array<[number, string]>} writes when each write happened, and what it wrote
 */
function toUnits(writes) {
  const units = [];
  let current = "";
  // Counted from the first write, not from the start of Node.js, which a slower machine takes longer to do.
  let previous = writes[0]?.[0] ?? 0;
  for (const [at, text] of writes) {
    const lines = [];
    const pieces = text.replace(/\r\n/g, "\n").split("\n");
    pieces.forEach((piece, index) => {
      current += piece;
      // A carriage return goes back to the start of the line: what follows it is drawn over.
      const back = current.lastIndexOf("\r");
      if (back !== -1) current = current.slice(back + 1);
      if (index < pieces.length - 1) {
        lines.push(current);
        current = "";
      }
    });
    if (lines.length === 0) continue;
    units.push({ lines, wait: at - previous > PAUSE });
    previous = at;
  }
  if (visible(current) !== "") units.push({ lines: [current], wait: false });
  // A line of escape sequences only (the cursor shown again) is not a line on screen.
  return units.filter((unit) => !unit.lines.every((line) => line !== "" && visible(line) === ""));
}

/** The text of a line once its escape sequences are gone. */
const visible = (line) => line.replace(OTHER_ESCAPES, "").replace(SGR, "");

/** The words of a command, with the variables set before it. */
function parse(command) {
  const words = command.match(/"[^"]*"|\S+/g).map((word) => word.replace(/^"|"$/g, ""));
  const env = {};
  while (/^[A-Z_][A-Z0-9_]*=/.test(words[0])) {
    const [name, ...value] = words.shift().split("=");
    env[name] = value.join("=");
  }
  return { env, words };
}

/** The site of `SITES` that a request is for, answered as that site would. */
function siteServer() {
  const seen = new Map();
  const server = createServer((req, res) => {
    const host = String(req.headers["x-scene-host"] ?? "");
    const count = (seen.get(host) ?? 0) + 1;
    seen.set(host, count);
    const site = SITES[host];
    const answer = site?.answers[Math.min(count, site.answers.length) - 1] ?? { status: 404 };
    res.writeHead(answer.status, { "content-type": answer.type ?? "text/html; charset=utf-8" });
    res.end(answer.body ?? "");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

/** A port where nothing listens: the one a server just left. */
async function closedPort() {
  const server = await new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/** The files a scene puts in its folder: the destination, and the source under `src/scenes/`. */
function filesOf(scene) {
  const files = new Map();
  if (scene.step) {
    for (const step of PROJECT.slice(0, PROJECT.indexOf(scene.step) + 1)) {
      const folder = path.join(scenes, "project", step);
      if (!existsSync(folder)) continue;
      for (const name of readdirSync(folder)) {
        if (statSync(path.join(folder, name)).isFile()) files.set(name.replace(/^dot-/, "."), `project/${step}/${name}`);
      }
    }
  }
  for (const [to, from] of Object.entries(scene.files ?? {})) files.set(to, from);
  for (const name of scene.without ?? []) files.delete(name);
  return files;
}

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

function spawnRun(scene, folder, env) {
  const { env: vars, words } = parse(scene.command);
  // A scene can stand for a command that is not a script, like `node --version`.
  const args = scene.run ? [path.join(scenes, scene.run)] : words.slice(1);
  if (words[0] !== "node") throw new Error(`${scene.id}: only node commands can run, not "${words[0]}"`);
  const log = path.join(folder, "..", `${path.basename(folder)}.out`);
  const record = path.join(folder, "..", `${path.basename(folder)}.json`);
  const fd = openSync(log, "w");
  return new Promise((resolve) => {
    // One file for stdout and stderr, so lines stay in the order they were written.
    const child = spawn(process.execPath, ["--require", preload, ...args], {
      cwd: folder,
      env: { ...env, ...vars, NC_SCENE_RECORD: record },
      stdio: ["ignore", fd, fd],
      timeout: 30_000,
    });
    child.on("close", (code, signal) => {
      closeSync(fd);
      const text = read(log);
      let writes = [];
      try {
        writes = JSON.parse(readFileSync(record, "utf8"));
      } catch {
        // The process ended before it could say when it wrote: show it all at once.
      }
      const joined = writes.map(([, chunk]) => chunk).join("").replace(/\r\n/g, "\n");
      // What Node writes itself (an uncaught error) does not go through the streams: it comes last.
      if (!text.startsWith(joined)) writes = [[0, text]];
      else if (text.length > joined.length) writes.push([writes.at(-1)?.[0] ?? 0, text.slice(joined.length)]);
      rmSync(log, { force: true });
      rmSync(record, { force: true });
      resolve({ code: code ?? signal, writes, text });
    });
  });
}

async function runScene(scene, scratch) {
  const folder = mkdtempSync(path.join(scratch, "scene-"));
  // What `npm init -y` leaves: the files of the project are CommonJS.
  writeFileSync(path.join(folder, "package.json"), `${JSON.stringify({ name: "status", version: "1.0.0", type: "commonjs" }, null, 2)}\n`);
  for (const [to, from] of filesOf(scene)) {
    mkdirSync(path.dirname(path.join(folder, to)), { recursive: true });
    cpSync(path.join(scenes, from), path.join(folder, to));
  }
  const env = { ...process.env, FORCE_COLOR: "3", COLUMNS: "80", TZ: "UTC", NODE_NO_WARNINGS: "1", NC_SCENE_TTY: "1", NC_SCENE_CLOCK: CLOCK };
  for (const name of ["CI", "NO_COLOR", "LOG_LEVEL", "LOG_FORMAT", "DEBUG", "NODE_DEBUG", "GITHUB_ACTIONS", "TERM", "NODE_COMFORT_DOTENV"]) delete env[name];
  if (scene.interrupt) env.NC_SCENE_INTERRUPT = String(scene.interrupt);
  let server;
  if (scene.network) {
    server = await siteServer();
    env.NC_SCENE_NET = String(server.address().port);
    env.NC_SCENE_CLOSED = String(await closedPort());
    env.NC_SCENE_REFUSED = Object.entries(SITES).filter(([, site]) => site.refused).map(([host]) => host).join(",");
  }
  try {
    for (let i = 0; i < (scene.before ?? 0); i++) {
      const run = await spawnRun(scene, folder, env);
      if (run.code !== (scene.exit ?? 0)) return { error: `a run before the scene exited with ${run.code}\n${run.text}` };
    }
    const run = await spawnRun(scene, folder, env);
    if (run.code !== (scene.exit ?? 0)) return { error: `exited with ${run.code}, expected ${scene.exit ?? 0}\n${run.text}` };
    const units = toUnits(run.writes);
    const html = toHTML(units.flatMap((unit) => unit.lines));
    let index = 0;
    return {
      result: {
        command: scene.command,
        units: units.map((unit) => ({ html: unit.lines.map(() => html[index++]).join(""), ...(unit.wait ? { wait: true } : {}) })),
      },
    };
  } finally {
    server?.close();
  }
}

/** The code blocks of a page, as their text. */
function codeBlocks(file) {
  const blocks = [];
  let open = null;
  for (const line of read(file).split("\n")) {
    const fence = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(line);
    if (!open && fence) open = { fence: fence[2], lines: [] };
    else if (open && fence && fence[2].startsWith(open.fence) && fence[3].trim() === "") {
      blocks.push(open.lines.join("\n").trim());
      open = null;
    } else if (open) open.lines.push(line);
  }
  return blocks;
}

/** Every file a scene copies must be in a code block of its page, in every language. */
function checkPages() {
  const problems = [];
  const sources = new Set(SCENES.flatMap((scene) => [...filesOf(scene).values()]));
  for (const source of sources) {
    const page = source.split("/").slice(0, 2).join("/");
    const code = read(path.join(scenes, source)).trim();
    for (const prefix of ["", ...LOCALES.map((code) => `${code}/`)]) {
      const file = [".mdx", ".md"].map((ext) => path.join(pages, `${prefix}${page}${ext}`)).find(existsSync);
      if (!file) problems.push(`${source}: no page ${prefix}${page}`);
      else if (!codeBlocks(file).includes(code)) problems.push(`${source}: not in a code block of ${prefix}${page}, or not the same`);
    }
  }
  return problems;
}

const scratch = mkdtempSync(path.join(tmpdir(), "nc-scenes-"));
const result = {};
const failures = [];
try {
  const queue = [...SCENES];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let scene = queue.shift(); scene; scene = queue.shift()) {
        const { result: shown, error } = await runScene(scene, scratch);
        if (error) failures.push(`✗ ${scene.id} ${error}`);
        else result[scene.id] = shown;
      }
    }),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
const ordered = Object.fromEntries(SCENES.map((scene) => [scene.id, result[scene.id]]));
writeFileSync(out, `${JSON.stringify(ordered, null, 2)}\n`);
// After the output is written, so that a page being written can still show its scenes on the dev server.
const problems = checkPages();
if (problems.length > 0) {
  console.error(problems.map((problem) => `✗ ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`✓ scenes: ${SCENES.length} ran, and their files match their pages`);
