---
title: "nc.str"
description: "String helpers: case conversion, slugs, truncation, templates, wrapping, fuzzy matching, plurals. Nothing is mutated, any value is accepted, and lengths are counted the way you see them, so 👨‍👩‍👧 is one character and is never cut in half."
sidebar:
  label: "str"
  order: 7
---

```js
const { str } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const str = require("@ix-xs/node-comfort/str");
```

This page lists everything `nc.str` has, as your editor shows it. For explanations and longer examples, read [the guide](/data/str/).

```js
str.slugify("Héllo, Wörld!");                    // "hello-world"
str.camelCase("user_first-name");                // "userFirstName"
str.plural(3, { one: "file", other: "files" }); // "3 files"
```

## capitalize

```ts
capitalize(input: unknown): string
```

Uppercases the first character and lowercases the rest.

```js
str.capitalize("hELLO wORLD"); // "Hello world"
```

## upperFirst

```ts
upperFirst(input: unknown): string
```

Uppercases the first character and leaves the rest alone.

```js
str.upperFirst("userName"); // "UserName"
```

## lowerFirst

```ts
lowerFirst(input: unknown): string
```

Lowercases the first character and leaves the rest alone.

```js
str.lowerFirst("UserName"); // "userName"
```

## humanize

```ts
humanize(input: unknown): string
```

Turns an identifier into a label people can read. Acronyms stay as they are.

```js
str.humanize("user_first_name"); // "User first name"
str.humanize("createdAt");       // "Created at"
str.humanize("userID");          // "User ID"
```

## titleCase

```ts
titleCase(input: unknown): string
```

Uppercases the first letter of each word and leaves the rest alone.

```js
str.titleCase("the quick brown fox"); // "The Quick Brown Fox"
str.titleCase("élodie o'neil");       // "Élodie O'neil"
```

## sentenceCase

```ts
sentenceCase(input: unknown): string
```

Lowercases everything, then capitalizes the start of each sentence.

```js
str.sentenceCase("hELLO WORLD. how ARE you?"); // "Hello world. How are you?"
```

## camelCase

```ts
camelCase(input: unknown): string
```

Converts to `camelCase`.

```js
str.camelCase("user_first-name"); // "userFirstName"
str.camelCase("XMLHttpRequest");  // "xmlHttpRequest"
```

## pascalCase

```ts
pascalCase(input: unknown): string
```

Converts to `PascalCase`.

```js
str.pascalCase("hello world"); // "HelloWorld"
```

## snakeCase

```ts
snakeCase(input: unknown): string
```

Converts to `snake_case`.

```js
str.snakeCase("helloWorld"); // "hello_world"
```

## kebabCase

```ts
kebabCase(input: unknown): string
```

Converts to `kebab-case`.

```js
str.kebabCase("helloWorld"); // "hello-world"
```

## constantCase

```ts
constantCase(input: unknown): string
```

Converts to `CONSTANT_CASE`.

```js
str.constantCase("helloWorld"); // "HELLO_WORLD"
```

## dotCase

```ts
dotCase(input: unknown): string
```

Converts to `dot.case`.

```js
str.dotCase("userFirstName"); // "user.first.name"
```

## words

```ts
words(input: unknown): string[]
```

Splits text into words. Understands camelCase, snake_case, kebab-case,
dots, spaces and punctuation.

```js
str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
```

## deburr

```ts
deburr(input: unknown): string
```

Removes accents (`é` becomes `e`) and spells out special Latin letters
(`ß` becomes `ss`, `æ` becomes `ae`).

```js
str.deburr("Crème brûlée"); // "Creme brulee"
str.deburr("Straße");       // "Strasse"
```

## slugify

```ts
slugify(input: unknown, options?: SlugifyOptions): string
```

Turns text into a URL slug: no accents, lowercase, words joined by dashes.

**Returns** `string`: The slug, possibly empty.

```js
str.slugify("Héllo, World!");                      // "hello-world"
str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
str.slugify("A very long title", { maxLength: 8 }); // "a-very"
```

## squish

```ts
squish(input: unknown): string
```

Collapses runs of whitespace into single spaces and trims the ends.

```js
str.squish("  hello \n\t world  "); // "hello world"
```

## stripTags

```ts
stripTags(input: unknown): string
```

Removes HTML tags and keeps the text. This is not a sanitizer: to show
untrusted text in HTML, use `escapeHTML()`.

