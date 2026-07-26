const Logger = require("./src/Logger");
const FS = require("./src/FS");
const Checker = require("./src/Checker");
const Utils = require("./src/Utils");
const SQLite = require("./src/SQLite");
const str = require("./src/Str");
const num = require("./src/Num");
const arr = require("./src/Arr");
const obj = require("./src/Obj");
const func = require("./src/Func");
const time = require("./src/Time");
const id = require("./src/Id");

/**
 * @ix-xs/node-comfort
 *
 * A zero-dependency comfort belt for Node.js: a colorful logger, a safe
 * filesystem helper, a tiny SQLite wrapper, runtime type checks, async/process
 * helpers, plus rich string, number, array, object, function, date and
 * id/crypto utilities.
 */
module.exports = {
  ...Logger,
  ...FS,
  ...Checker,
  ...Utils,
  SQLite,
  str,
  num,
  arr,
  obj,
  func,
  time,
  id,
  logger: Logger,
  fs: FS,
  checker: Checker,
  utils: Utils,
};
