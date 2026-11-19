"use strict";

/**
 * Checks the editor experience of the published package, exactly as a user
 * gets it after `npm install @ix-xs/node-comfort`:
 *
 * 1. every public function, namespace member, class method and error has
 *    hover documentation (JSDoc) in the editor;
 * 2. `nc.` completes every namespace, in CommonJS, ESM and TS;
 * 3. the namespaces are offered as auto-imports from the package root
 *    (never from internal files);
 * 4. a TypeScript consumer compiles, and wrong usages are rejected
 *    (type guards, dot paths, schema inference, generics...);
 * 5. the names of node-comfort 2 still compile, and every one of them is
 *    marked deprecated, so editors strike it through.
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
const { aliasesOf, peek } = require(path.join(ROOT, "src", "internal", "deprecate.js"));

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
  docProbe("nc.", key, `nc.${key}`);
  if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
  for (const member of Object.keys(value)) {
    docProbe(`nc.${key}.`, member, `nc.${key}.${member}`);
    const inner = value[member];
    // The classes of cache, emitter and sqlite: every method of their instances.
    if (["cache", "emitter", "sqlite"].includes(key) && isClass(inner)) {
      const variable = `${key}_${member}`;
      docCode += `/** @type {InstanceType<typeof nc.${key}.${member}>} */ let ${variable} = /** @type {any} */ (null);\n`;
      for (const method of Object.getOwnPropertyNames(inner.prototype)) {
        if (method === "constructor") continue;
        docProbe(`${variable}.`, method, `new nc.${key}.${member}().${method}`);
      }
    }
  }
}
docProbe("nc.assert.", "type", "nc.assert.type");
for (const style of ["red", "bold", "bgBlue", "underline", "gray"]) docProbe("nc.color.", style, `nc.color.${style}`);
for (const coerce of Object.keys(nc.schema.coerce)) docProbe("nc.schema.coerce.", coerce, `nc.schema.coerce.${coerce}`);
addFile("docs.js", docCode, docMarkers);

// completions
const topLevel = Object.keys(nc);
addFile("complete-cjs.js", `const nc = require("${P}");\nnc.${MARK}\n`, [{ name: "CJS: nc. completes every namespace", kind: "completions", expect: topLevel }]);
addFile("complete-default.mjs", `import nc from "${P}";\nnc.${MARK}\n`, [{ name: "ESM: nc. completes every namespace", kind: "completions", expect: topLevel }]);
addFile("complete-esm.mjs", `import { str } from "${P}";\nstr.${MARK}\n`, [{ name: "ESM: str. completes the string helpers", kind: "completions", expect: Object.keys(nc.str) }]);
addFile("complete-is.js", `const nc = require("${P}");\nnc.is.${MARK}\n`, [{ name: "CJS: nc.is. completes every check", kind: "completions", expect: Object.keys(nc.is) }]);
addFile("complete-ts.ts", `import nc = require("${P}");\nnc.schema.${MARK}\n`, [{ name: "TS: nc.schema. completes the builders", kind: "completions", expect: Object.keys(nc.schema) }]);
addFile("complete-options.js", `const nc = require("${P}");\nnc.http.get("https://x.dev", { ${MARK} });\n`, [{ name: "CJS: request options complete", kind: "completions", expect: ["timeout", "retry", "headers", "query", "signal"] }]);
addFile("complete-db.js", `const nc = require("${P}");\nconst db = nc.sqlite.open(":memory:");\ndb.getAll("t", { age: { ${MARK} } });\n`, [{ name: "CJS: SQLite where operators complete", kind: "completions", expect: ["gte", "in", "like", "between", "isNull"] }]);
addFile("complete-columns.ts", `import { sqlite } from "${P}";\nconst db = sqlite.open<{ id: number; email: string }>(":memory:");\ndb.getAll("users", { ${MARK} });\n`, [{ name: "TS: SQLite where suggests the row columns", kind: "completions", expect: ["id", "email", "$or", "$and"] }]);

// official subpaths, from an ES module
addFile(
  "subpaths.mts",
  `import { slugify } from "${P}/str";
import { get } from "${P}/obj";
import { email } from "${P}/is";
import assert from "${P}/assert";
import { parse } from "${P}/json";
import { set as setConfig } from "${P}/config";
import color from "${P}/color";
import SQLite from "${P}/sqlite";
import Cache from "${P}/cache";
import { ValidationError } from "${P}/errors";
import { object, string } from "${P}/schema";

