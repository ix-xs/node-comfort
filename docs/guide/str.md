# Strings

`nc.str` has the string helpers you keep rewriting: case conversion, slugs, truncation, templates, wrapping, fuzzy matching and plurals.

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
```

`truncate`, `center`, `reverse`, `length`, `wrap` and `mask` all work this way.

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

## Slugs and cleanup

```js
str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
str.slugify("A very long title", { maxLength: 8 }); // "a-very"
str.deburr("Straße à Zürich");                      // "Strasse a Zurich"
str.squish("  hello \n\t world  ");                 // "hello world"
str.stripTags("<p>Hello <b>world</b></p>");         // "Hello world"
str.escapeHTML('<a href="x">Tom & Jerry</a>');      // safe to put in HTML
```

`stripTags()` isn't a sanitizer. To display untrusted text in a page, use `escapeHTML()`.

## Templates

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
str.template("{user.name} ({user.role})", { user: { name: "Ada", role: "admin" } });
str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" });
```

Missing values are left as they are, unless you set `fallback`.

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
str.mask("4242424242424242");           // "************4242"
str.wrap(longText, 80);
str.indent("a\nb", "> ");               // "> a\n> b"
str.between("Hello [world]!", "[", "]"); // "world"
str.splitOnce("key=value=more", "=");   // ["key", "value=more"]
str.initials("Ada Lovelace");           // "AL"
str.byteLength("😀");                   // 4
str.ensurePrefix("example.com", "https://");
str.random(12);                         // not for secrets, see nc.id.token()
```
