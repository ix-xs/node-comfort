"use strict";

/**
 * Checks the editor experience of the published package, exactly as a user
 * gets it after `npm install @ix-xs/node-comfort`:
 *
 * 1. every public function, namespace member, class method and error has
 *    hover documentation (JSDoc) in the editor;
 * 2. `nc.` / `nodeComfort.` complete every export, in CommonJS, ESM and TS;
 * 3. `nc`, `nodeComfort` and the flat helpers are offered as auto-imports
 *    from the package root (never from internal files);
 * 4. a TypeScript consumer compiles, and wrong usages are rejected
 *    (type guards, dot paths, schema inference, generics...).
 *
 * It drives the TypeScript language service, which is what VS Code, WebStorm
 * and most editors use for JavaScript too. Run `npm run build` first.
 *
 * TypeScript 7+ (native compiler, no JavaScript API) is supported in
 * "compile only" mode: the consumer files are type-checked with its `tsc`.
 *
 * Usage: node scripts/check-types.js [--ts <path to a typescript package>] [--verbose]
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const tsIndex = argv.indexOf("--ts");
const verbose = argv.includes("--verbose");
const tsDir = tsIndex >= 0 ? path.resolve(argv[tsIndex + 1]) : path.dirname(require.resolve("typescript/package.json"));
/** @type {any} */
let ts;
try {
  ts = require(tsDir);
} catch {
  ts = undefined; // native TypeScript: compile-only mode
}
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const nc = require(ROOT);

if (!fs.existsSync(path.join(ROOT, "types", "index.d.ts"))) {
  console.error("[check-types] types/index.d.ts is missing: run `npm run build` first.");
  process.exit(1);
}

// install into a consumer

const consumer = fs.mkdtempSync(path.join(os.tmpdir(), "nc-types-"));
const installed = path.join(consumer, "node_modules", ...pkg.name.split("/"));
fs.mkdirSync(installed, { recursive: true });
for (const entry of ["package.json", ...pkg.files]) {
  const from = path.join(ROOT, entry);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(installed, entry), { recursive: true });
}
for (const dependency of ["@types/node", "undici-types"]) {
  const from = path.join(ROOT, "node_modules", dependency);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(consumer, "node_modules", dependency), { recursive: true });
}
// editors only offer auto-imports from packages listed in package.json
fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "consumer", private: true, dependencies: { [pkg.name]: pkg.version } }));

// test sources

const P = pkg.name;
const MARK = "/*|*/";
/** @type {Map<string, string>} */
const files = new Map();
/** @type {Array<{ name: string, file: string, pos: number, kind: string, expect?: string[] }>} */
const probes = [];
const norm = (/** @type {string} */ f) => f.split("\\").join("/");

/**
 * Adds a source file; every `/*|*\/` marker becomes a probe position.
 * @param {string} name
 * @param {string} code
 * @param {Array<{ name: string, kind: string, expect?: string[] }>} [markers]
 */
const addFile = (name, code, markers = []) => {
  const file = norm(path.join(consumer, name));
  let text = "";
  const parts = code.split(MARK);
  parts.forEach((part, i) => {
    text += part;
    if (i < parts.length - 1) {
      const marker = markers[i];
      if (!marker) throw new Error(`Missing marker description ${i} in ${name}`);
      probes.push({ ...marker, file, pos: text.length });
    }
  });
  files.set(file, text);
};

