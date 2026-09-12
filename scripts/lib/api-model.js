"use strict";

// Builds a plain JSON description of the public API from the generated type
// declarations: namespaces, members, signatures, parameters, examples and
// types. Both docs/API.md and the documentation site are rendered from it.

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = path.join(ROOT, "types", "index.d.ts");
const FORMAT = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const FLAT = ["logger", "fs", "checker", "utils"];
/** How class instances are named in examples and headings. */
const INSTANCE = /** @type {Record<string, string>} */ ({ SQLite: "db", Cache: "cache", Emitter: "events" });

/**
 * @typedef {{ name: string, type: string, optional: boolean, rest: boolean, defaultValue?: string, description: string }} Param
 * @typedef {{ code: string, description: string, params: Param[], returns?: { type: string, description: string }, throws: Array<{ type: string, description: string }>, examples: string[], deprecated?: string }} Signature
 * @typedef {{ name: string, qualified: string, kind: "function" | "method" | "property" | "constructor", description: string, signatures: Signature[], type?: string, deprecated?: string }} Member
 * @typedef {{ name: string, description: string, definition: string, properties: Array<{ name: string, type: string, optional: boolean, description: string }> }} TypeInfo
 * @typedef {{ key: string, module: string, title: string, kind: "namespace" | "class", flat: boolean, subpath: string, description: string, examples: string[], members: Member[], extra: string[], types: TypeInfo[] }} Namespace
 */

/**
 * Parses a raw JSDoc comment.
 * @param {string} comment
 */
const parseJSDoc = (comment) => {
  const body = comment
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, ""))
    .join("\n");
  const [head, ...rest] = body.split(/\n(?=@\w)/);
  const startsWithTag = /^\s*@\w/.test(head);
  const description = startsWithTag ? "" : head.trim();
  const tagTexts = startsWithTag ? [head, ...rest] : rest;
  /** @type {Array<{ tag: string, type?: string, name?: string, optional?: boolean, defaultValue?: string, text: string }>} */
  const tags = [];
  for (const raw of tagTexts) {
    const m = /^\s*@(\w+)\s?([\s\S]*)$/.exec(raw);
    if (!m) continue;
    const tag = m[1];
    let text = m[2];
    /** @type {string | undefined} */
    let type;
    if (tag !== "example" && text.trimStart().startsWith("{")) {
      text = text.trimStart();
      let depth = 0;
      let end = 0;
      for (; end < text.length; end++) {
        if (text[end] === "{") depth++;
        else if (text[end] === "}" && --depth === 0) break;
      }
      type = text.slice(1, end).replace(/\s+/g, " ").trim();
      text = text.slice(end + 1).trimStart();
    }
    /** @type {string | undefined} */
    let name;
    let optional = false;
    /** @type {string | undefined} */
    let defaultValue;
    if (tag === "param" || tag === "property" || tag === "template") {
      if (text.startsWith("[")) {
        let depth = 0;
        let end = 0;
        for (; end < text.length; end++) {
          if ("[({".includes(text[end])) depth++;
          else if ("])}".includes(text[end]) && --depth === 0) break;
        }
        const inner = text.slice(1, end);
        const eq = inner.indexOf("=");
        name = eq < 0 ? inner : inner.slice(0, eq);
        defaultValue = eq < 0 ? undefined : inner.slice(eq + 1);
        optional = true;
        text = text.slice(end + 1);
      } else {
        const nm = /^(\S+)/.exec(text);
        name = nm ? nm[1] : "";
        text = text.slice(name.length);
      }
      text = text.replace(/^\s*-\s+/, " ");
    }
    tags.push({ tag, type, name, optional, defaultValue, text: tag === "example" ? text.replace(/^\n/, "").replace(/\s+$/, "") : text.replace(/\s*\n\s*/g, " ").trim() });
  }
  return { description, tags };
};

/**
 * Renders `{@link X}` as inline code.
 * @param {string} text
 */
const links = (text) => text.replace(/\{@link\s+([^}\s|]+)(?:\s*\|?\s*([^}]*))?\}/g, (_, target, label) => `\`${(label || target).trim()}\``);

/**
 * The raw JSDoc comment attached to a declaration.
 * @param {ts.Node | undefined} node
 * @returns {string | undefined}
 */
const jsDocOf = (node) => {
  if (!node) return undefined;
  const docs = /** @type {any} */ (node).jsDoc;
  if (!docs?.length) return undefined;
  const last = docs[docs.length - 1];
  return node.getSourceFile().text.slice(last.pos, last.end);
};

/**
 * The overview comment at the top of a source file.
 * @param {string} moduleName
 */
const overviewOf = (moduleName) => {
  const source = fs.readFileSync(path.join(ROOT, "src", `${moduleName}.js`), "utf8").replace(/\r\n/g, "\n");
  const match = /^(?:"use strict";\s*)?(\/\*\*[\s\S]*?\*\/)\n\n/.exec(source);
  if (!match) return { description: "", examples: [] };
  const parsed = parseJSDoc(match[1]);
  return { description: links(parsed.description), examples: parsed.tags.filter((t) => t.tag === "example").map((t) => t.text) };
};

