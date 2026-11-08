"use strict";

// Writes the data of the API reference of the documentation site,
// docs/src/data/api.json, from the type declarations: every namespace, and one
// entry per member and per public type, each with its own page on the site
// (docs/src/pages/reference/). Code comes as tokens, so that the name of a
// type links to its page. It always says what editors show. Run after
// build-types.js.
//
// English comes straight from the JSDoc. The French pages show the same data,
// with each sentence replaced by its translation from
// docs/src/reference-i18n/<language>/<namespace>.json (docs/src/reference/model.ts
// reads these catalogs). A sentence that has no translation yet stays in
// English, and is reported here.
//
//   node scripts/build-reference.js             writes docs/src/data/api.json
//   node scripts/build-reference.js --check     fails if it is out of date
//   node scripts/build-reference.js --missing   lists what is not translated yet
//   node scripts/build-reference.js --strict    also fails when something is not translated

const fs = require("node:fs");
const path = require("node:path");
const { buildModel } = require("./lib/api-model.js");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "docs", "src", "data", "api.json");
const CONTENT = path.join(ROOT, "docs", "src", "content", "docs");
const CATALOGS = path.join(ROOT, "docs", "src", "reference-i18n");
const LANGUAGES = ["fr"];
const CHECK = process.argv.includes("--check");
const MISSING = process.argv.includes("--missing");
const STRICT = process.argv.includes("--strict");

/** The parts of the guide, in its order, and the namespaces each explains. */
const GROUPS = [
  { id: "essentials", keys: ["logger", "fs", "checker", "env", "errors", "utils"] },
  { id: "data", keys: ["str", "num", "arr", "obj", "time", "id", "schema"] },
  { id: "flow", keys: ["func", "async", "Cache", "Emitter"] },
  { id: "system", keys: ["http", "SQLite", "cli", "color", "sys", "crypto"] },
];

/** Where the guide of each namespace lives on the site. */
const GUIDES = /** @type {Record<string, string>} */ ({
  logger: "/essentials/logger/", fs: "/essentials/fs/", checker: "/essentials/checker/", env: "/essentials/env/", errors: "/essentials/errors/", utils: "/essentials/utils/",
  str: "/data/str/", num: "/data/num/", arr: "/data/arr/", obj: "/data/obj/", time: "/data/time/", id: "/data/id/", schema: "/data/schema/",
  func: "/flow/func/", async: "/flow/async/", Cache: "/flow/cache/", Emitter: "/flow/emitter/",
  http: "/system/http/", SQLite: "/system/sqlite/", cli: "/system/cli/", color: "/system/color/", sys: "/system/sys/", crypto: "/system/crypto/",
});

/** The built-in types worth a link, and where they are explained. */
const BUILTINS = /** @type {Record<string, string>} */ ({
  Promise: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise",
  Map: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map",
  ReadonlyMap: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map",
  Set: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set",
  ReadonlySet: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set",
  Date: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date",
  Error: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error",
  RegExp: "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp",
  AbortSignal: "https://developer.mozilla.org/docs/Web/API/AbortSignal",
  AbortController: "https://developer.mozilla.org/docs/Web/API/AbortController",
  URL: "https://developer.mozilla.org/docs/Web/API/URL",
  URLSearchParams: "https://developer.mozilla.org/docs/Web/API/URLSearchParams",
  Response: "https://developer.mozilla.org/docs/Web/API/Response",
  Headers: "https://developer.mozilla.org/docs/Web/API/Headers",
  Buffer: "https://nodejs.org/api/buffer.html",
  DatabaseSync: "https://nodejs.org/api/sqlite.html#class-databasesync",
  Record: "https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type",
  Partial: "https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype",
  Readonly: "https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype",
  Required: "https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype",
  Pick: "https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys",
  Omit: "https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys",
  Exclude: "https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers",
  Extract: "https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union",
  NonNullable: "https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype",
  ReturnType: "https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype",
  Parameters: "https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype",
  Awaited: "https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype",
});

/**
 * @typedef {[string] | [string, { ref?: string, href?: string }]} Token
 * @typedef {import("./lib/api-model.js").Namespace} Namespace
 * @typedef {import("./lib/api-model.js").Member} Member
 * @typedef {import("./lib/api-model.js").Signature} Signature
 * @typedef {import("./lib/api-model.js").TypeInfo} TypeInfo
 */

