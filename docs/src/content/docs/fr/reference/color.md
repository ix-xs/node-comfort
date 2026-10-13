---
title: "nc.color"
description: "Des couleurs de terminal que vous pouvez chaîner, comme `chalk`. Le truecolor est pris en charge, et rétrogradé sur les terminaux plus anciens. Les couleurs se désactivent d'elles-mêmes quand la sortie n'est pas un terminal ou que `NO_COLOR` est défini ; `FORCE_COLOR=1|2|3` les réactive."
sidebar:
  label: "color"
  order: 21
---

```js
const { color } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const color = require("@ix-xs/node-comfort/color");
```

Cette page liste tout ce que contient `nc.color`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/color/).

```js
console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.bgHex("#1e1e2e").hex("#cba6f7")(" nc "));
console.log(color.gradient("node-comfort", ["#ff5f6d", "#ffc371"]));
```

## level

```ts
level: ColorLevel
```

Le niveau de couleur actuel. Affectez-le pour en forcer un : `0` désactive les couleurs, `undefined` revient à ce que le terminal prend en charge.

## enabled

```ts
enabled: boolean
```

Indique si les couleurs sont émises.

## create

```ts
create(level?: ColorLevel): ColorModule
```

Une instance séparée avec son propre niveau, pour un autre flux ou pour les tests.

## detect

```ts
detect(stream?: WriteStream | { isTTY?: boolean; } | undefined): ColorLevel
```

Le niveau de couleur pris en charge par un flux, en tenant compte de `NO_COLOR` et de `FORCE_COLOR`.

## strip

```ts
strip(text: string): string
```

Retire les couleurs et les autres codes d'échappement du terminal.

## width

```ts
width(text: string): number
```

Le nombre de colonnes occupées par le texte, sans tenir compte des couleurs et en comptant 2 pour les emoji et les caractères CJK.

## truncate

```ts
truncate(text: string, columns: number, options?: { ellipsis?: string; } | undefined): string
```

Coupe le texte à un nombre de colonnes et ajoute `…`. Les couleurs sont conservées et restent correctement fermées.

## link

```ts
link(text: string, url: string): string
```

Un lien cliquable dans les terminaux qui le prennent en charge, `"text (url)"` ailleurs.

## gradient

```ts
gradient(text: string, colors: string[]): string
```

Colore le texte le long d'un dégradé de couleurs hexadécimales.

## Également disponibles

