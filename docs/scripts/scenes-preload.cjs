// Loaded before each sample of the showcase. A sample is written like your own
// code, with `require("@ix-xs/node-comfort")`: here that name is pointed at the
// package of this repository, and the time the sample took is noted.
const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const name = require(path.join(root, "package.json")).name;
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...rest) {
  if (request === name) return resolve.call(this, root, ...rest);
  if (request.startsWith(`${name}/`)) return resolve.call(this, path.join(root, "src", request.slice(name.length + 1)), ...rest);
  return resolve.call(this, request, ...rest);
};

const started = process.hrtime.bigint();
process.on("exit", () => {
  if (!process.env.NC_SHOWCASE_CLOCK) return;
  fs.writeFileSync(process.env.NC_SHOWCASE_CLOCK, String(Number(process.hrtime.bigint() - started) / 1e6));
});
