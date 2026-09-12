"use strict";

/**
 * A console logger that works with zero setup: levels, colors, a small
 * markup for styling, groups, timers and tables. In production, switch to
 * one JSON object per line with `LOG_FORMAT=json`, and write to rotating
 * files if you need to.
 *
 * Markup: `<% red bold Error:%> disk is full`. Any style name works, plus
 * `#ff8800`, `bg#1e1e2e`, `rgb(255, 128, 0)` and `bgRgb(...)`.
 *
 * Levels, from chatty to severe: `trace`, `debug`, `info`, `warn`, `error`,
 * `fatal`. The default is `info`, or `debug` when `DEBUG` is set; `LOG_LEVEL`
 * overrides it. Warnings and errors go to stderr.
 *
 * @example
 * nc.info("Server listening on port 3000");
 * nc.warn("Cache is almost full");
 * nc.error(new Error("Payment failed", { cause: err }));
 * nc.log("<% cyan bold Tip:%> press <% bgWhite black  q  %> to quit");
 */

const fs = require("node:fs");
const path = require("node:path");
const util = require("node:util");
const color = require("./Color.js");
const time = require("./Time.js");

/**
 * Log levels, from the most verbose to the most severe. `silent` hides everything.
 * @typedef {"trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"} LogLevel
 */

/**
 * Where logs go: `process.stdout`, a file stream, or anything with a
 * `write(text)` method.
 * @typedef {{ write(text: string): unknown }} LogStream
 */

/**
 * Writing logs to a file.
 * @typedef {object} LogFileOptions
 * @property {string} path The file to append to. Folders are created, colors removed.
 * @property {string | number} [maxSize] Rotate past this size, like `"10MB"`.
 * @property {number} [maxFiles] How many rotated files to keep. Defaults to `5`.
 */

/**
 * Options for `createLogger()` and `configure()`.
 * @typedef {object} LoggerOptions
 * @property {LogLevel} [level] Hide messages below this level. Defaults to `LOG_LEVEL`, else `"info"`.
 * @property {string} [scope] Shown before each message, like `[db]`. Child loggers extend it (`db:pool`).
 * @property {boolean | string} [timestamp] `true` shows `[HH:mm:ss]`, `false` hides it, a string is a `time.format` pattern. Defaults to `true`.
 * @property {"pretty" | "json"} [format] `"json"` writes one object per line, for log collectors. Defaults to `LOG_FORMAT`, else `"pretty"`.
 * @property {{ open?: string, close?: string }} [delimiter] Markup delimiters. Defaults to `<%` and `%>`.
 * @property {boolean} [colors] Force colors on or off. By default, it depends on the terminal.
 * @property {LogStream} [stdout] Where `trace` to `info` go. Defaults to `process.stdout`.
 * @property {LogStream} [stderr] Where `warn`, `error` and `fatal` go. Defaults to `process.stderr`.
 * @property {string | LogFileOptions} [file] Also write every message to a file.
 * @property {Record<string, unknown>} [fields] Added to every JSON record, like a service name.
 */

/**
 * A logger from `createLogger()`. Every method returns the logger, so calls chain.
 *
 * @typedef {object} Logger
 * @property {(...args: unknown[]) => Logger} log A plain message, no badge. Supports markup.
 * @property {(...args: unknown[]) => Logger} trace Very detailed diagnostics, hidden unless the level is `trace`.
 * @property {(...args: unknown[]) => Logger} debug Diagnostics, hidden unless the level is `debug` or lower.
 * @property {(...args: unknown[]) => Logger} info An `ℹ INFO` message.
 * @property {(...args: unknown[]) => Logger} success A `✔ OK` message.
 * @property {(...args: unknown[]) => Logger} warn A `⚠ WARN` message, on stderr.
 * @property {(...args: unknown[]) => Logger} error An `✖ ERROR` message, on stderr. Errors show their stack and cause.
 * @property {(...args: unknown[]) => Logger} fatal An `✖ FATAL` message, on stderr.
 * @property {(label?: string) => Logger} group Prints a label and indents what follows. Groups nest.
 * @property {() => Logger} groupEnd Closes the current group.
 * @property {(label?: string) => Logger} timeStart Starts a named timer.
 * @property {(label?: string) => Logger} timeEnd Prints how long since `timeStart(label)`.
 * @property {(rows: Array<Record<string, unknown>> | unknown[][], options?: import("./Cli").TableOptions) => Logger} table Prints rows as a table.
 * @property {(text: string, options?: import("./Cli").BoxOptions) => Logger} box Prints text in a box.
 * @property {(title?: string) => Logger} divider Prints a horizontal line.
 * @property {(scope: string, options?: LoggerOptions) => Logger} child A logger with the same settings and a nested scope. Its `fields` are added to the parent's.
 * @property {(level: LogLevel) => Logger} setLevel Changes the minimum level.
 * @property {() => LogLevel} getLevel The current minimum level.
 * @property {(level: LogLevel) => boolean} isLevelEnabled Would this level be printed? Skip expensive debug output when it wouldn't.
 * @property {(options: LoggerOptions) => Logger} configure Changes several settings at once.
 */

