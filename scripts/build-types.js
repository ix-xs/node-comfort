"use strict";

/**
 * Builds the TypeScript declarations shipped with the package.
 *
 * 1. Compiles the JSDoc of every `src/*.js` module into `types/src/*.d.ts`
 *    (TypeScript keeps every description, `@param`, `@example`, ...).
 * 2. Generates `types/index.d.ts` from the real runtime exports of `index.js`.
 *    Every namespace and every public type becomes a genuine named export
 *    (`export import name = _Module`), which is what gives editors: hover
 *    documentation, completions after `nc.`, and auto-imports of any
 *    namespace straight from the package root. The deprecated names of the
 *    root (`nc.info`, `nc.SQLite`...) are typed too, with a `@deprecated`
 *    note that tells what to use instead, so editors strike them through.
 * 3. Fails loudly when runtime exports and typed exports drift apart, or when
 *    two modules export a type with the same name.
 *
 * Usage: `npm run build`
 */

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "types");

const fail = (message) => {
  console.error(`\n[build-types] ${message}\n`);
  process.exit(1);
};

// compile

fs.rmSync(OUT, { recursive: true, force: true });

const configPath = path.join(ROOT, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) fail(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const emit = program.emit();
const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emit.diagnostics];

if (diagnostics.length) {
  const host = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => ROOT,
    getNewLine: () => "\n",
  };
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  fail(`${diagnostics.length} TypeScript error(s) in src/. Fix them before publishing.`);
}

// map runtime exports

const api = require(path.join(ROOT, "index.js"));
const { peek, aliasesOf } = require(path.join(SRC, "internal", "deprecate.js"));
const modules = fs
  .readdirSync(SRC)
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const name = path.basename(file, ".js");
    return { name, alias: `_${name.replace(/[^A-Za-z0-9_]/g, "_")}`, value: require(path.join(SRC, file)) };
  });

const byValue = new Map(modules.map((m) => [m.value, m]));

/**
 * The names a module has, deprecated ones included.
 * @param {typeof modules[number]} m
 * @returns {string[]}
 */
const namesOf = (m) => (m.value && (typeof m.value === "object" || typeof m.value === "function") ? Object.getOwnPropertyNames(m.value) : []);

/** @type {Array<{ key: string, kind: "module"|"member"|"self", module?: typeof modules[number], member?: string, deprecated?: string }>} */
const entries = [];

// The namespaces: the only enumerable keys of the root.
for (const key of Object.keys(api)) {
  const whole = byValue.get(api[key]);
  if (!whole) fail(`nc.${key} must be a whole src/ module: the root only holds namespaces.`);
  entries.push({ key, kind: "module", module: whole });
}

// The deprecated names, hidden from listings. Read with peek(), so the build doesn't warn.
for (const { name, use } of aliasesOf(api)) {
  const deprecated = `Use ${use}. It will be removed in 4.0.`;
  const value = peek(api, name);
  if (value === api) {
    entries.push({ key: name, kind: "self", deprecated });
    continue;
  }
  const whole = byValue.get(value);
  if (whole) {
    entries.push({ key: name, kind: "module", module: whole, deprecated });
    continue;
  }
  // The same name in a module first (nc.isEmail is checker.isEmail), else any name with the same value.
  let owner = modules.find((m) => namesOf(m).includes(name) && peek(m.value, name) === value);
  let member = name;
  if (!owner) {
    for (const m of modules) {
      const found = namesOf(m).find((n) => !["length", "name", "prototype"].includes(n) && peek(m.value, n) === value);
      if (found) {
        owner = m;
        member = found;
        break;
      }
    }
  }
  if (!owner) fail(`Cannot find the module that exports the value of the deprecated "nc.${name}".`);
  entries.push({ key: name, kind: "member", module: owner, member, deprecated });
}

// collect exported type names

const declProgram = ts.createProgram(
  modules.map((m) => path.join(OUT, "src", `${m.name}.d.ts`)),
  { ...parsed.options, noEmit: true, allowJs: false, checkJs: false },
);
const checker = declProgram.getTypeChecker();

/** @type {Map<string, string>} type name -> module name */
const typeOwners = new Map();

for (const m of modules) {
  const file = declProgram.getSourceFile(path.join(OUT, "src", `${m.name}.d.ts`));
  if (!file) fail(`Missing declaration for src/${m.name}.js`);
  const symbol = checker.getSymbolAtLocation(file);
  if (!symbol) continue;
  for (const exported of checker.getExportsOfModule(symbol)) {
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const isType = target.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface);
    const isValue = target.flags & ts.SymbolFlags.Value;
    if (!isType || isValue) continue;
    const name = exported.getName();
    if (name.startsWith("_")) continue;
    const previous = typeOwners.get(name);
    if (previous && previous !== m.name) {
      fail(`Type "${name}" is exported by both src/${previous}.js and src/${m.name}.js. Rename one of them.`);
    }
    typeOwners.set(name, m.name);
  }
}

