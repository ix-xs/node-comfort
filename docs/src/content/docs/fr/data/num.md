---
title: "Nombres"
description: "`nc.num` : arrondis décimaux, intervalles, statistiques, pourcentages, et mise en forme des nombres, des montants et des tailles dans toutes les langues."
---

```js
const { num } = require("@ix-xs/node-comfort");
```

## Arrondir

`Math.round(1.005 * 100) / 100` donne `1`, car `1.005` est stocké sous la forme `1.00499...`. Ces fonctions arrondissent la valeur décimale :

```js
num.round(1.005, 2);             // 1.01
num.round(1234, -2);             // 1200
num.round(-2.5);                 // -3
num.floor(1.789, 2);             // 1.78
num.ceil(1.231, 2);              // 1.24
num.snap(17, 5);                 // 15
num.approxEqual(0.1 + 0.2, 0.3); // true
```

| Fonction | Rôle |
| --- | --- |
| `round(value, decimals?)` | Les moitiés s'éloignent de zéro, comme dans un tableur. Des `decimals` négatives arrondissent aux dizaines, aux centaines... |
| `floor(value, decimals?)`, `ceil(value, decimals?)` | Vers le bas ou vers le haut, à `decimals` chiffres |
| `snap(value, step)` | Le multiple de `step` le plus proche |
| `approxEqual(a, b, epsilon?)` | Égalité à une tolérance près, relative à la taille des nombres |

## Intervalles

```js
num.clamp(150, 0, 100);         // 100
num.inRange(10, 0, 10);         // true
num.wrap(-1, 0, 5);             // 4
num.lerp(0, 100, 0.25);         // 25
num.mapRange(5, 0, 10, 0, 100); // 50
num.range(0, 10, 2);            // [0, 2, 4, 6, 8]
num.range(5);                   // [0, 1, 2, 3, 4]
```

| Fonction | Rôle |
| --- | --- |
| `clamp(value, min, max)` | Garde `value` entre `min` et `max` |
| `inRange(value, min, max)` | `true` quand `min <= value <= max` |
| `wrap(value, min, max)` | Fait le tour, comme un carrousel : après `max`, retour à `min` |
| `lerp(start, end, t)` | La valeur à `t` (de 0 à 1) entre `start` et `end` |
| `mapRange(value, inMin, inMax, outMin, outMax)` | Transpose une valeur d'un intervalle à un autre |
| `range(start, end?, step?)` | Les nombres de `start` jusqu'à `end`, exclu. Avec un seul argument, compte depuis 0 |

## Statistiques

```js
num.sum([0.1, 0.2, 0.3]);                          // 0.6
num.average([2, 4, 9]);                            // 5
num.median([1, 2, 3, 4]);                          // 2.5
num.mode([1, 1, 2, 2, 3]);                         // [1, 2]
num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]);              // 2
num.percentile([10, 20, 30, 40, 50], 95);          // 48
num.max([1, NaN, 3]);                              // NaN
num.min([]);                                       // undefined
```

| Fonction | Rôle |
| --- | --- |
| `sum`, `product` | `sum` compense les erreurs d'arrondi : une simple boucle donne `0.6000000000000001` ci-dessus |
| `average`, `median`, `mode` | `mode` renvoie toutes les valeurs les plus fréquentes |
| `variance`, `stdDev` | Sur la population par défaut, `{ sample: true }` divise par n - 1 |
| `percentile(values, p)` | `p` de 0 à 100, interpolé comme `PERCENTILE.INC` |
| `min`, `max` | Toute longueur (pas de dépassement de pile comme avec `Math.max(...list)`), `NaN` si une valeur vaut `NaN`, `undefined` pour une liste vide |

Chaque fonction accepte n'importe quel itérable de nombres. Un total de prix reste un flottant binaire : arrondissez-le avec `num.round(total, 2)` avant de l'afficher.

## Pourcentages

```js
num.percent(25, 200);       // 12.5
num.percent(1, 3, 1);       // 33.3
num.percentChange(80, 100); // 25
num.percentChange(100, 80); // -20
num.percentChange(0, 5);    // Infinity
```

| Fonction | Rôle |
| --- | --- |
| `percent(value, total, decimals = 2)` | La part d'un total. `0` quand `total` vaut `0` |
| `percentChange(from, to, decimals = 2)` | L'évolution de `from` à `to`. `Infinity` en partant de `0` : testez avec `Number.isFinite()` |

## Mise en forme

`format` s'appuie sur `Intl.NumberFormat` :

```js
num.format(1234567.891);                      // "1,234,567.891"
num.format(1234567.891, { locale: "de" });    // "1.234.567,891"
num.format(0.256, { style: "percent" });      // "26%"
num.format(1500, { compact: true });          // "1.5K"
num.format(3.5, { unit: "kilometer" });       // "3.5 km"
num.format(2, { decimals: 2 });               // "2.00"
num.format(5, { signDisplay: "exceptZero" }); // "+5"
```