/** @type {Record<LogLevel, number>} */
const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60, silent: Infinity };

/** @type {Record<string, { label: string, style: string, stream: "stdout" | "stderr", level: LogLevel }>} */
const BADGES = {
  log: { label: "", style: "", stream: "stdout", level: "info" },
  trace: { label: "… TRACE", style: "gray dim", stream: "stdout", level: "trace" },
  debug: { label: "● DEBUG", style: "gray bold", stream: "stdout", level: "debug" },
  info: { label: "ℹ INFO", style: "cyan bold", stream: "stdout", level: "info" },
  success: { label: "✔ OK", style: "greenBright bold", stream: "stdout", level: "info" },
  warn: { label: "⚠ WARN", style: "yellowBright bold", stream: "stderr", level: "warn" },
  error: { label: "✖ ERROR", style: "redBright bold", stream: "stderr", level: "error" },
  fatal: { label: "✖ FATAL", style: "bgRed whiteBright bold", stream: "stderr", level: "fatal" },
};

const STYLE_NAMES = new Set([
  "reset", "bold", "dim", "italic", "underline", "overline", "inverse", "hidden", "strikethrough",
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray", "grey",
  "blackBright", "redBright", "greenBright", "yellowBright", "blueBright", "magentaBright", "cyanBright", "whiteBright",
  "bgBlack", "bgRed", "bgGreen", "bgYellow", "bgBlue", "bgMagenta", "bgCyan", "bgWhite", "bgGray", "bgGrey",
  "bgBlackBright", "bgRedBright", "bgGreenBright", "bgYellowBright", "bgBlueBright", "bgMagentaBright", "bgCyanBright", "bgWhiteBright",
]);

/** @returns {LogLevel} */
const _defaultLevel = () => {
  const fromEnv = String(process.env.LOG_LEVEL ?? "").toLowerCase();
  if (fromEnv in LEVELS) return /** @type {LogLevel} */ (fromEnv);
  return process.env.DEBUG || process.env.NODE_DEBUG ? "debug" : "info";
};

/** @param {string} value */
const _escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @param {import("./Color").ColorModule} palette
 * @param {string[]} tokens
 * @param {string} text
 * @returns {string}
 */
