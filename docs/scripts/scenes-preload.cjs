// Loaded before each sample of a scene, by `scripts/scenes.mjs`. A sample is
// written like your own code, with `require("@ix-xs/node-comfort")`: here
// that name is pointed at the package of this repository. The rest only
// stands in for what a reader has and the build machine doesn't, each part
// switched on by the runner for the scenes that need it:
//
//   NC_SCENE_RECORD     notes each write to stdout and stderr, and when it
//                       happened, so that the page can show what came at once
//                       as one block and where the program waited.
//   NC_SCENE_TTY        stdout and stderr say they are a terminal, as they are
//                       for a reader: a spinner draws itself, then shows its
//                       final line (the runner keeps only that line).
//   NC_SCENE_CLOCK      the clock starts at this moment and runs on, so that
//                       the times the logger prints are the same at each build.
//   NC_SCENE_NET        the addresses under example.com go to the local server
//                       of the runner (its port), and the ones listed in
//                       NC_SCENE_REFUSED to a port where nothing listens. The
//                       program, its requests, its retries and its errors are
//                       real; only the network is the runner's.
//   NC_SCENE_INTERRUPT  after this many milliseconds, does what Ctrl+C does:
//                       the terminal shows ^C and the process gets SIGINT.
const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const name = require(path.join(root, "package.json")).name;
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...rest) {
  if (request === name) return resolve.call(this, root, ...rest);
  if (request.startsWith(`${name}/`)) return resolve.call(this, path.join(root, "src", request.slice(name.length + 1)), ...rest);
  return resolve.call(this, request, ...rest);
};

const env = process.env;

if (env.NC_SCENE_RECORD) {
  /** @type {Array<[number, string]>} */
  const writes = [];
  for (const stream of [process.stdout, process.stderr]) {
    const write = stream.write;
    stream.write = function(chunk, ...rest) {
      writes.push([performance.now(), typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8")]);
      return write.call(this, chunk, ...rest);
    };
  }
  process.on("exit", () => fs.writeFileSync(env.NC_SCENE_RECORD, JSON.stringify(writes)));
}

if (env.NC_SCENE_TTY) {
  for (const stream of [process.stdout, process.stderr]) {
    stream.isTTY = true;
    stream.columns = Number(env.COLUMNS) || 80;
    stream.rows = 30;
  }
}

if (env.NC_SCENE_CLOCK) {
  const RealDate = Date;
  const shift = RealDate.parse(env.NC_SCENE_CLOCK) - RealDate.now();
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + shift);
      else super(...args);
    }
    static now() {
      return RealDate.now() + shift;
    }
  };
}

if (env.NC_SCENE_NET) {
  const refused = new Set((env.NC_SCENE_REFUSED ?? "").split(",").filter(Boolean));
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.hostname !== "example.com" && !url.hostname.endsWith(".example.com")) return realFetch(input, init);
    const port = refused.has(url.hostname) ? env.NC_SCENE_CLOSED : env.NC_SCENE_NET;
    const headers = new Headers(init.headers);
    headers.set("x-scene-host", url.hostname);
    return realFetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, { ...init, headers });
  };
}

if (env.NC_SCENE_INTERRUPT) {
  setTimeout(() => {
    process.stdout.write("^C\n");
    process.emit("SIGINT", "SIGINT");
  }, Number(env.NC_SCENE_INTERRUPT)).unref();
}
