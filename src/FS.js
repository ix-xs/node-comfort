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
 * Everyday failures don't throw. `write`, `writeJSON`, `append`, `touch`,
 * `copy`, `move` and `remove` return `true` when done and `false` when not.
 * `read`, `readLines`, `stat`, `size`, `hash`, `list`, `find` and `findUp`
 * return `undefined` when the path doesn't exist or can't be read, and
 * `readJSON` its fallback. Only `ensureFile`, `ensureFolder` and `temp`
 * throw, when they can't create what you asked for: you can rely on the path
 * they return.
 *
 * @example
 * nc.fs.writeJSON("./data/settings.json", { theme: "dark" });
 * const settings = nc.fs.readJSON("./data/settings.json", {});
 * const sources = nc.fs.glob("src/**\/*.{js,ts}");
 */

const fs = require("node:fs");
const os = require("node:os");
const nodePath = require("node:path");
const util = require("node:util");
const { fileURLToPath } = require("node:url");
const { sleepSync, toMs } = require("./internal/shared.js");
const { deprecate } = require("./internal/deprecate.js");
const { stripJSONComments: _stripJSONComments } = require("./internal/json.js");

/**
 * Options for `copyFoldersIn()` and `moveFoldersIn()` (deprecated).
 * @typedef {object} CopyFoldersOptions
 * @property {string} dest Destination folder.
 * @property {string} path Source folder. Since 3.0, an empty one is refused (nothing is done) instead of meaning the working directory.
 * @property {boolean} [recursive] Include nested folders. Defaults to `true`.
 * @property {boolean} [withFiles] Copy the files in each folder too.
 * @property {boolean} [force] Delete an existing destination folder first.
 * @property {(folder: string) => boolean} [filter] Keep a folder when it returns `true`. Gets absolute paths.
 */

/**
 * Options for `copyFolder()` and `moveFolder()` (deprecated).
 * @typedef {object} CopyFolderOptions
 * @property {string} dest Destination folder.
 * @property {string} path Source folder. Since 3.0, an empty one is refused (nothing is done) instead of meaning the working directory.
 * @property {boolean} [recursive] Copy nested folders too.
 * @property {boolean} [withFiles] Copy files too. `copy()` does all of this in one call.
 * @property {boolean} [force] Delete an existing destination first.
 */

/**
 * Options for `copyFilesIn()` and `moveFilesIn()` (deprecated).
 * @typedef {object} CopyFilesOptions
 * @property {string} dest Destination folder.
 * @property {string} path Source folder. Since 3.0, an empty one is refused (nothing is done) instead of meaning the working directory.
 * @property {boolean} [recursive] Include files from nested folders, keeping the tree. Defaults to `true`.
 * @property {boolean} [force] Delete existing destination files first.
 * @property {(file: string) => boolean} [filter] Keep a file when it returns `true`. Gets absolute paths.
 */

/**
 * Options for `copyFile()` and `moveFile()` (deprecated).
 * @typedef {object} CopyFileOptions
 * @property {string} path Source file.
 * @property {string} dest Destination file, or a folder if it ends with `/`.
 * @property {boolean} [force] Delete the destination first.
 */

/**
 * Options for `copy()`.
 * @typedef {object} CopyOptions
 * @property {boolean} [overwrite] Replace existing files. Defaults to `true`.
 * @property {(source: string, destination: string) => boolean} [filter] Return `false` to skip a file or folder (a skipped folder is skipped with all it holds). Gets absolute paths, the source itself included.
 * @property {boolean} [preserveTimestamps] Keep modification times.
 */

/**
 * Options for `move()`.
 * @typedef {object} MoveOptions
 * @property {boolean} [overwrite] Replace an existing destination. Defaults to `true`.
 * @property {(source: string, destination: string) => boolean} [filter] Return `false` to leave a file or folder where it is (a folder left out stays with all it holds). Gets absolute paths, the source itself included.
 */

/**
 * Options for `remove()`.
 * @typedef {object} RemoveOptions
 * @property {boolean} [contents] Delete what's inside a folder and keep the folder itself.
 * @property {(path: string) => boolean} [filter] Delete only what's inside the folder that passes the test, at any depth: a folder that passes goes with all it holds. Gets absolute paths. Implies `contents`.
 */

/**
 * Options for `write()`.
 * @typedef {object} WriteFileOptions
 * @property {boolean} [atomic] Write to a temporary file and rename it, so nobody reads a half-written file and a crash can't corrupt it. Defaults to `true`.
 * @property {BufferEncoding} [encoding] Defaults to `"utf8"`.
 * @property {number} [mode] Permissions, like `0o600` for secrets. A file that already exists keeps the ones it has.
 * @property {boolean} [fsync] Wait until the data is on the disk before returning. Slower, for files that must survive a power cut.
 * @property {number} [spaces] Indentation when writing an object as JSON. Defaults to `2`.
 */

/**
 * Options for `writeJSON()`.
 * @typedef {object} WriteJSONOptions
 * @property {number} [spaces] Defaults to `2`.
 * @property {boolean} [atomic] Defaults to `true`.
 * @property {(key: string, value: unknown) => unknown} [replacer] Passed to `JSON.stringify`.
 * @property {number} [mode] Permissions, like `0o600` for secrets. A file that already exists keeps the ones it has.
 * @property {boolean} [fsync] Wait until the data is on the disk before returning.
 */

/**
 * Options for `readJSON()`.
 * @typedef {object} ReadJSONOptions
 * @property {boolean} [comments] Allow comments and trailing commas, like in `tsconfig.json`.
 * @property {(key: string, value: any) => any} [reviver] Passed to `JSON.parse`.
 */

/**
 * Options for `list()`. The deprecated `getFilesIn()` and `getFoldersIn()`
 * take the same ones, without `type`, `dot` and `filter`.
 * @typedef {object} ListOptions
 * @property {"files" | "folders" | "all"} [type] What to list. Defaults to `"files"`.
 * @property {boolean} [recursive] Go into nested folders. Defaults to `true`.
 * @property {boolean} [hidden] Include names starting with a dot. Defaults to `true`.
 * @property {boolean} [dot] The same as `hidden`, under the name `glob()` uses. Defaults to `true` here.
 * @property {string[]} [ignore] Folder names to skip, with all they hold. Defaults to `["node_modules"]`.
 * @property {(path: string) => boolean} [filter] Keep a path when it returns `true`. Gets absolute paths. It only picks results: a folder left out is still searched.
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
 * @property {"files" | "folders" | "all" | "file" | "folder" | "any"} [type] What to look for: `"files"`, `"folders"` or `"all"` (both), like `list()` and `glob()`. The singular forms mean the same. Defaults to `"files"`.
 * @property {string[]} [ignore] Folder names to skip. Defaults to `node_modules` and `.git`.
 */

/**
 * Options for `watch()`.
 * @typedef {object} WatchOptions
 * @property {string} [path] What to watch. Defaults to the working directory. `watch(path, options)` gives it first instead.
 * @property {boolean} [recursive] Watch nested folders too.
 * @property {(event: "rename" | "change", file: string) => boolean} [filter] Return `false` to ignore an event.
 * @property {number | string} [debounce] Merge events on the same file within this long, in ms or like `"100ms"`. Editors often save in several steps.
 */

/**
 * Returned by `watch()`. With `using`, the watch stops at the end of the block.
 * @typedef {_WatcherMethods & Disposable} Watcher
 */