/** @returns {{ package: { name: string, version: string, description: string, homepage?: string }, flat: Record<string, string[]>, namespaces: Namespace[], typeOwners: Record<string, string> }} */
function buildModel() {
  if (!fs.existsSync(TYPES)) throw new Error("types/index.d.ts is missing: run `node scripts/build-types.js` first.");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const nc = require(ROOT);
  const program = ts.createProgram([TYPES], { strict: true, noEmit: true, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, target: ts.ScriptTarget.ES2022, types: ["node"] });
  const checker = program.getTypeChecker();
  const source = /** @type {ts.SourceFile} */ (program.getSourceFile(TYPES));
  const root = /** @type {ts.Symbol} */ (checker.getSymbolAtLocation(source));
  const exported = new Map(checker.getExportsOfModule(root).map((s) => [s.getName(), s]));

  /** @type {Map<string, string>} source module name -> namespace key */
  const moduleKeys = new Map();
  for (const file of fs.readdirSync(path.join(ROOT, "src"))) {
    const value = require(path.join(ROOT, "src", file));
    const key = Object.keys(nc).find((k) => nc[k] === value && k !== "nc" && k !== "nodeComfort");
    if (key) moduleKeys.set(path.basename(file, ".js"), key);
  }

  /** @param {string} text */
  const clean = (text) =>
    text
      .replace(/typeof import\("[^"]*\/types\/(?:src\/)?(\w+)(?:\.js)?"\)/g, (_, mod) => (mod === "index" ? "typeof nc" : `typeof nc.${moduleKeys.get(mod) ?? mod}`))
      .replace(/import\("[^"]*"\)\./g, "")
      .replace(/\?: ((?:[^,()<>]|<[^<>]*>)*?) \| undefined(?=[,);])/g, "?: $1");

  /** @param {ts.Symbol} symbol */
  const resolve = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);

  /**
   * @param {ts.Signature} signature
   * @param {string} name
   * @returns {Signature}
   */
  const signatureOf = (signature, name) => {
    const declaration = signature.getDeclaration();
    const raw = jsDocOf(declaration);
    const parsed = raw ? parseJSDoc(raw) : { description: links(ts.displayPartsToString(signature.getDocumentationComment(checker))), tags: [] };
    const paramTags = new Map(parsed.tags.filter((t) => t.tag === "param").map((t) => [t.name, t]));
    /** @type {Param[]} */
    const params = signature.getParameters().map((p) => {
      const decl = /** @type {ts.ParameterDeclaration | undefined} */ (p.valueDeclaration);
      const tag = paramTags.get(p.getName());
      const printed = decl ? checker.typeToString(checker.getTypeOfSymbolAtLocation(p, decl), decl, FORMAT) : "unknown";
      return {
        name: p.getName(),
        type: clean(tag?.type ?? printed),
        optional: Boolean(decl && (decl.questionToken || decl.initializer || tag?.optional)),
        rest: Boolean(decl?.dotDotDotToken),
        defaultValue: tag?.defaultValue,
        description: links(tag?.text ?? ts.displayPartsToString(p.getDocumentationComment(checker))),
      };
    });
    const ret = parsed.tags.find((t) => t.tag === "returns" || t.tag === "return");
    const deprecated = parsed.tags.find((t) => t.tag === "deprecated");
    return {
      code: clean(`${name}${checker.signatureToString(signature, undefined, FORMAT)}`),
      description: links(parsed.description),
      params,
      returns: ret ? { type: clean(ret.type ?? checker.typeToString(signature.getReturnType(), undefined, FORMAT)), description: links(ret.text) } : undefined,
      throws: parsed.tags.filter((t) => t.tag === "throws").map((t) => ({ type: t.type ?? "", description: links(t.text) })),
      examples: parsed.tags.filter((t) => t.tag === "example").map((t) => t.text),
      deprecated: deprecated ? links(deprecated.text) || "Deprecated." : undefined,
    };
  };

  /**
   * @param {string} name
   * @param {string} qualified
   * @param {ts.Symbol} symbol
   * @param {Member["kind"]} kind
   * @returns {Member}
   */
  const memberOf = (name, qualified, symbol, kind) => {
    const target = resolve(symbol);
    const type = checker.getTypeOfSymbolAtLocation(target, source);
    const callables = type.getCallSignatures();
    const description = links(ts.displayPartsToString(target.getDocumentationComment(checker)));
    if (callables.length) {
      const signatures = callables.map((s) => signatureOf(s, name));
      if (!signatures[0].description) signatures[0].description = description;
      return { name, qualified, kind, description: signatures[0].description || description, signatures, deprecated: signatures.find((s) => s.deprecated)?.deprecated };
    }
    return { name, qualified, kind: "property", description, signatures: [], type: clean(checker.typeToString(type, undefined, FORMAT)) };
  };

  /**
   * Public types of a module.
   * @param {ts.Symbol} moduleSymbol
   * @returns {TypeInfo[]}
   */
  const typesOf = (moduleSymbol) => {
    /** @type {TypeInfo[]} */
    const list = [];
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = resolve(symbol);
      if (!(target.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) || target.flags & ts.SymbolFlags.Value) continue;
      if (symbol.getName().startsWith("_")) continue;
      const declared = checker.getDeclaredTypeOfSymbol(target);
      const decl = target.declarations?.[0];
      const isObjectLiteral = decl && ts.isTypeAliasDeclaration(decl) && ts.isTypeLiteralNode(decl.type);
      const definition = isObjectLiteral ? "" : decl && ts.isTypeAliasDeclaration(decl) ? clean(decl.type.getText().replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ")) : clean(checker.typeToString(declared, undefined, FORMAT));
      const properties = isObjectLiteral
        ? checker.getPropertiesOfType(declared).map((p) => ({
            name: p.getName(),
            type: clean(checker.typeToString(checker.getTypeOfSymbolAtLocation(p, /** @type {ts.Node} */ (decl)), undefined, FORMAT)).replace(/ \| undefined$/, ""),
            optional: Boolean(p.flags & ts.SymbolFlags.Optional),
            description: links(ts.displayPartsToString(p.getDocumentationComment(checker))),
          }))
        : [];
      list.push({ name: symbol.getName(), description: links(ts.displayPartsToString(target.getDocumentationComment(checker))), definition, properties });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  };

  const isClass = (/** @type {unknown} */ v) => typeof v === "function" && /^class\b/.test(Function.prototype.toString.call(v));
  const flatKeys = Object.keys(nc).filter((k) => typeof nc[k] === "function" && !isClass(nc[k]));
  const namespaceKeys = Object.keys(nc).filter((k) => !flatKeys.includes(k) && k !== "nc" && k !== "nodeComfort");
  /** @type {Record<string, string[]>} */
  const flat = {};
  for (const ns of FLAT) flat[ns] = flatKeys.filter((k) => nc[ns] && nc[ns][k] === nc[k]);

  /** @type {Namespace[]} */
  const namespaces = [];
  /** @type {Record<string, string>} */
  const typeOwners = {};
  for (const key of namespaceKeys) {
    const symbol = exported.get(key);
    if (!symbol) throw new Error(`Missing type for nc.${key}`);
    const target = resolve(symbol);
    const value = nc[key];
    const moduleName = [...moduleKeys].find(([, k]) => k === key)?.[0] ?? key;
    const overview = overviewOf(moduleName);
    /** @type {Member[]} */
    const members = [];
    /** @type {string[]} */
    let extra = [];
    if (isClass(value)) {
      const classType = checker.getTypeOfSymbolAtLocation(target, source);
      const construct = classType.getConstructSignatures()[0];
      if (construct) {
        const sig = signatureOf(construct, `new ${key}`);
        members.push({ name: "constructor", qualified: `new nc.${key}()`, kind: "constructor", description: sig.description, signatures: [sig] });
      }
      const instance = checker.getDeclaredTypeOfSymbol(target);
      const variable = INSTANCE[key] ?? key.toLowerCase();
      for (const name of Object.getOwnPropertyNames(value.prototype)) {
        if (name === "constructor") continue;
        const prop = instance.getProperty(name);
        if (prop) members.push(memberOf(name, `${variable}.${name}`, prop, "method"));
      }
    } else {
      const type = checker.getTypeOfSymbolAtLocation(target, source);
      const runtimeKeys = Object.keys(value);
      for (const name of runtimeKeys) {
        const prop = type.getProperty(name);
        if (!prop) throw new Error(`nc.${key}.${name} exists at runtime but has no type`);
        members.push(memberOf(name, `nc.${key}.${name}`, prop, "function"));
      }
      extra = checker.getPropertiesOfType(type).map((p) => p.getName()).filter((n) => !runtimeKeys.includes(n));
    }
    const moduleSymbol = target.flags & (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule) ? target : target.declarations?.[0] ? checker.getSymbolAtLocation(target.declarations[0].getSourceFile()) : undefined;
    const types = moduleSymbol ? typesOf(moduleSymbol) : [];
    for (const t of types) typeOwners[t.name] = key;
    namespaces.push({
      key,
      module: moduleName,
      title: isClass(value) ? `nc.${key}` : `nc.${key}`,
      kind: isClass(value) ? "class" : "namespace",
      flat: FLAT.includes(key),
      subpath: `${pkg.name}/${key.toLowerCase()}`,
      description: overview.description,
      examples: overview.examples,
      members,
      extra,
      types,
    });
  }
  return { package: { name: pkg.name, version: pkg.version, description: pkg.description, homepage: pkg.homepage }, flat, namespaces, typeOwners };
}

module.exports = { buildModel, parseJSDoc };
