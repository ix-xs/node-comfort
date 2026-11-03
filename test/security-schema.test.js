"use strict";

// Inputs that used to take seconds, throw out of a function documented as
// never throwing, or reach prototypes, in schema, obj and time.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const s = nc.schema;
const { obj, time } = nc;

/** Milliseconds `fn` takes. */
const timed = (fn) => {
  const start = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - start) / 1e6;
};

/** A path and a code per issue, like "arg.value: invalid_type". */
const codes = (result) => (result.issues ?? []).map((issue) => `${issue.path.join(".")}: ${issue.code}`);

describe("schema: unions", () => {
  const Expr = s.lazy(() =>
    s.union([
      s.object({ op: s.literal("num"), value: s.number() }),
      s.object({ op: s.literal("neg"), arg: Expr }),
      s.object({ op: s.literal("not"), arg: Expr }),
    ]),
  );
  const build = (depth, leaf = { op: "num", value: 1 }) => {
    let value = leaf;
    for (let i = 0; i < depth; i++) value = { op: i % 2 ? "neg" : "not", arg: value };
    return value;
  };

  it("a recursive union takes a time that grows with the input, not with 2 to its depth", () => {
    assert.ok(timed(() => assert.equal(Expr.safeParse(build(22)).success, true)) < 200);
    assert.ok(timed(() => assert.equal(Expr.safeParse(build(400)).success, true)) < 200);
    let result;
    assert.ok(timed(() => (result = Expr.safeParse(build(400, { op: "num", value: "x" })))) < 200);
    assert.deepEqual(codes(result), [`${"arg.".repeat(400)}value: invalid_type`]);
    assert.deepEqual(Expr.parse(build(2)), build(2));
  });

  it("an invalid input gets the same report as before", () => {
    const Shape = s.union([s.object({ type: s.literal("circle"), r: s.number() }), s.object({ type: s.literal("square"), side: s.number() })]);
    assert.deepEqual(codes(Shape.safeParse({ type: "square", side: "2" })), ["side: invalid_type"]);
    assert.deepEqual(codes(Shape.safeParse({ type: "circle" })), ["r: invalid_type"]);
    assert.deepEqual(codes(Shape.safeParse({ type: "hexagon" })), ["type: invalid_literal", "r: invalid_type"]);
    assert.deepEqual(codes(s.union([s.string(), s.number()]).safeParse(true)), [": invalid_union"]);
    assert.deepEqual(codes(s.union([s.object({ a: s.string(), b: s.number() }), s.object({ c: s.string() })]).safeParse({ a: 1 })), ["c: invalid_type"], "the option with the fewest issues, as before");
    assert.deepEqual(Object.keys(Shape.parse({ side: 1, type: "square" })), ["type", "side"], "keys keep the order of the shape");
  });
});

describe("schema: deep values", () => {
  const depth = 100_000;
  const deepArray = () => JSON.parse("[".repeat(depth) + "]".repeat(depth));
  const deepObject = () => JSON.parse('{"a":'.repeat(depth) + "1" + "}".repeat(depth));

  it("safeParse() and is() report a value nested too deep instead of throwing", () => {
    const Tree = s.lazy(() => s.array(Tree));
    const result = Tree.safeParse(deepArray());
    assert.equal(result.success, false);
    assert.equal(result.issues?.[0].code, "too_deep");
    assert.equal(Tree.is(deepArray()), false);
    assert.throws(() => Tree.parse(deepArray()), { name: "ValidationError" });
    const Chain = s.lazy(() => s.union([s.number(), s.object({ a: Chain })]));
    assert.equal(Chain.safeParse(deepObject()).issues?.[0].code, "too_deep");
    assert.equal(s.coerce.string().safeParse(deepArray()).issues?.[0].code, "too_deep");
  });

  it("maxDepth sets how deep a value may go", () => {
    const Tree = s.lazy(() => s.array(Tree));
    assert.equal(Tree.is([[[]]], { maxDepth: 3 }), true);
    const result = Tree.safeParse([[[[]]]], { maxDepth: 3 });
    assert.deepEqual(codes(result), ["0.0.0: too_deep"]);
    assert.equal(result.issues?.[0].maximum, 3);
  });

  it("obj functions throw a clear RangeError", () => {
    const tooDeep = /nested too deeply/;
    assert.throws(() => obj.clone(deepObject()), tooDeep);
    assert.throws(() => obj.merge({}, deepObject()), tooDeep);
    assert.throws(() => obj.equal(deepObject(), deepObject()), tooDeep);
    assert.throws(() => obj.flatten(deepObject()), tooDeep);
    assert.throws(() => obj.sortKeys(deepObject()), tooDeep);
    assert.throws(() => obj.compact(deepObject(), { deep: true }), tooDeep);
    assert.throws(() => obj.deepFreeze(deepObject()), tooDeep);
    assert.throws(() => obj.clone(deepObject()), RangeError);
  });
});

