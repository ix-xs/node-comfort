"use strict";

// Turns the failures of a test run into annotations on the pull request, so
// that a red build says which test failed, and how, without opening its log.
// CI runs it after the tests fail:
//
//   node scripts/report-test-failures.js test-output.txt

const fs = require("node:fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log("[report-test-failures] No test output to read.");
  process.exit(0);
}

const lines = fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
// The runner ends with a summary: "test at <file>:<line>:<column>", the name
// of the test, then its error, indented.
const start = lines.findIndex((line) => /failing tests:/.test(line));
/** @type {Array<{ file: string, line: string, name: string, detail: string[] }>} */
const failures = [];
for (const line of start === -1 ? [] : lines.slice(start + 1)) {
  const at = /^test at (.+?):(\d+):\d+$/.exec(line);
  if (at) {
    failures.push({ file: at[1].replaceAll("\\", "/"), line: at[2], name: "", detail: [] });
    continue;
  }
  const current = failures[failures.length - 1];
  if (!current) continue;
  if (!current.name && line.trim()) current.name = line.replace(/^\S+\s+/, "").replace(/\s+\(\d+(\.\d+)?ms\)$/, "");
  else if (line.trim()) current.detail.push(line.replace(/^ {2}/, ""));
}

/** Escapes what a workflow command reads as syntax. */
const data = (/** @type {string} */ text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
const property = (/** @type {string} */ text) => data(text).replaceAll(":", "%3A").replaceAll(",", "%2C");

if (failures.length === 0) {
  // No summary: the run was cut short. The last lines are what there is to read.
  const tail = lines.filter((line) => line.trim()).slice(-25).join("\n");
  console.log(`::error title=${property("The tests stopped without a summary")}::${data(tail)}`);
} else {
  // GitHub shows ten annotations per step: the first failures are the ones to read.
  for (const failure of failures.slice(0, 10)) {
    console.log(`::error file=${property(failure.file)},line=${failure.line},title=${property(failure.name || "A test failed")}::${data(failure.detail.slice(0, 30).join("\n"))}`);
  }
}
console.log(`[report-test-failures] ${failures.length} failing test(s) reported.`);
