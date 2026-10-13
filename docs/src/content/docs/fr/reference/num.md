---
title: "nc.num"
description: "Nombres : bornage, arrondi qui traite correctement les décimales, statistiques, et formatage pour les humains (tailles, monnaie, ordinaux, nombres compacts) dans n'importe quelle langue. Le formatage est en anglais par défaut : changez-le avec `setLocale()` ou à chaque appel avec `{ locale }`."
sidebar:
  label: "num"
  order: 8
---

```js
const { num } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const num = require("@ix-xs/node-comfort/num");
```

Cette page liste tout ce que contient `nc.num`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/num/).

```js
num.round(1.005, 2);                           // 1.01
num.formatBytes(1536);                         // "1.5 KB"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
num.percentile(latencies, 95);
```

## setLocale

```ts
setLocale(locale: string): typeof nc.num
```

Définit la langue par défaut de `format`, `currency`, `ordinal` et `formatBytes`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `locale` | `string` | Par exemple `"fr"`, `"en-GB"` ou `"pt-BR"`. |

**Renvoie** `typeof import("./``Num``")` : Le module, ce qui permet d'enchaîner les appels.

```js
num.setLocale("fr");
num.currency(1234.5, "EUR"); // "1 234,50 €"
```

## getLocale

```ts
getLocale(): string
```

La langue par défaut actuelle.

```js
num.getLocale(); // "en"
```

## clamp

```ts
clamp(value: number, min: number, max: number): number
```

Maintient un nombre entre `min` et `max`.

```js
num.clamp(150, 0, 100); // 100
num.clamp(-5, 0, 100);  // 0
```

## inRange

```ts
inRange(value: number, min: number, max: number): boolean
```

Le nombre est-il entre `min` et `max`, bornes comprises ?

```js
num.inRange(10, 0, 10); // true
```

## wrap

```ts
wrap(value: number, min: number, max: number): number
```

Ramène un nombre dans un intervalle en bouclant, comme un angle ou l'index d'un carrousel. `max` est exclu.

```js
num.wrap(370, 0, 360); // 10
num.wrap(-1, 0, 5);    // 4
```

## round

```ts
round(value: number, decimals?: number): number
```

Arrondit à `decimals` décimales sans les surprises de la virgule flottante : `Math.round(1.005 * 100) / 100` donne `1`, cette fonction donne `1.01`. Les demis s'arrondissent en s'éloignant de zéro, comme dans un tableur.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Les valeurs négatives arrondissent aux dizaines, aux centaines... Par défaut : `0`. |

```js
num.round(1.005, 2); // 1.01
num.round(1234, -2); // 1200
num.round(-2.5);     // -3
```

## floor

```ts
floor(value: number, decimals?: number): number
```

Arrondit vers le bas à `decimals` décimales.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Par défaut : `0`. |

```js
num.floor(1.789, 2); // 1.78
```

## ceil

```ts
ceil(value: number, decimals?: number): number
```

Arrondit vers le haut à `decimals` décimales.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Par défaut : `0`. |

```js
num.ceil(1.231, 2); // 1.24
```

## snap

```ts
snap(value: number, step: number): number
```

Arrondit au multiple de `step` le plus proche.

```js
num.snap(17, 5);        // 15
num.snap(0.37, 0.25);   // 0.25
```

## approxEqual

```ts
approxEqual(a: number, b: number, epsilon?: number): boolean
```

Deux nombres sont-ils égaux à une petite tolérance près ? La bonne façon de comparer des résultats en virgule flottante, puisque `0.1 + 0.2 === 0.3` vaut `false`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `a` | `number` |  |
| `b` | `number` |  |
| `epsilon?` | `number` | Écart autorisé, relatif à la grandeur des nombres. Par défaut : `Number.EPSILON * 16`. |

```js
num.approxEqual(0.1 + 0.2, 0.3); // true
```

## lerp

```ts
lerp(start: number, end: number, t: number): number
```

La valeur au ratio `t` entre `start` et `end`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `start` | `number` |  |
| `end` | `number` |  |
| `t` | `number` | En général entre 0 et 1. |

```js
num.lerp(0, 100, 0.25); // 25
```

## mapRange

```ts
mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number
```

Transpose un nombre d'un intervalle à un autre, en conservant sa position relative.

```js
num.mapRange(5, 0, 10, 0, 100); // 50
num.mapRange(75, 0, 100, 1, 0); // 0.25
```

## random

