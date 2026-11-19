---
title: "Couleurs"
description: "`nc.color` met en forme le texte du terminal : enchaînez les styles, appelez le résultat sur le texte. Les couleurs s'adaptent à ce que le terminal sait afficher et disparaissent dans les fichiers et les pipes."
---

```js
const { color } = require("@ix-xs/node-comfort");

console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
console.log(color.red.underline("Error:"), "disk is full");
```

## Styles

Enchaînez autant de styles que vous voulez, puis appelez la chaîne sur le texte. L'imbrication conserve le style extérieur : ``color.red(`a ${color.blue("b")} c`)`` repasse en rouge après `b`.

| Type | Noms |
| --- | --- |
| Modificateurs | `bold`, `dim`, `italic`, `underline`, `overline`, `inverse`, `hidden`, `strikethrough`, `reset` |
| Couleurs | `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray` (ou `grey`) |
| Couleurs vives | `blackBright`, `redBright`, `greenBright`, `yellowBright`, `blueBright`, `magentaBright`, `cyanBright`, `whiteBright` |
| Fonds | `bg` + une couleur : `bgRed`, `bgBlueBright`, `bgGray`... |

## N'importe quelle couleur

```js
color.hex("#ff8800")("orange");
color.bgHex("#1e1e2e").hex("#cba6f7")(" node-comfort ");
color.rgb(255, 128, 0)("orange");
color.ansi256(208)("orange");
color.gradient("Rainbow text", ["#ff5f6d", "#ffc371"]);
```

| Fonction | Texte | Fond |
| --- | --- | --- |
| Code hexadécimal (`"#f80"`, `"#ff8800"`) | `hex` | `bgHex` |
| Rouge, vert, bleu de 0 à 255 | `rgb` | `bgRgb` |
| Palette de 256 couleurs | `ansi256` | `bgAnsi256` |
| Le long d'un dégradé de couleurs hexadécimales | `gradient(text, colors)` | |

La couleur s'écrit une fois et se convertit selon ce que le terminal affiche :

```js
color.create(3).hex("#ff8800")("orange"); // "\x1b[38;2;255;136;0morange\x1b[39m" (16 millions de couleurs)
color.create(2).hex("#ff8800")("orange"); // "\x1b[38;5;214morange\x1b[39m"       (256)
color.create(1).hex("#ff8800")("orange"); // "\x1b[93morange\x1b[39m"             (16)
color.create(0).hex("#ff8800")("orange"); // "orange"
```

## Quand les couleurs apparaissent

Les couleurs sont actives dans un terminal et coupées quand la sortie va dans un fichier ou un pipe. Les services de CI qui affichent les couleurs dans leurs journaux (GitHub Actions, GitLab CI, CircleCI et d'autres) les reçoivent aussi.

| Réglage | Effet |
| --- | --- |
| `NO_COLOR=1` ou `--no-color` | Coupées, même avec `FORCE_COLOR` |
| `FORCE_COLOR=1`, `2` ou `3`, ou `--color` | Actives, en 16, 256 ou 16 millions de couleurs |
| `color.level = 0` | Coupées, depuis le code |
| `color.level = undefined` | Retour à ce que le terminal sait afficher |

| Membre | |
| --- | --- |
| `level` | De `0` à `3`, le niveau actuel |
| `enabled` | Si les couleurs sont écrites |
| `detect(stream)` | Le niveau qu'un flux accepte, `NO_COLOR` et `FORCE_COLOR` compris |
| `create(level)`, `create({ level })` | Une instance séparée avec son propre niveau : pour un autre flux, un fichier, des tests |

## Utilitaires de texte

```js
color.strip("\x1b[31mred\x1b[39m");             // "red"
color.width("日本 👋");                          // 7 : les caractères larges occupent 2 colonnes
color.truncate("A very long line of text", 10); // "A very lo…"
color.truncate("A very long line of text", 10, { ellipsis: "..." }); // "A very ..."
color.link("Docs", "https://example.com");      // un lien cliquable, ou "Docs (https://example.com)" là où les liens ne sont pas pris en charge
```

| Fonction | Rôle |
| --- | --- |
| `strip(text)` | Retire les couleurs, tous les autres codes d'échappement et les caractères de contrôle sauf les tabulations et les retours à la ligne |
| `width(text)` | Colonnes occupées par le texte, couleurs ignorées, emoji et CJK comptés pour 2 |
| `truncate(text, columns, { ellipsis })` | Coupe à un nombre de colonnes ; les couleurs sont gardées et refermées après les points de suspension |
| `link(text, url)` | Un lien hypertexte de terminal ; les caractères de contrôle sont retirés des deux |

`truncate` est sûr sur du texte coloré : `color.truncate(line, process.stdout.columns)` ne revient jamais à la ligne.