`reset` • `bold` • `dim` • `italic` • `underline` • `overline` • `inverse` • `hidden` • `strikethrough` • `black` • `red` • `green` • `yellow` • `blue` • `magenta` • `cyan` • `white` • `gray` • `grey` • `blackBright` • `redBright` • `greenBright` • `yellowBright` • `blueBright` • `magentaBright` • `cyanBright` • `whiteBright` • `bgBlack` • `bgRed` • `bgGreen` • `bgYellow` • `bgBlue` • `bgMagenta` • `bgCyan` • `bgWhite` • `bgGray` • `bgGrey` • `bgBlackBright` • `bgRedBright` • `bgGreenBright` • `bgYellowBright` • `bgBlueBright` • `bgMagentaBright` • `bgCyanBright` • `bgWhiteBright` • `rgb` • `bgRgb` • `hex` • `bgHex` • `ansi256` • `bgAnsi256`

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { ColorChain } from "@ix-xs/node-comfort"`.

### ColorChain

Un style que vous pouvez appeler sur du texte, ou chaîner avec d'autres styles.

```ts
type ColorChain = ((...text: unknown[]) => string) & ColorStyles & ColorMethods
```

### ColorHelpers

Utilitaires de couleur.

| Propriété | Type | Description |
| --- | --- | --- |
| `level` | [`ColorLevel`](#colorlevel) | Le niveau de couleur actuel. Affectez-le pour en forcer un : `0` désactive les couleurs, `undefined` revient à ce que le terminal prend en charge. |
| `enabled` | `boolean` | Indique si les couleurs sont émises. |
| `create` | `(level?: `[`ColorLevel`](#colorlevel)`) => `[`ColorModule`](#colormodule) | Une instance séparée avec son propre niveau, pour un autre flux ou pour les tests. |
| `detect` | `(stream?: ``WriteStream`` \| { isTTY?: boolean; } \| undefined) => `[`ColorLevel`](#colorlevel) | Le niveau de couleur pris en charge par un flux, en tenant compte de `NO_COLOR` et de `FORCE_COLOR`. |
| `strip` | `(text: string) => string` | Retire les couleurs et les autres codes d'échappement du terminal. |
| `width` | `(text: string) => number` | Le nombre de colonnes occupées par le texte, sans tenir compte des couleurs et en comptant 2 pour les emoji et les caractères CJK. |
| `truncate` | `(text: string, columns: number, options?: { ellipsis?: string; } \| undefined) => string` | Coupe le texte à un nombre de colonnes et ajoute `…`. Les couleurs sont conservées et restent correctement fermées. |
| `link` | `(text: string, url: string) => string` | Un lien cliquable dans les terminaux qui le prennent en charge, `"text (url)"` ailleurs. |
| `gradient` | `(text: string, colors: string[]) => string` | Colore le texte le long d'un dégradé de couleurs hexadécimales. |

### ColorLevel

Le nombre de couleurs que le terminal peut afficher : `0` aucune, `1` 16, `2` 256, `3` des millions.

```ts
type ColorLevel = 0 | 1 | 2 | 3
```

### ColorMethods

Couleurs personnalisées, disponibles sur n'importe quel chaînage.

| Propriété | Type | Description |
| --- | --- | --- |
| `rgb` | `(r: number, g: number, b: number) => `[`ColorChain`](#colorchain) | Couleur du texte à partir du rouge, du vert et du bleu (0-255). |
| `bgRgb` | `(r: number, g: number, b: number) => `[`ColorChain`](#colorchain) | Fond à partir du rouge, du vert et du bleu (0-255). |
| `hex` | `(hex: string) => `[`ColorChain`](#colorchain) | Couleur du texte à partir d'un code hexadécimal comme `"#f80"`. |
| `bgHex` | `(hex: string) => `[`ColorChain`](#colorchain) | Fond à partir d'un code hexadécimal. |
| `ansi256` | `(code: number) => `[`ColorChain`](#colorchain) | Couleur du texte issue de la palette de 256 couleurs. |
| `bgAnsi256` | `(code: number) => `[`ColorChain`](#colorchain) | Fond issu de la palette de 256 couleurs. |

### ColorModule

`nc.color` : tous les styles et toutes les couleurs, plus quelques utilitaires.

```ts
type ColorModule = ColorStyles & ColorMethods & ColorHelpers
```

### ColorStyleProps

Les styles nommés. Chacun peut être appelé sur du texte ou chaîné avec d'autres : `color.red("x")`, `color.red.bold.underline("x")`.

| Propriété | Type | Description |
| --- | --- | --- |
| `reset` | [`ColorChain`](#colorchain) | Retire tous les styles. |
| `bold` | [`ColorChain`](#colorchain) | Texte en gras. |
| `dim` | [`ColorChain`](#colorchain) | Texte atténué. |
| `italic` | [`ColorChain`](#colorchain) | Texte en italique, là où le terminal le prend en charge. |
| `underline` | [`ColorChain`](#colorchain) | Texte souligné. |
| `overline` | [`ColorChain`](#colorchain) | Ligne au-dessus du texte, là où c'est pris en charge. |
| `inverse` | [`ColorChain`](#colorchain) | Échange les couleurs du texte et du fond. |
| `hidden` | [`ColorChain`](#colorchain) | Texte invisible, mais toujours copiable. |
| `strikethrough` | [`ColorChain`](#colorchain) | Texte barré. |
| `black` | [`ColorChain`](#colorchain) | Texte noir. |
| `red` | [`ColorChain`](#colorchain) | Texte rouge. |
| `green` | [`ColorChain`](#colorchain) | Texte vert. |
| `yellow` | [`ColorChain`](#colorchain) | Texte jaune. |
| `blue` | [`ColorChain`](#colorchain) | Texte bleu. |
| `magenta` | [`ColorChain`](#colorchain) | Texte magenta. |
| `cyan` | [`ColorChain`](#colorchain) | Texte cyan. |
| `white` | [`ColorChain`](#colorchain) | Texte blanc. |
| `gray` | [`ColorChain`](#colorchain) | Texte gris. |
| `grey` | [`ColorChain`](#colorchain) | Identique à `gray`. |
| `blackBright` | [`ColorChain`](#colorchain) | Texte noir vif. |
| `redBright` | [`ColorChain`](#colorchain) | Texte rouge vif. |
| `greenBright` | [`ColorChain`](#colorchain) | Texte vert vif. |
| `yellowBright` | [`ColorChain`](#colorchain) | Texte jaune vif. |
| `blueBright` | [`ColorChain`](#colorchain) | Texte bleu vif. |
| `magentaBright` | [`ColorChain`](#colorchain) | Texte magenta vif. |
| `cyanBright` | [`ColorChain`](#colorchain) | Texte cyan vif. |
| `whiteBright` | [`ColorChain`](#colorchain) | Texte blanc vif. |
| `bgBlack` | [`ColorChain`](#colorchain) | Fond noir. |
| `bgRed` | [`ColorChain`](#colorchain) | Fond rouge. |
| `bgGreen` | [`ColorChain`](#colorchain) | Fond vert. |
| `bgYellow` | [`ColorChain`](#colorchain) | Fond jaune. |
| `bgBlue` | [`ColorChain`](#colorchain) | Fond bleu. |
| `bgMagenta` | [`ColorChain`](#colorchain) | Fond magenta. |
| `bgCyan` | [`ColorChain`](#colorchain) | Fond cyan. |
| `bgWhite` | [`ColorChain`](#colorchain) | Fond blanc. |
| `bgGray` | [`ColorChain`](#colorchain) | Fond gris. |
| `bgGrey` | [`ColorChain`](#colorchain) | Identique à `bgGray`. |
| `bgBlackBright` | [`ColorChain`](#colorchain) | Fond noir vif. |
| `bgRedBright` | [`ColorChain`](#colorchain) | Fond rouge vif. |
| `bgGreenBright` | [`ColorChain`](#colorchain) | Fond vert vif. |
| `bgYellowBright` | [`ColorChain`](#colorchain) | Fond jaune vif. |
| `bgBlueBright` | [`ColorChain`](#colorchain) | Fond bleu vif. |
| `bgMagentaBright` | [`ColorChain`](#colorchain) | Fond magenta vif. |
| `bgCyanBright` | [`ColorChain`](#colorchain) | Fond cyan vif. |
| `bgWhiteBright` | [`ColorChain`](#colorchain) | Fond blanc vif. |

### ColorStyles

Les styles nommés, en lecture seule.

```ts
type ColorStyles = Readonly<ColorStyleProps>
```

### StyleEntry

Un style dans un chaînage : des codes fixes, ou une couleur résolue au moment de la sortie.

```ts
type StyleEntry = { open: string; close: string; } | { rgb: [number, number, number]; bg: boolean; } | { ansi256: number; bg: boolean; }
```

### StyleName

Tous les styles nommés.

```ts
type StyleName = "reset" | "bold" | "dim" | "italic" | "underline" | "overline" | "inverse" | "hidden" | "strikethrough" | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "grey" | "blackBright" | "redBright" | "greenBright" | "yellowBright" | "blueBright" | "magentaBright" | "cyanBright" | "whiteBright" | "bgBlack" | "bgRed" | "bgGreen" | "bgYellow" | "bgBlue" | "bgMagenta" | "bgCyan" | "bgWhite" | "bgGray" | "bgGrey" | "bgBlackBright" | "bgRedBright" | "bgGreenBright" | "bgYellowBright" | "bgBlueBright" | "bgMagentaBright" | "bgCyanBright" | "bgWhiteBright"
```
