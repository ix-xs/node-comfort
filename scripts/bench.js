"use strict";

// Micro-benchmarks of the paths a program calls thousands of times. They say
// what the package costs, on this machine and this version of Node.js.
//
//   node scripts/bench.js                      runs everything, prints operations per second
//   node scripts/bench.js time.                only the cases whose name contains "time."
//   node scripts/bench.js --json out.json      also writes the results
//   node scripts/bench.js --root ../other      measures another copy of the package
//   node scripts/bench.js --compare a.json b.json   compares two result files

process.env.NODE_COMFORT_DOTENV = "false";
const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);
const option = (/** @type {string} */ name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args.splice(at, 2)[1];
};

const compare = args.indexOf("--compare");
if (compare !== -1) {
  const [before, after] = [args[compare + 1], args[compare + 2]].map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
  for (const [name, a] of Object.entries(after)) {
    const b = before[name];
    if (typeof b !== "number") continue;
    const ratio = a / b;
    const tag = ratio >= 1.15 ? "faster" : ratio <= 0.87 ? "SLOWER" : "";
    console.log(`${name.padEnd(32)} ${Math.round(b).toLocaleString("en").padStart(13)} -> ${Math.round(a).toLocaleString("en").padStart(13)} ${`x${ratio.toFixed(2)}`.padStart(8)} ${tag}`);
  }
  process.exit(0);
}

const out = option("--json");
const root = path.resolve(option("--root") ?? path.join(__dirname, ".."));
const only = args[0];
const nc = require(root);

