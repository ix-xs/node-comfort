"use strict";

/**
 * What you need for command-line tools: typed arguments with a generated
 * `--help`, prompts, arrow-key menus, spinners, progress bars, tables and
 * boxes. When nobody's at the keyboard (CI, pipes), prompts read plain lines
 * and animations print only their final state.
 *
 * @example
 * const { flags } = cli.args({
 *   port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
 * });
 * const name = await cli.prompt("Project name?", { default: "my-app" });
 * const spin = cli.spinner("Installing").start();
 * spin.succeed("Installed");
 */

const { parseArgs } = require("node:util");
const color = require("./Color.js");
const { AbortError } = require("./errors.js");

/**
 * Border styles for `table()` and `box()`.
 * @typedef {"rounded" | "single" | "double" | "heavy" | "ascii" | "none"} BorderStyle
 */

/**
 * A column of `table()`.
 * @typedef {object} TableColumn
 * @property {string | number} key Property name for object rows, index for array rows.
 * @property {string} [header] Defaults to the key.
 * @property {"left" | "center" | "right"} [align] Defaults to right for numbers, left otherwise.
 * @property {number} [maxWidth] Longer values are cut with `…`.
 * @property {(value: unknown, row: any) => unknown} [format] Changes the value before it's shown.
 */

/**
 * Options for `table()`.
 * @typedef {object} TableOptions
 * @property {Array<string | TableColumn>} [columns] Which columns, in which order. Defaults to every key found.
 * @property {BorderStyle | "markdown"} [border] `"markdown"` gives a Markdown table. Defaults to `"rounded"`.
 * @property {boolean} [header] Show the header row. Defaults to `true`.
 * @property {boolean} [colors] Bold header and faint borders. Automatic by default.
 * @property {number} [padding] Spaces around cell content. Defaults to `1`.
 */

/**
 * Options for `box()`.
 * @typedef {object} BoxOptions
 * @property {string} [title] Shown in the top border.
 * @property {BorderStyle} [border] Defaults to `"rounded"`.
 * @property {number | { x?: number, y?: number }} [padding] Space around the text. Defaults to `{ x: 2, y: 0 }`.
 * @property {"left" | "center" | "right"} [align] Defaults to `"left"`.
 * @property {string} [borderColor] A style name like `"green"`, or a hex code.
 * @property {number} [width] Fixed inner width. Defaults to the longest line.
 * @property {boolean} [colors] Automatic by default.
 */

/**
 * Options for `spinner()`.
 * @typedef {object} SpinnerOptions
 * @property {string[]} [frames] Animation frames. Defaults to braille dots.
 * @property {number} [interval] Milliseconds per frame. Defaults to `80`.
 * @property {string} [color] A style name or hex code. Defaults to `"cyan"`.
 * @property {NodeJS.WriteStream} [stream] Defaults to stderr, which keeps stdout clean for data.
 */

/**
 * A spinner. Every method returns it.
 * @typedef {object} Spinner
 * @property {(text?: string) => Spinner} start Starts spinning, optionally with new text.
 * @property {() => Spinner} stop Stops and clears the line.
 * @property {(text?: string) => Spinner} succeed Stops with a green `✔`.
 * @property {(text?: string) => Spinner} fail Stops with a red `✖`.
 * @property {(text?: string) => Spinner} warn Stops with a yellow `⚠`.
 * @property {(text?: string) => Spinner} info Stops with a blue `ℹ`.
 * @property {string} text The text next to the spinner. Change it any time.
 * @property {boolean} isSpinning
 */

/**
 * Options for `progress()`.
 * @typedef {object} ProgressOptions
 * @property {number} total The value that means 100%.
 * @property {number} [width] Bar width in characters. Defaults to `30`.
 * @property {string} [format] Can use `{bar}`, `{percent}`, `{value}`, `{total}`, `{eta}`, `{elapsed}`, `{rate}` and `{label}`.
 * @property {string} [complete] Filled character. Defaults to `"█"`.
 * @property {string} [incomplete] Empty character. Defaults to `"░"`.
 * @property {string} [label] Text for `{label}`.
 * @property {NodeJS.WriteStream} [stream] Defaults to stderr.
 */

/**
 * A progress bar.
 * @typedef {object} ProgressBar
 * @property {(amount?: number, label?: string) => ProgressBar} tick Adds to the value, 1 by default.
 * @property {(value: number, label?: string) => ProgressBar} update Sets the value.
 * @property {() => ProgressBar} stop Draws the final state and frees the line.
 * @property {number} value
 * @property {number} total You can change it along the way.
 * @property {number} percent From 0 to 100.
 */

/**
 * Options for `prompt()`.
 * @typedef {object} PromptOptions
 * @property {string} [default] Used when the answer is empty.
 * @property {(answer: string) => true | string | Promise<true | string>} [validate] Return `true` to accept, or a message to ask again.
 * @property {NodeJS.ReadableStream} [input] Defaults to stdin.
 * @property {NodeJS.WritableStream} [output] Defaults to stdout.
 */

/**
 * Options for `confirm()`.
 * @typedef {object} ConfirmOptions
 * @property {boolean} [default] The answer when the user just presses Enter. Defaults to `false`.
 * @property {NodeJS.ReadableStream} [input] Defaults to stdin.
 * @property {NodeJS.WritableStream} [output] Defaults to stdout.
 */

/**
 * A choice for `select()` and `multiselect()`: a string, or a label with a
 * value of any type.
 * @template [V=string]
 * @typedef {string | { label: string, value: V, hint?: string, disabled?: boolean }} Choice
 */

/**
 * Options for `select()` and `multiselect()`.
 * @typedef {object} SelectOptions
 * @property {number} [default] Index of the choice highlighted at first. Defaults to `0`.
 * @property {number} [pageSize] How many choices are visible at once. Defaults to `10`.
 * @property {number} [min] `multiselect()` only: minimum number of choices.
 * @property {NodeJS.ReadStream} [input] Defaults to stdin.
 * @property {NodeJS.WriteStream} [output] Defaults to stdout.
 */

/**
 * A flag for `args()`.
 * @typedef {object} FlagSpec
 * @property {"string" | "number" | "boolean"} type Numbers are checked. Booleans also accept `--no-name`.
 * @property {string} [short] One-letter alias, like `"p"` for `-p`.
 * @property {unknown} [default] Used when the flag is missing.
 * @property {boolean} [multiple] Can be repeated (`--tag a --tag b`); you get an array.
 * @property {boolean} [required] Fail if it's missing.
 * @property {readonly string[] | readonly number[]} [choices] Allowed values.
 * @property {string} [env] An environment variable to read when the flag isn't given, like `"PORT"`. The command line wins, then the variable, then `default`.
 * @property {string} [description] Shown in `--help`.
 */

