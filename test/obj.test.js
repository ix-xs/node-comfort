"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { obj } = require("..");

describe("obj: security", () => {
  it("never pollutes Object.prototype", () => {
    obj.set({}, "__proto__.polluted", true);
    obj.set({}, ["constructor", "prototype", "polluted2"], true);
    obj.unflatten({ "__proto__.hacked": 1, "constructor.prototype.x": 1 });
    obj.merge({}, JSON.parse('{"__proto__":{"evil":1}}'));
    obj.mergeWith({}, {}, JSON.parse('{"__proto__":{"evil3":1}}'));
    obj.defaults({}, JSON.parse('{"__proto__":{"evil2":1}}'));
    obj.fromEntries([["__proto__", { evil4: 1 }]]);
    obj.mapKeys({ a: 1 }, () => "__proto__");
    const probe = {};
    for (const key of ["polluted", "polluted2", "hacked", "x", "evil", "evil2", "evil3", "evil4"]) {
      assert.equal(probe[key], undefined, `Object.prototype.${key} must stay undefined`);
    }
    assert.equal(obj.get({}, "__proto__.toString"), undefined);
    assert.equal(obj.has({}, "constructor"), false);
  });
});

describe("obj: copy and merge", () => {
  it("clone is deep and keeps special objects", () => {
    const source = { a: { b: [1, 2] }, when: new Date(0), fn() { return 1; }, re: /x/g, map: new Map([["k", { v: 1 }]]) };
    const copy = obj.clone(source);
    assert.notEqual(copy.a, source.a);
    assert.notEqual(copy.a.b, source.a.b);
    assert.deepEqual(copy.a.b, [1, 2]);
    assert.equal(copy.when.getTime(), 0);
    assert.equal(copy.fn(), 1);
    assert.notEqual(copy.map.get("k"), source.map.get("k"));
    class Point { constructor(x) { this.x = x; } norm() { return Math.abs(this.x); } }
    const p = obj.clone(new Point(-3));
    assert.ok(p instanceof Point);
    assert.equal(p.norm(), 3);
    const circular = { name: "loop" };
    circular.self = circular;
    const c = obj.clone(circular);
    assert.equal(c.self, c);
  });

  it("merge, mergeWith, defaults", () => {
    const base = { db: { host: "localhost", port: 5432 }, tags: ["a"] };
    const merged = obj.merge(base, { db: { port: 6543 }, tags: ["b"] });
    assert.deepEqual(merged, { db: { host: "localhost", port: 6543 }, tags: ["b"] });
    assert.equal(base.db.port, 5432, "inputs are untouched");
    assert.deepEqual(obj.mergeWith({ arrays: "concat" }, { t: [1] }, { t: [1, 2] }), { t: [1, 1, 2] });
    assert.deepEqual(obj.mergeWith({ arrays: "unique" }, { t: [1] }, { t: [1, 2] }), { t: [1, 2] });
    assert.deepEqual(obj.mergeWith({ skipUndefined: true }, { port: 80 }, { port: undefined }), { port: 80 });
    assert.deepEqual(
      obj.defaults({ port: 8080, db: { user: "me" }, zero: 0 }, { port: 80, zero: 5, db: { user: "root", pass: "" } }),
      { port: 8080, zero: 0, db: { user: "me", pass: "" } },
    );
  });
});

