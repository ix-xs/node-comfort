---
title: "A command-line tool"
description: "A tool with typed arguments, questions and a progress bar, an API client that retries and caches, and resources that stop on their own with `using`."
sidebar:
  order: 2
---

The first two examples use `await` at the top level, so they are ES modules: name them `.mjs`, or set `"type": "module"` in your package.json.

## Processing a folder of images

```js
#!/usr/bin/env node
// build-images.mjs
import nc from "@ix-xs/node-comfort";

const { cli } = nc;

const { flags, positionals } = cli.args({
  out: { type: "string", short: "o", default: "dist", description: "Output folder" },
  minify: { type: "boolean", description: "Minify the output" },
  concurrency: { type: "number", short: "c", default: 4 },
}, { name: "build-images", usage: "<folder> [options]", version: "1.0.0" });

const source = positionals[0] ?? (await cli.prompt("Folder to process?", { default: "images" }));
const files = nc.glob("**/*.{png,jpg}", { cwd: source, absolute: true });

if (!files.length) {
  nc.warn(`No images in ${source}`);
  process.exit(0);
}
if (cli.isInteractive() && !(await cli.confirm(`Process ${files.length} images?`, { default: true }))) process.exit(0);

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
await nc.async.forEach(files, async (file) => {
  await optimize(file, nc.fs.createPath(`${flags.out}/${nc.str.slugify(file)}`));
  bar.tick(1, file);
}, { concurrency: flags.concurrency });
bar.stop();

nc.box(`${files.length} images written to ${flags.out}`, { title: "done", borderColor: "green" });
```

## An API client with retries and caching

```js
// github.mjs
import nc from "@ix-xs/node-comfort";

const { schema: s } = nc;

const github = nc.http.create({
  baseURL: "https://api.github.com/",
  headers: { "x-github-api-version": "2022-11-28" },
  auth: { bearer: process.env.GITHUB_TOKEN },
  timeout: "10s",
  retry: { attempts: 4, jitter: true },
});

// what this program needs from the answer, checked when it arrives
const Repo = s.object({ full_name: s.string(), stargazers_count: s.number().int() });
const repos = new nc.Cache({ max: 500, ttl: "10m" });

async function getRepo(owner, repo) {
  return repos.getOrSet(`${owner}/${repo}`, async () => {
    const response = await github.get("repos/:owner/:repo", { params: { owner, repo }, schema: Repo });
    return response.data;
  }, { staleWhileRevalidate: "1h" });
}

const names = [["nodejs", "node"], ["microsoft", "TypeScript"], ["vitejs", "vite"]];
const results = await nc.async.map(names, ([owner, repo]) => getRepo(owner, repo), { concurrency: 2 });
nc.table(results.map((r) => ({ name: r.full_name, stars: nc.num.abbreviate(r.stargazers_count) })));
```

`params` fills the path and encodes each value. `schema` throws a `ValidationError` if the service answers with something else than what you expect, and gives `response.data` its type. With `staleWhileRevalidate`, an entry older than ten minutes is still returned at once, for up to an hour, while a fresh one loads in the background.

## Cleaning up with `using`

On Node.js 24 and later, a `using` declaration stops a resource at the end of its block, however the block ends: normally, with `return`, or with an error. No `try`/`finally` to write, and no timer left running because something threw:

```js
const nc = require("@ix-xs/node-comfort");

async function build(files) {
  using bar = nc.cli.progress({ total: files.length });
  using heartbeat = nc.time.every("30s", () => nc.info("Still building..."));
  using handler = nc.sys.onShutdown(() => nc.warn("Build interrupted"));

  for (const file of files) {
    await compile(file); // if this throws, all three stop anyway
    bar.tick(1, file);
  }
}
```

These work with `using`:

| What | At the end of the block |
| --- | --- |
| `nc.watch()` | the watcher is closed |
| `time.every()`, `time.cron()` | the schedule stops |
| `cli.spinner()` | a spinner still running is stopped |
| `cli.progress()` | the bar is stopped |
| `nc.when()` | the task stops |
| `nc.dontCrash()` | its handlers are removed |
| what `emitter.on()`, `once()` and `onAny()` return | the listener is removed |
| what `sys.onShutdown()` returns | the handler is removed |
| `new nc.SQLite()` | the connection is closed |

`using` is new syntax: on Node.js 22 it doesn't parse, so call `stop()`, `close()` or the returned function yourself there. A `watch()` on a missing path returns `undefined`, which `using` accepts.