const slug: string = slugify("Hello");
const city: string = get({ a: { city: "Paris" } }, "a.city");
const ok: boolean = email("a@b.co");
assert(ok, "not an email");
const parsed: { a: number } = parse('{"a":1}', { a: 0 }, { comments: true });
setConfig({ locale: "fr" });
const red: string = color.red.bold("x");
const db = new SQLite<{ id: number }>(":memory:");
const ids: number[] = db.getAll("t").map((row) => row.id);
const cache = new Cache<string, number>();
const User = object({ email: string().email() });
const error: ValidationError | undefined = undefined;
void slug; void city; void ok; void parsed; void red; void ids; void cache; void User; void error;
`,
);

// auto-imports (ESM and TS files, where editors offer them)
addFile("auto-logger.mts", `export {};\nlogg${MARK}\n`, [{ name: "auto-import the logger namespace", kind: "autoImport", expect: ["logger"] }]);
addFile("auto-schema.ts", `export {};\nschem${MARK}\n`, [{ name: "auto-import the schema namespace", kind: "autoImport", expect: ["schema"] }]);

// hover details: descriptions of options and parameters
addFile(
  "hover.js",
  `const nc = require("${P}");\nnc.str.slugify("x", { sepa${MARK}rator: "_" });\nnc.time.for${MARK}mat(new Date(), "YYYY");\nnc.sql${MARK}ite.SQL${MARK}ite;\nnc.is.ema${MARK}il("a@b.co");\n`,
  [
    { name: "hover: option description", kind: "hover", expect: ["separator"] },
    { name: "hover: function docs with example", kind: "hover", expect: ["format(", "@example", "@param"] },
    { name: "hover: namespace docs", kind: "hover", expect: ["SQLite made pleasant", "@example"] },
    { name: "hover: class docs", kind: "hover", expect: ["class SQLite", "A SQLite database connection"] },
    { name: "hover: a check of nc.is", kind: "hover", expect: ["email(", "value is string", "nc.is.email(", "@example"] },
  ],
);
addFile(
  "signature.js",
  `const nc = require("${P}");\nnc.async.retry(async () => 1, { ${MARK}});\n`,
  [{ name: "signature help: parameter docs", kind: "signature", expect: ["retry", "attempts"] }],
);

// a TypeScript consumer of the 3.0 API: it must compile, and misuses must be rejected
addFile(
  "consumer.ts",
  `import nc = require("${P}");
import { is, logger, schema as s, obj, sqlite, cache as caches, emitter, errors } from "${P}";
import type { Infer, SlugifyOptions, Where } from "${P}";

// type guards
declare const input: unknown;
if (is.string(input)) input.toUpperCase();
if (nc.is.arrayOf(input, nc.is.number)) { const n: number[] = input; void n; }
if (nc.is.null(input) || nc.is.undefined(input)) { const nothing: null | undefined = input; void nothing; }
declare const port: unknown;
nc.assert.type(port, nc.is.integer);
const portNumber: number = port;
void portNumber;
// @ts-expect-error unknown is not narrowed without a guard
input.toUpperCase();

// chainable logger
logger.info("ready").warn("careful");
const log = nc.logger.create({ scope: "api" });
log.info("up");
nc.config.set({ locale: "fr", timeZone: "Europe/Paris" });
const settings: { locale: string; timeZone: string | undefined } = nc.config.get();
const settingsJSON: string = nc.json.stringify(settings, { spaces: 2 });
const back: { locale: string } = nc.json.parse(settingsJSON, { locale: "en" }, { comments: true });
void settings; void back;

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
const cache = caches.create<string, number>({ max: 10, ttl: "5m" });
const sameCache: InstanceType<typeof caches.Cache<string, number>> = cache;
void sameCache;
cache.set("a", 1);
const hit: number | undefined = cache.get("a");
// @ts-expect-error values are numbers
cache.set("b", "x");
const events = emitter.create<{ ready: [port: number]; stop: [] }>();
class Job extends emitter.Emitter<{ done: [result: string] }> {}
new Job().on("done", (result) => { const r: string = result; void r; });
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
const db = sqlite.open<Row>(":memory:");
const between = sqlite.op.between(1, 10);
void between;
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

