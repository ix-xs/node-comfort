---
title: "Nombres"
description: "`nc.num` s'occupe d'un arrondi qui tombe juste sur les décimales, des statistiques et de la mise en forme des nombres pour qu'ils soient lisibles."
sidebar:
  order: 2
---

```js
const { num } = require("@ix-xs/node-comfort");

num.round(1.005, 2);                           // 1.01, là où Math.round donne 1
num.formatBytes(1536);                         // "1.5 KB"
num.currency(1234.5, "EUR", { locale: "fr" }); // "1 234,50 €"
```

## Arrondi

`Math.round(1.005 * 100) / 100` donne `1`, parce que `1.005` vaut en réalité `1.00499999...` en binaire. `num.round` travaille, lui, sur la représentation décimale :

```js
num.round(1.005, 2);  // 1.01
num.round(1234, -2);  // 1200, des décimales négatives arrondissent à la dizaine, à la centaine...
num.round(-2.5);      // -3, les moitiés s'éloignent de zéro, comme dans un tableur
num.floor(1.789, 2);  // 1.78
num.ceil(1.231, 2);   // 1.24
num.snap(17, 5);      // 15, le multiple le plus proche
num.approxEqual(0.1 + 0.2, 0.3); // true
```

## Intervalles

```js
num.clamp(150, 0, 100);         // 100
num.inRange(10, 0, 10);         // true, bornes incluses
num.wrap(-1, 0, 5);             // 4, comme un carrousel qui recule
num.lerp(0, 100, 0.25);         // 25
num.mapRange(5, 0, 10, 0, 100); // 50
num.range(0, 10, 2);            // [0, 2, 4, 6, 8]
```

## Statistiques

```js
num.sum([1, 2, 3]);               // 6
num.sum([0.1, 0.2, 0.3]);         // 0.6, là où une simple boucle donne 0.6000000000000001
num.product([2, 3, 4]);           // 24
num.average([2, 4, 9]);           // 5
num.median([1, 2, 3, 4]);         // 2.5
num.mode([1, 1, 2, 2, 3]);        // [1, 2]
num.percentile(latencies, 95);    // p95, interpolé comme PERCENTILE.INC dans Excel
num.stdDev(values);
num.stdDev(values, { sample: true });
```

`sum` garde ce que chaque addition perd à l'arrondi et le rajoute à la fin, si bien que l'erreur ne grandit pas avec la longueur de la liste. Les valeurs restent des flottants binaires : arrondissez un total de prix avec `num.round(total, 2)` avant de l'afficher.

`min` et `max` acceptent une liste de n'importe quelle taille :

```js
num.min([3, 1, 2]);    // 1
num.max(bigArray);     // pas de "Maximum call stack", contrairement à Math.max(...bigArray)
num.max([1, NaN, 3]);  // NaN, comme Math.max
num.min([]);           // undefined
```

## Pourcentages

```js
num.percent(25, 200);        // 12.5, la part d'un total
num.percent(1, 3, 1);        // 33.3, avec une décimale
num.percentChange(80, 100);  // 25
num.percentChange(100, 80);  // -20
num.percentChange(0, 5);     // Infinity
```

Les deux arrondissent à deux décimales, sauf si vous indiquez un autre nombre. `percent` renvoie `0` quand le total vaut `0`. Une variation qui part de `0` est infinie : testez donc le résultat avec `Number.isFinite()` avant de l'afficher.

## Mise en forme

`format()` est une surcouche de `Intl.NumberFormat` :

```js
num.format(1234567.891);                  // "1,234,567.891"
num.format(1234567.891, { locale: "de" }); // "1.234.567,891"
num.format(0.256, { style: "percent" });  // "26%"
num.format(1500, { compact: true });      // "1.5K"
num.format(3.5, { unit: "kilometer" });   // "3.5 km"
num.format(2, { decimals: 2 });           // "2.00"
num.format(5, { signDisplay: "exceptZero" }); // "+5"
```

Montants, tailles et ordinaux :

```js
num.currency(1234.5, "USD");                   // "$1,234.50"
num.currency(-5, "USD", { accounting: true }); // "($5.00)"
num.formatBytes(1073741824);                   // "1 GB"
num.formatBytes(1000, { binary: false });      // "1 KB"
num.formatBytes(1536, { locale: "fr", units: ["o", "Ko", "Mo", "Go"] }); // "1,5 Ko"
num.parseBytes("10MB");                        // 10485760
num.abbreviate(2_400_000);                     // "2.4M"
num.ordinal(22);                               // "22nd"
num.ordinal(1, { locale: "fr" });              // "1er"
```

Par défaut, `formatBytes` compte 1 KB pour 1024 octets ; passez `binary: false` pour 1000, ou `iec: true` pour des unités notées `KiB`.

Dans `formatBytes` et `abbreviate`, une valeur située juste sous un seuil est arrondie à l'unité suivante :

```js
num.formatBytes(1048575); // "1 MB", et non "1024 KB"
num.abbreviate(999_950);  // "1M", et non "1000K"
```

`pad` donne une largeur fixe à un nombre :

```js
num.pad(7, 3);     // "007"
num.pad(-7, 3);    // "-007", le signe reste devant
num.pad(3.5, 2);   // "03.5", seule la partie entière est complétée
```

Toutes les fonctions de mise en forme parlent anglais par défaut : un programme affiche ainsi la même chose sur toutes les machines. Changez la langue une fois pour tout l'espace de noms, ou appel par appel :

```js
num.setLocale("fr");
num.currency(1234.5, "EUR");                 // "1 234,50 €"
num.currency(1234.5, "USD", { locale: "en" }); // "$1,234.50", pour cet appel seulement
```

`format`, `currency`, `ordinal` et `formatBytes` suivent la langue. `abbreviate` écrit toujours `K`, `M`, `B` et `T` : pour une autre langue, utilisez `num.format(value, { compact: true })`.

`nc.time` a son propre `setLocale()` : les dates et les nombres peuvent donc suivre des langues différentes si vous en avez besoin.

## Lire des nombres

```js
num.parse("42px");      // 42
num.parse("nope", 0);   // 0
```

## Entiers

```js
num.gcd(12, 18);       // 6
num.lcm(4, 6);         // 12
num.isPrime(7);        // true
num.factorial(25, true); // 15511210043330985984000000n, exact sous forme de bigint
num.randomInt(1, 6);   // pas pour la sécurité, voir nc.crypto.randomInt()
```

La [référence de `nc.num`](/reference/num/) liste toutes les fonctions avec leurs options.