| Option de `format` | Défaut | |
| --- | --- | --- |
| `locale` | `nc.config.get().locale` | Langue, comme `"fr"` ou `"en-US"` |
| `decimals` | | Nombre exact de décimales |
| `minDecimals`, `maxDecimals` | `maxDecimals: 3` | |
| `compact` | `false` | `1.2K`, `3.4M` |
| `style` | `"decimal"` | `"percent"` multiplie par 100 |
| `unit`, `unitDisplay` | `unitDisplay: "short"` | Toute unité `Intl` : `"kilometer"`, `"celsius"`, `"megabyte"` |
| `signDisplay` | `"auto"` | `"always"`, `"never"`, `"exceptZero"` |
| `grouping` | `true` | Séparateurs de milliers |

Montants, tailles, ordinaux :

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
num.formatBytes(1536);                         // "1.5 KB"
num.formatBytes(1000, { binary: false });      // "1 KB"
num.formatBytes(1536, { iec: true });          // "1.5 KiB"
num.formatBytes(1048575);                      // "1 MB"
num.parseBytes("10MB");                        // 10485760
num.abbreviate(2_400_000);                     // "2.4M"
num.ordinal(22);                               // "22nd"
num.thousands(1234567);                        // "1,234,567"
num.pad(7, 3);                                 // "007"
num.pad(-7, 3);                                // "-007"
```

| Fonction | Rôle |
| --- | --- |
| `currency(value, code, options?)` | `display` : `"symbol"` (défaut), `"narrowSymbol"`, `"code"`, `"name"`. `accounting`, `decimals`, `locale` |
| `formatBytes(bytes, options?)` | 1 KB = 1024 octets ; `binary: false` pour 1000, `iec: true` pour `KiB`, `decimals` (1 par défaut), `units` pour vos propres libellés |
| `parseBytes(text)` | `"512kb"`, `"1.5G"`, `"10MB"` en nombre d'octets ; `binary: false` pour des puissances de 1000 |
| `abbreviate(value, decimals = 1)` | `K`, `M`, `B`, `T` dans toutes les langues. Pour une forme traduite : `format(value, { compact: true })` |
| `ordinal(value, options?)` | Intégrés : `en`, `fr`, `es`, `it`, `pt`, `de`, `nl` ; `suffixes` pour les autres |
| `thousands(value, separator = ",")` | Séparateurs seuls, sans arrondi |
| `pad(value, length, char = "0")` | Complète la partie entière ; le signe reste devant |

`formatBytes` et `abbreviate` passent à l'unité suivante en arrondissant : `1048575` octets donnent `"1 MB"`, pas `"1024 KB"`.

## Langue

Chaque fonction de mise en forme écrit en anglais par défaut, pour qu'un programme affiche la même chose sur toutes les machines. `nc.config.set({ locale })` la change pour `num` et `nc.time` ensemble ([Configuration](/start/configuration/)) ; `locale` sur un appel l'emporte :

```js
const { config, num } = require("@ix-xs/node-comfort");

config.set({ locale: "fr" });
num.currency(1234.5, "EUR");                   // "1 234,50 €"
num.ordinal(1);                                // "1er"
num.currency(1234.5, "USD", { locale: "en" }); // "$1,234.50"
```

`format`, `currency`, `ordinal` et `formatBytes` la suivent. Le français sépare les milliers par une espace fine insécable.

## Lire un nombre

```js
num.parse("42px");    // 42
num.parse("1e3");     // 1000
num.parse("nope");    // NaN
num.parse("nope", 0); // 0
```

`parse(value, fallback = NaN)` lit le premier nombre trouvé dans une valeur (`"abc12"` donne `12`) et renvoie `fallback` quand il n'y en a pas. Les tailles passent par `parseBytes`.

## Entiers et nombres aléatoires

```js
num.gcd(12, 18);         // 6
num.lcm(4, 6);           // 12
num.isPrime(7);          // true
num.isEven(4);           // true
num.factorial(5);        // 120
num.factorial(25, true); // 15511210043330985984000000n
num.randomInt(1, 6);     // de 1 à 6, bornes comprises
num.random(0, 1);        // un flottant, 1 exclu
```

`factorial(n, true)` renvoie un `bigint` exact. `random` et `randomInt` utilisent `Math.random` : pour un secret ou un tirage équitable, utilisez `nc.crypto.randomInt()`.

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `num.setLocale(locale)` | `nc.config.set({ locale })` |
| `num.getLocale()` | `nc.config.get().locale` |

Les anciens noms fonctionnent toujours et préviennent une fois. La langue est désormais partagée : `num.setLocale()` change aussi celle de `nc.time`.