const model = buildModel();
const namespaces = new Map(model.namespaces.map((ns) => [ns.key, ns]));
const order = GROUPS.flatMap((group) => group.keys);
for (const key of namespaces.keys()) if (!order.includes(key)) throw new Error(`nc.${key} is in no group: add it to GROUPS and GUIDES in scripts/build-reference.js`);
for (const key of order) if (!namespaces.has(key)) throw new Error(`GROUPS in scripts/build-reference.js names nc.${key}, which does not exist`);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const REPOSITORY = `${String(pkg.repository?.url ?? "").replace(/^git\+/, "").replace(/\.git$/, "")}/blob/main/`;

/** A name as an address: `toCamelCase` -> `to-camel-case`, `isIPv4` -> `is-ip-v4`, `JSONParse` -> `json-parse`. */
const kebab = (/** @type {string} */ name) =>
  // Names that read as one word, however their capitals fall: sqlite-error, totp-uri-options, is-ipv4.
  (name.replace(/SQLite/g, "Sqlite").replace(/TOTPURI/g, "TotpUri").replace(/IPv(\d)/g, "Ipv$1").match(/[A-Z]{2,}(?=[A-Z][a-z]|\d|\W|$)|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+/g) ?? [name]).join("-").toLowerCase();
const nsSlug = (/** @type {string} */ key) => key.toLowerCase();

/* -------------------------------------------------------------------------- */
/*  Addresses                                                                  */
/* -------------------------------------------------------------------------- */

/** Every page of a namespace: its members, then its types, each with a slug unique in the namespace. */
/** @type {Map<string, Array<{ name: string, slug: string, member?: Member, type?: TypeInfo }>>} */
const entries = new Map();
for (const key of order) {
  const ns = /** @type {Namespace} */ (namespaces.get(key));
  const list = [...ns.members.map((member) => ({ name: member.name, slug: kebab(member.name), member })), ...ns.types.map((type) => ({ name: type.name, slug: kebab(type.name), type }))];
  // Two names that differ only by case (a class `Schema` and a function
  // `schema`) would share a folder on a case-insensitive disk: the type gets
  // a suffix, and anything still shared is a mistake to fix by hand.
  const count = new Map();
  for (const entry of list) count.set(entry.slug, (count.get(entry.slug) ?? 0) + 1);
  for (const entry of list) if (count.get(entry.slug) > 1 && entry.type) entry.slug = `${entry.slug}-type`;
  const seen = new Set();
  for (const entry of list) {
    if (seen.has(entry.slug)) throw new Error(`nc.${key}: two pages would have the address /reference/${nsSlug(key)}/${entry.slug}/. Rename one, or give it a suffix in scripts/build-reference.js.`);
    seen.add(entry.slug);
  }
  entries.set(key, list);
}

/** What a capitalised name of a type points at: its page, in the namespace that declares it. */
/** @type {Map<string, Array<{ key: string, ref: string }>>} */
const named = new Map();
const addName = (/** @type {string} */ name, /** @type {string} */ key, /** @type {string} */ ref) => {
  if (!named.has(name)) named.set(name, []);
  /** @type {Array<{ key: string, ref: string }>} */ (named.get(name)).push({ key, ref });
};
for (const [key, list] of entries) {
  for (const entry of list) {
    if (entry.type) addName(entry.name, key, `${nsSlug(key)}/${entry.slug}`);
    else if (entry.member?.kind === "class") addName(entry.name, key, `${nsSlug(key)}/${entry.slug}`);
  }
  if (namespaces.get(key)?.kind === "class") addName(key, key, nsSlug(key));
}
// A class held by two namespaces (nc.http.HttpError is nc.errors.HttpError) is linked to the one of errors.
for (const refs of named.values()) refs.sort((a, b) => Number(b.key === "errors") - Number(a.key === "errors"));

/* -------------------------------------------------------------------------- */
/*  Code as tokens                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Joins neighbouring plain tokens.
 * @param {Token[]} tokens
 * @returns {Token[]}
 */
const merge = (tokens) => {
  /** @type {Token[]} */
  const out = [];
  for (const token of tokens) {
    const last = out[out.length - 1];
    if (!token[0]) continue;
    if (last && last.length === 1 && token.length === 1) last[0] += token[0];
    else out.push(/** @type {Token} */ ([...token]));
  }
  return out;
};

