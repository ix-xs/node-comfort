"use strict";

// Every namespace is loaded the first time you touch it, so requiring the
// package costs almost nothing.

const fs = require("node:fs");
const path = require("node:path");

// The .env file must be applied before any user code reads process.env.
if (String(process.env.NODE_COMFORT_DOTENV).toLowerCase() !== "false" && fs.existsSync(path.join(process.cwd(), ".env"))) {
  require("./src/Env.js");
}

const { deprecate, peek } = require("./src/internal/deprecate.js");

/**
 * The namespaces, in the order of the documentation.
 * @type {Record<string, () => any>}
 */
const modules = {
  config: () => require("./src/Config.js"),
  logger: () => require("./src/Logger.js"),
  fs: () => require("./src/FS.js"),
  env: () => require("./src/Env.js"),
  is: () => require("./src/Is.js"),
  assert: () => require("./src/Assert.js"),
  errors: () => require("./src/errors.js"),
  json: () => require("./src/Json.js"),
  str: () => require("./src/Str.js"),
  num: () => require("./src/Num.js"),
  arr: () => require("./src/Arr.js"),
  obj: () => require("./src/Obj.js"),
  schema: () => require("./src/Schema.js"),
  time: () => require("./src/Time.js"),
  id: () => require("./src/Id.js"),
  crypto: () => require("./src/Crypto.js"),
  func: () => require("./src/Func.js"),
  async: () => require("./src/Async.js"),
  cache: () => require("./src/CacheNamespace.js"),
  emitter: () => require("./src/EmitterNamespace.js"),
  sqlite: () => require("./src/SQLiteNamespace.js"),
  http: () => require("./src/Http.js"),
  sys: () => require("./src/Sys.js"),
  cli: () => require("./src/Cli.js"),
  color: () => require("./src/Color.js"),
};

for (const [name, load] of Object.entries(modules)) {
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
}

// The names of node-comfort 2, deprecated: they warn once and go away in 4.0.

/** @type {Record<string, import("./src/internal/deprecate.js").DeprecatedAlias>} */
const old = {};

/**
 * @param {string} name The old name at the root.
 * @param {string} use What to write instead.
 * @param {() => unknown} value
 */
const alias = (name, use, value) => {
  old[name] = { use, value };
};

for (const name of ["log", "trace", "debug", "info", "success", "warn", "error", "fatal", "group", "groupEnd", "timeStart", "timeEnd", "table", "box", "divider", "setLevel", "getLevel", "isLevelEnabled", "configure"]) {
  alias(name, `nc.logger.${name}()`, () => modules.logger()[name]);
}
alias("setTimestamp", "nc.logger.configure({ timestamp })", () => peek(modules.logger(), "setTimestamp"));
alias("setDelimiter", "nc.logger.configure({ delimiter })", () => peek(modules.logger(), "setDelimiter"));
alias("createLogger", "nc.logger.create()", () => modules.logger().create);

// fs: the old names that are deprecated in nc.fs too are read without their own warning.
/** @type {Record<string, string>} */
const FS = {
  getEnv: "nc.env.get()", createPath: "nc.fs.resolve()", getFolder: "nc.fs.isFolder(p) ? nc.fs.resolve(p) : undefined",
  getFile: "nc.fs.isFile(p) ? nc.fs.resolve(p) : undefined", getFoldersIn: "nc.fs.list()", getFilesIn: "nc.fs.list()",
  glob: "", find: "", findUp: "", readFile: "nc.fs.read()", readLines: "", readJSON: "", writeFile: "nc.fs.write()",
  writeJSON: "", appendFile: "nc.fs.append()", createFile: "nc.fs.ensureFile() or nc.fs.write()", createFolder: "nc.fs.ensureFolder()",
  ensureFolder: "", ensureFile: "", touch: "", deleteFolder: "nc.fs.remove()", deleteFile: "nc.fs.remove()", remove: "",
  deleteFoldersIn: "nc.fs.remove()", deleteFilesIn: "nc.fs.remove()", emptyFolder: "nc.fs.remove()", copy: "", move: "",
  copyFoldersIn: "nc.fs.copy()", copyFolder: "nc.fs.copy()", copyFilesIn: "nc.fs.copy()", copyFile: "nc.fs.copy()",
  moveFoldersIn: "nc.fs.move()", moveFolder: "nc.fs.move()", moveFilesIn: "nc.fs.move()", moveFile: "nc.fs.move()",
  exists: "", isFile: "", isFolder: "", stat: "", fileSize: "nc.fs.size()", folderSize: "nc.fs.size()", hashFile: "nc.fs.hash()",
  tempFolder: "nc.fs.temp()", sanitizeFilename: "", watch: "",
};
for (const [name, use] of Object.entries(FS)) alias(name, use || `nc.fs.${name}()`, () => peek(modules.fs(), name));