/**
 * @typedef {object} _WatcherMethods
 * @property {<E extends "change" | "rename" | "all" | "error">(event: E, callback: E extends "all" ? (event: "change" | "rename", file: string) => void : E extends "error" ? (error: Error) => void : (file: string) => void) => Watcher} on Listens for changes. `"all"` also gets the event name. `"error"` tells you the watch broke, for instance because the folder was deleted.
 * @property {() => Watcher} stop Stops watching. Returns the watcher.
 * @property {(event: "change" | "rename" | "all" | "error", callback: Function) => Watcher} off Removes a listener added with `on()`.
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
  for (const frame of util.getCallSites(50)) {
    let file = frame.scriptName;
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
 * @typedef {{ recursive: boolean, hidden: boolean, ignore: string[] }} _WalkOptions
 */

/**
 * @param {string} root
 * @param {"file" | "folder" | "all"} type
 * @param {_WalkOptions} options
 * @returns {string[]}
 */
const _walk = (root, type, options) => {
  /** @type {string[]} */
  const out = [];
  _walkInto(root, type, options, new Set(options.ignore), out);
  return out;
};

/**
 * @param {string} dir
 * @param {"file" | "folder" | "all"} type
 * @param {_WalkOptions} options
 * @param {Set<string>} ignore
 * @param {string[]} out Filled in place: no array is built and thrown away at each level.
 */
const _walkInto = (dir, type, options, ignore, out) => {
  /** @type {fs.Dirent[]} */
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!options.hidden && entry.name.startsWith(".")) continue;
    const full = nodePath.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignore.has(entry.name)) continue;
      if (type !== "file") out.push(full);
      if (options.recursive) _walkInto(full, type, options, ignore, out);
    } else if (type !== "folder" && (entry.isFile() || entry.isSymbolicLink())) {
      out.push(full);
    }
  }
};

/**
 * @param {boolean | ListOptions | undefined} recursiveOrOptions
 * @param {boolean} defaultRecursive
 * @returns {_WalkOptions}
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

const _RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

/**
 * Renames a file. On Windows, an antivirus or an indexer can hold the
 * target for a few milliseconds: a refused rename is tried again.
 * @param {string} from
 * @param {string} to
 */
const _rename = (from, to) => {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (process.platform !== "win32" || attempt >= 8 || !_RETRY_CODES.has(/** @type {NodeJS.ErrnoException} */ (error).code ?? "")) throw error;
      sleepSync(5 * (attempt + 1));
    }
  }
};

/**
 * @param {string} target
 * @param {string | Buffer} content
 * @param {WriteFileOptions} options
 */
const _write = (target, content, options) => {
  fs.mkdirSync(nodePath.dirname(target), { recursive: true });
  const encoding = options.encoding ?? "utf8";
  if (options.atomic === false) {
    /** @type {fs.WriteFileOptions} */
    const direct = { encoding, flush: options.fsync ?? false };
    if (options.mode !== undefined) direct.mode = options.mode;
    fs.writeFileSync(target, content, direct);
    return;
  }
  // The new file takes the place of the old one, so it must take its permissions too:
  // a secret readable by its owner only stays that way.
  let mode = options.mode;
  if (mode === undefined) {
    try {
      mode = fs.statSync(target).mode & 0o777;
    } catch {
      mode = undefined;
    }
  }
  // A name nobody can guess, created only if nothing is there ("wx"): a link planted in advance can't redirect the write.
  const temp = `${target}.${require("node:crypto").randomBytes(8).toString("hex")}.tmp`;
  /** @type {number | undefined} */
  let fd;
  let created = false;
  try {
    // Created with its final permissions (the umask applies, as for any new file), never wider.
    fd = fs.openSync(temp, "wx", mode ?? 0o666);
    created = true;
    fs.writeFileSync(fd, content, { encoding });
    if (options.fsync) fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    _rename(temp, target);
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    if (created) fs.rmSync(temp, { force: true });
    throw error;
  }
};

/**
 * Does something exist at this path, a broken link included?
 * @param {string} path
 * @returns {boolean}
 */