// documentation coverage: every runtime member of every namespace and class
const isClass = (/** @type {unknown} */ v) => typeof v === "function" && /^class\b/.test(Function.prototype.toString.call(v));
let docCode = `const nc = require("${P}");\n`;
/** @type {Array<{ name: string, kind: string }>} */
const docMarkers = [];
const docProbe = (/** @type {string} */ prefix, /** @type {string} */ member, /** @type {string} */ label) => {
  docCode += `${prefix}${MARK}${member};\n`;
  docMarkers.push({ name: label, kind: "docs" });
};
for (const [key, value] of Object.entries(nc)) {
  if (key === "nc" || key === "nodeComfort") continue;
  docProbe("nc.", key, `nc.${key}`);
  if (isClass(value)) {
    docCode += `/** @type {InstanceType<typeof nc.${key}>} */ let ${key}_i = /** @type {any} */ (null);\n`;
    for (const member of Object.getOwnPropertyNames(value.prototype)) {
      if (member === "constructor") continue;
      docProbe(`${key}_i.`, member, `new nc.${key}().${member}`);
    }
  } else if (value && typeof value === "object") {
    for (const member of Object.keys(value)) docProbe(`nc.${key}.`, member, `nc.${key}.${member}`);
  }
}
for (const style of ["red", "bold", "bgBlue", "underline", "gray"]) docProbe("nc.color.", style, `nc.color.${style}`);
for (const coerce of Object.keys(nc.schema.coerce)) docProbe("nc.schema.coerce.", coerce, `nc.schema.coerce.${coerce}`);
addFile("docs.js", docCode, docMarkers);

// completions
const topLevel = Object.keys(nc);
addFile("complete-cjs.js", `const nc = require("${P}");\nnc.${MARK}\n`, [{ name: "CJS: nc. completes every export", kind: "completions", expect: topLevel }]);
addFile("complete-alias.js", `const { nodeComfort } = require("${P}");\nnodeComfort.${MARK}\n`, [{ name: "CJS: nodeComfort. completes every export", kind: "completions", expect: topLevel }]);
addFile("complete-esm.mjs", `import { nc } from "${P}";\nnc.str.${MARK}\n`, [{ name: "ESM: nc.str. completes the string helpers", kind: "completions", expect: Object.keys(nc.str) }]);
addFile("complete-ts.ts", `import nc = require("${P}");\nnc.schema.${MARK}\n`, [{ name: "TS: nc.schema. completes the builders", kind: "completions", expect: Object.keys(nc.schema) }]);
addFile("complete-options.js", `const nc = require("${P}");\nnc.http.get("https://x.dev", { ${MARK} });\n`, [{ name: "CJS: request options complete", kind: "completions", expect: ["timeout", "retry", "headers", "query", "signal"] }]);
addFile("complete-db.js", `const nc = require("${P}");\nconst db = new nc.SQLite(":memory:");\ndb.getAll("t", { age: { ${MARK} } });\n`, [{ name: "CJS: SQLite where operators complete", kind: "completions", expect: ["gte", "in", "like", "between", "isNull"] }]);
addFile("complete-columns.ts", `import { SQLite } from "${P}";\nconst db = new SQLite<{ id: number; email: string }>(":memory:");\ndb.getAll("users", { ${MARK} });\n`, [{ name: "TS: SQLite where suggests the row columns", kind: "completions", expect: ["id", "email", "$or", "$and"] }]);

// official subpaths, from an ES module
addFile(
  "subpaths.mts",
  `import { slugify } from "${P}/str";
import { get } from "${P}/obj";
import { isEmail } from "${P}/checker";
import color from "${P}/color";
import SQLite from "${P}/sqlite";
import Cache from "${P}/cache";
import { ValidationError } from "${P}/errors";
import { object, string } from "${P}/schema";

const slug: string = slugify("Hello");
const city: string = get({ a: { city: "Paris" } }, "a.city");
const ok: boolean = isEmail("a@b.co");
const red: string = color.red.bold("x");
const db = new SQLite<{ id: number }>(":memory:");
const ids: number[] = db.getAll("t").map((row) => row.id);
const cache = new Cache<string, number>();
const User = object({ email: string().email() });
const error: ValidationError | undefined = undefined;
void slug; void city; void ok; void red; void ids; void cache; void User; void error;
`,
);

