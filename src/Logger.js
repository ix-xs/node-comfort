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
 * `fatal`. The default is `info`; `LOG_LEVEL` changes it. `DEBUG=1` shows
 * debug messages, and `DEBUG=db,http:*` only the debug and trace messages of
 * the loggers with these scopes. Warnings and errors go to stderr.
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
const { timeConfig } = require("./internal/shared.js");

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
 * A message as `onLog` receives it.
 * @typedef {object} LogEntry
 * @property {Date} time
 * @property {LogLevel} level
 * @property {"log" | "trace" | "debug" | "info" | "success" | "warn" | "error" | "fatal"} kind The method that was called.
 * @property {string | undefined} scope
 * @property {string} message The line as written, without colors or timestamp.
 * @property {unknown[]} args What was passed to the method, untouched.
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
 * @property {string[]} [redact] Keys whose values are replaced by `"[redacted]"` wherever they appear in logged objects, like `["password", "authorization"]`. Case doesn't matter.
 * @property {(entry: LogEntry) => void | Promise<void>} [onLog] Called for every message that passes the level, to send logs somewhere else. It isn't awaited, and an error it throws (or a promise it rejects) is ignored: logging never breaks the program.
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

const REDACTED = "[redacted]";
const TRIM_LINES = /^(\s*\r?\n)+|(\r?\n\s*)+$/g;
const RGB = /(bg)?rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
const TOKEN = /^(\S+)(\s+|$)/;

/** @returns {LogLevel} */
const _defaultLevel = () => {
  const fromEnv = String(process.env.LOG_LEVEL ?? "").toLowerCase();
  if (Object.hasOwn(LEVELS, fromEnv)) return /** @type {LogLevel} */ (fromEnv);
  return _debugAll(process.env.DEBUG) || process.env.NODE_DEBUG ? "debug" : "info";
};

/**
 * Does `DEBUG` ask for everything? `DEBUG=1`, `DEBUG=true` and `DEBUG=*` do.
 * @param {string | undefined} value
 */
const _debugAll = (value) => value !== undefined && /^(?:1|true|yes|on|\*)$/i.test(value.trim());

/**
 * Does `DEBUG` name this scope? It's a list of scopes, where `*` stands for
 * anything and a leading `-` excludes: `DEBUG=db,http:*,-http:static`.
 * @param {string | undefined} value
 * @param {string | undefined} scope
 */
const _debugScope = (value, scope) => {
  if (!value || !scope || _debugAll(value)) return false;
  let wanted = false;
  for (const part of value.split(/[\s,]+/)) {
    if (!part) continue;
    const exclude = part[0] === "-";
    const pattern = new RegExp(`^${(exclude ? part.slice(1) : part).split("*").map(_escape).join(".*")}$`);
    if (!pattern.test(scope)) continue;
    if (exclude) return false;
    wanted = true;
  }
  return wanted;
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
 * @param {{ open: string, close: string, regex: RegExp }} delimiter
 * @param {import("./Color").ColorModule} palette
 * @returns {string}
 */
const _markup = (input, delimiter, palette) => {
  if (!input.includes(delimiter.open)) return input;
  return input.replace(delimiter.regex, (_, content) => {
    const normalized = String(content).replace(RGB, (m0, bg, r, g, b) => `${bg ?? ""}rgb(${r},${g},${b})`);
    /** @type {string[]} */
    const tokens = [];
    let rest = normalized.replace(/^\s+/, "");
    for (;;) {
      const match = TOKEN.exec(rest);
      if (!match || !_isStyleToken(match[1])) break;
      tokens.push(match[1]);
      rest = rest.slice(match[0].length);
    }
    return _style(palette, tokens, rest);
  });
};

/**
 * A copy of a value with the secret keys masked, for values `JSON.stringify`
 * can't handle on its own: class instances, circular references.
 * @param {unknown} value
 * @param {Set<string>} secrets Lower-cased key names.
 * @param {Map<object, unknown>} seen
 * @returns {unknown}
 */
const _redact = (value, secrets, seen) => {
  if (value === null || typeof value !== "object" || value instanceof Date || value instanceof RegExp || value instanceof Error || ArrayBuffer.isView(value)) return value;
  const known = seen.get(value);
  if (known !== undefined) return known;
  if (Array.isArray(value)) {
    /** @type {unknown[]} */
    const list = [];
    seen.set(value, list);
    for (const item of value) list.push(_redact(item, secrets, seen));
    return list;
  }
  if (value instanceof Map || value instanceof Set) return value;
  /** @type {Record<string, unknown>} */
  const copy = Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Object.keys(value)) {
    copy[key] = secrets.has(key.toLowerCase()) ? REDACTED : _redact(/** @type {Record<string, unknown>} */ (value)[key], secrets, seen);
  }
  return copy;
};

