// The examples of the landing page. Each variant is a real file in
// `samples/<scene>/<variant>.js`: `scripts/showcase.mjs` runs it against the
// package before every build and keeps what it printed.
//
// A label is one word for every language, or `{ en, fr }` when it is a word of
// the language rather than a name from the code.

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
    label: { en: "Schema", fr: "Schéma" },
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
      { id: "query", label: { en: "filters", fr: "filtres" } },
      { id: "paginate", label: "paginate" },
    ],
  },
  {
    id: "helpers",
    label: { en: "Helpers", fr: "Utilitaires" },
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
    label: { en: "Ids and crypto", fr: "Identifiants et chiffrement" },
    about: {
      en: "Ids that sort by time, tokens signed with a key pair, passwords hashed the safe way.",
      fr: "Des identifiants triés par date, des jetons signés par une paire de clés, des mots de passe hachés proprement.",
    },
    variants: [
      { id: "ids", label: { en: "ids", fr: "identifiants" } },
      { id: "jwt", label: "JWT" },
      { id: "password", label: { en: "passwords", fr: "mots de passe" } },
    ],
  },
];

/**
 * The comments of the samples in other languages. The files stay as they are,
 * since they are what runs: only what the page shows changes.
 */
export const COMMENTS = {
  fr: {
    "The .env.example that goes with your checks, so they never drift apart.": "Le .env.example qui va avec vos vérifications, pour qu'ils ne divergent jamais.",
    "The auth service signs with the private key; everyone else verifies with the public one.": "Le service d'authentification signe avec la clé privée ; tous les autres vérifient avec la clé publique.",
    "One object per line, for a log collector. LOG_FORMAT=json does the same.": "Un objet par ligne, pour un collecteur de logs. LOG_FORMAT=json fait la même chose.",
    "For an OpenAPI document, a form, or a tool you give to a language model.": "Pour un document OpenAPI, un formulaire, ou un outil confié à un modèle de langage.",
    "Two requests at the same moment both count.": "Deux requêtes au même instant comptent toutes les deux.",
    "Filter on a key inside the JSON column, and get objects and booleans back.": "Filtrez sur une clé de la colonne JSON, et récupérez des objets et des booléens.",
  },
};
