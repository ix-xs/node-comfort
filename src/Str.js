/**
 * String utilities.
 *
 * A curated set of the string helpers you end up rewriting in every project:
 * case conversion, slugs, truncation, padding, template rendering, and more.
 * Zero dependencies, Unicode-aware where it matters.
 */

/**
 * Splits a string into its "words", handling camelCase, PascalCase,
 * snake_case, kebab-case, spaces and digits.
 * @private
 * @param {string} str
 * @returns {string[]}
 */
const _words = (str) => {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
};

module.exports = {
  /**
   * Capitalizes the first character of a string and lowercases the rest.
   *
   * @example
   * nodeComfort.str.capitalize("hELLO"); // "Hello"
   *
   * @param {string} str - Input string.
   * @returns {string} The capitalized string.
   */
  capitalize(str) {
    str = String(str);
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Uppercases the first character of each word (Title Case), leaving the rest untouched.
   *
   * @example
   * nodeComfort.str.titleCase("the quick brown fox"); // "The Quick Brown Fox"
   *
   * @param {string} str - Input string.
   * @returns {string} The title-cased string.
   */
  titleCase(str) {
    return String(str).replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  },

  /**
   * Converts a string to `camelCase`.
   *
   * @example
   * nodeComfort.str.camelCase("hello world");  // "helloWorld"
   * nodeComfort.str.camelCase("foo-bar_baz");  // "fooBarBaz"
   *
   * @param {string} str - Input string.
   * @returns {string} The camelCased string.
   */
  camelCase(str) {
    return _words(str)
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
  },

  /**
   * Converts a string to `PascalCase`.
   *
   * @example
   * nodeComfort.str.pascalCase("hello world"); // "HelloWorld"
   *
   * @param {string} str - Input string.
   * @returns {string} The PascalCased string.
   */
  pascalCase(str) {
    return _words(str)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  },

  /**
   * Converts a string to `snake_case`.
   *
   * @example
   * nodeComfort.str.snakeCase("helloWorld"); // "hello_world"
   *
   * @param {string} str - Input string.
   * @returns {string} The snake_cased string.
   */
  snakeCase(str) {
    return _words(str).map((word) => word.toLowerCase()).join("_");
  },

  /**
   * Converts a string to `kebab-case`.
   *
   * @example
   * nodeComfort.str.kebabCase("helloWorld"); // "hello-world"
   *
   * @param {string} str - Input string.
   * @returns {string} The kebab-cased string.
   */
  kebabCase(str) {
    return _words(str).map((word) => word.toLowerCase()).join("-");
  },

  /**
   * Converts a string to `CONSTANT_CASE`.
   *
   * @example
   * nodeComfort.str.constantCase("helloWorld"); // "HELLO_WORLD"
   *
   * @param {string} str - Input string.
   * @returns {string} The CONSTANT_CASED string.
   */
  constantCase(str) {
    return _words(str).map((word) => word.toUpperCase()).join("_");
  },

  /**
   * Converts a string into a URL-friendly slug.
   *
   * Accents/diacritics are stripped, non-alphanumeric runs become the separator.
   *
   * @example
   * nodeComfort.str.slugify("Héllo, World!");            // "hello-world"
   * nodeComfort.str.slugify("A B C", { separator: "_" }); // "a_b_c"
   *
   * @param {string} str - Input string.
   * @param {{ separator?: string, lower?: boolean }} [options] - Slug options.
   * @returns {string} The slug.
   */
  slugify(str, options = {}) {
    const separator = options.separator ?? "-";
    const lower = options.lower ?? true;
    const result = String(str)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, separator)
      .replace(new RegExp(`\\${separator}{2,}`, "g"), separator)
      .replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");
    return lower ? result.toLowerCase() : result;
  },

  /**
   * Truncates a string to a maximum length, appending an ellipsis if cut.
   *
   * @example
   * nodeComfort.str.truncate("Hello world", 8);                 // "Hello…"
   * nodeComfort.str.truncate("Hello world", 8, { omission: "..." }); // "Hello..."
   *
   * @param {string} str - Input string.
   * @param {number} length - Maximum length of the result (including the omission).
   * @param {{ omission?: string, words?: boolean }} [options] - Truncation options.
   * @returns {string} The truncated string.
   */
  truncate(str, length, options = {}) {
    str = String(str);
    const omission = options.omission ?? "…";
    if (str.length <= length) return str;

    const cut = Math.max(0, length - omission.length);
    let sliced = str.slice(0, cut);

    if (options.words) {
      const lastSpace = sliced.lastIndexOf(" ");
      if (lastSpace > 0) sliced = sliced.slice(0, lastSpace);
    }
    return sliced.replace(/\s+$/, "") + omission;
  },

  /**
   * Pads a string on the left (start) to a target length.
   *
   * @param {string} str - Input string.
   * @param {number} length - Target total length.
   * @param {string} [char=" "] - Padding character(s).
   * @returns {string} The padded string.
   */
  padStart(str, length, char = " ") {
    return String(str).padStart(length, char);
  },

  /**
   * Pads a string on the right (end) to a target length.
   *
   * @param {string} str - Input string.
   * @param {number} length - Target total length.
   * @param {string} [char=" "] - Padding character(s).
   * @returns {string} The padded string.
   */
  padEnd(str, length, char = " ") {
    return String(str).padEnd(length, char);
  },

  /**
   * Centers a string within a target length by padding both sides.
   *
   * @example
   * nodeComfort.str.center("hi", 6);        // "  hi  "
   * nodeComfort.str.center("hi", 6, "*");   // "**hi**"
   *
   * @param {string} str - Input string.
   * @param {number} length - Target total length.
   * @param {string} [char=" "] - Padding character.
   * @returns {string} The centered string.
   */
  center(str, length, char = " ") {
    str = String(str);
    if (str.length >= length) return str;
    const total = length - str.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return char.repeat(left) + str + char.repeat(right);
  },

  /**
   * Reverses a string (Unicode code-point aware, so emojis stay intact).
   *
   * @example
   * nodeComfort.str.reverse("abc"); // "cba"
   *
   * @param {string} str - Input string.
   * @returns {string} The reversed string.
   */
  reverse(str) {
    return [...String(str)].reverse().join("");
  },

  /**
   * Collapses all runs of whitespace into single spaces and trims the ends.
   *
   * @example
   * nodeComfort.str.squish("  hello   world \n"); // "hello world"
   *
   * @param {string} str - Input string.
   * @returns {string} The normalized string.
   */
  squish(str) {
    return String(str).replace(/\s+/g, " ").trim();
  },

  /**
   * Removes all HTML tags from a string.
   *
   * @example
   * nodeComfort.str.stripTags("<b>Hi</b> there"); // "Hi there"
   *
   * @param {string} str - Input string.
   * @returns {string} The string with tags removed.
   */
  stripTags(str) {
    return String(str).replace(/<\/?[^>]+(>|$)/g, "");
  },

  /**
   * Escapes HTML-sensitive characters (`& < > " '`).
   *
   * @example
   * nodeComfort.str.escapeHTML('<a href="x">'); // "&lt;a href=&quot;x&quot;&gt;"
   *
   * @param {string} str - Input string.
   * @returns {string} The escaped string.
   */
  escapeHTML(str) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  },

  /**
   * Reverses {@link escapeHTML}: turns HTML entities back into characters.
   *
   * @param {string} str - Input string.
   * @returns {string} The unescaped string.
   */
  unescapeHTML(str) {
    const map = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&#x27;": "'" };
    return String(str).replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m) => map[m]);
  },

  /**
   * Escapes a string for safe use inside a `RegExp`.
   *
   * @example
   * new RegExp(nodeComfort.str.escapeRegExp("a.b")); // matches literal "a.b"
   *
   * @param {string} str - Input string.
   * @returns {string} The escaped string.
   */
  escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /**
   * Counts the number of non-overlapping occurrences of a substring.
   *
   * @example
   * nodeComfort.str.count("banana", "a"); // 3
   *
   * @param {string} str - Input string.
   * @param {string} sub - Substring to count.
   * @returns {number} Number of occurrences.
   */
  count(str, sub) {
    str = String(str);
    if (!sub) return 0;
    let count = 0;
    let pos = str.indexOf(sub);
    while (pos !== -1) {
      count++;
      pos = str.indexOf(sub, pos + sub.length);
    }
    return count;
  },

  /**
   * Ensures a string starts with a given prefix (adds it only if missing).
   *
   * @example
   * nodeComfort.str.ensurePrefix("example.com", "https://"); // "https://example.com"
   *
   * @param {string} str - Input string.
   * @param {string} prefix - Prefix to ensure.
   * @returns {string} The string with the prefix guaranteed.
   */
  ensurePrefix(str, prefix) {
    str = String(str);
    return str.startsWith(prefix) ? str : prefix + str;
  },

  /**
   * Ensures a string ends with a given suffix (adds it only if missing).
   *
   * @example
   * nodeComfort.str.ensureSuffix("path", "/"); // "path/"
   *
   * @param {string} str - Input string.
   * @param {string} suffix - Suffix to ensure.
   * @returns {string} The string with the suffix guaranteed.
   */
  ensureSuffix(str, suffix) {
    str = String(str);
    return str.endsWith(suffix) ? str : str + suffix;
  },

  /**
   * Removes a prefix from a string if present.
   *
   * @param {string} str - Input string.
   * @param {string} prefix - Prefix to remove.
   * @returns {string} The string without the prefix.
   */
  removePrefix(str, prefix) {
    str = String(str);
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
  },

  /**
   * Removes a suffix from a string if present.
   *
   * @param {string} str - Input string.
   * @param {string} suffix - Suffix to remove.
   * @returns {string} The string without the suffix.
   */
  removeSuffix(str, suffix) {
    str = String(str);
    return suffix && str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
  },

  /**
   * Renders a template, replacing `{key}` placeholders with values from `data`.
   *
   * Missing keys are left as-is by default. Nested paths (`{user.name}`) are supported.
   *
   * @example
   * nodeComfort.str.template("Hi {name}, you have {count} msgs", { name: "Jo", count: 3 });
   * // "Hi Jo, you have 3 msgs"
   *
   * @param {string} str - Template string.
   * @param {Record<string, any>} data - Replacement values.
   * @param {{ open?: string, close?: string, fallback?: string }} [options] - Delimiters / fallback.
   * @returns {string} The rendered string.
   */
  template(str, data, options = {}) {
    const open = options.open ?? "{";
    const close = options.close ?? "}";
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${esc(open)}\\s*([\\w.]+)\\s*${esc(close)}`, "g");
    return String(str).replace(regex, (match, key) => {
      const value = key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), data);
      if (value === undefined || value === null) {
        return options.fallback !== undefined ? options.fallback : match;
      }
      return String(value);
    });
  },

  /**
   * Splits a string into an array of "words" (camelCase / snake / kebab aware).
   *
   * @example
   * nodeComfort.str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
   *
   * @param {string} str - Input string.
   * @returns {string[]} The words.
   */
  words(str) {
    return _words(str);
  },

  /**
   * Returns the visible length of a string in code points (emoji-safe).
   *
   * @example
   * "😀".length;                    // 2
   * nodeComfort.str.length("😀");   // 1
   *
   * @param {string} str - Input string.
   * @returns {number} The number of code points.
   */
  length(str) {
    return [...String(str)].length;
  },

  /**
   * Generates a random alphanumeric string of a given length.
   *
   * Note: uses `Math.random` and is **not** cryptographically secure.
   * For tokens/IDs use `nodeComfort.id.token()` instead.
   *
   * @param {number} [length=16] - Desired length.
   * @param {string} [charset] - Characters to pick from.
   * @returns {string} The random string.
   */
  random(length = 16, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
    let out = "";
    for (let i = 0; i < length; i++) {
      out += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return out;
  },
};
