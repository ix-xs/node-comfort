/**
 * Capitalizes the first character of a string and lowercases the rest.
 *
 * @example
 * nodeComfort.str.capitalize("hELLO"); // "Hello"
 *
 * @param {string} str - Input string.
 * @returns {string} The capitalized string.
 */
export function capitalize(str: string): string;
/**
 * Uppercases the first character of each word (Title Case), leaving the rest untouched.
 *
 * @example
 * nodeComfort.str.titleCase("the quick brown fox"); // "The Quick Brown Fox"
 *
 * @param {string} str - Input string.
 * @returns {string} The title-cased string.
 */
export function titleCase(str: string): string;
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
export function camelCase(str: string): string;
/**
 * Converts a string to `PascalCase`.
 *
 * @example
 * nodeComfort.str.pascalCase("hello world"); // "HelloWorld"
 *
 * @param {string} str - Input string.
 * @returns {string} The PascalCased string.
 */
export function pascalCase(str: string): string;
/**
 * Converts a string to `snake_case`.
 *
 * @example
 * nodeComfort.str.snakeCase("helloWorld"); // "hello_world"
 *
 * @param {string} str - Input string.
 * @returns {string} The snake_cased string.
 */
export function snakeCase(str: string): string;
/**
 * Converts a string to `kebab-case`.
 *
 * @example
 * nodeComfort.str.kebabCase("helloWorld"); // "hello-world"
 *
 * @param {string} str - Input string.
 * @returns {string} The kebab-cased string.
 */
export function kebabCase(str: string): string;
/**
 * Converts a string to `CONSTANT_CASE`.
 *
 * @example
 * nodeComfort.str.constantCase("helloWorld"); // "HELLO_WORLD"
 *
 * @param {string} str - Input string.
 * @returns {string} The CONSTANT_CASED string.
 */
export function constantCase(str: string): string;
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
export function slugify(str: string, options?: {
    separator?: string;
    lower?: boolean;
}): string;
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
export function truncate(str: string, length: number, options?: {
    omission?: string;
    words?: boolean;
}): string;
/**
 * Pads a string on the left (start) to a target length.
 *
 * @param {string} str - Input string.
 * @param {number} length - Target total length.
 * @param {string} [char=" "] - Padding character(s).
 * @returns {string} The padded string.
 */
export function padStart(str: string, length: number, char?: string): string;
/**
 * Pads a string on the right (end) to a target length.
 *
 * @param {string} str - Input string.
 * @param {number} length - Target total length.
 * @param {string} [char=" "] - Padding character(s).
 * @returns {string} The padded string.
 */
export function padEnd(str: string, length: number, char?: string): string;
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
export function center(str: string, length: number, char?: string): string;
/**
 * Reverses a string (Unicode code-point aware, so emojis stay intact).
 *
 * @example
 * nodeComfort.str.reverse("abc"); // "cba"
 *
 * @param {string} str - Input string.
 * @returns {string} The reversed string.
 */
export function reverse(str: string): string;
/**
 * Collapses all runs of whitespace into single spaces and trims the ends.
 *
 * @example
 * nodeComfort.str.squish("  hello   world \n"); // "hello world"
 *
 * @param {string} str - Input string.
 * @returns {string} The normalized string.
 */
export function squish(str: string): string;
/**
 * Removes all HTML tags from a string.
 *
 * @example
 * nodeComfort.str.stripTags("<b>Hi</b> there"); // "Hi there"
 *
 * @param {string} str - Input string.
 * @returns {string} The string with tags removed.
 */
export function stripTags(str: string): string;
/**
 * Escapes HTML-sensitive characters (`& < > " '`).
 *
 * @example
 * nodeComfort.str.escapeHTML('<a href="x">'); // "&lt;a href=&quot;x&quot;&gt;"
 *
 * @param {string} str - Input string.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str: string): string;
/**
 * Reverses {@link escapeHTML}: turns HTML entities back into characters.
 *
 * @param {string} str - Input string.
 * @returns {string} The unescaped string.
 */
export function unescapeHTML(str: string): string;
/**
 * Escapes a string for safe use inside a `RegExp`.
 *
 * @example
 * new RegExp(nodeComfort.str.escapeRegExp("a.b")); // matches literal "a.b"
 *
 * @param {string} str - Input string.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(str: string): string;
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
export function count(str: string, sub: string): number;
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
export function ensurePrefix(str: string, prefix: string): string;
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
export function ensureSuffix(str: string, suffix: string): string;
/**
 * Removes a prefix from a string if present.
 *
 * @param {string} str - Input string.
 * @param {string} prefix - Prefix to remove.
 * @returns {string} The string without the prefix.
 */
export function removePrefix(str: string, prefix: string): string;
/**
 * Removes a suffix from a string if present.
 *
 * @param {string} str - Input string.
 * @param {string} suffix - Suffix to remove.
 * @returns {string} The string without the suffix.
 */
export function removeSuffix(str: string, suffix: string): string;
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
export function template(str: string, data: Record<string, any>, options?: {
    open?: string;
    close?: string;
    fallback?: string;
}): string;
/**
 * Splits a string into an array of "words" (camelCase / snake / kebab aware).
 *
 * @example
 * nodeComfort.str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
 *
 * @param {string} str - Input string.
 * @returns {string[]} The words.
 */
export function words(str: string): string[];
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
export function length(str: string): number;
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
export function random(length?: number, charset?: string): string;
//# sourceMappingURL=Str.d.ts.map