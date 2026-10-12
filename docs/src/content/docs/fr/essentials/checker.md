---
title: "Vérifications de type et validateurs"
description: "`nc.checker` répond à la question « quelle est cette valeur ? » sans surprise. Chaque fonction `isX` accepte n'importe quoi et ne lève jamais d'erreur. Elles sont aussi disponibles à la racine : `nc.isEmail()`."
sidebar:
  order: 3
---

```js
nc.isEmail("ada@example.com");  // true
nc.isPlainObject([]);           // false
nc.isEmpty({});                 // true
```

## Elles affinent les types

La plupart des vérifications sont des gardes de type TypeScript, que votre éditeur comprend aussi en JavaScript. Après la vérification, la variable a le bon type :

```ts
function handle(input: unknown) {
  if (nc.isString(input)) return input.toUpperCase();
  if (nc.isArrayOf(input, nc.isNumber)) return input.reduce((a, b) => a + b, 0);
}

const ids = [1, null, 2, undefined].filter(nc.isDefined); // number[]
```

## Choisir la bonne vérification

Quelques paires se confondent facilement :

| Vérification | Accepte | Rejette |
| --- | --- | --- |
| `isNumber` | `42`, `Infinity` | `NaN`, `"42"` |
| `isFinite` | `42` | `Infinity`, `NaN`, `"42"` |
| `isNumeric` | `42`, `"4.2e3"`, `" 12 "` | `"12px"`, `""` |
| `isObject` | `{}`, `[]`, `new Date()` | `null` |
| `isPlainObject` | `{}`, `Object.create(null)` | `[]`, `new Date()`, les instances de classe |
| `isEmpty` | `""`, `[]`, `{}`, une Map ou un Set vide, `null`, `undefined` | `" "`, `0`, `new Date()`, `/x/`, `new Error()` |
| `isBlank` | `null`, `""`, `"  \n"` | `" a "` |
| `isDate` | n'importe quelle `Date` | les chaînes |
| `isValidDate` | une `Date` qui contient un instant réel | `new Date("nope")` |

`isEmpty` concerne `null`, `undefined` et les conteneurs : les chaînes, les tableaux, les maps, les sets et les objets sans clé. Les nombres, les booléens, les fonctions, les dates, les expressions régulières et les erreurs ne sont jamais vides.

## Valider des entrées

Les formats courants sont couverts :

```js
nc.isEmail("josé@exemple.fr");                 // true, les adresses internationales sont acceptées
nc.isURL("https://example.com/a?b=1");         // http et https par défaut
nc.isURL("ftp://example.com", { protocols: ["ftp:"] });
nc.isUUID(id, { version: 7 });
nc.isIP("::1"); nc.isIPv4("192.168.0.1");
nc.isPort("8080");
nc.isSemver("v2.0.0-rc.1");
nc.isISODate("2024-02-29T10:00:00Z");          // vérifie aussi que la date existe
nc.isHexColor("#f80");
nc.isSlug("my-first-post");
nc.isCreditCard("4242 4242 4242 4242");        // somme de contrôle de Luhn
nc.isJWT(token);                               // la forme seulement, voir crypto.verifyJWT
nc.isOneOf(role, ["admin", "user"]);
```

Ceux des réseaux, des banques, des bases de données et de la configuration le sont aussi :

```js
nc.isHostname("api.example.com");              // "localhost" passe aussi, sauf avec { requireTld: true }
nc.isMACAddress("00:1B:44:11:3A:B7");
nc.isE164("+33612345678");                     // les numéros de téléphone tels que les API de SMS les attendent
nc.isIBAN("FR76 3000 6000 0112 3456 7890 189"); // format et somme de contrôle, espaces autorisés
nc.isObjectId("507f1f77bcf86cd799439011");     // identifiants MongoDB
nc.isULID(nc.id.ulid());
nc.isDataURL("data:image/png;base64,iVBORw0KGgo=");
nc.isMimeType("text/html; charset=utf-8");
nc.isTimeZone("Europe/Paris");                 // un fuseau que ce Node.js connaît
nc.isLocale("pt-BR");                          // "en_US" est rejeté, utilisez un tiret
nc.isCron("0 9 * * 1-5");                      // ce que time.cron() comprend
nc.isASCII("héllo");                           // false
```

`isHostname` rejette les adresses IP : c'est le rôle de `isIP`. La liste complète se trouve dans la [référence](/reference/checker/).

Pour des objets entiers, avec de nombreuses règles et de bons messages d'erreur, utilisez [`nc.schema`](/data/schema/).

## Assertions

`assert()` lève une `AssertionError` quand une condition est fausse, et indique à TypeScript que la condition est vraie par la suite :

```js
const user = users.find((u) => u.id === id);
nc.assert(user, `User ${id} not found`);
user.name; // pas de "possibly undefined" ici

nc.assertType(config.port, nc.isInteger, "port must be an integer");
```

Passez une fonction en guise de message si sa construction coûte cher : `nc.assert(ok, () => describe(state))`.
