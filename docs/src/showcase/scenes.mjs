// The examples of the landing page. Each variant is a real file in
// `samples/<scene>/<variant>.js`: `scripts/showcase.mjs` runs it against the
// package before every build and keeps what it printed.

export const SCENES = [
  {
    id: "logger",
    label: "Logger",
    about: {
      en: "Readable in a terminal, structured for a collector, and careful with secrets.",
      fr: "Lisible dans un terminal, structuré pour un collecteur, et prudent avec les secrets.",
    },
    variants: [
      { id: "pretty", label: "pretty" },
      { id: "json", label: "json" },
      { id: "redact", label: "redact" },
    ],
  },
  {
    id: "cli",
    label: "CLI",
    about: {
      en: "Tables, trees and boxes that line up, whatever is in the cells.",
      fr: "Des tableaux, des arbres et des cadres bien alignés, quel que soit le contenu des cellules.",
    },
    variants: [
      { id: "table", label: "table" },
      { id: "tree", label: "tree" },
      { id: "box", label: "box" },
    ],
  },
  {
    id: "schema",
    label: "Schema",
    about: {
      en: "Describe your data once: a runtime check, clear messages, and the TypeScript type.",
      fr: "Décrivez vos données une fois : une vérification à l'exécution, des messages clairs, et le type TypeScript.",
    },
    variants: [
      { id: "errors", label: "safeParse" },
      { id: "json", label: "toJSONSchema" },
      { id: "union", label: "discriminatedUnion" },
    ],
  },
  {
    id: "time",
    label: "Dates",
    about: {
      en: "The same code in another language and another time zone. Nothing to install.",
      fr: "Le même code dans une autre langue et un autre fuseau horaire. Rien à installer.",
    },
    variants: [
      { id: "en", label: "English" },
      { id: "fr", label: "Français" },
      { id: "ja", label: "日本語" },
    ],
  },
  {
    id: "sqlite",
    label: "SQLite",
    about: {
      en: "The database built into Node, with objects in and objects out.",
      fr: "La base de données intégrée à Node, des objets en entrée comme en sortie.",
    },
    variants: [
      { id: "query", label: "filters" },
      { id: "paginate", label: "paginate" },
    ],
  },
  {
    id: "helpers",
    label: "Helpers",
    about: {
      en: "The small functions you rewrite in every project, with the edge cases handled.",
      fr: "Les petites fonctions que l'on réécrit dans chaque projet, cas limites compris.",
    },
    variants: [
      { id: "str", label: "str" },
      { id: "num", label: "num" },
      { id: "arr", label: "arr" },
    ],
  },
  {
    id: "config",
    label: "Config",
    about: {
      en: "Check the whole configuration at startup, and get every problem at once.",
      fr: "Vérifiez toute la configuration au démarrage, et obtenez tous les problèmes d'un coup.",
    },
    variants: [
      { id: "validate", label: "validate" },
      { id: "example", label: ".env.example" },
    ],
  },
  {
    id: "ids",
    label: "Ids and crypto",
    about: {
      en: "Ids that sort by time, tokens signed with a key pair, passwords hashed the safe way.",
      fr: "Des identifiants triés par date, des jetons signés par une paire de clés, des mots de passe hachés proprement.",
    },
    variants: [
      { id: "ids", label: "ids" },
      { id: "jwt", label: "JWT" },
      { id: "password", label: "passwords" },
    ],
  },
];
