// The words of the site's own interface (header, search, landing page), in
// each language. Starlight translates its own; page content is translated in
// `src/content/docs/<language>/`.
import { withBase, withLocale } from "../plugins/base-links.mjs";

const en = {
  // Header
  "nav.sections": "Sections",
  "nav.docs": "Docs",
  "nav.recipes": "Recipes",
  "nav.reference": "Reference",
  "nav.github": "GitHub repository",
  "nav.theme": "Switch between dark and light",
  "nav.language": "Language",

  // Names of the parts of the documentation, as the sidebar writes them
  "area.start": "Start",
  "area.essentials": "Essentials",
  "area.data": "Data",
  "area.flow": "Functions and async",
  "area.system": "System and network",
  "area.recipes": "Going further",
  "area.reference": "Reference",

  // Search
  "search.recent": "Recently opened",
  "search.clear": "Clear",
  "search.start": "Start here",
  "search.try": "Try a search",
  "search.move": "move",
  "search.open": "open",
  "search.close": "close",

  // Landing page
  "hero.eyebrow": "The standard library for Node.js",
  "hero.copy": "Copy the install command",
  "hero.facts": "Zero dependencies|Open source, MIT|Node 22.13 and later",

  // Showcase
  "showcase.label": "Examples you can run",
  "showcase.scenes": "What to try",
  "showcase.variants": "Variations",
  "showcase.output": "output",
  "showcase.again": "Run again",
  "showcase.ran": "ran in {ms} ms",
} as const;

export type UiKey = keyof typeof en;

const fr: Record<UiKey, string> = {
  "nav.sections": "Rubriques",
  "nav.docs": "Docs",
  "nav.recipes": "Recettes",
  "nav.reference": "Référence",
  "nav.github": "Dépôt GitHub",
  "nav.theme": "Basculer entre sombre et clair",
  "nav.language": "Langue",

  "area.start": "Démarrer",
  "area.essentials": "Essentiels",
  "area.data": "Données",
  "area.flow": "Fonctions et asynchrone",
  "area.system": "Système et réseau",
  "area.recipes": "Aller plus loin",
  "area.reference": "Référence",

  "search.recent": "Ouvertes récemment",
  "search.clear": "Effacer",
  "search.start": "Pour commencer",
  "search.try": "Essayer une recherche",
  "search.move": "naviguer",
  "search.open": "ouvrir",
  "search.close": "fermer",

  "hero.eyebrow": "La bibliothèque standard pour Node.js",
  "hero.copy": "Copier la commande d'installation",
  "hero.facts": "Zéro dépendance|Open source, MIT|Node 22.13 et suivants",

  "showcase.label": "Des exemples à lancer",
  "showcase.scenes": "À essayer",
  "showcase.variants": "Variantes",
  "showcase.output": "sortie",
  "showcase.again": "Relancer",
  "showcase.ran": "exécuté en {ms} ms",
};

const DICTIONARIES: Record<string, Record<UiKey, string>> = { en, fr };

/** The languages of the site, in the order the switch lists them. `locale` is the folder and URL prefix. */
export const LANGUAGES = [
  { locale: undefined, code: "en", label: "English" },
  { locale: "fr", code: "fr", label: "Français" },
] as const;

/**
 * The translator for a page: `t("search.clear")`, `t("showcase.ran", { ms: "12" })`.
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
