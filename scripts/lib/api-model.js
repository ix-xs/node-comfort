"use strict";

// Builds a plain JSON description of the public API from the generated type
// declarations: namespaces, members, signatures, parameters, examples and
// types. scripts/build-reference.js turns it into the data of the reference
// pages of the documentation site.

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
 * @typedef {{ name: string, type: string, optional: boolean, description: string }} Field
 * @typedef {{ name: string, type: string, optional: boolean, rest: boolean, defaultValue?: string, description: string, fields?: Field[] }} Param
 * @typedef {{ code: string, typeParams: string, returnType: string, description: string, params: Param[], returns?: { type: string, description: string }, throws: Array<{ type: string, description: string }>, examples: string[], deprecated?: string }} Signature
 * @typedef {{ name: string, type: string, optional: boolean, readonly: boolean, static: boolean, description: string, inheritedFrom?: string }} ClassProperty
 * @typedef {{ name: string, static: boolean, description: string, signatures: Signature[], inheritedFrom?: string }} ClassMethod
 * @typedef {{ name: string, qualified: string, kind: "function" | "method" | "property" | "constructor" | "class", static?: boolean, description: string, signatures: Signature[], type?: string, deprecated?: string, examples?: string[], properties?: ClassProperty[], methods?: ClassMethod[], extends?: string }} Member
 * @typedef {{ name: string, description: string, definition: string, typeParams: string, values?: string[], examples: string[], properties: Array<{ name: string, type: string, optional: boolean, description: string }> }} TypeInfo
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
 * A comment cannot hold the two characters that end it, so the source writes
 * them with a backslash in between. Readers get them as they are meant.
 * @param {string} text
 */
const plain = (text) => text.split(`*${"\\"}/`).join("*/");

/**
 * Renders `{@link X}` as inline code.
 * @param {string} text
 */
