---
title: "nc.time"
description: "Dates et durées : formatage, temps relatif, calcul calendaire, fuseaux horaires et planification, dans toutes les langues que `Intl` connaît. La langue par défaut est l'anglais pour que les résultats soient les mêmes sur toutes les machines ; changez-la avec `setLocale()` ou à chaque appel avec `{ locale }`. Les fuseaux horaires fonctionnent de la même façon, avec `setTimezone()` ou `{ timeZone }`."
sidebar:
  label: "time"
  order: 11
---

```js
const { time } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const time = require("@ix-xs/node-comfort/time");
```

Cette page liste tout ce que contient `nc.time`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/data/time/).

```js
time.setLocale("fr").setTimezone("Europe/Paris");
time.relative(Date.now() - 3600e3);        // "il y a 1 heure"
time.format(new Date(), "dddd D MMMM YYYY"); // "lundi 15 janvier 2024"
time.cron("0 9 * * 1-5", sendReport);        // en semaine à 9:00
```

## setLocale

```ts
setLocale(locale: string): typeof nc.time
```

Définit la langue par défaut de `relative`, `calendar`, `formatDuration` et `format`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `locale` | `string` | Par exemple `"fr"`, `"en-GB"`, `"pt-BR"` ou `"ja"`. |

**Renvoie** `typeof import("./``Time``")` : Le module, pour enchaîner les appels.

```js
time.setLocale("fr");
time.relative(Date.now() - 60e3); // "il y a 1 minute"
```

## setTimezone

```ts
setTimezone(timeZone: string | undefined): typeof nc.time
```

Définit le fuseau horaire par défaut de `format`, `calendar`, `isSameDay`, `cron`... Passez `undefined` pour revenir au fuseau du système.

| Paramètre | Type | Description |
| --- | --- | --- |
| `timeZone` | `string \| undefined` | Par exemple `"America/New_York"`. |

**Renvoie** `typeof import("./``Time``")` : Le module, pour enchaîner les appels.

**Lève** `RangeError` : Si le fuseau n'existe pas.

```js
time.setTimezone("Europe/Paris");
```

## getConfig

```ts
getConfig(): { locale: string; timeZone: string | undefined; }
```

Les valeurs par défaut actuelles.

```js
time.getConfig(); // { locale: "en", timeZone: undefined }
```

## timezones

```ts
timezones(): string[]
```

Tous les fuseaux horaires que Node connaît, triés.

```js
time.timezones().includes("Europe/Paris"); // true
```

## offset

```ts
offset(timeZone?: string, date?: DateInput): number
```

Le décalage UTC d'un fuseau à une date donnée, en minutes. Changement d'heure compris.