const _style = (palette, tokens, text) => {
  /** @type {any} */
  let chain = palette;
  for (const token of tokens) {
    const name = token === "normal" ? "reset" : token;
    let m;
    if (STYLE_NAMES.has(name)) chain = chain[name];
    else if ((m = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i.exec(name))) chain = chain.rgb(Number(m[1]), Number(m[2]), Number(m[3]));
    else if ((m = /^bgrgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i.exec(name))) chain = chain.bgRgb(Number(m[1]), Number(m[2]), Number(m[3]));
    else if (/^#[0-9a-f]{3,8}$/i.test(name)) chain = chain.hex(name);
    else if (/^bg#[0-9a-f]{3,8}$/i.test(name)) chain = chain.bgHex(name.slice(2));
  }
  return chain === palette ? text : chain(text);
};

/**
 * @param {string} token
 */
const _isStyleToken = (token) =>
  STYLE_NAMES.has(token) ||
  token === "normal" ||
  /^(bg)?rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/i.test(token) ||
  /^(bg)?#[0-9a-f]{3,8}$/i.test(token);

/**
 * Renders `<% styles text %>` markup.
 * @param {string} input
 * @param {{ open: string, close: string }} delimiter
 * @param {import("./Color").ColorModule} palette
 * @returns {string}
 */
const _markup = (input, delimiter, palette) => {
  if (!input.includes(delimiter.open)) return input;
  const regex = new RegExp(`${_escape(delimiter.open)}([\\s\\S]*?)${_escape(delimiter.close)}`, "g");
  return input.replace(regex, (_, content) => {
    const normalized = String(content).replace(/(bg)?rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi, (m0, bg, r, g, b) => `${bg ?? ""}rgb(${r},${g},${b})`);
    /** @type {string[]} */
    const tokens = [];
    let rest = normalized.replace(/^\s+/, "");
    for (;;) {
      const match = /^(\S+)(\s+|$)/.exec(rest);
      if (!match || !_isStyleToken(match[1])) break;
      tokens.push(match[1]);
      rest = rest.slice(match[0].length);
    }
    return _style(palette, tokens, rest);
  });
};

/**
 * @param {unknown} value
 * @param {boolean} colors
 * @returns {string}
 */
const _stringify = (value, colors) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    let text = value.stack ?? `${value.name}: ${value.message}`;
    let cause = /** @type {any} */ (value).cause;
    let depth = 0;
    while (cause !== undefined && depth++ < 5) {
      text += `\nCaused by: ${cause instanceof Error ? cause.stack ?? cause.message : util.inspect(cause, { colors })}`;
      cause = cause instanceof Error ? /** @type {any} */ (cause).cause : undefined;
    }
    return text;
  }
  if (value !== null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (Array.isArray(value) || proto === Object.prototype || proto === null) {
      try {
        const json = JSON.stringify(value, (_, v) => (typeof v === "bigint" ? `${v}n` : v), 2);
        if (json !== undefined) return json;
      } catch {
        // circular or exotic: fall back to util.inspect
      }
    }
    return util.inspect(value, { depth: 6, colors, breakLength: 100 });
  }
  return typeof value === "symbol" || typeof value === "function" ? util.inspect(value, { colors }) : String(value);
};

/**
 * @param {string} level
 * @param {unknown[]} args
 * @param {string | undefined} scope
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
const _json = (level, args, scope, fields) => {
  /** @type {Record<string, unknown>} */
  const record = { time: new Date().toISOString(), level, ...fields };
  if (scope) record.scope = scope;
  const messages = [];
  for (const arg of args) {
    if (arg instanceof Error) {
      record.err = { name: arg.name, message: arg.message, stack: arg.stack, code: /** @type {any} */ (arg).code, cause: /** @type {any} */ (arg).cause instanceof Error ? /** @type {any} */ (arg).cause.message : /** @type {any} */ (arg).cause };
    } else if (arg !== null && typeof arg === "object" && !Array.isArray(arg)) {
      Object.assign(record, arg);
    } else {
      messages.push(typeof arg === "string" ? color.strip(arg) : _stringify(arg, false));
    }
  }
  record.msg = messages.join(" ");
  try {
    return JSON.stringify(record, (_, v) => (typeof v === "bigint" ? v.toString() : v));
  } catch {
    return JSON.stringify({ time: record.time, level, msg: `${record.msg} [unserializable fields]` });
  }
};

/**
 * Appends a line, rotating the file when it gets too big.
 * @param {LogFileOptions} file
 * @param {string} line
 */
