---
title: "Chaînes de caractères"
description: "`nc.str` : conversion de casse, slugs, troncature, gabarits, pluriels et recherche approximative. Les longueurs sont comptées en caractères tels qu'on les voit."
---

```js
const { str } = require("@ix-xs/node-comfort");
```

Chaque fonction accepte n'importe quelle valeur, convertie avec `String()`, et renvoie une nouvelle chaîne.

## Caractères

JavaScript compte des unités de code UTF-16 : `"👨‍👩‍👧".length` vaut 8. Ces fonctions comptent ce qui s'affiche :

```js
str.length("👨‍👩‍👧");               // 1
str.truncate("Hello 👋🏽 world", 8); // "Hello 👋🏽…"
str.reverse("añ👍🏽");               // "👍🏽ña"
str.padStart("👍🏽", 3, ".");        // "..👍🏽"
```

| Comptent les caractères | Compte les octets |
| --- | --- |
| `length`, `truncate`, `chunk`, `padStart`, `padEnd`, `center`, `reverse`, `wrap`, `mask` | `byteLength` (UTF-8) |

## Casse

```js
str.camelCase("user_first-name");        // "userFirstName"
str.humanize("createdAt");               // "Created at"
str.sentenceCase("hELLO. how ARE you?"); // "Hello. How are you?"
str.words("helloWorld-foo_bar");         // ["hello", "World", "foo", "bar"]
```

| Fonction | `"helloWorld"` donne |
| --- | --- |
| `camelCase` | `"helloWorld"` |
| `pascalCase` | `"HelloWorld"` |
| `snakeCase` | `"hello_world"` |
| `kebabCase` | `"hello-world"` |
| `constantCase` | `"HELLO_WORLD"` |
| `dotCase` | `"hello.world"` |
| `titleCase` | `"HelloWorld"` : ne découpe que sur les espaces, `"the quick fox"` donne `"The Quick Fox"` |
| `humanize` | `"Hello world"` |
| `capitalize` | `"Helloworld"` : première lettre en majuscule, le reste en minuscules |
| `upperFirst` | `"HelloWorld"` : première lettre en majuscule, le reste inchangé |
| `lowerFirst` | `"helloWorld"` |

`humanize` garde les sigles (`"userID"` donne `"User ID"`) ; un nom tout en capitales n'en a aucun à distinguer (`"API_KEY"` donne `"Api key"`).

## Tronquer et compléter

```js
str.truncate("The quick brown fox", 12);                  // "The quick b…"
str.truncate("The quick brown fox", 12, { words: true }); // "The quick…"
str.truncate("src/components/forms/LoginForm.jsx", 20, { position: "middle" }); // "src/compon…nForm.jsx"
str.center("hi", 7, "*");                                 // "**hi***"
```

| Option de `truncate` | Par défaut | |
| --- | --- | --- |
| `omission` | `"…"` | Comptée dans la longueur |
| `words` | `false` | Ne coupe jamais un mot en deux |
| `position` | `"end"` | `"start"`, `"middle"` ou `"end"` |

## Slugs et nettoyage

```js
str.slugify("Héllo, Wörld!");                       // "hello-world"
str.slugify("Crème Brûlée", { separator: "_" });    // "creme_brulee"
str.deburr("Straße à Zürich");                      // "Strasse a Zurich"
str.squish("  hello \n\t world  ");                 // "hello world"
str.stripTags("<p>Hello <b>world</b></p>");         // "Hello world"
str.escapeHTML('<a href="x">Tom & Jerry</a>');      // '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;'
```

| Fonction | Rôle |
| --- | --- |
| `slugify(text, { separator, lower, maxLength })` | Un morceau d'URL |
| `deburr` | Retire les accents |
| `squish` | Réduit les espaces et rogne les bords |
| `stripTags` | Retire les balises HTML. Ce n'est pas un assainisseur : utilisez `escapeHTML` pour un texte non fiable |
| `escapeHTML`, `unescapeHTML` | `&`, `<`, `>`, `"`, `'` et retour ; entités numériques et entités nommées courantes |
| `escapeRegExp` | Un texte à chercher tel quel dans une `RegExp` |

## Gabarits

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
// "Hi Jo, you have 3 messages"
str.template("{user.name} ({user.role})", { user: { name: "Ada", role: "admin" } }); // "Ada (admin)"
str.template("Hi {name}", {}, { fallback: "there" });                                // "Hi there"
str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" });       // "Hello Jo"
```

Une valeur absente reste telle quelle, sauf si `fallback` est défini. Les propriétés héritées (`constructor`, `toString`) comptent comme absentes : un gabarit écrit par un utilisateur ne peut pas les atteindre.

`dedent` est une étiquette de gabarit qui retire l'indentation d'un littéral sur plusieurs lignes :

```js
const sql = str.dedent`
  SELECT *
    FROM users
`;
// "SELECT *\n  FROM users"
```

## Pluriels

`plural` suit les règles de la langue (`Intl.PluralRules`) et place le nombre mis en forme devant :

```js
str.plural(1, { one: "file", other: "files" });                   // "1 file"
str.plural(1234, { one: "item", other: "items" });                // "1,234 items"
str.plural(0, { zero: "no files", one: "file", other: "files" }); // "no files"
str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" }); // "0 fichier"
```

La langue est `nc.config.get().locale`, sauf si `locale` est passé ([Configuration](/start/configuration/)). Les formes sont `zero`, `one`, `two`, `few`, `many` et `other`.

## Comparer

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install"
str.similarity("hello", "hallo");                       // 0.8
str.levenshtein("kitten", "sitting");                   // 3
["file10", "file2", "File1"].sort(str.compare);         // ["File1", "file2", "file10"]
```

`compare` trie les nombres dans l'ordre naturel et les accents à leur place.

## Autres fonctions

| Fonction | Exemple | Résultat |
| --- | --- | --- |
| `mask` | `str.mask("4242424242424242")` | `"************4242"` |
| `chunk` | `str.chunk("abcdef", 2)` | `["ab", "cd", "ef"]` |
| `wrap` | `str.wrap(text, 80)` | Des lignes de 80 caractères au plus |
| `indent` | `str.indent("a\nb", "> ")` | `"> a\n> b"` |
| `between` | `str.between("Hello [world]!", "[", "]")` | `"world"` |
| `splitOnce` | `str.splitOnce("key=value=more", "=")` | `["key", "value=more"]` |
| `lines` | `str.lines("a\r\nb")` | `["a", "b"]` |
| `count` | `str.count("banana", "an")` | `2` |
| `initials` | `str.initials("Ada Lovelace")` | `"AL"` |
| `byteLength` | `str.byteLength("😀")` | `4` |
| `ensurePrefix`, `ensureSuffix` | `str.ensurePrefix("example.com", "https://")` | `"https://example.com"` |
| `removePrefix`, `removeSuffix` | `str.removePrefix("v1.2.0", "v")` | `"1.2.0"` |
| `random` | `str.random(12)` | Pas pour des secrets : utilisez `nc.id.token()` |
