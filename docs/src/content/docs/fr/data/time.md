---
title: "Dates et heures"
description: "`nc.time` : mise en forme et lecture dans toutes les langues et tous les fuseaux, calculs de calendrier, durées, mesures et tâches planifiées. Repose sur `Intl`, et sur `Temporal` là où Node.js l'a."
---

```js
const { time } = require("@ix-xs/node-comfort");
```

Les résultats ci-dessous sont calculés en UTC (`nc.config.set({ timeZone: "UTC" })`), avec `date = new Date("2024-01-15T14:30:05Z")`.

## Langue et fuseau horaire

La sortie est en anglais et dans le fuseau du système tant que vous ne les changez pas, une fois, pour `time`, `num` et le logger ([Configuration](/start/configuration/)) :

```js
nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });

time.relative(Date.now() - 3_600_000);                 // "il y a 1 heure"
time.format(date, "dddd D MMMM YYYY HH:mm");           // "lundi 15 janvier 2024 15:30"
```

Chaque appel accepte aussi `{ locale }` et `{ timeZone }` :

```js
time.format(date, "HH:mm Z", { timeZone: "Asia/Tokyo" });  // "23:30 +09:00"
time.relative(threeHoursAgo, undefined, { locale: "de" }); // "vor 3 Stunden"
```

| Fonction | Renvoie |
| --- | --- |
| `timeZones()` | Tous les noms de fuseaux que connaît `Intl` |
| `offset(timeZone?, date?)` | Le décalage en minutes, heure d'été comprise : `offset("Europe/Paris", "2024-07-01")` vaut `120` |

Le fuseau sert à tout ce qui lit un calendrier : `format`, `parse`, `startOf`, `add` en jours ou en mois, `isToday`, `cron`.

## Dates acceptées

Partout où une date est attendue : une `Date`, un horodatage en millisecondes, une chaîne ISO, un `Temporal.Instant` ou un `Temporal.ZonedDateTime`. Les résultats sont des objets `Date`.

```js
time.format(Temporal.Instant.from("2024-01-15T14:30:00Z"), "YYYY-MM-DD HH:mm"); // "2024-01-15 14:30"
time.isWeekend(Temporal.ZonedDateTime.from("2026-03-29T09:00[Europe/Paris]")); // true
```

Seul l'instant est lu : le fuseau d'un `ZonedDateTime` est ignoré, passez `{ timeZone }`. Sous Node.js 26, les fuseaux passent par `Temporal`, plus de deux fois plus vite ; les résultats sont les mêmes sous 22 et 24.

## Mettre en forme

```js
time.format(date);                   // "2024-01-15 14:30:05"
time.format(date, "DD/MM/YYYY");     // "15/01/2024"
time.format(date, "h:mm A");         // "2:30 PM"
time.format(date, "MMMM Do, YYYY");  // "January 15th, 2024"
time.format(date, "[Week] W, YYYY"); // "Week 3, 2024"
time.toISODate(date);                // "2024-01-15"
```

| Jeton | Sortie | Jeton | Sortie |
| --- | --- | --- | --- |
| `YYYY` `YY` | 2024, 24 | `HH` `H` | 09, 9 (24 h) |
| `MMMM` `MMM` | January, Jan | `hh` `h` | 09, 9 (12 h) |
| `MM` `M` | 01, 1 | `mm` `m` | 05, 5 |
| `DD` `D` | 05, 5 | `ss` `s` | 07, 7 |
| `Do` | 5th (`1er` en français) | `SSS` | millisecondes |
| `dddd` `ddd` | Monday, Mon | `A` `a` | PM, pm |
| `d` | jour de la semaine, 0 pour dimanche | `Z` `ZZ` | +02:00, +0200 |
| `Q` | trimestre | `z` | nom du fuseau, comme EST ou UTC+1 |
| `W` `WW` | semaine ISO | `X` `x` | secondes Unix, ms |

Le texte entre `[crochets]` est gardé tel quel.

## Lire une date