const _writeFile = (file, line) => {
  try {
    const target = path.resolve(file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (file.maxSize !== undefined) {
      const limit = typeof file.maxSize === "number" ? file.maxSize : require("./Num.js").parseBytes(file.maxSize);
      let size = 0;
      try {
        size = fs.statSync(target).size;
      } catch {
        size = 0;
      }
      if (size > 0 && size + Buffer.byteLength(line) > limit) {
        const keep = Math.max(1, file.maxFiles ?? 5);
        for (let i = keep - 1; i >= 1; i--) {
          if (fs.existsSync(`${target}.${i}`)) fs.renameSync(`${target}.${i}`, `${target}.${i + 1}`);
        }
        if (fs.existsSync(`${target}.${keep + 1}`)) fs.rmSync(`${target}.${keep + 1}`);
        fs.renameSync(target, `${target}.1`);
      }
    }
    fs.appendFileSync(target, `${line}\n`);
  } catch {
    // Logging must never crash the application.
  }
};

/**
 * @param {LoggerOptions} options
 * @returns {Logger}
 */
const _create = (options) => {
  const settings = {
    level: options.level ?? _defaultLevel(),
    scope: options.scope,
    timestamp: options.timestamp ?? true,
    format: options.format ?? (process.env.LOG_FORMAT === "json" ? "json" : "pretty"),
    delimiter: { open: "<%", close: "%>", ...options.delimiter },
    colors: options.colors,
    stdout: options.stdout,
    stderr: options.stderr,
    file: typeof options.file === "string" ? { path: options.file } : options.file,
    fields: options.fields ?? {},
  };
  /** @type {string[]} */
  const groups = [];
  /** @type {Map<string, bigint>} */
  const timers = new Map();

  /** @param {"stdout" | "stderr"} which */
  const streamOf = (which) => (which === "stderr" ? settings.stderr ?? process.stderr : settings.stdout ?? process.stdout);

  /** @param {"stdout" | "stderr"} which */
  const paletteOf = (which) => {
    if (settings.colors === true) return color.create(color.level > 0 ? color.level : 3);
    if (settings.colors === false) return color.create(0);
    const stream = streamOf(which);
    return stream === process.stdout || stream === process.stderr ? color.create(color.detect(/** @type {any} */ (stream))) : color.create(0);
  };

  const plain = color.create(0);

  /**
   * @param {keyof typeof BADGES} kind
   * @param {unknown[]} args
   */
  const emit = (kind, args) => {
    const badge = BADGES[kind];
    if (LEVELS[badge.level] < LEVELS[settings.level] || settings.level === "silent") return;
    if (settings.format === "json") {
      const line = _json(kind === "log" ? "info" : kind, args, settings.scope, settings.fields);
      streamOf(badge.stream).write(`${line}\n`);
      if (settings.file) _writeFile(settings.file, line);
      return;
    }
    const render = (/** @type {import("./Color").ColorModule} */ palette) => {
      const colors = palette.level > 0;
      const stamp = settings.timestamp
        ? _style(palette, ["gray"], `[${time.format(new Date(), typeof settings.timestamp === "string" ? settings.timestamp : "HH:mm:ss")}]`)
        : "";
      const scope = settings.scope ? _style(palette, ["magenta"], `[${settings.scope}]`) : "";
      const label = badge.label ? _style(palette, badge.style.split(" "), badge.label) : "";
      const body = args
        .map((arg) => _markup(_stringify(arg, colors), settings.delimiter, palette))
        .map((text) => (kind === "debug" || kind === "trace" ? _style(palette, ["gray"], text) : text))
        .join(" ");
      const indent = "  ".repeat(groups.length);
      const tags = [scope, label].filter(Boolean).join(" ");
      const prefix = `${stamp ? `${stamp} ` : ""}${indent}${tags ? `${tags} ` : ""}`;
      const lines = body.replace(/^(\s*\r?\n)+|(\r?\n\s*)+$/g, "").split(/\r?\n/);
      const pad = " ".repeat(color.width(stamp ? `${stamp} ` : "") + indent.length);
      return lines.map((line, i) => (i === 0 ? `${prefix}${line}`.trimEnd() : pad + line)).join("\n");
    };
    streamOf(badge.stream).write(`${render(paletteOf(badge.stream))}\n`);
    if (settings.file) _writeFile(settings.file, render(plain));
  };

  /** @type {Logger} */
  const logger = {
    log: (...args) => (emit("log", args), logger),
    trace: (...args) => (emit("trace", args), logger),
    debug: (...args) => (emit("debug", args), logger),
    info: (...args) => (emit("info", args), logger),
    success: (...args) => (emit("success", args), logger),
    warn: (...args) => (emit("warn", args), logger),
    error: (...args) => (emit("error", args), logger),
    fatal: (...args) => (emit("fatal", args), logger),
    group: (label = "") => {
      emit("log", [`▼ ${label}`.trimEnd()]);
      groups.push(label);
      return logger;
    },
    groupEnd: () => {
      groups.pop();
      return logger;
    },
    timeStart: (label = "default") => {
      timers.set(label, process.hrtime.bigint());
      return logger;
    },
    timeEnd: (label = "default") => {
      const start = timers.get(label);
      if (start === undefined) return logger.warn(`Timer "${label}" does not exist`);
      timers.delete(label);
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      return logger.log(`${label}: ${ms < 1000 ? `${Math.round(ms * 100) / 100}ms` : time.formatDuration(ms, { units: 2 })}`);
    },
    table: (rows, tableOptions) => logger.log(require("./Cli.js").table(rows, { ...tableOptions, colors: paletteOf("stdout").level > 0 })),
    box: (text, boxOptions) => logger.log(require("./Cli.js").box(text, { ...boxOptions, colors: paletteOf("stdout").level > 0 })),
    divider: (title) => {
      const columns = /** @type {any} */ (streamOf("stdout")).columns ?? 80;
      const width = Math.max(10, Math.min(columns, 100) - (settings.timestamp ? 11 : 0) - groups.length * 2);
      const text = title ? `── ${title} ${"─".repeat(Math.max(0, width - color.width(title) - 4))}` : "─".repeat(width);
      return logger.log(`${settings.delimiter.open}gray ${text}${settings.delimiter.close}`);
    },
    child: (scope, childOptions = {}) =>
      _create({
        ...settings,
        ...childOptions,
        fields: { ...settings.fields, ...childOptions.fields },
        scope: settings.scope ? `${settings.scope}:${scope}` : scope,
      }),
    setLevel: (level) => {
      if (!(level in LEVELS)) throw new RangeError(`Unknown log level "${level}"`);
      settings.level = level;
      return logger;
    },
    getLevel: () => settings.level,
    isLevelEnabled: (level) => settings.level !== "silent" && LEVELS[level] >= LEVELS[settings.level],
    configure: (next) => {
      if (next.level !== undefined) logger.setLevel(next.level);
      if (next.scope !== undefined) settings.scope = next.scope;
      if (next.timestamp !== undefined) settings.timestamp = next.timestamp;
      if (next.format !== undefined) settings.format = next.format;
      if (next.delimiter !== undefined) settings.delimiter = { ...settings.delimiter, ...next.delimiter };
      if (next.colors !== undefined) settings.colors = next.colors;
      if (next.stdout !== undefined) settings.stdout = next.stdout;
      if (next.stderr !== undefined) settings.stderr = next.stderr;
      if (next.file !== undefined) settings.file = typeof next.file === "string" ? { path: next.file } : next.file;
      if (next.fields !== undefined) settings.fields = next.fields;
      return logger;
    },
  };
  return logger;
};

const _default = _create({});

/**
 * Creates a logger with its own settings.
 *
 * @example
 * const log = nc.createLogger({ scope: "api", timestamp: "HH:mm:ss.SSS" });
 * log.info("GET /users 200"); // [14:30:05.120] [api] ℹ INFO GET /users 200
 * log.child("db").debug("query took 12ms");
 *
 * const prod = nc.createLogger({ format: "json", fields: { service: "billing" } });
 * prod.error("charge failed", { orderId: 42 }, error);
 *
 * @param {LoggerOptions} [options]
 * @returns {Logger}
 */
function createLogger(options = {}) {
  return _create(options);
}

/**
 * Prints a message without a badge. Strings support markup, objects are
 * pretty-printed, and several arguments are joined with spaces.
 *
 * @example
 * nc.log("<% green ✔ Saved %> in <% bold 12ms %>");
 * nc.log("user:", { id: 1, roles: ["admin"] });
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function log(...args) {
  _default.log(...args);
  return module.exports;
}

/**
 * Very detailed diagnostics, shown only at the `trace` level.
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function trace(...args) {
  _default.trace(...args);
  return module.exports;
}

/**
 * Diagnostics for developers, shown at the `debug` level (the default when
 * `DEBUG` is set).
 *
 * @example
 * nc.debug("cache miss", { key });
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function debug(...args) {
  _default.debug(...args);
  return module.exports;
}

/**
 * An informational message.
 *
 * @example
 * nc.info("Server listening on http://localhost:3000");
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function info(...args) {
  _default.info(...args);
  return module.exports;
}

/**
 * A success message.
 *
 * @example
 * nc.success("Database connected");
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function success(...args) {
  _default.success(...args);
  return module.exports;
}

/**
 * A warning, written to stderr.
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function warn(...args) {
  _default.warn(...args);
  return module.exports;
}

/**
 * An error, written to stderr. Error objects show their stack trace and
 * their chain of causes.
 *
 * @example
 * nc.error(new Error("Cannot save order", { cause: dbError }));
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function error(...args) {
  _default.error(...args);
  return module.exports;
}

/**
 * A fatal error, written to stderr. It doesn't stop the process; call
 * `process.exit(1)` yourself if you mean to.
 *
 * @param {...unknown} args
 * @returns {typeof import("./Logger")}
 */
function fatal(...args) {
  _default.fatal(...args);
  return module.exports;
}

/**
 * Prints a label and indents what follows, until `groupEnd()`. Groups nest.
 *
 * @example
 * nc.group("Startup").info("Loading config");
 * nc.group("Database").success("Connected").groupEnd();
 * nc.groupEnd();
 *
 * @param {string} [label]
 * @returns {typeof import("./Logger")}
 */
function group(label) {
  _default.group(label);
  return module.exports;
}

/**
 * Closes the current group.
 *
 * @returns {typeof import("./Logger")}
 */
function groupEnd() {
  _default.groupEnd();
  return module.exports;
}

/**
 * Starts a named timer. `timeEnd()` prints the elapsed time.
 *
 * @example
 * nc.timeStart("import");
 * await importProducts();
 * nc.timeEnd("import"); // "import: 1.24s"
 *
 * @param {string} [label="default"]
 * @returns {typeof import("./Logger")}
 */
function timeStart(label) {
  _default.timeStart(label);
  return module.exports;
}

/**
 * Prints the time since `timeStart()` with the same label.
 *
 * @param {string} [label="default"]
 * @returns {typeof import("./Logger")}
 */
function timeEnd(label) {
  _default.timeEnd(label);
  return module.exports;
}

/**
 * Prints rows as a table.
 *
 * @example
 * nc.table([{ name: "Ada", role: "admin" }, { name: "Bob", role: "user" }]);
 *
 * @param {Array<Record<string, unknown>> | unknown[][]} rows
 * @param {import("./Cli").TableOptions} [options]
 * @returns {typeof import("./Logger")}
 */
function table(rows, options) {
  _default.table(rows, options);
  return module.exports;
}

/**
 * Prints text in a box. Nice for startup banners.
 *
 * @example
 * nc.box("Server ready\nhttp://localhost:3000", { title: "my-app", borderColor: "green" });
 *
 * @param {string} text
 * @param {import("./Cli").BoxOptions} [options]
 * @returns {typeof import("./Logger")}
 */
function box(text, options) {
  _default.box(text, options);
  return module.exports;
}

/**
 * Prints a horizontal line, with an optional title in it.
 *
 * @param {string} [title]
 * @returns {typeof import("./Logger")}
 */
function divider(title) {
  _default.divider(title);
  return module.exports;
}

/**
 * Sets the minimum level.
 *
 * @example
 * nc.setLevel("warn");   // warnings and errors only
 * nc.setLevel("silent"); // nothing
 *
 * @param {LogLevel} level
 * @returns {typeof import("./Logger")}
 * @throws {RangeError} For an unknown level.
 */
function setLevel(level) {
  _default.setLevel(level);
  return module.exports;
}

/**
 * The current minimum level.
 *
 * @returns {LogLevel}
 */
function getLevel() {
  return _default.getLevel();
}

/**
 * Would this level be printed? Use it to skip building expensive debug
 * output.
 *
 * @example
 * if (nc.isLevelEnabled("debug")) nc.debug(buildHugeReport());
 *
 * @param {LogLevel} level
 * @returns {boolean}
 */
function isLevelEnabled(level) {
  return _default.isLevelEnabled(level);
}

/**
 * Changes several settings at once.
 *
 * @example
 * nc.configure({ level: "debug", file: "logs/app.log" });
 * nc.configure({ format: "json", fields: { service: "api" } });
 *
 * @param {LoggerOptions} options
 * @returns {typeof import("./Logger")}
 */
function configure(options) {
  _default.configure(options);
  return module.exports;
}

/**
 * Shows or hides timestamps, or sets their pattern.
 *
 * @example
 * nc.setTimestamp(false);
 * nc.setTimestamp("YYYY-MM-DD HH:mm:ss.SSS");
 *
 * @param {boolean | string} value
 * @returns {typeof import("./Logger")}
 */
function setTimestamp(value) {
  _default.configure({ timestamp: value });
  return module.exports;
}

/**
 * Changes the markup delimiters, for when `<%` clashes with a template
 * engine.
 *
 * @example
 * nc.setDelimiter({ open: "{{", close: "}}" });
 * nc.log("{{red Hello}} world");
 *
 * @param {{ open?: string, close?: string }} [options]
 * @returns {typeof import("./Logger")}
 */
function setDelimiter(options = {}) {
  _default.configure({ delimiter: options });
  return module.exports;
}

module.exports = {
  log,
  trace,
  debug,
  info,
  success,
  warn,
  error,
  fatal,
  group,
  groupEnd,
  timeStart,
  timeEnd,
  table,
  box,
  divider,
  setLevel,
  getLevel,
  isLevelEnabled,
  configure,
  setTimestamp,
  setDelimiter,
  createLogger,
};
