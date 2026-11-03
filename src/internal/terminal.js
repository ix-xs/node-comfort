"use strict";

// What the logger and the CLI print goes through here, so a value can't
// drive the terminal.

// What a terminal could act on, once colors, links, new lines and tabs are set aside.
const _UNSAFE = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u{2028}\u{2029}]/u;
// A whole link (opened, text, closed: one left open would take in everything
// printed after it), a color, a Windows new line, or one control character.
const _TERMINAL = /\x1b\]8;[^;\x00-\x1f\x7f-\x9f]*;([^\x00-\x1f\x7f-\x9f]+)(?:\x07|\x1b\\)((?:[^\x00-\x1f\x7f-\x9f\u{2028}\u{2029}]|\x1b\[[\d;:]*m)*?)\x1b\]8;;(?:\x07|\x1b\\)|\x1b\[[\d;:]*m|\r\n|[\x00-\x08\x0b-\x1f\x7f-\x9f\u{2028}\u{2029}]/gu;
const _SGR = /\x1b\[[\d;:]*m/g;
/** @type {Record<string, string>} */
const _NAMED = { "\b": "\\b", "\v": "\\v", "\f": "\\f", "\r": "\\r" };

/**
 * A control character as text, like `\x1b` or `\r`.
 * @param {string} char
 */
const _visible = (char) => {
  const code = char.charCodeAt(0);
  return _NAMED[char] ?? (code > 0xff ? `\\u${code.toString(16).padStart(4, "0")}` : `\\x${code.toString(16).padStart(2, "0")}`);
};

/** @param {string} match */
const _keepStyles = (match) => (match.length > 1 ? match : _visible(match));

/**
 * @param {string} match
 * @param {string | undefined} url
 * @param {string} label
 */
const _dropStyles = (match, url, label) => {
  if (url !== undefined) return `${label.replace(_SGR, "")} (${url})`;
  return match === "\r\n" ? match : match.length > 1 ? "" : _visible(match);
};

/**
 * Text that can't drive the terminal: every control character and escape
 * sequence is shown as text (`\x1b`, `\r`), except new lines, tabs, colors
 * and whole links like `link()` makes. Without colors, colors are removed
 * too, and a link becomes `text (url)`. Used by the logger and the CLI on
 * what they print.
 * @param {string} text
 * @param {boolean} colors
 * @returns {string}
 */
const _safe = (text, colors) => (_UNSAFE.test(text) ? text.replace(_TERMINAL, colors ? _keepStyles : _dropStyles) : text);

module.exports = { safe: _safe };
