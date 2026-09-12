"use strict";

/**
 * Files and folders without try/catch: read and write text or JSON
 * (atomically), copy, move, delete, list, glob, watch, hash.
 *
 * Paths: absolute paths are used as they are. Paths starting with `./` or
 * `../` start from the file that calls the function, so a script works
 * wherever it's run from. Other relative paths start from the working
 * directory, like Node's `fs`.
 *
 * Everyday failures don't throw: you get `undefined` when something doesn't
 * exist and `false` when an operation fails.
 *
 * @example
 * nc.writeJSON("./data/settings.json", { theme: "dark" });
 * const settings = nc.readJSON("./data/settings.json", {});
 * const sources = nc.glob("src/**\/*.{js,ts}");
 */

const fs = require("node:fs");
const os = require("node:os");
const nodePath = require("node:path");
const { fileURLToPath } = require("node:url");

/**
 * Options for `copyFoldersIn()` and `moveFoldersIn()`.
 * @typedef {object} CopyFoldersOptions
 * @property {string} dest Destination folder.
 * @property {string} [path] Source folder. Defaults to the working directory.
 * @property {boolean} [recursive] Include nested folders. Defaults to `true`.
 * @property {boolean} [withFiles] Copy the files in each folder too.
 * @property {boolean} [force] Delete an existing destination folder first.
 * @property {(folder: string) => boolean} [filter] Keep a folder when it returns `true`. Gets absolute paths.
 */

/**
 * Options for `copyFolder()` and `moveFolder()`.
 * @typedef {object} CopyFolderOptions
 * @property {string} dest Destination folder.
 * @property {string} [path] Source folder. Defaults to the working directory.
 * @property {boolean} [recursive] Copy nested folders too.
 * @property {boolean} [withFiles] Copy files too. `copy()` does all of this in one call.
 * @property {boolean} [force] Delete an existing destination first.
 */

/**
 * Options for `copyFilesIn()` and `moveFilesIn()`.
 * @typedef {object} CopyFilesOptions
 * @property {string} dest Destination folder.
 * @property {string} [path] Source folder. Defaults to the working directory.
 * @property {boolean} [recursive] Include files from nested folders, keeping the tree. Defaults to `true`.
 * @property {boolean} [force] Delete existing destination files first.
 * @property {(file: string) => boolean} [filter] Keep a file when it returns `true`. Gets absolute paths.
 */

/**
 * Options for `copyFile()` and `moveFile()`.
 * @typedef {object} CopyFileOptions
 * @property {string} path Source file.
 * @property {string} dest Destination file, or a folder if it ends with `/`.
 * @property {boolean} [force] Delete the destination first.
 */

/**
 * Options for `copy()`.
 * @typedef {object} CopyOptions
 * @property {boolean} [overwrite] Replace existing files. Defaults to `true`.
 * @property {(source: string, destination: string) => boolean} [filter] Return `false` to skip a file or folder.
 * @property {boolean} [preserveTimestamps] Keep modification times.
 */

/**
 * Options for `writeFile()`.
 * @typedef {object} WriteFileOptions
 * @property {boolean} [atomic] Write to a temporary file and rename it, so nobody reads a half-written file and a crash can't corrupt it. Defaults to `true`.
 * @property {BufferEncoding} [encoding] Defaults to `"utf8"`.
 * @property {number} [mode] Permissions, like `0o600` for secrets.
 * @property {number} [spaces] Indentation when writing an object as JSON. Defaults to `2`.
 */

/**
 * Options for `writeJSON()`.
 * @typedef {object} WriteJSONOptions
 * @property {number} [spaces] Defaults to `2`.
 * @property {boolean} [atomic] Defaults to `true`.
 * @property {(key: string, value: unknown) => unknown} [replacer] Passed to `JSON.stringify`.
 */

/**
 * Options for `readJSON()`.
 * @typedef {object} ReadJSONOptions
 * @property {boolean} [comments] Allow comments and trailing commas, like in `tsconfig.json`.
 * @property {(key: string, value: any) => any} [reviver] Passed to `JSON.parse`.
 */

/**
 * Options for `getFilesIn()` and `getFoldersIn()`.
 * @typedef {object} ListOptions
 * @property {boolean} [recursive] Go into nested folders. Defaults to `true`.
 * @property {boolean} [hidden] Include names starting with a dot. Defaults to `true`.
 * @property {string[]} [ignore] Folder names to skip. Defaults to `["node_modules"]`.
 */

/**
 * Options for `glob()`.
 * @typedef {object} GlobOptions
 * @property {string} [cwd] Where the pattern starts. Defaults to the working directory.
 * @property {boolean} [absolute] Return absolute paths.
 * @property {boolean} [dot] Let `*` and `**` match names starting with a dot.
 * @property {string[]} [ignore] Patterns to leave out. Defaults to `node_modules` and `.git`.
 * @property {"files" | "folders" | "all"} [type] Defaults to `"files"`.
 */

/**
 * Options for `find()`.
 * @typedef {object} FindOptions
 * @property {string} [cwd] Where to start. Defaults to the working directory.
 * @property {"file" | "folder" | "any"} [type] Defaults to `"file"`.
 * @property {string[]} [ignore] Folder names to skip. Defaults to `node_modules` and `.git`.
 */

