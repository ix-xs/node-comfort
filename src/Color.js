"use strict";

/**
 * Terminal colors you can chain, like `chalk`. Truecolor is supported and
 * downgraded on older terminals. Colors switch off by themselves when the
 * output isn't a terminal or `NO_COLOR` is set; `FORCE_COLOR=1|2|3` turns
 * them back on.
 *
 * @example
 * console.log(color.green.bold("✔ Done"), color.gray("in 1.2s"));
 * console.log(color.bgHex("#1e1e2e").hex("#cba6f7")(" nc "));
 * console.log(color.gradient("node-comfort", ["#ff5f6d", "#ffc371"]));
 */

/**
 * Every named style.
 * @typedef {"reset" | "bold" | "dim" | "italic" | "underline" | "overline" | "inverse" | "hidden" | "strikethrough"
 *   | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "grey"
 *   | "blackBright" | "redBright" | "greenBright" | "yellowBright" | "blueBright" | "magentaBright" | "cyanBright" | "whiteBright"
 *   | "bgBlack" | "bgRed" | "bgGreen" | "bgYellow" | "bgBlue" | "bgMagenta" | "bgCyan" | "bgWhite" | "bgGray" | "bgGrey"
 *   | "bgBlackBright" | "bgRedBright" | "bgGreenBright" | "bgYellowBright" | "bgBlueBright" | "bgMagentaBright" | "bgCyanBright" | "bgWhiteBright"} StyleName
 */

/**
 * How many colors the terminal can show: `0` none, `1` 16, `2` 256, `3` millions.
 * @typedef {0 | 1 | 2 | 3} ColorLevel
 */

/**
 * The named styles. Each one can be called on text or chained with others:
 * `color.red("x")`, `color.red.bold.underline("x")`.
 * @typedef {object} ColorStyleProps
 * @property {ColorChain} reset Removes all styles.
 * @property {ColorChain} bold Bold text.
 * @property {ColorChain} dim Faint text.
 * @property {ColorChain} italic Italic text, where the terminal supports it.
 * @property {ColorChain} underline Underlined text.
 * @property {ColorChain} overline Line above the text, where supported.
 * @property {ColorChain} inverse Swaps text and background colors.
 * @property {ColorChain} hidden Invisible text, still copyable.
 * @property {ColorChain} strikethrough Crossed-out text.
 * @property {ColorChain} black Black text.
 * @property {ColorChain} red Red text.
 * @property {ColorChain} green Green text.
 * @property {ColorChain} yellow Yellow text.
 * @property {ColorChain} blue Blue text.
 * @property {ColorChain} magenta Magenta text.
 * @property {ColorChain} cyan Cyan text.
 * @property {ColorChain} white White text.
 * @property {ColorChain} gray Gray text.
 * @property {ColorChain} grey Same as `gray`.
 * @property {ColorChain} blackBright Bright black text.
 * @property {ColorChain} redBright Bright red text.
 * @property {ColorChain} greenBright Bright green text.
 * @property {ColorChain} yellowBright Bright yellow text.
 * @property {ColorChain} blueBright Bright blue text.
 * @property {ColorChain} magentaBright Bright magenta text.
 * @property {ColorChain} cyanBright Bright cyan text.
 * @property {ColorChain} whiteBright Bright white text.
 * @property {ColorChain} bgBlack Black background.
 * @property {ColorChain} bgRed Red background.
 * @property {ColorChain} bgGreen Green background.
 * @property {ColorChain} bgYellow Yellow background.
 * @property {ColorChain} bgBlue Blue background.
 * @property {ColorChain} bgMagenta Magenta background.
 * @property {ColorChain} bgCyan Cyan background.
 * @property {ColorChain} bgWhite White background.
 * @property {ColorChain} bgGray Gray background.
 * @property {ColorChain} bgGrey Same as `bgGray`.
 * @property {ColorChain} bgBlackBright Bright black background.
 * @property {ColorChain} bgRedBright Bright red background.
 * @property {ColorChain} bgGreenBright Bright green background.
 * @property {ColorChain} bgYellowBright Bright yellow background.
 * @property {ColorChain} bgBlueBright Bright blue background.
 * @property {ColorChain} bgMagentaBright Bright magenta background.
 * @property {ColorChain} bgCyanBright Bright cyan background.
 * @property {ColorChain} bgWhiteBright Bright white background.
 */

/**
 * The named styles, read-only.
 * @typedef {Readonly<ColorStyleProps>} ColorStyles
 */

/**
 * A style you can call on text, or chain with more styles.
 *
 * @typedef {((...text: unknown[]) => string) & ColorStyles & ColorMethods} ColorChain
 */

