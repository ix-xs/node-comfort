// The words of the site's own interface (header, landing page, showcase), in
// each language. Starlight translates its own; page content is translated in
// `src/content/docs/<language>/`.
import { withBase, withLocale } from "../plugins/base-links.mjs";

const en = {
  // Header
  "nav.sections": "Sections",
  "nav.guide": "Guide",
  "nav.recipes": "Recipes",
  "nav.reference": "Reference",
  "nav.github": "GitHub repository",
  "nav.theme": "Switch between dark and light",
  "nav.language": "Language",

  // Landing page
  "hero.eyebrow": "The standard library for Node.js",
  "hero.copy": "Copy the install command",
  "hero.copied": "Copied",
  "hero.facts": "Zero dependencies|23 namespaces|Typed from end to end|MIT",

  // Showcase
  "showcase.label": "Examples you can run",
  "showcase.scenes": "What to try",
  "showcase.variants": "Variations",
  "showcase.code": "Code",
  "showcase.output": "Output",
  "showcase.run": "Run",
  "showcase.again": "Run again",
  "showcase.ran": "ran in {ms} ms",
  "showcase.copy": "Copy the code",
} as const;

export type UiKey = keyof typeof en;

const fr: Record<UiKey, string> = {
  "nav.sections": "Rubriques",
  "nav.guide": "Guide",
  "nav.recipes": "Recettes",
  "nav.reference": "Référence",
  "nav.github": "Dépôt GitHub",
  "nav.theme": "Basculer entre sombre et clair",
  "nav.language": "Langue",

  "hero.eyebrow": "La bibliothèque standard pour Node.js",
  "hero.copy": "Copier la commande d'installation",
  "hero.copied": "Copié",
  "hero.facts": "Zéro dépendance|23 espaces de noms|Typé de bout en bout|MIT",

  "showcase.label": "Des exemples à lancer",
  "showcase.scenes": "À essayer",
  "showcase.variants": "Variantes",
  "showcase.code": "Code",
  "showcase.output": "Sortie",
  "showcase.run": "Lancer",
  "showcase.again": "Relancer",
  "showcase.ran": "exécuté en {ms} ms",
  "showcase.copy": "Copier le code",
};

const dictionaries: Record<string, Record<UiKey, string>> = { en, fr };

/** The languages of the site, in the order the switch shows them. */
export const LANGUAGES = [
  { locale: undefined, code: "en", label: "English" },
  { locale: "fr", code: "fr", label: "Français" },
] as const;

/** A translator for the language of the page (`undefined` is English). */
export function useT(locale: string | undefined) {
  const dictionary = dictionaries[locale ?? "en"] ?? en;
  return (key: UiKey, values: Record<string, string | number> = {}): string =>
    (dictionary[key] ?? en[key]).replace(/\{(\w+)\}/g, (whole, name) => String(values[name] ?? whole));
}

/** A link written as in the content ("/data/str/"), for the language of the page and the base of the site. */
export function href(path: string, locale: string | undefined): string {
  return withBase(withLocale(path, locale), import.meta.env.BASE_URL);
}