/**
 * A type as tokens: the names of the package's types link to their page, a
 * few built-in ones to their documentation. Strings stay plain text.
 * @param {string} text
 * @param {string} here The namespace of the page, preferred when a name exists in several.
 * @returns {Token[]}
 */
const tokens = (text, here) => {
  /** @type {Token[]} */
  const out = [];
  const pattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\bnc\.(\w+)\b|(\.\s*)?\b([A-Za-z_$][\w$]*)\b/g;
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, string, nsKey, dot, name] = match;
    const index = /** @type {number} */ (match.index);
    if (string) continue;
    /** @type {Token | undefined} */
    let link;
    if (nsKey && namespaces.has(nsKey) && text[index + whole.length] !== ".") link = [whole, { ref: nsSlug(nsKey) }];
    else if (name && !dot && !nsKey) {
      // `{ Schema: ... }` is a key, not a type.
      const isKey = /^\??:/.test(text.slice(index + whole.length).trimStart()) && /[{,;(]\s*$/.test(text.slice(0, index));
      const refs = named.get(name);
      if (refs && !isKey) link = [name, { ref: (refs.find((r) => r.key === here) ?? refs[0]).ref }];
      else if (Object.hasOwn(BUILTINS, name) && !isKey) link = [name, { href: BUILTINS[name] }];
    }
    if (!link) continue;
    out.push([text.slice(at, index)], link);
    at = index + whole.length;
  }
  out.push([text.slice(at)]);
  return merge(out);
};

const flatText = (/** @type {Token[]} */ list) => list.map((t) => t[0]).join("");
const optionalType = (/** @type {string} */ text) => text.replace(/ \| undefined$/, "");

/**
 * `name<T>(a: A, b?: B): R` as tokens, one parameter per line when it is long.
 * @param {string} name
 * @param {string} typeParams
 * @param {Array<{ name: string, type: Token[], optional?: boolean, rest?: boolean }>} params
 * @param {Token[]} returns
 */
const signatureCode = (name, typeParams, params, returns) => {
  /** @type {Token[]} */
  const out = [[name + typeParams], ["("]];
  const multiline = params.length > 1 && params.map((p) => p.name + flatText(p.type)).join(", ").length > 60;
  params.forEach((param, i) => {
    if (multiline) out.push(["\n  "]);
    else if (i) out.push([", "]);
    out.push([`${param.rest ? "..." : ""}${param.name}${param.optional ? "?" : ""}: `], ...param.type);
    if (multiline) out.push([","]);
  });
  if (multiline) out.push(["\n"]);
  out.push(["): "], ...returns);
  return merge(out);
};

/** Drops what is empty, so that the file says only what there is. */
const compact = (/** @type {Record<string, any>} */ object) => {
  for (const key of Object.keys(object)) {
    const value = object[key];
    if (value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0)) delete object[key];
  }
  return object;
};

/**
 * @param {Signature} signature
 * @param {string} name What the code calls (`slugify`, `new SQLite`).
 * @param {string} here
 */
const callable = (signature, name, here) => {
  const params = signature.params.map((param) => {
    const type = tokens(param.optional ? optionalType(param.type) : param.type, here);
    // "Defaults to" in the description already says it.
    const shown = param.defaultValue !== undefined && !param.description.includes("Defaults to") ? param.defaultValue : undefined;
    return compact({
      name: param.name,
      type,
      optional: param.optional,
      rest: param.rest,
      default: shown,
      text: param.description,
      fields: param.fields?.map((field) => compact({ name: field.name, type: tokens(field.type, here), optional: field.optional, text: field.description })),
    });
  });
  const returns = compact({ type: tokens(signature.returns?.type || signature.returnType, here), text: signature.returns?.description });
  return compact({
    code: signatureCode(name, signature.typeParams, /** @type {any} */ (params), returns.type),
    params,
    returns,
    throws: signature.throws.map((thrown) => compact({ type: thrown.type ? tokens(thrown.type, here) : undefined, text: thrown.description })),
  });
};

/* -------------------------------------------------------------------------- */
/*  Where each thing is declared                                               */
/* -------------------------------------------------------------------------- */

