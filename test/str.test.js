"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { str } = require("..");

describe("str: casing", () => {
  it("converts between cases", () => {
    assert.equal(str.capitalize("hELLO wORLD"), "Hello world");
    assert.equal(str.titleCase("the quick fox"), "The Quick Fox");
    assert.equal(str.titleCase("élodie o'neil"), "Élodie O'neil");
    assert.equal(str.sentenceCase("hELLO WORLD. how ARE you?"), "Hello world. How are you?");
    assert.equal(str.camelCase("user_first-name"), "userFirstName");
    assert.equal(str.camelCase("XMLHttpRequest"), "xmlHttpRequest");
    assert.equal(str.pascalCase("hello world"), "HelloWorld");
    assert.equal(str.snakeCase("helloWorld"), "hello_world");
    assert.equal(str.kebabCase("helloWorld"), "hello-world");
    assert.equal(str.constantCase("helloWorld"), "HELLO_WORLD");
    assert.equal(str.dotCase("userFirstName"), "user.first.name");
    assert.deepEqual(str.words("helloWorld-foo_bar"), ["hello", "World", "foo", "bar"]);
  });
});

describe("str: normalization", () => {
  it("deburr and slugify", () => {
    assert.equal(str.deburr("Crème brûlée"), "Creme brulee");
    assert.equal(str.deburr("Straße Æsir øl"), "Strasse AEsir ol");
    assert.equal(str.slugify("Héllo, World!"), "hello-world");
    assert.equal(str.slugify("Crème Brûlée", { separator: "_" }), "creme_brulee");
    assert.equal(str.slugify("A very long title", { maxLength: 8 }), "a-very");
    assert.equal(str.slugify("Keep Case", { lower: false }), "Keep-Case");
    assert.equal(str.slugify("  --  "), "");
  });

  it("squish, stripTags, escaping", () => {
    assert.equal(str.squish("  hello \n\t world  "), "hello world");
    assert.equal(str.stripTags("<p>Hello <b>world</b></p>"), "Hello world");
    assert.equal(str.escapeHTML(`<a href="x">Tom & 'J'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;J&#39;&lt;/a&gt;");
    assert.equal(str.unescapeHTML("Tom &amp; Jerry &#x1F600; &#233; &nbsp;"), "Tom & Jerry 😀 é  ");
    assert.equal(str.unescapeHTML(str.escapeHTML(`<>&"'`)), `<>&"'`);
    assert.equal(new RegExp(str.escapeRegExp("1+1=2?")).test("1+1=2?"), true);
  });
});

describe("str: unicode-aware measurement", () => {
  it("counts graphemes", () => {
    assert.equal(str.length("👨\u200d👩\u200d👧"), 1);
    assert.equal(str.length("café"), 4);
    assert.equal(str.byteLength("é"), 2);
    assert.equal(str.reverse("añ👍🏽"), "👍🏽ña");
  });

  it("truncate never splits emojis", () => {
    assert.equal(str.truncate("Hello world", 8), "Hello w…");
    assert.equal(str.truncate("Hello world", 8, { omission: "..." }), "Hello...");
    assert.equal(str.truncate("Hello big world", 12, { words: true }), "Hello big…");
    assert.equal(str.truncate("Hi", 8), "Hi");
    assert.equal(str.truncate("👨\u200d👩\u200d👧👨\u200d👩\u200d👧👨\u200d👩\u200d👧", 2), "👨\u200d👩\u200d👧…");
  });

  it("count", () => {
    assert.equal(str.count("banana", "a"), 3);
    assert.equal(str.count("aaaa", "aa"), 2);
    assert.equal(str.count("abc", ""), 0);
  });
});

describe("str: slicing and layout", () => {
  it("between, splitOnce, lines", () => {
    assert.equal(str.between("Hello [world]!", "[", "]"), "world");
    assert.equal(str.between("nothing", "[", "]"), undefined);
    assert.deepEqual(str.splitOnce("k=v=w", "="), ["k", "v=w"]);
    assert.deepEqual(str.splitOnce("k", "="), ["k", undefined]);
    assert.deepEqual(str.lines("a\r\nb\nc\rd"), ["a", "b", "c", "d"]);
  });

  it("padding, centering, indentation", () => {
    assert.equal(str.padStart("7", 3, "0"), "007");
    assert.equal(str.padEnd("ab", 4, "."), "ab..");
    assert.equal(str.center("hi", 7, "*"), "**hi***");
    assert.equal(str.indent("a\n\nb", 2), "  a\n\n  b");
    assert.equal(str.indent("a", "> "), "> a");
  });

  it("dedent as function and template tag", () => {
    assert.equal(str.dedent("    a\n      b"), "a\n  b");
    const id = 42;
    const sql = str.dedent`
        SELECT *
          FROM users
         WHERE id = ${id}
    `;
    assert.equal(sql, "SELECT *\n  FROM users\n WHERE id = 42");
  });

  it("wrap", () => {
    assert.equal(str.wrap("The quick brown fox jumps over the lazy dog", { width: 16 }), "The quick brown\nfox jumps over\nthe lazy dog");
    assert.equal(str.wrap("abcdefgh", { width: 3, cut: true }), "abc\ndef\ngh");
    assert.equal(str.wrap("a b", { width: 10, indent: "> " }), "> a b");
    assert.equal(str.wrap("line1\nline2", 80), "line1\nline2");
  });
});

describe("str: transforms", () => {
  it("mask", () => {
    assert.equal(str.mask("4242424242424242"), "************4242");
    assert.equal(str.mask("4242 4242 4242 4242", { keepSpaces: true }), "**** **** **** 4242");
    assert.equal(str.mask("secret-token", { start: 2, end: 2, char: "•" }), "se••••••••en");
    assert.equal(str.mask("abc"), "abc");
  });

  it("initials", () => {
    assert.equal(str.initials("Ada Lovelace"), "AL");
    assert.equal(str.initials("jean-luc picard", 3), "JLP");
    assert.equal(str.initials("élodie"), "É");
  });

  it("plural uses locale rules", () => {
    assert.equal(str.plural(1, { one: "file", other: "files" }), "1 file");
    assert.equal(str.plural(3, { one: "file", other: "files" }), "3 files");
    assert.equal(str.plural(0, { zero: "no files", one: "file", other: "files" }), "no files");
    assert.equal(str.plural(0, { one: "fichier", other: "fichiers" }, { locale: "fr" }), "0 fichier");
    assert.equal(str.plural(1234, { one: "item", other: "items" }), "1,234 items");
    assert.equal(str.plural(2, { one: "st", two: "nd", few: "rd", other: "th" }, { ordinal: true, includeCount: false }), "nd");
  });

  it("template", () => {
    assert.equal(str.template("Hi {name}, {count} msgs", { name: "Jo", count: 3 }), "Hi Jo, 3 msgs");
    assert.equal(str.template("{user.name} {items.0}", { user: { name: "Ada" }, items: ["x"] }), "Ada x");
    assert.equal(str.template("{missing}", {}), "{missing}");
    assert.equal(str.template("{missing}", {}, { fallback: "?" }), "?");
    assert.equal(str.template("Hello {{ name }}", { name: "Jo" }, { open: "{{", close: "}}" }), "Hello Jo");
  });

  it("affixes", () => {
    assert.equal(str.ensurePrefix("a.com", "https://"), "https://a.com");
    assert.equal(str.ensurePrefix("https://a.com", "https://"), "https://a.com");
    assert.equal(str.ensureSuffix("p", "/"), "p/");
    assert.equal(str.removePrefix("https://a", "https://"), "a");
    assert.equal(str.removeSuffix("report.pdf", ".pdf"), "report");
    assert.equal(str.removeSuffix("x", ""), "x");
  });
});

describe("str: comparison and fuzzy matching", () => {
  it("compare sorts naturally", () => {
    assert.deepEqual(["file10", "file2", "file1"].sort(str.compare), ["file1", "file2", "file10"]);
    assert.equal(str.compare("a", "A", { sensitivity: "base" }), 0);
  });

  it("levenshtein, similarity, closest", () => {
    assert.equal(str.levenshtein("kitten", "sitting"), 3);
    assert.equal(str.levenshtein("", "abc"), 3);
    assert.equal(str.similarity("hello", "hallo"), 0.8);
    assert.equal(str.similarity("", ""), 1);
    assert.equal(str.closest("instal", ["install", "uninstall", "list"]), "install");
    assert.equal(str.closest("xyz", ["install", "list"]), undefined);
  });

  it("random", () => {
    assert.equal(str.random().length, 16);
    assert.match(str.random(8, { charset: "01" }), /^[01]{8}$/);
    assert.match(str.random(4, "ab"), /^[ab]{4}$/);
  });
});
