"use strict";

// What a logged value, a table cell or a menu choice can do to a terminal or a
// log file: nothing, except colors and links. One test per finding of the
// audit, then the uses that must keep working.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
// These tests describe the defaults: what the shell sets must not change them.
for (const name of ["LOG_LEVEL", "LOG_FORMAT", "DEBUG"]) delete process.env[name];

const nc = require("..");

const { color, cli } = nc;
const ESC = "\x1b";
const c3 = color.create(3);
const SGR = /\x1b\[[\d;]*m/g;

/** A stream that keeps what it gets, and a logger writing to it. */
const capture = (/** @type {Record<string, unknown>} */ options = {}) => {
  let text = "";
  const sink = { write: (/** @type {string} */ chunk) => void (text += chunk) };
  const log = nc.createLogger({ stdout: sink, stderr: sink, timestamp: false, colors: false, ...options });
  return { log, text: () => text, lines: () => text.replace(/\n$/, "").split("\n") };
};

/** Runs `fn` with environment variables set, then puts them back. */
const withEnv = (/** @type {Record<string, string>} */ values, /** @type {() => void} */ fn) => {
  /** @type {Record<string, string | undefined>} */
  const saved = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

/** A temporary folder, removed after `fn`. */
const inTempDir = (/** @type {(dir: string) => void} */ fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-sec-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe("logger: log forging and terminal injection", () => {
  it("a new line in a logged value can't pass for a log line of its own, even without a timestamp", () => {
    const out = capture();
    out.log.info("login failed for", "bob\nℹ INFO admin logged in");
    out.log.log("plain\n✖ ERROR forged");
    const lines = out.lines();
    assert.equal(lines.length, 4);
    assert.equal(lines[0], "ℹ INFO login failed for bob");
    assert.equal(lines[1], "       ℹ INFO admin logged in", "lined up under the message");
    assert.equal(lines[2], "plain");
    assert.equal(lines[3], "✖ ERROR forged", "log() prints like console.log: no badge, no indent");
    out.log.child("api").log("scoped\n✖ ERROR forged");
    assert.equal(out.lines()[5], "      ✖ ERROR forged", "lined up past the scope");
  });

  it("a lone carriage return can't overwrite the line, on screen or in the log file", () => {
    inTempDir((dir) => {
      const file = path.join(dir, "app.log");
      const out = capture({ file });
      out.log.info("user", "eve\rℹ INFO all good");
      assert.equal(out.text(), "ℹ INFO user eve\\rℹ INFO all good\n");
      assert.equal(fs.readFileSync(file, "utf8"), "ℹ INFO user eve\\rℹ INFO all good\n");
    });
  });

  it("vertical tabs, NEL and line separators are shown, not passed through", () => {
    const out = capture();
    out.log.info("a\vb\x85c\u{2028}d\u{2029}e\x00f\x7fg");
    assert.equal(out.text(), "ℹ INFO a\\vb\\x85c\\u2028d\\u2029e\\x00f\\x7fg\n");
  });

  it("escape sequences in a value reach neither the terminal nor the file", () => {
    inTempDir((dir) => {
      const file = path.join(dir, "app.log");
      const out = capture({ colors: true, file });
      const attacks = ["\x1b]52;c;ZXZpbA==\x07", "\x1b]0;pwned\x07", "\x1b[2J", "\x1b]8;;https://evil.example\x07", "\x9b2J", "\x9d0;x\x9c"];
      for (const attack of attacks) out.log.info("name:", attack);
      const screen = out.text().replace(SGR, "");
      assert.ok(!screen.includes(ESC), "no raw ESC besides the logger's own colors");
      assert.ok(!/[\x07\x9b\x9c\x9d]/.test(screen));
      assert.ok(screen.includes("\\x1b]52;c;ZXZpbA==\\x07"));
      assert.ok(screen.includes("\\x1b[2J"));
      assert.ok(screen.includes("\\x1b]8;;https://evil.example\\x07"), "a link left open is shown");
      const smuggled = capture({ colors: true });
      smuggled.log.info("x", "\x1b]8;;https://a.example\x07a\x1b]0;t\x07b\x1b]8;;\x07");
      assert.ok(!smuggled.text().includes("\x1b]0;"), "a link can't carry another sequence");
      const saved = fs.readFileSync(file, "utf8");
      assert.ok(!saved.includes(ESC) && !/[\x07\x9b\x9c\x9d]/.test(saved));
      assert.ok(saved.includes("\\x1b]0;pwned\\x07"));
    });
  });

  it("markup in the values after the message is printed as is", () => {
    const out = capture({ colors: true });
    out.log.info("user said:", "<% hidden secret%>", "<% bgRed whiteBright bold ✖ FATAL%>");
    const text = out.text();
    assert.ok(text.includes("<% hidden secret%>"));
    assert.ok(text.includes("<% bgRed whiteBright bold ✖ FATAL%>"));
    assert.ok(!text.includes(`${ESC}[8m`), "nothing hidden");
    assert.ok(!text.includes(`${ESC}[41m`), "no red background");
  });

  it("table cells logged through the logger aren't read as markup either", () => {
    const out = capture();
    out.log.table([{ name: "<% hidden x%>" }]);
    assert.ok(out.lines().includes("│ <% hidden x%> │"));
  });
});

describe("logger: what must keep working", () => {
  it("colors from nc.color", () => {
    const out = capture({ colors: true });
    out.log.info(c3.red("x"), "and", c3.bold.underline("y"));
    assert.ok(out.text().includes(`${ESC}[31mx${ESC}[39m`));
    assert.ok(out.text().includes(`${ESC}[1m${ESC}[4my${ESC}[24m${ESC}[22m`));
  });

  it("links from color.link, and text (url) without colors", () => {
    withEnv({ FORCE_HYPERLINK: "1" }, () => {
      const link = c3.link("docs", "https://example.com/docs");
      const colored = capture({ colors: true });
      colored.log.info("see", link);
      assert.ok(colored.text().includes(`${ESC}]8;;https://example.com/docs\x07docs${ESC}]8;;\x07`));
      const plain = capture({ colors: false });
      plain.log.info("see", link);
      assert.equal(plain.text(), "ℹ INFO see docs (https://example.com/docs)\n");
    });
  });

  it("new lines, Windows new lines and tabs in the message", () => {
    const out = capture();
    out.log.info("first\tcolumn\nsecond\r\nthird");
    assert.deepEqual(out.lines(), ["ℹ INFO first\tcolumn", "       second", "       third"]);
    const stamped = capture({ timestamp: "YYYY" });
    stamped.log.info("a\nb");
    assert.equal(stamped.lines()[1], "       b", "with a timestamp, lined up under it as before");
  });

  it("markup in the first argument", () => {
    const colored = capture({ colors: true });
    colored.log.log("<% red bold Error:%> disk full");
    assert.equal(colored.text(), `${ESC}[31m${ESC}[1mError:${ESC}[22m${ESC}[39m disk full\n`);
    const plain = capture();
    plain.log.log("<% red bold Error:%> disk full", 42);
    assert.equal(plain.text(), "Error: disk full 42\n");
  });

  it("colors are removed from the file and from onLog", () => {
    inTempDir((dir) => {
      const file = path.join(dir, "app.log");
      /** @type {string[]} */
      const messages = [];
      const out = capture({ colors: true, file, onLog: (/** @type {{ message: string }} */ entry) => void messages.push(entry.message) });
      out.log.info(c3.red("x"));
      assert.equal(fs.readFileSync(file, "utf8"), "ℹ INFO x\n");
      assert.deepEqual(messages, ["ℹ INFO x"]);
    });
  });
});

describe("color.strip", () => {
  it("can't be tricked into building a sequence from the pieces it leaves", () => {
    const stripped = color.strip("\x1b\x1b[0m]52;c;ZXZpbA==\x07");
    assert.ok(!stripped.includes(ESC) && !stripped.includes("\x07"));
    assert.equal(color.strip("\x1b\x1b[31m[2Jx"), "2Jx");
  });

  it("removes 8-bit OSC, DCS and CSI, and their 8-bit terminator", () => {
    assert.equal(color.strip("a\x9d52;c;ZXZpbA==\x9cb"), "ab");
    assert.equal(color.strip("a\x90q payload\x9cb"), "ab");
    assert.equal(color.strip("a\x9b31mb"), "ab");
  });

  it("removes APC, PM and SOS strings with their ESC", () => {
    assert.equal(color.strip("a\x1b_apc\x1b\\b\x1b^pm\x07c\x1bXsos\x1b\\d"), "abcd");
  });

  it("removes backspaces, carriage returns and every other control character but tab and new line", () => {
    assert.equal(color.strip("a\bb\rc\x00d\x7fe\x85f"), "abcdef");
    assert.equal(color.strip("a\tb\nc"), "a\tb\nc");
    assert.equal(color.strip("plain text"), "plain text");
    assert.equal(color.strip(c3.bgBlue.white.underline("hello")), "hello");
  });

  it("an unterminated sequence costs linear time", () => {
    const hostile = "\x1b]".repeat(100_000);
    const started = Date.now();
    assert.equal(color.strip(hostile), "");
    assert.ok(Date.now() - started < 1000);
  });

  it("a run of 8-bit string introducers costs linear time, in every function and in a JSON log line", () => {
    const hostile = "\x9d".repeat(400_000);
    for (const fn of [() => color.strip(hostile), () => color.width(hostile), () => color.truncate(hostile, 10), () => c3.link(hostile, "https://x.example")]) {
      const started = performance.now();
      fn();
      assert.ok(performance.now() - started < 100, String(fn));
    }
    for (const introducer of ["\x90", "\x98", "\x9e", "\x9f"]) {
      const started = performance.now();
      color.strip(introducer.repeat(400_000));
      assert.ok(performance.now() - started < 100, JSON.stringify(introducer));
    }
    const out = capture({ format: "json" });
    const started = performance.now();
    out.log.info(hostile);
    assert.ok(performance.now() - started < 100);
    assert.equal(JSON.parse(out.text()).msg, "");
    assert.equal(color.strip("a\x1b]0;t\x07b\x9d2;x\x9cc"), "abc", "whole sequences still go");
  });

  it("width and truncate agree with it", () => {
    assert.equal(color.width("\x1b]0;title\x07ab\x1b_x\x1b\\"), 2);
    assert.equal(color.width("a\rb\bc"), 3);
    assert.equal(color.truncate(c3.red("hello world"), 8), `${ESC}[31mhello w…${ESC}[39m`);
    assert.equal(color.width(color.truncate("\x1b]0;t\x07hello world", 8)), 8);
  });

  it("the JSON logger escapes C1 controls and line separators, which JSON.stringify leaves raw", () => {
    const out = capture({ format: "json" });
    out.log.info("x\x9b2J", { note: "a\x85b\u{2028}c\u{2029}d\x9de" });
    const line = out.text().trimEnd();
    assert.ok(!/[\x7f-\x9f\u{2028}\u{2029}]/u.test(line), line);
    assert.ok(line.includes("\\u0085") && line.includes("\\u2028") && line.includes("\\u2029"));
    const record = JSON.parse(line);
    assert.equal(record.note, "a\x85b\u{2028}c\u{2029}d\x9de", "the value itself is unchanged");
    assert.equal(record.msg, "x");
  });
});

describe("cli: values can't drive the terminal", () => {
  it("table cells and headers", () => {
    const text = cli.table([{ name: "ada\rFORGED", note: "\x1b]0;pwned\x07", "k\x1b[2J": 1 }], { colors: false });
    assert.ok(!text.includes("\r") && !text.includes(ESC) && !text.includes("\x07"));
    assert.ok(text.includes("ada\\rFORGED"));
    assert.ok(text.includes("k\\x1b[2J"));
    const widths = new Set(text.split("\n").map((line) => color.width(line)));
    assert.equal(widths.size, 1, "every row has the same width");
  });

  it("colored cells stay colored", () => {
    const text = cli.table([{ status: c3.green("ok") }], { colors: false });
    assert.ok(text.includes(`${ESC}[32mok${ESC}[39m`));
  });

  it("box and tree", () => {
    const boxed = cli.box("a\x1b[2Jb\rc", { title: "t\x1b]0;x\x07", colors: false });
    assert.ok(!boxed.includes(ESC) && !boxed.includes("\r"));
    assert.ok(boxed.includes("a\\x1b[2Jb\\rc"));
    const drawn = cli.tree({ "key\x1b]52;c;x\x07": "value\r!", list: ["item\x1b[2J"] });
    assert.ok(!drawn.includes(ESC) && !drawn.includes("\r"));
    assert.ok(drawn.includes("key\\x1b]52;c;x\\x07: value\\r!"));
  });

  it("select and multiselect labels", async () => {
    const run = async (/** @type {(input: PassThrough, output: PassThrough) => Promise<unknown>} */ ask, /** @type {string} */ answer) => {
      const input = new PassThrough();
      const output = new PassThrough();
      let written = "";
      output.on("data", (/** @type {Buffer} */ chunk) => (written += chunk));
      setImmediate(() => input.write(`${answer}\n`));
      const value = await ask(input, output);
      return { value, written };
    };
    const choices = [{ label: "safe", value: 1 }, { label: "evil\x1b]0;pwned\x07\r", value: 2 }];
    const one = await run((input, output) => cli.select("Pick\x1b[2J", choices, { input, output }), "2");
    assert.equal(one.value, 2, "the value is untouched");
    assert.ok(!one.written.includes(ESC) && !one.written.includes("\r"));
    assert.ok(one.written.includes("evil\\x1b]0;pwned\\x07\\r"));
    const many = await run((input, output) => cli.multiselect("Pick", choices, { input, output }), "1,2");
    assert.deepEqual(many.value, [1, 2]);
    assert.ok(!many.written.includes(ESC));
  });

  it("the interactive menu", async () => {
    /** @type {any} */
    const input = new PassThrough();
    input.isTTY = true;
    input.setRawMode = () => input;
    /** @type {any} */
    const output = new PassThrough();
    output.isTTY = true;
    output.columns = 80;
    let written = "";
    output.on("data", (/** @type {Buffer} */ chunk) => (written += chunk));
    const pending = cli.select("Pick", [{ label: "a\x1b]52;c;x\x07", value: 1, hint: "h\x1b[2J" }], { input, output });
    await new Promise((resolve) => setTimeout(resolve, 10));
    input.write("\r");
    assert.equal(await pending, 1);
    assert.ok(!written.includes("\x1b]52") && !written.includes("\x07"), "no clipboard write");
    assert.ok(written.includes("a\\x1b]52;c;x\\x07") && written.includes("h\\x1b[2J"));
  });

  it("color.link: a control character can't end the link early", () => {
    withEnv({ FORCE_HYPERLINK: "1" }, () => {
      const link = c3.link("a\x07\x1b]0;evil\x07b", "https://x.example/\x07\x1b]52;c;ZXZpbA==\x07");
      assert.equal(link, `${ESC}]8;;https://x.example/]52;c;ZXZpbA==\x07ab${ESC}]8;;\x07`);
      assert.equal((link.match(/\x1b/g) ?? []).length, 2, "only the link's own two sequences");
      assert.equal(c3.link(c3.red("red"), "https://x.example"), `${ESC}]8;;https://x.example\x07${ESC}[31mred${ESC}[39m${ESC}]8;;\x07`);
    });
    assert.equal(color.create(0).link("a\rb", "https://x.example/\n"), "ab (https://x.example/)");
  });
});

describe("logger: redact in pretty and file output", () => {
  const secrets = ["password", "token", "authorization"];

  it("Map, Set, class instances holding a Map, circular objects and error causes", () => {
    inTempDir((dir) => {
      const file = path.join(dir, "app.log");
      const out = capture({ redact: secrets, file });
      class Request {
        url = "/login";
        headers = new Map([["Authorization", "Bearer abc123"], ["accept", "json"]]);
      }
      /** @type {Record<string, unknown>} */
      const circular = { session: new Map([["token", "t0k3n"]]) };
      circular.self = circular;
      class Job {
        error = Object.assign(new Error("job failed"), { token: "job-token" });
      }
      out.log.info(new Map([["password", "hunter2"], ["user", "ada"]]));
      out.log.info(new Set([{ token: "s3t-secret" }, "kept"]));
      out.log.info(new Request());
      out.log.info(circular);
      out.log.error(new Error("login failed", { cause: { password: "cause-pw", user: "ada" } }));
      out.log.info(new Job());
      for (const text of [out.text(), fs.readFileSync(file, "utf8")]) {
        for (const secret of ["hunter2", "s3t-secret", "abc123", "t0k3n", "cause-pw", "job-token"]) assert.ok(!text.includes(secret), `${secret} leaked`);
        assert.ok(text.includes("'ada'") && text.includes("kept") && text.includes("json") && text.includes("/login"));
        assert.ok(text.includes("Map(2)") && text.includes("Set(2)") && text.includes("Request {"), "still printed as what they are");
        assert.ok(text.includes("Error: job failed"), "the stack is still shown");
      }
    });
  });

  it("redacting doesn't change the logged values", () => {
    const out = capture({ redact: secrets });
    const map = new Map([["password", "hunter2"]]);
    const error = new Error("x", { cause: { token: "t" } });
    out.log.info(map).error(error);
    assert.equal(map.get("password"), "hunter2");
    assert.deepEqual(/** @type {any} */ (error).cause, { token: "t" });
  });
});

describe("logger: JSON records", () => {
  it("a logged object can't overwrite time, level, scope or msg", () => {
    const out = capture({ format: "json", fields: { level: "trace" } });
    out.log.info("login", { level: "debug", time: "2001-01-01T00:00:00.000Z", scope: "auth", msg: "forged", user: "ada" });
    const record = JSON.parse(out.text());
    assert.equal(record.level, "info");
    assert.notEqual(record.time, "2001-01-01T00:00:00.000Z");
    assert.equal(record.scope, undefined);
    assert.equal(record.msg, "login");
    assert.equal(record.user, "ada");
    assert.deepEqual(Object.keys(record).slice(0, 2), ["time", "level"], "still first");
    const scoped = capture({ format: "json", scope: "api" });
    scoped.log.warn("x", { scope: "auth" });
    assert.equal(JSON.parse(scoped.text()).scope, "api");
  });
});

describe("logger: log file permissions", () => {
  it("a new log file is for its owner only, unless mode says otherwise", { skip: process.platform === "win32" && "POSIX permissions" }, () => {
    inTempDir((dir) => {
      const own = path.join(dir, "own.log");
      capture({ file: own }).log.info("x");
      assert.equal(fs.statSync(own).mode & 0o777, 0o600);
      const shared = path.join(dir, "shared.log");
      const previous = process.umask(0o022);
      try {
        capture({ file: { path: shared, mode: 0o640 } }).log.info("x");
      } finally {
        process.umask(previous);
      }
      assert.equal(fs.statSync(shared).mode & 0o777, 0o640);
    });
  });

  it("the mode option is accepted everywhere", () => {
    inTempDir((dir) => {
      const file = path.join(dir, "logs", "app.log");
      capture({ file: { path: file, mode: 0o640 } }).log.info("written");
      assert.equal(fs.readFileSync(file, "utf8"), "ℹ INFO written\n");
    });
  });
});
