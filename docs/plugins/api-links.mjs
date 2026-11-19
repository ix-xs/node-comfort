// Every time the guide names something of the API in code (`nc.str.slugify()`,
// `str.slugify()`, `nc.sqlite.open()`, `db.insert()`, `SlugifyOptions`), the
// name becomes a link to its page in the API reference. Nothing to write by
// hand, and nothing that goes stale: the names come from `src/data/api.json`,
// the model the reference is built from. Only exact names that mean one thing
// are linked, never what sits in a code block.
//
// Deprecated names (`nc.info()`, `nc.SQLite`, `nc.fs.readFile()`) are not in
// the model, so they are never linked: a page that lists them, like the
// upgrade guide, shows them as plain code.
//
// Runs before `remarkBaseLinks`, which then adds the language and the base.
// Imported, not read from disk: the site's build bundles this file too.
import api from "../src/data/api.json" with { type: "json" };

const BY_REF = new Map(api.symbols.map((symbol) => [symbol.ref, symbol]));

/** A big class (`SQLite`) -> its page and the pages of its members, by name ("constructor" included). */
const CLASSES = new Map();
/** Namespace key ("str", "sqlite") -> its address, its members by name, and those of its big classes. */
const NAMESPACES = new Map(
  api.namespaces.map((ns) => {
    const members = new Map();
    const inner = new Map();
    for (const ref of ns.members) {
      const symbol = BY_REF.get(ref);
      if (!symbol) continue;
      members.set(symbol.name, ref);
      if (!symbol.members) continue;
      const own = new Map();
      for (const innerRef of symbol.members) {
        const item = BY_REF.get(innerRef);
        if (!item) continue;
        own.set(item.name, innerRef);
        if (item.name !== "constructor") inner.set(item.name, innerRef);
      }
      CLASSES.set(symbol.name, { ref, members: own });
    }
    return [ns.key, { ref: ns.slug, members, inner }];
  }),
);

/** The names of types and classes, which mean the same thing wherever they are written. */
const TYPES = new Map();
for (const symbol of api.symbols) {
  if (symbol.kind !== "interface" && symbol.kind !== "type" && symbol.kind !== "class") continue;
  // nc.http.HttpError would be nc.errors.HttpError: the page of errors explains it.
  if (!TYPES.has(symbol.name) || symbol.ns === "errors") TYPES.set(symbol.name, symbol.ref);
}

/** The variables the guide always gives the same name, and the class they hold. */
const VARIABLES = { db: "SQLite", cache: "Cache", events: "Emitter", emitter: "Emitter" };

/**
 * Namespaces named like a module of Node: without `nc.` in front,
 * `crypto.randomUUID()` is Node's, so only the names Node lacks are linked.
 */
const NODE_MODULES = new Set(["fs", "crypto", "http"]);
const nodeHas = (module, name) => {
  try {
    return name in (process.getBuiltinModule?.(module) ?? {});
  } catch {
    return true;
  }
};

/**
 * The page of the reference that a piece of inline code names, or nothing.
 * @param {string} code
 * @param {string} [here] The namespace of the text, where a bare `name()` means one of its members.
 * @returns {string | undefined} A root-relative address, like "/reference/str/slugify/".
 */
export function referenceFor(code, here) {
  const match = /^(new\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(\(\)|\(\.\.\.\)|<[^<>]*>)?;?$/.exec(code.trim());
  if (!match) return undefined;
  const isNew = Boolean(match[1]);
  const called = match[3] === "()" || match[3] === "(...)";
  let parts = match[2].split(".");
  const prefixed = parts[0] === "nc" && parts.length > 1;
  if (prefixed) parts = parts.slice(1);
  if (parts.length > 2) return undefined;
  const page = (/** @type {string | undefined} */ ref) => (ref ? `/reference/${ref}/` : undefined);

  if (parts.length === 1) {
    const [name] = parts;
    const ns = NAMESPACES.get(name);
    // At the root of nc there are namespaces only: `nc.info()` or `nc.SQLite` are old names.
    if (prefixed) {
      if (!ns || isNew) return undefined;
      // `nc.assert()` is the namespace called.
      return page(called && ns.members.get(name) ? ns.members.get(name) : ns.ref);
    }
    if (isNew) return CLASSES.has(name) ? page(CLASSES.get(name).members.get("constructor")) : TYPES.has(name) ? page(TYPES.get(name)) : undefined;
    if (TYPES.has(name)) return page(TYPES.get(name));
    if (here && name !== "constructor") {
      const own = NAMESPACES.get(here);
      return page(own?.members.get(name) ?? own?.inner.get(name));
    }
    return undefined;
  }

  const [owner, name] = parts;
  if (name === "constructor") return undefined;
  if (isNew) {
    // `new nc.sqlite.SQLite()`: the constructor of a class a namespace holds.
    const ns = NAMESPACES.get(owner);
    if (!ns?.members.has(name)) return undefined;
    return CLASSES.has(name) ? page(CLASSES.get(name).members.get("constructor")) : page(ns.members.get(name));
  }
  const ns = NAMESPACES.get(owner);
  if (prefixed) return page(ns?.members.get(name));
  if (ns && NODE_MODULES.has(owner) && nodeHas(owner, name)) return undefined;
  // `cache.create()` is the namespace, `cache.get()` a cache it made.
  const held = Object.hasOwn(VARIABLES, owner) ? CLASSES.get(VARIABLES[owner])?.members.get(name) : undefined;
  return page(ns?.members.get(name) ?? held);
}

/** The remark plugin. */
export function remarkApiLinks() {
  return (tree) => {
    const walk = (node, inLink, inHeading) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === "inlineCode" && !inLink && !inHeading) {
          const url = referenceFor(child.value);
          if (url) return { type: "link", url, data: { hProperties: { className: ["nc-api-link"] } }, children: [child] };
        }
        walk(child, inLink || child.type === "link" || child.type === "linkReference", inHeading || child.type === "heading");
        return child;
      });
    };
    walk(tree, false, false);
  };
}
