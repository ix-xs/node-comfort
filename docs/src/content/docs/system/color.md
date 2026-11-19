---
title: "Colors"
description: "`nc.color` styles terminal text: chain styles, call the result on the text. Colors adapt to what the terminal supports and disappear in files and pipes."
---

```js
const { color } = require("@ix-xs/node-comfort");

console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.red.underline("Error:"), "disk is full");
```

## Styles

Chain any number of styles, then call the chain on the text. Nesting keeps the outer style: ``color.red(`a ${color.blue("b")} c`)`` is red again after `b`.

| Kind | Names |
| --- | --- |
| Modifiers | `bold`, `dim`, `italic`, `underline`, `overline`, `inverse`, `hidden`, `strikethrough`, `reset` |
| Colors | `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray` (or `grey`) |
| Bright colors | `blackBright`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright` |
| Backgrounds | `bg` + a color: `bgRed`, `bgBlueBright`, `bgGray`... |

## Any color

```js
color.hex("#ff8800")("orange");
color.bgHex("#1e1e2e").hex("#cba6f7")(" node-comfort ");
color.rgb(255, 128, 0)("orange");
color.ansi256(208)("orange");
color.gradient("Rainbow text", ["#ff5f6d", "#ffc371"]);
```

| Function | Text | Background |
| --- | --- | --- |
| Hex code (`"#f80"`, `"#ff8800"`) | `hex` | `bgHex` |
| Red, green, blue from 0 to 255 | `rgb` | `bgRgb` |
| 256-color palette | `ansi256` | `bgAnsi256` |
| Along a gradient of hex colors | `gradient(text, colors)` | |

The color is written once and converted to what the terminal supports:

```js
color.create(3).hex("#ff8800")("orange"); // "\x1b[38;2;255;136;0morange\x1b[39m" (16 million colors)
color.create(2).hex("#ff8800")("orange"); // "\x1b[38;5;214morange\x1b[39m"       (256)
color.create(1).hex("#ff8800")("orange"); // "\x1b[93morange\x1b[39m"             (16)
color.create(0).hex("#ff8800")("orange"); // "orange"
```

## When colors appear

Colors are on in a terminal and off when the output goes to a file or a pipe. CI services that show colors in their logs (GitHub Actions, GitLab CI, CircleCI and others) get them too.

| Setting | Effect |
| --- | --- |
| `NO_COLOR=1` or `--no-color` | Off, even with `FORCE_COLOR` |
| `FORCE_COLOR=1`, `2` or `3`, or `--color` | On, with 16, 256 or 16 million colors |
| `color.level = 0` | Off, from code |
| `color.level = undefined` | Back to what the terminal supports |

| Member | |
| --- | --- |
| `level` | `0` to `3`, the current level |
| `enabled` | Whether colors are written |
| `detect(stream)` | The level a stream supports, with `NO_COLOR` and `FORCE_COLOR` applied |
| `create(level)`, `create({ level })` | A separate instance with its own level: for another stream, a file, tests |

## Text helpers

```js
color.strip("\x1b[31mred\x1b[39m");             // "red"
color.width("日本 👋");                          // 7: wide characters take 2 columns
color.truncate("A very long line of text", 10); // "A very lo…"
color.truncate("A very long line of text", 10, { ellipsis: "..." }); // "A very ..."
color.link("Docs", "https://example.com");      // a clickable link, or "Docs (https://example.com)" where links are not supported
```

| Function | Does |
| --- | --- |
| `strip(text)` | Removes colors, every other escape code and the control characters but tabs and new lines |
| `width(text)` | Columns the text takes, colors ignored, emoji and CJK counted as 2 |
| `truncate(text, columns, { ellipsis })` | Cuts to a number of columns; colors are kept and closed after the ellipsis |
| `link(text, url)` | A terminal hyperlink; control characters are removed from both |

`truncate` is safe on colored text, so `color.truncate(line, process.stdout.columns)` never wraps.
