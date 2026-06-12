/**
   * Text styles for console ANSI formatting
   * @private
   */
const _style = {
  normal: 0,
  bold: 1,
  italic: 3,
  underline: 4,
  overline: 9,
};

/**
   * Text colors for console ANSI formatting
   * @private
   */
const _color = {
  fg: {
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36,
    white: 37,
    gray: 90,
    redBright: 91,
    greenBright: 92,
    yellowBright: 93,
    blueBright: 94,
    magentaBright: 95,
    cyanBright: 96,
    whiteBright: 97,
    rgb: 38,
  },
  bg: {
    black: 40,
    red: 41,
    green: 42,
    yellow: 43,
    blue: 44,
    magenta: 45,
    cyan: 46,
    white: 47,
    gray: 100,
    redBright: 101,
    greenBright: 102,
    yellowBright: 103,
    blueBright: 104,
    magentaBright: 105,
    cyanBright: 106,
    whiteBright: 107,
    rgb: 48,
  },
};

/**
   * Default logger options
   * @private
   */
const _options = {
  delimiter: {
    open: "<%",
    close: "%>",
  },
  timestamp: true,
};

/**
   * Array to manage log groups (indentation)
   * @private
   */
const _groups = [];

/**
   * Returns the ANSI code for a given style, color, or bg
   * @private
   * @param {string} value - The style/color name (e.g., "bold", "red", "rgb(255, 0, 0)")
   * @returns {number|string|null} The ANSI code, rgb marker, or null if unknown
   */
const _getCode = (value) => {
  if (_style[value] !== undefined) return _style[value];
  if (_color.fg[value] !== undefined) return _color.fg[value];
  if (value.startsWith("bg")) {
    const bg = value.charAt(2).toLowerCase() + value.slice(3);
    if (_color.bg[bg] !== undefined) return _color.bg[bg];
  }

  const rgbMatch = value.match(/^rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      return `rgb:${r},${g},${b}`;
    }
  }

  return null;
};

/**
   * Parses content between delimiters to extract styles and text
   * @private
   * @param {string} input - Content between delimiters (e.g., "red bold hello" or "rgb(255, 0, 0) hello")
   * @returns {{ codes: number[], text: string }} ANSI codes and text to display
   */
const _parse = (input) => {
  const rgbMatch = input.match(/rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)/);
  const rgbValue = rgbMatch ? rgbMatch[0] : null;
  const cleanedInput = input.replace(/rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)/, "").trim();
  const tokens = cleanedInput.trim().split(/\s+/);
  const styles = [];
  const fgs = [];
  const bgs = [];
  const txts = [];

  for (const token of tokens) {
    if (!token) continue;
    const code = _getCode(token);
    if (code === null) {
      txts.push(token);
    } else {
      if (_style[token] !== undefined) {
        styles.push(code);
      } else if (token.startsWith("bg")) {
        bgs.push(code);
      } else {
        fgs.push(code);
      }
    }
  }

  const codes = [...styles, ...bgs, ...fgs];

  if (rgbValue) {
    const rgbParts = rgbValue.match(/rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)/);
    if (rgbParts) {
      const r = parseInt(rgbParts[1], 10);
      const g = parseInt(rgbParts[2], 10);
      const b = parseInt(rgbParts[3], 10);
      codes.push(38, 2, r, g, b);
    }
  }

  const text = cleanedInput
      .replace(
        /^\s*((redBright|greenBright|yellowBright|blueBright|magentaBright|cyanBright|whiteBright|red|green|yellow|blue|magenta|cyan|white|gray|black|bold|italic|underline|overline|bg\w+|rgb\(\d+\s*,\s*\d+\s*,\s*\d+\)|\s+)*)/gi,
        "",
      )
      .trimStart();
  return { codes, text };
};

/**
   * Builds the ANSI sequence from codes
   * @private
   * @param {number[]} codes - Array of ANSI codes
   * @returns {string} The ANSI sequence (e.g., "\x1B[1;31m")
   */
