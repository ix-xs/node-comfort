---
title: "nc.cli"
description: "What you need for command-line tools: typed arguments with a generated `--help`, prompts, arrow-key menus, spinners, progress bars, tables and boxes. When nobody's at the keyboard (CI, pipes), prompts read plain lines and animations print only their final state."
sidebar:
  label: "cli"
  order: 20
---

```js
const { cli } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const cli = require("@ix-xs/node-comfort/cli");
```

This page lists everything `nc.cli` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/cli/).

```js
const { flags } = cli.args({
  port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
});
const name = await cli.prompt("Project name?", { default: "my-app" });
const spin = cli.spinner("Installing").start();
spin.succeed("Installed");
```

## table

```ts
table(rows: Record<string, unknown>[] | unknown[][], options?: TableOptions): string
```

Draws a table from an array of objects (keys become columns) or an array
of arrays. Colors, emoji and CJK characters line up correctly.

```js
console.log(cli.table([
  { name: "Ada", role: "admin", logins: 42 },
  { name: "Bob", role: "user", logins: 7 },
]));
// ╭──────┬───────┬────────╮
// │ name │ role  │ logins │
// ├──────┼───────┼────────┤
// │ Ada  │ admin │     42 │
// │ Bob  │ user  │      7 │
// ╰──────┴───────┴────────╯
```

## box

```ts
box(text: string, options?: BoxOptions): string
```

Draws a box around text.

```js
console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
// ╭─ my-app ──────────────────╮
// │  Server ready             │
// │  http://localhost:3000    │
// ╰───────────────────────────╯
```

## tree

```ts
tree(data: unknown[] | Record<string, unknown>, options?: TreeOptions): string
```

Draws nested data as a tree, like the `tree` command does for folders.
Keys are branches. A value that is an object or an array opens a level,
`null` or `true` makes a plain leaf, anything else is shown after the key.

```js
console.log(cli.tree({
  src: { "index.js": null, lib: ["a.js", "b.js"] },
  "package.json": "1.2 kB",
}));
// ├── src
// │   ├── index.js
// │   └── lib
// │       ├── a.js
// │       └── b.js
// └── package.json: 1.2 kB
```

## spinner

```ts
spinner(text?: string, options?: SpinnerOptions): Spinner
```