const _lexists = (path) => {
  try {
    fs.lstatSync(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * The real path of a path that may not exist yet: the part that exists is
 * resolved, the rest is added as it is.
 * @param {string} path Absolute.
 * @returns {string}
 */
const _realTarget = (path) => {
  /** @type {string[]} */
  const rest = [];
  let existing = path;
  while (!fs.existsSync(existing)) {
    const parent = nodePath.dirname(existing);
    if (parent === existing) return path;
    rest.unshift(nodePath.basename(existing));
    existing = parent;
  }
  return nodePath.join(_realPath(existing), ...rest);
};

/**
 * Do both paths lead to the same file or folder? Links, short names and,
 * on Windows, letter case don't fool it.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const _sameEntry = (a, b) => {
  let x;
  let y;
  try {
    x = fs.statSync(a, { bigint: true });
    y = fs.statSync(b, { bigint: true });
  } catch {
    // one of them doesn't exist
    return false;
  }
  // some file systems have no file ids: compare the real paths then
  if (x.ino !== 0n || y.ino !== 0n) return x.dev === y.dev && x.ino === y.ino;
  const [ra, rb] = [_realPath(a), _realPath(b)];
  return process.platform === "win32" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
};

/**
 * Is `src` a link to `dest`? Renaming it there would put the link in place
 * of the real file. The link itself under another letter case is not.
 * @param {string} src
 * @param {string} dest
 * @returns {boolean}
 */
const _linkOnto = (src, dest) => {
  let link;
  let other;
  try {
    link = fs.lstatSync(src, { bigint: true });
    if (!link.isSymbolicLink()) return false;
    other = fs.lstatSync(dest, { bigint: true });
  } catch {
    // no link, or nothing at dest to lose
    return false;
  }
  if (link.ino !== 0n && other.dev === link.dev && other.ino === link.ino) return false;
  const [ra, rb] = [_realPath(src), _realPath(dest)];
  return process.platform === "win32" ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
};

/**
 * Is `child` the folder `parent` itself, or somewhere inside it, once links
 * are resolved? Copying or moving a folder there would destroy it.
 * @param {string} child Absolute, may not exist yet.
 * @param {string} parent Absolute, exists.
 * @returns {boolean}
 */
const _within = (child, parent) => {
  if (_sameEntry(child, parent)) return true;
  // path.relative ignores letter case on Windows
  const rel = nodePath.relative(_realPath(parent), _realTarget(child));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${nodePath.sep}`) && !nodePath.isAbsolute(rel));
};

/**
 * Would copying the files of `root` into `dest` copy them onto themselves,
 * or into the tree being read?
 * @param {string} root
 * @param {string} dest
 * @param {boolean} recursive
 * @returns {boolean}
 */
const _filesInItself = (root, dest, recursive) => (recursive ? _within(dest, root) : _sameEntry(dest, root));

/**
 * Copies a link as a link, never what it points to. On Windows a link to a
 * folder becomes a junction, which needs no special rights. A link that
 * can't be made is left out.
 * @param {string} from
 * @param {string} to
 * @param {boolean} overwrite
 */
const _copyLink = (from, to, overwrite) => {
  try {
    if (_lexists(to)) {
      // a real file or folder in the way is kept: only a link is replaced by a link
      if (!overwrite || !fs.lstatSync(to).isSymbolicLink()) return;
      fs.unlinkSync(to);
    }
    const target = fs.readlinkSync(from);
    /** @type {"junction" | "file" | undefined} */
    let type;
    if (process.platform === "win32") {
      try {
        type = fs.statSync(from).isDirectory() ? "junction" : "file";
      } catch {
        type = "file";
      }
    }
    fs.symlinkSync(target, to, type);
  } catch {
    // left out, never followed
  }
};

/**
 * `fs.cpSync()` that copies the links inside the tree as links: a junction
 * or a link to a folder outside never brings that folder's files along.
 * Elsewhere than on Windows, `fs.cpSync()` already copies links as links.
 * @param {string} src Absolute.
 * @param {string} dest Absolute.
 * @param {{ force?: boolean, errorOnExist?: boolean, preserveTimestamps?: boolean, filter?: (source: string, destination: string) => boolean }} [options]
 */
const _copyTree = (src, dest, options = {}) => {
  const overwrite = options.force ?? true;
  fs.cpSync(src, dest, {
    recursive: true,
    dereference: false,
    force: overwrite,
    errorOnExist: options.errorOnExist ?? false,
    preserveTimestamps: options.preserveTimestamps ?? false,
    // Every platform: cpSync follows junctions on Windows, and elsewhere refuses to copy a link over the same link.
    filter: (s, d) => {
      if (options.filter && !options.filter(s, d)) return false;
      // the source itself was named by the caller: only links inside it are kept as links
      if (nodePath.resolve(s) === src) return true;
      let link;
      try {
        link = fs.lstatSync(s).isSymbolicLink();
      } catch {
        return false;
      }
      if (!link) return true;
      _copyLink(s, d, overwrite);
      return false;
    },
  });
};

/**
 * @param {string} pattern
 * @param {boolean} dot
 * @returns {RegExp}
 */
const _compileGlob = (pattern, dot) => {
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

/** @type {Map<string, RegExp>} */
const _globs = new Map();

/**
 * A glob pattern as a regular expression, compiled once.
 * @param {string} pattern Forward slashes only.
 * @param {boolean} dot Whether `*` matches names starting with a dot.
 * @returns {RegExp}
 */
const _globToRegExp = (pattern, dot) => {
  const key = dot ? `.${pattern}` : `/${pattern}`;
  let regex = _globs.get(key);
  if (!regex) {
    regex = _compileGlob(pattern, dot);
    if (_globs.size >= 500) _globs.clear();
    _globs.set(key, regex);
  }
  return regex;
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

// Reading

/**
 * Reads a file as text, or as a Buffer with `"buffer"`.
 *
 * @example
 * const text = nc.fs.read("./README.md");
 * const bytes = nc.fs.read("./logo.png", "buffer");
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
function read(path, encoding = "utf8") {
  if (!path) return undefined;
  try {
    return encoding === "buffer" ? fs.readFileSync(_abs(path)) : fs.readFileSync(_abs(path), encoding);
  } catch {
    // missing, a folder, or unreadable
    return undefined;
  }
}

/**
 * Reads a JSON file. If it's missing or invalid you get `fallback`, never
 * an error.
 *
 * @example
 * const settings = nc.fs.readJSON("./settings.json", { theme: "light" });
 * const tsconfig = nc.fs.readJSON("./tsconfig.json", {}, { comments: true });
 *
 * @template [T=any]
 * @param {string} path
 * @param {T} [fallback]
 * @param {ReadJSONOptions} [options]
 * @returns {T}
 */
function readJSON(path, fallback, options = {}) {
  const text = read(path);
  if (text === undefined) return /** @type {T} */ (fallback);
  try {
    const clean = text.replace(/^﻿/, "");
    return JSON.parse(options.comments ? _stripJSONComments(clean) : clean, options.reviver);
  } catch {
    return /** @type {T} */ (fallback);
  }
}

/**
 * Reads a text file as lines. A final newline doesn't add an empty line.
 *
 * @example
 * for (const url of nc.fs.readLines("./urls.txt") ?? []) await check(url);
 *
 * @param {string} path
 * @returns {string[] | undefined} `undefined` if it can't be read.
 */
function readLines(path) {
  const text = read(path);
  if (text === undefined) return undefined;
  if (text === "") return [];
  return text.replace(/(\r\n|\r|\n)$/, "").split(/\r\n|\r|\n/);
}

// Writing

/**
 * Writes a file atomically, creating its folders. Objects are written as
 * JSON.
 *
 * @example
 * nc.fs.write("./dist/index.html", html);
 * nc.fs.write("./.secrets/token", token, { mode: 0o600 });
 *
 * @param {string} path
 * @param {string | Buffer | Uint8Array | object} data
 * @param {WriteFileOptions} [options]
 * @returns {boolean} `false` if it failed.
 */
function write(path, data, options = {}) {
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
 * nc.fs.writeJSON("./data/users.json", users);
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
    _write(_abs(path), `${text}\n`, { atomic: options.atomic, mode: options.mode, fsync: options.fsync });
    return true;
  } catch {
    return false;
  }
}

/**
 * Appends to a file, creating it and its folders if needed.
 *
 * @example
 * nc.fs.append("./logs/audit.log", `${new Date().toISOString()} login ${user}\n`);
 *
 * @param {string} path
 * @param {string | Buffer} data
 * @returns {boolean} `false` if it failed.
 */
function append(path, data) {
  try {
    const target = _abs(path);
    const content = Buffer.isBuffer(data) ? data : String(data);
    try {
      fs.appendFileSync(target, content);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") throw error;
      fs.mkdirSync(nodePath.dirname(target), { recursive: true });
      fs.appendFileSync(target, content);
    }
    return true;
  } catch {
    return false;
  }
}

// Checking

/**
 * Does a file or folder exist at this path?
 *
 * @example
 * if (!nc.fs.exists("./config.json")) nc.fs.writeJSON("./config.json", defaults);
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
 * @example
 * nc.fs.isFile("./package.json"); // true
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
 * @example
 * if (!nc.fs.isFolder("./uploads")) nc.fs.ensureFolder("./uploads");
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
 * nc.fs.stat("./video.mp4")?.mtime;
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
 * The total size of the files in a folder, links counted as links, never
 * followed.
 * @param {string} root Absolute, an existing folder.
 * @returns {number}
 */
const _folderSize = (root) => {
  let total = 0;
  for (const file of _walk(root, "file", { recursive: true, hidden: true, ignore: [] })) {
    try {
      total += fs.lstatSync(file).size;
    } catch {
      // file removed in the meantime
    }
  }
  return total;
};

/**
 * The size of a file in bytes, or the total size of every file in a folder
 * (nested ones included, links not followed).
 *
 * @example
 * nc.num.formatBytes(nc.fs.size("./backup.zip") ?? 0); // "1.2 GB"
 * nc.fs.size("./node_modules");                        // everything inside
 *
 * @param {string} path
 * @returns {number | undefined} `undefined` if it doesn't exist.
 */
function size(path) {
  if (!path) return undefined;
  const target = _abs(path);
  try {
    const stats = fs.statSync(target);
    if (stats.isFile()) return stats.size;
    return stats.isDirectory() ? _folderSize(target) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Hashes a file in chunks, so huge files are fine.
 *
 * @example
 * nc.fs.hash("./release.zip");                     // sha256, hex
 * nc.fs.hash("./release.zip", { algorithm: "md5" });
 *
 * @param {string} path
 * @param {{ algorithm?: string, encoding?: "hex" | "base64" | "base64url" }} [options] The algorithm and how the hash is written. Defaults to sha256 in hex.
 * @returns {string | undefined} `undefined` if it can't be read.
 */
function hash(path, options = {}) {
  const target = _existing(path, "file");
  if (!target) return undefined;
  let fd;
  try {
    const hasher = require("node:crypto").createHash(options.algorithm ?? "sha256");
    fd = fs.openSync(target, "r");
    const buffer = Buffer.allocUnsafe(1 << 20);
    let bytes;
    while ((bytes = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hasher.update(buffer.subarray(0, bytes));
    return hasher.digest(options.encoding ?? "hex");
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// Listing and searching

/**
 * `find()` and `findUp()` take `"files"`, `"folders"` and `"all"` like
 * `list()`, and the older `"file"`, `"folder"` and `"any"`.
 * @param {string | undefined} type
 * @param {"file" | "folder" | "any"} fallback
 * @returns {"file" | "folder" | "any"}
 */
const _findType = (type, fallback) => {
  if (type === "files" || type === "file") return "file";
  if (type === "folders" || type === "folder") return "folder";
  if (type === "all" || type === "any") return "any";
  return fallback;
};

/**
 * The files, the folders, or both, inside a folder. Nested ones are
 * included by default, names starting with a dot too, and `node_modules`
 * is skipped. Links are listed as files, never followed.
 *
 * @example
 * nc.fs.list("./src");                                             // every file
 * nc.fs.list("./src", { recursive: false });                       // direct children only
 * nc.fs.list("./packages", { type: "folders", recursive: false });
 * nc.fs.list("./src", { filter: (file) => file.endsWith(".js") });
 *
 * @param {string} [folder] Defaults to the working directory.
 * @param {ListOptions} [options]
 * @returns {string[] | undefined} Absolute paths, or `undefined` if the folder doesn't exist.
 */
function list(folder, options = {}) {
  const root = _existing(folder, "folder");
  if (!root) return undefined;
  const type = options.type === "folders" ? "folder" : options.type === "all" ? "all" : "file";
  const found = _walk(root, type, _listOptions({ ...options, hidden: options.hidden ?? options.dot }, true));
  const filter = options.filter;
  return typeof filter === "function" ? found.filter((path) => filter(path)) : found;
}

/**
 * Finds paths matching a glob pattern: `*` (anything but `/`), `**` (any
 * depth), `?`, `[abc]` and `{js,ts}`.
 *
 * A pattern starting from the root of the disk searches there, and its
 * results are absolute.
 *
 * @example
 * nc.fs.glob("src/**\/*.js");                           // ["src/index.js", "src/lib/a.js"]
 * nc.fs.glob("**\/*.{png,jpg}", { cwd: "./assets", absolute: true });
 * nc.fs.glob("packages/*", { type: "folders" });
 * nc.fs.glob(`${folder}/**\/*.json`);                   // absolute pattern, absolute results
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
  // Without "**", a pattern can't match deeper than it has parts: no need to read further down.
  let maxDepth = 0;
  const bases = patterns.map((p) => {
    const segments = p.split("/");
    maxDepth = p.includes("**") ? Infinity : Math.max(maxDepth, segments.length);
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

  /**
   * @param {string} relDir
   * @param {number} depth How many parts `relDir` has.
   */
  const visit = (relDir, depth) => {
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
      if (isDir && depth + 1 < maxDepth) visit(rel, depth + 1);
    }
  };
  for (const base of new Set(bases)) visit(base, base ? base.split("/").length : 0);
  return [...results].sort().map((rel) => (absolute ? nodePath.join(cwd, rel) : rel));
};

/**
 * Searches a folder tree for the first file or folder with this name,
 * closest first.
 *
 * @example
 * nc.fs.find("config.json");
 * nc.fs.find("fixtures", { type: "folders", cwd: "./test" });
 *
 * @param {string} name
 * @param {FindOptions} [options]
 * @returns {string | undefined} The absolute path.
 */
function find(name, options = {}) {
  const type = _findType(options.type, "file");
  const ignore = new Set(options.ignore ?? ["node_modules", ".git"]);
  const queue = [_abs(options.cwd)];
  for (let next = 0; next < queue.length; next++) {
    const dir = queue[next];
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
    for (const entry of entries) if (entry.isDirectory() && !ignore.has(entry.name)) queue.push(nodePath.join(dir, entry.name));
  }
  return undefined;
}

/**
 * Does this relative path leave its base folder?
 * @param {string} rel From `path.relative()`, which ignores letter case on Windows.
 * @returns {boolean}
 */
const _outside = (rel) => rel === ".." || rel.startsWith(`..${nodePath.sep}`) || nodePath.isAbsolute(rel);

/**
 * Looks for a file or folder in a folder, then in its parent, and so on up
 * to the root. It's how you find the `package.json` or the `.git` a file
 * belongs to.
 *
 * @example
 * nc.fs.findUp("package.json");                         // the closest one above the working directory
 * nc.fs.findUp(".git", { type: "folders", cwd: __dirname });
 * nc.fs.findUp(["pnpm-lock.yaml", "yarn.lock", "package-lock.json"]);
 *
 * @param {string | string[]} name One name, or several to try in each folder, in this order.
 * @param {{ cwd?: string, type?: "files" | "folders" | "all" | "file" | "folder" | "any", stopAt?: string }} [options] Where to start (the working directory by default), what to look for (`"files"`, `"folders"` or `"all"`, which is the default; the singular forms mean the same), and a folder not to go above: the search ends there, or as soon as it's outside of it.
 * @returns {string | undefined} The absolute path.
 */
function findUp(name, options = {}) {
  const names = Array.isArray(name) ? name : [name];
  const type = _findType(options.type, "any");
  // resolve() drops a trailing separator; relative() ignores letter case on Windows
  const stopAt = options.stopAt === undefined ? undefined : nodePath.resolve(_abs(options.stopAt));
  // a link, a junction or /var vs /private/var can lead to stopAt another way
  const realStop = stopAt === undefined ? undefined : _realPath(stopAt);
  let dir = _abs(options.cwd);
  for (;;) {
    for (const candidate of names) {
      const found = _existing(nodePath.join(dir, candidate), type);
      if (found) return found;
    }
    const parent = nodePath.dirname(dir);
    if (parent === dir) return undefined;
    if (stopAt !== undefined && realStop !== undefined) {
      const rel = nodePath.relative(stopAt, dir);
      const realRel = nodePath.relative(realStop, _realPath(dir));
      // at stopAt by either path, or outside of it by both
      if (rel === "" || realRel === "") return undefined;
      if (_outside(rel) && _outside(realRel)) return undefined;
    }
    dir = parent;
  }
}

// Creating

/**
 * Makes sure a file exists (an empty one if needed) and returns its
 * absolute path. An existing file is left as it is.
 *
 * @example
 * const log = nc.fs.ensureFile("./logs/app.log");
 *
 * @param {string} path
 * @returns {string}
 * @throws {Error} If it can't be created.
 */
function ensureFile(path) {
  const target = _abs(path);
  fs.mkdirSync(nodePath.dirname(target), { recursive: true });
  // Appending nothing creates the file, and leaves one that exists as it is: no
  // check first, so nothing can change between the check and the write.
  fs.writeFileSync(target, "", { flag: "a" });
  return target;
}

/**
 * Makes sure a folder exists, its parents too, and returns its absolute
 * path.
 *
 * @example
 * const dir = nc.fs.ensureFolder("./storage/uploads");
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
 * Updates a file's modification time, creating the file if needed, like
 * the Unix `touch` command.
 *
 * @example
 * nc.fs.touch("./.last-run");
 *
 * @param {string} path
 * @returns {boolean} `false` if it failed.
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

// Copying, moving, removing

/**
 * Is a path missing, empty or only spaces? Resolved, it would be the working
 * directory: functions that delete, copy or move refuse it.
 * @param {unknown} path
 * @returns {boolean}
 */
const _blank = (path) => path === undefined || path === null || String(path).trim() === "";

/**
 * Where `copy()` and `move()` put things. A folder goes to `dest` itself,
 * as in 2.2. A file goes into `dest` under its own name when `dest` ends
 * with a separator (`/`, or `\` on Windows) or is an existing folder, like
 * `copyFile()` did; else to `dest` itself.
 * @param {string} src Absolute, exists.
 * @param {string} dest As given.
 * @returns {string}
 */
const _target = (src, dest) => {
  const abs = _abs(dest);
  if (fs.statSync(src).isDirectory()) return abs;
  let into = process.platform === "win32" ? /[\\/]$/.test(String(dest)) : String(dest).endsWith("/");
  if (!into) {
    try {
      into = fs.statSync(abs).isDirectory();
    } catch {
      // nothing there yet
    }
  }
  return into ? nodePath.join(abs, nodePath.basename(src)) : abs;
};

/**
 * Copies a file or a whole folder, like `cp -r`.
 *
 * A file copied to a folder (an existing one, or a path ending with `/`,
 * or `\` on Windows) goes inside it, under the same name. A folder is
 * copied to `dest` itself, merged with what's already there: to put it
 * inside another folder, write the full path, like
 * `copy("templates", "dist/templates")`.
 *
 * Links inside the folder are copied as links (junctions on Windows), never
 * followed: files outside the folder are never brought along.
 *
 * @example
 * nc.fs.copy("./templates", "./dist/templates");
 * nc.fs.copy("./logo.png", "./dist/");                  // ./dist/logo.png
 * nc.fs.copy("./.env.example", "./.env", { overwrite: false });
 * nc.fs.copy("./src", "./dist", { filter: (source) => !source.endsWith(".test.js") });
 *
 * @param {string} source A file or a folder.
 * @param {string} dest
 * @param {CopyOptions} [options]
 * @returns {boolean} `false` if the source is missing, if `source` or `dest` is empty, if the destination is the source or inside it, or if the copy failed.
 */
function copy(source, dest, options = {}) {
  if (_blank(source) || _blank(dest)) return false;
  const src = _existing(source, "any");
  if (!src) return false;
  try {
    const target = _target(src, dest);
    if (_within(target, src)) return false;
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    _copyTree(src, target, { force: options.overwrite ?? true, preserveTimestamps: options.preserveTimestamps, filter: options.filter });
    return true;
  } catch {
    return false;
  }
}

// what a rename says when something is in the way of the destination
const _IN_THE_WAY = new Set(["EEXIST", "ENOTEMPTY", "EISDIR", "ENOTDIR"]);

/**
 * Moves what passes `filter`: copies it, then deletes each source whose
 * copy is there. What's left out, or kept by `overwrite: false`, stays.
 * Folders emptied this way are removed.
 * @param {string} src Absolute.
 * @param {string} dest Absolute.
 * @param {boolean} overwrite
 * @param {(source: string, destination: string) => boolean} filter
 */
const _moveSome = (src, dest, overwrite, filter) => {
  /** @type {Array<[source: string, destination: string, folder: boolean]>} */
  const done = [];
  _copyTree(src, dest, {
    force: overwrite,
    preserveTimestamps: true,
    filter: (s, d) => {
      if (!filter(s, d)) return false;
      const folder = fs.lstatSync(s).isDirectory();
      // a file kept at the destination by overwrite: false must stay at the source too
      if (folder || overwrite || !_lexists(d)) done.push([s, d, folder]);
      return true;
    },
  });
  // children first, so their folders are empty when it's their turn
  for (const [s, d, folder] of done.reverse()) {
    if (!folder) {
      if (_lexists(d)) fs.rmSync(s, { force: true });
      continue;
    }
    try {
      fs.rmdirSync(s);
    } catch {
      // something stayed inside
    }
  }
};

/**
 * Moves or renames a file or folder, across drives too.
 *
 * A file moved to a folder (an existing one, or a path ending with `/`,
 * or `\` on Windows) goes inside it, under the same name. A folder is
 * moved to `dest` itself, and replaces what's there: to put it inside
 * another folder, write the full path, like `move("inbox", "archive/inbox")`.
 *
 * A destination in the way is put aside first, and put back if the move
 * fails.
 *
 * @example
 * nc.fs.move("./report.pdf", "./archive/2024/report.pdf");
 * nc.fs.move("./report.pdf", "./archive/");            // ./archive/report.pdf
 * nc.fs.move("./inbox", "./archive/inbox");
 * nc.fs.move("./inbox", "./done", { filter: (source) => !source.endsWith(".lock") });
 *
 * @param {string} source A file or a folder.
 * @param {string} dest
 * @param {MoveOptions} [options]
 * @returns {boolean} `false` if the source is missing, if `source` or `dest` is empty, if the destination is inside the source, if the source is a link to the destination, or if the move failed.
 */
function move(source, dest, options = {}) {
  if (_blank(source) || _blank(dest)) return false;
  const src = _existing(source, "any");
  if (!src) return false;
  try {
    const target = _target(src, dest);
    // the link would take the place of the file it leads to
    if (_linkOnto(src, target)) return false;
    if (_sameEntry(src, target)) {
      // the same file: only its name can change, like its letter case on Windows
      fs.renameSync(src, target);
      return true;
    }
    if (_within(target, src)) return false;
    if (typeof options.filter === "function") {
      fs.mkdirSync(nodePath.dirname(target), { recursive: true });
      _moveSome(src, target, options.overwrite ?? true, options.filter);
      return true;
    }
    if (options.overwrite === false && _lexists(target)) return false;
    fs.mkdirSync(nodePath.dirname(target), { recursive: true });
    let crossDevice = false;
    try {
      // A rename replaces a file in one step: the destination is never missing, not even for an instant.
      fs.renameSync(src, target);
      return true;
    } catch (error) {
      const code = /** @type {NodeJS.ErrnoException} */ (error).code ?? "";
      crossDevice = code === "EXDEV";
      // Windows says EPERM or EACCES for a folder in the way
      const inTheWay = _IN_THE_WAY.has(code) || (process.platform === "win32" && (code === "EPERM" || code === "EACCES"));
      if (!crossDevice && !(inTheWay && _lexists(target))) throw error;
    }
    // Put what's in the way aside, and back if the move fails.
    const backup = _lexists(target) ? `${target}.${require("node:crypto").randomBytes(6).toString("hex")}.bak` : undefined;
    if (backup) _rename(target, backup);
    try {
      // another drive: copy, and delete the source once the copy is complete
      if (crossDevice) _copyTree(src, target);
      else _rename(src, target);
    } catch (error) {
      // a half-made copy is ours to remove, nothing else is
      if (crossDevice) fs.rmSync(target, { recursive: true, force: true });
      if (backup) _rename(backup, target);
      throw error;
    }
    if (backup) {
      try {
        fs.rmSync(backup, { recursive: true, force: true });
      } catch {
        // the move is done: a leftover of the old destination is better than an error
      }
    }
    if (crossDevice) fs.rmSync(src, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes what passes `filter` inside a folder, at any depth. Links are
 * deleted or kept, never followed.
 * @param {string} dir
 * @param {(path: string) => boolean} filter
 */
const _removeIn = (dir, filter) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = nodePath.join(dir, entry.name);
    if (filter(full)) fs.rmSync(full, { recursive: true, force: true });
    else if (entry.isDirectory()) _removeIn(full, filter);
  }
};

/**
 * Deletes a file or a folder, whichever it is. With `contents`, a folder
 * is emptied and kept; with `filter`, only what passes it is deleted. A
 * link to a folder (a junction on Windows) is never emptied: what it points
 * to is left alone.
 *
 * @example
 * nc.fs.remove("./dist");
 * nc.fs.remove("./cache", { contents: true });         // ./cache stays, empty
 * nc.fs.remove("./logs", { filter: (file) => file.endsWith(".log") });
 *
 * @param {string} path An empty path is refused, never taken as the working directory: write `"."` for that.
 * @param {RemoveOptions} [options]
 * @returns {boolean} `true` if it was done, `false` if the path is empty or doesn't exist (or isn't a folder, with `contents` or `filter`), if it's a link to a folder with `contents` or `filter`, or if something couldn't be deleted.
 */
function remove(path, options = {}) {
  if (_blank(path)) return false;
  const filter = typeof options.filter === "function" ? options.filter : undefined;
  if (!options.contents && !filter) {
    const target = _existing(path, "any");
    if (!target) return false;
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
  const target = _existing(path, "folder");
  if (!target) return false;
  try {
    if (fs.lstatSync(target).isSymbolicLink()) return false;
    if (filter) _removeIn(target, filter);
    else for (const entry of fs.readdirSync(target)) fs.rmSync(nodePath.join(target, entry), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// Others

/**
 * The absolute version of a path, whether it exists or not, resolved the
 * way every function of `nc.fs` does it: `./` and `../` start from the
 * file that calls it, anything else relative starts from the working
 * directory, and an absolute path stays as it is. Unlike Node's
 * `path.resolve()`, `./` doesn't depend on where the script is run from.
 *
 * @example
 * nc.fs.resolve("./config/app.json"); // next to the calling file
 * nc.fs.resolve("logs/app.log");      // from the working directory
 * nc.fs.resolve();                    // the working directory
 *
 * @param {string} [path] Defaults to the working directory.
 * @returns {string}
 */
function resolve(path) {
  return _abs(path);
}

/**
 * Creates a new, unique folder in the system's temp directory.
 *
 * @example
 * const dir = nc.fs.temp("export-");
 * try { await exportTo(dir); } finally { nc.fs.remove(dir); }
 *
 * @param {string} [prefix="nc-"]
 * @returns {string} Its absolute path.
 */
function temp(prefix = "nc-") {
  return fs.mkdtempSync(nodePath.join(os.tmpdir(), prefix));
}

/**
 * Removes the dots and spaces at the end, in one pass: a regex like
 * `/[. ]+$/` would start again from every dot or space of a long name.
 * @param {string} text
 * @param {string} chars
 * @returns {string}
 */
const _trimEnd = (text, chars) => {
  let end = text.length;
  while (end > 0 && chars.includes(text[end - 1])) end--;
  return text.slice(0, end);
};

/**
 * Turns any text into a file name that works on Windows, macOS and Linux:
 * forbidden characters are replaced, invisible and text direction
 * characters are removed, reserved names like `CON`, `NUL .txt` or
 * `COM¹` are prefixed, and the length is capped.
 *
 * @example
 * nc.fs.sanitizeFilename('Report: Q1/Q2 "final"?.pdf'); // "Report_ Q1_Q2 _final__.pdf"
 * nc.fs.sanitizeFilename("CON.txt");                    // "_CON.txt"
 *
 * @param {string} name
 * @param {{ replacement?: string }} [options] `replacement` takes the place of each character that is removed. Defaults to `"_"`.
 * @returns {string}
 */
function sanitizeFilename(name, options = {}) {
  const replacement = options.replacement ?? "_";
  let clean = _trimEnd(
    String(name)
      // invisible characters, and the ones that reverse the text so that "exe.txt" reads "txt.exe"
      .replace(/[​-‏‪-‮⁠⁦-⁩﻿]/g, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, replacement),
    ". ",
  );
  // Windows ignores the extension and the spaces before it: "NUL .txt" is still the NUL device
  if (/^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])$/i.test(_trimEnd(clean.split(".")[0], " "))) clean = `_${clean}`;
  if (clean === "." || clean === "..") clean = replacement;
  if (Buffer.byteLength(clean) > 255) {
    // File systems count bytes, and a character cut in two would be broken.
    let bytes = 0;
    let kept = "";
    for (const char of clean) {
      bytes += Buffer.byteLength(char);
      if (bytes > 255) break;
      kept += char;
    }
    clean = _trimEnd(kept, ". ");
  }
  return clean || "_";
}

/**
 * Watches a file or folder for changes.
 *
 * @example
 * const watcher = nc.fs.watch("./src", { recursive: true, debounce: 100 })
 *   .on("change", (file) => nc.logger.info(`Changed: ${file}`))
 *   .on("rename", (file) => nc.logger.info(`Added or removed: ${file}`));
 * watcher.stop();
 *
 * @overload
 * @param {string} path What to watch.
 * @param {Omit<WatchOptions, "path">} [options]
 * @returns {Watcher | undefined} `undefined` if the path doesn't exist.
 */
/**
 * Watches a file or folder for changes, the path given in the options.
 *
 * @example
 * const watcher = nc.fs.watch({ path: "./src", recursive: true });
 *
 * @overload
 * @param {WatchOptions} [options]
 * @returns {Watcher | undefined} `undefined` if the path doesn't exist.
 */
/**
 * @param {string | WatchOptions} [pathOrOptions]
 * @param {Omit<WatchOptions, "path">} [moreOptions]
 * @returns {Watcher | undefined}
 */
function watch(pathOrOptions, moreOptions) {
  /** @type {WatchOptions} */
  const options = typeof pathOrOptions === "string" ? { ...moreOptions, path: pathOrOptions } : (pathOrOptions ?? {});
  const target = _existing(options.path, "any");
  if (!target) return undefined;
  let paused = false;
  const debounce = options.debounce === undefined ? 0 : toMs(options.debounce, "debounce");
  /** @type {Record<string, Function[]>} */
  const listeners = { change: [], rename: [], all: [], error: [] };
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
  const real = _realPath(target);
  let gone = false;
  const watcher = fs.watch(real, { recursive: options.recursive ?? false }, (event, fileName) => {
    if (gone) return;
    const file = fileName && isDir ? nodePath.join(target, String(fileName)) : target;
    const kind = event === "rename" ? "rename" : "change";
    // A folder that was deleted keeps sending events on some systems, without
    // end and without an error: say it once, then stop listening.
    if (kind === "rename" && isDir && !fs.existsSync(real)) {
      gone = true;
      controller.stop();
      const error = Object.assign(new Error(`The watched folder no longer exists: ${target}`), { code: "ENOENT", path: target });
      for (const cb of listeners.error) cb(error);
      return;
    }
    if (!(debounce > 0)) return dispatch(kind, file);
    const key = `${kind}:${file}`;
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => {
      pending.delete(key);
      dispatch(kind, file);
    }, debounce));
  });
  watcher.on("error", (error) => {
    if (gone) return;
    // Some systems report the deleted folder here: it is the same news, told once.
    if (isDir && !fs.existsSync(real)) {
      gone = true;
      controller.stop();
    }
    for (const cb of listeners.error) cb(error);
  });

  /** @type {Watcher} */
  const controller = {
    on(event, callback) {
      (listeners[event] ??= []).push(callback);
      return controller;
    },
    off(event, callback) {
      const list = listeners[event];
      const at = list ? list.indexOf(callback) : -1;
      if (at !== -1) list.splice(at, 1);
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
      return controller;
    },
    pause() {
      paused = true;
      return controller;
    },
    resume() {
      paused = false;
      return controller;
    },
    [Symbol.dispose]() {
      controller.stop();
    },
  };
  return controller;
}

// Deprecated in 3.0, removed in 4.0. Each one keeps its 2.2 behaviour.

/**
 * Reads an environment variable. For typed and checked values, see `nc.env`.
 *
 * @deprecated Use nc.env.get() instead.
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
 * @deprecated Use nc.fs.resolve() instead.
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
 * @deprecated Use `nc.fs.isFolder(path) ? nc.fs.resolve(path) : undefined` instead.
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
 * @deprecated Use `nc.fs.isFile(path) ? nc.fs.resolve(path) : undefined` instead.
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
 * @deprecated Use nc.fs.list() instead, with `{ type: "folders" }`.
 *
 * @example
 * nc.getFoldersIn("./src");        // everything
 * nc.getFoldersIn("./src", false); // direct children only
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {boolean | Omit<ListOptions, "type" | "dot" | "filter">} [recursive=true]
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
 * @deprecated Use nc.fs.list() instead.
 *
 * @example
 * nc.getFilesIn("./src").filter((file) => file.endsWith(".js"));
 *
 * @param {string} [path] Defaults to the working directory.
 * @param {boolean | Omit<ListOptions, "type" | "dot" | "filter">} [recursive=true]
 * @returns {string[] | undefined} Absolute paths, or `undefined` if the folder doesn't exist.
 */
function getFilesIn(path, recursive = true) {
  const root = _existing(path, "folder");
  return root ? _walk(root, "file", _listOptions(recursive, true)) : undefined;
}

/**
 * Reads a file as text, or as a Buffer with `"buffer"`.
 *
 * @deprecated Use nc.fs.read() instead.
 *
 * @overload
 * @param {string} path
 * @param {"buffer"} encoding
 * @returns {Buffer | undefined} `undefined` if it can't be read.
 */
/**
 * Reads a file as text.
 *
 * @deprecated Use nc.fs.read() instead.
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
  return read(path, /** @type {BufferEncoding} */ (encoding));
}

/**
 * Writes a file atomically, creating its folders. Objects are written as
 * JSON.
 *
 * @deprecated Use nc.fs.write() instead.
 *
 * @param {string} path
 * @param {string | Buffer | Uint8Array | object} data
 * @param {WriteFileOptions} [options]
 * @returns {boolean} `false` if it failed.
 */
function writeFile(path, data, options = {}) {
  return write(path, data, options);
}

/**
 * Appends to a file, creating it and its folders if needed.
 *
 * @deprecated Use nc.fs.append() instead.
 *
 * @param {string} path
 * @param {string | Buffer} data
 * @returns {boolean}
 */
function appendFile(path, data) {
  return append(path, data);
}

/**
 * Creates a file and its folders.
 *
 * @deprecated Use nc.fs.ensureFile() instead, or nc.fs.write() to give it content. `ensureFile()` throws when it can't create the file, where this one returned `false`, and leaves an existing file as it is.
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
 * @deprecated Use nc.fs.ensureFolder() instead. It throws when it can't create the folder, where this one returned `false`, and returns the absolute path.
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
 * Deletes a folder and everything in it.
 *
 * @deprecated Use nc.fs.remove() instead.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist.
 */
function deleteFolder(path) {
  const target = _blank(path) ? undefined : _existing(path, "folder");
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
 * @deprecated Use nc.fs.remove() instead.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist.
 */
function deleteFile(path) {
  const target = _blank(path) ? undefined : _existing(path, "file");
  if (!target) return undefined;
  try {
    fs.unlinkSync(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes the folders inside a folder that pass a test.
 *
 * @deprecated Use nc.fs.remove() instead, with a `filter`.
 *
 * @example
 * nc.deleteFoldersIn("./packages", (folder) => folder.endsWith("dist"));
 *
 * @param {string} path Since 3.0, an empty one is refused (nothing is done) instead of meaning the working directory.
 * @param {(folder: string) => boolean} [filter] Gets absolute paths. Defaults to every folder.
 * @returns {number | undefined} How many were deleted.
 */
function deleteFoldersIn(path, filter = () => true) {
  if (_blank(path)) return undefined;
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
 * @deprecated Use nc.fs.remove() instead, with a `filter`.
 *
 * @example
 * nc.deleteFilesIn("./logs", false, (file) => file.endsWith(".log"));
 *
 * @param {string} path Since 3.0, an empty one is refused (nothing is done) instead of meaning the working directory.
 * @param {boolean} [recursive=false]
 * @param {(file: string) => boolean} [filter] Gets absolute paths. Defaults to every file.
 * @returns {number | undefined} How many were deleted.
 */
function deleteFilesIn(path, recursive = false, filter = () => true) {
  if (_blank(path)) return undefined;
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
 * Deletes everything inside a folder, keeping the folder. A link to a folder
 * (a junction on Windows) is refused: what it points to is left alone.
 *
 * @deprecated Use nc.fs.remove() instead, with `{ contents: true }`.
 *
 * @param {string} path
 * @returns {boolean | undefined} `undefined` if it doesn't exist, `false` if it's a link or something couldn't be deleted.
 */
function emptyFolder(path) {
  if (_blank(path)) return undefined;
  const target = _existing(path, "folder");
  if (!target) return undefined;
  try {
    if (fs.lstatSync(target).isSymbolicLink()) return false;
    for (const entry of fs.readdirSync(target)) fs.rmSync(nodePath.join(target, entry), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies the folders inside a folder into another one.
 *
 * @deprecated Use nc.fs.copy() instead.
 *
 * @param {CopyFoldersOptions} options
 * @returns {number | undefined} How many were copied: `0` when `dest` is the source folder or inside it.
 */
function copyFoldersIn(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  if (_within(dest, root)) return 0;
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
 * folder is created.
 *
 * @deprecated Use nc.fs.copy() instead.
 *
 * @param {CopyFolderOptions} options
 * @returns {boolean | undefined} `false` when `dest` is the source folder or inside it.
 */
function copyFolder(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  if (_within(dest, root)) return false;
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
 * @deprecated Use nc.fs.copy() instead.
 *
 * @example
 * nc.copyFilesIn({ path: "./src", dest: "./dist", filter: (file) => file.endsWith(".css") });
 *
 * @param {CopyFilesOptions} options
 * @returns {number | undefined} How many were copied: `0` when `dest` is the source folder, or inside it with `recursive`.
 */
function copyFilesIn(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  const recursive = options.recursive ?? true;
  if (_filesInItself(root, dest, recursive)) return 0;
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
 * Where a file goes: into `dest` under its own name if `dest` ends with `/`
 * or is a folder, else `dest` itself.
 * @param {string} src
 * @param {string} dest
 * @returns {string}
 */
const _fileDest = (src, dest) => {
  const abs = _abs(dest);
  let intoFolder = /[\\/]$/.test(dest);
  if (!intoFolder) {
    try {
      intoFolder = fs.statSync(abs).isDirectory();
    } catch {
      // nothing there yet
    }
  }
  return intoFolder ? nodePath.join(abs, nodePath.basename(src)) : abs;
};

/**
 * Copies one file. If `dest` ends with `/` or is a folder, the file keeps
 * its name inside that folder.
 *
 * @deprecated Use nc.fs.copy() instead.
 *
 * @example
 * nc.copyFile({ path: "./src/index.js", dest: "./dist/" });
 *
 * @param {CopyFileOptions} options
 * @returns {boolean | undefined} `false` when `dest` is the file itself.
 */
function copyFile(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const src = _existing(options.path, "file");
  if (!src || !options.dest) return undefined;
  const dest = _fileDest(src, options.dest);
  // with force, the copy would delete its own source
  if (_sameEntry(src, dest)) return false;
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
 * @deprecated Use nc.fs.move() instead.
 *
 * @param {CopyFoldersOptions} options
 * @returns {number | undefined} How many were moved: `0` when `dest` is the source folder or inside it.
 */
function moveFoldersIn(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  // the folders are deleted after the copy: they must not hold it
  if (root && options.dest && _within(_abs(options.dest), root)) return 0;
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
 * @deprecated Use nc.fs.move() instead.
 *
 * @param {CopyFolderOptions & { path: string }} options
 * @returns {boolean | undefined} `false` when `dest` is the source folder or inside it.
 */
function moveFolder(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  const copied = copyFolder(options);
  if (copied && root) fs.rmSync(root, { recursive: true, force: true });
  return copied;
}

/**
 * Moves the files inside a folder. A file that can't be copied stays where
 * it is, and isn't counted.
 *
 * @deprecated Use nc.fs.move() instead.
 *
 * @param {CopyFilesOptions} options
 * @returns {number | undefined} How many were moved: `0` when `dest` is the source folder, or inside it with `recursive`.
 */
function moveFilesIn(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const root = _existing(options.path, "folder");
  if (!root || !options.dest) return undefined;
  const dest = _abs(options.dest);
  const recursive = options.recursive ?? true;
  // the files are deleted after the copy: they must not be the copy
  if (_filesInItself(root, dest, recursive)) return 0;
  const filter = typeof options.filter === "function" ? options.filter : () => true;
  let moved = 0;
  for (const file of getFilesIn(root, recursive) ?? []) {
    if (!filter(file)) continue;
    const target = nodePath.join(dest, recursive ? nodePath.relative(root, file) : nodePath.basename(file));
    try {
      if (options.force && fs.existsSync(target)) fs.rmSync(target, { force: true });
      fs.mkdirSync(nodePath.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    } catch {
      // not copied: the source stays where it is
      continue;
    }
    try {
      fs.rmSync(file, { force: true });
      moved++;
    } catch {
      // copied but still there: not moved
    }
  }
  return moved;
}

/**
 * Moves one file. If `dest` ends with `/` or is a folder, the file keeps
 * its name inside that folder.
 *
 * @deprecated Use nc.fs.move() instead.
 *
 * @example
 * nc.moveFile({ path: "./logs/app.log", dest: "./logs/archive/" });
 *
 * @param {CopyFileOptions} options
 * @returns {boolean | undefined} `false` when `dest` is the file itself under the same name, or when the file is a link to `dest`.
 */
function moveFile(options) {
  if (_blank(options.path) || _blank(options.dest)) return undefined;
  const src = _existing(options.path, "file");
  if (!src || !options.dest) return undefined;
  const dest = _fileDest(src, options.dest);
  // the link would take the place of the file it leads to
  if (_linkOnto(src, dest)) return false;
  if (_sameEntry(src, dest)) {
    // the same file: only its name can change, like its letter case on Windows
    if (nodePath.basename(src) === nodePath.basename(dest)) return false;
    try {
      fs.renameSync(src, dest);
      return true;
    } catch {
      return false;
    }
  }
  const moved = copyFile(options);
  if (moved) fs.rmSync(src, { force: true });
  return moved;
}

/**
 * A file's size in bytes.
 *
 * @deprecated Use nc.fs.size() instead.
 *
 * @param {string} path
 * @returns {number | undefined} `undefined` if it doesn't exist or isn't a file.
 */
function fileSize(path) {
  if (!path) return undefined;
  try {
    const stats = fs.statSync(_abs(path));
    return stats.isFile() ? stats.size : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The total size of every file in a folder.
 *
 * @deprecated Use nc.fs.size() instead.
 *
 * @param {string} path
 * @returns {number | undefined} `undefined` if it doesn't exist or isn't a folder.
 */
function folderSize(path) {
  const root = _existing(path, "folder");
  return root ? _folderSize(root) : undefined;
}

/**
 * Hashes a file in chunks, so huge files are fine.
 *
 * @deprecated Use nc.fs.hash() instead.
 *
 * @param {string} path
 * @param {{ algorithm?: string, encoding?: "hex" | "base64" | "base64url" }} [options] The algorithm and how the hash is written. Defaults to sha256 in hex.
 * @returns {string | undefined} `undefined` if it can't be read.
 */
function hashFile(path, options = {}) {
  return hash(path, options);
}

/**
 * Creates a new, unique folder in the system's temp directory.
 *
 * @deprecated Use nc.fs.temp() instead.
 *
 * @param {string} [prefix="nc-"]
 * @returns {string}
 */
function tempFolder(prefix = "nc-") {
  return temp(prefix);
}

module.exports = {
  // reading
  read,
  readJSON,
  readLines,
  // writing
  write,
  writeJSON,
  append,
  // checking
  exists,
  isFile,
  isFolder,
  stat,
  size,
  hash,
  // listing and searching
  list,
  glob,
  find,
  findUp,
  // creating
  ensureFile,
  ensureFolder,
  touch,
  // copying, moving, removing
  copy,
  move,
  remove,
  // others
  resolve,
  temp,
  sanitizeFilename,
  watch,
  // deprecated: hidden from listings, they warn once when read (see below)
  getEnv,
  createPath,
  getFolder,
  getFile,
  getFoldersIn,
  getFilesIn,
  readFile,
  writeFile,
  appendFile,
  createFile,
  createFolder,
  deleteFolder,
  deleteFile,
  deleteFoldersIn,
  deleteFilesIn,
  emptyFolder,
  copyFoldersIn,
  copyFolder,
  copyFilesIn,
  copyFile,
  moveFoldersIn,
  moveFolder,
  moveFilesIn,
  moveFile,
  fileSize,
  folderSize,
  hashFile,
  tempFolder,
};

/** Each deprecated name, and what to use instead. */
const DEPRECATED = {
  getEnv: "nc.env.get()",
  createPath: "nc.fs.resolve()",
  getFolder: "nc.fs.isFolder(p) ? nc.fs.resolve(p) : undefined",
  getFile: "nc.fs.isFile(p) ? nc.fs.resolve(p) : undefined",
  getFoldersIn: "nc.fs.list()",
  getFilesIn: "nc.fs.list()",
  readFile: "nc.fs.read()",
  writeFile: "nc.fs.write()",
  appendFile: "nc.fs.append()",
  createFile: "nc.fs.ensureFile() or nc.fs.write()",
  createFolder: "nc.fs.ensureFolder()",
  deleteFolder: "nc.fs.remove()",
  deleteFile: "nc.fs.remove()",
  deleteFoldersIn: "nc.fs.remove()",
  deleteFilesIn: "nc.fs.remove()",
  emptyFolder: "nc.fs.remove()",
  copyFoldersIn: "nc.fs.copy()",
  copyFolder: "nc.fs.copy()",
  copyFilesIn: "nc.fs.copy()",
  copyFile: "nc.fs.copy()",
  moveFoldersIn: "nc.fs.move()",
  moveFolder: "nc.fs.move()",
  moveFilesIn: "nc.fs.move()",
  moveFile: "nc.fs.move()",
  fileSize: "nc.fs.size()",
  folderSize: "nc.fs.size()",
  hashFile: "nc.fs.hash()",
  tempFolder: "nc.fs.temp()",
};

deprecate(module.exports, "nc.fs", Object.fromEntries(Object.entries(DEPRECATED).map(([name, use]) => [name, { use }])));