/**
 * @param {unknown} value
 * @param {boolean} colors
 * @param {Set<string> | undefined} secrets
 * @returns {string}
 */
const _stringify = (value, colors, secrets) => {
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
        const json = JSON.stringify(value, (key, v) => (secrets?.has(key.toLowerCase()) ? REDACTED : typeof v === "bigint" ? `${v}n` : v), 2);
        if (json !== undefined) return json;
      } catch {
        // circular or exotic: fall back to util.inspect
      }
    }
    return util.inspect(secrets ? _redact(value, secrets, new Map()) : value, { depth: 6, colors, breakLength: 100 });
  }
  return typeof value === "symbol" || typeof value === "function" ? util.inspect(value, { colors }) : String(value);
};

/**
 * @param {string} level
 * @param {unknown[]} args
 * @param {string | undefined} scope
 * @param {Record<string, unknown>} fields
 * @param {Set<string> | undefined} secrets
 * @param {Date} now
 * @returns {string}
 */
const _json = (level, args, scope, fields, secrets, now) => {
  /** @type {Record<string, unknown>} */
  const record = { time: now.toISOString(), level, ...fields };
  if (scope) record.scope = scope;
  const messages = [];
  for (const arg of args) {
    if (arg instanceof Error) {
      record.err = { name: arg.name, message: arg.message, stack: arg.stack, code: /** @type {any} */ (arg).code, cause: /** @type {any} */ (arg).cause instanceof Error ? /** @type {any} */ (arg).cause.message : /** @type {any} */ (arg).cause };
    } else if (arg !== null && typeof arg === "object" && !Array.isArray(arg)) {
      Object.assign(record, arg);
    } else {
      messages.push(typeof arg === "string" ? color.strip(arg) : _stringify(arg, false, secrets));
    }
  }
  record.msg = messages.join(" ");
  try {
    return JSON.stringify(record, (key, v) => (secrets?.has(key.toLowerCase()) ? REDACTED : typeof v === "bigint" ? v.toString() : v));
  } catch {
    return JSON.stringify({ time: record.time, level, msg: `${record.msg} [unserializable fields]` });
  }
};

/**
 * A log file: where it is, how big it may get, how big it is now.
 * @typedef {{ target: string, limit: number | undefined, keep: number, size: number, ready: boolean }} _LogFile
 */

/**
 * @param {LogFileOptions} file
 * @returns {_LogFile}
 */
const _openFile = (file) => ({
  target: path.resolve(file.path),
  limit: file.maxSize === undefined ? undefined : typeof file.maxSize === "number" ? file.maxSize : require("./Num.js").parseBytes(file.maxSize),
  keep: Math.max(1, file.maxFiles ?? 5),
  size: 0,
  ready: false,
});

/** @param {string} target */
const _sizeOf = (target) => {
  try {
    return fs.statSync(target).size;
  } catch {
    return 0;
  }
};

/**
 * Appends a line, rotating the file when it gets too big. The folder is
 * made once and the size is counted here, so a line costs one write.
 * @param {_LogFile} file
 * @param {string} line
 */
const _writeFile = (file, line) => {
  const text = `${line}\n`;
  try {
    if (!file.ready) {
      fs.mkdirSync(path.dirname(file.target), { recursive: true });
      file.size = _sizeOf(file.target);
      file.ready = true;
    }
    const bytes = Buffer.byteLength(text);
    if (file.limit !== undefined && file.size > 0 && file.size + bytes - 1 > file.limit) {
      // Another process may have rotated or removed the file: look before moving anything.
      file.size = _sizeOf(file.target);
      if (file.size > 0 && file.size + bytes - 1 > file.limit) {
        for (let i = file.keep - 1; i >= 1; i--) {
          if (fs.existsSync(`${file.target}.${i}`)) fs.renameSync(`${file.target}.${i}`, `${file.target}.${i + 1}`);
        }
        if (fs.existsSync(`${file.target}.${file.keep + 1}`)) fs.rmSync(`${file.target}.${file.keep + 1}`);
        fs.renameSync(file.target, `${file.target}.1`);
        file.size = 0;
      }
    }
    try {
      fs.appendFileSync(file.target, text);
    } catch {
      // The folder was removed since: make it again, once.
      fs.mkdirSync(path.dirname(file.target), { recursive: true });
      fs.appendFileSync(file.target, text);
      file.size = 0;
    }
    file.size += bytes;
  } catch {
    // Logging must never crash the application.
  }
};

