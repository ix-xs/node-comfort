/**
 * Reads an environment variable from process.env.
 * @param {string} value - The environment variable name.
 * @param {string} [envFilePath] - Reserved for future use.
 * @returns {string|undefined} The environment value, or undefined if not set.
 */
export function getEnv(value: string, envFilePath?: string): string | undefined;
/**
 * Resolves a path even when it does not already exist.
 * @param {string} [path=process.cwd()] - The path to resolve.
 * @returns {string} The resolved path.
 */
export function createPath(path?: string): string;
/**
 * Returns folders found inside a path.
 * @param {string} [path=process.cwd()] - The base path to inspect.
 * @param {boolean} [recursive=true] - Whether to scan recursively.
 * @returns {string[]|undefined} Matching folders, or undefined if the path cannot be resolved.
 */
export function getFoldersIn(path?: string, recursive?: boolean): string[] | undefined;
/**
 * Returns the resolved folder path.
 * @param {string} [path=process.cwd()] - The folder path to resolve.
 * @returns {string|undefined} The resolved folder path, or undefined if not found.
 */
export function getFolder(path?: string): string | undefined;
/**
 * Returns files found inside a path.
 * @param {string} [path=process.cwd()] - The base path to inspect.
 * @param {boolean} [recursive=true] - Whether to scan recursively.
 * @returns {string[]|undefined} Matching files, or undefined if the path cannot be resolved.
 */
export function getFilesIn(path?: string, recursive?: boolean): string[] | undefined;
/**
 * Returns the resolved file path.
 * @param {string} path - The file path to resolve.
 * @returns {string|undefined} The resolved file path, or undefined if not found.
 */
export function getFile(path: string): string | undefined;
/**
 * Creates a folder.
 * @param {string} path - The folder path to create.
 * @param {boolean} [force=false] - Whether to recreate the folder if it already exists.
 * @returns {boolean|undefined} True on success, false on failure, undefined if no path was provided.
 */
export function createFolder(path: string, force?: boolean): boolean | undefined;
/**
 * Creates a file.
 * @param {string} path - The file path to create.
 * @param {boolean} [force=false] - Whether to recreate the file if it already exists.
 * @param {string|object|null|undefined} [data] - File content to write.
 * @returns {boolean|undefined} True on success, false on failure, undefined if no path was provided.
 */
export function createFile(path: string, force?: boolean, data?: string | object | null | undefined): boolean | undefined;
/**
 * Deletes folders found inside a path.
 * @param {string} [path=process.cwd()] - The base path to inspect.
 * @param {(folder: string) => boolean} [filter=() => true] - Filter applied to each folder path.
 * @returns {number|undefined} Number of deleted folders, or undefined if the path cannot be resolved.
 */
export function deleteFoldersIn(path?: string, filter?: (folder: string) => boolean): number | undefined;
/**
 * Deletes a folder.
 * @param {string} path - The folder path to delete.
 * @returns {boolean|undefined} True on success, false on failure, undefined if the path is invalid.
 */
export function deleteFolder(path: string): boolean | undefined;
/**
 * Deletes files found inside a path.
 * @param {string} [path=process.cwd()] - The base path to inspect.
 * @param {boolean} [recursive=false] - Whether to scan recursively.
 * @param {(file: string) => boolean} [filter=() => true] - Filter applied to each file path.
 * @returns {number|undefined} Number of deleted files, or undefined if the path cannot be resolved.
 */
export function deleteFilesIn(path?: string, recursive?: boolean, filter?: (file: string) => boolean): number | undefined;
/**
 * Deletes a file.
 * @param {string} path - The file path to delete.
 * @returns {boolean|undefined} True on success, false on failure, undefined if the path is invalid.
 */
export function deleteFile(path: string): boolean | undefined;
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
export function copyFoldersIn(options: {
    dest: string;
    path?: string | undefined;
    recursive?: boolean | undefined;
    withFiles?: boolean | undefined;
    force?: boolean | undefined;
    filter?: ((folder: string) => boolean) | undefined;
}): number | undefined;
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
export function copyFolder(options: {
    dest: string;
    path?: string | undefined;
    recursive?: boolean | undefined;
    withFiles?: boolean | undefined;
    force?: boolean | undefined;
}): boolean | undefined;
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
export function copyFilesIn(options: {
    dest: string;
    path?: string | undefined;
    recursive?: boolean | undefined;
    force?: boolean | undefined;
    filter?: ((file: string) => boolean) | undefined;
}): number | undefined;
/**
 * Copies a file to a destination path.
 * @param {Object} options - Copy options.
 * @param {string} options.path - Source file path.
 * @param {string} options.dest - Destination path.
 * @param {boolean} [options.force=false] - Whether to overwrite the destination file.
 * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
 */