// auto-imports (ESM and TS files, where editors offer them)
addFile("auto-nc.mts", `export {};\nnc${MARK}\n`, [{ name: "auto-import nc", kind: "autoImport", expect: ["nc"] }]);
addFile("auto-nodecomfort.mts", `export {};\nnodeComf${MARK}\n`, [{ name: "auto-import nodeComfort", kind: "autoImport", expect: ["nodeComfort"] }]);
addFile("auto-flat.ts", `export {};\nisEma${MARK}\n`, [{ name: "auto-import flat helper isEmail", kind: "autoImport", expect: ["isEmail"] }]);

// hover details: descriptions of options and parameters
addFile(
  "hover.js",
  `const nc = require("${P}");\nnc.str.slugify("x", { sepa${MARK}rator: "_" });\nnc.time.for${MARK}mat(new Date(), "YYYY");\nnc.SQL${MARK}ite;\n`,
  [
    { name: "hover: option description", kind: "hover", expect: ["separator"] },
    { name: "hover: function docs with example", kind: "hover", expect: ["format(", "@example", "@param"] },
    { name: "hover: class docs", kind: "hover", expect: ["class nodeComfort.SQLite", "SQLite made pleasant", "@example"] },
  ],
);
addFile(
  "signature.js",
  `const nc = require("${P}");\nnc.func.retry(async () => 1, { ${MARK}});\n`,
  [{ name: "signature help: parameter docs", kind: "signature", expect: ["retry", "attempts"] }],
);

// a TypeScript consumer: it must compile, and misuses must be rejected
addFile(
  "consumer.ts",
  `import nc = require("${P}");
import { isString, info, schema as s, obj, SQLite, Cache, Emitter, errors } from "${P}";
import type { Infer, SlugifyOptions, Where } from "${P}";

// type guards
declare const input: unknown;
if (isString(input)) input.toUpperCase();
if (nc.isArrayOf(input, nc.isNumber)) { const n: number[] = input; void n; }
// @ts-expect-error unknown is not narrowed without a guard
input.toUpperCase();

// chainable logger
info("ready").warn("careful");

// dot paths
type User = { id: number; profile: { name: string; address?: { city: string } }; tags: string[] };
declare const user: User;
const name: string = obj.get(user, "profile.name");
const city: string | undefined = obj.get(user, "profile.address.city");
const cityOr: string = obj.get(user, "profile.address.city", "Paris");
// @ts-expect-error the resolved value is a string
const wrong: number = obj.get(user, "profile.name");
// @ts-expect-error unknown key
obj.pick(user, ["nope"]);
void name; void city; void cityOr; void wrong;

// schema inference
const UserSchema = s.object({
  email: s.string().email(),
  age: s.number().int().optional(),
  role: s.enum(["admin", "user"]).default("user"),
});
type UserInput = Infer<typeof UserSchema>;
const parsed: UserInput = UserSchema.parse({});
const role: "admin" | "user" = parsed.role;
// @ts-expect-error role is a union of literals
const badRole: UserInput = { email: "a", role: "root" };
void role; void badRole;

// generics
const cache = new Cache<string, number>({ max: 10, ttl: "5m" });
cache.set("a", 1);
const hit: number | undefined = cache.get("a");
// @ts-expect-error values are numbers
cache.set("b", "x");
const events = new Emitter<{ ready: [port: number]; stop: [] }>();
events.on("ready", (port) => { const p: number = port; void p; });
events.emit("ready", 3000);
events.emit("stop");
void events.emitAsync("ready", 8080);
// @ts-expect-error unknown event
events.emit("nope");
// @ts-expect-error missing argument
events.emit("ready");

// rest parameters keep their tuple types
const add = nc.func.partial((a: number, b: number) => a + b, 1);
const three: number = add(2);
void nc.func.delay((a: number, b: string) => a + b.length, 10, 1, "x");
// @ts-expect-error second argument must be a string
void nc.func.delay((a: number, b: string) => a + b.length, 10, 1, 2);
void three;
// @ts-expect-error wrong argument type
events.emit("ready", "3000");
void hit;

// SQLite
type Row = { id: number; email: string; active: boolean };
const db = new SQLite<Row>(":memory:");
const where: Where = { active: true, id: { gte: 1 }, $or: [{ email: { like: "%@x.io" } }] };
const rows: Row[] = db.getAll("users", where, { orderBy: [["id", "DESC"]], limit: 10 });
const one: Row | undefined = db.get("users");
db.insert("users", { email: "a@x.io" });
// @ts-expect-error unknown direction
db.getAll("users", {}, { orderBy: "id", direction: "sideways" });
// @ts-expect-error typo in a column name
db.getAll("users", { emial: "a@x.io" });
void rows; void one;

// types through the namespace
const Point = nc.schema.object({ x: s.number(), y: s.number() });
const point: nc.schema.Infer<typeof Point> = { x: 1, y: 2 };
// @ts-expect-error y is missing
const badPoint: nc.schema.Infer<typeof Point> = { x: 1 };
void point; void badPoint;

// errors
try { nc.assert(false, "nope"); } catch (error) {
  if (error instanceof errors.ValidationError) error.flatten();
  if (error instanceof nc.errors.HttpError) { const status: number = error.status; void status; }
}

// options types
const options: SlugifyOptions = { separator: "_" };
nc.str.slugify("Héllo", options);
`,
);