```ts
random(min?: number, max?: number): number
```

Un nombre à virgule flottante aléatoire, de `min` (inclus) à `max` (exclu). Pas pour la sécurité : il utilise `Math.random`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `min?` | `number` | Par défaut : `0`. |
| `max?` | `number` | Par défaut : `1`. |

```js
num.random(10, 20); // 13.84...
```

## randomInt

```ts
randomInt(min: number, max: number): number
```

Un entier aléatoire de `min` à `max`, bornes comprises. Pas pour la sécurité.

```js
num.randomInt(1, 6); // un lancer de dé
```

## sum

```ts
sum(values: Iterable<number>): number
```

Additionne des nombres, sans la dérive d'une boucle naïve.

```js
num.sum([1, 2, 3]);       // 6
num.sum([0.1, 0.2, 0.3]); // 0.6, where a plain loop gives 0.6000000000000001
```

## product

```ts
product(values: Iterable<number>): number
```

Multiplie des nombres. Une liste vide donne `1`.

```js
num.product([2, 3, 4]); // 24
```

## average

```ts
average(values: Iterable<number>): number
```

La moyenne, ou `0` pour une liste vide.

```js
num.average([2, 4, 9]); // 5
```

## median

```ts
median(values: Iterable<number>): number
```

La valeur du milieu une fois la liste triée, ou `0` pour une liste vide.

```js
num.median([3, 1, 2]);    // 2
num.median([1, 2, 3, 4]); // 2.5
```

## mode

```ts
mode(values: Iterable<number>): number[]
```

Les valeurs les plus fréquentes.

```js
num.mode([1, 1, 2, 2, 3]); // [1, 2]
```

## variance

```ts
variance(values: Iterable<number>, options?: VarianceOptions): number
```

La variance : la moyenne des carrés des écarts à la moyenne.

```js
num.variance([2, 4, 4, 4, 5, 5, 7, 9]); // 4
```

## stdDev

```ts
stdDev(values: Iterable<number>, options?: VarianceOptions): number
```

L'écart type.

```js
num.stdDev([2, 4, 4, 4, 5, 5, 7, 9]); // 2
```

## percentile

```ts
percentile(values: Iterable<number>, p: number): number
```

La valeur sous laquelle se trouvent `p` pour cent des valeurs, interpolée comme le fait `PERCENTILE.INC` dans Excel.

| Paramètre | Type | Description |
| --- | --- | --- |
| `values` | `Iterable``<number>` |  |
| `p` | `number` | De 0 à 100. |

**Renvoie** `number` : `NaN` pour une liste vide.

```js
num.percentile([1, 2, 3, 4, 5], 90); // 4.6
num.percentile(responseTimes, 95);   // p95 latency
```

## min

```ts
min(values: Iterable<number>): number | undefined
```

Le plus petit nombre. Contrairement à `Math.min(...array)`, les très grands tableaux ne posent aucun problème. Comme avec `Math.min`, un `NaN` dans la liste donne `NaN`.

**Renvoie** `number | undefined` : `undefined` pour une liste vide.

## max

```ts
max(values: Iterable<number>): number | undefined
```

Le plus grand nombre. Contrairement à `Math.max(...array)`, les très grands tableaux ne posent aucun problème. Comme avec `Math.max`, un `NaN` dans la liste donne `NaN`.

**Renvoie** `number | undefined` : `undefined` pour une liste vide.

## percent

```ts
percent(value: number, total: number, decimals?: number): number
```

Le pourcentage que `value` représente dans `total`. Renvoie `0` quand `total` vaut `0`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `total` | `number` |  |
| `decimals?` | `number` | Par défaut : `2`. |

```js
num.percent(25, 200); // 12.5
num.percent(1, 3, 1); // 33.3
```

## percentChange

```ts
percentChange(from: number, to: number, decimals?: number): number
```

De combien une valeur a changé, en pourcentage. Passer de `0` à n'importe quelle autre valeur est un changement infini.

| Paramètre | Type | Description |
| --- | --- | --- |
| `from` | `number` |  |
| `to` | `number` |  |
| `decimals?` | `number` | Par défaut : `2`. |

```js
num.percentChange(80, 100); // 25
num.percentChange(100, 80); // -20
```

## gcd

```ts
gcd(...values: number[]): number
```

Plus grand commun diviseur.

```js
num.gcd(12, 18, 27); // 3
```

## lcm

```ts
lcm(...values: number[]): number
```

Plus petit commun multiple.

