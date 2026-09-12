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

const readline = require("node:readline");
const { parseArgs } = require("node:util");
const color = require("./Color.js");

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
 * @property {readonly string[]} [choices] Allowed values, for string flags.
 * @property {string} [description] Shown in `--help`.
 */

/**
 * The type of a flag's value.
 * @template {FlagSpec} F
 * @typedef {F["type"] extends "number" ? number : F["type"] extends "boolean" ? boolean : F extends { choices: readonly (infer C)[] } ? C : string} FlagValue
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
 * @property {boolean} [help] Answer `--help` and `-h` by printing the help and exiting. Defaults to `true`.
 * @property {string} [version] Answer `--version` with this version.
 * @property {boolean} [strict] Reject unknown flags, with a suggestion. Defaults to `true`.
 */

/**
 * What `args()` returns.
 * @template {Record<string, FlagSpec>} S
 * @typedef {object} ParsedArgs
 * @property {ParsedFlags<S>} flags
 * @property {string[]} positionals Arguments that aren't flags.
 * @property {() => string} help The generated help text.
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

/**
 * @param {string} text
 * @param {number} max
 */
const _cut = (text, max) => {
  if (color.width(text) <= max) return text;
  const plain = color.strip(text);
  let out = "";
  for (const { segment } of new Intl.Segmenter().segment(plain)) {
    if (color.width(out + segment) > max - 1) break;
    out += segment;
  }
  return `${out}…`;
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
  const isArrayRows = rows.length > 0 && Array.isArray(rows[0]);
  /** @type {TableColumn[]} */
  const columns = (options.columns ?? (isArrayRows
    ? Array.from({ length: Math.max(0, ...rows.map((r) => /** @type {unknown[]} */ (r).length)) }, (_, i) => i)
    : [...new Set(rows.flatMap((r) => Object.keys(/** @type {object} */ (r ?? {}))))]
  )).map((c) => (typeof c === "object" ? c : { key: c }));

  const body = rows.map((row) => columns.map((col) => {
    const raw = /** @type {any} */ (row)?.[col.key];
    const value = col.format ? col.format(raw, row) : raw;
    const text = _cell(value);
    return { text: col.maxWidth ? _cut(text, col.maxWidth) : text, numeric: typeof raw === "number" || typeof raw === "bigint" };
  }));
  const showHeader = options.header ?? !isArrayRows;
  const headers = columns.map((c) => c.header ?? String(c.key));
  const widths = columns.map((c, i) => Math.max(showHeader ? color.width(headers[i]) : 0, ...body.map((r) => color.width(r[i].text)), 1));
  const alignOf = (/** @type {number} */ i, /** @type {boolean} */ numeric) => columns[i].align ?? (numeric ? "right" : "left");

  if (options.border === "markdown") {
    const line = (/** @type {string[]} */ cells) => `| ${cells.join(" | ")} |`;
    const escaped = body.map((r) => r.map((c) => ({ ...c, text: c.text.replace(/\|/g, "\\|") })));
    const mdWidths = widths.map((w, i) => Math.max(3, w, ...escaped.map((r) => color.width(r[i].text))));
    /** @type {Array<"left" | "center" | "right">} */
    const mdAlign = columns.map((c, i) => c.align ?? (body.length > 0 && body.every((r) => r[i].numeric) ? "right" : "left"));
    const out = [];
    if (showHeader) {
      out.push(line(headers.map((h, i) => _align(h, mdWidths[i], mdAlign[i]))));
      out.push(line(mdWidths.map((w, i) => {
        const dashes = "-".repeat(w);
        return mdAlign[i] === "center" ? `:${dashes.slice(2)}:` : mdAlign[i] === "right" ? `${dashes.slice(1)}:` : dashes;
      })));
    }
    for (const r of escaped) out.push(line(r.map((c, i) => _align(c.text, mdWidths[i], mdAlign[i]))));
    return out.join("\n");
  }

  const b = BORDERS[options.border ?? "rounded"];
  const dim = (/** @type {string} */ s) => (palette.level > 0 ? palette.gray(s) : s);
  const rule = (/** @type {string} */ left, /** @type {string} */ fill, /** @type {string} */ mid, /** @type {string} */ right) =>
    dim(left + widths.map((w) => fill.repeat(w + padding.length * 2)).join(mid) + right);
  const row = (/** @type {string[]} */ cells) => dim(b[7]) + cells.map((c) => padding + c + padding).join(dim(b[3])) + dim(b[3]);
  const out = [rule(b[0], b[1], b[12], b[2])];
  if (showHeader) {
    out.push(row(headers.map((h, i) => _align(palette.level > 0 ? palette.bold(h) : h, widths[i], columns[i].align ?? "left"))));
    out.push(rule(b[8], b[9], b[11], b[10]));
  }
  for (const r of body) out.push(row(r.map((c, i) => _align(c.text, widths[i], alignOf(i, c.numeric)))));
  out.push(rule(b[6], b[5], b[13], b[4]));
  return out.join("\n");
}