// run

const completionFiles = new Set(probes.filter((p) => p.kind === "completions" || p.kind === "autoImport").map((p) => p.file));

if (!ts) {
  // Native TypeScript (7+): no language service API, type-check with its CLI.
  const tsc = path.join(tsDir, "bin", "tsc");
  if (!fs.existsSync(tsc)) {
    console.error(`[check-types] ${tsDir} is neither a TypeScript package with a JavaScript API nor one with bin/tsc.`);
    process.exit(1);
  }
  const compiled = [...files.keys()].filter((f) => !completionFiles.has(f));
  for (const file of compiled) fs.writeFileSync(file, /** @type {string} */ (files.get(file)));
  fs.writeFileSync(
    path.join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { allowJs: true, checkJs: true, strict: true, noEmit: true, module: "nodenext", moduleResolution: "nodenext", target: "es2022", lib: ["es2023", "esnext.disposable"], types: ["node"] },
      files: compiled.map((f) => path.basename(f)),
    }),
  );
  const version = JSON.parse(fs.readFileSync(path.join(tsDir, "package.json"), "utf8")).version;
  const result = spawnSync(process.execPath, [tsc, "-p", consumer], { encoding: "utf8" });
  fs.rmSync(consumer, { recursive: true, force: true });
  if (result.status !== 0) {
    console.error(`[check-types] TypeScript ${version} (compile only) failed:\n${result.stdout}${result.stderr}`);
    process.exit(1);
  }
  console.log(`[check-types] OK with TypeScript ${version} (compile only): ${compiled.length} consumer files type-check.`);
  process.exit(0);
}

