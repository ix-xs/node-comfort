---
title: "Dates et heures"
description: "`nc.time` met en forme et analyse des dates dans toutes les langues et tous les fuseaux horaires, fait des calculs de calendrier, lit des durées et planifie des tâches. Il s'appuie sur `Intl`, que Node.js fournit avec toutes les langues."
sidebar:
  order: 5
---

```js
const { time } = require("@ix-xs/node-comfort");

time.format(new Date(), "dddd D MMMM YYYY"); // "Monday 15 January 2024"
time.relative(Date.now() - 3_600_000);       // "1 hour ago"
time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
```

## Langue et fuseau horaire

La sortie est en anglais par défaut : les résultats sont ainsi les mêmes sur toutes les machines. Changez les valeurs par défaut une fois pour toutes :

```js
time.setLocale("fr").setTimezone("Europe/Paris");

time.relative(Date.now() - 3_600_000);         // "il y a 1 heure"
time.format(new Date(), "dddd D MMMM YYYY");   // "lundi 15 janvier 2024"
```

Le fuseau par défaut sert à tout ce qui lit un calendrier : `format`, `parse`, `startOf`, `add` avec des mois, `isToday`, `cron` et les autres. Sans fuseau par défaut, c'est celui du système qui est utilisé.

La suite de cette page utilise la langue par défaut, l'anglais.

Vous pouvez aussi choisir appel par appel, avec `{ locale }` et `{ timeZone }` :

```js
time.format(Date.now(), "HH:mm Z", { timeZone: "Asia/Tokyo" }); // "22:30 +09:00"
time.relative(date, undefined, { locale: "de" });               // "vor 3 Stunden"
```

`time.timezones()` liste tous les fuseaux, et `time.offset("Europe/Paris")` donne le décalage actuel en minutes, heure d'été comprise.

## Mise en forme

```js
time.format(date);                          // "2024-01-15 14:30:05"
time.format(date, "DD/MM/YYYY");            // "15/01/2024"
time.format(date, "h:mm A");                // "2:30 PM"
time.format(date, "MMMM Do, YYYY");         // "January 15th, 2024"
time.format(date, "[Week] W, YYYY");        // "Week 3, 2024"
time.toISODate(date);                       // "2024-01-15"
```

| Token | Résultat | Token | Résultat |
| --- | --- | --- | --- |
| `YYYY` `YY` | 2024, 24 | `HH` `H` | 09, 9 (24 h) |
| `MMMM` `MMM` | January, Jan | `hh` `h` | 09, 9 (12 h) |
| `MM` `M` | 01, 1 | `mm` `m` | 05, 5 |
| `DD` `D` | 05, 5 | `ss` `s` | 07, 7 |
| `Do` | 5th | `SSS` | millisecondes |
| `dddd` `ddd` | Monday, Mon | `A` `a` | PM, pm |
| `d` | jour de la semaine, 0 pour dimanche | `Z` `ZZ` | +02:00, +0200 |
| `Q` | trimestre | `z` | nom du fuseau, comme EST |
| `W` `WW` | semaine ISO | `X` `x` | secondes Unix, ms |

Le texte entre crochets est conservé tel quel. `Do` suit la langue (`1er` en français). `z` est le nom court que `Intl` donne au fuseau dans cette langue, qui peut être un décalage comme `GMT+1`.

## Analyse

`parse()` est l'inverse de `format()`, avec les mêmes tokens :

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");             // une Date
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
// 2024-01-15T00:00:00.000Z, 9:00 à Tokyo
time.parse("31/02/2024", "DD/MM/YYYY");                         // undefined, ce jour n'existe pas
```

Le texte est lu dans le fuseau par défaut, ou dans celui que vous passez, sauf s'il porte son propre décalage (le token `Z`). Vous obtenez `undefined` quand le texte ne correspond pas au motif ou n'est pas une vraie date. Un motif sans date désigne aujourd'hui, et un motif sans heure désigne minuit. Les tokens de semaine, de trimestre, de numéro du jour et de nom de fuseau (`W`, `Q`, `d`, `z`) ne peuvent pas être relus : un motif qui en contient un lève une `TypeError`.

Pour les horodatages Unix en secondes, comme on en trouve dans les JWT et dans de nombreuses API :

```js
time.fromUnix(1705329000); // 2024-01-15T14:30:00.000Z
time.unix();               // l'horodatage actuel
```

## Dates relatives et dates de calendrier

```js
time.relative(Date.now() + 2 * 86_400_000);                           // "in 2 days"
time.relative(Date.now() - 86_400_000, undefined, { numeric: "auto" }); // "yesterday"
time.calendar(message.sentAt); // "Today at 2:30 PM", "Yesterday at 9:05 AM", "Monday at 10:00 AM"...
```

## Durées

Partout dans node-comfort, une durée peut être un nombre de millisecondes ou une chaîne :

```js
time.parseDuration("1h30m");   // 5400000
time.parseDuration("2 days");  // 172800000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("PT1H30M"); // 5400000

