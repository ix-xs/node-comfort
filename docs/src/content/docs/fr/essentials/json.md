---
title: "JSON"
description: "`nc.json` : `JSON.parse` avec une valeur de repli et des commentaires, `JSON.stringify` qui ne lève jamais d'erreur et gère les références circulaires, les bigints, les Map, les Set et les erreurs."
---

```js
const { json } = require("@ix-xs/node-comfort");
```

## Analyser

```js
json.parse('{"a":1}');                                // { a: 1 }
json.parse("oops", null);                             // null
json.parse("oops");                                   // lève une SyntaxError
json.parse('{ // a comment\n "a": 1, }', {}, { comments: true }); // { a: 1 }
json.parse(text, null, (key, value) => (key === "at" ? new Date(value) : value));
```

`parse(text, fallback?, options?)` :

| Argument | |
| --- | --- |
| `fallback` | Renvoyé quand `text` n'est pas du JSON valide. Dès qu'il est passé, même à `undefined`, il remplace la `SyntaxError` |
| `options.comments` | Accepte les commentaires et les virgules finales, comme `tsconfig.json` |
| `options.reviver` | Passé à `JSON.parse`. Une fonction en troisième argument est le reviver |

Une marque d'ordre des octets (BOM) en tête du texte est ignorée.

## Sérialiser

```js
json.stringify({ a: 1 });                                // '{\n    "a": 1\n}'
json.stringify({ id: 10n, tags: new Set(["a"]) }, 0);    // '{"id":"10","tags":["a"]}'
json.stringify({ m: new Map([["k", 1]]) }, 0);           // '{"m":{"k":1}}'
json.stringify({ a: [1] }, { spaces: 2 });               // '{\n  "a": [\n    1\n  ]\n}'

const loop = { name: "loop" };
loop.self = loop;
json.stringify(loop, 0);                                 // '{"name":"loop","self":"[Circular]"}'
```

`stringify(value, spaces = 4)` prend l'indentation, ou `{ spaces }`. `0` écrit une seule ligne. `nc.fs.writeJSON()` indente avec 2.

| Valeur | Écrite comme |
| --- | --- |
| Une référence circulaire | `"[Circular]"` |
| Un bigint | Une chaîne |
| Une `Map` | Un objet |
| Un `Set` | Un tableau |
| Une `Error` | `name`, `message`, ses propres champs (comme `code`), `cause` et `stack` |
| `undefined`, une fonction | `"undefined"` au premier niveau, omis dans un objet |

Quand un getter ou un `toJSON()` lève une erreur, le résultat est une description de la valeur, en chaîne JSON, au lieu d'une exception.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.JSONParse()`, `nc.utils.JSONParse()` | `nc.json.parse()` |
| `nc.JSONString()`, `nc.utils.JSONString()` | `nc.json.stringify()` |

`nc.json.parse()` accepte aussi `{ comments: true }`. Les anciens noms fonctionnent encore en 3.0, avertissent une fois et disparaissent en 4.0 : voir [Passer à la 3.0](/help/upgrade-3-0/).