// one of several shapes
const Shape = s.discriminatedUnion("kind", [
  s.object({ kind: s.literal("circle"), radius: s.number() }),
  s.object({ kind: s.literal("square"), side: s.number() }),
]);
const shape = Shape.parse({});
if (shape.kind === "circle") { const radius: number = shape.radius; void radius; }
// @ts-expect-error a square has no radius
if (shape.kind === "square") void shape.radius;
const SortBy = UserSchema.keyof();
const sortBy: "email" | "age" | "role" = SortBy.parse("email");
const jsonSchema: nc.schema.JSONSchema = UserSchema.toJSONSchema();
void sortBy; void jsonSchema;

// a schema gives an http response its type
async function calls() {
  const typed = await nc.http.get("https://example.com/user", { schema: UserSchema, params: { id: 1 } });
  const email: string = typed.data.email;
  // @ts-expect-error data follows the schema
  const notThere: string = typed.data.nope;
  const explicit = await nc.http.get<{ id: number }>("https://example.com/user");
  const id: number = explicit.data.id;
  const client = nc.http.create({ baseURL: "https://example.com" });
  const posted = await client.post("users", { email: "a@x.io" }, { schema: UserSchema });
  const posteRole: "admin" | "user" = posted.data.role;
  // @ts-expect-error unknown option
  await nc.http.get("https://example.com", { timout: 5 });
  const cookies: string[] = typed.cookies;
  void email; void notThere; void id; void posteRole; void cookies;

  // new helpers
  const page = db.paginate("users", { active: true }, { page: 2 });
  const items: Row[] = page.items;
  db.increment("users", { id: 1 }, { email: "a@x.io" });
  const loadUser = nc.func.batch(async (ids: number[]) => ids.map((n) => ({ id: n })));
  const loaded: { id: number } = await loadUser(1);
  const shared = nc.func.dedupe(async (key: string) => key.length);
  const length: number = await shared("a");
  const all: number[] = await nc.async.parallel([() => 1, async () => 2], { concurrency: 2 });
  const aborted: string = await nc.async.abortable(Promise.resolve("x"), AbortSignal.timeout(10));
  const when: Date | undefined = nc.time.parse("2024-01-15", "YYYY-MM-DD");
  const days: Date[] = nc.time.range("2024-01-01", "2024-01-07", "day");
  const pair = await nc.crypto.generateKeyPair("ES256");
  const token: string = nc.crypto.signJWT({ sub: "1" }, pair.privateKey);
  const valid: boolean = nc.crypto.verifyHmac("body", "sha256=abc", "secret");
  const found: string | undefined = nc.fs.findUp("package.json");
  await nc.async.sleep("10ms", { unref: true });
  const [failure, value] = await nc.async.to(Promise.resolve(1));
  if (!failure) { const one: number = value; void one; }
  const task = nc.async.when(() => true, { reason: "x" }, { max: 1 });
  task.stop();
  const guard = nc.sys.dontCrash();
  guard.dispose();
  const port: number = await nc.sys.freePort();
  const sentence: string = nc.arr.toSentence(["a", "b"]);
  const fresh = await cache.getOrSet("a", () => 1, { staleWhileRevalidate: "1m" });
  events.on("ready", () => {}, { signal: AbortSignal.timeout(10) });
  void items; void loaded; void length; void all; void aborted; void when; void days; void token; void valid; void found; void port; void sentence; void fresh;
}
void calls;

// errors
try { nc.assert(false, "nope"); } catch (error) {
  // @ts-expect-error a string is not a type guard
  nc.assert.type(1, "string");
  if (error instanceof errors.ValidationError) error.flatten();
  if (error instanceof nc.errors.HttpError) { const status: number = error.status; void status; }
}

