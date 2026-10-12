---
title: "Couleurs"
description: "`nc.color` met en forme le texte du terminal. Enchaînez autant de styles que vous voulez, puis appelez le résultat sur votre texte."
sidebar:
  order: 4
---

```js
const { color } = require("@ix-xs/node-comfort");

console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.red.underline("Error:"), "disk is full");
```

## Styles

Modificateurs : `bold`, `dim`, `italic`, `underline`, `overline`, `inverse`, `hidden`, `strikethrough`, `reset`.

Couleurs : `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, et leurs versions `Bright` (`redBright`...). Les fonds utilisent le préfixe `bg` : `bgRed`, `bgBlueBright`...

L'imbrication fonctionne : ``color.red(`a ${color.blue("b")} c`)`` conserve le rouge après la partie bleue.

## N'importe quelle couleur

```js
color.hex("#ff8800")("orange");
color.bgHex("#1e1e2e").hex("#cba6f7")(" node-comfort ");
color.rgb(255, 128, 0)("orange");
color.ansi256(208)("orange");
color.gradient("Rainbow text", ["#ff5f6d", "#ffc371"]);
```

Vous écrivez une seule fois la couleur voulue, et elle s'adapte au terminal. Là où les millions de couleurs ne sont pas disponibles, elle devient la plus proche parmi 256 ou 16 couleurs, et quand les couleurs sont désactivées, le texte revient tel quel :

```js
color.create(3).hex("#ff8800")("orange"); // "\x1b[38;2;255;136;0morange\x1b[39m" (millions)
color.create(2).hex("#ff8800")("orange"); // "\x1b[38;5;214morange\x1b[39m"       (256)
color.create(1).hex("#ff8800")("orange"); // "\x1b[93morange\x1b[39m"             (16)
color.create(0).hex("#ff8800")("orange"); // "orange"
```

## Quand les couleurs apparaissent

Les couleurs sont activées dans un terminal et désactivées quand la sortie va vers un fichier ou un pipe : les logs restent ainsi propres. Les services de CI qui affichent les couleurs dans leurs logs (GitHub Actions, GitLab CI, CircleCI et quelques autres) les reçoivent aussi. Vous pouvez passer outre :

- `NO_COLOR=1` ou `--no-color` les désactive, même quand `FORCE_COLOR` est défini ;
- `FORCE_COLOR=1`, `2` ou `3` (16, 256 ou des millions de couleurs) ou `--color` les active ;
- `color.level = 0` les désactive depuis le code, et `color.level = undefined` revient à ce que le terminal prend en charge.

`color.detect(stream)` vous dit ce qu'un stream prend en charge, et `color.create(level)` vous donne une instance séparée, par exemple pour écrire volontairement des couleurs dans un fichier.

## Utilitaires

```js
color.strip("\x1b[31mred\x1b[39m");             // "red"
color.width("日本 👋");                          // 7 colonnes : les caractères larges comptent pour 2
color.truncate("A very long line of text", 10); // "A very lo…"
color.link("Docs", "https://example.com");      // cliquable dans les terminaux modernes, "Docs (https://example.com)" ailleurs
```

`truncate` coupe un texte à un nombre de colonnes, comptées comme `width` les compte. Il est sûr sur du texte coloré : ce qui reste garde ses couleurs, et elles sont bien refermées à la fin.

```js
const line = color.red("A very long line of text");
color.truncate(line, 10);                       // "A very lo…", toujours rouge, et le rouge s'arrête après le …
color.truncate(line, process.stdout.columns);   // jamais plus large que le terminal
color.truncate("A very long line of text", 10, { ellipsis: "..." }); // "A very ..."
```
