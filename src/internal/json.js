"use strict";

// The JSON code behind `nc.json` and the deprecated `JSONString()` and
// `JSONParse()`. Not part of the public API.

const { types } = require("node:util");

/**
 * Removes comments and trailing commas from JSONC.
 * @param {string} text
 * @returns {string}
 */
const stripJSONComments = (text) => {
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
 * The fields of an error that `JSON.stringify` would drop.
 * @param {Error} error
 * @returns {Record<string, unknown>}
 */
const _plainError = (error) => {
  /** @type {Record<string, unknown>} */
  const out = { name: error.name, message: error.message };
  for (const key of Object.keys(error)) out[key] = /** @type {any} */ (error)[key];
  if (error.cause !== undefined) out.cause = error.cause;
  if (error.stack) out.stack = error.stack;
  return out;
};

/**
 * `JSON.stringify` that never throws.
 * @param {unknown} value
 * @param {number} spaces
 * @returns {string}
 */
const stringify = (value, spaces) => {
  /** @type {Array<[holder: object, original: object]>} ancestors of the value being serialized */
  const stack = [];
  let text;
  try {
    text = JSON.stringify(
      value,
      /** @this {any} */ function(_, raw) {
        if (typeof raw === "bigint") return raw.toString();
        if (raw === null || typeof raw !== "object") return raw;
        while (stack.length && stack[stack.length - 1][0] !== this) stack.pop();
        for (let i = 0; i < stack.length; i++) if (stack[i][1] === raw) return "[Circular]";
        const v = types.isMap(raw) ? Object.fromEntries(raw) : types.isSet(raw) ? [...raw] : types.isNativeError(raw) ? _plainError(raw) : raw;
        stack.push([v, raw]);
        return v;
      },
      spaces,
    );
  } catch (error) {
    // A getter or a toJSON() threw: describe the value instead of failing.
    try {
      text = JSON.stringify(require("node:util").inspect(value, { depth: 4, breakLength: Infinity }));
    } catch {
      text = JSON.stringify(`[Unserializable: ${error instanceof Error ? error.message : String(error)}]`);
    }
  }
  return text ?? String(text);
};

/**
 * `JSON.parse` without a byte order mark, with an optional fallback.
 * @param {string} text
 * @param {boolean} safe Return `fallback` instead of throwing.
 * @param {unknown} fallback
 * @param {((this: any, key: string, value: any) => any) | undefined} reviver
 * @param {boolean} comments Accept JSONC.
 * @returns {any}
 */
const parse = (text, safe, fallback, reviver, comments) => {
  const clean = typeof text === "string" && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!safe) return JSON.parse(comments && typeof clean === "string" ? stripJSONComments(clean) : clean, reviver);
  try {
    return JSON.parse(comments && typeof clean === "string" ? stripJSONComments(clean) : clean, reviver);
  } catch {
    return fallback;
  }
};

module.exports = { stripJSONComments, stringify, parse };
