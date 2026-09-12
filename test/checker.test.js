"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

describe("checker: primitives", () => {
  it("detects numbers", () => {
    assert.equal(nc.isNumber(42), true);
    assert.equal(nc.isNumber(Infinity), true);
    assert.equal(nc.isNumber(NaN), false);
    assert.equal(nc.isNumber("42"), false);
    assert.equal(nc.isFinite(Infinity), false);
    assert.equal(nc.isFinite("42"), false);
    assert.equal(nc.isInteger(4), true);
    assert.equal(nc.isInteger(4.5), false);
    assert.equal(nc.isSafeInteger(2 ** 53), false);
    assert.equal(nc.isFloat(4.2), true);
    assert.equal(nc.isFloat(4), false);
    assert.equal(nc.isPositive(1), true);
    assert.equal(nc.isPositive(0), false);
    assert.equal(nc.isNegative(-1), true);
  });

  it("detects other primitives", () => {
    assert.equal(nc.isString("x"), true);
    assert.equal(nc.isString(new String("x")), false);
    assert.equal(nc.isBoolean(false), true);
    assert.equal(nc.isBoolean(0), false);
    assert.equal(nc.isSymbol(Symbol("s")), true);
    assert.equal(nc.isBigInt(1n), true);
    assert.equal(nc.isUndefined(undefined), true);
    assert.equal(nc.isNull(null), true);
    assert.equal(nc.isNil(undefined), true);
    assert.equal(nc.isNil(0), false);
    assert.equal(nc.isPrimitive(null), true);
    assert.equal(nc.isPrimitive({}), false);
  });

  it("isDefined filters and narrows", () => {
    assert.deepEqual([1, null, 2, undefined, 0].filter(nc.isDefined), [1, 2, 0]);
  });
});

describe("checker: functions and objects", () => {
  it("detects functions", () => {
    assert.equal(nc.isFunction(() => {}), true);
    assert.equal(nc.isAsyncFunction(async () => {}), true);
    assert.equal(nc.isAsyncFunction(() => Promise.resolve()), false);
    assert.equal(nc.isGeneratorFunction(function* gen() {}), true);
    assert.equal(nc.isGenerator((function* gen() { yield 1; })()), true);
    assert.equal(nc.isClass(class A {}), true);
    assert.equal(nc.isClass(function A() {}), false);
  });

  it("detects objects", () => {
    assert.equal(nc.isObject([]), true);
    assert.equal(nc.isObject(null), false);
    assert.equal(nc.isPlainObject({}), true);
    assert.equal(nc.isPlainObject(Object.create(null)), true);
    assert.equal(nc.isPlainObject(new Date()), false);
    assert.equal(nc.isPromise({ then() {} }), true);
    assert.equal(nc.isPromise(42), false);
    assert.equal(nc.isValidDate(new Date("nope")), false);
    assert.equal(nc.isDate(new Date("nope")), true);
    assert.equal(nc.isMap(new Map()), true);
    assert.equal(nc.isSet(new Set()), true);
    assert.equal(nc.isIterable("abc"), true);
    assert.equal(nc.isIterable({}), false);
    assert.equal(nc.isAsyncIterable((async function* gen() {})()), true);
    assert.equal(nc.isBuffer(Buffer.from("x")), true);
    assert.equal(nc.isTypedArray(new Uint8Array(1)), true);
    assert.equal(nc.isError(new TypeError("x")), true);
    assert.equal(nc.isError({ message: "x" }), false);
  });
});

describe("checker: emptiness and collections", () => {
  it("isEmpty", () => {
    for (const empty of [null, undefined, "", [], {}, new Map(), new Set()]) assert.equal(nc.isEmpty(empty), true);
    for (const full of [0, false, " ", [0], { a: 1 }, new Map([[1, 1]])]) assert.equal(nc.isEmpty(full), false);
  });

  it("isBlank", () => {
    assert.equal(nc.isBlank(" \n\t"), true);
    assert.equal(nc.isBlank(null), true);
    assert.equal(nc.isBlank(" a "), false);
    assert.equal(nc.isBlank(0), false);
  });

  it("isArrayOf and isOneOf", () => {
    assert.equal(nc.isArrayOf(["a", "b"], nc.isString), true);
    assert.equal(nc.isArrayOf(["a", 1], nc.isString), false);
    assert.equal(nc.isArrayOf("ab", nc.isString), false);
    assert.equal(nc.isOneOf("b", ["a", "b"]), true);
    assert.equal(nc.isOneOf(NaN, [NaN]), true);
    assert.equal(nc.isOneOf("z", ["a"]), false);
  });
});