/** @type {Map<string, string[]>} */
const sources = new Map();
const linesOf = (/** @type {string} */ module) => {
  if (!sources.has(module)) {
    const file = path.join(ROOT, "src", `${module}.js`);
    sources.set(module, fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n") : []);
  }
  return /** @type {string[]} */ (sources.get(module));
};
const escape = (/** @type {string} */ name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The address of a name in the source on GitHub, with its line when it can be found.
 * @param {string} module
 * @param {string} name
 * @param {"value" | "method" | "type"} kind
 */
const sourceOf = (module, name, kind) => {
  const lines = linesOf(module);
  const n = escape(name);
  const patterns =
    kind === "type"
      ? [new RegExp(`@(?:typedef|callback)\\b.*[\\s}]${n}\\s*$`), new RegExp(`^\\s*\\*?\\s*\\}\\s*${n}\\s*$`)]
      : kind === "method"
        ? [new RegExp(`^\\s+(?:static\\s+)?(?:async\\s+)?(?:get\\s+|set\\s+)?\\*?${n}\\s*\\(`), new RegExp(`^\\s+(?:static\\s+)?${n}\\s*=`)]
        : [new RegExp(`^(?:async\\s+)?function\\*?\\s+${n}\\s*\\(`), new RegExp(`^(?:const|let)\\s+${n}\\s*=`), new RegExp(`^class\\s+${n}\\b`), new RegExp(`^\\s+${n}\\s*[:(,]`)];
  for (const pattern of patterns) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index >= 0) return `${REPOSITORY}src/${module}.js#L${index + 1}`;
  }
  return `${REPOSITORY}src/${module}.js`;
};

/* -------------------------------------------------------------------------- */
/*  The model of the site                                                      */
/* -------------------------------------------------------------------------- */

/** @type {Array<Record<string, any>>} */
const symbols = [];
/** @type {Array<Record<string, any>>} */
const spaces = [];

for (const key of order) {
  const ns = /** @type {Namespace} */ (namespaces.get(key));
  const here = key;
  const slug = nsSlug(key);
  const isClass = ns.kind === "class";
  const flat = new Set(model.flat[key] ?? []);
  /** @type {string[]} */
  const members = [];
  /** @type {string[]} */
  const types = [];

  for (const entry of /** @type {NonNullable<ReturnType<typeof entries.get>>} */ (entries.get(key))) {
    const ref = `${slug}/${entry.slug}`;
    const base = { ns: key, name: entry.name, slug: entry.slug, ref };
    if (entry.member) {
      const member = entry.member;
      members.push(ref);
      const examples = [...new Set([...(member.examples ?? []), ...member.signatures.flatMap((s) => s.examples)])];
      /** @type {Record<string, any>} */
      const item = { ...base, title: "", kind: "" };
      if (member.kind === "constructor") {
        Object.assign(item, { kind: "constructor", title: `new nc.${key}()`, source: sourceOf(ns.module, "constructor", "method") });
        item.overloads = member.signatures.map((s) => callable(s, `new ${key}`, here));
      } else if (member.kind === "class") {
        Object.assign(item, { kind: "class", title: `nc.${key}.${member.name}`, source: sourceOf(ns.module, member.name, "value") });
        item.code = merge([["class "], [member.name], ...(member.extends ? [[" extends "], ...tokens(member.extends, here)] : [])]);
        if (member.signatures[0]) item.ctor = callable(member.signatures[0], `new ${member.name}`, here);
        const parentRef = (/** @type {string | undefined} */ name) => (name ? named.get(name)?.[0]?.ref : undefined);
        item.properties = member.properties?.map((p) => compact({ name: p.name, type: tokens(p.type, here), optional: p.optional, readonly: p.readonly, static: p.static, text: p.description, inheritedFrom: parentRef(p.inheritedFrom) }));
        item.methods = member.methods?.map((m) => compact({ name: m.name, static: m.static, text: m.description, overloads: m.signatures.map((s) => callable(s, m.name, here)), examples: [...new Set(m.signatures.flatMap((s) => s.examples))], inheritedFrom: parentRef(m.inheritedFrom) }));
      } else if (member.signatures.length) {
        const owner = isClass ? (member.static ? `nc.${key}` : member.qualified.split(".")[0]) : `nc.${key}`;
        Object.assign(item, { kind: isClass ? "method" : "function", title: `${owner}.${member.name}`, source: sourceOf(ns.module, member.name, isClass ? "method" : "value") });
        item.overloads = member.signatures.map((s) => callable(s, member.name, here));
      } else {
        const owner = isClass ? (member.static ? `nc.${key}` : member.qualified.split(".")[0]) : `nc.${key}`;
        Object.assign(item, { kind: "property", title: `${owner}.${member.name}`, source: sourceOf(ns.module, member.name, isClass ? "method" : "value") });
        item.code = merge([[`${member.static ? "static " : ""}${member.name}: `], ...tokens(member.type ?? "unknown", here)]);
      }
      Object.assign(item, { static: member.static, flat: flat.has(member.name) ? `nc.${member.name}` : undefined, text: member.description, deprecated: member.deprecated, examples });
      symbols.push(compact(item));
    } else if (entry.type) {
      const type = entry.type;
      types.push(ref);
      /** @type {Record<string, any>} */
      const item = { ...base, kind: type.properties.length ? "interface" : "type", title: type.name, source: sourceOf(ns.module, type.name, "type"), text: type.description, examples: type.examples };
      if (type.properties.length) {
        item.properties = type.properties.map((p) => compact({ name: p.name, type: tokens(p.type, here), optional: p.optional, text: p.description }));
        item.code = merge([[`type ${type.name}${type.typeParams} = {`], ...type.properties.flatMap((p) => /** @type {Token[]} */ ([[`\n  ${p.name}${p.optional ? "?" : ""}: `], ...tokens(p.type, here), [";"]])), ["\n}"]]);
      } else {
        item.code = merge([[`type ${type.name}${type.typeParams} = `], ...tokens(type.definition, here)]);
        item.values = type.values;
      }
      symbols.push(compact(item));
    }
  }

  spaces.push(compact({
    key,
    slug,
    kind: ns.kind,
    title: isClass ? `nc.${key}` : `nc.${key}`,
    module: ns.subpath,
    guide: GUIDES[key],
    group: GROUPS.find((group) => group.keys.includes(key))?.id,
    source: `${REPOSITORY}src/${ns.module}.js`,
    text: ns.description,
    examples: ns.examples,
    members,
    types,
    extra: ns.extra,
  }));
}

