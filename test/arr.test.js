"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { arr } = require("..");

const users = [
  { id: 1, name: "Ada", role: "admin", age: 36 },
  { id: 2, name: "Bob", role: "user", age: 25 },
  { id: 3, name: "Cid", role: "user", age: 36 },
];

describe("arr: slicing", () => {
  it("chunk and windows", () => {
    assert.deepEqual(arr.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(arr.chunk([1], 0), []);
    assert.deepEqual(arr.windows([1, 2, 3, 4], 2), [[1, 2], [2, 3], [3, 4]]);
    assert.deepEqual(arr.windows([1, 2, 3, 4, 5], 3, 2), [[1, 2, 3], [3, 4, 5]]);
    assert.deepEqual(arr.windows([1], 2), []);
  });

  it("first, last, paginate", () => {
    assert.equal(arr.first([1, 2, 3]), 1);
    assert.deepEqual(arr.first([1, 2, 3], 2), [1, 2]);
    assert.equal(arr.last([1, 2, 3]), 3);
    assert.deepEqual(arr.last([1, 2, 3], 2), [2, 3]);
    assert.deepEqual(arr.last([1, 2, 3], 0), []);
    const page = arr.paginate(arr.times(95, (i) => i), 2, 20);
    assert.deepEqual({ ...page, items: page.items.length }, { items: 20, page: 2, perPage: 20, total: 95, pages: 5, hasPrev: true, hasNext: true });
    assert.equal(arr.paginate([1, 2], 99, 20).page, 1);
    assert.equal(arr.paginate([], 1).pages, 1);
  });
});

describe("arr: grouping", () => {
  it("unique", () => {
    assert.deepEqual(arr.unique([1, 1, 2, NaN, NaN]), [1, 2, NaN]);
    assert.deepEqual(arr.unique(users, "age").map((u) => u.id), [1, 2]);
    assert.deepEqual(arr.unique(["a", "A", "b"], (s) => s.toLowerCase()), ["a", "b"]);
  });

  it("groupBy, keyBy, toMap, countBy, count", () => {
    assert.deepEqual(arr.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even")), { odd: [1, 3], even: [2, 4] });
    assert.deepEqual(Object.keys(arr.groupBy(users, "role")), ["admin", "user"]);
    assert.equal(arr.keyBy(users, "id")[2].name, "Bob");
    const map = arr.toMap(users, "id", (u) => u.name);
    assert.equal(map.get(3), "Cid");
    assert.deepEqual(arr.countBy(["a", "b", "a"]), { a: 2, b: 1 });
    assert.deepEqual(arr.countBy([1.2, 2.5, 1.7], Math.floor), { 1: 2, 2: 1 });
    assert.equal(arr.count(users, (u) => u.age > 30), 2);
  });

  it("partition and pluck", () => {
    assert.deepEqual(arr.partition([1, 2, 3, 4], (n) => n % 2 === 0), [[2, 4], [1, 3]]);
    assert.deepEqual(arr.pluck(users, "name"), ["Ada", "Bob", "Cid"]);
  });
});

describe("arr: ordering", () => {
  it("sortBy is stable, multi-key, nulls last", () => {
    assert.deepEqual(arr.sortBy(users, "age").map((u) => u.id), [2, 1, 3]);
    assert.deepEqual(arr.sortBy(users, "age", "desc").map((u) => u.id), [1, 3, 2]);
    assert.deepEqual(arr.sortBy(users, [["age", "desc"], ["name", "desc"]]).map((u) => u.id), [3, 1, 2]);
    assert.deepEqual(arr.sortBy([{ v: null }, { v: 2 }, { v: 1 }], "v").map((x) => x.v), [1, 2, null]);
    assert.deepEqual(arr.sortBy(["file10", "file2", "File1"], (s) => s, { natural: true }), ["File1", "file2", "file10"]);
    const input = [3, 1, 2];
    arr.sortBy(input, (n) => n);
    assert.deepEqual(input, [3, 1, 2], "input is not mutated");
  });

  it("shuffle, sample, sampleSize keep items", () => {
    const src = [1, 2, 3, 4, 5];
    assert.deepEqual([...arr.shuffle(src)].sort(), src);
    assert.ok(src.includes(arr.sample(src)));
    assert.equal(arr.sample([]), undefined);
    const picked = arr.sampleSize(src, 3);
    assert.equal(new Set(picked).size, 3);
    assert.equal(arr.sampleSize(src, 99).length, 5);
  });

  it("rotate, move, swap", () => {
    assert.deepEqual(arr.rotate([1, 2, 3, 4], 1), [2, 3, 4, 1]);
    assert.deepEqual(arr.rotate([1, 2, 3, 4], -1), [4, 1, 2, 3]);
    assert.deepEqual(arr.rotate([], 3), []);
    assert.deepEqual(arr.move(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(arr.move(["a", "b", "c"], -1, 0), ["c", "a", "b"]);
    assert.deepEqual(arr.swap(["a", "b", "c"], 0, 2), ["c", "b", "a"]);
  });
});

describe("arr: set logic and edits", () => {
  it("difference, intersection, union, without, remove, compact", () => {
    assert.deepEqual(arr.difference([1, 2, 3, 4], [2], [4]), [1, 3]);
    assert.deepEqual(arr.intersection([1, 2, 3], [2, 3, 4], [3, 2]), [2, 3]);
    assert.deepEqual(arr.union([1, 2], [2, 3], [3, 4]), [1, 2, 3, 4]);
    assert.deepEqual(arr.without([1, 2, 3, 2], 2), [1, 3]);
    assert.deepEqual(arr.remove([1, 2, 3, 4], (n) => n % 2 === 0), [1, 3]);
    assert.deepEqual(arr.compact([0, 1, false, 2, "", 3, null, undefined, NaN, 0n]), [1, 2, 3]);
  });

  it("toggle, upsert, insert", () => {
    assert.deepEqual(arr.toggle(["a", "b"], "b"), ["a"]);
    assert.deepEqual(arr.toggle(["a"], "b"), ["a", "b"]);
    const updated = arr.upsert(users, { id: 2, name: "Bob v2", role: "user", age: 26 }, "id");
    assert.equal(updated[1].name, "Bob v2");
    assert.equal(users[1].name, "Bob", "input is not mutated");
    assert.equal(arr.upsert(users, { id: 9, name: "New", role: "user", age: 1 }, "id").length, 4);
    assert.deepEqual(arr.insert(["a", "d"], 1, "b", "c"), ["a", "b", "c", "d"]);
    assert.deepEqual(arr.insert([1, 2], -1, 9), [1, 9, 2]);
  });
});

describe("arr: restructuring and aggregation", () => {
  it("flatten, zip, unzip, interleave, cartesian, times", () => {
    assert.deepEqual(arr.flatten([1, [2, [3, [4]]]]), [1, 2, [3, [4]]]);
    assert.deepEqual(arr.flatten([1, [2, [3, [4]]]], Infinity), [1, 2, 3, 4]);
    assert.deepEqual(arr.zip(["a", "b"], [1, 2]), [["a", 1], ["b", 2]]);
    assert.deepEqual(arr.zip(["a"], [1, 2]), [["a", 1], [undefined, 2]]);
    assert.deepEqual(arr.unzip([["a", 1], ["b", 2]]), [["a", "b"], [1, 2]]);
    assert.deepEqual(arr.interleave([1, 3, 5], [2, 4]), [1, 2, 3, 4, 5]);
    assert.deepEqual(arr.cartesian(["S", "M"], ["red", "blue"]), [["S", "red"], ["S", "blue"], ["M", "red"], ["M", "blue"]]);
    assert.deepEqual(arr.cartesian([1], []), []);
    assert.deepEqual(arr.times(3, "x"), ["x", "x", "x"]);
    assert.deepEqual(arr.times(3, (i) => i * 2), [0, 2, 4]);
  });

  it("sumBy, averageBy, maxBy, minBy", () => {
    assert.equal(arr.sumBy(users, "age"), 97);
    assert.equal(arr.sumBy([1, 2, 3]), 6);
    assert.equal(arr.averageBy([{ r: 4 }, { r: 5 }], "r"), 4.5);
    assert.equal(arr.averageBy([], "r"), 0);
    assert.equal(arr.maxBy(users, "age").id, 1);
    assert.equal(arr.minBy(users, "age").id, 2);
    assert.equal(arr.maxBy([], "age"), undefined);
  });
});