const options = {
  allowJs: true,
  checkJs: true,
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2023.d.ts", "lib.esnext.disposable.d.ts"],
  types: ["node"],
};
const host = {
  getScriptFileNames: () => [...files.keys()],
  getScriptVersion: () => "1",
  getScriptSnapshot: (/** @type {string} */ f) => {
    const text = files.get(norm(f)) ?? (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  },
  getCurrentDirectory: () => norm(consumer),
  getCompilationSettings: () => options,
  getDefaultLibFileName: (/** @type {any} */ o) => ts.getDefaultLibFilePath(o),
  fileExists: (/** @type {string} */ f) => files.has(norm(f)) || fs.existsSync(f),
  readFile: (/** @type {string} */ f) => files.get(norm(f)) ?? (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined),
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
  realpath: ts.sys.realpath,
  useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
};
const service = ts.createLanguageService(host, ts.createDocumentRegistry());
const prefs = { includeCompletionsForModuleExports: true, includeCompletionsWithInsertText: true, allowIncompleteCompletions: true };
const text = (/** @type {any[] | undefined} */ parts) => (parts ?? []).map((p) => p.text).join("");

/** @type {string[]} */
const failures = [];
let passed = 0;
const check = (/** @type {boolean} */ ok, /** @type {string} */ name, /** @type {string} */ detail = "") => {
  if (ok) {
    passed++;
    if (verbose) console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? `\n       ${detail.replace(/\n/g, "\n       ")}` : ""}`);
  }
};

// diagnostics: every file must compile (unused @ts-expect-error are errors too)
for (const file of files.keys()) {
  if (completionFiles.has(file)) continue;
  const diagnostics = [...service.getSyntacticDiagnostics(file), ...service.getSemanticDiagnostics(file)];
  check(
    diagnostics.length === 0,
    `${path.basename(file)} compiles`,
    diagnostics.map((d) => `line ${d.start === undefined ? "?" : d.file?.getLineAndCharacterOfPosition(d.start).line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`).join("\n"),
  );
}

for (const probe of probes) {
  if (probe.kind === "docs" || probe.kind === "hover") {
    const info = service.getQuickInfoAtPosition(probe.file, probe.pos);
    const docs = text(info?.documentation);
    const all = `${text(info?.displayParts)}\n${docs}\n${(info?.tags ?? []).map((t) => `@${t.name} ${text(t.text)}`).join("\n")}`;
    if (probe.kind === "docs") check(docs.trim().length >= 4, `${probe.name} has documentation`, info ? `hover shows: ${text(info.displayParts).slice(0, 160)}` : "no hover information");
    else {
      const missing = (probe.expect ?? []).filter((needle) => !all.includes(needle));
      check(!missing.length, probe.name, `missing ${JSON.stringify(missing)} in:\n${all}`);
    }
  } else if (probe.kind === "completions") {
    const res = service.getCompletionsAtPosition(probe.file, probe.pos, prefs);
    const names = new Set((res?.entries ?? []).map((e) => e.name));
    const missing = (probe.expect ?? []).filter((n) => !names.has(n));
    check(!missing.length, probe.name, `missing: ${missing.join(", ")}`);
  } else if (probe.kind === "autoImport") {
    const res = service.getCompletionsAtPosition(probe.file, probe.pos, prefs);
    const fromPackage = (res?.entries ?? []).filter((e) => e.source && norm(e.source).includes(P));
    // the root and the official subpaths (".../str") are fine, file paths are not
    const internal = fromPackage.filter((e) => /\/(src|types)\/|\.(d\.ts|js)$/.test(norm(/** @type {string} */ (e.source))));
    const offered = fromPackage.map((e) => e.name);
    const missing = (probe.expect ?? []).filter((n) => !offered.includes(n));
    check(!missing.length && !internal.length, probe.name, missing.length ? `not offered: ${missing.join(", ")}` : `internal paths offered: ${internal.map((e) => e.source).join(", ")}`);
  } else if (probe.kind === "signature") {
    const help = service.getSignatureHelpItems(probe.file, probe.pos, {});
    const item = help?.items[help.selectedItemIndex];
    const all = item ? `${text(item.prefixDisplayParts)}${item.parameters.map((p) => text(p.displayParts)).join(", ")}${text(item.suffixDisplayParts)}\n${text(item.documentation)}\n${item.parameters.map((p) => text(p.documentation)).join("\n")}` : "";
    const missing = (probe.expect ?? []).filter((needle) => !all.includes(needle));
    check(!missing.length, probe.name, `missing ${JSON.stringify(missing)} in:\n${all}`);
  }
}

fs.rmSync(consumer, { recursive: true, force: true });

if (failures.length) {
  console.error(`[check-types] TypeScript ${ts.version}: ${failures.length} failure(s), ${passed} passed\n`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log(`[check-types] OK with TypeScript ${ts.version}: ${passed} editor checks passed.`);