/**
 * Options for `watch()`.
 * @typedef {object} WatchOptions
 * @property {string} [path] What to watch. Defaults to the working directory.
 * @property {boolean} [recursive] Watch nested folders too.
 * @property {(event: "rename" | "change", file: string) => boolean} [filter] Return `false` to ignore an event.
 * @property {number} [debounce] Merge events on the same file within this many ms. Editors often save in several steps.
 */

/**
 * Returned by `watch()`.
 * @typedef {object} Watcher
 * @property {<E extends "change" | "rename" | "all">(event: E, callback: E extends "all" ? (event: "change" | "rename", file: string) => void : (file: string) => void) => Watcher} on Listens for changes. `"all"` also gets the event name.
 * @property {() => void} stop Stops watching.
 * @property {() => Watcher} pause Ignores events until `resume()`.
 * @property {() => Watcher} resume
 */

const SRC_DIR = __dirname;
const INDEX_FILE = nodePath.join(__dirname, "..", "index.js");

/**
 * The folder of the first caller outside node-comfort and node_modules.
 * @returns {string}
 */
const _callerDir = () => {
  const originalPrepare = Error.prepareStackTrace;
  const originalLimit = Error.stackTraceLimit;
  /** @type {NodeJS.CallSite[] | undefined} */
  let stack;
  try {
    Error.stackTraceLimit = 50;
    Error.prepareStackTrace = (_, frames) => frames;
    stack = /** @type {any} */ (new Error()).stack;
  } finally {
    Error.prepareStackTrace = originalPrepare;
    Error.stackTraceLimit = originalLimit;
  }
  for (const frame of stack ?? []) {
    let file = frame.getFileName();
    if (!file) continue;
    if (file.startsWith("file://")) file = fileURLToPath(file);
    if (file.startsWith("node:") || file.includes("node_modules")) continue;
    const resolved = nodePath.resolve(file);
    if (resolved.startsWith(SRC_DIR + nodePath.sep) || resolved === INDEX_FILE) continue;
    return nodePath.dirname(resolved);
  }
  return process.cwd();
};

/**
 * @param {string | undefined} input
 * @returns {string}
 */
const _abs = (input) => {
  if (input === undefined || input === "") return process.cwd();
  const p = String(input);
  if (nodePath.isAbsolute(p)) return nodePath.normalize(p);
  if (/^\.\.?([\\/]|$)/.test(p)) return nodePath.resolve(_callerDir(), p);
  return nodePath.resolve(process.cwd(), p);
};

/**
 * The absolute path, if it exists and has the right type.
 * @param {string | undefined} input
 * @param {"file" | "folder" | "any"} type
 * @returns {string | undefined}
 */
const _existing = (input, type) => {
  const p = _abs(input);
  try {
    const stats = fs.statSync(p);
    if (type === "file" && !stats.isFile()) return undefined;
    if (type === "folder" && !stats.isDirectory()) return undefined;
    return p;
  } catch {
    return undefined;
  }
};

/**
 * @param {string} root
 * @param {"file" | "folder"} type
 * @param {Required<ListOptions>} options
 * @returns {string[]}
 */
const _walk = (root, type, options) => {
  /** @type {string[]} */
  const out = [];
  /** @type {fs.Dirent[]} */
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!options.hidden && entry.name.startsWith(".")) continue;
    const full = nodePath.join(root, entry.name);
    if (entry.isDirectory()) {
      if (options.ignore.includes(entry.name)) continue;
      if (type === "folder") out.push(full);
      if (options.recursive) out.push(..._walk(full, type, options));
    } else if (type === "file" && (entry.isFile() || entry.isSymbolicLink())) {
      out.push(full);
    }
  }
  return out;
};

/**
 * @param {boolean | ListOptions | undefined} recursiveOrOptions
 * @param {boolean} defaultRecursive
 * @returns {Required<ListOptions>}
 */
const _listOptions = (recursiveOrOptions, defaultRecursive) => {
  const opts = typeof recursiveOrOptions === "object" ? recursiveOrOptions : { recursive: recursiveOrOptions };
  return { recursive: opts.recursive ?? defaultRecursive, hidden: opts.hidden ?? true, ignore: opts.ignore ?? ["node_modules"] };
};

/**
 * @param {unknown} data
 * @param {number} spaces
 * @returns {string | Buffer}
 */