```js
num.lcm(2, 3, 4); // 12
```

## isPrime

```ts
isPrime(value: number): boolean
```

Est-ce un nombre premier ?

```js
num.isPrime(7); // true
num.isPrime(1); // false
```

## factorial

```ts
factorial(n: number, asBigInt?: boolean): number | bigint
```

`n!`. Passez `true` pour obtenir un bigint exact, car les nombres perdent en précision au-delà de 18!.

| Paramètre | Type | Description |
| --- | --- | --- |
| `n` | `number` |  |
| `asBigInt?` | `boolean` | Par défaut : `false`. |

**Lève** `RangeError` : Si `n` est négatif ou n'est pas un entier.

```js
num.factorial(5);        // 120
num.factorial(25, true); // 15511210043330985984000000n
```

## isEven

```ts
isEven(value: number): boolean
```

Est-il pair ?

## isOdd

```ts
isOdd(value: number): boolean
```

Est-il impair ? Fonctionne aussi avec les nombres négatifs.

## range

```ts
range(start: number, end?: number, step?: number): number[]
```

Les nombres de `start` jusqu'à `end` (exclu). Avec un seul argument, compte à partir de 0. Décroît quand `end` est plus petit.

| Paramètre | Type | Description |
| --- | --- | --- |
| `start` | `number` |  |
| `end?` | `number` |  |
| `step?` | `number` | Par défaut : `1`, ou `-1` quand le compte est décroissant. |

```js
num.range(4);        // [0, 1, 2, 3]
num.range(0, 10, 2); // [0, 2, 4, 6, 8]
num.range(5, 0);     // [5, 4, 3, 2, 1]
```

## parse

```ts
parse(value: unknown, fallback?: number): number
```

Lit un nombre à partir de n'importe quelle valeur, en ignorant le texte qui le suit, comme les unités.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `unknown` |  |
| `fallback?` | `number` | Renvoyée quand il n'y a aucun nombre à lire. Par défaut : `NaN`. |

```js
num.parse("42px");     // 42
num.parse(" -3.5 kg"); // -3.5
num.parse("nope", 0);  // 0
```

## parseBytes

```ts
parseBytes(value: string | number, options?: ParseBytesOptions): number
```

