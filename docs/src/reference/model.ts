// The API reference: one page per namespace, and one per member and per public
// type, built from `src/data/api.json` (written by `scripts/build-reference.js`
// at the root of the repository, from the types of the package). This module
// reads that file, translates its sentences with the catalogs of
// `src/reference-i18n/`, and holds the words of the reference pages in each
// language.
import api from "../data/api.json";

/** A piece of code: plain text, or text linked to a page ("str/slugify-options") or to another site. */
export type Token = [string] | [string, { ref?: string; href?: string }];

export interface Field {
  name: string;
  type: Token[];
  optional?: boolean;
  readonly?: boolean;
  static?: boolean;
  text?: string;
  default?: string;
  inheritedFrom?: string;
}

export interface Param {
  name: string;
  type: Token[];
  optional?: boolean;
  rest?: boolean;
  default?: string;
  text?: string;
  fields?: Field[];
}

export interface Signature {
  code: Token[];
  params?: Param[];
  returns: { type: Token[]; text?: string };
  throws?: { type?: Token[]; text?: string }[];
}

export interface Method {
  name: string;
  overloads: Signature[];
  static?: boolean;
  text?: string;
  examples?: string[];
  inheritedFrom?: string;
}

export type Kind = "function" | "method" | "constructor" | "property" | "class" | "interface" | "type";

export interface ApiSymbol {
  /** The namespace that holds it: "str", "SQLite". */
  ns: string;
  name: string;
  slug: string;
  /** Its address under /reference/: "str/slugify". */
  ref: string;
  title: string;
  kind: Kind;
  source: string;
  text?: string;
  deprecated?: string;
  static?: boolean;
  /** The same function at the top level of the package: "nc.info". */
  flat?: string;
  code?: Token[];
  overloads?: Signature[];
  ctor?: Signature;
  properties?: Field[];
  methods?: Method[];
  values?: string[];
  examples?: string[];
  usedBy?: string[];
}

export interface Namespace {
  key: string;
  slug: string;
  kind: "namespace" | "class";
  title: string;
  module: string;
  guide: string;
  group: string;
  source: string;
  text?: string;
  examples?: string[];
  members: string[];
  types?: string[];
  extra?: string[];
}

export const model = api as unknown as {
  package: { name: string; version: string };
  groups: { id: string; keys: string[] }[];
  flat: Record<string, string[]>;
  namespaces: Namespace[];
  symbols: ApiSymbol[];
};

export const namespaces = model.namespaces;
export const symbols = model.symbols;
const byRef = new Map(symbols.map((s) => [s.ref, s]));
const byKey = new Map(namespaces.map((ns) => [ns.key, ns]));
export const find = (ref: string) => byRef.get(ref);
export const namespaceOf = (key: string) => byKey.get(key) as Namespace;

/** The address of a page of the reference, from its ref ("str", "str/slugify"). */
export const pathOf = (ref: string) => `/reference/${ref}/`;

/** The kind of a namespace page, as the letters draw it. */
export const nsKind = (ns: Namespace) => (ns.kind === "class" ? "class" : "namespace");

/** The name a member goes by in a list: `slugify`, `new SQLite()`. */
export const shortName = (symbol: ApiSymbol) => (symbol.kind === "constructor" ? `new ${symbol.ns}()` : symbol.name);