const links = (text) => plain(text).replace(/\{@link\s+([^}\s|]+)(?:\s*\|?\s*([^}]*))?\}/g, (_, target, label) => `\`${(label || target).trim()}\``);

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
  return { description: links(parsed.description), examples: parsed.tags.filter((t) => t.tag === "example").map((t) => plain(t.text)) };
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
    // src/internal is shared plumbing, not a namespace
    if (!file.endsWith(".js")) continue;
    const value = require(path.join(ROOT, "src", file));
    const key = Object.keys(nc).find((k) => nc[k] === value && k !== "nc" && k !== "nodeComfort");
    if (key) moduleKeys.set(path.basename(file, ".js"), key);
  }

  /** @param {string} text */
  const clean = (text) =>
    text
      .replace(/typeof import\("(?:[^"]*\/types\/(?:src\/)?|\.\/)(\w+)(?:\.js)?"\)/g, (_, mod) => (mod === "index" ? "typeof nc" : `typeof nc.${moduleKeys.get(mod) ?? mod}`))
      .replace(/import\("[^"]*"\)\./g, "")
      .replace(/\?: ((?:[^,()<>]|<[^<>]*>)*?) \| undefined(?=[,);])/g, "?: $1");

  /** @param {ts.Symbol} symbol */
  const resolve = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);

  /** Whether a declaration comes from the package's own types, not from Node or TypeScript. */
  const TYPES_DIR = path.join(ROOT, "types").split(path.sep).join("/").toLowerCase() + "/";
  const own = (/** @type {ts.Declaration | undefined} */ decl) => Boolean(decl && decl.getSourceFile().fileName.split("\\").join("/").toLowerCase().startsWith(TYPES_DIR));
  /** A type without the `| undefined` an optional value always carries. */
  const optionalType = (/** @type {string} */ text) => text.replace(/ \| undefined$/, "");
  /** `T` -> `T[]`, `A | B` -> `(A | B)[]`. */
  const arrayOf = (/** @type {string} */ text) => {
    // Type arguments, innermost first, until none is left: Map<string, Array<number>> is one name.
    let bare = text;
    while (/<[^<>]*>/.test(bare)) bare = bare.replace(/<[^<>]*>/g, "");
    return (/^[\w.$<>, ]+$/.test(text) && !/\s/.test(bare)) || /^\(.*\)$/.test(text) ? `${text}[]` : `(${text})[]`;
  };

  /**
   * What an object written inline accepts (`{ cwd?: string, type?: "file" }`):
   * the properties of the parts of the type that have no name of their own.
   * @param {ts.Type} type
   * @param {ts.Node} at
   * @returns {Field[] | undefined}
   */
  const fieldsOf = (type, at) => {
    const anonymous = (/** @type {ts.Type} */ t) => Boolean(t.flags & ts.TypeFlags.Object) && !t.aliasSymbol && /^__(type|object)$/.test(t.symbol?.getName() ?? "") && !t.getCallSignatures().length;
    const parts = type.isIntersection() ? type.types.filter(anonymous) : anonymous(type) ? [type] : [];
    const props = parts.flatMap((part) => part.getProperties());
    if (!props.length) return undefined;
    return props.map((p) => ({
      name: p.getName(),
      type: optionalType(clean(checker.typeToString(checker.getTypeOfSymbolAtLocation(p, at), at, FORMAT))),
      optional: Boolean(p.flags & ts.SymbolFlags.Optional),
      description: links(ts.displayPartsToString(p.getDocumentationComment(checker))),
    }));
  };

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
      const type = decl ? checker.getTypeOfSymbolAtLocation(p, decl) : undefined;
      const printed = type && decl ? checker.typeToString(type, decl, FORMAT) : "unknown";
      const optional = Boolean(decl && (decl.questionToken || decl.initializer || tag?.optional));
      const fields = type && decl ? fieldsOf(checker.getNonNullableType(type), decl) : undefined;
      return {
        name: p.getName(),
        // A JSDoc rest parameter is written `{...T}`: it is a `T[]`.
        type: tag?.type ? clean(decl?.dotDotDotToken && tag.type.startsWith("...") ? arrayOf(tag.type.slice(3)) : tag.type) : optional ? optionalType(clean(printed)) : clean(printed),
        optional,
        rest: Boolean(decl?.dotDotDotToken),
        defaultValue: tag?.defaultValue,
        description: links(tag?.text ?? ts.displayPartsToString(p.getDocumentationComment(checker))),
        ...(fields ? { fields } : {}),
      };
    });
    const ret = parsed.tags.find((t) => t.tag === "returns" || t.tag === "return");
    const deprecated = parsed.tags.find((t) => t.tag === "deprecated");
    const typeParams = declaration && "typeParameters" in declaration && declaration.typeParameters?.length ? `<${declaration.typeParameters.map((tp) => clean(tp.getText())).join(", ")}>` : "";
    return {
      code: clean(`${name}${checker.signatureToString(signature, undefined, FORMAT)}`),
      typeParams,
      returnType: clean(checker.typeToString(signature.getReturnType(), undefined, FORMAT)),
      description: links(parsed.description),
      params,
      returns: ret ? { type: clean(ret.type ?? checker.typeToString(signature.getReturnType(), undefined, FORMAT)), description: links(ret.text) } : undefined,
      throws: parsed.tags.filter((t) => t.tag === "throws").map((t) => ({ type: t.type ?? "", description: links(t.text) })),
      examples: parsed.tags.filter((t) => t.tag === "example").map((t) => plain(t.text)),
      deprecated: deprecated ? links(deprecated.text) || "Deprecated." : undefined,
    };
  };

  /**
   * @param {string} name
   * @param {string} qualified
   * @param {ts.Symbol} symbol
   * @param {Member["kind"]} kind
   * @param {boolean} [isStatic] Carried by the class itself, like `SQLite.op`.
   * @returns {Member}
   */
  const memberOf = (name, qualified, symbol, kind, isStatic = false) => {
    const target = resolve(symbol);
    const type = checker.getTypeOfSymbolAtLocation(target, source);
    const callables = type.getCallSignatures();
    const description = links(ts.displayPartsToString(target.getDocumentationComment(checker)));
    const statics = isStatic ? { static: true } : {};
    if (callables.length) {
      const signatures = callables.map((s) => signatureOf(s, name));
      if (!signatures[0].description) signatures[0].description = description;
      return { name, qualified, kind, ...statics, description: signatures[0].description || description, signatures, deprecated: signatures.find((s) => s.deprecated)?.deprecated };
    }
    const raw = jsDocOf(target.valueDeclaration ?? target.declarations?.[0]);
    const examples = raw ? parseJSDoc(raw).tags.filter((t) => t.tag === "example").map((t) => plain(t.text)) : [];
    // A class held by a namespace, like nc.errors.HttpError.
    const constructs = type.getConstructSignatures();
    if (constructs.length) {
      const declaration = target.valueDeclaration ?? target.declarations?.[0];
      const heritage = declaration && ts.isClassDeclaration(declaration) ? declaration.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.getText() : undefined;
      return {
        name,
        qualified,
        kind: "class",
        description,
        examples,
        signatures: constructs.map((s) => signatureOf(s, `new ${name}`)),
        ...(heritage ? { extends: heritage } : {}),
        ...classMembers(constructs[0].getReturnType(), type, name),
      };
    }
    return { name, qualified, kind: "property", ...statics, description, examples, signatures: [], type: clean(checker.typeToString(type, undefined, FORMAT)) };
  };

  /**
   * The public properties and methods of a class held by a namespace, its own
   * and those it gets from another class of the package.
   * @param {ts.Type} instance
   * @param {ts.Type} statics
   * @param {string} className
   * @returns {{ properties: ClassProperty[], methods: ClassMethod[] }}
   */
  const classMembers = (instance, statics, className) => {
    /** @type {ClassProperty[]} */
    const properties = [];
    /** @type {ClassMethod[]} */
    const methods = [];
    const visit = (/** @type {ts.Type} */ type, /** @type {boolean} */ isStatic) => {
      for (const p of type.getProperties()) {
        const decl = p.valueDeclaration ?? p.declarations?.[0];
        const name = p.getName();
        if (!own(decl) || name.startsWith("_") || name.startsWith("__@") || name === "prototype") continue;
        if (ts.getCombinedModifierFlags(/** @type {ts.Declaration} */ (decl)) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
        const parent = /** @type {ts.Declaration} */ (decl).parent;
        const parentName = parent && ts.isClassDeclaration(parent) ? parent.name?.getText() : undefined;
        const inherited = parentName && parentName !== className ? { inheritedFrom: parentName } : {};
        const value = checker.getTypeOfSymbolAtLocation(p, /** @type {ts.Node} */ (decl));
        const description = links(ts.displayPartsToString(p.getDocumentationComment(checker)));
        if (p.flags & ts.SymbolFlags.Method) {
          methods.push({ name, static: isStatic, description, signatures: value.getCallSignatures().map((s) => signatureOf(s, name)), ...inherited });
        } else {
          const readonly = Boolean(ts.getCombinedModifierFlags(/** @type {ts.Declaration} */ (decl)) & ts.ModifierFlags.Readonly);
          properties.push({ name, type: optionalType(clean(checker.typeToString(value, undefined, FORMAT))), optional: Boolean(p.flags & ts.SymbolFlags.Optional), readonly, static: isStatic, description, ...inherited });
        }
      }
    };
    visit(statics, true);
    visit(instance, false);
    return { properties, methods };
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
      // `_WatcherMethods & Disposable` reads like an object too: its members are listed, not that line.
      const isMethodsAndDisposable =
        decl && ts.isTypeAliasDeclaration(decl) && ts.isIntersectionTypeNode(decl.type) && decl.type.types.every((t) => ts.isTypeReferenceNode(t) && /^(_\w+|Disposable)$/.test(t.typeName.getText()));
      const isObjectLiteral = (decl && ts.isTypeAliasDeclaration(decl) && ts.isTypeLiteralNode(decl.type)) || isMethodsAndDisposable;
      const definition = isObjectLiteral ? "" : decl && ts.isTypeAliasDeclaration(decl) ? clean(decl.type.getText().replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ")) : clean(checker.typeToString(declared, undefined, FORMAT));
      const properties = isObjectLiteral
        ? checker.getPropertiesOfType(declared).filter((p) => !p.getName().startsWith("__@")).map((p) => ({
            name: p.getName(),
            type: clean(checker.typeToString(checker.getTypeOfSymbolAtLocation(p, /** @type {ts.Node} */ (decl)), undefined, FORMAT)).replace(/ \| undefined$/, ""),
            optional: Boolean(p.flags & ts.SymbolFlags.Optional),
            description: links(ts.displayPartsToString(p.getDocumentationComment(checker))),
          }))
        : [];
      const typeParams = decl && (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl)) && decl.typeParameters?.length ? `<${decl.typeParameters.map((tp) => clean(tp.getText())).join(", ")}>` : "";
      // A list of strings to choose from: the values, one by one.
      const values = declared.isUnion() && declared.types.every((t) => t.isStringLiteral()) ? declared.types.map((t) => /** @type {ts.StringLiteralType} */ (t).value) : undefined;
      const raw = jsDocOf(decl);
      const examples = raw ? parseJSDoc(raw).tags.filter((t) => t.tag === "example").map((t) => plain(t.text)) : [];
      list.push({ name: symbol.getName(), description: links(ts.displayPartsToString(target.getDocumentationComment(checker))), definition, typeParams, ...(values ? { values } : {}), examples, properties });
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
      // What the class itself carries, like SQLite.op.
      for (const name of Object.getOwnPropertyNames(value)) {
        if (name === "length" || name === "name" || name === "prototype") continue;
        const prop = classType.getProperty(name);
        if (prop) members.push(memberOf(name, `nc.${key}.${name}`, prop, "method", true));
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