const sink = { write() {} };
const users = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `User ${i}`, role: i % 3 ? "user" : "admin", age: 20 + (i % 40), tags: ["a", "b"], profile: { city: "Paris", zip: "75000" } }));
const state = { a: { b: { c: 1, d: [1, 2, 3] } }, list: users.slice(0, 20), when: new Date(0), map: new Map([["k", 1]]) };
const s = nc.schema;
const User = s.object({
  email: s.string().trim().email(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
  tags: s.array(s.string()).max(10).default([]),
  profile: s.object({ city: s.string(), zip: s.string() }),
});
const validUser = { email: "ada@example.com", age: 30, role: "admin", tags: ["a", "b"], profile: { city: "Paris", zip: "75000" } };
const invalidUser = { email: "nope", age: 3, role: "root", tags: "x", profile: {} };
const log = nc.createLogger({ stdout: sink, stderr: sink, colors: false });
const logColor = nc.createLogger({ stdout: sink, stderr: sink, colors: true });
const logJSON = nc.createLogger({ stdout: sink, stderr: sink, format: "json", fields: { service: "api" } });
const cache = new nc.Cache({ max: 1000 });
for (let i = 0; i < 500; i++) cache.set(`k${i}`, i);
const events = new nc.Emitter();
events.on("x", () => {});
events.on("x", () => {});
const db = new nc.SQLite(":memory:");
db.createTable({ name: "users", columns: { id: { type: "INTEGER", primaryKey: true }, email: { type: "TEXT" }, role: { type: "TEXT" }, active: { type: "BOOLEAN" }, settings: { type: "JSON" } } });
db.insertMany("users", users.map((u) => ({ id: u.id, email: `${u.name}@x.io`, role: u.role, active: true, settings: { theme: "dark" } })));
const date = new Date("2026-03-14T10:05:07Z");
const memo = nc.func.memoize((a, b) => a + b);
const text = "The quick brown fox jumps over the lazy dog. ".repeat(4);
const secret = "a-secret-key-that-is-long-enough";
const token = nc.crypto.signJWT({ sub: "42" }, secret, { expiresIn: "1h" });
let counter = 0;

/** @type {Record<string, () => unknown>} */
const cases = {
  "str.slugify (ascii)": () => nc.str.slugify("Hello World, this is a title"),
  "str.slugify (accents)": () => nc.str.slugify("Héllo Wörld, ça va très bien"),
  "str.camelCase": () => nc.str.camelCase("user_first_name"),
  "str.truncate": () => nc.str.truncate(text, 40),
  "str.escapeHTML": () => nc.str.escapeHTML('<a href="x">Tom & Jerry</a>'),
  "str.template": () => nc.str.template("Hello {name}, you have {count} messages", { name: "Ada", count: 3 }),
  "str.plural": () => nc.str.plural(3, { one: "file", other: "files" }),
  "str.levenshtein": () => nc.str.levenshtein("kitten", "sitting"),
  "str.closest": () => nc.str.closest("strng", ["string", "number", "boolean", "object"]),
  "str.wrap": () => nc.str.wrap(text, 30),
  "num.round": () => nc.num.round(1.005, 2),
  "num.format": () => nc.num.format(1234567.891),
  "num.currency": () => nc.num.currency(1234.5, "EUR"),
  "num.formatBytes": () => nc.num.formatBytes(123456789),
  "arr.groupBy": () => nc.arr.groupBy(users, "role"),
  "arr.sortBy (2 keys)": () => nc.arr.sortBy(users, ["role", "age"]),
  "arr.unique (key)": () => nc.arr.unique(users, "role"),
  "obj.clone": () => nc.obj.clone(state),
  "obj.equal": () => nc.obj.equal(state, state),
  "obj.merge": () => nc.obj.merge({ a: 1, b: { c: 2 } }, { b: { d: 3 } }),
  "obj.get": () => nc.obj.get(state, "a.b.c"),
  "obj.set": () => nc.obj.set({}, "a.b.c", 1),
  "obj.diff": () => nc.obj.diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }),
  "checker.isEmail": () => nc.isEmail("ada.lovelace@example.com"),
  "checker.isUUID": () => nc.isUUID("0190b6f1-53e4-7a5e-9b7e-0f8e2a3c4d5e"),
  "checker.isURL": () => nc.isURL("https://example.com/path?q=1"),
  "checker.isIP": () => nc.isIP("192.168.1.42"),
  "schema.parse (valid)": () => User.parse(validUser),
  "schema.safeParse (invalid)": () => User.safeParse(invalidUser),
  "schema.is (invalid)": () => User.is(invalidUser),
  "time.format (numeric)": () => nc.time.format(date, "YYYY-MM-DD HH:mm:ss"),
  "time.format (names)": () => nc.time.format(date, "dddd D MMMM YYYY"),
  "time.relative": () => nc.time.relative(date, Date.parse("2026-03-14T12:00:00Z")),
  "time.formatDuration (long)": () => nc.time.formatDuration(93_784_000, { style: "long" }),
  "time.parseDuration": () => nc.time.parseDuration("1h30m"),
  "time.add (days, zone)": () => nc.time.add(date, 3, "days", { timeZone: "Europe/Paris" }),
  "time.startOf (day, zone)": () => nc.time.startOf(date, "day", { timeZone: "Europe/Paris" }),
  "id.nano": () => nc.id.nano(),
  "id.uuid": () => nc.id.uuid(),
  "id.uuidv7": () => nc.id.uuidv7(),
  "id.ulid": () => nc.id.ulid(),
  "id.code": () => nc.id.code(6),
  "color.red (root)": () => nc.color.red("x"),
  "color.red.bold": () => nc.color.red.bold("x"),
  "color.hex": () => nc.color.hex("#ff8800")("x"),
  "color.strip (plain)": () => nc.color.strip("plain text"),
  "color.width (plain)": () => nc.color.width("plain text"),
  "logger.info (plain)": () => log.info("Server listening", { port: 3000 }),
  "logger.info (colors)": () => logColor.info("Server listening", { port: 3000 }),
  "logger.info (json)": () => logJSON.info("Server listening", { port: 3000 }),
  "logger.debug (disabled)": () => log.debug("not shown"),
  "cache.get (hit)": () => cache.get("k42"),
  "cache.set": () => cache.set(`n${counter++ % 2000}`, counter),
  "emitter.emit": () => events.emit("x", 1),
  "func.memoize (2 args)": () => memo(1, 2),
  "sqlite.get (by id)": () => db.get("users", { id: 42 }),
  "sqlite.getAll (200 rows)": () => db.getAll("users"),
  "sqlite.count": () => db.count("users", { role: "admin" }),
  "sqlite.insert+delete": () => {
    db.insert("users", { id: 100_000, email: "x@x.io", role: "user", active: false, settings: {} });
    db.delete("users", { id: 100_000 });
  },
  "crypto.hash": () => nc.crypto.hash("some data to hash"),
  "crypto.hmac": () => nc.crypto.hmac("some data to sign", secret),
  "crypto.verifyJWT": () => nc.crypto.verifyJWT(token, secret),
  JSONString: () => nc.JSONString(state),
  "utils.wait parse": () => nc.time.parseDuration("250ms"),
};

/** Runs a case for about 300 ms after a warm-up, and returns operations per second. */
const measure = (/** @type {() => unknown} */ fn) => {
  for (let i = 0; i < 2000; i++) fn();
  let runs = 0;
  let batch = 64;
  const start = process.hrtime.bigint();
  let elapsed = 0n;
  while (elapsed < 300_000_000n) {
    for (let i = 0; i < batch; i++) fn();
    runs += batch;
    if (batch < 65_536) batch *= 2;
    elapsed = process.hrtime.bigint() - start;
  }
  return runs / (Number(elapsed) / 1e9);
};

/** @type {Record<string, number>} */
const results = {};
for (const [name, fn] of Object.entries(cases)) {
  if (only && !name.includes(only)) continue;
  const ops = measure(fn);
  results[name] = Math.round(ops);
  console.log(`${name.padEnd(32)} ${Math.round(ops).toLocaleString("en").padStart(14)} ops/s`);
}
console.log(`Node.js ${process.version}, ${path.relative(process.cwd(), root) || "."}`);
if (out) fs.writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
