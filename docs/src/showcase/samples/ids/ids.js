const { id } = require("@ix-xs/node-comfort");

console.log("uuidv7   ", id.uuidv7());
console.log("ulid     ", id.ulid());
console.log("nano     ", id.nano());
console.log("prefixed ", id.prefixed("user"));
console.log("objectId ", id.objectId());
console.log("code     ", id.code());
console.log("uuidv5   ", id.uuidv5("example.com", "dns"));
console.log("created  ", id.timestamp(id.uuidv7()));