```js
str.stripTags("<p>Hello <b>world</b></p>"); // "Hello world"
```

## escapeHTML

```ts
escapeHTML(input: unknown): string
```

Escapes `& < > " '` so the text is safe inside HTML content and attributes.

```js
str.escapeHTML('<a href="x">Tom & Jerry</a>');
// "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;"
```

## unescapeHTML

```ts
unescapeHTML(input: unknown): string
```

Decodes HTML entities: named ones like `&amp;` and `&nbsp;`, and numeric
ones like `&#233;`.

```js
str.unescapeHTML("Tom &amp; Jerry &#x1F600;"); // "Tom & Jerry 😀"
```

## escapeRegExp

```ts
escapeRegExp(input: unknown): string
```

Escapes regex special characters so the text matches literally.

```js
new RegExp(str.escapeRegExp("1+1=2?")).test("1+1=2?"); // true
```

## length

```ts
length(input: unknown): number
```

Counts visible characters. Unlike `.length`, an emoji or an accented
letter counts as one.

```js
"👨‍👩‍👧".length;         // 8
str.length("👨‍👩‍👧");     // 1
```

## byteLength

```ts
byteLength(input: unknown, encoding?: BufferEncoding): number
```

Size of the text in bytes once encoded, UTF-8 by default. Useful when a
limit is in bytes, like a database column or an HTTP header.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `encoding?` | `BufferEncoding` | Defaults to `"utf8"`. |

```js
str.byteLength("é");  // 2
str.byteLength("😀"); // 4
```

## count

```ts
count(input: unknown, search: string): number
```

Counts how many times `search` appears, without overlaps.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `search` | `string` | An empty string gives `0`. |

```js
str.count("banana", "a"); // 3
str.count("aaaa", "aa");  // 2
```

## truncate

```ts
truncate(input: unknown, length: number, options?: TruncateOptions): string
```

Shortens text to `length` visible characters, ending with `…` when cut.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` | Maximum length, omission included. |
| `options?` | [`TruncateOptions`](#truncateoptions) |  |

```js
str.truncate("Hello world", 8);                        // "Hello w…"
str.truncate("Hello world", 8, { omission: "..." });   // "Hello..."
str.truncate("Hello big world", 12, { words: true });  // "Hello big…"
```

## chunk

```ts
chunk(input: unknown, size: number): string[]
```

Splits text into pieces of `size` visible characters. The last one can be
shorter.

```js
str.chunk("4242424242424242", 4).join(" "); // "4242 4242 4242 4242"
```

## between

```ts
between(input: unknown, start: string, end: string): string | undefined
```

Returns the text between `start` and the next `end`, or `undefined` if a
marker is missing.

```js
str.between("Hello [world]!", "[", "]"); // "world"
```

## splitOnce

```ts
splitOnce(input: unknown, separator: string): [string, string | undefined]
```

Splits at the first occurrence of `separator` only.

```js
str.splitOnce("key=value=more", "="); // ["key", "value=more"]
str.splitOnce("novalue", "=");        // ["novalue", undefined]
```

## lines

```ts
lines(input: unknown): string[]
```

Splits text into lines, whatever the line endings.

```js
str.lines("a\r\nb\nc"); // ["a", "b", "c"]
```

## padStart

```ts
padStart(input: unknown, length: number, char?: string): string
```

Pads the start until the text is `length` characters long.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Defaults to `" "`. |

```js
str.padStart("7", 3, "0"); // "007"
```

## padEnd

```ts
padEnd(input: unknown, length: number, char?: string): string
```

Pads the end until the text is `length` characters long.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Defaults to `" "`. |

```js
str.padEnd("ab", 5, "."); // "ab..."
```

## center

```ts
center(input: unknown, length: number, char?: string): string
```

Centers text within `length` characters. An odd leftover goes to the right.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Defaults to `" "`. |

```js
str.center("hi", 7, "*"); // "**hi***"
```

## indent

```ts
indent(input: unknown, prefix?: string | number): string
```

Indents every non-empty line.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `prefix?` | `number \| string` | A number of spaces, or the prefix itself. Defaults to `2`. |

```js
str.indent("a\nb", 2);    // "  a\n  b"
str.indent("a\nb", "> "); // "> a\n> b"
```

## dedent

```ts
dedent(input: unknown, ...values: unknown[]): string
```

Removes the indentation shared by all lines, and blank first and last
lines. Works as a template tag, so multi-line strings can follow your
code's indentation.

```js
const sql = str.dedent`
  SELECT *
    FROM users
   WHERE id = ${id}
`;
// "SELECT *\n  FROM users\n WHERE id = 42"
```

## wrap

```ts
wrap(input: unknown, options?: number | WrapOptions): string
```

Wraps text so no line is longer than `width` visible characters. Existing
line breaks are kept.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `options?` | [`WrapOptions`](#wrapoptions)` \| number` | Options, or just the width. |

```js
str.wrap("The quick brown fox jumps over the lazy dog", 16);
// "The quick brown\nfox jumps over\nthe lazy dog"
```

## reverse

```ts
reverse(input: unknown): string
```

Reverses text without breaking emoji or accents.

```js
str.reverse("añ👍🏽"); // "👍🏽ña"
```

## mask

```ts
mask(input: unknown, options?: MaskOptions): string
```

Hides part of a string, like a card number or a token.

```js
str.mask("4242424242424242");                           // "************4242"
str.mask("4242 4242 4242 4242", { keepSpaces: true });   // "**** **** **** 4242"
str.mask("secret-token", { start: 2, end: 2, char: "•" }); // "se••••••••en"
```

## initials

```ts
initials(input: unknown, max?: number): string
```

The initials of a name, in uppercase.

| Parameter | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `max?` | `number` | Maximum number of letters. Defaults to `2`. |

```js
str.initials("Ada Lovelace");       // "AL"
str.initials("jean-luc picard", 3); // "JLP"
```

## plural

```ts
plural(value: number, forms: PluralForms, options?: PluralOptions): string
```

Picks the right plural for a count, following the rules of the language,
and puts the formatted count in front.

```js
str.plural(1, { one: "file", other: "files" });                           // "1 file"
str.plural(1234, { one: "item", other: "items" });                        // "1,234 items"
str.plural(0, { zero: "no files", one: "file", other: "files" });         // "no files"
str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" });   // "0 fichier"
```

## template

```ts
template(input: unknown, data: Record<string, any>, options?: TemplateOptions): string
```

Fills `{placeholders}` with values. Dotted paths like `{user.name}` work,
and missing values are left alone unless you give a `fallback`.

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
// "Hi Jo, you have 3 messages"
str.template("Hello {{ user.name }}", { user: { name: "Ada" } }, { open: "{{", close: "}}" });
// "Hello Ada"
```

