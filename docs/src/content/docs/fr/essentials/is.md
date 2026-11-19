---
title: "Vérifications et assertions"
description: "`nc.is` répond par un booléen à « cette valeur est-elle de ce type ou de ce format ? », pour n'importe quelle valeur, sans lever d'erreur. `nc.assert` lève une `AssertionError` quand une condition n'est pas remplie."
---

```js
const { is, assert } = require("@ix-xs/node-comfort");
```

```js
is.email("ada@example.com"); // true
is.plainObject([]);          // false
is.empty({});                // true
```

## Gardes de type

La plupart des vérifications sont des gardes de type TypeScript, que l'éditeur comprend aussi en JavaScript :

```ts
function handle(input: unknown) {
  if (is.string(input)) return input.toUpperCase();
  if (is.arrayOf(input, is.number)) return input.reduce((a, b) => a + b, 0);
}

const ids = [1, null, 2, undefined].filter(is.defined); // [1, 2], typé number[]
```

## Types

| Vérification | Vraie pour |
| --- | --- |
| `string`, `boolean`, `symbol`, `bigInt` | Ce type primitif |
| `undefined`, `null` | Cette valeur |
| `nil` | `null` ou `undefined` |
| `defined` | Tout sauf `undefined` |
| `primitive` | Une chaîne, un nombre, un booléen, un symbole, un bigint, `null` ou `undefined` |
| `array`, `arrayOf(value, guard)` | Un tableau ; chaque élément passe `guard` |
| `function`, `asyncFunction`, `generatorFunction` | Ce genre de fonction |
| `class` | Une fonction écrite avec `class` |
| `generator`, `iterable`, `asyncIterable` | Ce protocole |
| `promise` | Un objet avec `then` |
| `date`, `validDate` | Une `Date` ; une `Date` qui contient un vrai instant |
| `regExp`, `error`, `buffer`, `typedArray` | Cet objet |
| `map`, `set`, `weakMap`, `weakSet` | Cette collection |
| `oneOf(value, allowed)` | Une des valeurs de `allowed` |

## Nombres

| Vérification | Accepte | Refuse |
| --- | --- | --- |
| `number` | `42`, `Infinity` | `NaN`, `"42"` |
| `finite` | `42` | `Infinity`, `NaN`, `"42"` |
| `integer`, `safeInteger` | `3` ; jusqu'à `2 ** 53 - 1` | `3.5` ; `2 ** 53` |
| `float` | `3.5` | `3` |
| `positive`, `negative` | `1` ; `-1` | `0` |
| `numeric` | `42`, `"4.2e3"`, `" 12 "` | `"12px"`, `""` |

## Objets et vide

| Vérification | Accepte | Refuse |
| --- | --- | --- |
| `object` | `{}`, `[]`, `new Date()` | `null` |
| `plainObject` | `{}`, `Object.create(null)` | `[]`, `new Date()`, instances de classes |
| `empty` | `""`, `[]`, `{}`, une Map ou un Set vide, `null`, `undefined` | `" "`, `0`, `new Date()` |
| `blank` | `null`, `""`, `"  \n"` | `" a "` |

`empty` concerne `null`, `undefined` et les conteneurs : les nombres, booléens, fonctions, dates, expressions régulières et erreurs ne sont jamais vides.

## Formats

```js
is.email("josé@exemple.fr");                          // true
is.url("ftp://example.com");                          // false : http et https par défaut
is.url("ftp://example.com", { protocols: ["ftp:"] }); // true
is.uuid(id, { version: 7 });
is.ip("192.168.0.1", 6);                              // false
is.isoDate("2023-02-29");                             // false, ce jour n'existe pas
is.hostname("localhost", { requireTld: true });       // false
is.locale("en_US");                                   // false, écrivez "en-US"
```

