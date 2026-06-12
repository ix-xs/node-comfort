const { readdirSync, existsSync, mkdirSync, rmSync, writeFileSync, unlinkSync, copyFileSync, readFileSync, watch } = require("node:fs");
const { resolve, dirname, sep, isAbsolute, join, relative, basename } = require("node:path");

/**
   * Normalizes a path to the current platform separator.
   * @private
   * @param {string} path - The path to normalize.
   * @returns {string} The normalized path.
   */
const _format = (path) => {
  return path.replace(/\//g, sep).replace(/\\/g, sep);
};

/**
   * Returns the calling file path, excluding internal and node_modules frames.
   * @private
   * @returns {string|undefined} The caller file path, or undefined if not found.
   */
const _caller = () => {
  const opst = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const e = new Error();
  const s = e.stack;
  Error.prepareStackTrace = opst;

  if (s) {
    for (const cs of s) {
      const name = cs.getFileName();
      if (
        name &&
          !name.startsWith("node:internal") &&
          !name.includes("node_modules") &&
          name !== s[0].getFileName()
      ) {
        return _format(name);
      }
    }
  }
  return undefined;
};

/**
   * Recursively walks folders or files from a path.
   * @private
   * @param {string} [path=process.cwd()] - The base path to scan.
   * @param {boolean} [recursive=true] - Whether to recurse into subfolders.
   * @param {"folder"|"file"} [type="folder"] - The entry type to collect.
   * @returns {string[]} A list of matching absolute paths.
   */
const _walk = (path = process.cwd(), recursive = true, type = "folder") => {
  let result = [];
  try {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name.includes("node_modules")) continue;
      const _ = resolve(path, entry.name);

      if (type === "folder" && entry.isDirectory()) {
        result.push(_);
        if (recursive) result = result.concat(_walk(_, recursive, type));
      } else if (type === "file" && entry.isFile()) {
        result.push(_);
      } else if (type === "file" && entry.isDirectory() && recursive) {
        result = result.concat(_walk(_, recursive, type));
      }
    }
    return result;
  } catch {
    return result;
  }
};

/**
   * Finds the first folder matching a given name.
   * @private
   * @param {string} path - The folder to search from.
   * @param {string} name - The folder name to find.
   * @returns {string|undefined} The matching folder path, or undefined if not found.
   */
const _firstFolder = (path, name) => {
  try {
    const entries = readdirSync(path, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === name && entry.isDirectory()) {
        return resolve(path, name);
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.includes("node_modules")) {
        const result = _firstFolder(resolve(path, entry.name), name);
        if (result) return result;
      }
    }
  } catch {}
  return undefined;
};

/**
   * Finds the first file matching a given name.
   * @private
   * @param {string} path - The folder to search from.
   * @param {string} name - The file name to find.
   * @returns {string|undefined} The matching file path, or undefined if not found.
   */
const _firstFile = (path, name) => {
  try {
    const entries = readdirSync(path, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === name && entry.isFile()) {
        return resolve(path, name);
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.includes("node_modules")) {
        const result = _firstFile(resolve(path, entry.name), name);
        if (result) return result;
      }
    }
  } catch {}
  return undefined;
};

/**
   * Resolves a user path into an existing absolute path when possible.
   * @private
   * @param {string} [path=process.cwd()] - The path to resolve.
   * @param {"folder"|"file"} [type="folder"] - The expected target type.
   * @returns {string|undefined} The resolved absolute path, or undefined if it does not exist.
   */
const _target = (path = process.cwd(), type = "folder") => {
  if (path === process.cwd()) return path;

  let absolute;
  const caller = dirname(_caller() || process.cwd());

  if (
    _format(path).startsWith(_format("./")) ||
      _format(path).startsWith(_format("../"))
  ) {
    absolute = resolve(caller, path);
  } else if (isAbsolute(path)) {
    absolute = _format(path);
  } else {
    absolute = resolve(process.cwd(), _format(path));
    if (!existsSync(absolute)) {
      absolute =
          type === "folder"
            ? _firstFolder(process.cwd(), _format(path)) ?? undefined
            : _firstFile(process.cwd(), _format(path)) ?? undefined;
    }
  }

  if (absolute && existsSync(absolute)) return _format(absolute);
  return undefined;
};

try {
  process.loadEnvFile();
} catch {}

/**
 * File-system helper with safe path resolution and high-level operations.
 */
