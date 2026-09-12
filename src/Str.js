"use strict";

/**
 * String helpers: case conversion, slugs, truncation, templates, wrapping,
 * fuzzy matching, plurals. Nothing is mutated, any value is accepted, and
 * lengths are counted the way you see them, so 👨‍👩‍👧 is one character and
 * is never cut in half.
 *
 * @example
 * str.slugify("Héllo, Wörld!");                    // "hello-world"
 * str.camelCase("user_first-name");                // "userFirstName"
 * str.plural(3, { one: "file", other: "files" }); // "3 files"
 */

/**
 * Options for `slugify()`.
 * @typedef {object} SlugifyOptions
 * @property {string} [separator] Placed between words. Defaults to `"-"`.
 * @property {boolean} [lower] Lowercase the result. Defaults to `true`.
 * @property {number} [maxLength] Maximum length, cut on a word boundary when possible.
 */

/**
 * Options for `truncate()`.
 * @typedef {object} TruncateOptions
 * @property {string} [omission] Added where the text is cut, and counted in the length. Defaults to `"…"`.
 * @property {boolean} [words] Cut at the previous space rather than inside a word.
 */

/**
 * Options for `template()`.
 * @typedef {object} TemplateOptions
 * @property {string} [open] Opening delimiter. Defaults to `"{"`.
 * @property {string} [close] Closing delimiter. Defaults to `"}"`.
 * @property {string} [fallback] Used for missing values. Without it, their placeholders stay as they are.
 */

/**
 * Options for `wrap()`.
 * @typedef {object} WrapOptions
 * @property {number} [width] Maximum visible characters per line. Defaults to `80`.
 * @property {string} [indent] Added at the start of every line.
 * @property {boolean} [cut] Break words longer than `width` instead of letting them overflow.
 * @property {string} [newline] Line separator. Defaults to `"\n"`.
 */

/**
 * Options for `mask()`.
 * @typedef {object} MaskOptions
 * @property {number} [start] Characters left visible at the start. Defaults to `0`.
 * @property {number} [end] Characters left visible at the end. Defaults to `4`.
 * @property {string} [char] Mask character. Defaults to `"*"`.
 * @property {boolean} [keepSpaces] Leave spaces and dashes visible, nice for card numbers.
 */

/**
 * The word forms for `plural()`. Only `other` is required; add the others
 * when your language needs them.
 * @typedef {object} PluralForms
 * @property {string} other The general plural, like `"files"`.
 * @property {string} [zero] Used for `0` in any language, like `"no files"`.
 * @property {string} [one] The singular, like `"file"`. French also uses it for 0.
 * @property {string} [two] Dual form (Arabic, Hebrew, Slovenian...).
 * @property {string} [few] "Few" form (Polish, Czech, Russian...).
 * @property {string} [many] "Many" form (Polish, Russian, Arabic...).
 */

/**
 * Options for `plural()`.
 * @typedef {object} PluralOptions
 * @property {string} [locale] Language whose plural rules apply. Defaults to `"en"`.
 * @property {boolean} [includeCount] Put the formatted count before the word. Defaults to `true`.
 * @property {boolean} [ordinal] Use ordinal rules (1st, 2nd, 3rd).
 */

/**
 * Options for `compare()`.
 * @typedef {object} CompareOptions
 * @property {string} [locale] Language used for alphabetical order. Defaults to the system's.
 * @property {boolean} [numeric] Sort numbers naturally, `"file2"` before `"file10"`. Defaults to `true`.
 * @property {"base"|"accent"|"case"|"variant"} [sensitivity] Which differences count. `"base"` ignores accents and case. Defaults to `"variant"`.
 */

/**
 * Options for `closest()`.
 * @typedef {object} ClosestOptions
 * @property {number} [threshold] Minimum similarity (0 to 1) to accept a match. Defaults to `0.4`.
 * @property {boolean} [caseSensitive] Take case into account.
 */

/**
 * Options for `random()`.
 * @typedef {object} RandomStringOptions
 * @property {string} [charset] Characters to pick from. Defaults to letters and digits.
 */

