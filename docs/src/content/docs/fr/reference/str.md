---
title: "nc.str"
description: "Utilitaires pour les chaînes : conversion de casse, slugs, troncature, gabarits, retour à la ligne, correspondance approximative, pluriels. Rien n'est modifié, n'importe quelle valeur est acceptée, et les longueurs sont comptées comme vous les voyez : 👨‍👩‍👧 compte donc pour un seul caractère et n'est jamais coupé en deux."
sidebar:
  label: "str"
  order: 7
---

```js
const { str } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const str = require("@ix-xs/node-comfort/str");
```

Cette page liste tout ce que contient `nc.str`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/str/).

```js
str.slugify("Héllo, Wörld!");                    // "hello-world"
str.camelCase("user_first-name");                // "userFirstName"
str.plural(3, { one: "file", other: "files" }); // "3 files"
```

## capitalize

```ts
capitalize(input: unknown): string
```

Met le premier caractère en majuscule et le reste en minuscules.

```js
str.capitalize("hELLO wORLD"); // "Hello world"
```

## upperFirst

```ts
upperFirst(input: unknown): string
```

Met le premier caractère en majuscule et laisse le reste tel quel.

```js
str.upperFirst("userName"); // "UserName"
```

## lowerFirst

```ts
lowerFirst(input: unknown): string
```

Met le premier caractère en minuscule et laisse le reste tel quel.

```js
str.lowerFirst("UserName"); // "userName"
```

## humanize

```ts
humanize(input: unknown): string
```

Transforme un identifiant en un libellé lisible. Les acronymes restent tels quels.

```js
str.humanize("user_first_name"); // "User first name"
str.humanize("createdAt");       // "Created at"
str.humanize("userID");          // "User ID"
```

## titleCase

```ts
titleCase(input: unknown): string
```

Met la première lettre de chaque mot en majuscule et laisse le reste tel quel.

```js
str.titleCase("the quick brown fox"); // "The Quick Brown Fox"
str.titleCase("élodie o'neil");       // "Élodie O'neil"
```

## sentenceCase

```ts
sentenceCase(input: unknown): string
```

Met tout en minuscules, puis une majuscule au début de chaque phrase.

```js
str.sentenceCase("hELLO WORLD. how ARE you?"); // "Hello world. How are you?"
```

## camelCase

```ts
camelCase(input: unknown): string
```

Convertit en `camelCase`.

```js
str.camelCase("user_first-name"); // "userFirstName"
str.camelCase("XMLHttpRequest");  // "xmlHttpRequest"
```

## pascalCase

```ts
pascalCase(input: unknown): string
```

Convertit en `PascalCase`.

```js
str.pascalCase("hello world"); // "HelloWorld"
```

## snakeCase

```ts
snakeCase(input: unknown): string
```

Convertit en `snake_case`.

```js
str.snakeCase("helloWorld"); // "hello_world"
```

## kebabCase

```ts
kebabCase(input: unknown): string
```

Convertit en `kebab-case`.

```js
str.kebabCase("helloWorld"); // "hello-world"
```

## constantCase

```ts
constantCase(input: unknown): string
```

Convertit en `CONSTANT_CASE`.

```js
str.constantCase("helloWorld"); // "HELLO_WORLD"
```

## dotCase

```ts
dotCase(input: unknown): string
```

Convertit en `dot.case`.

```js
str.dotCase("userFirstName"); // "user.first.name"
```

## words

```ts
words(input: unknown): string[]
```

Découpe un texte en mots. Comprend camelCase, snake_case, kebab-case, les points, les espaces et la ponctuation.

```js
str.words("helloWorld-foo_bar"); // ["hello", "World", "foo", "bar"]
```

## deburr

```ts
deburr(input: unknown): string
```

Retire les accents (`é` devient `e`) et développe les lettres latines spéciales (`ß` devient `ss`, `æ` devient `ae`).

```js
str.deburr("Crème brûlée"); // "Creme brulee"
str.deburr("Straße");       // "Strasse"
```

## slugify

```ts
slugify(input: unknown, options?: SlugifyOptions): string
```

Transforme un texte en slug d'URL : sans accents, en minuscules, les mots reliés par des tirets.

**Renvoie** `string` : Le slug, éventuellement vide.

```js
str.slugify("Héllo, World!");                      // "hello-world"
str.slugify("Crème Brûlée", { separator: "_" });   // "creme_brulee"
str.slugify("A very long title", { maxLength: 8 }); // "a-very"
```

## squish

```ts
squish(input: unknown): string
```

Réduit chaque suite d'espaces à un seul espace et retire les espaces au début et à la fin.

