"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

describe("checker: primitives", () => {
  it("detects numbers", () => {
    assert.equal(nc.is.number(42), true);
    assert.equal(nc.is.number(Infinity), true);
    assert.equal(nc.is.number(NaN), false);
    assert.equal(nc.is.number("42"), false);
    assert.equal(nc.is.finite(Infinity), false);
    assert.equal(nc.is.finite("42"), false);
    assert.equal(nc.is.integer(4), true);
    assert.equal(nc.is.integer(4.5), false);
    assert.equal(nc.is.safeInteger(2 ** 53), false);
    assert.equal(nc.is.float(4.2), true);
    assert.equal(nc.is.float(4), false);
    assert.equal(nc.is.positive(1), true);
    assert.equal(nc.is.positive(0), false);
    assert.equal(nc.is.negative(-1), true);
  });

  it("detects other primitives", () => {
    assert.equal(nc.is.string("x"), true);
    assert.equal(nc.is.string(new String("x")), false);
    assert.equal(nc.is.boolean(false), true);
    assert.equal(nc.is.boolean(0), false);
    assert.equal(nc.is.symbol(Symbol("s")), true);
    assert.equal(nc.is.bigInt(1n), true);
    assert.equal(nc.is.undefined(undefined), true);
    assert.equal(nc.is.null(null), true);
    assert.equal(nc.is.nil(undefined), true);
    assert.equal(nc.is.nil(0), false);
    assert.equal(nc.is.primitive(null), true);
    assert.equal(nc.is.primitive({}), false);
  });

  it("isDefined filters and narrows", () => {
    assert.deepEqual([1, null, 2, undefined, 0].filter(nc.is.defined), [1, 2, 0]);
  });
});

describe("checker: functions and objects", () => {
  it("detects functions", () => {
    assert.equal(nc.is.function(() => {}), true);
    assert.equal(nc.is.asyncFunction(async () => {}), true);
    assert.equal(nc.is.asyncFunction(() => Promise.resolve()), false);
    assert.equal(nc.is.generatorFunction(function* gen() {}), true);
    assert.equal(nc.is.generator((function* gen() { yield 1; })()), true);
    assert.equal(nc.is.class(class A {}), true);
    assert.equal(nc.is.class(function A() {}), false);
  });

  it("detects objects", () => {
    assert.equal(nc.is.object([]), true);
    assert.equal(nc.is.object(null), false);
    assert.equal(nc.is.plainObject({}), true);
    assert.equal(nc.is.plainObject(Object.create(null)), true);
    assert.equal(nc.is.plainObject(new Date()), false);
    assert.equal(nc.is.promise({ then() {} }), true);
    assert.equal(nc.is.promise(42), false);
    assert.equal(nc.is.validDate(new Date("nope")), false);
    assert.equal(nc.is.date(new Date("nope")), true);
    assert.equal(nc.is.map(new Map()), true);
    assert.equal(nc.is.set(new Set()), true);
    assert.equal(nc.is.iterable("abc"), true);
    assert.equal(nc.is.iterable({}), false);
    assert.equal(nc.is.asyncIterable((async function* gen() {})()), true);
    assert.equal(nc.is.buffer(Buffer.from("x")), true);
    assert.equal(nc.is.typedArray(new Uint8Array(1)), true);
    assert.equal(nc.is.error(new TypeError("x")), true);
    assert.equal(nc.is.error({ message: "x" }), false);
  });
});

describe("checker: emptiness and collections", () => {
  it("isEmpty", () => {
    for (const empty of [null, undefined, "", [], {}, new Map(), new Set()]) assert.equal(nc.is.empty(empty), true);
    for (const full of [0, false, " ", [0], { a: 1 }, new Map([[1, 1]])]) assert.equal(nc.is.empty(full), false);
  });

  it("isBlank", () => {
    assert.equal(nc.is.blank(" \n\t"), true);
    assert.equal(nc.is.blank(null), true);
    assert.equal(nc.is.blank(" a "), false);
    assert.equal(nc.is.blank(0), false);
  });

  it("isArrayOf and isOneOf", () => {
    assert.equal(nc.is.arrayOf(["a", "b"], nc.is.string), true);
    assert.equal(nc.is.arrayOf(["a", 1], nc.is.string), false);
    assert.equal(nc.is.arrayOf("ab", nc.is.string), false);
    assert.equal(nc.is.oneOf("b", ["a", "b"]), true);
    assert.equal(nc.is.oneOf(NaN, [NaN]), true);
    assert.equal(nc.is.oneOf("z", ["a"]), false);
  });
});