| Paramètre | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Par défaut : le fuseau global, puis celui du système. |
| `date?` | [`DateInput`](#dateinput) | Par défaut : maintenant. |

```js
time.offset("Europe/Paris", "2024-07-01"); // 120
time.offset("Europe/Paris", "2024-01-01"); // 60
```

## parseDuration

```ts
parseDuration(input: string | number): number | null
```

Convertit une durée en millisecondes. Comprend `"1h30m"`, `"2 days"`, `"500ms"`, les heures d'horloge comme `"01:30:00"`, les durées ISO comme `"PT1H30M"` et les simples nombres. Les mois et les années sont refusés car leur longueur varie ; utilisez `add()` pour ceux-là.

**Renvoie** `number | null` : `null` quand ce n'est pas une durée.

```js
time.parseDuration("1h30m");    // 5400000
time.parseDuration("01:30:00"); // 5400000
time.parseDuration("banana");   // null
```

## formatDuration

```ts
formatDuration(duration: string | number, options?: FormatDurationOptions): string
```

Écrit une durée sous une forme lisible par un humain.

| Paramètre | Type | Description |
| --- | --- | --- |
| `duration` | `number \| string` | Des millisecondes, ou un texte comme `"90m"`. |
| `options?` | [`FormatDurationOptions`](#formatdurationoptions) |  |

```js
time.formatDuration(5_400_000);                               // "1h 30m"
time.formatDuration(90_000, { long: true });                  // "1 minute 30 seconds"
time.formatDuration(90_000, { long: true, locale: "fr" });    // "1 minute 30 secondes"
time.formatDuration(93_784_000, { units: 2 });                // "1d 2h"
time.formatDuration(5_405_000, { clock: true });              // "01:30:05"
time.formatDuration("90m");                                   // "1h 30m"
```

## relative

```ts
relative(date: DateInput, from?: DateInput, options?: RelativeOptions): string
```

Décrit une date par rapport à maintenant : `"3 hours ago"`, `"in 2 days"`, dans n'importe quelle langue.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `from?` | [`DateInput`](#dateinput) | Compare avec cette date plutôt qu'avec maintenant. |
| `options?` | [`RelativeOptions`](#relativeoptions) |  |

```js
time.relative(Date.now() - 3_600_000);                                  // "1 hour ago"
time.relative(Date.now() - 86_400_000, undefined, { numeric: "auto" }); // "yesterday"
time.relative(Date.now() - 3_600_000, undefined, { locale: "fr" });     // "il y a 1 heure"
```

## calendar

```ts
calendar(date: DateInput, options?: CalendarOptions): string
```

Décrit une date comme le fait une application de messagerie : `"Today at 2:30 PM"`, `"Yesterday at 9:05 AM"`, un jour de la semaine pour les jours à venir, et la date complète au-delà.

```js
time.calendar(new Date());                     // "Today at 2:30 PM"
time.calendar(yesterday, { locale: "fr" });    // "Hier à 09:05"
```

## format

```ts
format(date: DateInput, pattern?: string, options?: FormatDateOptions): string
```

Formate une date avec des tokens, dans n'importe quelle langue et n'importe quel fuseau horaire.

| Token | Résultat | | Token | Résultat |
| --- | --- | --- | --- | --- |
| `YYYY` / `YY` | 2024 / 24 | | `HH` / `H` | 09 / 9 (24h) |
| `Q` | trimestre, 1-4 | | `hh` / `h` | 09 / 9 (12h) |
| `MMMM` / `MMM` | January / Jan | | `mm` / `m` | 05 / 5 |
| `MM` / `M` | 01 / 1 | | `ss` / `s` | 07 / 7 |
| `DD` / `D` | 05 / 5 | | `SSS` | 042 (ms) |
| `dddd` / `ddd` | Monday / Mon | | `A` / `a` | PM / pm |
| `d` | jour de la semaine, 0 pour dimanche | | `Z` / `ZZ` | +02:00 / +0200 |
| `W` / `WW` | semaine ISO | | `X` / `x` | secondes / ms Unix |
| `Do` | 5th | | `z` | nom du fuseau, comme EST ou GMT+1 |

Le texte entre crochets reste tel quel : `"[Today is] dddd"`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `pattern?` | `string` | Par défaut : `"YYYY-MM-DD HH:mm:ss"`. |
| `options?` | [`FormatDateOptions`](#formatdateoptions) |  |

**Renvoie** `string` : Ou `"Invalid Date"`.

```js
time.format(new Date(), "YYYY-MM-DD HH:mm:ss");                  // "2024-01-15 14:30:05"
time.format(Date.now(), "dddd D MMMM YYYY", { locale: "fr" });    // "lundi 15 janvier 2024"
time.format(Date.now(), "HH:mm Z", { timeZone: "Asia/Tokyo" });   // "22:30 +09:00"
```

## parse

```ts
parse(text: string, pattern: string, options?: ParseDateOptions): Date | undefined
```

Lit une date écrite dans un format connu : l'inverse de `format()`, avec les mêmes tokens. Les parties absentes du motif prennent par défaut la date du jour et minuit.

| Paramètre | Type | Description |
| --- | --- | --- |
| `text` | `string` |  |
| `pattern` | `string` | Des tokens comme `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`, `A`, `Z`. Le texte entre crochets doit correspondre tel quel. |
| `options?` | [`ParseDateOptions`](#parsedateoptions) |  |

**Renvoie** `Date`` | undefined` : `undefined` quand le texte ne correspond pas ou n'est pas une vraie date.

```js
time.parse("15/01/2024 14:30", "DD/MM/YYYY HH:mm");
time.parse("15 janvier 2024", "D MMMM YYYY", { locale: "fr" });
time.parse("2024-01-15 09:00", "YYYY-MM-DD HH:mm", { timeZone: "Asia/Tokyo" });
time.parse("31/02/2024", "DD/MM/YYYY"); // undefined, no such day
```

## toISODate

```ts
toISODate(date?: DateInput, options?: TimeZoneOptions): string
```

La date sous la forme `YYYY-MM-DD`, le format qu'attendent `<input type="date">` et la plupart des API.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Par défaut : maintenant. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

```js
time.toISODate(new Date(2024, 0, 5)); // "2024-01-05"
```

## add

```ts
add(date: DateInput, amount: string | number, unit?: TimeZoneOptions | CalendarUnit, options?: TimeZoneOptions): Date
```

Ajoute du temps à une date et renvoie une nouvelle `Date`. Les jours, semaines, mois et années entiers suivent le calendrier : un jour plus tard, c'est la même heure le lendemain, même s'il y a un changement d'heure entre-temps, et le 31 janvier plus un mois donne la fin février. Les heures et les unités plus petites sont exactes.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `amount` | `number \| string` | Un nombre accompagné de `unit`, ou une durée comme `"1h30m"` ou `"1 month"`. |
| `unit?` | [`CalendarUnit`](#calendarunit)` \| `[`TimeZoneOptions`](#timezoneoptions) | L'unité d'un nombre. Une quantité en texte porte ses propres unités : les options peuvent donc venir ici. Par défaut : `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) | Le fuseau dont le calendrier est suivi. |

**Lève** `TypeError` : Si une quantité en texte n'est pas une durée, ou si l'unité n'en est pas une.

```js
time.add(new Date(), "2h30m");
time.add(new Date(), 3, "days");
time.add(new Date(), "1 month");
time.add(new Date(2024, 0, 31), 1, "month"); // 2024-02-29
time.add(date, "1 day", { timeZone: "Europe/Paris" });
```

## subtract

```ts
subtract(date: DateInput, amount: string | number, unit?: TimeZoneOptions | CalendarUnit, options?: TimeZoneOptions): Date
```

Soustrait du temps à une date et renvoie une nouvelle `Date`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date` | [`DateInput`](#dateinput) |  |
| `amount` | `number \| string` |  |
| `unit?` | [`CalendarUnit`](#calendarunit)` \| `[`TimeZoneOptions`](#timezoneoptions) | L'unité d'un nombre, ou les options quand la quantité est un texte. Par défaut : `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

**Lève** `TypeError` : Si une quantité en texte n'est pas une durée, ou si l'unité n'en est pas une.

```js
time.subtract(new Date(), 7, "days");
time.subtract(new Date(), "90m");
```

## diff

```ts
diff(a: DateInput, b: DateInput, unit?: CalendarUnit, options?: TimeZoneOptions): number
```

`a - b` dans une unité. Les unités fixes peuvent donner des fractions ; les mois et les années sont des mois et des années calendaires entiers.

| Paramètre | Type | Description |
| --- | --- | --- |
| `a` | [`DateInput`](#dateinput) |  |
| `b` | [`DateInput`](#dateinput) |  |
| `unit?` | [`CalendarUnit`](#calendarunit) | Par défaut : `"ms"`. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) | Le fuseau dont le calendrier est suivi pour les mois et les années. |

**Lève** `TypeError` : Si l'unité n'en est pas une.

```js
time.diff("2024-01-03", "2024-01-01", "days");   // 2
time.diff("2024-03-15", "2024-01-20", "months"); // 1
```

## startOf

```ts
startOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

Une nouvelle `Date` au début du jour, de la semaine, du mois... dans le fuseau horaire global, ou dans celui que vous indiquez.

```js
time.startOf(new Date(), "day");                              // aujourd'hui à 00:00
time.startOf(new Date(), "week");                             // lundi à 00:00
time.startOf(new Date(), "week", { weekStartsOn: 0 });        // dimanche à 00:00
time.startOf(new Date(), "day", { timeZone: "Asia/Tokyo" });  // minuit à Tokyo
```

## endOf

```ts
endOf(date: DateInput, unit: StartOfUnit, options?: WeekOptions): Date
```

Une nouvelle `Date` à la dernière milliseconde du jour, de la semaine, du mois...

```js
time.endOf(new Date(), "month"); // dernier jour du mois, 23:59:59.999
```

## isBefore

```ts
isBefore(a: DateInput, b: DateInput): boolean
```

`a` est-elle avant `b` ?

## isAfter

```ts
isAfter(a: DateInput, b: DateInput): boolean
```

`a` est-elle après `b` ?

```js
if (time.isAfter(expiresAt, Date.now())) grantAccess();
```

## isBetween

```ts
isBetween(date: DateInput, start: DateInput, end: DateInput): boolean
```

La date est-elle entre `start` et `end`, bornes comprises ?

## isSame

```ts
isSame(a: DateInput, b: DateInput, unit: StartOfUnit, options?: WeekOptions): boolean
```

Les deux dates sont-elles dans la même année, le même mois, la même semaine, le même jour, la même heure... ?

```js
time.isSame(a, b, "month");
time.isSame(a, b, "day", { timeZone: "America/New_York" });
```

## isSameDay

```ts
isSameDay(a: DateInput, b: DateInput, options?: TimeZoneOptions): boolean
```

Les deux dates tombent-elles le même jour calendaire ?

```js
time.isSameDay(a, b);                            // heure locale
time.isSameDay(a, b, { timeZone: "Asia/Tokyo" }); // vu de Tokyo
```

## isToday

```ts
isToday(date: DateInput, options?: TimeZoneOptions): boolean
```

La date est-elle aujourd'hui ?

## isYesterday

```ts
isYesterday(date: DateInput, options?: TimeZoneOptions): boolean
```

La date était-elle hier ?

## isTomorrow

```ts
isTomorrow(date: DateInput, options?: TimeZoneOptions): boolean
```

La date est-elle demain ?

## isWeekend

```ts
isWeekend(date: DateInput, options?: TimeZoneOptions): boolean
```

Est-ce un samedi ou un dimanche ?

## isLeapYear

```ts
isLeapYear(yearOrDate: DateInput): boolean
```

Est-ce une année bissextile ?

| Paramètre | Type | Description |
| --- | --- | --- |
| `yearOrDate` | `number \| `[`DateInput`](#dateinput) | Une année (de 1000 à 9999) ou une date. |

```js
time.isLeapYear(2024); // true
time.isLeapYear(1900); // false
```

## isValid

```ts
isValid(value: unknown): boolean
```

Est-ce une vraie date, ou une valeur dont l'analyse en donne une ?

```js
time.isValid("2024-02-29"); // true
time.isValid("2024-02-30"); // false
```

## daysInMonth

```ts
daysInMonth(dateOrYear: DateInput, month?: number): number
```

Nombre de jours dans un mois.

| Paramètre | Type | Description |
| --- | --- | --- |
| `dateOrYear` | [`DateInput`](#dateinput)` \| number` | Une date, ou une année quand vous passez `month`. |
| `month?` | `number` | De 1 à 12. |

```js
time.daysInMonth(new Date(2024, 1)); // 29
time.daysInMonth(2023, 2);           // 28
```

## dayOfYear

```ts
dayOfYear(date?: DateInput, options?: TimeZoneOptions): number
```

Jour de l'année, de 1 à 366.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Par défaut : maintenant. |
| `options?` | [`TimeZoneOptions`](#timezoneoptions) |  |

## weekOfYear

```ts
weekOfYear(date?: DateInput, options?: { utc?: boolean; timeZone?: string; } | undefined): number
```

Numéro de semaine ISO, de 1 à 53. Les semaines commencent le lundi, et la semaine 1 contient le premier jeudi de l'année.

| Paramètre | Type | Description |
| --- | --- | --- |
| `date?` | [`DateInput`](#dateinput) | Par défaut : maintenant. |
| `options?` | `{ utc?: boolean, timeZone?: string }` | `utc` lit la date en UTC, `timeZone` dans un autre fuseau. |

```js
time.weekOfYear(new Date(2021, 0, 3)); // 53, the last week of 2020
```

## min

```ts
min(dates: Iterable<DateInput>): Date | undefined
```

La date la plus ancienne.

## max

```ts
max(dates: Iterable<DateInput>): Date | undefined
```

La date la plus récente.

## unix

```ts
unix(): number
```

L'horodatage Unix actuel, en secondes.

## fromUnix

```ts
fromUnix(seconds: number): Date
```

Une `Date` à partir d'un horodatage Unix en secondes, comme on en trouve dans les JWT et dans de nombreuses API.

```js
time.fromUnix(1705329000); // 2024-01-15T14:30:00.000Z
```

## range

```ts
range(start: DateInput, end: DateInput, unit?: CalendarUnit, options?: DateRangeOptions): Date[]
```

Toutes les dates de `start` à `end`, bornes comprises, espacées d'une unité. Pratique pour les graphiques, les calendriers et les rapports.

| Paramètre | Type | Description |
| --- | --- | --- |
| `start` | [`DateInput`](#dateinput) |  |
| `end` | [`DateInput`](#dateinput) |  |
| `unit?` | [`CalendarUnit`](#calendarunit) | Par défaut : `"day"`. |
| `options?` | [`DateRangeOptions`](#daterangeoptions) |  |

**Lève** `RangeError` : Si le pas n'est pas positif, ou si la plage contiendrait plus d'un million de dates.

```js
time.range("2024-01-01", "2024-01-07", "day");           // 7 dates
time.range(start, end, "month");                          // le même jour chaque mois
time.range(start, end, "minute", { step: 15 });           // tous les quarts d'heure
```

## stopwatch

```ts
stopwatch(): Stopwatch
```

Démarre un chronomètre précis.

```js
const sw = time.stopwatch();
await loadConfig(); sw.lap("config");
await connectDb();  sw.lap("db");
console.log(sw.stop(true)); // "182.4ms"
```

## measure

```ts
measure<T>(fn: () => T): Promise<{ result: Awaited<T>; duration: number; }>
```

Exécute une fonction, synchrone ou asynchrone, et vous dit combien de temps elle a pris.

**Renvoie** `Promise``<{ result: ``Awaited``<``T``>, duration: number }>` : `duration` est en millisecondes.

```js
const { result, duration } = await time.measure(() => db.query(sql));
nc.info(`Query took ${duration.toFixed(1)}ms`);
```

## every

```ts
every(interval: string | number, task: () => unknown, options?: EveryOptions): ScheduledTask
```

Exécute une tâche à intervalle régulier. Contrairement à `setInterval`, une exécution lente retarde la suivante au lieu de s'accumuler, le rythme ne dérive pas et les erreurs sont interceptées.

| Paramètre | Type | Description |
| --- | --- | --- |
| `interval` | `number \| string` | En ms, ou une durée comme `"30s"`. |
| `task` | `() => unknown` | Peut être asynchrone. |
| `options?` | [`EveryOptions`](#everyoptions) |  |

**Lève** `RangeError` : Si l'intervalle n'est pas une durée positive.

```js
const job = time.every("5m", syncInventory, { immediate: true, onError: nc.error });
job.next(); // date de la prochaine exécution
job.stop();
```

## nextRun

```ts
nextRun(expression: string, options?: CronOptions): Date | undefined
```

La prochaine date qui correspond à une expression cron, sans rien planifier.

Les expressions ont 5 champs (`minute hour day month weekday`), ou 6 avec les secondes en premier. Vous pouvez utiliser `*`, des listes (`1,15`), des plages (`1-5`), des pas (`*/15`), des noms (`jan`, `mon-fri`), `L` pour le dernier jour du mois, et `@daily`, `@hourly`, `@weekly`, `@monthly`, `@yearly`. Comme dans le cron classique, quand le jour et le jour de la semaine sont tous deux définis, il suffit que l'un des deux corresponde.

**Renvoie** `Date`` | undefined` : `undefined` si rien ne correspond dans les 8 ans.

**Lève** `SyntaxError` : Si l'expression est invalide.

```js
time.nextRun("0 9 * * mon-fri");                              // prochain jour de semaine à 09:00
time.nextRun("0 0 1 * *", { timeZone: "America/New_York" });  // prochain 1er du mois
```

## cron

```ts
cron(expression: string, task: () => unknown, options?: CronOptions): ScheduledTask
```

Exécute une tâche selon une planification cron, dans n'importe quel fuseau horaire. Les changements d'heure sont gérés : une heure sautée est sautée, une heure répétée ne s'exécute qu'une fois. Voir `nextRun()` pour la syntaxe.

| Paramètre | Type | Description |
| --- | --- | --- |
| `expression` | `string` |  |
| `task` | `() => unknown` | Peut être asynchrone. |
| `options?` | [`CronOptions`](#cronoptions) |  |

**Lève** `SyntaxError` : Si l'expression est invalide.

```js
const job = time.cron("0 9 * * 1-5", sendDailyReport, { timeZone: "Europe/Paris" });
time.cron("*/15 * * * *", refreshCache, { onError: nc.error });
job.stop();
```

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { CalendarOptions } from "@ix-xs/node-comfort"`.

### CalendarOptions

Options de `calendar()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Par défaut : la langue globale. |
| `timeZone?` | `string` | Par défaut : le fuseau global, puis celui du système. |
| `now?` | [`DateInput`](#dateinput) | Ce que vaut « maintenant ». Par défaut : l'heure actuelle. |

### CalendarUnit

Une unité fixe, ou les mois et les années, dont la longueur varie.

```ts
type CalendarUnit = DurationUnit | "M" | "month" | "months" | "y" | "year" | "years"
```

### CronOptions

Options de `cron()` et `nextRun()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Fuseau dans lequel l'expression est lue, comme `"Europe/Paris"`. Par défaut : le fuseau global, puis celui du système. |
| `from?` | [`DateInput`](#dateinput) | `nextRun()` uniquement : cherche après cette date. Par défaut : maintenant. |
| `unref?` | `boolean` | Laisse le processus se terminer même si la planification est active. |
| `overlap?` | `boolean` | Lance une exécution même si la précédente n'est pas terminée. Par défaut, elle est sautée. |
| `immediate?` | `boolean` | `cron()` uniquement : exécute aussi une fois tout de suite. |
| `onError?` | `((error: unknown) => void)` | Appelée quand la tâche échoue. |

### DateInput

Une date : une `Date`, un horodatage en ms, ou une chaîne que `new Date()` comprend (ISO 8601 est le plus sûr).

```ts
type DateInput = Date | number | string
```

### DateRangeOptions

Options de `range()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `step?` | `number` | Nombre d'unités entre deux dates. Par défaut : `1`. |
| `timeZone?` | `string` | Fuseau dont le calendrier sert aux jours, semaines, mois et années. |

### DurationUnit

Une unité de longueur fixe.

```ts
type DurationUnit = "ms" | "millisecond" | "milliseconds" | "s" | "sec" | "second" | "seconds" | "m" | "min" | "minute" | "minutes" | "h" | "hour" | "hours" | "d" | "day" | "days" | "w" | "week" | "weeks"
```

### EveryOptions

Options de `every()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `immediate?` | `boolean` | Exécute aussi une fois tout de suite. |
| `unref?` | `boolean` | Laisse le processus se terminer même si la planification est active. |
| `onError?` | `((error: unknown) => void)` | Appelée quand la tâche échoue. Sans elle, les erreurs remontent comme des erreurs non gérées. |

### FormatDateOptions

Options de `format()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue des noms de mois et de jours. Par défaut : la langue globale. |
| `timeZone?` | `string` | Affiche la date dans ce fuseau, comme `"Asia/Tokyo"`. Par défaut : le fuseau global, puis celui du système. |

### FormatDurationOptions

Options de `formatDuration()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `long?` | `boolean` | Mots complets et traduits : `"1 hour 30 minutes"` au lieu de `"1h 30m"`. |
| `units?` | `number` | Affiche au plus ce nombre d'unités, les plus grandes d'abord : `units: 2` transforme `"1d 3h 5m"` en `"1d 3h"`. |
| `clock?` | `boolean` | Style horloge, comme `"01:30:05"`. |
| `milliseconds?` | `boolean` | Affiche les millisecondes. Par défaut : `true`. |
| `locale?` | `string` | Langue pour `long`. Par défaut : la langue globale. |

### ParseDateOptions

Options de `parse()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Langue des noms de mois dans le texte. Par défaut : la langue globale. |
| `timeZone?` | `string` | Fuseau dans lequel le texte est écrit, sauf s'il porte son propre décalage. Par défaut : le fuseau global, puis celui du système. |

### RelativeOptions

Options de `relative()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `locale?` | `string` | Par défaut : la langue globale. |
| `numeric?` | `"auto" \| "always"` | `"auto"` dit `"yesterday"` au lieu de `"1 day ago"`. Par défaut : `"always"`. |
| `style?` | `"long" \| "short" \| "narrow"` | `"short"` donne `"in 3 mo."`. Par défaut : `"long"`. |

### ScheduledTask

Une planification renvoyée par `every()` et `cron()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `stop` | `() => void` | Arrête la planification. Une exécution en cours se termine. |
| `next` | `() => ``Date` | Date prévue de la prochaine exécution. |
| `isRunning` | `() => boolean` | Indique si une exécution est en cours. |
| `runs` | `() => number` | Nombre d'exécutions lancées. |

### StartOfUnit

Une unité pour `startOf()` et `endOf()`.

```ts
type StartOfUnit = "year" | "quarter" | "month" | "week" | "isoWeek" | "day" | "hour" | "minute" | "second"
```

### Stopwatch

Renvoyé par `stopwatch()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `elapsed` | `() => number` | Millisecondes écoulées depuis le départ. |
| `stop` | `(format?: boolean) => string \| number` | Le temps écoulé ; `stop(true)` le formate, comme `"1.5s"`. |
| `lap` | `(label?: string) => number` | Enregistre un tour et renvoie les ms écoulées depuis le précédent. |
| `laps` | `() => { label: string; ms: number; total: number; }[]` | Tous les tours jusqu'ici. |
| `reset` | `() => void` | Repart de zéro. |

### TimeZoneOptions

Réglage du fuseau horaire.

| Propriété | Type | Description |
| --- | --- | --- |
| `timeZone?` | `string` | Fuseau qui sert à décider quel jour on est. Par défaut : le fuseau global, puis celui du système. |

### WeekOptions

Réglages de la semaine.

| Propriété | Type | Description |
| --- | --- | --- |
| `weekStartsOn?` | `0 \| 4 \| 6 \| 1 \| 2 \| 3 \| 5` | Premier jour de la semaine : `0` pour dimanche, `1` pour lundi. Par défaut : `1`. |
| `timeZone?` | `string` | Fuseau dont le calendrier est utilisé. Par défaut : le fuseau global, puis celui du système. |
