"use strict";

// Deprecated aliases: old names that keep working until 4.0. Each one is a
// non-enumerable accessor, so listing or spreading an object never shows nor
// triggers it, and it warns the first time it is read.

/**
 * @typedef {object} DeprecatedAlias
 * @property {string} use What to write instead, like `"nc.logger.info()"`.
 * @property {() => unknown} [value] Gives the old value. Defaults to the value the property has now.
 * @property {boolean} [live] Calls `value` at every read instead of once, for a value that changes (a counter).
 */

/**
 * @typedef {{ name: string, use: string, load: () => unknown }} _Entry
 */

/** @type {WeakMap<object, Map<string, _Entry>>} */
const _registry = new WeakMap();

/** Names already reported in this process. */
const _warned = new Set();

/**
 * @param {unknown} value
 * @returns {boolean}
 */
const _isClass = (value) => typeof value === "function" && /^class\b/.test(Function.prototype.toString.call(value));

/**
 * `NODE_COMFORT_DEP_LOGGER_CREATE_LOGGER` for `nc.logger.createLogger`.
 * @param {string} path
 * @returns {string}
 */
const code = (path) =>
  `NODE_COMFORT_DEP_${path
    .replace(/^nc(\.|$)/, (_, dot) => (dot ? "" : "NC"))
    .replace(/SQLite/g, "Sqlite")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z]{2,})/g, "$1_$2")
    .replace(/\./g, "_")
    .toUpperCase()}`;

/**
 * The text of the warning, also used as the `@deprecated` note of the types.
 * @param {string} path Like `"nc.info"`.
 * @param {string} use
 * @param {unknown} value Functions get `()` after their name, classes and objects don't.
 * @returns {string}
 */
const message = (path, use, value) =>
  `${path}${typeof value === "function" && !_isClass(value) ? "()" : ""} is deprecated: use ${use}. It will be removed in 4.0.`;

/**
 * True when Node's ES module loader reads the property: it reads every named
 * export of a CommonJS module once, whether the code uses it or not. Only the
 * loader itself counts, not the top-level code of an ES module it runs.
 * @returns {boolean}
 */
const _fromModuleLoader = () => {
  const { stackTraceLimit, prepareStackTrace } = Error;
  try {
    Error.stackTraceLimit = 4;
    Error.prepareStackTrace = (_, sites) => sites;
    /** @type {{ stack?: any }} */
    const holder = {};
    Error.captureStackTrace(holder, _fromModuleLoader);
    const sites = holder.stack;
    return Array.isArray(sites) && sites.some((site) => String(site.getFileName?.() ?? "") === "node:internal/modules/esm/translators");
  } catch {
    return false;
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
    Error.prepareStackTrace = prepareStackTrace;
  }
};

/**
 * Warns once per name, with a `DeprecationWarning` that `node --no-deprecation`
 * silences.
 * @param {string} path
 * @param {string} use
 * @param {unknown} value
 */
const warn = (path, use, value) => {
  if (_warned.has(path) || _fromModuleLoader()) return;
  _warned.add(path);
  process.emitWarning(message(path, use, value), { type: "DeprecationWarning", code: code(path) });
};

/**
 * Adds deprecated aliases to an object. Each one is a non-enumerable accessor
 * that warns the first time it is read, then gives the old value. Assigning
 * it replaces the value, without a warning.
 *
 * @example
 * deprecate(module.exports, "nc.logger", { createLogger: { use: "nc.logger.create()" } });
 *
 * @param {object} target
 * @param {string} owner How the object is written in messages: `"nc"` for the root, `"nc.logger"`...
 * @param {Record<string, DeprecatedAlias>} aliases
 * @returns {void}
 */
function deprecate(target, owner, aliases) {
  let entries = _registry.get(target);
  if (!entries) _registry.set(target, (entries = new Map()));
  for (const [name, alias] of Object.entries(aliases)) {
    const path = owner ? `${owner}.${name}` : name;
    /** @type {() => unknown} */
    let read;
    if (alias.value) read = alias.value;
    else {
      const current = /** @type {any} */ (target)[name];
      read = () => current;
    }
    let loaded = false;
    /** @type {unknown} */
    let value;
    const load = () => {
      if (alias.live && !loaded) return read();
      if (!loaded) {
        value = read();
        loaded = true;
      }
      return value;
    };
    entries.set(name, { name, use: alias.use, load });
    Object.defineProperty(target, name, {
      get() {
        const result = load();
        warn(path, alias.use, result);
        return result;
      },
      set(replacement) {
        value = replacement;
        loaded = true;
      },
      enumerable: false,
      configurable: true,
    });
  }
}

/**
 * Reads a property without the warning of a deprecated alias.
 * @param {object} target
 * @param {string} name
 * @returns {unknown}
 */
function peek(target, name) {
  const entry = _registry.get(target)?.get(name);
  return entry ? entry.load() : /** @type {any} */ (target)[name];
}

/**
 * The deprecated aliases of an object, for the type builder and the tests.
 * @param {object} target
 * @returns {Array<{ name: string, use: string }>}
 */
function aliasesOf(target) {
  return [...(_registry.get(target)?.values() ?? [])].map(({ name, use }) => ({ name, use }));
}

module.exports = { deprecate, peek, aliasesOf, message, code, warn };