/** isEmail -> email, isURL -> url, isISODate -> isoDate... */
/** @type {Record<string, string>} */
const IS = {
  isArray: "array", isNumber: "number", isFinite: "finite", isInteger: "integer", isSafeInteger: "safeInteger", isFloat: "float",
  isPositive: "positive", isNegative: "negative", isBoolean: "boolean", isString: "string", isSymbol: "symbol", isBigInt: "bigInt",
  isUndefined: "undefined", isNull: "null", isNil: "nil", isDefined: "defined", isPrimitive: "primitive", isFunction: "function",
  isAsyncFunction: "asyncFunction", isGeneratorFunction: "generatorFunction", isGenerator: "generator", isClass: "class",
  isObject: "object", isPlainObject: "plainObject", isPromise: "promise", isRegExp: "regExp", isDate: "date", isValidDate: "validDate",
  isMap: "map", isSet: "set", isWeakMap: "weakMap", isWeakSet: "weakSet", isIterable: "iterable", isAsyncIterable: "asyncIterable",
  isBuffer: "buffer", isTypedArray: "typedArray", isError: "error", isEmpty: "empty", isBlank: "blank", isArrayOf: "arrayOf",
  isOneOf: "oneOf", isEmail: "email", isURL: "url", isUUID: "uuid", isJSON: "json", isNumeric: "numeric", isIP: "ip", isIPv4: "ipv4",
  isIPv6: "ipv6", isPort: "port", isHex: "hex", isHexColor: "hexColor", isBase64: "base64", isSemver: "semver", isISODate: "isoDate",
  isSlug: "slug", isAlpha: "alpha", isAlphanumeric: "alphanumeric", isCreditCard: "creditCard", isJWT: "jwt", isHostname: "hostname",
  isMACAddress: "macAddress", isIBAN: "iban", isE164: "e164", isObjectId: "objectId", isULID: "ulid", isDataURL: "dataUrl",
  isMimeType: "mimeType", isTimeZone: "timeZone", isLocale: "locale", isCron: "cron", isASCII: "ascii",
};
for (const [name, to] of Object.entries(IS)) alias(name, `nc.is.${to}()`, () => modules.is()[to]);
// `nc.assert` itself is now the assert namespace, callable as before.
alias("assertType", "nc.assert.type()", () => modules.assert().type);

alias("wait", "nc.async.sleep()", () => modules.async().sleep);
alias("when", "nc.async.when()", () => modules.async().when);
alias("dontCrash", "nc.sys.dontCrash()", () => modules.sys().dontCrash);
alias("JSONString", "nc.json.stringify()", () => peek(require("./src/Utils.js"), "JSONString"));
alias("JSONParse", "nc.json.parse()", () => peek(require("./src/Utils.js"), "JSONParse"));

alias("checker", "nc.is and nc.assert", () => require("./src/Checker.js"));
alias("utils", "nc.async.sleep(), nc.async.when(), nc.sys.dontCrash() and nc.json", () => require("./src/Utils.js"));
alias("SQLite", "nc.sqlite.open() or nc.sqlite.SQLite", () => require("./src/SQLite.js"));
alias("Cache", "nc.cache.create() or nc.cache.Cache", () => require("./src/Cache.js"));
alias("Emitter", "nc.emitter.create() or nc.emitter.Emitter", () => require("./src/Emitter.js"));
alias("nc", "the package itself (const nc = require(\"@ix-xs/node-comfort\"))", () => exports);
alias("nodeComfort", "the package itself (const nc = require(\"@ix-xs/node-comfort\"))", () => exports);

deprecate(exports, "nc", old);

// Never runs. Node reads this line to know the named exports of the package
// when it is imported from an ES module: the namespaces, then the old names.
0 && (module.exports = { config, logger, fs, env, is, assert, errors, json, str, num, arr, obj, schema, time, id, crypto, func, async, cache, emitter, sqlite, http, sys, cli, color, log, trace, debug, info, success, warn, error, fatal, group, groupEnd, timeStart, timeEnd, table, box, divider, setLevel, getLevel, isLevelEnabled, configure, setTimestamp, setDelimiter, createLogger, getEnv, createPath, getFolder, getFile, getFoldersIn, getFilesIn, glob, find, findUp, readFile, readLines, readJSON, writeFile, writeJSON, appendFile, createFile, createFolder, ensureFolder, ensureFile, touch, deleteFolder, deleteFile, remove, deleteFoldersIn, deleteFilesIn, emptyFolder, copy, move, copyFoldersIn, copyFolder, copyFilesIn, copyFile, moveFoldersIn, moveFolder, moveFilesIn, moveFile, exists, isFile, isFolder, stat, fileSize, folderSize, hashFile, tempFolder, sanitizeFilename, watch, isArray, isNumber, isFinite, isInteger, isSafeInteger, isFloat, isPositive, isNegative, isBoolean, isString, isSymbol, isBigInt, isUndefined, isNull, isNil, isDefined, isPrimitive, isFunction, isAsyncFunction, isGeneratorFunction, isGenerator, isClass, isObject, isPlainObject, isPromise, isRegExp, isDate, isValidDate, isMap, isSet, isWeakMap, isWeakSet, isIterable, isAsyncIterable, isBuffer, isTypedArray, isError, isEmpty, isBlank, isArrayOf, isOneOf, isEmail, isURL, isUUID, isJSON, isNumeric, isIP, isIPv4, isIPv6, isPort, isHex, isHexColor, isBase64, isSemver, isISODate, isSlug, isAlpha, isAlphanumeric, isCreditCard, isJWT, isHostname, isMACAddress, isIBAN, isE164, isObjectId, isULID, isDataURL, isMimeType, isTimeZone, isLocale, isCron, isASCII, assertType, wait, when, dontCrash, JSONString, JSONParse, checker, utils, SQLite, Cache, Emitter, nc, nodeComfort });