// Intl objects are expensive to build, so they are created on first use.
/** @type {Intl.Segmenter | undefined} */
let _segmenter;
/** @type {Intl.Collator | undefined} */
let _defaultCollator;

/**
 * @param {string} input
 * @returns {string[]}
 */
const _graphemes = (input) => {
  // Fast path: pure ASCII strings have one grapheme per UTF-16 unit.
  if (/^[\x00-\x7f]*$/.test(input)) return input.split("");
  _segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(_segmenter.segment(input), (s) => s.segment);
};

/** Letters that Unicode normalization doesn't decompose. */
const _SPECIAL_LATIN = /** @type {Record<string, string>} */ ({
  ß: "ss", ẞ: "SS", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", ø: "o", Ø: "O",
  đ: "d", Đ: "D", ð: "d", Ð: "D", ł: "l", Ł: "L", þ: "th", Þ: "TH", ħ: "h", Ħ: "H", ı: "i",
});

/**
 * @param {unknown} input
 * @returns {string[]}
 */
const _words = (input) =>
  String(input)
    .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** @param {string} word */
const _upperFirst = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** @param {string} value */
const _escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Uppercases the first character and lowercases the rest.
 *
 * @example
 * str.capitalize("hELLO wORLD"); // "Hello world"
 *
 * @param {unknown} input
 * @returns {string}
 */