module.exports = {
  /**
   * Reads an environment variable from process.env.
   * @param {string} value - The environment variable name.
   * @param {string} [envFilePath] - Reserved for future use.
   * @returns {string|undefined} The environment value, or undefined if not set.
   */
  getEnv(value, envFilePath) {
    return process.env[value];
  },

  /**
   * Resolves a path even when it does not already exist.
   * @param {string} [path=process.cwd()] - The path to resolve.
   * @returns {string} The resolved path.
   */
  createPath(path = process.cwd()) {
    const target = _target(path);
    return target
      ? target
      : isAbsolute(path)
        ? path
        : path.startsWith("./") || path.startsWith("../")
          ? resolve(dirname(_caller()), path)
          : resolve(process.cwd(), path);
  },

  /**
   * Returns folders found inside a path.
   * @param {string} [path=process.cwd()] - The base path to inspect.
   * @param {boolean} [recursive=true] - Whether to scan recursively.
   * @returns {string[]|undefined} Matching folders, or undefined if the path cannot be resolved.
   */
  getFoldersIn(path = process.cwd(), recursive = true) {
    const target = _target(path ?? process.cwd());
    return target ? _walk(target, recursive) : undefined;
  },

  /**
   * Returns the resolved folder path.
   * @param {string} [path=process.cwd()] - The folder path to resolve.
   * @returns {string|undefined} The resolved folder path, or undefined if not found.
   */
  getFolder(path = process.cwd()) {
    return _target(path ?? process.cwd());
  },

  /**
   * Returns files found inside a path.
   * @param {string} [path=process.cwd()] - The base path to inspect.
   * @param {boolean} [recursive=true] - Whether to scan recursively.
   * @returns {string[]|undefined} Matching files, or undefined if the path cannot be resolved.
   */
  getFilesIn(path = process.cwd(), recursive = true) {
    const target = _target(path ?? process.cwd());
    return target ? _walk(target, recursive, "file") : undefined;
  },

  /**
   * Returns the resolved file path.
   * @param {string} path - The file path to resolve.
   * @returns {string|undefined} The resolved file path, or undefined if not found.
   */
  getFile(path) {
    return path ? _target(path, "file") : path;
  },

  /**
   * Creates a folder.
   * @param {string} path - The folder path to create.
   * @param {boolean} [force=false] - Whether to recreate the folder if it already exists.
   * @returns {boolean|undefined} True on success, false on failure, undefined if no path was provided.
   */
  createFolder(path, force = false) {
    if (!path) return undefined;
    const target = this.createPath(path);

    try {
      if (this.getFolder(target)) {
        if (force) {
          this.deleteFolder(target);
          mkdirSync(target, { recursive: true });
          return true;
        }
        return false;
      }
      mkdirSync(target, { recursive: true });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Creates a file.
   * @param {string} path - The file path to create.
   * @param {boolean} [force=false] - Whether to recreate the file if it already exists.
   * @param {string|object|null|undefined} [data] - File content to write.
   * @returns {boolean|undefined} True on success, false on failure, undefined if no path was provided.
   */
  createFile(path, force = false, data) {
    if (!path) return undefined;
    const target = this.createPath(path);
    const content =
      data === null || typeof data === "undefined"
        ? ""
        : typeof data === "string"
          ? data
          : JSON.stringify(data, null, 2);

    try {
      if (this.getFile(target)) {
        if (force) {
          this.deleteFile(target);
          writeFileSync(target, content, "utf8");
          return true;
        }
        return false;
      }

      if (!this.getFolder(dirname(target))) {
        this.createFolder(dirname(target));
      }

      writeFileSync(target, content, "utf8");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Deletes folders found inside a path.
   * @param {string} [path=process.cwd()] - The base path to inspect.
   * @param {(folder: string) => boolean} [filter=() => true] - Filter applied to each folder path.
   * @returns {number|undefined} Number of deleted folders, or undefined if the path cannot be resolved.
   */
  deleteFoldersIn(path = process.cwd(), filter = () => true) {
    const target = _target(path);
    if (!target) return undefined;

    const folders = this.getFoldersIn(target);
    let deleted = 0;

    for (const folder of folders.map(_format)) {
      if (!filter(folder)) continue;
      this.deleteFolder(folder);
      deleted++;
    }
    return deleted;
  },

  /**
   * Deletes a folder.
   * @param {string} path - The folder path to delete.
   * @returns {boolean|undefined} True on success, false on failure, undefined if the path is invalid.
   */
  deleteFolder(path) {
    const target = path ? _target(path) : path;
    if (!target || !this.getFolder(target)) return undefined;

    try {
      rmSync(target, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Deletes files found inside a path.
   * @param {string} [path=process.cwd()] - The base path to inspect.
   * @param {boolean} [recursive=false] - Whether to scan recursively.
   * @param {(file: string) => boolean} [filter=() => true] - Filter applied to each file path.
   * @returns {number|undefined} Number of deleted files, or undefined if the path cannot be resolved.
   */
  deleteFilesIn(path = process.cwd(), recursive = false, filter = () => true) {
    const target = _target(path);
    if (!target) return undefined;

    const files = this.getFilesIn(target, recursive);
    let deleted = 0;

    for (const file of files.map(_format)) {
      if (!filter(file)) continue;
      this.deleteFile(file);
      deleted++;
    }
    return deleted;
  },

  /**
   * Deletes a file.
   * @param {string} path - The file path to delete.
   * @returns {boolean|undefined} True on success, false on failure, undefined if the path is invalid.
   */
  deleteFile(path) {
    const target = path ? _target(path, "file") : path;
    if (!target || !this.getFile(target)) return undefined;

    try {
      unlinkSync(target);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Copies folders from a source path into a destination folder.
   * @param {Object} options - Copy options.
   * @param {string} options.dest - Destination path.
   * @param {string} [options.path] - Source path.
   * @param {boolean} [options.recursive=true] - Whether to recurse into subfolders.
   * @param {boolean} [options.withFiles=false] - Whether to copy files as well.
   * @param {boolean} [options.force=false] - Whether to overwrite existing folders.
   * @param {(folder: string) => boolean} [options.filter=() => true] - Filter applied to each folder.
   * @returns {number|undefined} Number of copied folders, or undefined if invalid input.
   */
  copyFoldersIn(options) {
    const target = _target(options.path ?? process.cwd());
    if (!target || !options.dest) return undefined;

    const folders = this.getFoldersIn(target, options.recursive ?? true) ?? [];
    options.filter =
      typeof options.filter === "function" ? options.filter : () => true;
    let copied = 0;

    for (const folder of folders.map(_format)) {
      if (!options.filter(folder)) continue;

      const destFolder = join(
        this.createPath(options.dest),
        relative(target, folder),
      );

      if (options.force && this.getFolder(destFolder)) {
        this.deleteFolder(destFolder);
      }

      this.createFolder(destFolder);
      copied++;

      if (options.withFiles) {
        if (options.recursive) {
          for (const file of this.getFilesIn(folder, true) ?? []) {
            const destFile = join(destFolder, relative(folder, file));
            this.createFolder(dirname(destFile));
            copyFileSync(file, destFile);
          }
        } else {
          for (const file of this.getFilesIn(folder, false) ?? []) {
            const destFile = join(destFolder, basename(file));
            copyFileSync(file, destFile);
          }
        }
      }
    }
    return copied;
  },

  /**
   * Copies a folder to a destination path.
   * @param {Object} options - Copy options.
   * @param {string} options.dest - Destination path.
   * @param {string} [options.path] - Source path.
   * @param {boolean} [options.recursive=false] - Whether to copy subfolders.
   * @param {boolean} [options.withFiles=false] - Whether to copy files.
   * @param {boolean} [options.force=false] - Whether to overwrite the destination.
   * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
   */
  copyFolder(options) {
    const target = _target(options.path ?? process.cwd());
    const dest = this.createPath(options.dest);

    if (!target || !dest) return undefined;

    if (options.force && this.getFolder(dest)) {
      this.deleteFolder(dest);
    }

    this.createFolder(dest);

    if (options.recursive) {
      for (const folder of this.getFoldersIn(target, true) ?? []) {
        const destFolder = join(dest, relative(target, folder));
        this.createFolder(destFolder);

        if (options.withFiles) {
          for (const file of this.getFilesIn(folder, false) ?? []) {
            const destFile = join(destFolder, basename(file));
            copyFileSync(file, destFile);
          }
        }
      }

      if (options.withFiles) {
        for (const file of this.getFilesIn(target, false) ?? []) {
          const destFile = join(dest, basename(file));
          copyFileSync(file, destFile);
        }
      }
    } else {
      if (options.withFiles) {
        for (const file of this.getFilesIn(target, false) ?? []) {
          const destFile = join(dest, basename(file));
          copyFileSync(file, destFile);
        }
      }
    }
    return true;
  },

  /**
   * Copies files from a source path into a destination folder.
   * @param {Object} options - Copy options.
   * @param {string} options.dest - Destination path.
   * @param {string} [options.path] - Source path.
   * @param {boolean} [options.recursive=true] - Whether to recurse into subfolders.
   * @param {boolean} [options.force=false] - Whether to overwrite existing files.
   * @param {(file: string) => boolean} [options.filter=() => true] - Filter applied to each file.
   * @returns {number|undefined} Number of copied files, or undefined if invalid input.
   */
  copyFilesIn(options) {
    const target = _target(options.path ?? process.cwd());
    const destBase = this.createPath(options.dest);

    if (!target || !options.dest) return undefined;

    const recursive = options.recursive ?? true;
    const files = this.getFilesIn(target, recursive) ?? [];
    const filter =
      typeof options.filter === "function" ? options.filter : () => true;
    let copied = 0;

    for (const file of files.map(_format)) {
      if (!filter(file)) continue;

      const destFile = join(
        destBase,
        recursive ? relative(target, file) : basename(file),
      );

      if (options.force && this.getFile(destFile)) {
        this.deleteFile(destFile);
      }

      this.createFolder(dirname(destFile));
      copyFileSync(file, destFile);
      copied++;
    }
    return copied;
  },

  /**
   * Copies a file to a destination path.
   * @param {Object} options - Copy options.
   * @param {string} options.path - Source file path.
   * @param {string} options.dest - Destination path.
   * @param {boolean} [options.force=false] - Whether to overwrite the destination file.
   * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
   */
  copyFile(options) {
    const target = _target(options.path, "file");
    if (!target || !options.dest) return undefined;

    let destFile;
    if (
      !basename(options.dest) ||
      options.dest.endsWith("/") ||
      options.dest.endsWith("\\")
    ) {
      destFile = join(this.createPath(options.dest), basename(target));
    } else {
      destFile = this.createPath(options.dest);
    }

    if (options.force && this.getFile(destFile)) {
      this.deleteFile(destFile);
    }

    this.createFolder(dirname(destFile));
    copyFileSync(target, destFile);
    return true;
  },

  /**
   * Moves folders from a source path into a destination folder.
   * @param {Object} options - Move options.
   * @param {string} options.dest - Destination path.
   * @param {string} [options.path] - Source path.
   * @param {boolean} [options.recursive=true] - Whether to recurse into subfolders.
   * @param {boolean} [options.withFiles=false] - Whether to move files as well.
   * @param {boolean} [options.force=false] - Whether to overwrite existing folders.
   * @param {(folder: string) => boolean} [options.filter=() => true] - Filter applied to each folder.
   * @returns {number|undefined} Number of copied folders, or undefined if invalid input.
   */
  moveFoldersIn(options) {
    const copied = this.copyFoldersIn(options);
    if (copied === undefined || !options.path) return copied;

    const target = _target(options.path);
    if (!target) return copied;

    const folders = this.getFoldersIn(target, options.recursive ?? true) ?? [];
    options.filter =
      typeof options.filter === "function" ? options.filter : () => true;

    for (const folder of folders.map(_format)) {
      if (!options.filter(folder)) continue;
      this.deleteFolder(folder);
    }
    return copied;
  },

  /**
   * Moves a folder to a destination path.
   * @param {Object} options - Move options.
   * @param {string} options.path - Source folder path.
   * @param {string} options.dest - Destination path.
   * @param {boolean} [options.recursive=false] - Whether to move subfolders.
   * @param {boolean} [options.withFiles=false] - Whether to move files.
   * @param {boolean} [options.force=false] - Whether to overwrite the destination.
   * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
   */
  moveFolder(options) {
    const copied = this.copyFolder(options);
    const target = _target(options.path);
    if (!target) return copied;

    this.deleteFolder(target);
    return copied;
  },

  /**
   * Moves files from a source path into a destination folder.
   * @param {Object} options - Move options.
   * @param {string} options.dest - Destination path.
   * @param {string} [options.path] - Source path.
   * @param {boolean} [options.recursive=true] - Whether to recurse into subfolders.
   * @param {boolean} [options.force=false] - Whether to overwrite existing files.
   * @param {(file: string) => boolean} [options.filter=() => true] - Filter applied to each file.
   * @returns {number|undefined} Number of copied files, or undefined if invalid input.
   */
  moveFilesIn(options) {
    const copied = this.copyFilesIn(options);
    if (copied === undefined || !options.path) return copied;

    const target = _target(options.path ?? process.cwd());
    if (!target) return copied;

    const files = this.getFilesIn(target, options.recursive ?? true) ?? [];
    const filter =
      typeof options.filter === "function" ? options.filter : () => true;

    for (const file of files.map(_format)) {
      if (!filter(file)) continue;
      this.deleteFile(file);
    }
    return copied;
  },

  /**
   * Moves a file to a destination path.
   * @param {Object} options - Move options.
   * @param {string} options.path - Source file path.
   * @param {string} options.dest - Destination path.
   * @param {boolean} [options.force=false] - Whether to overwrite the destination file.
   * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
   */
  moveFile(options) {
    const moved = this.copyFile(options);
    if (moved) {
      const target = _target(options.path, "file");
      if (target) this.deleteFile(target);
    }
    return moved;
  },

  /**
   * Reads a file as UTF-8 text.
   * @param {string} path - The file path to read.
   * @returns {string|undefined} File content, or undefined if the file cannot be read.
   */
  readFile(path) {
    const target = _target(path, "file");
    if (!target) return undefined;

    try {
      return readFileSync(target, "utf8");
    } catch {
      return undefined;
    }
  },

  /**
   * Watches a path and exposes event listeners.
   * @param {Object} [options] - Watch options.
   * @param {string} [options.path=process.cwd()] - Path to watch.
   * @param {boolean} [options.recursive=false] - Whether to watch recursively.
   * @param {(event: "rename"|"change", file: string) => boolean} [options.filter] - Filter applied before dispatch.
   * @returns {{
   *   on: <E extends "change"|"rename"|"all">(event: E, callback: E extends "all" ? (event: "change"|"rename", file: string) => void|Promise<void> : (file: string) => void|Promise<void>) => any,
   *   stop: () => void,
   *   pause: () => any,
   *   resume: () => any,
   * }|undefined} Watch controller, or undefined if the path cannot be resolved.
   */
  watch(options = {}) {
    const target = _target(options.path ?? process.cwd());
    if (!target) return undefined;

    let paused = false;
    const listeners = {};

    /**
     * Dispatches an event to registered listeners.
     * @private
     * @param {"rename"|"change"|"all"} event - The event type.
     * @param {string} file - The affected file path.
     */
    const handler = (event, file) => {
      if (paused) return;
      if (
        typeof options.filter === "function" &&
        !options.filter(event, file)
      ) {
        return;
      }

      if (listeners[event]) {
        for (const cb of listeners[event]) cb(file);
      }
      if (listeners["all"]) {
        for (const cb of listeners["all"]) cb(event, file);
      }
    };

    /**
     * Registers a listener for an event.
     * @private
     * @param {"change"|"rename"|"all"} type - The event type.
     * @param {(file: string) => void|Promise<void> | (event: "change"|"rename", file: string) => void|Promise<void>} callback - The callback to register.
     */
    const addListener = (type, callback) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(callback);
    };

    const watcher = watch(
      target,
      { recursive: options.recursive ?? false },
      (eventType, fileName) => {
        handler(eventType, fileName ? join(target, fileName) : target);
      },
    );

    /**
     * @typedef {"change"|"rename"|"all"} EventNames
     * @typedef {{
     *   change: (file: string) => void|Promise<void>,
     *   rename: (file: string) => void|Promise<void>,
     *   all: (event: EventNames, file: string) => void|Promise<void>,
     * }} EventHandlers
     */
    return {
      /**
       * Registers a callback for a watch event.
       * @template {EventNames} E
       * @param {E} event - The event name.
       * @param {EventHandlers[E]} callback - The callback to execute.
       * @returns {this} The same watch controller.
       */
      on(event, callback) {
        addListener(event, callback);
        return this;
      },
      /**
       * Stops the underlying file watcher.
       */
      stop() {
        if (watcher) {
          try {
            watcher.close();
          } catch {}
        }
      },
      /**
       * Pauses event dispatching without closing the watcher.
       * @returns {this} The same watch controller.
       */
      pause() {
        paused = true;
        return this;
      },
      /**
       * Resumes event dispatching after a pause.
       * @returns {this} The same watch controller.
       */
      resume() {
        paused = false;
        return this;
      },
    };
  },
};