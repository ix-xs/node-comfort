// The words of the site's own interface (header, search), in
// each language. Starlight translates its own; page content is translated in
// `src/content/docs/<language>/`.
import { withBase, withLocale } from "../plugins/base-links.mjs";

const en = {
  // Header
  "nav.sections": "Sections",
  "nav.docs": "Guide",
  "nav.reference": "Reference",
  "nav.github": "GitHub repository",
  "nav.theme": "Switch between dark and light",
  "nav.language": "Language",

  // Names of the parts of the documentation, as the sidebar writes them
  "area.start": "Getting started",
  "area.project": "Your first project",
  "area.essentials": "Essentials",
  "area.data": "Data",
  "area.flow": "Functions and async",
  "area.system": "System and network",
  "area.recipes": "Complete examples",
  "area.help": "Help",
  "area.reference": "Reference",

  // Search
  "search.recent": "Recently opened",
  "search.clear": "Clear",
  "search.start": "Start here",
  "search.try": "Try a search",
  "search.move": "move",
  "search.open": "open",
  "search.close": "close",
} as const;

export type UiKey = keyof typeof en;

const fr: Record<UiKey, string> = {
  "nav.sections": "Rubriques",
  "nav.docs": "Guide",
  "nav.reference": "Référence",
  "nav.github": "Dépôt GitHub",
  "nav.theme": "Basculer entre sombre et clair",
  "nav.language": "Langue",

  "area.start": "Pour commencer",
  "area.project": "Votre premier projet",
  "area.essentials": "Essentiels",
  "area.data": "Données",
  "area.flow": "Fonctions et asynchrone",
  "area.system": "Système et réseau",
  "area.recipes": "Exemples complets",
  "area.help": "Aide",
  "area.reference": "Référence",

  "search.recent": "Ouvertes récemment",
  "search.clear": "Effacer",
  "search.start": "Pour commencer",
  "search.try": "Essayer une recherche",
  "search.move": "naviguer",
  "search.open": "ouvrir",
  "search.close": "fermer",
};

const DICTIONARIES: Record<string, Record<UiKey, string>> = { en, fr };

/** The languages of the site, in the order the switch lists them. `locale` is the folder and URL prefix. */
export const LANGUAGES = [
  { locale: undefined, code: "en", label: "English" },
  { locale: "fr", code: "fr", label: "Français" },
] as const;

/**
 * The translator for a page: `t("search.clear")`, `t("area.data")`.
 * `locale` is Starlight's (`undefined` for English).
 */
export function useT(locale: string | undefined) {
  const dictionary = DICTIONARIES[locale ?? "en"] ?? en;
  return (key: UiKey, values: Record<string, string | number> = {}): string =>
    (dictionary[key] ?? en[key]).replace(/\{(\w+)\}/g, (whole, name: string) => String(values[name] ?? whole));
}

/** A link written as in English ("/data/str/"), for a page in `locale` and the site's base path. */
export function href(path: string, locale: string | undefined): string {
  return withBase(withLocale(path, locale), import.meta.env.BASE_URL);
}