describe("checker: string formats", () => {
  it("isEmail", () => {
    assert.equal(nc.isEmail("john.doe+tag@example.co.uk"), true);
    assert.equal(nc.isEmail("josé@exemple.fr"), true);
    assert.equal(nc.isEmail("a..b@example.com"), false);
    assert.equal(nc.isEmail(".a@example.com"), false);
    assert.equal(nc.isEmail("a.@example.com"), false);
    assert.equal(nc.isEmail("a@localhost"), false);
    assert.equal(nc.isEmail("a@-bad.com"), false);
    assert.equal(nc.isEmail(`${"a".repeat(250)}@x.fr`), false);
  });

  it("isURL", () => {
    assert.equal(nc.isURL("https://example.com/a?b=1"), true);
    assert.equal(nc.isURL("ftp://example.com"), false);
    assert.equal(nc.isURL("ftp://example.com", { protocols: ["ftp:"] }), true);
    assert.equal(nc.isURL("http://localhost:3000"), true);
    assert.equal(nc.isURL("http://localhost:3000", { requireTld: true }), false);
    assert.equal(nc.isURL("not a url"), false);
  });

  it("isUUID", () => {
    assert.equal(nc.isUUID(nc.id.uuid()), true);
    assert.equal(nc.isUUID(nc.id.uuid(), { version: 4 }), true);
    assert.equal(nc.isUUID("0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", { version: 7 }), true);
    assert.equal(nc.isUUID("0190a5c4-7c1e-7b2a-9f3e-1c2d3e4f5a6b", { version: 4 }), false);
    assert.equal(nc.isUUID("00000000-0000-0000-0000-000000000000"), true);
    assert.equal(nc.isUUID("0190a5c4-7c1e-9b2a-9f3e-1c2d3e4f5a6b"), false);
  });

  it("isJSON and isNumeric", () => {
    assert.equal(nc.isJSON('{"a":1}'), true);
    assert.equal(nc.isJSON("{a:1}"), false);
    assert.equal(nc.isNumeric(" 12 "), true);
    assert.equal(nc.isNumeric("4.2e3"), true);
    assert.equal(nc.isNumeric("12px"), false);
    assert.equal(nc.isNumeric(""), false);
  });

  it("network formats", () => {
    assert.equal(nc.isIP("192.168.0.1"), true);
    assert.equal(nc.isIP("::1", 4), false);
    assert.equal(nc.isIPv6("::1"), true);
    assert.equal(nc.isIPv4("999.1.1.1"), false);
    assert.equal(nc.isPort(3000), true);
    assert.equal(nc.isPort("8080"), true);
    assert.equal(nc.isPort(70000), false);
    assert.equal(nc.isPort(1.5), false);
  });

  it("encodings and identifiers", () => {
    assert.equal(nc.isHex("0xDEADbeef"), true);
    assert.equal(nc.isHexColor("#FF8800CC"), true);
    assert.equal(nc.isHexColor("#12345"), false);
    assert.equal(nc.isBase64("aGVsbG8="), true);
    assert.equal(nc.isBase64("aGVsbG8"), false);
    assert.equal(nc.isBase64("aGVsbG8", { urlSafe: true }), true);
    assert.equal(nc.isSemver("v2.0.0-rc.1+build.5"), true);
    assert.equal(nc.isSemver("1.2"), false);
    assert.equal(nc.isSemver("01.2.3"), false);
    assert.equal(nc.isSlug("hello-world"), true);
    assert.equal(nc.isSlug("a--b"), false);
    assert.equal(nc.isAlpha("Élodie"), true);
    assert.equal(nc.isAlpha("abc1"), false);
    assert.equal(nc.isAlphanumeric("abc123"), true);
    assert.equal(nc.isCreditCard("4242 4242 4242 4242"), true);
    assert.equal(nc.isCreditCard("4242 4242 4242 4241"), false);
    assert.equal(nc.isJWT("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln"), true);
    assert.equal(nc.isJWT("a.b.c"), false);
  });

  it("isISODate validates real calendar dates", () => {
    assert.equal(nc.isISODate("2024-02-29"), true);
    assert.equal(nc.isISODate("2023-02-29"), false);
    assert.equal(nc.isISODate("2024-02-29T13:45:00.123+02:00"), true);
    assert.equal(nc.isISODate("2024-01-01T24:00"), false);
    assert.equal(nc.isISODate("29/02/2024"), false);
  });
});

describe("checker: assertions", () => {
  it("assert throws AssertionError", () => {
    assert.doesNotThrow(() => nc.assert(1));
    assert.throws(() => nc.assert(0, "boom"), (error) => error instanceof nc.errors.AssertionError && error.code === "ERR_ASSERTION" && error.message === "boom");
    assert.throws(() => nc.assert(null, () => "lazy"), /lazy/);
  });

  it("assertType names the guard", () => {
    assert.doesNotThrow(() => nc.assertType("x", nc.isString));
    assert.throws(() => nc.assertType(1, nc.isString), /isString/);
  });
});
