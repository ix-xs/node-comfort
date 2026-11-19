---
title: "Command-line tools"
description: "`nc.cli`: arguments and subcommands, prompts and menus, spinners and progress bars, tables, trees and boxes."
---

```js
const { cli } = require("@ix-xs/node-comfort");
```

When nobody is at the keyboard (CI, pipes), prompts read plain lines from stdin and animations only print their final state. `cli.isInteractive()` says which case applies.

## Arguments

`args` parses the command line from a schema. The result is typed: `flags.port` is a `number`.

```js
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
  verbose: { type: "boolean", short: "v", description: "Show more logs" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
  token: { type: "string", required: true, env: "API_TOKEN" },
}, { description: "Start the server", version: "1.0.0" });
```

```bash
node server.js -p 8080 -v --tag api --tag web --token=abc public/
```

That gives `flags = { port: 8080, verbose: true, tag: ["api", "web"], env: "dev", token: "abc" }` and `positionals = ["public/"]`. Booleans accept `--no-verbose`; everything after `--` goes to `positionals`.

| Flag field | |
| --- | --- |
| `type` | `"string"`, `"number"` or `"boolean"` |
| `short` | A one-letter alias: `"p"` for `-p` |
| `default` | When the flag is missing |
| `multiple` | Can be repeated; gives an array |
| `required` | Fails when missing |
| `choices` | Allowed values, strings or numbers |
| `env` | A variable read when the flag is not given. The command line wins, then the variable, then `default` |
| `description` | Shown in `--help` |

In a variable, a repeated flag is a list separated by commas (`TAGS=api,web`), and a boolean is `1`, `true`, `yes`, `on` or `y`.

| `args` option | Default | |
| --- | --- | --- |
| `argv` | `process.argv.slice(2)` | What to parse |
| `name`, `description`, `usage`, `examples` | | For the help |
| `commands` | | Subcommands, below |
| `help` | `true` | Answer `--help` and `-h`, then exit |
| `version` | | Answer `--version` with it |
| `strict` | `true` | Reject unknown flags, with a suggestion |
| `env` | `process.env` | Where `env` flags are read from |

A mistake on the command line throws a `TypeError` with `code: "ERR_CLI_ARGS"` and a message ready to show:

```js
let parsed;
try {
  parsed = cli.args(schema);
} catch (error) {
  if (error.code !== "ERR_CLI_ARGS") throw error;
  console.error(error.message);
  process.exit(2);
}
```

The messages it gives:

```text
Unknown option --prot. Did you mean --port?
Missing required option --token
Option --port expects a number, got "abc"
Option --env must be one of: dev, prod (got "staging")
Environment variable PORT expects a number, got "abc"
```

## Subcommands

The first argument must be one of `commands`, and comes back as `command`. All commands share the flags.

```js
const { command, flags, positionals, help } = cli.args({
  watch: { type: "boolean", short: "w", description: "Rebuild when a file changes" },
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port for serve" },
}, {
  name: "tool",
  description: "Build and serve the site",
  commands: { build: "Build the project", serve: "Start the dev server" },
  examples: ["tool build --watch", "tool serve -p 8080"],
  version: "1.0.0",
});

if (command === "build") await build(positionals, flags);
else if (command === "serve") await serve(flags.port);
else console.log(help());
```

`tool build --watch src` gives `command = "build"`, `flags = { watch: true, port: 3000 }`, `positionals = ["src"]`. A wrong name throws `Unknown command "biuld". Did you mean build?`; no command at all gives `undefined`. `tool --help` prints:

```text
Build and serve the site

Usage: tool <command> [options]

Commands:
  build  Build the project
  serve  Start the dev server

Options:
  -w, --watch          Rebuild when a file changes
  -p, --port <number>  Port for serve [default: 3000] [env: PORT]
  -h, --help           Show this help
      --version        Show the version

Examples:
  tool build --watch
  tool serve -p 8080
```

## Prompts and menus

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", { validate: (answer) => /^\d+$/.test(answer) || "Please enter a number" });
const token = await cli.password("API token?");        // shown as *
const ok = await cli.confirm("Deploy to production?"); // y, yes, o, oui...

const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);
const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
  { label: "Enterprise", value: "ent", disabled: true },
]);
const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

| Function | Resolves with | Options |
| --- | --- | --- |
| `prompt(question, options)` | The answer | `default`, `validate` (returns `true` or a message to ask again) |
| `password(question, options)` | The answer | |
| `confirm(question, options)` | `true` or `false` | `default` (`false`) |
| `select(question, choices, options)` | The chosen value | `default` (an index), `pageSize` (`10`) |
| `multiselect(question, choices, options)` | An array of values | `default`, `pageSize`, `min` |

Every prompt also takes `input`, `output` and `signal`. In a menu: arrows to move, Enter to choose, Home and End, Page Up and Page Down; in `multiselect`, Space toggles and `a` selects all.

| The prompt ends with | It rejects with |
| --- | --- |
| Ctrl+C or Escape (menu, password) | `AbortError`, code `ABORT_ERR` |
| The `signal` aborted | `AbortError`, code `ABORT_ERR` |
| The input closed before an answer | `AbortError`, code `ERR_INPUT_CLOSED` |