```js
str.squish("  hello \n\t world  "); // "hello world"
```

## stripTags

```ts
stripTags(input: unknown): string
```

Retire les balises HTML et garde le texte. Ce n'est pas un outil d'assainissement : pour afficher du texte non fiable dans du HTML, utilisez `escapeHTML()`.

```js
str.stripTags("<p>Hello <b>world</b></p>"); // "Hello world"
```

## escapeHTML

```ts
escapeHTML(input: unknown): string
```

Échappe `& < > " '` pour que le texte soit sûr dans du contenu et des attributs HTML.

```js
str.escapeHTML('<a href="x">Tom & Jerry</a>');
// "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;"
```

## unescapeHTML

```ts
unescapeHTML(input: unknown): string
```

Décode les entités HTML : les entités nommées comme `&amp;` et `&nbsp;`, et les entités numériques comme `&#233;`.

```js
str.unescapeHTML("Tom &amp; Jerry &#x1F600;"); // "Tom & Jerry 😀"
```

## escapeRegExp

```ts
escapeRegExp(input: unknown): string
```

Échappe les caractères spéciaux des expressions régulières pour que le texte soit recherché littéralement.

```js
new RegExp(str.escapeRegExp("1+1=2?")).test("1+1=2?"); // true
```

## length

```ts
length(input: unknown): number
```

Compte les caractères tels que vous les voyez. Contrairement à `.length`, un emoji ou une lettre accentuée compte pour un.

```js
"👨‍👩‍👧".length;         // 8
str.length("👨‍👩‍👧");     // 1
```

## byteLength

```ts
byteLength(input: unknown, encoding?: BufferEncoding): number
```

Taille du texte en octets une fois encodé, en UTF-8 par défaut. Utile quand une limite s'exprime en octets, comme une colonne de base de données ou un en-tête HTTP.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `encoding?` | `BufferEncoding` | Par défaut : `"utf8"`. |

```js
str.byteLength("é");  // 2
str.byteLength("😀"); // 4
```

## count

```ts
count(input: unknown, search: string): number
```

Compte le nombre d'occurrences de `search`, sans chevauchement.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `search` | `string` | Une chaîne vide donne `0`. |

```js
str.count("banana", "a"); // 3
str.count("aaaa", "aa");  // 2
```

## truncate

```ts
truncate(input: unknown, length: number, options?: TruncateOptions): string
```

Raccourcit un texte à `length` caractères tels que vous les voyez, en terminant par `…` s'il est coupé.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` | Longueur maximale, omission comprise. |
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

Découpe un texte en morceaux de `size` caractères tels que vous les voyez. Le dernier peut être plus court.

```js
str.chunk("4242424242424242", 4).join(" "); // "4242 4242 4242 4242"
```

## between

```ts
between(input: unknown, start: string, end: string): string | undefined
```

Renvoie le texte situé entre `start` et le prochain `end`, ou `undefined` si un marqueur est absent.

```js
str.between("Hello [world]!", "[", "]"); // "world"
```

## splitOnce

```ts
splitOnce(input: unknown, separator: string): [string, string | undefined]
```

Découpe uniquement à la première occurrence de `separator`.

```js
str.splitOnce("key=value=more", "="); // ["key", "value=more"]
str.splitOnce("novalue", "=");        // ["novalue", undefined]
```

## lines

```ts
lines(input: unknown): string[]
```

Découpe un texte en lignes, quelles que soient les fins de ligne.

```js
str.lines("a\r\nb\nc"); // ["a", "b", "c"]
```

## padStart

```ts
padStart(input: unknown, length: number, char?: string): string
```

Complète le début jusqu'à ce que le texte fasse `length` caractères.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Par défaut : `" "`. |

```js
str.padStart("7", 3, "0"); // "007"
```

## padEnd

```ts
padEnd(input: unknown, length: number, char?: string): string
```

Complète la fin jusqu'à ce que le texte fasse `length` caractères.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Par défaut : `" "`. |

```js
str.padEnd("ab", 5, "."); // "ab..."
```

## center

```ts
center(input: unknown, length: number, char?: string): string
```

Centre un texte sur `length` caractères. Un reste impair va à droite.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `length` | `number` |  |
| `char?` | `string` | Par défaut : `" "`. |

```js
str.center("hi", 7, "*"); // "**hi***"
```

## indent

```ts
indent(input: unknown, prefix?: string | number): string
```

Indente chaque ligne non vide.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `prefix?` | `number \| string` | Un nombre d'espaces, ou le préfixe lui-même. Par défaut : `2`. |

```js
str.indent("a\nb", 2);    // "  a\n  b"
str.indent("a\nb", "> "); // "> a\n> b"
```

