---
title: "Chaînes de caractères"
description: "`nc.str` réunit les fonctions de chaînes que vous réécrivez sans cesse : conversion de casse, slugs, troncature, gabarits, retour à la ligne, recherche approximative et pluriels."
sidebar:
  order: 1
---

```js
const { str } = require("@ix-xs/node-comfort");

str.slugify("Héllo, Wörld!");     // "hello-world"
str.camelCase("user_first-name"); // "userFirstName"
str.truncate("The quick brown fox", 12); // "The quick b…"
```

Deux choses valent pour toutes les fonctions : chacune accepte n'importe quelle valeur (convertie avec `String()`) et ne modifie jamais ce qu'elle reçoit.

## Les caractères tels que vous les voyez

JavaScript compte des unités de code UTF-16 : `"👨‍👩‍👧".length` vaut donc 8. `nc.str` compte ce qu'une personne voit :

```js
str.length("👨‍👩‍👧");          // 1
str.truncate("Hello 👋🏽 world", 8); // "Hello 👋🏽…", là où .slice() casserait l'emoji
str.reverse("añ👍🏽");          // "👍🏽ña"
str.padStart("👍🏽", 3, ".");    // "..👍🏽", là où "👍🏽".padStart(3, ".") n'ajoute rien
```

`length`, `truncate`, `chunk`, `padStart`, `padEnd`, `center`, `reverse`, `wrap` et `mask` comptent tous de cette façon.

## Changer la casse

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

Trois fonctions ne s'occupent que de la première lettre :

```js
str.capitalize("hELLO wORLD"); // "Hello world", le reste passe en minuscules
str.upperFirst("userName");    // "UserName", le reste n'est pas touché
str.lowerFirst("UserName");    // "userName"
```

`humanize` transforme un identifiant en libellé, pour un champ de formulaire ou un en-tête de tableau :

```js
str.humanize("user_first_name"); // "User first name"
str.humanize("createdAt");       // "Created at"
str.humanize("userID");          // "User ID"
```

Les acronymes à l'intérieur d'un nom sont conservés. Dans un nom écrit tout en capitales, rien ne permet de les distinguer : `API_KEY` donne donc `"Api key"`.

## Tronquer

```js
str.truncate("The quick brown fox", 12);                  // "The quick b…"
str.truncate("The quick brown fox", 12, { words: true }); // "The quick…", aucun mot coupé en deux
str.truncate("Hello world", 8, { omission: "..." });      // "Hello..."
```

La longueur que vous indiquez comprend la marque de coupure.

`position` indique où le texte est coupé. Couper au milieu garde les deux extrémités, ce qui convient aux chemins et aux identifiants :

```js
const file = "src/components/forms/LoginForm.jsx";

str.truncate(file, 20, { position: "middle" }); // "src/compon…nForm.jsx"
str.truncate(file, 20, { position: "start" });  // "…forms/LoginForm.jsx"
```

## Slugs et nettoyage

```js
str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
str.slugify("A very long title", { maxLength: 8 }); // "a-very"
str.deburr("Straße à Zürich");                      // "Strasse a Zurich"
str.squish("  hello \n\t world  ");                 // "hello world"
str.stripTags("<p>Hello <b>world</b></p>");         // "Hello world"
str.stripTags("a < b and c > d");                   // "a < b and c > d", un "<" devant un espace n'est pas une balise
str.escapeHTML('<a href="x">Tom & Jerry</a>');      // sans danger dans du HTML
str.unescapeHTML("Tom &amp; Jerry &#x1F600;");      // "Tom & Jerry 😀"
```

`stripTags()` n'est pas un outil d'assainissement. Pour afficher dans une page un texte qui n'est pas de confiance, utilisez `escapeHTML()`.

`unescapeHTML()` lit les entités numériques et les entités nommées courantes. Une entité qu'elle ne connaît pas, ou un nombre qui ne correspond à aucun caractère (`&#xD800;`, `&#99999999;`), reste telle quelle.

## Gabarits

```js
str.template("Hi {name}, you have {count} messages", { name: "Jo", count: 3 });
// "Hi Jo, you have 3 messages"
str.template("{user.name} ({user.role})", { user: { name: "Ada", role: "admin" } });
// "Ada (admin)"
str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" });
// "Hello Jo"
```

Les valeurs manquantes sont laissées telles quelles, sauf si vous définissez `fallback` :

```js
str.template("Hi {name}", {});                        // "Hi {name}"
str.template("Hi {name}", {}, { fallback: "there" }); // "Hi there"
```

Seules vos données sont lues. Ce dont tout objet hérite, comme `constructor` ou `toString`, compte comme manquant. Un gabarit écrit par un utilisateur ne peut donc pas y accéder :

```js
str.template("{constructor} {name}", { name: "Jo" }); // "{constructor} Jo"
```

`dedent` est une étiquette de gabarit qui retire l'indentation que votre code ajoute aux chaînes multilignes :

```js
const sql = str.dedent`
  SELECT *
    FROM users
   WHERE id = ${id}
`;
```

## Des pluriels dans toutes les langues

`plural()` suit les règles de chaque langue, grâce à `Intl.PluralRules`, et place devant le nombre mis en forme :

```js
str.plural(1, { one: "file", other: "files" });              // "1 file"
str.plural(1234, { one: "item", other: "items" });           // "1,234 items"
str.plural(0, { zero: "no files", one: "file", other: "files" }); // "no files"
str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" }); // "0 fichier"
```

Les langues qui ont davantage de formes, comme le polonais ou l'arabe, utilisent `two`, `few` et `many`.

## Recherche approximative

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install", pour un « Vouliez-vous dire... ? »
str.similarity("hello", "hallo");                       // 0.8
str.levenshtein("kitten", "sitting");                   // 3
["file10", "file2", "File1"].sort(str.compare);         // ["File1", "file2", "file10"]
```

`compare()` trie comme on s'y attend : les nombres dans l'ordre naturel, les accents à leur place.

## Tout le reste

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
str.random(12);                             // pas pour les secrets, voir nc.id.token()
```

La [référence de `nc.str`](/reference/str/) liste toutes les fonctions avec leurs options.
