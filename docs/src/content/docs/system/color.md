---
title: "Colors"
description: "`nc.color` styles terminal text. Chain as many styles as you want, then call the result on your text."
sidebar:
  order: 4
---

```js
const { color } = require("@ix-xs/node-comfort");

console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.red.underline("Error:"), "disk is full");
```

## Styles

Modifiers: `bold`, `dim`, `italic`, `underline`, `overline`, `inverse`, `hidden`, `strikethrough`, `reset`.

Colors: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, and their `Bright` versions (`redBright`...). Backgrounds use a `bg` prefix: `bgRed`, `bgBlueBright`...

Nesting works: ``color.red(`a ${color.blue("b")} c`)`` keeps the red after the blue part.

## Any color

```js
color.hex("#ff8800")("orange");
color.bgHex("#1e1e2e").hex("#cba6f7")(" node-comfort ");
color.rgb(255, 128, 0)("orange");
color.ansi256(208)("orange");
color.gradient("Rainbow text", ["#ff5f6d", "#ffc371"]);
```

You write the color you want once, and it adapts to the terminal. Where millions of colors aren't available, it becomes the closest of 256 or 16 colors, and with colors off the text comes back as it is:

```js
color.create(3).hex("#ff8800")("orange"); // "\x1b[38;2;255;136;0morange\x1b[39m" (millions)
color.create(2).hex("#ff8800")("orange"); // "\x1b[38;5;214morange\x1b[39m"       (256)
color.create(1).hex("#ff8800")("orange"); // "\x1b[93morange\x1b[39m"             (16)
color.create(0).hex("#ff8800")("orange"); // "orange"
```

## When colors appear

Colors are on in a terminal and off when the output goes to a file or a pipe, so logs stay clean. CI services that show colors in their logs (GitHub Actions, GitLab CI, CircleCI and a few others) get them too. You can override that:

- `NO_COLOR=1` or `--no-color` turns them off, even when `FORCE_COLOR` is set;
- `FORCE_COLOR=1`, `2` or `3` (16, 256 or millions of colors) or `--color` turns them on;
- `color.level = 0` turns them off from code, and `color.level = undefined` goes back to what the terminal supports.

`color.detect(stream)` tells you what a stream supports, and `color.create(level)` gives you a separate instance, for example to write colors to a file on purpose.

## Helpers

```js
color.strip("\x1b[31mred\x1b[39m");             // "red"
color.width("日本 👋");                          // 7 columns: wide characters count as 2
color.truncate("A very long line of text", 10); // "A very lo…"
color.link("Docs", "https://example.com");      // clickable in modern terminals, "Docs (https://example.com)" elsewhere
```

`truncate` cuts text to a number of columns, counted the way `width` counts them. It's safe on colored text: what's left keeps its colors, and they are still closed at the end.

```js
const line = color.red("A very long line of text");
color.truncate(line, 10);                       // "A very lo…", still red, and the red ends after the …
color.truncate(line, process.stdout.columns);   // never wider than the terminal
color.truncate("A very long line of text", 10, { ellipsis: "..." }); // "A very ..."
```