// Which pages mention each one: "used by".
/** @type {Map<string, Set<string>>} */
const usedBy = new Map();
const mentions = (/** @type {unknown} */ value, /** @type {Set<string>} */ into) => {
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === "string" && value[1] && typeof value[1] === "object" && "ref" in value[1]) into.add(/** @type {any} */ (value[1]).ref);
    for (const item of value) mentions(item, into);
  } else if (value && typeof value === "object") for (const item of Object.values(value)) mentions(item, into);
};
for (const item of symbols) {
  const found = new Set();
  mentions(item, found);
  found.delete(item.ref);
  for (const ref of found) {
    if (!usedBy.has(ref)) usedBy.set(ref, new Set());
    /** @type {Set<string>} */ (usedBy.get(ref)).add(item.ref);
  }
}
for (const item of symbols) {
  const users = usedBy.get(item.ref);
  if (users?.size) item.usedBy = [...users].sort((a, b) => a.localeCompare(b, "en"));
}

const api = {
  package: { name: model.package.name, version: model.package.version },
  groups: GROUPS.map((group) => ({ id: group.id, keys: group.keys })),
  flat: model.flat,
  namespaces: spaces,
  symbols,
};
const json = `${JSON.stringify(api, null, 1)}\n`;
const shown = path.relative(ROOT, DATA).split(path.sep).join("/");

/* -------------------------------------------------------------------------- */
/*  Checks                                                                     */
/* -------------------------------------------------------------------------- */

const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
let failed = false;

if (DASHES.test(json)) {
  const at = json.search(DASHES);
  console.error(`[build-reference] the JSDoc contains an em or en dash near "${json.slice(Math.max(0, at - 40), at + 10).replace(/\s+/g, " ")}": replace it.`);
  process.exit(1);
}
// Every namespace has a page of the guide that explains it.
for (const ns of spaces) {
  const file = path.join(CONTENT, `${ns.guide.replace(/^\/|\/$/g, "")}.md`);
  if (!fs.existsSync(file) && !fs.existsSync(`${file}x`)) {
    console.error(`[build-reference] nc.${ns.key}: its guide page ${ns.guide} does not exist. Fix GUIDES in scripts/build-reference.js.`);
    failed = true;
  }
}
// What has no doc comment shows an empty page: say so.
const undocumented = symbols.filter((item) => !item.text && item.kind !== "constructor").map((item) => item.ref);
if (undocumented.length) console.log(`[build-reference] no description in the JSDoc for: ${undocumented.join(", ")}`);

