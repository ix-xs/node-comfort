---
title: "Strings"
description: "`nc.str`: case conversion, slugs, truncation, templates, plurals and fuzzy matching. Lengths are counted in characters as people see them."
---

```js
const { str } = require("@ix-xs/node-comfort");
```

Every function accepts any value, converted with `String()`, and returns a new string.

## Characters

JavaScript counts UTF-16 code units: `"👨‍👩‍👧".length` is 8. These functions count what is displayed:

```js
str.length("👨‍👩‍👧");               // 1
str.truncate("Hello 👋🏽 world", 8); // "Hello 👋🏽…"
str.reverse("añ👍🏽");               // "👍🏽ña"
str.padStart("👍🏽", 3, ".");        // "..👍🏽"
```

| Counts characters | Counts bytes |
| --- | --- |
| `length`, `truncate`, `chunk`, `padStart`, `padEnd`, `center`, `reverse`, `wrap`, `mask` | `byteLength` (UTF-8) |

## Case

```js
str.camelCase("user_first-name");        // "userFirstName"
str.humanize("createdAt");               // "Created at"
str.sentenceCase("hELLO. how ARE you?"); // "Hello. How are you?"
str.words("helloWorld-foo_bar");         // ["hello", "World", "foo", "bar"]
```

| Function | `"helloWorld"` gives |
| --- | --- |
| `camelCase` | `"helloWorld"` |
| `pascalCase` | `"HelloWorld"` |
| `snakeCase` | `"hello_world"` |
| `kebabCase` | `"hello-world"` |
| `constantCase` | `"HELLO_WORLD"` |
| `dotCase` | `"hello.world"` |
| `titleCase` | `"HelloWorld"`: splits on spaces only, `"the quick fox"` gives `"The Quick Fox"` |
| `humanize` | `"Hello world"` |
| `capitalize` | `"Helloworld"`: first letter up, the rest down |
| `upperFirst` | `"HelloWorld"`: first letter up, the rest unchanged |
| `lowerFirst` | `"helloWorld"` |

`humanize` keeps acronyms (`"userID"` gives `"User ID"`); a name in capitals has none to tell apart (`"API_KEY"` gives `"Api key"`).

## Truncating and padding

```js
str.truncate("The quick brown fox", 12);                  // "The quick b…"
str.truncate("The quick brown fox", 12, { words: true }); // "The quick…"
str.truncate("src/components/forms/LoginForm.jsx", 20, { position: "middle" }); // "src/compon…nForm.jsx"
str.center("hi", 7, "*");                                 // "**hi***"
```

| `truncate` option | Default | |
| --- | --- | --- |
| `omission` | `"…"` | Counted in the length |
| `words` | `false` | Never cut a word in half |
| `position` | `"end"` | `"start"`, `"middle"` or `"end"` |

## Slugs and cleanup

```js
str.slugify("Héllo, Wörld!");                       // "hello-world"
str.slugify("Crème Brûlée", { separator: "_" });    // "creme_brulee"
str.deburr("Straße à Zürich");                      // "Strasse a Zurich"
str.squish("  hello \n\t world  ");                 // "hello world"
str.stripTags("<p>Hello <b>world</b></p>");         // "Hello world"
str.escapeHTML('<a href="x">Tom & Jerry</a>');      // '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;'
```

| Function | Does |
| --- | --- |
| `slugify(text, { separator, lower, maxLength })` | A piece of URL |
| `deburr` | Removes accents |
| `squish` | Collapses whitespace and trims |
| `stripTags` | Removes HTML tags. Not a sanitizer: use `escapeHTML` for untrusted text |
| `escapeHTML`, `unescapeHTML` | `&`, `<`, `>`, `"`, `'` and back; numeric and common named entities |
| `escapeRegExp` | Text to match literally in a `RegExp` |

## Templates

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
// "Hi Jo, you have 3 messages"
str.template("{user.name} ({user.role})", { user: { name: "Ada", role: "admin" } }); // "Ada (admin)"
str.template("Hi {name}", {}, { fallback: "there" });                                // "Hi there"
str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" });       // "Hello Jo"
```

A missing value stays as written unless `fallback` is set. Inherited properties (`constructor`, `toString`) count as missing, so a template written by a user cannot reach them.

`dedent` is a template tag that removes the indentation of a multi-line literal:

```js
const sql = str.dedent`
  SELECT *
    FROM users
`;
// "SELECT *\n  FROM users"
```

## Plurals

`plural` follows the rules of the language (`Intl.PluralRules`) and puts the formatted count first:

```js
str.plural(1, { one: "file", other: "files" });                   // "1 file"
str.plural(1234, { one: "item", other: "items" });                // "1,234 items"
str.plural(0, { zero: "no files", one: "file", other: "files" }); // "no files"
str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" }); // "0 fichier"
```

The language is `nc.config.get().locale` unless `locale` is passed ([Configuration](/start/configuration/)). The forms are `zero`, `one`, `two`, `few`, `many` and `other`.

## Comparing

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install"
str.similarity("hello", "hallo");                       // 0.8
str.levenshtein("kitten", "sitting");                   // 3
["file10", "file2", "File1"].sort(str.compare);         // ["File1", "file2", "file10"]
```

`compare` sorts numbers in natural order and accents in their place.

## Other functions

| Function | Example | Result |
| --- | --- | --- |
| `mask` | `str.mask("4242424242424242")` | `"************4242"` |
| `chunk` | `str.chunk("abcdef", 2)` | `["ab", "cd", "ef"]` |
| `wrap` | `str.wrap(text, 80)` | Lines of at most 80 characters |
| `indent` | `str.indent("a\nb", "> ")` | `"> a\n> b"` |
| `between` | `str.between("Hello [world]!", "[", "]")` | `"world"` |
| `splitOnce` | `str.splitOnce("key=value=more", "=")` | `["key", "value=more"]` |
| `lines` | `str.lines("a\r\nb")` | `["a", "b"]` |
| `count` | `str.count("banana", "an")` | `2` |
| `initials` | `str.initials("Ada Lovelace")` | `"AL"` |
| `byteLength` | `str.byteLength("😀")` | `4` |
| `ensurePrefix`, `ensureSuffix` | `str.ensurePrefix("example.com", "https://")` | `"https://example.com"` |
| `removePrefix`, `removeSuffix` | `str.removePrefix("v1.2.0", "v")` | `"1.2.0"` |
| `random` | `str.random(12)` | Not for secrets: use `nc.id.token()` |
