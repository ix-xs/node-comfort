"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const nc = require("..");

const { color, cli } = nc;
const ESC = "\u001b";

/** Collects what a logger writes. */
const sink = () => {
  const lines = [];
  return { lines, stream: { write: (text) => lines.push(...text.replace(/\n$/, "").split("\n")) } };
};

describe("color", () => {
  it("chains styles and downgrades colors by level", () => {
    const c3 = color.create(3);
    assert.equal(c3.red.bold("x"), `${ESC}[31m${ESC}[1mx${ESC}[22m${ESC}[39m`);
    assert.equal(c3.hex("#ff8800")("x"), `${ESC}[38;2;255;136;0mx${ESC}[39m`);
    assert.equal(color.create(2).hex("#ff8800")("x"), `${ESC}[38;5;214mx${ESC}[39m`);
    assert.equal(color.create(1).hex("#ff8800")("x"), `${ESC}[93mx${ESC}[39m`);
    assert.equal(c3.bgRgb(1, 2, 3)("x"), `${ESC}[48;2;1;2;3mx${ESC}[49m`);
    assert.equal(c3.ansi256(200)("x"), `${ESC}[38;5;200mx${ESC}[39m`);
    assert.equal(color.create(0).red.bold("x"), "x");
    assert.equal(c3.red(""), "");
    assert.equal(c3.red("a", "b"), `${ESC}[31ma b${ESC}[39m`);
  });

  it("keeps outer styles after nested ones and across new lines", () => {
    const c3 = color.create(3);
    assert.equal(c3.red(`a ${c3.blue("b")} c`), `${ESC}[31ma ${ESC}[34mb${ESC}[39m${ESC}[31m c${ESC}[39m`);
    assert.equal(c3.bgBlue("a\nb"), `${ESC}[44ma${ESC}[49m\n${ESC}[44mb${ESC}[49m`);
  });

  it("strip, width, link, gradient, level", () => {
    const c3 = color.create(3);
    assert.equal(color.strip(c3.bgBlue.white.underline("hello")), "hello");
    assert.equal(color.width(c3.red("日本😀a")), 7);
    assert.equal(color.width("abc"), 3);
    assert.equal(color.width("é"), 1);
    assert.equal(color.create(0).link("docs", "https://x.io"), "docs (https://x.io)");
    assert.equal(color.strip(c3.gradient("hello", ["#ff0000", "#0000ff"])), "hello");
    assert.throws(() => c3.hex("nope"), TypeError);
    const c = color.create(3);
    c.level = 0;
    assert.equal(c.enabled, false);
    assert.equal(c.red("x"), "x");
  });

  it("detect honours NO_COLOR and FORCE_COLOR", () => {
    const saved = { NO_COLOR: process.env.NO_COLOR, FORCE_COLOR: process.env.FORCE_COLOR };
    try {
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = "3";
      assert.equal(color.detect({ isTTY: false }), 3);
      process.env.NO_COLOR = "1";
      assert.equal(color.detect({ isTTY: true }), 0);
      delete process.env.NO_COLOR;
      process.env.FORCE_COLOR = "0";
      assert.equal(color.detect({ isTTY: true }), 0);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe("logger", () => {
  it("prints badges, markup, groups and routes streams", () => {
    const out = sink();
    const err = sink();
    const log = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, stderr: err.stream });
    log.log("<% red bold Error:%> disk full").info("hello").success("ok").warn("careful").error("bad");
    log.group("Startup").log("inside").group("Nested").log("deep").groupEnd().groupEnd().log("outside");
    assert.deepEqual(out.lines, ["Error: disk full", "ℹ INFO hello", "✔ OK ok", "▼ Startup", "  inside", "  ▼ Nested", "    deep", "outside"]);
    assert.deepEqual(err.lines, ["⚠ WARN careful", "✖ ERROR bad"]);
  });

  it("renders colors when forced", () => {
    const out = sink();
    nc.createLogger({ timestamp: false, colors: true, stdout: out.stream }).log("<% red x %>");
    assert.ok(out.lines[0].includes(`${ESC}[31mx`));
  });

  it("filters by level", () => {
    const out = sink();
    const log = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, stderr: out.stream, level: "warn" });
    log.debug("d").info("i").warn("w");
    assert.deepEqual(out.lines, ["⚠ WARN w"]);
    log.setLevel("trace").trace("t");
    assert.equal(out.lines.at(-1), "… TRACE t");
    assert.equal(log.isLevelEnabled("debug"), true);
    log.setLevel("silent").fatal("nothing");
    assert.equal(out.lines.at(-1), "… TRACE t");
    assert.throws(() => log.setLevel("loud"), RangeError);
  });

  it("formats objects, errors with causes, and multi-line messages", () => {
    const out = sink();
    const log = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, stderr: out.stream });
    const circular = { a: 1 };
    circular.self = circular;
    log.log({ a: 1 }).log(circular).log(new Map([["k", 1]])).log(10n);
    assert.deepEqual(out.lines.slice(0, 3), ["{", '  "a": 1', "}"]);
    assert.ok(out.lines.some((l) => l.includes("[Circular *1]")));
    assert.ok(out.lines.some((l) => l.includes("Map(1)")));
    log.error(new Error("boom", { cause: new Error("root cause") }));
    assert.ok(out.lines.some((l) => l.startsWith("✖ ERROR Error: boom")));
    assert.ok(out.lines.some((l) => l === "Caused by: Error: root cause"));
  });

  it("timestamps, scopes, children and custom delimiters", () => {
    const out = sink();
    const log = nc.createLogger({ colors: false, stdout: out.stream, scope: "api", timestamp: "YYYY" });
    log.info("x");
    assert.match(out.lines[0], /^\[\d{4}\] \[api\] ℹ INFO x$/);
    log.child("db").log("y");
    assert.match(out.lines[1], /\[api:db\] y$/);
    log.configure({ timestamp: false, delimiter: { open: "{{", close: "}}" } }).log("{{red hi}}");
    assert.equal(out.lines[2], "[api] hi");
  });

  it("JSON format for log collectors", () => {
    const out = sink();
    const log = nc.createLogger({ format: "json", stdout: out.stream, stderr: out.stream, fields: { service: "billing" } });
    log.info("user created", { userId: 42 });
    log.error("charge failed", new Error("declined"));
    const first = JSON.parse(out.lines[0]);
    assert.equal(first.level, "info");
    assert.equal(first.msg, "user created");
    assert.equal(first.userId, 42);
    assert.equal(first.service, "billing");
    const second = JSON.parse(out.lines[1]);
    assert.equal(second.err.message, "declined");
  });

  it("child loggers add their fields to the parent's", () => {
    const out = sink();
    const log = nc.createLogger({ format: "json", stdout: out.stream, fields: { service: "billing" } });
    log.child("request", { fields: { requestId: "a1" } }).info("hi");
    log.info("parent");
    const child = JSON.parse(out.lines[0]);
    assert.equal(child.service, "billing");
    assert.equal(child.requestId, "a1");
    assert.equal(child.scope, "request");
    assert.equal(JSON.parse(out.lines[1]).requestId, undefined);
  });

  it("writes to a file without colors, with rotation", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-log-"));
    try {
      const file = path.join(dir, "logs", "app.log");
      const log = nc.createLogger({ timestamp: false, colors: true, stdout: { write() {} }, file: { path: file, maxSize: 60, maxFiles: 2 } });
      for (let i = 0; i < 10; i++) log.info(`line number ${i}`);
      const content = fs.readFileSync(file, "utf8");
      assert.ok(!content.includes(ESC), "no ANSI codes in files");
      assert.ok(fs.existsSync(`${file}.1`));
      assert.ok(fs.existsSync(`${file}.2`));
      assert.ok(!fs.existsSync(`${file}.3`));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("timers, tables, boxes and dividers", () => {
    const out = sink();
    const log = nc.createLogger({ timestamp: false, colors: false, stdout: out.stream, stderr: out.stream });
    log.timeStart("t").timeEnd("t");
    assert.match(out.lines[0], /^t: [\d.]+ms$/);
    log.timeEnd("missing");
    assert.match(out.lines[1], /does not exist/);
    log.table([{ a: 1 }]).box("hi").divider("Title");
    assert.ok(out.lines.includes("│ a │"));
    assert.ok(out.lines.some((l) => l.includes("hi")));
    assert.ok(out.lines.at(-1).startsWith("── Title "));
  });

  it("the default logger API is chainable and backward compatible", () => {
    assert.equal(typeof nc.setTimestamp, "function");
    assert.equal(typeof nc.setDelimiter, "function");
    assert.equal(nc.getLevel(), process.env.DEBUG || process.env.NODE_DEBUG ? "debug" : "info");
    assert.equal(nc.setLevel("silent").info("muted"), nc.logger);
    nc.setLevel("info");
  });
});

describe("cli: rendering", () => {
  it("table", () => {
    const text = cli.table([{ name: "Ada", logins: 42 }, { name: "Bob 😀", logins: 7 }], { colors: false });
    assert.equal(text, [
      "╭────────┬────────╮",
      "│ name   │ logins │",
      "├────────┼────────┤",
      "│ Ada    │     42 │",
      "│ Bob 😀 │      7 │",
      "╰────────┴────────╯",
    ].join("\n"));
    assert.equal(cli.table([{ a: 1, b: "x|y" }], { border: "markdown" }), "|   a | b    |\n| --: | ---- |\n|   1 | x\\|y |");
    const custom = cli.table([{ a: "long value" }], { columns: [{ key: "a", header: "A", maxWidth: 5 }], border: "ascii", colors: false });
    assert.ok(custom.includes("long…"));
    assert.ok(cli.table([[1, 2], [3, 4]], { colors: false }).includes("│ 1 │ 2 │"));
  });

  it("box", () => {
    assert.equal(cli.box("hi", { colors: false }), "╭──────╮\n│  hi  │\n╰──────╯");
    const titled = cli.box("Server ready", { title: "app", colors: false, align: "center", padding: { x: 1, y: 1 } });
    assert.ok(titled.startsWith("╭─ app "));
    assert.equal(titled.split("\n").length, 5);
  });
});

describe("cli: args", () => {
  const schema = {
    port: { type: "number", short: "p", default: 3000, description: "Port" },
    verbose: { type: "boolean", short: "v" },
    tag: { type: "string", multiple: true },
    env: { type: "string", choices: ["dev", "prod"], default: "dev" },
  };

  it("parses and types flags", () => {
    const { flags, positionals } = cli.args(schema, { argv: ["--port", "8080", "-v", "--tag", "a", "--tag", "b", "src/"] });
    assert.deepEqual(flags, { port: 8080, verbose: true, tag: ["a", "b"], env: "dev" });
    assert.deepEqual(positionals, ["src/"]);
    assert.deepEqual(cli.args(schema, { argv: [] }).flags, { port: 3000, verbose: false, tag: [], env: "dev" });
    assert.equal(cli.args({ color: { type: "boolean", default: true } }, { argv: ["--no-color"] }).flags.color, false);
  });

  it("reports errors with suggestions", () => {
    assert.throws(() => cli.args(schema, { argv: ["--verbos"] }), /Unknown option --verbos\. Did you mean --verbose\?/);
    assert.throws(() => cli.args(schema, { argv: ["--port", "abc"] }), /expects a number/);
    assert.throws(() => cli.args(schema, { argv: ["--env", "staging"] }), /must be one of: dev, prod/);
    assert.throws(() => cli.args({ token: { type: "string", required: true } }, { argv: [] }), /Missing required option --token/);
  });

  it("generates help", () => {
    const help = cli.args(schema, { argv: [], name: "server", description: "Start it", version: "1.0.0" }).help();
    assert.ok(help.includes("Usage: server [options]"));
    assert.ok(help.includes("-p, --port <number>"));
    assert.ok(help.includes("[default: 3000]"));
    assert.ok(help.includes("--version"));
  });
});

describe("cli: prompts (non-interactive streams)", () => {
  const io = (answers) => {
    const input = new PassThrough();
    const output = new PassThrough();
    output.resume();
    let written = "";
    output.on("data", (d) => (written += d));
    setImmediate(() => input.write(answers.map((a) => `${a}\n`).join("")));
    return { input, output, written: () => written };
  };

  it("prompt with default and validation", async () => {
    let s = io([""]);
    assert.equal(await cli.prompt("Name?", { default: "app", input: s.input, output: s.output }), "app");
    s = io(["abc", "42"]);
    const age = await cli.prompt("Age?", { input: s.input, output: s.output, validate: (a) => /^\d+$/.test(a) || "Numbers only" });
    assert.equal(age, "42");
    assert.ok(s.written().includes("Numbers only"));
  });

  it("confirm", async () => {
    let s = io(["oui"]);
    assert.equal(await cli.confirm("Ok?", { input: s.input, output: s.output }), true);
    s = io([""]);
    assert.equal(await cli.confirm("Ok?", { default: true, input: s.input, output: s.output }), true);
    s = io(["maybe", "n"]);
    assert.equal(await cli.confirm("Ok?", { input: s.input, output: s.output }), false);
  });

  it("select and multiselect fall back to numbers", async () => {
    let s = io(["9", "2"]);
    assert.equal(await cli.select("Pick", ["a", "b", "c"], { input: s.input, output: s.output }), "b");
    s = io(["1, 3"]);
    assert.deepEqual(await cli.multiselect("Pick", [{ label: "A", value: 1 }, { label: "B", value: 2 }, { label: "C", value: 3 }], { input: s.input, output: s.output }), [1, 3]);
  });

  it("password reads a line when not interactive", async () => {
    const s = io(["s3cret"]);
    assert.equal(await cli.password("Token?", { input: s.input, output: s.output }), "s3cret");
  });
});

describe("cli: feedback in non-interactive mode", () => {
  it("spinner prints start and final lines only", () => {
    const out = sink();
    const spin = cli.spinner("Working", { stream: out.stream }).start();
    assert.equal(spin.isSpinning, true);
    spin.text = "Still working";
    spin.succeed("Done");
    assert.equal(spin.isSpinning, false);
    assert.deepEqual(out.lines, ["- Working", "✔ Done"]);
  });

  it("progress prints the final state", () => {
    const out = sink();
    const bar = cli.progress({ total: 4, stream: out.stream, format: "{percent}% {value}/{total} {label}" });
    bar.tick().tick(2, "almost").update(4);
    assert.equal(bar.percent, 100);
    bar.stop();
    assert.deepEqual(out.lines, ["100% 4/4 almost"]);
  });

  it("terminal helpers", () => {
    assert.equal(typeof cli.isInteractive(), "boolean");
    assert.ok(cli.size().columns > 0);
  });
});
