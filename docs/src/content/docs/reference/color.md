---
title: "nc.color"
description: "Terminal colors you can chain, like `chalk`. Truecolor is supported and downgraded on older terminals. Colors switch off by themselves when the output isn't a terminal or `NO_COLOR` is set; `FORCE_COLOR=1|2|3` turns them back on."
sidebar:
  label: "color"
  order: 21
---

```js
const { color } = require("@ix-xs/node-comfort");
// or on its own, which loads nothing else
const color = require("@ix-xs/node-comfort/color");
```

This page lists everything `nc.color` has, as your editor shows it. For explanations and longer examples, read [the guide](/system/color/).

```js
console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.bgHex("#1e1e2e").hex("#cba6f7")(" nc "));
console.log(color.gradient("node-comfort", ["#ff5f6d", "#ffc371"]));
```

## level

```ts
level: ColorLevel
```

The current color level. Set it to force one: `0` turns colors off, `undefined` goes back to what the terminal supports.

## enabled

```ts
enabled: boolean
```

Whether colors are being output.

## create

```ts
create(level?: ColorLevel): ColorModule
```

A separate instance with its own level, for another stream or for tests.

## detect

```ts
detect(stream?: WriteStream | { isTTY?: boolean; } | undefined): ColorLevel
```

The color level a stream supports, taking `NO_COLOR` and `FORCE_COLOR` into account.

## strip

```ts
strip(text: string): string
```

Removes colors and other terminal escape codes.

## width

```ts
width(text: string): number
```

How many columns the text takes, ignoring colors and counting emoji and CJK as 2.

## truncate

```ts
truncate(text: string, columns: number, options?: { ellipsis?: string; } | undefined): string
```

Cuts text to a number of columns and adds `…`. Colors are kept and still closed properly.

## link

```ts
link(text: string, url: string): string
```

A clickable link in terminals that support it, `"text (url)"` elsewhere.

## gradient

```ts
gradient(text: string, colors: string[]): string
```

Colors the text along a gradient of hex colors.

## Also available

`reset` • `bold` • `dim` • `italic` • `underline` • `overline` • `inverse` • `hidden` • `strikethrough` • `black` • `red` • `green` • `yellow` • `blue` • `magenta` • `cyan` • `white` • `gray` • `grey` • `blackBright` • `redBright` • `greenBright` • `yellowBright` • `blueBright` • `magentaBright` • `cyanBright` • `whiteBright` • `bgBlack` • `bgRed` • `bgGreen` • `bgYellow` • `bgBlue` • `bgMagenta` • `bgCyan` • `bgWhite` • `bgGray` • `bgGrey` • `bgBlackBright` • `bgRedBright` • `bgGreenBright` • `bgYellowBright` • `bgBlueBright` • `bgMagentaBright` • `bgCyanBright` • `bgWhiteBright` • `rgb` • `bgRgb` • `hex` • `bgHex` • `ansi256` • `bgAnsi256`

## Types

The types behind the options and results above. In TypeScript, import them from the package: `import type { ColorChain } from "@ix-xs/node-comfort"`.

### ColorChain

A style you can call on text, or chain with more styles.

```ts
type ColorChain = ((...text: unknown[]) => string) & ColorStyles & ColorMethods
```

### ColorHelpers

Color helpers.