| Vérification | Accepte | Options |
| --- | --- | --- |
| `email` | Les adresses internationales | |
| `url` | Les URL absolues | `protocols` (`["http:", "https:"]`), `requireTld` |
| `hostname` | `api.example.com`, `localhost`. Pas une IP | `requireTld` |
| `ip`, `ipv4`, `ipv6` | Les adresses IP | `ip(value, 4 \| 6)` |
| `port` | De 0 à 65535, en nombre ou en texte | |
| `macAddress` | `00:1B:44:11:3A:B7` | |
| `uuid` | Versions 1 à 8, nil et max | `version` |
| `ulid`, `objectId` | Un ULID ; un identifiant MongoDB | |
| `jwt` | La forme d'un JWT. Vérifiez-le avec `nc.crypto.verifyJWT()` | |
| `json` | Un texte qui s'analyse en JSON | |
| `isoDate` | Les dates ISO 8601 qui existent | |
| `semver` | `2.0.0`, `v2.0.0-rc.1` | |
| `hex`, `hexColor` | `ff00` ; `#f80`, `#ff8800` | |
| `base64` | Du Base64 | `urlSafe` |
| `dataUrl` | Les URL `data:` | `types`, comme `["image/png"]` |
| `mimeType` | `text/html; charset=utf-8` | |
| `slug` | `my-first-post` | |
| `alpha`, `alphanumeric`, `ascii` | Des lettres ; lettres et chiffres ; ASCII seulement | |
| `creditCard` | Numéros de carte, somme de Luhn, espaces permis | |
| `iban` | Format et clé de contrôle, espaces permis | |
| `e164` | Numéros de téléphone comme `+33612345678` | |
| `timeZone` | Un fuseau que ce Node.js connaît, comme `Europe/Paris` | |
| `locale` | Une étiquette BCP 47, comme `pt-BR` | |
| `cron` | Ce que `nc.time.cron()` comprend | |

Pour des objets entiers avec de nombreuses règles et des messages, utilisez [`nc.schema`](/data/schema/).

## Assertions

```js
const user = users.find((u) => u.id === id);
assert(user, `User ${id} not found`); // AssertionError: User 42 not found
user.name;                            // plus de « possibly undefined » ici

assert.type(config.port, is.integer, "port must be an integer");
assert(ready, () => describe(state)); // le message n'est construit qu'en cas d'échec
```

| Fonction | Lève une `AssertionError` (`code` `ERR_ASSERTION`) quand |
| --- | --- |
| `assert(condition, message?)` | `condition` est fausse. Le message par défaut est `"Assertion failed"` |
| `assert.type(value, guard, message?)` | `guard(value)` est faux. Ensuite, `value` a le type gardé |

Le message peut être une fonction qui le construit. Voir [Erreurs](/basics/errors/).

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.isX()`, `nc.checker.isX()` | `nc.is.x()` : le nom sans `is`, première lettre en minuscule |
| `nc.isURL()`, `nc.isUUID()`, `nc.isJSON()`, `nc.isIP()`, `nc.isIPv4()`, `nc.isIPv6()`, `nc.isJWT()`, `nc.isIBAN()`, `nc.isULID()`, `nc.isASCII()` | `nc.is.url()`, `nc.is.uuid()`, `nc.is.json()`, `nc.is.ip()`, `nc.is.ipv4()`, `nc.is.ipv6()`, `nc.is.jwt()`, `nc.is.iban()`, `nc.is.ulid()`, `nc.is.ascii()` |
| `nc.isISODate()`, `nc.isMACAddress()`, `nc.isDataURL()`, `nc.isE164()` | `nc.is.isoDate()`, `nc.is.macAddress()`, `nc.is.dataUrl()`, `nc.is.e164()` |
| `nc.checker.assert()` | `nc.assert()` |
| `nc.assertType()`, `nc.checker.assertType()` | `nc.assert.type()` |
| `nc.checker` | `nc.is` et `nc.assert` |

`nc.assert` lui-même garde son nom. Les anciens noms fonctionnent encore en 3.0, avertissent une fois et disparaissent en 4.0 : voir [Passer à la 3.0](/help/upgrade-3-0/).