/**
 * The type of a flag's value.
 * @template {FlagSpec} F
 * @typedef {F["type"] extends "boolean" ? boolean : F extends { choices: readonly (infer C)[] } ? C : F["type"] extends "number" ? number : string} FlagValue
 */

/**
 * The parsed flags, typed from the schema.
 * @template {Record<string, FlagSpec>} S
 * @typedef {{ [K in keyof S]: S[K] extends { multiple: true } ? Array<FlagValue<S[K]>> : S[K] extends { default: any } | { required: true } | { type: "boolean" } ? FlagValue<S[K]> : FlagValue<S[K]> | undefined }} ParsedFlags
 */

/**
 * Options for `args()`.
 * @typedef {object} ArgsOptions
 * @property {string[]} [argv] What to parse. Defaults to `process.argv.slice(2)`.
 * @property {string} [name] Program name in the help. Defaults to the script name.
 * @property {string} [description] Shown at the top of the help.
 * @property {string} [usage] A usage line, like `"<file> [options]"`.
 * @property {Record<string, string>} [commands] Subcommands and what they do, like `{ build: "Build the project" }`. The first argument, when there is one, must be one of them and comes back as `command`. They share the flags of the program.
 * @property {string[]} [examples] Command lines shown at the end of the help.
 * @property {boolean} [help] Answer `--help` and `-h` by printing the help and exiting. Defaults to `true`.
 * @property {string} [version] Answer `--version` with this version.
 * @property {boolean} [strict] Reject unknown flags, with a suggestion. Defaults to `true`.
 * @property {Record<string, string | undefined>} [env] Where `env` flags are read from. Defaults to `process.env`.
 */

/**
 * What `args()` returns.
 * @template {Record<string, FlagSpec>} S
 * @typedef {object} ParsedArgs
 * @property {ParsedFlags<S>} flags
 * @property {string[]} positionals Arguments that aren't flags.
 * @property {string | undefined} command The subcommand, when `commands` was given.
 * @property {() => string} help The generated help text.
 */

/**
 * Options for `spin()`: the spinner's, plus what to say at the end.
 * @template T
 * @typedef {SpinnerOptions & { success?: string | ((result: T) => string), fail?: string | ((error: unknown) => string) }} SpinOptions
 */

/**
 * Options for `tree()`.
 * @typedef {object} TreeOptions
 * @property {boolean} [ascii] Draw with `|`, `+` and `-` instead of box characters.
 */