A spinner for work in progress. Call `.start()`, then finish with
`.succeed()`, `.fail()`, `.warn()`, `.info()` or `.stop()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `text?` | `string` | Defaults to `""`. |
| `options?` | [`SpinnerOptions`](#spinneroptions) |  |

**Returns** [`Spinner`](#spinner): Not started yet.

```js
const spin = cli.spinner("Downloading").start();
try {
  await download();
  spin.succeed("Downloaded 12 files");
} catch (error) {
  spin.fail(`Download failed: ${error.message}`);
}
```

## spin

```ts
spin<T>(text: string, task: Promise<T> | ((spinner: Spinner) => T | Promise<T>), options?: SpinOptions<T>): Promise<T>
```

Shows a spinner while some work runs, then `✔` or `✖` depending on how it
ended. Resolves with the result of the work, or rejects with its error.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `task` | `Promise``<``T``> \| ((spinner: `[`Spinner`](#spinner)`) => ``T`` \| ``Promise``<``T``>)` | A promise, or a function that gets the spinner so it can update the text. |
| `options?` | [`SpinOptions`](#spinoptions)`<``T``>` |  |

```js
const users = await cli.spin("Loading users", () => db.getAll("users"));
await cli.spin("Deploying", deploy(), {
  success: (url) => `Deployed to ${url}`,
  fail: (error) => `Deploy failed: ${error.message}`,
});
```

## progress

```ts
progress(options: ProgressOptions): ProgressBar
```

A progress bar with percentage, ETA and speed. It redraws at most every
50 ms, so calling `tick()` in a tight loop is fine.

```js
const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
for (const file of files) {
  await upload(file);
  bar.tick(1, file.name);
}
bar.stop();
```

## prompt

```ts
prompt(question: string, options?: PromptOptions): Promise<string>
```

Asks a question and returns the answer. With `validate`, it keeps asking
until the answer is valid.

**Returns** `Promise``<string>`: Trimmed.

```js
const name = await cli.prompt("Project name?", { default: "my-app" });
const age = await cli.prompt("Age?", {
  validate: (answer) => /^\d+$/.test(answer) || "Please enter a number",
});
```

## password

```ts
password(question: string, options?: { mask?: string; input?: ReadStream; output?: WriteStream; } | undefined): Promise<string>
```

Asks for a secret without showing it; each character appears as `*`.

| Parameter | Type | Description |
| --- | --- | --- |
| `question` | `string` |  |
| `options?` | `{ mask?: string, input?: ``NodeJS``.``ReadStream``, output?: ``NodeJS``.``WriteStream`` }` | `mask: ""` shows nothing at all. |

```js
const token = await cli.password("API token?");
```

## confirm

```ts
confirm(question: string, options?: ConfirmOptions): Promise<boolean>
```

Asks a yes/no question. Understands `y`, `yes`, `o`, `oui`, `true`, `1`
and their opposites; an empty answer gives the default.

```js
if (await cli.confirm("Delete 42 files?")) await cleanup();
```

## select

```ts
select<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V>
```

Lets the user pick one choice with the arrow keys and Enter. Without an
interactive terminal, it prints a numbered list and reads a number.

```js
const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);
const plan = await cli.select("Plan?", [
  { label: "Free", value: "free", hint: "0 €" },
  { label: "Pro", value: "pro", hint: "9 €/month" },
]);
```

## multiselect

```ts
multiselect<V = string>(question: string, choices: Choice<V>[], options?: SelectOptions): Promise<V[]>
```

Lets the user pick several choices: arrows to move, Space to toggle, `a`
for all, Enter to confirm.

**Returns** `Promise``<``V``[]>`: In list order.

```js
const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
```

## args

```ts
args<S extends Record<string, FlagSpec>>(schema: S, options?: ArgsOptions): ParsedArgs<S>
```

Parses command-line arguments from a schema, and types the result:
`flags.port` is a `number`. Handles short aliases, defaults, required
flags, allowed values, repeated flags, `--no-flag`, environment variables
as a fallback and subcommands, and generates `--help`. A typo gets a
"Did you mean...?" suggestion.

**Throws** `TypeError`: For unknown flags or commands, bad numbers, missing required flags or values not in `choices`. The message is ready to show.

```js
// node server.js --port 8080 -v --tag api --tag web public/
const { flags, positionals } = cli.args({
  port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port to listen on" },
  verbose: { type: "boolean", short: "v" },
  tag: { type: "string", multiple: true },
  env: { type: "string", choices: ["dev", "prod"], default: "dev" },
}, { description: "Start the web server", version: "1.0.0" });
// flags: { port: 8080, verbose: true, tag: ["api", "web"], env: "dev" }

// node tool.js build --watch
const { command, flags: buildFlags } = cli.args({ watch: { type: "boolean" } }, {
  commands: { build: "Build the project", serve: "Start the dev server" },
});
// command: "build"
```

## isInteractive

```ts
isInteractive(): boolean
```

Is someone at the keyboard? True when stdin and stdout are terminals and
we're not in CI.

```js
const name = cli.isInteractive() ? await cli.prompt("Name?") : "default";
```

## size

```ts
size(): { columns: number; rows: number; }
```

The terminal size, or 80x24 when it's unknown.

## clear

```ts
clear(): void
```

Clears the screen. Does nothing when stdout isn't a terminal.

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { ArgsOptions } from "@ix-xs/node-comfort"`.

### ArgsOptions

Options for `args()`.

| Property | Type | Description |
| --- | --- | --- |
| `argv?` | `string[]` | What to parse. Defaults to `process.argv.slice(2)`. |
| `name?` | `string` | Program name in the help. Defaults to the script name. |
| `description?` | `string` | Shown at the top of the help. |
| `usage?` | `string` | A usage line, like `"<file> [options]"`. |
| `commands?` | `Record``<string, string>` | Subcommands and what they do, like `{ build: "Build the project" }`. The first argument must then be one of them, and comes back as `command`. |
| `examples?` | `string[]` | Command lines shown at the end of the help. |
| `help?` | `boolean` | Answer `--help` and `-h` by printing the help and exiting. Defaults to `true`. |
| `version?` | `string` | Answer `--version` with this version. |
| `strict?` | `boolean` | Reject unknown flags, with a suggestion. Defaults to `true`. |
| `env?` | `Record``<string, string \| undefined>` | Where `env` flags are read from. Defaults to `process.env`. |