Convertit une taille comme `"10 MB"` en octets. L'inverse de `formatBytes()`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `string \| number` | Une taille comme `"512kb"` ou `"1.5G"`, ou un nombre d'octets. |
| `options?` | [`ParseBytesOptions`](#parsebytesoptions) |  |

**Renvoie** `number` : Des octets, ou `NaN` si la valeur est illisible.

```js
num.parseBytes("1.5 KB");                   // 1536
num.parseBytes("2 GiB");                    // 2147483648
num.parseBytes("1 KB", { binary: false });  // 1000
```

## formatBytes

```ts
formatBytes(bytes: number, options?: FormatBytesOptions): string
```

Formate un nombre d'octets en taille lisible.

```js
num.formatBytes(1536);                     // "1.5 KB"
num.formatBytes(1000, { binary: false });  // "1 KB"
num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo", "Go"] }); // "1,5 Ko"
```

## format

```ts
format(value: number | bigint, options?: FormatNumberOptions): string
```

Formate un nombre pour l'affichage, en s'appuyant sur `Intl.NumberFormat` : séparateurs, décimales, notation compacte, pourcentages, unités.

```js
num.format(1234567.891);                   // "1,234,567.891"
num.format(1234567.891, { locale: "fr" }); // "1 234 567,891"
num.format(0.256, { style: "percent" });   // "26%"
num.format(1500, { compact: true });       // "1.5K"
num.format(3.5, { unit: "kilometer" });    // "3.5 km"
```

## currency

```ts
currency(value: number | bigint, code: string, options?: CurrencyOptions): string
```

Formate une somme d'argent.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number \| bigint` |  |
| `code` | `string` | Un code de devise comme `"EUR"`, `"USD"` ou `"JPY"`. |
| `options?` | [`CurrencyOptions`](#currencyoptions) |  |

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
```

## abbreviate

```ts
abbreviate(value: number, decimals?: number): string
```

Abrège les grands nombres avec `K`, `M`, `B` ou `T`. Pour les autres langues, utilisez `format(value, { compact: true, locale })`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `decimals?` | `number` | Par défaut : `1`. |

```js
num.abbreviate(1500);      // "1.5K"
num.abbreviate(2_400_000); // "2.4M"
```

## thousands

```ts
thousands(value: string | number, separator?: string): string
```

Ajoute les séparateurs de milliers, sans toucher aux décimales.

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number \| string` |  |
| `separator?` | `string` | Par défaut : `","`. |

```js
num.thousands(1234567.89, " "); // "1 234 567.89"
```

## pad

```ts
pad(value: number, length: number, char?: string): string
```

Complète la partie entière avec des zéros (ou un autre caractère).

| Paramètre | Type | Description |
| --- | --- | --- |
| `value` | `number` |  |
| `length` | `number` | Nombre de chiffres voulus avant le séparateur décimal. |
| `char?` | `string` | Par défaut : `"0"`. |

```js
num.pad(7, 3);    // "007"
num.pad(-7, 3);   // "-007"
num.pad(3.5, 2);  // "03.5"
```

## ordinal

```ts
ordinal(value: number, options?: OrdinalOptions): string
```

Ajoute le suffixe ordinal : 1st, 2nd, 3rd... dans plusieurs langues.

```js
num.ordinal(22);                   // "22nd"
num.ordinal(1, { locale: "fr" });  // "1er"
num.ordinal(3, { locale: "de" });  // "3."
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { CurrencyOptions } from "@ix-xs/node-comfort"`.

### CurrencyOptions

Options de `currency()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue. Par défaut : celle définie avec `setLocale()`, ou `"en"`. |
| `decimals?` | `number` | Par défaut : le nombre de décimales habituel de la devise (2 pour EUR, 0 pour JPY). |
| `display?` | `"symbol" \| "name" \| "code" \| "narrowSymbol"` | La façon d'écrire la devise. Pour des dollars américains au Canada : `US$`, `$`, `USD` ou `US dollars`. Par défaut : `"symbol"`. |
| `accounting?` | `boolean` | Affiche les montants négatifs entre parenthèses, comme `($5.00)`. |

### FormatBytesOptions

Options de `formatBytes()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `decimals?` | `number` | Nombre maximal de décimales. Par défaut : `1`. |
| `binary?` | `boolean` | 1 KB vaut 1024 octets avec `true`, 1000 avec `false`. Par défaut : `true`. |
| `iec?` | `boolean` | Utilise les libellés `KiB`, `MiB`, `GiB`. |
| `locale?` | `string` | Formate le nombre pour une langue, comme `"fr"` pour `"1,5 KB"`. |
| `units?` | `string[]` | Vos propres libellés à partir des octets, comme `["o", "Ko", "Mo", "Go", "To"]`. |

### FormatNumberOptions

Options de `format()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue, comme `"fr"` ou `"en-US"`. Par défaut : celle définie avec `setLocale()`, ou `"en"`. |
| `decimals?` | `number` | Nombre exact de décimales. |
| `minDecimals?` | `number` | Nombre minimal de décimales. |
| `maxDecimals?` | `number` | Nombre maximal de décimales. Par défaut : `3`. |
| `compact?` | `boolean` | Notation courte comme `1.2K` ou `3.4M`. |
| `style?` | `"percent" \| "decimal"` | `"percent"` multiplie par 100 et ajoute `%`. |
| `unit?` | `string` | N'importe quelle unité `Intl` : `"kilometer"`, `"celsius"`, `"megabyte"`... |
| `unitDisplay?` | `"long" \| "short" \| "narrow"` | La façon d'écrire l'unité. Par défaut : `"short"`. |
| `signDisplay?` | `"auto" \| "always" \| "never" \| "exceptZero"` | Quand afficher le signe. `"exceptZero"` donne `+5`. |
| `grouping?` | `boolean` | Séparateurs de milliers. Par défaut : `true`. |

### OrdinalOptions

Options de `ordinal()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Intégrées : `en`, `fr`, `es`, `it`, `pt`, `de`, `nl`. Par défaut : celle définie avec `setLocale()`, ou `"en"`. |
| `suffixes?` | `Partial``<``Record``<``LDMLPluralRule``, string>>` | Vos propres suffixes, pour d'autres langues. |

### ParseBytesOptions

Options de `parseBytes()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `binary?` | `boolean` | 1 KB vaut 1024 octets avec `true`, 1000 avec `false`. Les unités `KiB` valent toujours 1024. Par défaut : `true`. |

### VarianceOptions

Options de `variance()` et `stdDev()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `sample?` | `boolean` | Statistique d'échantillon (division par n - 1) plutôt que de population. |