/** @type {Record<BorderStyle, string[]>} top-left, top, top-right, right, bottom-right, bottom, bottom-left, left, mid-left, mid, mid-right, cross, top-mid, bottom-mid */
const BORDERS = {
  rounded: ["╭", "─", "╮", "│", "╯", "─", "╰", "│", "├", "─", "┤", "┼", "┬", "┴"],
  single: ["┌", "─", "┐", "│", "┘", "─", "└", "│", "├", "─", "┤", "┼", "┬", "┴"],
  double: ["╔", "═", "╗", "║", "╝", "═", "╚", "║", "╠", "═", "╣", "╬", "╦", "╩"],
  heavy: ["┏", "━", "┓", "┃", "┛", "━", "┗", "┃", "┣", "━", "┫", "╋", "┳", "┻"],
  ascii: ["+", "-", "+", "|", "+", "-", "+", "|", "+", "-", "+", "+", "+", "+"],
  none: [" ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " "],
};

const SHOW_CURSOR = "\u001b[?25h";
const HIDE_CURSOR = "\u001b[?25l";
const CLEAR_LINE = "\r\u001b[2K";
const CLEAR_BELOW = "\u001b[0J";
const ESCAPE = "\u001b";
/** @param {number} lines */
const _up = (lines) => `\u001b[${lines}A`;

const _FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const _LINE_BREAK = /\r?\n/;
const _LINE_BREAKS = /\r?\n/g;

/**
 * Makes sure a status line fits on one row: a line that wraps can't be
 * cleared with a single escape code.
 * @param {string} line
 * @param {{ columns?: number }} stream
 */
const _oneRow = (line, stream) => {
  const flat = line.includes("\n") ? line.replace(_LINE_BREAKS, " ") : line;
  return stream.columns ? color.truncate(flat, stream.columns - 1) : flat;
};

/** @param {boolean | undefined} forced */
const _palette = (forced) => (forced === undefined ? color : color.create(forced ? (color.level > 0 ? color.level : 3) : 0));

/**
 * @param {import("./Color").ColorModule} palette
 * @param {string | undefined} name
 * @param {string} text
 */
const _paint = (palette, name, text) => {
  if (!name || palette.level === 0) return text;
  if (name.startsWith("#")) return palette.hex(name)(text);
  const chain = /** @type {any} */ (palette)[name];
  return typeof chain === "function" ? chain(text) : text;
};

/**
 * @param {string} text
 * @param {number} width
 * @param {"left" | "center" | "right"} align
 */
const _align = (text, width, align) => {
  const gap = Math.max(0, width - color.width(text));
  if (align === "right") return " ".repeat(gap) + text;
  if (align === "center") return " ".repeat(Math.floor(gap / 2)) + text + " ".repeat(Math.ceil(gap / 2));
  return text + " ".repeat(gap);
};

/** @param {unknown} value */
const _cell = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

/** @param {NodeJS.WriteStream | undefined} stream */
const _isTTY = (stream) => Boolean(stream && stream.isTTY) && process.env.TERM !== "dumb" && !process.env.CI;

let _cursorHooked = false;
/** @param {NodeJS.WriteStream} stream */
const _restoreCursorOnExit = (stream) => {
  if (_cursorHooked) return;
  _cursorHooked = true;
  process.once("exit", () => {
    try {
      stream.write(SHOW_CURSOR);
    } catch {
      // stream already closed
    }
  });
};

/**
 * Draws a table from an array of objects (keys become columns) or an array
 * of arrays. Colors, emoji and CJK characters line up correctly.
 *
 * @example
 * console.log(cli.table([
 *   { name: "Ada", role: "admin", logins: 42 },
 *   { name: "Bob", role: "user", logins: 7 },
 * ]));
 * // ╭──────┬───────┬────────╮
 * // │ name │ role  │ logins │
 * // ├──────┼───────┼────────┤
 * // │ Ada  │ admin │     42 │
 * // │ Bob  │ user  │      7 │
 * // ╰──────┴───────┴────────╯
 *
 * @param {Array<Record<string, unknown>> | unknown[][]} rows
 * @param {TableOptions} [options]
 * @returns {string}
 */
function table(rows, options = {}) {
  const palette = _palette(options.colors);
  const padding = " ".repeat(Math.max(0, options.padding ?? 1));
  const markdown = options.border === "markdown";
  const isArrayRows = rows.length > 0 && Array.isArray(rows[0]);
  /** @type {Array<string | number | TableColumn>} */
  let keys = options.columns ?? [];
  if (!options.columns && isArrayRows) {
    let longest = 0;
    for (const row of rows) longest = Math.max(longest, /** @type {unknown[]} */ (row).length);
    keys = Array.from({ length: longest }, (_, i) => i);
  } else if (!options.columns) {
    /** @type {Set<string>} */
    const seen = new Set();
    for (const row of rows) for (const key of Object.keys(row ?? {})) seen.add(key);
    keys = [...seen];
  }
  const columns = keys.map((column) => (typeof column === "object" ? column : { key: column }));
  if (!columns.length) return "";
  const showHeader = options.header ?? !isArrayRows;
  const headers = columns.map((column) => column.header ?? String(column.key));
  const widths = headers.map((header) => Math.max(markdown ? 3 : 1, showHeader ? color.width(header) : 0));
  const numeric = columns.map(() => rows.length > 0);

  /** @type {Array<Array<{ lines: string[], numeric: boolean }>>} */
  const body = [];
  for (const row of rows) {
    /** @type {Array<{ lines: string[], numeric: boolean }>} */
    const cells = [];
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const raw = /** @type {any} */ (row)?.[column.key];
      const text = _cell(column.format ? column.format(raw, row) : raw);
      let lines = text.includes("\n") ? text.split(_LINE_BREAK) : [text];
      if (column.maxWidth) lines = lines.map((line) => color.truncate(line, /** @type {number} */ (column.maxWidth)));
      // Markdown has no multi-line cells, and a pipe would end the cell.
      if (markdown) lines = [lines.join("<br>").replace(/\|/g, "\\|")];
      for (const line of lines) widths[i] = Math.max(widths[i], color.width(line));
      const isNumber = typeof raw === "number" || typeof raw === "bigint";
      if (!isNumber) numeric[i] = false;
      cells.push({ lines, numeric: isNumber });
    }
    body.push(cells);
  }

  if (markdown) {
    const line = (/** @type {string[]} */ cells) => `| ${cells.join(" | ")} |`;
    const aligns = columns.map((column, i) => column.align ?? (numeric[i] ? "right" : "left"));
    const out = [];
    if (showHeader) {
      out.push(line(headers.map((header, i) => _align(header, widths[i], aligns[i]))));
      out.push(line(widths.map((width, i) => {
        const dashes = "-".repeat(width);
        return aligns[i] === "center" ? `:${dashes.slice(2)}:` : aligns[i] === "right" ? `${dashes.slice(1)}:` : dashes;
      })));
    }
    for (const cells of body) out.push(line(cells.map((cell, i) => _align(cell.lines[0], widths[i], aligns[i]))));
    return out.join("\n");
  }

  const b = BORDERS[/** @type {BorderStyle} */ (options.border ?? "rounded")];
  const dim = (/** @type {string} */ text) => (palette.level > 0 ? palette.gray(text) : text);
  const rule = (/** @type {string} */ left, /** @type {string} */ fill, /** @type {string} */ mid, /** @type {string} */ right) =>
    dim(left + widths.map((width) => fill.repeat(width + padding.length * 2)).join(mid) + right);
  const edge = dim(b[7]);
  const separator = padding + dim(b[3]) + padding;
  const line = (/** @type {string[]} */ cells) => edge + padding + cells.join(separator) + padding + dim(b[3]);
  const out = [rule(b[0], b[1], b[12], b[2])];
  if (showHeader) {
    out.push(line(headers.map((header, i) => _align(palette.level > 0 ? palette.bold(header) : header, widths[i], columns[i].align ?? "left"))));
    out.push(rule(b[8], b[9], b[11], b[10]));
  }
  for (const cells of body) {
    let height = 1;
    for (const cell of cells) height = Math.max(height, cell.lines.length);
    for (let k = 0; k < height; k++) {
      out.push(line(cells.map((cell, i) => _align(cell.lines[k] ?? "", widths[i], columns[i].align ?? (cell.numeric ? "right" : "left")))));
    }
  }
  out.push(rule(b[6], b[5], b[13], b[4]));
  return out.join("\n");
}

/**
 * Draws a box around text.
 *
 * @example
 * console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
 * // ╭─ my-app ────────────────╮
 * // │  Server ready           │
 * // │  http://localhost:3000  │
 * // ╰─────────────────────────╯
 *
 * @param {string} text
 * @param {BoxOptions} [options]
 * @returns {string}
 */
function box(text, options = {}) {
  const palette = _palette(options.colors);
  const b = BORDERS[options.border ?? "rounded"];
  const pad = typeof options.padding === "number" ? { x: options.padding, y: Math.floor(options.padding / 2) } : { x: 2, y: 0, ...options.padding };
  const lines = String(text).split(_LINE_BREAK);
  const title = options.title ? ` ${options.title} ` : "";
  let longest = Math.max(options.width ?? 0, color.width(title) + 2 - pad.x * 2);
  for (const line of lines) longest = Math.max(longest, color.width(line));
  const inner = longest + pad.x * 2;
  const paint = (/** @type {string} */ s) => _paint(palette, options.borderColor, s);
  const top = title
    ? paint(b[0] + b[1]) + (palette.level > 0 ? palette.bold(title) : title) + paint(b[1].repeat(Math.max(0, inner - color.width(title) - 1)) + b[2])
    : paint(b[0] + b[1].repeat(inner) + b[2]);
  const left = paint(b[7]) + " ".repeat(pad.x);
  const right = " ".repeat(pad.x) + paint(b[3]);
  const blank = paint(b[7]) + " ".repeat(inner) + paint(b[3]);
  const out = [top];
  for (let i = 0; i < pad.y; i++) out.push(blank);
  for (const line of lines) out.push(left + _align(line, longest, options.align ?? "left") + right);
  for (let i = 0; i < pad.y; i++) out.push(blank);
  out.push(paint(b[6] + b[5].repeat(inner) + b[4]));
  return out.join("\n");
}

