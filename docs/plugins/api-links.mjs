// Every time the guide names something of the API in code (`nc.str.slugify()`,
// `str.slugify()`, `nc.info()`, `nc.SQLite`, `db.insert()`, `SlugifyOptions`),
// the name becomes a link to its page in the API reference. Nothing to write by
// hand, and nothing that goes stale: the names come from `src/data/api.json`,
// the model the reference is built from. Only exact names that mean one thing
// are linked, never what sits in a code block.
//
// Runs before `remarkBaseLinks`, which then adds the language and the base.
// Imported, not read from disk: the site's build bundles this file too.
import api from "../src/data/api.json" with { type: "json" };

/** Namespace key ("str", "SQLite") -> its address and the address of each member, by name. */
const NAMESPACES = new Map(
  api.namespaces.map((ns) => {
    const members = new Map();
    for (const ref of ns.members) {
      const symbol = api.symbols.find((s) => s.ref === ref);
      if (symbol) members.set(symbol.name, ref);
    }
    return [ns.key, { ref: ns.slug, kind: ns.kind, members }];
  }),
);

/** `nc.info` is `nc.logger.info`: the helpers that are also at the top level. */
const FLAT = new Map();
for (const [key, names] of Object.entries(api.flat)) {
  for (const name of names) {
    const ref = NAMESPACES.get(key)?.members.get(name);
    if (ref) FLAT.set(name, ref);
  }
}

/** The names of types and classes, which mean the same thing wherever they are written. */
const TYPES = new Map();
for (const symbol of api.symbols) {
  if (symbol.kind !== "interface" && symbol.kind !== "type" && symbol.kind !== "class") continue;
  // nc.http.HttpError is nc.errors.HttpError: the page of errors explains it.
  if (!TYPES.has(symbol.name) || symbol.ns === "errors") TYPES.set(symbol.name, symbol.ref);
}

/** The variables the guide always gives the same name, and the class they hold. */
const ALIASES = { db: "SQLite", cache: "Cache" };

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
  const match = /^(new\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(?:\(\)|\(\.\.\.\)|<[^<>]*>)?;?$/.exec(code.trim());
  if (!match) return undefined;
  const isNew = Boolean(match[1]);
  let parts = match[2].split(".");
  const prefixed = parts[0] === "nc" && parts.length > 1;
  if (prefixed) parts = parts.slice(1);
  if (parts.length > 2) return undefined;
  const page = (/** @type {string | undefined} */ ref) => (ref ? `/reference/${ref}/` : undefined);

  if (parts.length === 1) {
    const [name] = parts;
    const ns = NAMESPACES.get(name);
    if (isNew) return ns?.kind === "class" ? page(ns.members.get("constructor")) : TYPES.has(name) ? page(TYPES.get(name)) : undefined;
    if (ns && (prefixed || ns.kind === "class")) return page(ns.ref);
    if (prefixed) return page(FLAT.get(name));
    if (TYPES.has(name)) return page(TYPES.get(name));
    if (here && name !== "constructor") return page(NAMESPACES.get(here)?.members.get(name));
    return undefined;
  }

  const [owner, name] = parts;
  if (isNew || name === "constructor") return undefined;
  const key = !prefixed && Object.hasOwn(ALIASES, owner) ? ALIASES[owner] : owner;
  const ns = NAMESPACES.get(key);
  if (!ns) return undefined;
  if (!prefixed && NODE_MODULES.has(owner) && nodeHas(owner, name)) return undefined;
  return page(ns.members.get(name));
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
