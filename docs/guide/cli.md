# Command-line tools

`nc.cli` has what a command-line tool needs: arguments, prompts, menus, spinners, progress bars, tables and boxes.

```js
const { cli } = require("@ix-xs/node-comfort");

const { flags } = cli.args({ port: { type: "number", short: "p", default: 3000 } });
const name = await cli.prompt("Project name?", { default: "my-app" });
const spin = cli.spinner("Installing").start();
await install();
spin.succeed("Installed");
```

When nobody is at the keyboard (CI, pipes), prompts read plain lines from stdin and animations only print their final state. `cli.isInteractive()` tells you which case you're in.

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

That gives `flags = { port: 8080, verbose: true, tag: ["api", "web"], env: "dev", token: "abc" }` and `positionals = ["public/"]`. Booleans accept `--no-verbose`.

`--help` prints generated help and `--version` prints the version. A mistake gets a clear message, with a suggestion for typos:

```text
Unknown option --prot. Did you mean --port?
```

## Prompts

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", { validate: (a) => /^\d+$/.test(a) || "Please enter a number" });
const token = await cli.password("API token?");       // typed characters show as *
const ok = await cli.confirm("Deploy to production?"); // y, yes, o, oui...
```

## Menus

Arrow keys to move, Enter to choose. For `multiselect`, Space toggles and `a` selects all.

```js
const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);

const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
  { label: "Enterprise", value: "ent", disabled: true },
]);

const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

## Spinners and progress bars

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
console.log(cli.table([
  { name: "Ada", role: "admin", logins: 42 },
  { name: "Bob", role: "user", logins: 7 },
]));
```

```text
╭──────┬───────┬────────╮
│ name │ role  │ logins │
├──────┼───────┼────────┤
│ Ada  │ admin │     42 │
│ Bob  │ user  │      7 │
╰──────┴───────┴────────╯
```

Choose columns, headers and alignment with `columns`, and the look with `border`: `"rounded"`, `"single"`, `"double"`, `"heavy"`, `"ascii"`, `"none"` or `"markdown"`. Colors, emoji and CJK characters line up correctly.

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
```

## Terminal

```js
cli.size();  // { columns: 120, rows: 40 }
cli.clear();
```