/**
 * Draws nested data as a tree, like the `tree` command does for folders.
 * Keys are branches. A value that is an object or an array opens a level,
 * `null` or `true` makes a plain leaf, anything else is shown after the key.
 *
 * @example
 * console.log(cli.tree({
 *   src: { "index.js": null, lib: ["a.js", "b.js"] },
 *   "package.json": "1.2 kB",
 * }));
 * // ├── src
 * // │   ├── index.js
 * // │   └── lib
 * // │       ├── a.js
 * // │       └── b.js
 * // └── package.json: 1.2 kB
 *
 * @param {Record<string, unknown> | unknown[]} data
 * @param {TreeOptions} [options]
 * @returns {string}
 */
function tree(data, options = {}) {
  const [branch, last, pipe, blank] = options.ascii ? ["+-- ", "+-- ", "|   ", "    "] : ["├── ", "└── ", "│   ", "    "];
  /** @type {string[]} */
  const out = [];
  /** @type {object[]} */
  const open = [];
  /** @param {unknown} value */
  const isBranch = (value) => value !== null && typeof value === "object" && !(value instanceof Date);
  /**
   * @param {object} node
   * @returns {Array<[string, unknown]>}
   */
  const entriesOf = (node) => {
    if (!Array.isArray(node)) return Object.entries(node);
    /** @type {Array<[string, unknown]>} */
    const entries = [];
    for (const item of node) {
      // An object in a list has no name of its own: its keys take its place.
      if (isBranch(item) && !Array.isArray(item)) entries.push(...Object.entries(item));
      else entries.push([_cell(item), null]);
    }
    return entries;
  };
  /**
   * @param {object} node
   * @param {string} indent
   */
  const walk = (node, indent) => {
    if (open.includes(node)) {
      out.push(`${indent}${last}(circular)`);
      return;
    }
    open.push(node);
    const entries = entriesOf(node);
    entries.forEach(([label, value], i) => {
      const isLast = i === entries.length - 1;
      const nested = isBranch(value);
      const text = nested || value === null || value === undefined || value === true ? label : `${label}: ${_cell(value)}`;
      const [first, ...rest] = text.split(_LINE_BREAK);
      out.push(indent + (isLast ? last : branch) + first);
      for (const line of rest) out.push(indent + (isLast ? blank : pipe) + line);
      if (nested) walk(/** @type {object} */ (value), indent + (isLast ? blank : pipe));
    });
    open.pop();
  };
  if (isBranch(data)) walk(data, "");
  return out.join("\n");
}

/**
 * A spinner for work in progress. Call `.start()`, then finish with
 * `.succeed()`, `.fail()`, `.warn()`, `.info()` or `.stop()`.
 *
 * @example
 * const spin = cli.spinner("Downloading").start();
 * try {
 *   await download();
 *   spin.succeed("Downloaded 12 files");
 * } catch (error) {
 *   spin.fail(`Download failed: ${error.message}`);
 * }
 *
 * @param {string} [text=""]
 * @param {SpinnerOptions} [options]
 * @returns {Spinner} Not started yet.
 */
function spinner(text = "", options = {}) {
  const stream = options.stream ?? process.stderr;
  const frames = options.frames?.length ? options.frames : _FRAMES;
  const palette = color.create(color.detect(stream));
  const interactive = _isTTY(stream);
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  let spinning = false;
  let frame = 0;
  let current = text;

  const render = () => {
    stream.write(CLEAR_LINE + _oneRow(`${_paint(palette, options.color ?? "cyan", frames[frame++ % frames.length])} ${current}`, stream));
  };
  /**
   * @param {string} symbol
   * @param {string | undefined} finalText
   */
  const finish = (symbol, finalText) => {
    const wasSpinning = spinning;
    spinning = false;
    clearInterval(timer);
    timer = undefined;
    if (interactive && wasSpinning) stream.write(`${CLEAR_LINE}${SHOW_CURSOR}`);
    if (symbol || finalText !== undefined) stream.write(`${symbol}${symbol ? " " : ""}${finalText ?? current}\n`);
    return self;
  };

  /** @type {Spinner} */
  const self = {
    start(newText) {
      if (newText !== undefined) current = newText;
      if (!interactive) {
        if (!spinning) stream.write(`- ${current}\n`);
        spinning = true;
        return self;
      }
      clearInterval(timer);
      spinning = true;
      _restoreCursorOnExit(stream);
      stream.write(HIDE_CURSOR);
      render();
      timer = setInterval(render, options.interval ?? 80);
      return self;
    },
    stop: () => finish("", undefined),
    succeed: (finalText) => finish(_paint(palette, "green", "✔"), finalText),
    fail: (finalText) => finish(_paint(palette, "red", "✖"), finalText),
    warn: (finalText) => finish(_paint(palette, "yellow", "⚠"), finalText),
    info: (finalText) => finish(_paint(palette, "blue", "ℹ"), finalText),
    get text() {
      return current;
    },
    set text(value) {
      current = value;
      if (spinning && interactive) render();
    },
    get isSpinning() {
      return spinning;
    },
  };
  return self;
}

/**
 * Shows a spinner while some work runs, then `✔` or `✖` depending on how it
 * ended. Resolves with the result of the work, or rejects with its error.
 *
 * @example
 * const users = await cli.spin("Loading users", () => db.getAll("users"));
 * await cli.spin("Deploying", deploy(), {
 *   success: (url) => `Deployed to ${url}`,
 *   fail: (error) => `Deploy failed: ${error.message}`,
 * });
 *
 * @template T
 * @param {string} text
 * @param {Promise<T> | ((spinner: Spinner) => T | Promise<T>)} task A promise, or a function that gets the spinner so it can update the text.
 * @param {SpinOptions<T>} [options]
 * @returns {Promise<T>}
 */
async function spin(text, task, options = {}) {
  const current = spinner(text, options).start();
  try {
    const result = await (typeof task === "function" ? task(current) : task);
    current.succeed(typeof options.success === "function" ? options.success(result) : options.success);
    return result;
  } catch (error) {
    current.fail(typeof options.fail === "function" ? options.fail(error) : options.fail);
    throw error;
  }
}

const _PROGRESS_TOKEN = /\{(bar|percent|value|total|eta|elapsed|rate|label)\}/g;

