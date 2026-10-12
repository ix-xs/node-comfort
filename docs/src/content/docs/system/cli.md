---
title: "Command-line tools"
description: "`nc.cli` has what a command-line tool needs: arguments, subcommands, prompts, menus, spinners, progress bars, tables, trees and boxes."
sidebar:
  order: 3
---

```js
const { cli } = require("@ix-xs/node-comfort");

const { flags } = cli.args({ port: { type: "number", short: "p", default: 3000 } });
const name = await cli.prompt("Project name?", { default: "my-app" });
const spin = cli.spinner("Installing").start();
await install();
spin.succeed("Installed");
```

When nobody is at the keyboard (CI, pipes), prompts read plain lines from stdin and animations only print their final state. `cli.isInteractive()` tells you which case you're in. Every option is listed in the [reference](/reference/cli/).

## Arguments

`args` parses the command line from a schema, and the result is typed: `flags.port` is a `number`.

```js
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
  verbose: { type: "boolean", short: "v", description: "Show more logs" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
  token: { type: "string", required: true },
}, { description: "Start the server", version: "1.0.0" });
```

```bash
node server.js -p 8080 -v --tag api --tag web --token=abc public/
```

That gives `flags = { port: 8080, verbose: true, tag: ["api", "web"], env: "dev", token: "abc" }` and `positionals = ["public/"]`. Booleans accept `--no-verbose`. Everything after `--` goes to `positionals` untouched.

`choices` works on numbers too: `level: { type: "number", choices: [1, 2, 3] }` accepts `--level 2` and gives the number `2`.

`--help` (or `-h`) prints generated help and exits, and `--version` prints the version. A mistake throws a `TypeError` whose message is ready to show, with a suggestion for typos:

```text
Unknown option --prot. Did you mean --port?
Missing required option --token
Option --port expects a number, got "abc"
Option --env must be one of: dev, prod (got "staging")
```

Catch it to print the message without a stack trace:

```js
let parsed;
try {
  parsed = cli.args(schema);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
```

A flag can fall back to an environment variable with `env`. The command line wins, then the variable, then `default`.

```js
const { flags } = cli.args({
  port: { type: "number", default: 3000, env: "PORT" },
  token: { type: "string", required: true, env: "API_TOKEN" },
  tag: { type: "string", multiple: true, env: "TAGS" },
});
```

```bash
PORT=8080 API_TOKEN=abc TAGS=api,web node server.js
```

That gives `flags = { port: 8080, token: "abc", tag: ["api", "web"] }`. In a variable, a repeated flag is a list separated by commas, and a boolean is `1`, `true`, `yes`, `on` or `y` (`0`, `false`, `no`, `off`, `n` or nothing for false). Variables are checked like flags: `PORT=abc` fails with `Environment variable PORT expects a number, got "abc"`.

## Subcommands

Give `commands` the names of your commands and what they do. The first argument must be one of them, and it comes back as `command`.

```js
const { command, flags, positionals, help } = cli.args({
  watch: { type: "boolean", short: "w", description: "Rebuild when a file changes" },
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port for serve" },
}, {
  description: "Build and serve the site",
  commands: { build: "Build the project", serve: "Start the dev server" },
  examples: ["tool build --watch", "tool serve -p 8080"],
  version: "1.0.0",
});

if (command === "build") await build(positionals, flags);
else if (command === "serve") await serve(flags.port);
else console.log(help());
```

`node tool.js build --watch src` gives `command = "build"`, `flags = { watch: true, port: 3000 }` and `positionals = ["src"]`. All commands share the same flags. A wrong name throws like a wrong flag does: `Unknown command "biuld". Did you mean build?`. With no command at all, `command` is `undefined`, which is why the example ends by printing `help()`.

Commands and `examples` both appear in the help. This is what `node tool.js --help` prints:

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

## Prompts

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", { validate: (a) => /^\d+$/.test(a) || "Please enter a number" });
const token = await cli.password("API token?");       // typed characters show as *
const ok = await cli.confirm("Deploy to production?"); // y, yes, o, oui...
```

When stdin is a pipe and it runs out of lines, a prompt rejects with an error instead of waiting forever.

## Menus

```js
const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);

const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
  { label: "Enterprise", value: "ent", disabled: true },
]);

const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

Arrow keys to move, Enter to choose. Home and End jump to the first and last choice, Page Up and Page Down move a page at a time (10 choices, change it with `pageSize`). For `multiselect`, Space toggles and `a` selects all.

In a menu or a password prompt, Ctrl+C or Escape cancels: the promise rejects with an `AbortError`, so you decide what cancelling means.

```js
try {
  const plan = await cli.select("Plan?", ["Free", "Pro"]);
  await subscribe(plan);
} catch (error) {
  if (error.name !== "AbortError") throw error;
  console.log("Nothing changed.");
}
```

## Spinners and progress bars

`spin` shows a spinner while some work runs, then ends it with `✔` or `✖`. It resolves with the result of the work, or rejects with its error.

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));

await cli.spin("Deploying", deploy(), {
  success: (url) => `Deployed to ${url}`,
  fail: (error) => `Deploy failed: ${error.message}`,
});
```

The work is a promise or a function. A function gets the spinner, so it can change the text along the way:

```js
await cli.spin("Installing", async (spinner) => {
  for (const name of packages) {
    spinner.text = `Installing ${name}`;
    await install(name);
  }
}, { success: "Installed" });
```

For more control, drive the spinner yourself. It can also end with `warn()`, `info()` or a plain `stop()`.

```js
const spin = cli.spinner("Downloading").start();
try {
  await download();
  spin.succeed("Downloaded 12 files");
} catch (error) {
  spin.fail(`Download failed: ${error.message}`);
}

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

Spinners and progress bars write to stderr, so they don't get mixed with data you print on stdout. The progress format can use `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}` and `{label}`.

## Tables and boxes

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

Choose columns, headers and alignment with `columns`, and the look with `border`: `"rounded"`, `"single"`, `"double"`, `"heavy"`, `"ascii"`, `"none"` or `"markdown"`. Colors, emoji and CJK characters line up correctly. An empty list gives an empty string.

A cell can hold several lines, and its row grows to fit:

```js
console.log(cli.table([
  { package: "left-pad", notes: "Deprecated\nUse padStart instead" },
  { package: "chalk", notes: "Up to date" },
]));
```

```text
╭──────────┬──────────────────────╮
│ package  │ notes                │
├──────────┼──────────────────────┤
│ left-pad │ Deprecated           │
│          │ Use padStart instead │
│ chalk    │ Up to date           │
╰──────────┴──────────────────────╯
```

`border: "markdown"` gives a table to paste into a README or a pull request. There, a line break becomes `<br>` and a `|` is escaped.

```js
console.log(cli.table(users, { border: "markdown" }));
```

```text
| name | role  | logins |
| ---- | ----- | -----: |
| Ada  | admin |     42 |
| Bob  | user  |      7 |
```

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
```

## Trees

`tree` draws nested data the way the `tree` command draws folders.

```js
console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
```

```text
├── src
│   ├── index.js
│   └── lib
│       ├── a.js
│       └── b.js
└── package.json: 1.2 kB
```

Keys are branches. An object or an array opens a level, `null` or `true` makes a plain leaf, and any other value is shown after the key. Pass `{ ascii: true }` to draw with `+`, `|` and `-` where box characters don't display well.

## Terminal

```js
cli.size();  // { columns: 120, rows: 40 }
cli.clear();
```
