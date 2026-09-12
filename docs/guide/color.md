# Colors

`nc.color` styles terminal text. Chain as many styles as you want, then call the result on your text.

```js
const { color } = require("@ix-xs/node-comfort");

console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.red.underline("Error:"), "disk is full");
```

## Styles

Modifiers: `bold`, `dim`, `italic`, `underline`, `overline`, `inverse`, `hidden`, `strikethrough`, `reset`.

Colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, and their `Bright` versions (`redBright`...). Backgrounds use a `bg` prefix: `bgRed`, `bgBlueBright`...

Nesting works: `color.red(`a ${color.blue("b")} c`)` keeps the red after the blue part.

## Any color

```js
color.hex("#ff8800")("orange");
color.bgHex("#1e1e2e").hex("#cba6f7")(" node-comfort ");
color.rgb(255, 128, 0)("orange");
color.ansi256(208)("orange");
color.gradient("Rainbow text", ["#ff5f6d", "#ffc371"]);
```

On terminals with fewer colors, truecolor is converted to the closest of 256 or 16 colors.

## When colors appear

Colors are on in a terminal and off when the output goes to a file or a pipe, so logs stay clean. You can override that:

- `NO_COLOR=1` or `--no-color` turns them off;
- `FORCE_COLOR=1`, `2` or `3` (16, 256 or millions of colors) or `--color` turns them on;
- `color.level = 0` turns them off from code.

`color.detect(stream)` tells you what a stream supports, and `color.create(level)` gives you a separate instance, for example to write colors to a file on purpose.

## Helpers

```js
color.strip("\x1b[31mred\x1b[39m");  // "red"
color.width("日本 👋");               // 7 columns: wide characters count as 2
color.link("Docs", "https://example.com"); // clickable in modern terminals
```
