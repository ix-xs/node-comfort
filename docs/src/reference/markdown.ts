// Renders the Markdown of a doc comment to HTML. A name of the API written in
// code (`closest()`, `SlugifyOptions`, `nc.str.slugify()`) links to its page,
// in the language of the page.
import { createMarkdownProcessor, type MarkdownRenderer } from "@astrojs/markdown-remark";
import { withBase, withLocale } from "../../plugins/base-links.mjs";
import { referenceFor } from "../../plugins/api-links.mjs";

let processor: Promise<MarkdownRenderer> | undefined;
// The same sentence comes back on many pages (a parameter of every overload,
// an options type shown inline): it is rendered once.
const cache = new Map<string, Promise<string>>();

export function href(path: string, locale: string | undefined): string {
  return withBase(withLocale(path, locale), import.meta.env.BASE_URL);
}

interface Options {
  /** Drops the paragraph around a single line. */
  inline?: boolean;
  /** The namespace of the text, where a bare `name()` means one of its members. */
  here?: string;
  /** The page being written, which does not link to itself. */
  self?: string;
}

/** One paragraph or more of Markdown, as HTML. */
export function render(markdown: string | undefined, locale: string | undefined, { inline = false, here, self }: Options = {}): Promise<string> {
  if (!markdown) return Promise.resolve("");
  const id = `${locale ?? ""}\0${inline}\0${here ?? ""}\0${self ?? ""}\0${markdown}`;
  let html = cache.get(id);
  if (!html) {
    html = renderNow(markdown, locale, inline, here, self);
    cache.set(id, html);
  }
  return html;
}

async function renderNow(markdown: string, locale: string | undefined, inline: boolean, here: string | undefined, self: string | undefined): Promise<string> {
  processor ??= createMarkdownProcessor({ syntaxHighlight: false, gfm: true, smartypants: false });
  const source = markdown
    // Root-relative links get the language and the base first...
    .replace(/\]\((\/[^)\s]*)\)/g, (_, path: string) => `](${href(path, locale)})`)
    // ...then names of the API in code become links, already complete.
    .replace(/(?<![\[`])`([^`\n]+)`(?![`\]])/g, (whole, code: string) => {
      const url = referenceFor(code, here);
      return url && url !== self ? `[${whole}](${href(url, locale)})` : whole;
    });
  const { code } = await (await processor).render(source);
  if (inline) return code.replace(/^<p>([\s\S]*)<\/p>\s*$/, "$1");
  return code;
}
