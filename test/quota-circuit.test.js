"use strict";

const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const nc = require("..");

const { Quota } = nc.quota;
const { Circuit } = nc.circuit;
const { CircuitOpenError, NodeComfortError } = nc.errors;

const boom = () => {
  throw new Error("boom");
};
const ok = () => "ok";

describe("quota", () => {
  beforeEach(() => mock.timers.enable({ apis: ["Date"], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  it("create() and the class give the same thing", () => {
    assert.ok(nc.quota.create({ limit: 1, window: 1000 }) instanceof Quota);
    assert.ok(Quota.create({ limit: 1, window: 1000 }) instanceof Quota);
    assert.equal(require("../src/Quota.js"), Quota);
  });

  it("allows `limit` hits per window, then refuses", () => {
    const quota = nc.quota.create({ limit: 3, window: "1m" });
    assert.deepEqual(quota.consume("a"), { allowed: true, remaining: 2, resetMs: 60_000 });
    mock.timers.tick(1000);
    assert.deepEqual(quota.consume("a"), { allowed: true, remaining: 1, resetMs: 59_000 });
    assert.deepEqual(quota.consume("a"), { allowed: true, remaining: 0, resetMs: 59_000 });
    assert.deepEqual(quota.consume("a"), { allowed: false, remaining: 0, resetMs: 59_000 });
    // other keys have their own window
    assert.deepEqual(quota.consume("b"), { allowed: true, remaining: 2, resetMs: 60_000 });
    assert.equal(quota.consume(42).allowed, true);
  });

  it("the window is fixed and starts at the first hit", () => {
    const quota = nc.quota.create({ limit: 2, window: 1000 });
    quota.consume("a");
    mock.timers.tick(600);
    quota.consume("a");
    assert.equal(quota.consume("a").allowed, false);
    mock.timers.tick(399);
    assert.deepEqual(quota.consume("a"), { allowed: false, remaining: 0, resetMs: 1 });
    mock.timers.tick(1);
    // a new window, from this hit
    assert.deepEqual(quota.consume("a"), { allowed: true, remaining: 1, resetMs: 1000 });
  });

  it("a refused hit is not counted", () => {
    const quota = nc.quota.create({ limit: 5, window: 1000 });
    assert.deepEqual(quota.consume("a", 4), { allowed: true, remaining: 1, resetMs: 1000 });
    assert.deepEqual(quota.consume("a", 2), { allowed: false, remaining: 1, resetMs: 1000 });
    for (let i = 0; i < 10; i++) quota.consume("a", 3);
    assert.deepEqual(quota.consume("a"), { allowed: true, remaining: 0, resetMs: 1000 });
  });

  it("a cost of 0 reads the state, a negative or invalid cost throws", () => {
    const quota = nc.quota.create({ limit: 2, window: 1000 });
    quota.consume("a");
    assert.deepEqual(quota.consume("a", 0), { allowed: true, remaining: 1, resetMs: 1000 });
    assert.deepEqual(quota.consume("a", 0), { allowed: true, remaining: 1, resetMs: 1000 });
    assert.throws(() => quota.consume("a", -1), RangeError);
    assert.throws(() => quota.consume("a", NaN), TypeError);
  });

  it("reset() forgets a key, size counts the keys", () => {
    const quota = nc.quota.create({ limit: 1, window: 1000 });
    quota.consume("a");
    quota.consume("b");
    assert.equal(quota.size, 2);
    assert.equal(quota.consume("a").allowed, false);
    assert.equal(quota.reset("a"), true);
    assert.equal(quota.reset("a"), false);
    assert.equal(quota.size, 1);
    assert.equal(quota.consume("a").allowed, true);
  });

  it("drops finished windows every 1000 hits", () => {
    const quota = nc.quota.create({ limit: 1, window: 1000 });
    for (let i = 0; i < 998; i++) quota.consume(`once-${i}`);
    assert.equal(quota.size, 998);
    mock.timers.tick(1000);
    quota.consume("late"); // hit 999: no sweep yet
    assert.equal(quota.size, 999);
    quota.consume("later"); // hit 1000: the 998 finished windows go, "late" is still open
    assert.equal(quota.size, 2);
    assert.equal(quota.consume("late").allowed, false);
  });

  it("checks its options", () => {
    assert.throws(() => nc.quota.create({ limit: -1, window: 1000 }), RangeError);
    assert.throws(() => nc.quota.create({ limit: NaN, window: 1000 }), TypeError);
    assert.throws(() => nc.quota.create(/** @type {any} */ ({ window: 1000 })), TypeError);
    assert.throws(() => nc.quota.create({ limit: 1, window: 0 }), RangeError);
    assert.throws(() => nc.quota.create({ limit: 1, window: "soon" }), { name: "TypeError", message: /Invalid window/ });
    assert.throws(() => nc.quota.create(/** @type {any} */ ({ limit: 1 })), { name: "TypeError", message: /Invalid window/ });
    assert.throws(() => nc.quota.create(/** @type {any} */ (undefined)), TypeError);
    // a limit of 0 refuses everything
    assert.equal(nc.quota.create({ limit: 0, window: 1000 }).consume("a").allowed, false);
  });
});

describe("circuit", () => {
  beforeEach(() => mock.timers.enable({ apis: ["Date"], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  it("create() and the class give the same thing", () => {
    assert.ok(nc.circuit.create() instanceof Circuit);
    assert.ok(Circuit.create() instanceof Circuit);
    assert.equal(require("../src/Circuit.js"), Circuit);
  });

  it("passes results and errors through while closed", async () => {
    const circuit = nc.circuit.create();
    assert.equal(circuit.status, "closed");
    assert.equal(await circuit.execute(ok), "ok");
    assert.equal(await circuit.execute(async () => 42), 42);
    await assert.rejects(circuit.execute(boom), { message: "boom" });
    await assert.rejects(circuit.execute(async () => Promise.reject(new Error("async boom"))), { message: "async boom" });
    assert.equal(circuit.status, "closed");
  });

  it("opens after failureThreshold failures in a row, then rejects with CircuitOpenError", async () => {
    let calls = 0;
    const circuit = nc.circuit.create({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) await assert.rejects(circuit.execute(boom), { message: "boom" });
    assert.equal(circuit.status, "open");
    const rejected = circuit.execute(() => calls++);
    assert.ok(rejected instanceof Promise, "execute() rejects, it never throws synchronously");
    await assert.rejects(rejected, (error) => {
      assert.ok(error instanceof CircuitOpenError);
      assert.ok(error instanceof NodeComfortError);
      assert.equal(error.code, "ERR_CIRCUIT_OPEN");
      assert.equal(error.name, "CircuitOpenError");
      return true;
    });
    assert.equal(calls, 0);
  });

  it("defaults to 5 failures and 30 seconds", async () => {
    const circuit = nc.circuit.create();
    for (let i = 0; i < 4; i++) await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "closed");
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
    mock.timers.tick(29_999);
    await assert.rejects(circuit.execute(ok), CircuitOpenError);
    mock.timers.tick(1);
    assert.equal(await circuit.execute(ok), "ok");
    assert.equal(circuit.status, "closed");
  });

  it("a success while closed resets the count of failures", async () => {
    const circuit = nc.circuit.create({ failureThreshold: 2 });
    await assert.rejects(circuit.execute(boom));
    await circuit.execute(ok);
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "closed");
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
  });

  it("goes half-open after resetTimeout; a failure then opens it again", async () => {
    const circuit = nc.circuit.create({ failureThreshold: 1, resetTimeout: "1s" });
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
    mock.timers.tick(1000);
    // stays "open" until a call comes
    assert.equal(circuit.status, "open");
    let during;
    await assert.rejects(circuit.execute(() => {
      during = circuit.status;
      throw new Error("still down");
    }), { message: "still down" });
    assert.equal(during, "half-open");
    assert.equal(circuit.status, "open");
    // the cool-off starts again from that failure
    mock.timers.tick(999);
    await assert.rejects(circuit.execute(ok), CircuitOpenError);
    mock.timers.tick(1);
    assert.equal(await circuit.execute(ok), "ok");
    assert.equal(circuit.status, "closed");
  });

  it("closes after successThreshold successes while half-open", async () => {
    const circuit = nc.circuit.create({ failureThreshold: 1, resetTimeout: 100, successThreshold: 3 });
    await assert.rejects(circuit.execute(boom));
    mock.timers.tick(100);
    await circuit.execute(ok);
    await circuit.execute(ok);
    assert.equal(circuit.status, "half-open");
    await circuit.execute(ok);
    assert.equal(circuit.status, "closed");
    // closed again: failures count from zero
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
  });

  it("a failure while half-open reopens it, even after some successes", async () => {
    const circuit = nc.circuit.create({ failureThreshold: 2, resetTimeout: 100, successThreshold: 2 });
    await assert.rejects(circuit.execute(boom));
    await assert.rejects(circuit.execute(boom));
    mock.timers.tick(100);
    await circuit.execute(ok);
    assert.equal(circuit.status, "half-open");
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
    // the next trial needs successThreshold successes again
    mock.timers.tick(100);
    await circuit.execute(ok);
    assert.equal(circuit.status, "half-open");
    await circuit.execute(ok);
    assert.equal(circuit.status, "closed");
  });

  it("isFailure decides which errors count", async () => {
    const seen = [];
    const circuit = nc.circuit.create({
      failureThreshold: 1,
      isFailure: (error) => {
        seen.push(error);
        return /** @type {any} */ (error).status !== 404;
      },
    });
    const notFound = Object.assign(new Error("not found"), { status: 404 });
    await assert.rejects(circuit.execute(() => Promise.reject(notFound)), (error) => error === notFound);
    assert.equal(circuit.status, "closed");
    assert.deepEqual(seen, [notFound]);
    await assert.rejects(circuit.execute(boom));
    assert.equal(circuit.status, "open");
    // an error that is not a failure, while half-open, leaves it half-open
    mock.timers.tick(30_000);
    await assert.rejects(circuit.execute(() => Promise.reject(notFound)));
    assert.equal(circuit.status, "half-open");
  });

  it("calls onOpen and onClose on each change", async () => {
    const events = [];
    const circuit = nc.circuit.create({
      failureThreshold: 2,
      resetTimeout: 100,
      onOpen: () => events.push(`open:${circuit.status}`),
      onClose: () => events.push(`close:${circuit.status}`),
    });
    await assert.rejects(circuit.execute(boom));
    assert.deepEqual(events, []);
    await assert.rejects(circuit.execute(boom));
    assert.deepEqual(events, ["open:open"]);
    await assert.rejects(circuit.execute(ok), CircuitOpenError);
    assert.deepEqual(events, ["open:open"], "a rejected call changes nothing");
    mock.timers.tick(100);
    await assert.rejects(circuit.execute(boom));
    assert.deepEqual(events, ["open:open", "open:open"], "half-open to open calls onOpen again");
    mock.timers.tick(100);
    await circuit.execute(ok);
    assert.deepEqual(events, ["open:open", "open:open", "close:closed"]);
    await circuit.execute(ok);
    assert.equal(events.length, 3, "a success while closed calls nothing");
  });

  it("an error of onClose is not counted as a failure of the call", async () => {
    const circuit = nc.circuit.create({
      failureThreshold: 1,
      resetTimeout: 100,
      onClose: () => {
        throw new Error("listener");
      },
    });
    await assert.rejects(circuit.execute(boom));
    mock.timers.tick(100);
    await assert.rejects(circuit.execute(ok), { message: "listener" });
    assert.equal(circuit.status, "closed");
  });

  it("checks its options", () => {
    assert.throws(() => nc.circuit.create({ failureThreshold: 0 }), RangeError);
    assert.throws(() => nc.circuit.create({ successThreshold: 0 }), RangeError);
    assert.throws(() => nc.circuit.create(/** @type {any} */ ({ failureThreshold: "3" })), TypeError);
    assert.throws(() => nc.circuit.create({ resetTimeout: "later" }), { name: "TypeError", message: /Invalid resetTimeout/ });
  });
});

describe("CircuitOpenError", () => {
  it("is a NodeComfortError with its own code", () => {
    const error = new CircuitOpenError();
    assert.equal(error.code, "ERR_CIRCUIT_OPEN");
    assert.equal(error.name, "CircuitOpenError");
    assert.match(error.message, /circuit is open/);
    assert.deepEqual(JSON.parse(JSON.stringify(error)), { name: "CircuitOpenError", code: "ERR_CIRCUIT_OPEN", message: error.message });
    assert.ok(Object.getOwnPropertySymbols(CircuitOpenError.prototype).includes(Symbol.for("@ix-xs/node-comfort/CircuitOpenError")));
    assert.equal(nc.errors.CircuitOpenError, require("../src/errors.js").CircuitOpenError);
  });
});

describe("quota and circuit subpaths", () => {
  it("export the class, with its factory, in CommonJS and ES modules", async () => {
    const pkg = require("../package.json");
    for (const [name, Class] of [["quota", Quota], ["circuit", Circuit]]) {
      const target = path.join(__dirname, "..", pkg.exports[`./${name}`].default);
      assert.equal(require(target), Class);
      const esm = await import(pathToFileURL(target).href);
      assert.equal(esm.default, Class);
      assert.equal(typeof esm.default.create, "function");
    }
  });
});
