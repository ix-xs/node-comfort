const nc = require("@ix-xs/node-comfort");

function loadConfig() {
  return nc.env.validate({
    SITES_FILE: { type: "string", description: "The JSON file that lists the sites" },
    TIMEOUT: { type: "duration", default: "5s" },
    CONCURRENCY: { type: "number", integer: true, min: 1, default: 4 },
    DATABASE_PATH: { type: "string", default: "data/status.sqlite" },
  });
}

module.exports = { loadConfig };