const _content = (data, spaces) => {
  if (data === null || data === undefined) return "";
  if (typeof data === "string" || Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  return JSON.stringify(data, null, spaces);
};

/**
 * @param {string} target
 * @param {string | Buffer} content
 * @param {WriteFileOptions} options
 */
const _write = (target, content, options) => {
  fs.mkdirSync(nodePath.dirname(target), { recursive: true });
  /** @type {fs.WriteFileOptions} */
  const writeOptions = { encoding: options.encoding ?? "utf8" };
  if (options.mode !== undefined) writeOptions.mode = options.mode;
  if (options.atomic === false) {
    fs.writeFileSync(target, content, writeOptions);
    return;
  }
  const temp = `${target}.${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    fs.writeFileSync(temp, content, writeOptions);
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
};

/**
 * Removes comments and trailing commas from JSONC.
 * @param {string} text
 * @returns {string}
 */
const _stripJSONComments = (text) => {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inString) {
      out += char;
      if (char === "\\") out += text[++i] ?? "";
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else {
      out += char;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
};

/**
 * @param {string} pattern
 * @param {boolean} dot
 * @returns {RegExp}
 */
const _globToRegExp = (pattern, dot) => {
  const noDot = dot ? "" : "(?!\\.)";
  let re = "";
  let i = 0;
  let braces = 0;
  let atSegmentStart = true;
  while (i < pattern.length) {
    const char = pattern[i];
    if (char === "*" && pattern[i + 1] === "*") {
      const prevSlash = i === 0 || pattern[i - 1] === "/";
      const nextSlash = pattern[i + 2] === "/" || i + 2 === pattern.length;
      if (prevSlash && nextSlash) {
        if (pattern[i + 2] === "/") {
          re += `(?:${noDot}[^/]*/)*`;
          i += 3;
        } else {
          re += `(?:${noDot}[^/]*(?:/${noDot}[^/]*)*)?`;
          i += 2;
        }
        atSegmentStart = true;
        continue;
      }
      re += `${atSegmentStart ? noDot : ""}[^/]*`;
      i += 2;
      atSegmentStart = false;
      continue;
    }
    if (char === "*") {
      re += `${atSegmentStart ? noDot : ""}[^/]*`;
    } else if (char === "?") {
      re += `${atSegmentStart ? noDot : ""}[^/]`;
    } else if (char === "[") {
      const end = pattern.indexOf("]", i + 1);
      if (end === -1) re += "\\[";
      else {
        let cls = pattern.slice(i + 1, end).replace(/\\/g, "\\\\");
        if (cls.startsWith("!")) cls = `^${cls.slice(1)}`;
        re += `[${cls}]`;
        i = end;
      }
    } else if (char === "{") {
      braces++;
      re += "(?:";
    } else if (char === "}" && braces > 0) {
      braces--;
      re += ")";
    } else if (char === "," && braces > 0) {
      re += "|";
    } else if (char === "/") {
      re += "/";
      atSegmentStart = true;
      i++;
      continue;
    } else {
      re += char.replace(/[.+^${}()|\\]/g, "\\$&");
    }
    atSegmentStart = false;
    i++;
  }
  return new RegExp(`^${re}$`);
};

/**
 * @param {string} path
 * @returns {string} The real path, symlinks and short names resolved.
 */
const _realPath = (path) => {
  try {
    return fs.realpathSync.native(path);
  } catch {
    try {
      return fs.realpathSync(path);
    } catch {
      return path;
    }
  }
};

/**
 * @param {string} pattern Normalized with `/`.
 * @returns {boolean}
 */
const _isAbsolutePattern = (pattern) => pattern.startsWith("/") || /^[A-Za-z]:\//.test(pattern);

/**
 * The folder an absolute pattern starts from, before its first wildcard.
 * @param {string} pattern
 * @returns {string}
 */
const _globRoot = (pattern) => {
  const segments = pattern.split("/").slice(0, -1);
  const root = [];
  for (const segment of segments) {
    if (/[*?[{]/.test(segment)) break;
    root.push(segment);
  }
  const joined = root.join("/");
  return joined === "" || /^[A-Za-z]:$/.test(joined) ? `${joined}/` : joined;
};

/**
 * Reads an environment variable. For typed and checked values, see `nc.env`.
 *
 * @example
 * nc.getEnv("REGION", "eu-west-1");
 *
 * @param {string} name
 * @param {string} [fallback]
 * @returns {string | undefined}
 */
function getEnv(name, fallback) {
  return process.env[name] ?? fallback;
}

/**
 * The absolute version of a path, whether it exists or not.
 *
 * @example
 * nc.createPath("./config/app.json"); // next to the calling file
 * nc.createPath("logs/app.log");      // from the working directory
 *
 * @param {string} [path] Defaults to the working directory.
 * @returns {string}
 */
function createPath(path) {
  return _abs(path);
}

/**
 * The absolute path of a folder, or `undefined` if it doesn't exist.
 *
 * @example
 * if (!nc.getFolder("./uploads")) nc.createFolder("./uploads");
 *
 * @param {string} [path] Defaults to the working directory.
 * @returns {string | undefined}
 */
function getFolder(path) {
  return _existing(path, "folder");
}

/**
 * The absolute path of a file, or `undefined` if it doesn't exist.
 *
 * @param {string} path
 * @returns {string | undefined}
 */
function getFile(path) {
  return path ? _existing(path, "file") : undefined;
}

/**
 * The folders inside a folder, nested ones included by default.
 * `node_modules` is skipped.
 *
 * @example
 * nc.getFoldersIn("./src");        // everything
 * nc.getFoldersIn("./src", false); // direct children only
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {boolean | ListOptions} [recursive=true]
 * @returns {string[] | undefined} Absolute paths, or `undefined` if the folder doesn't exist.
 */
function getFoldersIn(path, recursive = true) {
  const root = _existing(path, "folder");
  return root ? _walk(root, "folder", _listOptions(recursive, true)) : undefined;
}

/**
 * The files inside a folder, nested ones included by default.
 * `node_modules` is skipped.
 *
 * @example
 * nc.getFilesIn("./src").filter((file) => file.endsWith(".js"));
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {boolean | ListOptions} [recursive=true]
 * @returns {string[] | undefined} Absolute paths, or `undefined` if the folder doesn't exist.
 */
function getFilesIn(path, recursive = true) {
  const root = _existing(path, "folder");
  return root ? _walk(root, "file", _listOptions(recursive, true)) : undefined;
}

/**
 * Finds paths matching a glob pattern: `*` (anything but `/`), `**` (any
 * depth), `?`, `[abc]` and `{js,ts}`.
 *
 * A pattern starting from the root of the disk searches there, and its
 * results are absolute.
 *
 * @example
 * nc.glob("src/**\/*.js");                           // ["src/index.js", "src/lib/a.js"]
 * nc.glob("**\/*.{png,jpg}", { cwd: "./assets", absolute: true });
 * nc.glob("packages/*", { type: "folders" });
 * nc.glob(`${folder}/**\/*.json`);                   // absolute pattern, absolute results
 *
 * @param {string | string[]} pattern One or more patterns.
 * @param {GlobOptions} [options]
 * @returns {string[]} Sorted, relative to `cwd` with `/` separators, unless the pattern is absolute or `absolute` is set.
 */
function glob(pattern, options = {}) {
  const patterns = (Array.isArray(pattern) ? pattern : [pattern]).map((p) => p.replace(/\\/g, "/").replace(/^\.\//, ""));
  const rooted = patterns.filter(_isAbsolutePattern);
  if (!rooted.length) return _globIn(_abs(options.cwd), patterns, options, options.absolute ?? false);

  const relative = patterns.filter((p) => !_isAbsolutePattern(p));
  const found = relative.length ? _globIn(_abs(options.cwd), relative, options, options.absolute ?? false) : [];
  /** @type {Map<string, string[]>} */
  const byRoot = new Map();
  for (const p of rooted) {
    const root = _globRoot(p);
    byRoot.set(root, [...(byRoot.get(root) ?? []), p.slice(root.endsWith("/") ? root.length : root.length + 1)]);
  }
  for (const [root, rest] of byRoot) found.push(..._globIn(root, rest, options, options.absolute ?? true));
  return found.sort();
}

/**
 * @param {string} cwd
 * @param {string[]} patterns Normalized, relative to `cwd`.
 * @param {GlobOptions} options
 * @param {boolean} absolute
 * @returns {string[]}
 */
const _globIn = (cwd, patterns, options, absolute) => {
  const matchers = patterns.map((p) => _globToRegExp(p, options.dot ?? false));
  const ignores = (options.ignore ?? ["**/node_modules/**", "**/.git/**"]).map((p) => _globToRegExp(p.replace(/\\/g, "/"), true));
  const type = options.type ?? "files";
  const bases = patterns.map((p) => {
    const segments = p.split("/");
    const staticParts = [];
    for (const segment of segments.slice(0, -1)) {
      if (/[*?[{]/.test(segment)) break;
      staticParts.push(segment);
    }
    return staticParts.join("/");
  });
  /** @type {Set<string>} */
  const results = new Set();
  /** @type {Set<string>} */
  const visited = new Set();

  /** @param {string} relDir */
  const visit = (relDir) => {
    if (visited.has(relDir)) return;
    visited.add(relDir);
    /** @type {fs.Dirent[]} */
    let entries;
    try {
      entries = fs.readdirSync(nodePath.join(cwd, relDir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const isDir = entry.isDirectory();
      if (ignores.some((re) => re.test(rel) || (isDir && re.test(`${rel}/`)))) continue;
      const wanted = type === "all" || (type === "folders" ? isDir : !isDir);
      if (wanted && matchers.some((re) => re.test(rel))) results.add(rel);
      if (isDir) visit(rel);
    }
  };
  for (const base of new Set(bases)) visit(base);
  return [...results].sort().map((rel) => (absolute ? nodePath.join(cwd, rel) : rel));
};

/**
 * Searches a folder tree for the first file or folder with this name,
 * closest first.
 *
 * @example
 * nc.find("config.json");
 * nc.find("fixtures", { type: "folder", cwd: "./test" });
 *
 * @param {string} name
 * @param {FindOptions} [options]
 * @returns {string | undefined} The absolute path.
 */
function find(name, options = {}) {
  const type = options.type ?? "file";
  const ignore = options.ignore ?? ["node_modules", ".git"];
  const queue = [_abs(options.cwd)];
  while (queue.length) {
    const dir = /** @type {string} */ (queue.shift());
    /** @type {fs.Dirent[]} */
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const isDir = entry.isDirectory();
      if (entry.name === name && (type === "any" || (type === "folder" ? isDir : !isDir))) return nodePath.join(dir, entry.name);
    }
    for (const entry of entries) if (entry.isDirectory() && !ignore.includes(entry.name)) queue.push(nodePath.join(dir, entry.name));
  }
  return undefined;
}

/**
 * Reads a file as text, or as a Buffer with `"buffer"`.
 *
 * @example
 * const text = nc.readFile("./README.md");
 * const bytes = nc.readFile("./logo.png", "buffer");
 *
 * @overload
 * @param {string} path
 * @param {"buffer"} encoding
 * @returns {Buffer | undefined} `undefined` if it can't be read.
 */
/**
 * Reads a file as text.
 *
 * @overload
 * @param {string} path
 * @param {BufferEncoding} [encoding="utf8"]
 * @returns {string | undefined} `undefined` if it can't be read.
 */
/**
 * @param {string} path
 * @param {BufferEncoding | "buffer"} [encoding="utf8"]
 * @returns {string | Buffer | undefined}
 */
function readFile(path, encoding = "utf8") {
  const target = _existing(path, "file");
  if (!target) return undefined;
  try {
    return encoding === "buffer" ? fs.readFileSync(target) : fs.readFileSync(target, encoding);
  } catch {
    return undefined;
  }
}

/**
 * Reads a text file as lines. A final newline doesn't add an empty line.
 *
 * @example
 * for (const url of nc.readLines("./urls.txt") ?? []) await check(url);
 *
 * @param {string} path
 * @returns {string[] | undefined} `undefined` if it can't be read.
 */
function readLines(path) {
  const text = readFile(path);
  if (text === undefined) return undefined;
  if (text === "") return [];
  return text.replace(/(\r\n|\r|\n)$/, "").split(/\r\n|\r|\n/);
}

/**
 * Reads a JSON file. If it's missing or invalid you get `fallback`, never
 * an error.
 *
 * @example
 * const settings = nc.readJSON("./settings.json", { theme: "light" });
 * const tsconfig = nc.readJSON("./tsconfig.json", {}, { comments: true });
 *
 * @template [T=any]
 * @param {string} path
 * @param {T} [fallback]
 * @param {ReadJSONOptions} [options]
 * @returns {T}
 */
function readJSON(path, fallback, options = {}) {
  const text = readFile(path);
  if (text === undefined) return /** @type {T} */ (fallback);
  try {
    const clean = text.replace(/^\uFEFF/, "");
    return JSON.parse(options.comments ? _stripJSONComments(clean) : clean, options.reviver);
  } catch {
    return /** @type {T} */ (fallback);
  }
}

/**
 * Writes a file atomically, creating its folders. Objects are written as
 * JSON.
 *
 * @example
 * nc.writeFile("./dist/index.html", html);
 * nc.writeFile("./.secrets/token", token, { mode: 0o600 });
 *
 * @param {string} path
 * @param {string | Buffer | Uint8Array | object} data
 * @param {WriteFileOptions} [options]
 * @returns {boolean} `false` if it failed.
 */
function writeFile(path, data, options = {}) {
  try {
    _write(_abs(path), _content(data, options.spaces ?? 2), options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes a value as JSON, atomically, creating folders.
 *
 * @example
 * nc.writeJSON("./data/users.json", users);
 *
 * @param {string} path
 * @param {unknown} data
 * @param {WriteJSONOptions} [options]
 * @returns {boolean} `false` if it failed, for example on a circular structure.
 */
function writeJSON(path, data, options = {}) {
  try {
    const text = JSON.stringify(data, /** @type {any} */ (options.replacer), options.spaces ?? 2);
    if (text === undefined) return false;
    _write(_abs(path), `${text}\n`, { atomic: options.atomic });
    return true;
  } catch {
    return false;
  }
}

/**
 * Appends to a file, creating it and its folders if needed.
 *
 * @example
 * nc.appendFile("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
 *
 * @param {string} path
 * @param {string | Buffer} data
 * @returns {boolean}
 */
function appendFile(path, data) {
  try {
    const target = _abs(path);
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    fs.appendFileSync(target, Buffer.isBuffer(data) ? data : String(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a file and its folders.
 *
 * @example
 * nc.createFile("./notes.txt", false, "hello");    // only if it doesn't exist
 * nc.createFile("./data.json", true, { ok: true }); // replace it
 *
 * @param {string} path
 * @param {boolean} [force=false] Replace the file if it exists.
 * @param {string | Buffer | object | null} [data] Objects are written as JSON.
 * @returns {boolean | undefined} `false` if it already existed or failed.
 */
function createFile(path, force = false, data) {
  if (!path) return undefined;
  const target = _abs(path);
  if (!force && fs.existsSync(target)) return false;
  try {
    _write(target, _content(data, 2), { atomic: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a folder and its parents.
 *
 * @example
 * nc.createFolder("./uploads");
 * nc.createFolder("./cache", true); // start from an empty folder
 *
 * @param {string} path
 * @param {boolean} [force=false] Delete and recreate it if it exists.
 * @returns {boolean | undefined} `false` if it already existed or failed.
 */
function createFolder(path, force = false) {
  if (!path) return undefined;
  const target = _abs(path);
  try {
    if (fs.existsSync(target)) {
      if (!force) return false;
      fs.rmSync(target, { recursive: true, force: true });
    }
    fs.mkdirSync(target, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Makes sure a folder exists and returns its absolute path.
 *
 * @example
 * const dir = nc.ensureFolder("./storage/uploads");
 *
 * @param {string} path
 * @returns {string}
 * @throws {Error} If it can't be created.
 */
function ensureFolder(path) {
  const target = _abs(path);
  fs.mkdirSync(target, { recursive: true });
  return target;
}

/**
 * Makes sure a file exists (an empty one if needed) and returns its
 * absolute path. An existing file is left as is.
 *
 * @param {string} path
 * @returns {string}
 * @throws {Error} If it can't be created.
 */
function ensureFile(path) {
  const target = _abs(path);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    fs.writeFileSync(target, "", { flag: "a" });
  }
  return target;
}

/**
 * Updates a file's modification time, creating the file if needed, like
 * the Unix `touch` command.
 *
 * @param {string} path
 * @returns {boolean}
 */
function touch(path) {
  try {
    const target = ensureFile(path);
    const now = new Date();
    fs.utimesSync(target, now, now);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a folder and everything in it.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist.
 */
function deleteFolder(path) {
  const target = path ? _existing(path, "folder") : undefined;
  if (!target) return undefined;
  try {
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a file.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist.
 */
function deleteFile(path) {
  const target = path ? _existing(path, "file") : undefined;
  if (!target) return undefined;
  try {
    fs.unlinkSync(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a file or a folder, whichever it is. Nothing happens if the path
 * doesn't exist.
 *
 * @example
 * nc.remove("./dist");
 *
 * @param {string} path
 * @returns {boolean} `true` if something was deleted.
 */
function remove(path) {
  const target = _existing(path, "any");
  if (!target) return false;
  try {
    fs.rmSync(target, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes the folders inside a folder that pass a test.
 *
 * @example
 * nc.deleteFoldersIn("./packages", (folder) => folder.endsWith("dist"));
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {(folder: string) => boolean} [filter] Gets absolute paths. Defaults to every folder.
 * @returns {number | undefined} How many were deleted.
 */
function deleteFoldersIn(path, filter = () => true) {
  const folders = getFoldersIn(path);
  if (!folders) return undefined;
  let deleted = 0;
  for (const folder of folders) {
    if (!fs.existsSync(folder) || !filter(folder)) continue;
    fs.rmSync(folder, { recursive: true, force: true });
    deleted++;
  }
  return deleted;
}

/**
 * Deletes the files inside a folder that pass a test.
 *
 * @example
 * nc.deleteFilesIn("./logs", false, (file) => file.endsWith(".log"));
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {boolean} [recursive=false]
 * @param {(file: string) => boolean} [filter] Gets absolute paths. Defaults to every file.
 * @returns {number | undefined} How many were deleted.
 */
function deleteFilesIn(path, recursive = false, filter = () => true) {
  const files = getFilesIn(path, recursive);
  if (!files) return undefined;
  let deleted = 0;
  for (const file of files) {
    if (!filter(file)) continue;
    try {
      fs.unlinkSync(file);
      deleted++;
    } catch {
      // keep going
    }
  }
  return deleted;
}

/**
 * Deletes everything inside a folder, keeping the folder.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist.
 */
function emptyFolder(path) {
  const target = _existing(path, "folder");
  if (!target) return undefined;
  try {
    for (const entry of fs.readdirSync(target)) fs.rmSync(nodePath.join(target, entry), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies a file or a whole folder, like `cp -r`.
 *
 * @example
 * nc.copy("./templates", "./dist/templates");
 * nc.copy("./.env.example", "./.env", { overwrite: false });
 *
 * @param {string} source
 * @param {string} destination
 * @param {CopyOptions} [options]
 * @returns {boolean} `false` if the source is missing or the copy failed.
 */
function copy(source, destination, options = {}) {
  const src = _existing(source, "any");
  if (!src) return false;
  try {
    const dest = _abs(destination);
    fs.mkdirSync(nodePath.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, {
      recursive: true,
      force: options.overwrite ?? true,
      errorOnExist: false,
      preserveTimestamps: options.preserveTimestamps ?? false,
      filter: options.filter ? (s, d) => /** @type {Function} */ (options.filter)(s, d) : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves or renames a file or folder, across drives too.
 *
 * @example
 * nc.move("./report.pdf", "./archive/2024/report.pdf");
 *
 * @param {string} source
 * @param {string} destination
 * @param {{ overwrite?: boolean }} [options] Replace an existing destination. Defaults to `true`.
 * @returns {boolean}
 */
function move(source, destination, options = {}) {
  const src = _existing(source, "any");
  if (!src) return false;
  const dest = _abs(destination);
  try {
    if (fs.existsSync(dest)) {
      if (options.overwrite === false) return false;
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.mkdirSync(nodePath.dirname(dest), { recursive: true });
    try {
      fs.renameSync(src, dest);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== "EXDEV") throw error;
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies the folders inside a folder into another one. `copy()` is simpler
 * for most cases.
 *
 * @param {CopyFoldersOptions} options
 * @returns {number | undefined} How many were copied.
 */
function copyFoldersIn(options) {
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  const recursive = options.recursive ?? true;
  const filter = typeof options.filter === "function" ? options.filter : () => true;
  let copied = 0;
  for (const folder of getFoldersIn(root, recursive) ?? []) {
    if (!filter(folder)) continue;
    const target = nodePath.join(dest, nodePath.relative(root, folder));
    if (options.force && fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    copied++;
    if (options.withFiles) {
      for (const file of getFilesIn(folder, false) ?? []) fs.copyFileSync(file, nodePath.join(target, nodePath.basename(file)));
    }
  }
  return copied;
}

/**
 * Copies a folder. Without `recursive` or `withFiles`, only the empty
 * folder is created; `copy()` copies everything in one call.
 *
 * @param {CopyFolderOptions} options
 * @returns {boolean | undefined}
 */
function copyFolder(options) {
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  try {
    if (options.force && fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    const folders = options.recursive ? [root, ...(getFoldersIn(root, true) ?? [])] : [root];
    for (const folder of folders) {
      const target = nodePath.join(dest, nodePath.relative(root, folder));
      fs.mkdirSync(target, { recursive: true });
      if (options.withFiles) {
        for (const file of getFilesIn(folder, false) ?? []) fs.copyFileSync(file, nodePath.join(target, nodePath.basename(file)));
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies the files inside a folder into another one, keeping the tree.
 *
 * @example
 * nc.copyFilesIn({ path: "./src", dest: "./dist", filter: (file) => file.endsWith(".css") });
 *
 * @param {CopyFilesOptions} options
 * @returns {number | undefined} How many were copied.
 */
function copyFilesIn(options) {
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  const recursive = options.recursive ?? true;
  const filter = typeof options.filter === "function" ? options.filter : () => true;
  let copied = 0;
  for (const file of getFilesIn(root, recursive) ?? []) {
    if (!filter(file)) continue;
    const target = nodePath.join(dest, recursive ? nodePath.relative(root, file) : nodePath.basename(file));
    if (options.force && fs.existsSync(target)) fs.rmSync(target, { force: true });
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
    copied++;
  }
  return copied;
}

/**
 * Copies one file. If `dest` ends with `/`, the file keeps its name inside
 * that folder.
 *
 * @example
 * nc.copyFile({ path: "./src/index.js", dest: "./dist/" });
 *
 * @param {CopyFileOptions} options
 * @returns {boolean | undefined}
 */
function copyFile(options) {
  const src = _existing(options.path, "file");
  if (!src || !options.dest) return undefined;
  const intoFolder = /[\\/]$/.test(options.dest) || (fs.existsSync(_abs(options.dest)) && fs.statSync(_abs(options.dest)).isDirectory());
  const dest = intoFolder ? nodePath.join(_abs(options.dest), nodePath.basename(src)) : _abs(options.dest);
  try {
    if (options.force && fs.existsSync(dest)) fs.rmSync(dest, { force: true });
    fs.mkdirSync(nodePath.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Moves the folders inside a folder.
 *
 * @param {CopyFoldersOptions} options
 * @returns {number | undefined} How many were moved.
 */
function moveFoldersIn(options) {
  const root = _existing(options.path, "folder");
  const copied = copyFoldersIn(options);
  if (copied === undefined || !root) return copied;
  const filter = typeof options.filter === "function" ? options.filter : () => true;
  for (const folder of getFoldersIn(root, options.recursive ?? true) ?? []) {
    if (fs.existsSync(folder) && filter(folder)) fs.rmSync(folder, { recursive: true, force: true });
  }
  return copied;
}

/**
 * Moves a folder.
 *
 * @param {CopyFolderOptions & { path: string }} options
 * @returns {boolean | undefined}
 */
function moveFolder(options) {
  const root = _existing(options.path, "folder");
  const copied = copyFolder(options);
  if (copied && root) fs.rmSync(root, { recursive: true, force: true });
  return copied;
}

/**
 * Moves the files inside a folder.
 *
 * @param {CopyFilesOptions} options
 * @returns {number | undefined} How many were moved.
 */
function moveFilesIn(options) {
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const filter = typeof options.filter === "function" ? options.filter : () => true;
  const files = (getFilesIn(root, options.recursive ?? true) ?? []).filter(filter);
  const copied = copyFilesIn({ ...options, path: root, filter: (f) => files.includes(f) });
  for (const file of files) fs.rmSync(file, { force: true });
  return copied;
}

/**
 * Moves one file.
 *
 * @example
 * nc.moveFile({ path: "./logs/app.log", dest: "./logs/archive/" });
 *
 * @param {CopyFileOptions} options
 * @returns {boolean | undefined}
 */
function moveFile(options) {
  const src = _existing(options.path, "file");
  const moved = copyFile(options);
  if (moved && src) fs.rmSync(src, { force: true });
  return moved;
}

/**
 * Does a file or folder exist at this path?
 *
 * @param {string} path
 * @returns {boolean}
 */
function exists(path) {
  return path ? fs.existsSync(_abs(path)) : false;
}

/**
 * Is it an existing file?
 *
 * @param {string} path
 * @returns {boolean}
 */
function isFile(path) {
  return _existing(path, "file") !== undefined;
}

/**
 * Is it an existing folder?
 *
 * @param {string} path
 * @returns {boolean}
 */
function isFolder(path) {
  return _existing(path, "folder") !== undefined;
}

/**
 * Size, dates and type of a path.
 *
 * @example
 * nc.stat("./video.mp4")?.mtime;
 *
 * @param {string} path
 * @returns {fs.Stats | undefined} `undefined` if it doesn't exist.
 */
function stat(path) {
  try {
    return fs.statSync(_abs(path));
  } catch {
    return undefined;
  }
}

/**
 * A file's size in bytes.
 *
 * @example
 * nc.num.formatBytes(nc.fileSize("./backup.zip") ?? 0); // "1.2 GB"
 *
 * @param {string} path
 * @returns {number | undefined} `undefined` if it doesn't exist.
 */
function fileSize(path) {
  const target = _existing(path, "file");
  return target ? fs.statSync(target).size : undefined;
}

/**
 * The total size of every file in a folder.
 *
 * @param {string} path
 * @returns {number | undefined} `undefined` if it doesn't exist.
 */
function folderSize(path) {
  const root = _existing(path, "folder");
  if (!root) return undefined;
  let total = 0;
  for (const file of _walk(root, "file", { recursive: true, hidden: true, ignore: [] })) {
    try {
      total += fs.lstatSync(file).size;
    } catch {
      // file removed in the meantime
    }
  }
  return total;
}

/**
 * Hashes a file in chunks, so huge files are fine.
 *
 * @example
 * nc.hashFile("./release.zip");                     // sha256, hex
 * nc.hashFile("./release.zip", { algorithm: "md5" });
 *
 * @param {string} path
 * @param {{ algorithm?: string, encoding?: "hex" | "base64" | "base64url" }} [options] Defaults to sha256 in hex.
 * @returns {string | undefined} `undefined` if it can't be read.
 */
function hashFile(path, options = {}) {
  const target = _existing(path, "file");
  if (!target) return undefined;
  let fd;
  try {
    const hash = require("node:crypto").createHash(options.algorithm ?? "sha256");
    fd = fs.openSync(target, "r");
    const buffer = Buffer.allocUnsafe(1 << 20);
    let read;
    while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, read));
    return hash.digest(options.encoding ?? "hex");
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * Creates a new, unique folder in the system's temp directory.
 *
 * @example
 * const dir = nc.tempFolder("export-");
 * try { await exportTo(dir); } finally { nc.remove(dir); }
 *
 * @param {string} [prefix="nc-"]
 * @returns {string}
 */
function tempFolder(prefix = "nc-") {
  return fs.mkdtempSync(nodePath.join(os.tmpdir(), prefix));
}

/**
 * Turns any text into a file name that works on Windows, macOS and Linux:
 * forbidden characters are replaced, reserved names like `CON` are
 * prefixed, and the length is capped.
 *
 * @example
 * nc.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
 * nc.sanitizeFilename("CON.txt");                    // "_CON.txt"
 *
 * @param {string} name
 * @param {{ replacement?: string }} [options] Defaults to `"_"`.
 * @returns {string}
 */
function sanitizeFilename(name, options = {}) {
  const replacement = options.replacement ?? "_";
  let clean = String(name).replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, replacement).replace(/[. ]+$/, "");
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i.test(clean)) clean = `_${clean}`;
  if (clean === "." || clean === "..") clean = replacement;
  while (Buffer.byteLength(clean) > 255) clean = [...clean].slice(0, -1).join("");
  return clean || "_";
}

/**
 * Watches a file or folder for changes.
 *
 * @example
 * const watcher = nc.watch({ path: "./src", recursive: true, debounce: 100 })
 *   .on("change", (file) => nc.info(`Changed: ${file}`))
 *   .on("rename", (file) => nc.info(`Added or removed: ${file}`));
 * watcher.stop();
 *
 * @param {WatchOptions} [options]
 * @returns {Watcher | undefined} `undefined` if the path doesn't exist.
 */
function watch(options = {}) {
  const target = _existing(options.path, "any");
  if (!target) return undefined;
  let paused = false;
  /** @type {Record<string, Function[]>} */
  const listeners = { change: [], rename: [], all: [] };
  /** @type {Map<string, NodeJS.Timeout>} */
  const pending = new Map();

  /**
   * @param {"change" | "rename"} event
   * @param {string} file
   */
  const dispatch = (event, file) => {
    if (paused) return;
    if (typeof options.filter === "function" && !options.filter(event, file)) return;
    for (const cb of listeners[event]) cb(file);
    for (const cb of listeners.all) cb(event, file);
  };

  const isDir = fs.statSync(target).isDirectory();
  // Watching a short (8.3) or symlinked path crashes libuv on Windows, so
  // watch the real one and keep reporting paths under the one you passed.
  const watcher = fs.watch(_realPath(target), { recursive: options.recursive ?? false }, (event, fileName) => {
    const file = fileName && isDir ? nodePath.join(target, String(fileName)) : target;
    const kind = event === "rename" ? "rename" : "change";
    if (!options.debounce) return dispatch(kind, file);
    const key = `${kind}:${file}`;
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => {
      pending.delete(key);
      dispatch(kind, file);
    }, options.debounce));
  });
  watcher.on("error", () => {});

  /** @type {Watcher} */
  const controller = {
    on(event, callback) {
      (listeners[event] ??= []).push(callback);
      return controller;
    },
    stop() {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      try {
        watcher.close();
      } catch {
        // already closed
      }
    },
    pause() {
      paused = true;
      return controller;
    },
    resume() {
      paused = false;
      return controller;
    },
  };
  return controller;
}

module.exports = {
  getEnv,
  createPath,
  getFolder,
  getFile,
  getFoldersIn,
  getFilesIn,
  glob,
  find,
  readFile,
  readLines,
  readJSON,
  writeFile,
  writeJSON,
  appendFile,
  createFile,
  createFolder,
  ensureFolder,
  ensureFile,
  touch,
  deleteFolder,
  deleteFile,
  remove,
  deleteFoldersIn,
  deleteFilesIn,
  emptyFolder,
  copy,
  move,
  copyFoldersIn,
  copyFolder,
  copyFilesIn,
  copyFile,
  moveFoldersIn,
  moveFolder,
  moveFilesIn,
  moveFile,
  exists,
  isFile,
  isFolder,
  stat,
  fileSize,
  folderSize,
  hashFile,
  tempFolder,
  sanitizeFilename,
  watch,
};