const valueKeys = new Set(entries.map((e) => e.key));
for (const name of typeOwners.keys()) {
  if (valueKeys.has(name)) fail(`Type "${name}" clashes with a runtime export of the same name.`);
}

// write index.d.ts

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const used = new Set([
  ...entries.filter((e) => e.module).map((e) => e.module.name),
  ...typeOwners.values(),
]);
const aliasOf = (name) => modules.find((m) => m.name === name).alias;

const lines = [];
lines.push(`// Generated by scripts/build-types.js. Do not edit by hand.`);
lines.push(`// ${pkg.name} v${pkg.version}`);
lines.push("");
for (const m of modules.filter((mod) => used.has(mod.name))) {
  lines.push(`import ${m.alias} = require("./src/${m.name}");`);
}
lines.push("");
lines.push("/**");
lines.push(` * **${pkg.name}**: ${pkg.description}`);
lines.push(" *");
lines.push(" * @example");
lines.push(' * const nc = require("@ix-xs/node-comfort");');
lines.push(' * nc.logger.info("Server ready");');
lines.push(' * nc.str.slugify("Héllo World"); // "hello-world"');
lines.push(" *");
lines.push(" * @example");
lines.push(' * import nc from "@ix-xs/node-comfort";');
lines.push(' * import { str, is } from "@ix-xs/node-comfort";');
lines.push(" */");
lines.push("declare namespace nodeComfort {");

const section = (title) => lines.push("", `  // ${title}`);

/**
 * The overview JSDoc at the top of a source file (after "use strict"), which
 * editors show when hovering `nc.str`, `nc.SQLite`...
 * @param {string} name Module name.
 * @returns {string[]} The comment lines, indented for the namespace body.
 */
const overview = (name) => {
  const source = fs.readFileSync(path.join(SRC, `${name}.js`), "utf8").replace(/\r\n/g, "\n");
  const match = /^(?:"use strict";\s*)?(\/\*\*[\s\S]*?\*\/)\n\n/.exec(source);
  if (!match) fail(`src/${name}.js must start with an overview JSDoc block (shown when hovering the namespace).`);
  return match[1].split("\n").map((line) => `  ${line.trimStart().startsWith("*") ? ` ${line.trimStart()}` : line.trimStart()}`);
};

/** @param {string} text */
const deprecatedDoc = (text) => `  /** @deprecated ${text.split("*/").join("*\\/")} */`;

section("Namespaces");
for (const e of entries.filter((x) => x.kind === "module" && !x.deprecated)) {
  lines.push(...overview(/** @type {any} */ (e.module).name));
  lines.push(`  export import ${e.key} = ${/** @type {any} */ (e.module).alias};`);
}

section("Deprecated names of node-comfort 2, removed in 4.0");
for (const e of entries.filter((x) => x.deprecated && x.kind !== "self")) {
  lines.push(deprecatedDoc(/** @type {string} */ (e.deprecated)));
  lines.push(`  export import ${e.key} = ${/** @type {any} */ (e.module).alias}${e.kind === "member" ? `.${e.member}` : ""};`);
}

section("Types");
for (const [name, owner] of [...typeOwners].sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`  export import ${name} = ${aliasOf(owner)}.${name};`);
}

section("Deprecated self references");
for (const e of entries.filter((x) => x.kind === "self")) {
  lines.push(deprecatedDoc(/** @type {string} */ (e.deprecated)));
  lines.push(`  export const ${e.key}: typeof import("./index.js");`);
}
lines.push("}");
lines.push("");
lines.push("export = nodeComfort;");
lines.push("");

fs.writeFileSync(path.join(OUT, "index.d.ts"), lines.join("\n"));

// validate result

const finalProgram = ts.createProgram([path.join(OUT, "index.d.ts")], {
  ...parsed.options,
  noEmit: true,
  allowJs: false,
  checkJs: false,
  skipLibCheck: false,
});
const finalDiagnostics = ts.getPreEmitDiagnostics(finalProgram);
if (finalDiagnostics.length) {
  console.error(finalDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  fail("The generated types/index.d.ts does not type-check.");
}

const counts = {
  namespaces: entries.filter((e) => !e.deprecated).length,
  deprecated: entries.filter((e) => e.deprecated).length,
  types: typeOwners.size,
};
console.log(
  `[build-types] OK with TypeScript ${ts.version}: ${counts.namespaces} namespaces, ` +
    `${counts.deprecated} deprecated names, ${counts.types} public types.`,
);
