"use strict";

// A small syntax highlighter for the documentation site. It covers what the
// docs contain (JavaScript, TypeScript, JSON, shell) and outputs HTML spans.

const escape = (/** @type {string} */ text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const KEYWORDS = new Set(
  "const let var function return if else for of in while do await async new class extends import from export default try catch finally throw typeof instanceof void delete yield this super static get set as type interface declare keyof readonly using switch case break continue".split(" "),
);
const LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
const PRIMITIVES = new Set(["string", "number", "boolean", "bigint", "symbol", "object", "unknown", "any", "never"]);

const JS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b|\b0x[\da-f]+\b)|([A-Za-z_$][\w$]*)|(=>|[{}()[\];,.:?!=<>+\-*/%&|^~@#])/giy;

/**
 * @param {string} code
 * @returns {string}
 */
const highlightJS = (code) => {
  let out = "";
  let index = 0;
  JS.lastIndex = 0;
  while (index < code.length) {
    JS.lastIndex = index;
    const m = JS.exec(code);
    if (!m || m.index !== index) {
      out += escape(code[index]);
      index++;
      continue;
    }
    const [text, comment, string, number, word, punct] = m;
    if (comment) out += `<span class="t-comment">${escape(text)}</span>`;
    else if (string) out += `<span class="t-string">${escape(text)}</span>`;
    else if (number) out += `<span class="t-number">${escape(text)}</span>`;
    else if (word) {
      const before = code.slice(0, index).trimEnd();
      const after = code.slice(index + text.length);
      const isKey = /^\s*\??:(?!:)/.test(after) && /[{,(]\s*$|^\s*$/.test(before.split("\n").pop() ?? "");
      if (isKey) out += `<span class="t-prop">${text}</span>`;
      else if (KEYWORDS.has(word) && !before.endsWith(".")) out += `<span class="t-keyword">${text}</span>`;
      else if (LITERALS.has(word)) out += `<span class="t-literal">${text}</span>`;
      else if (PRIMITIVES.has(word) && !before.endsWith(".")) out += `<span class="t-type">${text}</span>`;
      else if (/^\s*\(/.test(after) || /^\s*`/.test(after)) out += `<span class="t-fn">${text}</span>`;
      else if (before.endsWith(".")) out += `<span class="t-prop">${text}</span>`;
      else if (/^[A-Z]/.test(word)) out += `<span class="t-type">${text}</span>`;
      else out += text;
    } else if (punct) out += `<span class="t-punct">${escape(text)}</span>`;
    else out += escape(text);
    index += text.length;
  }
  return out;
};

/**
 * @param {string} code
 * @returns {string}
 */
const highlightShell = (code) =>
  code
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return `<span class="t-comment">${escape(line)}</span>`;
      const m = /^(\s*)([\w./-]+)(.*)$/.exec(line);
      if (!m) return escape(line);
      const rest = escape(m[3]).replace(/(\s)(--?[\w-]+)/g, '$1<span class="t-prop">$2</span>').replace(/(&quot;[^&]*&quot;|"[^"]*"|'[^']*')/g, '<span class="t-string">$1</span>');
      return `${m[1]}<span class="t-fn">${escape(m[2])}</span>${rest}`;
    })
    .join("\n");

/**
 * @param {string} code
 * @returns {string}
 */
const highlightJSON = (code) =>
  escape(code).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/gi, (m, str, colon, lit, num) => {
    if (str) return colon ? `<span class="t-prop">${str}</span>${colon}` : `<span class="t-string">${str}</span>`;
    if (lit) return `<span class="t-literal">${lit}</span>`;
    return `<span class="t-number">${num}</span>`;
  });

/**
 * Highlights code for the given language.
 * @param {string} code
 * @param {string} [lang]
 * @returns {string} HTML.
 */
const highlight = (code, lang = "") => {
  const l = lang.toLowerCase();
  if (["js", "javascript", "ts", "typescript", "mjs", "cjs", "jsx", "tsx"].includes(l)) return highlightJS(code);
  if (["bash", "sh", "shell", "console"].includes(l)) return highlightShell(code);
  if (l === "json") return highlightJSON(code);
  return escape(code);
};

module.exports = { highlight, escape };
