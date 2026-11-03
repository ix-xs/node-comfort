"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const nodeCrypto = require("node:crypto");
const nc = require("..");
const shared = require("../src/internal/shared.js");

const { id, func, time } = nc;

/**
 * Runs `fn` as if the process had another pid, like a forked child.
 * @param {number} pid
 * @param {() => void} fn
 */
const withPid = (pid, fn) => {
  const original = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(process, "pid"));
  Object.defineProperty(process, "pid", { ...original, value: pid, configurable: true });
  try {
    fn();
  } finally {
    Object.defineProperty(process, "pid", original);
  }
};

describe("security: ids in a new process", () => {
  it("refills the random pool when the pid changes", () => {
    id.nano();
    const original = nodeCrypto.randomFillSync;
    let fills = 0;
    nodeCrypto.randomFillSync = /** @type {any} */ ((/** @type {any[]} */ ...args) => (fills++, original.apply(nodeCrypto, /** @type {any} */ (args))));
    try {
      withPid(process.pid + 1, () => {
        id.nano();
        assert.equal(fills, 1, "a new process does not reuse the bytes left in the pool");
        id.code();
        assert.equal(fills, 1, "and then keeps using its own pool");
      });
    } finally {
      nodeCrypto.randomFillSync = original;
    }
  });

  it("starts the generator state over when the pid changes", () => {
    const processPart = () => id.objectId().slice(8, 18);
    const parent = processPart();
    assert.equal(processPart(), parent);
    withPid(process.pid + 1, () => {
      const child = processPart();
      assert.notEqual(child, parent, "objectId draws new process bytes");
      assert.equal(processPart(), child);
      assert.ok(nc.isUUID(id.uuidv7(), { version: 7 }));
      assert.match(id.ulid(), /^[0-9A-HJKMNP-TV-Z]{26}$/);
    });
    const ids = Array.from({ length: 50 }, () => id.uuidv7());
    assert.deepEqual([...ids].sort(), ids, "uuidv7 still increases after a reset");
  });

  it("gives different ids to each process started from the same startup snapshot", (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-snapshot-"));
    try {
      const entry = path.join(dir, "entry.js");
      const blob = path.join(dir, "snapshot.blob");
      // A snapshot entry can only load built-in modules, so the module is
      // wrapped the way a bundler would.
      fs.writeFileSync(entry, `
const fs = require("node:fs");
const v8 = require("node:v8");
const mod = { exports: {} };
new Function("module", "exports", "require", fs.readFileSync(${JSON.stringify(path.join(__dirname, "..", "src", "Id.js"))}, "utf8"))(mod, mod.exports, require);
const id = mod.exports;
id.nano(); id.uuidv7(); id.ulid(); id.objectId();
v8.startupSnapshot.setDeserializeMainFunction(() => {
  console.log(JSON.stringify([id.nano(), id.code(), id.prefixed("u"), id.uuidv7().slice(-17), id.ulid().slice(10), id.objectId().slice(8, 18)]));
});
`);
      try {
        execFileSync(process.execPath, ["--snapshot-blob", blob, "--build-snapshot", entry], { cwd: dir, stdio: "pipe", timeout: 30_000 });
      } catch (error) {
        t.skip(`this Node.js can't build the snapshot: ${String(/** @type {any} */ (error).stderr ?? error).split("\n")[0]}`);
        return;
      }
      const run = () => JSON.parse(execFileSync(process.execPath, ["--snapshot-blob", blob], { cwd: dir, encoding: "utf8", timeout: 30_000 }));
      const [a, b] = [run(), run()];
      for (let i = 0; i < a.length; i++) assert.notEqual(a[i], b[i], `value ${i} differs between the two runs`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("security: memoize keys", () => {
  /**
   * Calls a memoized function with `a` then `b` and returns both results.
   * @param {unknown} a
   * @param {unknown} b
   */
  const twice = (a, b) => {
    let calls = 0;
    const memo = func.memoize((/** @type {unknown} */ value) => ++calls);
    return [memo(a), memo(b)];
  };

  it("a string and undefined", () => {
    assert.deepEqual(twice({ owner: "u" }, { owner: undefined }), [1, 2]);
  });

  it("a string and a bigint", () => {
    assert.deepEqual(twice({ id: "i1" }, { id: 1n }), [1, 2]);
  });

  it("two sets with different content", () => {
    assert.deepEqual(twice({ roles: new Set(["guest"]) }, { roles: new Set(["admin"]) }), [1, 2]);
  });

  it("an ISO string and the date it prints", () => {
    const at = new Date("2024-01-01T00:00:00.000Z");
    assert.deepEqual(twice({ at: at.toISOString() }, { at }), [1, 2]);
  });

  it("a string and undefined in an array", () => {
    assert.deepEqual(twice(["u"], [undefined]), [1, 2]);
  });

  it("still finds plain objects by content, and other objects by identity", () => {
    assert.deepEqual(twice({ a: 1, list: [1, "x", null] }, { a: 1, list: [1, "x", null] }), [1, 1]);
    const roles = new Set(["admin"]);
    assert.deepEqual(twice({ roles }, { roles }), [1, 1]);
    assert.deepEqual(twice({ n: 0 }, { n: -0 }), [1, 2]);
    assert.deepEqual(twice({ n: NaN }, { n: null }), [1, 2]);
  });
});

describe("security: durations and cron", () => {
  it("parses a huge text in linear time", () => {
    const start = performance.now();
    assert.equal(time.parseDuration(`${"1".repeat(100_000)}!`), null);
    assert.equal(time.parseDuration(`${"1".repeat(255)}!`), null);
    assert.equal(time.parseDuration(`${"1 ".repeat(127)}!`), null);
    assert.ok(performance.now() - start < 100, "well under 100 ms");
  });

  it("keeps the text formats", () => {
    assert.equal(time.parseDuration("1h, 30m"), 5_400_000);
    assert.equal(time.parseDuration("1 hour and 30 minutes"), 5_400_000);
    assert.equal(time.parseDuration(" .5h "), 1_800_000);
    assert.equal(time.parseDuration("1h -30m"), 1_800_000);
    assert.equal(time.parseDuration("2d 3h 4m 5s 6ms"), 183_845_006);
    assert.equal(time.parseDuration("1h 30"), null);
    assert.equal(time.parseDuration("1h 30x"), null);
  });

  it("doesn't take inherited properties for units or macros", () => {
    assert.equal(time.parseDuration("5constructor"), null);
    assert.equal(time.parseDuration("1 toString"), null);
    assert.equal(time.parseDuration("2 hasOwnProperty"), null);
    assert.throws(() => time.nextRun("constructor"), SyntaxError);
    assert.throws(() => time.nextRun("toString"), SyntaxError);
  });

  it("doesn't cache texts longer than 256 characters", () => {
    const long = `${" ".repeat(300)}5m`;
    const longCron = `0 0 ${"1,".repeat(130)}1 * *`;
    /** @type {unknown[]} */
    const keys = [];
    const set = Map.prototype.set;
    Map.prototype.set = function(key, value) {
      keys.push(key);
      return set.call(this, key, value);
    };
    try {
      assert.equal(shared.parseDuration(long), 300_000);
      assert.equal(shared.parseCron(longCron).days.has(1), true);
      assert.equal(shared.parseDuration("17 ms"), 17);
    } finally {
      Map.prototype.set = set;
    }
    assert.equal(keys.includes(long), false);
    assert.equal(keys.includes(longCron), false);
    assert.equal(keys.includes("17 ms"), true, "short texts are still cached");
  });
});
