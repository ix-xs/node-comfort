"use strict";

// Every namespace is loaded the first time you touch it, so requiring the
// package costs almost nothing.

const fs = require("node:fs");
const path = require("node:path");

// The .env file must be applied before any user code reads process.env.
if (String(process.env.NODE_COMFORT_DOTENV).toLowerCase() !== "false" && fs.existsSync(path.join(process.cwd(), ".env"))) {
  require("./src/Env.js");
}

/** @type {Record<string, () => any>} */
const modules = {
  logger: () => require("./src/Logger.js"),
  fs: () => require("./src/FS.js"),
  checker: () => require("./src/Checker.js"),
  utils: () => require("./src/Utils.js"),
  str: () => require("./src/Str.js"),
  num: () => require("./src/Num.js"),
  arr: () => require("./src/Arr.js"),
  obj: () => require("./src/Obj.js"),
  func: () => require("./src/Func.js"),
  time: () => require("./src/Time.js"),
  id: () => require("./src/Id.js"),
  crypto: () => require("./src/Crypto.js"),
  color: () => require("./src/Color.js"),
  cli: () => require("./src/Cli.js"),
  sys: () => require("./src/Sys.js"),
  async: () => require("./src/Async.js"),
  schema: () => require("./src/Schema.js"),
  http: () => require("./src/Http.js"),
  env: () => require("./src/Env.js"),
  errors: () => require("./src/errors.js"),
  SQLite: () => require("./src/SQLite.js"),
  Cache: () => require("./src/Cache.js"),
  Emitter: () => require("./src/Emitter.js"),
};

// Helpers that are also available at the top level (nc.info, nc.readJSON...).
const flat = {
  logger: ["log", "trace", "debug", "info", "success", "warn", "error", "fatal", "group", "groupEnd", "timeStart", "timeEnd", "table", "box", "divider", "setLevel", "getLevel", "isLevelEnabled", "configure", "setTimestamp", "setDelimiter", "createLogger"],
  fs: ["getEnv", "createPath", "getFolder", "getFile", "getFoldersIn", "getFilesIn", "glob", "find", "readFile", "readLines", "readJSON", "writeFile", "writeJSON", "appendFile", "createFile", "createFolder", "ensureFolder", "ensureFile", "touch", "deleteFolder", "deleteFile", "remove", "deleteFoldersIn", "deleteFilesIn", "emptyFolder", "copy", "move", "copyFoldersIn", "copyFolder", "copyFilesIn", "copyFile", "moveFoldersIn", "moveFolder", "moveFilesIn", "moveFile", "exists", "isFile", "isFolder", "stat", "fileSize", "folderSize", "hashFile", "tempFolder", "sanitizeFilename", "watch"],
  checker: ["isArray", "isNumber", "isFinite", "isInteger", "isSafeInteger", "isFloat", "isPositive", "isNegative", "isBoolean", "isString", "isSymbol", "isBigInt", "isUndefined", "isNull", "isNil", "isDefined", "isPrimitive", "isFunction", "isAsyncFunction", "isGeneratorFunction", "isGenerator", "isClass", "isObject", "isPlainObject", "isPromise", "isRegExp", "isDate", "isValidDate", "isMap", "isSet", "isWeakMap", "isWeakSet", "isIterable", "isAsyncIterable", "isBuffer", "isTypedArray", "isError", "isEmpty", "isBlank", "isArrayOf", "isOneOf", "isEmail", "isURL", "isUUID", "isJSON", "isNumeric", "isIP", "isIPv4", "isIPv6", "isPort", "isHex", "isHexColor", "isBase64", "isSemver", "isISODate", "isSlug", "isAlpha", "isAlphanumeric", "isCreditCard", "isJWT", "assert", "assertType"],
  utils: ["wait", "when", "dontCrash", "JSONString", "JSONParse"],
};

/**
 * @param {string} name
 * @param {() => unknown} load
 */
const lazy = (name, load) => {
  let loaded = false;
  /** @type {unknown} */
  let value;
  Object.defineProperty(exports, name, {
    get: () => {
      if (!loaded) {
        value = load();
        loaded = true;
      }
      return value;
    },
    set: (replacement) => {
      value = replacement;
      loaded = true;
    },
    enumerable: true,
    configurable: true,
  });
};

for (const [namespace, names] of Object.entries(flat)) {
  for (const name of names) lazy(name, () => modules[namespace]()[name]);
}
for (const [name, load] of Object.entries(modules)) lazy(name, load);

exports.nc = exports;
exports.nodeComfort = exports;

// Never runs. Node reads this line to know the named exports of the package
// when it is imported from an ES module.
0 && (module.exports = { log, trace, debug, info, success, warn, error, fatal, group, groupEnd, timeStart, timeEnd, table, box, divider, setLevel, getLevel, isLevelEnabled, configure, setTimestamp, setDelimiter, createLogger, getEnv, createPath, getFolder, getFile, getFoldersIn, getFilesIn, glob, find, readFile, readLines, readJSON, writeFile, writeJSON, appendFile, createFile, createFolder, ensureFolder, ensureFile, touch, deleteFolder, deleteFile, remove, deleteFoldersIn, deleteFilesIn, emptyFolder, copy, move, copyFoldersIn, copyFolder, copyFilesIn, copyFile, moveFoldersIn, moveFolder, moveFilesIn, moveFile, exists, isFile, isFolder, stat, fileSize, folderSize, hashFile, tempFolder, sanitizeFilename, watch, isArray, isNumber, isFinite, isInteger, isSafeInteger, isFloat, isPositive, isNegative, isBoolean, isString, isSymbol, isBigInt, isUndefined, isNull, isNil, isDefined, isPrimitive, isFunction, isAsyncFunction, isGeneratorFunction, isGenerator, isClass, isObject, isPlainObject, isPromise, isRegExp, isDate, isValidDate, isMap, isSet, isWeakMap, isWeakSet, isIterable, isAsyncIterable, isBuffer, isTypedArray, isError, isEmpty, isBlank, isArrayOf, isOneOf, isEmail, isURL, isUUID, isJSON, isNumeric, isIP, isIPv4, isIPv6, isPort, isHex, isHexColor, isBase64, isSemver, isISODate, isSlug, isAlpha, isAlphanumeric, isCreditCard, isJWT, assert, assertType, wait, when, dontCrash, JSONString, JSONParse, logger, fs, checker, utils, str, num, arr, obj, func, time, id, crypto, color, cli, sys, async, schema, http, env, errors, SQLite, Cache, Emitter, nc, nodeComfort });