/**
 * Custom colors, available on every chain.
 * @typedef {object} ColorMethods
 * @property {(r: number, g: number, b: number) => ColorChain} rgb Text color from red, green and blue (0-255).
 * @property {(r: number, g: number, b: number) => ColorChain} bgRgb Background from red, green and blue (0-255).
 * @property {(hex: string) => ColorChain} hex Text color from a hex code like `"#f80"`.
 * @property {(hex: string) => ColorChain} bgHex Background from a hex code.
 * @property {(code: number) => ColorChain} ansi256 Text color from the 256-color palette.
 * @property {(code: number) => ColorChain} bgAnsi256 Background from the 256-color palette.
 */

/**
 * `nc.color`: every style and color, plus a few helpers.
 *
 * @typedef {ColorStyles & ColorMethods & ColorHelpers} ColorModule
 */

/**
 * Color helpers.
 * @typedef {object} ColorHelpers
 * @property {ColorLevel} level The current color level. Set it to force one; `0` turns colors off.
 * @property {boolean} enabled Whether colors are being output.
 * @property {(level?: ColorLevel) => ColorModule} create A separate instance with its own level, for another stream or for tests.
 * @property {(stream?: NodeJS.WriteStream | { isTTY?: boolean }) => ColorLevel} detect The color level a stream supports, taking `NO_COLOR` and `FORCE_COLOR` into account.
 * @property {(text: string) => string} strip Removes colors and other terminal escape codes.
 * @property {(text: string) => number} width How many columns the text takes, ignoring colors and counting emoji and CJK as 2.
 * @property {(text: string, url: string) => string} link A clickable link in terminals that support it, `"text (url)"` elsewhere.
 * @property {(text: string, colors: string[]) => string} gradient Colors the text along a gradient of hex colors.
 */

/** @type {Record<string, [number, number]>} */
const _CODES = {
  reset: [0, 0], bold: [1, 22], dim: [2, 22], italic: [3, 23], underline: [4, 24], overline: [53, 55],
  inverse: [7, 27], hidden: [8, 28], strikethrough: [9, 29],
  black: [30, 39], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], white: [37, 39],
  gray: [90, 39], grey: [90, 39], blackBright: [90, 39], redBright: [91, 39], greenBright: [92, 39], yellowBright: [93, 39],
  blueBright: [94, 39], magentaBright: [95, 39], cyanBright: [96, 39], whiteBright: [97, 39],
  bgBlack: [40, 49], bgRed: [41, 49], bgGreen: [42, 49], bgYellow: [43, 49], bgBlue: [44, 49], bgMagenta: [45, 49], bgCyan: [46, 49], bgWhite: [47, 49],
  bgGray: [100, 49], bgGrey: [100, 49], bgBlackBright: [100, 49], bgRedBright: [101, 49], bgGreenBright: [102, 49], bgYellowBright: [103, 49],
  bgBlueBright: [104, 49], bgMagentaBright: [105, 49], bgCyanBright: [106, 49], bgWhiteBright: [107, 49],
};

/**
 * A style in a chain: fixed codes, or a color resolved at output time.
 * @typedef {{ open: string, close: string } | { rgb: [number, number, number], bg: boolean } | { ansi256: number, bg: boolean }} StyleEntry
 */

