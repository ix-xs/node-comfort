// The scenes of the guide: what a terminal shows when you run the code of a
// page. `scripts/scenes.mjs` runs each one against the package before every
// build and keeps what it printed in `output.json`; a page shows it with
// <TerminalDemo scene="<id>" />.
//
// A scene is:
//   id         the page it belongs to, then a name.
//   command    what the reader types. Variables before it (`A=1 node x.js`)
//              are set for the run.
//   step       a step of "Your first project": the scene runs in a folder made
//              of the files of that step and of every step before it, as the
//              reader has them (`project/<step>/*`, `dot-env` becomes `.env`).
//   files      more files, `{ "name in the folder": "path under src/scenes" }`.
//   without    files of the steps the reader doesn't have yet.
//   run        a sample that stands for a command that isn't a script.
//   before     runs of the same command first, whose output isn't shown.
//   network    the sites of SITES answer, from a local server.
//   interrupt  Ctrl+C after this many milliseconds.
//   exit       the exit code the run must end with. Defaults to 0.

/**
 * Where the clock of every scene starts, so that the times printed are the
 * same at each build. The 300 ms keep what the scenes print away from the
 * turn of a second, where a slower machine would print the next one.
 */
export const CLOCK = "2026-11-08T09:30:00.300Z";

/** The steps of "Your first project", in order. */
export const PROJECT = ["setup", "configuration", "input", "requests", "storage", "command-line", "production"];

/**
 * The sites that the project checks, under example.com. Each answers in turn
 * with the next of its `answers`, and then keeps the last one. A `refused`
 * site has nothing listening, like a server that is down.
 */
export const SITES = {
  "www.example.com": { answers: [{ status: 200, body: "<h1>Welcome</h1>" }] },
  "api.example.com": { answers: [{ status: 503, body: "Service Unavailable" }, { status: 200, type: "application/json", body: '{"status":"ok"}' }] },
  "blog.example.com": { answers: [{ status: 200, body: "<h1>Blog</h1>" }, { status: 404, body: "<h1>Not Found</h1>" }] },
  "shop.example.com": { refused: true, answers: [] },
};

export const SCENES = [
  { id: "start/installation/version", command: "node --version", run: "start/installation/version.js" },
  { id: "start/installation/hello", command: "node hello.js", files: { "hello.js": "start/installation/hello.js" } },

  { id: "project/setup/first-run", command: "node status.js", step: "setup" },

  { id: "project/configuration/missing", command: "node status.js", step: "configuration", without: [".env"], exit: 1 },
  { id: "project/configuration/loaded", command: "node status.js", step: "configuration" },

  { id: "project/input/loaded", command: "node status.js", step: "input" },
  { id: "project/input/broken", command: "node status.js", step: "input", files: { "sites.json": "project/input/broken/sites.json" }, exit: 1 },

  { id: "project/requests/checked", command: "node status.js", step: "requests", network: true },

  { id: "project/storage/first", command: "node status.js", step: "storage", network: true },
  { id: "project/storage/second", command: "node status.js", step: "storage", network: true, before: 1 },

  { id: "project/command-line/help", command: "node status.js --help", step: "command-line" },
  { id: "project/command-line/table", command: "node status.js", step: "command-line", network: true, before: 1 },
  { id: "project/command-line/json", command: "node status.js --site API --json", step: "command-line", network: true },

  { id: "project/production/watch", command: "node status.js --watch --every 2s", step: "production", network: true, interrupt: 3500 },
];
