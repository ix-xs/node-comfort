"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const nc = require("..");

const { sys, env } = nc;
const node = process.execPath;
const windows = { skip: process.platform !== "win32" };

/** @type {string} */
let dir;
before(() => {
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nc-security-sys-")));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

/**
 * Calls `fn` with `child_process.spawn` replaced, so nothing really starts.
 * @param {() => unknown} fn
 * @returns {{ calls: Array<{ file: string, args: string[] }>, result?: unknown, error?: unknown }}
 */
const withFakeSpawn = (fn) => {
  const real = childProcess.spawn;
  /** @type {Array<{ file: string, args: string[] }>} */
  const calls = [];
  // @ts-ignore: a stand-in that returns just enough of a ChildProcess
  childProcess.spawn = (file, args) => {
    calls.push({ file, args: [...args] });
    return { on() {}, unref() {} };
  };
  try {
    return { calls, result: fn() };
  } catch (error) {
    return { calls, error };
  } finally {
    childProcess.spawn = real;
  }
};

/**
 * Calls `fn` as if Node.js ran on another platform.
 * @param {NodeJS.Platform} platform
 * @param {() => unknown} fn
 * @returns {any}
 */
const onPlatform = (platform, fn) => {
  const real = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  try {
    return fn();
  } finally {
    if (real) Object.defineProperty(process, "platform", real);
  }
};

/**
 * The command line a fake spawn got, without the carets cmd.exe would remove.
 * @param {{ args: string[] }} call
 */
const shown = (call) => call.args.join(" ").replace(/\^(.)/g, "$1");

describe("security: Windows batch files", () => {
  const tricky = ["a b", "&", "|", "%PATH%", "!x!", "^", '"', '" & echo INJECTED & "', "a\\", 'a\\"b', "", "<>", "(x)", ",;=", "%", "`", "*?", "50% & 100%"];

  it("arguments reach a .cmd that forwards %* intact, and nothing is injected", windows, async () => {
    const shim = path.join(dir, "shim.cmd");
    fs.writeFileSync(shim, `@"${node}" -e "console.log(JSON.stringify(process.argv.slice(1)))" %*\r\n`);
    const { stdout } = await sys.run(shim, tricky);
    assert.doesNotMatch(stdout, /INJECTED\r?\n/);
    assert.deepEqual(JSON.parse(stdout), tricky);
    // Alone, so that no other quote evens out the count.
    for (const arg of tricky) {
      const alone = await sys.run(shim, ["x", arg]);
      assert.deepEqual(JSON.parse(alone.stdout), ["x", arg], JSON.stringify(arg));
    }
  });

  it("the real npm.cmd can't be made to run a second command", windows, async () => {
    const { stdout } = await sys.run("npm", ["--version", '" & echo INJECTED & "']);
    assert.doesNotMatch(stdout, /INJECTED/);
    assert.match(stdout, /^\d+\.\d+\.\d+/);
  });

  it("line breaks are refused, and quotes too when the file doesn't forward %*", windows, async () => {
    const shim = path.join(dir, "shim-lines.cmd");
    fs.writeFileSync(shim, `@"${node}" -e "console.log(JSON.stringify(process.argv.slice(1)))" %*\r\n`);
    await assert.rejects(sys.run(shim, ["a\nb"]), (e) => e instanceof nc.errors.ProcessError && /line break/.test(e.message));
    await assert.rejects(sys.run(shim, ["a\rb"]), (e) => e instanceof nc.errors.ProcessError);
    const plain = path.join(dir, "plain.bat");
    fs.writeFileSync(plain, "@echo %1\r\n");
    await assert.rejects(sys.run(plain, ['a" & echo INJECTED & "']), (e) => e instanceof nc.errors.ProcessError && /quote/.test(e.message));
    const { stdout } = await sys.run(plain, ["a & echo INJECTED"]);
    assert.equal(stdout, '"a & echo INJECTED"');
  });
});

describe("security: open()", () => {
  it("only opens http, https and mailto URLs unless told otherwise", () => {
    for (const target of ["file:///C:/Windows/System32/whoami.exe", "search-ms:query=x", "ms-msdt:/id", "javascript:alert(1)", "localhost:3000"]) {
      const { calls, error } = withFakeSpawn(() => sys.open(target));
      assert.ok(error instanceof TypeError, target);
      assert.equal(calls.length, 0, target);
    }
    const { calls, result } = withFakeSpawn(() => sys.open("https://example.com/a b?q=1"));
    assert.equal(result, true);
    assert.equal(calls.length, 1);
    assert.ok(shown(calls[0]).includes("https://example.com/a%20b?q=1"));
    const custom = withFakeSpawn(() => sys.open("vscode://file/x", { protocols: ["vscode"] }));
    assert.equal(custom.result, true);
    assert.equal(withFakeSpawn(() => sys.open("http://example.com", { protocols: ["https:"] })).calls.length, 0);
  });

  it("refuses control characters everywhere, and quotes on Windows", () => {
    for (const platform of /** @type {NodeJS.Platform[]} */ (["win32", "linux", "darwin"])) {
      for (const target of ["https://example.com/\nx", "https://example.com/\u0000", `${dir}\x7fx`]) {
        const { calls, error } = onPlatform(platform, () => withFakeSpawn(() => sys.open(target)));
        assert.ok(error instanceof TypeError, `${platform} ${JSON.stringify(target)}`);
        assert.equal(calls.length, 0);
      }
    }
    for (const target of ['https://example.com/" & calc', `${dir}"x`]) {
      const { calls, error } = onPlatform("win32", () => withFakeSpawn(() => sys.open(target)));
      assert.ok(error instanceof TypeError, JSON.stringify(target));
      assert.equal(calls.length, 0);
    }
  });

  it("a quote is legal for open and xdg-open, which get the target as an argument", () => {
    for (const [platform, opener] of /** @type {Array<[NodeJS.Platform, string]>} */ ([["linux", "xdg-open"], ["darwin", "open"]])) {
      const url = onPlatform(platform, () => withFakeSpawn(() => sys.open('https://example.com/say "hi"')));
      assert.equal(url.result, true, platform);
      assert.deepEqual(url.calls, [{ file: opener, args: ["https://example.com/say%20%22hi%22"] }]);
      // the file doesn't exist: refused for that, not for its quote
      const missing = onPlatform(platform, () => withFakeSpawn(() => sys.open(`${dir}"x`)));
      assert.ok(missing.error instanceof Error && !(missing.error instanceof TypeError), platform);
    }
  });

  it("opens a file whose name holds a quote off Windows", { skip: process.platform === "win32" }, () => {
    const file = path.join(dir, 'say "hi".txt');
    fs.writeFileSync(file, "x");
    const { calls, result } = withFakeSpawn(() => sys.open(file));
    assert.equal(result, true);
    assert.deepEqual(calls[0].args, [file]);
  });

  it("a local path must exist, and is passed as an absolute path", () => {
    const missing = withFakeSpawn(() => sys.open(path.join(dir, "nope.txt")));
    assert.ok(missing.error instanceof Error);
    assert.equal(missing.calls.length, 0);
    const file = path.join(dir, "open-me.txt");
    fs.writeFileSync(file, "x");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const { calls, result } = withFakeSpawn(() => sys.open("open-me.txt"));
      assert.equal(result, true);
      assert.ok(shown(calls[0]).includes(file));
    } finally {
      process.chdir(cwd);
    }
  });

  it("refuses network paths and drive paths are never URLs on Windows", windows, () => {
    for (const target of ["\\\\attacker\\share\\evil.exe", "//attacker/share/evil.exe", "file://attacker/share/evil.exe"]) {
      const { calls, error } = withFakeSpawn(() => sys.open(target, { protocols: ["file:"] }));
      assert.ok(error instanceof TypeError, target);
      assert.equal(calls.length, 0, target);
    }
    const drive = withFakeSpawn(() => sys.open("C:\\definitely-not-here-nc\\x.exe"));
    assert.ok(drive.error instanceof Error);
    assert.equal(drive.calls.length, 0);
    const { calls, result } = withFakeSpawn(() => sys.open(dir));
    assert.equal(result, true);
    assert.match(shown(calls[0]), /start/);
  });
});

describe("security: run() options", () => {
  it("extendEnv: false without env passes an empty environment", async () => {
    process.env.NC_SECURITY_SECRET = "secret";
    try {
      const { stdout } = await sys.run(node, ["-e", "console.log(process.env.NC_SECURITY_SECRET ?? 'none')"], { extendEnv: false });
      assert.equal(stdout, "none");
    } finally {
      delete process.env.NC_SECURITY_SECRET;
    }
  });

  it("a relative command is found from options.cwd, like Node's spawn does", windows, async () => {
    const cwd = path.join(dir, "tools");
    fs.mkdirSync(cwd, { recursive: true });
    fs.writeFileSync(path.join(cwd, "tool.cmd"), "@echo from-tools\r\n");
    const { stdout } = await sys.run("./tool", [], { cwd });
    assert.equal(stdout, "from-tools");
    assert.equal(sys.which("./tool", { cwd }), path.join(cwd, "tool.cmd"));
    assert.equal(sys.which("./tool"), undefined);
  });
});

describe("security: .env", () => {
  it("the automatic load leaves out the variables that run code or weaken TLS", async () => {
    const cwd = path.join(dir, "dotenv");
    fs.mkdirSync(cwd, { recursive: true });
    fs.writeFileSync(path.join(cwd, ".env"), [
      "NODE_OPTIONS=--require ./pwn.js",
      "Node_Tls_Reject_Unauthorized=0",
      "GIT_SSH_COMMAND=calc",
      "DYLD_INSERT_LIBRARIES=/tmp/x.dylib",
      "GIT_CONFIG_COUNT=1",
      "LD_PRELOAD=/tmp/x.so",
      "UV_THREADPOOL_SIZE=8",
      "SAFE_ONE=ok",
      "BASH_ENV=/tmp/x.sh",
      "ENV=production",
    ].join("\n"));
    const script = `
      const nc = require(${JSON.stringify(require.resolve(".."))});
      const names = ["NODE_OPTIONS", "NODE_TLS_REJECT_UNAUTHORIZED", "GIT_SSH_COMMAND", "DYLD_INSERT_LIBRARIES", "GIT_CONFIG_COUNT", "LD_PRELOAD", "UV_THREADPOOL_SIZE", "SAFE_ONE", "BASH_ENV", "ENV"];
      const first = names.map((name) => process.env[name] ?? null);
      nc.env.load();
      console.log(JSON.stringify([first, process.env.NODE_OPTIONS ?? null]));
    `;
    /** @type {Record<string, string | undefined>} */
    const childEnv = { ...process.env };
    for (const name of Object.keys(childEnv)) {
      if (/^(NODE_OPTIONS|NODE_TLS_REJECT_UNAUTHORIZED|GIT_SSH_COMMAND|DYLD_.*|GIT_CONFIG_.*|LD_PRELOAD|UV_THREADPOOL_SIZE|SAFE_ONE|BASH_ENV|ENV|NODE_COMFORT_DOTENV)$/i.test(name)) delete childEnv[name];
    }
    const result = await sys.run(node, ["-e", script], { cwd, env: childEnv, extendEnv: false });
    const [first, later] = JSON.parse(result.stdout);
    assert.deepEqual(first, [null, null, null, null, null, null, "8", "ok", null, "production"], "ENV is a common app variable: only BASH_ENV is left out");
    assert.equal(later, "--require ./pwn.js", "a load called on purpose still loads everything");
    const warnings = result.stderr.split(/\r?\n/).filter((line) => line.includes(".env"));
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /NODE_OPTIONS/);
    assert.match(warnings[0], /GIT_SSH_COMMAND/);
  });

  it("comment stripping stays linear on a long line of spaces", () => {
    const started = Date.now();
    const parsed = env.parse(`A=x${" ".repeat(60_000)}y`, { env: {} });
    assert.ok(Date.now() - started < 500, `took ${Date.now() - started}ms`);
    assert.equal(parsed.A, `x${" ".repeat(60_000)}y`);
    assert.deepEqual(env.parse("A=value  # comment\nB=#all\nC=a#b\nD=a\t#c", { env: {} }), { A: "value", B: "", C: "a#b", D: "a" });
  });

  it("variables that repeat each other don't blow up", () => {
    const lines = [];
    for (let i = 0; i < 20; i++) lines.push(`V${i}=\${V${i + 1}}\${V${i + 1}}`);
    lines.push("V20=abcdefgh");
    const started = Date.now();
    assert.throws(() => env.parse(lines.join("\n"), { env: {} }), (e) => e instanceof RangeError && /expands to more than 64 KB/.test(e.message));
    assert.ok(Date.now() - started < 500, `took ${Date.now() - started}ms`);
    // Below the limit, the same shape still expands, quickly.
    const small = env.parse("A=${B}${B}\nB=${C}${C}\nC=xy", { env: {} });
    assert.deepEqual(small, { A: "xyxyxyxy", B: "xyxy", C: "xy" });
  });

  it("parse() doesn't read process.env unless asked to", () => {
    process.env.NC_SECURITY_PARSE_SECRET = "server secret";
    try {
      assert.equal(env.parse("X=${NC_SECURITY_PARSE_SECRET}").X, "");
      assert.equal(env.parse("X=${NC_SECURITY_PARSE_SECRET}", { env: process.env }).X, "server secret");
      assert.equal(env.parse("A=1\nX=${A}").X, "1");
    } finally {
      delete process.env.NC_SECURITY_PARSE_SECRET;
    }
  });
});