/** The first sentence of a description, for a row of a list. */
export function firstSentence(text = ""): string {
  const paragraph = text.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  const stop = /[.!?](?=\s+[A-Z`*\[]|$)/g;
  for (let match; (match = stop.exec(paragraph)); ) {
    if (/\b(e\.g|i\.e|p\. ex|etc)$/.test(paragraph.slice(0, match.index))) continue;
    return paragraph.slice(0, match.index + 1);
  }
  return paragraph;
}

/* -------------------------------------------------------------------------- */
/*  Translation                                                                */
/* -------------------------------------------------------------------------- */

// One catalog per namespace and language: the English sentence (one
// paragraph, on one line) -> its translation. `build-reference.js --missing`
// lists what is not translated yet.
const files = import.meta.glob<Record<string, string>>("../reference-i18n/*/*.json", { eager: true, import: "default" });
const catalogs = new Map<string, Record<string, string>>();
for (const [file, catalog] of Object.entries(files)) {
  const [, language, name] = /reference-i18n\/([^/]+)\/([^/]+)\.json$/.exec(file) ?? [];
  if (language && name) catalogs.set(`${language}/${name}`, catalog);
}
const catalogOf = (key: string, locale: string) => catalogs.get(`${locale}/${key.toLowerCase()}`);

/** The name a paragraph has in a catalog: its text on one line. A table keeps its lines. */
const keyOf = (block: string) => (/^\s*\|/m.test(block) ? block.trim() : block.replace(/\s*\n\s*/g, " ").trim());

/**
 * A description in a language, paragraph by paragraph. English is the
 * source: a paragraph whose translation is missing (or was made from an
 * older English sentence) stays in English.
 */
export function translate(key: string, english: string | undefined, locale: string | undefined): string | undefined {
  if (!english || !locale) return english;
  const catalog = catalogOf(key, locale);
  if (!catalog) return english;
  return english
    .split(/\n\s*\n/)
    .map((block) => {
      const name = keyOf(block);
      return (name && Object.hasOwn(catalog, name) && catalog[name]) || block;
    })
    .join("\n\n");
}

/** Whether a description still waits for its translation, in part or in full. */
export function untranslated(key: string, english: string | undefined, locale: string | undefined): boolean {
  if (!english || !locale) return false;
  const catalog = catalogOf(key, locale);
  return english.split(/\n\s*\n/).some((block) => {
    const name = keyOf(block);
    return Boolean(name) && !(catalog && Object.hasOwn(catalog, name) && catalog[name]);
  });
}

/** An example, with its comments translated when the catalog has it (the code itself never changes). */
export function example(key: string, code: string, locale: string | undefined): string {
  if (!locale) return code;
  const catalog = catalogOf(key, locale);
  return (catalog && Object.hasOwn(catalog, code) && catalog[code]) || code;
}

/* -------------------------------------------------------------------------- */
/*  Words                                                                      */
/* -------------------------------------------------------------------------- */

const en = {
  title: "API reference",
  lead: "Every namespace, function, class and type of the package, each on a page of its own: what it is for, what it takes, what it gives back.",
  sidebarAll: "Overview",
  overview: "Overview",
  kinds: {
    namespace: "Namespace",
    function: "Function",
    method: "Method",
    constructor: "Constructor",
    property: "Property",
    class: "Class",
    interface: "Interface",
    type: "Type",
  },
  kindHelp: {
    namespace: "A group of functions on one subject, like `nc.str` for strings. You import it from the package, then call its functions: `str.slugify()`.",
    function: "Something you call. `str.slugify(\"Hello world\")` is a function: you call it, it gives something back.",
    method: "A function of an object you created. `db.insert()` is a method of a database opened with `new nc.SQLite()`.",
    class: "A kind of object you create with `new`, which then has its own methods: `const db = new nc.SQLite()`.",
    interface: "The shape of an object: the list of what it holds. You fill it in (the options of `str.slugify()` are a `SlugifyOptions`) or you read it.",
    type: "A name given to a set of possible values, such as `\"info\" | \"error\"`. It exists for your editor only.",
  },
  howToRead: "How to read this reference",
  howToReadText:
    "Each page answers three questions: what the thing is for, what it takes, and what it gives back. The coloured letter before a name tells you what kind of thing it is:",
  groups: { essentials: "Essentials", data: "Data", flow: "Functions and async", system: "System and network" } as Record<string, string>,
  import: "Import",
  orAlone: "// or on its own, which loads nothing else",
  topLevel: "// also at the top level of the package",
  topLevelText: (flat: string, full: string) => `These functions are also at the top level of the package: \`${flat}\` is \`${full}\`.`,
  typeImport: "In TypeScript, or in a JSDoc comment of JavaScript:",
  members: "Members",
  types: "Types",
  typesText: "The types behind the options and results above. Your editor uses them; in TypeScript, import them from the package.",
  also: "Also available",
  alsoText: "Styles you can use as functions, like the ones above: `color.red(\"text\")`.",
  parameters: "Parameters",
  returns: "Returns",
  throws: "Throws",
  example: "Example",
  examples: "Examples",
  properties: "Properties",
  methods: "Methods",
  values: "Possible values",
  constructor: "Constructor",
  usedBy: "Used by",
  usedByText: "The other pages of the reference that mention this one.",
  guide: "Explained in the guide",
  reference: "Reference",
  source: "Source",
  optional: "optional",
  readonly: "read-only",
  static: "static",
  deprecated: "Deprecated",
  avoid: "Avoid it in new code.",
  default: "Default:",
  inherited: "From",
  accepts: "What it accepts",
  form: "Form",
  memberOf: "Member of",
  count: (members: number, types: number) => `${members} ${members === 1 ? "member" : "members"}, ${types} ${types === 1 ? "type" : "types"}`,
};

type Words = typeof en;

const frWords: Words = {
  title: "Référence de l'API",
  lead: "Chaque espace de noms, fonction, classe et type du paquet, chacun sur sa propre page : à quoi il sert, ce qu'il prend, ce qu'il renvoie.",
  sidebarAll: "Vue d'ensemble",
  overview: "Vue d'ensemble",
  kinds: {
    namespace: "Espace de noms",
    function: "Fonction",
    method: "Méthode",
    constructor: "Constructeur",
    property: "Propriété",
    class: "Classe",
    interface: "Interface",
    type: "Type",
  },
  kindHelp: {
    namespace: "Un groupe de fonctions sur un même sujet, comme `nc.str` pour les chaînes. Vous l'importez depuis le paquet, puis vous appelez ses fonctions : `str.slugify()`.",
    function: "Quelque chose que vous appelez. `str.slugify(\"Hello world\")` est une fonction : vous l'appelez, elle vous rend quelque chose.",
    method: "Une fonction d'un objet que vous avez créé. `db.insert()` est une méthode d'une base ouverte avec `new nc.SQLite()`.",
    class: "Un genre d'objet que vous créez avec `new`, et qui a ensuite ses propres méthodes : `const db = new nc.SQLite()`.",
    interface: "La forme d'un objet : la liste de ce qu'il contient. Vous la remplissez (les options de `str.slugify()` sont un `SlugifyOptions`) ou vous la lisez.",
    type: "Un nom donné à un ensemble de valeurs possibles, comme `\"info\" | \"error\"`. Il n'existe que pour votre éditeur.",
  },
  howToRead: "Comment lire cette référence",
  howToReadText:
    "Chaque page répond à trois questions : à quoi sert la chose, ce qu'elle prend, et ce qu'elle renvoie. La lettre de couleur devant un nom indique de quel genre de chose il s'agit :",
  groups: { essentials: "Essentiels", data: "Données", flow: "Fonctions et asynchrone", system: "Système et réseau" },
  import: "Import",
  orAlone: "// ou seul, ce qui ne charge rien d'autre",
  topLevel: "// existe aussi à la racine du paquet",
  topLevelText: (flat: string, full: string) => `Ces fonctions existent aussi à la racine du paquet : \`${flat}\` équivaut à \`${full}\`.`,
  typeImport: "En TypeScript, ou dans un commentaire JSDoc en JavaScript :",
  members: "Membres",
  types: "Types",
  typesText: "Les types derrière les options et les résultats ci-dessus. Votre éditeur s'en sert ; en TypeScript, importez-les depuis le paquet.",
  also: "Également disponibles",
  alsoText: "Des styles qui s'utilisent comme des fonctions, comme ceux du dessus : `color.red(\"texte\")`.",
  parameters: "Paramètres",
  returns: "Renvoie",
  throws: "Lève",
  example: "Exemple",
  examples: "Exemples",
  properties: "Propriétés",
  methods: "Méthodes",
  values: "Valeurs possibles",
  constructor: "Constructeur",
  usedBy: "Utilisé par",
  usedByText: "Les autres pages de la référence qui mentionnent celle-ci.",
  guide: "Expliqué dans le guide",
  reference: "Référence",
  source: "Source",
  optional: "facultatif",
  readonly: "lecture seule",
  static: "statique",
  deprecated: "Obsolète",
  avoid: "À éviter dans du nouveau code.",
  default: "Par défaut :",
  inherited: "Vient de",
  accepts: "Ce qu'il accepte",
  form: "Forme",
  memberOf: "Membre de",
  count: (members: number, types: number) => `${members} ${members === 1 ? "membre" : "membres"}, ${types} ${types === 1 ? "type" : "types"}`,
};

export function words(locale: string | undefined): Words {
  return locale === "fr" ? frWords : en;
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

const sidebars = new Map<string, unknown[]>();

/**
 * The sidebar of the reference: the overview, then the parts of the guide
 * with their namespaces. The namespace of the page opens on its members and
 * its types; the others are one link each, which keeps every page light.
 */
export function sidebar(locale: string | undefined, current?: string) {
  const id = `${locale ?? "en"}:${current ?? ""}`;
  const cached = sidebars.get(id);
  if (cached) return cached as any[];
  const w = words(locale);
  const link = (symbol: ApiSymbol) => ({ label: shortName(symbol), link: pathOf(symbol.ref), attrs: { "data-kind": symbol.kind, translate: "no" } });
  const items = [
    { label: w.sidebarAll, link: "/reference/" },
    ...model.groups.map((group) => ({
      label: w.groups[group.id] ?? group.id,
      collapsed: false,
      items: group.keys.map((key) => {
        const ns = namespaceOf(key);
        if (key !== current) return { label: ns.title, link: pathOf(ns.slug), attrs: { "data-kind": nsKind(ns), translate: "no" } };
        const members = ns.members.map((ref) => find(ref)!).filter(Boolean);
        const types = (ns.types ?? []).map((ref) => find(ref)!).filter(Boolean);
        return {
          label: ns.title,
          collapsed: false,
          items: [
            { label: w.overview, link: pathOf(ns.slug), attrs: { "data-kind": nsKind(ns) } },
            ...members.map(link),
            ...(types.length ? [{ label: w.types, collapsed: true, items: types.map(link) }] : []),
          ],
        };
      }),
    })),
  ];
  sidebars.set(id, items);
  return items;
}