| Property | Type | Description |
| --- | --- | --- |
| `level` | [`ColorLevel`](#colorlevel) | The current color level. Set it to force one: `0` turns colors off, `undefined` goes back to what the terminal supports. |
| `enabled` | `boolean` | Whether colors are being output. |
| `create` | `(level?: `[`ColorLevel`](#colorlevel)`) => `[`ColorModule`](#colormodule) | A separate instance with its own level, for another stream or for tests. |
| `detect` | `(stream?: ``WriteStream`` \| { isTTY?: boolean; } \| undefined) => `[`ColorLevel`](#colorlevel) | The color level a stream supports, taking `NO_COLOR` and `FORCE_COLOR` into account. |
| `strip` | `(text: string) => string` | Removes colors and other terminal escape codes. |
| `width` | `(text: string) => number` | How many columns the text takes, ignoring colors and counting emoji and CJK as 2. |
| `truncate` | `(text: string, columns: number, options?: { ellipsis?: string; } \| undefined) => string` | Cuts text to a number of columns and adds `…`. Colors are kept and still closed properly. |
| `link` | `(text: string, url: string) => string` | A clickable link in terminals that support it, `"text (url)"` elsewhere. |
| `gradient` | `(text: string, colors: string[]) => string` | Colors the text along a gradient of hex colors. |

### ColorLevel

How many colors the terminal can show: `0` none, `1` 16, `2` 256, `3` millions.

```ts
type ColorLevel = 0 | 1 | 2 | 3
```

### ColorMethods

Custom colors, available on every chain.

| Property | Type | Description |
| --- | --- | --- |
| `rgb` | `(r: number, g: number, b: number) => `[`ColorChain`](#colorchain) | Text color from red, green and blue (0-255). |
| `bgRgb` | `(r: number, g: number, b: number) => `[`ColorChain`](#colorchain) | Background from red, green and blue (0-255). |
| `hex` | `(hex: string) => `[`ColorChain`](#colorchain) | Text color from a hex code like `"#f80"`. |
| `bgHex` | `(hex: string) => `[`ColorChain`](#colorchain) | Background from a hex code. |
| `ansi256` | `(code: number) => `[`ColorChain`](#colorchain) | Text color from the 256-color palette. |
| `bgAnsi256` | `(code: number) => `[`ColorChain`](#colorchain) | Background from the 256-color palette. |

### ColorModule

`nc.color`: every style and color, plus a few helpers.

```ts
type ColorModule = ColorStyles & ColorMethods & ColorHelpers
```

### ColorStyleProps

The named styles. Each one can be called on text or chained with others:
`color.red("x")`, `color.red.bold.underline("x")`.

| Property | Type | Description |
| --- | --- | --- |
| `reset` | [`ColorChain`](#colorchain) | Removes all styles. |
| `bold` | [`ColorChain`](#colorchain) | Bold text. |
| `dim` | [`ColorChain`](#colorchain) | Faint text. |
| `italic` | [`ColorChain`](#colorchain) | Italic text, where the terminal supports it. |
| `underline` | [`ColorChain`](#colorchain) | Underlined text. |
| `overline` | [`ColorChain`](#colorchain) | Line above the text, where supported. |
| `inverse` | [`ColorChain`](#colorchain) | Swaps text and background colors. |
| `hidden` | [`ColorChain`](#colorchain) | Invisible text, still copyable. |
| `strikethrough` | [`ColorChain`](#colorchain) | Crossed-out text. |
| `black` | [`ColorChain`](#colorchain) | Black text. |
| `red` | [`ColorChain`](#colorchain) | Red text. |
| `green` | [`ColorChain`](#colorchain) | Green text. |
| `yellow` | [`ColorChain`](#colorchain) | Yellow text. |
| `blue` | [`ColorChain`](#colorchain) | Blue text. |
| `magenta` | [`ColorChain`](#colorchain) | Magenta text. |
| `cyan` | [`ColorChain`](#colorchain) | Cyan text. |
| `white` | [`ColorChain`](#colorchain) | White text. |
| `gray` | [`ColorChain`](#colorchain) | Gray text. |
| `grey` | [`ColorChain`](#colorchain) | Same as `gray`. |
| `blackBright` | [`ColorChain`](#colorchain) | Bright black text. |
| `redBright` | [`ColorChain`](#colorchain) | Bright red text. |
| `greenBright` | [`ColorChain`](#colorchain) | Bright green text. |
| `yellowBright` | [`ColorChain`](#colorchain) | Bright yellow text. |
| `blueBright` | [`ColorChain`](#colorchain) | Bright blue text. |
| `magentaBright` | [`ColorChain`](#colorchain) | Bright magenta text. |
| `cyanBright` | [`ColorChain`](#colorchain) | Bright cyan text. |
| `whiteBright` | [`ColorChain`](#colorchain) | Bright white text. |
| `bgBlack` | [`ColorChain`](#colorchain) | Black background. |
| `bgRed` | [`ColorChain`](#colorchain) | Red background. |
| `bgGreen` | [`ColorChain`](#colorchain) | Green background. |
| `bgYellow` | [`ColorChain`](#colorchain) | Yellow background. |
| `bgBlue` | [`ColorChain`](#colorchain) | Blue background. |
| `bgMagenta` | [`ColorChain`](#colorchain) | Magenta background. |
| `bgCyan` | [`ColorChain`](#colorchain) | Cyan background. |
| `bgWhite` | [`ColorChain`](#colorchain) | White background. |
| `bgGray` | [`ColorChain`](#colorchain) | Gray background. |
| `bgGrey` | [`ColorChain`](#colorchain) | Same as `bgGray`. |
| `bgBlackBright` | [`ColorChain`](#colorchain) | Bright black background. |
| `bgRedBright` | [`ColorChain`](#colorchain) | Bright red background. |
| `bgGreenBright` | [`ColorChain`](#colorchain) | Bright green background. |
| `bgYellowBright` | [`ColorChain`](#colorchain) | Bright yellow background. |
| `bgBlueBright` | [`ColorChain`](#colorchain) | Bright blue background. |
| `bgMagentaBright` | [`ColorChain`](#colorchain) | Bright magenta background. |
| `bgCyanBright` | [`ColorChain`](#colorchain) | Bright cyan background. |
| `bgWhiteBright` | [`ColorChain`](#colorchain) | Bright white background. |

### ColorStyles

The named styles, read-only.

```ts
type ColorStyles = Readonly<ColorStyleProps>
```

### StyleEntry

A style in a chain: fixed codes, or a color resolved at output time.

```ts
type StyleEntry = { open: string; close: string; } | { rgb: [number, number, number]; bg: boolean; } | { ansi256: number; bg: boolean; }
```

### StyleName

Every named style.

```ts
type StyleName = "reset" | "bold" | "dim" | "italic" | "underline" | "overline" | "inverse" | "hidden" | "strikethrough" | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "grey" | "blackBright" | "redBright" | "greenBright" | "yellowBright" | "blueBright" | "magentaBright" | "cyanBright" | "whiteBright" | "bgBlack" | "bgRed" | "bgGreen" | "bgYellow" | "bgBlue" | "bgMagenta" | "bgCyan" | "bgWhite" | "bgGray" | "bgGrey" | "bgBlackBright" | "bgRedBright" | "bgGreenBright" | "bgYellowBright" | "bgBlueBright" | "bgMagentaBright" | "bgCyanBright" | "bgWhiteBright"
```