## ensurePrefix

```ts
ensurePrefix(input: unknown, prefix: string): string
```

Adds `prefix` unless the text already starts with it.

```js
str.ensurePrefix("example.com", "https://"); // "https://example.com"
```

## ensureSuffix

```ts
ensureSuffix(input: unknown, suffix: string): string
```

Adds `suffix` unless the text already ends with it.

```js
str.ensureSuffix("path/to", "/"); // "path/to/"
```

## removePrefix

```ts
removePrefix(input: unknown, prefix: string): string
```

Removes `prefix` if the text starts with it.

```js
str.removePrefix("https://example.com", "https://"); // "example.com"
```

## removeSuffix

```ts
removeSuffix(input: unknown, suffix: string): string
```

Removes `suffix` if the text ends with it.

```js
str.removeSuffix("report.pdf", ".pdf"); // "report"
```

## compare

```ts
compare(a: unknown, b: unknown, options?: CompareOptions): number
```

Compares two strings the way people sort them: numbers in natural order
and accents in the right place. Pass it straight to `sort()`.

**Returns** `number`: Negative if `a` comes first, positive if `b` does, `0` if equal.

```js
["file10", "file2", "File1"].sort(str.compare); // ["File1", "file2", "file10"]
str.compare("a", "A", { sensitivity: "base" }); // 0
```

## levenshtein

```ts
levenshtein(a: unknown, b: unknown): number
```

The number of single-character edits needed to turn `a` into `b`.

```js
str.levenshtein("kitten", "sitting"); // 3
```

## similarity

```ts
similarity(a: unknown, b: unknown): number
```

How alike two strings are, from `0` (nothing in common) to `1` (identical).

```js
str.similarity("hello", "hallo"); // 0.8
```

## closest

```ts
closest(input: unknown, candidates: Iterable<string>, options?: ClosestOptions): string | undefined
```

Finds the candidate closest to `input`. Made for "Did you mean...?"
suggestions.