```js
try {
  const plan = await cli.select("Plan?", ["Free", "Pro"], { signal: AbortSignal.timeout(60_000) });
  await subscribe(plan);
} catch (error) {
  if (error.name !== "AbortError") throw error;
  console.log("Nothing changed.");
}
```

## Spinners and progress bars

`spin` shows a spinner while a promise or a function runs, then ends it with `✔` or `✖`. It resolves with the result, or rejects with the error.

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));

await cli.spin("Installing", async (spinner) => {
  for (const name of packages) {
    spinner.text = `Installing ${name}`;
    await install(name);
  }
}, { success: "Installed", fail: (error) => `Install failed: ${error.message}` });
```

`spinner` and `progress` are driven by hand:

```js
const spinner = cli.spinner("Downloading", { interval: "80ms" }).start();
spinner.succeed("Downloaded 12 files");

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

| Spinner | |
| --- | --- |
| `start(text?)`, `stop()` | `stop()` clears the line |
| `succeed`, `fail`, `warn`, `info` | Stop with `✔`, `✖`, `⚠` or `ℹ` |
| `text`, `isSpinning` | |
| Options | `frames`, `interval` (`80` or `"80ms"`), `color` (`"cyan"`), `stream` |
| `spin` options | The spinner options, `success`, `fail` (text or function), `signal` |

| Progress bar | |
| --- | --- |
| `tick(amount = 1, label?)`, `update(value, label?)` | Move the bar |
| `stop()` | Draws the final state and frees the line |
| `value`, `total`, `percent` | `total` can change along the way |
| Options | `total`, `width` (`30`), `format`, `complete` (`"█"`), `incomplete` (`"░"`), `label`, `stream` |
| `format` placeholders | `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}`, `{label}` |

Both write to stderr, so stdout stays clean for data. Both can be declared with `using` ([Resources](/basics/resources/)).

## Tables, boxes and trees

These build text; print it yourself. `nc.logger.table()` builds and prints in one call.

```js
const users = [
  { name: "Ada", role: "admin", logins: 42 },
  { name: "Bob", role: "user", logins: 7 },
];
console.log(cli.table(users));
```

```text
╭──────┬───────┬────────╮
│ name │ role  │ logins │
├──────┼───────┼────────┤
│ Ada  │ admin │     42 │
│ Bob  │ user  │      7 │
╰──────┴───────┴────────╯
```

| `table` option | Default | |
| --- | --- | --- |
| `columns` | every key | Names, or `{ key, header, align, maxWidth, format }` |
| `border` | `"rounded"` | `"single"`, `"double"`, `"heavy"`, `"ascii"`, `"none"`, `"markdown"` |
| `header` | `true` | |
| `padding` | `1` | |
| `colors` | automatic | |

A cell can hold several lines. Colors, emoji and CJK characters line up. With `border: "markdown"`, a line break becomes `<br>` and `|` is escaped:

```text
| name | role  | logins |
| ---- | ----- | -----: |
| Ada  | admin |     42 |
| Bob  | user  |      7 |
```

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));

console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
```

```text
╭─ my-app ────────────────╮
│  Server ready           │
│  http://localhost:3000  │
╰─────────────────────────╯
├── src
│   ├── index.js
│   └── lib
│       ├── a.js
│       └── b.js
└── package.json: 1.2 kB
```

| `box` option | Default |
| --- | --- |
| `title`, `width` | |
| `border` | `"rounded"` |
| `padding` | `{ x: 2, y: 0 }` |
| `align` | `"left"` |
| `borderColor` | A style name or a hex code |
| `colors` | automatic |

In a `tree`, an object or an array opens a level, `null` or `true` is a plain leaf, any other value is shown after the key. `{ ascii: true }` draws with `+`, `|` and `-`.

## Terminal

| Function | Returns |
| --- | --- |
| `isInteractive()` | `true` when stdin and stdout are a terminal |
| `size()` | `{ columns, rows }`, `{ columns: 80, rows: 24 }` without a terminal |
| `clear()` | Clears the screen |

## A complete command

`clean logs` lists the `.log` files of a folder, asks before removing them, and shows the progress. A path typed by the user is read from the working directory with `path.resolve()`: `nc.fs` reads `./` from the calling file.

```js
const path = require("node:path");
const { cli, fs, logger } = require("@ix-xs/node-comfort");

async function main() {
  const { flags, positionals } = cli.args({
    yes: { type: "boolean", short: "y", description: "Do not ask for confirmation" },
  }, { name: "clean", usage: "<folder> [options]", description: "Removes the log files of a folder" });

  // Read from the working directory, as a user expects on a command line.
  const folder = path.resolve(positionals[0] ?? "");
  const files = fs.list(folder, { filter: (file) => file.endsWith(".log") }) ?? [];
  if (files.length === 0) return logger.info("Nothing to remove");

  console.log(cli.table(files.map((file) => ({ file: path.relative(folder, file), size: fs.size(file) }))));
  if (!flags.yes && !(await cli.confirm(`Remove ${files.length} files?`))) return;

  const bar = cli.progress({ total: files.length });
  for (const file of files) bar.tick(1, fs.remove(file) ? path.basename(file) : `${path.basename(file)} (kept)`);
  bar.stop();
}

main().catch((error) => {
  if (error.code === "ERR_CLI_ARGS" || error.code === "ERR_INPUT_CLOSED") console.error(error.message);
  else logger.error(error);
  process.exitCode = 1;
});
```