/**
 * Draws a box around text.
 *
 * @example
 * console.log(cli.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" }));
 * // ╭─ my-app ──────────────────╮
 * // │  Server ready             │
 * // │  http://localhost:3000    │
 * // ╰───────────────────────────╯
 *
 * @param {string} text
 * @param {BoxOptions} [options]
 * @returns {string}
 */
function box(text, options = {}) {
  const palette = _palette(options.colors);
  const b = BORDERS[options.border ?? "rounded"];
  const pad = typeof options.padding === "number" ? { x: options.padding, y: Math.floor(options.padding / 2) } : { x: 2, y: 0, ...options.padding };
  const lines = String(text).split(/\r?\n/);
  const title = options.title ? ` ${options.title} ` : "";
  const inner = Math.max(options.width ?? 0, ...lines.map((l) => color.width(l)), color.width(title) + 2 - pad.x * 2) + pad.x * 2;
  const paint = (/** @type {string} */ s) => _paint(palette, options.borderColor, s);
  const top = title
    ? paint(b[0] + b[1]) + (palette.level > 0 ? palette.bold(title) : title) + paint(b[1].repeat(Math.max(0, inner - color.width(title) - 1)) + b[2])
    : paint(b[0] + b[1].repeat(inner) + b[2]);
  const blank = paint(b[7]) + " ".repeat(inner) + paint(b[3]);
  const out = [top];
  for (let i = 0; i < pad.y; i++) out.push(blank);
  for (const line of lines) {
    out.push(paint(b[7]) + " ".repeat(pad.x) + _align(line, inner - pad.x * 2, options.align ?? "left") + " ".repeat(pad.x) + paint(b[3]));
  }
  for (let i = 0; i < pad.y; i++) out.push(blank);
  out.push(paint(b[6] + b[5].repeat(inner) + b[4]));
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
  const frames = options.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const palette = color.create(color.detect(stream));
  const interactive = _isTTY(stream);
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  let frame = 0;
  let current = text;

  const render = () => {
    stream.write(`${CLEAR_LINE}${_paint(palette, options.color ?? "cyan", frames[frame % frames.length])} ${current}`);
    frame++;
  };
  /**
   * @param {string} symbol
   * @param {string | undefined} finalText
   */
  const finish = (symbol, finalText) => {
    const wasSpinning = timer !== undefined;
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
        if (timer === undefined) stream.write(`- ${current}\n`);
        timer = setInterval(() => {}, 1 << 30);
        timer.unref();
        return self;
      }
      clearInterval(timer);
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
      if (timer !== undefined && interactive) render();
    },
    get isSpinning() {
      return timer !== undefined;
    },
  };
  return self;
}

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
  const started = Date.now();
  let value = 0;
  let total = Math.max(0, options.total);
  let label = options.label ?? "";
  let lastRender = 0;
  let stopped = false;

  const line = () => {
    const ratio = total > 0 ? Math.min(1, value / total) : 1;
    const width = options.width ?? 30;
    const filled = Math.round(ratio * width);
    const elapsed = (Date.now() - started) / 1000;
    const rate = elapsed > 0 ? value / elapsed : 0;
    const eta = rate > 0 && ratio < 1 ? (total - value) / rate : 0;
    const fmt = (/** @type {number} */ s) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m` : s >= 60 ? `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, "0")}s` : `${Math.ceil(s)}s`);
    const bar = _paint(palette, "cyan", (options.complete ?? "█").repeat(filled)) + _paint(palette, "gray", (options.incomplete ?? "░").repeat(width - filled));
    return (options.format ?? "{bar} {percent}% | {value}/{total} | ETA {eta}")
      .replace("{bar}", bar)
      .replace("{percent}", String(Math.floor(ratio * 100)).padStart(3))
      .replace("{value}", String(value))
      .replace("{total}", String(total))
      .replace("{eta}", fmt(eta))
      .replace("{elapsed}", fmt(elapsed))
      .replace("{rate}", `${Math.round(rate * 10) / 10}/s`)
      .replace("{label}", label);
  };
  const draw = (/** @type {boolean} */ force) => {
    if (!interactive || stopped) return;
    const now = Date.now();
    if (!force && now - lastRender < 50 && value < total) return;
    lastRender = now;
    stream.write(`${CLEAR_LINE}${line()}`);
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
      stream.write(interactive ? "\n" : `${line()}\n`);
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
 * @typedef {{ rl: readline.Interface, lines: string[], waiting: Array<{ resolve: (line: string) => void, reject: (error: Error) => void }>, closed: boolean }} LineReader
 */

/** @type {WeakMap<NodeJS.ReadableStream, LineReader>} */
const _readers = new WeakMap();

/**
 * @param {NodeJS.ReadableStream} input
 * @returns {LineReader}
 */
const _reader = (input) => {
  const existing = _readers.get(input);
  if (existing) return existing;
  const rl = readline.createInterface({ input, terminal: false, crlfDelay: Infinity });
  /** @type {LineReader} */
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
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          output.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          output.write("\n");
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value) {
            value = [...value].slice(0, -1).join("");
            if (mask) output.write("\b \b");
          }
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
    let cursor = Math.min(Math.max(0, options.default ?? 0), items.length - 1);
    while (items[cursor]?.disabled && cursor < items.length - 1) cursor++;
    const selected = new Set();
    let offset = 0;
    let drawn = 0;
    let error = "";

    const draw = () => {
      if (drawn) output.write(`\u001b[${drawn}A`);
      if (cursor < offset) offset = cursor;
      if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
      const lines = [`${palette.cyan("?")} ${question} ${palette.gray(multiple ? "(↑↓ move, space select, enter confirm)" : "(↑↓ move, enter confirm)")}`];
      for (let i = offset; i < offset + pageSize; i++) {
        const item = items[i];
        const active = i === cursor;
        const box = multiple ? (selected.has(i) ? palette.green("◉ ") : "◯ ") : "";
        const text = item.disabled ? palette.gray(`${item.label} (disabled)`) : active ? palette.cyan(item.label) : item.label;
        lines.push(`${active ? palette.cyan("❯") : " "} ${box}${text}${item.hint ? ` ${palette.gray(item.hint)}` : ""}`);
      }
      if (error) lines.push(palette.red(`✖ ${error}`));
      output.write(lines.map((l) => `\u001b[2K${l}`).join("\n") + "\n");
      if (drawn > lines.length) output.write(`\u001b[0J`);
      drawn = lines.length;
    };
    const move = (/** @type {number} */ step) => {
      let next = cursor;
      for (let tries = 0; tries < items.length; tries++) {
        next = (next + step + items.length) % items.length;
        if (!items[next].disabled) break;
      }
      cursor = next;
    };
    const onKey = (/** @type {string} */ _str, /** @type {{ name?: string, ctrl?: boolean }} */ key) => {
      error = "";
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }
      if (key.name === "up" || key.name === "k") move(-1);
      else if (key.name === "down" || key.name === "j") move(1);
      else if (key.name === "space" && multiple && !items[cursor].disabled) {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (key.name === "a" && multiple) {
        const all = items.every((it, i) => it.disabled || selected.has(i));
        items.forEach((it, i) => (it.disabled ? null : all ? selected.delete(i) : selected.add(i)));
      } else if (key.name === "return") {
        if (multiple && selected.size < (options.min ?? 0)) {
          error = `Select at least ${options.min}`;
        } else {
          cleanup();
          resolve(multiple ? [...selected].sort((a, b) => a - b) : [cursor]);
          return;
        }
      }
      draw();
    };
    const cleanup = () => {
      input.off("keypress", onKey);
      input.setRawMode(false);
      input.pause();
      output.write(SHOW_CURSOR);
    };
    _releaseReader(input);
    readline.emitKeypressEvents(input);
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
  if (!items.length) throw new RangeError("select() needs at least one choice");
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
  if (items.length && input.isTTY && typeof input.setRawMode === "function") {
    const indexes = await _interactiveList(question, items, options, true);
    return indexes.map((i) => items[i].value);
  }
  const output = options.output ?? process.stdout;
  output.write(`? ${question}\n${items.map((it, i) => `  ${i + 1}. ${it.label}`).join("\n")}\n`);
  for (;;) {
    const answer = (await _ask("Choose (comma-separated numbers): ", input, output)).trim();
    const indexes = answer === "" ? [] : answer.split(/[\s,]+/).map((n) => Number(n) - 1);
    if (indexes.every((i) => Number.isInteger(i) && items[i] && !items[i].disabled) && indexes.length >= (options.min ?? 0)) {
      return [...new Set(indexes)].sort((a, b) => a - b).map((i) => items[i].value);
    }
    output.write(`✖ Invalid selection${options.min ? ` (at least ${options.min})` : ""}\n`);
  }
}

/**
 * Parses command-line arguments from a schema, and types the result:
 * `flags.port` is a `number`. Handles short aliases, defaults, required
 * flags, allowed values, repeated flags and `--no-flag`, and generates
 * `--help`. A typo gets a "Did you mean...?" suggestion.
 *
 * @example
 * // node server.js --port 8080 -v --tag api --tag web public/
 * const { flags, positionals } = cli.args({
 *   port: { type: "number", short: "p", default: 3000, description: "Port to listen on" },
 *   verbose: { type: "boolean", short: "v" },
 *   tag: { type: "string", multiple: true },
 *   env: { type: "string", choices: ["dev", "prod"], default: "dev" },
 * }, { description: "Start the web server", version: "1.0.0" });
 * // flags: { port: 8080, verbose: true, tag: ["api", "web"], env: "dev" }
 *
 * @template {Record<string, FlagSpec>} S
 * @param {S} schema
 * @param {ArgsOptions} [options]
 * @returns {ParsedArgs<S>}
 * @throws {TypeError} For unknown flags, bad numbers, missing required flags or values not in `choices`. The message is ready to show.
 */
function args(schema, options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const name = options.name ?? require("node:path").basename(process.argv[1] ?? "cli", ".js");

  const help = () => {
    const lines = [];
    if (options.description) lines.push(options.description, "");
    lines.push(`Usage: ${name} ${options.usage ?? "[options]"}`, "", "Options:");
    const rows = Object.entries(schema).map(([key, spec]) => {
      const flag = `${spec.short ? `-${spec.short}, ` : "    "}--${key}${spec.type === "boolean" ? "" : ` <${spec.type}>`}`;
      const details = [
        spec.description ?? "",
        spec.choices ? `(${spec.choices.join(" | ")})` : "",
        spec.default !== undefined ? `[default: ${JSON.stringify(spec.default)}]` : "",
        spec.required ? "[required]" : "",
      ].filter(Boolean).join(" ");
      return [flag, details];
    });
    if (options.help !== false) rows.push(["-h, --help", "Show this help"]);
    if (options.version) rows.push(["    --version", "Show the version"]);
    const width = Math.max(...rows.map(([f]) => f.length));
    for (const [flag, details] of rows) lines.push(`  ${flag.padEnd(width)}  ${details}`.trimEnd());
    return lines.join("\n");
  };

  if (options.help !== false && (argv.includes("--help") || argv.includes("-h")) && !("help" in schema)) {
    process.stdout.write(`${help()}\n`);
    process.exit(0);
  }
  if (options.version && argv.includes("--version") && !("version" in schema)) {
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
    if (unknown) {
      const { closest } = require("./Str.js");
      const guess = closest(unknown[2], Object.keys(schema));
      throw new TypeError(`Unknown option ${unknown[1]}${unknown[2]}${guess ? `. Did you mean --${guess}?` : ""}`);
    }
    throw new TypeError(message);
  }

  /** @type {Record<string, any>} */
  const flags = {};
  for (const [key, spec] of Object.entries(schema)) {
    const raw = /** @type {any} */ (parsed.values)[key];
    if (raw === undefined) {
      if (spec.required) throw new TypeError(`Missing required option --${key}`);
      flags[key] = spec.default !== undefined ? spec.default : spec.type === "boolean" ? false : spec.multiple ? [] : undefined;
      continue;
    }
    const convert = (/** @type {any} */ value) => {
      if (spec.type === "number") {
        const n = Number(value);
        if (value === "" || !Number.isFinite(n)) throw new TypeError(`Option --${key} expects a number, got "${value}"`);
        return n;
      }
      if (spec.choices && !spec.choices.includes(value)) throw new TypeError(`Option --${key} must be one of: ${spec.choices.join(", ")} (got "${value}")`);
      return value;
    };
    flags[key] = Array.isArray(raw) ? raw.map(convert) : convert(raw);
  }
  return { flags: /** @type {ParsedFlags<S>} */ (flags), positionals: parsed.positionals, help };
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
  return { columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 };
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
  spinner,
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