describe("obj: comparison", () => {
  it("equal handles every structure", () => {
    assert.equal(obj.equal({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), true);
    assert.equal(obj.equal({ a: 1 }, { a: 1, b: undefined }), false);
    assert.equal(obj.equal(NaN, NaN), true);
    assert.equal(obj.equal(new Date(1), new Date(1)), true);
    assert.equal(obj.equal(/a/g, /a/i), false);
    assert.equal(obj.equal(new Set([1, 2]), new Set([2, 1])), true);
    assert.equal(obj.equal(new Set([{ a: 1 }]), new Set([{ a: 1 }])), true);
    assert.equal(obj.equal(new Map([[{ k: 1 }, 1]]), new Map([[{ k: 1 }, 1]])), true);
    assert.equal(obj.equal(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
    assert.equal(obj.equal([1], { 0: 1, length: 1 }), false);
    const a = { x: 1 };
    a.self = a;
    const b = { x: 1 };
    b.self = b;
    assert.equal(obj.equal(a, b), true);
  });

  it("diff lists every change", () => {
    assert.deepEqual(obj.diff({ name: "Ada", tags: ["a"], old: 1 }, { name: "Ada L.", tags: ["a", "b"], age: 36 }), [
      { path: ["name"], type: "changed", from: "Ada", to: "Ada L." },
      { path: ["tags", 1], type: "added", to: "b" },
      { path: ["old"], type: "removed", from: 1 },
      { path: ["age"], type: "added", to: 36 },
    ]);
    assert.deepEqual(obj.diff({ a: 1 }, { a: 1 }), []);
    assert.deepEqual(obj.diff(1, 2), [{ path: [], type: "changed", from: 1, to: 2 }]);
  });
});

describe("obj: dot paths", () => {
  const data = { user: { profile: { name: "Ada" }, tags: ["x", "y"] }, zero: 0, nil: null };

  it("get", () => {
    assert.equal(obj.get(data, "user.profile.name"), "Ada");
    assert.equal(obj.get(data, "user.tags[1]"), "y");
    assert.equal(obj.get(data, ["user", "tags", 0]), "x");
    assert.equal(obj.get(data, "user.missing.deep", "fallback"), "fallback");
    assert.equal(obj.get(data, "zero", 5), 0);
    assert.equal(obj.get(data, "nil", 5), null);
    assert.equal(obj.get(data, "nil.x", 5), 5);
  });

  it("set, unset, has", () => {
    assert.deepEqual(obj.set({}, "a.b.c", 1), { a: { b: { c: 1 } } });
    const withList = obj.set({}, "list[1].name", "x");
    assert.ok(Array.isArray(withList.list));
    assert.equal(withList.list[1].name, "x");
    const updated = obj.set(data, "user.profile.name", "Bob");
    assert.equal(updated.user.profile.name, "Bob");
    assert.equal(data.user.profile.name, "Ada", "source is untouched");
    assert.deepEqual(obj.unset({ a: { b: 1, c: 2 } }, "a.b"), { a: { c: 2 } });
    assert.deepEqual(obj.unset({ a: [1, 2, 3] }, ["a", 1]), { a: [1, 3] });
    assert.equal(obj.has({ a: { b: undefined } }, "a.b"), true);
    assert.equal(obj.has({ a: {} }, "a.b"), false);
  });
});

describe("obj: shaping", () => {
  const user = { id: 1, email: "a@x.io", password: "secret", first_name: "Ada" };

  it("pick, omit, filter, mapValues, mapKeys, renameKeys, invert", () => {
    assert.deepEqual(obj.pick(user, ["id", "email"]), { id: 1, email: "a@x.io" });
    assert.deepEqual(obj.omit(user, ["password"]), { id: 1, email: "a@x.io", first_name: "Ada" });
    assert.deepEqual(obj.filter({ a: 1, b: 2, c: 3 }, (v) => v > 1), { b: 2, c: 3 });
    assert.deepEqual(obj.mapValues({ a: 1, b: 2 }, (v) => v * 10), { a: 10, b: 20 });
    assert.deepEqual(obj.mapKeys({ a: 1 }, (k) => k.toUpperCase()), { A: 1 });
    assert.deepEqual(obj.renameKeys({ _id: 1, name: "Ada" }, { _id: "id" }), { id: 1, name: "Ada" });
    assert.deepEqual(obj.invert({ a: "x", b: "y" }), { x: "a", y: "b" });
  });

  it("compact, flatten, unflatten", () => {
    assert.deepEqual(obj.compact({ a: 1, b: null, c: undefined, d: "" }), { a: 1, d: "" });
    assert.deepEqual(obj.compact({ a: { b: null, c: "" }, d: [null, 1] }, { deep: true, removeEmpty: true }), { d: [1] });
    assert.deepEqual(obj.flatten({ db: { host: "x", port: 1 }, list: [1] }), { "db.host": "x", "db.port": 1, list: [1] });
    assert.deepEqual(obj.unflatten({ "db.host": "x", "db.port": 1, "arr.0": "a" }), { db: { host: "x", port: 1 }, arr: ["a"] });
  });
});

describe("obj: inspection", () => {
  it("keys, entries, fromEntries, size, isEmpty, deepFreeze", () => {
    assert.deepEqual(obj.keys({ a: 1, b: 2 }), ["a", "b"]);
    assert.deepEqual(obj.entries({ a: 1 }), [["a", 1]]);
    assert.deepEqual(obj.fromEntries(new Map([["x", true]])), { x: true });
    assert.equal(obj.size({ a: 1, b: 2 }), 2);
    assert.equal(obj.size(new Set([1])), 1);
    assert.equal(obj.size("abc"), 3);
    assert.equal(obj.size(null), 0);
    assert.equal(obj.isEmpty({}), true);
    assert.equal(obj.isEmpty({ a: 1 }), false);
    const frozen = obj.deepFreeze({ db: { host: "x" } });
    assert.throws(() => {
      "use strict";
      frozen.db.host = "y";
    }, TypeError);
  });
});