`parse(text, pattern, options?)` utilise les mêmes jetons :

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");               // 2024-01-15T14:30:00.000Z
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });   // 2024-01-15T00:00:00.000Z
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" }); // 2024-01-15T00:00:00.000Z
time.parse("31/02/2024", "DD/MM/YYYY");                           // undefined
time.fromUnix(1705329000);                                        // 2024-01-15T14:30:00.000Z
```

| Cas | Résultat |
| --- | --- |
| Un texte qui ne correspond pas, ou un jour qui n'existe pas | `undefined` |
| Pas de date dans le motif | Aujourd'hui |
| Pas d'heure dans le motif | Minuit |
| Un décalage dans le texte (`Z`) | L'emporte sur le fuseau |
| `W`, `Q`, `d` ou `z` dans le motif | `TypeError` : ils ne peuvent pas être relus |

`unix()` donne l'heure actuelle en secondes Unix, `fromUnix(seconds)` fait l'inverse.

## Dates relatives et calendrier

```js
time.relative("2024-01-17T14:30:05Z", date);                         // "in 2 days"
time.relative("2024-01-14T14:30:05Z", date, { numeric: "auto" });    // "yesterday"
time.calendar("2024-01-14T09:05:00Z", { now: date });                // "Yesterday at 9:05 AM"
```

| Option de `relative` | Par défaut |
| --- | --- |
| `locale` | `nc.config.get().locale` |
| `numeric` | `"always"` ; `"auto"` dit « hier » |
| `style` | `"long"` ; `"short"`, `"narrow"` |

## Durées

Une durée est un nombre de millisecondes ou un texte, partout dans la bibliothèque :

```js
time.parseDuration("1h30m");    // 5400000
time.parseDuration("2 days");   // 172800000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("PT1H30M");  // 5400000
time.parseDuration("soon");     // null

time.formatDuration(5_400_000);                            // "1h 30m"
time.formatDuration(90_000, { long: true, locale: "fr" }); // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });             // "1d 2h"
time.formatDuration(5_405_000, { clock: true });           // "01:30:05"
```

| Option de `formatDuration` | Rôle |
| --- | --- |
| `long` | Mots complets, traduits |
| `units` | Au plus ce nombre d'unités, de la plus grande à la plus petite |
| `clock` | `"01:30:05"` |
| `milliseconds` | Affiche les millisecondes ; `true` par défaut |
| `locale` | Langue de `long` |

Les mois et les années ne sont pas des durées, leur longueur varie : utilisez `add()`.

## Calculs de calendrier

```js
time.add("2024-01-31", 1, "month");              // 2024-02-29T00:00:00.000Z
time.add(date, "2h30m");                         // 2024-01-15T17:00:05.000Z
time.subtract(date, 1, "year");
time.diff("2024-03-15", "2024-01-20", "months"); // 1
time.startOf(date, "week");                      // 2024-01-15T00:00:00.000Z, un lundi
time.startOf(date, "week", { weekStartsOn: 0 }); // 2024-01-14T00:00:00.000Z
time.endOf(date, "month");                       // 2024-01-31T23:59:59.999Z
```

Les jours, semaines, mois et années suivent le calendrier du fuseau ; les heures et les unités plus petites sont exactes :

```js
const paris = { timeZone: "Europe/Paris" };
time.add("2024-03-30T12:00:00+01:00", 1, "day", paris); // 2024-03-31T10:00:00.000Z, midi à Paris
time.add("2024-03-30T12:00:00+01:00", "24h", paris);   // 2024-03-31T11:00:00.000Z, 13 h à Paris
```

| Fonction | Unités |
| --- | --- |
| `add`, `subtract`, `diff` | `ms`, `s`, `m`, `h`, `d`, `w`, `M` (mois), `y`, et leurs noms longs |
| `startOf`, `endOf`, `isSame` | `year`, `quarter`, `month`, `week`, `isoWeek`, `day`, `hour`, `minute`, `second` |
| `range(start, end, unit, { step })` | Toutes les dates de `start` à `end`, bornes comprises |

Ajouter des mois garde le jour dans le mois : le 31 janvier plus un mois donne le dernier jour de février. Une unité inconnue ou une quantité illisible lève une `TypeError`.

```js
time.range("2024-01-31", "2024-04-30", "month"); // 31 janv., 29 févr., 31 mars, 30 avr.
time.range(start, end, "minute", { step: 15 });  // tous les quarts d'heure
```

## Comparer

| Fonction | Exemple | Résultat |
| --- | --- | --- |
| `isBefore`, `isAfter` | `time.isBefore("2024-01-01", "2024-01-02")` | `true` |
| `isBetween` | `time.isBetween("2024-01-10", "2024-01-01", "2024-01-31")` | `true` |
| `isSame` | `time.isSame("2024-01-02", "2024-01-30", "month")` | `true` |
| `isSameDay`, `isToday`, `isYesterday`, `isTomorrow` | `time.isToday(date, { timeZone })` | Des jours du calendrier, pas des tranches de 24 heures |
| `isWeekend` | `time.isWeekend("2024-01-13")` | `true` |
| `isLeapYear` | `time.isLeapYear(2024)` | `true` |
| `isValid` | `time.isValid("2024-02-30")` | `false` |
| `daysInMonth` | `time.daysInMonth(2024, 2)` | `29` |
| `dayOfYear`, `weekOfYear` | `time.weekOfYear(date)` | `3` (semaine ISO) |
| `min`, `max` | `time.min(["2024-03-01", "2024-01-01"])` | `2024-01-01T00:00:00.000Z` |

## Mesurer

```js
const sw = time.stopwatch();
await loadConfig();
sw.lap("config");
sw.stop(true); // "182.4ms" ; stop() seul donne le nombre