// options types
const options: SlugifyOptions = { separator: "_" };
nc.str.slugify("Héllo", options);
`,
);

// the same program written for node-comfort 2.2: it must still compile
addFile(
  "consumer-v2.ts",
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

// one of several shapes
const Shape = s.discriminatedUnion("kind", [
  s.object({ kind: s.literal("circle"), radius: s.number() }),
  s.object({ kind: s.literal("square"), side: s.number() }),
]);
const shape = Shape.parse({});
if (shape.kind === "circle") { const radius: number = shape.radius; void radius; }
// @ts-expect-error a square has no radius
if (shape.kind === "square") void shape.radius;
const SortBy = UserSchema.keyof();
const sortBy: "email" | "age" | "role" = SortBy.parse("email");
const jsonSchema: nc.schema.JSONSchema = UserSchema.toJSONSchema();
void sortBy; void jsonSchema;

// a schema gives an http response its type
async function calls() {
  const typed = await nc.http.get("https://example.com/user", { schema: UserSchema, params: { id: 1 } });
  const email: string = typed.data.email;
  // @ts-expect-error data follows the schema
  const notThere: string = typed.data.nope;
  const explicit = await nc.http.get<{ id: number }>("https://example.com/user");
  const id: number = explicit.data.id;
  const client = nc.http.create({ baseURL: "https://example.com" });
  const posted = await client.post("users", { email: "a@x.io" }, { schema: UserSchema });
  const posteRole: "admin" | "user" = posted.data.role;
  // @ts-expect-error unknown option
  await nc.http.get("https://example.com", { timout: 5 });
  const cookies: string[] = typed.cookies;
  void email; void notThere; void id; void posteRole; void cookies;

  // new helpers
  const page = db.paginate("users", { active: true }, { page: 2 });
  const items: Row[] = page.items;
  db.increment("users", { id: 1 }, { email: "a@x.io" });
  const loadUser = nc.func.batch(async (ids: number[]) => ids.map((n) => ({ id: n })));
  const loaded: { id: number } = await loadUser(1);
  const shared = nc.func.dedupe(async (key: string) => key.length);
  const length: number = await shared("a");
  const all: number[] = await nc.async.parallel([() => 1, async () => 2], { concurrency: 2 });
  const aborted: string = await nc.async.abortable(Promise.resolve("x"), AbortSignal.timeout(10));
  const when: Date | undefined = nc.time.parse("2024-01-15", "YYYY-MM-DD");
  const days: Date[] = nc.time.range("2024-01-01", "2024-01-07", "day");
  const pair = await nc.crypto.generateKeyPair("ES256");
  const token: string = nc.crypto.signJWT({ sub: "1" }, pair.privateKey);
  const valid: boolean = nc.crypto.verifyHmac("body", "sha256=abc", "secret");
  const found: string | undefined = nc.findUp("package.json");
  const port: number = await nc.sys.freePort();
  const sentence: string = nc.arr.toSentence(["a", "b"]);
  const fresh = await cache.getOrSet("a", () => 1, { staleWhileRevalidate: "1m" });
  events.on("ready", () => {}, { signal: AbortSignal.timeout(10) });
  void items; void loaded; void length; void all; void aborted; void when; void days; void token; void valid; void found; void port; void sentence; void fresh;
}
void calls;

// errors
try { nc.assert(false, "nope"); } catch (error) {
  if (error instanceof errors.ValidationError) error.flatten();
  if (error instanceof nc.errors.HttpError) { const status: number = error.status; void status; }
  if (error instanceof nc.http.HttpError) { const status: number = error.status; void status; }
}

// the old classes still work as types
let oldDb: nc.SQLite<Row> | undefined;
let oldCache: nc.Cache<string, number> | undefined;
let oldEvents: nc.Emitter<{ a: [] }> | undefined;
let oldHttpError: nc.http.HttpError | undefined;
void oldDb; void oldCache; void oldEvents; void oldHttpError;

// options types
const options: SlugifyOptions = { separator: "_" };
nc.str.slugify("Héllo", options);
`,
);

// deprecated names: each one must be marked, so editors strike it through
let deprecatedCode = `const nc = require("${P}");\n`;
/** @type {Array<{ name: string, kind: string }>} */
const deprecatedMarkers = [];
const deprecatedProbe = (/** @type {string} */ prefix, /** @type {string} */ name, /** @type {string} */ label) => {
  deprecatedCode += `${prefix}${MARK}${name};\n`;
  deprecatedMarkers.push({ name: `${label} is marked deprecated`, kind: "deprecated" });
};
for (const { name } of aliasesOf(nc)) deprecatedProbe("nc.", name, `nc.${name}`);
// nc.http.HttpError stays the class itself, so it still works as a type: TypeScript
// can't mark a class alias of a JavaScript module deprecated without losing that.
const TYPE_KEPT = ["http.HttpError"];
for (const key of Object.keys(nc)) {
  for (const { name } of aliasesOf(nc[key])) {
    if (!TYPE_KEPT.includes(`${key}.${name}`)) deprecatedProbe(`nc.${key}.`, name, `nc.${key}.${name}`);
  }
}
// the members of the deprecated namespaces too
for (const key of ["checker", "utils"]) {
  for (const { name } of aliasesOf(peek(nc, key))) deprecatedProbe(`nc.${key}.`, name, `nc.${key}.${name}`);
}
addFile("deprecated.js", deprecatedCode, deprecatedMarkers);
addFile(
  "deprecated-imports.ts",
  `import { ${MARK}info, ${MARK}isEmail, ${MARK}SQLite, ${MARK}nc } from "${P}";\nvoid info; void isEmail; void SQLite; void nc;\n`,
  ["info", "isEmail", "SQLite", "nc"].map((name) => ({ name: `import { ${name} } is marked deprecated`, kind: "deprecated" })),
);