function capitalize(input) {
  const s = String(input);
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

/**
 * Uppercases the first letter of each word and leaves the rest alone.
 *
 * @example
 * str.titleCase("the quick brown fox"); // "The Quick Brown Fox"
 * str.titleCase("élodie o'neil");       // "Élodie O'neil"
 *
 * @param {unknown} input
 * @returns {string}
 */
function titleCase(input) {
  return String(input).replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

/**
 * Lowercases everything, then capitalizes the start of each sentence.
 *
 * @example
 * str.sentenceCase("hELLO WORLD. how ARE you?"); // "Hello world. How are you?"
 *
 * @param {unknown} input
 * @returns {string}
 */
function sentenceCase(input) {
  return String(input)
    .toLowerCase()
    .replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

/**
 * Converts to `camelCase`.
 *
 * @example
 * str.camelCase("user_first-name"); // "userFirstName"
 * str.camelCase("XMLHttpRequest");  // "xmlHttpRequest"
 *
 * @param {unknown} input
 * @returns {string}
 */
function camelCase(input) {
  return _words(input)
    .map((word, i) => (i === 0 ? word.toLowerCase() : _upperFirst(word.toLowerCase())))
    .join("");
}

/**
 * Converts to `PascalCase`.
 *
 * @example
 * str.pascalCase("hello world"); // "HelloWorld"
 *
 * @param {unknown} input
 * @returns {string}
 */
function pascalCase(input) {
  return _words(input).map((word) => _upperFirst(word.toLowerCase())).join("");
}

/**
 * Converts to `snake_case`.
 *
 * @example
 * str.snakeCase("helloWorld"); // "hello_world"
 *
 * @param {unknown} input
 * @returns {string}
 */
function snakeCase(input) {
  return _words(input).map((word) => word.toLowerCase()).join("_");
}

/**
 * Converts to `kebab-case`.
 *
 * @example
 * str.kebabCase("helloWorld"); // "hello-world"
 *
 * @param {unknown} input
 * @returns {string}
 */
function kebabCase(input) {
  return _words(input).map((word) => word.toLowerCase()).join("-");
}

/**
 * Converts to `CONSTANT_CASE`.
 *
 * @example
 * str.constantCase("helloWorld"); // "HELLO_WORLD"
 *
 * @param {unknown} input
 * @returns {string}
 */
function constantCase(input) {
  return _words(input).map((word) => word.toUpperCase()).join("_");
}

/**
 * Converts to `dot.case`.
 *
 * @example
 * str.dotCase("userFirstName"); // "user.first.name"
 *
 * @param {unknown} input
 * @returns {string}
 */
function dotCase(input) {
  return _words(input).map((word) => word.toLowerCase()).join(".");
}

/**
 * Splits text into words. Understands camelCase, snake_case, kebab-case,
 * dots, spaces and punctuation.
 *
 * @example
 * str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
 *
 * @param {unknown} input
 * @returns {string[]}
 */
function words(input) {
  return _words(input);
}

/**
 * Removes accents (`é` becomes `e`) and spells out special Latin letters
 * (`ß` becomes `ss`, `æ` becomes `ae`).
 *
 * @example
 * str.deburr("Crème brûlée"); // "Creme brulee"
 * str.deburr("Straße");       // "Strasse"
 *
 * @param {unknown} input
 * @returns {string}
 */
function deburr(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ßẞæÆœŒøØđĐðÐłŁþÞħĦı]/g, (c) => _SPECIAL_LATIN[c] ?? c);
}

/**
 * Turns text into a URL slug: no accents, lowercase, words joined by dashes.
 *
 * @example
 * str.slugify("Héllo, World!");                      // "hello-world"
 * str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
 * str.slugify("A very long title", { maxLength: 8 }); // "a-very"
 *
 * @param {unknown} input
 * @param {SlugifyOptions} [options]
 * @returns {string} The slug, possibly empty.
 */
function slugify(input, options = {}) {
  const separator = options.separator ?? "-";
  const sep = _escapeRegExp(separator);
  let slug = deburr(input)
    .replace(/[^\p{L}\p{N}]+/gu, separator)
    .replace(new RegExp(`(?:${sep}){2,}`, "g"), separator)
    .replace(new RegExp(`^(?:${sep})|(?:${sep})$`, "g"), "");
  if (options.lower ?? true) slug = slug.toLowerCase();
  if (options.maxLength !== undefined && slug.length > options.maxLength) {
    const cut = slug.slice(0, options.maxLength);
    const lastSep = separator ? cut.lastIndexOf(separator) : -1;
    slug = (lastSep > 0 ? cut.slice(0, lastSep) : cut).replace(new RegExp(`(?:${sep})+$`), "");
  }
  return slug;
}

/**
 * Collapses runs of whitespace into single spaces and trims the ends.
 *
 * @example
 * str.squish("  hello \n\t world  "); // "hello world"
 *
 * @param {unknown} input
 * @returns {string}
 */
function squish(input) {
  return String(input).replace(/\s+/g, " ").trim();
}

/**
 * Removes HTML tags and keeps the text. This is not a sanitizer: to show
 * untrusted text in HTML, use `escapeHTML()`.
 *
 * @example
 * str.stripTags("<p>Hello <b>world</b></p>"); // "Hello world"
 *
 * @param {unknown} input
 * @returns {string}
 */
function stripTags(input) {
  return String(input).replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Escapes `& < > " '` so the text is safe inside HTML content and attributes.
 *
 * @example
 * str.escapeHTML('<a href="x">Tom & Jerry</a>');
 * // "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;"
 *
 * @param {unknown} input
 * @returns {string}
 */
function escapeHTML(input) {
  const map = /** @type {Record<string, string>} */ ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" });
  return String(input).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Decodes HTML entities: named ones like `&amp;` and `&nbsp;`, and numeric
 * ones like `&#233;`.
 *
 * @example
 * str.unescapeHTML("Tom &amp; Jerry &#x1F600;"); // "Tom & Jerry 😀"
 *
 * @param {unknown} input
 * @returns {string}
 */
function unescapeHTML(input) {
  const named = /** @type {Record<string, string>} */ ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " });
  return String(input).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return named[lower] ?? match;
  });
}

/**
 * Escapes regex special characters so the text matches literally.
 *
 * @example
 * new RegExp(str.escapeRegExp("1+1=2?")).test("1+1=2?"); // true
 *
 * @param {unknown} input
 * @returns {string}
 */
function escapeRegExp(input) {
  return _escapeRegExp(String(input));
}

/**
 * Counts visible characters. Unlike `.length`, an emoji or an accented
 * letter counts as one.
 *
 * @example
 * "👨‍👩‍👧".length;         // 8
 * str.length("👨‍👩‍👧");     // 1
 *
 * @param {unknown} input
 * @returns {number}
 */
function length(input) {
  return _graphemes(String(input)).length;
}

/**
 * Size of the text in bytes once encoded, UTF-8 by default. Useful when a
 * limit is in bytes, like a database column or an HTTP header.
 *
 * @example
 * str.byteLength("é");  // 2
 * str.byteLength("😀"); // 4
 *
 * @param {unknown} input
 * @param {BufferEncoding} [encoding="utf8"]
 * @returns {number}
 */
function byteLength(input, encoding = "utf8") {
  return Buffer.byteLength(String(input), encoding);
}

/**
 * Counts how many times `search` appears, without overlaps.
 *
 * @example
 * str.count("banana", "a"); // 3
 * str.count("aaaa", "aa");  // 2
 *
 * @param {unknown} input
 * @param {string} search An empty string gives `0`.
 * @returns {number}
 */
function count(input, search) {
  const s = String(input);
  if (!search) return 0;
  let total = 0;
  let pos = s.indexOf(search);
  while (pos !== -1) {
    total++;
    pos = s.indexOf(search, pos + search.length);
  }
  return total;
}

/**
 * Shortens text to `length` visible characters, ending with `…` when cut.
 *
 * @example
 * str.truncate("Hello world", 8);                        // "Hello w…"
 * str.truncate("Hello world", 8, { omission: "..." });   // "Hello..."
 * str.truncate("Hello big world", 12, { words: true });  // "Hello big…"
 *
 * @param {unknown} input
 * @param {number} length Maximum length, omission included.
 * @param {TruncateOptions} [options]
 * @returns {string}
 */
function truncate(input, length, options = {}) {
  const omission = options.omission ?? "…";
  const chars = _graphemes(String(input));
  if (chars.length <= length) return chars.join("");
  const keep = Math.max(0, length - _graphemes(omission).length);
  let sliced = chars.slice(0, keep).join("");
  if (options.words) {
    const nextIsSpace = /\s/.test(chars[keep] ?? " ");
    const lastSpace = sliced.search(/\s\S*$/);
    if (!nextIsSpace && lastSpace > 0) sliced = sliced.slice(0, lastSpace);
  }
  return sliced.replace(/\s+$/, "") + omission;
}

/**
 * Returns the text between `start` and the next `end`, or `undefined` if a
 * marker is missing.
 *
 * @example
 * str.between("Hello [world]!", "[", "]"); // "world"
 *
 * @param {unknown} input
 * @param {string} start
 * @param {string} end
 * @returns {string | undefined}
 */
function between(input, start, end) {
  const s = String(input);
  const from = s.indexOf(start);
  if (from === -1) return undefined;
  const to = s.indexOf(end, from + start.length);
  return to === -1 ? undefined : s.slice(from + start.length, to);
}

/**
 * Splits at the first occurrence of `separator` only.
 *
 * @example
 * str.splitOnce("key=value=more", "="); // ["key", "value=more"]
 * str.splitOnce("novalue", "=");        // ["novalue", undefined]
 *
 * @param {unknown} input
 * @param {string} separator
 * @returns {[string, string | undefined]}
 */
function splitOnce(input, separator) {
  const s = String(input);
  const index = s.indexOf(separator);
  return index === -1 ? [s, undefined] : [s.slice(0, index), s.slice(index + separator.length)];
}

/**
 * Splits text into lines, whatever the line endings.
 *
 * @example
 * str.lines("a\r\nb\nc"); // ["a", "b", "c"]
 *
 * @param {unknown} input
 * @returns {string[]}
 */
function lines(input) {
  return String(input).split(/\r\n|\r|\n/);
}

/**
 * Pads the start until the text is `length` characters long.
 *
 * @example
 * str.padStart("7", 3, "0"); // "007"
 *
 * @param {unknown} input
 * @param {number} length
 * @param {string} [char=" "]
 * @returns {string}
 */
function padStart(input, length, char = " ") {
  return String(input).padStart(length, char);
}

/**
 * Pads the end until the text is `length` characters long.
 *
 * @example
 * str.padEnd("ab", 5, "."); // "ab..."
 *
 * @param {unknown} input
 * @param {number} length
 * @param {string} [char=" "]
 * @returns {string}
 */
function padEnd(input, length, char = " ") {
  return String(input).padEnd(length, char);
}

/**
 * Centers text within `length` characters. An odd leftover goes to the right.
 *
 * @example
 * str.center("hi", 7, "*"); // "**hi***"
 *
 * @param {unknown} input
 * @param {number} length
 * @param {string} [char=" "]
 * @returns {string}
 */
function center(input, length, char = " ") {
  const s = String(input);
  const visible = _graphemes(s).length;
  if (visible >= length || !char) return s;
  const total = length - visible;
  const left = Math.floor(total / 2);
  return char.repeat(left) + s + char.repeat(total - left);
}

/**
 * Indents every non-empty line.
 *
 * @example
 * str.indent("a\nb", 2);    // "  a\n  b"
 * str.indent("a\nb", "> "); // "> a\n> b"
 *
 * @param {unknown} input
 * @param {number | string} [prefix=2] A number of spaces, or the prefix itself.
 * @returns {string}
 */
function indent(input, prefix = 2) {
  const pad = typeof prefix === "number" ? " ".repeat(prefix) : prefix;
  return String(input).replace(/^(?=.)/gm, pad);
}

/**
 * Removes the indentation shared by all lines, and blank first and last
 * lines. Works as a template tag, so multi-line strings can follow your
 * code's indentation.
 *
 * @example
 * const sql = str.dedent`
 *   SELECT *
 *     FROM users
 *    WHERE id = ${id}
 * `;
 * // "SELECT *\n  FROM users\n WHERE id = 42"
 *
 * @param {unknown} input
 * @param {...unknown} values
 * @returns {string}
 */
function dedent(input, ...values) {
  let text;
  if (Array.isArray(input) && Object.prototype.hasOwnProperty.call(input, "raw")) {
    const strings = /** @type {TemplateStringsArray} */ (/** @type {unknown} */ (input));
    text = strings.reduce((acc, part, i) => acc + part + (i < values.length ? String(values[i]) : ""), "");
  } else {
    text = String(input);
  }
  const all = text.replace(/\r\n?/g, "\n").split("\n");
  if (all.length && all[0].trim() === "") all.shift();
  if (all.length && all[all.length - 1].trim() === "") all.pop();
  const indents = all.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0);
  const min = indents.length ? Math.min(...indents) : 0;
  return all.map((line) => line.slice(min)).join("\n");
}

