// The two syntax themes of the site. Quiet on purpose: green for the words
// of the language, a warm tone for strings, blue for numbers, and the text
// colour for everything you named yourself.

function theme(name, type, c) {
  return {
    name,
    type,
    colors: {
      "editor.background": c.surface,
      "editor.foreground": c.fg,
      "editor.selectionBackground": c.selection,
      "editorLineNumber.foreground": c.faint,
      "editorGroupHeader.tabsBackground": c.surface,
      "editorGroupHeader.tabsBorder": c.line,
      "tab.activeBackground": c.surface,
      "tab.activeForeground": c.fg,
      "tab.activeBorder": c.accent,
      "tab.border": c.surface,
      "titleBar.activeBackground": c.surface,
      "titleBar.activeForeground": c.faint,
      "titleBar.border": c.line,
      "terminal.background": c.surface,
      "terminal.foreground": c.fg,
      "panel.border": c.line,
      focusBorder: c.accent,
    },
    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: c.comment, fontStyle: "italic" } },
      { scope: ["string", "string.template", "punctuation.definition.string"], settings: { foreground: c.string } },
      { scope: ["constant.numeric", "constant.language", "constant.character.escape"], settings: { foreground: c.number } },
      {
        scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new", "keyword.operator.expression", "variable.language.this"],
        settings: { foreground: c.keyword },
      },
      { scope: ["keyword.operator", "punctuation", "meta.brace", "meta.delimiter"], settings: { foreground: c.muted } },
      { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"], settings: { foreground: c.fn } },
      { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], settings: { foreground: c.type } },
      { scope: ["variable", "variable.other", "variable.parameter", "meta.object-literal.key", "support.variable"], settings: { foreground: c.fg } },
      { scope: ["entity.name.tag", "support.type.property-name", "entity.other.attribute-name"], settings: { foreground: c.keyword } },
      { scope: ["markup.heading", "markup.bold"], settings: { foreground: c.fg, fontStyle: "bold" } },
      { scope: ["markup.inserted"], settings: { foreground: c.keyword } },
      { scope: ["markup.deleted"], settings: { foreground: c.string } },
    ],
  };
}

export const comfortDark = theme("comfort-dark", "dark", {
  surface: "#161a18",
  line: "#252c29",
  fg: "#e9ede9",
  muted: "#a0aaa4",
  faint: "#7a857f",
  comment: "#7f8b84",
  accent: "#6fdc9f",
  keyword: "#7fdca9",
  string: "#e6c384",
  number: "#8fb8f2",
  fn: "#e9ede9",
  type: "#b9c8bf",
  selection: "#1f3a2c",
});

export const comfortLight = theme("comfort-light", "light", {
  surface: "#ffffff",
  line: "#dde2da",
  fg: "#141917",
  muted: "#55605a",
  faint: "#6c7871",
  comment: "#68756d",
  accent: "#0c7a4a",
  keyword: "#0c7a4a",
  string: "#8f5a08",
  number: "#2457b3",
  fn: "#141917",
  type: "#3f4a44",
  selection: "#d6efe0",
});