const { result, duration } = await time.measure(() => loadUsers());
```

| Membre de `stopwatch()` | Rôle |
| --- | --- |
| `elapsed()` | Millisecondes depuis le départ |
| `lap(label?)` | Enregistre un tour, renvoie les millisecondes depuis le précédent |
| `laps()` | `[{ label, ms, total }]` |
| `stop(format?)` | Les millisecondes écoulées, ou un texte avec `true` |
| `reset()` | Repart de zéro |

## Tâches planifiées

`every(interval, task, options?)` lance une tâche à intervalle régulier : une exécution lente retarde la suivante au lieu de s'empiler, et le rythme ne dérive pas. `cron(expression, task, options?)` la lance selon une expression cron, dans un fuseau, à travers les changements d'heure.

```js
const { time, sys, logger } = require("@ix-xs/node-comfort");

const job = time.every("5m", syncInventory, { immediate: true, onError: (error) => logger.error(error) });
const report = time.cron("0 9 * * mon-fri", sendReport, { timeZone: "Europe/Paris" });

sys.onShutdown(() => {
  job.stop();
  report.stop();
});
```

| Option | `every` | `cron` | Rôle |
| --- | --- | --- | --- |
| `immediate` | oui | oui | Lance aussi une exécution tout de suite |
| `onError` | oui | oui | Reçoit l'erreur d'une exécution ratée ; sans elle, l'erreur n'est pas gérée |
| `signal` | oui | oui | L'annulation arrête la planification, comme `stop()` |
| `unref` | oui | oui | Laisse le processus se terminer pendant que la planification est active |
| `timeZone` | | oui | Fuseau dans lequel l'expression est lue |
| `overlap` | | oui | Lance une exécution même si la précédente tourne encore ; sautée par défaut |

```js
const controller = new AbortController();
time.every("30s", poll, { signal: controller.signal });
controller.abort(); // la planification s'arrête
```

La tâche renvoyée a `stop()` (renvoie la tâche), `next()` (la prochaine `Date` prévue), `isRunning()` et `runs()`. Déclarée avec `using`, elle s'arrête à la fin de son bloc ([Ressources](/basics/resources/)).

Les expressions ont cinq champs (`minute hour day month weekday`), ou six avec les secondes en tête : listes, plages, pas, noms de mois et de jours, `L` pour le dernier jour du mois, et `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly`.

```js
time.cron("*/15 * * * *", refreshCache);
time.cron("0 18 L * *", closeMonth);                // le dernier jour de chaque mois à 18 h
time.nextRun("0 0 1 * *", { from: date });          // 2024-02-01T00:00:00.000Z
```

## Avant la 3.0

| 2.2 | 3.0 |
| --- | --- |
| `time.setLocale(locale)` | `nc.config.set({ locale })` |
| `time.setTimezone(timeZone)` | `nc.config.set({ timeZone })` |
| `time.getConfig()` | `nc.config.get()` |
| `time.timezones()` | `time.timeZones()` |

La langue définie avec `nc.config.set()` est partagée avec `num`, `str.plural` et `arr.toSentence` : `num.setLocale()` laissait `time` dans sa propre langue.
