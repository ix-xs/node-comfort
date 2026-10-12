---
title: "Strings"
description: "`nc.str` has the string helpers you keep rewriting: case conversion, slugs, truncation, templates, wrapping, fuzzy matching and plurals."
sidebar:
  order: 1
---

```js
const { str } = require("@ix-xs/node-comfort");

str.slugify("Héllo, Wörld!");     // "hello-world"
str.camelCase("user_first-name"); // "userFirstName"
str.truncate("The quick brown fox", 12); // "The quick b…"
```

Two things hold for every function: it accepts any value (converted with `String()`), and it never changes its input.

## Characters as you see them

JavaScript counts UTF-16 code units, so `"👨‍👩‍👧".length` is 8. `nc.str` counts what a person sees:

```js
str.length("👨‍👩‍👧");          // 1
str.truncate("Hello 👋🏽 world", 8); // "Hello 👋🏽…", where .slice() would break the emoji
str.reverse("añ👍🏽");          // "👍🏽ña"
str.padStart("👍🏽", 3, ".");    // "..👍🏽", where "👍🏽".padStart(3, ".") adds nothing
```

`length`, `truncate`, `chunk`, `padStart`, `padEnd`, `center`, `reverse`, `wrap` and `mask` all count this way.

## Changing case

```js
str.camelCase("hello world");    // "helloWorld"
str.pascalCase("hello world");   // "HelloWorld"
str.snakeCase("helloWorld");     // "hello_world"
str.kebabCase("helloWorld");     // "hello-world"
str.constantCase("helloWorld");  // "HELLO_WORLD"
str.dotCase("helloWorld");       // "hello.world"
str.titleCase("the quick fox");  // "The Quick Fox"
str.sentenceCase("hELLO. how ARE you?"); // "Hello. How are you?"
str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
```

Three functions only look at the first letter:

```js
str.capitalize("hELLO wORLD"); // "Hello world", the rest is lowercased
str.upperFirst("userName");    // "UserName", the rest is left alone
str.lowerFirst("UserName");    // "userName"
```

`humanize` turns an identifier into a label, for a form field or a table header:

```js
str.humanize("user_first_name"); // "User first name"
str.humanize("createdAt");       // "Created at"
str.humanize("userID");          // "User ID"
```

Acronyms inside a name are kept. A name written all in capitals has none to tell apart, so `API_KEY` gives `"Api key"`.

## Truncating

```js
str.truncate("The quick brown fox", 12);                  // "The quick b…"
str.truncate("The quick brown fox", 12, { words: true }); // "The quick…", no word cut in half
str.truncate("Hello world", 8, { omission: "..." });      // "Hello..."
```

The length you give includes the omission mark.

`position` says where the text is cut. The middle keeps both ends, which suits paths and ids:

```js
const file = "src/components/forms/LoginForm.jsx";

str.truncate(file, 20, { position: "middle" }); // "src/compon…nForm.jsx"
str.truncate(file, 20, { position: "start" });  // "…forms/LoginForm.jsx"
```

## Slugs and cleanup

```js
str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
str.slugify("A very long title", { maxLength: 8 }); // "a-very"
str.deburr("Straße à Zürich");                      // "Strasse a Zurich"
str.squish("  hello \n\t world  ");                 // "hello world"
str.stripTags("<p>Hello <b>world</b></p>");         // "Hello world"
str.stripTags("a < b and c > d");                   // "a < b and c > d", a "<" before a space is not a tag
str.escapeHTML('<a href="x">Tom & Jerry</a>');      // safe to put in HTML
str.unescapeHTML("Tom &amp; Jerry &#x1F600;");      // "Tom & Jerry 😀"
```

`stripTags()` isn't a sanitizer. To display untrusted text in a page, use `escapeHTML()`.

`unescapeHTML()` reads numeric entities and the common named ones. An entity it doesn't know, or a number that isn't a character (`&#xD800;`, `&#99999999;`), stays as written.

## Templates

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
// "Hi Jo, you have 3 messages"
str.template("{user.name} ({user.role})", { user: { name: "Ada", role: "admin" } });
// "Ada (admin)"
str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" });
// "Hello Jo"
```

Missing values are left as they are, unless you set `fallback`:

```js
str.template("Hi {name}", {});                        // "Hi {name}"
str.template("Hi {name}", {}, { fallback: "there" }); // "Hi there"
```

Only your data is read. What every object inherits, like `constructor` or `toString`, counts as missing, so a template written by a user can't reach it:

```js
str.template("{constructor} {name}", { name: "Jo" }); // "{constructor} Jo"
```

`dedent` is a template tag that removes the indentation your code adds to multi-line strings:

```js
const sql = str.dedent`
  SELECT *
    FROM users
   WHERE id = ${id}
`;
```

## Plurals in any language

`plural()` follows each language's rules, through `Intl.PluralRules`, and puts the formatted count in front:

```js
str.plural(1, { one: "file", other: "files" });              // "1 file"
str.plural(1234, { one: "item", other: "items" });           // "1,234 items"
str.plural(0, { zero: "no files", one: "file", other: "files" }); // "no files"
str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" }); // "0 fichier"
```

Languages with more forms, like Polish or Arabic, use `two`, `few` and `many`.

## Fuzzy matching

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install", for "Did you mean...?"
str.similarity("hello", "hallo");                       // 0.8
str.levenshtein("kitten", "sitting");                   // 3
["file10", "file2", "File1"].sort(str.compare);         // ["File1", "file2", "file10"]
```

`compare()` sorts the way people expect: numbers in natural order, accents in the right place.

## Everything else

```js
str.mask("4242424242424242");               // "************4242"
str.chunk("4242424242424242", 4).join(" "); // "4242 4242 4242 4242"
str.padStart("7", 3, "0");                  // "007"
str.center("hi", 7, "*");                   // "**hi***"
str.wrap(longText, 80);
str.indent("a\nb", "> ");                   // "> a\n> b"
str.between("Hello [world]!", "[", "]");    // "world"
str.splitOnce("key=value=more", "=");       // ["key", "value=more"]
str.initials("Ada Lovelace");               // "AL"
str.byteLength("😀");                       // 4
str.ensurePrefix("example.com", "https://"); // "https://example.com"
str.random(12);                             // not for secrets, see nc.id.token()
```

The [`nc.str` reference](/reference/str/) lists every function with its options.