describe("checker: string formats", () => {
  it("isEmail", () => {
    assert.equal(nc.is.email("john.doe+tag@example.co.uk"), true);
    assert.equal(nc.is.email("josé@exemple.fr"), true);
    assert.equal(nc.is.email("a..b@example.com"), false);
    assert.equal(nc.is.email(".a@example.com"), false);
    assert.equal(nc.is.email("a.@example.com"), false);
    assert.equal(nc.is.email("a@localhost"), false);
    assert.equal(nc.is.email("a@-bad.com"), false);
    assert.equal(nc.is.email(`${"a".repeat(250)}@x.fr`), false);
  });

  it("isURL", () => {
    assert.equal(nc.is.url("https://example.com/a?b=1"), true);
    assert.equal(nc.is.url("ftp://example.com"), false);
    assert.equal(nc.is.url("ftp://example.com", { protocols: ["ftp:"] }), true);
    assert.equal(nc.is.url("http://localhost:3000"), true);
    assert.equal(nc.is.url("http://localhost:3000", { requireTld: true }), false);
    assert.equal(nc.is.url("not a url"), false);
  });

  it("isUUID", () => {
    assert.equal(nc.is.uuid(nc.id.uuid()), true);
    assert.equal(nc.is.uuid(nc.id.uuid(), { version: 4 }), true);
    assert.equal(nc.is.uuid("0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", { version: 7 }), true);
    assert.equal(nc.is.uuid("0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", { version: 4 }), false);
    assert.equal(nc.is.uuid("00000000-0000-0000-0000-000000000000"), true);
    assert.equal(nc.is.uuid("0190a5c4-7c1e-9b2a-9f3e-1c2d3e4f5a6b"), false);
  });

  it("isJSON and isNumeric", () => {
    assert.equal(nc.is.json('{"a":1}'), true);
    assert.equal(nc.is.json("{a:1}"), false);
    assert.equal(nc.is.numeric(" 12 "), true);
    assert.equal(nc.is.numeric("4.2e3"), true);
    assert.equal(nc.is.numeric("12px"), false);
    assert.equal(nc.is.numeric(""), false);
  });

  it("network formats", () => {
    assert.equal(nc.is.ip("192.168.0.1"), true);
    assert.equal(nc.is.ip("::1", 4), false);
    assert.equal(nc.is.ipv6("::1"), true);
    assert.equal(nc.is.ipv4("999.1.1.1"), false);
    assert.equal(nc.is.port(3000), true);
    assert.equal(nc.is.port("8080"), true);
    assert.equal(nc.is.port(70000), false);
    assert.equal(nc.is.port(1.5), false);
  });

  it("encodings and identifiers", () => {
    assert.equal(nc.is.hex("0xDEADbeef"), true);
    assert.equal(nc.is.hexColor("#FF8800CC"), true);
    assert.equal(nc.is.hexColor("#12345"), false);
    assert.equal(nc.is.base64("aGVsbG8="), true);
    assert.equal(nc.is.base64("aGVsbG8"), false);
    assert.equal(nc.is.base64("aGVsbG8", { urlSafe: true }), true);
    assert.equal(nc.is.semver("v2.0.0-rc.1+build.5"), true);
    assert.equal(nc.is.semver("1.2"), false);
    assert.equal(nc.is.semver("01.2.3"), false);
    assert.equal(nc.is.slug("hello-world"), true);
    assert.equal(nc.is.slug("a--b"), false);
    assert.equal(nc.is.alpha("Élodie"), true);
    assert.equal(nc.is.alpha("abc1"), false);
    assert.equal(nc.is.alphanumeric("abc123"), true);
    assert.equal(nc.is.creditCard("4242 4242 4242 4242"), true);
    assert.equal(nc.is.creditCard("4242 4242 4242 4241"), false);
    assert.equal(nc.is.jwt("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln"), true);
    assert.equal(nc.is.jwt("a.b.c"), false);
  });

  it("isISODate validates real calendar dates", () => {
    assert.equal(nc.is.isoDate("2024-02-29"), true);
    assert.equal(nc.is.isoDate("2023-02-29"), false);
    assert.equal(nc.is.isoDate("2024-02-29T13:45:00.123+02:00"), true);
    assert.equal(nc.is.isoDate("2024-01-01T24:00"), false);
    assert.equal(nc.is.isoDate("29/02/2024"), false);
  });
});

describe("checker: assertions", () => {
  it("assert throws AssertionError", () => {
    assert.doesNotThrow(() => nc.assert(1));
    assert.throws(() => nc.assert(0, "boom"), (error) => error instanceof nc.errors.AssertionError && error.code === "ERR_ASSERTION" && error.message === "boom");
    assert.throws(() => nc.assert(null, () => "lazy"), /lazy/);
  });

  it("assertType names the guard", () => {
    assert.doesNotThrow(() => nc.assert.type("x", nc.is.string));
    assert.throws(() => nc.assert.type(1, nc.is.string), /isString/);
  });
});