const _ANSI_REGEX = /[\u001b\u009b](?:\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[[\]()#;?]*(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/g;

/**
 * @param {string} hex
 * @returns {[number, number, number]}
 */
const _hexToRgb = (hex) => {
  const clean = String(hex).replace(/^#/, "");
  const full = clean.length === 3 || clean.length === 4 ? [...clean.slice(0, 3)].map((c) => c + c).join("") : clean.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new TypeError(`Invalid hex color "${hex}"`);
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
const _rgbToAnsi256 = (r, g, b) => {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return 16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5);
};

/**
 * @param {number} code
 * @returns {[number, number, number]}
 */
const _ansi256ToRgb = (code) => {
  if (code < 16) {
    const base = [[0, 0, 0], [205, 0, 0], [0, 205, 0], [205, 205, 0], [0, 0, 238], [205, 0, 205], [0, 205, 205], [229, 229, 229],
      [127, 127, 127], [255, 0, 0], [0, 255, 0], [255, 255, 0], [92, 92, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255]];
    return /** @type {[number, number, number]} */ (base[code]);
  }
  if (code >= 232) {
    const v = (code - 232) * 10 + 8;
    return [v, v, v];
  }
  const n = code - 16;
  const step = (/** @type {number} */ x) => (x === 0 ? 0 : x * 40 + 55);
  return [step(Math.floor(n / 36)), step(Math.floor((n % 36) / 6)), step(n % 6)];
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number} A 16-color foreground code (30-37, 90-97).
 */
const _rgbToAnsi16 = (r, g, b) => {
  const value = Math.round((Math.max(r, g, b) / 255) * 2);
  if (value === 0) return 30;
  const code = 30 + ((Math.round(b / 255) << 2) | (Math.round(g / 255) << 1) | Math.round(r / 255));
  return value === 2 ? code + 60 : code;
};

/**
 * Resolves a style entry into escape codes for a given level.
 * @param {StyleEntry} entry
 * @param {ColorLevel} level
 * @returns {{ open: string, close: string }}
 */
const _resolve = (entry, level) => {
  if ("open" in entry) return entry;
  const close = entry.bg ? "\u001b[49m" : "\u001b[39m";
  const rgb = "rgb" in entry ? entry.rgb : _ansi256ToRgb(entry.ansi256);
  if (level >= 3 && "rgb" in entry) return { open: `\u001b[${entry.bg ? 48 : 38};2;${rgb[0]};${rgb[1]};${rgb[2]}m`, close };
  if (level >= 2) {
    const code = "ansi256" in entry ? entry.ansi256 : _rgbToAnsi256(...rgb);
    return { open: `\u001b[${entry.bg ? 48 : 38};5;${code}m`, close };
  }
  const code = _rgbToAnsi16(...rgb) + (entry.bg ? 10 : 0);
  return { open: `\u001b[${code}m`, close };
};

/**
 * @param {NodeJS.WriteStream | { isTTY?: boolean } | undefined} stream
 * @returns {ColorLevel}
 */
const _detect = (stream = process.stdout) => {
  const env = process.env;
  const argv = process.argv;
  if (argv.includes("--no-color") || argv.includes("--no-colors") || argv.includes("--color=false")) return 0;
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return 0;
  if (env.NODE_DISABLE_COLORS !== undefined && env.NODE_DISABLE_COLORS !== "") return 0;
  if (env.FORCE_COLOR !== undefined) {
    const value = env.FORCE_COLOR.toLowerCase();
    if (value === "false" || value === "0") return 0;
    if (value === "2") return 2;
    if (value === "3") return 3;
    return 1;
  }
  if (argv.includes("--color=16m") || argv.includes("--color=full") || argv.includes("--color=truecolor")) return 3;
  if (argv.includes("--color=256")) return 2;
  const forced = argv.includes("--color") || argv.includes("--colors") || argv.includes("--color=true") || argv.includes("--color=always");
  if (env.TERM === "dumb" && !forced) return 0;
  const tty = /** @type {NodeJS.WriteStream | undefined} */ (stream && "isTTY" in stream && stream.isTTY ? stream : undefined);
  if (tty && typeof tty.getColorDepth === "function") {
    const depth = tty.getColorDepth();
    if (depth >= 24) return 3;
    if (depth >= 8) return 2;
    if (depth >= 4) return 1;
    return forced ? 1 : 0;
  }
  if (env.CI !== undefined) {
    if (env.GITHUB_ACTIONS || env.GITEA_ACTIONS) return 3;
    if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((name) => name in env)) return 1;
  }
  return forced ? 1 : 0;
};

/**
 * Terminal width of one grapheme.
 * @param {string} grapheme
 * @returns {number}
 */
const _charWidth = (grapheme) => {
  const cp = /** @type {number} */ (grapheme.codePointAt(0));
  if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if (/^\p{Mark}+$/u.test(grapheme)) return 0;
  if (/\p{Emoji_Presentation}/u.test(grapheme) || grapheme.includes("\ufe0f")) return 2;
  if (/[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{20000}-\u{3FFFD}]/u.test(grapheme)) return 2;
  return 1;
};

/** @type {Intl.Segmenter | undefined} */
let _segmenter;
const _graphemeSegmenter = () => (_segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" }));

/**
 * @param {string} text
 * @returns {string}
 */
const strip = (text) => String(text).replace(_ANSI_REGEX, "");

/**
 * @param {string} text
 * @returns {number}
 */
const width = (text) => {
  const plain = strip(text);
  if (/^[\x20-\x7e]*$/.test(plain)) return plain.length;
  let total = 0;
  for (const { segment } of _graphemeSegmenter().segment(plain)) total += _charWidth(segment);
  return total;
};

const _supportsHyperlinks = () => {
  const env = process.env;
  if (env.FORCE_HYPERLINK === "1") return true;
  if (env.FORCE_HYPERLINK === "0") return false;
  if (!process.stdout.isTTY) return false;
  if (env.WT_SESSION || env.KONSOLE_VERSION || env.DOMTERM) return true;
  if (["iTerm.app", "WezTerm", "vscode", "Hyper", "ghostty", "Tabby"].includes(env.TERM_PROGRAM ?? "")) return true;
  if (env.VTE_VERSION && Number(env.VTE_VERSION) >= 5000) return true;
  return false;
};

/**
 * Builds an independent color instance.
 * @param {ColorLevel | undefined} forcedLevel
 * @returns {ColorModule}
 */
const _createModule = (forcedLevel) => {
  /** @type {ColorLevel | undefined} */
  let level = forcedLevel;
  const currentLevel = () => (level === undefined ? (level = _detect()) : level);

  /**
   * @param {StyleEntry[]} stack
   * @param {string} text
   * @returns {string}
   */
  const apply = (stack, text) => {
    const lvl = currentLevel();
    if (lvl === 0 || !stack.length || text === "") return text;
    const resolved = stack.map((entry) => _resolve(entry, lvl));
    let result = text;
    for (const { open, close } of resolved) {
      if (close && result.includes(close)) result = result.split(close).join(close + open);
    }
    const opens = resolved.map((s) => s.open).join("");
    const closes = resolved.map((s) => s.close).reverse().join("");
    if (result.includes("\n")) result = result.replace(/\r?\n/g, (nl) => closes + nl + opens);
    return opens + result + closes;
  };

  const STACK = Symbol("stack");
  /** @type {any} */
  const proto = Object.create(Function.prototype);

  /**
   * @param {StyleEntry[]} stack
   * @returns {ColorChain}
   */
  const chain = (stack) => {
    /** @type {any} */
    const fn = (/** @type {unknown[]} */ ...text) => apply(stack, text.map((t) => String(t)).join(" "));
    Object.setPrototypeOf(fn, proto);
    fn[STACK] = stack;
    return fn;
  };

  for (const [name, [open, close]] of Object.entries(_CODES)) {
    Object.defineProperty(proto, name, {
      get() {
        return chain([...(this[STACK] ?? []), { open: `\u001b[${open}m`, close: `\u001b[${close}m` }]);
      },
    });
  }
  /** @type {Record<string, (this: any, ...args: any[]) => ColorChain>} */
  const methods = {
    rgb(r, g, b) { return chain([...(this[STACK] ?? []), { rgb: [r, g, b], bg: false }]); },
    bgRgb(r, g, b) { return chain([...(this[STACK] ?? []), { rgb: [r, g, b], bg: true }]); },
    hex(hex) { return chain([...(this[STACK] ?? []), { rgb: _hexToRgb(hex), bg: false }]); },
    bgHex(hex) { return chain([...(this[STACK] ?? []), { rgb: _hexToRgb(hex), bg: true }]); },
    ansi256(code) { return chain([...(this[STACK] ?? []), { ansi256: code, bg: false }]); },
    bgAnsi256(code) { return chain([...(this[STACK] ?? []), { ansi256: code, bg: true }]); },
  };
  for (const [name, method] of Object.entries(methods)) Object.defineProperty(proto, name, { value: method });

  /** @type {any} */
  const root = Object.create(proto);
  root[STACK] = [];
  Object.defineProperties(root, {
    level: {
      enumerable: true,
      get: currentLevel,
      set(/** @type {ColorLevel} */ value) {
        level = /** @type {ColorLevel} */ (Math.max(0, Math.min(3, Math.floor(value))));
      },
    },
    enabled: { enumerable: true, get: () => currentLevel() > 0 },
    create: { enumerable: true, value: (/** @type {ColorLevel | undefined} */ lvl) => _createModule(lvl) },
    detect: { enumerable: true, value: _detect },
    strip: { enumerable: true, value: strip },
    width: { enumerable: true, value: width },
    link: {
      enumerable: true,
      value: (/** @type {string} */ text, /** @type {string} */ url) =>
        currentLevel() > 0 && _supportsHyperlinks() ? `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007` : `${text} (${url})`,
    },
    gradient: {
      enumerable: true,
      value: (/** @type {string} */ text, /** @type {string[]} */ colors) => {
        const stops = colors.map(_hexToRgb);
        if (!stops.length) return String(text);
        const graphemes = Array.from(_graphemeSegmenter().segment(String(text)), (s) => s.segment);
        const visible = graphemes.filter((g) => g.trim()).length;
        let index = 0;
        return graphemes
          .map((g) => {
            if (!g.trim()) return g;
            const t = visible <= 1 ? 0 : index++ / (visible - 1);
            const pos = t * (stops.length - 1);
            const i = Math.min(Math.floor(pos), stops.length - 2 < 0 ? 0 : stops.length - 2);
            const a = stops[i];
            const b = stops[Math.min(i + 1, stops.length - 1)];
            const f = pos - i;
            const mix = /** @type {[number, number, number]} */ (a.map((v, k) => Math.round(v + (b[k] - v) * f)));
            return apply([{ rgb: mix, bg: false }], g);
          })
          .join("");
      },
    },
  });
  return root;
};

/** @type {ColorModule} */
const color = _createModule(undefined);

module.exports = color;