const _build = (codes) => {
  if (codes.length === 0) return "";
  return `\x1B[${codes.join(";")}m`;
};

/**
   * Applies ANSI formatting to a string, replacing content between delimiters
   * @private
   * @param {string} str - String to format (e.g., "<%red hello%>")
   * @returns {string} String with ANSI sequences
   */
const _apply = (str) => {
  const esc_start = _options.delimiter.open.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const esc_end = _options.delimiter.close.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  return str.replace(
    new RegExp(`${esc_start}([\\s\\S]*?)${esc_end}`, "g"),
    (match, content) => {
      const { codes, text } = _parse(content);
      if (codes.length === 0 || text === "") return text;

      if (text.includes("\n")) {
        return text
            .split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => `${_build(codes)}${line}\x1B[0m`)
            .join("\n");
      }

      return `${_build(codes)}${text}\x1B[0m`;
    },
  );
};

/**
   * Generates the formatted timestamp using the current delimiter
   * @private
   * @returns {string} Formatted timestamp (e.g., "<%gray [08:21:54]%>") or "" if disabled
   */
const _timestamp = () => {
  if (!_options.timestamp) return "";
  return _apply(
    `${_options.delimiter.open}gray [${new Date().toLocaleTimeString(undefined, { hour12: false })}]${_options.delimiter.close}`,
  );
};

/**
   * Returns the current indentation based on the number of active groups
   * @private
   * @returns {string} Indentation spaces (2 spaces per group)
   */
const _indent = () => {
  return "  ".repeat(_groups.length);
};

module.exports = {
  /**
   * Enables or disables timestamp in logs
   * @param {boolean} value - True to enable, false to disable
   * @returns {Logger} The same Logger instance (for chaining)
   */
  setTimestamp(value) {
    _options.timestamp = value;
    return /** @type {Logger} */ (this);
  },

  /**
   * Changes the delimiters used for text formatting
   * @param {object} options - Delimiter options
   * @param {string} [options.open] - New opening delimiter
   * @param {string} [options.close] - New closing delimiter
   * @returns {Logger} The same Logger instance (for chaining)
   */
  setDelimiter(options = {}) {
    _options.delimiter = {
      ..._options.delimiter,
      ...options,
    };
    return /** @type {Logger} */ (this);
  },

  /**
   * Prints a message to the console with ANSI formatting
   * @param {*} content - Content to print (string, object, or other)
   * @returns {Logger} The same Logger instance (for chaining)
   */
  log(content) {
    let str;
    if (typeof content === "string") {
      str = content;
    } else if (typeof content === "object") {
      str = JSON.stringify(content, null, 2);
    } else {
      str = String(content);
    }

    const prefix = `${_timestamp()}${_indent()}`;
    const fullStr = prefix ? `${prefix} ${str}` : str;

    const formatted = _apply(fullStr);

    if (formatted.includes("\n")) {
      const lines = formatted.split("\n");

      if (lines[0].trim()) console.log(lines[0]);

      const indentOnly = _indent();
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          console.log(`${indentOnly}${lines[i]}`);
        }
      }
    } else {
      console.log(formatted);
    }

    return /** @type {Logger} */ (this);
  },

  /**
   * Start a log group (displays a label and adds indentation)
   * @param {string} label - The group name to display
   * @returns {Logger} The same Logger instance (for chaining)
   */
  group(label) {
    _groups.push(label);
    const prefix = `${_timestamp()}${_indent()}`;
    console.log(prefix ? `${prefix}▼ ${label}` : `▼ ${label}`);
    return /** @type {Logger} */ (this);
  },

  /**
   * End the current log group
   * @returns {Logger} The same Logger instance (for chaining)
   */
  groupEnd() {
    if (_groups.length > 0) _groups.pop();
    return /** @type {Logger} */ (this);
  },
};