describe("schema: rules", () => {
  it("checks stop once a string is too long", () => {
    const Name = s.string().max(20).regex(/^(\w+\s?)+$/);
    let result;
    assert.ok(timed(() => (result = Name.safeParse(`${"a".repeat(27)}!`))) < 200);
    assert.deepEqual(codes(result), [": too_big"]);
    assert.deepEqual(codes(s.string().min(5).regex(/^\d+$/).safeParse("ab")), [": too_small", ": invalid_string"], "other failures still list every issue");
  });

  it("url() refuses what it would return unencoded", () => {
    const Url = s.string().url();
    assert.equal(Url.is('https://a.com/"><script>alert(1)</script>'), false);
    assert.equal(Url.is("https://a.com/a b"), false);
    assert.equal(Url.is("https://a.com\\@evil.com"), false);
    assert.equal(Url.is("https://a.com/\u0000"), false);
    assert.equal(Url.is("https://a.com/path?q=1#top"), true);
    assert.equal(Url.is("https://a.com/%22%3E"), true);
    assert.equal(Url.is("https://en.wikipedia.org/wiki/Ender's_Game"), true);
    assert.equal(Url.is("https://a.com/' onmouseover='alert(1)"), false);
    assert.equal(Url.is("https://a.com/`x`"), false);
  });

  it("literal and enum messages handle bigints", () => {
    assert.deepEqual(s.literal(5n).safeParse(6n).issues?.[0].message, "Expected 5n, received 6n");
    assert.equal(s.literal(5n).is(5n), true);
    assert.equal(s.enum(["a", "b"]).safeParse({ n: 1n }).success, false);
    const loop = {};
    loop.self = loop;
    assert.equal(s.literal("a").safeParse(loop).success, false);
  });
});

describe("obj: paths", () => {
  it("brackets are parsed in linear time", () => {
    assert.ok(timed(() => obj.get({}, "[".repeat(40_000))) < 200);
    assert.equal(obj.get({ a: { b: { c: 1 } } }, "a['b'][\"c\"]"), 1);
    assert.equal(obj.get({ a: [{ c: 2 }] }, "a[0].c"), 2);
  });

  it("a large index makes an object, not a huge array", () => {
    const flat = obj.unflatten({ "a.20000000": 1, "b.2": 1 });
    assert.equal(Array.isArray(flat.a), false);
    assert.deepEqual(flat.a, { 20000000: 1 });
    assert.equal(Array.isArray(flat.b), true);
    assert.equal(Array.isArray(obj.set({}, "x.4294967294", 1).x), false);
    assert.equal(Array.isArray(obj.set({}, ["x", 10_000, "y"], 1).x), true);
    const sparse = [];
    sparse[200_000_000] = { a: 1 };
    sparse[3] = 2;
    let copy;
    assert.ok(timed(() => (copy = obj.clone(sparse))) < 200);
    assert.equal(copy.length, sparse.length);
    assert.deepEqual([copy[3], copy[200_000_000]], [2, { a: 1 }]);
    assert.notEqual(copy[200_000_000], sparse[200_000_000]);
    assert.ok(timed(() => assert.equal(obj.equal(sparse, copy), true)) < 200);
    copy[200_000_000].a = 2;
    assert.equal(obj.equal(sparse, copy), false);
    assert.ok(timed(() => obj.sortKeys({ sparse })) < 200);
    assert.ok(timed(() => assert.deepEqual(obj.compact({ sparse }, { deep: true }).sparse, [2, { a: 1 }])) < 200);
  });

  it("a key is converted to a string once, before the safety check", () => {
    let calls = 0;
    const sneaky = { toString: () => (calls++ === 0 ? "safe" : "__proto__") };
    try {
      obj.set({}, [sneaky, "polluted"], "yes");
      assert.equal(/** @type {any} */ ({}).polluted, undefined);
    } finally {
      delete (/** @type {any} */ (Object.prototype).polluted);
    }
  });

  it("get() doesn't read what a plain object inherits", () => {
    assert.equal(obj.get({}, "toString"), undefined);
    assert.equal(obj.get({ a: {} }, "a.hasOwnProperty", "none"), "none");
    assert.equal(obj.get({ toString: 1 }, "toString"), 1);
    assert.equal(obj.get({ url: new URL("https://a.io/x") }, "url.hostname"), "a.io", "class instances keep their getters");
    assert.equal(obj.get({ list: [1, 2] }, "list.length"), 2);
  });
});

describe("time: text", () => {
  it("a long duration is refused at once", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    assert.ok(timed(() => assert.throws(() => time.add(start, `${"1".repeat(800)}!`), TypeError)) < 200);
    assert.ok(timed(() => assert.throws(() => time.subtract(start, `${"1".repeat(5000)}!`), TypeError)) < 200);
    const utc = { timeZone: "UTC" };
    const iso = (/** @type {string} */ text) => time.add(start, text, utc).toISOString();
    assert.equal(iso("1h30m"), "2024-01-01T01:30:00.000Z");
    assert.equal(iso("1h, 2m"), "2024-01-01T01:02:00.000Z");
    assert.equal(iso(".5h"), "2024-01-01T00:30:00.000Z");
    assert.equal(iso("+5m"), "2024-01-01T00:05:00.000Z");
    assert.equal(iso("2 days and 3 hours"), "2024-01-03T03:00:00.000Z");
    assert.equal(iso("1y 2 months and 3 days"), "2025-03-04T00:00:00.000Z");
    assert.equal(iso("5000"), "2024-01-01T00:00:05.000Z");
    assert.throws(() => time.add(start, "1h 2"), TypeError);
    assert.throws(() => time.add(start, "1hand2m"), TypeError);
  });

  it("parse() with spaces at the ends of the pattern is linear", () => {
    assert.ok(timed(() => assert.equal(time.parse(`2024${" ".repeat(40_000)}x`, "YYYY "), undefined)) < 200);
    assert.ok(timed(() => assert.equal(time.parse(`${" ".repeat(40_000)}x2024`, " YYYY"), undefined)) < 200);
    assert.equal(time.parse("2024   ", "YYYY ", { timeZone: "UTC" })?.toISOString(), "2024-01-01T00:00:00.000Z");
    assert.equal(time.parse("  2024", " YYYY", { timeZone: "UTC" })?.toISOString(), "2024-01-01T00:00:00.000Z");
    assert.equal(time.parse("2024", "YYYY "), undefined);
  });
});