/** @param {number} n */
const _two = (n) => (n < 10 ? `0${n}` : String(n));

/**
 * What a message looks like on one output: its colors, and the parts that
 * are the same on every line, styled once.
 * @typedef {{ palette: import("./Color").ColorModule, colors: boolean, labels: Record<string, string>, scope: string, stamp: string, stampAt: number, stampWidth: number }} _Face
 */

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
    redact: options.redact,
    onLog: options.onLog,
  };
  /** @type {string[]} */
  const groups = [];
  /** @type {Map<string, bigint>} */
  const timers = new Map();

  // Everything below is worked out from the settings, and again when they change.
  let threshold = 0;
  let debugScope = false;
  // What each method does with a message, decided once: a call that prints
  // nothing must cost next to nothing.
  /** @type {Record<keyof typeof BADGES, boolean>} */
  const on = { log: true, trace: false, debug: false, info: true, success: true, warn: true, error: true, fatal: true };
  /** @type {{ open: string, close: string, regex: RegExp }} */
  let delimiter;
  /** @type {Set<string> | undefined} */
  let secrets;
  /** @type {_LogFile | undefined} */
  let file;
  /** @type {{ stdout?: _Face, stderr?: _Face, file?: _Face }} */
  let faces = {};

  const gate = () => {
    threshold = LEVELS[settings.level];
    for (const kind of /** @type {Array<keyof typeof BADGES>} */ (Object.keys(BADGES))) {
      on[kind] = LEVELS[BADGES[kind].level] >= threshold || (debugScope && threshold !== Infinity && (kind === "debug" || kind === "trace"));
    }
  };

  const refresh = () => {
    // DEBUG=db,http:* turns debug on for those scopes only, whatever the level.
    debugScope = _debugScope(process.env.DEBUG, settings.scope);
    gate();
    const { open, close } = settings.delimiter;
    delimiter = { open, close, regex: new RegExp(`${_escape(open)}([\\s\\S]*?)${_escape(close)}`, "g") };
    secrets = settings.redact?.length ? new Set(settings.redact.map((key) => String(key).toLowerCase())) : undefined;
    file = settings.file ? _openFile(settings.file) : undefined;
    faces = {};
  };

  /** @param {"stdout" | "stderr"} which */
  const streamOf = (which) => (which === "stderr" ? settings.stderr ?? process.stderr : settings.stdout ?? process.stdout);

  /** @param {"stdout" | "stderr" | "file"} which */
  const paletteOf = (which) => {
    if (which === "file" || settings.colors === false) return color.create(0);
    if (settings.colors === true) return color.create(color.level > 0 ? color.level : 3);
    const stream = streamOf(which);
    return stream === process.stdout || stream === process.stderr ? color.create(color.detect(/** @type {any} */ (stream))) : color.create(0);
  };

  /**
   * @param {"stdout" | "stderr" | "file"} which
   * @returns {_Face}
   */
  const faceOf = (which) => {
    let face = faces[which];
    if (face) return face;
    const palette = paletteOf(which);
    face = { palette, colors: palette.level > 0, labels: {}, scope: settings.scope ? palette.magenta(`[${settings.scope}]`) : "", stamp: "", stampAt: -1, stampWidth: 0 };
    for (const kind of Object.keys(BADGES)) face.labels[kind] = BADGES[kind].label ? _style(palette, BADGES[kind].style.split(" "), BADGES[kind].label) : "";
    faces[which] = face;
    return face;
  };

  /**
   * The timestamp, written again only when the second changes.
   * @param {_Face} face
   * @param {Date} now
   */
  const stampOf = (face, now) => {
    const second = Math.floor(now.getTime() / 1000);
    if (second === face.stampAt) return;
    face.stampAt = second;
    // A pattern, or a time zone set with time.setTimezone(), needs the real formatter.
    const text = typeof settings.timestamp === "string" || timeConfig.timeZone !== undefined
      ? require("./Time.js").format(now, typeof settings.timestamp === "string" ? settings.timestamp : "HH:mm:ss")
      : `${_two(now.getHours())}:${_two(now.getMinutes())}:${_two(now.getSeconds())}`;
    face.stamp = `${face.palette.gray(`[${text}]`)} `;
    face.stampWidth = color.width(text) + 3;
  };

  /**
   * @param {_Face} face
   * @param {keyof typeof BADGES} kind
   * @param {unknown[]} args
   * @param {Date} now
   * @param {boolean} stamped
   * @returns {string}
   */
  const render = (face, kind, args, now, stamped) => {
    const { palette } = face;
    let body = "";
    for (let i = 0; i < args.length; i++) {
      const text = _markup(_stringify(args[i], face.colors, secrets), delimiter, palette);
      body += (i ? " " : "") + (face.colors && (kind === "debug" || kind === "trace") ? palette.gray(text) : text);
    }
    let prefix = "";
    let padWidth = 0;
    if (stamped) {
      stampOf(face, now);
      prefix = face.stamp;
      padWidth = face.stampWidth;
    }
    if (groups.length) {
      prefix += "  ".repeat(groups.length);
      padWidth += groups.length * 2;
    }
    if (face.scope) prefix += `${face.scope} `;
    if (face.labels[kind]) prefix += `${face.labels[kind]} `;
    if (body.indexOf("\n") === -1) return (prefix + body).trimEnd();
    const lines = body.replace(TRIM_LINES, "").split(/\r?\n/);
    const pad = " ".repeat(padWidth);
    let out = (prefix + lines[0]).trimEnd();
    for (let i = 1; i < lines.length; i++) out += `\n${pad}${lines[i]}`;
    return out;
  };

  /**
   * @param {keyof typeof BADGES} kind
   * @param {unknown[]} args
   */
  const emit = (kind, args) => {
    if (!on[kind]) return;
    const badge = BADGES[kind];
    const now = new Date();
    const stream = streamOf(badge.stream);
    if (settings.format === "json") {
      const line = _json(kind === "log" ? "info" : kind, args, settings.scope, settings.fields, secrets, now);
      stream.write(`${line}\n`);
      if (file) _writeFile(file, line);
    } else {
      const face = faceOf(badge.stream);
      const line = render(face, kind, args, now, Boolean(settings.timestamp));
      stream.write(`${line}\n`);
      // The file gets the same line without colors: the one just made, when it has none.
      if (file) _writeFile(file, face.colors ? render(faceOf("file"), kind, args, now, Boolean(settings.timestamp)) : line);
    }
    if (settings.onLog) {
      try {
        /** @type {unknown} */
        const pending = settings.onLog({ time: now, level: badge.level, kind: /** @type {LogEntry["kind"]} */ (kind), scope: settings.scope, message: render(faceOf("file"), kind, args, now, false), args });
        // An async hook that fails would otherwise be an unhandled rejection.
        if (pending && typeof (/** @type {any} */ (pending).then) === "function") /** @type {PromiseLike<unknown>} */ (pending).then(undefined, () => {});
      } catch {
        // A broken hook must not take the program down with it.
      }
    }
  };

  refresh();

  /** @type {Logger} */
  const logger = {
    log: (...args) => (on.log && emit("log", args), logger),
    trace: (...args) => (on.trace && emit("trace", args), logger),
    debug: (...args) => (on.debug && emit("debug", args), logger),
    info: (...args) => (on.info && emit("info", args), logger),
    success: (...args) => (on.success && emit("success", args), logger),
    warn: (...args) => (on.warn && emit("warn", args), logger),
    error: (...args) => (on.error && emit("error", args), logger),
    fatal: (...args) => (on.fatal && emit("fatal", args), logger),
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
      return logger.log(`${label}: ${ms < 1000 ? `${Math.round(ms * 100) / 100}ms` : require("./Time.js").formatDuration(ms, { units: 2 })}`);
    },
    table: (rows, tableOptions) => logger.log(require("./Cli.js").table(rows, { ...tableOptions, colors: faceOf("stdout").colors })),
    box: (text, boxOptions) => logger.log(require("./Cli.js").box(text, { ...boxOptions, colors: faceOf("stdout").colors })),
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
      if (!Object.hasOwn(LEVELS, level)) throw new RangeError(`Unknown log level "${level}"`);
      settings.level = level;
      gate();
      return logger;
    },
    getLevel: () => settings.level,
    isLevelEnabled: (level) => threshold !== Infinity && (LEVELS[level] >= threshold || (debugScope && (level === "debug" || level === "trace"))),
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
      if (next.redact !== undefined) settings.redact = next.redact;
      if (next.onLog !== undefined) settings.onLog = next.onLog;
      refresh();
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
 * nc.log("<% green ✔ Saved%> in <% bold 12ms%>");
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
 * nc.timeEnd("import"); // "import: 1s 240ms"
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
