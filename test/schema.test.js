"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const nc = require("..");

const s = nc.schema;

/** Returns the issues of a failed parse as "path: message". */
const issues = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, "expected the value to be invalid");
  return result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
};

describe("schema: primitives", () => {
  it("string rules and transforms", () => {
    assert.equal(s.string().parse("hi"), "hi");
    assert.deepEqual(issues(s.string(), 42), ["(root): Expected string, received number"]);
    assert.deepEqual(issues(s.string(), undefined), ["(root): Required"]);
    assert.equal(s.string().trim().min(2).parse("  ab  "), "ab");
    assert.deepEqual(issues(s.string().min(3).max(5), "a"), ["(root): Must contain at least 3 characters"]);
    assert.deepEqual(issues(s.string().max(2), "abc"), ["(root): Must contain at most 2 characters"]);
    assert.equal(s.string().email().toLowerCase().parse("Ada@Example.COM"), "ada@example.com");
    assert.deepEqual(issues(s.string().email("Bad email"), "nope"), ["(root): Bad email"]);
    assert.equal(s.string().url().is("https://x.io"), true);
    assert.equal(s.string().url({ protocols: ["ftp:"] }).is("https://x.io"), false);
    assert.equal(s.string().uuid().is(nc.id.uuid()), true);
    assert.equal(s.string().ip(4).is("1.2.3.4"), true);
    assert.equal(s.string().datetime().is("2024-02-30"), false);
    assert.equal(s.string().regex(/^\d+$/g).is("123"), true);
    assert.equal(s.string().regex(/^\d+$/g).is("123"), true, "global regex state is reset");
    assert.equal(s.string().startsWith("sk_").endsWith("_x").includes("live").is("sk_live_x"), true);
    assert.equal(s.string().length(2).nonempty().toUpperCase().parse("ab"), "AB");
    assert.deepEqual(issues(s.string({ message: "Name is required" }), undefined), ["(root): Name is required"]);
  });

  it("number, boolean, bigint, date", () => {
    assert.equal(s.number().int().min(0).max(10).parse(5), 5);
    assert.deepEqual(issues(s.number(), NaN), ["(root): Expected number, received NaN"]);
    assert.deepEqual(issues(s.number(), Infinity), ["(root): Must be a finite number"]);
    assert.deepEqual(issues(s.number().int().positive(), -1.5), ["(root): Must be an integer", "(root): Must be positive"]);
    assert.equal(s.number().multipleOf(0.1).is(0.3), true);
    assert.equal(s.number().nonnegative().negative().is(0), false);
    assert.equal(s.boolean().parse(false), false);
    assert.equal(s.bigint().parse(10n), 10n);
    const d = new Date(2024, 0, 1);
    assert.equal(s.date().min("2023-01-01").max("2025-01-01").parse(d), d);
    assert.deepEqual(issues(s.date(), new Date("x")), ["(root): Invalid date"]);
  });

  it("literal and enum", () => {
    assert.equal(s.literal("v1").parse("v1"), "v1");
    assert.deepEqual(issues(s.literal("v1"), "v2"), ['(root): Expected "v1", received "v2"']);
    const Role = s.enum(["admin", "user"]);
    assert.equal(Role.parse("admin"), "admin");
    assert.deepEqual(Role.options, ["admin", "user"]);
    assert.equal(issues(Role, "root")[0], '(root): Expected "admin" | "user", received "root"');
  });
});

describe("schema: modifiers", () => {
  it("optional, nullable, nullish, default, catch", () => {
    assert.equal(s.string().optional().parse(undefined), undefined);
    assert.equal(s.string().nullable().parse(null), null);
    assert.equal(s.string().nullish().parse(null), null);
    assert.equal(s.string().default("guest").parse(undefined), "guest");
    const list = s.array(s.string()).default([]);
    const a = list.parse(undefined);
    a.push("x");
    assert.deepEqual(list.parse(undefined), [], "default objects are copied for each parse");
    assert.ok(s.date().default(() => new Date()).parse(undefined) instanceof Date);
    assert.equal(s.number().catch(0).parse("oops"), 0);
    assert.equal(s.number().catch((input) => String(input).length).parse("oops"), 4);
  });

  it("transform, refine, or, array, describe", () => {
    assert.deepEqual(s.string().transform((v) => v.split(",")).parse("a,b"), ["a", "b"]);
    const Even = s.number().refine((n) => n % 2 === 0, "Must be even");
    assert.deepEqual(issues(Even, 3), ["(root): Must be even"]);
    assert.equal(s.string().or(s.number()).parse(4), 4);
    assert.deepEqual(s.string().array().parse(["a"]), ["a"]);
    assert.equal(s.string().describe("A name").description, "A name");
    const Signup = s.object({ password: s.string(), confirm: s.string() })
      .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });
    assert.deepEqual(issues(Signup, { password: "a", confirm: "b" }), ["confirm: Passwords do not match"]);
  });

  it("schemas are immutable", () => {
    const base = s.string();
    const strict = base.min(5);
    assert.equal(base.is("ab"), true);
    assert.equal(strict.is("ab"), false);
  });
});