/* -------------------------------------------------------------------------- */
/*  Translations                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The name a paragraph has in a catalog: its text on one line. A table keeps
 * its lines.
 * @param {string} block
 */
const keyOf = (block) => (/^\s*\|/m.test(block) ? block.trim() : block.replace(/\s*\n\s*/g, " ").trim());

/** Code without its comments and its spacing: what a translation must leave alone. */
const bare = (/** @type {string} */ code) => code.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((line) => line.replace(/(^|\s)\/\/.*$/, "$1")).join("\n").replace(/\s+/g, "");

/**
 * Goes through the sentences of a namespace in another language, the way the
 * pages look them up (docs/src/reference/model.ts): every `text` and
 * `deprecated`, paragraph by paragraph, and every example.
 * @param {string} language
 * @param {string} key The namespace.
 */
const translator = (language, key) => {
  const file = path.join(CATALOGS, language, `${key.toLowerCase()}.json`);
  /** @type {Record<string, string>} */
  const catalog = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  /** @type {Set<string>} */
  const used = new Set();
  /** @type {Set<string>} */
  const missing = new Set();
  const text = (/** @type {string} */ value) => {
    for (const block of value.split(/\n\s*\n/)) {
      const name = keyOf(block);
      if (!name) continue;
      const translated = Object.hasOwn(catalog, name) ? catalog[name] : undefined;
      if (!translated) missing.add(name);
      else {
        used.add(name);
        if (DASHES.test(translated)) {
          console.error(`[build-reference] ${path.relative(ROOT, file)}: the translation of ${JSON.stringify(name)} contains an em or en dash.`);
          failed = true;
        }
      }
    }
  };
  const example = (/** @type {string} */ code) => {
    const translated = Object.hasOwn(catalog, code) ? catalog[code] : undefined;
    if (!translated) return;
    if (bare(translated) !== bare(code)) throw new Error(`${path.relative(ROOT, file)}: the translation of an example changes its code, only comments may change:\n${code}`);
    used.add(code);
  };
  /** @param {unknown} value */
  const walk = (value) => {
    if (Array.isArray(value)) for (const item of value) walk(item);
    else if (value && typeof value === "object") {
      for (const [field, inner] of Object.entries(value)) {
        if ((field === "text" || field === "deprecated") && typeof inner === "string") text(inner);
        else if (field === "examples" && Array.isArray(inner)) for (const code of inner) example(code);
        else if (field !== "code" && field !== "type") walk(inner);
      }
    }
  };
  return { file, catalog, used, missing, walk };
};

let untranslated = 0;
for (const language of LANGUAGES) {
  let missing = 0;
  let unused = 0;
  for (const key of order) {
    const tr = translator(language, key);
    tr.walk(spaces.find((ns) => ns.key === key));
    tr.walk(symbols.filter((item) => item.ns === key));
    const stale = Object.keys(tr.catalog).filter((name) => !tr.used.has(name));
    missing += tr.missing.size;
    unused += stale.length;
    if (MISSING) {
      for (const name of tr.missing) console.log(`[${language}] ${key}: not translated: ${JSON.stringify(name)}`);
      for (const name of stale) console.log(`[${language}] ${key}: no longer used: ${JSON.stringify(name)}`);
    }
  }
  untranslated += missing;
  if (missing || unused) console.log(`[build-reference] ${language}: ${missing} sentence(s) not translated yet, ${unused} translation(s) no longer used. \`node scripts/build-reference.js --missing\` lists them.`);
}

/* -------------------------------------------------------------------------- */
/*  Output                                                                     */
/* -------------------------------------------------------------------------- */

const summary = `${spaces.length} namespaces and classes, ${symbols.length} pages of members and types`;
if (CHECK) {
  const current = fs.existsSync(DATA) ? fs.readFileSync(DATA, "utf8").replace(/\r\n/g, "\n") : "";
  if (current !== json) {
    console.error(`[build-reference] ${shown} is out of date. Run \`npm run build\` and commit the result.`);
    failed = true;
  } else console.log(`[build-reference] OK: ${shown} matches the source (${summary}).`);
} else {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, json);
  console.log(`[build-reference] ${shown}: ${summary}.`);
}

if (STRICT && untranslated) {
  console.error(`[build-reference] ${untranslated} sentence(s) have no translation.`);
  failed = true;
}
if (failed) process.exit(1);