/**
 * Wraps text so no line is longer than `width` visible characters. Existing
 * line breaks are kept.
 *
 * @example
 * str.wrap("The quick brown fox jumps over the lazy dog", 16);
 * // "The quick brown\nfox jumps over\nthe lazy dog"
 *
 * @param {unknown} input
 * @param {WrapOptions | number} [options] Options, or just the width.
 * @returns {string}
 */
function wrap(input, options = {}) {
  const opts = typeof options === "number" ? { width: options } : options;
  const width = Math.max(1, opts.width ?? 80);
  const prefix = opts.indent ?? "";
  const newline = opts.newline ?? "\n";
  /** @type {string[]} */
  const out = [];
  for (const paragraph of String(input).split(/\r\n|\r|\n/)) {
    let line = "";
    for (let word of paragraph.split(/\s+/).filter(Boolean)) {
      while (opts.cut && _graphemes(word).length > width) {
        if (line) {
          out.push(line);
          line = "";
        }
        const chars = _graphemes(word);
        out.push(chars.slice(0, width).join(""));
        word = chars.slice(width).join("");
      }
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (_graphemes(candidate).length > width && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out.map((l) => prefix + l).join(newline);
}

/**
 * Reverses text without breaking emoji or accents.
 *
 * @example
 * str.reverse("añ👍🏽"); // "👍🏽ña"
 *
 * @param {unknown} input
 * @returns {string}
 */
function reverse(input) {
  return _graphemes(String(input)).reverse().join("");
}

/**
 * Hides part of a string, like a card number or a token.
 *
 * @example
 * str.mask("4242424242424242");                           // "************4242"
 * str.mask("4242 4242 4242 4242", { keepSpaces: true });   // "**** **** **** 4242"
 * str.mask("secret-token", { start: 2, end: 2, char: "•" }); // "se••••••••en"
 *
 * @param {unknown} input
 * @param {MaskOptions} [options]
 * @returns {string}
 */
function mask(input, options = {}) {
  const chars = _graphemes(String(input));
  const start = Math.max(0, options.start ?? 0);
  const end = Math.max(0, options.end ?? 4);
  const char = options.char ?? "*";
  if (start + end >= chars.length) return chars.join("");
  return chars
    .map((c, i) => {
      if (i < start || i >= chars.length - end) return c;
      if (options.keepSpaces && /[\s-]/.test(c)) return c;
      return char;
    })
    .join("");
}

/**
 * The initials of a name, in uppercase.
 *
 * @example
 * str.initials("Ada Lovelace");       // "AL"
 * str.initials("jean-luc picard", 3); // "JLP"
 *
 * @param {unknown} input
 * @param {number} [max=2] Maximum number of letters.
 * @returns {string}
 */
function initials(input, max = 2) {
  return _words(input)
    .slice(0, max)
    .map((word) => _graphemes(word)[0].toUpperCase())
    .join("");
}

/**
 * Picks the right plural for a count, following the rules of the language,
 * and puts the formatted count in front.
 *
 * @example
 * str.plural(1, { one: "file", other: "files" });                           // "1 file"
 * str.plural(1234, { one: "item", other: "items" });                        // "1,234 items"
 * str.plural(0, { zero: "no files", one: "file", other: "files" });         // "no files"
 * str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" });   // "0 fichier"
 *
 * @param {number} value
 * @param {PluralForms} forms
 * @param {PluralOptions} [options]
 * @returns {string}
 */
function plural(value, forms, options = {}) {
  const locale = options.locale ?? "en";
  if (value === 0 && forms.zero !== undefined) return forms.zero;
  const category = new Intl.PluralRules(locale, { type: options.ordinal ? "ordinal" : "cardinal" }).select(value);
  const word = forms[category] ?? forms.other;
  if (options.includeCount === false) return word;
  return `${new Intl.NumberFormat(locale).format(value)} ${word}`;
}

/**
 * Fills `{placeholders}` with values. Dotted paths like `{user.name}` work,
 * and missing values are left alone unless you give a `fallback`.
 *
 * @example
 * str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
 * // "Hi Jo, you have 3 messages"
 * str.template("Hello {{ user.name }}", { user: { name: "Ada" } }, { open: "{{", close: "}}" });
 * // "Hello Ada"
 *
 * @param {unknown} input
 * @param {Record<string, any>} data
 * @param {TemplateOptions} [options]
 * @returns {string}
 */
function template(input, data, options = {}) {
  const open = _escapeRegExp(options.open ?? "{");
  const close = _escapeRegExp(options.close ?? "}");
  const regex = new RegExp(`${open}\\s*([\\w$.-]+)\\s*${close}`, "g");
  return String(input).replace(regex, (match, key) => {
    /** @type {any} */
    let value = data;
    for (const part of String(key).split(".")) value = value == null ? undefined : value[part];
    if (value === undefined || value === null) return options.fallback ?? match;
    return String(value);
  });
}

/**
 * Adds `prefix` unless the text already starts with it.
 *
 * @example
 * str.ensurePrefix("example.com", "https://"); // "https://example.com"
 *
 * @param {unknown} input
 * @param {string} prefix
 * @returns {string}
 */
function ensurePrefix(input, prefix) {
  const s = String(input);
  return s.startsWith(prefix) ? s : prefix + s;
}

/**
 * Adds `suffix` unless the text already ends with it.
 *
 * @example
 * str.ensureSuffix("path/to", "/"); // "path/to/"
 *
 * @param {unknown} input
 * @param {string} suffix
 * @returns {string}
 */
function ensureSuffix(input, suffix) {
  const s = String(input);
  return s.endsWith(suffix) ? s : s + suffix;
}

/**
 * Removes `prefix` if the text starts with it.
 *
 * @example
 * str.removePrefix("https://example.com", "https://"); // "example.com"
 *
 * @param {unknown} input
 * @param {string} prefix
 * @returns {string}
 */
function removePrefix(input, prefix) {
  const s = String(input);
  return prefix && s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

/**
 * Removes `suffix` if the text ends with it.
 *
 * @example
 * str.removeSuffix("report.pdf", ".pdf"); // "report"
 *
 * @param {unknown} input
 * @param {string} suffix
 * @returns {string}
 */
function removeSuffix(input, suffix) {
  const s = String(input);
  return suffix && s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;
}

/**
 * Compares two strings the way people sort them: numbers in natural order
 * and accents in the right place. Pass it straight to `sort()`.
 *
 * @example
 * ["file10", "file2", "File1"].sort(str.compare); // ["File1", "file2", "file10"]
 * str.compare("a", "A", { sensitivity: "base" }); // 0
 *
 * @param {unknown} a
 * @param {unknown} b
 * @param {CompareOptions} [options]
 * @returns {number} Negative if `a` comes first, positive if `b` does, `0` if equal.
 */
function compare(a, b, options = {}) {
  const collator =
    options && typeof options === "object" && (options.locale || options.sensitivity || options.numeric === false)
      ? new Intl.Collator(options.locale, { numeric: options.numeric ?? true, sensitivity: options.sensitivity ?? "variant" })
      : (_defaultCollator ??= new Intl.Collator(undefined, { numeric: true, sensitivity: "variant" }));
  return collator.compare(String(a), String(b));
}

/**
 * The number of single-character edits needed to turn `a` into `b`.
 *
 * @example
 * str.levenshtein("kitten", "sitting"); // 3
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const s = _graphemes(String(a));
  const t = _graphemes(String(b));
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  let previous = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const current = [i];
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[t.length];
}

/**
 * How alike two strings are, from `0` (nothing in common) to `1` (identical).
 *
 * @example
 * str.similarity("hello", "hallo"); // 0.8
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
function similarity(a, b) {
  const longest = Math.max(length(a), length(b));
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

/**
 * Finds the candidate closest to `input`. Made for "Did you mean...?"
 * suggestions.
 *
 * @example
 * str.closest("instal", ["install", "uninstall", "list"]); // "install"
 * str.closest("xyz", ["install", "list"]);                 // undefined
 *
 * @param {unknown} input
 * @param {Iterable<string>} candidates
 * @param {ClosestOptions} [options]
 * @returns {string | undefined} `undefined` when nothing is close enough.
 */
function closest(input, candidates, options = {}) {
  const threshold = options.threshold ?? 0.4;
  const norm = (/** @type {string} */ s) => (options.caseSensitive ? s : s.toLowerCase());
  const needle = norm(String(input));
  let best;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = similarity(needle, norm(candidate));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return bestScore >= threshold ? best : undefined;
}

/**
 * A random string. It relies on `Math.random`, so don't use it for secrets:
 * `nc.id.token()` and `nc.id.nano()` are made for that.
 *
 * @example
 * str.random();                                // "aZ3kP9qL0xYb7TcW"
 * str.random(6, { charset: "0123456789" });    // "402917"
 *
 * @param {number} [size=16]
 * @param {RandomStringOptions | string} [options] Options, or the charset itself.
 * @returns {string}
 */
function random(size = 16, options = {}) {
  const charset = typeof options === "string" ? options : options.charset ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < size; i++) out += charset.charAt(Math.floor(Math.random() * charset.length));
  return out;
}

module.exports = {
  capitalize,
  titleCase,
  sentenceCase,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
  dotCase,
  words,
  deburr,
  slugify,
  squish,
  stripTags,
  escapeHTML,
  unescapeHTML,
  escapeRegExp,
  length,
  byteLength,
  count,
  truncate,
  between,
  splitOnce,
  lines,
  padStart,
  padEnd,
  center,
  indent,
  dedent,
  wrap,
  reverse,
  mask,
  initials,
  plural,
  template,
  ensurePrefix,
  ensureSuffix,
  removePrefix,
  removeSuffix,
  compare,
  levenshtein,
  similarity,
  closest,
  random,
};