time.formatDuration(5_400_000);                               // "1h 30m"
time.formatDuration("90m");                                   // "1h 30m"
time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
```

Les mois et les années ne sont pas acceptés dans les durées, car leur longueur varie ; pour ceux-là, utilisez `add()`.

## Calculs de calendrier

```js
time.add(date, 3, "days");
time.add(date, "2h30m");
time.add(date, "1 month");                       // les mois et les années marchent aussi en texte
time.subtract(date, 1, "year");
time.diff("2024-03-15", "2024-01-20", "months"); // 1
time.startOf(date, "week");                      // lundi 00:00
time.startOf(date, "week", { weekStartsOn: 0 }); // dimanche 00:00
time.endOf(date, "month");                       // dernier jour, 23:59:59.999
```

Ajouter des mois garde le jour dans les limites : le 31 janvier plus un mois donne le dernier jour de février. Une quantité en texte qui ne peut pas être lue, comme `"soon"`, lève une `TypeError`.

Les jours, semaines, mois et années entiers, tout comme `startOf()` et `endOf()`, suivent le calendrier du fuseau par défaut, ou de celui que vous passez :

```js
time.startOf("2024-01-15T03:00:00Z", "day", { timeZone: "America/New_York" });
// 2024-01-14T05:00:00.000Z, minuit à New York

time.add("2024-02-15T12:00:00-05:00", 1, "month", { timeZone: "America/New_York" });
// 2024-03-15T16:00:00.000Z, toujours midi à New York après le changement d'heure
```

Un jour plus tard, c'est la même heure le lendemain, même la nuit du changement d'heure. Les heures et les unités plus petites sont exactes, si bien que `"24h"` ne vaut pas toujours `"1 day"` :

```js
const paris = { timeZone: "Europe/Paris" };
time.add("2024-03-30T12:00:00+01:00", 1, "day", paris); // 2024-03-31T10:00:00.000Z, midi à Paris
time.add("2024-03-30T12:00:00+01:00", "24h", paris);   // 2024-03-31T11:00:00.000Z, 13 h à Paris
```

Une unité qui n'existe pas, comme `"bananas"`, lève une `TypeError`.

`range()` liste toutes les dates d'un début à une fin, bornes incluses :

```js
time.range("2024-01-01", "2024-01-07", "day");                         // 7 dates
time.range("2024-01-31", "2024-04-30", "month", { timeZone: "UTC" });  // 31 janv., 29 févr., 31 mars, 30 avr.
time.range(start, end, "minute", { step: 15 });                        // tous les quarts d'heure
```

## Questions sur les dates

```js
time.isToday(date);
time.isYesterday(date);
time.isWeekend(date);
time.isSameDay(a, b, { timeZone: "Asia/Tokyo" });
time.isSame(a, b, "month");                         // même mois de la même année
time.isSame(a, b, "week", { weekStartsOn: 0 });
time.isBetween(order.createdAt, start, end);
time.isLeapYear(2024);
time.isValid("2024-02-30");  // false
time.daysInMonth(2024, 2);   // 29
time.weekOfYear(date);       // semaine ISO
```

`isSame()` accepte les mêmes unités que `startOf()`. `isToday()`, `isYesterday()` et `isTomorrow()` comparent des jours de calendrier, et non des périodes de 24 heures : elles restent donc justes les jours de changement d'heure.

## Mesure

```js
const sw = time.stopwatch();
await loadConfig(); sw.lap("config");
await connectDb();  sw.lap("db");
console.log(sw.stop(true)); // "182.4ms"

const { result, duration } = await time.measure(() => db.query(sql));
```

## Planification

`every()` exécute une tâche à intervalle régulier. Contrairement à `setInterval`, une exécution lente retarde la suivante au lieu de s'empiler, et le rythme ne dérive pas :

```js
const job = time.every("5m", syncInventory, { immediate: true, onError: nc.error });
job.stop();
```

`cron()` exécute une tâche selon une planification cron, dans n'importe quel fuseau horaire, et gère les changements d'heure :

```js
time.cron("0 9 * * mon-fri", sendReport, { timeZone: "Europe/Paris" });
time.cron("*/15 * * * *", refreshCache);
time.cron("0 18 L * *", closeMonth);                // le dernier jour de chaque mois à 18:00
time.cron("@daily", cleanup, { immediate: true });  // chaque jour à minuit, et une fois tout de suite
time.nextRun("0 0 1 * *"); // le moment de sa prochaine exécution
```

Les expressions ont cinq champs (`minute hour day month weekday`), ou six avec les secondes en premier. Elles acceptent les listes, les intervalles, les pas, les noms de mois et de jours, `L` dans le champ du jour pour le dernier jour du mois, et les raccourcis `@hourly`, `@daily`, `@weekly`, `@monthly` et `@yearly`.

Les deux renvoient une tâche dotée de `stop()`, `next()`, `isRunning()` et `runs()`. Toutes les fonctions sont listées dans la [référence](/reference/time/).