export function copyFile(options: {
    path: string;
    dest: string;
    force?: boolean | undefined;
}): boolean | undefined;
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
export function moveFoldersIn(options: {
    dest: string;
    path?: string | undefined;
    recursive?: boolean | undefined;
    withFiles?: boolean | undefined;
    force?: boolean | undefined;
    filter?: ((folder: string) => boolean) | undefined;
}): number | undefined;
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
export function moveFolder(options: {
    path: string;
    dest: string;
    recursive?: boolean | undefined;
    withFiles?: boolean | undefined;
    force?: boolean | undefined;
}): boolean | undefined;
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
export function moveFilesIn(options: {
    dest: string;
    path?: string | undefined;
    recursive?: boolean | undefined;
    force?: boolean | undefined;
    filter?: ((file: string) => boolean) | undefined;
}): number | undefined;
/**
 * Moves a file to a destination path.
 * @param {Object} options - Move options.
 * @param {string} options.path - Source file path.
 * @param {string} options.dest - Destination path.
 * @param {boolean} [options.force=false] - Whether to overwrite the destination file.
 * @returns {boolean|undefined} True on success, false on failure, undefined if invalid input.
 */
export function moveFile(options: {
    path: string;
    dest: string;
    force?: boolean | undefined;
}): boolean | undefined;
/**
 * Reads a file as UTF-8 text.
 * @param {string} path - The file path to read.
 * @returns {string|undefined} File content, or undefined if the file cannot be read.
 */
export function readFile(path: string): string | undefined;
/**
 * Reads and parses a JSON file.
 * @template T
 * @param {string} path - The JSON file path.
 * @param {T} [fallback] - Value returned when the file is missing or invalid.
 * @returns {T|any|undefined} The parsed value, or the fallback.
 */
export function readJSON<T>(path: string, fallback?: T): T | any | undefined;
/**
 * Serializes a value to JSON and writes it to a file (creating folders as needed).
 * @param {string} path - The destination file path.
 * @param {*} data - The value to serialize.
 * @param {{ spaces?: number, force?: boolean }} [options] - Formatting options (`spaces` default 2).
 * @returns {boolean} True on success, false on failure.
 */
export function writeJSON(path: string, data: any, options?: {
    spaces?: number;
    force?: boolean;
}): boolean;
/**
 * Appends text to a file, creating it (and its folders) if necessary.
 * @param {string} path - The file path.
 * @param {string} data - The text to append.
 * @returns {boolean} True on success, false on failure.
 */
export function appendFile(path: string, data: string): boolean;
/**
 * Checks whether a path (file or folder) exists.
 * @param {string} path - The path to check.
 * @returns {boolean} True if the path exists.
 */
export function exists(path: string): boolean;
/**
 * Returns filesystem stats for a path, or undefined if it does not exist.
 * @param {string} path - The path to stat.
 * @returns {import("node:fs").Stats|undefined} The stats object, or undefined.
 */
export function stat(path: string): any | undefined;
/**
 * Returns the size of a file in bytes.
 * @param {string} path - The file path.
 * @returns {number|undefined} Size in bytes, or undefined if not found.
 */
export function fileSize(path: string): number | undefined;
/**
 * Computes a hash digest of a file's contents.
 * @param {string} path - The file path.
 * @param {{ algorithm?: string, encoding?: "hex"|"base64"|"base64url" }} [options] - Hash options.
 * @returns {string|undefined} The digest, or undefined if the file cannot be read.
 */
export function hashFile(path: string, options?: {
    algorithm?: string;
    encoding?: "hex" | "base64" | "base64url";
}): string | undefined;
/**
 * Empties a folder's contents while keeping the folder itself.
 * @param {string} path - The folder to empty.
 * @returns {boolean|undefined} True on success, false on failure, undefined if not found.
 */
export function emptyFolder(path: string): boolean | undefined;
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
export function watch(options?: {
    path?: string | undefined;
    recursive?: boolean | undefined;
    filter?: ((event: "rename" | "change", file: string) => boolean) | undefined;
}): {
    on: <E extends "change" | "rename" | "all">(event: E, callback: E extends "all" ? (event: "change" | "rename", file: string) => void | Promise<void> : (file: string) => void | Promise<void>) => any;
    stop: () => void;
    pause: () => any;
    resume: () => any;
} | undefined;
//# sourceMappingURL=FS.d.ts.map