/** @param {number} seconds */
const _clock = (seconds) => {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m${String(Math.floor(seconds % 60)).padStart(2, "0")}s`;
  return `${Math.ceil(seconds)}s`;
};

/**
 * A progress bar with percentage, ETA and speed. It redraws at most every
 * 50 ms, so calling `tick()` in a tight loop is fine.
 *
 * @example
 * const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
 * for (const file of files) {
 *   await upload(file);
 *   bar.tick(1, file.name);
 * }
 * bar.stop();
 *
 * @param {ProgressOptions} options
 * @returns {ProgressBar}
 */
function progress(options) {
  const stream = options.stream ?? process.stderr;
  const interactive = _isTTY(stream);
  const palette = color.create(color.detect(stream));
  const format = options.format ?? "{bar} {percent}% | {value}/{total} | ETA {eta}";
  const width = Math.max(1, Math.floor(options.width ?? 30));
  const complete = options.complete ?? "█";
  const incomplete = options.incomplete ?? "░";
  const started = Date.now();
  let value = 0;
  let total = Math.max(0, options.total);
  let label = options.label ?? "";
  let lastRender = 0;
  let stopped = false;
  let cursorHidden = false;

  const line = () => {
    const ratio = total > 0 ? Math.min(1, value / total) : 1;
    const filled = Math.round(ratio * width);
    const elapsed = (Date.now() - started) / 1000;
    const rate = elapsed > 0 ? value / elapsed : 0;
    /** @type {Record<string, string>} */
    const values = {
      bar: _paint(palette, "cyan", complete.repeat(filled)) + _paint(palette, "gray", incomplete.repeat(width - filled)),
      percent: String(Math.floor(ratio * 100)).padStart(3),
      value: String(value),
      total: String(total),
      eta: _clock(rate > 0 && ratio < 1 ? (total - value) / rate : 0),
      elapsed: _clock(elapsed),
      rate: `${Math.round(rate * 10) / 10}/s`,
      label,
    };
    return format.replace(_PROGRESS_TOKEN, (_token, name) => values[name]);
  };
  const draw = (/** @type {boolean} */ force) => {
    if (!interactive || stopped) return;
    const now = Date.now();
    if (!force && now - lastRender < 50 && value < total) return;
    lastRender = now;
    if (!cursorHidden) {
      cursorHidden = true;
      _restoreCursorOnExit(stream);
      stream.write(HIDE_CURSOR);
    }
    stream.write(CLEAR_LINE + _oneRow(line(), stream));
  };

  /** @type {ProgressBar} */
  const self = {
    tick(amount = 1, newLabel) {
      return self.update(value + amount, newLabel);
    },
    update(next, newLabel) {
      value = Math.max(0, next);
      if (newLabel !== undefined) label = newLabel;
      draw(false);
      return self;
    },
    stop() {
      if (stopped) return self;
      draw(true);
      stopped = true;
      stream.write(interactive ? `\n${SHOW_CURSOR}` : `${line()}\n`);
      return self;
    },
    get value() {
      return value;
    },
    get total() {
      return total;
    },
    set total(next) {
      total = Math.max(0, next);
      draw(true);
    },
    get percent() {
      return total > 0 ? Math.min(100, (value / total) * 100) : 100;
    },
  };
  draw(true);
  return self;
}

/**
 * @param {string} question
 * @param {NodeJS.ReadableStream} input
 * @param {NodeJS.WritableStream} output
 * @returns {Promise<string>}
 */
const _ask = (question, input, output) =>
  new Promise((resolve, reject) => {
    output.write(question);
    const reader = _reader(input);
    const buffered = reader.lines.shift();
    if (buffered !== undefined) return resolve(buffered);
    if (reader.closed) return reject(new Error("Input closed before an answer was given"));
    reader.waiting.push({ resolve, reject });
    reader.rl.resume();
  });

/**
 * One line reader per input stream, shared by every prompt, so piped lines
 * that arrive early are queued instead of lost.
 * @typedef {{ rl: import("node:readline").Interface, lines: string[], waiting: Array<{ resolve: (line: string) => void, reject: (error: Error) => void }>, closed: boolean }} _LineReader
 */

/** @type {WeakMap<NodeJS.ReadableStream, _LineReader>} */
const _readers = new WeakMap();

/**
 * @param {NodeJS.ReadableStream} input
 * @returns {_LineReader}
 */
const _reader = (input) => {
  const existing = _readers.get(input);
  if (existing) return existing;
  const rl = require("node:readline").createInterface({ input, terminal: false, crlfDelay: Infinity });
  /** @type {_LineReader} */
  const reader = { rl, lines: [], waiting: [], closed: false };
  rl.on("line", (line) => {
    const next = reader.waiting.shift();
    if (next) next.resolve(line);
    else reader.lines.push(line);
    if (!reader.waiting.length) rl.pause();
  });
  rl.on("close", () => {
    reader.closed = true;
    for (const pending of reader.waiting.splice(0)) pending.reject(new Error("Input closed before an answer was given"));
  });
  _readers.set(input, reader);
  return reader;
};

/**
 * Detaches the line reader before raw mode, so keystrokes (a password)
 * never get queued as a line.
 * @param {NodeJS.ReadableStream} input
 */
const _releaseReader = (input) => {
  const reader = _readers.get(input);
  if (!reader) return;
  _readers.delete(input);
  reader.rl.close();
};

/**
 * Asks a question and returns the answer. With `validate`, it keeps asking
 * until the answer is valid.
 *
 * @example
 * const name = await cli.prompt("Project name?", { default: "my-app" });
 * const age = await cli.prompt("Age?", {
 *   validate: (answer) => /^\d+$/.test(answer) || "Please enter a number",
 * });
 *
 * @param {string} question
 * @param {PromptOptions} [options]
 * @returns {Promise<string>} Trimmed.
 */
async function prompt(question, options = {}) {
  const output = options.output ?? process.stdout;
  const input = options.input ?? process.stdin;
  const palette = color.create(color.detect(/** @type {any} */ (output)));
  const suffix = options.default !== undefined ? ` ${palette.level ? palette.gray(`(${options.default})`) : `(${options.default})`}` : "";
  for (;;) {
    const raw = (await _ask(`${palette.level ? palette.cyan("?") : "?"} ${question}${suffix} `, input, output)).trim();
    const answer = raw === "" && options.default !== undefined ? options.default : raw;
    const verdict = options.validate ? await options.validate(answer) : true;
    if (verdict === true) return answer;
    output.write(`${palette.level ? palette.red("✖") : "✖"} ${verdict}\n`);
  }
}

/**
 * Asks for a secret without showing it; each character appears as `*`.
 *
 * @example
 * const token = await cli.password("API token?");
 *
 * @param {string} question
 * @param {{ mask?: string, input?: NodeJS.ReadStream, output?: NodeJS.WriteStream }} [options] `mask: ""` shows nothing at all.
 * @returns {Promise<string>}
 */
function password(question, options = {}) {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const mask = options.mask ?? "*";
  const palette = color.create(color.detect(output));
  const label = `${palette.level ? palette.cyan("?") : "?"} ${question} `;
  if (!input.isTTY || typeof input.setRawMode !== "function") return _ask(label, input, output).then((a) => a.replace(/\r?\n$/, ""));
  return new Promise((resolve, reject) => {
    let value = "";
    output.write(label);
    _releaseReader(input);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onData = (/** @type {string} */ chunk) => {
      // Arrow and function keys arrive as an escape sequence: not part of a password.
      if (chunk.length > 1 && chunk.startsWith(ESCAPE)) return;
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          output.write("\n");
          resolve(value);
          return;
        }
        // Ctrl+C, Ctrl+D, Escape
        if (char === "\u0003" || char === "\u0004" || char === ESCAPE) {
          cleanup();
          output.write("\n");
          reject(new AbortError("Cancelled"));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value) {
            value = [...value].slice(0, -1).join("");
            if (mask) output.write("\b \b");
          }
          continue;
        }
        // Ctrl+U clears the line, as in a shell
        if (char === "\u0015") {
          if (mask) output.write("\b \b".repeat([...value].length));
          value = "";
          continue;
        }
        if (char < " ") continue;
        value += char;
        if (mask) output.write(mask);
      }
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    input.on("data", onData);
  });
}

/**
 * Asks a yes/no question. Understands `y`, `yes`, `o`, `oui`, `true`, `1`
 * and their opposites; an empty answer gives the default.
 *
 * @example
 * if (await cli.confirm("Delete 42 files?")) await cleanup();
 *
 * @param {string} question
 * @param {ConfirmOptions} [options]
 * @returns {Promise<boolean>}
 */
async function confirm(question, options = {}) {
  const output = options.output ?? process.stdout;
  const input = options.input ?? process.stdin;
  const def = options.default ?? false;
  const palette = color.create(color.detect(/** @type {any} */ (output)));
  const hint = palette.level ? palette.gray(def ? "(Y/n)" : "(y/N)") : def ? "(Y/n)" : "(y/N)";
  for (;;) {
    const answer = (await _ask(`${palette.level ? palette.cyan("?") : "?"} ${question} ${hint} `, input, output)).trim().toLowerCase();
    if (answer === "") return def;
    if (["y", "yes", "o", "oui", "true", "1"].includes(answer)) return true;
    if (["n", "no", "non", "false", "0"].includes(answer)) return false;
    output.write(`${palette.level ? palette.red("✖") : "✖"} Please answer yes or no\n`);
  }
}

/**
 * @template V
 * @param {Array<Choice<V>>} choices
 * @returns {Array<{ label: string, value: V, hint?: string, disabled?: boolean }>}
 */
const _normalizeChoices = (choices) =>
  choices.map((c) => (typeof c === "string" ? { label: c, value: /** @type {V} */ (/** @type {unknown} */ (c)) } : c));

/**
 * The arrow-key list behind `select()` and `multiselect()`.
 * @template V
 * @param {string} question
 * @param {Array<{ label: string, value: V, hint?: string, disabled?: boolean }>} items
 * @param {SelectOptions} options
 * @param {boolean} multiple
 * @returns {Promise<number[]>}
 */
const _interactiveList = (question, items, options, multiple) =>
  new Promise((resolve, reject) => {
    const input = options.input ?? process.stdin;
    const output = options.output ?? process.stdout;
    const palette = color.create(color.detect(output));
    const pageSize = Math.max(1, Math.min(options.pageSize ?? 10, items.length));
    const hint = multiple ? "(↑↓ move, space select, a all, enter confirm)" : "(↑↓ move, enter confirm)";
    const usable = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i !== -1);
    let cursor = Math.min(Math.max(0, options.default ?? 0), items.length - 1);
    if (items[cursor].disabled) cursor = usable.find((i) => i > cursor) ?? usable[0];
    /** @type {Set<number>} */
    const selected = new Set();
    let offset = 0;
    let drawn = 0;
    let error = "";

    const draw = () => {
      if (cursor < offset) offset = cursor;
      if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
      const position = items.length > pageSize ? ` ${cursor + 1}/${items.length}` : "";
      const lines = [`${palette.cyan("?")} ${question} ${palette.gray(hint + position)}`];
      for (let i = offset; i < offset + pageSize; i++) {
        const item = items[i];
        const active = i === cursor;
        const mark = multiple ? (selected.has(i) ? palette.green("◉ ") : "◯ ") : "";
        const text = item.disabled ? palette.gray(`${item.label} (disabled)`) : active ? palette.cyan(item.label) : item.label;
        lines.push(`${active ? palette.cyan("❯") : " "} ${mark}${text}${item.hint ? ` ${palette.gray(item.hint)}` : ""}`);
      }
      if (error) lines.push(palette.red(`✖ ${error}`));
      // Going back up assumes one row per line, so nothing may wrap.
      const text = lines.map((line) => `\u001b[2K${_oneRow(line, output)}`).join("\n");
      output.write(`${drawn ? _up(drawn) : ""}${text}\n${drawn > lines.length ? CLEAR_BELOW : ""}`);
      drawn = lines.length;
    };
    const move = (/** @type {number} */ step) => {
      const at = usable.indexOf(cursor);
      cursor = usable[(at + step + usable.length) % usable.length];
    };
    const jump = (/** @type {number} */ target) => {
      // the closest choice that can be picked, looking towards the target first
      const clamped = Math.max(0, Math.min(items.length - 1, target));
      cursor = usable.reduce((best, i) => (Math.abs(i - clamped) < Math.abs(best - clamped) ? i : best), cursor);
    };
    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(false);
      input.pause();
      output.write(SHOW_CURSOR);
    };
    const onKey = (/** @type {string} */ _str, /** @type {{ name?: string, ctrl?: boolean }} */ key = {}) => {
      error = "";
      if ((key.ctrl && (key.name === "c" || key.name === "d")) || key.name === "escape") {
        cleanup();
        reject(new AbortError("Cancelled"));
        return;
      }
      if (key.name === "up" || key.name === "k") move(-1);
      else if (key.name === "down" || key.name === "j") move(1);
      else if (key.name === "home") jump(0);
      else if (key.name === "end") jump(items.length - 1);
      else if (key.name === "pageup") jump(cursor - pageSize);
      else if (key.name === "pagedown") jump(cursor + pageSize);
      else if (key.name === "space" && multiple) {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (key.name === "a" && multiple) {
        const all = usable.every((i) => selected.has(i));
        for (const i of usable) {
          if (all) selected.delete(i);
          else selected.add(i);
        }
      } else if (key.name === "return" || key.name === "enter") {
        if (multiple && selected.size < (options.min ?? 0)) {
          error = `Select at least ${options.min}`;
        } else {
          const picked = multiple ? [...selected].sort((a, b) => a - b) : [cursor];
          // Fold the list into one line that says what was chosen.
          output.write(`${_up(drawn)}${CLEAR_BELOW}${_oneRow(`${palette.green("✔")} ${question} ${palette.cyan(picked.map((i) => items[i].label).join(", "))}`, output)}\n`);
          cleanup();
          resolve(picked);
          return;
        }
      }
      draw();
    };
    _releaseReader(input);
    require("node:readline").emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    _restoreCursorOnExit(output);
    output.write(HIDE_CURSOR);
    input.on("keypress", onKey);
    draw();
  });

/**
 * Lets the user pick one choice with the arrow keys and Enter. Without an
 * interactive terminal, it prints a numbered list and reads a number.
 *
 * @example
 * const framework = await cli.select("Framework?", ["Express", "Fastify", "Koa"]);
 * const plan = await cli.select("Plan?", [
 *   { label: "Free", value: "free", hint: "0 €" },
 *   { label: "Pro", value: "pro", hint: "9 €/month" },
 * ]);
 *
 * @template [V=string]
 * @param {string} question
 * @param {Array<Choice<V>>} choices
 * @param {SelectOptions} [options]
 * @returns {Promise<V>}
 */
async function select(question, choices, options = {}) {
  const items = _normalizeChoices(choices);
  if (!items.some((item) => !item.disabled)) throw new RangeError("select() needs at least one choice that can be picked");
  const input = options.input ?? process.stdin;
  if (input.isTTY && typeof input.setRawMode === "function") {
    const [index] = await _interactiveList(question, items, options, false);
    return items[index].value;
  }
  const output = options.output ?? process.stdout;
  output.write(`? ${question}\n${items.map((it, i) => `  ${i + 1}. ${it.label}${it.disabled ? " (disabled)" : ""}`).join("\n")}\n`);
  for (;;) {
    const answer = (await _ask(`Choose 1-${items.length}${options.default !== undefined ? ` (${options.default + 1})` : ""}: `, input, output)).trim();
    const index = answer === "" && options.default !== undefined ? options.default : Number(answer) - 1;
    if (Number.isInteger(index) && items[index] && !items[index].disabled) return items[index].value;
    output.write("✖ Invalid choice\n");
  }
}

/**
 * Lets the user pick several choices: arrows to move, Space to toggle, `a`
 * for all, Enter to confirm.
 *
 * @example
 * const features = await cli.multiselect("Features?", ["TypeScript", "ESLint", "Tests", "Docker"], { min: 1 });
 *
 * @template [V=string]
 * @param {string} question
 * @param {Array<Choice<V>>} choices
 * @param {SelectOptions} [options]
 * @returns {Promise<V[]>} In list order.
 */
async function multiselect(question, choices, options = {}) {
  const items = _normalizeChoices(choices);
  const input = options.input ?? process.stdin;
  if (items.some((item) => !item.disabled) && input.isTTY && typeof input.setRawMode === "function") {
    const indexes = await _interactiveList(question, items, options, true);
    return indexes.map((i) => items[i].value);
  }
  const output = options.output ?? process.stdout;
  output.write(`? ${question}\n${items.map((it, i) => `  ${i + 1}. ${it.label}${it.disabled ? " (disabled)" : ""}`).join("\n")}\n`);
  for (;;) {
    const answer = (await _ask("Choose (comma-separated numbers): ", input, output)).trim();
    const indexes = answer === "" ? [] : answer.split(/[\s,]+/).filter(Boolean).map((n) => Number(n) - 1);
    if (indexes.every((i) => Number.isInteger(i) && items[i] && !items[i].disabled) && indexes.length >= (options.min ?? 0)) {
      return [...new Set(indexes)].sort((a, b) => a - b).map((i) => items[i].value);
    }
    output.write(`✖ Invalid selection${options.min ? ` (at least ${options.min})` : ""}\n`);
  }
}

const _TRUE = ["1", "true", "yes", "on", "y"];
const _FALSE = ["0", "false", "no", "off", "n", ""];

/**
 * @param {string} word
 * @param {string[]} known
 * @param {string} [prefix]
 */
const _suggest = (word, known, prefix = "") => {
  const guess = require("./Str.js").closest(word, known);
  return guess ? `. Did you mean ${prefix}${guess}?` : "";
};

/**
 * Parses command-line arguments from a schema, and types the result:
 * `flags.port` is a `number`. Handles short aliases, defaults, required
 * flags, allowed values, repeated flags, `--no-flag`, environment variables
 * as a fallback and subcommands, and generates `--help`. A typo gets a
 * "Did you mean...?" suggestion.
 *
 * @example
 * // node server.js --port 8080 -v --tag api --tag web public/
 * const { flags, positionals } = cli.args({
 *   port: { type: "number", short: "p", default: 3000, env: "PORT", description: "Port to listen on" },
 *   verbose: { type: "boolean", short: "v" },
 *   tag: { type: "string", multiple: true },
 *   env: { type: "string", choices: ["dev", "prod"], default: "dev" },
 * }, { description: "Start the web server", version: "1.0.0" });
 * // flags: { port: 8080, verbose: true, tag: ["api", "web"], env: "dev" }
 *
 * // node tool.js build --watch
 * const { command, flags: buildFlags } = cli.args({ watch: { type: "boolean" } }, {
 *   commands: { build: "Build the project", serve: "Start the dev server" },
 * });
 * // command: "build"
 *
 * @template {Record<string, FlagSpec>} S
 * @param {S} schema
 * @param {ArgsOptions} [options]
 * @returns {ParsedArgs<S>}
 * @throws {TypeError} For unknown flags or commands, bad numbers, missing required flags or values not in `choices`. The message is ready to show.
 */
function args(schema, options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const name = options.name ?? require("node:path").basename(process.argv[1] ?? "cli", ".js");
  const env = options.env ?? process.env;
  const commands = options.commands ? Object.keys(options.commands) : [];

  const help = () => {
    const lines = [];
    if (options.description) lines.push(options.description, "");
    lines.push(`Usage: ${name} ${options.usage ?? (commands.length ? "<command> [options]" : "[options]")}`);
    /** @param {Array<[string, string]>} rows */
    const list = (rows) => {
      const width = Math.max(...rows.map(([left]) => left.length));
      for (const [left, right] of rows) lines.push(`  ${left.padEnd(width)}  ${right}`.trimEnd());
    };
    if (options.commands && commands.length) {
      lines.push("", "Commands:");
      list(Object.entries(options.commands));
    }
    lines.push("", "Options:");
    /** @type {Array<[string, string]>} */
    const rows = Object.entries(schema).map(([key, spec]) => {
      const flag = `${spec.short ? `-${spec.short}, ` : "    "}--${key}${spec.type === "boolean" ? "" : ` <${spec.type}>`}`;
      const details = [
        spec.description ?? "",
        spec.choices ? `(${spec.choices.join(" | ")})` : "",
        spec.default !== undefined ? `[default: ${JSON.stringify(spec.default)}]` : "",
        spec.env ? `[env: ${spec.env}]` : "",
        spec.required ? "[required]" : "",
      ].filter(Boolean).join(" ");
      return [flag, details];
    });
    if (options.help !== false) rows.push(["-h, --help", "Show this help"]);
    if (options.version) rows.push(["    --version", "Show the version"]);
    list(rows);
    if (options.examples?.length) {
      lines.push("", "Examples:");
      for (const example of options.examples) lines.push(`  ${example}`);
    }
    return lines.join("\n");
  };

  // Everything after "--" belongs to the program, even if it looks like a flag.
  const end = argv.indexOf("--");
  const own = end === -1 ? argv : argv.slice(0, end);
  if (options.help !== false && (own.includes("--help") || own.includes("-h")) && !Object.hasOwn(schema, "help")) {
    process.stdout.write(`${help()}\n`);
    process.exit(0);
  }
  if (options.version && own.includes("--version") && !Object.hasOwn(schema, "version")) {
    process.stdout.write(`${options.version}\n`);
    process.exit(0);
  }

  /** @type {Record<string, { type: "string" | "boolean", short?: string, multiple?: boolean }>} */
  const config = {};
  for (const [key, spec] of Object.entries(schema)) {
    config[key] = { type: spec.type === "boolean" ? "boolean" : "string" };
    if (spec.short) config[key].short = spec.short;
    if (spec.multiple) config[key].multiple = true;
  }

  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: config, allowPositionals: true, strict: options.strict ?? true, allowNegative: true });
  } catch (error) {
    const message = /** @type {Error} */ (error).message;
    const unknown = /Unknown option '(-{1,2})([^']+)'/.exec(message);
    if (unknown) throw new TypeError(`Unknown option ${unknown[1]}${unknown[2]}${_suggest(unknown[2].replace(/^no-/, ""), Object.keys(schema), "--")}`);
    const missing = /Option '(?:-\w, )?--([^ ']+) <value>' argument missing/.exec(message);
    throw new TypeError(missing ? `Option --${missing[1]} needs a value` : message.split("\n")[0]);
  }

  /** @type {Record<string, any>} */
  const flags = {};
  for (const [key, spec] of Object.entries(schema)) {
    const fromEnv = spec.env !== undefined ? env[spec.env] : undefined;
    const source = /** @type {any} */ (parsed.values)[key] !== undefined ? `Option --${key}` : `Environment variable ${spec.env}`;
    let raw = /** @type {any} */ (parsed.values)[key];
    if (raw === undefined && fromEnv !== undefined) {
      // In a variable, a list is written with commas.
      raw = spec.multiple ? fromEnv.split(",").map((part) => part.trim()).filter(Boolean) : fromEnv;
    }
    if (raw === undefined) {
      if (spec.required) throw new TypeError(`Missing required option --${key}${spec.env ? ` (or ${spec.env} in the environment)` : ""}`);
      flags[key] = spec.default !== undefined ? spec.default : spec.type === "boolean" ? false : spec.multiple ? [] : undefined;
      continue;
    }
    const convert = (/** @type {any} */ value) => {
      /** @type {any} */
      let result = value;
      if (spec.type === "number") {
        result = Number(value);
        if (String(value).trim() === "" || !Number.isFinite(result)) throw new TypeError(`${source} expects a number, got "${value}"`);
      } else if (spec.type === "boolean" && typeof value === "string") {
        const text = value.trim().toLowerCase();
        if (!_TRUE.includes(text) && !_FALSE.includes(text)) throw new TypeError(`${source} expects true or false, got "${value}"`);
        result = _TRUE.includes(text);
      }
      if (spec.choices && !(/** @type {readonly unknown[]} */ (spec.choices)).includes(result)) {
        throw new TypeError(`${source} must be one of: ${spec.choices.join(", ")} (got "${value}")`);
      }
      return result;
    };
    flags[key] = Array.isArray(raw) ? raw.map(convert) : convert(raw);
  }

  const positionals = parsed.positionals;
  /** @type {string | undefined} */
  let command;
  if (commands.length && positionals.length) {
    command = positionals[0];
    if (!commands.includes(command)) {
      throw new TypeError(`Unknown command "${command}"${_suggest(command, commands) || `. Available: ${commands.join(", ")}`}`);
    }
    positionals.shift();
  }
  return { flags: /** @type {ParsedFlags<S>} */ (flags), positionals, command, help };
}

/**
 * Is someone at the keyboard? True when stdin and stdout are terminals and
 * we're not in CI.
 *
 * @example
 * const name = cli.isInteractive() ? await cli.prompt("Name?") : "default";
 *
 * @returns {boolean}
 */
function isInteractive() {
  return Boolean(process.stdin.isTTY) && _isTTY(process.stdout);
}

/**
 * The terminal size, or 80x24 when it's unknown.
 *
 * @returns {{ columns: number, rows: number }}
 */
function size() {
  const columns = process.stdout.columns || process.stderr.columns || Number(process.env.COLUMNS) || 80;
  const rows = process.stdout.rows || process.stderr.rows || Number(process.env.LINES) || 24;
  return { columns, rows };
}

/**
 * Clears the screen. Does nothing when stdout isn't a terminal.
 *
 * @returns {void}
 */
function clear() {
  if (process.stdout.isTTY) process.stdout.write("\u001b[2J\u001b[3J\u001b[H");
}

module.exports = {
  table,
  box,
  tree,
  spinner,
  spin,
  progress,
  prompt,
  password,
  confirm,
  select,
  multiselect,
  args,
  isInteractive,
  size,
  clear,
};