## dedent

```ts
dedent(input: unknown, ...values: unknown[]): string
```

Retire l'indentation commune à toutes les lignes, ainsi que la première et la dernière ligne quand elles sont vides. Fonctionne comme étiquette de gabarit : les chaînes multilignes peuvent donc suivre l'indentation de votre code.

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

Renvoie le texte à la ligne pour qu'aucune ligne ne dépasse `width` caractères tels que vous les voyez. Les sauts de ligne existants sont conservés.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `options?` | [`WrapOptions`](#wrapoptions)` \| number` | Les options, ou simplement la largeur. |

```js
str.wrap("The quick brown fox jumps over the lazy dog", 16);
// "The quick brown\nfox jumps over\nthe lazy dog"
```

## reverse

```ts
reverse(input: unknown): string
```

Inverse un texte sans casser les emojis ni les accents.

```js
str.reverse("añ👍🏽"); // "👍🏽ña"
```

## mask

```ts
mask(input: unknown, options?: MaskOptions): string
```

Masque une partie d'une chaîne, comme un numéro de carte ou un token.

```js
str.mask("4242424242424242");                           // "************4242"
str.mask("4242 4242 4242 4242", { keepSpaces: true });   // "**** **** **** 4242"
str.mask("secret-token", { start: 2, end: 2, char: "•" }); // "se••••••••en"
```

## initials

```ts
initials(input: unknown, max?: number): string
```

Les initiales d'un nom, en majuscules.

| Paramètre | Type | Description |
| --- | --- | --- |
| `input` | `unknown` |  |
| `max?` | `number` | Nombre maximal de lettres. Par défaut : `2`. |

```js
str.initials("Ada Lovelace");       // "AL"
str.initials("jean-luc picard", 3); // "JLP"
```

## plural

```ts
plural(value: number, forms: PluralForms, options?: PluralOptions): string
```

Choisit le bon pluriel pour un nombre, selon les règles de la langue, et place le nombre formaté devant.

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

Remplace les `{placeholders}` par des valeurs. Les chemins pointés comme `{user.name}` fonctionnent, et les valeurs manquantes sont laissées telles quelles sauf si vous donnez un `fallback`.

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

Ajoute `prefix`, sauf si le texte commence déjà par celui-ci.

```js
str.ensurePrefix("example.com", "https://"); // "https://example.com"
```

## ensureSuffix

```ts
ensureSuffix(input: unknown, suffix: string): string
```

Ajoute `suffix`, sauf si le texte se termine déjà par celui-ci.

```js
str.ensureSuffix("path/to", "/"); // "path/to/"
```

## removePrefix

```ts
removePrefix(input: unknown, prefix: string): string
```

Retire `prefix` si le texte commence par celui-ci.

```js
str.removePrefix("https://example.com", "https://"); // "example.com"
```

## removeSuffix

```ts
removeSuffix(input: unknown, suffix: string): string
```

Retire `suffix` si le texte se termine par celui-ci.

```js
str.removeSuffix("report.pdf", ".pdf"); // "report"
```

## compare

```ts
compare(a: unknown, b: unknown, options?: CompareOptions): number
```

Compare deux chaînes comme une personne les trierait : les nombres dans l'ordre naturel et les accents au bon endroit. Passez-la directement à `sort()`.

**Renvoie** `number` : Négatif si `a` vient en premier, positif si c'est `b`, `0` en cas d'égalité.

```js
["file10", "file2", "File1"].sort(str.compare); // ["File1", "file2", "file10"]
str.compare("a", "A", { sensitivity: "base" }); // 0
```

## levenshtein

```ts
levenshtein(a: unknown, b: unknown): number
```

Le nombre de modifications d'un seul caractère nécessaires pour transformer `a` en `b`.

```js
str.levenshtein("kitten", "sitting"); // 3
```

## similarity

```ts
similarity(a: unknown, b: unknown): number
```

Le degré de ressemblance entre deux chaînes, de `0` (rien en commun) à `1` (identiques).

```js
str.similarity("hello", "hallo"); // 0.8
```

## closest

```ts
closest(input: unknown, candidates: Iterable<string>, options?: ClosestOptions): string | undefined
```

Trouve le candidat le plus proche de `input`. Conçu pour les suggestions du type « Vouliez-vous dire... ? ».

**Renvoie** `string | undefined` : `undefined` quand rien n'est assez proche.

```js
str.closest("instal", ["install", "uninstall", "list"]); // "install"
str.closest("xyz", ["install", "list"]);                 // undefined
```

## random

```ts
random(size?: number, options?: string | RandomStringOptions): string
```