**Returns** `string | undefined`: `undefined` when nothing is close enough.

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install"
str.closest("xyz", ["install", "list"]);                 // undefined
```

## random

```ts
random(size?: number, options?: string | RandomStringOptions): string
```

A random string. It relies on `Math.random`, so don't use it for secrets:
`nc.id.token()` and `nc.id.nano()` are made for that.

| Parameter | Type | Description |
| --- | --- | --- |
| `size?` | `number` | Defaults to `16`. |
| `options?` | [`RandomStringOptions`](#randomstringoptions)` \| string` | Options, or the charset itself. |

```js
str.random();                                // "aZ3kP9qL0xYb7TcW"
str.random(6, { charset: "0123456789" });    // "402917"
```

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { ClosestOptions } from "@ix-xs/node-comfort"`.

### ClosestOptions

Options for `closest()`.

| Property | Type | Description |
| --- | --- | --- |
| `threshold?` | `number` | Minimum similarity (0 to 1) to accept a match. Defaults to `0.4`. |
| `caseSensitive?` | `boolean` | Take case into account. |

### CompareOptions

Options for `compare()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language used for alphabetical order. Defaults to the system's. |
| `numeric?` | `boolean` | Sort numbers naturally, `"file2"` before `"file10"`. Defaults to `true`. |
| `sensitivity?` | `"base" \| "accent" \| "case" \| "variant"` | Which differences count. `"base"` ignores accents and case. Defaults to `"variant"`. |

### MaskOptions

Options for `mask()`.

| Property | Type | Description |
| --- | --- | --- |
| `start?` | `number` | Characters left visible at the start. Defaults to `0`. |
| `end?` | `number` | Characters left visible at the end. Defaults to `4`. |
| `char?` | `string` | Mask character. Defaults to `"*"`. |
| `keepSpaces?` | `boolean` | Leave spaces and dashes visible, nice for card numbers. |

### PluralForms

The word forms for `plural()`. Only `other` is required; add the others
when your language needs them.

| Property | Type | Description |
| --- | --- | --- |
| `other` | `string` | The general plural, like `"files"`. |
| `zero?` | `string` | Used for `0` in any language, like `"no files"`. |
| `one?` | `string` | The singular, like `"file"`. French also uses it for 0. |
| `two?` | `string` | Dual form (Arabic, Hebrew, Slovenian...). |
| `few?` | `string` | "Few" form (Polish, Czech, Russian...). |
| `many?` | `string` | "Many" form (Polish, Russian, Arabic...). |

### PluralOptions

Options for `plural()`.

| Property | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Language whose plural rules apply. Defaults to `"en"`. |
| `includeCount?` | `boolean` | Put the formatted count before the word. Defaults to `true`. |
| `ordinal?` | `boolean` | Use ordinal rules (1st, 2nd, 3rd). |

### RandomStringOptions

Options for `random()`.

| Property | Type | Description |
| --- | --- | --- |
| `charset?` | `string` | Characters to pick from. Defaults to letters and digits. |

### SlugifyOptions

Options for `slugify()`.

| Property | Type | Description |
| --- | --- | --- |
| `separator?` | `string` | Placed between words. Defaults to `"-"`. |
| `lower?` | `boolean` | Lowercase the result. Defaults to `true`. |
| `maxLength?` | `number` | Maximum length, cut on a word boundary when possible. |

### TemplateOptions

Options for `template()`.

| Property | Type | Description |
| --- | --- | --- |
| `open?` | `string` | Opening delimiter. Defaults to `"{"`. |
| `close?` | `string` | Closing delimiter. Defaults to `"}"`. |
| `fallback?` | `string` | Used for missing values. Without it, their placeholders stay as they are. |

### TruncateOptions

Options for `truncate()`.

| Property | Type | Description |
| --- | --- | --- |
| `omission?` | `string` | Added where the text is cut, and counted in the length. Defaults to `"…"`. |
| `words?` | `boolean` | Cut at the previous space rather than inside a word, when the end is what gets cut. |
| `position?` | `"end" \| "middle" \| "start"` | Where the text is cut. `"middle"` keeps both ends, which suits paths and ids. Defaults to `"end"`. |

### WrapOptions

Options for `wrap()`.

| Property | Type | Description |
| --- | --- | --- |
| `width?` | `number` | Maximum visible characters per line. Defaults to `80`. |
| `indent?` | `string` | Added at the start of every line. |
| `cut?` | `boolean` | Break words longer than `width` instead of letting them overflow. |
| `newline?` | `string` | Line separator. Defaults to `"\n"`. |