### BorderStyle

Border styles for `table()` and `box()`.

```ts
type BorderStyle = "rounded" | "single" | "double" | "heavy" | "ascii" | "none"
```

### BoxOptions

Options for `box()`.

| Property | Type | Description |
| --- | --- | --- |
| `title?` | `string` | Shown in the top border. |
| `border?` | [`BorderStyle`](#borderstyle) | Defaults to `"rounded"`. |
| `padding?` | `number \| { x?: number; y?: number; }` | Space around the text. Defaults to `{ x: 2, y: 0 }`. |
| `align?` | `"left" \| "center" \| "right"` | Defaults to `"left"`. |
| `borderColor?` | `string` | A style name like `"green"`, or a hex code. |
| `width?` | `number` | Fixed inner width. Defaults to the longest line. |
| `colors?` | `boolean` | Automatic by default. |

### Choice

A choice for `select()` and `multiselect()`: a string, or a label with a
value of any type.

```ts
type Choice = string | { label: string; value: V; hint?: string; disabled?: boolean; }
```

### ConfirmOptions

Options for `confirm()`.

| Property | Type | Description |
| --- | --- | --- |
| `default?` | `boolean` | The answer when the user just presses Enter. Defaults to `false`. |
| `input?` | `ReadableStream` | Defaults to stdin. |
| `output?` | `WritableStream` | Defaults to stdout. |

### FlagSpec

A flag for `args()`.

| Property | Type | Description |
| --- | --- | --- |
| `type` | `"string" \| "number" \| "boolean"` | Numbers are checked. Booleans also accept `--no-name`. |
| `short?` | `string` | One-letter alias, like `"p"` for `-p`. |
| `default?` | `unknown` | Used when the flag is missing. |
| `multiple?` | `boolean` | Can be repeated (`--tag a --tag b`); you get an array. |
| `required?` | `boolean` | Fail if it's missing. |
| `choices?` | `readonly string[] \| readonly number[]` | Allowed values. |
| `env?` | `string` | An environment variable to read when the flag isn't given, like `"PORT"`. The command line wins, then the variable, then `default`. |
| `description?` | `string` | Shown in `--help`. |

### FlagValue

The type of a flag's value.

```ts
type FlagValue = F["type"] extends "boolean" ? boolean : F extends { choices: readonly (infer C)[]; } ? C : F["type"] extends "number" ? number : string
```

### ParsedArgs

What `args()` returns.

| Property | Type | Description |
| --- | --- | --- |
| `flags` | [`ParsedFlags`](#parsedflags)`<``S``>` |  |
| `positionals` | `string[]` | Arguments that aren't flags. |
| `command` | `string` | The subcommand, when `commands` was given. |
| `help` | `() => string` | The generated help text. |

### ParsedFlags

The parsed flags, typed from the schema.

```ts
type ParsedFlags = { [K in keyof S]: S[K] extends { multiple: true; } ? Array<FlagValue<S[K]>> : S[K] extends { default: any; } | { required: true; } | { type: "boolean"; } ? FlagValue<S[K]> : FlagValue<S[K]> | undefined; }
```

### ProgressBar

A progress bar.

| Property | Type | Description |
| --- | --- | --- |
| `tick` | `(amount?: number, label?: string) => `[`ProgressBar`](#progressbar) | Adds to the value, 1 by default. |
| `update` | `(value: number, label?: string) => `[`ProgressBar`](#progressbar) | Sets the value. |
| `stop` | `() => `[`ProgressBar`](#progressbar) | Draws the final state and frees the line. |
| `value` | `number` |  |
| `total` | `number` | You can change it along the way. |
| `percent` | `number` | From 0 to 100. |

### ProgressOptions

Options for `progress()`.

| Property | Type | Description |
| --- | --- | --- |
| `total` | `number` | The value that means 100%. |
| `width?` | `number` | Bar width in characters. Defaults to `30`. |
| `format?` | `string` | Can use `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}` and `{label}`. |
| `complete?` | `string` | Filled character. Defaults to `"█"`. |
| `incomplete?` | `string` | Empty character. Defaults to `"░"`. |
| `label?` | `string` | Text for `{label}`. |
| `stream?` | `WriteStream` | Defaults to stderr. |

### PromptOptions

Options for `prompt()`.

| Property | Type | Description |
| --- | --- | --- |
| `default?` | `string` | Used when the answer is empty. |
| `validate?` | `((answer: string) => string \| true \| ``Promise``<string \| true>)` | Return `true` to accept, or a message to ask again. |
| `input?` | `ReadableStream` | Defaults to stdin. |
| `output?` | `WritableStream` | Defaults to stdout. |

### SelectOptions

Options for `select()` and `multiselect()`.

| Property | Type | Description |
| --- | --- | --- |
| `default?` | `number` | Index of the choice highlighted at first. Defaults to `0`. |
| `pageSize?` | `number` | How many choices are visible at once. Defaults to `10`. |
| `min?` | `number` | `multiselect()` only: minimum number of choices. |
| `input?` | `ReadStream` | Defaults to stdin. |
| `output?` | `WriteStream` | Defaults to stdout. |

### Spinner

A spinner. Every method returns it.

| Property | Type | Description |
| --- | --- | --- |
| `start` | `(text?: string) => `[`Spinner`](#spinner) | Starts spinning, optionally with new text. |
| `stop` | `() => `[`Spinner`](#spinner) | Stops and clears the line. |
| `succeed` | `(text?: string) => `[`Spinner`](#spinner) | Stops with a green `✔`. |
| `fail` | `(text?: string) => `[`Spinner`](#spinner) | Stops with a red `✖`. |
| `warn` | `(text?: string) => `[`Spinner`](#spinner) | Stops with a yellow `⚠`. |
| `info` | `(text?: string) => `[`Spinner`](#spinner) | Stops with a blue `ℹ`. |
| `text` | `string` | The text next to the spinner. Change it any time. |
| `isSpinning` | `boolean` |  |

### SpinnerOptions

Options for `spinner()`.

| Property | Type | Description |
| --- | --- | --- |
| `frames?` | `string[]` | Animation frames. Defaults to braille dots. |
| `interval?` | `number` | Milliseconds per frame. Defaults to `80`. |
| `color?` | `string` | A style name or hex code. Defaults to `"cyan"`. |
| `stream?` | `WriteStream` | Defaults to stderr, which keeps stdout clean for data. |

### SpinOptions

Options for `spin()`: the spinner's, plus what to say at the end.

```ts
type SpinOptions = SpinnerOptions & { success?: string | ((result: T) => string); fail?: string | ((error: unknown) => string); }
```

### TableColumn

A column of `table()`.

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string \| number` | Property name for object rows, index for array rows. |
| `header?` | `string` | Defaults to the key. |
| `align?` | `"left" \| "center" \| "right"` | Defaults to right for numbers, left otherwise. |
| `maxWidth?` | `number` | Longer values are cut with `…`. |
| `format?` | `((value: unknown, row: any) => unknown)` | Changes the value before it's shown. |

### TableOptions

Options for `table()`.

| Property | Type | Description |
| --- | --- | --- |
| `columns?` | `(string \| `[`TableColumn`](#tablecolumn)`)[]` | Which columns, in which order. Defaults to every key found. |
| `border?` | [`BorderStyle`](#borderstyle)` \| "markdown"` | `"markdown"` gives a Markdown table. Defaults to `"rounded"`. |
| `header?` | `boolean` | Show the header row. Defaults to `true`. |
| `colors?` | `boolean` | Bold header and faint borders. Automatic by default. |
| `padding?` | `number` | Spaces around cell content. Defaults to `1`. |

### TreeOptions

Options for `tree()`.

| Property | Type | Description |
| --- | --- | --- |
| `ascii?` | `boolean` | Draw with `\|`, `+` and `-` instead of box characters. |