Une chaîne aléatoire. Elle repose sur `Math.random`, ne l'utilisez donc pas pour des secrets : `nc.id.token()` et `nc.id.nano()` sont faits pour cela.

| Paramètre | Type | Description |
| --- | --- | --- |
| `size?` | `number` | Par défaut : `16`. |
| `options?` | [`RandomStringOptions`](#randomstringoptions)` \| string` | Les options, ou directement le jeu de caractères. |

```js
str.random();                                // "aZ3kP9qL0xYb7TcW"
str.random(6, { charset: "0123456789" });    // "402917"
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { ClosestOptions } from "@ix-xs/node-comfort"`.

### ClosestOptions

Options de `closest()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `threshold?` | `number` | Similarité minimale (de 0 à 1) pour accepter une correspondance. Par défaut : `0.4`. |
| `caseSensitive?` | `boolean` | Tient compte de la casse. |

### CompareOptions

Options de `compare()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue utilisée pour l'ordre alphabétique. Par défaut : celle du système. |
| `numeric?` | `boolean` | Trie les nombres naturellement, `"file2"` avant `"file10"`. Par défaut : `true`. |
| `sensitivity?` | `"base" \| "accent" \| "case" \| "variant"` | Les différences qui comptent. `"base"` ignore les accents et la casse. Par défaut : `"variant"`. |

### MaskOptions

Options de `mask()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `start?` | `number` | Caractères laissés visibles au début. Par défaut : `0`. |
| `end?` | `number` | Caractères laissés visibles à la fin. Par défaut : `4`. |
| `char?` | `string` | Caractère de masquage. Par défaut : `"*"`. |
| `keepSpaces?` | `boolean` | Laisse les espaces et les tirets visibles, pratique pour les numéros de carte. |

### PluralForms

Les formes du mot pour `plural()`. Seule `other` est obligatoire ; ajoutez les autres quand votre langue en a besoin.

| Propriété | Type | Description |
| --- | --- | --- |
| `other` | `string` | Le pluriel général, comme `"files"`. |
| `zero?` | `string` | Utilisée pour `0` dans toutes les langues, comme `"no files"`. |
| `one?` | `string` | Le singulier, comme `"file"`. Le français l'utilise aussi pour 0. |
| `two?` | `string` | Forme du duel (arabe, hébreu, slovène...). |
| `few?` | `string` | Forme « quelques » (polonais, tchèque, russe...). |
| `many?` | `string` | Forme « beaucoup » (polonais, russe, arabe...). |

### PluralOptions

Options de `plural()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue dont les règles de pluriel s'appliquent. Par défaut : `"en"`. |
| `includeCount?` | `boolean` | Place le nombre formaté devant le mot. Par défaut : `true`. |
| `ordinal?` | `boolean` | Utilise les règles des ordinaux (1st, 2nd, 3rd). |

### RandomStringOptions

Options de `random()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `charset?` | `string` | Caractères parmi lesquels piocher. Par défaut : les lettres et les chiffres. |

### SlugifyOptions

Options de `slugify()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `separator?` | `string` | Placé entre les mots. Par défaut : `"-"`. |
| `lower?` | `boolean` | Met le résultat en minuscules. Par défaut : `true`. |
| `maxLength?` | `number` | Longueur maximale, avec une coupe à la limite d'un mot quand c'est possible. |

### TemplateOptions

Options de `template()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `open?` | `string` | Délimiteur ouvrant. Par défaut : `"{"`. |
| `close?` | `string` | Délimiteur fermant. Par défaut : `"}"`. |
| `fallback?` | `string` | Utilisée pour les valeurs manquantes. Sans elle, leurs emplacements restent tels quels. |

### TruncateOptions

Options de `truncate()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `omission?` | `string` | Ajouté là où le texte est coupé, et compté dans la longueur. Par défaut : `"…"`. |
| `words?` | `boolean` | Coupe à l'espace précédent plutôt qu'au milieu d'un mot, quand c'est la fin qui est coupée. |
| `position?` | `"end" \| "middle" \| "start"` | L'endroit où le texte est coupé. `"middle"` garde les deux extrémités, ce qui convient aux chemins et aux identifiants. Par défaut : `"end"`. |

### WrapOptions

Options de `wrap()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `width?` | `number` | Nombre maximal de caractères, tels que vous les voyez, par ligne. Par défaut : `80`. |
| `indent?` | `string` | Ajouté au début de chaque ligne. |
| `cut?` | `boolean` | Coupe les mots plus longs que `width` au lieu de les laisser dépasser. |
| `newline?` | `string` | Séparateur de lignes. Par défaut : `"\n"`. |