describe("schema: containers", () => {
  const User = s.object({
    name: s.string().trim().min(2),
    email: s.string().email(),
    age: s.number().int().min(18).optional(),
    role: s.enum(["admin", "user"]).default("user"),
    address: s.object({ city: s.string(), zip: s.string().regex(/^\d{5}$/) }).optional(),
    tags: s.array(s.string()).max(3).default([]),
  });

  it("object: parse, defaults, unknown keys", () => {
    assert.deepEqual(User.parse({ name: " Ada ", email: "ada@x.io", extra: true }), { name: "Ada", email: "ada@x.io", role: "user", tags: [] });
    assert.deepEqual(User.passthrough().parse({ name: "Ada", email: "a@x.io", extra: 1 }).extra, 1);
    assert.deepEqual(issues(User.strict(), { name: "Ada", email: "a@x.io", extra: 1, more: 2 }), ["(root): Unrecognized keys: extra, more"]);
    assert.deepEqual(issues(User, "nope"), ["(root): Expected object, received string"]);
  });

  it("object: every issue is reported with its path", () => {
    assert.deepEqual(issues(User, { name: "A", email: "bad", age: 12.5, address: { city: 1, zip: "12" }, tags: ["a", 2, "c", "d"] }), [
      "name: Must contain at least 2 characters",
      "email: Invalid email address",
      "age: Must be an integer",
      "age: Must be greater than or equal to 18",
      "address.city: Expected string, received number",
      "address.zip: Must match /^\\d{5}$/",
      "tags.1: Expected string, received number",
    ]);
  });

  it("object helpers: extend, pick, omit, partial, shape", () => {
    const Admin = User.extend({ level: s.number() });
    assert.equal(Admin.parse({ name: "Ada", email: "a@x.io", level: 3 }).level, 3);
    assert.deepEqual(Object.keys(User.pick(["name", "email"]).shape), ["name", "email"]);
    assert.deepEqual(Object.keys(User.omit(["address", "tags"]).shape), ["name", "email", "age", "role"]);
    assert.deepEqual(User.partial().parse({}), { role: "user", tags: [] });
  });

  it("array, tuple, record, union, lazy", () => {
    assert.deepEqual(issues(s.array(s.number()).min(2), [1]), ["(root): Must contain at least 2 items"]);
    assert.equal(s.array(s.number()).unique().is([1, 1]), false);
    assert.equal(s.array(s.object({ id: s.number() })).unique((x) => x.id).is([{ id: 1 }, { id: 1 }]), false);
    assert.equal(s.array(s.number()).nonempty().length(1).is([1]), true);
    assert.deepEqual(s.tuple([s.number(), s.string()]).parse([1, "a"]), [1, "a"]);
    assert.deepEqual(issues(s.tuple([s.number()]), [1, 2]), ["(root): Expected 1 items, received 2"]);
    assert.deepEqual(s.record(s.number()).parse({ a: 1, b: 2 }), { a: 1, b: 2 });
    assert.deepEqual(issues(s.record(s.number(), s.string().regex(/^[a-z]+$/)), { ok: 1, NO: 2 }), ["NO: Must match /^[a-z]+$/"]);
    const Shape = s.union([s.object({ type: s.literal("circle"), r: s.number() }), s.object({ type: s.literal("square"), side: s.number() })]);
    assert.deepEqual(Shape.parse({ type: "square", side: 2 }), { type: "square", side: 2 });
    assert.deepEqual(issues(s.union([s.string(), s.number()]), true), ["(root): Expected string | number, received boolean"]);
    const Category = s.object({ name: s.string(), children: s.lazy(() => s.array(Category)).default([]) });
    assert.deepEqual(Category.parse({ name: "root", children: [{ name: "leaf" }] }), { name: "root", children: [{ name: "leaf", children: [] }] });
    assert.deepEqual(issues(Category, { name: "root", children: [{ name: 1 }] }), ["children.0.name: Expected string, received number"]);
  });

  it("record and passthrough ignore __proto__ keys", () => {
    const parsed = s.record(s.any()).parse(JSON.parse('{"__proto__":{"polluted":true},"a":1}'));
    assert.deepEqual(parsed, { a: 1 });
    assert.equal({}.polluted, undefined);
  });
});

describe("schema: coercion and helpers", () => {
  it("coerce", () => {
    const Query = s.object({
      page: s.coerce.number().int().min(1).default(1),
      active: s.coerce.boolean().default(false),
      since: s.coerce.date().optional(),
      id: s.coerce.string(),
      big: s.coerce.bigint().optional(),
    });
    const q = Query.parse({ page: "2", active: "yes", since: "2024-01-01", id: 42, big: "9007199254740993" });
    assert.equal(q.page, 2);
    assert.equal(q.active, true);
    assert.ok(q.since instanceof Date);
    assert.equal(q.id, "42");
    assert.equal(q.big, 9007199254740993n);
    assert.deepEqual(issues(s.coerce.number(), ""), ["(root): Expected number, received string"]);
    assert.deepEqual(issues(s.coerce.boolean(), "maybe"), ["(root): Expected boolean, received string"]);
  });

  it("instanceOf, custom, any, unknown, is", () => {
    assert.equal(s.instanceOf(URL).is(new URL("https://x.io")), true);
    assert.deepEqual(issues(s.instanceOf(URL), "https://x.io"), ["(root): Expected an instance of URL"]);
    assert.equal(s.custom(nc.isHexColor, "Expected a hex color").is("#fff"), true);
    assert.deepEqual(issues(s.custom(nc.isHexColor, "Expected a hex color"), "red"), ["(root): Expected a hex color"]);
    assert.equal(s.any().parse(Symbol.for("x")), Symbol.for("x"));
    assert.equal(s.unknown().is(undefined), true);
  });

  it("parse throws a ValidationError usable for forms", () => {
    try {
      s.object({ email: s.string().email(), age: s.number() }).parse({ email: "x" });
      assert.fail("should throw");
    } catch (error) {
      assert.ok(error instanceof nc.errors.ValidationError);
      assert.equal(error.code, "ERR_VALIDATION");
      assert.deepEqual(error.flatten(), { email: ["Invalid email address"], age: ["Required"] });
      assert.match(error.message, /2 issues/);
    }
  });
});