// the old names of members of what the library returns
addFile(
  "deprecated-members.ts",
  `import nc = require("${P}");
const queue = nc.async.queue();
void queue.${MARK}size; void queue.${MARK}pending;
nc.async.limit(1).${MARK}clearQueue();
nc.sqlite.open(":memory:").${MARK}set("t", { id: 1 });
`,
  ["queue.size", "queue.pending", "limiter.clearQueue", "db.set"].map((name) => ({ name: `${name} is marked deprecated`, kind: "deprecated" })),
);

// the 3.0 polish: counters, overloads, guards, factories
addFile(
  "polish.ts",
  `import nc = require("${P}");
const users = [{ id: 1, name: "a", active: true }];
const byId: Map<number, { id: number; name: string; active: boolean }> = nc.arr.toMap(users, "id");
const names: Map<string, number> = nc.arr.toMap(users, (u) => u.name, (u) => u.id);
const active: number = nc.arr.count(users, "active");
const [on, off] = nc.arr.partition(users, "active");
nc.arr.paginate(users, { page: 2, perPage: 10 });
const small: number = nc.num.factorial(5);
const big: bigint = nc.num.factorial(25, true);
// @ts-expect-error a bigint is not a number
const wrong: number = nc.num.factorial(25, true);
const watch = nc.time.stopwatch();
const ms: number = watch.stop();
const text: string = watch.stop(true);
const input: unknown = "8080";
if (nc.is.port(input)) { const port: number | string = input; void port; }
const queue = nc.async.queue();
const counts: number = queue.activeCount + queue.pendingCount;
const limiter = nc.async.limit(2);
limiter.clear();
const rate = nc.async.rateLimit(10, "1s");
const busy: number = rate.activeCount + rate.pendingCount;
rate.clear();
const db = nc.sqlite.SQLite.open<{ id: number }>(":memory:");
const id: number | undefined = db.get("t")?.id;
const cache = nc.cache.Cache.create<string, number>().clear();
const events = nc.emitter.Emitter.create<{ ready: [port: number] }>();
events.emit("ready", 3000);
// @ts-expect-error the port is a number
events.emit("ready", "3000");
const job = nc.time.every("1m", () => {}, { signal: AbortSignal.timeout(10) }).stop();
nc.async.when(() => true, {}, { timeout: false }).off("trigger", () => {}).stop();
nc.crypto.totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", { algorithm: "sha256" });
nc.color.create({ level: 0 });
const shout: (s: string) => string = nc.func.compose((s: string) => s + "!", (s: string) => s.toUpperCase());
const chain: (n: number) => Promise<string> = nc.func.pipeAsync(async (n: number) => n * 2, (n) => String(n));
const flag: boolean = nc.env.boolean("FLAG", { default: false });
void byId; void names; void active; void on; void off; void small; void big; void wrong; void ms; void text; void counts; void busy; void id; void cache; void job; void shout; void chain; void flag;
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
    const internal = fromPackage.filter((e) => {
      const source = norm(/** @type {string} */ (e.source));
      return /\/(src|types)\//.test(source) || /\.(d\.ts|js)$/.test(source);
    });
    const offered = fromPackage.map((e) => e.name);
    const missing = (probe.expect ?? []).filter((n) => !offered.includes(n));
    check(!missing.length && !internal.length, probe.name, missing.length ? `not offered: ${missing.join(", ")}` : `internal paths offered: ${internal.map((e) => e.source).join(", ")}`);
  } else if (probe.kind === "deprecated") {
    const marked = service.getSuggestionDiagnostics(probe.file).some((d) => d.reportsDeprecated && d.start !== undefined && d.start <= probe.pos && probe.pos <= d.start + (d.length ?? 0));
    check(marked, probe.name, "no deprecation reported at this position");
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
